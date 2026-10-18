import { requireApiUser } from '@/lib/api-auth';
import { executeQuery } from '@/lib/db';
import { ensureAppointmentSchema } from '@/lib/appointment-schema';
import { ensurePushSchema } from '@/lib/push-schema';
import { DEFAULT_REMINDERS, validateReminders } from '@/lib/doctor-reminders';

export const dynamic = 'force-dynamic';
const reply = (body: unknown, status = 200) => Response.json(body, { status, headers: { 'Cache-Control': 'private, no-store' } });
async function ensureSchema() { await ensureAppointmentSchema(); await ensurePushSchema(); }
export async function GET(request: Request) {
  const auth = await requireApiUser(['PARTNER'], request);
  if (auth.response) return auth.response;
  try {
    await ensureSchema();
    const result = await executeQuery('SELECT minutes FROM doctor_reminder_preferences WHERE user_id = $1', [auth.user.id]);
    if (!result.isConnected) throw new Error();
    return reply({ minutes: result.rows[0]?.minutes ?? DEFAULT_REMINDERS });
  } catch { return reply({ error: 'Your reminder settings could not be loaded. Please retry.' }, 503); }
}
export async function PUT(request: Request) {
  const auth = await requireApiUser(['PARTNER'], request);
  if (auth.response) return auth.response;
  let minutes;
  try { minutes = validateReminders((await request.json())?.minutes); }
  catch (error) { return reply({ error: error instanceof Error ? error.message : 'Check your reminder times.' }, 400); }
  try {
    await ensureSchema();
    const result = await executeQuery(`INSERT INTO doctor_reminder_preferences (user_id, minutes) VALUES ($1, $2::integer[])
      ON CONFLICT (user_id) DO UPDATE SET minutes = EXCLUDED.minutes, updated_at = NOW() RETURNING minutes`, [auth.user.id, minutes]);
    if (!result.isConnected || !result.rows.length) throw new Error();
    return reply({ success: true, minutes: result.rows[0].minutes });
  } catch { return reply({ error: 'Your reminders could not be saved. Please retry.' }, 503); }
}
