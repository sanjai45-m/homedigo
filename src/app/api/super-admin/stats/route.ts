import { requireApiUser } from '@/lib/api-auth';
import { NextResponse } from 'next/server';
import { executeQuery, isDbConfigured } from '@/lib/db';
import { VERIFIED_PAYMENT_SQL } from '@/lib/revenue';
import { ensureAppointmentSchema } from '@/lib/appointment-schema';

export async function GET() {
  const authorization = await requireApiUser(["SUPER_ADMIN"]);
  if (authorization.response) return authorization.response;

  try {
    if (!isDbConfigured) throw new Error('Storage unavailable');
    await ensureAppointmentSchema();
    const [userCounts, bookingCounts, serviceCounts] = await Promise.all([
      executeQuery(`
        SELECT 
          COUNT(CASE WHEN role = 'ADMIN' THEN 1 END) as total_admins,
          COUNT(CASE WHEN role = 'PARTNER' THEN 1 END) as total_partners,
          COUNT(CASE WHEN role = 'PATIENT' THEN 1 END) as total_patients
        FROM users
      `),
      executeQuery(`
        SELECT 
          COUNT(*) as total_bookings,
          COALESCE(SUM(total_amount) FILTER (WHERE ${VERIFIED_PAYMENT_SQL}), 0) as total_gmv
        FROM bookings b
      `),
      executeQuery(`SELECT COUNT(*) as total_services FROM services WHERE is_active = true`),
    ]);
    if ([userCounts, bookingCounts, serviceCounts].some(result => !result.isConnected)) throw new Error('Storage unavailable');

    return NextResponse.json({
      metrics: {
        totalAdmins: Number(userCounts.rows[0]?.total_admins || 0),
        totalPartners: Number(userCounts.rows[0]?.total_partners || 0),
        totalPatients: Number(userCounts.rows[0]?.total_patients || 0),
        totalBookings: Number(bookingCounts.rows[0]?.total_bookings || 0),
        totalGmv: Number(bookingCounts.rows[0]?.total_gmv || 0),
        totalServices: Number(serviceCounts.rows[0]?.total_services || 0),
        uptime: '99.98%',
        serverlessRegion: 'AWS us-east-2 (Neon Serverless)',
      },
    }, { headers: { 'Cache-Control': 'private, no-store' } });
  } catch {
    return NextResponse.json({ error: 'Dashboard totals could not be loaded. Please retry.' }, { status: 503 });
  }
}
