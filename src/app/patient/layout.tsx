'use client';

import React, { useState } from 'react';
import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { useSession, signOut } from 'next-auth/react';
import { 
  Heart, 
  LayoutDashboard, 
  PlusCircle, 
  Calendar, 
  Users, 
  MapPin, 
  FileText, 
  User, 
  LogOut, 
  ShieldCheck, 
  Menu, 
  X,
  Sparkles,
  PhoneCall,
  LogIn
} from 'lucide-react';
import AuthModal from '@/components/auth/AuthModal';
import Logo from '@/components/shared/Logo';

export default function PatientLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const pathname = usePathname();
  const { data: session } = useSession();
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  const [isAuthOpen, setIsAuthOpen] = useState(false);

  const navItems = [
    { href: '/patient/dashboard', label: 'Dashboard', icon: LayoutDashboard },
    { href: '/patient/book', label: 'Book a Service', icon: PlusCircle, badge: 'New' },
    { href: '/patient/appointments', label: 'My Appointments', icon: Calendar },
    { href: '/patient/family', label: 'Family Profiles', icon: Users },
    { href: '/patient/addresses', label: 'Saved Addresses', icon: MapPin },
    { href: '/patient/invoices', label: 'Invoices & Receipts', icon: FileText },
  ];

  const handleSignOut = () => {
    signOut({ callbackUrl: '/' });
  };

  // Authentication has its own full-page layout, without patient portal chrome.
  if (pathname === '/patient/login') return <>{children}</>;

  return (
    <div className="min-h-screen bg-[#f8fafc] flex flex-col lg:flex-row">
      {/* Mobile Top Header */}
      <div className="lg:hidden bg-white border-b border-slate-200 px-4 py-3 flex items-center justify-between sticky top-0 z-30">
        <Logo size="sm" href="/" showBadge="Patient" />

        <div className="flex items-center gap-2">
          <button
            onClick={() => setMobileMenuOpen(!mobileMenuOpen)}
            className="p-2 rounded-xl bg-slate-100 text-slate-700"
          >
            {mobileMenuOpen ? <X className="w-5 h-5" /> : <Menu className="w-5 h-5" />}
          </button>
        </div>
      </div>

      {/* Sidebar Navigation */}
      <aside className={`
        fixed inset-y-0 left-0 z-40 w-64 bg-white border-r border-slate-200/90 flex flex-col justify-between transition-transform duration-300
        ${mobileMenuOpen ? 'translate-x-0' : '-translate-x-full lg:translate-x-0'}
        lg:static lg:h-screen lg:sticky lg:top-0
      `}>
        {/* Brand Section */}
        <div>
          <div className="p-6 border-b border-slate-100 flex items-center justify-between">
            <Logo size="md" href="/patient/dashboard" showBadge="Patient" />
          </div>

          {/* Navigation Links */}
          <nav className="p-4 space-y-1.5">
            {navItems.map((item) => {
              const Icon = item.icon;
              const isActive = pathname === item.href || (item.href !== '/patient/dashboard' && pathname.startsWith(item.href));
              return (
                <Link
                  key={item.href}
                  href={item.href}
                  onClick={() => setMobileMenuOpen(false)}
                  className={`flex items-center justify-between px-3.5 py-3 rounded-2xl text-xs font-bold transition-all ${
                    isActive
                      ? 'bg-teal-700 text-white shadow-md shadow-teal-700/20'
                      : 'text-slate-600 hover:bg-slate-100 hover:text-slate-900'
                  }`}
                >
                  <div className="flex items-center gap-3">
                    <Icon className="w-4 h-4" />
                    <span>{item.label}</span>
                  </div>
                  {item.badge && (
                    <span className={`text-[10px] px-2 py-0.5 rounded-full font-extrabold ${isActive ? 'bg-white/20 text-white' : 'bg-teal-50 text-teal-700'}`}>
                      {item.badge}
                    </span>
                  )}
                </Link>
              );
            })}
          </nav>
        </div>

        {/* User Card & Authentication */}
        <div className="p-4 border-t border-slate-100 space-y-3">
          {session ? (
            <>
              <div className="flex items-center gap-3 p-2.5 rounded-2xl bg-slate-50 border border-slate-100">
                <img
                  src={session.user?.image || 'https://images.unsplash.com/photo-1534528741775-53994a69daeb?auto=format&fit=crop&w=128&q=80'}
                  alt="User"
                  className="w-10 h-10 rounded-xl object-cover ring-1 ring-teal-500/20"
                />
                <div className="flex-1 min-w-0">
                  <p className="text-xs font-bold text-slate-900 truncate">
                    {session.user?.name || 'Patient Account'}
                  </p>
                  <p className="text-[10px] text-slate-500 truncate">
                    {session.user?.email}
                  </p>
                </div>
              </div>

              <div className="flex gap-2">
                <button
                  onClick={() => setIsAuthOpen(true)}
                  className="flex-1 py-2 px-3 rounded-xl border border-slate-200 hover:bg-slate-100 text-slate-700 text-xs font-bold transition-colors"
                >
                  Switch Role
                </button>
                <button
                  onClick={handleSignOut}
                  className="p-2 rounded-xl border border-rose-100 text-rose-500 hover:bg-rose-50 transition-colors"
                  title="Sign Out"
                >
                  <LogOut className="w-4 h-4" />
                </button>
              </div>
            </>
          ) : (
            <div className="p-3 rounded-2xl bg-slate-50 border border-slate-100 space-y-2.5 text-center">
              <div className="text-xs font-bold text-slate-800">Guest Visitor</div>
              <p className="text-[10px] text-slate-500">Sign in to save medical profiles & track bookings</p>
              <button
                onClick={() => setIsAuthOpen(true)}
                className="w-full py-2 px-3 rounded-xl bg-teal-700 hover:bg-teal-800 text-white font-bold text-xs flex items-center justify-center gap-1.5 shadow-sm transition-all"
              >
                <LogIn className="w-3.5 h-3.5" />
                <span>Sign In / Sign Up</span>
              </button>
            </div>
          )}
        </div>
      </aside>

      {/* Main Content Area */}
      <div className="flex-1 flex flex-col min-w-0">
        {/* Top Desktop Bar */}
        <header className="hidden lg:flex items-center justify-between px-8 py-4 bg-white/80 backdrop-blur-md border-b border-slate-200/80 sticky top-0 z-20">
          <div className="flex items-center gap-3">
            <span className="text-xs font-bold text-slate-500 uppercase tracking-wider">
              Connected Healthcare Portal
            </span>
            <span className="w-1 h-1 rounded-full bg-slate-300"></span>
            <div className="flex items-center gap-1.5 text-xs font-bold text-emerald-700 bg-emerald-50 px-2.5 py-0.5 rounded-full border border-emerald-200">
              <ShieldCheck className="w-3.5 h-3.5 text-emerald-600" />
              <span>Verified Home Healthcare</span>
            </div>
          </div>

          <div className="flex items-center gap-4">
            <Link
              href="/patient/book"
              className="flex items-center gap-2 px-3.5 py-1.5 rounded-xl bg-teal-50 hover:bg-teal-100 text-teal-800 text-xs font-bold transition-all border border-teal-200/80"
            >
              <PlusCircle className="w-3.5 h-3.5 text-teal-700" />
              <span>Book Doorstep Visit</span>
            </Link>

            <a
              href="tel:+917695964741"
              className="flex items-center gap-1.5 text-xs font-bold text-slate-700 hover:text-teal-700 transition-colors"
            >
              <PhoneCall className="w-3.5 h-3.5 text-teal-700" />
              <span>Emergency Help Desk</span>
            </a>
          </div>
        </header>

        {/* Page Inner Content */}
        <main className="flex-1 p-4 sm:p-6 lg:p-8 max-w-7xl w-full mx-auto">
          {children}
        </main>
      </div>

      <AuthModal
        isOpen={isAuthOpen}
        onClose={() => setIsAuthOpen(false)}
        defaultRole="PATIENT"
      />
    </div>
  );
}
