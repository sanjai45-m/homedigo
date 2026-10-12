import { requireApiUser } from '@/lib/api-auth';
import { NextResponse } from 'next/server';
import { executeQuery, isDbConfigured } from '@/lib/db';

export async function GET(request: Request) {
  const authorization = await requireApiUser(["PATIENT"], request);
  if (authorization.response) return authorization.response;

  const userId = authorization.user.id;

  if (isDbConfigured) {
    const res = await executeQuery(
      `SELECT id, booking_id, user_id, invoice_number, service_title, subtotal, tax_amount, total_paid, payment_ref, created_at AS issued_at
       FROM invoices
       WHERE user_id = $1
       ORDER BY created_at DESC`,
      [userId]
    );
    if (res.isConnected) {
      return NextResponse.json({ invoices: res.rows });
    }
  }

  return NextResponse.json({ error: 'Storage is unavailable.' }, { status: 503 });
}
