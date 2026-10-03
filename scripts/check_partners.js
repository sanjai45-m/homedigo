const { neon } = require('@neondatabase/serverless');

const DATABASE_URL = "postgresql://neondb_owner:npg_C3gSnKhO1sqr@ep-weathered-tree-b5x2ogwa-pooler.c-7.us-east-2.aws.neon.tech/neondb?sslmode=require&channel_binding=require";
const sql = neon(DATABASE_URL);

async function inspectAndClean() {
  console.log('Inspecting Neon DB users and partner profiles...');
  const users = await sql`SELECT id, name, email, role FROM users`;
  console.log('All Users:', users);

  const partners = await sql`
    SELECT u.id, u.name, u.email, p.specialization, p.verification_status 
    FROM users u 
    LEFT JOIN partner_profiles p ON u.id = p.user_id 
    WHERE u.role = 'PARTNER'
  `;
  console.log('All Partners/Doctors in DB count:', partners.length);
  console.log('Partners List:', partners);

  // Remove any default / seeded test doctors if requested
  const result = await sql`DELETE FROM users WHERE role = 'PARTNER'`;
  console.log('Cleared all default doctors from database:', result);

  const remaining = await sql`SELECT id, name, email, role FROM users WHERE role = 'PARTNER'`;
  console.log('Remaining Partners in DB:', remaining);
}

inspectAndClean().catch(console.error);
