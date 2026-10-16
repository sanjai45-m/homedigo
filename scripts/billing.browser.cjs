// Local production build on port 3100; all API responses are synthetic.
// No live appointment, payment, or email is changed by this check.
const { chromium } = require(process.env.PLAYWRIGHT_MODULE || 'playwright');
const assert = require('node:assert/strict');

(async () => {
  const browser = await chromium.launch({ headless: true, executablePath: process.env.BROWSER_EXECUTABLE || undefined });
  try {
    const context = await browser.newContext();
    await context.addInitScript(() => sessionStorage.setItem('homedigo.staff.super-admin', 'synthetic-super-token'));
    let verified = false;
    const errors = [];
    await context.route('**/api/**', async route => {
      const path = new URL(route.request().url()).pathname;
      let body = {};
      if (path === '/api/auth/staff') body = { user: { id: 'super', role: 'SUPER_ADMIN', name: 'Audit Test' }, expires: new Date(Date.now() + 3600000).toISOString() };
      else if (path === '/api/super-admin/stats') body = { metrics: { totalGmv: 99999, totalAdmins: 1, totalPartners: 1, totalPatients: 1 } };
      else if (path === '/api/super-admin/billing') body = {
        summary: { grossRevenue: verified ? 1000 : 0, platformCommission: verified ? 100 : 0,
          netClinicianPayouts: verified ? 900 : 0, gstTaxCollected: verified ? 152.54 : 0,
          successfulPayments: verified ? 1 : 0, totalTransactions: verified ? 1 : 0 },
        invoices: [], appointments: verified ? [{ id: 'test-booking', booking_number: 'AUDIT-TEST',
          service_title: 'Home visit', patient_name: 'Test Patient', partner_name: 'Test Doctor',
          payment_status: 'PAID', status: 'CONFIRMED', grossAmount: 1000, commission: 100, netPayout: 900,
          payment_verified_at: '2026-10-12T10:00:00Z', payment_verified_by: 'doctor', verified_by_name: 'Test Doctor' }] : [],
      };
      assert.equal(route.request().method(), 'GET', 'Financial UI must not trigger money transfers');
      await route.fulfill({ contentType: 'application/json', body: JSON.stringify(body) });
    });
    const billing = await context.newPage(), dashboard = await context.newPage();
    for (const page of [billing, dashboard]) {
      page.setDefaultTimeout(22000);
      page.on('pageerror', error => errors.push(error.message));
    }
    await Promise.all([billing.goto('http://localhost:3100/super-admin/billing'), dashboard.goto('http://localhost:3100/super-admin/dashboard')]);
    await billing.getByText('No doctor-verified payments yet.', { exact: true }).waitFor();
    const dashboardAmount = dashboard.getByText('Doctor-Verified Payment Amount', { exact: true }).locator('..').locator('..');
    await dashboardAmount.waitFor();
    assert.match(await dashboardAmount.innerText(), /₹0/);
    assert.doesNotMatch(await dashboardAmount.innerText(), /99,999/);
    assert.equal(await billing.getByRole('button', { name: 'Disburse Batch Payouts' }).count(), 0);
    assert.doesNotMatch(await billing.locator('body').innerText(), /Razorpay|Cashfree|0% Failure Rate/);
    verified = true;
    await billing.getByText('Payment verified by Test Doctor', { exact: true }).waitFor();
    await dashboardAmount.getByText('₹1,000', { exact: true }).waitFor();
    const row = billing.getByRole('row').filter({ hasText: 'AUDIT-TEST' });
    assert.match(await row.innerText(), /1,000\.00/);
    assert.match(await row.innerText(), /100\.00/);
    assert.match(await row.innerText(), /900\.00/);
    assert.match(await row.innerText(), /IST/);
    assert.deepEqual(errors, []);
    console.log('PASS: zero verified revenue is preserved, both screens automatically refresh after approval, audit details and shares render, and no gateway/payout claims appear');
  } finally { await browser.close(); }
})().catch(error => { console.error(error); process.exitCode = 1; });
