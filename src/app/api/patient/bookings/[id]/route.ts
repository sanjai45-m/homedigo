import { NextResponse } from 'next/server';
import { executeQuery, isDbConfigured } from '@/lib/db';

export async function GET(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params;

  if (isDbConfigured) {
    const res = await executeQuery(
      `SELECT b.*, 
              COALESCE(b.partner_lat, p.latitude) AS partner_lat, 
              COALESCE(b.partner_lng, p.longitude) AS partner_lng,
              COALESCE(b.patient_lat, a.lat) AS patient_lat, 
              COALESCE(b.patient_lng, a.lng) AS patient_lng, 
              a.city AS address_city,
              p.location_name AS partner_location
       FROM bookings b
       LEFT JOIN addresses a ON b.address_id = a.id
       LEFT JOIN partner_profiles p ON b.partner_id = p.user_id
       WHERE b.id = $1 OR b.booking_number = $1`,
      [id]
    );
    if (res.isConnected && res.rows.length > 0) {
      return NextResponse.json({ booking: res.rows[0] });
    }
  }

  return NextResponse.json({
    booking: null,
  });
}

export async function PATCH(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    const body = await request.json();
    const { status, vitalBp, vitalPulse, vitalSpo2, vitalSugar, prescriptionNotes } = body;
    if (status === 'CONFIRMED') {
      return NextResponse.json({ error: 'Only the assigned doctor can confirm availability.' }, { status: 403 });
    }

    if (isDbConfigured) {
      const updateRes = await executeQuery(
        `UPDATE bookings 
         SET status = COALESCE($1, status),
             vital_bp = COALESCE($2, vital_bp),
             vital_pulse = COALESCE($3, vital_pulse),
             vital_spo2 = COALESCE($4, vital_spo2),
             vital_sugar = COALESCE($5, vital_sugar),
             prescription_notes = COALESCE($6, prescription_notes)
         WHERE id = $7 OR booking_number = $7
         RETURNING *`,
        [status, vitalBp, vitalPulse, vitalSpo2, vitalSugar, prescriptionNotes, id]
      );
      if (updateRes.isConnected && updateRes.rows.length > 0) {
        return NextResponse.json({ success: true, booking: updateRes.rows[0] });
      }
    }

    return NextResponse.json({
      success: true,
      booking: { id, status, vital_bp: vitalBp, vital_pulse: vitalPulse, vital_spo2: vitalSpo2, vital_sugar: vitalSugar, prescription_notes: prescriptionNotes },
    });
  } catch (err: any) {
    return NextResponse.json({ error: err.message || 'Failed to update booking' }, { status: 500 });
  }
}
