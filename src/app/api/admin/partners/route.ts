import { NextResponse } from 'next/server';
import { executeQuery, isDbConfigured } from '@/lib/db';
import { hashPassword } from '@/lib/passwords';

export async function GET() {
  if (isDbConfigured) {
    const res = await executeQuery(
      `SELECT u.id, u.name, u.email, u.phone, u.image, u.created_at,
              p.partner_type, p.speciality_id, p.specialization, p.qualifications,
              p.consultation_fee, p.council_reg_number, p.experience_years, 
              p.service_radius_km, p.verification_status, p.availability, p.rating,
              p.completed_visits, p.bio,
              p.location_name, p.city, p.latitude, p.longitude,
              s.name as speciality_name, s.icon as speciality_icon
       FROM users u
       LEFT JOIN partner_profiles p ON u.id = p.user_id
       LEFT JOIN specialities s ON p.speciality_id = s.id
       WHERE u.role = 'PARTNER'
       ORDER BY u.created_at DESC`
    );
    if (res.isConnected) {
      return NextResponse.json({ partners: res.rows || [] });
    }
  }

  return NextResponse.json({ partners: [] });
}

export async function POST(request: Request) {
  try {
    const body = await request.json();
    const {
      name,
      email,
      phone,
      password,
      partnerType = 'DOCTOR',
      specialityId = null,
      specialization,
      qualifications = 'MBBS, MD',
      consultationFee = 550,
      councilRegNumber,
      experienceYears = 5,
      serviceRadiusKm = 10,
      locationName = 'Bengaluru Central, Karnataka',
      city = 'Bengaluru',
      latitude = 12.9716,
      longitude = 77.5946,
      verificationStatus = 'APPROVED',
      availability = 'AVAILABLE',
      bio = '',
      image = 'https://images.unsplash.com/photo-1612349317150-e413f6a5b16d?auto=format&fit=crop&w=256&q=80',
    } = body;

    if (!name || !email || !specialization) {
      return NextResponse.json({ error: 'Name, email, and specialization are required' }, { status: 400 });
    }

    const userId = `usr_pro_${Date.now()}`;
    const profileId = `prof_pro_${Date.now()}`;

    if (isDbConfigured) {
      const passwordHash = hashPassword(password || 'Partner@123');

      // 1. Insert into users
      await executeQuery(
        `INSERT INTO users (id, name, email, phone, role, image, password_hash)
         VALUES ($1, $2, $3, $4, 'PARTNER', $5, $6)
         ON CONFLICT (email) DO UPDATE SET name = $2, phone = $4, image = $5, password_hash = COALESCE($6, users.password_hash)`,
        [userId, name, email, phone, image, passwordHash]
      );

      // 2. Insert into partner_profiles
      const profRes = await executeQuery(
        `INSERT INTO partner_profiles (
          id, user_id, partner_type, speciality_id, specialization, qualifications,
          consultation_fee, council_reg_number, experience_years, service_radius_km,
          location_name, city, latitude, longitude, verification_status, availability, bio
        )
        VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13, $14, $15, $16, $17)
        RETURNING *`,
        [
          profileId,
          userId,
          partnerType,
          specialityId,
          specialization,
          qualifications,
          Number(consultationFee),
          councilRegNumber || `MCI-${Math.floor(10000 + Math.random() * 90000)}`,
          Number(experienceYears),
          Number(serviceRadiusKm),
          locationName,
          city,
          Number(latitude) || 12.9716,
          Number(longitude) || 77.5946,
          verificationStatus,
          availability,
          bio,
        ]
      );

      if (profRes.isConnected && profRes.rows.length > 0) {
        return NextResponse.json({
          success: true,
          partner: {
            id: userId,
            name,
            email,
            phone,
            image,
            partner_type: partnerType,
            speciality_id: specialityId,
            specialization,
            qualifications,
            consultation_fee: Number(consultationFee),
            council_reg_number: councilRegNumber,
            experience_years: experienceYears,
            service_radius_km: serviceRadiusKm,
            location_name: locationName,
            city,
            latitude: Number(latitude) || 12.9716,
            longitude: Number(longitude) || 77.5946,
            verification_status: verificationStatus,
            availability,
            bio,
          },
        });
      }
    }

    const createdPartner = {
      id: userId,
      name,
      email,
      phone,
      image,
      partner_type: partnerType,
      speciality_id: specialityId,
      specialization,
      qualifications,
      consultation_fee: Number(consultationFee),
      council_reg_number: councilRegNumber || 'MCI-88912',
      experience_years: experienceYears,
      service_radius_km: serviceRadiusKm,
      location_name: locationName,
      city,
      latitude: Number(latitude) || 12.9716,
      longitude: Number(longitude) || 77.5946,
      verification_status: verificationStatus,
      availability,
      rating: 5.0,
      completed_visits: 0,
      bio,
    };

    return NextResponse.json({ success: true, partner: createdPartner });
  } catch (err: any) {
    return NextResponse.json({ error: err.message || 'Failed to create partner clinician/doctor' }, { status: 500 });
  }
}

export async function PUT(request: Request) {
  try {
    const body = await request.json();
    const {
      userId,
      name,
      phone,
      image,
      verificationStatus,
      availability,
      specialization,
      partnerType,
      specialityId,
      qualifications,
      consultationFee,
      councilRegNumber,
      experienceYears,
      serviceRadiusKm,
      locationName,
      city,
      latitude,
      longitude,
      bio,
    } = body;

    if (!userId) {
      return NextResponse.json({ error: 'Partner User ID is required' }, { status: 400 });
    }

    if (isDbConfigured) {
      // 1. Update user identity if name, phone, or image provided
      if (name || phone || image) {
        await executeQuery(
          `UPDATE users
           SET name = COALESCE($1, name),
               phone = COALESCE($2, phone),
               image = COALESCE($3, image),
               updated_at = CURRENT_TIMESTAMP
           WHERE id = $4`,
          [name, phone, image, userId]
        );
      }

      // 2. Update partner profile
      await executeQuery(
        `UPDATE partner_profiles
         SET verification_status = COALESCE($1, verification_status),
             availability = COALESCE($2, availability),
             specialization = COALESCE($3, specialization),
             partner_type = COALESCE($4, partner_type),
             speciality_id = COALESCE($5, speciality_id),
             qualifications = COALESCE($6, qualifications),
             consultation_fee = COALESCE($7, consultation_fee),
             council_reg_number = COALESCE($8, council_reg_number),
             experience_years = COALESCE($9, experience_years),
             service_radius_km = COALESCE($10, service_radius_km),
             location_name = COALESCE($11, location_name),
             city = COALESCE($12, city),
             latitude = COALESCE($13, latitude),
             longitude = COALESCE($14, longitude),
             bio = COALESCE($15, bio)
         WHERE user_id = $16`,
        [
          verificationStatus,
          availability,
          specialization,
          partnerType,
          specialityId,
          qualifications,
          consultationFee !== undefined && consultationFee !== null ? Number(consultationFee) : null,
          councilRegNumber,
          experienceYears !== undefined && experienceYears !== null ? Number(experienceYears) : null,
          serviceRadiusKm !== undefined && serviceRadiusKm !== null ? Number(serviceRadiusKm) : null,
          locationName,
          city,
          latitude !== undefined && latitude !== null ? Number(latitude) : null,
          longitude !== undefined && longitude !== null ? Number(longitude) : null,
          bio,
          userId,
        ]
      );
    }

    return NextResponse.json({
      success: true,
      message: 'Doctor / Partner profile updated successfully',
    });
  } catch (err: any) {
    return NextResponse.json({ error: err.message || 'Failed to update partner' }, { status: 500 });
  }
}

export async function DELETE(request: Request) {
  try {
    const { searchParams } = new URL(request.url);
    const userId = searchParams.get('id');

    if (!userId) {
      return NextResponse.json({ error: 'Partner ID required' }, { status: 400 });
    }

    if (isDbConfigured) {
      await executeQuery(`UPDATE bookings SET partner_id = NULL WHERE partner_id = $1`, [userId]);
      await executeQuery(`DELETE FROM partner_profiles WHERE user_id = $1`, [userId]);
      await executeQuery(`DELETE FROM users WHERE id = $1 AND role = 'PARTNER'`, [userId]);
    }

    return NextResponse.json({ success: true, message: `Doctor/Partner ${userId} removed successfully.` });
  } catch (err: any) {
    return NextResponse.json({ error: err.message || 'Failed to delete partner' }, { status: 500 });
  }
}
