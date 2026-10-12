import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { test } from 'node:test';
import vm from 'node:vm';
import crypto from 'node:crypto';
import ts from 'typescript';
import { hashPassword, verifyPassword } from '../src/lib/passwords.ts';

function auth({ connected = true, row, env = {} } = {}) {
  const exports = {};
  const calls = [];
  const source = ts.transpileModule(readFileSync('src/lib/auth.ts', 'utf8'), { compilerOptions: {
    module: ts.ModuleKind.CommonJS, target: ts.ScriptTarget.ES2020, esModuleInterop: true,
  } }).outputText;
  vm.runInNewContext(source, { exports, Buffer, URL, process: { env }, require(name) {
    if (name.startsWith('next-auth/providers/')) return config => config;
    if (name === 'node:crypto') return crypto;
    if (name === './passwords') return { hashPassword, verifyPassword,
      isRetiredSetupPassword: password => ['SuperAdmin@2026', 'Partner@123'].includes(password) };
    if (name === './db') return { isDbConfigured: connected, executeQuery: async (sql, args) => {
      calls.push({ sql, args }); return { isConnected: connected, rows: row ? [row] : [] };
    } };
    throw new Error(name);
  } });
  return { ...exports.authOptions, calls };
}
test('production has no demo provider, fallback signing secret, or offline administrator login', async () => {
  const options = auth({ connected: false, env: { NODE_ENV: 'production' } });
  assert.equal(options.secret, undefined);
  assert.deepEqual(Array.from(options.providers, p => p.id), ['credentials-login']);
  const login = options.providers[0].authorize;
  await assert.rejects(login({ role: 'SUPER_ADMIN' }));
  await assert.rejects(login({ email: 'superadmin@homedigo.care', password: 'SuperAdmin@2026' }));
});
test('valid credentials retain the database role and old sessions are invalidated', async () => {
  const options = auth({ row: { id: 'patient', role: 'PATIENT', password_hash: hashPassword('Long-test-password') } });
  const user = await options.providers[0].authorize({ email: 'patient@test', password: 'Long-test-password', role: 'SUPER_ADMIN' });
  assert.equal(user.role, 'PATIENT');
  const token = await options.callbacks.jwt({ token: {}, user });
  assert.equal((await options.callbacks.session({ session: { user: {} }, token })).user.id, 'patient');
  assert.equal((await options.callbacks.session({ session: { user: {} }, token: { id: 'usr_super_admin_demo', role: 'SUPER_ADMIN' } })).user, undefined);
});
test('published setup passwords are rejected even if the database hash matches', async () => {
  for (const password of ['SuperAdmin@2026', 'Partner@123']) {
    const options = auth({ row: { id: 'user', role: 'SUPER_ADMIN', password_hash: hashPassword(password) } });
    await assert.rejects(options.providers[0].authorize({ email: 'user@test', password }), /retired/);
  }
});
test('login redirects stay on the application origin', async () => {
  const options = auth();
  for (const url of ['https://evil-homedigo.test', 'https://evil.vercel.app', '//evil.test', '/\\evil.test']) {
    assert.equal(await options.callbacks.redirect({ url, baseUrl: 'https://homedigo.test' }), 'https://homedigo.test');
  }
  assert.equal(await options.callbacks.redirect({ url: '/patient/book', baseUrl: 'https://homedigo.test' }), 'https://homedigo.test/patient/book');
});
test('Google sign-in requires a verified email and cannot grant access to a privileged account', async () => {
  const options = auth({ row: { id: 'root', role: 'SUPER_ADMIN' } });
  const input = { user: { id: 'google-id', email: 'root@test' }, account: { provider: 'google' }, profile: { email_verified: false } };
  assert.equal(await options.callbacks.signIn(input), false);
  input.profile.email_verified = true;
  assert.equal(await options.callbacks.signIn(input), false);
  const patient = auth({ row: { id: 'patient', role: 'PATIENT' } });
  assert.equal(await patient.callbacks.signIn(input), true);
  assert.equal(input.user.id, 'patient');
  assert.equal(input.user.role, 'PATIENT');
});
test('password hashing verifies current and legacy hashes but refuses plaintext and malformed hashes', () => {
  const password = 'Long-test-password';
  const salt = crypto.randomBytes(16).toString('hex');
  const legacy = `${salt}:${crypto.pbkdf2Sync(password, salt, 1000, 64, 'sha512').toString('hex')}`;
  for (const hash of [hashPassword(password), legacy]) {
    assert.equal(verifyPassword(password, hash), true);
    assert.equal(verifyPassword('wrong', hash), false);
  }
  for (const hash of [password, 'malformed:hash', '', undefined]) assert.equal(verifyPassword(password, hash), false);
});
