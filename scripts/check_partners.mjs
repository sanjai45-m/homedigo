import { neon } from '@neondatabase/serverless';
import fs from 'fs';

const envContent = fs.readFileSync('.env.local', 'utf8');
const match = envContent.match(/DATABASE_URL="?([^"\n\r]+)"?/);
const connectionString = match ? match[1] : "postgresql://neondb_owner:npg_C3gSnKhO1sqr@ep-weathered-tree-b5x2ogwa-pooler.c-7.us-east-2.aws.neon.tech/neondb?sslmode=require&channel_binding=require";

const sql = neon(connectionString);

async function main() {
  const users = await sql`SELECT id, name, email, role, phone FROM users ORDER BY created_at DESC`;
  console.log('=== ALL USERS IN DB ===');
  console.log(JSON.stringify(users, null, 2));

  const partners = await sql`SELECT p.id, p.user_id, u.name, u.email, p.specialization, p.verification_status, p.is_online, p.city FROM partner_profiles p JOIN users u ON p.user_id = u.id`;
  console.log('=== PARTNER PROFILES ===');
  console.log(JSON.stringify(partners, null, 2));

  const bookings = await sql`SELECT id, booking_number, patient_name, partner_id, partner_name, status, total_amount, scheduled_date, scheduled_time_slot FROM bookings ORDER BY created_at DESC LIMIT 5`;
  console.log('=== RECENT BOOKINGS ===');
  console.log(JSON.stringify(bookings, null, 2));
}

main().catch(console.error);
