import { chromium } from 'playwright';
import assert from 'node:assert/strict';
import { mkdirSync } from 'node:fs';

// All identities, bookings and API responses are synthetic; no live cancellations.
const origin = process.env.TEST_ORIGIN || 'http://localhost:3100';
const browser = await chromium.launch({ headless: true, executablePath: process.env.BROWSER_EXECUTABLE || undefined });
mkdirSync('coverage/cancellation', { recursive: true });
try {
  for (const role of ['PATIENT', 'PARTNER']) for (const width of [390, 1440]) {
    const context = await browser.newContext({ viewport: { width, height: 900 } });
    await context.addInitScript(() => sessionStorage.setItem('homedigo.staff.partner', 'synthetic-session'));
    let booking = { id: 'test-visit', booking_number: 'TEST', patient_name: 'Test Patient', partner_name: 'Test Doctor',
      service_title: 'Home visit', status: 'PENDING', payment_status: 'UNDER_REVIEW', total_amount: 100,
      scheduled_date: 'Tomorrow', scheduled_time_slot: '10:00 AM - 11:00 AM', address_text: 'Test address' };
    let submissions = [], fail = true;
    await context.route('**/api/**', async route => {
      const path = new URL(route.request().url()).pathname;
      let body = {}, status = 200;
      if (path === '/api/auth/session' || path === '/api/auth/staff') body = { user: { id: role === 'PATIENT' ? 'patient' : 'doctor', role, name: 'Test User' }, expires: new Date(Date.now() + 3600000).toISOString() };
      else if (path.endsWith('/location')) body = { status: booking.status, cancellationReason: booking.cancellation_reason, isLive: false };
      else if (path === '/api/patient/bookings/test-visit' || path === '/api/pro/visits/test-visit') {
        if (route.request().method() !== 'GET') {
          const payload = route.request().postDataJSON(); submissions.push(payload);
          if (role === 'PARTNER') assert.equal(route.request().headers().authorization, 'Bearer synthetic-session');
          if (fail) { status = 503; body = { error: 'Cancellation could not be saved. Please retry.' }; }
          else booking = { ...booking, status: 'CANCELLED', cancellation_reason: payload.cancellationReason || null };
        }
        if (status === 200) body = { success: true, booking, visit: booking };
      } else if (path === '/api/pro/dashboard') body = { partner: { name: 'Test Doctor' } };
      else if (path === '/api/pro/availability') body = { availability: 'AVAILABLE' };
      else if (path === '/api/push/config') body = { enabled: false };
      await route.fulfill({ status, contentType: 'application/json', body: JSON.stringify(body) });
    });
    const page = await context.newPage(), errors = [];
    page.on('pageerror', error => errors.push(error.message));
    const path = role === 'PATIENT' ? '/patient/appointments/test-visit' : '/partner/visit/test-visit';
    await page.goto(origin + path);
    const action = page.getByRole('button', { name: role === 'PATIENT' ? 'Cancel appointment' : 'Decline appointment', exact: true });
    await action.click();
    const field = page.getByLabel('Reason for cancellation');
    await field.waitFor();
    assert.equal(submissions.length, 0);
    await field.fill('Change of plans');
    await page.getByRole('button', { name: 'Keep appointment', exact: true }).click();
    assert.equal(submissions.length, 0);
    await action.click();
    assert.equal(await field.inputValue(), 'Change of plans');
    await page.getByRole('button', { name: 'Confirm cancellation', exact: true }).click();
    await page.getByText('Cancellation could not be saved. Please retry.', { exact: true }).waitFor();
    assert.equal(await field.inputValue(), 'Change of plans');
    assert.equal(await page.locator('body > [data-feedback-toast]').count(), 1);
    await page.getByRole('button', { name: 'Dismiss notification' }).click();
    const rect = await field.boundingBox();
    assert.ok(rect.x >= 0 && rect.x + rect.width <= width + 1, 'Reason field must fit the viewport');
    await field.screenshot({ path: `coverage/cancellation/reason-${role}-${width}.png` });
    fail = false;
    if (width === 1440) await field.fill(''); // Empty reason remains optional.
    await page.getByRole('button', { name: 'Confirm cancellation', exact: true }).click();
    await page.getByText(width === 1440 ? 'No reason was provided.' : 'Reason: Change of plans', { exact: true }).waitFor();
    assert.equal(await action.count(), 0);
    assert.equal(submissions.length, 2);
    assert.equal(submissions[1].cancellationReason, width === 1440 ? '' : 'Change of plans');
    await page.reload();
    await page.getByText(width === 1440 ? 'No reason was provided.' : 'Reason: Change of plans', { exact: true }).waitFor();
    assert.deepEqual(errors, []);
    console.log(`PASS ${role} ${width}px optional reason, keep appointment, failure toast, retry, saved reason and reload`);
    await context.close();
  }
} finally { await browser.close(); }
