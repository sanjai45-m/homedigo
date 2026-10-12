import { NextResponse } from 'next/server';
import { executeQuery, isDbConfigured } from '@/lib/db';
import { getServerSession } from 'next-auth/next';
import { authOptions } from '@/lib/auth';

export async function GET(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const session = await getServerSession(authOptions);
  const userId = (session?.user as { id?: string })?.id;
  if (!userId) return NextResponse.json({ error: 'Please sign in.' }, { status: 401 });
  const { id } = await params;

  if (isDbConfigured) {
    const res = await executeQuery(
      `SELECT b.*, 
              COALESCE(b.partner_lat, p.latitude) AS partner_lat, 
              COALESCE(b.partner_lng, p.longitude) AS partner_lng,
              COALESCE(b.patient_lat, a.lat) AS patient_lat, 
              COALESCE(b.patient_lng, a.lng) AS patient_lng, 
              a.city AS address_city,
              p.location_name AS partner_location
       FROM bookings b
       LEFT JOIN addresses a ON b.address_id = a.id
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
  const session = await getServerSession(authOptions);
  const userId = (session?.user as { id?: string })?.id;
  if (!userId) return NextResponse.json({ error: 'Please sign in.' }, { status: 401 });
  const { id } = await params;
  const body = await request.json();
  if (body.status !== 'CANCELLED') return NextResponse.json({ error: 'Patients can only cancel appointments.' }, { status: 403 });
  const result = await executeQuery(`UPDATE bookings SET status = 'CANCELLED'
    WHERE (id = $1 OR booking_number = $1) AND user_id = $2 AND status IN ('PENDING', 'ASSIGNED', 'CONFIRMED') RETURNING *`, [id, userId]);
  if (!result.isConnected) return NextResponse.json({ error: 'Appointment unavailable.' }, { status: 503 });
  if (!result.rows.length) return NextResponse.json({ error: 'Appointment cannot be cancelled.' }, { status: 409 });
  return NextResponse.json({ success: true, booking: result.rows[0] });
}
