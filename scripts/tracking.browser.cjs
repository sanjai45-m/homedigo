const fs = require('fs');
const path = require('path');
const vm = require('vm');
const ts = require('typescript');
const { PGlite } = require('@electric-sql/pglite');
const { chromium } = require(process.env.PLAYWRIGHT_MODULE || 'playwright');
const output = path.join(process.cwd(), '.next/tracking-browser');
fs.mkdirSync(output, {recursive:true});
// Run against a local production build on port 3100. APIs use synthetic accounts and isolated PostgreSQL.
// Set PLAYWRIGHT_MODULE and BROWSER_EXECUTABLE when using an existing local Playwright/browser installation.
const results = [];
const tracking = {};
vm.runInNewContext(ts.transpileModule(fs.readFileSync('src/lib/tracking.ts','utf8'), {compilerOptions:{module:ts.ModuleKind.CommonJS,target:ts.ScriptTarget.ES2020}}).outputText, {exports:tracking});
const record = (name, expected, actual) => {
  const pass = JSON.stringify(expected) === JSON.stringify(actual);
  results.push({ name, pass, expected, actual });
  console.log(JSON.stringify(results.at(-1)));
};

(async () => {
  const db = new PGlite();
  let browser;
  try {
    await db.exec(`CREATE TABLE addresses (id TEXT, lat FLOAT, lng FLOAT, user_id TEXT);
      CREATE TABLE bookings (id TEXT, user_id TEXT, partner_id TEXT, address_id TEXT, partner_lat FLOAT,
        partner_lng FLOAT, patient_lat FLOAT, patient_lng FLOAT, status TEXT, doctor_confirmed_at TIMESTAMPTZ, payment_status TEXT, booking_number TEXT, partner_location_updated_at TIMESTAMPTZ, partner_location_accuracy FLOAT);
      INSERT INTO bookings VALUES ('map-test', 'patient', 'doctor', 'address', NULL, NULL, 13.0827, 80.2707, 'CONFIRMED', NOW(), 'PAID', 'MAP-TEST', NULL, NULL);
      INSERT INTO addresses VALUES ('address', 13.0827, 80.2707, 'patient');`);
    const api = role => {
      const exports = {};
      const deps = {
        '@/lib/tracking': tracking,
        '@/lib/api-auth': { requireApiUser: async allowed => allowed.includes(role)
          ? { user: { id: role === 'PARTNER' ? 'doctor' : 'patient', role } }
          : { response: Response.json({ error: 'Forbidden' }, { status: 403 }) } },
        'next/server': { NextResponse: { json: (body, options) => Response.json(body, options) } },
        '@/lib/appointment-schema': { ensureAppointmentSchema: async () => {} },
        '@/lib/db': { isDbConfigured: true, executeQuery: async (sql, args = []) => ({ isConnected: true, rows: (await db.query(sql, args)).rows }) },
      };
      const source = ts.transpileModule(fs.readFileSync('src/app/api/pro/visits/[id]/location/route.ts', 'utf8'), {
        compilerOptions: { module: ts.ModuleKind.CommonJS, target: ts.ScriptTarget.ES2020 },
      }).outputText;
      vm.runInNewContext(source, { exports, Response, require: name => {
        if (!(name in deps)) throw Error(name); return deps[name];
      } });
      return exports;
    };
    const doctorApi = api('PARTNER'), patientApi = api('PATIENT');
    const context = { params: Promise.resolve({ id: 'map-test' }) };
    const post = async coords => {
      const response = await doctorApi.POST(new Request('http://localhost/api/location', {
        method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({accuracy:20,...coords}),
      }), context);
      return { status: response.status, body: await response.json() };
    };
    const read = async () => (await patientApi.GET({}, context)).json();
    let result = await post({ lat: 12.99, lng: 80.20 });
    record('Chennai: doctor starts far from patient', 'ON_THE_WAY', result.body.status);
    record('Patient receives the saved doctor and destination coordinates', [12.99, 80.2, 13.0827, 80.2707],
      await read().then(r => [r.lat, r.lng, r.patientLat, r.patientLng]));
    result = await post({ lat: 13.084, lng: 80.272 });
    record('Chennai: doctor within 500 metres marks arrival', 'ARRIVED', result.body.status);
    await db.exec("UPDATE bookings SET patient_lat=11.0168, patient_lng=76.9558, status='CONFIRMED'");
    result = await post({ lat: 11.04, lng: 76.98 });
    record('Coimbatore: second location tracks independently', 'ON_THE_WAY', result.body.status);
    record('Coimbatore: patient destination is preserved', [11.0168, 76.9558], await read().then(r => [r.patientLat, r.patientLng]));
    await db.exec("UPDATE bookings SET patient_lat=NULL, patient_lng=NULL, status='CONFIRMED'; UPDATE addresses SET lat=NULL, lng=NULL");
    result = await post({ lat: 13.0, lng: 80.2 });
    record('Missing patient coordinates must not report doctor arrived', false, result.body.status === 'ARRIVED');
    await db.exec("UPDATE bookings SET patient_lat=13.0827, patient_lng=80.2707, status='CONFIRMED'");
    result = await post({ lat: 91, lng: 181 });
    record('Out-of-range GPS coordinates are rejected', 400, result.status);
    await db.exec("UPDATE bookings SET patient_lat=0, patient_lng=0, partner_lat=1, partner_lng=1, status='CONFIRMED'");
    record('Zero latitude/longitude are valid coordinates', [0, 0], await read().then(r => [r.patientLat, r.patientLng]));
    await db.exec("UPDATE bookings SET patient_lat=13.0827, patient_lng=80.2707, partner_lat=NULL, partner_lng=NULL, status='CONFIRMED'");

    browser = await chromium.launch({ executablePath: process.env.BROWSER_EXECUTABLE || undefined, headless: true });
    const makePage = async role => {
      const browserContext = await browser.newContext({ viewport: { width: 1440, height: 1000 },
        geolocation: { latitude: 12.99, longitude: 80.20 }, permissions: ['geolocation'] });
      const page = await browserContext.newPage();
      page.setDefaultTimeout(15000);
      page.setDefaultNavigationTimeout(20000);
      const state = { rejectGps: false, missingPatient: false, pageErrors: [] };
      page.on('pageerror', error => state.pageErrors.push(error.message));
      await page.route('**/api/**', async route => {
        const url = new URL(route.request().url());
        const method = route.request().method();
        let body = {}, status = 200;
        if (url.pathname === '/api/auth/session') body = { user: { id: role === 'PARTNER' ? 'doctor' : 'patient', role, name: 'Map Test User', email: 'map-test@example.invalid' }, expires: '2099-01-01T00:00:00.000Z' };
        else if (url.pathname.endsWith('/location')) {
          if (state.rejectGps && method === 'POST') { status = 503; body = { error: 'Simulated location storage failure' }; }
          else {
            const handler = role === 'PARTNER' ? doctorApi : patientApi;
            const response = await handler[method](new Request(route.request().url(), { method,
              ...(method === 'POST' ? { body: route.request().postData(), headers: { 'Content-Type': 'application/json' } } : {}) }), context);
            status = response.status; body = await response.json();
          }
        } else if (url.pathname.includes('/visits/') || url.pathname.includes('/bookings/')) {
          if (method === 'PUT') {
            const data = route.request().postDataJSON();
            await db.query('UPDATE bookings SET status=$1 WHERE id=$2', [data.status, 'map-test']);
            body = { success: true };
          } else {
            const row = (await db.query('SELECT * FROM bookings')).rows[0];
            const fixture = { ...row, patient_lat: state.missingPatient ? null : row.patient_lat, patient_lng: state.missingPatient ? null : row.patient_lng,
              booking_number: 'MAP-TEST', patient_name: 'Synthetic Test Patient', partner_name: 'Synthetic Doctor',
              service_title: 'Map test appointment', address_text: 'Test destination, Chennai', total_amount: 500,
              scheduled_date: '2099-01-01', scheduled_time_slot: '10:00 AM - 11:00 AM', payment_method: 'UPI' };
            body = role === 'PARTNER' ? { visit: fixture } : { booking: fixture };
          }
        } else if (url.pathname === '/api/pro/dashboard') body = { partner: { name: 'Synthetic Doctor' }, visits: [] };
        else if (url.pathname === '/api/pro/availability') body = { availability: 'AVAILABLE' };
        await route.fulfill({ status, contentType: 'application/json', body: JSON.stringify(body) });
      });
      return { page, browserContext, state };
    };
    const destination = async page => {
      const marker = page.locator('.custom-leaflet-dest-icon');
      await marker.waitFor({ state: 'visible', timeout: 20000 });
      await marker.dispatchEvent('click');
      return page.locator('.leaflet-popup-content').last().innerText();
    };
    const doctor = await makePage('PARTNER');
    await doctor.page.goto('http://localhost:3100/partner/visit/map-test');
    record('Doctor map patient marker uses booked Chennai coordinates', true, (await destination(doctor.page)).includes('13.08270, 80.27070'));
    await doctor.page.locator('.leaflet-container').screenshot({ path: path.join(output, 'doctor-correct-destination.png') });
    const patient = await makePage('PATIENT');
    await patient.page.goto('http://localhost:3100/patient/appointments/map-test', { waitUntil: 'domcontentloaded' });
    record('Patient map shows the saved Chennai patient location', true, (await destination(patient.page)).includes('13.08270, 80.27070'));
    record('Patient map does not invent doctor GPS before sharing starts', 0, await patient.page.locator('.custom-leaflet-doc-icon').count());
    await patient.page.locator('.leaflet-container').screenshot({ path: path.join(output, 'patient-waiting-for-gps.png') });
    await doctor.page.getByRole('button', { name: 'Start Journey (Push GPS)' }).click();
    await doctor.page.waitForFunction(() => document.body.innerText.includes('GPS: 12.99000, 80.20000'));
    await doctor.page.locator('.custom-leaflet-doc-icon').dispatchEvent('click');
    record('Doctor map uses the doctor device GPS after Start Journey', true,
      (await doctor.page.locator('.leaflet-popup-content').last().innerText()).includes('12.99000, 80.20000'));
    await new Promise(r => setTimeout(r, 5500));
    await patient.page.locator('.custom-leaflet-doc-icon').dispatchEvent('click');
    record('Patient map receives the doctor location after polling', true,
      (await patient.page.locator('.leaflet-popup-content').last().innerText()).includes('12.99000, 80.20000'));
    await patient.page.locator('.leaflet-container').screenshot({ path: path.join(output, 'patient-doctor-gps-received.png') });
    await doctor.browserContext.setGeolocation({latitude:13.01, longitude:80.23});
    await doctor.page.waitForFunction(() => document.body.innerText.includes('GPS: 13.01000, 80.23000'));
    await doctor.page.locator('.custom-leaflet-doc-icon').dispatchEvent('click');
    record('Doctor marker follows subsequent GPS movement', true, (await doctor.page.locator('.leaflet-popup-content').last().innerText()).includes('13.01000, 80.23000'));
    await doctor.page.getByRole('button', {name:'Stop sharing GPS'}).click();
    record('Stopping GPS does not mark arrival', 'ON_THE_WAY', (await db.query('SELECT status FROM bookings')).rows[0].status);
    record('Stopped sharing is not labelled live on the doctor map', 0, await doctor.page.getByText('Live location', {exact:true}).count());
    await doctor.browserContext.close();
    const failed = await makePage('PARTNER');
    failed.state.rejectGps = true;
    await failed.page.goto('http://localhost:3100/partner/visit/map-test');
    await failed.page.getByRole('button', { name: 'Start Journey (Push GPS)' }).click();
    await failed.page.getByText('Simulated location storage failure', {exact:true}).waitFor();
    record('Doctor is warned when location upload fails', true,
      (await failed.page.locator('body').innerText()).includes('Simulated location storage failure'));
    await failed.page.locator('.leaflet-container').screenshot({ path: path.join(output, 'doctor-upload-error.png') });
    record('Failed uploads do not claim GPS is shared', 0, await failed.page.getByText('GPS SHARED', {exact:true}).count());
    failed.state.rejectGps = false;
    await failed.page.waitForFunction(() => document.body.innerText.includes('GPS: 12.99000, 80.20000'));
    record('Location sharing recovers after a temporary API failure', true, (await failed.page.locator('body').innerText()).includes('GPS SHARED'));
    await failed.browserContext.close();
    const denied = await makePage('PARTNER');
    await denied.browserContext.clearPermissions();
    await denied.page.addInitScript(() => {
      navigator.geolocation.getCurrentPosition = (success, error) => { setTimeout(() => error({ code: 1, message: 'Location permission denied' }), 0); return 77; };
      navigator.geolocation.clearWatch = () => {};
    });
    await db.exec("UPDATE bookings SET status='CONFIRMED', partner_lat=NULL, partner_lng=NULL");
    await denied.page.goto('http://localhost:3100/partner/visit/map-test');
    await denied.page.getByRole('button', { name: 'Start Journey (Push GPS)' }).click();
    await denied.page.getByText('Location permission denied. Allow location access in your browser and try again.', { exact: true }).waitFor();
    record('GPS permission denial is visible to the doctor', true, (await denied.page.locator('body').innerText()).includes('Location permission denied.'));
    await new Promise(r => setTimeout(r, 200));
    record('Denied GPS permission does not start the journey', 'CONFIRMED', (await db.query('SELECT status FROM bookings')).rows[0].status);
    await denied.browserContext.close();
    await db.exec("UPDATE bookings SET status='CONFIRMED', patient_lat=11.0168, patient_lng=76.9558, partner_lat=11.04, partner_lng=76.98");
    await patient.page.reload({waitUntil:'domcontentloaded'});
    record('Patient map displays a second destination in Coimbatore', true, (await destination(patient.page)).includes('11.01680, 76.95580'));
    await patient.page.locator('.leaflet-container').screenshot({path:path.join(output, 'patient-coimbatore-location.png')});
    await db.exec("UPDATE bookings SET status='ON_THE_WAY', partner_location_updated_at=NOW()-INTERVAL '2 minutes'");
    await patient.page.reload({waitUntil:'domcontentloaded'});
    await patient.page.getByText(/^Last known location .* not live$/).waitFor();
    record('Stale GPS is visibly labelled as last known, not live', 0, await patient.page.getByText('Live location', {exact:true}).count());
    await db.exec("UPDATE bookings SET patient_lat=13.0827, patient_lng=80.2707");
    patient.state.missingPatient = true;
    await patient.page.reload();
    record('Patient map uses location API address fallback when booking coordinates are missing', true,
      (await destination(patient.page)).includes('13.08270, 80.27070'));
    record('Browser pages render without JavaScript exceptions', [], [...doctor.state.pageErrors, ...patient.state.pageErrors, ...failed.state.pageErrors]);
  } finally {
    if (browser) await browser.close();
    await db.close();
    fs.writeFileSync(path.join(output, 'results.json'), JSON.stringify(results, null, 2));
    if (results.some(result => !result.pass)) process.exitCode = 1;
    console.log(JSON.stringify({ passed: results.filter(r => r.pass).length, failed: results.filter(r => !r.pass).length, output }));
  }
})().catch(error => { console.error(error); process.exitCode = 1; });
