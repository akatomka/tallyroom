Subject: Tallyroom update: document access restored and reminder next steps

Hi Priya,

I understand why clients were concerned about their missing documents. I traced the issue to an access rule that was not updated when business records were separated from user accounts. It was hiding documents from the people who should be able to see them.

The fix is deployed. In the environment I checked, the documents were still present, and both test clients can now see their own documents without seeing another client's records. I have added regression checks to help prevent the issue returning.

I also found and restricted an unprotected document export. Exports now require an explicitly authorised staff account and remain disabled until those accounts are configured.

For email reminders, I have implemented a daily check for outstanding documents more than seven days overdue. The initial rule sends one reminder per document, with duplicate protection. I have tested the logic and submitted a demonstration message to a test mailbox. Live emails are still switched off; delivery through the firm's provider and the production schedule have not yet been verified.

Could Dan confirm the email provider, approved sender address and sending configuration, and share the credentials securely? Once those are available, I can test delivery to an agreed inbox and verify the scheduled run before enabling it. Please also confirm whether one reminder per document is sufficient or whether you would prefer follow-up reminders.

For the board meeting, I can demonstrate restored document access and the reminder workflow using a clearly labelled test email. I cannot yet commit to both live email and SMS working by then. SMS is not implemented and needs an agreed provider, sending budget and client mobile numbers. My recommendation is to finish verifying email first, then confirm the SMS scope and delivery date once those details are available.

Kind regards,
Tom
