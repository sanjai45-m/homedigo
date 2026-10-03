import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { after, before, test } from 'node:test';
import vm from 'node:vm';
import ts from 'typescript';
import { PGlite } from '@electric-sql/pglite';

const db = new PGlite();
const dependencies = {
  'next/server': { NextResponse: { json: (body) => body } },
  'next-auth/next': { getServerSession: async () => ({ user: { id: 'doctor' } }) },
  '@/lib/auth': { authOptions: {} },
  '@/lib/db': { isDbConfigured: true, executeQuery: async (query, params = []) => {
    const result = await db.query(query, params);
    return { rows: result.rows, isConnected: true };
  } },
};
function load(file, globals = {}) {
  const exports = {};
  const source = ts.transpileModule(readFileSync(file, 'utf8'), {
    compilerOptions: { module: ts.ModuleKind.CommonJS, target: ts.ScriptTarget.ES2020 },
  }).outputText;
  vm.runInNewContext(source, { exports, Date, console, ...globals, require: name => {
    assert.ok(name in dependencies, `Unexpected dependency: ${name}`);
    return dependencies[name];
  } });
  return exports;
}
const revenue = load('src/lib/revenue.ts');
dependencies['@/lib/revenue'] = revenue;
const billing = load('src/app/api/super-admin/billing/route.ts');
const earnings = load('src/app/api/pro/earnings/route.ts');
const services = load('src/app/api/admin/services/route.ts');

before(async () => {
  await db.exec(`
    CREATE TABLE users (id TEXT, name TEXT, email TEXT);
    CREATE TABLE partner_profiles (user_id TEXT, specialization TEXT, council_reg_number TEXT);
    CREATE TABLE bookings (id TEXT, booking_number TEXT, service_title TEXT, patient_name TEXT,
      partner_id TEXT, partner_name TEXT, total_amount NUMERIC(10,2), payment_status TEXT,
      payment_ref TEXT, status TEXT, created_at TIMESTAMPTZ DEFAULT NOW());
    CREATE TABLE services (id TEXT, title TEXT, category TEXT, description TEXT, base_price NUMERIC,
      visiting_fee NUMERIC, commission_percentage NUMERIC, duration_minutes INTEGER, icon TEXT, is_active BOOLEAN);
    INSERT INTO users VALUES ('doctor', 'Test Doctor', 'doctor@example.test');
    INSERT INTO services VALUES ('legacy', 'Legacy Service', 'CONSULTATION', '', 100, 0, 15, 45, 'Stethoscope', true);
  `);
});
after(() => db.close());

test('10% application share and remaining 90% preserve the total, including zero and half-paise rounding', () => {
  for (const [amount, fee, net] of [[1000, 100, 900], ['550.00', 55, 495], [0, 0, 0], [null, 0, 0], [10.05, 1.01, 9.04], [0.05, 0.01, 0.04]]) {
    const split = revenue.splitAppointmentAmount(amount);
    assert.equal(split.commission, fee);
    assert.equal(split.netPayout, net);
    assert.equal(Math.round((fee + net) * 100), Math.round(split.grossAmount * 100));
  }
  for (let paise = 0; paise < 10000; paise++) {
    const split = revenue.splitAppointmentAmount(paise / 100);
    assert.equal(Math.round(split.commission * 100) + Math.round(split.netPayout * 100), paise);
  }
  for (const invalid of [-1, 'invalid', Infinity]) assert.throws(() => revenue.splitAppointmentAmount(invalid));
});

test('empty billing has zero totals and no fabricated amounts', async () => {
  const response = await billing.GET();
  assert.equal(response.summary.grossRevenue, 0);
  assert.equal(response.summary.platformCommission, 0);
  assert.equal(response.summary.netClinicianPayouts, 0);
  assert.equal(response.appointments.length, 0);
});

test('billing totals sum per-appointment rounding across all rows and match partner earnings', async () => {
  for (let index = 0; index < 25; index++) {
    await db.query(`INSERT INTO bookings (id, booking_number, service_title, patient_name,
      partner_id, partner_name, total_amount, payment_status, status)
      VALUES ($1, $1, 'Home Visit', 'Patient', 'doctor', 'Test Doctor', $2, 'PAID', 'COMPLETED')`,
      [String(index), index === 0 ? 0 : 10.05]);
  }
  await db.exec(`INSERT INTO invoices (id, booking_id, invoice_number, service_title, subtotal, tax_amount, total_paid)
    VALUES ('invoice', '1', 'INV1', 'Home Visit', 10.05, 0, 10.05),
           ('free', '0', 'INV0', 'Home Visit', 0, 0, 0)`);
  const response = await billing.GET();
  assert.equal(response.summary.totalTransactions, 25);
  assert.equal(response.appointments.length, 20);
  assert.equal(response.summary.grossRevenue, 241.2);
  assert.equal(response.summary.platformCommission, 24.24);
  assert.equal(response.summary.netClinicianPayouts, 216.96);
  const invoice = response.invoices.find(row => row.id === 'invoice');
  assert.equal(invoice.commission, 1.01);
  assert.equal(invoice.netPayout, 9.04);
  assert.equal(response.invoices.find(row => row.id === 'free').grossAmount, 0);
  const partner = await earnings.GET();
  assert.equal(partner.earnings.platformFeePaid, response.summary.platformCommission);
  assert.equal(partner.earnings.settledEarnings, response.summary.netClinicianPayouts);
  assert.equal(partner.earnings.todayEarnings, response.summary.netClinicianPayouts);
  assert.equal(partner.payouts.find(row => row.id === '0').netPayout, 0);
});

test('service configuration consistently reports and saves the fixed 10% rate', async () => {
  const response = await services.GET();
  assert.equal(Number(response.services[0].commission_percentage), 10);
  const updated = await services.PUT({ json: async () => ({ id: 'legacy', commissionPercentage: 25 }) });
  assert.equal(Number(updated.service.commission_percentage), 10);
  const created = await services.POST({ json: async () => ({ title: 'New Service', basePrice: 200, commissionPercentage: 15 }) });
  assert.equal(Number(created.service.commission_percentage), 10);
});

test('superadmin PDF includes the actual total and both shares with the same 10% rate', () => {
  let html = '';
  const pdf = load('src/lib/pdf-generator.ts', { window: { open: () => ({
    document: { write: value => { html = value; }, close() {} },
  }) } });
  pdf.generateTaxLedgerPdf({
    partnerName: 'Super Admin', partnerRole: 'Admin', bankAccount: '',
    todayEarnings: 0, weeklyEarnings: 0, monthlyEarnings: 0, pendingPayout: 0,
    revenueSummary: { grossRevenue: 1000, platformCommission: 100, netClinicianPayouts: 900, totalTransactions: 1 },
    payouts: [{ id: '1', date: '2026-10-04', bookingId: '1', service: 'Visit', patient: 'Patient',
      ...revenue.splitAppointmentAmount(1000), status: 'PAID', utr: '' }],
  });
  for (const expected of ['Total Appointment Amount', 'Homedigo Revenue (10%)', 'Clinician Share (90%)', '₹1000.00', '₹100.00', '₹900.00']) {
    assert.ok(html.includes(expected), expected);
  }
  assert.ok(!html.includes('15%'));
  assert.ok(!html.includes('Weekly Take-Home'));
});
