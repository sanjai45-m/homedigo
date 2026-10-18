import { randomUUID } from 'node:crypto';
import { requireApiUser } from '@/lib/api-auth';
import { executeQuery } from '@/lib/db';
import { ensurePushSchema } from '@/lib/push-schema';
import { ensureAppointmentSchema } from '@/lib/appointment-schema';
import { pushConfigured } from '@/lib/push-config';

export const dynamic = 'force-dynamic';
const reply = (body: unknown, status = 200) => Response.json(body, { status, headers: { 'Cache-Control': 'private, no-store' } });

async function subscription(request: Request, remove: boolean) {
  const auth = await requireApiUser(['PATIENT', 'PARTNER'], request);
  if (auth.response) return auth.response;
  if (!remove && !pushConfigured()) return reply({ error: 'Notifications are not available yet.' }, 503);
  const body = await request.json().catch(() => null);
  if (!body || typeof body.fid !== 'string' || !/^[A-Za-z0-9_-]{20,128}$/.test(body.fid)) {
    return reply({ error: 'A valid browser registration is required.' }, 400);
  }
  try {
    await ensureAppointmentSchema();
    await ensurePushSchema();
    if (remove) {
      const deleted = await executeQuery('DELETE FROM push_subscriptions WHERE fid = $1 AND user_id = $2', [body.fid, auth.user.id]);
      if (!deleted.isConnected) throw new Error('Storage unavailable');
      return reply({ enabled: false });
    }
    // Automatic refresh cannot silently replace another signed-in account's subscription.
    // An explicit Enable click can transfer it; queued deliveries still check their original user.
    const saved = await executeQuery(`INSERT INTO push_subscriptions (id, user_id, role, fid)
      VALUES ($1, $2, $3, $4) ON CONFLICT (fid) DO UPDATE SET
        user_id = EXCLUDED.user_id, role = EXCLUDED.role, updated_at = NOW(), authorized_at = NOW(),
        created_at = CASE WHEN push_subscriptions.user_id = EXCLUDED.user_id THEN push_subscriptions.created_at ELSE NOW() END
      WHERE push_subscriptions.user_id = EXCLUDED.user_id OR $5 = TRUE RETURNING id`,
    [randomUUID(), auth.user.id, auth.user.role, body.fid, body.replace === true]);
    if (!saved.isConnected) throw new Error('Storage unavailable');
    if (!saved.rows.length) return reply({ error: 'Another account uses notifications in this browser. Choose Enable notifications to switch to this account.' }, 409);
    return reply({ enabled: true });
  } catch {
    return reply({ error: 'Could not update notifications. Please retry.' }, 503);
  }
}

export function POST(request: Request) { return subscription(request, false); }
export function DELETE(request: Request) { return subscription(request, true); }
