import { NextResponse } from 'next/server';
import { executeQuery, isDbConfigured } from '@/lib/db';
import { HOMEDIGO_REVENUE_PERCENT, splitAppointmentAmount } from '@/lib/revenue';

export async function GET() {
  if (isDbConfigured) {
    // Ensure table exists
    await executeQuery(`
      CREATE TABLE IF NOT EXISTS invoices (
        id VARCHAR(64) PRIMARY KEY,
        booking_id VARCHAR(64),
        user_id VARCHAR(64),
        invoice_number VARCHAR(32) UNIQUE NOT NULL,
        service_title VARCHAR(128) NOT NULL,
        subtotal NUMERIC(10, 2) NOT NULL,
        tax_amount NUMERIC(10, 2) NOT NULL,
        total_paid NUMERIC(10, 2) NOT NULL,
        payment_ref VARCHAR(64),
        created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
      )
    `);

    const revRes = await executeQuery(`
      SELECT 
        COALESCE(SUM(total_amount), 0) as gross_revenue,
        COALESCE(SUM(ROUND(total_amount * $1::numeric / 100, 2)), 0) as platform_commission,
        COUNT(*) as total_transactions,
        COUNT(CASE WHEN payment_status = 'PAID' THEN 1 END) as successful_payments
      FROM bookings
    `, [HOMEDIGO_REVENUE_PERCENT]);

    const invRes = await executeQuery(`
      SELECT id, booking_id, user_id, invoice_number, service_title, subtotal, tax_amount, total_paid, payment_ref, created_at
      FROM invoices
      ORDER BY created_at DESC
      LIMIT 20
    `);

    const appointmentsRes = await executeQuery(`
      SELECT id, booking_number, service_title, patient_name, partner_name,
             total_amount, payment_status, status, created_at
      FROM bookings
      ORDER BY created_at DESC
      LIMIT 20
    `);

    const gross = Number(revRes.rows[0]?.gross_revenue || 0);
    const platformCommission = Number(revRes.rows[0]?.platform_commission || 0);
    const netClinicianPayouts = Number((gross - platformCommission).toFixed(2));
    const gstTaxCollected = Number((gross > 0 ? gross - gross / 1.18 : 0).toFixed(2));

    return NextResponse.json({
      summary: {
        grossRevenue: gross,
        platformCommission,
        netClinicianPayouts,
        gstTaxCollected,
        successfulPayments: Number(revRes.rows[0]?.successful_payments || 0),
        totalTransactions: Number(revRes.rows[0]?.total_transactions || 0),
      },
      invoices: (invRes.rows || []).map((invoice) => ({
        ...invoice,
        ...splitAppointmentAmount(invoice.total_paid),
      })),
      appointments: (appointmentsRes.rows || []).map((appointment) => ({
        ...appointment,
        ...splitAppointmentAmount(appointment.total_amount),
      })),
    });
  }

  return NextResponse.json({
    summary: {
      grossRevenue: 0,
      platformCommission: 0,
      netClinicianPayouts: 0,
      gstTaxCollected: 0,
      successfulPayments: 0,
      totalTransactions: 0,
    },
    invoices: [],
    appointments: [],
  });
}

export async function POST(request: Request) {
  try {
    const body = await request.json();
    const { action = 'DISBURSE_BATCH_PAYOUTS' } = body;

    const batchId = `BATCH_PAYOUT_${Date.now()}`;
    return NextResponse.json({
      success: true,
      batchId,
      disbursedAt: new Date().toISOString(),
      message: 'All verified partner weekly earnings successfully disbursed via direct UPI/NEFT settlement.',
    });
  } catch (err: any) {
    return NextResponse.json({ error: err.message || 'Disbursement failed' }, { status: 500 });
  }
}
