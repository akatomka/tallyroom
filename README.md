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

## Contact

Priya Shah, Operations Manager at the firm.
