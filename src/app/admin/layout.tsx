'use client';

import React from 'react';
import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { useSession, signOut } from 'next-auth/react';
import {
  ShieldAlert,
  Activity,
  Layers,
  UserCheck,
  Radio,
  Sliders,
  LogOut,
  ChevronRight,
  ExternalLink,
  DollarSign,
  Sparkles
} from 'lucide-react';
import Logo from '@/components/shared/Logo';

const adminNavItems = [
  { href: '/admin/dashboard', label: 'Admin Cockpit', icon: Activity },
  { href: '/admin/specialities', label: 'Doctor Specialities (CRUD)', icon: Sparkles },
  { href: '/admin/services', label: 'Services & Dynamic Pricing', icon: DollarSign },
  { href: '/admin/partners', label: 'Doctor & Partner KYC Desk', icon: UserCheck },
  { href: '/admin/dispatch', label: 'Live Dispatch & Reassignment', icon: Radio },
];

export default function AdminLayout({ children }: { children: React.ReactNode }) {
  const pathname = usePathname();
  const { data: session } = useSession();

  const isLoginPage = pathname === '/admin/login';

  if (isLoginPage) {
    return <>{children}</>;
  }

  return (
    <div className="min-h-screen bg-[#f8fafc] text-slate-900 flex flex-col md:flex-row">
      {/* Sidebar */}
      <aside className="w-full md:w-72 bg-white border-r border-slate-200/90 flex flex-col justify-between shrink-0 shadow-sm">
        <div>
          {/* Brand header */}
          <div className="p-6 border-b border-slate-100 flex items-center justify-between">
            <Logo size="md" href="/admin/dashboard" showBadge="Admin" />
          </div>

          {/* Navigation links */}
          <nav className="p-4 space-y-1.5">
            <div className="px-3 py-2 text-[10px] font-extrabold uppercase tracking-wider text-slate-400">
              Admin Portal
            </div>
            {adminNavItems.map((item) => {
              const Icon = item.icon;
              const isActive = pathname === item.href;
              return (
                <Link
                  key={item.href}
                  href={item.href}
                  className={`flex items-center justify-between px-3.5 py-3 rounded-2xl text-xs font-bold transition-all ${
                    isActive
                      ? 'bg-gradient-to-r from-amber-500 to-amber-600 text-slate-950 shadow-md shadow-amber-500/20'
                      : 'text-slate-600 hover:bg-slate-50 hover:text-slate-900'
                  }`}
                >
                  <div className="flex items-center gap-3">
                    <Icon className={`w-4 h-4 ${isActive ? 'text-slate-950 stroke-[2.5]' : 'text-slate-400'}`} />
                    <span>{item.label}</span>
                  </div>
                  {isActive && <ChevronRight className="w-4 h-4 text-slate-950" />}
                </Link>
              );
            })}
          </nav>

          {/* Quick Cross-Portal Switcher */}
          <div className="p-4 mx-4 my-2 rounded-2xl bg-slate-50 border border-slate-200/80">
            <div className="text-xs font-bold text-slate-800 mb-2.5 flex items-center gap-1.5">
              <Layers className="w-3.5 h-3.5 text-amber-600" />
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
                href="/patient/dashboard"
                className="flex items-center justify-between p-2 rounded-xl bg-white hover:bg-slate-100 text-teal-800 border border-slate-200 shadow-2xs transition-all"
              >
                <span>Patient Web Portal</span>
                <ExternalLink className="w-3.5 h-3.5 text-teal-600" />
              </Link>
              <Link
                href="/partner/dashboard"
                className="flex items-center justify-between p-2 rounded-xl bg-white hover:bg-slate-100 text-teal-800 border border-slate-200 shadow-2xs transition-all"
              >
                <span>Partner Clinician Portal</span>
                <ExternalLink className="w-3.5 h-3.5 text-teal-600" />
              </Link>
            </div>
          </div>
        </div>

        {/* User Footer */}
        <div className="p-4 border-t border-slate-100 flex items-center justify-between bg-slate-50/70">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-2xl bg-amber-100 text-amber-900 font-black text-sm flex items-center justify-center shadow-xs">
              AD
            </div>
            <div className="text-xs">
              <p className="font-bold text-slate-900">{session?.user?.name || 'Operations Admin'}</p>
              <p className="text-slate-500 text-[11px] truncate max-w-[130px]">{session?.user?.email || 'admin@homedigo.care'}</p>
            </div>
          </div>
          <button
            onClick={() => signOut({ callbackUrl: '/admin/login' })}
            title="Sign Out Admin"
            className="p-2 rounded-xl hover:bg-rose-50 text-slate-400 hover:text-rose-600 transition-colors"
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
