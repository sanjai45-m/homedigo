import { chromium } from 'playwright';
import assert from 'node:assert/strict';
import { mkdirSync } from 'node:fs';

// Synthetic accounts and API responses only. No live appointments or duty changes.
const origin = process.env.TEST_ORIGIN || 'http://localhost:3100';
const browser = await chromium.launch({ headless: true, executablePath: process.env.BROWSER_EXECUTABLE || undefined });
mkdirSync('coverage/partner-mobile', { recursive: true });
try {
  for (const width of [320, 390, 768, 1440]) {
    const context = await browser.newContext({ viewport: { width, height: 850 } });
    await context.addInitScript(() => sessionStorage.setItem('homedigo.staff.partner', 'synthetic-session'));
    let online = true, failDuty = false, signedIn = true, failDashboard = false, emptyDashboard = false;
    const today = new Date(Date.now() + 330 * 60 * 1000).toISOString().slice(0, 10);
    const base = { patient_name: 'Test Patient', service_title: 'Doctor home visit', address_text: 'Apartment 104, Example Street, Bengaluru',
      scheduled_date: today, scheduled_time_slot: '09:00 AM - 10:15 AM', appointment_starts_at: `${today}T03:30:00Z`,
      total_amount: 100, payment_status: 'PAID', doctor_confirmed_at: '2026-10-18T00:00:00Z' };
    const visits = [
      { ...base, id: 'request', booking_number: 'REQ', status: 'PENDING', doctor_confirmed_at: null },
      { ...base, id: 'current', booking_number: 'NOW', status: 'ON_THE_WAY', patient_name: 'Patient With A Longer Name' },
      { ...base, id: 'completed', booking_number: 'DONE', status: 'COMPLETED' },
      { ...base, id: 'cancelled', booking_number: 'CAN', status: 'CANCELLED' },
    ];
    await context.route('**/api/**', async route => {
      const path = new URL(route.request().url()).pathname;
      let body = {}, status = 200;
      const partner = { id: 'doctor', name: 'Dr Sara', specialization: 'Registered ICU / Clinical Care Specialist' };
      if (path === '/api/auth/staff') { body = signedIn ? { user: { ...partner, role: 'PARTNER' }, expires: new Date(Date.now() + 3600000).toISOString() } : { error: 'Sign in' }; status = signedIn ? 200 : 401; }
      else if (path === '/api/pro/dashboard') {
        status = failDashboard ? 503 : 200;
        body = failDashboard ? { error: 'Appointments temporarily unavailable.' } : { partner, visits: emptyDashboard ? [] : visits };
      }
      else if (path === '/api/pro/availability') {
        if (route.request().method() === 'POST') {
          if (failDuty) { status = 503; body = { error: 'Duty could not be saved. Please retry.' }; }
          else online = route.request().postDataJSON().availability === 'AVAILABLE';
        }
        if (status === 200) body = { success: true, availability: online ? 'AVAILABLE' : 'OFFLINE' };
      } else if (path === '/api/pro/schedule') body = { configured: true, schedule: { days: Array.from({ length: 7 }, () => [{ start: '09:00', end: '17:00' }]), slotMinutes: 60, bufferMinutes: 15, daysOff: [] } };
      else if (path === '/api/pro/reminders') body = { minutes: [60, 30, 15] };
      else if (path === '/api/pro/earnings') body = { partnerName: 'Dr Sara', earnings: { todayEarnings: 90, grossVolume: 100, platformFeePaid: 10, settledEarnings: 90, pendingPayout: 0, nextPayoutDate: 'Monday' }, payouts: [] };
      else if (path.startsWith('/api/pro/visits/')) body = { visit: visits.find(v => path.endsWith(v.id)) };
      else if (path === '/api/push/config') body = { enabled: true };
      await route.fulfill({ status, contentType: 'application/json', body: JSON.stringify(body) });
    });
    const page = await context.newPage(), errors = [];
    page.on('pageerror', error => errors.push(error.message));
    const mobile = width < 1024;
    async function fits(label) {
      assert.ok(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth + 1), `${label} overflows at ${width}px`);
      await page.screenshot({ path: `coverage/partner-mobile/${label}-${width}.png`, fullPage: false });
    }
    await page.goto(origin + '/partner/dashboard');
    const heading = page.getByRole('heading', { name: 'Your day, at a glance.', exact: true });
    await heading.waitFor();
    await page.getByRole('article').first().waitFor();
    assert.ok((await heading.boundingBox()).y < 220, 'Main content must appear before secondary settings');
    assert.ok((await page.getByRole('article').first().boundingBox()).y < 460, 'An appointment must be visible without a long scroll');
    assert.match(await page.getByRole('article').first().textContent(), /Patient With A Longer Name/);
    assert.equal(await page.getByRole('button', { name: 'Enable notifications', exact: true }).isVisible(), false);
    const current = page.getByRole('region', { name: 'Current appointments 2', exact: true });
    const recent = page.getByRole('region', { name: 'Recent appointments', exact: true });
    await page.getByRole('img', { name: '1 of 3 visits completed today', exact: true }).waitFor();
    await page.getByRole('button', { name: 'Needs review 1', exact: true }).click();
    assert.equal(await current.getByRole('article').count(), 1);
    assert.equal(await current.getByRole('link', { name: 'Review request for Test Patient', exact: true }).getAttribute('href'), '/partner/visit/request');
    await page.getByRole('button', { name: 'All current 2', exact: true }).click();
    assert.equal(await current.getByRole('article').count(), 2);
    await page.getByRole('searchbox', { name: 'Search current appointments' }).fill('Longer');
    assert.equal(await current.getByRole('article').count(), 1);
    assert.equal(await current.getByRole('link', { name: 'Open visit for Patient With A Longer Name' }).getAttribute('href'), '/partner/visit/current');
    await page.getByRole('searchbox', { name: 'Search current appointments' }).fill('no-match');
    await page.getByRole('heading', { name: 'No matching appointments' }).waitFor();
    await page.getByRole('button', { name: 'Clear search' }).click();
    await recent.getByRole('combobox').selectOption('CANCELLED');
    assert.equal(await recent.getByRole('link').count(), 1);
    assert.equal(await recent.getByRole('link').getAttribute('href'), '/partner/visit/cancelled');
    await recent.getByRole('combobox').selectOption('COMPLETED');
    assert.equal(await recent.getByRole('link').getAttribute('href'), '/partner/visit/completed');
    await recent.getByRole('combobox').selectOption('ALL');
    assert.equal(await recent.getByRole('link').count(), 2);
    await page.evaluate(() => window.scrollTo(0, 0));
    await fits('dashboard');
    await page.screenshot({ path: `coverage/partner-mobile/dashboard-full-${width}.png`, fullPage: true });
    for (let index = 0; index < 6; index++) visits.push({ ...base, id: `history-${index}`, status: 'COMPLETED',
      patient_name: `Older Patient ${index}`, scheduled_date: '2020-01-01', appointment_starts_at: '2020-01-01T03:30:00Z' });
    await page.getByRole('button', { name: 'Refresh visits' }).click();
    await page.getByRole('button', { name: 'Show more appointments', exact: true }).waitFor();
    assert.equal(await recent.getByRole('link').count(), 5);
    assert.equal(await recent.getByRole('link').first().getAttribute('href'), '/partner/visit/completed');
    await page.getByRole('button', { name: 'Show more appointments', exact: true }).click();
    assert.equal(await recent.getByRole('link').count(), 8);
    visits.splice(4);
    failDashboard = true;
    await page.getByRole('button', { name: 'Refresh visits' }).click();
    await page.getByText('Could not refresh. Showing your last loaded appointments.', { exact: true }).waitFor();
    assert.equal(await current.getByRole('article').count(), 2);
    await page.getByRole('button', { name: 'Dismiss notification' }).click();
    assert.equal(await page.getByText('Could not refresh. Showing your last loaded appointments.', { exact: true }).isVisible(), true);
    failDashboard = false;
    emptyDashboard = true;
    await page.getByRole('button', { name: 'Try again', exact: true }).click();
    await page.getByRole('heading', { name: 'You’re all caught up.', exact: true }).waitFor();
    await page.getByRole('img', { name: '0 of 0 visits completed today', exact: true }).waitFor();
    assert.equal(await page.getByRole('article', { name: 'Priority appointment' }).count(), 0);
    await fits('dashboard-empty');
    emptyDashboard = false;
    await page.getByRole('button', { name: 'Refresh visits' }).click();
    await page.getByRole('article', { name: 'Priority appointment' }).waitFor();
    failDuty = true;
    await page.getByRole('button', { name: 'Go Off-Duty', exact: true }).click();
    await page.getByText('Duty could not be saved. Please retry.', { exact: true }).waitFor();
    assert.equal(online, true);
    await page.getByRole('button', { name: 'Dismiss notification' }).click();
    failDuty = false;
    await page.getByRole('button', { name: 'Go Off-Duty', exact: true }).click();
    await page.getByRole('button', { name: 'Start Duty Shift', exact: true }).waitFor();
    assert.equal(online, false);
    if (mobile) {
      const opener = page.getByRole('button', { name: 'Open clinician menu', exact: true }).first();
      await opener.click();
      const menu = page.getByRole('dialog', { name: 'Your workspace' });
      await menu.waitFor();
      for (const label of ['Your visits', 'Appointment hours', 'Visit reminders', 'Earnings', 'Notification settings']) assert.equal(await menu.getByRole('link', { name: label, exact: true }).isVisible(), true);
      for (let i = 0; i < 15; i++) {
        await page.keyboard.press('Tab');
        assert.ok(await page.evaluate(() => document.querySelector('dialog').contains(document.activeElement)), 'Keyboard focus stays in the menu');
      }
      await fits('menu');
      await page.keyboard.press('Escape');
      assert.equal(await menu.isVisible(), false);
      await page.waitForFunction(() => document.body.style.overflow === '');
      assert.equal(await page.evaluate(() => document.body.style.overflow), '');
      await opener.click();
      await menu.getByRole('link', { name: 'Appointment hours', exact: true }).click();
      await page.getByRole('heading', { name: 'Appointment hours', exact: true }).waitFor();
      assert.equal(await menu.isVisible(), false);
      assert.equal(await page.getByRole('navigation', { name: 'Clinician mobile navigation' }).getByRole('link', { name: 'Hours', exact: true }).getAttribute('aria-current'), 'page');
    } else await page.goto(origin + '/partner/schedule');
    await page.getByLabel('Monday start 1 AM or PM', { exact: true }).waitFor();
    await fits('hours');
    for (const [path, heading] of [['/partner/reminders', 'Visit reminders'], ['/partner/earnings', 'Earnings & Payout Ledger'], ['/partner/visit/current', 'Patient visit'], ['/partner/visit/request', 'Appointment request']]) {
      await page.goto(origin + path);
      await page.getByRole('heading', { name: new RegExp(heading) }).first().waitFor();
      await fits(path.split('/').pop());
    }
    if (mobile) {
      await page.getByRole('button', { name: 'Open clinician menu', exact: true }).first().click();
      await page.getByRole('dialog').getByRole('link', { name: 'Notification settings', exact: true }).click();
      await page.getByRole('button', { name: 'Enable notifications', exact: true }).waitFor();
      assert.equal(await page.getByRole('dialog').isVisible(), false);
      await page.getByRole('button', { name: 'Open clinician menu', exact: true }).first().click();
      await page.setViewportSize({ width: 1280, height: 850 });
      await page.waitForFunction(() => !document.querySelector('dialog').open);
      await page.waitForFunction(() => document.body.style.overflow === '');
      assert.equal(await page.evaluate(() => document.body.style.overflow), '');
      await page.setViewportSize({ width, height: 850 });
    }
    signedIn = false;
    await context.clearCookies();
    await page.evaluate(() => sessionStorage.clear());
    await page.goto(origin + '/partner/login');
    const email = page.getByLabel('Registered Email Address', { exact: true });
    await email.waitFor();
    if (mobile) assert.ok((await email.boundingBox()).y < 600, 'Sign-in fields must not be below the marketing content');
    await fits('login');
    assert.deepEqual(errors, []);
    console.log(`PASS ${width}px content priority, queue filters, duty failure/success, menu keyboard/navigation/resize, all partner pages and sign-in`);
    await context.close();
  }
} finally { await browser.close(); }
