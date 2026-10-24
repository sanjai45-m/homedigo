import { chromium } from 'playwright';
import assert from 'node:assert/strict';
import { mkdirSync, readFileSync } from 'node:fs';

// Synthetic patient, recipient and receipt only. Never submit or launch a payment.
const origin = process.env.TEST_ORIGIN || 'http://localhost:3100';
const browser = await chromium.launch({ headless: true, executablePath: process.env.BROWSER_EXECUTABLE || undefined });
mkdirSync('coverage/payment-ui', { recursive: true });
const date = new Date(Date.now() + 86400000 + 330 * 60000).toISOString().slice(0, 10);
const receipt = Buffer.from('iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAQAAAC1HAwCAAAAC0lEQVR42mP8/x8AAwMCAO+aL1sAAAAASUVORK5CYII=', 'base64');
try {
  for (const width of [320, 390, 768, 1280]) {
    const context = await browser.newContext({ viewport: { width, height: 900 }, permissions: ['clipboard-read', 'clipboard-write'] });
    await context.addInitScript(({ date }) => sessionStorage.setItem('homedigo-payment-draft-patient', JSON.stringify({
      savedAt: Date.now(), selectedServiceId: 'srv_doc', selectedProfileId: 'profile', selectedAddressId: 'address',
      selectedPartnerId: 'doctor', scheduledDate: date, scheduledSlot: '10:00 AM - 11:00 AM',
      clinicalNotes: '', requestKey: 'payment-ui-test',
    })), { date });
    let failConfig = false, upiId = 'test-clinic@upi';
    await context.route('**/api/**', async route => {
      const path = new URL(route.request().url()).pathname;
      let body = {}, status = 200;
      if (path === '/api/auth/session') body = { user: { id: 'patient', role: 'PATIENT', name: 'Test Patient', email: 'patient@example.invalid' }, expires: '2099-01-01T00:00:00Z' };
      else if (path === '/api/services') body = { services: [{ id: 'srv_doc', title: 'Doctor home visit', base_price: 450, visiting_fee: 100 }] };
      else if (path === '/api/doctors') body = { doctors: [{ id: 'doctor', name: 'Test Doctor', consultation_fee: 450, availability: 'AVAILABLE', specialization: 'General medicine' }] };
      else if (path.endsWith('/slots')) body = { configured: true, availability: 'AVAILABLE', serverNow: new Date().toISOString(), slots: [{ label: '10:00 AM - 11:00 AM', start: `${date}T04:30:00Z`, end: `${date}T05:30:00Z`, available: true }] };
      else if (path === '/api/patient/profiles') body = { profiles: [{ id: 'profile', user_id: 'patient', full_name: 'Test Patient' }] };
      else if (path === '/api/patient/addresses') body = { addresses: [{ id: 'address', user_id: 'patient', address_line1: 'Example street', city: 'Chennai', pincode: '600001' }] };
      else if (path === '/api/patient/payment') { status = failConfig ? 503 : 200; body = failConfig ? { error: 'Unavailable' } : { phone: '9000000000', upiId, payeeName: 'Test Clinic' }; }
      else if (path === '/api/patient/bookings' && route.request().method() === 'POST') throw new Error('Do not submit a real booking');
      await route.fulfill({ status, contentType: 'application/json', body: JSON.stringify(body) });
    });
    const page = await context.newPage(), errors = [];
    page.on('pageerror', error => errors.push(error.message));
    await page.goto(origin + '/patient/book');
    const payment = page.getByRole('region', { name: 'Make your payment', exact: true });
    const showQr = payment.getByRole('button', { name: 'Show payment QR', exact: true });
    await showQr.waitFor();
    await page.waitForFunction(() => ![...document.querySelectorAll('button')].find(button => button.textContent.includes('Show payment QR'))?.disabled);
    assert.match(await payment.textContent(), /550\.00/);
    await payment.getByRole('button', { name: 'Copy UPI ID', exact: true }).click();
    assert.equal(await page.evaluate(() => navigator.clipboard.readText()), 'test-clinic@upi');
    await payment.getByRole('button', { name: 'Copy number for manual payment', exact: true }).click();
    assert.equal(await page.evaluate(() => navigator.clipboard.readText()), '9000000000');
    // Hide unrelated fixed navigation only while capturing the full component.
    const screenshotStyle = '.sticky, .fixed { visibility: hidden !important; }';
    await payment.locator('..').screenshot({ path: `coverage/payment-ui/payment-${width}.png`, style: screenshotStyle });
    await showQr.click();
    await payment.getByRole('img', { name: 'Payment QR for Test Clinic, ₹550.00', exact: true }).waitFor();
    const downloadEvent = page.waitForEvent('download');
    await payment.getByRole('button', { name: 'Download QR', exact: true }).click();
    const download = await downloadEvent;
    assert.equal(download.suggestedFilename(), 'homedigo-payment-550.00.png');
    assert.deepEqual([...readFileSync(await download.path()).subarray(0, 8)], [137, 80, 78, 71, 13, 10, 26, 10]);
    assert.equal(await page.getByRole('button', { name: 'Submit Receipt & Request Appointment', exact: true }).isDisabled(), true);
    const input = page.getByLabel('Upload payment receipt', { exact: true });
    await input.setInputFiles({ name: 'bad.txt', mimeType: 'text/plain', buffer: Buffer.from('invalid') });
    await page.getByRole('alert').filter({ hasText: 'Choose a PNG, JPEG or WebP screenshot' }).waitFor();
    await input.setInputFiles({ name: 'receipt.png', mimeType: 'image/png', buffer: receipt });
    await page.getByAltText('Selected payment receipt').waitFor();
    assert.equal(await page.getByRole('button', { name: 'Submit Receipt & Request Appointment', exact: true }).isEnabled(), true);
    await payment.locator('..').screenshot({ path: `coverage/payment-ui/qr-receipt-${width}.png`, style: screenshotStyle });
    await page.getByRole('button', { name: 'Remove payment receipt', exact: true }).click();
    assert.equal(await page.getByAltText('Selected payment receipt').count(), 0);
    assert.equal(await page.getByRole('button', { name: 'Submit Receipt & Request Appointment', exact: true }).isDisabled(), true);
    assert.ok(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth + 1), `Page overflows at ${width}px`);
    failConfig = true;
    await page.reload();
    await payment.getByRole('button', { name: 'Retry loading payment details' }).waitFor();
    assert.equal(await payment.getByRole('button', { name: 'Show payment QR' }).count(), 0);
    failConfig = false;
    await payment.getByRole('button', { name: 'Retry loading payment details' }).click();
    await showQr.waitFor();
    upiId = '';
    await page.reload();
    await payment.getByRole('heading', { name: 'Pay manually', exact: true }).waitFor();
    assert.equal(await payment.getByRole('button', { name: 'Show payment QR' }).count(), 0);
    assert.equal(await payment.getByRole('button', { name: 'Open Google Pay' }).count(), 0);
    await payment.getByRole('button', { name: 'Copy number for manual payment' }).waitFor();
    assert.deepEqual(errors, []);
    console.log(`PASS ${width}px: responsive payment, copy controls, QR PNG download, receipt validation/removal, retry and manual fallback`);
    await context.close();
  }
} finally { await browser.close(); }
