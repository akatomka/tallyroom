-- Tallyroom database setup
-- Run this once in your Supabase project: SQL Editor > New query > paste > Run.

create table if not exists public.clients (
  id uuid primary key default gen_random_uuid(),
  name text not null,
  user_id uuid not null references auth.users(id) on delete cascade,
  created_at timestamptz not null default now()
);

create table if not exists public.documents (
  id uuid primary key default gen_random_uuid(),
  client_id uuid not null references public.clients(id) on delete cascade,
  name text not null,
  doc_type text not null check (doc_type in ('receipt', 'invoice', 'bank_statement')),
  status text not null default 'outstanding' check (status in ('outstanding', 'received')),
  due_date date not null,
  created_at timestamptz not null default now()
);

grant select on public.clients, public.documents to authenticated;
grant all on public.clients, public.documents to service_role;

alter table public.clients enable row level security;
alter table public.documents enable row level security;

drop policy if exists "clients see own record" on public.clients;
create policy "clients see own record" on public.clients
  for select to authenticated
  using (user_id = auth.uid());

-- Release 1.4: client businesses split out from user accounts
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

-- Automatic email reminders: one reservation per document, server access only.
create table if not exists public.document_reminders (
  id uuid primary key default gen_random_uuid(),
  document_id uuid not null unique references public.documents(id) on delete cascade,
  state text not null default 'processing' check (state in ('processing', 'sent', 'needs_review')),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

alter table public.document_reminders enable row level security;
revoke all on public.document_reminders from anon, authenticated;
grant all on public.document_reminders to service_role;

create or replace function public.claim_document_reminder(target_document uuid)
returns uuid
language sql
security invoker
set search_path = ''
as $$
  insert into public.document_reminders (document_id)
  select d.id from public.documents d
  where d.id = target_document
    and d.status = 'outstanding'
    and d.due_date < (now() at time zone 'Europe/London')::date - 7
  on conflict (document_id) do nothing
  returning id;
$$;

revoke all on function public.claim_document_reminder(uuid) from public, anon, authenticated;
grant execute on function public.claim_document_reminder(uuid) to service_role;
