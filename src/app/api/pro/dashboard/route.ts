import { NextResponse } from 'next/server';
import { getServerSession } from 'next-auth/next';
import { authOptions } from '@/lib/auth';
import { executeQuery, isDbConfigured } from '@/lib/db';
import { ensureAppointmentSchema } from '@/lib/appointment-schema';
import { appointmentDate } from '@/lib/appointment-time';

export async function GET() {
  // Get the logged-in partner's ID from the session
  const session = await getServerSession(authOptions);
  const sessionUserId = (session?.user as any)?.id;
  if (!sessionUserId || (session?.user as { role?: string })?.role !== 'PARTNER') {
    return NextResponse.json({ error: 'Sign in as a doctor.' }, { status: 401 });
  }

  if (isDbConfigured && sessionUserId) {
    // Fetch today's visits for this partner specifically
    try {
      await ensureAppointmentSchema();
    } catch {
      return NextResponse.json({ error: 'Appointment storage unavailable.' }, { status: 503 });
    }
    const today = appointmentDate('Today');

    const visitsRes = await executeQuery(
      `SELECT b.id, b.booking_number, b.patient_name, b.address_text, b.service_title,
              b.scheduled_date, b.scheduled_time_slot, b.status, b.total_amount,
              b.payment_status, b.clinical_instructions, b.vital_bp, b.vital_pulse,
              b.vital_spo2, b.vital_sugar, b.prescription_notes, b.created_at,
              b.partner_lat, b.partner_lng, b.doctor_confirmed_at, b.appointment_starts_at
       FROM bookings b
       WHERE b.partner_id = $1
       ORDER BY b.created_at DESC`,
      [sessionUserId]
    );

    const partnerRes = await executeQuery(
      `SELECT u.id, u.name, u.email, u.image, p.specialization, p.availability,
              p.rating, p.completed_visits
       FROM users u
       LEFT JOIN partner_profiles p ON u.id = p.user_id
       WHERE u.id = $1`,
      [sessionUserId]
    );

    // Compute today's stats
    const allVisits = visitsRes.rows || [];
    const todayVisits = allVisits.filter((v: any) => {
      // scheduled_date might be stored as a date string
      const d = v.scheduled_date ? String(v.scheduled_date).slice(0, 10) : '';
      return d === today;
    });
    const completedToday = todayVisits.filter((v: any) => v.status === 'COMPLETED').length;
    const activeNow = allVisits.filter((v: any) =>
      ['PENDING', 'CONFIRMED', 'ON_THE_WAY', 'ASSIGNED', 'IN_PROGRESS', 'ARRIVED'].includes(v.status)
    ).length;

    const partner = partnerRes.rows[0] || null;

    return NextResponse.json({
      partner: partner
        ? {
            ...partner,
            today_visits: todayVisits.length,
            completed_today: completedToday,
            active_now: activeNow,
          }
        : null,
      visits: allVisits,
    });
  }

  return NextResponse.json({ error: 'Appointment storage unavailable.' }, { status: 503 });
}
