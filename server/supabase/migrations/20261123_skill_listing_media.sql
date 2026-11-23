alter table public.skills
  add column if not exists media_path text,
  add column if not exists media_type text;

do $$ begin
  if not exists (
    select 1 from pg_constraint
    where conname = 'skills_media_type_check'
      and conrelid = 'public.skills'::regclass
  ) then
    alter table public.skills
      add constraint skills_media_type_check
      check (media_type in ('image', 'video'));
  end if;
end $$;

drop policy if exists "Published skill media is visible to signed-in users" on storage.objects;
create policy "Published skill media is visible to signed-in users"
  on storage.objects for select to authenticated
  using (
    bucket_id = 'files'
    and exists (
      select 1
      from public.skills
      where skills.media_path = storage.objects.name
        and skills.status = 'published'
    )
  );
