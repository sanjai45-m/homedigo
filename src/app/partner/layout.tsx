'use client';

import React, { useState, useEffect } from 'react';
import Link from 'next/link';
import { usePathname, useRouter } from 'next/navigation';
import { useSession, signOut } from 'next-auth/react';
import {
  HeartPulse,
  Calendar,
  Navigation,
  DollarSign,
  User,
  ShieldCheck,
  Power,
  ChevronRight,
  ExternalLink,
  LogOut,
  Sparkles,
  Layers,
  Loader2
} from 'lucide-react';
import Logo from '@/components/shared/Logo';

const partnerNavItems = [
  { href: '/partner/dashboard', label: "Today's Field Queue", icon: Calendar },
  { href: '/partner/earnings', label: 'Earnings & Payout Ledger', icon: DollarSign },
];

export default function PartnerLayout({ children }: { children: React.ReactNode }) {
  const pathname = usePathname();
  const router = useRouter();
  const { data: session, status } = useSession();
  const [isOnline, setIsOnline] = useState<boolean | null>(null); // null = loading from DB
  const [togglingShift, setTogglingShift] = useState(false);
  const [partnerProfile, setPartnerProfile] = useState<any>(null);

  // Auth guard — redirect if not authenticated as PARTNER
  useEffect(() => {
    if (status === 'loading') return;
    const isLoginPage = pathname === '/partner/login';
    if (isLoginPage) return;
    if (status === 'unauthenticated') {
      router.replace('/partner/login');
      return;
    }
    const role = (session?.user as any)?.role;
    if (role && role !== 'PARTNER') {
      router.replace('/partner/login');
    }
  }, [status, session, pathname, router]);

  useEffect(() => {
    if (status !== 'authenticated') return;
    async function loadPartnerProfile() {
      try {
        // Load profile data
        const res = await fetch('/api/pro/dashboard');
        const data = await res.json();
        if (data.partner) {
          setPartnerProfile(data.partner);
        }
        // Load real availability from DB
        const avRes = await fetch('/api/pro/availability');
        const avData = await avRes.json();
        setIsOnline(avData.availability === 'AVAILABLE');
      } catch (e) {
        console.error('Failed to load partner profile:', e);
        setIsOnline(false);
      }
    }
    loadPartnerProfile();
  }, [status]);

  // Show loader while checking session (except on login page)
  if (status === 'loading' && pathname !== '/partner/login') {
    return (
      <div className="min-h-screen bg-[#f8fafc] flex items-center justify-center">
        <Loader2 className="w-8 h-8 text-teal-600 animate-spin" />
      </div>
    );
  }

  const toggleShift = async () => {
    if (togglingShift || isOnline === null) return;
    const nextState = !isOnline;
    setTogglingShift(true);
    try {
      const res = await fetch('/api/pro/availability', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          availability: nextState ? 'AVAILABLE' : 'OFFLINE',
        }),
      });
      const data = await res.json();
      if (data.success) {
        // Only update UI after DB confirms
        setIsOnline(data.availability === 'AVAILABLE');
      } else {
        console.error('Availability update failed:', data.error);
      }
    } catch (e) {
      console.error('Failed to toggle shift:', e);
    } finally {
      setTogglingShift(false);
    }
  };

  // On the login page — render NO sidebar, just the login UI
  if (pathname === '/partner/login') {
    return <>{children}</>;
  }

  return (
    <div className="min-h-screen bg-[#f8fafc] text-slate-900 flex flex-col md:flex-row">
      {/* Sidebar */}

      <aside className="w-full md:w-72 bg-white border-r border-slate-200/90 flex flex-col justify-between shrink-0 shadow-sm">
        <div>
          {/* Brand header */}
          <div className="p-6 border-b border-slate-100 flex items-center justify-between">
            <Logo size="md" href="/partner/dashboard" showBadge="Clinician" />
          </div>

          {/* Clinician On-Duty Switch */}
          <div className="p-4 mx-4 my-3 rounded-2xl bg-slate-50 border border-slate-200/80">
            <div className="flex items-center justify-between mb-2">
              <div className="text-xs font-bold text-slate-800 flex items-center gap-1.5">
                <Power className={`w-3.5 h-3.5 ${
                  isOnline === null ? 'text-slate-300' :
                  isOnline ? 'text-emerald-600' : 'text-slate-400'
                }`} />
                <span>Duty Shift Status</span>
              </div>
              <span className={`text-[10px] font-extrabold px-2 py-0.5 rounded-full ${
                isOnline === null
                  ? 'bg-slate-100 text-slate-400'
                  : isOnline
                  ? 'bg-emerald-100 text-emerald-800 border border-emerald-300'
                  : 'bg-slate-200 text-slate-600'
              }`}>
                {isOnline === null ? 'LOADING' : isOnline ? 'ON DUTY' : 'OFFLINE'}
              </span>
            </div>
            <button
              onClick={toggleShift}
              disabled={togglingShift || isOnline === null}
              className={`w-full py-2 rounded-xl text-xs font-bold transition-all shadow-xs flex items-center justify-center gap-1.5 disabled:opacity-60 disabled:cursor-not-allowed ${
                isOnline
                  ? 'bg-rose-50 hover:bg-rose-100 text-rose-700 border border-rose-200'
                  : 'bg-emerald-600 hover:bg-emerald-700 text-white shadow-emerald-600/20'
              }`}
            >
              {togglingShift && <Loader2 className="w-3 h-3 animate-spin" />}
              {isOnline === null ? 'Checking status...' : togglingShift ? 'Saving...' : isOnline ? 'Go Off-Duty' : 'Start Duty Shift'}
            </button>
          </div>

          {/* Navigation links */}
          <nav className="p-4 space-y-1.5">
            <div className="px-3 py-2 text-[10px] font-extrabold uppercase tracking-wider text-slate-400">
              Field Navigation
            </div>
            {partnerNavItems.map((item) => {
              const Icon = item.icon;
              const isActive = pathname === item.href;
              return (
                <Link
                  key={item.href}
                  href={item.href}
                  className={`flex items-center justify-between px-3.5 py-3 rounded-2xl text-xs font-bold transition-all ${
                    isActive
                      ? 'bg-gradient-to-r from-teal-700 to-emerald-600 text-white shadow-md shadow-teal-700/20'
                      : 'text-slate-600 hover:bg-slate-50 hover:text-slate-900'
                  }`}
                >
                  <div className="flex items-center gap-3">
                    <Icon className={`w-4 h-4 ${isActive ? 'text-white' : 'text-slate-400'}`} />
                    <span>{item.label}</span>
                  </div>
                  {isActive && <ChevronRight className="w-4 h-4 text-white" />}
                </Link>
              );
            })}
          </nav>

          {/* Quick Cross-Portal Switcher */}
          <div className="p-4 mx-4 my-2 rounded-2xl bg-slate-50 border border-slate-200/80">
            <div className="text-xs font-bold text-slate-800 mb-2.5 flex items-center gap-1.5">
              <Layers className="w-3.5 h-3.5 text-teal-600" />
              <span>Cross-Portal Switcher</span>
            </div>
            <div className="space-y-2 text-xs font-semibold">
              <Link
                href="/super-admin/dashboard"
                className="flex items-center justify-between p-2 rounded-xl bg-white hover:bg-slate-100 text-purple-800 border border-slate-200 shadow-2xs transition-all"
              >
                <span>Super Admin Panel</span>
                <ExternalLink className="w-3.5 h-3.5 text-purple-600" />
              </Link>
              <Link
                href="/admin/dashboard"
                className="flex items-center justify-between p-2 rounded-xl bg-white hover:bg-slate-100 text-amber-800 border border-slate-200 shadow-2xs transition-all"
              >
                <span>Admin Operations Desk</span>
                <ExternalLink className="w-3.5 h-3.5 text-amber-600" />
              </Link>
              <Link
                href="/patient/dashboard"
                className="flex items-center justify-between p-2 rounded-xl bg-white hover:bg-slate-100 text-blue-800 border border-slate-200 shadow-2xs transition-all"
              >
                <span>Patient Web Portal</span>
                <ExternalLink className="w-3.5 h-3.5 text-blue-600" />
              </Link>
            </div>
          </div>
        </div>

        {/* Doctor Identity Footer */}
        <div className="p-4 border-t border-slate-100 flex items-center justify-between bg-slate-50/70">
          <div className="flex items-center gap-3">
            <img
              src={
                partnerProfile?.image ||
                session?.user?.image ||
                'https://images.unsplash.com/photo-1612349317150-e413f6a5b16d?auto=format&fit=crop&w=256&q=80'
              }
              alt={partnerProfile?.name || session?.user?.name || 'Clinician'}
              className="w-10 h-10 rounded-2xl object-cover ring-2 ring-teal-500/20"
            />
            <div className="text-xs">
              <p className="font-bold text-slate-900">
                {partnerProfile?.name || session?.user?.name || 'On-Duty Clinician'}
              </p>
              <p className="text-slate-500 text-[11px] truncate max-w-[140px]">
                {partnerProfile?.specialization || session?.user?.email || 'Healthcare Partner'}
              </p>
            </div>
          </div>
          <button
            onClick={() => signOut({ callbackUrl: '/partner/login' })}
            title="Sign Out"
            className="p-2 rounded-xl hover:bg-rose-50 text-slate-500 hover:text-rose-600 transition-colors"
          >
            <LogOut className="w-4 h-4" />
          </button>
        </div>
      </aside>

      {/* Main Content Area */}
      <main className="flex-1 overflow-y-auto min-h-screen">
        {children}
      </main>
    </div>
  );
}
