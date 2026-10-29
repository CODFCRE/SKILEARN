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
  created_at timestamptz not null default timezone('utc', now()),
  updated_at timestamptz not null default timezone('utc', now()),
  check (mentor_id <> learner_id),
  check (ends_at > starts_at)
);

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
alter table public.credit_ledger enable row level security;
alter table public.session_ratings enable row level security;
alter table public.items enable row level security;

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
create policy "Session participants update sessions"
  on public.sessions for update to authenticated using (mentor_id = auth.uid() or learner_id = auth.uid()) with check (mentor_id = auth.uid() or learner_id = auth.uid());

create policy "Session participants view messages"
  on public.session_messages for select to authenticated using (
    exists (select 1 from public.sessions where sessions.id = session_messages.session_id and (sessions.mentor_id = auth.uid() or sessions.learner_id = auth.uid()))
  );
create policy "Session participants send messages"
  on public.session_messages for insert to authenticated with check (
    sender_id = auth.uid()
    and exists (select 1 from public.sessions where sessions.id = session_messages.session_id and (sessions.mentor_id = auth.uid() or sessions.learner_id = auth.uid()))
  );

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
create policy "Users delete their own files"
  on storage.objects for delete to authenticated using (
    bucket_id in ('files', 'student-verification')
    and (storage.foldername(name))[1] = auth.uid()::text
  );