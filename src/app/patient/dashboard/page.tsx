'use client';

import React, { useState, useEffect } from 'react';
import Link from 'next/link';
import { useSession } from 'next-auth/react';
import { 
  PlusCircle, 
  Calendar, 
  Clock, 
  MapPin, 
  Star, 
  Navigation, 
  Activity, 
  HeartHandshake, 
  Stethoscope, 
  Bandage, 
  TestTube, 
  Truck, 
  ArrowRight, 
  Users, 
  FileText, 
  ShieldCheck, 
  CheckCircle2,
  Sparkles,
  PhoneCall,
  UserPlus
} from 'lucide-react';

export default function PatientDashboard() {
  const { data: session } = useSession();
  const [bookings, setBookings] = useState<any[]>([]);
  const [profiles, setProfiles] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    async function loadDashboardData() {
      try {
        const userIdParam = session?.user?.email ? `?userId=${encodeURIComponent((session.user as any).id || session.user.email)}` : '';
        const [bkRes, profRes] = await Promise.all([
          fetch(`/api/patient/bookings${userIdParam}`),
          fetch(`/api/patient/profiles${userIdParam}`),
        ]);
        const bkData = await bkRes.json();
        const profData = await profRes.json();
        setBookings(bkData.bookings || []);
        setProfiles(profData.profiles || []);
      } catch (err) {
        console.error('Error loading patient dashboard:', err);
      } finally {
        setLoading(false);
      }
    }
    loadDashboardData();
  }, [session]);

  const liveBooking = bookings.find((b) => b.status === 'ON_THE_WAY' || b.status === 'IN_PROGRESS' || b.status === 'CONFIRMED');

  const quickServices = [
    { title: 'Doctor Visit', price: '₹500', icon: Stethoscope, color: 'bg-teal-700 text-white', link: '/patient/book?service=srv_doc' },
    { title: 'Home Nursing', price: '₹350', icon: HeartHandshake, color: 'bg-teal-600 text-white', link: '/patient/book?service=srv_nurse' },
    { title: 'Wound Dressing', price: '₹300', icon: Bandage, color: 'bg-cyan-700 text-white', link: '/patient/book?service=srv_dressing' },
    { title: 'Physiotherapy', price: '₹600', icon: Activity, color: 'bg-amber-600 text-white', link: '/patient/book?service=srv_physio' },
    { title: 'Blood Test', price: '₹199', icon: TestTube, color: 'bg-indigo-700 text-white', link: '/patient/book?service=srv_lab' },
    { title: 'Ambulance', price: '24/7', icon: Truck, color: 'bg-rose-600 text-white', link: '/patient/book?service=srv_ambulance' },
  ];

  if (loading) {
    return (
      <div className="space-y-8 animate-pulse">
        {/* Welcome Banner Skeleton */}
        <div className="h-44 rounded-3xl bg-slate-200" />

        {/* Live Booking Skeleton */}
        <div className="h-48 rounded-3xl bg-slate-200" />

        {/* Quick Services Skeleton */}
        <div className="space-y-4">
          <div className="h-6 w-48 bg-slate-200 rounded-md" />
          <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-3 sm:gap-4">
            {[1, 2, 3, 4, 5, 6].map((i) => (
              <div key={i} className="h-28 rounded-2xl bg-slate-100" />
            ))}
          </div>
        </div>

        {/* Recent Activity Grid Skeleton */}
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-8">
          <div className="lg:col-span-8 h-64 rounded-3xl bg-slate-100" />
          <div className="lg:col-span-4 h-64 rounded-3xl bg-slate-100" />
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-8 animate-in fade-in duration-300">
      
      {/* Top Welcome Banner */}
      <div className="bg-gradient-to-r from-teal-800 via-teal-700 to-slate-900 rounded-3xl p-6 sm:p-8 text-white shadow-xl shadow-teal-900/10 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-6 relative overflow-hidden">
        <div className="absolute top-0 right-0 w-80 h-80 bg-white/10 rounded-full blur-2xl pointer-events-none"></div>

        <div className="space-y-2 relative z-10">
          <span className="text-[11px] font-bold uppercase tracking-wider bg-white/20 backdrop-blur-md px-3 py-0.5 rounded-full">
            Patient Health Cockpit
          </span>
          <h1 className="text-2xl sm:text-3xl font-black font-heading tracking-tight text-white">
            Welcome back, {session?.user?.name || 'Valued Patient'} 👋
          </h1>
          <p className="text-teal-100 text-xs sm:text-sm max-w-lg font-medium">
            Manage doorstep healthcare appointments, monitor visiting clinicians, and track family medical records with zero hassle.
          </p>
        </div>

        <Link
          href="/patient/book"
          className="relative z-10 px-6 py-3.5 rounded-2xl bg-white hover:bg-teal-50 text-teal-800 font-extrabold text-xs sm:text-sm flex items-center gap-2 shadow-lg transition-all hover:scale-105 active:scale-95 shrink-0"
        >
          <PlusCircle className="w-4 h-4 text-teal-700" />
          <span>Book New Visit</span>
        </Link>
      </div>

      {/* Live Active Booking Card (If available) */}
      {liveBooking && (
        <div className="bg-white rounded-3xl p-6 sm:p-7 border border-teal-200/90 shadow-lg space-y-6 relative overflow-hidden">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 border-b border-slate-100 pb-4">
            <div className="flex items-center gap-2.5">
              <span className="flex h-3 w-3 relative">
                <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-400 opacity-75"></span>
                <span className="relative inline-flex rounded-full h-3 w-3 bg-emerald-500"></span>
              </span>
              <span className="text-sm font-bold text-slate-900 font-heading">
                Active Appointment: #{liveBooking.booking_number}
              </span>
            </div>

            <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-teal-50 text-teal-800 border border-teal-200 text-xs font-bold">
              <Clock className="w-3.5 h-3.5" />
              <span>Status: {liveBooking.status === 'ON_THE_WAY' ? 'Partner On The Way' : liveBooking.status}</span>
            </span>
          </div>

          <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-center">
            {/* Clinician Profile */}
            <div className="lg:col-span-4 flex items-center gap-4">
              <img
                src={liveBooking.partner_img || 'https://images.unsplash.com/photo-1559839734-2b71ea197ec2?auto=format&fit=crop&w=256&q=80'}
                alt={liveBooking.partner_name || 'Clinician'}
                className="w-16 h-16 rounded-2xl object-cover ring-2 ring-teal-500/20 shadow-xs"
              />
              <div>
                <span className="text-[10px] font-bold text-teal-700 uppercase tracking-wider block">
                  {liveBooking.service_title}
                </span>
                <h3 className="text-base font-bold text-slate-900 font-heading">
                  {liveBooking.partner_name || 'Assigned Clinician'}
                </h3>
                <p className="text-xs text-slate-500 font-medium">
                  {liveBooking.partner_title || 'Healthcare Professional'}
                </p>
                <div className="flex items-center gap-1 mt-1 text-amber-500 text-xs font-bold">
                  <Star className="w-3.5 h-3.5 fill-amber-400" />
                  <span>{liveBooking.partner_rating || 5.0}</span>
                  <span className="text-slate-400 text-[10px] font-normal">(Verified Clinician)</span>
                </div>
              </div>
            </div>

            {/* Visit Details */}
            <div className="lg:col-span-5 grid grid-cols-2 gap-3 text-xs">
              <div className="p-3 rounded-2xl bg-slate-50 border border-slate-100">
                <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider block">Patient</span>
                <p className="font-bold text-slate-800 mt-0.5">{liveBooking.patient_name}</p>
              </div>
              <div className="p-3 rounded-2xl bg-slate-50 border border-slate-100">
                <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider block">Schedule Slot</span>
                <p className="font-bold text-slate-800 mt-0.5">{liveBooking.scheduled_date}, {liveBooking.scheduled_time_slot}</p>
              </div>
              <div className="col-span-2 p-3 rounded-2xl bg-slate-50 border border-slate-100">
                <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider block">Destination Address</span>
                <p className="font-semibold text-slate-800 mt-0.5 truncate">{liveBooking.address_text}</p>
              </div>
            </div>

            {/* Track Button */}
            <div className="lg:col-span-3 flex flex-col gap-2">
              <Link
                href={`/patient/appointments/${liveBooking.id}`}
                className="w-full py-3.5 px-4 rounded-2xl bg-gradient-to-r from-teal-700 to-emerald-600 hover:from-teal-800 hover:to-emerald-700 text-white font-bold text-xs sm:text-sm flex items-center justify-center gap-2 shadow-md shadow-teal-700/20 hover:scale-[1.02] transition-all"
              >
                <Navigation className="w-4 h-4" />
                <span>Track Live Telemetry</span>
              </Link>
              <a
                href="tel:+917695964741"
                className="w-full py-2 px-3 rounded-xl border border-slate-200 hover:bg-slate-50 text-slate-700 font-bold text-xs flex items-center justify-center gap-1.5 transition-colors"
              >
                <PhoneCall className="w-3.5 h-3.5 text-teal-700" />
                <span>Call Care Desk</span>
              </a>
            </div>
          </div>
        </div>
      )}

      {/* Quick Services Grid */}
      <div className="space-y-4">
        <div className="flex items-center justify-between">
          <h2 className="text-xl font-bold text-slate-900 font-heading">
            Book Doorstep Clinical Care
          </h2>
          <Link href="/patient/book" className="text-xs font-bold text-teal-700 hover:text-teal-900 flex items-center gap-1">
            <span>View All Services</span>
            <ArrowRight className="w-3.5 h-3.5" />
          </Link>
        </div>

        <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-3 sm:gap-4">
          {quickServices.map((qs, i) => {
            const Icon = qs.icon;
            return (
              <Link
                key={i}
                href={qs.link}
                className="p-4 rounded-2xl bg-white border border-slate-200/80 hover:border-teal-400 hover:shadow-md transition-all duration-200 flex flex-col items-center text-center group"
              >
                <div className={`w-12 h-12 rounded-2xl ${qs.color} flex items-center justify-center shadow-sm mb-3 group-hover:scale-110 transition-transform`}>
                  <Icon className="w-6 h-6" />
                </div>
                <h3 className="text-xs font-bold text-slate-900 group-hover:text-teal-700 font-heading">
                  {qs.title}
                </h3>
                <span className="text-[11px] font-black text-slate-500 mt-1">
                  {qs.price}
                </span>
              </Link>
            );
          })}
        </div>
      </div>

      {/* Bottom 2-Column: Family Profiles & Recent Activity */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-8">
        
        {/* Family Health Profiles */}
        <div className="lg:col-span-6 space-y-4">
          <div className="flex items-center justify-between">
            <h2 className="text-lg font-bold text-slate-900 font-heading flex items-center gap-2">
              <Users className="w-5 h-5 text-teal-700" />
              <span>Family Health Accounts</span>
            </h2>
            <Link href="/patient/family" className="text-xs font-bold text-teal-700 hover:text-teal-900">
              Manage (+ Add)
            </Link>
          </div>

          <div className="space-y-3">
            {profiles.length > 0 ? (
              profiles.map((prof) => (
                <div
                  key={prof.id}
                  className="p-4 rounded-2xl bg-white border border-slate-200/80 shadow-2xs flex items-center justify-between"
                >
                  <div className="flex items-center gap-3.5">
                    <div className="w-10 h-10 rounded-xl bg-teal-50 text-teal-700 flex items-center justify-center font-bold text-sm">
                      {prof.full_name.charAt(0)}
                    </div>
                    <div>
                      <div className="flex items-center gap-2">
                        <h4 className="text-sm font-bold text-slate-900 font-heading">{prof.full_name}</h4>
                        <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-slate-100 text-slate-600">
                          {prof.relationship}
                        </span>
                      </div>
                      <p className="text-xs text-slate-500 font-medium mt-0.5">
                        {prof.age} yrs · {prof.blood_group || 'Blood group not set'}
                      </p>
                    </div>
                  </div>

                  <Link
                    href={`/patient/book?patientId=${prof.id}`}
                    className="px-3 py-1.5 rounded-xl border border-teal-200 text-teal-700 hover:bg-teal-50 font-bold text-xs transition-colors"
                  >
                    Book Care
                  </Link>
                </div>
              ))
            ) : (
              <div className="p-6 rounded-2xl bg-white border border-slate-200/80 text-center space-y-3">
                <div className="w-10 h-10 rounded-xl bg-teal-50 text-teal-700 mx-auto flex items-center justify-center">
                  <UserPlus className="w-5 h-5" />
                </div>
                <div>
                  <h4 className="text-xs font-bold text-slate-800">No Family Profiles Created</h4>
                  <p className="text-[11px] text-slate-500 mt-0.5">Add yourself or family members for personalized care.</p>
                </div>
                <Link
                  href="/patient/family"
                  className="inline-flex items-center gap-1.5 px-3.5 py-1.5 rounded-xl bg-teal-700 hover:bg-teal-800 text-white font-bold text-xs shadow-xs"
                >
                  <PlusCircle className="w-3.5 h-3.5" />
                  <span>Add Family Member</span>
                </Link>
              </div>
            )}
          </div>
        </div>

        {/* Recent Past Visits & Invoices */}
        <div className="lg:col-span-6 space-y-4">
          <div className="flex items-center justify-between">
            <h2 className="text-lg font-bold text-slate-900 font-heading flex items-center gap-2">
              <FileText className="w-5 h-5 text-teal-600" />
              <span>Past Visits & Medical Summaries</span>
            </h2>
            <Link href="/patient/appointments" className="text-xs font-bold text-teal-700 hover:text-teal-900">
              All Visits
            </Link>
          </div>

          <div className="space-y-3">
            {bookings.filter((b) => b.status === 'COMPLETED').length > 0 ? (
              bookings
                .filter((b) => b.status === 'COMPLETED')
                .slice(0, 2)
                .map((b) => (
                  <div
                    key={b.id}
                    className="p-4 rounded-2xl bg-white border border-slate-200/80 shadow-2xs space-y-3"
                  >
                    <div className="flex items-center justify-between">
                      <div>
                        <h4 className="text-sm font-bold text-slate-900 font-heading">{b.service_title}</h4>
                        <p className="text-xs text-slate-500">By {b.partner_name} · {b.scheduled_date}</p>
                      </div>
                      <span className="text-xs font-bold px-2.5 py-1 rounded-full bg-emerald-50 text-emerald-700 border border-emerald-200">
                        ✓ Completed
                      </span>
                    </div>

                    {b.vital_bp && (
                      <div className="p-2.5 rounded-xl bg-slate-50 text-xs text-slate-700 flex items-center justify-between">
                        <span className="font-semibold">Vitals Recorded:</span>
                        <span className="font-mono text-slate-900 font-bold">BP: {b.vital_bp} · SpO2: {b.vital_spo2}</span>
                      </div>
                    )}

                    <div className="flex items-center justify-between pt-1 border-t border-slate-100 text-xs">
                      <span className="font-black text-slate-900">₹{b.total_amount} Paid</span>
                      <Link
                        href={`/patient/appointments/${b.id}`}
                        className="text-teal-700 font-bold hover:underline"
                      >
                        View Digital Summary & Receipt →
                      </Link>
                    </div>
                  </div>
                ))
            ) : (
              <div className="p-6 rounded-2xl bg-white border border-slate-200/80 text-center space-y-2">
                <Calendar className="w-8 h-8 text-slate-400 mx-auto" />
                <h4 className="text-xs font-bold text-slate-800">No Past Visit History</h4>
                <p className="text-[11px] text-slate-500">Completed consultations and medical summaries will appear here.</p>
              </div>
            )}
          </div>
        </div>

      </div>

    </div>
  );
}
