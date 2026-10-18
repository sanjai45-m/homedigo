import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { before, beforeEach, after, test } from 'node:test';
import vm from 'node:vm';
import ts from 'typescript';
import { PGlite } from '@electric-sql/pglite';

const db = new PGlite();
let user, offline, reassign;
const dependencies = {
  '@/lib/appointment-push': { processAppointmentPushSafely: async () => ({ sent: 0 }) },
  'next/server': { NextResponse: { json: (body, options) => Response.json(body, options) } },
  '@/lib/appointment-schema': { ensureAppointmentSchema: async () => {} },
  '@/lib/api-auth': { requireApiUser: async roles => !user ? { response: Response.json({}, { status: 401 }) }
    : !roles.includes(user.role) ? { response: Response.json({}, { status: 403 }) } : { user } },
  '@/lib/db': { executeQuery: async (sql, params = []) => {
    if (offline) return { rows: [], isConnected: false };
    const { rows } = await db.query(sql, params);
    if (reassign && sql.startsWith('SELECT b.id')) {
      await db.exec("UPDATE bookings SET partner_id = 'other-doctor'");
    }
    return { rows, isConnected: true };
  } },
};
function load(file) {
  const exports = {};
  const code = ts.transpileModule(readFileSync(file, 'utf8'), { compilerOptions: {
    module: ts.ModuleKind.CommonJS, target: ts.ScriptTarget.ES2020,
  } }).outputText;
  vm.runInNewContext(code, { exports, Response, require(name) { assert.ok(name in dependencies, name); return dependencies[name]; } });
  return exports;
}
const tracking = load('src/lib/tracking.ts');
dependencies['@/lib/tracking'] = tracking;
const api = load('src/app/api/pro/visits/[id]/location/route.ts');
const ctx = { params: Promise.resolve({ id: 'visit' }) };
const post = (body = { lat: 12.99, lng: 80.2, accuracy: 20 }) => api.POST({ json: async () => body }, ctx);
const get = async () => { const result = await api.GET({}, ctx); return { status: result.status, body: await result.json() }; };
before(async () => {
  await db.exec(`CREATE TABLE addresses (id TEXT PRIMARY KEY, user_id TEXT, lat FLOAT, lng FLOAT);
    CREATE TABLE bookings (id TEXT PRIMARY KEY, booking_number TEXT, user_id TEXT, partner_id TEXT, address_id TEXT,
      patient_lat FLOAT, patient_lng FLOAT, partner_lat FLOAT, partner_lng FLOAT, status TEXT, cancellation_reason TEXT, payment_status TEXT,
      doctor_confirmed_at TIMESTAMPTZ, partner_location_updated_at TIMESTAMPTZ, partner_location_accuracy FLOAT);`);
});
beforeEach(async () => {
  user = { id: 'doctor', role: 'PARTNER' }; offline = false; reassign = false;
  await db.exec(`TRUNCATE addresses, bookings;
    INSERT INTO addresses VALUES ('address', 'patient', 13.0827, 80.2707);
    INSERT INTO bookings (id, booking_number, user_id, partner_id, address_id, patient_lat, patient_lng,
      status, payment_status, doctor_confirmed_at)
    VALUES ('visit', 'HD-VISIT', 'patient', 'doctor', 'address', 13.0827, 80.2707, 'CONFIRMED', 'PAID', NOW());`);
});
after(() => db.close());

test('Chennai doctor GPS is stored, timestamped, and visible only to the booking owner and assigned doctor', async () => {
  assert.equal((await post()).status, 200);
  user = { id: 'patient', role: 'PATIENT' };
  const { body } = await get();
  assert.equal(body.isLive, true);
  assert.equal(body.lat, 12.99); assert.equal(body.lng, 80.2);
  assert.equal(body.patientLat, 13.0827); assert.equal(body.patientLng, 80.2707);
  assert.equal(body.status, 'ON_THE_WAY'); assert.ok(body.distanceKm > 10);
  assert.ok(body.updatedAt);
  for (const role of ['PATIENT', 'PARTNER']) {
    user = { id: 'unrelated', role }; assert.equal((await get()).status, 404);
  }
});
test('Coimbatore destination and subsequent doctor movements are preserved', async () => {
  await db.exec('UPDATE bookings SET patient_lat=11.0168, patient_lng=76.9558');
  await post({ lat: 11.04, lng: 76.98, accuracy: 10 });
  assert.equal((await get()).body.status, 'ON_THE_WAY');
  await post({ lat: 11.017, lng: 76.956, accuracy: 10 });
  const { body } = await get();
  assert.equal(body.status, 'ARRIVED'); assert.equal(body.lat, 11.017);
  assert.equal(body.patientLat, 11.0168); assert.equal(body.isImmediate, true);
});
test('missing destination stays missing, with no invented distance, ETA or arrival', async () => {
  await db.exec('UPDATE bookings SET patient_lat=NULL, patient_lng=NULL; UPDATE addresses SET lat=NULL, lng=NULL');
  const result = await post(); assert.equal(result.status, 200);
  const { body } = await get();
  assert.equal(body.status, 'ON_THE_WAY'); assert.equal(body.patientLat, null);
  assert.equal(body.distanceKm, null); assert.equal(body.etaMins, null); assert.equal(body.isNearby, false);
});
test('a missing or partial booking destination falls back to an entire address coordinate pair', async () => {
  await db.exec('UPDATE bookings SET patient_lat=11, patient_lng=NULL');
  const { body } = await get();
  assert.equal(body.patientLat, 13.0827); assert.equal(body.patientLng, 80.2707);
});
test('an unrelated address cannot supply the patient destination', async () => {
  await db.exec("UPDATE bookings SET patient_lat=NULL, patient_lng=NULL; UPDATE addresses SET user_id='other'");
  assert.equal((await get()).body.patientLat, null);
});
test('the initial position is absent and old GPS is labelled stale without moving the marker', async () => {
  const initial = (await get()).body;
  assert.equal(initial.lat, null); assert.equal(initial.isLive, false);
  await post();
  await db.exec("UPDATE bookings SET partner_location_updated_at=NOW()-INTERVAL '2 minutes'");
  const stale = (await get()).body;
  assert.equal(stale.lat, 12.99); assert.equal(stale.isLive, false); assert.equal(stale.etaMins, null);
  assert.equal(stale.isNearby, false);
});
test('zero latitude and longitude remain valid on both sides', async () => {
  await db.exec('UPDATE bookings SET patient_lat=0, patient_lng=0');
  assert.equal((await post({ lat: 0, lng: 0.02, accuracy: 10 })).status, 200);
  const { body } = await get();
  assert.equal(body.patientLat, 0); assert.equal(body.patientLng, 0); assert.equal(body.lat, 0);
  assert.ok(body.distanceKm > 2);
});
test('invalid GPS, partial input and malformed JSON cannot change a journey', async () => {
  for (const body of [null, {}, { lat: 91, lng: 80 }, { lat: 13, lng: 181 }, { lat: null, lng: 80 },
    { lat: '13', lng: '80' }, { lat: Infinity, lng: 80 }, { lat: 13, lng: 80, accuracy: -1 }]) {
    assert.equal((await post(body)).status, 400);
  }
  assert.equal((await api.POST({ json: async () => { throw Error('bad JSON'); } }, ctx)).status, 400);
  assert.equal((await get()).body.status, 'CONFIRMED');
});
test('low or unknown accuracy never triggers automatic arrival', async () => {
  for (const accuracy of [5000, null]) {
    await post({ lat: 13.0827, lng: 80.2707, accuracy });
    assert.equal((await get()).body.status, 'ON_THE_WAY');
    assert.equal((await get()).body.isImmediate, false);
  }
});
test('payment, acceptance, current assignment and terminal state guard GPS writes', async () => {
  for (const condition of ["payment_status='UNDER_REVIEW'", 'doctor_confirmed_at=NULL', "partner_id='other-doctor'", "status='CANCELLED'", "status='COMPLETED'"]) {
    await db.exec("UPDATE bookings SET payment_status='PAID', doctor_confirmed_at=NOW(), partner_id='doctor', status='CONFIRMED'");
    await db.exec(`UPDATE bookings SET ${condition}`);
    assert.equal((await post()).status, 409);
  }
});
test('reassignment while an upload is being processed prevents stale doctor writes', async () => {
  reassign = true;
  assert.equal((await post()).status, 409);
  assert.equal((await db.query('SELECT partner_lat FROM bookings')).rows[0].partner_lat, null);
});
test('a storage outage returns an error instead of pretending an upload succeeded', async () => {
  offline = true;
  assert.equal((await post()).status, 503); assert.equal((await get()).status, 503);
});
test('freshness handles missing, stale and future timestamps', () => {
  const now = Date.now();
  assert.equal(tracking.locationIsFresh(new Date(now).toISOString(), now), true);
  for (const value of [null, 'invalid', new Date(now - 31000).toISOString(), new Date(now + 60000).toISOString()]) {
    assert.equal(tracking.locationIsFresh(value, now), false);
  }
});
