This is a [Next.js](https://nextjs.org) project bootstrapped with [`create-next-app`](https://nextjs.org/docs/app/api-reference/cli/create-next-app).

## Google Search setup

The public homepage uses `https://homedigo.vercel.app` for its canonical URL,
sitemap and HomeDigo structured data. To move to a custom domain, set
`NEXT_PUBLIC_SITE_URL` to that HTTPS origin in Production and rebuild. Configure
permanent redirects from the old domain through your hosting provider when moving.
Keep `NEXT_PUBLIC_APP_URL` aligned for links in appointment emails.

After deploying:

1. Add `https://homedigo.vercel.app/` as a URL-prefix property in
   [Google Search Console](https://search.google.com/search-console).
2. Select HTML tag verification and click Verify after deployment. The owner's
   supplied public verification token is included in the root layout. Keep it in
   place after verification. For an additional owner, set their tag's `content`
   value in the Production environment variable `GOOGLE_SITE_VERIFICATION` and
   redeploy before verifying; this adds a tag without replacing the existing one.
3. Submit `https://homedigo.vercel.app/sitemap.xml` in Search Console's Sitemaps panel.
4. Inspect `https://homedigo.vercel.app/` with URL Inspection, run the live test,
   and request indexing. Check that production is publicly accessible and the
   host does not send an `X-Robots-Tag: noindex` header.
5. Monitor indexing and search queries containing `homedigo` in Search Console.

The homepage opts into indexing. Other HTML routes inherit `noindex` so account,
booking and staff screens are not search landing pages; authentication still
controls access to private data. New public pages must explicitly opt into
indexing, define their own canonical URL, and be added to `src/app/sitemap.ts`.
Vercel previews remain `noindex` and emit an empty sitemap.

The structured data describes only the brand and services already shown on the
homepage. Keep its contact number and service area aligned with the visible page.
These changes help Google understand the site; indexing and a first-place ranking
are not guaranteed. Recrawling can take days to weeks. See Google's
[site name guidance](https://developers.google.com/search/docs/appearance/site-names)
and [recrawl instructions](https://developers.google.com/search/docs/crawling-indexing/ask-google-to-recrawl).

## Appointment confirmation and reminders

Doctors open the appointment from their notification email, review the receipt and click
**Verify Payment & Accept Appointment**. This saves the confirmation and queues two emails atomically: a patient confirmation sent immediately,
and a doctor reminder due 15 minutes before the slot starts. New bookings remain `PENDING` until the
assigned doctor confirms. The confirmation email goes to the booking account's email, including
when that account books for a family member. All appointment times use IST (Asia/Kolkata).

### Production setup on Vercel Hobby

1. Configure the existing SMTP credentials (`SMTP_HOST`, `SMTP_PORT`, `SMTP_USER`, `SMTP_PASS`,
   optionally `SMTP_SECURE`, `SMTP_FROM_EMAIL`, `SMTP_FROM_NAME`) and set
   `NEXT_PUBLIC_APP_URL=https://homedigo.vercel.app` in Vercel Production.
2. Generate a random secret with `node -e "console.log(require('node:crypto').randomBytes(32).toString('hex'))"`.
   Save it as `CRON_SECRET` in Vercel Production and redeploy these changes.
3. Create a free [cron-job.org](https://cron-job.org/en/) job with these settings:
   - URL: `https://homedigo.vercel.app/api/cron/appointment-reminders`
   - Method: **GET**
   - Schedule: **Every minute**
   - Request header: `Authorization: Bearer <your CRON_SECRET>`
   - Enable failure notifications and check execution history after activation.

Alternatively, add `CRON_JOB_API_KEY` (from cron-job.org Settings) and the matching `CRON_SECRET`
to your local `.env.local`, then run:

```bash
node --env-file=.env.local scripts/setup-appointment-cron.mjs
```

The setup script creates or updates the job for the production endpoint. It never prints either secret.
Do not add `CRON_JOB_API_KEY` to public environment variables or source control.
The runtime creates the additive appointment columns and email queue automatically on first use;
the database role needs permission to alter `bookings` and create `appointment_emails`.

[Vercel Hobby only permits daily built-in cron jobs](https://vercel.com/docs/cron-jobs/usage-and-pricing).
The former five-minute keep-warm cron was removed from `vercel.json` because it prevents Hobby deployment.
The external job supplies the minute-level trigger. No browser tab needs to remain open.
Reminders are **not active until the external job is configured and the code is deployed**.

### Delivery behavior and verification

The worker sends on the first minute tick after the reminder becomes due. If confirmation happens
less than 15 minutes before the appointment, the reminder is eligible on the next tick.
Failed email attempts retry once per minute until the appointment starts. Cancelled, completed,
already-started and reassigned bookings are excluded. Reassigning a doctor resets confirmation;
the new doctor must confirm again. Existing relative dates are anchored to the booking's creation date.

Each invocation claims up to 10 messages, so monitor backlog if sending volume grows. Overlapping
calls use database leases; sent messages are recorded to prevent normal duplicate delivery.
SMTP is at-least-once: a process stopping after SMTP accepts an email but before the database records
it can lead to a duplicate on retry. Provider delivery delays can also affect arrival time.

The endpoint returns counts only: HTTP 200 for success, 401 for a wrong token, 502 for SMTP failures,
or 503 for missing configuration/database errors. Test runs on production process real due messages.
Use a test patient and doctor for an end-to-end delivery check after deployment.

```bash
node --test scripts/email.test.mjs scripts/appointments.test.mjs
npm run build
```

## Getting Started

### Payment receipt and doctor acceptance

The final booking step opens Google Pay or PhonePe with the saved UPI ID and amount on
supported mobile browsers. Copying the phone number is a separate manual-payment action.
Without a configured UPI ID, only the manual-payment action is shown. Desktop users
are directed to open the booking on their phone rather than silently copying a number.
Super admins can change it under **Super Admin → Payment Settings**, along with the
recipient name and optional linked UPI ID. The initial number is **9361557446**.
Settings are saved in PostgreSQL and used by newly opened payment steps without a redeploy.
Only authenticated super admins can update them. Changing the number in the form clears
the old UPI ID; enter the new recipient's linked ID if needed. If settings cannot be
loaded, checkout disables app launching rather than falling back to an old number.
On desktop or if app launch is unavailable, the page shows manual payment instructions.
A phone number is not a UPI virtual payment address: recipient/amount prefill requires
the actual linked UPI ID. The optional server environment variables `UPI_PAYEE_ID` and
`UPI_PAYEE_NAME` supply defaults only until settings are first saved in the portal;
saved settings take precedence, including a deliberately blank UPI ID.
Until real details are configured, the initial UPI ID is `homedigo-demo@example`.
Checkout labels it as a demo that cannot receive payments. Replace it before collecting
real payments; saving a blank ID in Payment Settings disables direct payment links.

Patients can browse the booking wizard before signing in. The patient-details and
payment steps include an inline patient sign-in/account-creation form. Payments and
submission require a patient session. An expired session (HTTP 401) displays that same
form without navigating away or discarding the receipt and booking selections.
Saved profiles and addresses are loaded only after patient sign-in; a different account
clears the previous account's receipt and patient-specific notes.

After paying, the patient uploads a PNG, JPEG or WebP screenshot (maximum 2 MB).
The request, private database receipt and doctor notification queue entry are stored
atomically. No payment is automatically marked paid and no invoice is issued at upload.
Submission retries reuse the request key to prevent duplicate requests. The checkout
draft survives returning from the payment app in the same browser tab; after a reload,
the patient must select the screenshot again.

The assigned doctor's email links directly to the appointment. Sign-in preserves
that destination. The doctor reviews patient details and the receipt, confirms payment
was received, and accepts (or declines) the request. Acceptance atomically records the
verifying doctor/time, marks payment paid, creates the invoice and queues the patient's
confirmation email. Legacy already-paid appointments retain their confirmation flow.
Receipts are served only to the owning patient or assigned doctor with private/no-store
headers. Opening a UPI app or uploading a screenshot is never treated as proof of payment.

Configure `SMTP_HOST`, `SMTP_PORT`, `SMTP_USER`, `SMTP_PASS` and the public app URL as
described above. The existing authenticated minute-level appointment cron also retries
failed doctor-review emails. Schema additions run automatically; the database role
needs permission to alter bookings/email constraints and create `payment_receipts` and `payment_settings`.
Receipt data is stored in PostgreSQL; include it in normal private data retention and backups.

Verify with `node --test scripts/email.test.mjs scripts/appointments.test.mjs` and
`npm run build`. Real mobile app launching and actual email inbox delivery require a
configured deployment and device checks; isolated tests use no real payments or emails.

## Optional Firebase browser notifications

Patients and approved doctors can enable appointment notifications from their portal.
Permission is requested only after clicking Enable. Each portal uses a separate browser
installation; Disable and explicit sign-out remove its subscription. Notifications
contain generic appointment updates, with details available only after signing in.
Email delivery and the checkout submission notice continue independently.

Configure all eight variables in section 7 of `.env.example`: `WEB_PUSH_ENABLED=true`,
`FIREBASE_PROJECT_ID`, `FIREBASE_WEB_API_KEY`, `FIREBASE_MESSAGING_SENDER_ID`,
`FIREBASE_WEB_APP_ID`, `FIREBASE_WEB_VAPID_KEY`, `FIREBASE_CLIENT_EMAIL`, and
`FIREBASE_PRIVATE_KEY`. Use the public VAPID key from Firebase Project settings >
Cloud Messaging > Web Push certificates. The service-account email and private key
are server-only; never prefix them with `NEXT_PUBLIC_` or commit the downloaded JSON.
The private key accepts literal `\n` escapes or actual newlines.

For Vercel, copy the values to the project's Production environment and redeploy.
To prepare a Firebase-only import file from local configuration and a newly downloaded
service-account key, run:

```powershell
node scripts/prepare-firebase-env.mjs "C:/path/to/replacement-service-account.json"
```

Import the resulting Git-ignored `.env.firebase.vercel.local` in Vercel's Environment
Variables settings. Without a JSON path, the helper deliberately leaves the private key
blank. Revoke any exposed key before using a replacement. Existing Vercel hosting serves
both the frontend and notification API; Firebase Hosting and Analytics are not required.
The public `/api/push/config` endpoint returns only web configuration, or `enabled: false`
when any required setting is missing. No subscription is created while disabled.

The database role needs permission to create `push_subscriptions` and
`appointment_push_deliveries`; these are created automatically. Requests and acceptances
trigger immediate delivery attempts. The existing authenticated
`/api/cron/appointment-reminders` worker also retries push delivery and sends patient and
doctor reminders approximately 15 minutes before appointments. Keep its existing
minute-level external schedule and `CRON_SECRET` configured; enabling Firebase alone
does not create a scheduler. Doctor cancellations notify patients subscribed before
the booking was created. Requests and confirmations do not replay to new subscriptions.

Delivery is best effort with up to ten attempts, five-minute browser delivery TTL,
and duplicate notification tags. Ownership, roles, partner approval, password changes,
appointment status and assignment are checked again before sending. Registrations stop
receiving after 30 days without a portal refresh; invalid installations are removed.
No private pages are cached by the service workers. iPhone/iPad users need iOS 16.4+
and must add HomeDigo to the Home Screen before enabling notifications. Other supported
browsers require HTTPS (localhost also works), permission and OS notification access.

Verify the database queue and API permissions with
`node --test scripts/push-notifications.test.mjs scripts/api-authorization.test.mjs`.
For the browser flow, start the app on port 3100, then run
`node scripts/push-notifications.browser.mjs`; set `BROWSER_EXECUTABLE` to a local
Chromium/Edge executable if Playwright's browser is not installed. Set `TEST_ORIGIN`
to use another local port. This checks the real UI and Firebase SDK with synthetic
subscriptions and mocked APIs. Actual device delivery still requires a configured
deployment and a user-enabled subscription.

First, run the development server:

```bash
npm run dev
# or
yarn dev
# or
pnpm dev
# or
bun dev
```

Open [http://localhost:3000](http://localhost:3000) with your browser to see the result.

You can start editing the page by modifying `app/page.tsx`. The page auto-updates as you edit the file.

This project uses [`next/font`](https://nextjs.org/docs/app/building-your-application/optimizing/fonts) to automatically optimize and load [Geist](https://vercel.com/font), a new font family for Vercel.

## Learn More

To learn more about Next.js, take a look at the following resources:

- [Next.js Documentation](https://nextjs.org/docs) - learn about Next.js features and API.
- [Learn Next.js](https://nextjs.org/learn) - an interactive Next.js tutorial.

You can check out [the Next.js GitHub repository](https://github.com/vercel/next.js) - your feedback and contributions are welcome!

## Deploy on Vercel

The easiest way to deploy your Next.js app is to use the [Vercel Platform](https://vercel.com/new?utm_medium=default-template&filter=next.js&utm_source=create-next-app&utm_campaign=create-next-app-readme) from the creators of Next.js.

Check out our [Next.js deployment documentation](https://nextjs.org/docs/app/building-your-application/deploying) for more details.
