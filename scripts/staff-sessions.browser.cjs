// One browser context (shared cookie jar), multiple tabs. All APIs use synthetic data.
const { chromium } = require(process.env.PLAYWRIGHT_MODULE || 'playwright');
const assert = require('node:assert/strict');
const origin = process.env.TEST_ORIGIN || 'http://127.0.0.1:3100';

(async () => {
  const browser = await chromium.launch({ headless: true, executablePath: process.env.BROWSER_EXECUTABLE || undefined });
  try {
    const context = await browser.newContext();
    const sessions = new Map();
    const requests = [];
    const errors = [];
    // Existing patient cookie must remain independent of all staff sign-ins.
    await context.addCookies([{ name: 'next-auth.session-token', value: 'synthetic-patient-cookie', url: origin }]);
    await context.route('**/api/**', async route => {
      const request = route.request();
      const path = new URL(request.url()).pathname;
      const token = request.headers().authorization?.replace(/^Bearer /, '');
      const session = sessions.get(token);
      let status = 200;
      let body = {};
      if (path === '/api/auth/staff') {
        if (request.method() === 'POST') {
          const { email, expectedRole } = request.postDataJSON();
          const token = `synthetic-${email}`;
          const session = { user: { id: email, email, name: email, role: expectedRole }, expires: new Date(Date.now() + 3600000).toISOString() };
          sessions.set(token, session);
          body = { token, session };
        } else { body = session || { error: 'Please sign in.' }; status = session ? 200 : 401; }
      } else if (path === '/api/auth/session') {
        body = { user: { id: 'patient', email: 'patient@example.test', role: 'PATIENT' }, expires: '2099-01-01T00:00:00Z' };
      } else {
        requests.push({ path, token, cookie: request.headers().cookie });
        if (!session) { status = 401; body = { error: 'No tab session' }; }
        else if (path === '/api/bookings/receipt-test/receipt') {
          assert.equal(token, 'synthetic-partner@example.test');
          return route.fulfill({ contentType: 'image/png', body: Buffer.from('iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAQAAAC1HAwCAAAAC0lEQVR42mP8/x8AAwMCAO+aL1sAAAAASUVORK5CYII=', 'base64') });
        }
        else if (path === '/api/pro/visits/receipt-test') body = { visit: {
          id: 'receipt-test', patient_name: 'Synthetic Patient', status: 'ASSIGNED', payment_status: 'UNDER_REVIEW',
          has_receipt: true, total_amount: 100, booking_number: 'TEST', service_title: 'Test appointment',
        } };
        else if (path === '/api/pro/dashboard') body = { visits: [], partner: { name: session.user.name }, stats: {} };
        else if (path === '/api/pro/availability') body = { availability: 'AVAILABLE' };
        else if (path === '/api/super-admin/billing') body = { summary: { grossRevenue: 0, platformCommission: 0, netClinicianPayouts: 0, gstTaxCollected: 0 }, payouts: [] };
        else if (path === '/api/admin/dispatch') body = { bookings: [] };
        else if (path === '/api/super-admin/admins') body = { admins: [] };
      }
      await route.fulfill({ status, contentType: 'application/json', body: JSON.stringify(body) });
    });
    async function page() {
      const result = await context.newPage();
      result.setDefaultTimeout(60000);
      result.on('pageerror', error => errors.push(error.message));
      return result;
    }
    async function login(page, portal, email) {
      await page.goto(`${origin}/${portal}/login`);
      await page.locator('input[type="email"]').fill(email);
      await page.locator('input[type="password"]').fill('Synthetic-password-123');
      await page.locator('button[type="submit"]').click();
      await page.waitForURL(`**/${portal}/dashboard`);
      await page.locator('aside').waitFor();
      await page.waitForFunction(email => document.querySelector('aside')?.textContent.includes(email), email);
      console.log(`Signed in ${portal} tab for ${email}`);
    }
    const admin = await page(), root = await page(), partner = await page(), otherAdmin = await page();
    await login(admin, 'admin', 'admin-a@example.test');
    await login(root, 'super-admin', 'root@example.test');
    await login(partner, 'partner', 'partner@example.test');
    await login(otherAdmin, 'admin', 'admin-b@example.test');
    for (const [tab, email] of [[admin, 'admin-a@example.test'], [root, 'root@example.test'], [partner, 'partner@example.test'], [otherAdmin, 'admin-b@example.test']]) {
      await tab.reload();
      await tab.waitForFunction(email => document.querySelector('aside')?.textContent.includes(email), email);
    }
    console.log('PASS: four tabs retain their own identities after login and reload');

    await admin.getByTitle('Sign Out Admin', { exact: true }).click();
    await admin.waitForURL('**/admin/login');
    assert.equal(await admin.evaluate(() => sessionStorage.getItem('homedigo.staff.admin')), null);
    for (const [tab, portal] of [[root, 'super-admin'], [partner, 'partner'], [otherAdmin, 'admin']]) {
      assert.ok(await tab.evaluate(portal => sessionStorage.getItem(`homedigo.staff.${portal}`), portal));
      await tab.reload();
      await tab.locator('aside').waitFor();
    }
    console.log('PASS: signing out one admin tab leaves all other tabs signed in');

    const fresh = await page();
    await fresh.goto(`${origin}/admin/dashboard`);
    await fresh.waitForURL('**/admin/login?**');
    await otherAdmin.goto(`${origin}/super-admin/dashboard`);
    await otherAdmin.waitForURL('**/super-admin/login?**');
    await otherAdmin.goto(`${origin}/admin/dashboard`);
    await otherAdmin.waitForFunction(() => document.querySelector('aside')?.textContent.includes('admin-b@example.test'));
    console.log('PASS: new tabs and other portals require their own sign-in');

    await partner.goto(`${origin}/partner/visit/receipt-test`);
    await partner.waitForFunction(() => {
      const image = document.querySelector('img[alt="Patient payment receipt"]');
      return image?.complete && image.naturalWidth > 0;
    });
    assert.match(await partner.getByRole('link', { name: 'Open full payment receipt' }).getAttribute('href'), /^blob:/);
    assert.equal(await partner.getByRole('checkbox').isEnabled(), true);
    console.log('PASS: private payment receipt loads with the partner tab credential');

    assert.ok(requests.some(r => r.path === '/api/admin/stats' && r.token === 'synthetic-admin-a@example.test'));
    assert.ok(requests.some(r => r.path === '/api/admin/stats' && r.token === 'synthetic-admin-b@example.test'));
    assert.ok(requests.some(r => r.path === '/api/super-admin/stats' && r.token === 'synthetic-root@example.test'));
    assert.ok(requests.some(r => r.path === '/api/pro/dashboard' && r.token === 'synthetic-partner@example.test'));
    assert.ok(requests.every(r => !r.cookie), 'Staff APIs must not use patient cookies');
    assert.equal((await context.cookies()).find(c => c.name === 'next-auth.session-token').value, 'synthetic-patient-cookie');
    assert.deepEqual(errors, []);
    console.log('PASS: API identities are isolated, patient cookie is preserved, no browser exceptions');
  } finally { await browser.close(); }
})().catch(error => { console.error(error); process.exitCode = 1; });
