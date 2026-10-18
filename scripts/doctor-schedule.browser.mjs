// Synthetic identities and API fixtures only: no real bookings, payments or duty changes.
import { chromium } from 'playwright';
import assert from 'node:assert/strict';
import { readFileSync, mkdirSync } from 'node:fs';
import vm from 'node:vm';
import ts from 'typescript';

const origin = process.env.TEST_ORIGIN || 'http://localhost:3100';
function load(file, dependencies = {}) {
  const exports = {};
  vm.runInNewContext(ts.transpileModule(readFileSync(file, 'utf8'), { compilerOptions: { module: ts.ModuleKind.CommonJS } }).outputText,
    { exports, require: name => dependencies[name], Date });
  return exports;
}
const time = load('src/lib/appointment-time.ts');
const scheduling = load('src/lib/doctor-schedule.ts', { './appointment-time': time });
const now = new Date('2026-10-19T17:00:00+05:30');
const browser = await chromium.launch({ headless: true, executablePath: process.env.BROWSER_EXECUTABLE || undefined });
mkdirSync('coverage/schedule', { recursive: true });
try {
  for (const width of [360, 390, 1440]) {
    const context = await browser.newContext({ viewport: { width, height: 900 } });
    await context.addInitScript(() => sessionStorage.setItem('homedigo.staff.partner', 'synthetic-session'));
    let availability = 'AVAILABLE', saved = 0;
    let hours = { ...scheduling.defaultSchedule(), days: Array.from({ length: 7 }, () => [{ start: '09:00', end: '20:00' }]), bufferMinutes: 0 };
    const visit = { id: 'test-visit', service_title: 'Doctor visit', patient_name: 'Test Patient', partner_name: 'Dr Test', status: 'CONFIRMED', scheduled_date: '2026-10-20', scheduled_time_slot: '10:00 AM - 11:00 AM', appointment_starts_at: '2026-10-20T04:30:00Z' };
    await context.route('**/api/**', async route => {
      const path = new URL(route.request().url()).pathname;
      const patient = { user: { id: 'patient', role: 'PATIENT', name: 'Test Patient', email: 'patient@example.test' }, expires: new Date(now.getTime() + 3600000).toISOString() };
      const doctor = { id: 'doctor', name: 'Dr Test', availability, specialization: 'General Medicine', consultation_fee: 500 };
      let body = {};
      if (path === '/api/auth/session') body = patient;
      else if (path === '/api/auth/staff') body = { ...patient, user: { ...patient.user, id: 'doctor', role: 'PARTNER' } };
      else if (path === '/api/pro/schedule') {
        if (route.request().method() === 'PUT') { hours = route.request().postDataJSON(); saved++; }
        body = { configured: saved > 0, schedule: hours, success: true };
      } else if (path === '/api/pro/availability') {
        if (route.request().method() === 'POST') availability = route.request().postDataJSON().availability;
        body = { availability, success: true };
      } else if (path === '/api/pro/dashboard') body = { partner: doctor, bookings: [] };
      else if (path === '/api/doctors') body = { doctors: [doctor, { ...doctor, id: 'off', name: 'Dr Offline', availability: 'OFFLINE' }] };
      else if (path.endsWith('/slots')) {
        const date = new URL(route.request().url()).searchParams.get('date');
        body = { slots: scheduling.scheduleSlots(hours, date, [], now), availability, configured: true, serverNow: now.toISOString() };
      } else if (path === '/api/specialities') body = { specialities: [] };
      else if (path === '/api/services') body = { services: [{ id: 'srv_doc', title: 'Doctor visit', base_price: 500, visiting_fee: 50, description: 'Home doctor consultation' }] };
      else if (path === '/api/patient/profiles') body = { profiles: [{ id: 'profile', user_id: 'patient', full_name: 'Test Patient', age: 30, gender: 'Female' }] };
      else if (path === '/api/patient/addresses') body = { addresses: [{ id: 'address', user_id: 'patient', address_line1: 'Test address', city: 'Bengaluru', pincode: '560001' }] };
      else if (path === '/api/patient/bookings') {
        assert.equal(route.request().method(), 'GET', 'Browser test must never submit a real request');
        body = { bookings: [visit] };
      } else if (path === '/api/push/config') body = { enabled: false };
      else if (path === '/api/patient/payment') body = { phone: '9000000000', upiId: '', payeeName: 'Test' };
      await route.fulfill({ contentType: 'application/json', body: JSON.stringify(body) });
    });
    const page = await context.newPage();
    await page.clock.install({ time: now });
    const errors = [];
    page.on('pageerror', error => errors.push(error.message));
    async function fits(name) {
      assert.ok(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth + 1), `${name} overflows at ${width}px`);
      await page.screenshot({ path: `coverage/schedule/${name}-${width}.png`, fullPage: true });
    }
    await page.goto(origin + '/partner/schedule');
    await page.getByRole('heading', { name: 'Appointment hours', exact: true }).waitFor();
    await page.getByLabel('Visit duration').selectOption('45');
    await page.getByLabel('Travel time between visits').selectOption('15');
    assert.equal(await page.getByLabel('Monday start 1 hour', { exact: true }).inputValue(), '9');
    assert.equal(await page.getByLabel('Monday start 1 AM or PM', { exact: true }).inputValue(), 'AM');
    assert.equal(await page.getByLabel('Monday end 1 hour', { exact: true }).inputValue(), '8');
    assert.equal(await page.getByLabel('Monday end 1 AM or PM', { exact: true }).inputValue(), 'PM');
    assert.equal(await page.locator('input[type="time"]').count(), 0);
    await page.getByLabel('Monday start 1 hour', { exact: true }).selectOption('12');
    await page.getByLabel('Monday start 1 minute', { exact: true }).selectOption('15');
    await page.getByLabel('Monday end 1 hour', { exact: true }).selectOption('12');
    await page.getByRole('button', { name: 'Save appointment hours' }).click();
    await page.getByText('Hours saved. Patients can book these times while you are on duty.').waitFor();
    assert.equal(hours.days[1][0].start, '00:15', '12 AM must save as midnight');
    assert.equal(hours.days[1][0].end, '12:00', '12 PM must save as noon');
    await page.reload();
    await page.getByLabel('Monday start 1 hour', { exact: true }).waitFor();
    assert.equal(await page.getByLabel('Monday start 1 AM or PM', { exact: true }).inputValue(), 'AM');
    assert.equal(await page.getByLabel('Monday start 1 minute', { exact: true }).inputValue(), '15');
    await page.getByLabel('Monday start 1 hour', { exact: true }).selectOption('9');
    await page.getByLabel('Monday start 1 minute', { exact: true }).selectOption('0');
    await page.getByLabel('Monday end 1 hour', { exact: true }).selectOption('8');
    await page.getByRole('button', { name: 'Copy Monday to weekdays' }).click();
    await page.getByRole('button', { name: 'Save appointment hours' }).click();
    await page.getByText('Hours saved. Patients can book these times while you are on duty.').waitFor();
    assert.equal(saved, 2);
    assert.equal(hours.days[1][0].end, '20:00');
    await fits('doctor-hours');
    await page.getByRole('button', { name: 'Go Off-Duty' }).click();
    await page.getByRole('button', { name: 'Start Duty Shift' }).waitFor();
    await page.goto(origin + '/#find-doctors');
    await page.getByText('Dr Test', { exact: true }).waitFor();
    assert.equal(await page.getByText('Currently not available', { exact: true }).count(), 2);
    availability = 'AVAILABLE';
    await page.evaluate(() => window.dispatchEvent(new Event('focus')));
    await page.waitForFunction(() => [...document.querySelectorAll('a')].some(a => a.textContent.includes('Book appointment')));
    assert.equal(await page.getByText('Currently not available', { exact: true }).count(), 1);
    hours.slotMinutes = 60; hours.bufferMinutes = 0;
    await page.goto(origin + '/patient/book?service=srv_doc&doctor=doctor');
    await page.getByRole('heading', { name: 'Book a home visit' }).waitFor();
    for (let step = 1; step <= 3; step++) {
      await page.getByRole('button', { name: 'Continue', exact: true }).click();
      if (step === 1) await page.getByText('Test Patient', { exact: true }).first().waitFor();
    }
    const section = page.getByRole('region', { name: 'Appointment date and time' });
    const past = section.getByRole('button', { name: '01:00 PM Time passed', exact: true });
    await section.locator('summary').filter({hasText: 'Unavailable times'}).click();
    await past.waitFor();
    assert.equal(await past.isDisabled(), true);
    assert.equal(await section.getByRole('button', { name: '06:00 PM until 07:00 PM' }).isEnabled(), true);
    await section.locator('summary').filter({hasText: 'Unavailable times'}).click();
    await fits('patient-slots');
    await section.getByRole('button', { name: 'Tomorrow' }).click();
    const future = section.getByRole('button', { name: '01:00 PM until 02:00 PM', exact: true });
    await future.click();
    await page.getByRole('button', { name: 'Continue', exact: true }).click();
    await page.getByRole('button', { name: 'Submit Receipt & Request Appointment' }).waitFor();
    await fits('patient-checkout');
    await page.goto(origin + '/patient/dashboard');
    await page.getByRole('heading', { name: 'Your next visit' }).waitFor();
    await page.getByText('10:00 AM - 11:00 AM', { exact: false }).waitFor();
    await fits('patient-home');
    if (width < 1024) {
      const navigation = page.getByRole('navigation', { name: 'Patient navigation' });
      await navigation.getByRole('button', { name: 'More' }).click();
      await page.getByRole('button', { name: 'Close account menu' }).click();
      await navigation.getByRole('link', { name: 'Visits' }).click();
    } else await page.goto(origin + '/patient/appointments');
    await page.getByRole('link', { name: 'View appointment', exact: true }).waitFor();
    await fits('patient-visits');
    assert.deepEqual(errors, []);
    console.log(`PASS ${width}px: doctor schedule, duty state, past/future slots, mobile navigation and appointment cards`);
    await context.close();
  }
} finally { await browser.close(); }
