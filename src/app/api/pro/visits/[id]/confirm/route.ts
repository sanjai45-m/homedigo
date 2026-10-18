import { requireApiUser } from '@/lib/api-auth';
import { NextResponse } from 'next/server';
import { executeQuery, isDbConfigured } from '@/lib/db';
import { ensureAppointmentSchema } from '@/lib/appointment-schema';
import { appointmentDate, appointmentStart } from '@/lib/appointment-time';
import { processAppointmentNotifications as processAppointmentEmails } from '@/lib/appointment-notifications';
import { isEmailAddress } from '@/lib/email';

export const maxDuration = 60;

export async function POST(request: Request, { params }: { params: Promise<{ id: string }> }) {
  const authorization = await requireApiUser(["PARTNER"], request);
  if (authorization.response) return authorization.response;

  const session = { user: authorization.user };
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
    const patient = await executeQuery(`SELECT email FROM users WHERE id = $1 AND role = 'PATIENT'`, [booking.user_id]);
    if (!patient.isConnected) throw new Error('Patient account unavailable.');
    if (!isEmailAddress(patient.rows[0]?.email)) {
      return NextResponse.json({ error: 'The patient account has no valid email address. Ask the patient to correct their account before accepting this request.' }, { status: 409 });
    }
    if (booking.payment_status !== 'PAID') {
      const body = await request.json().catch(() => ({}));
      const receipt = await executeQuery(`SELECT booking_id FROM payment_receipts WHERE booking_id = $1`, [id]);
      if (!receipt.isConnected) throw new Error('Receipt storage unavailable.');
      if (booking.payment_status !== 'UNDER_REVIEW' || !receipt.rows.length || body.paymentVerified !== true) {
        return NextResponse.json({ error: 'Review the receipt and confirm that the payment was received before accepting.' }, { status: 400 });
      }
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
           appointment_starts_at = $3::timestamptz, scheduled_date = $4,
           payment_status = 'PAID', payment_verified_at = COALESCE(payment_verified_at, NOW()), payment_verified_by = COALESCE(payment_verified_by, $2)
         WHERE id = $1 AND partner_id = $2 AND doctor_confirmed_at IS NULL
           AND status IN ('PENDING', 'ASSIGNED', 'CONFIRMED') AND $3::timestamptz > NOW()
           AND (payment_status = 'PAID' OR (payment_status = 'UNDER_REVIEW'
             AND EXISTS (SELECT 1 FROM payment_receipts r WHERE r.booking_id = bookings.id)))
         RETURNING *
       ), queued AS (
         INSERT INTO appointment_emails (booking_id, partner_id, confirmed_at, kind, due_at)
         SELECT c.id, c.partner_id, c.doctor_confirmed_at, k.kind,
           CASE WHEN k.kind = 'PATIENT_CONFIRMATION' THEN NOW()
             ELSE c.appointment_starts_at - INTERVAL '15 minutes' END
         FROM confirmed c CROSS JOIN (VALUES ('PATIENT_CONFIRMATION'), ('DOCTOR_REMINDER')) k(kind)
         ON CONFLICT DO NOTHING RETURNING id
       ), invoiced AS (
         INSERT INTO invoices (id, booking_id, user_id, invoice_number, service_title, subtotal, tax_amount, total_paid, payment_ref)
         SELECT 'inv_' || c.id, c.id, c.user_id, 'INV-' || c.booking_number, c.service_title,
           ROUND(c.total_amount / 1.18, 2), c.total_amount - ROUND(c.total_amount / 1.18, 2), c.total_amount, c.payment_ref
         FROM confirmed c WHERE NOT EXISTS (SELECT 1 FROM invoices i WHERE i.booking_id = c.id)
         RETURNING id
       ) SELECT * FROM confirmed`, [id, user.id, startsAt, date],
    );
    if (!confirmed.isConnected) throw new Error('Could not save confirmation.');
    if (!confirmed.rows.length) {
      return NextResponse.json({ error: 'The appointment changed. Refresh the queue.' }, { status: 409 });
    }

    let emailSent = false;
    try {
      emailSent = (await processAppointmentEmails(id)).sentKinds.includes('PATIENT_CONFIRMATION');
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
