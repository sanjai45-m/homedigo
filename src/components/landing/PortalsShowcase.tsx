'use client';

import React, { useState } from 'react';
import { 
  User, 
  Stethoscope, 
  ShieldCheck, 
  ArrowRight, 
  CheckCircle, 
  Laptop, 
  Sparkles,
  Navigation,
  Activity,
  CheckCircle2,
  FileCheck,
  TrendingUp,
  UserCheck,
  Clock,
  MapPin,
  RefreshCw
} from 'lucide-react';
import AuthModal from '@/components/auth/AuthModal';

export default function PortalsShowcase() {
  const [activePortal, setActivePortal] = useState<'patient' | 'partner' | 'admin'>('patient');
  const [isAuthOpen, setIsAuthOpen] = useState(false);
  const [authRole, setAuthRole] = useState<'PATIENT' | 'PARTNER' | 'ADMIN'>('PATIENT');

  // Interactive state inside the portals preview
  const [patientDemoStep, setPatientDemoStep] = useState<'CONFIRMED' | 'ON_WAY' | 'COMPLETED'>('ON_WAY');
  const [partnerDemoState, setPartnerDemoState] = useState<'NEW_REQUEST' | 'ACCEPTED' | 'VITALS_RECORDED'>('ACCEPTED');
  const [adminKycApproved, setAdminKycApproved] = useState(false);

  const openPortalAuth = (role: 'PATIENT' | 'PARTNER' | 'ADMIN') => {
    setAuthRole(role);
    setIsAuthOpen(true);
  };

  const portals = [
    {
      id: 'patient' as const,
      name: 'Patient Web Portal',
      badge: 'Portal 2',
      tagline: 'Book. Pay. Track. Stay Informed.',
      role: 'PATIENT' as const,
      icon: User,
      color: 'from-blue-600 to-indigo-600',
      activeColor: 'bg-blue-600 text-white shadow-blue-500/25',
      description: 'Streamlined 6-step booking wizard with instant UPI payment, live ETA map tracking, and instant access to digital vitals and prescriptions.',
      highlights: [
        'Family Health Accounts (Manage Parents & Kids)',
        '1-Click UPI Payment Verification',
        'Live Visit Telemetry & Status Tracker',
        'Digital Vitals History & Invoices',
      ],
    },
    {
      id: 'partner' as const,
      name: 'Healthcare Partner Portal',
      badge: 'Portal 3',
      tagline: 'Manage Schedule. Serve Patients. Earn.',
      role: 'PARTNER' as const,
      icon: Stethoscope,
      color: 'from-teal-600 to-emerald-600',
      activeColor: 'bg-teal-600 text-white shadow-teal-500/25',
      description: 'Dedicated PWA portal for verified doctors, nurses, and specialists to manage availability, navigate to patient locations, and record clinical vitals.',
      highlights: [
        'Turn-by-Turn GPS Doorstep Navigation',
        'Geofenced Check-In & Visit Timer',
        'In-App Clinical Vitals Logger (BP, Sugar, SpO2)',
        'Daily Earnings Ledger & Instant Payouts',
      ],
    },
    {
      id: 'admin' as const,
      name: 'Admin & Operations Portal',
      badge: 'Portal 4',
      tagline: 'Oversee. Ensure Quality. Maintain Platform.',
      role: 'ADMIN' as const,
      icon: ShieldCheck,
      color: 'from-indigo-600 to-purple-600',
      activeColor: 'bg-indigo-600 text-white shadow-indigo-500/25',
      description: 'Mission control for operations teams to verify partner medical licenses, monitor active booking queues, manage pricing, and enforce quality governance.',
      highlights: [
        'KYC & Medical License Verification Desk',
        'Live Booking Dispatch & Manual Reassignment',
        '11-Step No-Show Review & Suspension Console',
        'UPI Financial Settlements & Refund Control',
      ],
    },
  ];

  const current = portals.find((p) => p.id === activePortal) || portals[0];

  return (
    <section id="portals" className="py-20 lg:py-28 bg-slate-900 text-white relative overflow-hidden">
      {/* Ambient glows */}
      <div className="absolute -top-40 right-0 w-96 h-96 bg-blue-500/10 rounded-full blur-3xl pointer-events-none"></div>
      <div className="absolute -bottom-40 left-0 w-96 h-96 bg-teal-500/10 rounded-full blur-3xl pointer-events-none"></div>

      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 relative">
        
        {/* Header */}
        <div className="text-center max-w-3xl mx-auto space-y-4 mb-14">
          <div className="inline-flex items-center gap-1.5 px-3.5 py-1 rounded-full bg-slate-800 border border-slate-700 text-teal-400 text-xs font-bold uppercase tracking-wider">
            <Laptop className="w-3.5 h-3.5" />
            <span>Developer Implementation Blueprint</span>
          </div>
          <h2 className="text-3xl sm:text-4xl font-black tracking-tight text-white font-heading">
            3 Specialized Role Portals <br className="hidden sm:block" />
            <span className="bg-gradient-to-r from-blue-400 via-teal-300 to-emerald-400 bg-clip-text text-transparent">
              Built for Modern Connected Care
            </span>
          </h2>
          <p className="text-slate-400 text-sm sm:text-base font-medium">
            Click across the portals below to interact with the live role simulation.
          </p>
        </div>

        {/* Portal Switcher Buttons */}
        <div className="flex flex-wrap justify-center gap-3 mb-10">
          {portals.map((p) => {
            const Icon = p.icon;
            const isActive = activePortal === p.id;
            return (
              <button
                key={p.id}
                onClick={() => setActivePortal(p.id)}
                className={`flex items-center gap-2.5 px-5 py-3 rounded-2xl font-bold text-xs sm:text-sm transition-all duration-200 ${
                  isActive
                    ? `${p.activeColor} shadow-lg scale-105`
                    : 'bg-slate-800/80 hover:bg-slate-800 text-slate-300 border border-slate-700/60'
                }`}
              >
                <Icon className="w-4 h-4" />
                <span>{p.name}</span>
                <span className={`text-[10px] uppercase tracking-wider px-1.5 py-0.5 rounded ${isActive ? 'bg-white/20' : 'bg-slate-700 text-slate-400'}`}>
                  {p.badge}
                </span>
              </button>
            );
          })}
        </div>

        {/* Portal Feature Box */}
        <div className="bg-slate-800/80 rounded-3xl p-6 sm:p-10 border border-slate-700 shadow-2xl backdrop-blur-xl">
          <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 items-center">
            
            {/* Left Column: Details & Capabilities */}
            <div className="lg:col-span-6 space-y-6">
              <div className="space-y-2">
                <span className="text-xs font-black uppercase tracking-widest text-teal-400">
                  {current.badge} · {current.tagline}
                </span>
                <h3 className="text-2xl sm:text-3xl font-bold text-white font-heading">
                  {current.name}
                </h3>
                <p className="text-slate-300 text-sm font-medium leading-relaxed">
                  {current.description}
                </p>
              </div>

              {/* Highlights List */}
              <div className="space-y-3">
                {current.highlights.map((item, idx) => (
                  <div key={idx} className="flex items-center gap-3">
                    <div className="w-5 h-5 rounded-full bg-teal-500/20 text-teal-400 flex items-center justify-center shrink-0">
                      <CheckCircle className="w-3.5 h-3.5" />
                    </div>
                    <span className="text-xs sm:text-sm font-semibold text-slate-200">
                      {item}
                    </span>
                  </div>
                ))}
              </div>

              {/* Action Button */}
              <div className="pt-2">
                <button
                  onClick={() => openPortalAuth(current.role)}
                  className="flex items-center gap-2 px-6 py-3.5 rounded-2xl bg-gradient-to-r from-blue-500 to-teal-400 hover:from-blue-600 hover:to-teal-500 text-slate-900 font-black text-xs sm:text-sm transition-all shadow-lg shadow-teal-500/20 hover:scale-[1.02] active:scale-[0.98]"
                >
                  <Sparkles className="w-4 h-4 text-slate-900" />
                  <span>Launch {current.name} Experience</span>
                  <ArrowRight className="w-4 h-4 ml-1" />
                </button>
              </div>
            </div>

            {/* Right Column: Live Interactive Role Simulator */}
            <div className="lg:col-span-6">
              <div className="bg-slate-950 rounded-2xl p-6 border border-slate-700/80 shadow-inner space-y-5">
                
                {/* Header */}
                <div className="flex items-center justify-between border-b border-slate-800 pb-3">
                  <div className="flex items-center gap-2">
                    <span className="w-2.5 h-2.5 rounded-full bg-red-400"></span>
                    <span className="w-2.5 h-2.5 rounded-full bg-amber-400"></span>
                    <span className="w-2.5 h-2.5 rounded-full bg-emerald-400"></span>
                    <span className="text-xs font-bold text-slate-300 ml-1.5 font-heading">
                      {activePortal === 'patient' && 'Patient Booking & Live Telemetry Cockpit'}
                      {activePortal === 'partner' && "Partner Today's Overview & Visit Action"}
                      {activePortal === 'admin' && 'Admin Operations & Dispatch Monitor'}
                    </span>
                  </div>
                  <span className="text-[10px] font-bold px-2 py-0.5 rounded bg-teal-950 text-teal-300 border border-teal-800">
                    Live Demo
                  </span>
                </div>

                {/* 1. PATIENT SIMULATOR */}
                {activePortal === 'patient' && (
                  <div className="space-y-4">
                    <div className="flex items-center justify-between bg-slate-900 p-3 rounded-xl border border-slate-800 text-xs">
                      <div className="flex items-center gap-2">
                        <img
                          src="https://images.unsplash.com/photo-1559839734-2b71ea197ec2?auto=format&fit=crop&w=128&q=80"
                          alt="Doctor"
                          className="w-9 h-9 rounded-lg object-cover"
                        />
                        <div>
                          <p className="font-bold text-white">Dr. Priya Sharma (4.8⭐)</p>
                          <p className="text-[10px] text-slate-400">General Physician Visit · ₹500 Paid</p>
                        </div>
                      </div>
                      <span className="text-[10px] font-bold px-2 py-1 rounded bg-blue-900/60 text-blue-300 border border-blue-700">
                        {patientDemoStep === 'CONFIRMED' && 'Payment Confirmed'}
                        {patientDemoStep === 'ON_WAY' && 'On the Way (12m)'}
                        {patientDemoStep === 'COMPLETED' && 'Visit Completed'}
                      </span>
                    </div>

                    {/* Step Switcher */}
                    <div className="flex gap-2">
                      <button
                        onClick={() => setPatientDemoStep('CONFIRMED')}
                        className={`flex-1 py-2 text-[11px] font-bold rounded-lg border transition-all ${
                          patientDemoStep === 'CONFIRMED' ? 'bg-blue-600 border-blue-500 text-white' : 'bg-slate-900 border-slate-800 text-slate-400'
                        }`}
                      >
                        1. Confirmed
                      </button>
                      <button
                        onClick={() => setPatientDemoStep('ON_WAY')}
                        className={`flex-1 py-2 text-[11px] font-bold rounded-lg border transition-all ${
                          patientDemoStep === 'ON_WAY' ? 'bg-blue-600 border-blue-500 text-white' : 'bg-slate-900 border-slate-800 text-slate-400'
                        }`}
                      >
                        2. On The Way
                      </button>
                      <button
                        onClick={() => setPatientDemoStep('COMPLETED')}
                        className={`flex-1 py-2 text-[11px] font-bold rounded-lg border transition-all ${
                          patientDemoStep === 'COMPLETED' ? 'bg-emerald-600 border-emerald-500 text-white' : 'bg-slate-900 border-slate-800 text-slate-400'
                        }`}
                      >
                        3. Complete
                      </button>
                    </div>

                    {patientDemoStep === 'ON_WAY' && (
                      <div className="p-3 bg-blue-950/40 rounded-xl border border-blue-800/80 text-xs flex items-center justify-between">
                        <div className="flex items-center gap-2 text-teal-300 font-semibold">
                          <Navigation className="w-4 h-4 animate-spin text-teal-400" />
                          <span>Live ETA: 12 Minutes (1.4 km away)</span>
                        </div>
                        <span className="text-[10px] bg-teal-900/80 text-teal-200 px-2 py-0.5 rounded font-mono">
                          Tracking GPS
                        </span>
                      </div>
                    )}

                    {patientDemoStep === 'COMPLETED' && (
                      <div className="p-3 bg-emerald-950/40 rounded-xl border border-emerald-800/80 text-xs space-y-1.5">
                        <div className="flex items-center justify-between text-emerald-300 font-bold">
                          <span>✓ Clinical Vitals Recorded</span>
                          <span className="text-[10px] text-slate-400">BP: 120/80 | SpO2: 99%</span>
                        </div>
                        <p className="text-[11px] text-slate-300">Digital prescription & GST tax receipt generated.</p>
                      </div>
                    )}
                  </div>
                )}

                {/* 2. PARTNER SIMULATOR */}
                {activePortal === 'partner' && (
                  <div className="space-y-4">
                    <div className="grid grid-cols-3 gap-2 text-center">
                      <div className="p-2.5 bg-slate-900 rounded-xl border border-slate-800">
                        <span className="text-[10px] font-bold text-slate-400 uppercase">Upcoming</span>
                        <span className="text-base font-black text-teal-400 block font-heading">3 Visits</span>
                      </div>
                      <div className="p-2.5 bg-slate-900 rounded-xl border border-slate-800">
                        <span className="text-[10px] font-bold text-slate-400 uppercase">Completed</span>
                        <span className="text-base font-black text-blue-400 block font-heading">1 Visit</span>
                      </div>
                      <div className="p-2.5 bg-slate-900 rounded-xl border border-slate-800">
                        <span className="text-[10px] font-bold text-slate-400 uppercase">Earnings</span>
                        <span className="text-base font-black text-emerald-400 block font-heading">₹2,500</span>
                      </div>
                    </div>

                    <div className="p-3.5 bg-slate-900 rounded-xl border border-slate-800 space-y-2.5">
                      <div className="flex items-center justify-between">
                        <span className="text-xs font-bold text-white">Next Patient: Anita Rao</span>
                        <span className="text-[10px] font-bold text-teal-400 bg-teal-950 px-2 py-0.5 rounded border border-teal-800">
                          10:00 AM Slot
                        </span>
                      </div>
                      <p className="text-xs text-slate-400 flex items-center gap-1.5">
                        <MapPin className="w-3.5 h-3.5 text-rose-400" />
                        <span>123 Green Park, Indiranagar</span>
                      </p>

                      <div className="flex gap-2 pt-1">
                        <button
                          onClick={() => setPartnerDemoState('ACCEPTED')}
                          className="flex-1 py-2 rounded-lg bg-teal-600 hover:bg-teal-700 text-white font-bold text-xs flex items-center justify-center gap-1 transition-all"
                        >
                          <Navigation className="w-3.5 h-3.5" />
                          <span>Navigate</span>
                        </button>
                        <button
                          onClick={() => setPartnerDemoState('VITALS_RECORDED')}
                          className="flex-1 py-2 rounded-lg bg-blue-600 hover:bg-blue-700 text-white font-bold text-xs flex items-center justify-center gap-1 transition-all"
                        >
                          <Activity className="w-3.5 h-3.5" />
                          <span>Record Vitals</span>
                        </button>
                      </div>
                    </div>

                    {partnerDemoState === 'VITALS_RECORDED' && (
                      <div className="p-2.5 rounded-lg bg-emerald-950/60 border border-emerald-800 text-xs text-emerald-300 font-bold flex items-center gap-2">
                        <CheckCircle2 className="w-4 h-4 text-emerald-400 shrink-0" />
                        <span>Vitals Logged: BP 120/80 mmHg · Pulse 72 bpm · SpO2 99%</span>
                      </div>
                    )}
                  </div>
                )}

                {/* 3. ADMIN SIMULATOR */}
                {activePortal === 'admin' && (
                  <div className="space-y-4">
                    <div className="grid grid-cols-3 gap-2 text-center">
                      <div className="p-2.5 bg-slate-900 rounded-xl border border-slate-800">
                        <span className="text-[10px] font-bold text-slate-400 uppercase">Bookings</span>
                        <span className="text-base font-black text-white block font-heading">248 (+12%)</span>
                      </div>
                      <div className="p-2.5 bg-slate-900 rounded-xl border border-slate-800">
                        <span className="text-[10px] font-bold text-slate-400 uppercase">Clinicians</span>
                        <span className="text-base font-black text-teal-400 block font-heading">124 (+5%)</span>
                      </div>
                      <div className="p-2.5 bg-slate-900 rounded-xl border border-slate-800">
                        <span className="text-[10px] font-bold text-slate-400 uppercase">Revenue</span>
                        <span className="text-base font-black text-emerald-400 block font-heading">₹2,45,560</span>
                      </div>
                    </div>

                    {/* KYC Verification Desk Mock */}
                    <div className="p-3.5 bg-slate-900 rounded-xl border border-slate-800 space-y-2.5">
                      <div className="flex items-center justify-between">
                        <div>
                          <p className="text-xs font-bold text-white">KYC Desk: Dr. Priya Sharma</p>
                          <p className="text-[10px] text-slate-400">KMC Reg #98421 · MBBS, MD Certificate</p>
                        </div>
                        <span className={`text-[10px] font-bold px-2 py-0.5 rounded ${adminKycApproved ? 'bg-emerald-950 text-emerald-300 border border-emerald-800' : 'bg-amber-950 text-amber-300 border border-amber-800'}`}>
                          {adminKycApproved ? 'Approved' : 'Pending Review'}
                        </span>
                      </div>

                      <div className="flex gap-2">
                        <button
                          onClick={() => setAdminKycApproved(true)}
                          className="flex-1 py-2 rounded-lg bg-emerald-600 hover:bg-emerald-700 text-white font-bold text-xs transition-colors"
                        >
                          Approve Medical License
                        </button>
                        <button
                          onClick={() => setAdminKycApproved(false)}
                          className="px-3 py-2 rounded-lg bg-slate-800 hover:bg-slate-700 text-slate-300 font-bold text-xs transition-colors"
                        >
                          Reset
                        </button>
                      </div>
                    </div>
                  </div>
                )}

              </div>
            </div>

          </div>
        </div>

      </div>

      <AuthModal
        isOpen={isAuthOpen}
        onClose={() => setIsAuthOpen(false)}
        defaultRole={authRole}
      />
    </section>
  );
}
