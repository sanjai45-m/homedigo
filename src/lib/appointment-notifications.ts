import { randomUUID } from 'node:crypto';
import { executeQuery } from './db';
import { sendAppointmentConfirmationEmail, sendDoctorReminderEmail } from './email';
import { ensureAppointmentSchema } from './appointment-schema';

interface EmailJob {
  id: string;
  kind: 'PATIENT_CONFIRMATION' | 'DOCTOR_REMINDER';
  booking_id: string;
  booking_number: string;
  patient_name: string;
  doctor_name: string;
  patient_email: string | null;
  doctor_email: string | null;
  service_title: string;
  scheduled_date: string;
  scheduled_time_slot: string;
}

export async function processAppointmentEmails(bookingId?: string) {
  await ensureAppointmentSchema();
  const token = randomUUID();
  // Claim in one statement. Overlapping cron calls and repeated clicks cannot
  // send the same job concurrently. An interrupted process releases after 5 min.
  const claimed = await executeQuery<EmailJob>(
    `WITH candidates AS (
       SELECT e.id FROM appointment_emails e
       JOIN bookings b ON b.id = e.booking_id
       WHERE e.sent_at IS NULL AND e.due_at <= NOW()
         AND (e.lease_until IS NULL OR e.lease_until < NOW())
         AND b.partner_id = e.partner_id AND b.doctor_confirmed_at = e.confirmed_at
         AND b.status IN ('CONFIRMED', 'ASSIGNED', 'ON_THE_WAY', 'ARRIVED')
         AND b.appointment_starts_at > NOW()
         AND ($1::text IS NULL OR (e.booking_id = $1 AND e.kind = 'PATIENT_CONFIRMATION'))
       ORDER BY e.due_at, e.id
       LIMIT 10 FOR UPDATE OF e SKIP LOCKED
     ), claimed AS (
       UPDATE appointment_emails e
       SET lease_until = NOW() + INTERVAL '5 minutes', lease_token = $2,
           attempts = attempts + 1
       FROM candidates c WHERE e.id = c.id RETURNING e.*
     )
     SELECT c.id, c.kind, c.booking_id, b.booking_number, b.patient_name,
            d.name AS doctor_name, d.email AS doctor_email, p.email AS patient_email,
            b.service_title, b.scheduled_date, b.scheduled_time_slot
     FROM claimed c JOIN bookings b ON b.id = c.booking_id
     LEFT JOIN users d ON d.id = c.partner_id
     LEFT JOIN users p ON p.id = b.user_id`,
    [bookingId || null, token],
  );
  if (!claimed.isConnected) throw new Error('Could not claim appointment emails.');

  const outcomes = await Promise.all(claimed.rows.map(async (job) => {
    // Recheck just before sending in case the appointment was cancelled,
    // reassigned or started after it was claimed.
    const current = await executeQuery(
      `SELECT e.id FROM appointment_emails e JOIN bookings b ON b.id = e.booking_id
       WHERE e.id = $1 AND e.lease_token = $2 AND e.sent_at IS NULL
         AND b.partner_id = e.partner_id AND b.doctor_confirmed_at = e.confirmed_at
         AND b.status IN ('CONFIRMED', 'ASSIGNED', 'ON_THE_WAY', 'ARRIVED')
         AND b.appointment_starts_at > NOW()`, [job.id, token],
    );
    if (!current.isConnected) throw new Error('Could not verify appointment email.');
    if (!current.rows.length) return 'skipped';

    const to = job.kind === 'PATIENT_CONFIRMATION' ? job.patient_email : job.doctor_email;
    const send = job.kind === 'PATIENT_CONFIRMATION' ? sendAppointmentConfirmationEmail : sendDoctorReminderEmail;
    const result = to ? await send({
      to,
      bookingId: job.booking_id,
      bookingNumber: job.booking_number,
      patientName: job.patient_name,
      doctorName: job.doctor_name,
      serviceTitle: job.service_title,
      scheduledDate: job.scheduled_date,
      scheduledTimeSlot: job.scheduled_time_slot,
    }) : { success: false as const, code: 'RECIPIENT_MISSING' };

    const saved = await executeQuery(
      result.success
        ? `UPDATE appointment_emails SET sent_at = NOW(), lease_until = NULL, lease_token = NULL, last_error = NULL
           WHERE id = $1 AND lease_token = $2`
        : `UPDATE appointment_emails SET due_at = NOW() + INTERVAL '1 minute',
             lease_until = NULL, lease_token = NULL, last_error = $3
           WHERE id = $1 AND lease_token = $2`,
      result.success ? [job.id, token] : [job.id, token, result.code],
    );
    if (!saved.isConnected) throw new Error('Could not record appointment email delivery.');
    return result.success ? 'sent' : 'failed';
  }));
  return {
    processed: outcomes.length,
    sent: outcomes.filter(value => value === 'sent').length,
    failed: outcomes.filter(value => value === 'failed').length,
    skipped: outcomes.filter(value => value === 'skipped').length,
  };
}
