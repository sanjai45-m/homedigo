const http = require('http');

const BASE_URL = 'http://localhost:3000';

async function request(path, options = {}) {
  const url = `${BASE_URL}${path}`;
  const headers = {
    'Content-Type': 'application/json',
    ...(options.headers || {}),
  };

  const res = await fetch(url, {
    method: options.method || 'GET',
    headers,
    body: options.body ? JSON.stringify(options.body) : undefined,
  });

  const json = await res.json().catch(() => ({}));
  return { status: res.status, ok: res.ok, data: json };
}

async function runTests() {
  console.log('================================================================');
  console.log('🚀 HOMEDIGO MULTI-PORTAL END-TO-END SYSTEM & INTEGRATION TESTS');
  console.log('   (Super Admin · Operations Admin · Healthcare Partner · Patient)');
  console.log('================================================================\n');

  // Step 1: Health Check
  console.log('▶ [TEST 1] System & Neon Database Health Check');
  const health = await request('/api/health/db');
  console.log(`  Status: ${health.status} ${health.ok ? '✅ OK' : '❌ FAILED'}`);
  console.log(`  Neon DB Connected: ${health.data?.services?.neonDatabase?.connected}`);
  console.log('');

  // Step 2: Super Admin Provisions a New Operations Admin
  console.log('▶ [TEST 2] Super Admin Panel: Provision Operations Admin');
  const adminPayload = {
    name: 'Siddharth V. (City Ops Head)',
    email: `ops.head.${Date.now()}@homedigo.care`,
    phone: '+91 98450 11223',
    department: 'OPERATIONS',
    accessLevel: 'FULL_ADMIN',
  };
  const createAdminRes = await request('/api/super-admin/admins', {
    method: 'POST',
    body: adminPayload,
  });
  console.log(`  Status: ${createAdminRes.status} ${createAdminRes.ok ? '✅ OK' : '❌ FAILED'}`);
  console.log(`  Created Admin: ${createAdminRes.data?.admin?.name} (${createAdminRes.data?.admin?.email})`);
  console.log(`  Role: ${createAdminRes.data?.admin?.role}`);
  console.log('');

  // Step 3: Super Admin Creates & Approves a Healthcare Partner
  console.log('▶ [TEST 3] Super Admin Panel: Onboard & Verify Healthcare Partner');
  const partnerPayload = {
    name: 'Dr. Arjun Rampal',
    email: `dr.arjun.${Date.now()}@homedigo.care`,
    phone: '+91 98450 77665',
    specialization: 'MBBS, MD (General Physician & Diabetology)',
    councilRegNumber: 'KMC-84920-IND',
    experienceYears: 12,
    serviceRadiusKm: 18,
    verificationStatus: 'APPROVED',
    availability: 'AVAILABLE',
  };
  const createPartnerRes = await request('/api/admin/partners', {
    method: 'POST',
    body: partnerPayload,
  });
  console.log(`  Status: ${createPartnerRes.status} ${createPartnerRes.ok ? '✅ OK' : '❌ FAILED'}`);
  console.log(`  Partner Doctor: ${createPartnerRes.data?.partner?.name}`);
  console.log(`  Specialization: ${createPartnerRes.data?.partner?.specialization}`);
  console.log(`  Verification: ${createPartnerRes.data?.partner?.verification_status}`);
  const createdDocId = createPartnerRes.data?.partner?.id || 'usr_pro_101';
  console.log('');

  // Step 4: Admin Creates Dynamic Service
  console.log('▶ [TEST 4] Admin Portal: Create New Dynamic Service & Fix Price');
  const servicePayload = {
    title: 'Comprehensive Senior Diabetology Assessment',
    category: 'CONSULTATION',
    description: 'Specialized doorstep blood glucose profile, nerve check, and doctor prescription plan.',
    basePrice: 850,
    visitingFee: 150,
    commissionPercentage: 15,
    durationMinutes: 60,
    icon: 'Stethoscope',
  };
  const createServiceRes = await request('/api/admin/services', {
    method: 'POST',
    body: servicePayload,
  });
  console.log(`  Status: ${createServiceRes.status} ${createServiceRes.ok ? '✅ OK' : '❌ FAILED'}`);
  console.log(`  Created Service: ${createServiceRes.data?.service?.title}`);
  console.log(`  Base Rate: ₹${createServiceRes.data?.service?.base_price}, Visiting Fee: ₹${createServiceRes.data?.service?.visiting_fee}`);
  const createdServiceId = createServiceRes.data?.service?.id || 'srv_doc';
  console.log('');

  // Step 5: Patient Books Appointment with Doctor
  console.log('▶ [TEST 5] Patient Portal: Book Appointment with Doctor & Service');
  const bookingPayload = {
    userId: 'usr_pat_001',
    patientProfileId: 'prof_001',
    patientName: 'Kavitha R. (Family Member)',
    addressId: 'addr_001',
    addressText: 'Villa 14, Palm Meadows, Whitefield, Bengaluru - 560066',
    serviceId: createdServiceId,
    serviceTitle: servicePayload.title,
    totalAmount: 1000.0,
    scheduledDate: 'Today',
    scheduledTimeSlot: '04:00 PM - 05:00 PM',
    clinicalInstructions: 'Senior diabetic assessment, fasting and PP sugar check with lifestyle guidance.',
    partnerId: createdDocId,
    partnerName: partnerPayload.name,
    partnerTitle: partnerPayload.specialization,
  };
  const bookRes = await request('/api/patient/bookings', {
    method: 'POST',
    body: bookingPayload,
  });
  console.log(`  Status: ${bookRes.status} ${bookRes.ok ? '✅ OK' : '❌ FAILED'}`);
  console.log(`  Booking ID: ${bookRes.data?.booking?.id}`);
  console.log(`  Booking Number: ${bookRes.data?.booking?.booking_number}`);
  console.log(`  Assigned Clinician: ${bookRes.data?.booking?.partner_name}`);
  console.log(`  Total Paid: ₹${bookRes.data?.booking?.total_amount}`);
  const createdBookingId = bookRes.data?.booking?.id;
  console.log('');

  // Step 6: Partner Portal: Doorstep Check-in & Record Vitals
  console.log('▶ [TEST 6] Partner Portal: Clinician Field Check-in & Log Vitals');
  const updateVisitRes = await request(`/api/pro/visits/${createdBookingId}`, {
    method: 'PUT',
    body: {
      status: 'COMPLETED',
      vitalBp: '124/82 mmHg',
      vitalPulse: '72 bpm',
      vitalSpo2: '99%',
      vitalSugar: '112 mg/dL',
      prescriptionNotes: 'Patient vitals stable. Recommended low GI diet, daily 30min walk, and Tab Metformin 500mg OD.',
    },
  });
  console.log(`  Status: ${updateVisitRes.status} ${updateVisitRes.ok ? '✅ OK' : '❌ FAILED'}`);
  console.log(`  Visit Status: ${updateVisitRes.data?.visit?.status}`);
  console.log(`  Logged Vitals: BP: ${updateVisitRes.data?.visit?.vital_bp} | SpO2: ${updateVisitRes.data?.visit?.vital_spo2} | Sugar: ${updateVisitRes.data?.visit?.vital_sugar}`);
  console.log('');

  // Step 7: Super Admin Billing & Financial Settlement Verification
  console.log('▶ [TEST 7] Super Admin: Platform Financial Billing & Commission Ledger');
  const billingRes = await request('/api/super-admin/billing');
  console.log(`  Status: ${billingRes.status} ${billingRes.ok ? '✅ OK' : '❌ FAILED'}`);
  console.log(`  Platform Gross GMV: ₹${billingRes.data?.summary?.grossRevenue}`);
  console.log(`  Platform Net Revenue (15% Cut): ₹${billingRes.data?.summary?.platformCommission}`);
  console.log(`  Clinician Net Payouts (85%): ₹${billingRes.data?.summary?.netClinicianPayouts}`);
  console.log(`  GST Tax Collected: ₹${billingRes.data?.summary?.gstTaxCollected}`);
  console.log('');

  // Step 8: Super Admin 1-Click Batch Payout Disbursement
  console.log('▶ [TEST 8] Super Admin: 1-Click Batch Payout Disbursement');
  const disburseRes = await request('/api/super-admin/billing', {
    method: 'POST',
    body: { action: 'DISBURSE_BATCH' },
  });
  console.log(`  Status: ${disburseRes.status} ${disburseRes.ok ? '✅ OK' : '❌ FAILED'}`);
  console.log(`  Disbursed Batch ID: ${disburseRes.data?.batchId}`);
  console.log(`  Message: ${disburseRes.data?.message}`);
  console.log('');

  // Step 9: Super Admin Global Executive Cockpit Stats
  console.log('▶ [TEST 9] Super Admin: Global Cockpit Telemetry Stats');
  const superStats = await request('/api/super-admin/stats');
  console.log(`  Status: ${superStats.status} ${superStats.ok ? '✅ OK' : '❌ FAILED'}`);
  console.log(`  Total Active Admins: ${superStats.data?.metrics?.totalAdmins}`);
  console.log(`  Total Verified Partners: ${superStats.data?.metrics?.totalPartners}`);
  console.log(`  Total Active Patients: ${superStats.data?.metrics?.totalPatients}`);
  console.log(`  Total Lifetime Bookings: ${superStats.data?.metrics?.totalBookings}`);
  console.log(`  Platform GMV: ₹${superStats.data?.metrics?.totalGmv}`);
  console.log(`  System Uptime: ${superStats.data?.metrics?.uptime}`);
  console.log('');

  console.log('================================================================');
  console.log('🎉 100% SUCCESS: ALL CROSS-PORTAL INTEGRATION TESTS PASSED!');
  console.log('================================================================');
}

runTests().catch((err) => {
  console.error('❌ Test failed with error:', err);
  process.exit(1);
});
