import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { test } from 'node:test';
import vm from 'node:vm';
import ts from 'typescript';
import * as jwt from 'next-auth/jwt';

const secret = 'isolated-test-secret-never-used-in-production';
function load(file, dependencies, globals = {}) {
  const exports = {};
  const source = ts.transpileModule(readFileSync(file, 'utf8'), { compilerOptions: {
    module: ts.ModuleKind.CommonJS, target: ts.ScriptTarget.ES2020,
  } }).outputText;
  vm.runInNewContext(source, { exports, URL, Headers, Date, console, process: { env: { NEXTAUTH_SECRET: secret } },
    ...globals, require(name) {
      assert.ok(name in dependencies, `Unexpected dependency: ${name}`);
      return dependencies[name];
    } });
  return exports;
}
const sessions = load('src/lib/staff-session.ts', { 'next-auth/jwt': jwt });
const schema = load('src/lib/password-reset-schema.ts', { './db': { executeQuery: async () => ({ isConnected: true, rows: [] }) } });
const staff = { id: 'admin-a', role: 'ADMIN', name: 'Admin A', email: 'admin@example.test' };

test('staff tokens reject tampering, expired sessions and patient-cookie tokens', async () => {
  const { token } = await sessions.createStaffSession(staff);
  assert.equal((await sessions.readStaffSession(`Bearer ${token}`)).user.id, staff.id);
  for (const value of [null, '', 'Bearer garbage', `Bearer x${token.slice(1)}`]) {
    assert.equal(await sessions.readStaffSession(value), null);
  }
  const cookieToken = await jwt.encode({ secret, token: { ...staff, purpose: 'homedigo-staff-tab-v1' } });
  assert.equal(await sessions.readStaffSession(`Bearer ${cookieToken}`), null);
  const expired = await jwt.encode({ secret, salt: 'homedigo-staff-tab-v1', maxAge: -60,
    token: { ...staff, purpose: 'homedigo-staff-tab-v1' } });
  assert.equal(await sessions.readStaffSession(`Bearer ${expired}`), null);
  await assert.rejects(sessions.createStaffSession({ id: 'patient', role: 'PATIENT' }));
});

test('API identity comes from the current tab; legacy staff cookies cannot authorize requests', async () => {
  let cookieSession = { user: { id: 'root-cookie', role: 'SUPER_ADMIN' } };
  let requestHeaders = new Headers();
  let record = { ...staff, verification_status: 'APPROVED' };
  const { requireApiUser } = load('src/lib/api-auth.ts', {
    'next/server': { NextResponse: { json: (body, options) => Response.json(body, options) } },
    'next/headers': { headers: async () => requestHeaders },
    'next-auth/next': { getServerSession: async () => cookieSession },
    '@/lib/auth': { authOptions: {} }, '@/lib/staff-session': sessions,
    '@/lib/password-reset-schema': schema,
    '@/lib/db': { executeQuery: async () => ({ isConnected: true, rows: record ? [record] : [] }) },
  });
  assert.equal((await requireApiUser(['SUPER_ADMIN'])).response.status, 401);
  const { token } = await sessions.createStaffSession(staff);
  requestHeaders.set('authorization', `Bearer ${token}`);
  assert.equal((await requireApiUser(['ADMIN'])).user.id, 'admin-a');
  assert.equal((await requireApiUser(['SUPER_ADMIN'])).response.status, 403);
  assert.equal((await requireApiUser(['PARTNER'])).response.status, 403);
  record.password_changed_at = new Date().toISOString();
  assert.equal((await requireApiUser(['ADMIN'])).response.status, 401, 'Password reset must invalidate an older staff token');
  record = { id: staff.id, role: 'PARTNER' };
  assert.equal((await requireApiUser(['ADMIN'])).response.status, 401);
  record = null;
  assert.equal((await requireApiUser(['ADMIN'])).response.status, 401);
  requestHeaders.set('authorization', 'Bearer invalid');
  cookieSession = { user: { id: 'patient', role: 'PATIENT' } };
  assert.equal((await requireApiUser(['PATIENT'])).response.status, 401, 'Invalid bearer must not fall back to cookies');
  requestHeaders = new Headers();
  record = cookieSession.user;
  assert.equal((await requireApiUser(['PATIENT'])).user.id, 'patient');
});

test('staff login requires the matching portal and same origin; it sets no shared cookie', async () => {
  let calls = 0;
  const api = load('src/app/api/auth/staff/route.ts', {
    'next/server': { NextResponse: { json: (body, options) => Response.json(body, options) } },
    '@/lib/auth': { authenticateCredentials: async ({ expectedRole, password }) => {
      calls++;
      if (expectedRole !== 'ADMIN' || password !== 'synthetic-password') throw new Error('Incorrect credentials or role.');
      return staff;
    } },
    '@/lib/staff-session': sessions,
    '@/lib/password-reset-schema': schema,
    '@/lib/db': { executeQuery: async () => ({ isConnected: true, rows: [staff] }) },
  });
  const request = (origin, expectedRole = 'ADMIN', password = 'synthetic-password') => new Request('https://homedigo.test/api/auth/staff', {
    method: 'POST', headers: { origin, 'Content-Type': 'application/json' },
    body: JSON.stringify({ email: staff.email, password, expectedRole }),
  });
  assert.equal((await api.POST(request('https://evil.test'))).status, 403);
  assert.equal(calls, 0);
  assert.equal((await api.POST(request('https://homedigo.test', 'PATIENT'))).status, 400);
  assert.equal((await api.POST(request('https://homedigo.test', 'PARTNER'))).status, 401);
  const response = await api.POST(request('https://homedigo.test'));
  assert.equal(response.status, 200);
  assert.equal(response.headers.get('set-cookie'), null);
  assert.match(response.headers.get('cache-control'), /no-store/);
  const { token } = await response.json();
  assert.equal((await api.GET(new Request('https://homedigo.test/api/auth/staff'))).status, 401);
  const restored = await api.GET(new Request('https://homedigo.test/api/auth/staff', { headers: { authorization: `Bearer ${token}` } }));
  assert.equal((await restored.json()).user.id, staff.id);
});

function tab(pathname, storage = new Map()) {
  const window = new EventTarget();
  window.location = { origin: 'https://homedigo.test', pathname };
  const requests = [];
  let status = 200;
  const sessionStorage = { getItem: key => storage.get(key) ?? null,
    setItem: (key, value) => storage.set(key, value), removeItem: key => storage.delete(key) };
  const client = load('src/lib/staff-client.ts', {}, { window, sessionStorage, Event,
    fetch: async (url, init) => { requests.push({ url, ...init }); return new Response('{}', { status }); } });
  return { ...client, window, requests, storage, respondWith: code => { status = code; } };
}

test('tabs and portals keep independent credentials through refresh, login and logout', async () => {
  const admin = tab('/admin/dashboard');
  const partner = tab('/partner/dashboard');
  const secondAdmin = tab('/admin/dashboard');
  admin.storeStaffToken('admin', 'admin-token');
  partner.storeStaffToken('partner', 'partner-token');
  assert.equal(secondAdmin.readStaffToken('admin'), null);
  secondAdmin.storeStaffToken('admin', 'other-admin-token');
  await admin.staffFetch('/api/admin/stats');
  await partner.staffFetch('/api/pro/dashboard');
  await secondAdmin.staffFetch('/api/admin/stats');
  assert.equal(admin.requests[0].headers.get('authorization'), 'Bearer admin-token');
  assert.equal(partner.requests[0].headers.get('authorization'), 'Bearer partner-token');
  assert.equal(secondAdmin.requests[0].headers.get('authorization'), 'Bearer other-admin-token');
  assert.equal(tab('/admin/dashboard', admin.storage).readStaffToken('admin'), 'admin-token');
  admin.window.location.pathname = '/super-admin/dashboard';
  await admin.staffFetch('/api/super-admin/stats');
  assert.equal(admin.requests[1].headers.get('authorization'), null);
  secondAdmin.storeStaffToken('admin', null);
  assert.equal(admin.readStaffToken('admin'), 'admin-token');
  assert.equal(partner.readStaffToken('partner'), 'partner-token');
  assert.equal(admin.requests[0].credentials, 'omit');
  assert.equal(admin.requests[0].redirect, 'error');
});

test('staff credentials never leave the site; expiration clears only the current portal', async () => {
  const page = tab('/admin/dashboard');
  page.storeStaffToken('admin', 'admin-token');
  page.storeStaffToken('partner', 'partner-token');
  await assert.rejects(page.staffFetch('https://evil.test/api/stats'));
  await assert.rejects(page.staffFetch('/external-page'));
  assert.equal(page.requests.length, 0);
  page.respondWith(401);
  await page.staffFetch('/api/admin/stats');
  assert.equal(page.readStaffToken('admin'), null);
  assert.equal(page.readStaffToken('partner'), 'partner-token');
});
