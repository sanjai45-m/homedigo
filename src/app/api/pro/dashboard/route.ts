import { NextResponse } from 'next/server';
import { getServerSession } from 'next-auth/next';
import { authOptions } from '@/lib/auth';
import { executeQuery, isDbConfigured } from '@/lib/db';

export async function GET() {
  // Get the logged-in partner's ID from the session
  const session = await getServerSession(authOptions);
  const sessionUserId = (session?.user as any)?.id;

  if (isDbConfigured && sessionUserId) {
    // Fetch today's visits for this partner specifically
    const today = new Date().toISOString().split('T')[0]; // YYYY-MM-DD

    const visitsRes = await executeQuery(
      `SELECT b.id, b.booking_number, b.patient_name, b.address_text, b.service_title,
              b.scheduled_date, b.scheduled_time_slot, b.status, b.total_amount,
              b.payment_status, b.clinical_instructions, b.vital_bp, b.vital_pulse,
              b.vital_spo2, b.vital_sugar, b.prescription_notes, b.created_at,
              b.partner_lat, b.partner_lng
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
      ['ON_THE_WAY', 'ASSIGNED', 'IN_PROGRESS', 'ARRIVED'].includes(v.status)
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

  // Fallback: if no session or DB offline, try to pick first partner (dev mode only)
  if (isDbConfigured) {
    const firstPartner = await executeQuery(
      `SELECT user_id FROM partner_profiles LIMIT 1`
    );
    if (firstPartner.isConnected && firstPartner.rows.length > 0) {
      const partnerId = firstPartner.rows[0].user_id;
      const visitsRes = await executeQuery(
        `SELECT * FROM bookings WHERE partner_id = $1 OR partner_id IS NULL ORDER BY created_at DESC`,
        [partnerId]
      );
      const partnerRes = await executeQuery(
        `SELECT u.id, u.name, u.email, u.image, p.specialization, p.availability, p.rating, p.completed_visits
         FROM users u LEFT JOIN partner_profiles p ON u.id = p.user_id WHERE u.id = $1`,
        [partnerId]
      );
      return NextResponse.json({
        partner: partnerRes.rows[0] || null,
        visits: visitsRes.rows || [],
      });
    }
  }

  return NextResponse.json({ partner: null, visits: [] });
}
