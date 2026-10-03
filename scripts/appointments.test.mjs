import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { before, beforeEach, after, test } from 'node:test';
import vm from 'node:vm';
import crypto from 'node:crypto';
import ts from 'typescript';
import { PGlite } from '@electric-sql/pglite';

// Real PostgreSQL SQL execution in memory. No production DB, network or SMTP.
const db = new PGlite();
const env = { CRON_SECRET: 'test-secret', SMTP_HOST: 'smtp.test', SMTP_USER: 'sender@test.local', SMTP_PASS: 'test' };
let session;
let messages;
let smtpFails;
let databaseFails;

const dependencies = {
  'node:crypto': crypto,
  'next/server': { NextResponse: { json: (body, options) => ({ body, status: options?.status || 200 }) } },
  'next-auth/next': { getServerSession: async () => session },
  '@/lib/auth': { authOptions: {} },
  nodemailer: { createTransport: () => ({ sendMail: async message => {
    if (smtpFails) throw Object.assign(new Error('SMTP test failure'), { code: 'ETIMEDOUT' });
    messages.push(message);
    return { accepted: [message.to], messageId: `test-${messages.length}` };
  } }) },
};
const query = async (sql, args = []) => {
  if (databaseFails) return { isConnected: false, rows: [] };
  const result = await db.query(sql, args);
  return { isConnected: true, rows: result.rows };
};
dependencies['./db'] = dependencies['@/lib/db'] = { executeQuery: query, isDbConfigured: true };

function load(path) {
  const source = ts.transpileModule(readFileSync(path, 'utf8'), {
    compilerOptions: { module: ts.ModuleKind.CommonJS, target: ts.ScriptTarget.ES2020, esModuleInterop: true },
  }).outputText;
  const exports = {};
  vm.runInNewContext(source, {
    exports, process: { env }, Buffer, URL, Date,
    console: { log() {}, error() {} },
    require(name) {
      if (!(name in dependencies)) throw new Error(`Unexpected dependency: ${name}`);
      return dependencies[name];
    },
  });
  return exports;
}

const time = load('src/lib/appointment-time.ts');
dependencies['@/lib/appointment-time'] = time;
const schema = load('src/lib/appointment-schema.ts');
dependencies['./appointment-schema'] = dependencies['@/lib/appointment-schema'] = schema;
const email = load('src/lib/email.ts');
dependencies['./email'] = dependencies['@/lib/email'] = email;
const worker = load('src/lib/appointment-notifications.ts');
dependencies['@/lib/appointment-notifications'] = worker;
const confirm = load('src/app/api/pro/visits/[id]/confirm/route.ts').POST;
const cron = load('src/app/api/cron/appointment-reminders/route.ts').GET;
const bookings = load('src/app/api/patient/bookings/route.ts');
const dispatch = load('src/app/api/admin/dispatch/route.ts').PUT;

before(async () => {
  await db.exec(`
    CREATE TABLE users (id VARCHAR(64) PRIMARY KEY, name TEXT, email TEXT, role TEXT);
    CREATE TABLE addresses (id TEXT PRIMARY KEY, lat FLOAT, lng FLOAT);
    CREATE TABLE bookings (
      id VARCHAR(64) PRIMARY KEY, booking_number TEXT, user_id TEXT, patient_profile_id TEXT,
      patient_name TEXT, address_id TEXT, address_text TEXT, service_id TEXT, service_title TEXT,
      partner_id TEXT, partner_name TEXT, partner_title TEXT, partner_img TEXT,
      scheduled_date TEXT, scheduled_time_slot TEXT, status TEXT, total_amount NUMERIC,
      payment_status TEXT, payment_method TEXT, payment_ref TEXT, clinical_instructions TEXT,
      patient_lat FLOAT, patient_lng FLOAT, created_at TIMESTAMPTZ DEFAULT NOW()
    );
    CREATE TABLE invoices (id TEXT, booking_id TEXT, user_id TEXT, invoice_number TEXT,
      service_title TEXT, subtotal NUMERIC, tax_amount NUMERIC, total_paid NUMERIC, payment_ref TEXT);
  `);
  await schema.ensureAppointmentSchema();
});

beforeEach(async () => {
  databaseFails = false;
  smtpFails = false;
  messages = [];
  session = { user: { id: 'doctor', role: 'PARTNER' } };
  env.CRON_SECRET = 'test-secret';
  await db.exec(`TRUNCATE appointment_emails, bookings, users, invoices;
    INSERT INTO users VALUES ('doctor', 'Test Doctor', 'doctor@test.local', 'PARTNER'),
      ('doctor2', 'Second Doctor', 'doctor2@test.local', 'PARTNER'),
      ('patient', 'Test Patient', 'patient@test.local', 'PATIENT');`);
});
after(() => db.close());

async function booking(id = 'booking') {
  await db.query(`INSERT INTO bookings (id, booking_number, user_id, patient_name,
    partner_id, service_title, scheduled_date, scheduled_time_slot, status, total_amount)
    VALUES ($1::text, $1::text, 'patient', 'Test Patient', 'doctor', 'Home Visit', '2099-03-01',
    '10:00 AM - 11:00 AM', 'PENDING', 100)`, [id]);
}
const confirmBooking = (id = 'booking') => confirm({}, { params: Promise.resolve({ id }) });
const runCron = (authorization = 'Bearer test-secret') => cron({ headers: new Headers({ authorization }) });
async function makeReminderDue() {
  await db.exec(`UPDATE bookings SET appointment_starts_at = NOW() + INTERVAL '14 minutes';
    UPDATE appointment_emails SET due_at = NOW() - INTERVAL '1 second' WHERE kind = 'DOCTOR_REMINDER'`);
}

test('IST dates cross UTC midnight and month/year boundaries correctly', () => {
  const now = new Date('2026-12-31T20:00:00Z');
  assert.equal(time.appointmentDate('Today', now), '2027-01-01');
  assert.equal(time.appointmentDate('Tomorrow', now), '2027-01-02');
  assert.equal(time.appointmentDate('Day After Tomorrow', now), '2027-01-03');
  assert.equal(time.appointmentStart('2027-01-01', '12:00 AM - 01:00 AM'), '2026-12-31T18:30:00.000Z');
  assert.equal(time.appointmentStart('2027-01-01', '12:00 PM - 01:00 PM'), '2027-01-01T06:30:00.000Z');
  for (const date of ['2026-02-30', 'yesterday', '2026-13-01']) assert.throws(() => time.appointmentDate(date));
  for (const slot of ['25:00 PM - 11:00 PM', '10:99 AM - 11:00 AM', 'Morning']) {
    assert.throws(() => time.appointmentStart('2027-01-01', slot));
  }
});

test('confirmation saves status, sends patient email, and schedules reminder exactly 15 min before start', async () => {
  await booking();
  const response = await confirmBooking();
  assert.equal(response.status, 200);
  assert.equal(response.body.visit.status, 'CONFIRMED');
  assert.equal(response.body.emailSent, true);
  assert.equal(messages.length, 1);
  assert.equal(messages[0].to, 'patient@test.local');
  assert.match(messages[0].subject, /confirmed/);
  const jobs = (await db.query(`SELECT kind, sent_at,
    EXTRACT(EPOCH FROM (b.appointment_starts_at - e.due_at)) AS lead
    FROM appointment_emails e JOIN bookings b ON b.id = e.booking_id ORDER BY kind`)).rows;
  assert.equal(jobs.length, 2);
  assert.equal(Number(jobs[0].lead), 900);
  assert.equal(jobs[0].sent_at, null);
  assert.ok(jobs[1].sent_at);
});

test('repeated and simultaneous confirmations produce one patient email and one pair of jobs', async () => {
  await booking();
  const responses = await Promise.all([confirmBooking(), confirmBooking()]);
  assert.ok(responses.some(r => r.status === 200));
  assert.equal((await confirmBooking()).body.alreadyConfirmed, true);
  assert.equal(messages.length, 1);
  assert.equal((await db.query('SELECT * FROM appointment_emails')).rows.length, 2);
});

test('only the assigned signed-in doctor can confirm', async () => {
  await booking();
  for (const user of [undefined, { id: 'patient', role: 'PATIENT' }, { id: 'doctor2', role: 'PARTNER' }]) {
    session = user ? { user } : null;
    const response = await confirmBooking();
    assert.ok([401, 404].includes(response.status));
  }
  assert.equal(messages.length, 0);
  assert.equal((await db.query('SELECT * FROM appointment_emails')).rows.length, 0);
});

test('cancelled, completed and past bookings cannot be confirmed', async () => {
  await booking();
  for (const status of ['CANCELLED', 'COMPLETED', 'IN_PROGRESS']) {
    await db.query('UPDATE bookings SET status = $1', [status]);
    assert.equal((await confirmBooking()).status, 409);
  }
  await db.exec(`UPDATE bookings SET status = 'PENDING', scheduled_date = '2020-01-01'`);
  assert.equal((await confirmBooking()).status, 409);
  assert.equal(messages.length, 0);
});

test('legacy Today is anchored to creation date and is not moved to the confirmation day', async () => {
  await booking();
  await db.exec(`UPDATE bookings SET scheduled_date = 'Today', created_at = '2020-01-01T20:00:00Z'`);
  assert.equal((await confirmBooking()).status, 409);
});

test('SMTP failure preserves confirmation and retries the patient email', async () => {
  await booking();
  smtpFails = true;
  const response = await confirmBooking();
  assert.equal(response.body.success, true);
  assert.equal(response.body.emailSent, false);
  const job = (await db.query(`SELECT * FROM appointment_emails WHERE kind = 'PATIENT_CONFIRMATION'`)).rows[0];
  assert.equal(job.sent_at, null);
  assert.equal(job.last_error, 'ETIMEDOUT');
  assert.equal(job.lease_until, null);
  smtpFails = false;
  await db.exec(`UPDATE appointment_emails SET due_at = NOW() WHERE kind = 'PATIENT_CONFIRMATION'`);
  assert.equal((await runCron()).body.sent, 1);
  assert.equal(messages[0].to, 'patient@test.local');
  assert.equal((await runCron()).body.sent, 0);
});

test('reminders wait until due, then concurrent cron calls send only once to the doctor', async () => {
  await booking();
  await confirmBooking();
  assert.equal((await runCron()).body.sent, 0);
  await makeReminderDue();
  const responses = await Promise.all([runCron(), runCron()]);
  assert.equal(responses.reduce((sum, r) => sum + r.body.sent, 0), 1);
  assert.equal(messages.length, 2);
  assert.equal(messages[1].to, 'doctor@test.local');
  assert.match(messages[1].subject, /starting soon/);
  assert.equal((await runCron()).body.sent, 0);
});

test('cancelled, completed, in-progress, past and reassigned appointments do not send reminders', async () => {
  for (const status of ['CANCELLED', 'COMPLETED', 'IN_PROGRESS', 'PAST', 'REASSIGNED']) {
    await booking(status);
    await confirmBooking(status);
  }
  await makeReminderDue();
  await db.exec(`UPDATE bookings SET status = id WHERE id IN ('CANCELLED', 'COMPLETED', 'IN_PROGRESS');
    UPDATE bookings SET appointment_starts_at = NOW() - INTERVAL '1 second' WHERE id = 'PAST';
    UPDATE bookings SET partner_id = 'doctor2' WHERE id = 'REASSIGNED'`);
  assert.equal((await runCron()).body.sent, 0);
  assert.equal(messages.length, 5);
});

test('reassignment invalidates old jobs and requires confirmation by the new doctor', async () => {
  await booking();
  await confirmBooking();
  session = { user: { id: 'admin', role: 'ADMIN' } };
  const reassigned = await dispatch({ json: async () => ({ bookingId: 'booking', partnerId: 'doctor2', partnerName: 'Second Doctor', status: 'ASSIGNED' }) });
  assert.equal(reassigned.body.booking.doctor_confirmed_at, null);
  assert.equal(reassigned.body.booking.status, 'ASSIGNED');
  session = { user: { id: 'doctor2', role: 'PARTNER' } };
  assert.equal((await confirmBooking()).body.emailSent, true);
  await makeReminderDue();
  const countBefore = messages.length;
  assert.equal((await runCron()).body.sent, 1);
  assert.equal(messages.length, countBefore + 1);
  assert.equal(messages.at(-1).to, 'doctor2@test.local');
});

test('expired leases recover after interruption; active leases are not sent twice', async () => {
  await booking();
  await confirmBooking();
  await makeReminderDue();
  await db.exec(`UPDATE appointment_emails SET lease_until = NOW() + INTERVAL '5 minutes', lease_token = 'old' WHERE kind = 'DOCTOR_REMINDER'`);
  assert.equal((await runCron()).body.sent, 0);
  await db.exec(`UPDATE appointment_emails SET lease_until = NOW() - INTERVAL '1 second' WHERE kind = 'DOCTOR_REMINDER'`);
  assert.equal((await runCron()).body.sent, 1);
});

test('cron requires the configured bearer secret', async () => {
  for (const token of ['', 'Bearer wrong', 'Basic test-secret']) assert.equal((await runCron(token)).status, 401);
  delete env.CRON_SECRET;
  assert.equal((await runCron()).status, 503);
});

test('database failure does not report confirmation success', async () => {
  await booking();
  databaseFails = true;
  assert.equal((await confirmBooking()).status, 503);
  assert.equal(messages.length, 0);
});

test('an email queue failure rolls back the confirmation rather than losing notifications', async () => {
  await booking();
  await db.exec(`CREATE FUNCTION reject_test_email() RETURNS trigger LANGUAGE plpgsql AS
    'BEGIN RAISE EXCEPTION ''Test queue failure''; END';
    CREATE TRIGGER reject_test_email BEFORE INSERT ON appointment_emails
    FOR EACH ROW EXECUTE FUNCTION reject_test_email()`);
  try {
    assert.equal((await confirmBooking()).status, 503);
    const saved = (await db.query('SELECT status, doctor_confirmed_at FROM bookings')).rows[0];
    assert.equal(saved.status, 'PENDING');
    assert.equal(saved.doctor_confirmed_at, null);
    assert.equal(messages.length, 0);
  } finally {
    await db.exec('DROP TRIGGER reject_test_email ON appointment_emails; DROP FUNCTION reject_test_email()');
  }
});

test('confirmation within 15 minutes still makes the doctor reminder eligible immediately', async () => {
  await booking();
  await db.exec(`UPDATE bookings SET appointment_starts_at = NOW() + INTERVAL '5 minutes'`);
  assert.equal((await confirmBooking()).body.emailSent, true);
  assert.equal((await runCron()).body.sent, 1);
  assert.equal(messages[1].to, 'doctor@test.local');
});

test('booking uses the signed-in patient and remains pending with normalized IST time', async () => {
  session = { user: { id: 'patient', role: 'PATIENT' } };
  const response = await bookings.POST({ json: async () => ({
    userId: 'someone-else', patientName: 'Test Patient', serviceId: 'service', serviceTitle: 'Home Visit',
    totalAmount: 100, scheduledDate: '2099-03-01', scheduledTimeSlot: '10:00 AM - 11:00 AM', partnerId: 'doctor',
  }) });
  assert.equal(response.status, 200);
  assert.equal(response.body.booking.user_id, 'patient');
  assert.equal(response.body.booking.status, 'PENDING');
  assert.equal(new Date(response.body.booking.appointment_starts_at).toISOString(), '2099-03-01T04:30:00.000Z');
  assert.equal(messages[0].to, 'doctor@test.local');
});

test('new booking rejects past times and does not send to an arbitrary unassigned doctor', async () => {
  session = { user: { id: 'patient', role: 'PATIENT' } };
  const payload = { totalAmount: 100, serviceTitle: 'Home Visit', scheduledDate: '2020-01-01', scheduledTimeSlot: '10:00 AM - 11:00 AM' };
  assert.equal((await bookings.POST({ json: async () => payload })).status, 400);
  payload.scheduledDate = '2099-03-01';
  assert.equal((await bookings.POST({ json: async () => payload })).status, 200);
  assert.equal(messages.length, 0);
});

test('new email templates escape patient content and include IST and the correct portal', async () => {
  await email.sendAppointmentConfirmationEmail({ to: 'patient@test.local', bookingId: 'booking', bookingNumber: 'REF',
    patientName: '<img src=x>', doctorName: 'Dr A & B', serviceTitle: 'Visit', scheduledDate: '2099-03-01', scheduledTimeSlot: '10:00 AM - 11:00 AM' });
  assert.match(messages[0].html, /&lt;img src=x&gt;/);
  assert.match(messages[0].html, /Dr A &amp; B/);
  assert.match(messages[0].text, /\(IST\)/);
  assert.match(messages[0].html, /\/patient\/appointments\/booking/);
});
