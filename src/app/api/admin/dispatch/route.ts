import { NextResponse } from 'next/server';
import { executeQuery, isDbConfigured } from '@/lib/db';
import { sendDoctorAppointmentEmail } from '@/lib/email';

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
    const body = await request.json();
    const { bookingId, status, partnerId, partnerName, partnerTitle } = body;

    if (!bookingId) {
      return NextResponse.json({ error: 'Booking ID is required' }, { status: 400 });
    }

    if (isDbConfigured) {
      const updateRes = await executeQuery(
        `UPDATE bookings
         SET status = COALESCE($1, status),
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
            sendDoctorAppointmentEmail({
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
