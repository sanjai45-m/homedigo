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
  'next/headers': { headers: async () => new Headers(session?.user?.role && session.user.role !== 'PATIENT'
    ? { authorization: 'Bearer test-staff-token' } : {}) },
  '@/lib/staff-session': { readStaffSession: async () => session },
  '@/lib/auth': { authOptions: {} },
  nodemailer: { createTransport: () => ({ sendMail: async message => {
    if (smtpFails === true || smtpFails === message.to) throw Object.assign(new Error('SMTP test failure'), { code: 'ETIMEDOUT' });
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
    exports, process: { env }, Buffer, URL, URLSearchParams, Response, Date,
    console: { log() {}, error() {} },
    require(name) {
      if (!(name in dependencies)) throw new Error(`Unexpected dependency: ${name}`);
      return dependencies[name];
    },
  });
  return exports;
}

dependencies['@/lib/password-reset-schema'] = load('src/lib/password-reset-schema.ts');
dependencies['@/lib/api-auth'] = load('src/lib/api-auth.ts');
const time = load('src/lib/appointment-time.ts');
dependencies['@/lib/appointment-time'] = time;
const payment = load('src/lib/payment.ts');
dependencies['./payment'] = dependencies['@/lib/payment'] = payment;
const paymentSettings = load('src/lib/payment-settings.ts');
dependencies['@/lib/payment-settings'] = paymentSettings;
const adminPaymentSettings = load('src/app/api/super-admin/payment-settings/route.ts');
const publicPaymentSettings = load('src/app/api/patient/payment/route.ts');
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
const receiptRoute = load('src/app/api/bookings/[id]/receipt/route.ts').GET;
const doctorVisit = load('src/app/api/pro/visits/[id]/route.ts');
const patientVisit = load('src/app/api/patient/bookings/[id]/route.ts');
dependencies['@/lib/revenue'] = load('src/lib/revenue.ts');
const billing = load('src/app/api/super-admin/billing/route.ts');
const superStats = load('src/app/api/super-admin/stats/route.ts');
const screenshot = 'data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAQAAAC1HAwCAAAAC0lEQVR42mP8/x8AAwMCAO+aL1sAAAAASUVORK5CYII=';
const bookingPayload = () => ({ patientProfileId: 'profile', addressId: 'address', serviceId: 'service', partnerId: 'doctor',
  totalAmount: 100, scheduledDate: '2099-03-01', scheduledTimeSlot: '10:00 AM - 11:00 AM',
  requestKey: crypto.randomUUID(), paymentMethod: 'GPAY', paymentReceipt: screenshot });

before(async () => {
  await db.exec(`
    CREATE TABLE users (id VARCHAR(64) PRIMARY KEY, name TEXT, email TEXT, role TEXT, phone TEXT, image TEXT);
    CREATE TABLE addresses (id TEXT PRIMARY KEY, user_id TEXT, address_line1 TEXT, address_line2 TEXT, city TEXT, pincode TEXT, lat FLOAT, lng FLOAT);
    CREATE TABLE patient_profiles (id TEXT PRIMARY KEY, user_id TEXT, full_name TEXT, age INT, gender TEXT, blood_group TEXT, medical_notes TEXT);
    CREATE TABLE partner_profiles (user_id TEXT, verification_status TEXT DEFAULT 'APPROVED', specialization TEXT, consultation_fee NUMERIC, latitude FLOAT, longitude FLOAT, location_name TEXT);
    CREATE TABLE services (id TEXT PRIMARY KEY, title TEXT, base_price NUMERIC, visiting_fee NUMERIC, is_active BOOLEAN);
    CREATE TABLE bookings (
      id VARCHAR(64) PRIMARY KEY, booking_number TEXT, user_id TEXT, patient_profile_id TEXT,
      patient_name TEXT, address_id TEXT, address_text TEXT, service_id TEXT, service_title TEXT,
      partner_id TEXT, partner_name TEXT, partner_title TEXT, partner_img TEXT,
      scheduled_date TEXT, scheduled_time_slot TEXT, status TEXT, total_amount NUMERIC,
      payment_status TEXT, payment_method TEXT, payment_ref TEXT, clinical_instructions TEXT,
      patient_lat FLOAT, patient_lng FLOAT, partner_lat FLOAT, partner_lng FLOAT, vital_bp TEXT, vital_pulse TEXT,
      vital_spo2 TEXT, vital_sugar TEXT, prescription_notes TEXT, created_at TIMESTAMPTZ DEFAULT NOW()
    );
    CREATE TABLE invoices (id TEXT, booking_id TEXT, user_id TEXT, invoice_number TEXT,
      service_title TEXT, subtotal NUMERIC, tax_amount NUMERIC, total_paid NUMERIC, payment_ref TEXT);
  `);
  await schema.ensureAppointmentSchema();
  await paymentSettings.ensurePaymentSettingsSchema();
});

beforeEach(async () => {
  databaseFails = false;
  smtpFails = false;
  messages = [];
  session = { user: { id: 'doctor', role: 'PARTNER' } };
  env.CRON_SECRET = 'test-secret';
  delete env.UPI_PAYEE_ID;
  delete env.UPI_PAYEE_NAME;
  await db.exec(`TRUNCATE payment_settings, appointment_emails, payment_receipts, bookings, users, invoices, addresses, patient_profiles, partner_profiles, services CASCADE;
    INSERT INTO addresses (id, user_id, address_line1, city) VALUES ('address', 'patient', 'Test address', 'Test city');
    INSERT INTO patient_profiles (id, user_id, full_name) VALUES ('profile', 'patient', 'Test Patient');
    INSERT INTO services VALUES ('service', 'Home Visit', 90, 10, TRUE);
    INSERT INTO partner_profiles (user_id, specialization, consultation_fee) VALUES ('doctor', 'General medicine', 100);
    INSERT INTO users (id, name, email, role) VALUES ('doctor', 'Test Doctor', 'doctor@test.local', 'PARTNER'),
      ('doctor2', 'Second Doctor', 'doctor2@test.local', 'PARTNER'),
      ('patient', 'Test Patient', 'patient@test.local', 'PATIENT'),
      ('other', 'Other Patient', 'other@test.local', 'PATIENT'),
      ('super', 'Super Admin', 'super@test.local', 'SUPER_ADMIN'),
      ('admin', 'Admin', 'admin@test.local', 'ADMIN');
    INSERT INTO partner_profiles (user_id) VALUES ('doctor2');`);
});
after(() => db.close());

async function booking(id = 'booking') {
  await db.query(`INSERT INTO bookings (id, booking_number, user_id, patient_name,
    partner_id, service_title, scheduled_date, scheduled_time_slot, status, total_amount, payment_status)
    VALUES ($1::text, $1::text, 'patient', 'Test Patient', 'doctor', 'Home Visit', '2099-03-01',
    '10:00 AM - 11:00 AM', 'PENDING', 100, 'PAID')`, [id]);
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
    assert.ok([401, 403, 404].includes(response.status));
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
  const response = await bookings.POST({ json: async () => ({ ...bookingPayload(),
    userId: 'someone-else', patientName: 'Test Patient', serviceId: 'service', serviceTitle: 'Home Visit',
    totalAmount: 100, scheduledDate: '2099-03-01', scheduledTimeSlot: '10:00 AM - 11:00 AM', partnerId: 'doctor',
  }) });
  assert.equal(response.status, 200);
  assert.equal(response.body.booking.user_id, 'patient');
  assert.equal(response.body.booking.status, 'PENDING');
  assert.equal(new Date(response.body.booking.appointment_starts_at).toISOString(), '2099-03-01T04:30:00.000Z');
  assert.equal(messages[0].to, 'doctor@test.local');
});

test('new booking rejects past times and sends only the patient acknowledgement when no doctor is assigned', async () => {
  session = { user: { id: 'patient', role: 'PATIENT' } };
  const payload = { ...bookingPayload(), partnerId: null, scheduledDate: '2020-01-01' };
  assert.equal((await bookings.POST({ json: async () => payload })).status, 400);
  payload.scheduledDate = '2099-03-01';
  assert.equal((await bookings.POST({ json: async () => payload })).status, 200);
  assert.equal(messages.length, 1);
  assert.equal(messages[0].to, 'patient@test.local');
  assert.match(messages[0].subject, /request has been received/);
  assert.match(messages[0].text, /not confirmed yet/);
});

test('new email templates escape patient content and include IST and the correct portal', async () => {
  await email.sendAppointmentConfirmationEmail({ to: 'patient@test.local', bookingId: 'booking', bookingNumber: 'REF',
    patientName: '<img src=x>', doctorName: 'Dr A & B', serviceTitle: 'Visit', scheduledDate: '2099-03-01', scheduledTimeSlot: '10:00 AM - 11:00 AM' });
  assert.match(messages[0].html, /&lt;img src=x&gt;/);
  assert.match(messages[0].html, /Dr A &amp; B/);
  assert.match(messages[0].text, /\(IST\)/);
  assert.match(messages[0].html, /\/patient\/appointments\/booking/);
});

test('receipt booking acknowledges the patient and notifies the doctor; approval sends a separate confirmation once', async () => {
  session = { user: { id: 'patient', role: 'PATIENT' } };
  const payload = bookingPayload();
  const created = await bookings.POST({ json: async () => payload });
  assert.equal(created.status, 200);
  const id = created.body.booking.id;
  assert.equal(created.body.booking.payment_status, 'UNDER_REVIEW');
  assert.equal(created.body.booking.payment_ref, null);
  assert.equal((await db.query('SELECT * FROM invoices')).rows.length, 0);
  assert.equal(messages.length, 2);
  assert.equal(messages[0].to, 'doctor@test.local');
  assert.ok(messages[0].html.includes(`/partner/visit/${id}`));
  assert.match(messages[0].text, /verify payment and accept/);
  assert.equal(messages[1].to, 'patient@test.local');
  assert.match(messages[1].subject, /request has been received/);
  assert.match(messages[1].text, /not confirmed yet/);
  session = { user: { id: 'doctor', role: 'PARTNER' } };
  const context = { params: Promise.resolve({ id }) };
  assert.equal((await confirm({ json: async () => ({}) }, context)).status, 400);
  assert.equal((await doctorVisit.PUT({ json: async () => ({ status: 'ON_THE_WAY' }) }, context)).status, 503);
  const detail = await doctorVisit.GET({}, context);
  assert.equal(detail.body.visit.has_receipt, true);
  assert.equal(detail.body.visit.patient_email, 'patient@test.local');
  const confirmed = await confirm({ json: async () => ({ paymentVerified: true }) }, context);
  assert.equal(confirmed.status, 200);
  assert.equal(confirmed.body.visit.payment_status, 'PAID');
  assert.equal(confirmed.body.visit.payment_verified_by, 'doctor');
  assert.ok(confirmed.body.visit.payment_verified_at);
  assert.equal(messages.length, 3);
  assert.equal(messages[2].to, 'patient@test.local');
  assert.match(messages[2].subject, /appointment is confirmed/);
  assert.equal((await db.query('SELECT * FROM invoices')).rows.length, 1);
  await confirm({ json: async () => ({ paymentVerified: true }) }, context);
  assert.equal(messages.length, 3);
  assert.equal((await db.query('SELECT * FROM invoices')).rows.length, 1);
});

test('superadmin billing and dashboard count a manual payment only after doctor verification, exactly once', async () => {
  await booking('legacy-paid'); // A historical PAID label alone is not verification evidence.
  session = { user: { id: 'patient', role: 'PATIENT' } };
  const created = await bookings.POST({ json: async () => bookingPayload() });
  const id = created.body.booking.id;
  const context = { params: Promise.resolve({ id }) };
  session = { user: { id: 'super', role: 'SUPER_ADMIN' } };
  assert.equal((await billing.GET()).body.summary.grossRevenue, 0);
  assert.equal((await billing.GET()).body.appointments.length, 0);
  assert.equal((await superStats.GET()).body.metrics.totalGmv, 0);
  session = { user: { id: 'doctor', role: 'PARTNER' } };
  assert.equal((await confirm({ json: async () => ({}) }, context)).status, 400);
  smtpFails = true; // Accounting must not depend on successful email delivery.
  assert.equal((await confirm({ json: async () => ({ paymentVerified: true }) }, context)).status, 200);
  assert.equal((await confirmBooking(id)).body.alreadyConfirmed, true);
  session = { user: { id: 'super', role: 'SUPER_ADMIN' } };
  const ledger = await billing.GET();
  assert.equal(ledger.status, 200);
  assert.equal(ledger.body.summary.grossRevenue, 100);
  assert.equal(ledger.body.summary.platformCommission, 10);
  assert.equal(ledger.body.summary.netClinicianPayouts, 90);
  assert.equal(ledger.body.summary.totalTransactions, 1);
  assert.equal(ledger.body.invoices.length, 1);
  assert.equal(ledger.body.appointments[0].payment_verified_by, 'doctor');
  assert.equal(ledger.body.appointments[0].verified_by_name, 'Test Doctor');
  assert.ok(ledger.body.appointments[0].payment_verified_at);
  const stats = await superStats.GET();
  assert.equal(stats.body.metrics.totalGmv, 100);
  assert.equal(stats.body.metrics.totalBookings, 2);

  const verifiedAt = ledger.body.appointments[0].payment_verified_at;
  session = { user: { id: 'admin', role: 'ADMIN' } };
  await dispatch({ json: async () => ({ bookingId: id, partnerId: 'doctor2', partnerName: 'Second Doctor', status: 'ASSIGNED' }) });
  session = { user: { id: 'super', role: 'SUPER_ADMIN' } };
  assert.equal((await billing.GET()).body.summary.grossRevenue, 100);
  session = { user: { id: 'doctor2', role: 'PARTNER' } };
  assert.equal((await confirmBooking(id)).status, 200);
  session = { user: { id: 'super', role: 'SUPER_ADMIN' } };
  const refreshed = (await billing.GET()).body;
  assert.equal(refreshed.summary.grossRevenue, 100);
  assert.equal(refreshed.invoices.length, 1);
  assert.equal(refreshed.appointments[0].payment_verified_by, 'doctor');
  assert.equal(String(refreshed.appointments[0].payment_verified_at), String(verifiedAt));
});

test('billing refuses to claim a bank transfer and returns an error when accounting storage fails', async () => {
  session = { user: { id: 'super', role: 'SUPER_ADMIN' } };
  const payout = await billing.POST({ json: async () => ({ action: 'DISBURSE_BATCH_PAYOUTS' }) });
  assert.equal(payout.status, 501);
  assert.equal(payout.body.success, undefined);
  databaseFails = true;
  assert.equal((await billing.GET()).status, 503);
  assert.equal((await superStats.GET()).status, 503);
});

test('receipt and patient details are private to the patient and assigned doctor', async () => {
  session = { user: { id: 'patient', role: 'PATIENT' } };
  const created = await bookings.POST({ json: async () => bookingPayload() });
  const context = { params: Promise.resolve({ id: created.body.booking.id }) };
  const ownReceipt = await receiptRoute({}, context);
  assert.equal(ownReceipt.status, 200);
  assert.equal(ownReceipt.headers.get('cache-control'), 'private, no-store');
  assert.equal(ownReceipt.headers.get('content-type'), 'image/png');
  assert.equal((await ownReceipt.arrayBuffer()).byteLength, Buffer.from(screenshot.split(',')[1], 'base64').length);
  for (const user of [undefined, { id: 'doctor2', role: 'PARTNER' }, { id: 'other', role: 'PATIENT' }]) {
    session = user ? { user } : null;
    assert.ok([401, 403, 404].includes((await receiptRoute({}, context)).status));
    assert.ok([401, 403, 404].includes((await doctorVisit.GET({}, context)).status));
    const patientResult = await patientVisit.GET({}, context);
    assert.ok([401, 403].includes(patientResult.status) || patientResult.body.booking === null);
  }
  session = { user: { id: 'doctor', role: 'PARTNER' } };
  assert.equal((await receiptRoute({}, context)).status, 200);
});

test('rejects missing, disguised and oversized receipts, incorrect totals and other patients profiles', async () => {
  session = { user: { id: 'patient', role: 'PATIENT' } };
  for (const override of [{ paymentReceipt: null }, { paymentReceipt: 'data:image/svg+xml;base64,PHN2Zz4=' },
    { paymentReceipt: 'data:image/png;base64,' + Buffer.from('<html>not a screenshot</html>').toString('base64') },
    { paymentReceipt: 'data:image/png;base64,' + 'A'.repeat(3 * 1024 * 1024) },
    { totalAmount: 1 }, { patientProfileId: 'someone-else' }, { addressId: 'someone-else' }, { partnerId: 'patient' }]) {
    const response = await bookings.POST({ json: async () => ({ ...bookingPayload(), ...override }) });
    assert.ok([400, 409].includes(response.status));
  }
  assert.equal((await db.query('SELECT * FROM bookings')).rows.length, 0);
  assert.equal(messages.length, 0);
});

test('concurrent submission retries create one booking, receipt and one email of each kind', async () => {
  session = { user: { id: 'patient', role: 'PATIENT' } };
  const payload = bookingPayload();
  const responses = await Promise.all([bookings.POST({ json: async () => payload }), bookings.POST({ json: async () => payload })]);
  assert.ok(responses.every(r => r.status === 200));
  assert.equal(responses[0].body.booking.id, responses[1].body.booking.id);
  assert.equal((await db.query('SELECT * FROM bookings')).rows.length, 1);
  assert.equal((await db.query('SELECT * FROM payment_receipts')).rows.length, 1);
  assert.equal(messages.length, 2);
  assert.equal(messages.filter(m => m.to === 'patient@test.local').length, 1);
  assert.equal(messages.filter(m => m.to === 'doctor@test.local').length, 1);
});

test('doctor review email retries after SMTP failure without confirming payment', async () => {
  session = { user: { id: 'patient', role: 'PATIENT' } };
  smtpFails = true;
  const response = await bookings.POST({ json: async () => bookingPayload() });
  assert.equal(response.status, 200);
  assert.equal(response.body.booking.payment_status, 'UNDER_REVIEW');
  const job = (await db.query("SELECT * FROM appointment_emails WHERE kind = 'DOCTOR_REVIEW'")).rows[0];
  assert.equal(job.last_error, 'ETIMEDOUT');
  smtpFails = false;
  await db.exec("UPDATE appointment_emails SET due_at = NOW() - INTERVAL '1 second'");
  assert.equal((await runCron()).body.sent, 2);
  assert.equal(messages[0].to, 'doctor@test.local');
  assert.equal(messages[1].to, 'patient@test.local');
  assert.equal((await db.query('SELECT * FROM invoices')).rows.length, 0);
});

test('patient acknowledgement retries independently after doctor notification succeeds', async () => {
  session = { user: { id: 'patient', role: 'PATIENT' } };
  smtpFails = 'patient@test.local';
  const created = await bookings.POST({ json: async () => ({ ...bookingPayload(), email: 'untrusted@test.local' }) });
  assert.equal(created.status, 200);
  assert.equal(messages.length, 1);
  assert.equal(messages[0].to, 'doctor@test.local');
  const job = (await db.query("SELECT * FROM appointment_emails WHERE kind = 'PATIENT_REQUEST'")).rows[0];
  assert.equal(job.last_error, 'ETIMEDOUT');
  smtpFails = false;
  await db.exec("UPDATE appointment_emails SET due_at = NOW() WHERE kind = 'PATIENT_REQUEST'");
  assert.equal((await runCron()).body.sent, 1);
  assert.equal(messages[1].to, 'patient@test.local');
  assert.match(messages[1].subject, /request has been received/);
  assert.equal((await runCron()).body.sent, 0);
});

test('approval supersedes a delayed request acknowledgement', async () => {
  session = { user: { id: 'patient', role: 'PATIENT' } };
  smtpFails = 'patient@test.local';
  const created = await bookings.POST({ json: async () => bookingPayload() });
  smtpFails = false;
  session = { user: { id: 'doctor', role: 'PARTNER' } };
  const result = await confirm({ json: async () => ({ paymentVerified: true }) }, { params: Promise.resolve({ id: created.body.booking.id }) });
  assert.equal(result.body.emailSent, true);
  await db.exec("UPDATE appointment_emails SET due_at = NOW() WHERE kind = 'PATIENT_REQUEST'");
  assert.equal((await runCron()).body.sent, 0);
  const patientMessages = messages.filter(m => m.to === 'patient@test.local');
  assert.equal(patientMessages.length, 1);
  assert.match(patientMessages[0].subject, /appointment is confirmed/);
});

test('booking rejects missing or invalid account email before creating a receipt or notification', async () => {
  session = { user: { id: 'patient', role: 'PATIENT' } };
  for (const email of [null, '', 'invalid', 'a@test.local,b@test.local']) {
    await db.query("UPDATE users SET email = $1 WHERE id = 'patient'", [email]);
    const response = await bookings.POST({ json: async () => bookingPayload() });
    assert.equal(response.status, 409);
    assert.match(response.body.error, /valid email/);
  }
  assert.equal((await db.query('SELECT * FROM bookings')).rows.length, 0);
  assert.equal((await db.query('SELECT * FROM appointment_emails')).rows.length, 0);
  assert.equal(messages.length, 0);
});

test('approval explicitly rejects orphaned patient accounts instead of losing confirmation email', async () => {
  await booking();
  await db.exec("DELETE FROM users WHERE id = 'patient'");
  const response = await confirmBooking();
  assert.equal(response.status, 409);
  assert.match(response.body.error, /patient account has no valid email/);
  assert.equal((await db.query('SELECT doctor_confirmed_at FROM bookings')).rows[0].doctor_confirmed_at, null);
  assert.equal((await db.query('SELECT * FROM appointment_emails')).rows.length, 0);
  assert.equal(messages.length, 0);
});

test('receipt storage failure rolls back booking and doctor notification together', async () => {
  session = { user: { id: 'patient', role: 'PATIENT' } };
  await db.exec(`CREATE FUNCTION reject_receipt() RETURNS trigger LANGUAGE plpgsql AS
    'BEGIN RAISE EXCEPTION ''Test receipt failure''; END';
    CREATE TRIGGER reject_receipt BEFORE INSERT ON payment_receipts FOR EACH ROW EXECUTE FUNCTION reject_receipt()`);
  try {
    assert.equal((await bookings.POST({ json: async () => bookingPayload() })).status, 503);
    assert.equal((await db.query('SELECT * FROM bookings')).rows.length, 0);
    assert.equal((await db.query('SELECT * FROM appointment_emails')).rows.length, 0);
    assert.equal(messages.length, 0);
  } finally { await db.exec('DROP TRIGGER reject_receipt ON payment_receipts; DROP FUNCTION reject_receipt()'); }
});

test('declined requests cannot be accepted and cannot send booking confirmation', async () => {
  session = { user: { id: 'patient', role: 'PATIENT' } };
  const created = await bookings.POST({ json: async () => bookingPayload() });
  const context = { params: Promise.resolve({ id: created.body.booking.id }) };
  assert.equal((await patientVisit.PATCH({ json: async () => ({ status: 'COMPLETED' }) }, context)).status, 403);
  session = { user: { id: 'doctor', role: 'PARTNER' } };
  assert.equal((await doctorVisit.PUT({ json: async () => ({ status: 'CANCELLED' }) }, context)).status, 200);
  assert.equal((await confirm({ json: async () => ({ paymentVerified: true }) }, context)).status, 409);
  assert.equal((await db.query('SELECT * FROM invoices')).rows.length, 0);
  assert.equal(messages.length, 2);
  assert.equal(messages.some(m => /appointment is confirmed/.test(m.subject)), false);
});

test('UPI links require an explicit UPI ID, encode payment details and target the chosen Android app', () => {
  assert.equal(payment.upiPaymentLink('GPAY', '9361557446', 'HomeDigo', 100, 'test'), '');
  assert.match(payment.upiPaymentLink('GPAY', 'clinic@bank', 'HomeDigo', 100, 'test', true), /package=com.google.android.apps.nbu.paisa.user/);
  assert.match(payment.upiPaymentLink('PHONEPE', 'clinic@bank', 'HomeDigo', 100, 'test', true), /package=com.phonepe.app/);
  const link = new URL(payment.upiPaymentLink('UPI', 'clinic@bank', 'A & B', 123.45, 'test'));
  assert.equal(link.searchParams.get('pa'), 'clinic@bank');
  assert.equal(link.searchParams.get('pn'), 'A & B');
  assert.equal(link.searchParams.get('am'), '123.45');
  assert.equal(payment.paymentConfig().phone, '9361557446');
});

test('only super admins can read management settings or change the payment recipient', async () => {
  const settings = { phone: '9876543210', upiId: '', payeeName: 'Clinic' };
  for (const user of [undefined, { id: 'patient', role: 'PATIENT' }, { id: 'doctor', role: 'PARTNER' }, { id: 'admin', role: 'ADMIN' }]) {
    session = user ? { user } : null;
    assert.equal((await adminPaymentSettings.GET()).status, user ? 403 : 401);
    assert.equal((await adminPaymentSettings.PUT({ json: async () => settings })).status, user ? 403 : 401);
  }
  assert.equal((await publicPaymentSettings.GET()).body.phone, '9361557446');
  assert.equal((await db.query('SELECT * FROM payment_settings')).rows.length, 0);
});

test('saved payment number persists and replaces checkout defaults, including clearing a former UPI ID', async () => {
  env.UPI_PAYEE_ID = 'original@bank';
  session = { user: { id: 'super', role: 'SUPER_ADMIN' } };
  const saved = await adminPaymentSettings.PUT({ json: async () => ({ phone: '+91 98765 43210', upiId: '', payeeName: 'New Clinic' }) });
  assert.equal(saved.status, 200);
  assert.equal(saved.body.settings.phone, '9876543210');
  assert.equal((await adminPaymentSettings.GET()).body.settings.phone, '9876543210');
  const publicSettings = await publicPaymentSettings.GET();
  assert.equal(publicSettings.body.phone, '9876543210');
  assert.equal(publicSettings.body.upiId, '');
  assert.equal(publicSettings.body.payeeName, 'New Clinic');
  assert.equal(publicSettings.body.updated_by, undefined);
  const stored = (await db.query('SELECT * FROM payment_settings')).rows[0];
  assert.equal(stored.updated_by, 'super');
  assert.ok(stored.updated_at);
  await adminPaymentSettings.PUT({ json: async () => ({ phone: '9123456789', upiId: 'new@bank', payeeName: 'Another Clinic' }) });
  assert.equal((await publicPaymentSettings.GET()).body.phone, '9123456789');
  assert.equal((await publicPaymentSettings.GET()).body.upiId, 'new@bank');
  assert.equal((await db.query('SELECT * FROM payment_settings')).rows.length, 1);
});

test('payment settings reject invalid recipients and never fall back to old details on database failure', async () => {
  session = { user: { id: 'super', role: 'SUPER_ADMIN' } };
  const settings = { phone: '9876543210', upiId: '', payeeName: 'Clinic' };
  for (const override of [{ phone: '' }, { phone: '123' }, { phone: '1234567890' }, { phone: 9876543210 },
    { phone: '98765432101' }, { upiId: 'not-a-upi-id' }, { payeeName: '' }]) {
    assert.equal((await adminPaymentSettings.PUT({ json: async () => ({ ...settings, ...override }) })).status, 400);
  }
  assert.equal((await db.query('SELECT * FROM payment_settings')).rows.length, 0);
  databaseFails = true;
  assert.equal((await adminPaymentSettings.PUT({ json: async () => settings })).status, 503);
  assert.equal((await adminPaymentSettings.GET()).status, 503);
  const publicSettings = await publicPaymentSettings.GET();
  assert.equal(publicSettings.status, 503);
  assert.equal(publicSettings.body.phone, undefined);
});
