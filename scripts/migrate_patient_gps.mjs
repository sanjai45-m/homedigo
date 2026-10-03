import { neon } from '@neondatabase/serverless';
import { readFileSync } from 'fs';
import { join } from 'path';

const envPath = join(process.cwd(), '.env.local');
const envContent = readFileSync(envPath, 'utf8');
const match = envContent.match(/DATABASE_URL=["']?([^"'\r\n]+)["']?/);
const dbUrl = match ? match[1] : '';

const sql = neon(dbUrl);

async function migratePatientGps() {
  console.log('Adding patient_lat and patient_lng columns to bookings table...');
  await sql`ALTER TABLE bookings ADD COLUMN IF NOT EXISTS patient_lat NUMERIC(10, 7)`;
  await sql`ALTER TABLE bookings ADD COLUMN IF NOT EXISTS patient_lng NUMERIC(10, 7)`;

  console.log('Backfilling patient_lat and patient_lng from addresses table...');
  await sql`
    UPDATE bookings b
    SET patient_lat = a.lat::numeric,
        patient_lng = a.lng::numeric
    FROM addresses a
    WHERE b.address_id = a.id
      AND (b.patient_lat IS NULL OR b.patient_lng IS NULL)
  `;

  const inspect = await sql`
    SELECT id, status, partner_lat, partner_lng, patient_lat, patient_lng
    FROM bookings
  `;
  console.log('MIGRATED BOOKINGS GPS:', inspect);
}

migratePatientGps();
