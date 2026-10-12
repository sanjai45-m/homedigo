import { requireApiUser } from '@/lib/api-auth';
import { NextResponse } from 'next/server';
import { executeQuery, isDbConfigured } from '@/lib/db';

export async function GET(request: Request) {
  const authorization = await requireApiUser(["PATIENT"], request);
  if (authorization.response) return authorization.response;

  const result = await executeQuery(
    `SELECT id, user_id, full_name, relationship, age, gender, blood_group, medical_notes, emergency_contact, is_primary, created_at FROM patient_profiles WHERE user_id = $1 ORDER BY is_primary DESC, created_at ASC`,
    [authorization.user.id],
  );
  if (!result.isConnected) return NextResponse.json({ error: 'Storage is unavailable.' }, { status: 503 });
  return NextResponse.json({ profiles: result.rows });
}

export async function POST(request: Request) {
  const authorization = await requireApiUser(["PATIENT"], request);
  if (authorization.response) return authorization.response;

  try {
    const userId = authorization.user.id;
    const body = await request.json();
    const {
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

    return NextResponse.json({ error: 'Storage is unavailable.' }, { status: 503 });
  } catch (err: any) {
    return NextResponse.json({ error: err.message || 'Failed to create profile' }, { status: 500 });
  }
}

export async function PUT(request: Request) {
  const authorization = await requireApiUser(["PATIENT"], request);
  if (authorization.response) return authorization.response;

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
         WHERE id = $9 AND user_id = $10
         RETURNING *`,
        [fullName, relationship, age ? parseInt(age, 10) : null, gender, bloodGroup, medicalNotes, emergencyContact, isPrimary, id, authorization.user.id]
      );
      if (!updateRes.isConnected) return NextResponse.json({ error: 'Storage is unavailable.' }, { status: 503 });
      if (updateRes.rows.length > 0) {
        return NextResponse.json({ success: true, profile: updateRes.rows[0] });
      }
    }

    return NextResponse.json({ error: 'Record not found.' }, { status: 404 });
  } catch (err: any) {
    return NextResponse.json({ error: err.message || 'Failed to update profile' }, { status: 500 });
  }
}

export async function DELETE(request: Request) {
  const authorization = await requireApiUser(["PATIENT"], request);
  if (authorization.response) return authorization.response;

  try {
    const { searchParams } = new URL(request.url);
    const id = searchParams.get('id');

    if (!id) {
      return NextResponse.json({ error: 'Profile ID is required' }, { status: 400 });
    }

    if (isDbConfigured) {
      const deleted = await executeQuery('DELETE FROM patient_profiles WHERE id = $1 AND user_id = $2 RETURNING id', [id, authorization.user.id]);
      if (!deleted.isConnected) return NextResponse.json({ error: 'Storage is unavailable.' }, { status: 503 });
      if (!deleted.rows.length) return NextResponse.json({ error: 'Record not found.' }, { status: 404 });
    }

    return NextResponse.json({ success: true, message: 'Profile deleted successfully' });
  } catch (err: any) {
    return NextResponse.json({ error: err.message || 'Failed to delete profile' }, { status: 500 });
  }
}
