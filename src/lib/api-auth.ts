import { getServerSession } from 'next-auth/next';
import { NextResponse } from 'next/server';
import { authOptions } from '@/lib/auth';
import { executeQuery } from '@/lib/db';

type Role = 'PATIENT' | 'PARTNER' | 'ADMIN' | 'SUPER_ADMIN';
type ApiUser = { id: string; role: Role };
type Authorization = { user: ApiUser; response?: never } | { user?: never; response: NextResponse };

/** Check the database on every private request so deleted accounts and revoked roles stop working. */
export async function requireApiUser(roles: readonly Role[], request?: Request): Promise<Authorization> {
  const deny = (status: number, error: string): Authorization => ({
    response: NextResponse.json({ error }, { status, headers: { 'Cache-Control': 'private, no-store' } }),
  });
  try {
    const session = await getServerSession(authOptions);
    const identity = session?.user as { id?: string; role?: string } | undefined;
    if (!identity?.id) return deny(401, 'Please sign in.');
    if (!roles.includes(identity.role as Role)) return deny(403, 'You do not have access to this resource.');

    if (request && !['GET', 'HEAD', 'OPTIONS'].includes(request.method)) {
      const origin = request.headers?.get('origin');
      if (request.headers?.get('sec-fetch-site') === 'cross-site'
        || (origin && origin !== new URL(request.url).origin)) {
        return deny(403, 'Cross-site requests are not allowed.');
      }
    }

    const result = await executeQuery<ApiUser & { verification_status?: string }>(
      `SELECT u.id, u.role, p.verification_status FROM users u
       LEFT JOIN partner_profiles p ON p.user_id = u.id WHERE u.id = $1`, [identity.id],
    );
    if (!result.isConnected) return deny(503, 'Authentication is temporarily unavailable.');
    const user = result.rows[0];
    if (!user || user.role !== identity.role) return deny(401, 'Your account has changed. Please sign in again.');
    if (!roles.includes(user.role)) return deny(403, 'You do not have access to this resource.');
    if (user.role === 'PARTNER' && user.verification_status !== 'APPROVED') {
      return deny(403, 'Your partner profile needs administrator approval before you can access appointments.');
    }
    return { user };
  } catch {
    return deny(503, 'Authentication is temporarily unavailable.');
  }
}
