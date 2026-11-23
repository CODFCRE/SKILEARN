alter table public.direct_messages
  add column if not exists message_type text not null default 'text',
  add column if not exists attachment_path text,
  add column if not exists attachment_name text,
  add column if not exists attachment_mime text,
  add column if not exists attachment_size bigint,
  add column if not exists voice_duration_seconds integer;

do $$ begin
  if not exists (
    select 1 from pg_constraint
    where conname = 'direct_messages_message_type_check'
      and conrelid = 'public.direct_messages'::regclass
  ) then
    alter table public.direct_messages
      add constraint direct_messages_message_type_check
      check (message_type in ('text', 'image', 'voice', 'file'));
  end if;
end $$;

alter table public.call_sessions
  add column if not exists call_type text not null default 'video';

do $$ begin
  if not exists (
    select 1 from pg_constraint
    where conname = 'call_sessions_call_type_check'
      and conrelid = 'public.call_sessions'::regclass
  ) then
    alter table public.call_sessions
      add constraint call_sessions_call_type_check
      check (call_type in ('video', 'phone'));
  end if;
end $$;

drop policy if exists "Call participants view direct message attachments" on storage.objects;
create policy "Call participants view direct message attachments"
  on storage.objects for select to authenticated
  using (
    bucket_id = 'files'
    and exists (
      select 1
      from public.direct_messages
      join public.direct_message_threads
        on direct_message_threads.id = direct_messages.thread_id
      where direct_messages.attachment_path = storage.objects.name
        and auth.uid() in (direct_message_threads.user_one, direct_message_threads.user_two)
    )
  );
