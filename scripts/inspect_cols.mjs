import { neon } from '@neondatabase/serverless';
import { readFileSync } from 'fs';
import { join } from 'path';

const envPath = join(process.cwd(), '.env.local');
const envContent = readFileSync(envPath, 'utf8');
const match = envContent.match(/DATABASE_URL=["']?([^"'\r\n]+)["']?/);
const dbUrl = match ? match[1] : '';

const sql = neon(dbUrl);

async function inspectColumns() {
  const cols = await sql`SELECT column_name FROM information_schema.columns WHERE table_name = 'bookings'`;
  console.log('BOOKINGS COLUMNS:', cols.map(c => c.column_name));

  const rows = await sql`SELECT * FROM bookings LIMIT 2`;
  console.log('SAMPLE BOOKINGS:', rows);
}

inspectColumns();
