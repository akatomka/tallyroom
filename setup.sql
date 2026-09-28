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
  using (client_id = auth.uid());
