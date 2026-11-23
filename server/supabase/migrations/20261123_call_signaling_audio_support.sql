alter table public.call_sessions
  add column if not exists call_type text not null default 'video';

do $$ begin
  if not exists (
    select 1
    from pg_constraint
    where conname = 'call_sessions_call_type_check'
      and conrelid = 'public.call_sessions'::regclass
  ) then
    alter table public.call_sessions
      add constraint call_sessions_call_type_check
      check (call_type in ('video', 'phone'));
  end if;
end $$;

drop policy if exists "Call participants can receive private signaling" on realtime.messages;
drop policy if exists "Call participants can send private signaling" on realtime.messages;

create policy "Call participants can receive private signaling"
  on realtime.messages for select to authenticated using (
    (
      split_part(realtime.topic(), ':', 1) = 'skilearn-call'
      or split_part(realtime.topic(), ':', 2) = 'skilearn-call'
    )
    and exists (
      select 1
      from public.call_sessions
      where call_sessions.id::text = (
        case
          when split_part(realtime.topic(), ':', 1) = 'skilearn-call'
            then split_part(realtime.topic(), ':', 2)
          else split_part(realtime.topic(), ':', 3)
        end
      )
        and auth.uid() in (call_sessions.caller_id, call_sessions.recipient_id)
    )
  );

create policy "Call participants can send private signaling"
  on realtime.messages for insert to authenticated with check (
    (
      split_part(realtime.topic(), ':', 1) = 'skilearn-call'
      or split_part(realtime.topic(), ':', 2) = 'skilearn-call'
    )
    and exists (
      select 1
      from public.call_sessions
      where call_sessions.id::text = (
        case
          when split_part(realtime.topic(), ':', 1) = 'skilearn-call'
            then split_part(realtime.topic(), ':', 2)
          else split_part(realtime.topic(), ':', 3)
        end
      )
        and auth.uid() in (call_sessions.caller_id, call_sessions.recipient_id)
    )
  );
