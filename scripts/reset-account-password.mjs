import { randomBytes } from 'node:crypto';
import { appendFileSync } from 'node:fs';
import nextEnv from '@next/env';
import { neon } from '@neondatabase/serverless';
import { hashPassword, verifyPassword } from '../src/lib/passwords.ts';

// Owner-only CLI. Never expose this through an API. Credentials stay in an ignored local file.
nextEnv.loadEnvConfig(process.cwd());
const target = process.argv[2];
if (!target || (target.startsWith('--') && target !== '--retire-defaults' && target !== '--check-defaults')) {
  throw new Error('Usage: node scripts/reset-account-password.mjs <email | --check-defaults | --retire-defaults>');
}
const sql = neon(process.env.DATABASE_URL || process.env.NEON_DATABASE_URL);
const defaults = target === '--retire-defaults' || target === '--check-defaults';
const users = await sql.query(`SELECT id, email, password_hash FROM users ${defaults ? '' : 'WHERE LOWER(email) = $1'}`,
  defaults ? [] : [target.trim().toLowerCase()]);
const selected = users.filter(user => !defaults || ['SuperAdmin@2026', 'Partner@123'].some(password => verifyPassword(password, user.password_hash)));
if (target === '--check-defaults') {
  console.log(JSON.stringify({ accountsUsingRetiredPasswords: selected.length }));
} else {
  for (const user of selected) {
    const password = randomBytes(24).toString('base64url');
    // Write recovery details before updating so a terminated process cannot lose the password.
    appendFileSync('.env.account-recovery.local', `# ${new Date().toISOString()}\n# Account: ${user.email}\n# Password: ${password}\n\n`, { mode: 0o600 });
    const result = await sql.query('UPDATE users SET password_hash = $1 WHERE id = $2 AND password_hash = $3 RETURNING id',
      [hashPassword(password), user.id, user.password_hash]);
    if (!result.length) throw new Error('Account changed during reset; retry the command.');
  }
  console.log(JSON.stringify({ updatedAccounts: selected.length, recoveryFile: '.env.account-recovery.local' }));
}
