import { requireApiUser } from '@/lib/api-auth';
import { NextResponse } from 'next/server';
import { executeQuery } from '@/lib/db';
import { ensureAppointmentSchema } from '@/lib/appointment-schema';

export async function GET(_request: Request, { params }: { params: Promise<{ id: string }> }) {
  const authorization = await requireApiUser(["PATIENT","PARTNER"], _request);
  if (authorization.response) return authorization.response;

  const session = { user: authorization.user };
  const user = session?.user as { id?: string; role?: string } | undefined;
  if (!user?.id) return NextResponse.json({ error: 'Please sign in.' }, { status: 401 });
  try {
    await ensureAppointmentSchema();
    const { id } = await params;
    const result = await executeQuery(
      `SELECT r.mime_type, r.image_base64 FROM payment_receipts r JOIN bookings b ON b.id = r.booking_id
       WHERE b.id = $1 AND (b.user_id = $2 OR (b.partner_id = $2 AND $3 = 'PARTNER'))`, [id, user.id, user.role || ''],
    );
    if (!result.isConnected) throw new Error('Storage unavailable');
    if (!result.rows.length) return NextResponse.json({ error: 'Receipt not found.' }, { status: 404 });
    const receipt = result.rows[0];
    return new Response(Buffer.from(receipt.image_base64, 'base64'), { headers: {
      'Content-Type': receipt.mime_type,
      'Cache-Control': 'private, no-store',
      'X-Content-Type-Options': 'nosniff',
      'Content-Security-Policy': "default-src 'none'; sandbox",
      'Content-Disposition': 'inline; filename="payment-receipt"',
    } });
  } catch {
    return NextResponse.json({ error: 'Receipt unavailable. Please try again.' }, { status: 503 });
  }
}
