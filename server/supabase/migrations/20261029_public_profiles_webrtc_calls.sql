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
