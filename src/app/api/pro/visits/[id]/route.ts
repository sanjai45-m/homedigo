import { requireApiUser } from '@/lib/api-auth';
import { NextResponse } from 'next/server';
import { executeQuery, isDbConfigured } from '@/lib/db';
import { ensureAppointmentSchema } from '@/lib/appointment-schema';

export async function GET(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const authorization = await requireApiUser(["PARTNER"], request);
  if (authorization.response) return authorization.response;

  const session = { user: authorization.user };
  const user = session?.user as { id?: string; role?: string } | undefined;
  if (!user?.id || user.role !== 'PARTNER') return NextResponse.json({ error: 'Doctor access required.' }, { status: 401 });
  try {
    await ensureAppointmentSchema();
    const { id } = await params;
    const result = await executeQuery(
      `SELECT b.*, u.email AS patient_email, u.phone AS patient_phone,
        p.age AS patient_age, p.gender AS patient_gender, p.blood_group, p.medical_notes,
        EXISTS (SELECT 1 FROM payment_receipts r WHERE r.booking_id = b.id) AS has_receipt
       FROM bookings b LEFT JOIN users u ON u.id = b.user_id
       LEFT JOIN patient_profiles p ON p.id = b.patient_profile_id AND p.user_id = b.user_id
       WHERE b.id = $1 AND b.partner_id = $2`, [id, user.id]);
    if (!result.isConnected) throw new Error('Storage unavailable');
    if (!result.rows.length) return NextResponse.json({ error: 'Appointment not found.' }, { status: 404 });
    return NextResponse.json({ visit: result.rows[0] });
  } catch {
    return NextResponse.json({ error: 'Appointment unavailable.' }, { status: 503 });
  }
}

export async function PUT(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const authorization = await requireApiUser(["PARTNER"], request);
  if (authorization.response) return authorization.response;

  const { id } = await params;
  try {
    const session = { user: authorization.user };
    const user = session?.user as { id?: string; role?: string } | undefined;
    if (!user?.id || user.role !== 'PARTNER') {
      return NextResponse.json({ error: 'Doctor access required.' }, { status: 401 });
    }
    await ensureAppointmentSchema();
    const body = await request.json();
    const { status, vitalBp, vitalPulse, vitalSpo2, vitalSugar, prescriptionNotes } = body;
    if (status && !['ON_THE_WAY', 'ARRIVED', 'IN_PROGRESS', 'COMPLETED', 'CANCELLED'].includes(status)) {
      return NextResponse.json({ error: 'Use Confirm Availability on your dashboard to confirm an appointment.' }, { status: 400 });
    }

    if (isDbConfigured) {
      const updateRes = await executeQuery(
        `UPDATE bookings
         SET status = COALESCE($1, status),
             vital_bp = COALESCE($2, vital_bp),
             vital_pulse = COALESCE($3, vital_pulse),
             vital_spo2 = COALESCE($4, vital_spo2),
             vital_sugar = COALESCE($5, vital_sugar),
             prescription_notes = COALESCE($6, prescription_notes)
         WHERE id = $7 AND partner_id = $8
           AND (doctor_confirmed_at IS NOT NULL AND payment_status = 'PAID' OR $1 = 'CANCELLED')
         RETURNING *`,
        [status, vitalBp, vitalPulse, vitalSpo2, vitalSugar, prescriptionNotes, id, user.id]
      );

      if (updateRes.isConnected && updateRes.rows.length > 0) {
        return NextResponse.json({ success: true, visit: updateRes.rows[0] });
      }
    }

    return NextResponse.json({ error: 'Appointment could not be updated.' }, { status: 503 });
  } catch (err: any) {
    return NextResponse.json({ error: err.message || 'Failed to update visit' }, { status: 500 });
  }
}
