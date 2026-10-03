import { NextResponse } from 'next/server';
import { executeQuery, isDbConfigured } from '@/lib/db';
import { sendDoctorAppointmentEmail } from '@/lib/email';
import { getServerSession } from 'next-auth/next';
import { authOptions } from '@/lib/auth';
import { appointmentDate, appointmentStart } from '@/lib/appointment-time';
import { ensureAppointmentSchema } from '@/lib/appointment-schema';

export const maxDuration = 60;

export async function GET() {
  const session = await getServerSession(authOptions);
  const userId = (session?.user as { id?: string } | undefined)?.id;
  if (!userId) return NextResponse.json({ error: 'Please sign in.' }, { status: 401 });

  if (isDbConfigured) {
    const res = await executeQuery(
      `SELECT id, booking_number, user_id, patient_profile_id, patient_name, address_id, address_text, 
              service_id, service_title, partner_id, partner_name, partner_title, partner_img, partner_rating,
              scheduled_date, scheduled_time_slot, status, total_amount, payment_status, payment_method, payment_ref, 
              clinical_instructions, vital_bp, vital_pulse, vital_spo2, vital_sugar, prescription_notes, created_at
       FROM bookings 
       WHERE user_id = $1 
       ORDER BY created_at DESC`,
      [userId]
    );
    if (res.isConnected) {
      return NextResponse.json({ bookings: res.rows || [] });
    }
  }

  return NextResponse.json({ bookings: [] });
}

export async function POST(request: Request) {
  try {
    const session = await getServerSession(authOptions);
    const userId = (session?.user as { id?: string } | undefined)?.id;
    if (!userId) return NextResponse.json({ error: 'Please sign in to book an appointment.' }, { status: 401 });
    if (!isDbConfigured) return NextResponse.json({ error: 'Booking storage is unavailable.' }, { status: 503 });
    const body = await request.json();
    const {
      patientProfileId = 'prof_001',
      patientName = 'Sanju K.',
      addressId = 'addr_001',
      addressText,
      serviceId,
      serviceTitle,
      totalAmount,
      scheduledDate = 'Today',
      scheduledTimeSlot = '10:00 AM - 11:00 AM',
      clinicalInstructions = '',
      partnerId,
      partnerName,
      partnerTitle,
      partnerImg,
    } = body;

    let normalizedDate: string;
    let startsAt: string;
    try {
      const reference = new Date();
      normalizedDate = appointmentDate(scheduledDate, reference);
      startsAt = appointmentStart(normalizedDate, scheduledTimeSlot, reference);
      if (Date.parse(startsAt) <= reference.getTime()) throw new Error('Please choose a future appointment time.');
    } catch (error) {
      return NextResponse.json({ error: error instanceof Error ? error.message : 'Invalid appointment date or time.' }, { status: 400 });
    }
    await ensureAppointmentSchema();

    const bookingId = `bk_${Date.now()}`;
    const bookingNumber = `HD-${Math.floor(1000 + Math.random() * 9000)}`;
    const paymentRef = `UPI/2026/${Math.floor(100000000 + Math.random() * 900000000)}`;

    if (isDbConfigured) {
      let pLat = null;
      let pLng = null;
      if (addressId) {
        const addrRes = await executeQuery(`SELECT lat, lng FROM addresses WHERE id = $1`, [addressId]);
        if (addrRes.isConnected && addrRes.rows.length > 0) {
          pLat = addrRes.rows[0].lat;
          pLng = addrRes.rows[0].lng;
        }
      }

      const insertRes = await executeQuery(
        `INSERT INTO bookings (
          id, booking_number, user_id, patient_profile_id, patient_name, address_id, address_text,
          service_id, service_title, partner_id, partner_name, partner_title, partner_img,
          scheduled_date, scheduled_time_slot, status, total_amount, payment_status, payment_method, payment_ref, clinical_instructions,
          patient_lat, patient_lng, appointment_starts_at
        )
        VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13, $14, $15, $16, $17, $18, $19, $20, $21, $22, $23, $24)
        RETURNING *`,
        [
          bookingId,
          bookingNumber,
          userId,
          patientProfileId,
          patientName,
          addressId,
          addressText || '123 Green Park, Bengaluru',
          serviceId,
          serviceTitle,
          partnerId || null,
          partnerName || null,
          partnerTitle || null,
          partnerImg || null,
          normalizedDate,
          scheduledTimeSlot,
          'PENDING',
          totalAmount,
          'PAID',
          'UPI',
          paymentRef,
          clinicalInstructions,
          pLat,
          pLng,
          startsAt,
        ]
      );

      if (!insertRes.isConnected || !insertRes.rows.length) {
        return NextResponse.json({ error: 'Could not save your appointment. Please try again.' }, { status: 503 });
      }

      // Also create invoice
      const subtotal = (totalAmount / 1.18).toFixed(2);
      const tax = (totalAmount - parseFloat(subtotal)).toFixed(2);
      await executeQuery(
        `INSERT INTO invoices (id, booking_id, user_id, invoice_number, service_title, subtotal, tax_amount, total_paid, payment_ref)
         VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9)`,
        [`inv_${Date.now()}`, bookingId, userId, `INV-2026-${bookingNumber.replace('HD-', '')}`, serviceTitle, subtotal, tax, totalAmount, paymentRef]
      );

      // Trigger Email Notification to Doctor
      let targetDoctorEmail = null;
      let targetDoctorName = partnerName || 'Practitioner';

      if (partnerId) {
        const docUserRes = await executeQuery(`SELECT email, name FROM users WHERE id = $1 LIMIT 1`, [partnerId]);
        if (docUserRes.isConnected && docUserRes.rows.length > 0) {
          targetDoctorEmail = docUserRes.rows[0].email;
          if (docUserRes.rows[0].name) targetDoctorName = docUserRes.rows[0].name;
        }
      }

      if (targetDoctorEmail) {
        await sendDoctorAppointmentEmail({
          doctorEmail: targetDoctorEmail,
          doctorName: targetDoctorName,
          patientName,
          serviceTitle,
          scheduledDate: normalizedDate,
          scheduledTimeSlot,
          addressText: addressText || '123 Green Park, Bengaluru',
          bookingNumber,
          totalAmount,
        }).catch((err) => console.error('Error dispatching doctor email:', err));
      }

      if (insertRes.isConnected && insertRes.rows.length > 0) {
        return NextResponse.json({ success: true, booking: insertRes.rows[0] });
      }
    }

    return NextResponse.json({ error: 'Could not save your appointment.' }, { status: 503 });
  } catch (err: any) {
    return NextResponse.json({ error: err.message || 'Failed to create booking' }, { status: 500 });
  }
}
