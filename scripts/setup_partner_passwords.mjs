import { neon } from '@neondatabase/serverless';
import fs from 'fs';
import crypto from 'crypto';

const envContent = fs.readFileSync('.env.local', 'utf8');
const match = envContent.match(/DATABASE_URL="?([^"\n\r]+)"?/);
const connectionString = match ? match[1] : "postgresql://neondb_owner:npg_C3gSnKhO1sqr@ep-weathered-tree-b5x2ogwa-pooler.c-7.us-east-2.aws.neon.tech/neondb?sslmode=require&channel_binding=require";

const sql = neon(connectionString);

function hashPassword(password) {
  const salt = crypto.randomBytes(16).toString('hex');
  const hash = crypto.pbkdf2Sync(password, salt, 1000, 64, 'sha512').toString('hex');
  return `${salt}:${hash}`;
}

async function main() {
  const defaultHash = hashPassword('Partner@123');
  
  await sql`UPDATE users SET password_hash = ${defaultHash} WHERE role = 'PARTNER' AND (password_hash IS NULL OR password_hash = '')`;

  const partners = await sql`SELECT u.id, u.name, u.email, u.role, p.specialization, p.city, p.latitude, p.longitude FROM users u JOIN partner_profiles p ON u.id = p.user_id WHERE u.role = 'PARTNER'`;
  console.log('=== VERIFIED ACTIVE PARTNERS IN DB ===');
  console.log(JSON.stringify(partners, null, 2));
}

main().catch(console.error);
