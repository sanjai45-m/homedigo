import { neon } from '@neondatabase/serverless';

const connectionString = "postgresql://neondb_owner:npg_C3gSnKhO1sqr@ep-weathered-tree-b5x2ogwa-pooler.c-7.us-east-2.aws.neon.tech/neondb?sslmode=require&channel_binding=require";

const sql = neon(connectionString);

async function migratePatientPortal() {
  console.log('⚡ Migrating & extending Neon DB schema for Patient Portal...');

  try {
    // 1. Ensure Columns in Patient Profiles
    await sql`ALTER TABLE patient_profiles ADD COLUMN IF NOT EXISTS relationship VARCHAR(64) DEFAULT 'Self';`;
    await sql`ALTER TABLE patient_profiles ADD COLUMN IF NOT EXISTS is_primary BOOLEAN DEFAULT FALSE;`;
    console.log('✓ Patient Profiles schema extended.');

    // 2. Ensure Addresses Table
    await sql`
      CREATE TABLE IF NOT EXISTS addresses (
        id VARCHAR(64) PRIMARY KEY,
        user_id VARCHAR(64) NOT NULL,
        label VARCHAR(64) NOT NULL DEFAULT 'Home',
        address_line1 TEXT NOT NULL,
        address_line2 TEXT,
        landmark VARCHAR(128),
        city VARCHAR(64) DEFAULT 'Bengaluru',
        pincode VARCHAR(16) NOT NULL,
        lat NUMERIC(10, 6),
        lng NUMERIC(10, 6),
        is_default BOOLEAN DEFAULT FALSE,
        created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
      );
    `;
    console.log('✓ Addresses table verified.');

    // 3. Drop and recreate bookings with rich fields or add columns
    await sql`
      CREATE TABLE IF NOT EXISTS bookings (
        id VARCHAR(64) PRIMARY KEY,
        booking_number VARCHAR(32) UNIQUE NOT NULL,
        user_id VARCHAR(64) NOT NULL,
        patient_profile_id VARCHAR(64),
        patient_name VARCHAR(255),
        address_id VARCHAR(64),
        address_text TEXT NOT NULL,
        service_id VARCHAR(64) NOT NULL,
        service_title VARCHAR(128) NOT NULL,
        partner_id VARCHAR(64),
        partner_name VARCHAR(255),
        partner_title VARCHAR(255),
        partner_img TEXT,
        partner_rating NUMERIC(3, 2) DEFAULT 4.9,
        scheduled_date VARCHAR(64) NOT NULL,
        scheduled_time_slot VARCHAR(64) NOT NULL,
        status VARCHAR(32) DEFAULT 'CONFIRMED',
        total_amount NUMERIC(10, 2) NOT NULL,
        payment_status VARCHAR(32) DEFAULT 'PAID',
        payment_method VARCHAR(32) DEFAULT 'UPI',
        payment_ref VARCHAR(64),
        clinical_instructions TEXT,
        vital_bp VARCHAR(32),
        vital_pulse VARCHAR(32),
        vital_spo2 VARCHAR(32),
        vital_sugar VARCHAR(32),
        prescription_notes TEXT,
        created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
      );
    `;

    // Ensure extra columns on bookings if already exists
    await sql`ALTER TABLE bookings ALTER COLUMN scheduled_at DROP NOT NULL;`;
    await sql`ALTER TABLE bookings ALTER COLUMN address DROP NOT NULL;`;
    await sql`ALTER TABLE bookings ADD COLUMN IF NOT EXISTS user_id VARCHAR(64);`;
    await sql`ALTER TABLE bookings ADD COLUMN IF NOT EXISTS patient_profile_id VARCHAR(64);`;
    await sql`ALTER TABLE bookings ADD COLUMN IF NOT EXISTS patient_name VARCHAR(255);`;
    await sql`ALTER TABLE bookings ADD COLUMN IF NOT EXISTS address_id VARCHAR(64);`;
    await sql`ALTER TABLE bookings ADD COLUMN IF NOT EXISTS address_text TEXT;`;
    await sql`ALTER TABLE bookings ADD COLUMN IF NOT EXISTS service_title VARCHAR(128);`;
    await sql`ALTER TABLE bookings ADD COLUMN IF NOT EXISTS partner_name VARCHAR(255);`;
    await sql`ALTER TABLE bookings ADD COLUMN IF NOT EXISTS partner_title VARCHAR(255);`;
    await sql`ALTER TABLE bookings ADD COLUMN IF NOT EXISTS partner_img TEXT;`;
    await sql`ALTER TABLE bookings ADD COLUMN IF NOT EXISTS partner_rating NUMERIC(3, 2) DEFAULT 4.9;`;
    await sql`ALTER TABLE bookings ADD COLUMN IF NOT EXISTS scheduled_date VARCHAR(64);`;
    await sql`ALTER TABLE bookings ADD COLUMN IF NOT EXISTS scheduled_time_slot VARCHAR(64);`;
    await sql`ALTER TABLE bookings ADD COLUMN IF NOT EXISTS payment_method VARCHAR(32) DEFAULT 'UPI';`;
    await sql`ALTER TABLE bookings ADD COLUMN IF NOT EXISTS payment_ref VARCHAR(64);`;
    await sql`ALTER TABLE bookings ADD COLUMN IF NOT EXISTS clinical_instructions TEXT;`;
    await sql`ALTER TABLE bookings ADD COLUMN IF NOT EXISTS vital_bp VARCHAR(32);`;
    await sql`ALTER TABLE bookings ADD COLUMN IF NOT EXISTS vital_pulse VARCHAR(32);`;
    await sql`ALTER TABLE bookings ADD COLUMN IF NOT EXISTS vital_spo2 VARCHAR(32);`;
    await sql`ALTER TABLE bookings ADD COLUMN IF NOT EXISTS vital_sugar VARCHAR(32);`;
    await sql`ALTER TABLE bookings ADD COLUMN IF NOT EXISTS prescription_notes TEXT;`;
    console.log('✓ Bookings schema extended.');

    // 4. Ensure Invoices Table
    await sql`
      CREATE TABLE IF NOT EXISTS invoices (
        id VARCHAR(64) PRIMARY KEY,
        booking_id VARCHAR(64) NOT NULL,
        user_id VARCHAR(64) NOT NULL,
        invoice_number VARCHAR(64) UNIQUE NOT NULL,
        service_title VARCHAR(128) NOT NULL,
        subtotal NUMERIC(10, 2) NOT NULL,
        tax_amount NUMERIC(10, 2) NOT NULL,
        total_paid NUMERIC(10, 2) NOT NULL,
        payment_ref VARCHAR(64),
        issued_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
      );
    `;
    console.log('✓ Invoices table verified.');

    // 5. Seed default demo users for Patient and Partner
    const defaultUserId = 'usr_pat_001';
    const defaultPartnerId = 'usr_pro_101';

    await sql`
      INSERT INTO users (id, name, email, role)
      VALUES 
        (${defaultUserId}, 'Sanju K.', 'patient@homedigo.care', 'PATIENT'),
        (${defaultPartnerId}, 'Dr. Priya Sharma', 'dr.priya@homedigo.care', 'PARTNER'),
        ('usr_pro_102', 'Nurse Anjali Nair', 'anjali@homedigo.care', 'PARTNER')
      ON CONFLICT (id) DO NOTHING;
    `;
    console.log('✓ Demo users verified in users table.');

    // Seed Profiles if empty
    const profilesCount = await sql`SELECT count(*) FROM patient_profiles WHERE user_id = ${defaultUserId}`;
    if (parseInt(profilesCount[0].count, 10) === 0) {
      console.log('Seeding demo patient profiles...');
      await sql`
        INSERT INTO patient_profiles (id, user_id, full_name, relationship, age, gender, blood_group, medical_notes, emergency_contact, is_primary)
        VALUES 
          ('prof_001', ${defaultUserId}, 'Sanju K.', 'Self', 32, 'Male', 'O+ Positive', 'No chronic conditions. Regular annual health checks.', '+91 98765 43210', TRUE),
          ('prof_002', ${defaultUserId}, 'Meenakshi K. (Mother)', 'Mother', 68, 'Female', 'B+ Positive', 'Hypertension & Type 2 Diabetes. Requires gentle dressing & weekly BP check.', '+91 98765 43210', FALSE),
          ('prof_003', ${defaultUserId}, 'Rohan K. (Son)', 'Child', 5, 'Male', 'O+ Positive', 'Routine pediatric vaccination schedule up to date.', '+91 98765 43210', FALSE)
      `;
    }

    // Seed Addresses if empty
    const addressesCount = await sql`SELECT count(*) FROM addresses WHERE user_id = ${defaultUserId}`;
    if (parseInt(addressesCount[0].count, 10) === 0) {
      console.log('Seeding demo addresses...');
      await sql`
        INSERT INTO addresses (id, user_id, label, address_line1, address_line2, landmark, city, pincode, lat, lng, is_default)
        VALUES 
          ('addr_001', ${defaultUserId}, 'Home (Indiranagar)', 'Flat 402, Green Park Apartments, 12th Main', 'Indiranagar', 'Near Metro Station Pillar 42', 'Bengaluru', '560038', 12.9783, 77.6408, TRUE),
          ('addr_002', ${defaultUserId}, 'Parents Residence (Whitefield)', 'Villa 18, Palm Meadows, Outer Circle', 'Whitefield', 'Behind Forum Mall', 'Bengaluru', '560066', 12.9698, 77.7499, FALSE)
      `;
    }

    // Seed an Active & Past Booking if empty
    const bookingsCount = await sql`SELECT count(*) FROM bookings WHERE user_id = ${defaultUserId}`;
    if (parseInt(bookingsCount[0].count, 10) === 0) {
      console.log('Seeding demo bookings...');
      await sql`
        INSERT INTO bookings (
          id, booking_number, user_id, patient_profile_id, patient_name, address_id, address_text, 
          service_id, service_title, partner_id, partner_name, partner_title, partner_img, partner_rating,
          scheduled_date, scheduled_time_slot, status, total_amount, payment_status, payment_method, payment_ref, clinical_instructions
        )
        VALUES (
          'bk_live_01', 'HD-8921', ${defaultUserId}, 'prof_002', 'Meenakshi K. (Mother)', 'addr_001', 
          'Flat 402, Green Park Apartments, 12th Main, Indiranagar, Bengaluru - 560038', 
          'srv_doc', 'Doctor Home Visit', 'usr_pro_101', 'Dr. Priya Sharma', 'MBBS, MD (Internal Medicine) · 8 yrs exp',
          'https://images.unsplash.com/photo-1559839734-2b71ea197ec2?auto=format&fit=crop&w=256&q=80', 4.9,
          'Today', '10:00 AM - 11:00 AM', 'ON_THE_WAY', 500.00, 'PAID', 'UPI', 'UPI/2026/892184920', 'Post-fever clinical review and blood pressure checkup.'
        );
      `;

      await sql`
        INSERT INTO bookings (
          id, booking_number, user_id, patient_profile_id, patient_name, address_id, address_text, 
          service_id, service_title, partner_id, partner_name, partner_title, partner_img, partner_rating,
          scheduled_date, scheduled_time_slot, status, total_amount, payment_status, payment_method, payment_ref, clinical_instructions,
          vital_bp, vital_pulse, vital_spo2, vital_sugar, prescription_notes
        )
        VALUES (
          'bk_done_02', 'HD-7814', ${defaultUserId}, 'prof_001', 'Sanju K.', 'addr_001', 
          'Flat 402, Green Park Apartments, 12th Main, Indiranagar, Bengaluru - 560038', 
          'srv_nurse', 'Home Nursing Care', 'usr_pro_102', 'Nurse Anjali Nair', 'B.Sc. Nursing (RN) · 6 yrs exp',
          'https://images.unsplash.com/photo-1594824813590-721245b0a3c7?auto=format&fit=crop&w=256&q=80', 4.8,
          'Yesterday', '03:00 PM - 04:00 PM', 'COMPLETED', 350.00, 'PAID', 'UPI', 'UPI/2026/781492019', 'Post-operative wound dressing and IV saline administration.',
          '118/78 mmHg', '74 bpm', '99%', '98 mg/dL', 'Wound healing well. Continue sterile dressing every 48 hours. Tab Paracetamol 650mg SOS for pain.'
        );
      `;

      await sql`
        INSERT INTO invoices (id, booking_id, user_id, invoice_number, service_title, subtotal, tax_amount, total_paid, payment_ref)
        VALUES 
          ('inv_8921', 'bk_live_01', ${defaultUserId}, 'INV-2026-8921', 'Doctor Home Visit', 423.73, 76.27, 500.00, 'UPI/2026/892184920'),
          ('inv_7814', 'bk_done_02', ${defaultUserId}, 'INV-2026-7814', 'Home Nursing Care', 296.61, 53.39, 350.00, 'UPI/2026/781492019')
      `;
    }

    console.log('✅ Patient Portal Neon DB schema & demo records successfully seeded!');
  } catch (err) {
    console.error('Migration error:', err);
  }
}

migratePatientPortal();
