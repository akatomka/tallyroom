-- Run once in the Supabase SQL Editor before enabling live reminders.
begin;

create table public.document_reminders (
  id uuid primary key default gen_random_uuid(),
  document_id uuid not null unique references public.documents(id) on delete cascade,
  state text not null default 'processing' check (state in ('processing', 'sent', 'needs_review')),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

alter table public.document_reminders enable row level security;
revoke all on public.document_reminders from anon, authenticated;
grant all on public.document_reminders to service_role;

-- The unique document_id prevents simultaneous workers claiming the same document.
-- Recheck current eligibility at reservation time, using the firm's London date.
create function public.claim_document_reminder(target_document uuid)
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

commit;
