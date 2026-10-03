import { neon } from '@neondatabase/serverless';
import { readFileSync } from 'fs';
import { join } from 'path';

const envPath = join(process.cwd(), '.env.local');
const envContent = readFileSync(envPath, 'utf8');
const match = envContent.match(/DATABASE_URL=["']?([^"'\r\n]+)["']?/);
const dbUrl = match ? match[1] : '';

const sql = neon(dbUrl);

async function inspectPatientAddress() {
  const addrs = await sql`SELECT * FROM patient_addresses LIMIT 5`;
  console.log('PATIENT ADDRESSES:', addrs);

  const bookingsWithAddress = await sql`
    SELECT b.id, b.status, b.partner_lat, b.partner_lng, b.address_id, a.latitude, a.longitude, a.address_text
    FROM bookings b
    LEFT JOIN patient_addresses a ON b.address_id = a.id
    LIMIT 5
  `;
  console.log('BOOKINGS JOINED WITH ADDRESS:', bookingsWithAddress);
}

inspectPatientAddress();
