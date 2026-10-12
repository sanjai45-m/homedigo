import { requireApiUser } from '@/lib/api-auth';
import { NextResponse } from 'next/server';
import { executeQuery, isDbConfigured } from '@/lib/db';

export async function GET(request: Request) {
  const authorization = await requireApiUser(["PATIENT"], request);
  if (authorization.response) return authorization.response;

  const result = await executeQuery(
    `SELECT id, user_id, label, address_line1, address_line2, landmark, city, pincode, lat, lng, is_default, created_at FROM addresses WHERE user_id = $1 ORDER BY is_default DESC, created_at ASC`,
    [authorization.user.id],
  );
  if (!result.isConnected) return NextResponse.json({ error: 'Storage is unavailable.' }, { status: 503 });
  return NextResponse.json({ addresses: result.rows });
}

export async function POST(request: Request) {
  const authorization = await requireApiUser(["PATIENT"], request);
  if (authorization.response) return authorization.response;

  try {
    const userId = authorization.user.id;
    const body = await request.json();
    const {
      label = 'Home',
      addressLine1,
      addressLine2 = '',
      landmark = '',
      city = 'Bengaluru',
      pincode,
      lat = 12.9716,
      lng = 77.5946,
      isDefault = false,
    } = body;

    if (!addressLine1 || !pincode) {
      return NextResponse.json({ error: 'Address line and pincode are required' }, { status: 400 });
    }

    const id = `addr_${Date.now()}`;

    if (isDbConfigured) {
      const insertRes = await executeQuery(
        `INSERT INTO addresses (id, user_id, label, address_line1, address_line2, landmark, city, pincode, lat, lng, is_default)
         VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11)
         RETURNING *`,
        [id, userId, label, addressLine1, addressLine2, landmark, city, pincode, lat, lng, isDefault]
      );
      if (insertRes.isConnected && insertRes.rows.length > 0) {
        return NextResponse.json({ success: true, address: insertRes.rows[0] });
      }
    }

    return NextResponse.json({ error: 'Storage is unavailable.' }, { status: 503 });
  } catch (err: any) {
    return NextResponse.json({ error: err.message || 'Failed to add address' }, { status: 500 });
  }
}

export async function PUT(request: Request) {
  const authorization = await requireApiUser(["PATIENT"], request);
  if (authorization.response) return authorization.response;

  try {
    const body = await request.json();
    const {
      id,
      label = 'Home',
      addressLine1,
      addressLine2 = '',
      landmark = '',
      city = 'Bengaluru',
      pincode,
      lat = 12.9716,
      lng = 77.5946,
      isDefault = false,
    } = body;

    if (!id || !addressLine1 || !pincode) {
      return NextResponse.json({ error: 'Address ID, address line and pincode are required' }, { status: 400 });
    }

    if (isDbConfigured) {
      const updateRes = await executeQuery(
        `UPDATE addresses
         SET label = $1, address_line1 = $2, address_line2 = $3, landmark = $4, city = $5, pincode = $6, lat = $7, lng = $8, is_default = $9
         WHERE id = $10 AND user_id = $11
         RETURNING *`,
        [label, addressLine1, addressLine2, landmark, city, pincode, lat, lng, isDefault, id, authorization.user.id]
      );
      if (!updateRes.isConnected) return NextResponse.json({ error: 'Storage is unavailable.' }, { status: 503 });
      if (updateRes.rows.length > 0) {
        return NextResponse.json({ success: true, address: updateRes.rows[0] });
      }
    }

    return NextResponse.json({ error: 'Record not found.' }, { status: 404 });
  } catch (err: any) {
    return NextResponse.json({ error: err.message || 'Failed to update address' }, { status: 500 });
  }
}

export async function DELETE(request: Request) {
  const authorization = await requireApiUser(["PATIENT"], request);
  if (authorization.response) return authorization.response;

  try {
    const { searchParams } = new URL(request.url);
    const id = searchParams.get('id');

    if (!id) {
      return NextResponse.json({ error: 'Address ID is required' }, { status: 400 });
    }

    if (isDbConfigured) {
      const deleted = await executeQuery('DELETE FROM addresses WHERE id = $1 AND user_id = $2 RETURNING id', [id, authorization.user.id]);
      if (!deleted.isConnected) return NextResponse.json({ error: 'Storage is unavailable.' }, { status: 503 });
      if (!deleted.rows.length) return NextResponse.json({ error: 'Record not found.' }, { status: 404 });
    }

    return NextResponse.json({ success: true, message: 'Address deleted successfully' });
  } catch (err: any) {
    return NextResponse.json({ error: err.message || 'Failed to delete address' }, { status: 500 });
  }
}
