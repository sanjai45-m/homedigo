import { NextResponse } from 'next/server';
import { executeQuery, isDbConfigured } from '@/lib/db';

export async function GET() {
  if (isDbConfigured) {
    const bookingStats = await executeQuery(`
      SELECT 
        COUNT(*) as total_bookings,
        COUNT(CASE WHEN status IN ('PENDING', 'CONFIRMED', 'ASSIGNED', 'ON_THE_WAY') THEN 1 END) as active_dispatches,
        COUNT(CASE WHEN status = 'COMPLETED' THEN 1 END) as completed_visits,
        COALESCE(SUM(total_amount), 0) as total_revenue
      FROM bookings
    `);

    const partnerStats = await executeQuery(`
      SELECT 
        COUNT(*) as total_partners,
        COUNT(CASE WHEN availability = 'AVAILABLE' THEN 1 END) as active_on_duty,
        COUNT(CASE WHEN verification_status = 'APPROVED' THEN 1 END) as verified_partners
      FROM partner_profiles
    `);

    const serviceStats = await executeQuery(`
      SELECT COUNT(*) as total_services FROM services WHERE is_active = true
    `);

    return NextResponse.json({
      metrics: {
        totalBookings: Number(bookingStats.rows[0]?.total_bookings || 0),
        activeDispatches: Number(bookingStats.rows[0]?.active_dispatches || 0),
        completedVisits: Number(bookingStats.rows[0]?.completed_visits || 0),
        totalRevenue: Number(bookingStats.rows[0]?.total_revenue || 0),
        activePartners: Number(partnerStats.rows[0]?.active_on_duty || 0),
        totalPartners: Number(partnerStats.rows[0]?.total_partners || 0),
        totalServices: Number(serviceStats.rows[0]?.total_services || 0),
      },
    });
  }

  return NextResponse.json({
    metrics: {
      totalBookings: 0,
      activeDispatches: 0,
      completedVisits: 0,
      totalRevenue: 0,
      activePartners: 0,
      totalPartners: 0,
      totalServices: 7,
    },
  });
}
