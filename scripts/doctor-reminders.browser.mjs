import { chromium } from 'playwright';
import assert from 'node:assert/strict';
import { mkdirSync } from 'node:fs';

// Synthetic identities/settings only; no real scheduler, notifications or appointments.
const origin = process.env.TEST_ORIGIN || 'http://localhost:3100';
const browser = await chromium.launch({ headless: true, executablePath: process.env.BROWSER_EXECUTABLE || undefined });
mkdirSync('coverage/reminders', { recursive: true });
try {
  for (const width of [360, 1440]) {
    const context = await browser.newContext({ viewport: { width, height: 900 } });
    await context.addInitScript(() => sessionStorage.setItem('homedigo.staff.partner', 'synthetic-session'));
    let minutes = [60, 30, 15], saves = 0, fail = false;
    await context.route('**/api/**', async route => {
      const path = new URL(route.request().url()).pathname;
      let body = {}, status = 200;
      if (path === '/api/auth/staff') body = { user: { id: 'doctor', role: 'PARTNER', name: 'Test Doctor' }, expires: new Date(Date.now() + 3600000).toISOString() };
      else if (path === '/api/pro/reminders') {
        if (route.request().method() === 'PUT') {
          assert.equal(route.request().headers().authorization, 'Bearer synthetic-session');
          if (fail) { status = 503; body = { error: 'Settings could not be saved. Please retry.' }; }
          else { saves++; minutes = route.request().postDataJSON().minutes; }
        }
        if (status === 200) body = { minutes, success: true };
      } else if (path === '/api/pro/dashboard') body = { partner: { name: 'Test Doctor' } };
      else if (path === '/api/pro/availability') body = { availability: 'AVAILABLE' };
      else if (path === '/api/push/config') body = { enabled: false };
      await route.fulfill({ status, contentType: 'application/json', body: JSON.stringify(body) });
    });
    const page = await context.newPage(), errors = [];
    page.on('pageerror', error => errors.push(error.message));
    await page.goto(origin + '/partner/reminders');
    const preview = page.getByLabel('Reminder preview');
    await preview.waitFor();
    assert.equal(await preview.textContent(), '9:00 AM · 9:30 AM · 9:45 AM');
    await page.getByLabel('Reminder 1 minutes before visit').fill('75');
    await page.getByRole('button', { name: 'Save reminders', exact: true }).click();
    await page.getByText('Reminders saved for your upcoming confirmed visits.', { exact: true }).waitFor();
    assert.deepEqual(minutes, [75, 30, 15]);
    await page.reload();
    await preview.waitFor();
    assert.equal(await page.getByLabel('Reminder 1 minutes before visit').inputValue(), '75');
    assert.equal(await preview.textContent(), '8:45 AM · 9:30 AM · 9:45 AM');
    await page.getByLabel('Reminder 1 minutes before visit').fill('15');
    await page.getByRole('button', { name: 'Save reminders', exact: true }).click();
    await page.getByText('Choose a different time for each reminder.', { exact: true }).waitFor();
    assert.equal(saves, 1);
    await page.getByLabel('Reminder 1 minutes before visit').fill('20');
    fail = true;
    await page.getByRole('button', { name: 'Save reminders', exact: true }).click();
    await page.getByText('Settings could not be saved. Please retry.', { exact: true }).waitFor();
    assert.equal(await page.getByLabel('Reminder 1 minutes before visit').inputValue(), '20');
    assert.equal(saves, 1);
    fail = false;
    while (await page.getByRole('button', { name: /^Remove reminder/ }).count()) await page.getByRole('button', { name: /^Remove reminder/ }).first().click();
    await page.getByRole('button', { name: 'Save reminders', exact: true }).click();
    await page.getByText('Visit push reminders turned off.', { exact: true }).waitFor();
    assert.deepEqual(minutes, []);
    await page.getByRole('button', { name: 'Restore defaults' }).click();
    await page.getByRole('button', { name: 'Save reminders', exact: true }).click();
    await page.getByText('Reminders saved for your upcoming confirmed visits.', { exact: true }).waitFor();
    assert.deepEqual(minutes, [60, 30, 15]);
    await page.getByRole('button', { name: 'Dismiss notification' }).click();
    assert.ok(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth + 1));
    await page.screenshot({ path: `coverage/reminders/settings-${width}.png`, fullPage: true });
    assert.deepEqual(errors, []);
    console.log(`PASS ${width}px reminder defaults, preview, save/reload, validation, failed save, disable and restore`);
    await context.close();
  }
} finally { await browser.close(); }
