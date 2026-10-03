'use client';

import React, { useState } from 'react';
import Link from 'next/link';
import { useSession, signOut } from 'next-auth/react';
import { 
  Heart, 
  ShieldCheck, 
  User, 
  ChevronDown, 
  PhoneCall, 
  LogOut,
  ArrowRight,
  Check
} from 'lucide-react';
import AuthModal from '@/components/auth/AuthModal';
import Logo from '@/components/shared/Logo';

export default function Navbar() {
  const { data: session } = useSession();
  const [isAuthModalOpen, setIsAuthModalOpen] = useState(false);
  const [authRole, setAuthRole] = useState<'PATIENT' | 'PARTNER' | 'ADMIN'>('PATIENT');
  const [userDropdownOpen, setUserDropdownOpen] = useState(false);

  const openAuth = (role: 'PATIENT' | 'PARTNER' | 'ADMIN' = 'PATIENT') => {
    setAuthRole(role);
    setIsAuthModalOpen(true);
  };

  const userRole = (session?.user as any)?.role || 'PATIENT';

  return (
    <>
      <header className="sticky top-0 z-40 w-full transition-all">
        {/* Top Info Bar */}
        <div className="bg-[#0f172a] text-slate-300 text-xs py-2 px-4 sm:px-8 border-b border-slate-800">
          <div className="max-w-7xl mx-auto flex items-center justify-between">
            <div className="flex items-center gap-2">
              <span className="inline-flex items-center justify-center w-4 h-4 rounded-full bg-emerald-500/20 text-emerald-400">
                <Check className="w-2.5 h-2.5 stroke-[3]" />
              </span>
              <span className="font-semibold text-slate-200">
                Trusted healthcare partner in at-home clinical excellence
              </span>
            </div>

            <div className="flex items-center gap-5 text-[11px] font-semibold">
              <div className="hidden md:flex items-center gap-1.5 text-slate-300">
                <ShieldCheck className="w-3.5 h-3.5 text-emerald-400" />
                <span>Verified Clinical Care · Bengaluru</span>
              </div>
              <a href="tel:+917695964741" className="flex items-center gap-1.5 text-white hover:text-blue-300 transition-colors">
                <PhoneCall className="w-3 h-3 text-blue-400" />
                <span>+91 76959 64741</span>
              </a>
            </div>
          </div>
        </div>

        {/* Main Navbar */}
        <div className="bg-white/95 backdrop-blur-xl border-b border-slate-200/80">
          <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 h-20 flex items-center justify-between">
            
            {/* Brand Logo */}
            <Logo size="md" href="/" />

            {/* Nav Links */}
            <nav className="hidden lg:flex items-center gap-8 text-sm font-bold text-slate-700">
              <a href="#specialities" className="hover:text-blue-600 transition-colors flex items-center gap-1.5">
                <span className="w-2 h-2 rounded-full bg-teal-500 animate-pulse" />
                Find Doctors
              </a>
              <a href="#services" className="hover:text-blue-600 transition-colors">
                Services
              </a>
              <a href="#how-it-works" className="hover:text-blue-600 transition-colors">
                How It Works
              </a>
              <a href="#portals" className="hover:text-blue-600 transition-colors">
                Portals
              </a>
              <a href="#governance" className="hover:text-blue-600 transition-colors">
                No-Show Rules
              </a>
              <a href="#trust" className="hover:text-blue-600 transition-colors">
                Clinicians
              </a>
            </nav>

            {/* Action Buttons */}
            <div className="flex items-center gap-3">
              {session ? (
                /* User Dropdown */
                <div className="relative">
                  <button
                    onClick={() => setUserDropdownOpen(!userDropdownOpen)}
                    className="flex items-center gap-2.5 p-1.5 pr-3 rounded-2xl bg-slate-50 hover:bg-slate-100 border border-slate-200 transition-all"
                  >
                    <img
                      src={session.user?.image || 'https://images.unsplash.com/photo-1534528741775-53994a69daeb?auto=format&fit=crop&w=128&q=80'}
                      alt={session.user?.name || 'User'}
                      className="w-8 h-8 rounded-xl object-cover ring-1 ring-blue-500/30"
                    />
                    <div className="text-left hidden sm:block">
                      <p className="text-xs font-bold text-slate-900 line-clamp-1">{session.user?.name}</p>
                      <p className="text-[10px] font-bold text-blue-600 uppercase tracking-wider">{userRole}</p>
                    </div>
                    <ChevronDown className="w-4 h-4 text-slate-400" />
                  </button>

                  {userDropdownOpen && (
                    <div className="absolute right-0 mt-2 w-56 bg-white rounded-2xl shadow-xl border border-slate-100 p-2 z-50 animate-in fade-in duration-150">
                      <div className="px-3 py-2 border-b border-slate-100 mb-1">
                        <p className="text-xs font-bold text-slate-900">{session.user?.name}</p>
                        <p className="text-[11px] text-slate-500 truncate">{session.user?.email}</p>
                      </div>

                      <button
                        onClick={() => {
                          setUserDropdownOpen(false);
                          openAuth();
                        }}
                        className="w-full flex items-center gap-2.5 px-3 py-2 rounded-xl text-xs font-bold text-slate-700 hover:bg-slate-50 transition-colors"
                      >
                        <User className="w-4 h-4 text-blue-600" />
                        Account & Switch Role
                      </button>

                      <button
                        onClick={() => {
                          setUserDropdownOpen(false);
                          signOut({ callbackUrl: '/' });
                        }}
                        className="w-full flex items-center gap-2.5 px-3 py-2 rounded-xl text-xs font-bold text-red-600 hover:bg-red-50 transition-colors"
                      >
                        <LogOut className="w-4 h-4 text-red-500" />
                        Sign Out
                      </button>
                    </div>
                  )}
                </div>
              ) : (
                /* Guest Action Buttons with Double-Slide Animation */
                <div className="flex items-center gap-2.5">
                  <button
                    onClick={() => openAuth('PATIENT')}
                    className="hidden sm:inline-flex px-4 py-2.5 rounded-xl border border-slate-200 hover:border-slate-300 text-slate-700 font-bold text-xs transition-all hover:bg-slate-50"
                  >
                    Sign In
                  </button>

                  <button
                    onClick={() => openAuth('PATIENT')}
                    className="tj-primary-btn"
                  >
                    <span className="btn_inner">
                      <span className="btn_text font-bold text-xs">Book Care</span>
                      <span className="btn_icon">
                        <span>
                          <ArrowRight className="w-3.5 h-3.5" />
                          <ArrowRight className="w-3.5 h-3.5" />
                        </span>
                      </span>
                    </span>
                  </button>
                </div>
              )}
            </div>

          </div>
        </div>
      </header>

      <AuthModal
        isOpen={isAuthModalOpen}
        onClose={() => setIsAuthModalOpen(false)}
        defaultRole={authRole}
      />
    </>
  );
}
