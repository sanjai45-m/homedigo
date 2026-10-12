// Run against a local production build on port 3100. All API requests are mocked;
// no real patient, payment, booking, or email is created.
// Set PLAYWRIGHT_MODULE and BROWSER_EXECUTABLE when using an external browser install.
const { chromium } = require(process.env.PLAYWRIGHT_MODULE || 'playwright');
const assert = require('node:assert/strict');
const fs = require('node:fs');

(async () => {
  const browser = await chromium.launch({ headless: true, executablePath: process.env.BROWSER_EXECUTABLE || undefined });
  try {
    const context = await browser.newContext({ viewport: { width: 1280, height: 1000 } });
    const page = await context.newPage();
    page.setDefaultTimeout(15000);
    const errors = [];
    page.on('pageerror', error => errors.push(error.message));
    let profiles = [], addresses = [], saveFails = true;
    await page.route('**/api/**', async route => {
      const path = new URL(route.request().url()).pathname;
      const post = route.request().method() === 'POST';
      let status = 200, body = {};
      if (path === '/api/auth/session') body = { user: { id: 'patient', role: 'PATIENT', name: 'Checkout Test', email: 'checkout@example.invalid' }, expires: '2099-01-01T00:00:00Z' };
      else if (path === '/api/services') body = { services: [{ id: 'srv_doc', title: 'Doctor Consultation', base_price: 300, visiting_fee: 80 }] };
      else if (path === '/api/doctors') body = { doctors: [{ id: 'doctor', name: 'Test Doctor', consultation_fee: 300, specialization: 'General medicine' }] };
      else if (path === '/api/patient/payment') body = { phone: '9361557446', upiId: 'homedigo-demo@example', payeeName: 'Test Clinic' };
      else if (path === '/api/patient/profiles') {
        if (post && saveFails) { status = 503; body = { error: 'Storage is unavailable.' }; }
        else if (post) { profiles = [{ id: 'profile', user_id: 'patient', full_name: 'Checkout Test' }]; body = { profile: profiles[0] }; }
        else body = { profiles };
      } else if (path === '/api/patient/addresses') {
        if (post) { addresses = [{ id: 'address', user_id: 'patient', address_line1: 'Test street', city: 'Chennai', pincode: '600001' }]; body = { address: addresses[0] }; }
        else body = { addresses };
      } else if (path === '/api/patient/bookings' && post) throw new Error('This test must not submit a booking');
      await route.fulfill({ status, contentType: 'application/json', body: JSON.stringify(body) });
    });
    await page.goto('http://localhost:3100/patient/book');
    await page.getByRole('button', { name: 'Continue', exact: true }).click();
    await page.getByText('No Patient Family Profiles Found').waitFor();
    await page.getByRole('button', { name: 'Continue', exact: true }).click();
    await page.getByRole('alert').filter({ hasText: 'before continuing' }).waitFor();
    assert.equal(await page.getByRole('button', { name: 'Submit Receipt & Request Appointment' }).count(), 0);
    console.log('PASS: missing details cannot be skipped');

    await page.evaluate(() => sessionStorage.setItem('homedigo-payment-draft-patient', JSON.stringify({
      savedAt: Date.now(), selectedServiceId: 'srv_doc', selectedProfileId: 'profile', selectedAddressId: 'address',
      selectedPartnerId: 'doctor', scheduledDate: '2099-03-01', scheduledSlot: '10:00 AM - 11:00 AM',
      clinicalNotes: '', requestKey: 'checkout-browser-test',
    })));
    await page.reload();
    const submit = page.getByRole('button', { name: 'Submit Receipt & Request Appointment' });
    await submit.waitFor();
    const gpay = page.getByRole('button', { name: 'Open Google Pay', exact: true });
    await gpay.waitFor();
    assert.equal(await gpay.isDisabled(), true);
    assert.equal(await submit.isDisabled(), true);
    await page.locator('#payment-receipt').setInputFiles({ name: 'receipt.png', mimeType: 'image/png',
      buffer: Buffer.from('iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAQAAAC1HAwCAAAAC0lEQVR42mP8/x8AAwMCAO+aL1sAAAAASUVORK5CYII=', 'base64') });
    await page.getByAltText('Selected payment receipt').waitFor();
    console.log('PASS: payment controls stay visible and an existing receipt can be uploaded');
    await page.getByRole('button', { name: 'Add patient profile', exact: true }).click();
    await page.getByPlaceholder('E.g., Meenakshi K.').fill('Checkout Test');
    await page.locator('form button[type="submit"]').click();
    await page.getByRole('alert').filter({ hasText: 'Storage is unavailable.' }).waitFor();
    saveFails = false;
    await page.locator('form button[type="submit"]').click();
    await page.getByRole('button', { name: 'Add patient profile', exact: true }).waitFor({ state: 'hidden' });
    assert.equal(await submit.isDisabled(), true);
    await page.getByRole('button', { name: 'Add visit address', exact: true }).click();
    await page.getByPlaceholder('E.g., Flat 204, Rose Villa, 8th Main').fill('Test street');
    await page.locator('input[placeholder="560038"]').fill('600001');
    await page.locator('form button[type="submit"]').click();
    await page.getByRole('button', { name: 'Add visit address', exact: true }).waitFor({ state: 'hidden' });
    assert.equal(await submit.isEnabled(), true);
    assert.equal(await gpay.isEnabled(), true);
    assert.equal(await page.getByAltText('Selected payment receipt').count(), 1);
    assert.deepEqual(errors, []);
    fs.mkdirSync('.next/checkout-browser', { recursive: true });
    await page.screenshot({ path: '.next/checkout-browser/ready-to-submit.png', fullPage: true });
    console.log('PASS: save failures are shown; adding patient/address enables payment and submission and preserves the uploaded receipt');
  } finally { await browser.close(); }
})().catch(error => { console.error(error); process.exitCode = 1; });
