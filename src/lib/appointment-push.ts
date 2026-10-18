import { randomUUID } from 'node:crypto';
import { executeQuery } from './db';
import { ensureAppointmentSchema } from './appointment-schema';
import { ensurePushSchema } from './push-schema';
import { pushConfigured } from './push-config';
import { firebaseMessaging } from './firebase-admin';

// Check current booking ownership, account role, approval and password revocation at send time.
const eligible = `s.user_id = d.user_id AND s.role = u.role
  AND s.updated_at > NOW() - INTERVAL '30 days'
  AND (u.password_changed_at IS NULL OR u.password_changed_at < s.authorized_at)
  AND ((s.role = 'PATIENT' AND b.user_id = d.user_id AND d.kind LIKE 'PATIENT_%')
    OR (s.role = 'PARTNER' AND b.partner_id = d.user_id AND d.kind LIKE 'DOCTOR_%'
      AND EXISTS (SELECT 1 FROM partner_profiles p WHERE p.user_id = d.user_id AND p.verification_status = 'APPROVED')))
  AND ((d.event_id IS NOT NULL AND v.user_id = b.user_id AND v.partner_id IS NOT DISTINCT FROM b.partner_id
      AND v.status = b.status AND v.created_at > NOW() - INTERVAL '15 minutes')
    OR (b.appointment_starts_at > NOW() AND (
    (d.kind = 'PATIENT_REQUEST' AND b.doctor_confirmed_at IS NULL AND b.status IN ('PENDING', 'ASSIGNED'))
    OR (d.kind = 'DOCTOR_REMINDER' AND d.reminder_confirmed_at = b.doctor_confirmed_at
      AND d.reminder_starts_at = b.appointment_starts_at AND b.status IN ('CONFIRMED', 'ASSIGNED', 'ON_THE_WAY')
      AND d.reminder_minutes = ANY(COALESCE(prefs.minutes, ARRAY[60,30,15]))
      AND b.appointment_starts_at - d.reminder_minutes * INTERVAL '1 minute' >= GREATEST(b.doctor_confirmed_at, COALESCE(prefs.updated_at, '-infinity'::timestamptz))
      AND b.appointment_starts_at - d.reminder_minutes * INTERVAL '1 minute' > NOW() - INTERVAL '5 minutes')
    OR (b.partner_id = e.partner_id AND (
      (d.kind = 'DOCTOR_REVIEW' AND b.doctor_confirmed_at IS NULL AND b.status IN ('PENDING', 'ASSIGNED'))
      OR (d.kind IN ('PATIENT_CONFIRMATION', 'PATIENT_REMINDER')
        AND b.doctor_confirmed_at = e.confirmed_at AND b.status IN ('CONFIRMED', 'ASSIGNED', 'ON_THE_WAY', 'ARRIVED')))))))`;

const joins = `JOIN push_subscriptions s ON s.id = d.subscription_id
  JOIN users u ON u.id = s.user_id JOIN bookings b ON b.id = d.booking_id
  LEFT JOIN appointment_emails e ON e.id = d.email_id
  LEFT JOIN appointment_status_events v ON v.id = d.event_id AND v.booking_id = b.id
  LEFT JOIN doctor_reminder_preferences prefs ON prefs.user_id = b.partner_id`;

export function pushContent(kind: string, bookingId: string, reminderMinutes = 15) {
  const messages: Record<string, [string, string]> = {
    PATIENT_REQUEST: ['Request received', 'Your appointment request is awaiting review.'],
    PATIENT_CONFIRMATION: ['Appointment accepted', 'Your appointment has been accepted. Open HomeDigo for details.'],
    PATIENT_CANCELLED: ['Appointment cancelled', 'Your appointment request was declined or cancelled. Open HomeDigo for details.'],
    PATIENT_REMINDER: ['Upcoming appointment', 'Your appointment starts in about 15 minutes.'],
    PATIENT_ON_THE_WAY: ['Clinician on the way', 'Your clinician has started travelling to your visit. Open HomeDigo to track progress.'],
    PATIENT_ARRIVED: ['Your clinician is nearby', 'Your clinician has reached the area near your visit address. Open HomeDigo for the arrival update.'],
    PATIENT_IN_PROGRESS: ['Visit started', 'Your home visit is now in progress.'],
    PATIENT_COMPLETED: ['Visit completed', 'Your home visit is complete. Open HomeDigo for the visit summary.'],
    DOCTOR_REVIEW: ['New appointment request', 'An appointment request is waiting for your review.'],
    DOCTOR_REMINDER: ['Upcoming visit', `Your visit starts in about ${reminderMinutes} minutes. Open HomeDigo for details.`],
  };
  const message = messages[kind];
  if (!message) throw new Error('Unknown notification kind');
  return { title: message[0], body: message[1],
    path: kind.startsWith('PATIENT_') ? `/patient/appointments/${encodeURIComponent(bookingId)}` : `/partner/visit/${encodeURIComponent(bookingId)}` };
}

async function query<T = Record<string, unknown>>(sql: string, values: unknown[] = []) {
  const result = await executeQuery<T>(sql, values);
  if (!result.isConnected) throw new Error('Push storage unavailable');
  return result.rows;
}

export async function processAppointmentPush(bookingId?: string) {
  if (!pushConfigured()) return { enabled: false, sent: 0, failed: 0, skipped: 0 };
  await ensureAppointmentSchema();
  await ensurePushSchema();
  // The durable booking/email events are the source of truth, independent of email delivery.
  // Reminders fan out to both the patient and the assigned doctor.
  await query(`INSERT INTO appointment_push_deliveries
    (source_key, email_id, booking_id, subscription_id, user_id, kind, due_at)
    SELECT 'email:' || e.id || ':' || recipients.kind, e.id, b.id, s.id, s.user_id, recipients.kind,
      CASE WHEN e.kind = 'DOCTOR_REMINDER' THEN b.appointment_starts_at - INTERVAL '15 minutes' ELSE e.confirmed_at END
    FROM appointment_emails e JOIN bookings b ON b.id = e.booking_id
    CROSS JOIN LATERAL (
      SELECT e.kind AS kind, CASE WHEN e.kind LIKE 'PATIENT_%' THEN b.user_id ELSE e.partner_id END AS user_id WHERE e.kind <> 'DOCTOR_REMINDER'
      UNION ALL SELECT 'PATIENT_REMINDER', b.user_id WHERE e.kind = 'DOCTOR_REMINDER'
    ) recipients
    JOIN push_subscriptions s ON s.user_id = recipients.user_id
    WHERE b.appointment_starts_at > NOW() AND s.updated_at > NOW() - INTERVAL '30 days'
      AND s.created_at <= CASE WHEN e.kind = 'DOCTOR_REMINDER' THEN b.appointment_starts_at - INTERVAL '15 minutes' ELSE e.confirmed_at END
      AND ($1::text IS NULL OR b.id = $1)
    ON CONFLICT (source_key, subscription_id, user_id) DO NOTHING`, [bookingId || null]);
  await query(`INSERT INTO appointment_push_deliveries
    (source_key, event_id, booking_id, subscription_id, user_id, kind, due_at)
    SELECT 'status:' || v.id, v.id, b.id, s.id, b.user_id, 'PATIENT_' || v.status, v.created_at
    FROM appointment_status_events v JOIN bookings b ON b.id = v.booking_id
    JOIN push_subscriptions s ON s.user_id = b.user_id AND s.role = 'PATIENT'
    WHERE v.status = b.status AND v.user_id = b.user_id AND v.partner_id IS NOT DISTINCT FROM b.partner_id
      AND v.created_at > NOW() - INTERVAL '15 minutes' AND s.created_at <= v.created_at
      AND s.updated_at > NOW() - INTERVAL '30 days' AND ($1::text IS NULL OR b.id = $1)
    ON CONFLICT (source_key, subscription_id, user_id) DO NOTHING`, [bookingId || null]);

  // One durable job per confirmation, visit time and chosen interval. Missed intervals
  // are skipped rather than sending a burst when a visit is accepted late.
  await query(`INSERT INTO appointment_push_deliveries AS existing
    (source_key, booking_id, subscription_id, user_id, kind, due_at, reminder_minutes, reminder_confirmed_at, reminder_starts_at)
    SELECT 'reminder:' || b.id || ':' || EXTRACT(EPOCH FROM b.doctor_confirmed_at) || ':' || EXTRACT(EPOCH FROM b.appointment_starts_at) || ':' || lead.minutes,
      b.id, s.id, b.partner_id, 'DOCTOR_REMINDER', b.appointment_starts_at - lead.minutes * INTERVAL '1 minute',
      lead.minutes, b.doctor_confirmed_at, b.appointment_starts_at
    FROM bookings b LEFT JOIN doctor_reminder_preferences prefs ON prefs.user_id = b.partner_id
    CROSS JOIN LATERAL unnest(COALESCE(prefs.minutes, ARRAY[60,30,15])) AS lead(minutes)
    JOIN push_subscriptions s ON s.user_id = b.partner_id AND s.role = 'PARTNER'
    WHERE b.doctor_confirmed_at IS NOT NULL AND b.appointment_starts_at > NOW()
      AND b.status IN ('CONFIRMED', 'ASSIGNED', 'ON_THE_WAY')
      AND b.appointment_starts_at - lead.minutes * INTERVAL '1 minute' >= GREATEST(b.doctor_confirmed_at, COALESCE(prefs.updated_at, '-infinity'::timestamptz), s.created_at)
      AND b.appointment_starts_at - lead.minutes * INTERVAL '1 minute' > NOW() - INTERVAL '5 minutes'
      AND NOT EXISTS (SELECT 1 FROM appointment_push_deliveries old JOIN appointment_emails old_email ON old_email.id = old.email_id
        WHERE old.booking_id = b.id AND old.subscription_id = s.id AND old.user_id = b.partner_id
          AND old.kind = 'DOCTOR_REMINDER' AND old.sent_at IS NOT NULL AND lead.minutes = 15
          AND old_email.confirmed_at = b.doctor_confirmed_at)
      AND s.updated_at > NOW() - INTERVAL '30 days' AND ($1::text IS NULL OR b.id = $1)
    ON CONFLICT (source_key, subscription_id, user_id) DO UPDATE SET discarded_at = NULL
      WHERE existing.sent_at IS NULL AND existing.discarded_at IS NOT NULL AND EXCLUDED.due_at > NOW()`, [bookingId || null]);

  // Do not leave obsolete reminders/reassigned deliveries retrying forever.
  await query(`UPDATE appointment_push_deliveries d SET discarded_at = NOW(), lease_token = NULL, lease_until = NULL
    WHERE d.sent_at IS NULL AND d.discarded_at IS NULL AND (d.lease_until IS NULL OR d.lease_until < NOW())
      AND NOT EXISTS (SELECT 1 FROM appointment_push_deliveries current ${joins.replaceAll('d.', 'current.')}
        WHERE current.id = d.id AND ${eligible.replaceAll('d.', 'current.')})`);
  const lease = randomUUID();
  const jobs = await query<{ id: string; subscription_id: string; user_id: string; booking_id: string; kind: string; fid: string; reminder_minutes: number }>(
    `WITH candidates AS (
      SELECT d.id FROM appointment_push_deliveries d ${joins}
      WHERE d.sent_at IS NULL AND d.discarded_at IS NULL AND d.due_at <= NOW() AND d.attempts < 10
        AND (d.lease_until IS NULL OR d.lease_until < NOW()) AND ${eligible}
        AND ($1::text IS NULL OR d.booking_id = $1)
      ORDER BY d.due_at, d.id LIMIT 20 FOR UPDATE OF d SKIP LOCKED
    ), claimed AS (
      UPDATE appointment_push_deliveries d SET lease_token = $2, lease_until = NOW() + INTERVAL '5 minutes', attempts = attempts + 1
      FROM candidates c WHERE d.id = c.id RETURNING d.*
    ) SELECT c.*, s.fid FROM claimed c JOIN push_subscriptions s ON s.id = c.subscription_id`, [bookingId || null, lease]);

  const results = await Promise.all(jobs.map(async job => {
    const current = await query(`SELECT d.id FROM appointment_push_deliveries d ${joins}
      WHERE d.id = $1 AND d.lease_token = $2 AND ${eligible}`, [job.id, lease]);
    if (!current.length) {
      await query('UPDATE appointment_push_deliveries SET discarded_at = NOW(), lease_token = NULL, lease_until = NULL WHERE id = $1 AND lease_token = $2', [job.id, lease]);
      return 'skipped';
    }
    try {
      const content = pushContent(job.kind, job.booking_id, job.reminder_minutes ?? 15);
      // Generic messages only: no patient names, addresses, conditions, receipts or auth tokens.
      await firebaseMessaging().send({ fid: job.fid, data: { ...content, tag: `homedigo-${job.id}` },
        webpush: { headers: { TTL: '300', Urgency: 'normal' } } });
      await query('UPDATE appointment_push_deliveries SET sent_at = NOW(), lease_token = NULL, lease_until = NULL, last_error = NULL WHERE id = $1 AND lease_token = $2', [job.id, lease]);
      return 'sent';
    } catch (error) {
      const code = typeof error === 'object' && error !== null && 'code' in error ? String(error.code) : 'push/unavailable';
      if (['messaging/installation-id-not-registered', 'messaging/registration-token-not-registered', 'messaging/invalid-registration-token'].includes(code)) {
        await query('DELETE FROM push_subscriptions WHERE id = $1 AND user_id = $2 AND fid = $3', [job.subscription_id, job.user_id, job.fid]);
      } else {
        await query(`UPDATE appointment_push_deliveries SET due_at = NOW() + INTERVAL '1 minute' * LEAST(attempts, 15),
          lease_token = NULL, lease_until = NULL, last_error = $3 WHERE id = $1 AND lease_token = $2`, [job.id, lease, code.slice(0, 100)]);
      }
      return 'failed';
    }
  }));
  return { enabled: true, sent: results.filter(result => result === 'sent').length,
    failed: results.filter(result => result === 'failed').length, skipped: results.filter(result => result === 'skipped').length };
}

export async function processAppointmentPushSafely(bookingId?: string) {
  try { return await processAppointmentPush(bookingId); }
  catch {
    console.error('[APPOINTMENT PUSH] Delivery deferred; scheduler will retry.');
    return { enabled: pushConfigured(), sent: 0, failed: 1, skipped: 0 };
  }
}
