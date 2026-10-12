// Local production app on port 3100; synthetic sessions and mocked APIs only.
// Set PLAYWRIGHT_MODULE / BROWSER_EXECUTABLE for external Playwright / browser installs.
const { chromium } = require(process.env.PLAYWRIGHT_MODULE || 'playwright');
const assert = require('node:assert/strict');

(async () => {
  const browser = await chromium.launch({ headless: true, executablePath: process.env.BROWSER_EXECUTABLE || undefined });
  try {
    for (const role of ['ADMIN', 'SUPER_ADMIN', 'PARTNER', 'PATIENT', null]) {
      const context = await browser.newContext();
      const page = await context.newPage();
      page.setDefaultTimeout(15000);
      const privateRequests = [], errors = [];
      page.on('pageerror', error => errors.push(error.message));
      await page.route('**/api/**', async route => {
        const path = new URL(route.request().url()).pathname;
        if (path.startsWith('/api/patient/') && path !== '/api/patient/payment') privateRequests.push(path);
        let body = {};
        if (path === '/api/auth/session') body = role ? { user: { id: 'synthetic-user', role, name: 'Role Test', email: 'role@example.invalid' }, expires: '2099-01-01T00:00:00Z' } : {};
        else if (path === '/api/services') body = { services: [{ id: 'srv_doc', title: 'Doctor Consultation', base_price: 300 }] };
        else if (path === '/api/doctors') body = { doctors: [{ id: 'doctor-test', name: 'Test Doctor', consultation_fee: 300 }] };
        else if (path === '/api/patient/bookings') body = { bookings: [] };
        else if (path === '/api/patient/profiles') body = { profiles: [] };
        else if (path === '/api/patient/addresses') body = { addresses: [] };
        await route.fulfill({ contentType: 'application/json', body: JSON.stringify(body) });
      });
      if (role && role !== 'PATIENT') {
        for (const destination of ['/patient/appointments', '/patient/book?doctor=doctor-test&service=srv_doc']) {
          await page.goto('http://localhost:3100' + destination);
          await page.waitForURL('**/patient/login?**');
          await page.getByText('You are signed in with a staff account.', { exact: false }).waitFor();
          assert.equal(new URL(page.url()).searchParams.get('redirect'), destination);
          assert.equal(await page.locator('input[type="email"]').isVisible(), true);
          assert.equal(await page.getByRole('button', { name: 'Sign out of staff account' }).isVisible(), true);
        }
        assert.deepEqual(privateRequests, []);
        console.log(`PASS: ${role} stays on patient sign-in, preserves the booking link, and does not request patient records`);
      } else if (role === 'PATIENT') {
        await page.goto('http://localhost:3100/patient/login?redirect=%2Fpatient%2Fappointments');
        await page.waitForURL('**/patient/appointments');
        await page.getByRole('heading', { name: 'My Appointments' }).waitFor();
        console.log('PASS: a patient session enters its appointments page');
      } else {
        await page.goto('http://localhost:3100/patient/appointments');
        await page.waitForURL('**/patient/login?**');
        await page.locator('input[type="email"]').waitFor();
        assert.deepEqual(privateRequests, []);
        await page.goto('http://localhost:3100/patient/book');
        await page.getByRole('button', { name: 'Continue', exact: true }).waitFor();
        assert.equal(new URL(page.url()).pathname, '/patient/book');
        assert.deepEqual(privateRequests, []);
        console.log('PASS: guests can browse booking but must sign in for private patient pages');
      }
      assert.deepEqual(errors, []);
      await context.close();
    }
  } finally { await browser.close(); }
})().catch(error => { console.error(error); process.exitCode = 1; });
