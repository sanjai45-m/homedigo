import { neon } from '@neondatabase/serverless';
import { readFileSync } from 'fs';
import { join } from 'path';

const envPath = join(process.cwd(), '.env.local');
const envContent = readFileSync(envPath, 'utf8');
const match = envContent.match(/DATABASE_URL=["']?([^"'\r\n]+)["']?/);
const dbUrl = match ? match[1] : '';

const sql = neon(dbUrl);

async function testEarnings() {
  const rows = await sql`
    SELECT b.id, b.booking_number, b.service_title, b.patient_name, b.total_amount,
           b.payment_status, b.payment_ref, b.status, b.created_at
    FROM bookings b
    ORDER BY b.created_at DESC
  `;
  console.log('BOOKINGS FOR EARNINGS:', rows);
}

testEarnings();
