import { NextResponse } from 'next/server';
import { executeQuery, isDbConfigured } from '@/lib/db';
import { getServerSession } from 'next-auth/next';
import { authOptions } from '@/lib/auth';

export async function GET(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params;

  if (isDbConfigured) {
    const res = await executeQuery(
      `SELECT * FROM bookings WHERE id = $1`,
      [id]
    );
    if (res.isConnected && res.rows.length > 0) {
      return NextResponse.json({ visit: res.rows[0] });
    }
  }

  return NextResponse.json({
    visit: {
      id,
      booking_number: 'HD-8921',
      patient_name: 'Meenakshi K. (Mother)',
      patient_phone: '+91 98450 12345',
      address_text: 'Flat 402, Green Park Apartments, 12th Main, Indiranagar, Bengaluru',
      service_title: 'Doctor Home Visit',
      status: 'ON_THE_WAY',
      total_amount: 550.0,
      payment_status: 'PAID',
      clinical_instructions: 'Post-fever clinical review and blood pressure checkup.',
      scheduled_date: 'Today',
      scheduled_time_slot: '10:00 AM - 11:00 AM',
      vital_bp: '120/80',
      vital_pulse: '76',
      vital_spo2: '98',
      vital_sugar: '110',
      prescription_notes: '',
    },
  });
}

export async function PUT(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params;
  try {
    const session = await getServerSession(authOptions);
    const user = session?.user as { id?: string; role?: string } | undefined;
    if (!user?.id || user.role !== 'PARTNER') {
      return NextResponse.json({ error: 'Doctor access required.' }, { status: 401 });
    }
    const body = await request.json();
    const { status, vitalBp, vitalPulse, vitalSpo2, vitalSugar, prescriptionNotes } = body;
    if (status && !['ON_THE_WAY', 'ARRIVED', 'IN_PROGRESS', 'COMPLETED', 'CANCELLED'].includes(status)) {
      return NextResponse.json({ error: 'Use Confirm Availability on your dashboard to confirm an appointment.' }, { status: 400 });
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
         WHERE id = $7 AND partner_id = $8
         RETURNING *`,
        [status, vitalBp, vitalPulse, vitalSpo2, vitalSugar, prescriptionNotes, id, user.id]
      );

      if (updateRes.isConnected && updateRes.rows.length > 0) {
        return NextResponse.json({ success: true, visit: updateRes.rows[0] });
      }
    }

    return NextResponse.json({ error: 'Appointment could not be updated.' }, { status: 503 });
  } catch (err: any) {
    return NextResponse.json({ error: err.message || 'Failed to update visit' }, { status: 500 });
  }
}
