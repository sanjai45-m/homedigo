'use client';

import React, { useState } from 'react';
import { 
  ShieldCheck, 
  Award, 
  CheckCircle2, 
  Star, 
  Heart, 
  ArrowRight, 
  UserPlus, 
  Building2, 
  FileBadge,
  Sparkles
} from 'lucide-react';
import AuthModal from '@/components/auth/AuthModal';

export default function PartnerTrustSection() {
  const [isAuthOpen, setIsAuthOpen] = useState(false);

  const verificationPoints = [
    { title: 'State Medical / Nursing Council Validation', desc: 'Active license & registration number verified against official state councils.' },
    { title: 'Degree & Qualification Check', desc: 'Degrees validated from recognized medical universities and colleges.' },
    { title: 'Criminal & Identity Verification', desc: 'Government photo ID & comprehensive background verification.' },
    { title: 'Clinical Experience Threshold', desc: 'Minimum 2+ years of verified hospital / clinic bedside experience.' },
  ];

  const featuredPartners = [
    {
      name: 'Dr. Priya Sharma',
      role: 'General Physician',
      qualification: 'MBBS, MD (Internal Medicine)',
      experience: '8 Years Exp',
      rating: 4.9,
      visits: 142,
      image: 'https://images.unsplash.com/photo-1559839734-2b71ea197ec2?auto=format&fit=crop&w=256&q=80',
    },
    {
      name: 'Nurse Anjali Nair',
      role: 'Senior Clinical Nurse',
      qualification: 'B.Sc. Nursing (Registered RN)',
      experience: '6 Years Exp',
      rating: 4.8,
      visits: 218,
      image: 'https://images.unsplash.com/photo-1594824813590-721245b0a3c7?auto=format&fit=crop&w=256&q=80',
    },
    {
      name: 'Dr. Rajesh Menon',
      role: 'Consultant Physiotherapist',
      qualification: 'MPT (Orthopedics & Rehab)',
      experience: '10 Years Exp',
      rating: 4.9,
      visits: 195,
      image: 'https://images.unsplash.com/photo-1622253692010-333f2da6031d?auto=format&fit=crop&w=256&q=80',
    },
  ];

  return (
    <section id="trust" className="py-20 lg:py-28 bg-slate-50 relative">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        
        {/* Section Header */}
        <div className="text-center max-w-3xl mx-auto space-y-4 mb-16">
          <div className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-blue-50 border border-blue-200 text-blue-700 text-xs font-bold uppercase tracking-wider">
            <Award className="w-3.5 h-3.5" />
            <span>Clinical Excellence & Safety</span>
          </div>
          <h2 className="text-3xl sm:text-4xl font-black text-slate-900 tracking-tight">
            100% Certified & Background <br />
            <span className="bg-gradient-to-r from-blue-600 via-indigo-600 to-teal-600 bg-clip-text text-transparent">
              Verified Healthcare Partners
            </span>
          </h2>
          <p className="text-slate-600 text-sm sm:text-base font-medium">
            We hold our medical partners to the highest clinical standards so you and your loved ones receive compassionate, hospital-grade care at home.
          </p>
        </div>

        {/* Top Grid: Verification Criteria + Stats */}
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 items-center mb-16">
          
          {/* Left 4 Verification Pillars */}
          <div className="lg:col-span-7 space-y-4">
            <div className="bg-white rounded-3xl p-6 sm:p-8 border border-slate-200/80 shadow-md space-y-5">
              <h3 className="text-xl font-bold text-slate-900 flex items-center gap-2">
                <ShieldCheck className="w-5 h-5 text-blue-600" />
                <span>Our 4-Stage Verification Protocol</span>
              </h3>

              <div className="space-y-4">
                {verificationPoints.map((pt, idx) => (
                  <div key={idx} className="flex items-start gap-3.5">
                    <div className="w-6 h-6 rounded-full bg-blue-50 text-blue-600 flex items-center justify-center shrink-0 mt-0.5 font-bold text-xs">
                      {idx + 1}
                    </div>
                    <div>
                      <h4 className="text-sm font-bold text-slate-800">{pt.title}</h4>
                      <p className="text-xs text-slate-500 font-medium mt-0.5">{pt.desc}</p>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          </div>

          {/* Right Metrics Grid */}
          <div className="lg:col-span-5 grid grid-cols-2 gap-4">
            <div className="bg-white rounded-3xl p-6 border border-slate-200/80 shadow-sm text-center">
              <span className="text-3xl sm:text-4xl font-black text-blue-600 block">248+</span>
              <span className="text-xs font-bold text-slate-500 mt-1 block">Completed Home Bookings</span>
            </div>
            <div className="bg-white rounded-3xl p-6 border border-slate-200/80 shadow-sm text-center">
              <span className="text-3xl sm:text-4xl font-black text-teal-600 block">124+</span>
              <span className="text-xs font-bold text-slate-500 mt-1 block">Verified Clinicians</span>
            </div>
            <div className="bg-white rounded-3xl p-6 border border-slate-200/80 shadow-sm text-center">
              <span className="text-3xl sm:text-4xl font-black text-indigo-600 block">4.9/5</span>
              <span className="text-xs font-bold text-slate-500 mt-1 block">Patient Satisfaction</span>
            </div>
            <div className="bg-white rounded-3xl p-6 border border-slate-200/80 shadow-sm text-center">
              <span className="text-3xl sm:text-4xl font-black text-emerald-600 block">15 Min</span>
              <span className="text-xs font-bold text-slate-500 mt-1 block">Average Partner Dispatch</span>
            </div>
          </div>

        </div>

        {/* Featured Partners Carousel / Cards */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          {featuredPartners.map((pro, idx) => (
            <div
              key={idx}
              className="bg-white rounded-3xl p-6 border border-slate-200/80 shadow-sm hover:shadow-lg transition-all group"
            >
              <div className="flex items-center gap-4 mb-4">
                <img
                  src={pro.image}
                  alt={pro.name}
                  className="w-16 h-16 rounded-2xl object-cover ring-2 ring-blue-500/20 group-hover:scale-105 transition-transform"
                />
                <div>
                  <div className="flex items-center gap-1">
                    <h4 className="font-bold text-slate-900 text-base">{pro.name}</h4>
                    <CheckCircle2 className="w-4 h-4 text-blue-600 shrink-0" />
                  </div>
                  <p className="text-xs font-semibold text-blue-600">{pro.role}</p>
                  <p className="text-[11px] text-slate-400 mt-0.5">{pro.qualification}</p>
                </div>
              </div>

              <div className="pt-3 border-t border-slate-100 flex items-center justify-between text-xs font-medium text-slate-500">
                <div className="flex items-center text-amber-500 font-bold">
                  <Star className="w-3.5 h-3.5 fill-amber-400 mr-1" />
                  <span>{pro.rating}</span>
                  <span className="text-slate-400 font-normal ml-1">({pro.visits} visits)</span>
                </div>
                <span className="text-slate-600 font-semibold">{pro.experience}</span>
              </div>
            </div>
          ))}
        </div>

        {/* Partner Onboarding CTA */}
        <div className="mt-12 bg-white rounded-3xl p-6 sm:p-8 border border-blue-100 shadow-md flex flex-col sm:flex-row items-center justify-between gap-6">
          <div className="flex items-center gap-4 text-center sm:text-left">
            <div className="w-14 h-14 rounded-2xl bg-teal-50 text-teal-600 flex items-center justify-center shrink-0">
              <UserPlus className="w-7 h-7" />
            </div>
            <div>
              <h4 className="text-lg font-bold text-slate-900">Are you a Doctor, Nurse, or Physiotherapist?</h4>
              <p className="text-xs sm:text-sm text-slate-500">Join HomeDigo, set your own flexible hours, and earn transparent daily payouts.</p>
            </div>
          </div>
          <button
            onClick={() => setIsAuthOpen(true)}
            className="px-6 py-3.5 rounded-2xl bg-teal-600 hover:bg-teal-700 text-white font-bold text-xs sm:text-sm shadow-md shadow-teal-500/20 hover:shadow-teal-500/35 transition-all whitespace-nowrap"
          >
            Apply as Healthcare Partner
          </button>
        </div>

      </div>

      <AuthModal
        isOpen={isAuthOpen}
        onClose={() => setIsAuthOpen(false)}
        defaultRole="PARTNER"
      />
    </section>
  );
}
