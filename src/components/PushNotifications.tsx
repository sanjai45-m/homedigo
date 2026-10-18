'use client';

import { useCallback, useEffect, useRef, useState } from 'react';
import { disableBrowserPush, pushClient, rememberPush, savedPush, updatePush, type PushConfig, type PushPortal } from '@/lib/push-client';

export default function PushNotifications({ portal, userId }: { portal: PushPortal; userId: string }) {
  const [config, setConfig] = useState<PushConfig | null>(null);
  const [enabled, setEnabled] = useState(false);
  const [busy, setBusy] = useState(false);
  const [message, setMessage] = useState('');
  const [support, setSupport] = useState<'supported' | 'install' | 'unsupported'>('unsupported');
  const [notice, setNotice] = useState<{ title: string; body: string; path: string } | null>(null);
  const active = useRef(true);
  const listeners = useRef<(() => void)[]>([]);
  const connecting = useRef(false);

  const connect = useCallback(async (settings: PushConfig, replace: boolean) => {
    if (connecting.current) return;
    connecting.current = true;
    try {
      const client = await pushClient(portal, settings);
      if (!active.current) return;
      listeners.current.forEach(stop => stop());
      let save: Promise<void> = Promise.resolve();
      const saveRegistration = (fid: string) => {
        save = (async () => {
          await updatePush(portal, fid, false, replace);
          if (!active.current) return;
          const previous = savedPush(portal);
          rememberPush(portal, { userId, fid });
          if (previous?.userId === userId && previous.fid !== fid) await updatePush(portal, previous.fid, true);
          setEnabled(true); setMessage('Notifications enabled for this account on this browser.');
        })();
        // Registration changes can also arrive later, outside an Enable click.
        void save.catch(error => { if (active.current) { setEnabled(false); setMessage(error instanceof Error ? error.message : 'Could not enable notifications.'); } });
        replace = false;
      };
      listeners.current = [
        client.onRegistered(client.messaging, saveRegistration),
        client.onUnregistered(client.messaging, fid => {
          if (savedPush(portal)?.userId !== userId) return;
          void updatePush(portal, fid, true).catch(() => {});
          rememberPush(portal, null);
          if (active.current) setEnabled(false);
        }),
        client.onMessage(client.messaging, payload => {
          const data = payload.data;
          if (savedPush(portal)?.userId === userId && data?.path?.startsWith(`/${portal}/`) && !data.path.includes('\\')) {
            setNotice({ title: data.title || 'Appointment update', body: data.body || '', path: data.path });
          }
        }),
      ];
      await client.register(client.messaging, { vapidKey: settings.vapidKey, serviceWorkerRegistration: client.registration });
      await save;
    } finally { connecting.current = false; }
  }, [portal, userId]);

  useEffect(() => {
    active.current = true;
    let disposed = false;
    async function initialize() {
      try {
        const response = await fetch('/api/push/config', { cache: 'no-store' });
        const settings = await response.json() as PushConfig;
        if (disposed || !settings.enabled) return;
        setConfig(settings);
        const ios = /iPad|iPhone|iPod/.test(navigator.userAgent) || (navigator.platform === 'MacIntel' && navigator.maxTouchPoints > 1);
        const standalone = matchMedia('(display-mode: standalone)').matches || Boolean((navigator as Navigator & { standalone?: boolean }).standalone);
        if (ios && !standalone) { setSupport('install'); return; }
        if (!window.isSecureContext || !('Notification' in window) || !('serviceWorker' in navigator) || !('PushManager' in window)) return;
        setSupport('supported');
        if (Notification.permission === 'granted' && savedPush(portal)?.userId === userId) await connect(settings, false);
      } catch { if (!disposed) setMessage('Could not refresh notifications. You can try enabling them again.'); }
    }
    void initialize();
    const sync = () => {
      if (savedPush(portal)?.userId !== userId) setEnabled(false);
    };
    const received = (event: MessageEvent) => {
      const data = event.data?.data;
      if (event.data?.type !== 'homedigo:push' || savedPush(portal)?.userId !== userId || typeof data?.path !== 'string') return;
      const path = new URL(data.path, window.location.origin);
      if (path.origin === window.location.origin && path.pathname.startsWith(`/${portal}/`)) {
        setNotice({ title: data.title || 'Appointment update', body: data.body || '', path: path.pathname });
      }
    };
    window.addEventListener('storage', sync);
    navigator.serviceWorker?.addEventListener('message', received);
    return () => {
      disposed = true; active.current = false; listeners.current.forEach(stop => stop());
      window.removeEventListener('storage', sync); navigator.serviceWorker?.removeEventListener('message', received);
    };
  }, [connect, portal, userId]);

  async function toggle() {
    if (!config || busy) return;
    setBusy(true); setMessage('');
    try {
      if (enabled) {
        listeners.current.forEach(stop => stop());
        await disableBrowserPush(portal, userId);
        setEnabled(false); setMessage('Notifications disabled on this browser.');
      } else {
        // Ask only after a click, before any asynchronous SDK initialization (required by iOS).
        const permission = await Notification.requestPermission();
        if (permission !== 'granted') {
          setMessage(permission === 'denied' ? 'Notifications are blocked. Allow them in your browser or device settings, then try again.' : 'Notifications were not enabled.');
          return;
        }
        await connect(config, true);
      }
    } catch (error) { setMessage(error instanceof Error ? error.message : 'Could not update notifications. Please retry.'); }
    finally { setBusy(false); }
  }

  if (!config) return null;
  return <section aria-label="Appointment notifications" className="mb-5 rounded-2xl border border-teal-100 bg-white p-4 text-sm text-slate-700">
    <div className="flex flex-wrap items-center justify-between gap-3">
      <div><p className="font-bold text-teal-900">Appointment notifications</p><p className="mt-1 text-xs">Get updates and reminders on this device. Email updates will continue.</p></div>
      {support === 'supported' && <button type="button" onClick={toggle} disabled={busy} className="rounded-xl border border-teal-200 px-4 py-2 font-semibold text-teal-800 disabled:opacity-50">
        {busy ? 'Updating…' : enabled ? 'Disable notifications' : 'Enable notifications'}
      </button>}
    </div>
    {support === 'install' && <p className="mt-2 text-xs">On iPhone or iPad (iOS 16.4+), use Share → Add to Home Screen, then open HomeDigo from that icon to enable notifications.</p>}
    {support === 'unsupported' && <p className="mt-2 text-xs">This browser does not support push notifications. Your email updates will continue.</p>}
    {message && <p role="status" className="mt-2 text-xs">{message}</p>}
    {notice && <div role="status" className="mt-3 rounded-xl bg-teal-50 p-3">
      <p className="font-bold">{notice.title}</p><p>{notice.body}</p>
      <a href={notice.path} className="mt-2 inline-block font-bold underline">View appointment</a>
      <button type="button" onClick={() => setNotice(null)} className="ml-4 text-xs underline">Dismiss</button>
    </div>}
  </section>;
}
