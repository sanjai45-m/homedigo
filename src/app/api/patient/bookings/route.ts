import { requireApiUser } from '@/lib/api-auth';
import { randomUUID } from 'node:crypto';
import { NextResponse } from 'next/server';
import { executeQuery, isDbConfigured } from '@/lib/db';
import { appointmentDate, appointmentStart } from '@/lib/appointment-time';
import { ensureAppointmentSchema } from '@/lib/appointment-schema';
import { processAppointmentNotifications as processAppointmentEmails } from '@/lib/appointment-notifications';
import { validateReceipt } from '@/lib/payment';
import { isEmailAddress } from '@/lib/email';

export const maxDuration = 60;

export async function GET() {
  const authorization = await requireApiUser(["PATIENT"]);
  if (authorization.response) return authorization.response;

  const session = { user: authorization.user };
  const userId = (session?.user as { id?: string } | undefined)?.id;
  if (!userId) return NextResponse.json({ error: 'Please sign in.' }, { status: 401 });
  const result = await executeQuery(`SELECT * FROM bookings WHERE user_id = $1 ORDER BY created_at DESC`, [userId]);
  return NextResponse.json({ bookings: result.rows });
}

export async function POST(request: Request) {
  const authorization = await requireApiUser(["PATIENT"], request);
  if (authorization.response) return authorization.response;

  try {
    const session = { user: authorization.user };
    const user = session?.user as { id?: string; role?: string } | undefined;
    if (!user?.id || user.role !== 'PATIENT') return NextResponse.json({ error: 'Please sign in as a patient.' }, { status: 401 });
    if (!isDbConfigured) return NextResponse.json({ error: 'Booking storage is unavailable.' }, { status: 503 });
    if (Number(request.headers?.get('content-length') || 0) > 3 * 1024 * 1024) {
      return NextResponse.json({ error: 'Upload a screenshot up to 2 MB.' }, { status: 413 });
    }
    const body = await request.json();
    const { patientProfileId, addressId, serviceId, partnerId, scheduledDate, scheduledTimeSlot, requestKey, paymentMethod } = body;
    if (![patientProfileId, addressId, serviceId, requestKey].every(v => typeof v === 'string' && v.length > 0 && v.length <= 64)
      || !['GPAY', 'PHONEPE', 'UPI'].includes(paymentMethod)) {
      return NextResponse.json({ error: 'Select a patient, address, service and payment app.' }, { status: 400 });
    }
    await ensureAppointmentSchema();
    const existing = await executeQuery(`SELECT * FROM bookings WHERE user_id = $1 AND booking_request_key = $2`, [user.id, requestKey]);
    if (!existing.isConnected) throw new Error('Storage unavailable');
    if (existing.rows.length) return NextResponse.json({ success: true, booking: existing.rows[0] });
    const account = await executeQuery(`SELECT email FROM users WHERE id = $1 AND role = 'PATIENT'`, [user.id]);
    if (!account.isConnected) throw new Error('Storage unavailable');
    if (!isEmailAddress(account.rows[0]?.email)) {
      return NextResponse.json({ error: 'Your patient account needs a valid email address before booking. Please update your account or sign in again.' }, { status: 409 });
    }
    let receipt;
    let date: string;
    let startsAt: string;
    try {
      receipt = validateReceipt(body.paymentReceipt);
      date = appointmentDate(scheduledDate);
      startsAt = appointmentStart(date, scheduledTimeSlot);
      if (Date.parse(startsAt) <= Date.now()) throw new Error('Please choose a future appointment time.');
    } catch (error) {
      return NextResponse.json({ error: error instanceof Error ? error.message : 'Invalid payment or appointment details.' }, { status: 400 });
    }
    const [profileRes, addressRes, serviceRes, doctorRes] = await Promise.all([
      executeQuery(`SELECT * FROM patient_profiles WHERE id = $1 AND user_id = $2`, [patientProfileId, user.id]),
      executeQuery(`SELECT * FROM addresses WHERE id = $1 AND user_id = $2`, [addressId, user.id]),
      executeQuery(`SELECT * FROM services WHERE id = $1 AND is_active = TRUE`, [serviceId]),
      executeQuery(`SELECT u.id, u.name, u.email, u.image, p.specialization, p.consultation_fee
        FROM users u LEFT JOIN partner_profiles p ON p.user_id = u.id WHERE u.id = $1 AND u.role = 'PARTNER' AND p.verification_status = 'APPROVED'`, [partnerId || null]),
    ]);
    if ([profileRes, addressRes, serviceRes, doctorRes].some(r => !r.isConnected)) throw new Error('Storage unavailable');
    const profile = profileRes.rows[0], address = addressRes.rows[0], service = serviceRes.rows[0], doctor = doctorRes.rows[0];
    if (!profile || !address || !service || ((serviceId === 'srv_doc' || partnerId) && !doctor?.email)) {
      return NextResponse.json({ error: 'Please select a valid patient, address, service and available doctor.' }, { status: 400 });
    }
    const amount = Number(((serviceId === 'srv_doc' && doctor?.consultation_fee != null ? Number(doctor.consultation_fee) : Number(service.base_price)) + Number(service.visiting_fee || 0)).toFixed(2));
    if (!Number.isFinite(amount) || amount <= 0 || Math.abs(Number(body.totalAmount) - amount) > 0.01 || !Number.isFinite(Number(body.totalAmount))) {
      return NextResponse.json({ error: 'The consultation fee has changed. Refresh and check the amount before paying.' }, { status: 409 });
    }
    const paymentRef = typeof body.paymentRef === 'string' ? body.paymentRef.trim() : '';
    if (paymentRef.length > 64) return NextResponse.json({ error: 'Transaction reference must be at most 64 characters.' }, { status: 400 });
    const id = `bk_${randomUUID()}`;
    // Receipt, request and both notification jobs commit together. Retries reuse the request key.
    const saved = await executeQuery(
      `WITH created AS (
        INSERT INTO bookings (id, booking_number, user_id, patient_profile_id, patient_name, address_id, address_text,
          service_id, service_title, partner_id, partner_name, partner_title, partner_img,
          scheduled_date, scheduled_time_slot, status, total_amount, payment_status, payment_method, payment_ref,
          clinical_instructions, patient_lat, patient_lng, appointment_starts_at, booking_request_key)
        VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11,$12,$13,$14,$15,'PENDING',$16,'UNDER_REVIEW',$17,$18,$19,$20,$21,$22,$23)
        ON CONFLICT (user_id, booking_request_key) DO NOTHING RETURNING *
      ), receipt AS (
        INSERT INTO payment_receipts (booking_id, mime_type, image_base64) SELECT id, $24, $25 FROM created RETURNING booking_id
      ), queued AS (
        INSERT INTO appointment_emails (booking_id, partner_id, confirmed_at, kind, due_at)
        SELECT c.id, c.partner_id, c.created_at, k.kind, NOW() FROM created c
        CROSS JOIN (VALUES ('DOCTOR_REVIEW'), ('PATIENT_REQUEST')) k(kind)
        WHERE k.kind = 'PATIENT_REQUEST' OR c.partner_id IS NOT NULL RETURNING id
      ) SELECT * FROM created`,
      [id, `HD-${randomUUID().slice(0, 18).toUpperCase()}`, user.id, profile.id, profile.full_name, address.id,
        [address.address_line1, address.address_line2, address.city, address.pincode].filter(Boolean).join(', '),
        service.id, service.title, doctor?.id || null, doctor?.name || null, doctor?.specialization || null, doctor?.image || null,
        date, scheduledTimeSlot, amount, paymentMethod, paymentRef || null,
        typeof body.clinicalInstructions === 'string' ? body.clinicalInstructions.slice(0, 5000) : '',
        address.lat, address.lng, startsAt, requestKey, receipt.mime, receipt.base64],
    );
    if (!saved.isConnected) throw new Error('Could not save booking');
    const booking = saved.rows[0] || (await executeQuery(`SELECT * FROM bookings WHERE user_id = $1 AND booking_request_key = $2`, [user.id, requestKey])).rows[0];
    if (!booking) throw new Error('Could not save booking');
    try { await processAppointmentEmails(booking.id); } catch { console.error('[APPOINTMENT EMAIL] Booking emails queued for retry.'); }
    return NextResponse.json({ success: true, booking, message: 'Receipt submitted. Your doctor will verify payment before accepting the appointment.' });
  } catch {
    return NextResponse.json({ error: 'Could not save your request. Please retry with the same receipt; do not pay again.' }, { status: 503 });
  }
}
