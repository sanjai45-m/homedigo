import { executeQuery } from './db';

let ready: Promise<void> | undefined;
export function ensurePasswordResetSchema() {
  ready ??= (async () => {
    for (const query of [
      `ALTER TABLE users ADD COLUMN IF NOT EXISTS password_changed_at TIMESTAMPTZ`,
      `CREATE TABLE IF NOT EXISTS password_reset_requests (
        user_id VARCHAR(64) PRIMARY KEY REFERENCES users(id) ON DELETE CASCADE,
        id UUID NOT NULL UNIQUE, email TEXT NOT NULL, role TEXT NOT NULL CHECK (role IN ('PATIENT','PARTNER','ADMIN')),
        status TEXT NOT NULL CHECK (status IN ('CODE','PENDING','SENDING','APPROVED','REJECTED','USED','EMAIL_FAILED')),
        secret_hash TEXT, attempts INTEGER NOT NULL DEFAULT 0, created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
        expires_at TIMESTAMPTZ NOT NULL, decided_by VARCHAR(64), decided_at TIMESTAMPTZ, used_at TIMESTAMPTZ
      )`,
      `CREATE TABLE IF NOT EXISTS password_reset_limits (
        key TEXT PRIMARY KEY, hits INTEGER NOT NULL, window_start TIMESTAMPTZ NOT NULL DEFAULT NOW()
      )`,
    ]) {
      const result = await executeQuery(query);
      if (!result.isConnected) throw new Error('Password recovery is temporarily unavailable.');
    }
  })().catch(error => { ready = undefined; throw error; });
  return ready;
}

export function sessionPredatesPasswordChange(issuedAt: unknown, changedAt: unknown) {
  if (!changedAt) return false;
  const changed = new Date(changedAt as string).getTime();
  return typeof issuedAt !== 'number' || !Number.isFinite(issuedAt) || issuedAt <= changed;
}
