import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { test } from 'node:test';
import vm from 'node:vm';
import ts from 'typescript';

// Isolated environments and SMTP stubs: these tests never send real email.
function loadModule(path, env, dependencies) {
  const source = ts.transpileModule(readFileSync(path, 'utf8'), {
    compilerOptions: { module: ts.ModuleKind.CommonJS, target: ts.ScriptTarget.ES2020, esModuleInterop: true },
  }).outputText;
  const exports = {};
  vm.runInNewContext(source, {
    exports, process: { env }, console: { log() {}, error() {} },
    require(name) {
      if (!(name in dependencies)) throw new Error(`Unexpected dependency: ${name}`);
      return dependencies[name];
    },
  });
  return exports;
}

const config = { SMTP_HOST: 'smtp.example.com', SMTP_USER: 'sender@example.com', SMTP_PASS: 'private-test-password' };
const params = {
  doctorEmail: 'recipient@example.com', doctorName: 'Test Doctor', patientName: 'Test Patient',
  serviceTitle: 'Test Visit', scheduledDate: 'Today', scheduledTimeSlot: 'Morning',
  addressText: 'Test Address', bookingNumber: 'TEST', totalAmount: 0,
};

function mailer(env, sendMail, capture = () => {}) {
  return loadModule('src/lib/email.ts', env, {
    nodemailer: { createTransport(options) { capture(options); return { sendMail }; } },
  }).sendDoctorAppointmentEmail;
}

test('missing credentials fail instead of claiming the email was sent', async () => {
  const send = mailer({}, () => assert.fail('SMTP must not be called'));
  const result = await send(params);
  assert.equal(result.success, false);
  assert.equal(result.code, 'SMTP_NOT_CONFIGURED');
});

test('SMTP authentication and connection failures propagate without leaking secrets', async () => {
  for (const code of ['EAUTH', 'ETIMEDOUT', 'ESOCKET']) {
    const send = mailer(config, async () => { throw Object.assign(new Error(config.SMTP_PASS), { code }); });
    const result = await send(params);
    assert.equal(result.success, false);
    assert.equal(result.code, code);
    assert.ok(!JSON.stringify(result).includes(config.SMTP_PASS));
  }
});

test('port 465 uses TLS and port 587 uses STARTTLS by default', async () => {
  for (const port of [465, 587]) {
    const send = mailer({ ...config, SMTP_PORT: String(port) }, async () => ({ accepted: [params.doctorEmail], messageId: 'test-id' }), options => {
      assert.equal(options.secure, port === 465);
      assert.equal(options.port, port);
    });
    const result = await send(params);
    assert.equal(result.success, true);
    assert.equal(result.messageId, 'test-id');
  }
});

test('invalid ports and conflicting TLS settings fail before connecting', async () => {
  for (const settings of [
    { SMTP_PORT: 'invalid' }, { SMTP_PORT: '0' },
    { SMTP_PORT: '465', SMTP_SECURE: 'false' },
    { SMTP_PORT: '587', SMTP_SECURE: 'true' }, { SMTP_SECURE: 'invalid' },
  ]) {
    const send = mailer({ ...config, ...settings }, () => assert.fail('SMTP must not be called'));
    assert.equal((await send(params)).code, 'SMTP_INVALID_CONFIG');
  }
});

test('an unaccepted recipient is not reported as a successful send', async () => {
  const send = mailer(config, async () => ({ accepted: [], messageId: 'test-id' }));
  assert.equal((await send(params)).success, false);
});

function route(send) {
  return loadModule('src/app/api/admin/test-email/route.ts', {}, {
    '@/lib/email': { sendDoctorAppointmentEmail: send },
    'next/server': { NextResponse: { json: (body, init) => ({ body, status: init?.status || 200 }) } },
  }).POST;
}

test('test endpoint returns failure HTTP status for failed SMTP', async () => {
  for (const [code, status] of [['EAUTH', 502], ['SMTP_NOT_CONFIGURED', 503], ['SMTP_INVALID_CONFIG', 503]]) {
    const post = route(async () => ({ success: false, code, error: 'Test failure' }));
    const response = await post({ json: async () => ({ email: params.doctorEmail }) });
    assert.equal(response.status, status);
    assert.equal(response.body.success, false);
  }
});

test('test endpoint rejects malformed and multiple recipient addresses', async () => {
  const post = route(() => assert.fail('SMTP must not be called'));
  for (const email of [null, {}, 'invalid', 'a@example.com,b@example.com', 'a@example.com\r\nb@example.com']) {
    assert.equal((await post({ json: async () => ({ email }) })).status, 400);
  }
});

test('test endpoint reports SMTP acceptance with a message ID', async () => {
  const post = route(async () => ({ success: true, messageId: 'test-id' }));
  const response = await post({ json: async () => ({ email: params.doctorEmail }) });
  assert.equal(response.status, 200);
  assert.equal(response.body.result.messageId, 'test-id');
});
