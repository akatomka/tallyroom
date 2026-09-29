# Tallyroom

Tallyroom is a client portal for a small accountancy firm. The firm's clients sign in, see the documents the firm needs from them, and which ones are still outstanding.

Built with Next.js, Supabase and TypeScript.

Current version: 1.4

## Setup

You'll need Node 20 or later, a GitHub account and a free Supabase account.

1. Install dependencies:

   ```
   npm install
   ```

2. Create a new project at [supabase.com](https://supabase.com).

3. In your Supabase project, open **SQL Editor**, create a new query, paste in the contents of `setup.sql` and run it.

4. Copy `.env.example` to `.env.local` and fill in the three values from **Project Settings > API Keys** in Supabase:

   - `NEXT_PUBLIC_SUPABASE_URL`: your project URL
   - `NEXT_PUBLIC_SUPABASE_ANON_KEY`: the publishable (anon) key
   - `SUPABASE_SERVICE_ROLE_KEY`: the secret (service role) key

5. Create the test clients and their documents:

   ```
   npm run seed
   ```

6. Start the app and open [http://localhost:3000](http://localhost:3000):

   ```
   npm run dev
   ```

7. Run the tests:

   ```
   npm test
   ```

## Test logins

| Client | Email | Password |
|---|---|---|
| Harbour Bakery Ltd | alex@tallyroom.test | trial-pass-1 |
| Northgate Plumbing | sam@tallyroom.test | trial-pass-2 |

## Project structure

```
app/
  login/          sign in and sign out
  dashboard/      the client's document list
  api/export/     month-end document export
lib/
  supabase/       Supabase clients (server and admin)
  email/          outgoing email
scripts/
  seed.ts         test data
tests/            automated tests
setup.sql         database tables and access rules
```

## Overdue email reminders

The app checks daily for outstanding documents whose due date is **more than
seven calendar days ago**, using Europe/London dates. Exactly seven days overdue
does not qualify. Each document gets one reminder, even if later rescheduled or
marked outstanding again. This initial frequency should be confirmed with Priya.

For an existing database, run
`supabase/migrations/202609300002_document_reminders.sql` once in Supabase SQL
Editor. Fresh databases get the same schema from `setup.sql`.

### Local preview

Run `npm run reminders:preview`. It reads eligible documents and the account email
linked to each business, then saves clearly labelled text previews under
`.reminder-previews/` (ignored by Git). No email is sent and no reminder records
are written. It can run before applying the new migration. Previews show all
eligible documents, including ones already reminded, for inspecting message text.
The seed data produces two previews. The `.test` addresses cannot receive live
email and are rejected by the live sender. Do not reseed just to preview: seeding
replaces documents and therefore deletes their associated reminder history.

### Live SMTP configuration

Ask Dan for the SMTP host, port (465 or 587), username, password/app password and
approved sender address. Confirm his provider supports SMTP authentication;
providers requiring OAuth need an additional adapter. Put these server-only values
in `.env.local` for local use, or Vercel environment variables for deployment:

```
SMTP_HOST=
SMTP_PORT=587
SMTP_USER=
SMTP_PASSWORD=
EMAIL_FROM=
REMINDERS_ENABLED=false
CRON_SECRET=
```

TLS is required; port 465 uses TLS immediately, and port 587 uses STARTTLS.
Never put these values in `NEXT_PUBLIC_*` variables or commit real credentials.
Use an account with a real inbox you control for a delivery test; keep the seeded
accounts unchanged so the visibility tests remain repeatable.
After applying the migration and confirming recipient and provider configuration,
set `REMINDERS_ENABLED=true` and run `npm run reminders:send` for an intentional
live run. A successful send means SMTP accepted the message, not guaranteed inbox
delivery; check the test inbox and provider logs as well.

### Vercel scheduling

`vercel.json` schedules `/api/cron/reminders` daily at 08:17 UTC (09:17 during BST).
The Hobby plan has imprecise daily timing; this is not an exact-time promise.
Cron runs on the production deployment, not locally or on preview deployments.
Set the Supabase variables, SMTP variables, `REMINDERS_ENABLED` and a random
`CRON_SECRET` of at least 32 characters in Vercel's production environment and
redeploy. Vercel supplies `Authorization: Bearer <CRON_SECRET>` automatically.
Missing or wrong authentication gets HTTP 401. Keep reminders disabled until
the migration, live inbox test and provider setup are complete. Monitor Vercel
function logs and failed cron runs.

### Duplicate protection and delivery failures

Before sending, an atomic database function rechecks that the document is still
eligible and inserts a unique reservation for it. Repeated or concurrent runs
cannot reserve the same document. A document can still change after reservation;
email is based on its state at reservation time.

`document_reminders` is server-only. Its states are `processing`, `sent`, and
`needs_review`. A timeout can happen after SMTP accepts a message, so uncertain
attempts are not retried automatically. A worker crash can leave `processing`.
If database bookkeeping fails, the reservation remains and prevents another send.
This favours avoiding duplicate mail over automatic retries.

Review `needs_review` and stale `processing` rows in Supabase alongside SMTP
provider logs. Mark confirmed accepted mail as `sent`. Only after confirming
no message was accepted, remove that specific reservation to allow the next run
to retry. Missing addresses/configuration must be corrected before retrying.
Do not clear all reservations. The current sequential worker has a 60-second
Vercel limit and is intended for the small trial dataset; larger workloads need
bounded batches/a queue and monitoring before rollout.

Tests cover eligibility boundaries, London dates, duplicate suppression, failure
handling, preview isolation and authentication. After applying the migration, run
`npm run reminders:check-db` against your seeded test database to verify real
concurrent reservations, eligibility and client/anonymous permissions. It creates
temporary documents and removes them and their reservations afterwards; no mail
is sent. Run this separately from visibility tests, which expect exact document
counts. Mock SMTP tests do not prove actual provider delivery.

## Contact

Priya Shah, Operations Manager at the firm.
