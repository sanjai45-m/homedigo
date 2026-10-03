import { NextResponse } from 'next/server';
import { executeQuery, isDbConfigured } from '@/lib/db';

export async function GET() {
  try {
    if (isDbConfigured) {
      const res = await executeQuery(`
        SELECT s.id, s.name, s.slug, s.icon, s.description, s.created_at,
               COUNT(p.id) as doctor_count
        FROM specialities s
        LEFT JOIN partner_profiles p ON s.id = p.speciality_id AND p.partner_type = 'DOCTOR'
        GROUP BY s.id, s.name, s.slug, s.icon, s.description, s.created_at
        ORDER BY doctor_count DESC, s.name ASC
      `);

      if (res.isConnected) {
        return NextResponse.json({ specialities: res.rows || [] });
      }
    }

    return NextResponse.json({ specialities: [] });
  } catch (err: any) {
    return NextResponse.json({ error: err.message || 'Failed to fetch specialities' }, { status: 500 });
  }
}

export async function POST(request: Request) {
  try {
    const body = await request.json();
    const { name, description, icon = 'Stethoscope' } = body;

    if (!name) {
      return NextResponse.json({ error: 'Speciality name is required' }, { status: 400 });
    }

    const slug = name
      .toLowerCase()
      .trim()
      .replace(/[^\w\s-]/g, '')
      .replace(/[\s_-]+/g, '-')
      .replace(/^-+|-+$/g, '');

    const id = `spec_${Date.now()}`;

    if (isDbConfigured) {
      const insertRes = await executeQuery(`
        INSERT INTO specialities (id, name, slug, icon, description)
        VALUES ($1, $2, $3, $4, $5)
        RETURNING *
      `, [id, name.trim(), slug, icon, description || '']);

      if (insertRes.isConnected && insertRes.rows.length > 0) {
        return NextResponse.json({
          success: true,
          speciality: {
            ...insertRes.rows[0],
            doctor_count: 0
          }
        });
      }
    }

    return NextResponse.json({
      success: true,
      speciality: { id, name, slug, icon, description, doctor_count: 0 }
    });
  } catch (err: any) {
    return NextResponse.json({ error: err.message || 'Failed to create speciality' }, { status: 500 });
  }
}

export async function PUT(request: Request) {
  try {
    const body = await request.json();
    const { id, name, description, icon } = body;

    if (!id || !name) {
      return NextResponse.json({ error: 'Speciality ID and name are required' }, { status: 400 });
    }

    const slug = name
      .toLowerCase()
      .trim()
      .replace(/[^\w\s-]/g, '')
      .replace(/[\s_-]+/g, '-')
      .replace(/^-+|-+$/g, '');

    if (isDbConfigured) {
      await executeQuery(`
        UPDATE specialities
        SET name = $1, slug = $2, icon = COALESCE($3, icon), description = COALESCE($4, description)
        WHERE id = $5
      `, [name.trim(), slug, icon, description, id]);
    }

    return NextResponse.json({ success: true, message: 'Speciality updated successfully' });
  } catch (err: any) {
    return NextResponse.json({ error: err.message || 'Failed to update speciality' }, { status: 500 });
  }
}

export async function DELETE(request: Request) {
  try {
    const { searchParams } = new URL(request.url);
    const id = searchParams.get('id');

    if (!id) {
      return NextResponse.json({ error: 'Speciality ID required' }, { status: 400 });
    }

    if (isDbConfigured) {
      // Unlink any partner profile referencing this speciality
      await executeQuery(`UPDATE partner_profiles SET speciality_id = NULL WHERE speciality_id = $1`, [id]);
      await executeQuery(`DELETE FROM specialities WHERE id = $1`, [id]);
    }

    return NextResponse.json({ success: true, message: 'Speciality deleted successfully' });
  } catch (err: any) {
    return NextResponse.json({ error: err.message || 'Failed to delete speciality' }, { status: 500 });
  }
}
