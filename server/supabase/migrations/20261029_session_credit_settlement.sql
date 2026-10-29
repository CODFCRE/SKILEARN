-- Apply to existing projects to enable two-party session credit settlement.

alter table public.sessions
  add column if not exists mentor_completed_at timestamptz,
  add column if not exists learner_completed_at timestamptz;

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

drop policy if exists "Session participants update sessions" on public.sessions;

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
