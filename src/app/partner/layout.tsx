'use client';

import { staffFetch } from '@/lib/staff-client';

import React, { useState, useEffect } from 'react';
import { usePathname, useRouter } from 'next/navigation';
import { useSession, signOut } from '@/components/auth/StaffAuthProvider';
import { Loader2 } from 'lucide-react';
import PartnerWorkspace from '@/components/portals/PartnerWorkspace';
import FeedbackToast from '@/components/shared/FeedbackToast';
import styles from '@/components/portals/portal.module.css';

export default function PartnerLayout({ children }: { children: React.ReactNode }) {
  const pathname = usePathname();
  const router = useRouter();
  const { data: session, status } = useSession();
  const [isOnline, setIsOnline] = useState<boolean | null>(null); // null = loading from DB
  const [togglingShift, setTogglingShift] = useState(false);
  const [partnerProfile, setPartnerProfile] = useState<{ name?: string; specialization?: string } | null>(null);
  const [accessError, setAccessError] = useState('');
  const [shiftError, setShiftError] = useState('');

  // Auth guard — redirect if not authenticated as PARTNER
  useEffect(() => {
    if (status === 'loading') return;
    const isLoginPage = pathname === '/partner/login';
    if (isLoginPage) return;
    if (status === 'unauthenticated') {
      router.replace(`/partner/login?callbackUrl=${encodeURIComponent(pathname)}`);
      return;
    }
    const role = session?.user?.role;
    if (role && role !== 'PARTNER') {
      router.replace(`/partner/login?callbackUrl=${encodeURIComponent(pathname)}`);
    }
  }, [status, session, pathname, router]);

  useEffect(() => {
    if (status !== 'authenticated') return;
    async function loadPartnerProfile() {
      try {
        // Load profile data
        const res = await staffFetch('/api/pro/dashboard');
        const data = await res.json();
        if (!res.ok) {
          setAccessError(data.error || 'Unable to access your workspace. Please sign in again.');
          setIsOnline(false);
          return;
        }
        setAccessError('');
        if (data.partner) {
          setPartnerProfile(data.partner);
        }
        // Load real availability from DB
        const avRes = await staffFetch('/api/pro/availability');
        const avData = await avRes.json();
        if (!avRes.ok) throw new Error(avData.error || 'Could not load duty status. Refresh to try again.');
        setIsOnline(avData.availability === 'AVAILABLE');
      } catch (e) {
        setShiftError(e instanceof Error ? e.message : 'Could not load duty status. Refresh to try again.');
      }
    }
    loadPartnerProfile();
  }, [status]);

  // Show loader while checking session (except on login page)
  if (status === 'loading' && pathname !== '/partner/login') {
    return (
      <div className={`${styles.theme} min-h-screen flex items-center justify-center`} role="status" aria-label="Loading clinician workspace">
        <Loader2 className="w-8 h-8 text-teal-600 animate-spin" aria-hidden="true" />
      </div>
    );
  }

  const toggleShift = async () => {
    if (togglingShift || isOnline === null) return;
    const nextState = !isOnline;
    setTogglingShift(true);
    setShiftError('');
    try {
      const res = await staffFetch('/api/pro/availability', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          availability: nextState ? 'AVAILABLE' : 'OFFLINE',
        }),
      });
      const data = await res.json();
      if (res.ok && data.success) {
        // Only update UI after DB confirms
        setIsOnline(data.availability === 'AVAILABLE');
      } else {
        setShiftError(data.error || 'Could not change duty status. Please try again.');
      }
    } catch {
      setShiftError('Could not change duty status. Please try again.');
    } finally {
      setTogglingShift(false);
    }
  };

  // On the login page — render NO sidebar, just the login UI
  if (pathname === '/partner/login') {
    return <>{children}</>;
  }

  return <>
    <FeedbackToast message={shiftError} type="error" onDismiss={() => setShiftError('')} />
    <PartnerWorkspace userId={accessError ? undefined : session?.user?.id}
      name={partnerProfile?.name || session?.user?.name || 'Clinician'} specialization={partnerProfile?.specialization}
      online={isOnline} saving={togglingShift} onDutyChange={() => void toggleShift()}
      onSignOut={() => void signOut({ callbackUrl: '/partner/login' })}>
      {accessError ? <p role="alert" className="rounded-xl bg-amber-50 p-6 text-amber-900">{accessError}</p> : children}
    </PartnerWorkspace>
  </>;
}
