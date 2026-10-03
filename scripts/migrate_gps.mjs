import { neon } from '@neondatabase/serverless';
import { readFileSync } from 'fs';
import { join } from 'path';

// Read DATABASE_URL from .env.local
const envPath = join(process.cwd(), '.env.local');
const envContent = readFileSync(envPath, 'utf8');
const match = envContent.match(/DATABASE_URL=["']?([^"'\n]+)["']?/);
const databaseUrl = match?.[1]?.trim();

if (!databaseUrl) {
  console.error('DATABASE_URL not found in .env.local');
  process.exit(1);
}

const sql = neon(databaseUrl);

async function migrate() {
  console.log('Running GPS migration...');
  try {
    const r1 = await sql`ALTER TABLE bookings ADD COLUMN IF NOT EXISTS partner_lat DOUBLE PRECISION`;
    console.log('✅ partner_lat column added');
    const r2 = await sql`ALTER TABLE bookings ADD COLUMN IF NOT EXISTS partner_lng DOUBLE PRECISION`;
    console.log('✅ partner_lng column added');
    
    // Also ensure users table has needed columns
    await sql`ALTER TABLE users ADD COLUMN IF NOT EXISTS password_hash VARCHAR(512)`;
    console.log('✅ password_hash column ensured');
    await sql`ALTER TABLE users ADD COLUMN IF NOT EXISTS department VARCHAR(128)`;
    console.log('✅ department column ensured');
    await sql`ALTER TABLE users ADD COLUMN IF NOT EXISTS access_level VARCHAR(64)`;
    console.log('✅ access_level column ensured');
    
    // Also add SUPER_ADMIN to the role check constraint (if not already)
    try {
      await sql`ALTER TABLE users DROP CONSTRAINT IF EXISTS users_role_check`;
      await sql`ALTER TABLE users ADD CONSTRAINT users_role_check CHECK (role IN ('PATIENT', 'PARTNER', 'ADMIN', 'SUPER_ADMIN'))`;
      console.log('✅ Role constraint updated to include SUPER_ADMIN');
    } catch(e) {
      console.log('Note: role constraint update skipped:', e.message);
    }

    // Verify
    const cols = await sql`
      SELECT column_name FROM information_schema.columns 
      WHERE table_name = 'bookings' AND column_name IN ('partner_lat','partner_lng')
      ORDER BY column_name
    `;
    console.log('\n✅ GPS Migration complete! Columns verified:', cols.map(c => c.column_name).join(', '));
  } catch(e) {
    console.error('Migration error:', e.message);
  }
}

migrate();
