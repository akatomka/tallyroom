# Trial submission and video notes

## Verified

- Document visibility and staff export restrictions are merged and deployed on main.
- The production login page loads; signed-out dashboard access redirects to login.
- Authenticated requests for both seeded clients show the expected business and documents, without the other client's sample document.
- Anonymous exports return 401; exports by both seeded clients return 403.
- The combined branch has 34 passing tests. These include real Supabase visibility tests and mocked route/provider checks.
- The reminder database was independently verified: five concurrent claims create one reservation, ineligible documents are excluded, and client/anonymous access is denied. Temporary records were removed.
- The application SMTP adapter submitted a synthetic reminder over TLS to Ethereal. Ethereal captures mail and does not deliver to real recipients.
- Production build validation is recorded in the reminder PR.

## Not yet verified or delivered

- Real inbox delivery through the firm's email provider; waiting for configuration/clarification.
- Production Vercel cron invocation. Production main does not contain the reminder endpoint yet.
- Preview endpoint behaviour on Vercel: the supplied preview URL requires Vercel sign-in, so unauthenticated external checks only reached that protection layer.
- Staff export with an actual approved staff account; successful route tests use a mocked database. The allowlist is empty by default.
- SMS is not implemented. Requirements: provider/access, sender setup, budget, client mobile numbers, recipient preferences, and failure/duplicate handling.
- Revocation/replacement of the service-role key exposed in chat has not been independently confirmed. Check locally and in Vercel; never show keys in the video.

## Video outline (aim for 8-9 minutes; maximum 10)

Camera on and screen shared throughout. Close .env.local and any credential files.

### 0:00-4:00: the project linked in your application

Answer these in the required order using real examples from that project:

1. Show the code you are proudest of. Explain the problem, choice and tradeoff.
2. Show something that broke. Explain the symptoms, investigation, root cause and fix.
3. Explain where AI helped and one correction you made. Do not substitute a Tallyroom example for this part or invent an experience.

### 4:00-8:30: Tallyroom

1. State the priorities: restore document access first, then reminders and additional access protection.
2. Sign in as each seeded client on production; show three documents for Harbour Bakery and two for Northgate Plumbing. Sign out between clients.
3. Show the original policy in GitHub's PR diff and explain business ID versus user ID. The fix follows document -> business -> authenticated user.
4. Show the separate Issues and PRs. Explain that staff exports bypass client RLS, so the route now checks verified staff access before creating an admin connection.
5. Run `npm test`. Explain that 34 passing tests cover several layers; they do not prove real inbox delivery or a deployed cron run.
6. Run `npm run reminders:preview` and show the labelled email text. Optionally show the synthetic email already captured in Ethereal. Do not expose the mailbox password.
7. Explain day-eight eligibility, one reminder per document, atomic duplicate protection, and why ambiguous SMTP failures need review before retrying.
8. Show `vercel.json` and the disabled sending setting in .env.example, not the real environment file. Explain that the schedule is configured in code but not yet verified in production.
9. Explain dependencies: firm SMTP settings, production schedule verification, and SMS provider/phone-number requirements. State what is unfinished.

### 8:30-9:00: handoff

Mention the README setup, tests, migration and operational notes. Summarise the next action: confirm provider settings, verify a real test delivery and cron, then enable reminders.

## Final submission

Send Zoe the repository link, the reply in `docs/reply-to-priya.md`, and your recorded video link by the promised deadline. If the repository is private, add the collaborator named in the brief. Check video sharing permissions using a signed-out browser. The client email is a draft; it has not been sent.

Keep reminder PR #4 open with the remaining verification visible. Do not describe preview or sandbox SMTP as production delivery. Deployment of the reminder branch and enabling emails are separate steps.
