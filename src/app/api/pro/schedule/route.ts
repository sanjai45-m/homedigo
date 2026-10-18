import { randomUUID } from 'node:crypto';
import { requireApiUser } from '@/lib/api-auth';
import { executeQuery, executePartnerQuery } from '@/lib/db';
import { defaultSchedule, validateSchedule } from '@/lib/doctor-schedule';
import { ensureDoctorScheduleSchema } from '@/lib/doctor-schedule-store';

export const dynamic = 'force-dynamic';
const reply = (data: unknown, status = 200) => Response.json(data, { status, headers: { 'Cache-Control': 'private, no-store' } });
export async function GET(request: Request) {
  const auth = await requireApiUser(['PARTNER'], request);
  if (auth.response) return auth.response;
  try {
    await ensureDoctorScheduleSchema();
    const result = await executeQuery('SELECT schedule FROM doctor_schedules WHERE user_id = $1', [auth.user.id]);
    if (!result.isConnected) throw new Error();
    return reply({ configured: Boolean(result.rows[0]), schedule: result.rows[0]?.schedule || defaultSchedule() });
  } catch { return reply({ error: 'Your hours could not be loaded. Please retry.' }, 503); }
}
export async function PUT(request: Request) {
  const auth = await requireApiUser(['PARTNER'], request);
  if (auth.response) return auth.response;
  let schedule;
  try { schedule = validateSchedule(await request.json()); }
  catch (error) { return reply({ error: error instanceof Error ? error.message : 'Check your working hours.' }, 400); }
  try {
    await ensureDoctorScheduleSchema();
    const result = await executePartnerQuery(auth.user.id, `INSERT INTO doctor_schedules (user_id, schedule, version)
      VALUES ($1, $2::jsonb, $3) ON CONFLICT (user_id) DO UPDATE SET schedule = EXCLUDED.schedule, version = EXCLUDED.version, updated_at = NOW()
      RETURNING user_id`, [auth.user.id, JSON.stringify(schedule), randomUUID()]);
    if (!result.isConnected) throw new Error();
    return reply({ success: true, schedule });
  } catch { return reply({ error: 'Your hours could not be saved. Please retry.' }, 503); }
}
