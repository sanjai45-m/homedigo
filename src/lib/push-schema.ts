import { executeQuery } from './db';

let ready: Promise<void> | undefined;
export function ensurePushSchema() {
  ready ??= (async () => {
    for (const sql of [
      `CREATE TABLE IF NOT EXISTS push_subscriptions (
        id TEXT PRIMARY KEY, user_id VARCHAR(64) NOT NULL REFERENCES users(id) ON DELETE CASCADE,
        role TEXT NOT NULL CHECK (role IN ('PATIENT', 'PARTNER')), fid TEXT NOT NULL UNIQUE,
        created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(), updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
        authorized_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
      )`,
      `CREATE INDEX IF NOT EXISTS push_subscriptions_user_idx ON push_subscriptions (user_id)`,
      `CREATE TABLE IF NOT EXISTS appointment_push_deliveries (
        id BIGSERIAL PRIMARY KEY, source_key TEXT NOT NULL,
        email_id BIGINT REFERENCES appointment_emails(id) ON DELETE CASCADE,
        booking_id VARCHAR(64) NOT NULL REFERENCES bookings(id) ON DELETE CASCADE,
        subscription_id TEXT NOT NULL REFERENCES push_subscriptions(id) ON DELETE CASCADE,
        user_id VARCHAR(64) NOT NULL, kind TEXT NOT NULL,
        due_at TIMESTAMPTZ NOT NULL, sent_at TIMESTAMPTZ, discarded_at TIMESTAMPTZ,
        attempts INTEGER NOT NULL DEFAULT 0, lease_token TEXT, lease_until TIMESTAMPTZ, last_error TEXT,
        UNIQUE (source_key, subscription_id, user_id)
      )`,
      `CREATE INDEX IF NOT EXISTS appointment_push_due_idx ON appointment_push_deliveries (due_at)
        WHERE sent_at IS NULL AND discarded_at IS NULL`,
    ]) {
      const result = await executeQuery(sql);
      if (!result.isConnected) throw new Error('Push storage unavailable.');
    }
  })().catch(error => { ready = undefined; throw error; });
  return ready;
}
