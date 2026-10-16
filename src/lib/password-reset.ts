import { createHmac, randomInt, randomBytes, randomUUID } from 'node:crypto';
import { executeQuery } from './db';
import { ensurePasswordResetSchema } from './password-reset-schema';
import { hashPassword, isRetiredSetupPassword } from './passwords';
import { sendPasswordRecoveryEmail } from './email';

export type RecoveryRole = 'PATIENT' | 'PARTNER' | 'ADMIN';
export class RecoveryError extends Error {
  constructor(message: string, public status = 400) { super(message); }
}
const invalid = () => new RecoveryError('The code or link is invalid, expired, or already used. Request a new reset.');

async function query<T = Record<string, unknown>>(sql: string, params: unknown[] = []) {
  const result = await executeQuery<T>(sql, params);
  if (!result.isConnected) throw new RecoveryError('Password recovery is temporarily unavailable. Please try again.', 503);
  return result.rows;
}
function digest(value: string) {
  if (!process.env.NEXTAUTH_SECRET) throw new RecoveryError('Password recovery is temporarily unavailable.', 503);
  return createHmac('sha256', process.env.NEXTAUTH_SECRET).update(`password-reset:${value}`).digest('hex');
}
export function recoveryBaseUrl() {
  const configured = process.env.PASSWORD_RESET_BASE_URL
    || (process.env.VERCEL_PROJECT_PRODUCTION_URL ? `https://${process.env.VERCEL_PROJECT_PRODUCTION_URL}` : '')
    || process.env.NEXT_PUBLIC_APP_URL || process.env.NEXTAUTH_URL || 'https://homedigo.vercel.app';
  const url = new URL(configured);
  if (process.env.NODE_ENV === 'production' && (url.protocol !== 'https:' || ['localhost', '127.0.0.1'].includes(url.hostname))) {
    return 'https://homedigo.vercel.app';
  }
  return url.origin;
}

export async function requestPasswordReset(email: string, role: RecoveryRole) {
  await ensurePasswordResetSchema();
  const requestId = randomUUID();
  // Persistent per-account limits work across serverless instances and never store raw emails.
  const key = digest(`limit:${email}`);
  const limited = await query(`INSERT INTO password_reset_limits (key, hits) VALUES ($1, 1)
    ON CONFLICT (key) DO UPDATE SET
      hits = CASE WHEN password_reset_limits.window_start < NOW() - INTERVAL '1 hour' THEN 1 ELSE password_reset_limits.hits + 1 END,
      window_start = CASE WHEN password_reset_limits.window_start < NOW() - INTERVAL '1 hour' THEN NOW() ELSE password_reset_limits.window_start END
    WHERE password_reset_limits.window_start < NOW() - INTERVAL '1 hour' OR password_reset_limits.hits < 5
    RETURNING key`, [key]);
  if (!limited.length) throw new RecoveryError('Too many requests. Please try again in an hour.', 429);
  await query(`DELETE FROM password_reset_limits WHERE window_start < NOW() - INTERVAL '2 days'`);
  const code = String(randomInt(0, 1000000)).padStart(6, '0');
  const rows = await query<{ id: string; email: string }>(`INSERT INTO password_reset_requests
    (user_id, id, email, role, status, secret_hash, expires_at)
    SELECT id, $1::uuid, email, role, $4, $5, NOW() + ($6 * INTERVAL '1 minute') FROM users
    WHERE LOWER(email) = $2 AND role = $3
    ON CONFLICT (user_id) DO UPDATE SET id = EXCLUDED.id, email = EXCLUDED.email, role = EXCLUDED.role,
      status = EXCLUDED.status, secret_hash = EXCLUDED.secret_hash, attempts = 0, created_at = NOW(),
      expires_at = EXCLUDED.expires_at, decided_by = NULL, decided_at = NULL, used_at = NULL
    WHERE password_reset_requests.created_at < NOW() - INTERVAL '1 minute'
      AND NOT (password_reset_requests.role = 'ADMIN' AND password_reset_requests.status IN ('PENDING','SENDING','APPROVED')
        AND password_reset_requests.expires_at > NOW())
    RETURNING id, email`, [requestId, email, role, role === 'ADMIN' ? 'PENDING' : 'CODE',
    role === 'ADMIN' ? null : digest(`${requestId}:${code}`), role === 'ADMIN' ? 1440 : 10]);
  if (rows.length && role !== 'ADMIN') {
    const sent = await sendPasswordRecoveryEmail(rows[0].email, { kind: 'code', value: code });
    if (!sent.success) {
      await query(`UPDATE password_reset_requests SET status = 'EMAIL_FAILED', secret_hash = NULL WHERE id = $1::uuid`, [requestId]);
    }
  }
  // Identical public responses also cover unknown emails, wrong roles and suppressed resends.
  return { requestId, message: role === 'ADMIN'
    ? 'If this email belongs to an admin, a request is awaiting Super Admin approval. An approved reset link will be emailed to that address.'
    : 'If a matching account exists, a verification code will be emailed to that address. Check your inbox and spam folder.' };
}

export async function completePasswordReset(id: string, role: RecoveryRole, secret: string, password: string) {
  if (password.length < 12 || password.length > 128 || isRetiredSetupPassword(password)) {
    throw new RecoveryError('Use a new password with 12 to 128 characters.');
  }
  await ensurePasswordResetSchema();
  const claimed = await query(`UPDATE password_reset_requests SET attempts = attempts + 1
    WHERE id = $1::uuid AND role = $2 AND status = $3 AND expires_at > NOW() AND attempts < 5 RETURNING id`,
  [id, role, role === 'ADMIN' ? 'APPROVED' : 'CODE']);
  if (!claimed.length) throw invalid();
  // Consume the secret and change the password in one statement. Concurrent/replayed resets cannot both succeed.
  const updated = await query<{ email: string }>(`WITH eligible AS (
      SELECT r.user_id FROM password_reset_requests r JOIN users u ON u.id = r.user_id
      WHERE r.id = $1::uuid AND r.role = $2 AND u.role = r.role AND u.email = r.email
        AND r.status = $3 AND r.secret_hash = $4 AND r.expires_at > NOW() AND r.attempts <= 5
      FOR UPDATE OF r, u
    ), consumed AS (
      UPDATE password_reset_requests SET status = 'USED', secret_hash = NULL, used_at = clock_timestamp()
      WHERE user_id IN (SELECT user_id FROM eligible) AND status = $3 RETURNING user_id
    ) UPDATE users SET password_hash = $5, password_changed_at = clock_timestamp(), updated_at = NOW()
      WHERE id IN (SELECT user_id FROM consumed) RETURNING email`,
  [id, role, role === 'ADMIN' ? 'APPROVED' : 'CODE', digest(`${id}:${secret}`), hashPassword(password)]);
  if (!updated.length) throw invalid();
  // A notification failure must not pretend that the already committed password change failed.
  await sendPasswordRecoveryEmail(updated[0].email, { kind: 'changed' });
}

export async function listAdminResetRequests() {
  await ensurePasswordResetSchema();
  return query(`SELECT r.id, r.email, u.name, r.status, r.created_at, r.expires_at, r.expires_at < NOW() AS expired, r.decided_at,
      reviewer.name AS decided_by_name
    FROM password_reset_requests r JOIN users u ON u.id = r.user_id
    LEFT JOIN users reviewer ON reviewer.id = r.decided_by
    WHERE r.role = 'ADMIN' AND u.role = 'ADMIN' AND u.email = r.email
    ORDER BY r.created_at DESC LIMIT 100`);
}

export async function decideAdminReset(id: string, action: 'approve' | 'reject', reviewerId: string) {
  await ensurePasswordResetSchema();
  if (action === 'reject') {
    const rows = await query(`UPDATE password_reset_requests SET status = 'REJECTED', secret_hash = NULL,
      decided_by = $2, decided_at = NOW() WHERE id = $1::uuid AND role = 'ADMIN'
      AND status IN ('PENDING','EMAIL_FAILED') AND expires_at > NOW() RETURNING id`, [id, reviewerId]);
    if (!rows.length) throw new RecoveryError('This request is expired or has already been handled.', 409);
    return { message: 'Password reset request rejected.' };
  }
  const token = randomBytes(32).toString('base64url');
  const rows = await query<{ email: string }>(`UPDATE password_reset_requests r SET status = 'SENDING',
    secret_hash = $3, attempts = 0, expires_at = NOW() + INTERVAL '30 minutes', decided_by = $2, decided_at = NOW()
    FROM users u WHERE r.id = $1::uuid AND r.user_id = u.id AND r.role = 'ADMIN' AND u.role = 'ADMIN' AND u.email = r.email
      AND r.expires_at > NOW() AND (r.status IN ('PENDING','EMAIL_FAILED') OR (r.status = 'SENDING' AND r.decided_at < NOW() - INTERVAL '5 minutes'))
    RETURNING r.email`, [id, reviewerId, digest(`${id}:${token}`)]);
  if (!rows.length) throw new RecoveryError('This request is expired or has already been handled.', 409);
  const link = `${recoveryBaseUrl()}/reset-password/admin#id=${encodeURIComponent(id)}&token=${encodeURIComponent(token)}`;
  const sent = await sendPasswordRecoveryEmail(rows[0].email, { kind: 'link', value: link });
  await query(`UPDATE password_reset_requests SET status = $3, secret_hash = CASE WHEN $3 = 'APPROVED' THEN secret_hash ELSE NULL END
    WHERE id = $1::uuid AND secret_hash = $2 AND status = 'SENDING'`, [id, digest(`${id}:${token}`), sent.success ? 'APPROVED' : 'EMAIL_FAILED']);
  if (!sent.success) throw new RecoveryError('The reset email could not be sent. Check email delivery settings, then retry approval.', 502);
  return { message: 'Approved. A secure reset link was emailed to the admin.' };
}
