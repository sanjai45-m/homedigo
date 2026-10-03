import { executeQuery } from './db';

let ready: Promise<void> | undefined;

// Additive, idempotent migration; retry on failure instead of caching a broken schema.
export function ensureAppointmentSchema() {
  ready ??= (async () => {
    const statements = [
      `ALTER TABLE bookings
         ADD COLUMN IF NOT EXISTS appointment_starts_at TIMESTAMPTZ,
         ADD COLUMN IF NOT EXISTS doctor_confirmed_at TIMESTAMPTZ`,
      `CREATE TABLE IF NOT EXISTS appointment_emails (
         id BIGSERIAL PRIMARY KEY,
         booking_id VARCHAR(64) NOT NULL REFERENCES bookings(id) ON DELETE CASCADE,
         partner_id VARCHAR(64) NOT NULL,
         confirmed_at TIMESTAMPTZ NOT NULL,
         kind TEXT NOT NULL CHECK (kind IN ('PATIENT_CONFIRMATION', 'DOCTOR_REMINDER')),
         due_at TIMESTAMPTZ NOT NULL,
         sent_at TIMESTAMPTZ,
         lease_until TIMESTAMPTZ,
         lease_token TEXT,
         attempts INTEGER NOT NULL DEFAULT 0,
         last_error TEXT,
         UNIQUE (booking_id, confirmed_at, kind)
       )`,
      `CREATE INDEX IF NOT EXISTS appointment_emails_due_idx
         ON appointment_emails (due_at) WHERE sent_at IS NULL`,
    ];
    for (const statement of statements) {
      const result = await executeQuery(statement);
      if (!result.isConnected) throw new Error('Appointment storage is unavailable.');
    }
  })().catch((error) => { ready = undefined; throw error; });
  return ready;
}
