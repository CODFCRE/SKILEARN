-- Apply to existing projects to enable public member profiles and WebRTC calls.

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

create or replace function public.guard_call_session_update()
returns trigger
language plpgsql
set search_path = public, pg_temp
as $$
begin
  if new.caller_id is distinct from old.caller_id
    or new.recipient_id is distinct from old.recipient_id
    or new.created_at is distinct from old.created_at then
    raise exception 'Call participants and creation time cannot be changed.';
  end if;

  if new.status is not distinct from old.status then
    return new;
  end if;

  if new.status in ('accepted', 'declined') then
    if old.status <> 'ringing' or auth.uid() is distinct from old.recipient_id then
      raise exception 'Only the recipient can answer or decline a ringing call.';
    end if;
  elsif new.status = 'ended' then
    if old.status not in ('ringing', 'accepted')
      or (
        auth.uid() is distinct from old.caller_id
        and auth.uid() is distinct from old.recipient_id
      ) then
      raise exception 'Only a call participant can end an active call.';
    end if;
  elsif new.status = 'missed' then
    if old.status <> 'ringing'
      or (
        auth.uid() is distinct from old.caller_id
        and auth.uid() is distinct from old.recipient_id
      ) then
      raise exception 'Only a call participant can expire an unanswered call.';
    end if;
  else
    raise exception 'Invalid call status transition.';
  end if;

  return new;
end;
$$;

drop trigger if exists call_sessions_guard_update on public.call_sessions;
create trigger call_sessions_guard_update
  before update on public.call_sessions
  for each row execute procedure public.guard_call_session_update();

alter table public.call_sessions enable row level security;

drop policy if exists "Call participants view their calls" on public.call_sessions;
drop policy if exists "Users start calls" on public.call_sessions;
drop policy if exists "Call participants update call status" on public.call_sessions;

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

drop policy if exists "Signed-in users can view active profile photos" on storage.objects;
create policy "Signed-in users can view active profile photos"
  on storage.objects for select to authenticated
  using (
    bucket_id = 'files'
    and exists (
      select 1
      from public.profiles
      where profiles.avatar_path = storage.objects.name
    )
  );

drop policy if exists "Call participants can receive private signaling" on realtime.messages;
drop policy if exists "Call participants can send private signaling" on realtime.messages;

create policy "Call participants can receive private signaling"
  on realtime.messages for select to authenticated
  using (
    split_part(realtime.topic(), ':', 1) = 'skilearn-call'
    and exists (
      select 1
      from public.call_sessions
      where call_sessions.id::text = split_part(realtime.topic(), ':', 2)
        and auth.uid() in (call_sessions.caller_id, call_sessions.recipient_id)
    )
  );

create policy "Call participants can send private signaling"
  on realtime.messages for insert to authenticated
  with check (
    split_part(realtime.topic(), ':', 1) = 'skilearn-call'
    and exists (
      select 1
      from public.call_sessions
      where call_sessions.id::text = split_part(realtime.topic(), ':', 2)
        and auth.uid() in (call_sessions.caller_id, call_sessions.recipient_id)
    )
  );
