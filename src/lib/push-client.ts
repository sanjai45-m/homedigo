'use client';

import { readStaffToken } from './staff-client';
export type PushPortal = 'patient' | 'partner';
export type PushConfig = { enabled: boolean; firebase: { apiKey: string; projectId: string; messagingSenderId: string; appId: string }; vapidKey: string };
type SavedPush = { userId: string; fid: string };
const key = (portal: PushPortal) => `homedigo.push.${portal}`;

export function savedPush(portal: PushPortal): SavedPush | null {
  try { return JSON.parse(localStorage.getItem(key(portal)) || 'null'); } catch { return null; }
}
export function rememberPush(portal: PushPortal, value: SavedPush | null) {
  if (value) localStorage.setItem(key(portal), JSON.stringify(value));
  else localStorage.removeItem(key(portal));
}
export async function updatePush(portal: PushPortal, fid: string, remove = false, replace = false) {
  const headers = new Headers({ 'Content-Type': 'application/json' });
  if (portal === 'partner') {
    const credential = readStaffToken('partner');
    if (!credential) throw new Error('Sign in to enable notifications.');
    headers.set('Authorization', `Bearer ${credential}`);
  }
  const response = await fetch('/api/push/subscriptions', {
    method: remove ? 'DELETE' : 'POST', headers, credentials: portal === 'partner' ? 'omit' : 'same-origin',
    body: JSON.stringify({ fid, replace }),
  });
  if (!response.ok) {
    const body = await response.json();
    throw new Error(body.error || 'Could not update notifications. Please retry.');
  }
}

export async function pushClient(portal: PushPortal, config: PushConfig) {
  const [{ getApps, initializeApp }, messaging] = await Promise.all([import('firebase/app'), import('firebase/messaging')]);
  if (!await messaging.isSupported()) throw new Error('This browser does not support notifications.');
  const name = `homedigo-push-${portal}`;
  const app = getApps().find(app => app.name === name) || initializeApp(config.firebase, name);
  const registration = await navigator.serviceWorker.register(`/firebase-messaging-sw.js?portal=${portal}`, {
    scope: `/${portal}/`, updateViaCache: 'none',
  });
  const instance = messaging.getMessaging(app);
  // A previous logout may have revoked the browser subscription while offline.
  // Rotate this named app's installation to force a fresh registration. The SDK's
  // messaging cache is shared by appId, but installation identities include app name.
  if (!await registration.pushManager.getSubscription()) {
    const { deleteInstallations, getInstallations } = await import('firebase/installations');
    await deleteInstallations(getInstallations(app));
  }
  // A custom portal scope must become active; serviceWorker.ready can refer to another scope.
  if (!registration.active) await new Promise<void>((resolve, reject) => {
    const worker = registration.installing || registration.waiting;
    if (!worker) { reject(new Error('Notification setup failed. Please retry.')); return; }
    const timeout = window.setTimeout(() => { worker.removeEventListener('statechange', changed); reject(new Error('Notification setup timed out. Please retry.')); }, 15000);
    const changed = () => {
      if (worker.state === 'activated') { clearTimeout(timeout); worker.removeEventListener('statechange', changed); resolve(); }
      if (worker.state === 'redundant') { clearTimeout(timeout); worker.removeEventListener('statechange', changed); reject(new Error('Notification setup failed. Please retry.')); }
    };
    worker.addEventListener('statechange', changed); changed();
  });
  return { ...messaging, messaging: instance, registration };
}

/** Revoke this browser's subscription before removing the login credential. */
export async function disableBrowserPush(portal: PushPortal, userId: string) {
  const saved = savedPush(portal);
  if (!saved || saved.userId !== userId) return;
  try { await updatePush(portal, saved.fid, true); }
  finally {
    // Also revoke locally when the server/session is unavailable at logout.
    if (savedPush(portal)?.userId === userId) {
      try {
        const [{ getApps }, installations] = await Promise.all([import('firebase/app'), import('firebase/installations')]);
        const app = getApps().find(app => app.name === `homedigo-push-${portal}`);
        if (app) await installations.deleteInstallations(installations.getInstallations(app));
      } catch { /* Browser-side revocation below also works without Firebase access. */ }
      const registration = await navigator.serviceWorker?.getRegistration(`/${portal}/`);
      const subscription = await registration?.pushManager.getSubscription();
      if (subscription) await subscription.unsubscribe();
      rememberPush(portal, null);
    }
  }
}
