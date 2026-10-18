import { SDK_VERSION } from 'firebase/app';
import { publicPushConfig, pushConfigured } from '@/lib/push-config';

export const dynamic = 'force-dynamic';
export function GET(request: Request) {
  const portal = new URL(request.url).searchParams.get('portal');
  if (portal !== 'patient' && portal !== 'partner') return new Response('Unknown portal', { status: 400 });
  if (!pushConfigured()) return new Response('Notifications unavailable', { status: 503 });
  const script = `
const portal = ${JSON.stringify(portal)};
function safePath(value) {
  if (typeof value !== 'string' || value.includes('\\\\')) return null;
  const prefix = portal === 'patient' ? '/patient/appointments/' : '/partner/visit/';
  if (!value.startsWith(prefix)) return null;
  const url = new URL(value, self.location.origin);
  return url.origin === self.location.origin && url.pathname.startsWith(prefix) ? url.href : null;
}
self.addEventListener('install', () => self.skipWaiting());
self.addEventListener('activate', event => event.waitUntil(self.clients.claim()));
async function displayUpdate(data) {
  if (!safePath(data.path)) return;
  await self.registration.showNotification(data.title || 'Appointment update', {
    body: data.body || 'Open HomeDigo for details.', icon: '/icons/icon-192.png',
    tag: data.tag || 'homedigo-update', data: { path: data.path }
  });
  const windows = await self.clients.matchAll({ type: 'window', includeUncontrolled: true });
  for (const client of windows) {
    if (new URL(client.url).pathname.startsWith('/' + portal + '/')) {
      client.postMessage({ type: 'homedigo:push', data });
    }
  }
}
// Firebase otherwise suppresses background display when ANY same-origin tab is
// visible, including the other portal. Own display for our data messages only.
self.addEventListener('push', event => {
  let data;
  try { data = event.data.json().data; } catch { return; }
  if (!data || !safePath(data.path)) return;
  event.stopImmediatePropagation();
  event.waitUntil(displayUpdate(data));
});
// Register before Firebase's click handler. Never send users to an external URL.
self.addEventListener('notificationclick', event => {
  event.stopImmediatePropagation();
  event.notification.close();
  const url = safePath(event.notification.data && event.notification.data.path);
  if (!url) return;
  event.waitUntil((async () => {
    const windows = await self.clients.matchAll({ type: 'window', includeUncontrolled: true });
    const matching = windows.find(client => client.url === url);
    if (matching) return matching.focus();
    return self.clients.openWindow(url);
  })());
});
importScripts('https://www.gstatic.com/firebasejs/${SDK_VERSION}/firebase-app-compat.js');
importScripts('https://www.gstatic.com/firebasejs/${SDK_VERSION}/firebase-messaging-compat.js');
const app = firebase.initializeApp(${JSON.stringify(publicPushConfig())}, 'homedigo-push-' + portal);
const messaging = firebase.messaging(app);
messaging.onBackgroundMessage(payload => {
  const data = payload.data || {};
  return displayUpdate(data);
});
`;
  return new Response(script, { headers: {
    'Content-Type': 'application/javascript; charset=utf-8',
    'Cache-Control': 'no-store', 'Service-Worker-Allowed': '/', 'X-Content-Type-Options': 'nosniff',
  } });
}
