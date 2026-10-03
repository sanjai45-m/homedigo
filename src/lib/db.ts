import { neon } from '@neondatabase/serverless';
import { hashPassword } from './passwords';

const connectionString = process.env.DATABASE_URL || process.env.NEON_DATABASE_URL;

export const isDbConfigured = Boolean(connectionString && !connectionString.includes('placeholder'));

/**
 * Neon DB SQL Client
 * Executes serverless SQL queries against PostgreSQL Neon database.
 */
export const sql = connectionString ? neon(connectionString) : null;

/**
 * Helper to run queries safely with error handling and fallback
 */
export async function executeQuery<T = any>(
  queryText: string,
  params: any[] = []
): Promise<{ rows: T[]; isConnected: boolean; error?: string }> {
  if (!sql) {
    return {
      rows: [],
      isConnected: false,
      error: 'DATABASE_URL is not configured. Please add your Neon connection string to .env.local',
    };
  }

  try {
    const result = await (sql as any).query(queryText, params);
    return {
      rows: (result?.rows || result) as T[],
      isConnected: true,
    };
  } catch (err: any) {
    console.error('Neon DB Query Error:', err);
    return {
      rows: [],
      isConnected: false,
      error: err.message || 'Database query failed',
    };
  }
}

/**
 * Ensure database schema has all tables and columns
 */
export async function initializeDatabase() {
  if (!isDbConfigured) return;

  try {
    // 1. Create users table
    await executeQuery(`
      CREATE TABLE IF NOT EXISTS users (
        id VARCHAR(64) PRIMARY KEY,
        name VARCHAR(255) NOT NULL,
        email VARCHAR(255) UNIQUE NOT NULL,
        password_hash TEXT,
        image TEXT,
        phone VARCHAR(32),
        role VARCHAR(32) DEFAULT 'PATIENT',
        department VARCHAR(64),
        access_level VARCHAR(64),
        created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
        updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
      )
    `);

    // 2. Add columns if missing in existing users table
    await executeQuery(`
      DO $$
      BEGIN
        BEGIN
          ALTER TABLE users ADD COLUMN password_hash TEXT;
        EXCEPTION WHEN duplicate_column THEN
        END;
        BEGIN
          ALTER TABLE users ADD COLUMN department VARCHAR(64);
        EXCEPTION WHEN duplicate_column THEN
        END;
        BEGIN
          ALTER TABLE users ADD COLUMN access_level VARCHAR(64);
        EXCEPTION WHEN duplicate_column THEN
        END;
      END $$;
    `);

    // 3. Drop constraint if it restricts role, then re-add
    await executeQuery(`
      DO $$
      BEGIN
        ALTER TABLE users DROP CONSTRAINT IF EXISTS users_role_check;
        ALTER TABLE users ADD CONSTRAINT users_role_check CHECK (role IN ('PATIENT', 'PARTNER', 'ADMIN', 'SUPER_ADMIN'));
      EXCEPTION WHEN OTHERS THEN
      END $$;
    `);

    // 4. Create medical specialities table
    await executeQuery(`
      CREATE TABLE IF NOT EXISTS specialities (
        id VARCHAR(64) PRIMARY KEY,
        name VARCHAR(128) NOT NULL,
        slug VARCHAR(128) UNIQUE NOT NULL,
        icon VARCHAR(64) DEFAULT 'Stethoscope',
        description TEXT,
        created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
      )
    `);

    // 5. Create partner profiles table
    await executeQuery(`
      CREATE TABLE IF NOT EXISTS partner_profiles (
        id VARCHAR(64) PRIMARY KEY,
        user_id VARCHAR(64) REFERENCES users(id) ON DELETE CASCADE,
        partner_type VARCHAR(32) DEFAULT 'DOCTOR',
        speciality_id VARCHAR(64) REFERENCES specialities(id),
        specialization VARCHAR(128) NOT NULL,
        qualifications VARCHAR(255),
        consultation_fee NUMERIC(10, 2) DEFAULT 550.00,
        council_reg_number VARCHAR(128),
        experience_years INT DEFAULT 0,
        service_radius_km INT DEFAULT 10,
        verification_status VARCHAR(32) DEFAULT 'PENDING' CHECK (verification_status IN ('PENDING', 'UNDER_REVIEW', 'APPROVED', 'REJECTED')),
        availability VARCHAR(32) DEFAULT 'AVAILABLE' CHECK (availability IN ('AVAILABLE', 'BUSY', 'OFFLINE')),
        rating NUMERIC(3, 2) DEFAULT 5.00,
        completed_visits INT DEFAULT 0,
        bio TEXT,
        created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
      )
    `);

    // Add columns to partner_profiles if missing
    await executeQuery(`
      DO $$
      BEGIN
        BEGIN
          ALTER TABLE partner_profiles ADD COLUMN partner_type VARCHAR(32) DEFAULT 'DOCTOR';
        EXCEPTION WHEN duplicate_column THEN
        END;
        BEGIN
          ALTER TABLE partner_profiles ADD COLUMN speciality_id VARCHAR(64);
        EXCEPTION WHEN duplicate_column THEN
        END;
        BEGIN
          ALTER TABLE partner_profiles ADD COLUMN qualifications VARCHAR(255);
        EXCEPTION WHEN duplicate_column THEN
        END;
        BEGIN
          ALTER TABLE partner_profiles ADD COLUMN consultation_fee NUMERIC(10, 2) DEFAULT 550.00;
        EXCEPTION WHEN duplicate_column THEN
        END;
        BEGIN
          ALTER TABLE partner_profiles ADD COLUMN bio TEXT;
        EXCEPTION WHEN duplicate_column THEN
        END;
        BEGIN
          ALTER TABLE partner_profiles ADD COLUMN location_name VARCHAR(255) DEFAULT 'Bengaluru, Karnataka';
        EXCEPTION WHEN duplicate_column THEN
        END;
        BEGIN
          ALTER TABLE partner_profiles ADD COLUMN city VARCHAR(128) DEFAULT 'Bengaluru';
        EXCEPTION WHEN duplicate_column THEN
        END;
        BEGIN
          ALTER TABLE partner_profiles ADD COLUMN latitude NUMERIC(10, 6) DEFAULT 12.9716;
        EXCEPTION WHEN duplicate_column THEN
        END;
        BEGIN
          ALTER TABLE partner_profiles ADD COLUMN longitude NUMERIC(10, 6) DEFAULT 77.5946;
        EXCEPTION WHEN duplicate_column THEN
        END;
      END $$;
    `);

    // 6. Create services table
    await executeQuery(`
      CREATE TABLE IF NOT EXISTS services (
        id VARCHAR(64) PRIMARY KEY,
        title VARCHAR(128) NOT NULL,
        category VARCHAR(64) NOT NULL,
        description TEXT,
        base_price NUMERIC(10, 2) NOT NULL,
        visiting_fee NUMERIC(10, 2) DEFAULT 100.00,
        commission_percentage NUMERIC(5, 2) DEFAULT 15.00,
        duration_minutes INT DEFAULT 45,
        icon VARCHAR(64),
        is_active BOOLEAN DEFAULT TRUE
      )
    `);

    // 7. Create bookings table
    await executeQuery(`
      CREATE TABLE IF NOT EXISTS bookings (
        id VARCHAR(64) PRIMARY KEY,
        booking_number VARCHAR(32) UNIQUE NOT NULL,
        patient_id VARCHAR(64) REFERENCES users(id),
        partner_id VARCHAR(64) REFERENCES users(id),
        service_id VARCHAR(64) REFERENCES services(id),
        scheduled_at TIMESTAMP WITH TIME ZONE NOT NULL,
        status VARCHAR(32) DEFAULT 'PENDING',
        address TEXT NOT NULL,
        total_amount NUMERIC(10, 2) NOT NULL,
        payment_status VARCHAR(32) DEFAULT 'PENDING',
        vital_bp VARCHAR(32),
        vital_pulse VARCHAR(32),
        vital_spo2 VARCHAR(32),
        vital_sugar VARCHAR(32),
        prescription_notes TEXT,
        clinical_instructions TEXT,
        created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
      )
    `);

    // 8. Create invoices table
    await executeQuery(`
      CREATE TABLE IF NOT EXISTS invoices (
        id VARCHAR(64) PRIMARY KEY,
        booking_id VARCHAR(64),
        user_id VARCHAR(64),
        invoice_number VARCHAR(32) UNIQUE NOT NULL,
        service_title VARCHAR(128) NOT NULL,
        subtotal NUMERIC(10, 2) NOT NULL,
        tax_amount NUMERIC(10, 2) NOT NULL,
        total_paid NUMERIC(10, 2) NOT NULL,
        payment_ref VARCHAR(64),
        created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
      )
    `);

    // 9. Seed default medical specialities if table empty
    const specCount = await executeQuery(`SELECT COUNT(*) as count FROM specialities`);
    if (Number(specCount.rows[0]?.count || 0) === 0) {
      const defaultSpecialities = [
        {
          id: 'spec_gen_med',
          name: 'General Medicine & Physician',
          slug: 'general-medicine',
          icon: 'Stethoscope',
          description: 'Comprehensive physical evaluation, acute infection treatment, hypertension & preventive care.',
        },
        {
          id: 'spec_diabetology',
          name: 'Diabetology & Endocrinology',
          slug: 'diabetology',
          icon: 'Activity',
          description: 'Blood glucose management, insulin titration, diabetic neuropathy & metabolic care.',
        },
        {
          id: 'spec_geriatric',
          name: 'Geriatric & Senior Care',
          slug: 'geriatric-care',
          icon: 'HeartPulse',
          description: 'Dedicated healthcare for elderly patients, polypharmacy review, and mobility support.',
        },
        {
          id: 'spec_cardiology',
          name: 'Cardiology & Heart Health',
          slug: 'cardiology',
          icon: 'HeartPulse',
          description: 'Blood pressure control, post-cardiac surgery follow-ups, and ECG monitoring.',
        },
        {
          id: 'spec_pediatrics',
          name: 'Pediatrics & Child Health',
          slug: 'pediatrics',
          icon: 'Baby',
          description: 'Child wellness checkups, viral fever care, vaccination guidance & newborn care.',
        },
        {
          id: 'spec_ortho',
          name: 'Orthopedics & Joint Care',
          slug: 'orthopedics',
          icon: 'Bone',
          description: 'Arthritis management, post-fracture recovery, spine care & musculoskeletal assessments.',
        },
        {
          id: 'spec_pulmonology',
          name: 'Pulmonology & Respiratory Care',
          slug: 'pulmonology',
          icon: 'Wind',
          description: 'Asthma, COPD, oxygen therapy, post-pneumonia recovery & nebulization.',
        },
      ];

      for (const sp of defaultSpecialities) {
        await executeQuery(`
          INSERT INTO specialities (id, name, slug, icon, description)
          VALUES ($1, $2, $3, $4, $5)
          ON CONFLICT (slug) DO NOTHING
        `, [sp.id, sp.name, sp.slug, sp.icon, sp.description]);
      }
    }

    // 10. Seed Super Admin account if not existing in DB
    const superAdminCheck = await executeQuery(`SELECT id FROM users WHERE role = 'SUPER_ADMIN' LIMIT 1`);
    if (superAdminCheck.rows.length === 0) {
      const superAdminPassHash = hashPassword('SuperAdmin@2026');
      await executeQuery(`
        INSERT INTO users (id, name, email, password_hash, phone, role, department, access_level)
        VALUES ($1, $2, $3, $4, $5, $6, $7, $8)
      `, [
        'usr_super_root',
        'Executive Super Admin',
        'superadmin@homedigo.care',
        superAdminPassHash,
        '+91 98450 00001',
        'SUPER_ADMIN',
        'EXECUTIVE',
        'ROOT_SUPER_ADMIN',
      ]);
    }
  } catch (err) {
    console.error('Failed to initialize database schema:', err);
  }
}

// Auto-run init on startup
initializeDatabase().catch(console.error);
