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
        `SELECT id, user_id, label, address_line1, address_line2, landmark, city, pincode, lat, lng, is_default, created_at 
         FROM addresses 
         WHERE user_id = $1 OR user_id = $2 OR user_id = 'usr_pat_001' OR user_id IS NULL OR user_id = ''
         ORDER BY is_default DESC, created_at ASC`,
        [userId || 'usr_pat_001', email || 'usr_pat_001']
      );
    } else {
      res = await executeQuery(
        `SELECT id, user_id, label, address_line1, address_line2, landmark, city, pincode, lat, lng, is_default, created_at 
         FROM addresses 
         ORDER BY is_default DESC, created_at ASC`
      );
    }
    if (res.isConnected) {
      return NextResponse.json({ addresses: res.rows || [] });
    }
  }

  return NextResponse.json({ addresses: [] });
}

export async function POST(request: Request) {
  try {
    const body = await request.json();
    const {
      userId = 'usr_pat_001',
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

    const createdAddress = {
      id,
      user_id: userId,
      label,
      address_line1: addressLine1,
      address_line2: addressLine2,
      landmark,
      city,
      pincode,
      lat,
      lng,
      is_default: isDefault,
    };

    return NextResponse.json({ success: true, address: createdAddress });
  } catch (err: any) {
    return NextResponse.json({ error: err.message || 'Failed to add address' }, { status: 500 });
  }
}

export async function PUT(request: Request) {
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
         WHERE id = $10
         RETURNING *`,
        [label, addressLine1, addressLine2, landmark, city, pincode, lat, lng, isDefault, id]
      );
      if (updateRes.isConnected && updateRes.rows.length > 0) {
        return NextResponse.json({ success: true, address: updateRes.rows[0] });
      }
    }

    const updatedAddress = {
      id,
      label,
      address_line1: addressLine1,
      address_line2: addressLine2,
      landmark,
      city,
      pincode,
      lat,
      lng,
      is_default: isDefault,
    };

    return NextResponse.json({ success: true, address: updatedAddress });
  } catch (err: any) {
    return NextResponse.json({ error: err.message || 'Failed to update address' }, { status: 500 });
  }
}

export async function DELETE(request: Request) {
  try {
    const { searchParams } = new URL(request.url);
    const id = searchParams.get('id');

    if (!id) {
      return NextResponse.json({ error: 'Address ID is required' }, { status: 400 });
    }

    if (isDbConfigured) {
      await executeQuery('DELETE FROM addresses WHERE id = $1', [id]);
    }

    return NextResponse.json({ success: true, message: 'Address deleted successfully' });
  } catch (err: any) {
    return NextResponse.json({ error: err.message || 'Failed to delete address' }, { status: 500 });
  }
}
