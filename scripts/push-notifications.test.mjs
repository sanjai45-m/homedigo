import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { before, beforeEach, after, test } from 'node:test';
import vm from 'node:vm';
import crypto from 'node:crypto';
import ts from 'typescript';
import { PGlite } from '@electric-sql/pglite';

// Real PostgreSQL semantics; all Firebase sends and identities are synthetic.
const db = new PGlite();
let enabled = true, offline = false, session = null, sendError = null, messages = [];
const patientFid = 'cPatientInstallation123';
const doctorFid = 'dDoctorInstallation1234';
const deps = {
  'next/server': { NextResponse: { json: (body, options) => Response.json(body, options) } },
  'node:crypto': crypto,
  './push-config': { pushConfigured: () => enabled },
  '@/lib/push-config': { pushConfigured: () => enabled, publicPushConfig: () => ({ projectId: 'test-project', apiKey: 'public-test-key', appId: 'test-app', messagingSenderId: 'test-sender' }) },
  './appointment-schema': { ensureAppointmentSchema: async () => {} },
  '@/lib/appointment-schema': { ensureAppointmentSchema: async () => {} },
  './firebase-admin': { firebaseMessaging: () => ({ send: async message => {
    if (sendError && message.fid === patientFid) throw { code: sendError };
    messages.push(message); return 'test-message';
  } }) },
  '@/lib/api-auth': { requireApiUser: async roles => session && roles.includes(session.role)
    ? { user: session } : { response: Response.json({ error: 'Unauthorized' }, { status: session ? 403 : 401 }) } },
  'firebase/app': { SDK_VERSION: '13.0.0' },
};
const query = async (sql, values = []) => {
  if (offline) return { rows: [], isConnected: false };
  const result = await db.query(sql, values); return { rows: result.rows, isConnected: true };
};
deps['./db'] = deps['@/lib/db'] = { executeQuery: query, isDbConfigured: true };
function load(path) {
  const exports = {};
  const source = ts.transpileModule(readFileSync(path, 'utf8'), { compilerOptions: {
    module: ts.ModuleKind.CommonJS, target: ts.ScriptTarget.ES2021, esModuleInterop: true,
  } }).outputText;
  vm.runInNewContext(source, { exports, Response, URL, Date, console: { error() {} },
    process: { env: { FIREBASE_WEB_VAPID_KEY: 'public-vapid', FIREBASE_PRIVATE_KEY: 'NEVER-PUBLIC' } },
    require(name) { if (!(name in deps)) throw new Error(name); return deps[name]; },
  });
  return exports;
}
const appointmentSchema = load('src/lib/appointment-schema.ts');
deps['./appointment-schema'] = deps['@/lib/appointment-schema'] = appointmentSchema;
const schema = load('src/lib/push-schema.ts');
deps['./push-schema'] = deps['@/lib/push-schema'] = schema;
const worker = load('src/lib/appointment-push.ts');
deps['@/lib/appointment-push'] = worker;
deps['@/lib/tracking'] = load('src/lib/tracking.ts');
deps['@/lib/doctor-reminders'] = load('src/lib/doctor-reminders.ts');
const reminderSettings = load('src/app/api/pro/reminders/route.ts');
const locationRoute = load('src/app/api/pro/visits/[id]/location/route.ts');
const visitRoute = load('src/app/api/pro/visits/[id]/route.ts');
const subscriptions = load('src/app/api/push/subscriptions/route.ts');
const configRoute = load('src/app/api/push/config/route.ts');
const swRoute = load('src/app/firebase-messaging-sw.js/route.ts');
const request = (body, method = 'POST') => new Request('https://homedigo.test/api/push/subscriptions', {
  method, headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(body),
});

before(async () => {
  await db.exec(`CREATE TABLE users (id VARCHAR(64) PRIMARY KEY, role TEXT, password_changed_at TIMESTAMPTZ);
    CREATE TABLE partner_profiles (user_id TEXT, verification_status TEXT);
    CREATE TABLE addresses (id TEXT PRIMARY KEY, user_id TEXT, lat FLOAT, lng FLOAT);
    CREATE TABLE bookings (id VARCHAR(64) PRIMARY KEY, user_id TEXT, partner_id TEXT, status TEXT,
      address_id TEXT, patient_lat FLOAT, patient_lng FLOAT, partner_lat FLOAT, partner_lng FLOAT, payment_status TEXT, vital_bp TEXT, vital_pulse TEXT, vital_spo2 TEXT, vital_sugar TEXT, prescription_notes TEXT,
      appointment_starts_at TIMESTAMPTZ, doctor_confirmed_at TIMESTAMPTZ, created_at TIMESTAMPTZ DEFAULT NOW());
    CREATE TABLE appointment_emails (id BIGSERIAL PRIMARY KEY, booking_id VARCHAR(64), partner_id TEXT,
      confirmed_at TIMESTAMPTZ, kind TEXT, due_at TIMESTAMPTZ, sent_at TIMESTAMPTZ);`);
  await appointmentSchema.ensureAppointmentSchema();
  await schema.ensurePushSchema();
});
beforeEach(async () => {
  enabled = true; offline = false; session = null; sendError = null; messages = [];
  await db.exec(`TRUNCATE users, partner_profiles, bookings, appointment_emails, push_subscriptions, appointment_push_deliveries RESTART IDENTITY CASCADE;
    INSERT INTO users VALUES ('patient', 'PATIENT', NULL), ('doctor', 'PARTNER', NULL), ('other', 'PATIENT', NULL);
    INSERT INTO partner_profiles VALUES ('doctor', 'APPROVED');
    INSERT INTO bookings (id, user_id, partner_id, status, appointment_starts_at)
      VALUES ('booking', 'patient', 'doctor', 'PENDING', NOW() + INTERVAL '1 hour');`);
  await db.query(`INSERT INTO push_subscriptions (id, user_id, role, fid, created_at)
    VALUES ('sub-patient', 'patient', 'PATIENT', $1, NOW() - INTERVAL '1 hour'),
      ('sub-doctor', 'doctor', 'PARTNER', $2, NOW() - INTERVAL '1 hour')`, [patientFid, doctorFid]);
});
after(() => db.close());

test('default reminder preferences are 60, 30 and 15 minutes; saved preferences are private and validated', async () => {
  session = { id: 'doctor', role: 'PARTNER' };
  assert.deepEqual((await reminderSettings.GET({}).then(r => r.json())).minutes, [60, 30, 15]);
  assert.equal(deps['@/lib/doctor-reminders'].reminderExample(60), '9:00 AM');
  assert.equal(deps['@/lib/doctor-reminders'].reminderExample(30), '9:30 AM');
  assert.equal(deps['@/lib/doctor-reminders'].reminderExample(15), '9:45 AM');
  assert.equal((await reminderSettings.PUT(request({ minutes: [120, 20], userId: 'other' }, 'PUT'))).status, 200);
  assert.deepEqual((await reminderSettings.GET({}).then(r => r.json())).minutes, [120, 20]);
  assert.equal((await db.query('SELECT user_id FROM doctor_reminder_preferences')).rows[0].user_id, 'doctor');
  for (const minutes of [[0], [-5], [1441], [5.5], [15, 15], [1,2,3,4,5,6], ['15'], null]) {
    assert.equal((await reminderSettings.PUT(request({ minutes }, 'PUT'))).status, 400);
  }
  session = { id: 'patient', role: 'PATIENT' };
  assert.equal((await reminderSettings.GET({})).status, 403);
  assert.equal((await reminderSettings.PUT(request({ minutes: [] }, 'PUT'))).status, 403);
});

test('default three reminders are scheduled at 60, 30 and 15 minute offsets without changing patient reminders', async () => {
  await db.exec("UPDATE bookings SET appointment_starts_at = NOW() + INTERVAL '2 hours'");
  await confirmedEvents();
  await worker.processAppointmentPush();
  const jobs = (await db.query(`SELECT reminder_minutes, EXTRACT(EPOCH FROM (reminder_starts_at - due_at))/60 AS offset
    FROM appointment_push_deliveries WHERE kind = 'DOCTOR_REMINDER' ORDER BY reminder_minutes DESC`)).rows;
  assert.deepEqual(jobs.map(job => job.reminder_minutes), [60, 30, 15]);
  assert.deepEqual(jobs.map(job => Number(job.offset)), [60, 30, 15]);
  assert.equal((await db.query("SELECT * FROM appointment_push_deliveries WHERE kind = 'PATIENT_REMINDER'")).rows.length, 1);
  assert.equal(messages.length, 1);
});

test('custom reminder sends once when due, respects disabling, and skips missed offsets', async () => {
  await db.exec("UPDATE bookings SET appointment_starts_at = NOW() + INTERVAL '19 minutes', doctor_confirmed_at = NOW() - INTERVAL '2 hours', status = 'CONFIRMED'; INSERT INTO doctor_reminder_preferences (user_id, minutes, updated_at) VALUES ('doctor', ARRAY[60,30,20,10], NOW() - INTERVAL '2 hours')");
  await Promise.all([worker.processAppointmentPush(), worker.processAppointmentPush()]);
  assert.equal(messages.length, 1);
  assert.match(messages[0].data.body, /20 minutes/);
  const jobs = (await db.query("SELECT reminder_minutes FROM appointment_push_deliveries WHERE kind = 'DOCTOR_REMINDER' ORDER BY reminder_minutes")).rows;
  assert.deepEqual(jobs.map(job => job.reminder_minutes), [10, 20]);
  session = { id: 'doctor', role: 'PARTNER' };
  await reminderSettings.PUT(request({ minutes: [] }, 'PUT'));
  await db.exec("UPDATE appointment_push_deliveries SET due_at = NOW() WHERE sent_at IS NULL");
  await worker.processAppointmentPush();
  assert.equal(messages.length, 1);
});

test('changed settings suppress removed reminders; restoring an already sent interval does not resend', async () => {
  await db.exec("UPDATE bookings SET appointment_starts_at = NOW() + INTERVAL '59 minutes', doctor_confirmed_at = NOW() - INTERVAL '2 hours', status = 'CONFIRMED'");
  await worker.processAppointmentPush();
  assert.equal(messages.length, 1);
  session = { id: 'doctor', role: 'PARTNER' };
  await reminderSettings.PUT(request({ minutes: [10] }, 'PUT'));
  await worker.processAppointmentPush();
  assert.equal((await db.query("SELECT count(*)::int AS n FROM appointment_push_deliveries WHERE kind = 'DOCTOR_REMINDER' AND discarded_at IS NULL AND sent_at IS NULL")).rows[0].n, 1);
  await reminderSettings.PUT(request({ minutes: [60,30,15] }, 'PUT'));
  await worker.processAppointmentPush();
  assert.equal(messages.length, 1);
  assert.equal((await db.query("SELECT count(*)::int AS n FROM appointment_push_deliveries WHERE kind = 'DOCTOR_REMINDER' AND discarded_at IS NULL AND sent_at IS NULL")).rows[0].n, 2);
});

test('GPS status changes push to the patient after the scheduled time; inaccurate and repeated pings do not repeat arrival', async () => {
  session = { id: 'doctor', role: 'PARTNER' };
  await db.exec("UPDATE bookings SET status = 'CONFIRMED', doctor_confirmed_at = NOW() - INTERVAL '1 hour', appointment_starts_at = NOW() - INTERVAL '5 minutes', payment_status = 'PAID', patient_lat = 13.0827, patient_lng = 80.2707");
  const ctx = { params: Promise.resolve({ id: 'booking' }) };
  const ping = body => locationRoute.POST({ json: async () => body }, ctx);
  assert.equal((await ping({ lat: 13, lng: 80.2, accuracy: 20 })).status, 200);
  assert.equal(messages.length, 1);
  assert.equal(messages[0].data.title, 'Clinician on the way');
  await ping({ lat: 13.0827, lng: 80.2707, accuracy: 200 });
  assert.equal(messages.length, 1);
  await Promise.all([ping({ lat: 13.0827, lng: 80.2707, accuracy: 20 }), ping({ lat: 13.0827, lng: 80.2707, accuracy: 20 })]);
  await ping({ lat: 13.0827, lng: 80.2707, accuracy: 20 });
  await worker.processAppointmentPush();
  assert.equal(messages.length, 2);
  assert.equal(messages[1].data.title, 'Your clinician is nearby');
  assert.ok(messages.every(message => message.fid === patientFid));
  assert.equal((await db.query("SELECT * FROM appointment_status_events WHERE status = 'ARRIVED'")).rows.length, 1);
  for (const status of ['IN_PROGRESS', 'COMPLETED']) {
    assert.equal((await visitRoute.PUT({ json: async () => ({ status }) }, ctx)).status, 200);
    await visitRoute.PUT({ json: async () => ({ status }) }, ctx);
  }
  assert.equal(messages.length, 4);
  assert.equal(messages[3].data.title, 'Visit completed');
  assert.notEqual((await visitRoute.PUT({ json: async () => ({ status: 'ON_THE_WAY' }) }, ctx)).status, 200);
});

test('status events survive a delivery failure and superseded or reassigned updates are discarded', async () => {
  await db.exec("UPDATE bookings SET status = 'ON_THE_WAY'");
  sendError = 'messaging/server-unavailable';
  await worker.processAppointmentPush();
  assert.equal(messages.length, 0);
  sendError = null;
  await db.exec("UPDATE bookings SET status = 'ARRIVED'; UPDATE appointment_push_deliveries SET due_at = NOW()");
  await worker.processAppointmentPush();
  assert.equal(messages.length, 1);
  assert.equal(messages[0].data.title, 'Your clinician is nearby');
  await db.exec("UPDATE bookings SET status = 'IN_PROGRESS'; UPDATE bookings SET partner_id = 'replacement'");
  await worker.processAppointmentPush();
  assert.equal(messages.length, 1);
});

test('status events and the booking update roll back together', async () => {
  await db.exec('BEGIN');
  await db.exec("UPDATE bookings SET status = 'ARRIVED'");
  await db.exec('ROLLBACK');
  assert.equal((await db.query('SELECT * FROM appointment_status_events')).rows.length, 0);
  await worker.processAppointmentPush();
  assert.equal(messages.length, 0);
});

test('migration does not repeat a 15-minute reminder sent by the previous worker', async () => {
  await db.exec("UPDATE bookings SET status = 'CONFIRMED', doctor_confirmed_at = NOW() - INTERVAL '2 hours', appointment_starts_at = NOW() + INTERVAL '14 minutes'");
  await db.exec(`INSERT INTO appointment_emails (booking_id, partner_id, confirmed_at, kind, due_at)
    SELECT id, partner_id, doctor_confirmed_at, 'DOCTOR_REMINDER', appointment_starts_at - INTERVAL '15 minutes' FROM bookings;
    INSERT INTO appointment_push_deliveries (source_key, email_id, booking_id, subscription_id, user_id, kind, due_at, sent_at)
    SELECT 'email:' || id || ':DOCTOR_REMINDER', id, booking_id, 'sub-doctor', partner_id, kind, due_at, NOW() FROM appointment_emails`);
  await worker.processAppointmentPush();
  assert.equal(messages.filter(message => message.fid === doctorFid).length, 0);
});

test('late acceptance skips earlier reminders and reassignment prevents reminders to the old doctor', async () => {
  await db.exec("UPDATE bookings SET appointment_starts_at = NOW() + INTERVAL '20 minutes'");
  await confirmedEvents();
  await worker.processAppointmentPush();
  assert.deepEqual((await db.query("SELECT reminder_minutes FROM appointment_push_deliveries WHERE kind = 'DOCTOR_REMINDER'")).rows.map(row => row.reminder_minutes), [15]);
  messages = [];
  await db.exec("UPDATE bookings SET partner_id = 'replacement'; UPDATE appointment_push_deliveries SET due_at = NOW() WHERE sent_at IS NULL");
  await worker.processAppointmentPush();
  assert.equal(messages.length, 0);
});
async function requestEvents() {
  await db.exec(`INSERT INTO appointment_emails (booking_id, partner_id, kind, confirmed_at, due_at, sent_at)
    VALUES ('booking', 'doctor', 'PATIENT_REQUEST', NOW(), NOW(), NOW()),
      ('booking', 'doctor', 'DOCTOR_REVIEW', NOW(), NOW(), NULL)`);
}
async function confirmedEvents() {
  await db.exec(`UPDATE bookings SET status = 'CONFIRMED', doctor_confirmed_at = NOW();
    INSERT INTO appointment_emails (booking_id, partner_id, kind, confirmed_at, due_at)
    SELECT id, partner_id, k.kind, doctor_confirmed_at,
      CASE WHEN k.kind = 'DOCTOR_REMINDER' THEN appointment_starts_at - INTERVAL '15 minutes' ELSE NOW() END
    FROM bookings CROSS JOIN (VALUES ('PATIENT_CONFIRMATION'), ('DOCTOR_REMINDER')) k(kind)`);
}

test('unconfigured push does no database work and exposes no client config', async () => {
  enabled = false; offline = true;
  assert.equal((await worker.processAppointmentPush()).enabled, false);
  assert.deepEqual(await configRoute.GET().json(), { enabled: false });
});
test('public config and worker exclude server credentials', async () => {
  assert.doesNotMatch(await configRoute.GET().text(), /NEVER-PUBLIC|PRIVATE_KEY|client_email/);
  const response = swRoute.GET(new Request('https://homedigo.test/firebase-messaging-sw.js?portal=patient'));
  assert.equal(response.headers.get('Service-Worker-Allowed'), '/');
  assert.doesNotMatch(await response.text(), /NEVER-PUBLIC|PRIVATE_KEY|client_email/);
  assert.equal(swRoute.GET(new Request('https://homedigo.test/firebase-messaging-sw.js?portal=admin')).status, 400);
});
test('subscription writes require identity, validate input, and ignore supplied user/role', async () => {
  assert.equal((await subscriptions.POST(request({ fid: patientFid }))).status, 401);
  session = { id: 'patient', role: 'PATIENT' };
  for (const body of [null, {}, { fid: 'short' }, { fid: 'https://evil.test/registration' }]) {
    assert.equal((await subscriptions.POST(request(body))).status, 400);
  }
  assert.equal((await subscriptions.POST(new Request('https://homedigo.test/api/push/subscriptions', { method: 'POST', body: '{' }))).status, 400);
  const res = await subscriptions.POST(request({ fid: patientFid, userId: 'doctor', role: 'PARTNER' }));
  assert.equal(res.status, 200);
  assert.equal((await db.query('SELECT user_id FROM push_subscriptions WHERE fid = $1', [patientFid])).rows[0].user_id, 'patient');
});
test('automatic refresh cannot claim another account; explicit enable can, and old owner cannot delete it', async () => {
  session = { id: 'other', role: 'PATIENT' };
  assert.equal((await subscriptions.POST(request({ fid: patientFid }))).status, 409);
  assert.equal((await subscriptions.POST(request({ fid: patientFid, replace: true }))).status, 200);
  session = { id: 'patient', role: 'PATIENT' };
  await subscriptions.DELETE(request({ fid: patientFid }, 'DELETE'));
  assert.equal((await db.query('SELECT user_id FROM push_subscriptions WHERE fid = $1', [patientFid])).rows[0].user_id, 'other');
});
test('push sends request events independently of email delivery, once across repeated and concurrent runs', async () => {
  await requestEvents();
  // Email retry backoff must not postpone push delivery.
  await db.exec("UPDATE appointment_emails SET due_at = NOW() + INTERVAL '10 minutes'");
  await Promise.all([worker.processAppointmentPush(), worker.processAppointmentPush()]);
  await worker.processAppointmentPush();
  assert.equal(messages.length, 2);
  assert.deepEqual(messages.map(m => m.fid).sort(), [patientFid, doctorFid].sort());
  assert.ok(messages.some(m => m.data.path === '/partner/visit/booking'));
  assert.ok(messages.some(m => m.data.path === '/patient/appointments/booking'));
  assert.ok(messages.every(m => m.webpush.headers.TTL === '300'));
  assert.ok(messages.every(m => !('notification' in m))); // SW owns display; no duplicate auto-display.
});
test('confirmation is immediate; reminders wait and reach patient and doctor', async () => {
  await confirmedEvents();
  await worker.processAppointmentPush();
  assert.equal(messages.length, 1);
  assert.equal(messages[0].data.title, 'Appointment accepted');
  await db.exec(`UPDATE appointment_emails SET due_at = NOW() WHERE kind = 'DOCTOR_REMINDER';
    UPDATE appointment_push_deliveries SET due_at = NOW() WHERE kind LIKE '%REMINDER'`);
  await worker.processAppointmentPush();
  assert.equal(messages.length, 4);
  assert.deepEqual(messages.filter(m => m.fid === doctorFid).map(m => m.data.body).sort(), [worker.pushContent('DOCTOR_REMINDER', 'booking', 15).body, worker.pushContent('DOCTOR_REMINDER', 'booking', 30).body].sort());
});
test('cancelled appointments suppress pending messages and notify the patient once', async () => {
  await requestEvents();
  await db.exec("UPDATE bookings SET status = 'CANCELLED'");
  await worker.processAppointmentPush();
  await worker.processAppointmentPush();
  assert.equal(messages.length, 1);
  assert.equal(messages[0].data.title, 'Appointment cancelled');
  assert.equal(messages[0].fid, patientFid);
});
test('reassigned doctors, expired appointments and password changes suppress stale pushes', async () => {
  await requestEvents();
  await db.exec("UPDATE bookings SET partner_id = 'someone-else'; UPDATE users SET password_changed_at = NOW() WHERE id = 'patient'");
  await worker.processAppointmentPush();
  assert.equal(messages.length, 0);
  await db.exec("UPDATE bookings SET appointment_starts_at = NOW() - INTERVAL '1 minute'");
  await worker.processAppointmentPush();
  assert.equal(messages.length, 0);
});
test('role changes and revoked partner approval suppress pushes', async () => {
  await requestEvents();
  await db.exec("UPDATE users SET role = 'ADMIN' WHERE id = 'patient'; UPDATE partner_profiles SET verification_status = 'REJECTED'");
  await worker.processAppointmentPush();
  assert.equal(messages.length, 0);
});
test('temporary Firebase failures retry only the failed recipient', async () => {
  await requestEvents(); sendError = 'messaging/server-unavailable';
  const result = await worker.processAppointmentPush();
  assert.equal(result.sent, 1); assert.equal(result.failed, 1);
  await worker.processAppointmentPush();
  assert.equal(messages.length, 1);
  sendError = null;
  await db.exec('UPDATE appointment_push_deliveries SET due_at = NOW() WHERE sent_at IS NULL');
  await worker.processAppointmentPush();
  assert.equal(messages.length, 2);
});
test('unregistered installations are removed without retrying forever', async () => {
  await requestEvents(); sendError = 'messaging/installation-id-not-registered';
  await worker.processAppointmentPush();
  assert.equal((await db.query('SELECT * FROM push_subscriptions WHERE fid = $1', [patientFid])).rows.length, 0);
});
test('pending messages cannot follow a browser registration transferred to a different account', async () => {
  await requestEvents(); sendError = 'messaging/server-unavailable';
  await worker.processAppointmentPush();
  session = { id: 'other', role: 'PATIENT' };
  await subscriptions.POST(request({ fid: patientFid, replace: true }));
  sendError = null;
  await db.exec('UPDATE appointment_push_deliveries SET due_at = NOW() WHERE sent_at IS NULL');
  await worker.processAppointmentPush();
  assert.equal(messages.length, 1);
  assert.equal(messages[0].fid, doctorFid);
});
test('new subscriptions do not receive historical requests; inactive registrations expire', async () => {
  await requestEvents();
  await db.exec("UPDATE push_subscriptions SET created_at = NOW() + INTERVAL '1 minute' WHERE user_id = 'patient'; UPDATE push_subscriptions SET updated_at = NOW() - INTERVAL '31 days' WHERE user_id = 'doctor'");
  await worker.processAppointmentPush();
  assert.equal(messages.length, 0);
});
test('worker storage failure is isolated from booking success', async () => {
  offline = true;
  assert.equal((await worker.processAppointmentPushSafely()).failed, 1);
});
test('service worker displays one background notification and rejects external/cross-portal links', async () => {
  const response = swRoute.GET(new Request('https://homedigo.test/firebase-messaging-sw.js?portal=patient'));
  const handlers = {}, notifications = [], opened = [];
  let receive;
  vm.runInNewContext(await response.text(), {
    URL, importScripts() {}, firebase: { initializeApp() {}, messaging: () => ({ onBackgroundMessage: fn => { receive = fn; } }) },
    self: { location: { origin: 'https://homedigo.test' }, addEventListener: (type, handler) => { handlers[type] = handler; },
      registration: { showNotification: async (title, options) => notifications.push({ title, options }) },
      clients: { matchAll: async () => [{ url: 'https://homedigo.test/partner/dashboard', visibilityState: 'visible',
        postMessage() { throw new Error('Patient notifications must not reach the doctor portal'); } }],
        openWindow: async url => opened.push(url) },
    },
  });
  for (const path of ['https://evil.test', '//evil.test', '/partner/visit/booking', '/patient/appointments/../../admin/dashboard']) await receive({ data: { path } });
  assert.equal(notifications.length, 0);
  await receive({ data: { title: 'Request received', body: 'Awaiting review', path: '/patient/appointments/booking', tag: 'test' } });
  assert.equal(notifications.length, 1);
  let pending;
  handlers.notificationclick({ stopImmediatePropagation() {}, notification: { close() {}, data: notifications[0].options.data }, waitUntil: p => { pending = p; } });
  await pending;
  assert.deepEqual(opened, ['https://homedigo.test/patient/appointments/booking']);
  let intercepted = false;
  handlers.push({ data: { json: () => ({ data: { title: 'Update', path: '/patient/appointments/booking' } }) },
    stopImmediatePropagation: () => { intercepted = true; }, waitUntil: p => { pending = p; } });
  await pending;
  assert.equal(intercepted, true);
  assert.equal(notifications.length, 2);
});
