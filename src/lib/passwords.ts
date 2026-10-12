import crypto from 'crypto';

/** New passwords use scrypt; legacy PBKDF2 hashes are upgraded after successful login. */
export function hashPassword(password: string): string {
  const salt = crypto.randomBytes(16).toString('hex');
  const hash = crypto.scryptSync(password, salt, 64).toString('hex');
  return `scrypt:${salt}:${hash}`;
}

/**
 * Verify a plain-text password against a stored hashed password
 */
export function verifyPassword(password: string, storedHash: string): boolean {
  if (typeof storedHash !== 'string') return false;
  const parts = storedHash.split(':');
  const modern = parts.length === 3 && parts[0] === 'scrypt';
  if (!modern && parts.length !== 2) return false;
  const [salt, key] = modern ? parts.slice(1) : parts;
  if (!/^[a-f0-9]{32}$/i.test(salt) || !/^[a-f0-9]{128}$/i.test(key)) return false;
  const hash = modern ? crypto.scryptSync(password, salt, 64) : crypto.pbkdf2Sync(password, salt, 1000, 64, 'sha512');
  return crypto.timingSafeEqual(Buffer.from(key, 'hex'), hash);
}

export function isRetiredSetupPassword(password: string): boolean {
  // These credentials were shipped in the repository and must never grant access again.
  return ['SuperAdmin@2026', 'Partner@123'].includes(password);
}
