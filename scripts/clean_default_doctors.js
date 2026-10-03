const { neon } = require('@neondatabase/serverless');

const DATABASE_URL = "postgresql://neondb_owner:npg_C3gSnKhO1sqr@ep-weathered-tree-b5x2ogwa-pooler.c-7.us-east-2.aws.neon.tech/neondb?sslmode=require&channel_binding=require";
const sql = neon(DATABASE_URL);

async function clean() {
  console.log('Cleaning default placeholder doctors...');

  // Nullify partner_id on bookings referencing old default partners or test partners
  await sql`UPDATE bookings SET partner_id = NULL WHERE partner_id != 'usr_pro_1791021128735'`;

  // Delete old default partners and old automated test doctor entries except user's newly created doctor
  await sql`DELETE FROM partner_profiles WHERE user_id != 'usr_pro_1791021128735'`;
  await sql`DELETE FROM users WHERE role = 'PARTNER' AND id != 'usr_pro_1791021128735'`;

  const remaining = await sql`
    SELECT u.id, u.name, u.email, p.specialization, p.verification_status 
    FROM users u 
    LEFT JOIN partner_profiles p ON u.id = p.user_id 
    WHERE u.role = 'PARTNER'
  `;
  console.log('✅ Cleaned! Remaining genuine Partners in DB:', remaining);
}

clean().catch(console.error);
