'use client';

import React, { useState } from 'react';
import { 
  Search, 
  CreditCard, 
  MapPin, 
  FileCheck2, 
  ArrowRight, 
  CheckCircle2, 
  Sparkles,
  Smartphone
} from 'lucide-react';
import AuthModal from '@/components/auth/AuthModal';

export default function HowItWorks() {
  const [isAuthOpen, setIsAuthOpen] = useState(false);

  const steps = [
    {
      num: '01',
      title: 'Select Service & Schedule',
      desc: 'Choose doctor visit, nursing care, physiotherapy, or tests and pick your preferred time slot.',
      icon: Search,
      color: 'bg-blue-600 text-white',
    },
    {
      num: '02',
      title: 'Instant UPI Checkout',
      desc: 'Review transparent pricing and pay securely via Google Pay, PhonePe, UPI QR or Card.',
      icon: CreditCard,
      color: 'bg-teal-600 text-white',
    },
    {
      num: '03',
      title: 'Real-Time Visit Tracking',
      desc: 'Watch your verified healthcare partner travel to your address with live GPS and estimated arrival time.',
      icon: MapPin,
      color: 'bg-indigo-600 text-white',
    },
    {
      num: '04',
      title: 'Care & Digital Records',
      desc: 'Receive compassionate clinical treatment, record vitals, and get digital prescriptions & tax receipts.',
      icon: FileCheck2,
      color: 'bg-emerald-600 text-white',
    },
  ];

  return (
    <section id="how-it-works" className="py-20 lg:py-28 bg-white relative">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        
        {/* Header */}
        <div className="text-center max-w-3xl mx-auto space-y-4 mb-16">
          <div className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-teal-50 border border-teal-200 text-teal-700 text-xs font-bold uppercase tracking-wider">
            <Smartphone className="w-3.5 h-3.5" />
            <span>Simple 4-Step Process</span>
          </div>
          <h2 className="text-3xl sm:text-4xl font-black text-slate-900 tracking-tight">
            How HomeDigo Brings <br />
            <span className="bg-gradient-to-r from-teal-600 to-blue-600 bg-clip-text text-transparent">
              Hospital-Grade Care Home
            </span>
          </h2>
          <p className="text-slate-600 text-sm sm:text-base font-medium">
            Designed for elderly parents, busy professionals, and post-surgery recovery with zero friction.
          </p>
        </div>

        {/* 4 Cards Grid */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 relative">
          {steps.map((step, idx) => {
            const Icon = step.icon;
            return (
              <div
                key={step.num}
                className="relative bg-slate-50/70 hover:bg-white rounded-3xl p-6 sm:p-7 border border-slate-200/80 hover:border-blue-300 hover:shadow-xl transition-all duration-300 group flex flex-col justify-between"
              >
                <div>
                  <div className="flex items-center justify-between mb-6">
                    <span className="text-2xl font-black text-slate-300 font-mono group-hover:text-blue-600 transition-colors">
                      {step.num}
                    </span>
                    <div className={`w-12 h-12 rounded-2xl ${step.color} flex items-center justify-center shadow-md shadow-slate-900/5 group-hover:scale-110 transition-transform`}>
                      <Icon className="w-6 h-6" />
                    </div>
                  </div>

                  <h3 className="text-lg font-bold text-slate-900 mb-2">
                    {step.title}
                  </h3>
                  <p className="text-xs text-slate-600 font-medium leading-relaxed">
                    {step.desc}
                  </p>
                </div>

                <div className="pt-4 mt-4 border-t border-slate-200/50 flex items-center gap-1.5 text-xs font-bold text-emerald-600">
                  <CheckCircle2 className="w-3.5 h-3.5" />
                  <span>Instant Confirmation</span>
                </div>
              </div>
            );
          })}
        </div>

        {/* CTA */}
        <div className="mt-14 text-center">
          <button
            onClick={() => setIsAuthOpen(true)}
            className="inline-flex items-center gap-2.5 px-8 py-4 rounded-2xl bg-gradient-to-r from-blue-600 to-indigo-600 hover:from-blue-700 hover:to-indigo-700 text-white font-black text-sm shadow-xl shadow-blue-500/25 hover:shadow-blue-500/40 hover:scale-105 active:scale-95 transition-all"
          >
            <Sparkles className="w-4 h-4" />
            <span>Book Your First Visit</span>
            <ArrowRight className="w-4 h-4" />
          </button>
        </div>

      </div>

      <AuthModal
        isOpen={isAuthOpen}
        onClose={() => setIsAuthOpen(false)}
        defaultRole="PATIENT"
      />
    </section>
  );
}
