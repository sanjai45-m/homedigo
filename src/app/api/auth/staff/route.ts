import { NextResponse } from 'next/server';
import { authenticateCredentials } from '@/lib/auth';
import { createStaffSession, readStaffSession } from '@/lib/staff-session';
import { executeQuery } from '@/lib/db';

const headers = { 'Cache-Control': 'private, no-store' };

export async function POST(request: Request) {
  if (request.headers.get('sec-fetch-site') === 'cross-site'
    || request.headers.get('origin') !== new URL(request.url).origin) {
    return NextResponse.json({ error: 'Cross-site requests are not allowed.' }, { status: 403, headers });
  }
  if (!process.env.NEXTAUTH_SECRET) {
    return NextResponse.json({ error: 'Authentication is not configured.' }, { status: 503, headers });
  }
  try {
    const { email, password, expectedRole } = await request.json();
    if (typeof email !== 'string' || typeof password !== 'string'
      || !['ADMIN', 'SUPER_ADMIN', 'PARTNER'].includes(expectedRole)) {
      return NextResponse.json({ error: 'Provide valid staff credentials and a portal.' }, { status: 400, headers });
    }
    const user = await authenticateCredentials({ email, password, expectedRole });
    return NextResponse.json(await createStaffSession(user), { headers });
  } catch (error) {
    return NextResponse.json({ error: error instanceof Error ? error.message : 'Sign-in failed.' }, { status: 401, headers });
  }
}

export async function GET(request: Request) {
  const session = await readStaffSession(request.headers.get('authorization'));
  if (!session) return NextResponse.json({ error: 'Please sign in.' }, { status: 401, headers });
  const result = await executeQuery('SELECT id, role FROM users WHERE id = $1', [session.user.id]);
  if (!result.isConnected) return NextResponse.json({ error: 'Authentication is temporarily unavailable.' }, { status: 503, headers });
  if (result.rows[0]?.role !== session.user.role) {
    return NextResponse.json({ error: 'Your account has changed. Please sign in again.' }, { status: 401, headers });
  }
  return NextResponse.json(session, { headers });
}
