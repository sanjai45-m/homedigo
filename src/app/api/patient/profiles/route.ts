import { NextResponse } from 'next/server';
import { executeQuery, isDbConfigured } from '@/lib/db';

export async function GET(request: Request) {
  const { searchParams } = new URL(request.url);
  const userId = searchParams.get('userId');
  const email = searchParams.get('email');

  if (isDbConfigured) {
    let res;
    if (userId || email) {
      res = await executeQuery(
        `SELECT id, user_id, full_name, relationship, age, gender, blood_group, medical_notes, emergency_contact, is_primary, created_at 
         FROM patient_profiles 
         WHERE user_id = $1 OR user_id = $2 OR user_id = 'usr_pat_001' OR user_id IS NULL OR user_id = ''
         ORDER BY is_primary DESC, created_at ASC`,
        [userId || 'usr_pat_001', email || 'usr_pat_001']
      );
    } else {
      res = await executeQuery(
        `SELECT id, user_id, full_name, relationship, age, gender, blood_group, medical_notes, emergency_contact, is_primary, created_at 
         FROM patient_profiles 
         ORDER BY is_primary DESC, created_at ASC`
      );
    }
    if (res.isConnected) {
      return NextResponse.json({ profiles: res.rows || [] });
    }
  }

  return NextResponse.json({ profiles: [] });
}

export async function POST(request: Request) {
  try {
    const body = await request.json();
    const {
      userId = 'usr_pat_001',
      fullName,
      relationship = 'Dependent',
      age,
      gender,
      bloodGroup,
      medicalNotes = '',
      emergencyContact = '',
      isPrimary = false,
    } = body;

    if (!fullName) {
      return NextResponse.json({ error: 'Full name is required' }, { status: 400 });
    }

    const id = `prof_${Date.now()}`;

    if (isDbConfigured) {
      const insertRes = await executeQuery(
        `INSERT INTO patient_profiles (id, user_id, full_name, relationship, age, gender, blood_group, medical_notes, emergency_contact, is_primary)
         VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10)
         RETURNING *`,
        [id, userId, fullName, relationship, age ? parseInt(age, 10) : null, gender, bloodGroup, medicalNotes, emergencyContact, isPrimary]
      );
      if (insertRes.isConnected && insertRes.rows.length > 0) {
        return NextResponse.json({ success: true, profile: insertRes.rows[0] });
      }
    }

    const createdProfile = {
      id,
      user_id: userId,
      full_name: fullName,
      relationship,
      age: age ? parseInt(age, 10) : 30,
      gender,
      blood_group: bloodGroup,
      medical_notes: medicalNotes,
      emergency_contact: emergencyContact,
      is_primary: isPrimary,
    };

    return NextResponse.json({ success: true, profile: createdProfile });
  } catch (err: any) {
    return NextResponse.json({ error: err.message || 'Failed to create profile' }, { status: 500 });
  }
}

export async function PUT(request: Request) {
  try {
    const body = await request.json();
    const {
      id,
      fullName,
      relationship = 'Dependent',
      age,
      gender,
      bloodGroup,
      medicalNotes = '',
      emergencyContact = '',
      isPrimary = false,
    } = body;

    if (!id || !fullName) {
      return NextResponse.json({ error: 'Profile ID and full name are required' }, { status: 400 });
    }

    if (isDbConfigured) {
      const updateRes = await executeQuery(
        `UPDATE patient_profiles
         SET full_name = $1, relationship = $2, age = $3, gender = $4, blood_group = $5, medical_notes = $6, emergency_contact = $7, is_primary = $8
         WHERE id = $9
         RETURNING *`,
        [fullName, relationship, age ? parseInt(age, 10) : null, gender, bloodGroup, medicalNotes, emergencyContact, isPrimary, id]
      );
      if (updateRes.isConnected && updateRes.rows.length > 0) {
        return NextResponse.json({ success: true, profile: updateRes.rows[0] });
      }
    }

    const updatedProfile = {
      id,
      full_name: fullName,
      relationship,
      age: age ? parseInt(age, 10) : 30,
      gender,
      blood_group: bloodGroup,
      medical_notes: medicalNotes,
      emergency_contact: emergencyContact,
      is_primary: isPrimary,
    };

    return NextResponse.json({ success: true, profile: updatedProfile });
  } catch (err: any) {
    return NextResponse.json({ error: err.message || 'Failed to update profile' }, { status: 500 });
  }
}

export async function DELETE(request: Request) {
  try {
    const { searchParams } = new URL(request.url);
    const id = searchParams.get('id');

    if (!id) {
      return NextResponse.json({ error: 'Profile ID is required' }, { status: 400 });
    }

    if (isDbConfigured) {
      await executeQuery('DELETE FROM patient_profiles WHERE id = $1', [id]);
    }

    return NextResponse.json({ success: true, message: 'Profile deleted successfully' });
  } catch (err: any) {
    return NextResponse.json({ error: err.message || 'Failed to delete profile' }, { status: 500 });
  }
}
