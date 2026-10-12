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
  vm.runInNewContext(source, { exports, console, Buffer, URLSearchParams, crypto, process: { env: {} },
    ...globals, require(name) {
      if (name === 'react') return react;
      if (name === 'react/jsx-runtime') return jsx;
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
  if (typeof node === 'string' || typeof node === 'number') return String(node);
  if (Array.isArray(node)) return node.map(text).join('');
  return node && typeof node === 'object' ? text(node.props?.children) : '';
}
const button = (tree, label) => all(tree, node => node.type === 'button' && text(node).includes(label))[0];
const response = body => ({ ok: true, status: 200, json: async () => body });
const payment = harness('src/lib/payment.ts').exports;

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
    '@/lib/appointment-time': {},
  }, '\nexport { BookServiceContent };');
  const component = view.exports.BookServiceContent;
  view.render({}, component); await view.flush();
  for (let step = 1; step < 5; step++) button(view.render({}, component), 'Continue').props.onClick();
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
        partners: [{ id: 'doctor', name: 'Doctor', consultation_fee: '500' }],
      });
    }, document: { getElementById: () => null }, sessionStorage: { getItem: () => null },
  }, {
    'next-auth/react': { useSession: () => ({ status: 'authenticated', data: { user: { id: 'patient', role: 'PATIENT', email: 'patient@example.test' } } }) },
    'next/navigation': { useRouter: () => ({ push() { assert.fail('Sign-in must not navigate away'); } }), useSearchParams: () => new URLSearchParams() },
    'lucide-react': new Proxy({}, { get: (_, key) => key }), '@/lib/geo': {},
    '@/components/shared/LocationPicker': () => null, '@/components/auth/CheckoutSignIn': SignIn,
    '@/components/PaymentCheckout': Checkout, '@/lib/appointment-time': {},
  }, '\nexport { BookServiceContent };');
  const component = view.exports.BookServiceContent;
  view.render({}, component); await view.flush();
  for (let step = 1; step < 5; step++) button(view.render({}, component), 'Continue').props.onClick();
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
