'use client';

import React, { useState } from 'react';
import { 
  X, 
  Play, 
  CheckCircle2, 
  Navigation, 
  Activity, 
  FileCheck2, 
  Smartphone,
  Sparkles,
  ArrowRight
} from 'lucide-react';

interface VideoDemoModalProps {
  isOpen: boolean;
  onClose: () => void;
  onBookNow: () => void;
}

export default function VideoDemoModal({ isOpen, onClose, onBookNow }: VideoDemoModalProps) {
  const [activeTab, setActiveTab] = useState<0 | 1 | 2 | 3>(0);

  if (!isOpen) return null;

  const demoSteps = [
    {
      title: '1. Select Service & Doctor',
      desc: 'Browse verified general physicians, home nurses, or wound care specialists and select your preferred 1-hour schedule.',
      badge: 'Step 1: Patient Request',
      mockupBg: 'from-blue-600 to-indigo-700',
      action: 'Doctor Visit (₹500) selected for Today 10:00 AM',
    },
    {
      title: '2. Instant UPI Confirmation',
      desc: 'Pay in 5 seconds using Google Pay, PhonePe, or UPI QR with automated instant payment verification.',
      badge: 'Step 2: Instant Checkout',
      mockupBg: 'from-teal-600 to-emerald-700',
      action: 'UPI Ref: 482910398 · Booking #HD-8921 Confirmed',
    },
    {
      title: '3. Real-Time Clinician Telemetry',
      desc: 'Watch Dr. Priya Sharma navigate to your doorstep with live GPS map updates and accurate arrival estimates.',
      badge: 'Step 3: Live GPS Dispatch',
      mockupBg: 'from-indigo-600 to-purple-700',
      action: 'Speed: 24 km/h · ETA: 12 Mins · Geofence Active',
    },
    {
      title: '4. Clinical Care & Digital Rx',
      desc: 'Compassionate bedside care, automatic logging of blood pressure/sugar, and immediate digital prescription delivery.',
      badge: 'Step 4: Care Delivered',
      mockupBg: 'from-emerald-600 to-teal-700',
      action: 'Vitals Logged: BP 120/80 mmHg · SpO2 99% · Rx Issued',
    },
  ];

  const current = demoSteps[activeTab];

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/70 backdrop-blur-md animate-in fade-in duration-200">
      <div 
        className="relative w-full max-w-3xl bg-white rounded-3xl shadow-2xl border border-slate-100 overflow-hidden"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header */}
        <div className="bg-slate-900 text-white p-6 flex items-center justify-between border-b border-slate-800">
          <div className="flex items-center gap-2.5">
            <div className="w-8 h-8 rounded-xl bg-blue-600/30 text-blue-400 flex items-center justify-center border border-blue-500/40">
              <Play className="w-4 h-4 fill-blue-400" />
            </div>
            <div>
              <h3 className="text-base font-bold font-heading">HomeDigo Interactive Care Walkthrough</h3>
              <p className="text-xs text-slate-400">See how verified doorstep healthcare works in under 60 seconds</p>
            </div>
          </div>

          <button
            onClick={onClose}
            className="p-1.5 rounded-full bg-slate-800 hover:bg-slate-700 text-slate-400 hover:text-white transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Video / Interactive Simulation Screen */}
        <div className="p-6 space-y-6">
          
          {/* Animated Mockup Stage */}
          <div className={`rounded-2xl p-8 bg-gradient-to-tr ${current.mockupBg} text-white shadow-xl min-h-[220px] flex flex-col justify-between relative overflow-hidden transition-all duration-300`}>
            {/* Ambient pattern */}
            <div className="absolute inset-0 opacity-10 bg-[radial-gradient(#fff_1px,transparent_1px)] [background-size:16px_16px]"></div>

            <div className="relative z-10 flex items-center justify-between">
              <span className="text-xs font-bold uppercase tracking-wider bg-white/20 backdrop-blur-sm px-3 py-1 rounded-full">
                {current.badge}
              </span>
              <span className="text-xs font-mono text-white/80">
                0{activeTab + 1} / 04
              </span>
            </div>

            <div className="relative z-10 space-y-2 py-4">
              <h4 className="text-2xl font-bold font-heading text-white">{current.title}</h4>
              <p className="text-xs sm:text-sm text-white/90 max-w-lg font-medium leading-relaxed">
                {current.desc}
              </p>
            </div>

            <div className="relative z-10 bg-black/30 backdrop-blur-md px-4 py-2.5 rounded-xl border border-white/10 flex items-center justify-between text-xs font-mono text-teal-300">
              <span>{current.action}</span>
              <Sparkles className="w-3.5 h-3.5 text-amber-300 animate-pulse" />
            </div>
          </div>

          {/* Stepper Tabs */}
          <div className="grid grid-cols-4 gap-2">
            {demoSteps.map((s, idx) => (
              <button
                key={idx}
                onClick={() => setActiveTab(idx as any)}
                className={`p-3 rounded-xl border text-left transition-all ${
                  activeTab === idx
                    ? 'bg-blue-50 border-blue-500 text-blue-900 shadow-2xs font-bold'
                    : 'bg-slate-50 hover:bg-slate-100 border-slate-200 text-slate-600 font-medium'
                }`}
              >
                <span className="text-[10px] font-mono block opacity-60">0{idx + 1}</span>
                <span className="text-xs block truncate mt-0.5">{s.title.split('. ')[1]}</span>
              </button>
            ))}
          </div>

          {/* Bottom Action Footer */}
          <div className="pt-2 border-t border-slate-100 flex items-center justify-between">
            <p className="text-xs text-slate-500 font-medium hidden sm:block">
              Ready to book your first verified doctor or nurse visit?
            </p>
            <div className="flex gap-3 w-full sm:w-auto">
              <button
                onClick={onClose}
                className="flex-1 sm:flex-initial px-5 py-2.5 rounded-xl border border-slate-200 text-slate-700 hover:bg-slate-50 font-bold text-xs"
              >
                Close
              </button>
              <button
                onClick={() => {
                  onClose();
                  onBookNow();
                }}
                className="flex-1 sm:flex-initial px-6 py-2.5 rounded-xl bg-blue-600 hover:bg-blue-700 text-white font-bold text-xs flex items-center justify-center gap-1.5 shadow-md shadow-blue-500/20"
              >
                <span>Book Care Now</span>
                <ArrowRight className="w-3.5 h-3.5" />
              </button>
            </div>
          </div>

        </div>
      </div>
    </div>
  );
}
