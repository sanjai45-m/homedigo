import { requireApiUser } from '@/lib/api-auth';
import { NextResponse } from 'next/server';
import { executeQuery, isDbConfigured } from '@/lib/db';
import { ensureAppointmentSchema } from '@/lib/appointment-schema';
import { cancellationReason } from '@/lib/cancellation';
import { processAppointmentNotificationsSafely } from '@/lib/appointment-notifications';

export const maxDuration = 60;

export async function GET(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const authorization = await requireApiUser(["PATIENT"], request);
  if (authorization.response) return authorization.response;

  const session = { user: authorization.user };
  const userId = (session?.user as { id?: string })?.id;
  if (!userId) return NextResponse.json({ error: 'Please sign in.' }, { status: 401 });
  const { id } = await params;

  if (isDbConfigured) {
    const res = await executeQuery(
      `SELECT b.*,
              CASE WHEN b.patient_lat BETWEEN -90 AND 90 AND b.patient_lng BETWEEN -180 AND 180 THEN b.patient_lat ELSE a.lat END AS patient_lat,
              CASE WHEN b.patient_lat BETWEEN -90 AND 90 AND b.patient_lng BETWEEN -180 AND 180 THEN b.patient_lng ELSE a.lng END AS patient_lng,
              a.city AS address_city,
              p.location_name AS partner_location
       FROM bookings b
       LEFT JOIN addresses a ON b.address_id = a.id AND a.user_id = b.user_id
       LEFT JOIN partner_profiles p ON b.partner_id = p.user_id
       WHERE (b.id = $1 OR b.booking_number = $1) AND b.user_id = $2`,
      [id, userId]
    );
    if (res.isConnected && res.rows.length > 0) {
      return NextResponse.json({ booking: res.rows[0] });
    }
  }

  return NextResponse.json({
    booking: null,
  });
}

export async function PATCH(request: Request, { params }: { params: Promise<{ id: string }> }) {
  const authorization = await requireApiUser(["PATIENT"], request);
  if (authorization.response) return authorization.response;

  const session = { user: authorization.user };
  const userId = (session?.user as { id?: string })?.id;
  if (!userId) return NextResponse.json({ error: 'Please sign in.' }, { status: 401 });
  const { id } = await params;
  let body, reason;
  try { body = await request.json(); reason = cancellationReason(body?.cancellationReason); }
  catch (error) { return NextResponse.json({ error: error instanceof Error ? error.message : 'Invalid cancellation.' }, { status: 400 }); }
  if (!body) return NextResponse.json({ error: 'Invalid cancellation.' }, { status: 400 });
  if (body.status !== 'CANCELLED') return NextResponse.json({ error: 'Patients can only cancel appointments.' }, { status: 403 });
  try {
    await ensureAppointmentSchema();
    const result = await executeQuery(`UPDATE bookings SET status = 'CANCELLED', cancellation_reason = $3
      WHERE (id = $1 OR booking_number = $1) AND user_id = $2 AND status IN ('PENDING', 'ASSIGNED', 'CONFIRMED') RETURNING *`, [id, userId, reason]);
    if (!result.isConnected) return NextResponse.json({ error: 'Appointment unavailable.' }, { status: 503 });
    if (!result.rows.length) return NextResponse.json({ error: 'Appointment cannot be cancelled.' }, { status: 409 });
    await processAppointmentNotificationsSafely(result.rows[0].id);
    return NextResponse.json({ success: true, booking: result.rows[0] });
  } catch { return NextResponse.json({ error: 'Appointment unavailable. Please retry.' }, { status: 503 }); }
}
