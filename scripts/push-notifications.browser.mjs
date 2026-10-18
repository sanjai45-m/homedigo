// Real UI and Firebase SDK; synthetic browser subscriptions and intercepted APIs.
// No account, receipt, Firebase delivery or production database is used.
import { chromium } from 'playwright';
import assert from 'node:assert/strict';
const origin = process.env.TEST_ORIGIN || 'http://127.0.0.1:3100';

(async () => {
  const browser = await chromium.launch({ headless: true,
    executablePath: process.env.BROWSER_EXECUTABLE || undefined });
  try {
    const context = await browser.newContext();
    const requests = [], errors = [];
    await context.addInitScript(() => {
      window.__permission = 'default'; window.__permissionPrompts = 0; window.__unsubscribed = 0;
      Object.defineProperty(Notification, 'permission', { get: () => window.__permission });
      Notification.requestPermission = async () => {
        window.__permissionPrompts++;
        if (window.__permission !== 'denied') window.__permission = 'granted';
        return window.__permission;
      };
      const registrations = new Map();
      navigator.serviceWorker.register = async (_script, options) => {
        if (registrations.has(options.scope)) return registrations.get(options.scope);
        let subscription = null;
        const registration = Object.create(ServiceWorkerRegistration.prototype);
        Object.defineProperties(registration, {
          scope: { value: location.origin + options.scope }, active: { value: { state: 'activated' } },
          pushManager: { value: {
            getSubscription: async () => subscription,
            subscribe: async () => subscription = { endpoint: 'https://push.test' + options.scope,
              getKey: () => new Uint8Array([1, 2, 3, 4]).buffer,
              unsubscribe: async () => { window.__unsubscribed++; subscription = null; return true; },
            },
          } },
        });
        registrations.set(options.scope, registration);
        return registration;
      };
      navigator.serviceWorker.getRegistration = async scope => registrations.get(scope);
      sessionStorage.setItem('homedigo.staff.partner', 'synthetic-partner-session');
    });
    await context.route('**/api/**', async route => {
      const request = route.request(), path = new URL(request.url()).pathname;
      requests.push({ path, method: request.method(), authorization: request.headers().authorization,
        body: request.method() === 'POST' || request.method() === 'DELETE' ? request.postData() : null });
      let body = {};
      if (path === '/api/push/config') body = { enabled: true, firebase: {
        apiKey: 'synthetic-api-key', projectId: 'test-project', appId: 'test-app', messagingSenderId: '123456789',
      }, vapidKey: 'BBmRBZVxgkd21cWG1iKWNLWOxS-RTl-yBY0TsL8hPlqIWYctf9AecAvLX3CPp-mQZudS_3CleOSzfPGALSet3Vc' };
      else if (path === '/api/auth/session') body = { user: { id: 'patient', role: 'PATIENT', name: 'Test Patient', email: 'patient@example.test' }, expires: new Date(Date.now() + 3600000).toISOString() };
      else if (path === '/api/auth/staff') body = { user: { id: 'doctor', role: 'PARTNER', name: 'Test Doctor' }, expires: new Date(Date.now() + 3600000).toISOString() };
      else if (path === '/api/auth/csrf') body = { csrfToken: 'synthetic-csrf' };
      else if (path === '/api/auth/signout') body = { url: origin };
      else if (path === '/api/push/subscriptions') body = { enabled: request.method() !== 'DELETE' };
      else if (path === '/api/pro/availability') body = { availability: 'AVAILABLE' };
      else if (path === '/api/pro/dashboard') body = { partner: { name: 'Test Doctor' }, visits: [], stats: {} };
      else body = { services: [], profiles: [], addresses: [], doctors: [], bookings: [] };
      await route.fulfill({ contentType: 'application/json', body: JSON.stringify(body) });
    });
    await context.route('https://firebaseinstallations.googleapis.com/**', async route => {
      const request = route.request();
      if (request.method() === 'DELETE') return route.fulfill({ status: 200, body: '{}' });
      const fid = request.postDataJSON()?.fid || new URL(request.url()).pathname.split('/').at(-2);
      await route.fulfill({ contentType: 'application/json', body: JSON.stringify({ fid, refreshToken: 'synthetic-refresh',
        authToken: { token: 'synthetic:' + fid, expiresIn: '604800s' } }) });
    });
    await context.route('https://fcmregistrations.googleapis.com/**', async route => {
      const auth = route.request().headers()['x-goog-firebase-installations-auth'];
      const fid = auth.split('synthetic:')[1];
      await route.fulfill({ contentType: 'application/json', body: JSON.stringify({ name: `projects/test-project/registrations/${fid}` }) });
    });
    const page = await context.newPage();
    page.setDefaultTimeout(45000);
    page.on('pageerror', error => errors.push(error.message));
    await page.goto(origin + '/patient/book');
    await page.getByRole('button', { name: 'Enable notifications', exact: true }).waitFor();
    assert.equal(await page.evaluate(() => window.__permissionPrompts), 0);
    await page.evaluate(() => { window.__permission = 'denied'; });
    await page.getByRole('button', { name: 'Enable notifications', exact: true }).click();
    await page.getByText('Notifications are blocked.', { exact: false }).waitFor();
    assert.equal(requests.filter(r => r.path === '/api/push/subscriptions').length, 0);
    await page.evaluate(() => { window.__permission = 'default'; });
    await page.getByRole('button', { name: 'Enable notifications', exact: true }).click();
    await page.getByRole('button', { name: 'Disable notifications', exact: true }).waitFor();
    const patientRegistration = requests.find(r => r.path === '/api/push/subscriptions' && r.method === 'POST');
    assert.equal(patientRegistration.authorization, undefined);
    assert.equal(JSON.parse(patientRegistration.body).replace, true);
    await page.getByRole('button', { name: 'Disable notifications', exact: true }).click();
    await page.getByRole('button', { name: 'Enable notifications', exact: true }).waitFor();
    assert.equal(await page.evaluate(() => window.__unsubscribed), 1);
    await page.getByRole('button', { name: 'Enable notifications', exact: true }).click();
    await page.getByRole('button', { name: 'Disable notifications', exact: true }).waitFor();
    const partner = await context.newPage();
    partner.setDefaultTimeout(45000);
    partner.on('pageerror', error => errors.push(error.message));
    await partner.goto(origin + '/partner/dashboard');
    await partner.getByRole('button', { name: 'Enable notifications', exact: true }).click();
    await partner.getByRole('button', { name: 'Disable notifications', exact: true }).waitFor();
    const staffRegistration = requests.find(r => r.path === '/api/push/subscriptions' && r.authorization);
    assert.equal(staffRegistration.authorization, 'Bearer synthetic-partner-session');
    assert.notEqual(JSON.parse(staffRegistration.body).fid, JSON.parse(patientRegistration.body).fid);
    await partner.getByTitle('Sign Out', { exact: true }).click();
    await partner.waitForURL('**/partner/login');
    assert.ok(requests.some(r => r.path === '/api/push/subscriptions' && r.method === 'DELETE' && r.authorization));
    assert.equal(await page.evaluate(() => JSON.parse(localStorage.getItem('homedigo.push.patient')).userId), 'patient');
    assert.equal(await partner.evaluate(() => localStorage.getItem('homedigo.push.partner')), null);
    assert.deepEqual(errors, []);
    console.log('PASS: explicit permission, blocked permission, enable/disable/re-enable, distinct patient/doctor installations and staff logout cleanup.');
    await context.close();
  } finally { await browser.close(); }
})().catch(error => { console.error(error); process.exitCode = 1; });
