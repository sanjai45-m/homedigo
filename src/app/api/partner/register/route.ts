import { NextResponse } from 'next/server';
import { executeQuery, isDbConfigured } from '@/lib/db';
import { hashPassword } from '@/lib/passwords';

export async function POST(request: Request) {
  try {
    const body = await request.json();
    const {
      name,
      email,
      phone = '',
      password,
      partnerType = 'DOCTOR',
      specialization = 'General Physician & Home Care',
      qualifications = 'MBBS, MD',
      city = 'Bengaluru',
      locationName = 'Bengaluru Central, Karnataka',
    } = body;

    if (!name || !email || !password) {
      return NextResponse.json(
        { error: 'Name, email, and password are required' },
        { status: 400 }
      );
    }

    if (password.length < 12) {
      return NextResponse.json(
        { error: 'Password must be at least 12 characters long' },
        { status: 400 }
      );
    }

    const cleanEmail = email.trim().toLowerCase();
    const userId = `usr_pro_${Date.now()}`;
    const profileId = `prof_pro_${Date.now()}`;
    const passwordHash = hashPassword(password);

    if (isDbConfigured) {
      // Check if user exists
      const existing = await executeQuery(
        `SELECT id, role FROM users WHERE email = $1`,
        [cleanEmail]
      );

      if (existing.isConnected && existing.rows.length > 0) {
        return NextResponse.json(
          { error: 'An account with this email already exists. Please sign in instead.' },
          { status: 400 }
        );
      }

      const image =
        partnerType === 'NURSE'
          ? 'https://images.unsplash.com/photo-1594824813566-78853b00693a?auto=format&fit=crop&w=256&q=80'
          : 'https://images.unsplash.com/photo-1622253692010-333f2da6031d?auto=format&fit=crop&w=256&q=80';

      // 1. Insert into users table
      const createdUser = await executeQuery(
        `INSERT INTO users (id, name, email, phone, role, image, password_hash)
         VALUES ($1, $2, $3, $4, 'PARTNER', $5, $6) ON CONFLICT (email) DO NOTHING RETURNING id`,
        [userId, name, cleanEmail, phone, image, passwordHash]
      );

      if (!createdUser.isConnected) return NextResponse.json({ error: 'Storage is unavailable.' }, { status: 503 });
      if (!createdUser.rows.length) return NextResponse.json({ error: 'An account already uses this email.' }, { status: 409 });
      // 2. Insert into partner_profiles table
      const createdProfile = await executeQuery(
        `INSERT INTO partner_profiles (
          id, user_id, partner_type, specialization, qualifications,
          consultation_fee, council_reg_number, experience_years, service_radius_km,
          location_name, city, latitude, longitude, verification_status, availability, bio
        )
        VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13, $14, $15, $16) RETURNING id`,
        [
          profileId,
          userId,
          partnerType,
          specialization,
          qualifications,
          partnerType === 'NURSE' ? 400 : 600,
          '',
          5,
          10,
          locationName,
          city,
          12.9716,
          77.5946,
          'PENDING',
          'OFFLINE',
          `Registered Healthcare ${partnerType} on HomeDigo Connected Care Network.`,
        ]
      );

      if (!createdProfile.isConnected || !createdProfile.rows.length) return NextResponse.json({ error: 'Profile creation failed. Contact support.' }, { status: 503 });
      return NextResponse.json({
        success: true,
        message: 'Account created. An administrator must approve your profile before you can receive appointments.',
        user: {
          id: userId,
          name,
          email: cleanEmail,
          role: 'PARTNER',
        },
      });
    }

    return NextResponse.json({ error: 'Registration is unavailable.' }, { status: 503 });
  } catch (err: any) {
    return NextResponse.json(
      { error: err.message || 'Failed to register partner clinician' },
      { status: 500 }
    );
  }
}
