// Run after deploying the reminder endpoint and setting CRON_SECRET in Vercel.
// Documentation: https://docs.cron-job.org/rest-api.html
const apiKey = process.env.CRON_JOB_API_KEY;
const secret = process.env.CRON_SECRET;
const url = 'https://homedigo.vercel.app/api/cron/appointment-reminders';

async function api(path, method = 'GET', body) {
  const response = await fetch(`https://api.cron-job.org${path}`, {
    method,
    headers: { Authorization: `Bearer ${apiKey}`, 'Content-Type': 'application/json' },
    body: body ? JSON.stringify(body) : undefined,
    signal: AbortSignal.timeout(20000),
  });
  if (!response.ok) throw new Error(`Scheduler API returned HTTP ${response.status}.`);
  return response.json();
}

try {
  if (!apiKey || !secret || secret.length < 32) {
    throw new Error('Set CRON_JOB_API_KEY and a CRON_SECRET of at least 32 characters in .env.local.');
  }
  const existing = await api('/jobs');
  if (existing.someFailed || !Array.isArray(existing.jobs)) {
    throw new Error('Could not list all jobs safely. Retry before creating a new job.');
  }
  const matches = existing.jobs.filter(job => job.url === url);
  if (matches.length > 1) throw new Error('Multiple matching jobs exist. Keep one job in the scheduler console before retrying.');
  const job = {
    url,
    title: 'HomeDigo appointment emails',
    enabled: true,
    saveResponses: false,
    requestMethod: 0,
    extendedData: { headers: { Authorization: `Bearer ${secret}` } },
    schedule: { timezone: 'Asia/Kolkata', expiresAt: 0, hours: [-1], minutes: [-1], mdays: [-1], months: [-1], wdays: [-1] },
  };
  const result = matches.length
    ? await api(`/jobs/${matches[0].jobId}`, 'PATCH', { job })
    : await api('/jobs', 'PUT', { job });
  const id = matches[0]?.jobId ?? result.jobId;
  if (!id) throw new Error('Scheduler did not return a job ID. Inspect the console before retrying.');
  const saved = await api(`/jobs/${id}`);
  if (saved.jobDetails?.url !== url || !saved.jobDetails?.enabled) {
    throw new Error('Job activation could not be verified. Inspect the scheduler console.');
  }
  console.log(`Appointment reminder job ${id} is enabled every minute. Check its execution history for successful HTTP 200 responses.`);
} catch (error) {
  console.error(error instanceof Error ? error.message : 'Scheduler setup failed.');
  process.exitCode = 1;
}
