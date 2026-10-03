import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { before, beforeEach, after, test } from 'node:test';
import vm from 'node:vm';
import crypto from 'node:crypto';
import ts from 'typescript';
import { PGlite } from '@electric-sql/pglite';

const db = new PGlite();
let offline = false;
const dependencies = {
  'node:crypto': crypto,
  crypto,
  'next/server': { NextResponse: { json: (body, options) => ({ body, status: options?.status || 200 }) } },
  '@/lib/db': { isDbConfigured: true, executeQuery: async (sql, args = []) => {
    if (offline) return { rows: [], isConnected: false };
    const result = await db.query(sql, args);
    return { rows: result.rows, isConnected: true };
  } },
};
function load(path) {
  const source = ts.transpileModule(readFileSync(path, 'utf8'), { compilerOptions: { module: ts.ModuleKind.CommonJS, target: ts.ScriptTarget.ES2020, esModuleInterop: true } }).outputText;
  const exports = {};
  vm.runInNewContext(source, { exports, URL, URLSearchParams, require(name) { if (!(name in dependencies)) throw new Error(`Unexpected dependency ${name}`); return dependencies[name]; } });
  return exports;
}
const passwords = load('src/lib/passwords.ts');
dependencies['@/lib/passwords'] = passwords;
const register = load('src/app/api/auth/register/route.ts').POST;
const navigation = load('src/lib/patient-navigation.ts');
const valid = { name: 'Test Patient', email: ' PATIENT@example.test ', phone: '+91 9876543210', password: 'Test-only-password-123' };
const request = body => ({ json: async () => body });

before(async () => { await db.exec('CREATE TABLE users (id TEXT PRIMARY KEY, name TEXT, email TEXT UNIQUE, phone TEXT, password_hash TEXT, role TEXT)'); });
beforeEach(async () => { offline = false; await db.exec('DELETE FROM users'); });
after(async () => { await db.close(); });

test('registration stores a hashed password, normalizes email, and cannot elevate role', async () => {
  const result = await register(request({ ...valid, role: 'SUPER_ADMIN' }));
  assert.equal(result.status, 201);
  const { rows: [user] } = await db.query('SELECT * FROM users');
  assert.equal(user.email, 'patient@example.test');
  assert.equal(user.role, 'PATIENT');
  assert.notEqual(user.password_hash, valid.password);
  assert.ok(passwords.verifyPassword(valid.password, user.password_hash));
  assert.equal(JSON.stringify(result.body).includes('password'), false);
});

test('duplicate registration never overwrites an existing account', async () => {
  await register(request(valid));
  const result = await register(request({ ...valid, name: 'Changed', password: 'Different-password' }));
  assert.equal(result.status, 409);
  const { rows: [user] } = await db.query('SELECT * FROM users');
  assert.equal(user.name, valid.name);
  assert.ok(passwords.verifyPassword(valid.password, user.password_hash));
});

test('invalid inputs and malformed JSON are rejected before creating an account', async () => {
  for (const body of [null, {}, { ...valid, email: 'invalid' }, { ...valid, password: 'short' }, { ...valid, phone: '----------' }, { ...valid, name: '' }]) {
    assert.equal((await register(request(body))).status, 400);
  }
  assert.equal((await register({ json: async () => { throw new Error('bad JSON'); } })).status, 400);
  assert.equal((await db.query('SELECT * FROM users')).rows.length, 0);
});

test('database failures return an honest unavailable response', async () => {
  offline = true;
  assert.equal((await register(request(valid))).status, 503);
});

test('doctor and service selection survives the sign-in redirect', () => {
  const destination = navigation.doctorBookingUrl('doctor /&?special');
  const url = new URL(navigation.patientSignInUrl(destination), 'https://homedigo.local');
  assert.equal(url.pathname, '/patient/login');
  const booking = new URL(url.searchParams.get('redirect'), 'https://homedigo.local');
  assert.equal(booking.pathname, '/patient/book');
  assert.equal(booking.searchParams.get('doctor'), 'doctor /&?special');
  assert.equal(booking.searchParams.get('service'), 'srv_doc');
});

test('redirects reject external URLs, scripts, backslashes, and authentication loops', () => {
  for (const value of ['https://other.test', '//other.test', '/\\other.test', 'javascript:alert(1)', '/patient/login', '/admin/dashboard', '/patient/../admin/dashboard', '/patient/book/../../evil', '/patient/%2f%2fother.test']) {
    assert.equal(navigation.patientDestination(value), '/patient/dashboard', value);
  }
  assert.equal(navigation.patientDestination('/patient/book?doctor=abc&service=srv_doc'), '/patient/book?doctor=abc&service=srv_doc');
});
