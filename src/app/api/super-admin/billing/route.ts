import { requireApiUser } from '@/lib/api-auth';
import { NextResponse } from 'next/server';
import { executeQuery, isDbConfigured } from '@/lib/db';
import { HOMEDIGO_REVENUE_PERCENT, splitAppointmentAmount, VERIFIED_PAYMENT_SQL } from '@/lib/revenue';
import { ensureAppointmentSchema } from '@/lib/appointment-schema';

export async function GET() {
  const authorization = await requireApiUser(["SUPER_ADMIN"]);
  if (authorization.response) return authorization.response;

  try {
    if (!isDbConfigured) throw new Error('Storage unavailable');
    await ensureAppointmentSchema();
    // Ensure table exists
    const schema = await executeQuery(`
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
    if (!schema.isConnected) throw new Error('Storage unavailable');

    const revRes = await executeQuery(`
      SELECT 
        COALESCE(SUM(total_amount), 0) as gross_revenue,
        COALESCE(SUM(ROUND(total_amount * $1::numeric / 100, 2)), 0) as platform_commission,
        COALESCE(SUM(total_amount - ROUND(total_amount / 1.18, 2)), 0) as gst_tax,
        COUNT(*) as total_transactions,
        COUNT(*) as successful_payments
      FROM bookings b WHERE ${VERIFIED_PAYMENT_SQL}
    `, [HOMEDIGO_REVENUE_PERCENT]);

    const invRes = await executeQuery(`
      SELECT i.*, b.patient_name, b.payment_verified_at, u.name AS verified_by_name
      FROM invoices i JOIN bookings b ON b.id = i.booking_id
      LEFT JOIN users u ON u.id = b.payment_verified_by
      WHERE ${VERIFIED_PAYMENT_SQL}
      ORDER BY b.payment_verified_at DESC
      LIMIT 20
    `);

    const appointmentsRes = await executeQuery(`
      SELECT b.id, b.booking_number, b.service_title, b.patient_name, b.partner_name,
             b.total_amount, b.payment_status, b.status, b.created_at, b.payment_verified_at,
             b.payment_verified_by, b.payment_method, b.payment_ref, u.name AS verified_by_name
      FROM bookings b LEFT JOIN users u ON u.id = b.payment_verified_by
      WHERE ${VERIFIED_PAYMENT_SQL}
      ORDER BY b.payment_verified_at DESC
      LIMIT 20
    `);
    if ([revRes, invRes, appointmentsRes].some(result => !result.isConnected)) throw new Error('Storage unavailable');

    const gross = Number(revRes.rows[0]?.gross_revenue || 0);
    const platformCommission = Number(revRes.rows[0]?.platform_commission || 0);
    const netClinicianPayouts = Number((gross - platformCommission).toFixed(2));
    const gstTaxCollected = Number(revRes.rows[0]?.gst_tax || 0);

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
    }, { headers: { 'Cache-Control': 'private, no-store' } });
  } catch {
    return NextResponse.json({ error: 'Billing could not be loaded. Please retry.' }, { status: 503 });
  }
}

export async function POST(request: Request) {
  const authorization = await requireApiUser(["SUPER_ADMIN"], request);
  if (authorization.response) return authorization.response;

  return NextResponse.json({ error: 'Automatic payouts are not configured. This ledger records doctor-verified manual payments; it does not transfer money.' }, { status: 501 });
}
