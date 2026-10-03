import { NextResponse } from 'next/server';
import { executeQuery, isDbConfigured } from '@/lib/db';

export async function GET(request: Request) {
  try {
    const { searchParams } = new URL(request.url);
    const specialityId = searchParams.get('specialityId');
    const slug = searchParams.get('slug');
    const queryTerm = searchParams.get('q');
    const city = searchParams.get('city');

    if (isDbConfigured) {
      let query = `
        SELECT u.id, u.name, u.email, u.phone, u.image,
               p.partner_type, p.speciality_id, p.specialization, p.qualifications,
               p.consultation_fee, p.council_reg_number, p.experience_years,
               p.service_radius_km, p.verification_status, p.availability, p.rating,
               p.completed_visits, p.bio,
               p.location_name, p.city, p.latitude, p.longitude,
               s.name as speciality_name, s.slug as speciality_slug, s.icon as speciality_icon
        FROM users u
        INNER JOIN partner_profiles p ON u.id = p.user_id
        LEFT JOIN specialities s ON p.speciality_id = s.id
        WHERE u.role = 'PARTNER' AND p.partner_type = 'DOCTOR' AND p.verification_status = 'APPROVED'
      `;
      const params: any[] = [];

      if (specialityId) {
        params.push(specialityId);
        query += ` AND p.speciality_id = $${params.length}`;
      } else if (slug) {
        params.push(slug);
        query += ` AND s.slug = $${params.length}`;
      }

      if (city && city !== 'ALL') {
        params.push(`%${city.toLowerCase()}%`);
        query += ` AND (LOWER(p.city) LIKE $${params.length} OR LOWER(p.location_name) LIKE $${params.length})`;
      }

      if (queryTerm) {
        params.push(`%${queryTerm.toLowerCase()}%`);
        query += ` AND (
          LOWER(u.name) LIKE $${params.length} OR
          LOWER(p.specialization) LIKE $${params.length} OR
          LOWER(p.qualifications) LIKE $${params.length} OR
          LOWER(s.name) LIKE $${params.length} OR
          LOWER(p.location_name) LIKE $${params.length} OR
          LOWER(p.bio) LIKE $${params.length}
        )`;
      }

      query += ` ORDER BY p.rating DESC, p.completed_visits DESC`;

      const res = await executeQuery(query, params);
      if (res.isConnected) {
        return NextResponse.json({ doctors: res.rows || [] });
      }
    }

    return NextResponse.json({ doctors: [] });
  } catch (err: any) {
    return NextResponse.json({ error: err.message || 'Failed to fetch doctors' }, { status: 500 });
  }
}
