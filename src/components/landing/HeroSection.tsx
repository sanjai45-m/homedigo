'use client';

import React, { useState, useEffect } from 'react';
import { 
  Search, 
  MapPin, 
  ShieldCheck, 
  Star, 
  Stethoscope, 
  HeartHandshake, 
  Activity, 
  ArrowRight, 
  CheckCircle2, 
  Clock, 
  Sparkles,
  Navigation,
  RefreshCw,
  Play,
  Check,
  Zap,
  Users,
  Award
} from 'lucide-react';
import AuthModal from '@/components/auth/AuthModal';
import VideoDemoModal from '@/components/landing/VideoDemoModal';

interface ServiceItem {
  id: string;
  title: string;
  category: string;
  description: string;
  base_price: number;
  duration_minutes: number;
  icon: string;
}

const partnerProfiles: Record<string, { name: string; title: string; rating: number; visits: number; img: string }> = {
  srv_doc: {
    name: 'Dr. Priya Sharma',
    title: 'MBBS, MD · 8 yrs experience',
    rating: 4.9,
    visits: 142,
    img: 'https://images.unsplash.com/photo-1559839734-2b71ea197ec2?auto=format&fit=crop&w=256&q=80',
  },
  srv_nurse: {
    name: 'Nurse Anjali Nair',
    title: 'B.Sc. Nursing (RN) · 6 yrs exp',
    rating: 4.8,
    visits: 218,
    img: 'https://images.unsplash.com/photo-1594824813590-721245b0a3c7?auto=format&fit=crop&w=256&q=80',
  },
  srv_dressing: {
    name: 'Nurse Ramesh Kumar',
    title: 'Wound Care Specialist · 5 yrs exp',
    rating: 4.9,
    visits: 176,
    img: 'https://images.unsplash.com/photo-1622253692010-333f2da6031d?auto=format&fit=crop&w=256&q=80',
  },
  srv_physio: {
    name: 'Dr. Rajesh Menon',
    title: 'MPT (Rehab) · 10 yrs exp',
    rating: 4.9,
    visits: 195,
    img: 'https://images.unsplash.com/photo-1537368910025-700350fe46c7?auto=format&fit=crop&w=256&q=80',
  },
  srv_lab: {
    name: 'Sunil Rao',
    title: 'Certified Phlebotomist · 4 yrs exp',
    rating: 4.8,
    visits: 310,
    img: 'https://images.unsplash.com/photo-1507003211169-0a1dd7228f2d?auto=format&fit=crop&w=256&q=80',
  },
};

export default function HeroSection() {
  const [services, setServices] = useState<ServiceItem[]>([]);
  const [selectedServiceId, setSelectedServiceId] = useState('srv_doc');
  const [selectedAddress, setSelectedAddress] = useState('123 Green Park, Indiranagar, Bengaluru');
  const [selectedSlot, setSelectedSlot] = useState('Today, 10:00 AM');
  
  const [isAuthOpen, setIsAuthOpen] = useState(false);
  const [isVideoModalOpen, setIsVideoModalOpen] = useState(false);
  const [selectedRole, setSelectedRole] = useState<'PATIENT' | 'PARTNER' | 'ADMIN'>('PATIENT');

  // Interactive Live Simulator State
  const [simulatorState, setSimulatorState] = useState<'IDLE' | 'PROCESSING_UPI' | 'CONFIRMED' | 'ASSIGNED' | 'ON_THE_WAY'>('IDLE');
  const [simulationProgress, setSimulationProgress] = useState(0);

  // Dynamic live counters
  const [activeBookingsCount, setActiveBookingsCount] = useState(248);

  useEffect(() => {
    async function loadServices() {
      try {
        const res = await fetch('/api/services');
        const data = await res.json();
        if (data.services && data.services.length > 0) {
          setServices(data.services);
        }
      } catch (err) {
        console.error('Error fetching services:', err);
      }
    }
    loadServices();

    const interval = setInterval(() => {
      setActiveBookingsCount((prev) => prev + (Math.random() > 0.6 ? 1 : 0));
    }, 9000);
    return () => clearInterval(interval);
  }, []);

  const openAuth = (role: 'PATIENT' | 'PARTNER' | 'ADMIN') => {
    setSelectedRole(role);
    setIsAuthOpen(true);
  };

  const currentService = services.find((s) => s.id === selectedServiceId) || {
    id: 'srv_doc',
    title: 'Doctor Home Visit',
    category: 'CONSULTATION',
    description: 'General physician doorstep clinical checkup and consultation',
    base_price: 500,
    duration_minutes: 45,
    icon: 'Stethoscope',
  };

  const currentPartner = partnerProfiles[selectedServiceId] || partnerProfiles.srv_doc;

  const runBookingSimulation = () => {
    if (simulatorState !== 'IDLE') return;
    setSimulatorState('PROCESSING_UPI');
    setSimulationProgress(25);

    setTimeout(() => {
      setSimulatorState('CONFIRMED');
      setSimulationProgress(50);

      setTimeout(() => {
        setSimulatorState('ASSIGNED');
        setSimulationProgress(75);

        setTimeout(() => {
          setSimulatorState('ON_THE_WAY');
          setSimulationProgress(100);
        }, 1100);
      }, 1000);
    }, 1000);
  };

  const resetSimulation = () => {
    setSimulatorState('IDLE');
    setSimulationProgress(0);
  };

  return (
    <>
      <section className="relative overflow-hidden pt-10 pb-16 lg:pt-16 lg:pb-24 bg-gradient-to-b from-[#f8fafc] via-[#f1f5f9]/40 to-white">
        {/* Subtle decorative background blur */}
        <div className="absolute top-0 right-1/4 w-96 h-96 bg-blue-400/10 rounded-full blur-3xl pointer-events-none"></div>
        <div className="absolute top-20 left-10 w-80 h-80 bg-teal-400/10 rounded-full blur-3xl pointer-events-none"></div>

        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 relative z-10">
          <div className="grid grid-cols-1 lg:grid-cols-12 gap-12 items-center">
            
            {/* Left Hero Column */}
            <div className="lg:col-span-7 space-y-7 text-center lg:text-left">
              
              {/* Reference-style Eyebrow Badge */}
              <div className="inline-flex">
                <span className="il-eyebrow">
                  <span className="w-4 h-4 rounded-full bg-emerald-600 text-white inline-flex items-center justify-center">
                    <Check className="w-2.5 h-2.5 stroke-[3]" />
                  </span>
                  TRUSTED BY 10,000+ FAMILIES. BUILT FOR CLINICAL EXCELLENCE.
                </span>
              </div>

              {/* Bold Typography */}
              <h1 className="text-4xl sm:text-5xl lg:text-6xl font-black text-slate-900 tracking-tight leading-[1.08] font-heading">
                Carry clinical care <br />
                <span className="text-blue-600">to your home.</span> <br />
                <span className="text-slate-800">Protect your family.</span>
              </h1>

              {/* Description */}
              <p className="text-base sm:text-lg text-slate-600 max-w-xl mx-auto lg:mx-0 font-medium leading-relaxed">
                Doctor visits, nursing care, wound dressing, physiotherapy, lab tests, and 24/7 ambulance — all scheduled seamlessly in one connected platform with verified clinicians and instant UPI payments.
              </p>

              {/* Dual Action Buttons with double-arrow slide and video play */}
              <div className="flex flex-wrap items-center justify-center lg:justify-start gap-4 pt-2">
                <button
                  onClick={() => openAuth('PATIENT')}
                  className="tj-primary-btn"
                >
                  <span className="btn_inner">
                    <span className="btn_text font-bold text-sm">Book a Free Consultation</span>
                    <span className="btn_icon">
                      <span>
                        <ArrowRight className="w-4 h-4" />
                        <ArrowRight className="w-4 h-4" />
                      </span>
                    </span>
                  </span>
                </button>

                <button
                  onClick={() => setIsVideoModalOpen(true)}
                  className="tj-primary-btn white-btn group"
                >
                  <span className="btn_inner">
                    <span className="w-7 h-7 rounded-full bg-blue-50 text-blue-600 flex items-center justify-center group-hover:bg-blue-600 group-hover:text-white transition-colors">
                      <Play className="w-3.5 h-3.5 fill-current ml-0.5" />
                    </span>
                    <span className="btn_text font-bold text-sm">Watch How It Works</span>
                  </span>
                </button>
              </div>

              {/* Quick Category Buttons that update simulator */}
              <div className="pt-2">
                <p className="text-xs font-bold text-slate-400 uppercase tracking-wider mb-2.5">
                  Select service to simulate booking:
                </p>
                <div className="flex flex-wrap gap-2 justify-center lg:justify-start">
                  {[
                    { id: 'srv_doc', name: 'Doctor Visit', price: '₹500' },
                    { id: 'srv_nurse', name: 'Home Nursing', price: '₹350' },
                    { id: 'srv_dressing', name: 'Wound Dressing', price: '₹300' },
                    { id: 'srv_physio', name: 'Physiotherapy', price: '₹600' },
                    { id: 'srv_lab', name: 'Blood Test', price: '₹199' },
                  ].map((cat) => (
                    <button
                      key={cat.id}
                      onClick={() => {
                        setSelectedServiceId(cat.id);
                        resetSimulation();
                      }}
                      className={`px-3.5 py-1.5 rounded-xl text-xs font-bold transition-all ${
                        selectedServiceId === cat.id
                          ? 'bg-blue-600 text-white shadow-sm scale-105'
                          : 'bg-white hover:bg-slate-100 text-slate-700 border border-slate-200'
                      }`}
                    >
                      {cat.name} ({cat.price})
                    </button>
                  ))}
                </div>
              </div>

            </div>

            {/* Right Interactive Mockup Stage */}
            <div className="lg:col-span-5 relative">
              <div className="absolute inset-0 bg-gradient-to-tr from-blue-600/10 via-teal-500/10 to-indigo-600/10 rounded-3xl blur-2xl transform rotate-1"></div>

              <div className="relative bg-white rounded-3xl p-6 sm:p-7 shadow-2xl border border-slate-200 space-y-5">
                
                {/* Mockup Header */}
                <div className="flex items-center justify-between border-b border-slate-100 pb-3">
                  <div className="flex items-center gap-2">
                    <span className="w-2.5 h-2.5 rounded-full bg-red-400"></span>
                    <span className="w-2.5 h-2.5 rounded-full bg-amber-400"></span>
                    <span className="w-2.5 h-2.5 rounded-full bg-emerald-400"></span>
                    <span className="text-xs font-bold text-slate-700 ml-1 font-heading">
                      HomeDigo Connected Telemetry
                    </span>
                  </div>

                  {simulatorState !== 'IDLE' && (
                    <button
                      onClick={resetSimulation}
                      className="flex items-center gap-1 text-[11px] font-bold text-blue-600 bg-blue-50 px-2 py-0.5 rounded-md hover:bg-blue-100"
                    >
                      <RefreshCw className="w-3 h-3" />
                      <span>Reset</span>
                    </button>
                  )}
                </div>

                {/* Live Simulation Progress */}
                {simulatorState !== 'IDLE' && (
                  <div className="p-3.5 rounded-2xl bg-slate-900 text-white space-y-2 animate-in fade-in duration-200">
                    <div className="flex items-center justify-between text-xs font-bold">
                      <span className="text-teal-400 flex items-center gap-1.5">
                        <Zap className="w-3.5 h-3.5 animate-pulse" />
                        {simulatorState === 'PROCESSING_UPI' && 'Verifying UPI Payment...'}
                        {simulatorState === 'CONFIRMED' && 'Payment Verified · Matching Clinician...'}
                        {simulatorState === 'ASSIGNED' && `${currentPartner.name} Accepted Visit!`}
                        {simulatorState === 'ON_THE_WAY' && 'Partner On The Way (Live ETA: 12 Mins)'}
                      </span>
                      <span className="font-mono text-[11px] text-slate-400">{simulationProgress}%</span>
                    </div>

                    <div className="w-full bg-slate-800 h-2 rounded-full overflow-hidden">
                      <div 
                        className="bg-gradient-to-r from-blue-500 via-teal-400 to-emerald-400 h-full rounded-full transition-all duration-500"
                        style={{ width: `${simulationProgress}%` }}
                      />
                    </div>

                    {simulatorState === 'ON_THE_WAY' && (
                      <div className="pt-1 flex items-center justify-between text-[11px] text-slate-300 border-t border-slate-800 mt-2">
                        <span className="flex items-center gap-1 text-emerald-400">
                          <Navigation className="w-3 h-3" /> Live GPS Coordinates Active
                        </span>
                        <span className="font-mono text-white">Speed: 28 km/h</span>
                      </div>
                    )}
                  </div>
                )}

                {/* Service Details Card */}
                <div className="p-4 rounded-2xl bg-gradient-to-r from-blue-50/60 to-indigo-50/40 border border-blue-100 flex items-center justify-between">
                  <div className="flex items-center gap-3">
                    <div className="w-10 h-10 rounded-xl bg-blue-600 text-white flex items-center justify-center shadow-md shadow-blue-500/20">
                      <Stethoscope className="w-5 h-5" />
                    </div>
                    <div>
                      <h4 className="text-sm font-bold text-slate-900 font-heading">{currentService.title}</h4>
                      <p className="text-xs text-slate-500 font-medium">{currentService.duration_minutes} mins · Certified care</p>
                    </div>
                  </div>
                  <div className="text-right">
                    <span className="text-base font-black text-slate-900 font-heading">₹{currentService.base_price}</span>
                    <p className="text-[10px] text-slate-400 font-semibold uppercase">Per Visit</p>
                  </div>
                </div>

                {/* Assigned Clinician Card */}
                <div className="p-4 rounded-2xl bg-white border border-slate-200 shadow-2xs space-y-2">
                  <div className="flex items-center justify-between">
                    <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider">
                      Assigned Healthcare Partner
                    </span>
                    <span className="text-[10px] font-bold text-emerald-600 bg-emerald-50 px-2 py-0.5 rounded-full border border-emerald-200">
                      ✓ License Verified
                    </span>
                  </div>

                  <div className="flex items-center gap-3">
                    <img
                      src={currentPartner.img}
                      alt={currentPartner.name}
                      className="w-12 h-12 rounded-xl object-cover ring-2 ring-teal-500/20"
                    />
                    <div>
                      <h4 className="text-sm font-bold text-slate-900 font-heading">{currentPartner.name}</h4>
                      <p className="text-xs text-slate-500 font-medium">{currentPartner.title}</p>
                      <div className="flex items-center gap-1.5 mt-0.5">
                        <div className="flex items-center text-amber-500 text-xs font-bold">
                          <Star className="w-3.5 h-3.5 fill-amber-400 mr-0.5" />
                          <span>{currentPartner.rating}</span>
                        </div>
                        <span className="text-[11px] text-slate-400">· {currentPartner.visits} visits completed</span>
                      </div>
                    </div>
                  </div>
                </div>

                {/* Address & Slot Selectors */}
                <div className="grid grid-cols-2 gap-2 text-xs">
                  <div className="p-2.5 rounded-xl bg-slate-50 border border-slate-200">
                    <span className="text-[10px] font-bold text-slate-400 uppercase block">Address</span>
                    <p className="font-bold text-slate-800 truncate mt-0.5">{selectedAddress.split(',')[0]}</p>
                  </div>
                  <div className="p-2.5 rounded-xl bg-slate-50 border border-slate-200">
                    <span className="text-[10px] font-bold text-slate-400 uppercase block">Time Slot</span>
                    <p className="font-bold text-slate-800 mt-0.5">{selectedSlot}</p>
                  </div>
                </div>

                {/* Simulate Button */}
                {simulatorState === 'IDLE' ? (
                  <button
                    onClick={runBookingSimulation}
                    className="w-full py-3.5 px-4 rounded-2xl bg-gradient-to-r from-emerald-600 to-teal-600 hover:from-emerald-700 hover:to-teal-700 text-white font-bold text-xs sm:text-sm flex items-center justify-between shadow-lg shadow-emerald-600/20 transition-all hover:scale-[1.01]"
                  >
                    <div className="flex items-center gap-2">
                      <span className="text-[10px] bg-white/20 px-2 py-0.5 rounded font-black tracking-wider uppercase">UPI</span>
                      <span>Test Booking Simulator (₹{currentService.base_price})</span>
                    </div>
                    <ArrowRight className="w-4 h-4" />
                  </button>
                ) : simulatorState === 'ON_THE_WAY' ? (
                  <button
                    onClick={() => openAuth('PATIENT')}
                    className="w-full py-3 px-4 rounded-2xl bg-blue-600 hover:bg-blue-700 text-white font-bold text-xs sm:text-sm flex items-center justify-center gap-2 shadow-md transition-all"
                  >
                    <Sparkles className="w-4 h-4" />
                    <span>Open Patient Web Portal</span>
                  </button>
                ) : (
                  <div className="py-3 px-4 rounded-2xl bg-slate-100 text-slate-700 text-xs font-bold text-center flex items-center justify-center gap-2">
                    <RefreshCw className="w-3.5 h-3.5 animate-spin text-blue-600" />
                    <span>Processing live workflow...</span>
                  </div>
                )}

              </div>
            </div>

          </div>

          {/* Floating Stats Strip Bar */}
          <div className="mt-14 max-w-6xl mx-auto">
            <div className="il-stats__box">
              <div className="flex items-center gap-4">
                <div className="w-12 h-12 rounded-2xl bg-blue-50 text-blue-600 flex items-center justify-center shrink-0">
                  <Award className="w-6 h-6" />
                </div>
                <div>
                  <h3 className="text-2xl font-black text-slate-900 font-heading">{activeBookingsCount}+</h3>
                  <p className="text-xs font-semibold text-slate-500">Home Visits Completed</p>
                </div>
              </div>

              <div className="flex items-center gap-4">
                <div className="w-12 h-12 rounded-2xl bg-teal-50 text-teal-600 flex items-center justify-center shrink-0">
                  <Users className="w-6 h-6" />
                </div>
                <div>
                  <h3 className="text-2xl font-black text-slate-900 font-heading">124+</h3>
                  <p className="text-xs font-semibold text-slate-500">Certified Doctors & RNs</p>
                </div>
              </div>

              <div className="flex items-center gap-4">
                <div className="w-12 h-12 rounded-2xl bg-indigo-50 text-indigo-600 flex items-center justify-center shrink-0">
                  <Clock className="w-6 h-6" />
                </div>
                <div>
                  <h3 className="text-2xl font-black text-slate-900 font-heading">15 Min</h3>
                  <p className="text-xs font-semibold text-slate-500">Average Clinician Dispatch</p>
                </div>
              </div>

              <div className="flex items-center gap-4">
                <div className="w-12 h-12 rounded-2xl bg-amber-50 text-amber-600 flex items-center justify-center shrink-0">
                  <Star className="w-6 h-6 fill-amber-400" />
                </div>
                <div>
                  <h3 className="text-2xl font-black text-slate-900 font-heading">4.9 / 5</h3>
                  <p className="text-xs font-semibold text-slate-500">Verified Patient Rating</p>
                </div>
              </div>
            </div>
          </div>

        </div>
      </section>

      {/* Auth Modal */}
      <AuthModal
        isOpen={isAuthOpen}
        onClose={() => setIsAuthOpen(false)}
        defaultRole={selectedRole}
      />

      {/* Video / Interactive Care Walkthrough Modal */}
      <VideoDemoModal
        isOpen={isVideoModalOpen}
        onClose={() => setIsVideoModalOpen(false)}
        onBookNow={() => openAuth('PATIENT')}
      />
    </>
  );
}
