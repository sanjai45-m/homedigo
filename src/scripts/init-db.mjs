import { neon } from '@neondatabase/serverless';

const connectionString = "postgresql://neondb_owner:npg_C3gSnKhO1sqr@ep-weathered-tree-b5x2ogwa-pooler.c-7.us-east-2.aws.neon.tech/neondb?sslmode=require&channel_binding=require";

const sql = neon(connectionString);

async function initDb() {
  console.log('Connecting to Neon DB...');
  try {
    const versionRes = await sql`SELECT version(), current_database(), current_user`;
    console.log('Connected successfully to Neon DB:', versionRes);

    console.log('Creating tables...');
    await sql`
      CREATE TABLE IF NOT EXISTS users (
        id VARCHAR(64) PRIMARY KEY,
        name VARCHAR(255) NOT NULL,
        email VARCHAR(255) UNIQUE NOT NULL,
        image TEXT,
        phone VARCHAR(32),
        role VARCHAR(32) DEFAULT 'PATIENT' CHECK (role IN ('PATIENT', 'PARTNER', 'ADMIN')),
        created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
        updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
      );
    `;

    await sql`
      CREATE TABLE IF NOT EXISTS patient_profiles (
        id VARCHAR(64) PRIMARY KEY,
        user_id VARCHAR(64) REFERENCES users(id) ON DELETE CASCADE,
        full_name VARCHAR(255) NOT NULL,
        age INT,
        gender VARCHAR(32),
        blood_group VARCHAR(16),
        medical_notes TEXT,
        emergency_contact VARCHAR(32),
        created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
      );
    `;

    await sql`
      CREATE TABLE IF NOT EXISTS partner_profiles (
        id VARCHAR(64) PRIMARY KEY,
        user_id VARCHAR(64) REFERENCES users(id) ON DELETE CASCADE,
        specialization VARCHAR(128) NOT NULL,
        council_reg_number VARCHAR(128),
        experience_years INT DEFAULT 0,
        service_radius_km INT DEFAULT 10,
        verification_status VARCHAR(32) DEFAULT 'PENDING' CHECK (verification_status IN ('PENDING', 'UNDER_REVIEW', 'APPROVED', 'REJECTED')),
        availability VARCHAR(32) DEFAULT 'OFFLINE' CHECK (availability IN ('AVAILABLE', 'BUSY', 'OFFLINE')),
        rating NUMERIC(3, 2) DEFAULT 5.00,
        completed_visits INT DEFAULT 0,
        created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
      );
    `;

    await sql`
      CREATE TABLE IF NOT EXISTS services (
        id VARCHAR(64) PRIMARY KEY,
        title VARCHAR(128) NOT NULL,
        category VARCHAR(64) NOT NULL,
        description TEXT,
        base_price NUMERIC(10, 2) NOT NULL,
        duration_minutes INT DEFAULT 45,
        icon VARCHAR(64),
        is_active BOOLEAN DEFAULT TRUE
      );
    `;

    await sql`
      CREATE TABLE IF NOT EXISTS bookings (
        id VARCHAR(64) PRIMARY KEY,
        booking_number VARCHAR(32) UNIQUE NOT NULL,
        patient_id VARCHAR(64) REFERENCES users(id),
        partner_id VARCHAR(64) REFERENCES users(id),
        service_id VARCHAR(64) REFERENCES services(id),
        scheduled_at TIMESTAMP WITH TIME ZONE NOT NULL,
        status VARCHAR(32) DEFAULT 'PENDING' CHECK (status IN ('PENDING', 'CONFIRMED', 'ASSIGNED', 'ON_THE_WAY', 'ARRIVED', 'IN_PROGRESS', 'COMPLETED', 'CANCELLED')),
        address TEXT NOT NULL,
        total_amount NUMERIC(10, 2) NOT NULL,
        payment_status VARCHAR(32) DEFAULT 'PENDING',
        created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
      );
    `;

    // Seed default services if empty
    const servicesCount = await sql`SELECT count(*) FROM services`;
    if (parseInt(servicesCount[0].count, 10) === 0) {
      console.log('Seeding initial clinical services...');
      await sql`
        INSERT INTO services (id, title, category, description, base_price, duration_minutes, icon)
        VALUES 
          ('srv_doc', 'Doctor Home Visit', 'CONSULTATION', 'General physician doorstep clinical checkup and consultation', 500.00, 45, 'Stethoscope'),
          ('srv_nurse', 'Home Nursing Care', 'PROCEDURE', 'IV infusion, injections, catheter care, and vital monitoring', 350.00, 60, 'HeartHandshake'),
          ('srv_dressing', 'Wound Dressing & Care', 'PROCEDURE', 'Sterile dressing for diabetic foot ulcers, burns and post-surgical wounds', 300.00, 30, 'Bandage'),
          ('srv_physio', 'Physiotherapy & Rehab', 'THERAPY', 'Neuro, orthopedic, and post-surgery mobility rehabilitation', 600.00, 50, 'Activity'),
          ('srv_lab', 'Lab Sample Collection', 'DIAGNOSTICS', 'NABL certified doorstep diagnostic blood sample collection', 199.00, 15, 'TestTube'),
          ('srv_pharmacy', 'Pharmacy Delivery', 'PHARMACY', 'Prescription validation and 60-minute doorstep genuine medicine delivery', 0.00, 60, 'Pill'),
          ('srv_ambulance', 'Ambulance Request', 'EMERGENCY', '24/7 Basic & Advanced Life Support ambulance dispatch', 1200.00, 15, 'Truck')
      `;
      console.log('Seeded 7 default services.');
    }

    console.log('✅ Neon Database Schema & Tables successfully initialized!');
  } catch (err) {
    console.error('Database initialization error:', err);
  }
}

initDb();
