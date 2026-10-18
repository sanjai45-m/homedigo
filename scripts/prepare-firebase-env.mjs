// Creates a Firebase-only Vercel import file. Never prints credential values.
// Pass a newly downloaded service-account JSON path to populate the private key.
import { readFileSync, writeFileSync } from 'node:fs';
import { createPrivateKey } from 'node:crypto';
import { parseEnv } from 'node:util';

const source = parseEnv(readFileSync('.env.local', 'utf8'));
const fields = ['WEB_PUSH_ENABLED', 'FIREBASE_PROJECT_ID', 'FIREBASE_WEB_API_KEY',
  'FIREBASE_MESSAGING_SENDER_ID', 'FIREBASE_WEB_APP_ID', 'FIREBASE_WEB_VAPID_KEY',
  'FIREBASE_CLIENT_EMAIL', 'FIREBASE_PRIVATE_KEY'];
const values = Object.fromEntries(fields.map(name => [name, source[name] || '']));
values.WEB_PUSH_ENABLED = 'true';
// Do not reuse a potentially exposed key from .env.local in the export.
values.FIREBASE_PRIVATE_KEY = '';
if (process.argv[2]) {
  const account = JSON.parse(readFileSync(process.argv[2], 'utf8'));
  if (account.type !== 'service_account' || account.project_id !== values.FIREBASE_PROJECT_ID) {
    throw new Error('Choose a service account from the configured Firebase project.');
  }
  createPrivateKey(account.private_key);
  values.FIREBASE_CLIENT_EMAIL = account.client_email;
  values.FIREBASE_PRIVATE_KEY = account.private_key;
}
writeFileSync('.env.firebase.vercel.local', fields.map(name => `${name}=${JSON.stringify(values[name])}`).join('\n') + '\n');
console.log('Created .env.firebase.vercel.local (ignored by Git).');
console.log(values.FIREBASE_PRIVATE_KEY ? 'All eight Firebase settings are ready to import.' : 'Private key is blank. Run again with the replacement service-account JSON path before importing.');
