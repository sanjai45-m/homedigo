import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { test } from 'node:test';
import vm from 'node:vm';
import ts from 'typescript';
import React from 'react';
import * as jsx from 'react/jsx-runtime';
import crypto from 'node:crypto';

// Run real component event handlers with controlled hooks, browser and auth APIs.
// No payment app, network request, real account or email is used by these tests.
function harness(path, globals = {}, dependencies = {}, extra = '') {
  const slots = [], effects = [];
  let cursor = 0;
  const react = { ...React,
    useState(initial) {
      const i = cursor++;
      if (!(i in slots)) slots[i] = typeof initial === 'function' ? initial() : initial;
      return [slots[i], next => { slots[i] = typeof next === 'function' ? next(slots[i]) : next; }];
    },
    useRef(initial) { const i = cursor++; return slots[i] ??= { current: initial }; },
    useEffect(effect, deps) {
      const i = cursor++;
      if (!slots[i] || deps.some((dep, n) => dep !== slots[i][n])) { slots[i] = deps; effects.push(effect); }
    },
  };
  const exports = {};
  const source = ts.transpileModule(readFileSync(path, 'utf8') + extra, { compilerOptions: {
    module: ts.ModuleKind.CommonJS, target: ts.ScriptTarget.ES2020, jsx: ts.JsxEmit.ReactJSX, esModuleInterop: true,
  } }).outputText;
  vm.runInNewContext(source, { exports, console, Buffer, URL, URLSearchParams, crypto, AbortController, setInterval: () => 0, clearInterval() {}, window: { addEventListener() {}, removeEventListener() {} }, process: { env: {} },
    ...globals, require(name) {
      if (name === 'react') return react;
      if (name === 'react/jsx-runtime') return jsx;
      if (name === 'qrcode.react') return { QRCodeCanvas: 'payment-qr-canvas' };
      if (name === '@/components/appointments/AppointmentSlots') return { __esModule: true, default: 'appointment-slots', useAppointmentSlots: () => ({ slots: [{ label: '10:00 AM - 11:00 AM', available: true }], error: '', loading: false, retry() {} }) };
      if (name === '@/components/shared/FeedbackToast') return 'feedback-toast';
      if (name === '@/components/PushNotifications') return () => null;
      if (name === '@/lib/push-client') return { disableBrowserPush: async () => {} };
      if (name in dependencies) return dependencies[name];
      throw new Error(`Missing test dependency: ${name}`);
    },
  });
  return { exports, render(props = {}, component = exports.default) { cursor = 0; return component(props); },
    async flush() { while (effects.length) effects.shift()(); await new Promise(resolve => setTimeout(resolve, 0)); },
  };
}
function all(node, predicate) {
  if (!node || typeof node !== 'object') return [];
  if (Array.isArray(node)) return node.flatMap(child => all(child, predicate));
  return [...(predicate(node) ? [node] : []), ...all(node.props?.children, predicate)];
}
function text(node) {
  if (node?.type === 'feedback-toast') return node.props.message || '';
  if (typeof node === 'string' || typeof node === 'number') return String(node);
  if (Array.isArray(node)) return node.map(text).join('');
  return node && typeof node === 'object' ? text(node.props?.children) : '';
}
const button = (tree, label) => all(tree, node => node.type === 'button' && text(node).includes(label))[0];
const response = body => ({ ok: true, status: 200, json: async () => body });
const payment = harness('src/lib/payment.ts').exports;
const appointmentTime = harness('src/lib/appointment-time.ts').exports;
const navigation = harness('src/lib/patient-navigation.ts').exports;

test('desktop and mobile account links require a valid patient identity', () => {
  const expires = '2099-01-01T00:00:00.000Z';
  for (const [status, data, expectedLabel, expectedHref] of [
    ['unauthenticated', null, 'Sign in', '/patient/login'],
    ['loading', null, 'Sign in', '/patient/login'],
    // Invalidated cookies can still produce a session object without a user.
    ['authenticated', { expires }, 'Sign in', '/patient/login'],
    ['authenticated', { user: { role: 'PATIENT' }, expires }, 'Sign in', '/patient/login'],
    ...['ADMIN', 'SUPER_ADMIN', 'PARTNER'].map(role => [
      'authenticated', { user: { id: 'staff', role }, expires }, 'Sign in', '/patient/login',
    ]),
    ['authenticated', { user: { id: 'patient', role: 'PATIENT' }, expires }, 'My account', '/patient/dashboard'],
  ]) {
    const view = harness('src/components/landing/LandingNav.tsx', {}, {
      'next-auth/react': { useSession: () => ({ status, data }) },
      'next/link': 'a', 'lucide-react': new Proxy({}, { get: (_, key) => key }),
      './LandingBrand': () => null, './landing.module.css': {},
    });
    const links = all(view.render(), node => node.type === 'a' && /^(Sign in|My account)$/.test(text(node)));
    assert.equal(links.length, 2);
    for (const link of links) {
      assert.equal(text(link), expectedLabel);
      assert.equal(link.props.href, expectedHref);
    }
  }
});

test('staff sessions cannot render patient pages or skip patient sign-in, including booking links', async () => {
  for (const role of ['ADMIN', 'SUPER_ADMIN', 'PARTNER']) {
    for (const path of ['/patient/dashboard', '/patient/appointments/bk_test', '/patient/book']) {
      const redirects = [];
      const view = harness('src/app/patient/layout.tsx', { window: { location: { search: '?doctor=test&service=srv_doc' } } }, {
        'next-auth/react': { useSession: () => ({ status: 'authenticated', data: { user: { id: 'staff', role } } }) },
        'next/navigation': { usePathname: () => path, useRouter: () => ({ replace: url => redirects.push(url) }) },
        'next/link': 'a', 'lucide-react': new Proxy({}, { get: (_, key) => key }),
        '@/components/auth/AuthModal': () => null, '@/components/shared/Logo': () => null,
        '@/lib/patient-navigation': navigation,
      });
      const tree = view.render({ children: 'PRIVATE PATIENT CONTENT' });
      assert.doesNotMatch(text(tree), /PRIVATE PATIENT CONTENT/);
      await view.flush();
      assert.equal(redirects.length, 1);
      const destination = new URL(redirects[0], 'https://homedigo.local');
      assert.equal(destination.pathname, '/patient/login');
      assert.equal(destination.searchParams.get('redirect'), path + '?doctor=test&service=srv_doc');
    }
  }
});

test('patient layout allows patient sessions and guest booking but blocks guests on private pages and waits for session loading', async () => {
  for (const [status, role, path, allowed, redirected] of [
    ['authenticated', 'PATIENT', '/patient/dashboard', true, false],
    ['unauthenticated', null, '/patient/book', true, false],
    ['unauthenticated', null, '/patient/appointments', false, true],
    ['loading', null, '/patient/book', false, false],
  ]) {
    const redirects = [];
    const view = harness('src/app/patient/layout.tsx', { window: { location: { search: '' } } }, {
      'next-auth/react': { useSession: () => ({ status, data: role ? { user: { id: 'patient', role } } : null }) },
      'next/navigation': { usePathname: () => path, useRouter: () => ({ replace: url => redirects.push(url) }) },
      'next/link': 'a', 'lucide-react': new Proxy({}, { get: (_, key) => key }),
      '@/components/auth/AuthModal': () => null, '@/components/shared/Logo': () => null,
      '@/lib/patient-navigation': navigation,
    });
    assert.equal(text(view.render({ children: 'PATIENT CONTENT' })).includes('PATIENT CONTENT'), allowed);
    await view.flush();
    assert.equal(redirects.length > 0, redirected);
  }
});

test('patient login shows the form for every staff role instead of redirecting it back to the patient portal', async () => {
  for (const role of ['ADMIN', 'SUPER_ADMIN', 'PARTNER', 'PATIENT']) {
    const redirects = [];
    const view = harness('src/components/auth/PatientSignIn.tsx', {}, {
      'next-auth/react': { useSession: () => ({ status: 'authenticated', data: { user: { id: 'user', role } } }), getProviders: async () => ({}) },
      'next/navigation': { useRouter: () => ({ replace: url => redirects.push(url) }), useSearchParams: () => new URLSearchParams('redirect=/patient/appointments/bk_test') },
      'next/link': 'a', 'next/image': 'img', 'lucide-react': new Proxy({}, { get: (_, key) => key }),
      '@/components/landing/LandingBrand': () => null, '@/lib/patient-navigation': navigation,
      './patient-sign-in.module.css': {},
    });
    const tree = view.render(); await view.flush();
    assert.equal(all(tree, n => n.type === 'form').length, role === 'PATIENT' ? 0 : 1);
    assert.equal(redirects.length, role === 'PATIENT' ? 1 : 0);
    if (role !== 'PATIENT') assert.match(text(tree), /signed in with a staff account/);
  }
});

test('switching from staff to patient requires a refreshed patient session before navigating', async () => {
  let refreshedRole = 'ADMIN', captured;
  const redirects = [];
  const view = harness('src/components/auth/PatientSignIn.tsx', {}, {
    'next-auth/react': { useSession: () => ({ status: 'authenticated', data: { user: { id: 'staff', role: 'ADMIN' } },
      update: async () => ({ user: { id: 'user', role: refreshedRole } }) }), getProviders: async () => ({}),
      signIn: async (_, options) => { captured = options; return { ok: true }; } },
    'next/navigation': { useRouter: () => ({ replace: url => redirects.push(url) }), useSearchParams: () => new URLSearchParams('redirect=/patient/appointments/bk_test') },
    'next/link': 'a', 'next/image': 'img', 'lucide-react': new Proxy({}, { get: (_, key) => key }),
    '@/components/landing/LandingBrand': () => null, '@/lib/patient-navigation': navigation,
    './patient-sign-in.module.css': {},
  });
  view.render(); await view.flush();
  await all(view.render(), n => n.type === 'form')[0].props.onSubmit({ preventDefault() {} });
  assert.equal(redirects.length, 0);
  assert.match(text(view.render()), /Please sign in with a patient account/);
  refreshedRole = 'PATIENT';
  await all(view.render(), n => n.type === 'form')[0].props.onSubmit({ preventDefault() {} });
  assert.equal(captured.expectedRole, 'PATIENT');
  assert.equal(redirects.at(-1), '/patient/appointments/bk_test');
});

async function bookingView({ draft = false, empty = false, failed = false } = {}) {
  const Checkout = () => null;
  const state = { failed, saveFails: false, submissions: [], navigations: [], removedDrafts: [],
    bookingResponse: response({ success: true, booking: { id: 'booking-test' } }) };
  const record = { profiles: empty ? [] : [{ id: 'profile', user_id: 'patient', full_name: 'Test Patient' }],
    addresses: empty ? [] : [{ id: 'address', user_id: 'patient', address_line1: 'Test address', city: 'Chennai' }],
    services: [{ id: 'srv_doc', title: 'Home visit', base_price: '500', visiting_fee: '50' }],
    doctors: [{ id: 'doctor', name: 'Doctor', consultation_fee: '500', availability: 'AVAILABLE' }] };
  const view = harness('src/app/patient/book/page.tsx', {
    fetch: async (url, options) => {
      if (options?.method === 'POST') {
        if (url === '/api/patient/bookings') {
          state.submissions.push(JSON.parse(options.body));
          return state.bookingResponse;
        }
        if (state.saveFails) return { ok: false, status: 503, json: async () => ({ error: 'Storage is unavailable.' }) };
        return response(url.endsWith('profiles') ? { profile: { id: 'profile', user_id: 'patient', full_name: 'Test Patient' } }
          : { address: { id: 'address', user_id: 'patient', address_line1: 'Test address', city: 'Chennai' } });
      }
      if (state.failed && url.includes('/api/patient/')) return { ok: false, status: 503, json: async () => ({ error: 'Storage is unavailable.' }) };
      return response(record);
    }, document: { getElementById: () => null },
    sessionStorage: { removeItem: key => state.removedDrafts.push(key), getItem: () => draft ? JSON.stringify({ savedAt: Date.now(), selectedServiceId: 'srv_doc',
      selectedProfileId: 'profile', selectedAddressId: 'address', selectedPartnerId: 'doctor',
      scheduledDate: '2099-03-01', scheduledSlot: '10:00 AM - 11:00 AM', clinicalNotes: '', requestKey: 'test-request' }) : null },
  }, {
    'next-auth/react': { useSession: () => ({ status: 'authenticated', data: { user: { id: 'patient', role: 'PATIENT' } } }) },
    'next/navigation': { useRouter: () => ({ push: url => state.navigations.push(url) }), useSearchParams: () => new URLSearchParams() },
    'lucide-react': new Proxy({}, { get: (_, key) => key }), '@/lib/geo': {},
    '@/components/shared/LocationPicker': () => null, '@/components/auth/CheckoutSignIn': () => null,
    '@/components/PaymentCheckout': Checkout, '@/lib/appointment-time': appointmentTime,
    '@/components/appointments/AppointmentSlots': { __esModule: true, default: 'appointment-slots', useAppointmentSlots: () => ({ slots: [{ label: '10:00 AM - 11:00 AM', available: true }], error: '', loading: false, retry() {} }) },
  }, '\nexport { BookServiceContent };');
  const render = () => view.render({}, view.exports.BookServiceContent);
  render(); await view.flush();
  return { render, view, state, Checkout };
}

test('successful submission stays on checkout with a notification and an explicit appointment link', async () => {
  const { render, state, Checkout } = await bookingView({ draft: true });
  all(render(), node => node.type === Checkout)[0].props.onReceipt('test-receipt');
  const submit = button(render(), 'Submit Receipt');
  const pending = submit.props.onClick();
  await submit.props.onClick();
  assert.equal(button(render(), 'Submitting for Review').props.disabled, true);
  await pending;
  const tree = render();
  const notice = all(tree, node => node.props?.role === 'status')[0];
  assert.match(text(notice), /Request submitted successfully/);
  assert.match(text(notice), /before accepting your appointment/);
  assert.equal(state.submissions.length, 1);
  assert.equal(state.submissions[0].paymentReceipt, 'test-receipt');
  assert.deepEqual(state.navigations, []);
  assert.deepEqual(state.removedDrafts, ['homedigo-payment-draft-patient']);
  assert.equal(button(tree, 'Submit Receipt'), undefined);
  assert.equal(button(tree, 'Back'), undefined);
  assert.equal(all(tree, node => node.type === 'fieldset')[0].props.disabled, true);
  button(tree, 'View appointment').props.onClick();
  assert.deepEqual(state.navigations, ['/patient/appointments/booking-test']);
});

test('failed or unconfirmed submissions keep the receipt and never show a success notification', async () => {
  for (const result of [
    { ok: false, status: 400, json: async () => ({ error: 'Please choose a future appointment time.' }) },
    response({}),
    response({ success: true, booking: {} }),
  ]) {
    const { render, state, Checkout } = await bookingView({ draft: true });
    state.bookingResponse = result;
    all(render(), node => node.type === Checkout)[0].props.onReceipt('test-receipt');
    await button(render(), 'Submit Receipt').props.onClick();
    const tree = render();
    assert.match(text(tree), /Request not submitted/);
    assert.doesNotMatch(text(tree), /Request submitted successfully/);
    assert.equal(all(tree, node => node.type === Checkout)[0].props.receipt, 'test-receipt');
    assert.deepEqual(state.removedDrafts, []);
    assert.deepEqual(state.navigations, []);
    assert.equal(button(tree, 'Submit Receipt').props.disabled, false);
    button(tree, 'Change appointment time').props.onClick();
    all(render(), node => node.type === 'appointment-slots')[0].props.onDate('Tomorrow');
    all(render(), node => node.type === 'appointment-slots')[0].props.onSelect('10:00 AM - 11:00 AM');
    button(render(), 'Continue').props.onClick();
    assert.equal(all(render(), node => node.type === Checkout)[0].props.receipt, 'test-receipt');
    state.bookingResponse = response({ success: true, booking: { id: 'booking-test' } });
    await button(render(), 'Submit Receipt').props.onClick();
    assert.match(text(render()), /Request submitted successfully/);
    assert.equal(state.submissions[1].scheduledDate, 'Tomorrow');
    assert.equal(state.submissions[1].requestKey, state.submissions[0].requestKey);
  }
});

test('signed-in patients cannot skip an empty patient and address step', async () => {
  const { render } = await bookingView({ empty: true });
  button(render(), 'Continue').props.onClick();
  button(render(), 'Continue').props.onClick();
  const tree = render();
  assert.match(text(tree), /Select or add your patient profile and visit address before continuing/);
  assert.ok(button(tree, 'Add First Family Member'));
  assert.equal(button(tree, 'Submit Receipt'), undefined);
});

test('restored checkout keeps upload visible and enables submission after missing details are saved', async () => {
  const { render, Checkout, state } = await bookingView({ draft: true, empty: true });
  let tree = render();
  let checkout = all(tree, node => node.type === Checkout)[0];
  assert.ok(checkout);
  assert.match(checkout.props.paymentBlockedReason, /patient profile and visit address/);
  checkout.props.onReceipt('existing-receipt');
  assert.equal(button(render(), 'Submit Receipt').props.disabled, true);
  button(render(), 'Add patient profile').props.onClick();
  all(render(), node => node.type === 'input' && node.props.placeholder === 'E.g., Meenakshi K.')[0].props.onChange({ target: { value: 'Test Patient' } });
  state.saveFails = true;
  await all(render(), node => node.type === 'form')[0].props.onSubmit({ preventDefault() {} });
  assert.match(text(render()), /Storage is unavailable/);
  state.saveFails = false;
  await all(render(), node => node.type === 'form')[0].props.onSubmit({ preventDefault() {} });
  assert.equal(button(render(), 'Submit Receipt').props.disabled, true);
  button(render(), 'Add visit address').props.onClick();
  const required = all(render(), node => node.type === 'input' && node.props.required);
  for (const input of required) input.props.onChange({ target: { value: input.props.placeholder?.includes('Flat') ? 'Test address' : '600001' } });
  await all(render(), node => node.type === 'form')[0].props.onSubmit({ preventDefault() {} });
  tree = render();
  checkout = all(tree, node => node.type === Checkout)[0];
  assert.equal(checkout.props.paymentBlockedReason, '');
  assert.equal(checkout.props.receipt, 'existing-receipt');
  assert.equal(button(tree, 'Submit Receipt').props.disabled, false);
});

test('failed patient detail requests show a retry action and recover saved selections', async () => {
  const { render, view, state } = await bookingView({ failed: true });
  assert.match(text(render()), /booking details could not be loaded/);
  state.failed = false;
  button(render(), 'Retry loading booking details').props.onClick();
  render(); await view.flush();
  for (let step = 1; step < 5; step++) {
    const slots = all(render(), node => node.type === 'appointment-slots')[0];
    if (slots) { slots.props.onDate('Tomorrow'); all(render(), node => node.type === 'appointment-slots')[0].props.onSelect('10:00 AM - 11:00 AM'); }
    button(render(), 'Continue').props.onClick();
  }
  assert.ok(button(render(), 'Submit Receipt'));
  assert.doesNotMatch(text(render()), /booking details could not be loaded/);
});

test('blocked payment still allows an existing receipt to be uploaded without opening an app', async () => {
  const location = { href: '' };
  let receipt = '';
  const view = harness('src/components/PaymentCheckout.tsx', {
    window: { location }, navigator: { userAgent: 'Android' },
    fetch: async () => response({ phone: '9361557446', upiId: payment.DEMO_UPI_ID, payeeName: 'HomeDigo' }),
    FileReader: class { readAsDataURL() { this.result = 'existing-receipt'; this.onload(); } },
  }, { '@/lib/payment': payment });
  const props = { amount: 100, reference: 'test', receipt, beforeOpen: () => true, onMethod() {},
    onReceipt(value) { receipt = value; }, paymentBlockedReason: 'Add your patient profile.' };
  view.render(props); await view.flush();
  const tree = view.render(props);
  assert.equal(all(tree, n => n.type === 'fieldset')[0].props.disabled, true);
  button(tree, 'Open Google Pay').props.onClick();
  assert.equal(location.href, '');
  const input = all(tree, n => n.type === 'input' && n.props.type === 'file')[0];
  assert.equal(input.props.disabled, false);
  input.props.onChange({ target: { files: [{ type: 'image/png', size: 50 }] } });
  await view.flush();
  assert.equal(receipt, 'existing-receipt');
});

test('payment QR requires booking checks, encodes the amount and invalidates stale details', async () => {
  const methods = [];
  const downloads = [];
  const view = harness('src/components/PaymentCheckout.tsx', {
    fetch: async () => response({ phone: '9361557446', upiId: 'test-clinic@upi', payeeName: 'Test & Clinic' }),
    document: { body: { appendChild() {} }, createElement: () => ({
      click() { downloads.push({ href: this.href, filename: this.download }); }, remove() {},
    }) },
  }, { '@/lib/payment': payment });
  const props = { amount: 550.25, reference: 'booking-qr-test', receipt: '', beforeOpen: () => false,
    onMethod: method => methods.push(method), onReceipt() {} };
  const qr = tree => all(tree, node => node.type === 'payment-qr-canvas');
  view.render(props); await view.flush();
  assert.equal(qr(view.render(props)).length, 0);
  button(view.render(props), 'Show payment QR').props.onClick();
  assert.equal(qr(view.render(props)).length, 0);
  props.beforeOpen = () => true;
  button(view.render(props), 'Show payment QR').props.onClick();
  let tree = view.render(props);
  const payload = new URL(qr(tree)[0].props.value);
  assert.equal(payload.protocol, 'upi:');
  assert.equal(payload.hostname, 'pay');
  assert.equal(payload.searchParams.get('pa'), 'test-clinic@upi');
  assert.equal(payload.searchParams.get('pn'), 'Test & Clinic');
  assert.equal(payload.searchParams.get('am'), '550.25');
  assert.equal(payload.searchParams.get('cu'), 'INR');
  assert.equal(payload.searchParams.get('tr'), 'booking-qr-test');
  assert.deepEqual(methods, ['UPI']);
  qr(tree)[0].props.ref.current = { toDataURL: type => { assert.equal(type, 'image/png'); return 'data:image/png;base64,test'; } };
  button(tree, 'Download QR').props.onClick();
  assert.deepEqual(downloads, [{ href: 'data:image/png;base64,test', filename: 'homedigo-payment-550.25.png' }]);
  assert.deepEqual(methods, ['UPI', 'UPI']);
  // Blocked bookings cannot continue displaying or downloading a payment QR.
  props.paymentBlockedReason = 'Choose another appointment time.';
  tree = view.render(props);
  assert.equal(qr(tree).length, 0);
  assert.equal(button(tree, 'Show payment QR').props.disabled, true);
  button(tree, 'Show payment QR').props.onClick();
  assert.deepEqual(methods, ['UPI', 'UPI']);
  props.paymentBlockedReason = '';
  props.amount = 600;
  assert.equal(qr(view.render(props)).length, 0);
  button(view.render(props), 'Show payment QR').props.onClick();
  assert.equal(new URL(qr(view.render(props))[0].props.value).searchParams.get('am'), '600.00');
  props.reference = 'different-booking';
  assert.equal(qr(view.render(props)).length, 0);
  for (const amount of [0, -1, NaN, Infinity, 0.001]) {
    props.amount = amount;
    assert.equal(button(view.render(props), 'Show payment QR'), undefined);
  }
  assert.equal(downloads.length, 1);
});

test('demo and missing UPI recipients cannot generate payment QR codes', async () => {
  for (const upiId of [payment.DEMO_UPI_ID, '', 'invalid']) {
    const view = harness('src/components/PaymentCheckout.tsx', {
      fetch: async () => response({ phone: '9361557446', upiId, payeeName: 'Clinic' }),
    }, { '@/lib/payment': payment });
    const props = { amount: 500, reference: 'test', receipt: '', beforeOpen: () => true, onMethod() {}, onReceipt() {} };
    view.render(props); await view.flush();
    assert.equal(button(view.render(props), 'Show payment QR'), undefined);
  }
});

test('mobile payment buttons navigate with recipient and amount without clipboard side effects', async () => {
  const location = { href: '' };
  let copies = 0;
  const view = harness('src/components/PaymentCheckout.tsx', {
    window: { location }, navigator: { userAgent: 'Android', clipboard: { writeText: async () => { copies++; } } },
    fetch: async () => response({ phone: '9361557446', upiId: payment.DEMO_UPI_ID, payeeName: 'HomeDigo' }),
  }, { '@/lib/payment': payment });
  const props = { amount: 550, reference: 'booking-demo', receipt: '', beforeOpen: () => true, onMethod() {}, onReceipt() {} };
  view.render(props); await view.flush();
  let tree = view.render(props);
  assert.match(text(tree), /dummy UPI ID cannot receive payments/);
  button(tree, 'Open Google Pay').props.onClick();
  assert.match(location.href, /package=com.google.android.apps.nbu.paisa.user/);
  assert.match(location.href, /pa=homedigo-demo%40example/);
  assert.match(location.href, /am=550.00/);
  assert.equal(copies, 0);
  button(tree, 'Open PhonePe').props.onClick();
  assert.match(location.href, /package=com.phonepe.app/);
  tree = view.render(props);
  button(tree, 'Copy number').props.onClick(); await view.flush();
  assert.equal(copies, 1);
});

test('desktop and a failed sign-in prerequisite never launch apps or silently copy payment details', async () => {
  const location = { href: '' };
  let copies = 0;
  const navigator = { userAgent: 'Windows', clipboard: { writeText: async () => { copies++; } } };
  const view = harness('src/components/PaymentCheckout.tsx', { window: { location }, navigator,
    fetch: async () => response({ phone: '9361557446', upiId: payment.DEMO_UPI_ID, payeeName: 'HomeDigo' }),
  }, { '@/lib/payment': payment });
  const props = { amount: 100, reference: 'demo', receipt: '', beforeOpen: () => true, onMethod() {}, onReceipt() {} };
  view.render(props); await view.flush();
  button(view.render(props), 'Open Google Pay').props.onClick();
  assert.match(text(view.render(props)), /Open this booking on your phone/);
  assert.equal(location.href, ''); assert.equal(copies, 0);
  navigator.userAgent = 'Android'; props.beforeOpen = () => false;
  button(view.render(props), 'Open PhonePe').props.onClick();
  assert.equal(location.href, ''); assert.equal(copies, 0);
});

test('checkout patient sign-in stays on the page and resumes only after a patient session is refreshed', async () => {
  let resumed = false, captured;
  const view = harness('src/components/auth/CheckoutSignIn.tsx', {}, {
    'next-auth/react': {
      signIn: async (provider, options) => { captured = { provider, options }; return { ok: true }; },
      useSession: () => ({ data: null, update: async () => ({ user: { role: 'PATIENT' } }) }),
    },
  });
  const props = { onSignedIn: () => { resumed = true; } };
  let tree = view.render(props);
  all(tree, node => node.type === 'input' && node.props.type === 'email')[0].props.onChange({ target: { value: ' Patient@Example.test ' } });
  all(tree, node => node.type === 'input' && node.props.type === 'password')[0].props.onChange({ target: { value: 'secret' } });
  tree = view.render(props);
  await all(tree, node => node.type === 'form')[0].props.onSubmit({ preventDefault() {} });
  assert.equal(captured.provider, 'credentials-login');
  assert.equal(captured.options.redirect, false);
  assert.equal(captured.options.expectedRole, 'PATIENT');
  assert.equal(captured.options.email, 'patient@example.test');
  assert.equal(resumed, true);
});

test('guests reach checkout with an inline sign-in form and do not fetch private patient records', async () => {
  const requests = [];
  const SignIn = () => null;
  const Checkout = () => null;
  const view = harness('src/app/patient/book/page.tsx', {
    fetch: async url => { requests.push(url); return response({ services: [], partners: [] }); },
    document: { getElementById: () => null }, sessionStorage: { getItem: () => null },
  }, {
    'next-auth/react': { useSession: () => ({ status: 'unauthenticated', data: null }) },
    'next/navigation': { useRouter: () => ({ push() {} }), useSearchParams: () => new URLSearchParams() },
    'lucide-react': new Proxy({}, { get: (_, key) => key }),
    '@/lib/geo': {}, '@/components/shared/LocationPicker': () => null,
    '@/components/auth/CheckoutSignIn': SignIn, '@/components/PaymentCheckout': Checkout,
    '@/lib/appointment-time': appointmentTime,
  }, '\nexport { BookServiceContent };');
  const component = view.exports.BookServiceContent;
  view.render({}, component); await view.flush();
  for (let step = 1; step < 5; step++) {
    const slots = all(view.render({}, component), node => node.type === 'appointment-slots')[0];
    if (slots) { slots.props.onDate('Tomorrow'); all(view.render({}, component), node => node.type === 'appointment-slots')[0].props.onSelect('10:00 AM - 11:00 AM'); }
    button(view.render({}, component), 'Continue').props.onClick();
  }
  const tree = view.render({}, component);
  assert.equal(all(tree, node => node.type === SignIn).length, 1);
  assert.equal(all(tree, node => node.type === Checkout).length, 0);
  assert.ok(button(tree, 'Sign in to continue'));
  assert.ok(!requests.some(url => /profiles|addresses|bookings/.test(url)));
});

test('a booking 401 reveals inline sign-in and keeps the receipt and selections for retry', async () => {
  let submitted;
  const SignIn = () => null;
  const Checkout = () => null;
  const view = harness('src/app/patient/book/page.tsx', {
    fetch: async (url, options) => {
      if (url === '/api/patient/bookings') {
        submitted = JSON.parse(options.body);
        return { ok: false, status: 401, json: async () => ({ error: 'Please sign in as a patient.' }) };
      }
      return response({
        services: [{ id: 'srv_doc', title: 'Home visit', base_price: '500', visiting_fee: '50' }],
        profiles: [{ id: 'profile', user_id: 'patient', full_name: 'Test Patient' }],
        addresses: [{ id: 'address', user_id: 'patient', address_line1: 'Test address', city: 'Chennai' }],
        doctors: [{ id: 'doctor', name: 'Doctor', consultation_fee: '500', availability: 'AVAILABLE' }],
      });
    }, document: { getElementById: () => null }, sessionStorage: { getItem: () => null },
  }, {
    'next-auth/react': { useSession: () => ({ status: 'authenticated', data: { user: { id: 'patient', role: 'PATIENT', email: 'patient@example.test' } } }) },
    'next/navigation': { useRouter: () => ({ push() { assert.fail('Sign-in must not navigate away'); } }), useSearchParams: () => new URLSearchParams() },
    'lucide-react': new Proxy({}, { get: (_, key) => key }), '@/lib/geo': {},
    '@/components/shared/LocationPicker': () => null, '@/components/auth/CheckoutSignIn': SignIn,
    '@/components/PaymentCheckout': Checkout, '@/lib/appointment-time': appointmentTime,
  }, '\nexport { BookServiceContent };');
  const component = view.exports.BookServiceContent;
  view.render({}, component); await view.flush();
  for (let step = 1; step < 5; step++) {
    const slots = all(view.render({}, component), node => node.type === 'appointment-slots')[0];
    if (slots) { slots.props.onDate('Tomorrow'); all(view.render({}, component), node => node.type === 'appointment-slots')[0].props.onSelect('10:00 AM - 11:00 AM'); }
    button(view.render({}, component), 'Continue').props.onClick();
  }
  let tree = view.render({}, component);
  all(tree, node => node.type === Checkout)[0].props.onReceipt('test-receipt');
  tree = view.render({}, component);
  await button(tree, 'Submit Receipt').props.onClick();
  tree = view.render({}, component);
  const form = all(tree, node => node.type === SignIn)[0];
  assert.ok(form);
  assert.equal(submitted.paymentReceipt, 'test-receipt');
  assert.equal(submitted.patientProfileId, 'profile');
  assert.equal(submitted.addressId, 'address');
  assert.equal(submitted.partnerId, 'doctor');
  form.props.onSignedIn(); view.render({}, component); await view.flush();
  const restored = all(view.render({}, component), node => node.type === Checkout)[0];
  assert.equal(restored.props.receipt, 'test-receipt');
  assert.equal(restored.props.reference, submitted.requestKey);
});
