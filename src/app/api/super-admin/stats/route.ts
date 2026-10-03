import { NextResponse } from 'next/server';
import { executeQuery, isDbConfigured } from '@/lib/db';

export async function GET() {
  if (isDbConfigured) {
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
          COALESCE(SUM(total_amount), 0) as total_gmv
        FROM bookings
      `),
      executeQuery(`SELECT COUNT(*) as total_services FROM services WHERE is_active = true`),
    ]);

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
    });
  }

  return NextResponse.json({
    metrics: {
      totalAdmins: 0,
      totalPartners: 0,
      totalPatients: 0,
      totalBookings: 0,
      totalGmv: 0,
      totalServices: 5,
      uptime: '99.98%',
      serverlessRegion: 'AWS us-east-2 (Neon Serverless)',
    },
  });
}
