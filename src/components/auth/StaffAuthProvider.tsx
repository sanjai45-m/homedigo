'use client';

import React, { createContext, useCallback, useContext, useEffect, useRef, useState } from 'react';
import { usePathname, useRouter } from 'next/navigation';
import type { Session } from 'next-auth';
import { readStaffToken, staffPortal, staffSessionEvent, storeStaffToken, type StaffPortal } from '@/lib/staff-client';

type StaffSession = Session & { user: NonNullable<Session['user']> & { id: string; role: string } };
type SessionState = { data: StaffSession | null; status: 'loading' | 'authenticated' | 'unauthenticated' };
const StaffContext = createContext<SessionState>({ data: null, status: 'loading' });

export function useSession() { return useContext(StaffContext); }

export async function signIn(_provider: string, options: { email: string; password: string; expectedRole: string; redirect?: boolean }) {
  const portal = staffPortal(window.location.pathname);
  if (!portal) throw new Error('Open a staff portal to sign in.');
  const response = await fetch('/api/auth/staff', {
    method: 'POST', credentials: 'omit', headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(options),
  });
  const result = await response.json();
  if (response.ok) storeStaffToken(portal, result.token);
  return { ok: response.ok, error: result.error, status: response.status };
}

export async function signOut({ callbackUrl }: { callbackUrl: string }) {
  const portal = staffPortal(window.location.pathname);
  if (portal) storeStaffToken(portal, null);
  window.location.assign(callbackUrl);
}

export default function StaffAuthProvider({ children, portal }: { children: React.ReactNode; portal: StaffPortal }) {
  const pathname = usePathname();
  const router = useRouter();
  const [state, setState] = useState<SessionState>({ data: null, status: 'loading' });
  const generation = useRef({ value: 0 });
  const refresh = useCallback(async () => {
    const current = ++generation.current.value;
    const token = readStaffToken(portal);
    if (!token) { setState({ data: null, status: 'unauthenticated' }); return; }
    try {
      const response = await fetch('/api/auth/staff', {
        headers: { Authorization: `Bearer ${token}` }, credentials: 'omit', cache: 'no-store',
      });
      const data = await response.json();
      if (current !== generation.current.value) return;
      if (!response.ok) {
        if (response.status === 401) storeStaffToken(portal, null);
        setState({ data: null, status: 'unauthenticated' });
        return;
      }
      const allowed = portal === 'admin' ? ['ADMIN', 'SUPER_ADMIN'] : [portal === 'partner' ? 'PARTNER' : 'SUPER_ADMIN'];
      if (!allowed.includes(data.user?.role)) {
        storeStaffToken(portal, null);
        setState({ data: null, status: 'unauthenticated' });
        return;
      }
      setState({ data, status: 'authenticated' });
    } catch {
      if (current === generation.current.value) setState({ data: null, status: 'unauthenticated' });
    }
  }, [portal]);

  useEffect(() => {
    const pending = generation.current;
    let active = true;
    queueMicrotask(() => { if (active) void refresh(); });
    const onFocus = () => { void refresh(); };
    const onSessionChange = () => {
      setState({ data: null, status: 'loading' });
      void refresh();
    };
    window.addEventListener(staffSessionEvent, onSessionChange);
    window.addEventListener('focus', onFocus);
    return () => {
      active = false;
      ++pending.value;
      window.removeEventListener(staffSessionEvent, onSessionChange);
      window.removeEventListener('focus', onFocus);
    };
  }, [refresh]);

  useEffect(() => {
    if (!state.data) return;
    const timer = window.setTimeout(() => storeStaffToken(portal, null), Math.max(0, Date.parse(state.data.expires) - Date.now()));
    return () => window.clearTimeout(timer);
  }, [portal, state.data]);

  const isLogin = pathname === `/${portal}/login`;
  useEffect(() => {
    if (!isLogin && state.status === 'unauthenticated') {
      router.replace(`/${portal}/login?callbackUrl=${encodeURIComponent(pathname)}`);
    }
  }, [isLogin, pathname, portal, router, state.status]);

  return <StaffContext.Provider value={state}>
    {isLogin || state.status === 'authenticated' ? children : <div role="status" className="p-8 text-center">Checking your session…</div>}
  </StaffContext.Provider>;
}
