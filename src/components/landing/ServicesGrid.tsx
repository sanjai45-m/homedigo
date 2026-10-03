'use client';

import React, { useState } from 'react';
import { 
  Stethoscope, 
  HeartHandshake, 
  Bandage, 
  Activity, 
  TestTube, 
  Pill, 
  Truck, 
  ArrowRight, 
  Check, 
  Clock, 
  ShieldCheck,
  Calculator,
  Sparkles,
  Percent
} from 'lucide-react';
import AuthModal from '@/components/auth/AuthModal';

export default function ServicesGrid() {
  const [selectedFilter, setSelectedFilter] = useState('ALL');
  const [isAuthOpen, setIsAuthOpen] = useState(false);
  const [packageTier, setPackageTier] = useState<1 | 3 | 5>(1); // 1 visit, 3 visits (10% off), 5 visits (15% off)

  const discountMultiplier = packageTier === 1 ? 1 : packageTier === 3 ? 0.9 : 0.85;

  const services = [
    {
      id: 'doctor-visit',
      category: 'DOCTOR',
      title: 'Doctor Home Visit',
      subtitle: 'Certified General Physicians & Specialists',
      basePrice: 500,
      duration: '45 mins',
      tag: 'Most Popular',
      color: 'from-blue-600 to-indigo-600',
      bgColor: 'bg-blue-50/40',
      borderColor: 'border-blue-200/80 hover:border-blue-400',
      icon: Stethoscope,
      features: [
        'Comprehensive clinical checkup & history intake',
        'Digital prescription with dosage instructions',
        'Geriatric, pediatric & post-op consultations',
      ],
    },
    {
      id: 'nurse-care',
      category: 'NURSING',
      title: 'Home Nursing Care',
      subtitle: 'Registered Nurses for Procedures & Care',
      basePrice: 350,
      duration: '60 mins',
      tag: 'Clinical RNs',
      color: 'from-teal-600 to-emerald-600',
      bgColor: 'bg-teal-50/40',
      borderColor: 'border-teal-200/80 hover:border-teal-400',
      icon: HeartHandshake,
      features: [
        'IV infusion & IM/IV injection administration',
        'Catheterisation & vital biometrics check',
        'Post-surgical bedside recovery & hygiene',
      ],
    },
    {
      id: 'wound-dressing',
      category: 'NURSING',
      title: 'Wound Dressing & Care',
      subtitle: 'Sterile dressing for burns, ulcers & wounds',
      basePrice: 300,
      duration: '30 mins',
      tag: 'Sterile Packs',
      color: 'from-cyan-600 to-blue-600',
      bgColor: 'bg-cyan-50/40',
      borderColor: 'border-cyan-200/80 hover:border-cyan-400',
      icon: Bandage,
      features: [
        'Diabetic foot ulcer dressing & antiseptic wash',
        'Post-operative stitch removal & dressing change',
        'Sterile hospital-grade dressing consumables',
      ],
    },
    {
      id: 'physio',
      category: 'PHYSIO',
      title: 'Physiotherapy & Rehab',
      subtitle: 'Experienced Physiotherapists at Doorstep',
      basePrice: 600,
      duration: '50 mins',
      tag: 'Rehab Specialist',
      color: 'from-amber-500 to-orange-600',
      bgColor: 'bg-amber-50/40',
      borderColor: 'border-amber-200/80 hover:border-amber-400',
      icon: Activity,
      features: [
        'Stroke & neuro rehabilitation therapy',
        'Orthopedic, back & joint pain mobility exercises',
        'Customized home physiotherapy plan',
      ],
    },
    {
      id: 'lab-tests',
      category: 'DIAGNOSTICS',
      title: 'Lab Sample Collection',
      subtitle: 'NABL Certified Diagnostic Blood Tests',
      basePrice: 199,
      duration: '15 mins',
      tag: 'Home Sample',
      color: 'from-indigo-600 to-purple-600',
      bgColor: 'bg-indigo-50/40',
      borderColor: 'border-indigo-200/80 hover:border-indigo-400',
      icon: TestTube,
      features: [
        'Sugar, Lipid, Thyroid & CBC blood profiles',
        '100% sterile vacuum tubes with barcode tracking',
        'Digital PDF report delivery in 12-24 hours',
      ],
    },
    {
      id: 'pharmacy',
      category: 'DIAGNOSTICS',
      title: 'Pharmacy & Medicines',
      subtitle: 'Doorstep Genuine Medicine Delivery',
      basePrice: 0,
      duration: '60 mins',
      tag: 'Express 60m',
      color: 'from-purple-600 to-pink-600',
      bgColor: 'bg-purple-50/40',
      borderColor: 'border-purple-200/80 hover:border-purple-400',
      icon: Pill,
      features: [
        'Prescription upload & pharmacist verification',
        'OTC medicines & first aid consumables',
        '100% genuine sealed medications',
      ],
    },
    {
      id: 'ambulance',
      category: 'EMERGENCY',
      title: 'Ambulance Request',
      subtitle: '24/7 Emergency & Non-Emergency Dispatch',
      basePrice: 1200,
      duration: 'Instant Dispatch',
      tag: '24/7 Priority',
      color: 'from-rose-600 to-red-600',
      bgColor: 'bg-rose-50/40',
      borderColor: 'border-rose-200/80 hover:border-rose-400',
      icon: Truck,
      features: [
        'Basic Life Support (BLS) with Oxygen cylinder',
        'Advanced Life Support (ALS) with Paramedic team',
        'Real-time GPS dispatch & hospital route coordination',
      ],
    },
  ];

  const filterTabs = [
    { id: 'ALL', label: 'All Services' },
    { id: 'DOCTOR', label: 'Doctor Visits' },
    { id: 'NURSING', label: 'Nursing & Dressing' },
    { id: 'PHYSIO', label: 'Physiotherapy' },
    { id: 'DIAGNOSTICS', label: 'Diagnostics & Meds' },
    { id: 'EMERGENCY', label: 'Ambulance' },
  ];

  const filteredServices = selectedFilter === 'ALL'
    ? services
    : services.filter((s) => s.category === selectedFilter);

  return (
    <section id="services" className="py-20 lg:py-28 bg-white relative">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        
        {/* Section Header */}
        <div className="text-center max-w-3xl mx-auto space-y-4 mb-12">
          <div className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-blue-50 border border-blue-200 text-blue-700 text-xs font-bold uppercase tracking-wider">
            <ShieldCheck className="w-3.5 h-3.5" />
            <span>Hospital-Grade At-Home Healthcare</span>
          </div>
          <h2 className="text-3xl sm:text-4xl font-black text-slate-900 tracking-tight font-heading">
            Comprehensive Clinical Suite <br className="hidden sm:block" />
            <span className="bg-gradient-to-r from-blue-600 via-indigo-600 to-teal-500 bg-clip-text text-transparent">
              Tailored to Your Health Needs
            </span>
          </h2>
          <p className="text-slate-600 text-sm sm:text-base font-medium">
            Transparent pricing, certified medical professionals, and customized care session packages.
          </p>
        </div>

        {/* Interactive Controls Bar: Category Filters & Package Discount Selector */}
        <div className="flex flex-col lg:flex-row items-center justify-between gap-6 mb-12 bg-slate-50 p-4 rounded-3xl border border-slate-200/80">
          
          {/* Category Filter Pills */}
          <div className="flex flex-wrap items-center justify-center gap-2">
            {filterTabs.map((tab) => (
              <button
                key={tab.id}
                onClick={() => setSelectedFilter(tab.id)}
                className={`px-3.5 py-2 rounded-xl text-xs font-bold transition-all ${
                  selectedFilter === tab.id
                    ? 'bg-blue-600 text-white shadow-sm shadow-blue-500/20'
                    : 'bg-white hover:bg-slate-200 text-slate-700 border border-slate-200/70'
                }`}
              >
                {tab.label}
              </button>
            ))}
          </div>

          {/* Interactive Package Tier Calculator */}
          <div className="flex items-center gap-2 bg-white px-3 py-1.5 rounded-2xl border border-slate-200/80 shadow-2xs">
            <Calculator className="w-4 h-4 text-teal-600" />
            <span className="text-xs font-bold text-slate-700">Package:</span>
            <div className="flex gap-1">
              {[
                { tier: 1, label: 'Single Visit', discount: '' },
                { tier: 3, label: '3 Visits', discount: '-10%' },
                { tier: 5, label: '5 Visits', discount: '-15%' },
              ].map((p) => (
                <button
                  key={p.tier}
                  onClick={() => setPackageTier(p.tier as any)}
                  className={`px-2.5 py-1 rounded-xl text-xs font-bold transition-all flex items-center gap-1 ${
                    packageTier === p.tier
                      ? 'bg-teal-600 text-white shadow-xs'
                      : 'bg-slate-100 hover:bg-slate-200 text-slate-600'
                  }`}
                >
                  <span>{p.label}</span>
                  {p.discount && (
                    <span className="text-[10px] bg-amber-400 text-slate-900 px-1 rounded font-black">
                      {p.discount}
                    </span>
                  )}
                </button>
              ))}
            </div>
          </div>

        </div>

        {/* Services Cards Grid */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6 lg:gap-8">
          {filteredServices.map((service) => {
            const Icon = service.icon;
            const calculatedTotal = service.basePrice === 0 
              ? 0 
              : Math.round(service.basePrice * packageTier * discountMultiplier);
            const perVisitPrice = service.basePrice === 0 
              ? 'Free Delivery' 
              : `₹${Math.round(calculatedTotal / packageTier)}`;

            return (
              <div
                key={service.id}
                className={`relative rounded-3xl p-6 sm:p-7 border ${service.borderColor} ${service.bgColor} transition-all duration-300 hover:shadow-xl hover:-translate-y-1 flex flex-col justify-between group`}
              >
                <div>
                  {/* Top Icon & Tag */}
                  <div className="flex items-center justify-between mb-5">
                    <div className={`w-12 h-12 rounded-2xl bg-gradient-to-tr ${service.color} text-white flex items-center justify-center shadow-md shadow-blue-500/10 group-hover:scale-110 transition-transform`}>
                      <Icon className="w-6 h-6" />
                    </div>
                    <span className="text-[11px] font-bold px-2.5 py-1 rounded-full bg-white text-slate-700 border border-slate-200 shadow-2xs">
                      {service.tag}
                    </span>
                  </div>

                  {/* Title & Description */}
                  <h3 className="text-xl font-bold text-slate-900 group-hover:text-blue-600 transition-colors font-heading">
                    {service.title}
                  </h3>
                  <p className="text-xs text-slate-500 font-medium mt-1 mb-4">
                    {service.subtitle}
                  </p>

                  {/* Feature Bullets */}
                  <ul className="space-y-2 mb-6">
                    {service.features.map((feat, idx) => (
                      <li key={idx} className="flex items-start gap-2 text-xs font-semibold text-slate-700">
                        <Check className="w-4 h-4 text-emerald-500 shrink-0 mt-0.5" />
                        <span>{feat}</span>
                      </li>
                    ))}
                  </ul>
                </div>

                {/* Bottom Pricing & Dynamic Calculator Display */}
                <div className="pt-4 border-t border-slate-200/60 flex items-center justify-between mt-2">
                  <div>
                    <span className="text-[10px] font-bold text-slate-500 block uppercase tracking-wider">
                      {packageTier > 1 ? `${packageTier}-Visit Bundle (${perVisitPrice}/ea)` : 'Price per visit'}
                    </span>
                    <div className="flex items-baseline gap-1.5">
                      <span className="text-xl font-black text-slate-900 font-heading">
                        {service.basePrice === 0 ? 'Free Delivery' : `₹${calculatedTotal}`}
                      </span>
                      {packageTier > 1 && service.basePrice > 0 && (
                        <span className="text-xs text-slate-400 line-through">
                          ₹{service.basePrice * packageTier}
                        </span>
                      )}
                    </div>
                  </div>

                  <button
                    onClick={() => setIsAuthOpen(true)}
                    className="flex items-center gap-1.5 px-4 py-2.5 rounded-xl bg-white hover:bg-blue-600 text-slate-800 hover:text-white border border-slate-200 hover:border-blue-600 text-xs font-bold transition-all shadow-2xs group-hover:shadow-md"
                  >
                    <span>Book Now</span>
                    <ArrowRight className="w-3.5 h-3.5" />
                  </button>
                </div>
              </div>
            );
          })}
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
