import { requireApiUser } from '@/lib/api-auth';
import { NextResponse } from 'next/server';
import { executeQuery, executePartnerQuery, isDbConfigured } from '@/lib/db';
import { sendDoctorAppointmentEmail } from '@/lib/email';
import { ensureDoctorScheduleSchema, readDoctorSlots } from '@/lib/doctor-schedule-store';

export const maxDuration = 60;

export async function GET() {
  const authorization = await requireApiUser(["ADMIN","SUPER_ADMIN"]);
  if (authorization.response) return authorization.response;

  if (isDbConfigured) {
    const res = await executeQuery(
      `SELECT b.id, b.booking_number, b.patient_name, b.address_text, b.service_title, 
              b.partner_id, b.partner_name, b.scheduled_date, b.scheduled_time_slot, 
              b.status, b.total_amount, b.payment_status, b.created_at
       FROM bookings b
       ORDER BY b.created_at DESC`
    );
    if (res.isConnected) {
      return NextResponse.json({ bookings: res.rows || [] });
    }
  }

  return NextResponse.json({ bookings: [] });
}

export async function PUT(request: Request) {
  const authorization = await requireApiUser(["ADMIN","SUPER_ADMIN"], request);
  if (authorization.response) return authorization.response;

  try {
    const session = { user: authorization.user };
    if (!['ADMIN', 'SUPER_ADMIN'].includes((session?.user as { role?: string })?.role || '')) {
      return NextResponse.json({ error: 'Administrator access required.' }, { status: 403 });
    }
    const body = await request.json();
    const { bookingId, status, partnerId, partnerName, partnerTitle } = body;

    if (!bookingId) {
      return NextResponse.json({ error: 'Booking ID is required' }, { status: 400 });
    }
    if (status === 'CONFIRMED') {
      return NextResponse.json({ error: 'The assigned doctor must confirm availability from their dashboard.' }, { status: 400 });
    }

    if (isDbConfigured) {
      await ensureDoctorScheduleSchema();
      let assignedSlot;
      let scheduleVersion: string | null = null;
      if (partnerId) {
        const partner = await executeQuery(`SELECT u.id FROM users u
          JOIN partner_profiles p ON p.user_id = u.id
          WHERE u.id = $1 AND u.role = 'PARTNER' AND p.verification_status = 'APPROVED'`, [partnerId]);
        if (!partner.isConnected) return NextResponse.json({ error: 'Storage is unavailable.' }, { status: 503 });
        if (!partner.rows.length) return NextResponse.json({ error: 'Select an approved clinician.' }, { status: 400 });
        const current = await executeQuery('SELECT * FROM bookings WHERE id = $1', [bookingId]);
        if (!current.isConnected) return NextResponse.json({ error: 'Storage is unavailable.' }, { status: 503 });
        if (!current.rows[0]) return NextResponse.json({ error: 'Appointment not found.' }, { status: 404 });
        if (current.rows[0].partner_id !== partnerId) {
          let available;
          try { available = await readDoctorSlots(partnerId, current.rows[0].scheduled_date); }
          catch { return NextResponse.json({ error: 'The appointment date or clinician schedule is unavailable.' }, { status: 409 }); }
          assignedSlot = available?.slots.find(slot => slot.available && slot.label === current.rows[0].scheduled_time_slot);
          if (!assignedSlot) return NextResponse.json({ error: 'This clinician is not available at the appointment time. Choose another clinician.' }, { status: 409 });
          scheduleVersion = available!.version;
        }
      }
      const updateRes = await executePartnerQuery(partnerId || null,
        `UPDATE bookings AS target
         SET status = CASE WHEN $2::text IS NOT NULL AND partner_id IS DISTINCT FROM $2 THEN 'ASSIGNED'
                           ELSE COALESCE($1, status) END,
             doctor_confirmed_at = CASE WHEN $2::text IS NOT NULL AND partner_id IS DISTINCT FROM $2 THEN NULL
                                        ELSE doctor_confirmed_at END,
             partner_lat = CASE WHEN $2::text IS NOT NULL AND partner_id IS DISTINCT FROM $2 THEN NULL ELSE partner_lat END,
             partner_lng = CASE WHEN $2::text IS NOT NULL AND partner_id IS DISTINCT FROM $2 THEN NULL ELSE partner_lng END,
             partner_location_updated_at = CASE WHEN $2::text IS NOT NULL AND partner_id IS DISTINCT FROM $2 THEN NULL ELSE partner_location_updated_at END,
             partner_location_accuracy = CASE WHEN $2::text IS NOT NULL AND partner_id IS DISTINCT FROM $2 THEN NULL ELSE partner_location_accuracy END,
             partner_id = COALESCE($2, partner_id),
             partner_name = COALESCE($3, partner_name),
             partner_title = COALESCE($4, partner_title),
             appointment_ends_at = COALESCE($6::timestamptz, appointment_ends_at),
             slot_reserved_until = COALESCE($7::timestamptz, slot_reserved_until)
         WHERE id = $5 AND ($8::text IS NULL OR (
           EXISTS (SELECT 1 FROM partner_profiles p JOIN doctor_schedules s ON s.user_id = p.user_id
             WHERE p.user_id = $2 AND p.availability = 'AVAILABLE' AND p.verification_status = 'APPROVED' AND s.version = $8)
           AND target.appointment_starts_at > clock_timestamp()
           AND NOT EXISTS (SELECT 1 FROM bookings occupied WHERE occupied.partner_id = $2 AND occupied.id <> $5
             AND occupied.status NOT IN ('CANCELLED', 'COMPLETED') AND occupied.appointment_starts_at < $7::timestamptz
             AND COALESCE(occupied.slot_reserved_until, occupied.appointment_ends_at, occupied.appointment_starts_at + INTERVAL '1 hour') > target.appointment_starts_at)
         ))
         RETURNING *`,
        [status, partnerId, partnerName, partnerTitle, bookingId, assignedSlot?.end || null, assignedSlot?.reservedUntil || null, scheduleVersion]
      );

      if (updateRes.isConnected && updateRes.rows.length > 0) {
        const booking = updateRes.rows[0];

        // Notify Doctor via Email if partner assigned
        if (partnerId) {
          const docRes = await executeQuery(`SELECT email, name FROM users WHERE id = $1 LIMIT 1`, [partnerId]);
          if (docRes.isConnected && docRes.rows.length > 0 && docRes.rows[0].email) {
            await sendDoctorAppointmentEmail({
              bookingId: booking.id,
              doctorEmail: docRes.rows[0].email,
              doctorName: docRes.rows[0].name || partnerName || 'Practitioner',
              patientName: booking.patient_name || 'Patient',
              serviceTitle: booking.service_title || 'Home Visit',
              scheduledDate: booking.scheduled_date || 'Today',
              scheduledTimeSlot: booking.scheduled_time_slot || 'Standard Slot',
              addressText: booking.address_text || 'Patient Location',
              bookingNumber: booking.booking_number || bookingId,
              totalAmount: Number(booking.total_amount || 0),
            }).catch((e) => console.error('Dispatch Email Error:', e));
          }
        }

        return NextResponse.json({ success: true, booking });
      }
      if (updateRes.isConnected) return NextResponse.json({ error: 'The appointment or clinician availability changed. Refresh and try again.' }, { status: 409 });
    }

    return NextResponse.json({ error: 'Booking dispatch could not be saved.' }, { status: 503 });
  } catch (err: any) {
    return NextResponse.json({ error: err.message || 'Failed to update dispatch' }, { status: 500 });
  }
}
