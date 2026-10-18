import { cert, getApps, initializeApp } from 'firebase-admin/app';
import { getMessaging } from 'firebase-admin/messaging';
import { pushConfigured } from './push-config';

export function firebaseMessaging() {
  if (!pushConfigured()) throw new Error('Push notifications are not configured.');
  const name = 'homedigo-push';
  const app = getApps().find(app => app.name === name) || initializeApp({
    credential: cert({
      projectId: process.env.FIREBASE_PROJECT_ID,
      clientEmail: process.env.FIREBASE_CLIENT_EMAIL,
      privateKey: process.env.FIREBASE_PRIVATE_KEY!.replace(/\\n/g, '\n'),
    }),
  }, name);
  return getMessaging(app);
}
