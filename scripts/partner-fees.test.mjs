import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { before, after, test } from 'node:test';
import vm from 'node:vm';
import ts from 'typescript';
import { PGlite } from '@electric-sql/pglite';

// Isolated PostgreSQL; no live accounts, payments or emails.
const db = new PGlite();
const dependencies = {
  'next/server': { NextResponse: { json: (body, options) => Response.json(body, options) } },
  '@/lib/api-auth': { requireApiUser: async () => ({ user: { id: 'admin', role: 'ADMIN' } }) },
  '@/lib/passwords': { hashPassword: () => 'test-only-hash' },
  '@/lib/db': { isDbConfigured: true, executeQuery: async (sql, args = []) => {
    const result = await db.query(sql, args);
    return { isConnected: true, rows: result.rows };
  } },
};
function load(file) {
  const exports = {};
  const code = ts.transpileModule(readFileSync(file, 'utf8'), {
    compilerOptions: { module: ts.ModuleKind.CommonJS, target: ts.ScriptTarget.ES2020 },
  }).outputText;
  vm.runInNewContext(code, { exports, require(name) {
    assert.ok(name in dependencies, name);
    return dependencies[name];
  } });
  return exports;
}
dependencies['@/lib/consultation-fee'] = load('src/lib/consultation-fee.ts');
const api = load('src/app/api/admin/partners/route.ts');
const request = (method, body) => new Request('https://homedigo.test/api/admin/partners', {
  method, headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(body),
});
const details = { name: 'Fee Test', email: 'fees@example.invalid', specialization: 'General', password: 'Test-password-only' };
before(async () => {
  await db.exec(`CREATE TABLE users (id TEXT PRIMARY KEY, name TEXT, email TEXT UNIQUE, phone TEXT, role TEXT,
    image TEXT, password_hash TEXT, updated_at TIMESTAMPTZ);
    CREATE TABLE partner_profiles (id TEXT PRIMARY KEY, user_id TEXT REFERENCES users(id), partner_type TEXT,
    speciality_id TEXT, specialization TEXT, qualifications TEXT, consultation_fee NUMERIC(10,2), council_reg_number TEXT,
    experience_years INT, service_radius_km INT, location_name TEXT, city TEXT, latitude NUMERIC, longitude NUMERIC,
    verification_status TEXT, availability TEXT, bio TEXT);`);
});
after(() => db.close());

test('create and edit persist ₹1, other single-digit fees, and paise without a ₹50 step', async () => {
  for (const fee of [1, 2, 9, 49, 99, 101, 1.25, '7.50']) {
    await db.exec('TRUNCATE partner_profiles, users CASCADE');
    const created = await api.POST(request('POST', { ...details, consultationFee: fee }));
    assert.equal(created.status, 200);
    const { partner } = await created.json();
    assert.equal(Number((await db.query('SELECT consultation_fee FROM partner_profiles')).rows[0].consultation_fee), Number(fee));
    assert.equal((await api.PUT(request('PUT', { userId: partner.id, consultationFee: 550 }))).status, 200);
    assert.equal((await api.PUT(request('PUT', { userId: partner.id, consultationFee: fee }))).status, 200);
    assert.equal(Number((await db.query('SELECT consultation_fee FROM partner_profiles')).rows[0].consultation_fee), Number(fee));
  }
});

test('invalid fees are rejected before creating users or changing a profile', async () => {
  await db.exec('TRUNCATE partner_profiles, users CASCADE');
  const created = await (await api.POST(request('POST', details))).json();
  for (const fee of [0, -1, -100, 0.99, null, '', ' ', true, [], {}, 'invalid', 'Infinity', 100000000, 1.001]) {
    assert.equal((await api.POST(request('POST', { ...details, email: 'invalid@example.invalid', consultationFee: fee }))).status, 400);
    assert.equal((await api.PUT(request('PUT', { userId: created.partner.id, consultationFee: fee, name: 'Changed' }))).status, 400);
  }
  assert.equal((await db.query('SELECT COUNT(*)::int AS count FROM users')).rows[0].count, 1);
  assert.equal((await db.query('SELECT name FROM users')).rows[0].name, details.name);
  assert.equal(Number((await db.query('SELECT consultation_fee FROM partner_profiles')).rows[0].consultation_fee), 550);
});

test('an edit without a fee keeps the existing fee', async () => {
  const { rows: [user] } = await db.query('SELECT id FROM users');
  assert.equal((await api.PUT(request('PUT', { userId: user.id, name: 'Updated Name' }))).status, 200);
  assert.equal(Number((await db.query('SELECT consultation_fee FROM partner_profiles')).rows[0].consultation_fee), 550);
});
