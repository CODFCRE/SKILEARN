-- Skilearn Supabase schema
-- Run this file in Supabase SQL Editor as a migration on a new project.

create extension if not exists pgcrypto;

-- -----------------------------------------------------------------------------
-- Shared helpers
-- -----------------------------------------------------------------------------

create or replace function public.set_updated_at()
returns trigger
language plpgsql
set search_path = public
as $$
begin
  new.updated_at = timezone('utc', now());
  return new;
end;
$$;

-- -----------------------------------------------------------------------------
-- Profiles and authentication
-- -----------------------------------------------------------------------------

create table if not exists public.profiles (
  id uuid primary key references auth.users(id) on delete cascade,
  display_name text,
  campus_email text,
  avatar_path text,
  verification_status text not null default 'pending'
    check (verification_status in ('pending', 'verified', 'rejected')),
  created_at timestamptz not null default timezone('utc', now()),
  updated_at timestamptz not null default timezone('utc', now())
);

create index if not exists profiles_verification_status_idx
  on public.profiles (verification_status);

create or replace function public.handle_new_user()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  insert into public.profiles (id, display_name, campus_email)
  values (
    new.id,
    coalesce(new.raw_user_meta_data ->> 'full_name', new.raw_user_meta_data ->> 'name'),
    new.email
  )
  on conflict (id) do nothing;
  return new;
end;
$$;

drop trigger if exists on_auth_user_created on auth.users;
create trigger on_auth_user_created
  after insert on auth.users
  for each row execute procedure public.handle_new_user();

drop trigger if exists profiles_set_updated_at on public.profiles;
create trigger profiles_set_updated_at
  before update on public.profiles
  for each row execute procedure public.set_updated_at();

-- -----------------------------------------------------------------------------
-- Verification
-- -----------------------------------------------------------------------------

create table if not exists public.verification_submissions (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  method text not null check (method in ('academic_email', 'student_id')),
  academic_email text,
  document_path text,
  status text not null default 'pending'
    check (status in ('pending', 'approved', 'rejected')),
  rejection_reason text,
  reviewed_at timestamptz,
  created_at timestamptz not null default timezone('utc', now()),
  check (method <> 'academic_email' or academic_email is not null),
  check (method <> 'student_id' or document_path is not null)
);

create index if not exists verification_submissions_user_idx
  on public.verification_submissions (user_id, created_at desc);

-- -----------------------------------------------------------------------------
-- Skill exchange
-- -----------------------------------------------------------------------------

create table if not exists public.skills (
  id uuid primary key default gen_random_uuid(),
  owner_id uuid not null references auth.users(id) on delete cascade,
  title text not null check (char_length(trim(title)) between 2 and 60),
  description text,
  category text not null,
  credit_rate numeric(6, 2) not null check (credit_rate > 0),
  session_format text not null default 'online'
    check (session_format in ('online', 'in_person', 'both')),
  status text not null default 'draft'
    check (status in ('draft', 'published', 'paused', 'archived')),
  created_at timestamptz not null default timezone('utc', now()),
  updated_at timestamptz not null default timezone('utc', now())
);

create index if not exists skills_published_idx
  on public.skills (status, category, created_at desc);

create index if not exists skills_owner_idx
  on public.skills (owner_id, status);

create table if not exists public.skill_availability (
  id uuid primary key default gen_random_uuid(),
  skill_id uuid not null references public.skills(id) on delete cascade,
  weekday smallint not null check (weekday between 0 and 6),
  start_time time not null,
  end_time time not null,
  timezone text not null default 'UTC',
  check (end_time > start_time),
  unique (skill_id, weekday, start_time, end_time)
);

create index if not exists skill_availability_lookup_idx
  on public.skill_availability (skill_id, weekday);

drop trigger if exists skills_set_updated_at on public.skills;
create trigger skills_set_updated_at
  before update on public.skills
  for each row execute procedure public.set_updated_at();

-- -----------------------------------------------------------------------------
-- Sessions and chat
-- -----------------------------------------------------------------------------

create table if not exists public.sessions (
  id uuid primary key default gen_random_uuid(),
  skill_id uuid not null references public.skills(id) on delete restrict,
  mentor_id uuid not null references auth.users(id) on delete restrict,
  learner_id uuid not null references auth.users(id) on delete restrict,
  starts_at timestamptz not null,
  ends_at timestamptz not null,
  session_format text not null check (session_format in ('online', 'in_person')),
  location text,
  status text not null default 'requested'
    check (status in ('requested', 'confirmed', 'in_progress', 'completed', 'cancelled')),
  credits_reserved numeric(6, 2) not null check (credits_reserved > 0),
  mentor_completed_at timestamptz,
  learner_completed_at timestamptz,
  created_at timestamptz not null default timezone('utc', now()),
  updated_at timestamptz not null default timezone('utc', now()),
  check (mentor_id <> learner_id),
  check (ends_at > starts_at)
);

create table if not exists public.call_sessions (
  id uuid primary key default gen_random_uuid(),
  caller_id uuid not null references auth.users(id) on delete cascade,
  recipient_id uuid not null references auth.users(id) on delete cascade,
  status text not null default 'ringing'
    check (status in ('ringing', 'accepted', 'declined', 'ended', 'missed')),
  created_at timestamptz not null default timezone('utc', now()),
  check (caller_id <> recipient_id)
);

create index if not exists call_sessions_incoming_idx
  on public.call_sessions (recipient_id, created_at desc)
  where status = 'ringing';

alter table public.sessions
  add column if not exists mentor_completed_at timestamptz,
  add column if not exists learner_completed_at timestamptz;

create or replace function public.validate_session_booking()
returns trigger
language plpgsql
set search_path = public, pg_temp
as $$
declare
  v_skill public.skills%rowtype;
begin
  if auth.uid() is null or new.learner_id <> auth.uid() then
    raise exception 'Only the signed-in learner can request a session.';
  end if;

  select * into v_skill
  from public.skills
  where id = new.skill_id
    and status = 'published';

  if not found or v_skill.owner_id <> new.mentor_id then
    raise exception 'The selected published skill and mentor do not match.';
  end if;

  if new.mentor_id = new.learner_id then
    raise exception 'You cannot request your own skill.';
  end if;

  if new.credits_reserved <> v_skill.credit_rate
    or new.status <> 'requested'
    or new.mentor_completed_at is not null
    or new.learner_completed_at is not null then
    raise exception 'The session amount or initial status is invalid.';
  end if;

  return new;
end;
$$;

drop trigger if exists sessions_validate_booking on public.sessions;
create trigger sessions_validate_booking
  before insert on public.sessions
  for each row execute procedure public.validate_session_booking();

create index if not exists sessions_mentor_idx
  on public.sessions (mentor_id, starts_at desc);

create index if not exists sessions_learner_idx
  on public.sessions (learner_id, starts_at desc);

create table if not exists public.session_messages (
  id uuid primary key default gen_random_uuid(),
  session_id uuid not null references public.sessions(id) on delete cascade,
  sender_id uuid not null references auth.users(id) on delete cascade,
  body text not null check (char_length(trim(body)) between 1 and 5000),
  sent_at timestamptz not null default timezone('utc', now()),
  read_at timestamptz
);

create index if not exists session_messages_session_idx
  on public.session_messages (session_id, sent_at);

drop trigger if exists sessions_set_updated_at on public.sessions;
create trigger sessions_set_updated_at
  before update on public.sessions
  for each row execute procedure public.set_updated_at();

-- -----------------------------------------------------------------------------
-- Credits and ratings
-- -----------------------------------------------------------------------------

create table if not exists public.credit_ledger (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  session_id uuid references public.sessions(id) on delete set null,
  amount numeric(8, 2) not null check (amount <> 0),
  entry_type text not null check (entry_type in ('welcome_bonus', 'reserve', 'release', 'earn', 'spend', 'refund', 'adjustment')),
  description text not null,
  created_at timestamptz not null default timezone('utc', now())
);

create index if not exists credit_ledger_user_idx
  on public.credit_ledger (user_id, created_at desc);

create or replace function public.grant_profile_welcome_credits()
returns trigger
language plpgsql
security definer
set search_path = public, pg_temp
as $$
begin
  insert into public.credit_ledger (user_id, amount, entry_type, description)
  values (new.id, 5, 'welcome_bonus', 'Welcome credits');
  return new;
end;
$$;

drop trigger if exists profiles_welcome_credits on public.profiles;
create trigger profiles_welcome_credits
  after insert on public.profiles
  for each row execute procedure public.grant_profile_welcome_credits();

insert into public.credit_ledger (user_id, amount, entry_type, description)
select profiles.id, 5, 'welcome_bonus', 'Welcome credits'
from public.profiles
where not exists (
  select 1
  from public.credit_ledger
  where credit_ledger.user_id = profiles.id
    and credit_ledger.entry_type = 'welcome_bonus'
);

create table if not exists public.session_ratings (
  id uuid primary key default gen_random_uuid(),
  session_id uuid not null references public.sessions(id) on delete cascade,
  reviewer_id uuid not null references auth.users(id) on delete cascade,
  reviewee_id uuid not null references auth.users(id) on delete cascade,
  rating smallint not null check (rating between 1 and 5),
  comment text,
  created_at timestamptz not null default timezone('utc', now()),
  unique (session_id, reviewer_id),
  check (reviewer_id <> reviewee_id)
);

create index if not exists session_ratings_reviewee_idx
  on public.session_ratings (reviewee_id, created_at desc);

create or replace view public.credit_balances
with (security_invoker = true)
as
select
  profiles.id as user_id,
  coalesce(sum(credit_ledger.amount), 0)::numeric(8, 2) as balance
from public.profiles
left join public.credit_ledger on credit_ledger.user_id = profiles.id
group by profiles.id;

create or replace function public.guard_session_credit_settlement()
returns trigger
language plpgsql
set search_path = public, pg_temp
as $$
begin
  if old.status in ('completed', 'cancelled') and new.status is distinct from old.status then
    raise exception 'A completed or cancelled session cannot be reopened.';
  end if;

  if new.skill_id is distinct from old.skill_id
    or new.mentor_id is distinct from old.mentor_id
    or new.learner_id is distinct from old.learner_id
    or new.starts_at is distinct from old.starts_at
    or new.ends_at is distinct from old.ends_at
    or new.session_format is distinct from old.session_format
    or new.credits_reserved is distinct from old.credits_reserved then
    raise exception 'Session participants, schedule, and credit amount cannot be changed.';
  end if;

  if new.status = 'completed' and old.status <> 'completed' then
    if new.mentor_completed_at is null or new.learner_completed_at is null
      or not exists (
        select 1 from public.credit_ledger
        where session_id = new.id
          and user_id = new.learner_id
          and entry_type = 'spend'
          and amount = -new.credits_reserved
      )
      or not exists (
        select 1 from public.credit_ledger
        where session_id = new.id
          and user_id = new.mentor_id
          and entry_type = 'earn'
          and amount = new.credits_reserved
      ) then
      raise exception 'Session completion requires both participant confirmations and credit settlement.';
    end if;
  end if;

  return new;
end;
$$;

drop trigger if exists sessions_guard_credit_settlement on public.sessions;
create trigger sessions_guard_credit_settlement
  before update on public.sessions
  for each row execute procedure public.guard_session_credit_settlement();

create or replace function public.complete_session(p_session_id uuid)
returns jsonb
language plpgsql
security definer
set search_path = public, pg_temp
as $$
declare
  v_session public.sessions%rowtype;
  v_available_credits numeric(12, 2);
  v_existing_entries integer;
begin
  if auth.uid() is null then
    raise exception 'Sign in to confirm session completion.';
  end if;

  select * into v_session
  from public.sessions
  where id = p_session_id
  for update;

  if not found or auth.uid() not in (v_session.mentor_id, v_session.learner_id) then
    raise exception 'This session is unavailable or you are not a participant.';
  end if;

  if v_session.status = 'completed' then
    select count(*) into v_existing_entries
    from public.credit_ledger
    where session_id = p_session_id;

    if v_existing_entries = 2 then
      if not exists (
        select 1 from public.credit_ledger
        where session_id = p_session_id
          and user_id = v_session.learner_id
          and entry_type = 'spend'
          and amount = -v_session.credits_reserved
      ) or not exists (
        select 1 from public.credit_ledger
        where session_id = p_session_id
          and user_id = v_session.mentor_id
          and entry_type = 'earn'
          and amount = v_session.credits_reserved
      ) then
        raise exception 'Existing credit entries do not match this session; settlement requires review.';
      end if;

      return jsonb_build_object(
        'status', v_session.status,
        'mentor_completed_at', v_session.mentor_completed_at,
        'learner_completed_at', v_session.learner_completed_at,
        'settled', true
      );
    elsif v_existing_entries > 0 then
      raise exception 'Existing credit entries do not match this session; settlement requires review.';
    end if;
  end if;

  if v_session.status = 'cancelled' then
    raise exception 'A cancelled session cannot be completed.';
  end if;

  if auth.uid() = v_session.mentor_id then
    update public.sessions
    set mentor_completed_at = coalesce(mentor_completed_at, now())
    where id = p_session_id
    returning * into v_session;
  else
    update public.sessions
    set learner_completed_at = coalesce(learner_completed_at, now())
    where id = p_session_id
    returning * into v_session;
  end if;

  if v_session.mentor_completed_at is null or v_session.learner_completed_at is null then
    return jsonb_build_object(
      'status', v_session.status,
      'mentor_completed_at', v_session.mentor_completed_at,
      'learner_completed_at', v_session.learner_completed_at,
      'settled', false
    );
  end if;

  perform 1
  from public.profiles
  where id = v_session.learner_id
  for update;

  if not found then
    raise exception 'The learner profile is unavailable.';
  end if;

  select coalesce(sum(amount), 0)
  into v_available_credits
  from public.credit_ledger
  where user_id = v_session.learner_id;

  if v_available_credits < v_session.credits_reserved then
    raise exception 'The learner needs % credits but has % available.',
      v_session.credits_reserved, v_available_credits;
  end if;

  if exists (
    select 1 from public.credit_ledger where session_id = p_session_id
  ) then
    raise exception 'Credit entries already exist for this session; settlement requires review.';
  end if;

  insert into public.credit_ledger (user_id, session_id, amount, entry_type, description)
  values
    (
      v_session.learner_id,
      v_session.id,
      -v_session.credits_reserved,
      'spend',
      'Session payment'
    ),
    (
      v_session.mentor_id,
      v_session.id,
      v_session.credits_reserved,
      'earn',
      'Session earning'
    );

  if v_session.status <> 'completed' then
    update public.sessions
    set status = 'completed'
    where id = p_session_id
    returning * into v_session;
  end if;

  return jsonb_build_object(
    'status', v_session.status,
    'mentor_completed_at', v_session.mentor_completed_at,
    'learner_completed_at', v_session.learner_completed_at,
    'settled', true
  );
end;
$$;

revoke all on function public.complete_session(uuid) from public, anon, authenticated;
grant execute on function public.complete_session(uuid) to authenticated;

-- -----------------------------------------------------------------------------
-- Compatibility table used by the current /api/health endpoint
-- -----------------------------------------------------------------------------

create table if not exists public.items (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  payload jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default timezone('utc', now())
);

create index if not exists items_user_idx on public.items (user_id);

-- -----------------------------------------------------------------------------
-- Row Level Security
-- -----------------------------------------------------------------------------

alter table public.profiles enable row level security;
alter table public.verification_submissions enable row level security;
alter table public.skills enable row level security;
alter table public.skill_availability enable row level security;
alter table public.sessions enable row level security;
alter table public.session_messages enable row level security;
alter table public.call_sessions enable row level security;
alter table public.credit_ledger enable row level security;
alter table public.session_ratings enable row level security;
alter table public.items enable row level security;

drop policy if exists "Profiles are visible to signed-in users" on public.profiles;
drop policy if exists "Users update their own profile" on public.profiles;
drop policy if exists "Users view their verification submissions" on public.verification_submissions;
drop policy if exists "Users submit their own verification" on public.verification_submissions;
drop policy if exists "Published skills are public to signed-in users" on public.skills;
drop policy if exists "Users create their own skills" on public.skills;
drop policy if exists "Users update their own skills" on public.skills;
drop policy if exists "Users delete their own skills" on public.skills;
drop policy if exists "Availability follows skill visibility" on public.skill_availability;
drop policy if exists "Skill owners manage availability" on public.skill_availability;
drop policy if exists "Session participants view sessions" on public.sessions;
drop policy if exists "Learners request sessions" on public.sessions;
drop policy if exists "Session participants update sessions" on public.sessions;
drop policy if exists "Session participants view messages" on public.session_messages;
drop policy if exists "Session participants send messages" on public.session_messages;
drop policy if exists "Call participants view their calls" on public.call_sessions;
drop policy if exists "Users start calls" on public.call_sessions;
drop policy if exists "Call participants update call status" on public.call_sessions;
drop policy if exists "Users view their credit ledger" on public.credit_ledger;
drop policy if exists "Session participants view ratings" on public.session_ratings;
drop policy if exists "Participants submit ratings" on public.session_ratings;
drop policy if exists "Users view their items" on public.items;
drop policy if exists "Users create their own items" on public.items;

create policy "Profiles are visible to signed-in users"
  on public.profiles for select to authenticated using (true);
create policy "Users update their own profile"
  on public.profiles for update to authenticated using (id = auth.uid()) with check (id = auth.uid());

create policy "Users view their verification submissions"
  on public.verification_submissions for select to authenticated using (user_id = auth.uid());
create policy "Users submit their own verification"
  on public.verification_submissions for insert to authenticated with check (user_id = auth.uid());

create policy "Published skills are public to signed-in users"
  on public.skills for select to authenticated using (status = 'published' or owner_id = auth.uid());
create policy "Users create their own skills"
  on public.skills for insert to authenticated with check (owner_id = auth.uid());
create policy "Users update their own skills"
  on public.skills for update to authenticated using (owner_id = auth.uid()) with check (owner_id = auth.uid());
create policy "Users delete their own skills"
  on public.skills for delete to authenticated using (owner_id = auth.uid());

create policy "Availability follows skill visibility"
  on public.skill_availability for select to authenticated using (
    exists (
      select 1 from public.skills
      where skills.id = skill_availability.skill_id
        and (skills.status = 'published' or skills.owner_id = auth.uid())
    )
  );
create policy "Skill owners manage availability"
  on public.skill_availability for all to authenticated using (
    exists (select 1 from public.skills where skills.id = skill_availability.skill_id and skills.owner_id = auth.uid())
  ) with check (
    exists (select 1 from public.skills where skills.id = skill_availability.skill_id and skills.owner_id = auth.uid())
  );

create policy "Session participants view sessions"
  on public.sessions for select to authenticated using (mentor_id = auth.uid() or learner_id = auth.uid());
create policy "Learners request sessions"
  on public.sessions for insert to authenticated with check (learner_id = auth.uid());
create policy "Session participants view messages"
  on public.session_messages for select to authenticated using (
    exists (select 1 from public.sessions where sessions.id = session_messages.session_id and (sessions.mentor_id = auth.uid() or sessions.learner_id = auth.uid()))
  );
create policy "Session participants send messages"
  on public.session_messages for insert to authenticated with check (
    sender_id = auth.uid()
    and exists (select 1 from public.sessions where sessions.id = session_messages.session_id and (sessions.mentor_id = auth.uid() or sessions.learner_id = auth.uid()))
  );

create policy "Call participants view their calls"
  on public.call_sessions for select to authenticated
  using (caller_id = auth.uid() or recipient_id = auth.uid());
create policy "Users start calls"
  on public.call_sessions for insert to authenticated
  with check (caller_id = auth.uid() and recipient_id <> auth.uid());
create policy "Call participants update call status"
  on public.call_sessions for update to authenticated
  using (caller_id = auth.uid() or recipient_id = auth.uid())
  with check (caller_id = auth.uid() or recipient_id = auth.uid());
grant select, insert, update on public.call_sessions to authenticated;

create policy "Users view their credit ledger"
  on public.credit_ledger for select to authenticated using (user_id = auth.uid());

create policy "Session participants view ratings"
  on public.session_ratings for select to authenticated using (reviewer_id = auth.uid() or reviewee_id = auth.uid());
create policy "Participants submit ratings"
  on public.session_ratings for insert to authenticated with check (
    reviewer_id = auth.uid()
    and exists (select 1 from public.sessions where sessions.id = session_ratings.session_id and (sessions.mentor_id = auth.uid() or sessions.learner_id = auth.uid()))
  );

create policy "Users view their items"
  on public.items for select to authenticated using (user_id = auth.uid());
create policy "Users create their own items"
  on public.items for insert to authenticated with check (user_id = auth.uid());

-- -----------------------------------------------------------------------------
-- Private storage buckets and ownership policies
-- -----------------------------------------------------------------------------

insert into storage.buckets (id, name, public)
values ('files', 'files', false), ('student-verification', 'student-verification', false)
on conflict (id) do nothing;

drop policy if exists "Users upload their own files" on storage.objects;
drop policy if exists "Users view their own files" on storage.objects;
drop policy if exists "Users delete their own files" on storage.objects;
drop policy if exists "Signed-in users can view active profile photos" on storage.objects;

create policy "Users upload their own files"
  on storage.objects for insert to authenticated with check (
    bucket_id in ('files', 'student-verification')
    and (storage.foldername(name))[1] = auth.uid()::text
  );
create policy "Users view their own files"
  on storage.objects for select to authenticated using (
    bucket_id in ('files', 'student-verification')
    and (storage.foldername(name))[1] = auth.uid()::text
  );
create policy "Signed-in users can view active profile photos"
  on storage.objects for select to authenticated using (
    bucket_id = 'files'
    and exists (
      select 1
      from public.profiles
      where profiles.avatar_path = storage.objects.name
    )
  );
create policy "Users delete their own files"
  on storage.objects for delete to authenticated using (
    bucket_id in ('files', 'student-verification')
    and (storage.foldername(name))[1] = auth.uid()::text
  );

drop policy if exists "Call participants can receive private signaling" on realtime.messages;
drop policy if exists "Call participants can send private signaling" on realtime.messages;
create policy "Call participants can receive private signaling"
  on realtime.messages for select to authenticated using (
    split_part(realtime.topic(), ':', 1) = 'skilearn-call'
    and exists (
      select 1
      from public.call_sessions
      where call_sessions.id::text = split_part(realtime.topic(), ':', 2)
        and auth.uid() in (call_sessions.caller_id, call_sessions.recipient_id)
    )
  );
create policy "Call participants can send private signaling"
  on realtime.messages for insert to authenticated with check (
    split_part(realtime.topic(), ':', 1) = 'skilearn-call'
    and exists (
      select 1
      from public.call_sessions
      where call_sessions.id::text = split_part(realtime.topic(), ':', 2)
        and auth.uid() in (call_sessions.caller_id, call_sessions.recipient_id)
    )
  );