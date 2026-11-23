alter table public.profiles
  add column if not exists banner_path text;

drop policy if exists "Signed-in users can view active profile photos" on storage.objects;
create policy "Signed-in users can view active profile photos"
  on storage.objects for select to authenticated
  using (
    bucket_id = 'files'
    and exists (
      select 1
      from public.profiles
      where profiles.avatar_path = storage.objects.name
        or profiles.banner_path = storage.objects.name
    )
  );
