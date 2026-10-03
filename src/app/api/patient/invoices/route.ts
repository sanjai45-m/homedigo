import { NextResponse } from 'next/server';
import { executeQuery, isDbConfigured } from '@/lib/db';

export async function GET(request: Request) {
  const { searchParams } = new URL(request.url);
  const userId = searchParams.get('userId') || 'usr_pat_001';

  if (isDbConfigured) {
    const res = await executeQuery(
      `SELECT id, booking_id, user_id, invoice_number, service_title, subtotal, tax_amount, total_paid, payment_ref, issued_at
       FROM invoices
       WHERE user_id = $1
       ORDER BY issued_at DESC`,
      [userId]
    );
    if (res.isConnected && res.rows.length > 0) {
      return NextResponse.json({ invoices: res.rows });
    }
  }

  // Fallback demo invoices
  return NextResponse.json({
    invoices: [
      {
        id: 'inv_8921',
        booking_id: 'bk_live_01',
        invoice_number: 'INV-2026-8921',
        service_title: 'Doctor Home Visit',
        subtotal: 423.73,
        tax_amount: 76.27,
        total_paid: 500.0,
        payment_ref: 'UPI/2026/892184920',
        issued_at: new Date().toISOString(),
      },
      {
        id: 'inv_7814',
        booking_id: 'bk_done_02',
        invoice_number: 'INV-2026-7814',
        service_title: 'Home Nursing Care',
        subtotal: 296.61,
        tax_amount: 53.39,
        total_paid: 350.0,
        payment_ref: 'UPI/2026/781492019',
        issued_at: new Date(Date.now() - 86400000).toISOString(),
      },
    ],
  });
}
