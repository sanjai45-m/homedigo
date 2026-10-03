import { NextResponse } from 'next/server';
import { getServerSession } from 'next-auth/next';
import { authOptions } from '@/lib/auth';
import { executeQuery, isDbConfigured } from '@/lib/db';
import { ensureAppointmentSchema } from '@/lib/appointment-schema';
import { appointmentDate, appointmentStart } from '@/lib/appointment-time';
import { processAppointmentEmails } from '@/lib/appointment-notifications';

export const maxDuration = 60;

export async function POST(_request: Request, { params }: { params: Promise<{ id: string }> }) {
  const session = await getServerSession(authOptions);
  const user = session?.user as { id?: string; role?: string } | undefined;
  if (!user?.id || user.role !== 'PARTNER') {
    return NextResponse.json({ error: 'Sign in as the assigned doctor to confirm.' }, { status: 401 });
  }
  if (!isDbConfigured) return NextResponse.json({ error: 'Database unavailable.' }, { status: 503 });

  try {
    await ensureAppointmentSchema();
    const { id } = await params;
    const found = await executeQuery(`SELECT * FROM bookings WHERE id = $1 AND partner_id = $2`, [id, user.id]);
    if (!found.isConnected) throw new Error('Database unavailable.');
    const booking = found.rows[0];
    if (!booking) return NextResponse.json({ error: 'Appointment not found.' }, { status: 404 });
    if (booking.doctor_confirmed_at) {
      return NextResponse.json({ success: true, alreadyConfirmed: true, visit: booking,
        message: 'This appointment is already confirmed.' });
    }
    if (!['PENDING', 'ASSIGNED', 'CONFIRMED'].includes(booking.status)) {
      return NextResponse.json({ error: 'This appointment can no longer be confirmed.' }, { status: 409 });
    }

    let date: string;
    let startsAt: string;
    try {
      // Legacy relative dates must be anchored to booking creation, never today.
      const reference = new Date(booking.created_at);
      date = appointmentDate(booking.scheduled_date, reference);
      startsAt = booking.appointment_starts_at
        ? new Date(booking.appointment_starts_at).toISOString()
        : appointmentStart(date, booking.scheduled_time_slot, reference);
    } catch {
      return NextResponse.json({ error: 'This appointment needs a valid date and time before confirmation.' }, { status: 409 });
    }
    if (Date.parse(startsAt) <= Date.now()) {
      return NextResponse.json({ error: 'This appointment has already started. Please arrange a new time.' }, { status: 409 });
    }

    // Confirmation and both email jobs commit atomically. A concurrent click
    // cannot create another confirmation or another pair of jobs.
    const confirmed = await executeQuery(
      `WITH confirmed AS (
         UPDATE bookings SET status = 'CONFIRMED', doctor_confirmed_at = NOW(),
           appointment_starts_at = $3::timestamptz, scheduled_date = $4
         WHERE id = $1 AND partner_id = $2 AND doctor_confirmed_at IS NULL
           AND status IN ('PENDING', 'ASSIGNED', 'CONFIRMED') AND $3::timestamptz > NOW()
         RETURNING *
       ), queued AS (
         INSERT INTO appointment_emails (booking_id, partner_id, confirmed_at, kind, due_at)
         SELECT c.id, c.partner_id, c.doctor_confirmed_at, k.kind,
           CASE WHEN k.kind = 'PATIENT_CONFIRMATION' THEN NOW()
             ELSE c.appointment_starts_at - INTERVAL '15 minutes' END
         FROM confirmed c CROSS JOIN (VALUES ('PATIENT_CONFIRMATION'), ('DOCTOR_REMINDER')) k(kind)
         ON CONFLICT DO NOTHING RETURNING id
       ) SELECT * FROM confirmed`, [id, user.id, startsAt, date],
    );
    if (!confirmed.isConnected) throw new Error('Could not save confirmation.');
    if (!confirmed.rows.length) {
      return NextResponse.json({ error: 'The appointment changed. Refresh the queue.' }, { status: 409 });
    }

    let emailSent = false;
    try {
      emailSent = (await processAppointmentEmails(id)).sent > 0;
    } catch {
      console.error('[APPOINTMENT EMAIL] Confirmation email remains queued for retry.');
    }
    return NextResponse.json({ success: true, visit: confirmed.rows[0], emailSent,
      message: emailSent ? 'Appointment confirmed. The patient confirmation email was sent.'
        : 'Appointment confirmed. The patient email is queued for automatic delivery.' });
  } catch {
    return NextResponse.json({ error: 'Could not confirm the appointment. Please try again.' }, { status: 503 });
  }
}
