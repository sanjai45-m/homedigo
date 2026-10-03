This is a [Next.js](https://nextjs.org) project bootstrapped with [`create-next-app`](https://nextjs.org/docs/app/api-reference/cli/create-next-app).

## Appointment confirmation and reminders

Doctors open `/partner/dashboard` from the appointment email and click **Confirm Availability**.
This saves the confirmation and queues two emails atomically: a patient confirmation sent immediately,
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
