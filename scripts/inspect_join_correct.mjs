import { neon } from '@neondatabase/serverless';
import { readFileSync } from 'fs';
import { join } from 'path';

const envPath = join(process.cwd(), '.env.local');
const envContent = readFileSync(envPath, 'utf8');
const match = envContent.match(/DATABASE_URL=["']?([^"'\r\n]+)["']?/);
const dbUrl = match ? match[1] : '';

const sql = neon(dbUrl);

async function inspectJoin() {
  const rows = await sql`
    SELECT b.id as booking_id, b.status, b.partner_lat, b.partner_lng, b.address_id, a.id as addr_id, a.lat as patient_lat, a.lng as patient_lng, a.address_line1, a.city
    FROM bookings b
    LEFT JOIN addresses a ON b.address_id = a.id
  `;
  console.log('BOOKINGS WITH ADDRESSES JOIN:', rows);
}

inspectJoin();
