import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { before, beforeEach, after, test } from 'node:test';
import vm from 'node:vm';
import crypto from 'node:crypto';
import ts from 'typescript';
import { PGlite } from '@electric-sql/pglite';
import { hashPassword, verifyPassword, isRetiredSetupPassword } from '../src/lib/passwords.ts';

const db = new PGlite();
const env = { NEXTAUTH_SECRET: 'test-recovery-secret', NODE_ENV: 'production', NEXT_PUBLIC_APP_URL: 'http://localhost:3000' };
let messages = [], mailFails = false, offline = false, identity = null;
const deps = {
  'node:crypto': crypto,
  'next/server': { NextResponse: { json: (body, options) => Response.json(body, options) } },
  './passwords': { hashPassword, verifyPassword, isRetiredSetupPassword },
  './db': { executeQuery: async (sql, args = []) => {
    if (offline) return { isConnected: false, rows: [] };
    return { isConnected: true, rows: (await db.query(sql, args)).rows };
  } },
  './email': {
    isEmailAddress: value => typeof value === 'string' && /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(value),
    sendPasswordRecoveryEmail: async (email, payload) => {
      if (mailFails) return { success: false, code: 'TEST_FAILURE' };
      messages.push({ email, ...payload }); return { success: true };
    },
  },
  '@/lib/api-auth': { requireApiUser: async roles => identity && roles.includes(identity.role)
    ? { user: identity } : { response: Response.json({ error: 'Forbidden' }, { status: identity ? 403 : 401 }) } },
};
deps['@/lib/email'] = deps['./email'];
function load(file) {
  const exports = {};
  vm.runInNewContext(ts.transpileModule(readFileSync(file, 'utf8'), { compilerOptions: {
    module: ts.ModuleKind.CommonJS, target: ts.ScriptTarget.ES2020,
  } }).outputText, { exports, URL, Date, process: { env }, require(name) {
    assert.ok(name in deps, `Unexpected dependency ${name}`); return deps[name];
  } });
  return exports;
}
const schema = load('src/lib/password-reset-schema.ts');
deps['./password-reset-schema'] = schema;
const recovery = load('src/lib/password-reset.ts');
deps['@/lib/password-reset'] = recovery;
const api = load('src/app/api/auth/password-reset/route.ts');
const approvals = load('src/app/api/super-admin/password-resets/route.ts');
const password = 'Replacement-password-123!';
const request = (body, origin = 'https://homedigo.test') => new Request('https://homedigo.test/api/auth/password-reset', {
  method: 'POST', headers: { origin, 'Content-Type': 'application/json' }, body: JSON.stringify(body),
});
before(async () => {
  await db.exec(`CREATE TABLE users (id VARCHAR(64) PRIMARY KEY, email TEXT UNIQUE, role TEXT, name TEXT, password_hash TEXT, updated_at TIMESTAMPTZ);
    INSERT INTO users (id,email,role,name) VALUES ('patient','patient@test.local','PATIENT','Patient'),
      ('partner','partner@test.local','PARTNER','Partner'),('admin','admin@test.local','ADMIN','Admin'),('root','root@test.local','SUPER_ADMIN','Root');`);
  await schema.ensurePasswordResetSchema();
});
beforeEach(async () => {
  messages = []; mailFails = false; offline = false; identity = null;
  await db.exec(`TRUNCATE password_reset_requests, password_reset_limits;
    UPDATE users SET password_changed_at = NULL, password_hash = NULL;
    UPDATE users SET role='ADMIN', email='admin@test.local' WHERE id='admin';`);
});
after(() => db.close());
const issue = (role = 'PATIENT') => recovery.requestPasswordReset(`${role.toLowerCase()}@test.local`, role);
const row = async () => (await db.query('SELECT * FROM password_reset_requests')).rows[0];
const wrong = code => code === '000000' ? '111111' : '000000';

for (const role of ['PATIENT', 'PARTNER']) test(`${role}: email code resets only its account, once, and invalidates older sessions`, async () => {
  const beforeReset = Date.now() - 1000;
  const result = await issue(role);
  assert.match(messages[0].value, /^\d{6}$/);
  assert.equal(messages[0].email, `${role.toLowerCase()}@test.local`);
  assert.equal(JSON.stringify(result).includes(messages[0].value), false);
  assert.notEqual((await row()).secret_hash, messages[0].value);
  await recovery.completePasswordReset(result.requestId, role, messages[0].value, password);
  const user = (await db.query('SELECT * FROM users WHERE role=$1', [role])).rows[0];
  assert.equal(verifyPassword(password, user.password_hash), true);
  assert.equal((await row()).status, 'USED');
  assert.equal((await row()).secret_hash, null);
  assert.equal(schema.sessionPredatesPasswordChange(beforeReset, user.password_changed_at), true);
  assert.equal(schema.sessionPredatesPasswordChange(undefined, user.password_changed_at), true);
  assert.equal(schema.sessionPredatesPasswordChange(Date.now() + 1000, user.password_changed_at), false);
  await assert.rejects(recovery.completePasswordReset(result.requestId, role, messages[0].value, password));
  assert.equal(messages.at(-1).kind, 'changed');
  assert.ok(messages.every(message => !JSON.stringify(message).includes(password)));
});

test('unknown accounts, wrong portals and superadmins reveal no account existence or reset secret', async () => {
  for (const email of ['absent@test.local', 'partner@test.local', 'admin@test.local', 'root@test.local']) {
    const response = await api.POST(request({ action: 'request', role: 'PATIENT', email }));
    assert.equal(response.status, 202);
    const body = await response.json();
    assert.deepEqual(Object.keys(body).sort(), ['message', 'requestId']);
    assert.match(body.message, /If a matching account exists/);
  }
  assert.equal(messages.length, 0);
  assert.equal((await db.query('SELECT * FROM password_reset_requests')).rows.length, 0);
  assert.equal((await api.POST(request({ action: 'request', role: 'SUPER_ADMIN', email: 'root@test.local' }))).status, 400);
});

test('five incorrect code attempts lock the challenge; expiry and cross-role use fail', async () => {
  const result = await issue();
  const code = messages[0].value;
  await assert.rejects(recovery.completePasswordReset(result.requestId, 'PARTNER', code, password));
  for (let i = 0; i < 5; i++) await assert.rejects(recovery.completePasswordReset(result.requestId, 'PATIENT', wrong(code), password));
  await assert.rejects(recovery.completePasswordReset(result.requestId, 'PATIENT', code, password));
  assert.equal((await row()).attempts, 5);
  await db.exec("UPDATE password_reset_requests SET attempts=0, expires_at=NOW()-INTERVAL '1 second'");
  await assert.rejects(recovery.completePasswordReset(result.requestId, 'PATIENT', code, password));
});

test('resend replaces the previous code and has persistent request limits', async () => {
  const first = await issue();
  const oldCode = messages[0].value;
  await issue();
  assert.equal(messages.length, 1, 'Immediate resend must not send another email');
  await db.exec("UPDATE password_reset_requests SET created_at=NOW()-INTERVAL '2 minutes'");
  const second = await issue();
  assert.equal(messages.length, 2);
  await assert.rejects(recovery.completePasswordReset(first.requestId, 'PATIENT', oldCode, password));
  await recovery.completePasswordReset(second.requestId, 'PATIENT', messages[1].value, password);
  await issue(); await issue();
  await assert.rejects(issue(), error => error.status === 429);
});

test('simultaneous correct submissions consume a code exactly once', async () => {
  const { requestId } = await issue();
  const results = await Promise.allSettled([1, 2].map(() => recovery.completePasswordReset(requestId, 'PATIENT', messages[0].value, password)));
  assert.equal(results.filter(result => result.status === 'fulfilled').length, 1);
});

test('admin must be approved by superadmin before receiving and using a secure link', async () => {
  const { requestId } = await issue('ADMIN');
  assert.equal(messages.length, 0);
  assert.equal((await row()).status, 'PENDING');
  for (const role of [null, 'ADMIN', 'PARTNER', 'PATIENT']) {
    identity = role ? { id: role.toLowerCase(), role } : null;
    assert.equal((await approvals.POST(request({ id: requestId, action: 'approve' }))).status, role ? 403 : 401);
    assert.equal((await approvals.GET()).status, role ? 403 : 401);
  }
  identity = { id: 'root', role: 'SUPER_ADMIN' };
  assert.equal((await approvals.POST(request({ id: requestId, action: 'approve' }))).status, 200);
  assert.equal((await row()).decided_by, 'root');
  const link = new URL(messages[0].value);
  assert.equal(link.origin, 'https://homedigo.vercel.app');
  assert.equal(link.search, '');
  const token = new URLSearchParams(link.hash.slice(1)).get('token');
  assert.match(token, /^[A-Za-z0-9_-]{43}$/);
  assert.notEqual((await row()).secret_hash, token);
  assert.equal((await approvals.POST(request({ id: requestId, action: 'approve' }))).status, 409);
  const listing = await (await approvals.GET()).json();
  assert.ok(!JSON.stringify(listing).includes(token));
  await recovery.completePasswordReset(requestId, 'ADMIN', token, password);
  await assert.rejects(recovery.completePasswordReset(requestId, 'ADMIN', token, password));
});

test('pending, rejected, expired and changed-role admin requests cannot reset passwords', async () => {
  const { requestId } = await issue('ADMIN');
  await assert.rejects(recovery.completePasswordReset(requestId, 'ADMIN', 'A'.repeat(43), password));
  await recovery.decideAdminReset(requestId, 'reject', 'root');
  await assert.rejects(recovery.decideAdminReset(requestId, 'approve', 'root'));
  assert.equal(messages.length, 0);
  await db.exec("UPDATE password_reset_requests SET status='PENDING', expires_at=NOW()-INTERVAL '1 second'");
  await assert.rejects(recovery.decideAdminReset(requestId, 'approve', 'root'));
  await db.exec("UPDATE password_reset_requests SET expires_at=NOW()+INTERVAL '1 hour'; UPDATE users SET role='SUPER_ADMIN' WHERE id='admin'");
  await assert.rejects(recovery.decideAdminReset(requestId, 'approve', 'root'));
});

test('SMTP failures invalidate codes and allow superadmin to retry failed link delivery', async () => {
  mailFails = true;
  await issue();
  assert.equal((await row()).status, 'EMAIL_FAILED');
  assert.equal((await row()).secret_hash, null);
  const { requestId } = await issue('ADMIN');
  await assert.rejects(recovery.decideAdminReset(requestId, 'approve', 'root'), error => error.status === 502);
  mailFails = false;
  await recovery.decideAdminReset(requestId, 'approve', 'root');
  assert.equal(messages.length, 1);
  const token = new URLSearchParams(new URL(messages[0].value).hash.slice(1)).get('token');
  mailFails = true;
  await recovery.completePasswordReset(requestId, 'ADMIN', token, password);
  assert.equal(verifyPassword(password, (await db.query("SELECT password_hash FROM users WHERE id='admin'")).rows[0].password_hash), true);
});

test('public route rejects cross-site requests, weak passwords, mismatches and invalid code formats', async () => {
  assert.equal((await api.POST(request({ action: 'request', role: 'PATIENT', email: 'patient@test.local' }, 'https://evil.test'))).status, 403);
  const { requestId } = await issue();
  for (const extra of [{ password: 'short', confirmPassword: 'short' }, { confirmPassword: 'different' }, { secret: 'abc123' }, { requestId: 'invalid' }]) {
    assert.equal((await api.POST(request({ action: 'reset', role: 'PATIENT', requestId, secret: messages[0].value, password, confirmPassword: password, ...extra }))).status, 400);
  }
  offline = true;
  assert.equal((await api.POST(request({ action: 'request', role: 'PATIENT', email: 'patient@test.local' }))).status, 503);
});
