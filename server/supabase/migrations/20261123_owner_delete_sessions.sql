drop policy if exists "Session mentors delete their sessions" on public.sessions;

create policy "Session mentors delete their sessions"
  on public.sessions for delete to authenticated
  using (mentor_id = auth.uid());
