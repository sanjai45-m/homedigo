// Exercise real forms with synthetic identities and mocked API failures only.
import { chromium } from 'playwright';
import assert from 'node:assert/strict';

const origin = process.env.TEST_ORIGIN || 'http://127.0.0.1:3100';
const browser = await chromium.launch({ headless: true, executablePath: process.env.BROWSER_EXECUTABLE || undefined });
const cases = [
  ...['patient', 'partner', 'admin', 'super-admin'].map(portal => ({ path: `/${portal}/login` })),
  { path: '/patient/login', open: 'Create an account' },
  { path: '/partner/login', open: 'Create Partner Account' },
  ...['patient', 'partner', 'admin'].map(portal => ({ path: `/reset-password/${portal}` })),
  { path: '/super-admin/admins', role: 'SUPER_ADMIN', open: 'Provision New Admin Account' },
  { path: '/admin/services', role: 'ADMIN', open: 'Add New Service & Fix Price' },
  ...['admin', 'super-admin'].flatMap(portal => [
    { path: `/${portal}/partners`, role: portal === 'admin' ? 'ADMIN' : 'SUPER_ADMIN', open: 'Onboard New Doctor / Partner' },
    { path: `/${portal}/specialities`, role: portal === 'admin' ? 'ADMIN' : 'SUPER_ADMIN', open: 'Add New Speciality' },
  ]),
  { path: '/patient/family', role: 'PATIENT', open: 'Add Family Member' },
  { path: '/patient/addresses', role: 'PATIENT', open: 'Add New Address' },
];

try {
  for (const width of [1440, 390]) for (const scenario of cases) {
    const context = await browser.newContext({ viewport: { width, height: 900 } });
    try {
      if (scenario.role && scenario.role !== 'PATIENT') await context.addInitScript(role => {
        sessionStorage.setItem(`homedigo.staff.${role === 'ADMIN' ? 'admin' : 'super-admin'}`, 'synthetic-session');
      }, scenario.role);
      let submissions = 0;
      await context.route('**/api/**', async route => {
        const request = route.request(), path = new URL(request.url()).pathname;
        const session = { user: { id: 'synthetic-user', role: scenario.role, name: 'Test User', email: 'test@example.test' }, expires: new Date(Date.now() + 3600000).toISOString() };
        let body = {}, status = 200;
        if (path === '/api/auth/providers') body = { 'credentials-login': { id: 'credentials-login', name: 'Credentials', type: 'credentials', signinUrl: origin + '/api/auth/signin/credentials-login', callbackUrl: origin + '/api/auth/callback/credentials-login' } };
        else if (path === '/api/auth/csrf') body = { csrfToken: 'synthetic-csrf' };
        else if (path === '/api/auth/_log') body = {};
        else if (request.method() === 'POST' || request.method() === 'PUT') {
          submissions++;
          status = 400; body = { error: 'Please correct the details and try again.' };
          if (path.includes('/callback/')) body = { url: origin + '/patient/login?error=CredentialsSignin' };
        } else if (path === '/api/auth/session') body = scenario.role === 'PATIENT' ? session : null;
        else if (path === '/api/auth/staff') body = session;
        else if (path === '/api/push/config') body = { enabled: false };
        else body = { admins: [], services: [], partners: [], profiles: [], addresses: [], specialities: [{ id: 'test-speciality', name: 'General Medicine', slug: 'general', doctor_count: 0 }] };
        await route.fulfill({ status, contentType: 'application/json', body: JSON.stringify(body) });
      });
      const page = await context.newPage();
      const errors = [];
      page.on('pageerror', error => errors.push(error.message));
      await page.goto(origin + scenario.path);
      if (scenario.open) await page.getByRole('button', { name: scenario.open, exact: true }).click();
      const form = page.locator('form').last();
      await form.waitFor();
      for (const field of await form.locator('input[required]').all()) {
        if (!await field.isVisible() || await field.inputValue()) continue;
        const type = await field.getAttribute('type');
        const hint = ((await field.getAttribute('placeholder')) || '') + ((await field.getAttribute('id')) || '');
        const value = type === 'email' ? 'test@example.test' : type === 'password' ? 'Test-password-123!' : type === 'number' ? '50' : type === 'tel' ? '9876543210' : /pin|postal/i.test(hint) ? '560001' : 'Test details';
        await field.fill(value);
      }
      const values = await form.locator('input').evaluateAll(inputs => inputs.map(input => input.value));
      await form.locator('button[type="submit"]').click();
      const toast = page.locator('[data-feedback-toast]');
      await toast.waitFor();
      assert.equal(await toast.getAttribute('role'), 'alert');
      assert.ok(await form.isVisible());
      assert.deepEqual(await form.locator('input').evaluateAll(inputs => inputs.map(input => input.value)), values);
      assert.ok(await toast.evaluate(element => {
        const box = element.getBoundingClientRect();
        return element.parentElement === document.body && box.left >= 0 && box.right <= innerWidth && box.top >= 0
          && element.contains(document.elementFromPoint(box.left + 15, box.top + 15));
      }), 'Toast must be visible above the form and inside the viewport');
      await toast.getByRole('button', { name: 'Dismiss notification' }).click();
      assert.equal(await toast.count(), 0);
      await form.locator('button[type="submit"]').click();
      await toast.waitFor();
      assert.equal(submissions, 2);
      assert.deepEqual(errors, []);
      console.log(`PASS ${width}px ${scenario.path}${scenario.open ? ' / ' + scenario.open : ''}`);
    } finally { await context.close(); }
  }
} finally { await browser.close(); }
