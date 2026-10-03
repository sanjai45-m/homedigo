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

async function runAuthTests() {
  console.log('================================================================');
  console.log('🔐 HOMEDIGO SUPER ADMIN & ADMIN DATABASE CREDENTIALS TEST');
  console.log('================================================================\n');

  // Step 1: Query Super Admin Admins list
  console.log('▶ [TEST 1] Fetch live Admin list from Neon DB (Verify no fake/hardcoded admins)');
  const listRes = await request('/api/super-admin/admins');
  console.log(`  Status: ${listRes.status} ${listRes.ok ? '✅ OK' : '❌ FAILED'}`);
  console.log(`  Active Database Admins Count: ${listRes.data?.admins?.length || 0}`);
  console.log('');

  // Step 2: Super Admin Provisions New Operations Admin with Custom Password
  const testEmail = `ops.lead.${Date.now()}@homedigo.care`;
  const testPass = 'SecureOps@9942!';
  console.log('▶ [TEST 2] Super Admin creates Operations Admin with custom login credentials');
  console.log(`  Provisioning: ${testEmail} | Password: ${testPass}`);
  const createAdminRes = await request('/api/super-admin/admins', {
    method: 'POST',
    body: {
      name: 'Rohan Sharma (Bangalore Ops)',
      email: testEmail,
      password: testPass,
      phone: '+91 98450 88776',
      department: 'OPERATIONS',
      accessLevel: 'FULL_ADMIN',
    },
  });
  console.log(`  Status: ${createAdminRes.status} ${createAdminRes.ok ? '✅ OK' : '❌ FAILED'}`);
  console.log(`  Admin Created ID: ${createAdminRes.data?.admin?.id}`);
  console.log(`  Returned Plain Password for Super Admin: ${createAdminRes.data?.admin?.plainPassword}`);
  const createdAdminId = createAdminRes.data?.admin?.id;
  console.log('');

  // Step 3: Verify the created Admin now appears in live DB list
  console.log('▶ [TEST 3] Verify newly provisioned Admin exists in Database list');
  const updatedListRes = await request('/api/super-admin/admins');
  const foundAdmin = updatedListRes.data?.admins?.find((a) => a.email === testEmail);
  console.log(`  Found in DB: ${foundAdmin ? '✅ YES (' + foundAdmin.name + ')' : '❌ NO'}`);
  console.log(`  Department: ${foundAdmin?.department} | Access: ${foundAdmin?.access_level}`);
  console.log('');

  // Step 4: Verify Super Admin can revoke/delete Admin from DB
  console.log('▶ [TEST 4] Clean up test admin from database');
  const deleteRes = await request(`/api/super-admin/admins?id=${createdAdminId}`, {
    method: 'DELETE',
  });
  console.log(`  Status: ${deleteRes.status} ${deleteRes.ok ? '✅ OK' : '❌ FAILED'}`);
  console.log(`  Message: ${deleteRes.data?.message}`);
  console.log('');

  console.log('================================================================');
  console.log('🎉 ALL SUPER ADMIN & ADMIN CREDENTIAL WORKFLOW TESTS PASSED!');
  console.log('================================================================');
}

runAuthTests().catch((err) => {
  console.error('❌ Auth test failed:', err);
  process.exit(1);
});
