'use client';

import React, { useState } from 'react';
import Link from 'next/link';
import { 
  Heart, 
  ShieldCheck, 
  PhoneCall, 
  Mail, 
  MapPin, 
  ExternalLink
} from 'lucide-react';
import Logo from '@/components/shared/Logo';
import AuthModal from '@/components/auth/AuthModal';

export default function Footer() {
  const [isAuthOpen, setIsAuthOpen] = useState(false);
  const [authRole, setAuthRole] = useState<'PATIENT' | 'PARTNER' | 'ADMIN'>('PATIENT');

  const openAuth = (role: 'PATIENT' | 'PARTNER' | 'ADMIN') => {
    setAuthRole(role);
    setIsAuthOpen(true);
  };

  return (
    <footer className="bg-slate-950 text-slate-400 pt-16 pb-12 border-t border-slate-900 relative">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        
        {/* Top 4-Column Grid */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-5 gap-10 pb-12 border-b border-slate-900">
          
          {/* Col 1: Brand & Mission */}
          <div className="lg:col-span-2 space-y-4">
            <div className="p-2 bg-white rounded-2xl inline-block">
              <Logo size="md" href="/" />
            </div>
            
            <p className="text-xs sm:text-sm text-slate-400 leading-relaxed max-w-sm">
              Connecting patients with verified doctors, nurses, and clinical care specialists for reliable, hospital-grade healthcare at home.
            </p>

            <div className="pt-2 flex items-center gap-3 text-xs text-slate-400">
              <div className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-slate-900 border border-slate-800 text-slate-300 font-semibold text-[11px]">
                <ShieldCheck className="w-3.5 h-3.5 text-emerald-400" />
                <span>256-Bit SSL Encrypted</span>
              </div>
              <div className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-slate-900 border border-slate-800 text-slate-300 font-semibold text-[11px]">
                <ShieldCheck className="w-3.5 h-3.5 text-blue-400" />
                <span>100% Verified Caregivers</span>
              </div>
            </div>
          </div>

          {/* Col 2: Services */}
          <div className="space-y-3">
            <h4 className="text-xs font-black uppercase tracking-wider text-slate-200">
              Clinical Services
            </h4>
            <ul className="space-y-2 text-xs">
              <li><a href="#services" className="hover:text-blue-400 transition-colors">Doctor Home Visits</a></li>
              <li><a href="#services" className="hover:text-blue-400 transition-colors">Home Nursing Care</a></li>
              <li><a href="#services" className="hover:text-blue-400 transition-colors">Wound Dressing & Ulcer Care</a></li>
              <li><a href="#services" className="hover:text-blue-400 transition-colors">Physiotherapy & Rehab</a></li>
              <li><a href="#services" className="hover:text-blue-400 transition-colors">Diagnostic Lab Tests</a></li>
              <li><a href="#services" className="hover:text-blue-400 transition-colors">Emergency Ambulance</a></li>
            </ul>
          </div>

          {/* Col 3: Dedicated Portals */}
          <div className="space-y-3">
            <h4 className="text-xs font-black uppercase tracking-wider text-slate-200">
              Role Portals
            </h4>
            <ul className="space-y-2 text-xs">
              <li>
                <button onClick={() => openAuth('PATIENT')} className="hover:text-blue-400 transition-colors text-left">
                  Patient & Family Portal
                </button>
              </li>
              <li>
                <button onClick={() => openAuth('PARTNER')} className="hover:text-teal-400 transition-colors text-left">
                  Healthcare Partner Portal
                </button>
              </li>
              <li>
                <button onClick={() => openAuth('ADMIN')} className="hover:text-indigo-400 transition-colors text-left">
                  Admin & Operations Desk
                </button>
              </li>
              <li>
                <a href="#governance" className="hover:text-blue-400 transition-colors">
                  11-Step No-Show Rules
                </a>
              </li>
            </ul>
          </div>

          {/* Col 4: Contact & Helpline */}
          <div className="space-y-3">
            <h4 className="text-xs font-black uppercase tracking-wider text-slate-200">
              24/7 Helpline
            </h4>
            <div className="space-y-2 text-xs">
              <a href="tel:18001234567" className="flex items-center gap-2 text-white font-bold hover:text-teal-400 transition-colors">
                <PhoneCall className="w-3.5 h-3.5 text-teal-400" />
                <span>1800-123-4567</span>
              </a>
              <div className="flex items-center gap-2 text-slate-400">
                <Mail className="w-3.5 h-3.5 text-blue-400" />
                <span>care@homedigo.com</span>
              </div>
              <div className="flex items-center gap-2 text-slate-400">
                <MapPin className="w-3.5 h-3.5 text-rose-400" />
                <span>Bengaluru, Karnataka, India</span>
              </div>
            </div>
          </div>

        </div>

        {/* Bottom Copyright & Compliance */}
        <div className="pt-8 flex flex-col sm:flex-row items-center justify-between gap-4 text-[11px] text-slate-400">
          <p>© {new Date().getFullYear()} HomeDigo Care Technologies Inc. All rights reserved.</p>
          <div className="flex items-center gap-6">
            <span>Privacy Policy</span>
            <span>Terms of Service</span>
            <span>Clinical Ethics & Safety</span>
          </div>
        </div>

      </div>

      <AuthModal
        isOpen={isAuthOpen}
        onClose={() => setIsAuthOpen(false)}
        defaultRole={authRole}
      />
    </footer>
  );
}
