import assert from 'node:assert/strict';
import { readFileSync, readdirSync } from 'node:fs';
import { resolve, dirname } from 'node:path';
import { before, beforeEach, after, test } from 'node:test';
import vm from 'node:vm';
import crypto from 'node:crypto';
import ts from 'typescript';
import { PGlite } from '@electric-sql/pglite';

// Isolated PostgreSQL: no production database, network requests, or real email.
const db = new PGlite();
let session, offline = false, queries = [];
const dependencies = {
  'next/server': { NextResponse: { json: (body, options) => Response.json(body, options) } },
  'next-auth/next': { getServerSession: async () => session },
  '@/lib/auth': { authOptions: {} },
  'node:crypto': crypto,
  crypto,
  nodemailer: { createTransport: () => ({ sendMail: async () => { throw new Error('Unexpected email'); } }) },
};
const database = { isDbConfigured: true, executeQuery: async (sql, args = []) => {
  queries.push(sql);
  if (offline) return { isConnected: false, rows: [] };
  const result = await db.query(sql, args);
  return { isConnected: true, rows: result.rows };
} };
const cache = new Map();
function load(file) {
  file = resolve(file);
  if (cache.has(file)) return cache.get(file);
  const exports = {};
  cache.set(file, exports);
  const code = ts.transpileModule(readFileSync(file, 'utf8'), { compilerOptions: {
    module: ts.ModuleKind.CommonJS, target: ts.ScriptTarget.ES2020, esModuleInterop: true,
  } }).outputText;
  vm.runInNewContext(code, { exports, Buffer, URL, URLSearchParams, Request, Response, Date,
    process: { env: {} }, console: { log() {}, error() {} }, require(name) {
      if (name in dependencies) return dependencies[name];
      const path = name.startsWith('@/') ? resolve('src', name.slice(2)) : resolve(dirname(file), name);
      if (path === resolve('src/lib/db')) return database;
      return load(path + '.ts');
    } });
  return exports;
}
const guard = load('src/lib/api-auth.ts').requireApiUser;
const roles = ['PATIENT', 'PARTNER', 'ADMIN', 'SUPER_ADMIN'];
const publicRoutes = new Set(['services/route.ts:GET', 'doctors/route.ts:GET', 'specialities/route.ts:GET',
  'patient/payment/route.ts:GET', 'auth/register/route.ts:POST', 'partner/register/route.ts:POST']);
const privateRoutes = [];
for (const file of readdirSync('src/app/api', { recursive: true }).filter(f => f.endsWith('route.ts'))) {
  const path = file.replaceAll('\\', '/');
  if (path.startsWith('auth/[...nextauth]') || path.startsWith('cron/')) continue;
  const code = readFileSync('src/app/api/' + path, 'utf8');
  const ast = ts.createSourceFile(path, code, ts.ScriptTarget.Latest, true);
  for (const node of ast.statements) {
    if (!ts.isFunctionDeclaration(node) || !['GET','POST','PUT','PATCH','DELETE'].includes(node.name?.text)) continue;
    const name = `${path}:${node.name.text}`;
    if (publicRoutes.has(name)) continue;
    // Explicit expected policy independent of the guard declaration in each route.
    const allowed = path.startsWith('super-admin/') || path.startsWith('health/') ? ['SUPER_ADMIN']
      : path.startsWith('admin/') || path.startsWith('specialities/') ? ['ADMIN','SUPER_ADMIN']
      : path.startsWith('patient/') ? ['PATIENT']
      : path.startsWith('bookings/') || (path.includes('/location/') && node.name.text === 'GET') ? ['PATIENT','PARTNER']
      : path.startsWith('pro/') ? ['PARTNER'] : null;
    assert.ok(allowed, `New API needs an explicit policy: ${name}`);
    privateRoutes.push({ name, method: node.name.text, allowed, handler: load('src/app/api/' + path)[node.name.text] });
  }
}
const req = (method = 'GET', body, query = '') => new Request('https://homedigo.test/api/resource' + query, {
  method, ...(body ? { body: JSON.stringify(body), headers: { 'Content-Type': 'application/json' } } : {}),
});
const context = { params: Promise.resolve({ id: 'visit' }) };
before(async () => {
  await db.exec(`
    CREATE TABLE users (id TEXT PRIMARY KEY, role TEXT, name TEXT, email TEXT UNIQUE, phone TEXT, image TEXT, password_hash TEXT, updated_at TIMESTAMPTZ);
    CREATE TABLE partner_profiles (id TEXT, user_id TEXT, verification_status TEXT, specialization TEXT, council_reg_number TEXT);
    CREATE TABLE patient_profiles (id TEXT PRIMARY KEY, user_id TEXT, full_name TEXT, relationship TEXT, age INT, gender TEXT,
      blood_group TEXT, medical_notes TEXT, emergency_contact TEXT, is_primary BOOLEAN, created_at TIMESTAMPTZ DEFAULT NOW());
    CREATE TABLE addresses (id TEXT PRIMARY KEY, user_id TEXT, label TEXT, address_line1 TEXT, address_line2 TEXT, landmark TEXT,
      city TEXT, pincode TEXT, lat FLOAT, lng FLOAT, is_default BOOLEAN, created_at TIMESTAMPTZ DEFAULT NOW());
    CREATE TABLE bookings (id TEXT, user_id TEXT, partner_id TEXT, address_id TEXT, partner_lat FLOAT, partner_lng FLOAT,
      patient_lat FLOAT, patient_lng FLOAT, status TEXT, booking_number TEXT, service_title TEXT, patient_name TEXT,
      total_amount NUMERIC, payment_status TEXT, payment_ref TEXT, created_at TIMESTAMPTZ DEFAULT NOW());
    CREATE TABLE invoices (id TEXT, booking_id TEXT, user_id TEXT, invoice_number TEXT, service_title TEXT,
      subtotal NUMERIC, tax_amount NUMERIC, total_paid NUMERIC, payment_ref TEXT, created_at TIMESTAMPTZ DEFAULT NOW());
  `);
});
beforeEach(async () => {
  session = null; offline = false; queries = [];
  await db.exec(`TRUNCATE users, partner_profiles, patient_profiles, addresses, bookings, invoices;
    INSERT INTO users (id, role) VALUES ('patient', 'PATIENT'), ('other', 'PATIENT'), ('doctor', 'PARTNER'), ('admin', 'ADMIN'), ('root', 'SUPER_ADMIN');
    INSERT INTO partner_profiles (user_id, verification_status) VALUES ('doctor', 'APPROVED');
    INSERT INTO patient_profiles (id, user_id, full_name) VALUES ('mine', 'patient', 'Mine'), ('theirs', 'other', 'Private');
    INSERT INTO addresses (id, user_id, address_line1, pincode) VALUES ('mine', 'patient', 'Mine', '123456'), ('theirs', 'other', 'Private', '654321');
    INSERT INTO bookings (id, user_id, partner_id, status) VALUES ('visit', 'other', 'doctor', 'ON_THE_WAY'), ('unassigned', 'other', NULL, 'PENDING');
    INSERT INTO invoices (id, user_id) VALUES ('mine', 'patient'), ('theirs', 'other');`);
});
after(() => db.close());

for (const route of privateRoutes) {
  test(`${route.name} rejects guests and every disallowed role before accessing data`, async () => {
    assert.equal((await route.handler(req(route.method), context)).status, 401);
    for (const role of roles.filter(r => !route.allowed.includes(r))) {
      session = { user: { id: 'anything', role } };
      assert.equal((await route.handler(req(route.method), context)).status, 403, role);
    }
    assert.equal(queries.length, 0, 'Denied requests must not query or mutate records');
  });
}
test('correct roles work; deleted accounts, role changes, pending doctors and database outages fail closed', async () => {
  for (const [id, role] of [['patient','PATIENT'], ['doctor','PARTNER'], ['admin','ADMIN'], ['root','SUPER_ADMIN']]) {
    session = { user: { id, role } };
    assert.equal((await guard([role])).user.id, id);
  }
  session = { user: { id: 'missing', role: 'SUPER_ADMIN' } };
  assert.equal((await guard(['SUPER_ADMIN'])).response.status, 401);
  session = { user: { id: 'patient', role: 'SUPER_ADMIN' } };
  assert.equal((await guard(['SUPER_ADMIN'])).response.status, 401);
  session = { user: { id: 'doctor', role: 'PARTNER' } };
  await db.exec("UPDATE partner_profiles SET verification_status = 'PENDING'");
  assert.equal((await guard(['PARTNER'])).response.status, 403);
  offline = true;
  assert.equal((await guard(['PARTNER'])).response.status, 503);
});
test('cross-site mutations are denied but same-origin writes work', async () => {
  session = { user: { id: 'patient', role: 'PATIENT' } };
  for (const origin of ['https://attacker.test', 'null']) {
    const request = new Request('https://homedigo.test/api/resource', { method: 'POST', headers: { origin } });
    assert.equal((await guard(['PATIENT'], request)).response.status, 403);
  }
  assert.ok((await guard(['PATIENT'], new Request('https://homedigo.test/api/resource', {
    method: 'POST', headers: { origin: 'https://homedigo.test' },
  }))).user);
});
for (const [kind, body] of [['profiles', { fullName: 'Updated' }], ['addresses', { addressLine1: 'Updated', pincode: '123456' }]]) {
  test(`${kind}: browser-supplied account IDs cannot read, create, update or delete another patient's data`, async () => {
    session = { user: { id: 'patient', role: 'PATIENT' } };
    const api = load(`src/app/api/patient/${kind}/route.ts`);
    const listed = await (await api.GET(req('GET', null, '?userId=other&email=other@test'))).json();
    assert.deepEqual(listed[kind].map(r => r.id), ['mine']);
    const created = await (await api.POST(req('POST', { ...body, userId: 'other' }))).json();
    assert.equal(created[kind === 'profiles' ? 'profile' : 'address'].user_id, 'patient');
    assert.equal((await api.PUT(req('PUT', { ...body, id: 'theirs' }))).status, 404);
    assert.equal((await api.DELETE(req('DELETE', null, '?id=theirs'))).status, 404);
    assert.equal((await api.PUT(req('PUT', { ...body, id: 'mine' }))).status, 200);
    assert.equal((await api.DELETE(req('DELETE', null, '?id=mine'))).status, 200);
  });
}
test('invoice queries cannot impersonate another patient', async () => {
  session = { user: { id: 'patient', role: 'PATIENT' } };
  const response = await load('src/app/api/patient/invoices/route.ts').GET(req('GET', null, '?userId=other'));
  assert.deepEqual((await response.json()).invoices.map(r => r.id), ['mine']);
});
test('location is available only to the assigned doctor or booking owner and reads do not change status', async () => {
  const api = load('src/app/api/pro/visits/[id]/location/route.ts');
  session = { user: { id: 'patient', role: 'PATIENT' } };
  assert.equal((await api.GET(req(), context)).status, 404);
  for (const [id, role] of [['other','PATIENT'], ['doctor','PARTNER']]) {
    session = { user: { id, role } };
    assert.equal((await api.GET(req(), context)).status, 200);
  }
  assert.equal(queries.some(sql => sql.includes('UPDATE bookings')), false);
});
test('earnings exclude unassigned and other doctors bookings', async () => {
  session = { user: { id: 'doctor', role: 'PARTNER' } };
  const response = await load('src/app/api/pro/earnings/route.ts').GET();
  assert.deepEqual((await response.json()).payouts.map(p => p.id), ['visit']);
});
test('admin partner edits cannot modify administrator accounts', async () => {
  session = { user: { id: 'admin', role: 'ADMIN' } };
  const api = load('src/app/api/admin/partners/route.ts');
  assert.equal((await api.PUT(req('PUT', { userId: 'root', name: 'Hijacked' }))).status, 404);
  await db.exec("UPDATE users SET email = 'root@test' WHERE id = 'root'");
  assert.equal((await api.POST(req('POST', { email: 'root@test', name: 'Hijacked', specialization: 'General', password: 'Long-test-password' }))).status, 409);
});

test('landing catalogs and payment configuration remain public by explicit policy', () => {
  for (const entry of [...publicRoutes].filter(p => p.endsWith(':GET'))) {
    const [path] = entry.split(':');
    const source = readFileSync('src/app/api/' + path, 'utf8');
    const ast = ts.createSourceFile(path, source, ts.ScriptTarget.Latest, true);
    const get = ast.statements.find(n => ts.isFunctionDeclaration(n) && n.name?.text === 'GET');
    assert.ok(get);
    assert.equal(get.getText(ast).includes('requireApiUser'), false, entry);
  }
  assert.equal(readFileSync('src/app/patient/book/page.tsx', 'utf8').includes('/api/admin/partners'), false);
});
