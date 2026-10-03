const { neon } = require('@neondatabase/serverless');
const crypto = require('crypto');

const DATABASE_URL = "postgresql://neondb_owner:npg_C3gSnKhO1sqr@ep-weathered-tree-b5x2ogwa-pooler.c-7.us-east-2.aws.neon.tech/neondb?sslmode=require&channel_binding=require";
const sql = neon(DATABASE_URL);

function hashPassword(password) {
  const salt = crypto.randomBytes(16).toString('hex');
  const hash = crypto.pbkdf2Sync(password, salt, 1000, 64, 'sha512').toString('hex');
  return `${salt}:${hash}`;
}

async function resetDb() {
  console.log('🧹 Starting Complete Fresh Database Reset on Neon PostgreSQL...\n');

  // 1. Drop data in tables in safe foreign key dependency order
  console.log('▶ Clearing invoices...');
  await sql`DELETE FROM invoices`;

  console.log('▶ Clearing bookings...');
  await sql`DELETE FROM bookings`;

  console.log('▶ Clearing partner profiles...');
  await sql`DELETE FROM partner_profiles`;

  console.log('▶ Clearing patient profiles...');
  try {
    await sql`DELETE FROM patient_profiles`;
  } catch (e) {
    console.log('  (patient_profiles table clean or not present)');
  }

  console.log('▶ Clearing patient addresses...');
  try {
    await sql`DELETE FROM patient_addresses`;
  } catch (e) {
    console.log('  (patient_addresses table clean or not present)');
  }

  // 2. Clear all users except Super Admin
  console.log('▶ Clearing all users except Super Admin...');
  await sql`DELETE FROM users`;

  // 3. Seed fresh Master Super Admin account
  console.log('▶ Seeding fresh master Super Admin account...');
  const superAdminPassHash = hashPassword('SuperAdmin@2026');
  await sql`
    INSERT INTO users (id, name, email, password_hash, phone, role, department, access_level)
    VALUES (
      'usr_super_root',
      'Executive Super Admin',
      'superadmin@homedigo.care',
      ${superAdminPassHash},
      '+91 98450 00001',
      'SUPER_ADMIN',
      'EXECUTIVE',
      'ROOT_SUPER_ADMIN'
    )
  `;

  // 4. Seed clean core medical services catalog
  console.log('▶ Seeding fresh core services catalogue...');
  await sql`DELETE FROM services`;
  const defaultServices = [
    {
      id: 'srv_doc',
      title: 'Doctor Home Visit & Clinical Consult',
      category: 'CONSULTATION',
      description: 'Comprehensive physical examination, diagnosis, prescriptions, and tailored care plan at home.',
      base_price: 550.00,
      visiting_fee: 100.00,
      commission_percentage: 15.00,
      duration_minutes: 45,
      icon: 'Stethoscope',
      is_active: true,
    },
    {
      id: 'srv_nurse',
      title: 'Home Nursing Care & Vital Monitoring',
      category: 'NURSING',
      description: 'IV cannulation, injections, vitals monitoring, post-operative nursing, and catheter care.',
      base_price: 350.00,
      visiting_fee: 80.00,
      commission_percentage: 15.00,
      duration_minutes: 45,
      icon: 'HeartPulse',
      is_active: true,
    },
    {
      id: 'srv_physio',
      title: 'Physiotherapy & Mobility Rehabilitation',
      category: 'PHYSIOTHERAPY',
      description: 'Post-stroke rehab, orthopaedic recovery, pain management, and mobility exercises by licensed PTs.',
      base_price: 450.00,
      visiting_fee: 100.00,
      commission_percentage: 15.00,
      duration_minutes: 60,
      icon: 'Activity',
      is_active: true,
    },
    {
      id: 'srv_wound',
      title: 'Wound Dressing & Suture Care',
      category: 'NURSING',
      description: 'Sterile surgical wound dressing, diabetic foot ulcer care, and bed sore prevention.',
      base_price: 300.00,
      visiting_fee: 80.00,
      commission_percentage: 15.00,
      duration_minutes: 30,
      icon: 'Bandage',
      is_active: true,
    },
    {
      id: 'srv_elderly',
      title: 'Elderly Companion & Attendant Care',
      category: 'ELDERLY_CARE',
      description: 'Assisted daily living, medication reminders, mobility support, and compassionate companionship.',
      base_price: 600.00,
      visiting_fee: 100.00,
      commission_percentage: 15.00,
      duration_minutes: 120,
      icon: 'Users',
      is_active: true,
    },
  ];

  for (const s of defaultServices) {
    await sql`
      INSERT INTO services (id, title, category, description, base_price, visiting_fee, commission_percentage, duration_minutes, icon, is_active)
      VALUES (${s.id}, ${s.title}, ${s.category}, ${s.description}, ${s.base_price}, ${s.visiting_fee}, ${s.commission_percentage}, ${s.duration_minutes}, ${s.icon}, ${s.is_active})
    `;
  }

  // 5. Verify clean database state
  console.log('\n--- 📊 VERIFYING FRESH DATABASE STATE ---');
  const [usersCount, bookingsCount, servicesCount, partnersCount, invoiceCount] = await Promise.all([
    sql`SELECT COUNT(*) as count FROM users`,
    sql`SELECT COUNT(*) as count, COALESCE(SUM(total_amount), 0) as total_rev FROM bookings`,
    sql`SELECT COUNT(*) as count FROM services`,
    sql`SELECT COUNT(*) as count FROM partner_profiles`,
    sql`SELECT COUNT(*) as count FROM invoices`,
  ]);

  console.log(`Users in DB: ${usersCount[0].count} (Master Super Admin only)`);
  console.log(`Admins in DB: 0 (Ready for Super Admin to provision)`);
  console.log(`Doctors/Partners in DB: ${partnersCount[0].count} (Ready to onboard fresh)`);
  console.log(`Bookings in DB: ${bookingsCount[0].count}`);
  console.log(`Total Gross Revenue: ₹${bookingsCount[0].total_rev}`);
  console.log(`Invoices in DB: ${invoiceCount[0].count}`);
  console.log(`Active Services in Catalogue: ${servicesCount[0].count}`);

  console.log('\n✨ DATABASE SUCCESSFULLY EMPTIED & READY FOR FRESH START! 🚀');
}

resetDb().catch((err) => {
  console.error('❌ Reset failed:', err);
  process.exit(1);
});
