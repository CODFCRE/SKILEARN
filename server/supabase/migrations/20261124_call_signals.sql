create table if not exists public.call_signals (
  id uuid primary key default gen_random_uuid(),
  call_id uuid not null references public.call_sessions(id) on delete cascade,
  sender_id uuid not null references auth.users(id) on delete cascade,
  payload jsonb not null,
  created_at timestamptz not null default timezone('utc', now())
);

create index if not exists call_signals_call_created_idx
  on public.call_signals(call_id, created_at desc);

alter table public.call_signals enable row level security;

drop policy if exists "Call participants insert signals" on public.call_signals;
create policy "Call participants insert signals"
  on public.call_signals for insert to authenticated
  with check (
    sender_id = auth.uid()
    and exists (
      select 1 from public.call_sessions
      where id = call_id
        and auth.uid() in (caller_id, recipient_id)
    )
  );

drop policy if exists "Call participants view signals" on public.call_signals;
create policy "Call participants view signals"
  on public.call_signals for select to authenticated
  using (
    exists (
      select 1 from public.call_sessions
      where id = call_id
        and auth.uid() in (caller_id, recipient_id)
    )
  );

grant select, insert on public.call_signals to authenticated;

do $$ begin
  if not exists (
    select 1
    from pg_publication_tables
    where pubname = 'supabase_realtime'
      and schemaname = 'public'
      and tablename = 'call_signals'
  ) then
    alter publication supabase_realtime add table public.call_signals;
  end if;
end $$;
