import { neon } from '@neondatabase/serverless';
import { readFileSync } from 'fs';
import { join } from 'path';

const envPath = join(process.cwd(), '.env.local');
const envContent = readFileSync(envPath, 'utf8');
const match = envContent.match(/DATABASE_URL=["']?([^"'\r\n]+)["']?/);
const dbUrl = match ? match[1] : '';

const sql = neon(dbUrl);

function calculateHaversineKm(lat1, lon1, lat2, lon2) {
  const R = 6371;
  const dLat = ((lat2 - lat1) * Math.PI) / 180;
  const dLon = ((lon2 - lon1) * Math.PI) / 180;
  const a =
    Math.sin(dLat / 2) * Math.sin(dLat / 2) +
    Math.cos((lat1 * Math.PI) / 180) *
      Math.cos((lat2 * Math.PI) / 180) *
      Math.sin(dLon / 2) *
      Math.sin(dLon / 2);
  const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
  return R * c;
}

async function testLocationRoute() {
  const res = await sql`
    SELECT b.partner_lat, b.partner_lng, 
           COALESCE(b.patient_lat, a.lat) as patient_lat, 
           COALESCE(b.patient_lng, a.lng) as patient_lng, 
           b.status 
    FROM bookings b
    LEFT JOIN addresses a ON b.address_id = a.id
    WHERE b.id = 'bk_1791026784704'
  `;
  const row = res[0];
  console.log('QUERY RESULT:', row);
  const pLat = Number(row.partner_lat);
  const pLng = Number(row.partner_lng);
  const patLat = Number(row.patient_lat);
  const patLng = Number(row.patient_lng);

  const distKm = calculateHaversineKm(pLat, pLng, patLat, patLng);
  console.log('CALCULATED DISTANCE IN KM:', distKm);
  console.log('IS WITHIN 0.5 KM (ARRIVED THRESHOLD)?:', distKm <= 0.5);
}

testLocationRoute();
