-- Apply to existing projects to enable private, session-independent messages.

create table if not exists public.direct_message_threads (
  id uuid primary key default gen_random_uuid(),
  user_one uuid not null references auth.users(id) on delete cascade,
  user_two uuid not null references auth.users(id) on delete cascade,
  created_at timestamptz not null default timezone('utc', now()),
  check (user_one < user_two),
  unique (user_one, user_two)
);

create table if not exists public.direct_messages (
  id uuid primary key default gen_random_uuid(),
  thread_id uuid not null references public.direct_message_threads(id) on delete cascade,
  sender_id uuid not null references auth.users(id) on delete cascade,
  body text not null check (char_length(trim(body)) between 1 and 5000),
  sent_at timestamptz not null default timezone('utc', now())
);

create index if not exists direct_messages_thread_idx
  on public.direct_messages (thread_id, sent_at);

alter table public.direct_message_threads enable row level security;
alter table public.direct_messages enable row level security;

drop policy if exists "Participants view direct message threads" on public.direct_message_threads;
drop policy if exists "Participants create direct message threads" on public.direct_message_threads;
drop policy if exists "Participants view direct messages" on public.direct_messages;
drop policy if exists "Participants send direct messages" on public.direct_messages;

create policy "Participants view direct message threads"
  on public.direct_message_threads for select to authenticated
  using (auth.uid() in (user_one, user_two));

create policy "Participants create direct message threads"
  on public.direct_message_threads for insert to authenticated
  with check (auth.uid() in (user_one, user_two) and user_one <> user_two);

create policy "Participants view direct messages"
  on public.direct_messages for select to authenticated
  using (
    exists (
      select 1
      from public.direct_message_threads
      where direct_message_threads.id = direct_messages.thread_id
        and auth.uid() in (direct_message_threads.user_one, direct_message_threads.user_two)
    )
  );

create policy "Participants send direct messages"
  on public.direct_messages for insert to authenticated
  with check (
    sender_id = auth.uid()
    and exists (
      select 1
      from public.direct_message_threads
      where direct_message_threads.id = direct_messages.thread_id
        and auth.uid() in (direct_message_threads.user_one, direct_message_threads.user_two)
    )
  );

grant select, insert on public.direct_message_threads to authenticated;
grant select, insert on public.direct_messages to authenticated;
