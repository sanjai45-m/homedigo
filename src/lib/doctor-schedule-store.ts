import { executeQuery } from './db';
import { ensureAppointmentSchema } from './appointment-schema';
import { bookableDate, scheduleSlots, type DoctorSchedule } from './doctor-schedule';
import { appointmentDate, appointmentStart } from './appointment-time';

let ready: Promise<void> | undefined;
export function ensureDoctorScheduleSchema() {
  ready ??= (async () => {
    await ensureAppointmentSchema();
    for (const statement of [
      `CREATE TABLE IF NOT EXISTS doctor_schedules (
        user_id VARCHAR(64) PRIMARY KEY REFERENCES users(id) ON DELETE CASCADE,
        schedule JSONB NOT NULL, version TEXT NOT NULL, updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
      )`,
      `ALTER TABLE bookings ADD COLUMN IF NOT EXISTS appointment_ends_at TIMESTAMPTZ,
        ADD COLUMN IF NOT EXISTS slot_reserved_until TIMESTAMPTZ`,
      `CREATE INDEX IF NOT EXISTS bookings_partner_start_idx ON bookings (partner_id, appointment_starts_at)`,
    ]) {
      if (!(await executeQuery(statement)).isConnected) throw new Error('Schedule storage unavailable.');
    }
    const legacy = await executeQuery<{ id: string; scheduled_date: string; scheduled_time_slot: string; created_at: string }>(
      `SELECT id, scheduled_date, scheduled_time_slot, created_at FROM bookings
       WHERE appointment_starts_at IS NULL AND status NOT IN ('CANCELLED', 'COMPLETED')`);
    if (!legacy.isConnected) throw new Error('Schedule storage unavailable.');
    for (const booking of legacy.rows) {
      let start: string, end: string;
      try {
        const date = appointmentDate(booking.scheduled_date, new Date(booking.created_at));
        start = appointmentStart(date, booking.scheduled_time_slot);
        const ending = booking.scheduled_time_slot.split(/\s*[-–]\s*/)[1];
        end = ending ? appointmentStart(date, `${ending} - ${ending}`) : new Date(Date.parse(start) + 3600000).toISOString();
        if (Date.parse(end) <= Date.parse(start)) end = new Date(Date.parse(start) + 3600000).toISOString();
      } catch { continue; }
      if (!(await executeQuery(`UPDATE bookings SET appointment_starts_at = $2, appointment_ends_at = $3,
        slot_reserved_until = $3 WHERE id = $1 AND appointment_starts_at IS NULL`, [booking.id, start, end])).isConnected) throw new Error('Schedule storage unavailable.');
    }
  })().catch(error => { ready = undefined; throw error; });
  return ready;
}

export async function readDoctorSlots(id: string, value: string) {
  const date = bookableDate(value);
  await ensureDoctorScheduleSchema();
  const result = await executeQuery<{ availability: string; schedule: DoctorSchedule | null; version: string | null }>(
    `SELECT p.availability, s.schedule, s.version FROM partner_profiles p JOIN users u ON u.id = p.user_id
      LEFT JOIN doctor_schedules s ON s.user_id = p.user_id
      WHERE p.user_id = $1 AND u.role = 'PARTNER' AND p.verification_status = 'APPROVED'`, [id]);
  if (!result.isConnected) throw new Error('Schedule storage unavailable.');
  const doctor = result.rows[0];
  if (!doctor) return null;
  if (doctor.availability !== 'AVAILABLE' || !doctor.schedule) return { date, availability: doctor.availability,
    configured: Boolean(doctor.schedule), version: doctor.version, slots: [] };
  const busy = await executeQuery<{ start: string; end: string }>(`SELECT appointment_starts_at AS start,
      COALESCE(slot_reserved_until, appointment_ends_at, appointment_starts_at + INTERVAL '1 hour') AS end
    FROM bookings WHERE partner_id = $1 AND status NOT IN ('CANCELLED', 'COMPLETED')
      AND appointment_starts_at < ($2::date + INTERVAL '1 day') AT TIME ZONE 'Asia/Kolkata'
      AND COALESCE(slot_reserved_until, appointment_ends_at, appointment_starts_at + INTERVAL '1 hour') > $2::date AT TIME ZONE 'Asia/Kolkata'`, [id, date]);
  if (!busy.isConnected) throw new Error('Schedule storage unavailable.');
  return { date, availability: doctor.availability, configured: true, version: doctor.version,
    slots: scheduleSlots(doctor.schedule, date, busy.rows) };
}
