create table if not exists public.push_devices (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  platform text not null check (platform in ('expo', 'web')),
  token text not null,
  subscription jsonb,
  created_at timestamptz not null default timezone('utc', now()),
  updated_at timestamptz not null default timezone('utc', now()),
  unique (user_id, platform, token)
);

create index if not exists push_devices_user_idx
  on public.push_devices(user_id);

alter table public.push_devices enable row level security;

drop policy if exists "Users manage their push devices" on public.push_devices;
create policy "Users manage their push devices"
  on public.push_devices for all to authenticated
  using (user_id = auth.uid())
  with check (user_id = auth.uid());

grant select, insert, update, delete on public.push_devices to authenticated;
