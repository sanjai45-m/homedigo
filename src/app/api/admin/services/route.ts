import { NextResponse } from 'next/server';
import { executeQuery, isDbConfigured } from '@/lib/db';

export async function GET() {
  if (isDbConfigured) {
    const res = await executeQuery(
      `SELECT id, title, category, description, base_price, duration_minutes, icon, is_active, 
              COALESCE(visiting_fee, 0) as visiting_fee, COALESCE(commission_percentage, 15) as commission_percentage
       FROM services 
       ORDER BY title ASC`
    );
    if (res.isConnected && res.rows.length > 0) {
      return NextResponse.json({ services: res.rows });
    }
  }

  // Initial fallback services
  const fallbackServices = [
    {
      id: 'srv_doc',
      title: 'Doctor Home Visit',
      category: 'CONSULTATION',
      description: 'General physician doorstep clinical checkup and consultation',
      base_price: 500,
      visiting_fee: 50,
      commission_percentage: 15,
      duration_minutes: 45,
      icon: 'Stethoscope',
      is_active: true,
    },
    {
      id: 'srv_nurse',
      title: 'Home Nursing Care',
      category: 'PROCEDURE',
      description: 'IV infusion, injections, catheter care, and vital monitoring',
      base_price: 350,
      visiting_fee: 40,
      commission_percentage: 15,
      duration_minutes: 60,
      icon: 'HeartHandshake',
      is_active: true,
    },
    {
      id: 'srv_dressing',
      title: 'Wound Dressing & Care',
      category: 'PROCEDURE',
      description: 'Sterile dressing for diabetic foot ulcers, burns and post-surgical wounds',
      base_price: 300,
      visiting_fee: 30,
      commission_percentage: 12,
      duration_minutes: 30,
      icon: 'Bandage',
      is_active: true,
    },
    {
      id: 'srv_physio',
      title: 'Physiotherapy & Rehab',
      category: 'THERAPY',
      description: 'Neuro, orthopedic, and post-surgery mobility rehabilitation',
      base_price: 600,
      visiting_fee: 60,
      commission_percentage: 18,
      duration_minutes: 50,
      icon: 'Activity',
      is_active: true,
    },
    {
      id: 'srv_lab',
      title: 'Lab Sample Collection',
      category: 'DIAGNOSTICS',
      description: 'NABL certified doorstep diagnostic blood sample collection',
      base_price: 199,
      visiting_fee: 25,
      commission_percentage: 10,
      duration_minutes: 15,
      icon: 'TestTube',
      is_active: true,
    },
  ];

  return NextResponse.json({ services: fallbackServices });
}

export async function POST(request: Request) {
  try {
    const body = await request.json();
    const {
      title,
      category = 'CONSULTATION',
      description = '',
      basePrice = 500,
      visitingFee = 50,
      commissionPercentage = 15,
      durationMinutes = 45,
      icon = 'Stethoscope',
      isActive = true,
    } = body;

    if (!title || !basePrice) {
      return NextResponse.json({ error: 'Title and Base Price are required' }, { status: 400 });
    }

    const serviceId = `srv_${Date.now()}`;

    if (isDbConfigured) {
      // Ensure extra columns exist or alter table dynamically
      await executeQuery(`
        ALTER TABLE services 
        ADD COLUMN IF NOT EXISTS visiting_fee NUMERIC(10, 2) DEFAULT 0,
        ADD COLUMN IF NOT EXISTS commission_percentage NUMERIC(5, 2) DEFAULT 15;
      `);

      const insertRes = await executeQuery(
        `INSERT INTO services (id, title, category, description, base_price, visiting_fee, commission_percentage, duration_minutes, icon, is_active)
         VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10)
         RETURNING *`,
        [
          serviceId,
          title,
          category,
          description,
          Number(basePrice),
          Number(visitingFee),
          Number(commissionPercentage),
          Number(durationMinutes),
          icon,
          isActive,
        ]
      );

      if (insertRes.isConnected && insertRes.rows.length > 0) {
        return NextResponse.json({ success: true, service: insertRes.rows[0] });
      }
    }

    const createdService = {
      id: serviceId,
      title,
      category,
      description,
      base_price: Number(basePrice),
      visiting_fee: Number(visitingFee),
      commission_percentage: Number(commissionPercentage),
      duration_minutes: Number(durationMinutes),
      icon,
      is_active: isActive,
    };

    return NextResponse.json({ success: true, service: createdService });
  } catch (err: any) {
    return NextResponse.json({ error: err.message || 'Failed to create service' }, { status: 500 });
  }
}

export async function PUT(request: Request) {
  try {
    const body = await request.json();
    const { id, title, category, description, basePrice, visitingFee, commissionPercentage, durationMinutes, isActive } = body;

    if (!id) {
      return NextResponse.json({ error: 'Service ID is required' }, { status: 400 });
    }

    if (isDbConfigured) {
      await executeQuery(`
        ALTER TABLE services 
        ADD COLUMN IF NOT EXISTS visiting_fee NUMERIC(10, 2) DEFAULT 0,
        ADD COLUMN IF NOT EXISTS commission_percentage NUMERIC(5, 2) DEFAULT 15;
      `);

      const updateRes = await executeQuery(
        `UPDATE services 
         SET title = COALESCE($1, title),
             category = COALESCE($2, category),
             description = COALESCE($3, description),
             base_price = COALESCE($4, base_price),
             visiting_fee = COALESCE($5, visiting_fee),
             commission_percentage = COALESCE($6, commission_percentage),
             duration_minutes = COALESCE($7, duration_minutes),
             is_active = COALESCE($8, is_active)
         WHERE id = $9
         RETURNING *`,
        [
          title,
          category,
          description,
          basePrice ? Number(basePrice) : null,
          visitingFee !== undefined ? Number(visitingFee) : null,
          commissionPercentage !== undefined ? Number(commissionPercentage) : null,
          durationMinutes ? Number(durationMinutes) : null,
          isActive !== undefined ? isActive : null,
          id,
        ]
      );

      if (updateRes.isConnected && updateRes.rows.length > 0) {
        return NextResponse.json({ success: true, service: updateRes.rows[0] });
      }
    }

    return NextResponse.json({ success: true, message: 'Service updated successfully' });
  } catch (err: any) {
    return NextResponse.json({ error: err.message || 'Failed to update service' }, { status: 500 });
  }
}

export async function DELETE(request: Request) {
  try {
    const { searchParams } = new URL(request.url);
    const id = searchParams.get('id');

    if (!id) {
      return NextResponse.json({ error: 'Service ID is required' }, { status: 400 });
    }

    if (isDbConfigured) {
      await executeQuery('DELETE FROM services WHERE id = $1', [id]);
    }

    return NextResponse.json({ success: true, message: 'Service deleted' });
  } catch (err: any) {
    return NextResponse.json({ error: err.message || 'Failed to delete service' }, { status: 500 });
  }
}
