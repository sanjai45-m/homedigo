import { neon } from '@neondatabase/serverless';
import { readFileSync } from 'fs';
import { join } from 'path';

const envPath = join(process.cwd(), '.env.local');
const envContent = readFileSync(envPath, 'utf8');
const match = envContent.match(/DATABASE_URL=["']?([^"'\r\n]+)["']?/);
const dbUrl = match ? match[1] : '';

const sql = neon(dbUrl);

async function inspectBookings() {
  const rows = await sql`SELECT id, booking_number, status, latitude, longitude, partner_lat, partner_lng FROM bookings LIMIT 10`;
  console.log('BOOKINGS IN DB:', rows);
}

inspectBookings();
