import { NextResponse } from 'next/server';
import { getServerSession } from 'next-auth/next';
import { authOptions } from '@/lib/auth';
import { executeQuery, isDbConfigured } from '@/lib/db';

/**
 * POST /api/pro/availability
 * Updates the logged-in partner's availability in partner_profiles.
 * Body: { availability: 'AVAILABLE' | 'BUSY' | 'OFFLINE' }
 */
export async function POST(request: Request) {
  try {
    const session = await getServerSession(authOptions);
    const partnerId = (session?.user as any)?.id;

    if (!partnerId) {
      return NextResponse.json({ error: 'Unauthorized — not logged in as a partner.' }, { status: 401 });
    }

    const body = await request.json();
    const { availability = 'AVAILABLE' } = body;

    if (!['AVAILABLE', 'BUSY', 'OFFLINE'].includes(availability)) {
      return NextResponse.json({ error: 'Invalid availability value.' }, { status: 400 });
    }

    if (isDbConfigured) {
      const res = await executeQuery(
        `UPDATE partner_profiles
         SET availability = $1
         WHERE user_id = $2
         RETURNING availability`,
        [availability, partnerId]
      );

      if (!res.isConnected || res.rows.length === 0) {
        return NextResponse.json({ error: 'Partner profile not found in DB.' }, { status: 404 });
      }

      return NextResponse.json({
        success: true,
        availability: res.rows[0].availability,
      });
    }

    // Offline fallback
    return NextResponse.json({ success: true, availability });
  } catch (err: any) {
    return NextResponse.json(
      { error: err.message || 'Failed to update availability' },
      { status: 500 }
    );
  }
}

/**
 * GET /api/pro/availability
 * Returns the current availability of the logged-in partner.
 */
export async function GET() {
  try {
    const session = await getServerSession(authOptions);
    const partnerId = (session?.user as any)?.id;

    if (!partnerId) {
      return NextResponse.json({ availability: 'OFFLINE' });
    }

    if (isDbConfigured) {
      const res = await executeQuery(
        `SELECT availability FROM partner_profiles WHERE user_id = $1`,
        [partnerId]
      );
      if (res.isConnected && res.rows.length > 0) {
        return NextResponse.json({ availability: res.rows[0].availability });
      }
    }

    return NextResponse.json({ availability: 'OFFLINE' });
  } catch {
    return NextResponse.json({ availability: 'OFFLINE' });
  }
}
