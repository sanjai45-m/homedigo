import { requireApiUser } from '@/lib/api-auth';
import { NextResponse } from 'next/server';
import { ensureAppointmentSchema } from '@/lib/appointment-schema';
import { executeQuery } from '@/lib/db';
import { coordinates, distanceKm, locationIsFresh } from '@/lib/tracking';

const json = (body: unknown, status = 200) => NextResponse.json(body, {
  status, headers: { 'Cache-Control': 'private, no-store' },
});

export async function GET(request: Request, { params }: { params: Promise<{ id: string }> }) {
  const authorization = await requireApiUser(['PATIENT', 'PARTNER'], request);
  if (authorization.response) return authorization.response;
  try {
    await ensureAppointmentSchema();
    const { id } = await params;
    const result = await executeQuery(`SELECT b.partner_lat, b.partner_lng, b.patient_lat, b.patient_lng,
      b.partner_location_updated_at, b.partner_location_accuracy, b.status, a.lat AS address_lat, a.lng AS address_lng
      FROM bookings b LEFT JOIN addresses a ON b.address_id = a.id AND a.user_id = b.user_id
      WHERE (b.id = $1 OR b.booking_number = $1)
        AND (($3 = 'PATIENT' AND b.user_id = $2) OR ($3 = 'PARTNER' AND b.partner_id = $2))`,
    [id, authorization.user.id, authorization.user.role]);
    if (!result.isConnected) return json({ error: 'Location is temporarily unavailable.' }, 503);
    if (!result.rows.length) return json({ error: 'Appointment not found.' }, 404);
    const row = result.rows[0];
    const doctor = coordinates(row.partner_lat, row.partner_lng);
    const patient = coordinates(row.patient_lat, row.patient_lng) || coordinates(row.address_lat, row.address_lng);
    const updatedAt = row.partner_location_updated_at ? new Date(row.partner_location_updated_at).toISOString() : null;
    const isLive = Boolean(doctor && locationIsFresh(updatedAt) && ['ON_THE_WAY', 'ARRIVED'].includes(row.status));
    const distance = doctor && patient ? distanceKm(doctor, patient) : null;
    const accurate = row.partner_location_accuracy != null && Number(row.partner_location_accuracy) <= 100;
    return json({ lat: doctor?.lat ?? null, lng: doctor?.lng ?? null,
      patientLat: patient?.lat ?? null, patientLng: patient?.lng ?? null,
      status: row.status, updatedAt, accuracy: row.partner_location_accuracy, isLive,
      distanceKm: distance === null ? null : Number(distance.toFixed(2)),
      isNearby: Boolean(isLive && accurate && distance !== null && distance <= 2.5),
      isImmediate: Boolean(isLive && accurate && distance !== null && distance <= 0.4),
      etaMins: isLive && distance !== null ? Math.max(1, Math.round(distance / 25 * 60)) : null });
  } catch {
    return json({ error: 'Location is temporarily unavailable.' }, 503);
  }
}

export async function POST(request: Request, { params }: { params: Promise<{ id: string }> }) {
  const authorization = await requireApiUser(['PARTNER'], request);
  if (authorization.response) return authorization.response;
  let body;
  try { body = await request.json(); } catch { return json({ error: 'Invalid location.' }, 400); }
  const position = coordinates(body?.lat, body?.lng);
  if (!position || typeof body.lat !== 'number' || typeof body.lng !== 'number'
    || (body.accuracy != null && (typeof body.accuracy !== 'number' || !Number.isFinite(body.accuracy) || body.accuracy < 0))) {
    return json({ error: 'Provide valid GPS coordinates and accuracy.' }, 400);
  }
  try {
    await ensureAppointmentSchema();
    const { id } = await params;
    const result = await executeQuery(`SELECT b.id, b.patient_lat, b.patient_lng, b.status, a.lat AS address_lat, a.lng AS address_lng
      FROM bookings b LEFT JOIN addresses a ON a.id = b.address_id AND a.user_id = b.user_id
      WHERE b.id = $1 AND b.partner_id = $2 AND b.doctor_confirmed_at IS NOT NULL
        AND b.payment_status = 'PAID' AND b.status IN ('CONFIRMED', 'ON_THE_WAY', 'ARRIVED')`, [id, authorization.user.id]);
    if (!result.isConnected) return json({ error: 'Location could not be saved. Please retry.' }, 503);
    if (!result.rows.length) return json({ error: 'Accept the appointment and verify payment before starting the visit.' }, 409);
    const row = result.rows[0];
    const patient = coordinates(row.patient_lat, row.patient_lng) || coordinates(row.address_lat, row.address_lng);
    const distance = patient ? distanceKm(position, patient) : null;
    const accurate = body.accuracy != null && body.accuracy <= 100;
    const arrived = accurate && distance !== null && distance <= 0.5;
    const saved = await executeQuery(`UPDATE bookings SET partner_lat = $1, partner_lng = $2,
      partner_location_updated_at = NOW(), partner_location_accuracy = $3,
      status = CASE WHEN $4 THEN 'ARRIVED' WHEN status = 'CONFIRMED' THEN 'ON_THE_WAY' ELSE status END
      WHERE id = $5 AND partner_id = $6 AND doctor_confirmed_at IS NOT NULL AND payment_status = 'PAID'
        AND status IN ('CONFIRMED', 'ON_THE_WAY', 'ARRIVED')
      RETURNING partner_lat, partner_lng, status, partner_location_updated_at`,
    [position.lat, position.lng, body.accuracy ?? null, arrived, id, authorization.user.id]);
    if (!saved.isConnected) return json({ error: 'Location could not be saved. Please retry.' }, 503);
    if (!saved.rows.length) return json({ error: 'Appointment has changed. Refresh before sharing location.' }, 409);
    return json({ success: true, ...position, status: saved.rows[0].status,
      updatedAt: new Date(saved.rows[0].partner_location_updated_at).toISOString(),
      patientLat: patient?.lat ?? null, patientLng: patient?.lng ?? null,
      distanceKm: distance === null ? null : Number(distance.toFixed(2)),
      isNearby: Boolean(accurate && distance !== null && distance <= 2.5),
      isImmediate: Boolean(accurate && distance !== null && distance <= 0.4) });
  } catch {
    return json({ error: 'Location could not be saved. Please retry.' }, 503);
  }
}
