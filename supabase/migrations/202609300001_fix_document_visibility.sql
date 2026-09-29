-- Apply to an existing database using Supabase SQL Editor.
-- Documents belong to businesses; businesses link to authenticated users.
begin;

drop policy if exists "clients see own documents" on public.documents;
create policy "clients see own documents" on public.documents
  for select to authenticated
  using (
    exists (
      select 1 from public.clients
      where clients.id = documents.client_id
        and clients.user_id = (select auth.uid())
    )
  );

commit;
