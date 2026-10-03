'use client';

import React from 'react';
import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { useSession, signOut } from 'next-auth/react';
import {
  Sparkles,
  ShieldAlert,
  Users,
  UserCheck,
  CreditCard,
  Sliders,
  ChevronRight,
  ExternalLink,
  LogOut,
  Building,
  TrendingUp,
  Activity,
  Layers,
  Lock
} from 'lucide-react';
import Logo from '@/components/shared/Logo';

const superAdminNavItems = [
  { href: '/super-admin/dashboard', label: 'Executive Cockpit', icon: Activity },
  { href: '/super-admin/admins', label: 'Admin Provisioning', icon: ShieldAlert },
  { href: '/super-admin/specialities', label: 'Doctor Specialities (CRUD)', icon: Sparkles },
  { href: '/super-admin/partners', label: 'Partner Governance', icon: UserCheck },
  { href: '/super-admin/billing', label: 'Platform Billing & Payouts', icon: CreditCard },
];

export default function SuperAdminLayout({ children }: { children: React.ReactNode }) {
  const pathname = usePathname();
  const { data: session } = useSession();

  const isLoginPage = pathname === '/super-admin/login';

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
            <Logo size="md" href="/super-admin/dashboard" showBadge="Super Admin" />
          </div>

          {/* Navigation links */}
          <nav className="p-4 space-y-1.5">
            <div className="px-3 py-2 text-[10px] font-extrabold uppercase tracking-wider text-slate-400">
              System Governance
            </div>
            {superAdminNavItems.map((item) => {
              const Icon = item.icon;
              const isActive = pathname === item.href;
              return (
                <Link
                  key={item.href}
                  href={item.href}
                  className={`flex items-center justify-between px-3.5 py-3 rounded-2xl text-xs font-bold transition-all ${
                    isActive
                      ? 'bg-gradient-to-r from-purple-600 to-indigo-600 text-white shadow-md shadow-indigo-600/20'
                      : 'text-slate-600 hover:bg-slate-50 hover:text-slate-900'
                  }`}
                >
                  <div className="flex items-center gap-3">
                    <Icon className={`w-4 h-4 ${isActive ? 'text-white' : 'text-slate-500'}`} />
                    <span>{item.label}</span>
                  </div>
                  {isActive && <ChevronRight className="w-4 h-4 text-white" />}
                </Link>
              );
            })}
          </nav>

          {/* Quick Multi-Portal Switcher */}
          <div className="p-4 mx-4 my-2 rounded-2xl bg-slate-50 border border-slate-200/80">
            <div className="text-xs font-bold text-slate-800 mb-2.5 flex items-center gap-1.5">
              <Layers className="w-3.5 h-3.5 text-indigo-600" />
              <span>Cross-Portal Switcher</span>
            </div>
            <div className="space-y-2 text-xs font-semibold">
              <Link
                href="/admin/dashboard"
                className="flex items-center justify-between p-2 rounded-xl bg-white hover:bg-slate-100 text-amber-800 border border-slate-200 shadow-2xs transition-all"
              >
                <span>Admin Portal</span>
                <ExternalLink className="w-3.5 h-3.5 text-amber-600" />
              </Link>
              <Link
                href="/partner/dashboard"
                className="flex items-center justify-between p-2 rounded-xl bg-white hover:bg-slate-100 text-teal-800 border border-slate-200 shadow-2xs transition-all"
              >
                <span>Partner Portal</span>
                <ExternalLink className="w-3.5 h-3.5 text-teal-600" />
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

        {/* User Footer */}
        <div className="p-4 border-t border-slate-100 flex items-center justify-between bg-slate-50/70">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-2xl bg-purple-100 text-purple-800 font-black text-sm flex items-center justify-center shadow-xs">
              SA
            </div>
            <div className="text-xs">
              <p className="font-bold text-slate-900">{session?.user?.name || 'Super Administrator'}</p>
              <p className="text-slate-500 text-[11px] truncate max-w-[130px]">{session?.user?.email || 'superadmin@homedigo.care'}</p>
            </div>
          </div>
          <button
            onClick={() => signOut({ callbackUrl: '/super-admin/login' })}
            title="Sign Out Super Admin"
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
