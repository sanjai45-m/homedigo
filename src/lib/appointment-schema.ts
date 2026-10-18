import { executeQuery } from './db';

let ready: Promise<void> | undefined;

// Additive, idempotent migration; retry on failure instead of caching a broken schema.
export function ensureAppointmentSchema() {
  ready ??= (async () => {
    const statements = [
      `ALTER TABLE bookings
         ADD COLUMN IF NOT EXISTS appointment_starts_at TIMESTAMPTZ,
         ADD COLUMN IF NOT EXISTS doctor_confirmed_at TIMESTAMPTZ,
         ADD COLUMN IF NOT EXISTS booking_request_key TEXT,
         ADD COLUMN IF NOT EXISTS payment_verified_at TIMESTAMPTZ,
         ADD COLUMN IF NOT EXISTS payment_verified_by VARCHAR(64),
         ADD COLUMN IF NOT EXISTS partner_location_updated_at TIMESTAMPTZ,
         ADD COLUMN IF NOT EXISTS partner_location_accuracy DOUBLE PRECISION,
         ADD COLUMN IF NOT EXISTS cancellation_reason TEXT`,
      `CREATE UNIQUE INDEX IF NOT EXISTS bookings_request_key_idx ON bookings (user_id, booking_request_key)`,
      `CREATE TABLE IF NOT EXISTS payment_receipts (
         booking_id VARCHAR(64) PRIMARY KEY REFERENCES bookings(id) ON DELETE CASCADE,
         mime_type TEXT NOT NULL,
         image_base64 TEXT NOT NULL,
         created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
       )`,
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
      `ALTER TABLE appointment_emails DROP CONSTRAINT IF EXISTS appointment_emails_kind_check,
         ADD CONSTRAINT appointment_emails_kind_check CHECK (kind IN ('PATIENT_REQUEST', 'PATIENT_CONFIRMATION', 'DOCTOR_REMINDER', 'DOCTOR_REVIEW', 'PATIENT_CANCELLED', 'DOCTOR_CANCELLED')),
         ALTER COLUMN partner_id DROP NOT NULL`,
      `CREATE TABLE IF NOT EXISTS appointment_status_events (
         id BIGSERIAL PRIMARY KEY, booking_id VARCHAR(64) NOT NULL REFERENCES bookings(id) ON DELETE CASCADE,
         user_id VARCHAR(64) NOT NULL, partner_id VARCHAR(64), status TEXT NOT NULL,
         created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
       )`,
      `CREATE INDEX IF NOT EXISTS appointment_status_events_booking_idx ON appointment_status_events (booking_id, created_at)`,
      `ALTER TABLE appointment_status_events ADD COLUMN IF NOT EXISTS cancellation_reason TEXT`,
      `ALTER TABLE appointment_emails ADD COLUMN IF NOT EXISTS event_id BIGINT REFERENCES appointment_status_events(id) ON DELETE CASCADE`,
      `CREATE UNIQUE INDEX IF NOT EXISTS appointment_emails_event_kind_idx ON appointment_emails (event_id, kind)`,
      `CREATE OR REPLACE FUNCTION homedigo_record_visit_status() RETURNS TRIGGER LANGUAGE plpgsql AS $$
       DECLARE event_key BIGINT;
       BEGIN
         IF OLD.status IS DISTINCT FROM NEW.status AND NEW.user_id IS NOT NULL
           AND NEW.status IN ('ON_THE_WAY', 'ARRIVED', 'IN_PROGRESS', 'COMPLETED', 'CANCELLED') THEN
           INSERT INTO appointment_status_events (booking_id, user_id, partner_id, status, cancellation_reason)
           VALUES (NEW.id, NEW.user_id, NEW.partner_id, NEW.status, CASE WHEN NEW.status = 'CANCELLED' THEN NEW.cancellation_reason END)
           RETURNING id INTO event_key;
           IF NEW.status = 'CANCELLED' THEN
             INSERT INTO appointment_emails (booking_id, partner_id, confirmed_at, kind, due_at, event_id)
             VALUES (NEW.id, NEW.partner_id, NOW(), 'PATIENT_CANCELLED', NOW(), event_key);
             IF NEW.partner_id IS NOT NULL THEN
               INSERT INTO appointment_emails (booking_id, partner_id, confirmed_at, kind, due_at, event_id)
               VALUES (NEW.id, NEW.partner_id, NOW(), 'DOCTOR_CANCELLED', NOW(), event_key);
             END IF;
           END IF;
         END IF;
         RETURN NEW;
       END $$`,
      `CREATE OR REPLACE TRIGGER homedigo_visit_status_changed AFTER UPDATE OF status ON bookings
       FOR EACH ROW EXECUTE FUNCTION homedigo_record_visit_status()`,
    ];
    for (const statement of statements) {
      const result = await executeQuery(statement);
      if (!result.isConnected) throw new Error('Appointment storage is unavailable.');
    }
  })().catch((error) => { ready = undefined; throw error; });
  return ready;
}
