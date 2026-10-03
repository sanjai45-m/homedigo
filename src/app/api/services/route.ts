import { NextResponse } from 'next/server';
import { executeQuery, isDbConfigured } from '@/lib/db';

export async function GET() {
  if (isDbConfigured) {
    const servicesRes = await executeQuery(
      'SELECT id, title, category, description, base_price, duration_minutes, icon FROM services WHERE is_active = true ORDER BY base_price ASC'
    );
    if (servicesRes.isConnected && servicesRes.rows.length > 0) {
      return NextResponse.json({
        services: servicesRes.rows,
        source: 'neon_database',
      });
    }
  }

  // Fallback default services
  const fallbackServices = [
    {
      id: 'srv_doc',
      title: 'Doctor Home Visit',
      category: 'CONSULTATION',
      description: 'General physician doorstep clinical checkup and consultation',
      base_price: 500,
      duration_minutes: 45,
      icon: 'Stethoscope',
    },
    {
      id: 'srv_nurse',
      title: 'Home Nursing Care',
      category: 'PROCEDURE',
      description: 'IV infusion, injections, catheter care, and vital monitoring',
      base_price: 350,
      duration_minutes: 60,
      icon: 'HeartHandshake',
    },
    {
      id: 'srv_dressing',
      title: 'Wound Dressing & Care',
      category: 'PROCEDURE',
      description: 'Sterile dressing for diabetic foot ulcers, burns and post-surgical wounds',
      base_price: 300,
      duration_minutes: 30,
      icon: 'Bandage',
    },
    {
      id: 'srv_physio',
      title: 'Physiotherapy & Rehab',
      category: 'THERAPY',
      description: 'Neuro, orthopedic, and post-surgery mobility rehabilitation',
      base_price: 600,
      duration_minutes: 50,
      icon: 'Activity',
    },
    {
      id: 'srv_lab',
      title: 'Lab Sample Collection',
      category: 'DIAGNOSTICS',
      description: 'NABL certified doorstep diagnostic blood sample collection',
      base_price: 199,
      duration_minutes: 15,
      icon: 'TestTube',
    },
    {
      id: 'srv_pharmacy',
      title: 'Pharmacy Delivery',
      category: 'PHARMACY',
      description: 'Prescription validation and 60-minute doorstep genuine medicine delivery',
      base_price: 0,
      duration_minutes: 60,
      icon: 'Pill',
    },
    {
      id: 'srv_ambulance',
      title: 'Ambulance Request',
      category: 'EMERGENCY',
      description: '24/7 Basic & Advanced Life Support ambulance dispatch',
      base_price: 1200,
      duration_minutes: 15,
      icon: 'Truck',
    },
  ];

  return NextResponse.json({
    services: fallbackServices,
    source: 'local_cache',
  });
}
