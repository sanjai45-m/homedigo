import { NextResponse } from 'next/server';
import { executeQuery, isDbConfigured } from '@/lib/db';
import { sendDoctorAppointmentEmail } from '@/lib/email';
import { ensureAppointmentSchema } from '@/lib/appointment-schema';
import { getServerSession } from 'next-auth/next';
import { authOptions } from '@/lib/auth';

export const maxDuration = 60;

export async function GET() {
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
  try {
    const session = await getServerSession(authOptions);
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
      await ensureAppointmentSchema();
      const updateRes = await executeQuery(
        `UPDATE bookings
         SET status = CASE WHEN $2::text IS NOT NULL AND partner_id IS DISTINCT FROM $2 THEN 'ASSIGNED'
                           ELSE COALESCE($1, status) END,
             doctor_confirmed_at = CASE WHEN $2::text IS NOT NULL AND partner_id IS DISTINCT FROM $2 THEN NULL
                                        ELSE doctor_confirmed_at END,
             partner_id = COALESCE($2, partner_id),
             partner_name = COALESCE($3, partner_name),
             partner_title = COALESCE($4, partner_title)
         WHERE id = $5
         RETURNING *`,
        [status, partnerId, partnerName, partnerTitle, bookingId]
      );

      if (updateRes.isConnected && updateRes.rows.length > 0) {
        const booking = updateRes.rows[0];

        // Notify Doctor via Email if partner assigned
        if (partnerId) {
          const docRes = await executeQuery(`SELECT email, name FROM users WHERE id = $1 LIMIT 1`, [partnerId]);
          if (docRes.isConnected && docRes.rows.length > 0 && docRes.rows[0].email) {
            await sendDoctorAppointmentEmail({
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
    }

    return NextResponse.json({ success: true, message: 'Booking dispatch updated successfully' });
  } catch (err: any) {
    return NextResponse.json({ error: err.message || 'Failed to update dispatch' }, { status: 500 });
  }
}
