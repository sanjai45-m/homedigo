'use client';

export type StaffPortal = 'admin' | 'super-admin' | 'partner';
export const staffSessionEvent = 'homedigo:staff-session';
const prefix = 'homedigo.staff.';

export function staffPortal(pathname: string): StaffPortal | null {
  const segment = pathname.split('/')[1];
  return segment === 'admin' || segment === 'super-admin' || segment === 'partner' ? segment : null;
}

export function readStaffToken(portal: StaffPortal): string | null {
  try { return sessionStorage.getItem(prefix + portal); } catch { return null; }
}

export function storeStaffToken(portal: StaffPortal, token: string | null) {
  if (token) sessionStorage.setItem(prefix + portal, token);
  else sessionStorage.removeItem(prefix + portal);
  // This event stays inside the current tab; never broadcast login/logout to other tabs.
  window.dispatchEvent(new Event(staffSessionEvent));
}

/** Send this tab's credential only to this application's APIs. */
export async function staffFetch(input: string, init: RequestInit = {}) {
  const url = new URL(input, window.location.origin);
  if (url.origin !== window.location.origin || !url.pathname.startsWith('/api/')) {
    throw new Error('Staff requests must use a same-origin API.');
  }
  const portal = staffPortal(window.location.pathname);
  const token = portal ? readStaffToken(portal) : null;
  const headers = new Headers(init.headers);
  if (token) headers.set('Authorization', `Bearer ${token}`);
  const response = await fetch(url.href, { ...init, headers, credentials: 'omit', cache: 'no-store', redirect: 'error' });
  if (response.status === 401 && portal && token && readStaffToken(portal) === token) {
    storeStaffToken(portal, null);
  }
  return response;
}
