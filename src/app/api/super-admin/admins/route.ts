import { NextResponse } from 'next/server';
import { executeQuery, isDbConfigured } from '@/lib/db';
import { hashPassword } from '@/lib/passwords';

export async function GET() {
  if (isDbConfigured) {
    const res = await executeQuery(
      `SELECT id, name, email, phone, role, department, access_level, image, created_at
       FROM users
       WHERE role = 'ADMIN'
       ORDER BY created_at DESC`
    );
    if (res.isConnected) {
      return NextResponse.json({ admins: res.rows || [] });
    }
  }

  return NextResponse.json({ admins: [] });
}

export async function POST(request: Request) {
  try {
    const body = await request.json();
    const {
      name,
      email,
      password,
      phone = '',
      department = 'OPERATIONS',
      accessLevel = 'FULL_ADMIN',
      image = 'https://images.unsplash.com/photo-1472099645785-5658abf4ff4e?auto=format&fit=crop&w=256&q=80',
    } = body;

    if (!name || !email) {
      return NextResponse.json({ error: 'Name and email are required' }, { status: 400 });
    }

    const cleanEmail = email.trim().toLowerCase();
    const plainPassword = password && password.trim() ? password.trim() : `Admin@${Math.floor(1000 + Math.random() * 9000)}`;
    const passwordHash = hashPassword(plainPassword);
    const adminId = `usr_adm_${Date.now()}`;

    if (isDbConfigured) {
      const insertRes = await executeQuery(
        `INSERT INTO users (id, name, email, password_hash, phone, role, department, access_level, image)
         VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9)
         ON CONFLICT (email) DO UPDATE SET 
           name = $2,
           password_hash = $4,
           phone = $5,
           role = $6,
           department = $7,
           access_level = $8,
           image = $9,
           updated_at = CURRENT_TIMESTAMP
         RETURNING id, name, email, phone, role, department, access_level, image, created_at`,
        [adminId, name.trim(), cleanEmail, passwordHash, phone.trim(), 'ADMIN', department, accessLevel, image]
      );

      if (insertRes.isConnected && insertRes.rows.length > 0) {
        const savedAdmin = insertRes.rows[0];
        return NextResponse.json({
          success: true,
          admin: {
            ...savedAdmin,
            plainPassword, // Returned once to Super Admin so they can copy credentials
          },
        });
      }
    }

    const createdAdmin = {
      id: adminId,
      name: name.trim(),
      email: cleanEmail,
      plainPassword,
      phone: phone.trim(),
      role: 'ADMIN',
      department,
      accessLevel,
      image,
      created_at: new Date().toISOString(),
    };

    return NextResponse.json({ success: true, admin: createdAdmin });
  } catch (err: any) {
    return NextResponse.json({ error: err.message || 'Failed to create admin' }, { status: 500 });
  }
}

export async function DELETE(request: Request) {
  try {
    const { searchParams } = new URL(request.url);
    const id = searchParams.get('id');

    if (!id) {
      return NextResponse.json({ error: 'Admin ID required' }, { status: 400 });
    }

    if (isDbConfigured) {
      await executeQuery(`DELETE FROM users WHERE id = $1 AND role = 'ADMIN'`, [id]);
    }

    return NextResponse.json({ success: true, message: `Admin ${id} removed successfully.` });
  } catch (err: any) {
    return NextResponse.json({ error: err.message || 'Failed to delete admin' }, { status: 500 });
  }
}
