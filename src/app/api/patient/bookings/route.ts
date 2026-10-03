import { NextResponse } from 'next/server';
import { executeQuery, isDbConfigured } from '@/lib/db';

export async function GET(request: Request) {
  const { searchParams } = new URL(request.url);
  const userId = searchParams.get('userId') || 'usr_pat_001';

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
    const body = await request.json();
    const {
      userId = 'usr_pat_001',
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
          patient_lat, patient_lng
        )
        VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13, $14, $15, $16, $17, $18, $19, $20, $21, $22, $23)
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
          scheduledDate,
          scheduledTimeSlot,
          'CONFIRMED',
          totalAmount,
          'PAID',
          'UPI',
          paymentRef,
          clinicalInstructions,
          pLat,
          pLng,
        ]
      );

      // Also create invoice
      const subtotal = (totalAmount / 1.18).toFixed(2);
      const tax = (totalAmount - parseFloat(subtotal)).toFixed(2);
      await executeQuery(
        `INSERT INTO invoices (id, booking_id, user_id, invoice_number, service_title, subtotal, tax_amount, total_paid, payment_ref)
         VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9)`,
        [`inv_${Date.now()}`, bookingId, userId, `INV-2026-${bookingNumber.replace('HD-', '')}`, serviceTitle, subtotal, tax, totalAmount, paymentRef]
      );

      if (insertRes.isConnected && insertRes.rows.length > 0) {
        return NextResponse.json({ success: true, booking: insertRes.rows[0] });
      }
    }

    const createdBooking = {
      id: bookingId,
      booking_number: bookingNumber,
      user_id: userId,
      patient_name: patientName,
      service_title: serviceTitle,
      partner_name: partnerName,
      partner_img: partnerImg,
      scheduled_date: scheduledDate,
      scheduled_time_slot: scheduledTimeSlot,
      status: 'CONFIRMED',
      total_amount: totalAmount,
      payment_status: 'PAID',
      payment_ref: paymentRef,
    };

    return NextResponse.json({ success: true, booking: createdBooking });
  } catch (err: any) {
    return NextResponse.json({ error: err.message || 'Failed to create booking' }, { status: 500 });
  }
}
