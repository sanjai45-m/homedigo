// Synthetic recovery emails and accounts only; no live password or mailbox is changed.
const { chromium } = require(process.env.PLAYWRIGHT_MODULE || 'playwright');
const assert = require('node:assert/strict');
const origin = process.env.TEST_ORIGIN || 'http://127.0.0.1:3100';
const id = '11111111-1111-4111-8111-111111111111';
const token = 'A'.repeat(43);
(async () => {
  const browser = await chromium.launch({ headless: true, executablePath: process.env.BROWSER_EXECUTABLE || undefined });
  try {
    const context = await browser.newContext({ viewport: { width: 390, height: 900 } });
    const errors = [], requests = [];
    let adminStatus = 'PENDING';
    await context.route('**/api/**', async route => {
      const path = new URL(route.request().url()).pathname;
      let body = {}, status = 200;
      if (path === '/api/auth/password-reset') {
        const data = route.request().postDataJSON(); requests.push(data);
        if (data.action === 'request') {
          status = 202; body = { requestId: id, message: data.role === 'ADMIN' ? 'If this email belongs to an admin, a request is awaiting Super Admin approval.' : 'If a matching account exists, a verification code will be emailed to that address.' };
        } else if (data.secret !== (data.role === 'ADMIN' ? token : '123456')) {
          status = 400; body = { error: 'The code or link is invalid, expired, or already used. Request a new reset.' };
        } else {
          assert.equal(data.password, data.confirmPassword);
          if (data.role === 'ADMIN') assert.equal(adminStatus, 'APPROVED');
          body = { message: 'Your password has been reset. Sign in with your new password.' };
        }
      } else if (path === '/api/auth/staff') {
        body = { user: { id: 'root', name: 'Root Test', role: 'SUPER_ADMIN' }, expires: new Date(Date.now() + 3600000).toISOString() };
      } else if (path === '/api/super-admin/password-resets') {
        assert.equal(route.request().headers().authorization, 'Bearer synthetic-root');
        if (route.request().method() === 'POST') {
          adminStatus = route.request().postDataJSON().action === 'approve' ? 'APPROVED' : 'REJECTED';
          body = { message: 'Approved. A secure reset link was emailed to the admin.' };
        } else body = { requests: [{ id, email: 'admin@example.test', name: 'Test Admin', status: adminStatus,
          created_at: new Date().toISOString(), expires_at: new Date(Date.now() + 86400000).toISOString(), expired: false }] };
      }
      await route.fulfill({ status, contentType: 'application/json', body: JSON.stringify(body) });
    });
    const page = await context.newPage();
    page.setDefaultTimeout(60000);
    page.on('pageerror', error => errors.push(error.message));
    for (const portal of ['patient', 'partner']) {
      await page.goto(`${origin}/${portal}/login`);
      await page.getByRole('link', { name: 'Forgot password?', exact: true }).click();
      await page.getByLabel('Account email', { exact: true }).fill(`${portal}@example.test`);
      await page.getByRole('button', { name: 'Send verification code', exact: true }).click();
      await page.getByLabel('Verification code', { exact: false }).fill('000000');
      await page.getByLabel(/^New password/).fill('Synthetic-password-123');
      await page.getByLabel('Confirm new password', { exact: true }).fill('Synthetic-password-123');
      await page.getByRole('button', { name: 'Reset password', exact: true }).click();
      await page.getByRole('alert').filter({ hasText: 'invalid' }).waitFor();
      await page.getByLabel('Verification code', { exact: false }).fill('123456');
      await page.getByRole('button', { name: 'Reset password', exact: true }).click();
      await page.getByRole('heading', { name: 'Password reset complete' }).waitFor();
      assert.equal(await page.getByRole('link', { name: 'Back to sign in' }).getAttribute('href'), `/${portal}/login`);
      console.log(`PASS: ${portal} recovery handles invalid codes and completes with a valid code`);
    }
    await page.goto(`${origin}/admin/login`);
    await page.getByRole('link', { name: 'Forgot password? Request approval' }).click();
    await page.getByLabel('Account email', { exact: true }).fill('admin@example.test');
    await page.getByRole('button', { name: 'Request Super Admin approval' }).click();
    await page.getByRole('heading', { name: 'Approval requested' }).waitFor();
    assert.equal(await page.locator('input[type="password"]').count(), 0);
    await page.evaluate(() => sessionStorage.setItem('homedigo.staff.super-admin', 'synthetic-root'));
    await page.goto(`${origin}/super-admin/password-resets`);
    await page.getByRole('button', { name: 'Approve & email reset link' }).click();
    await page.getByRole('status').filter({ hasText: 'Approved.' }).waitFor();
    await page.goto(`${origin}/reset-password/admin#id=${id}&token=${token}`);
    await page.getByLabel(/^New password/).fill('Synthetic-password-123');
    assert.equal(new URL(page.url()).hash, '');
    await page.getByLabel('Confirm new password', { exact: true }).fill('Synthetic-password-123');
    await page.getByRole('button', { name: 'Reset password', exact: true }).click();
    await page.getByRole('heading', { name: 'Password reset complete' }).waitFor();
    assert.ok(requests.some(request => request.role === 'ADMIN' && request.action === 'reset' && request.secret === token));
    assert.deepEqual(errors, []);
    console.log('PASS: admin requests approval, superadmin approves, and the secure link completes the reset');
  } finally { await browser.close(); }
})().catch(error => { console.error(error); process.exitCode = 1; });
