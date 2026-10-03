'use client';

import React, { useState, useEffect } from 'react';
import Link from 'next/link';
import { 
  Calendar, 
  Clock, 
  MapPin, 
  Star, 
  Navigation, 
  CheckCircle2, 
  AlertCircle, 
  PlusCircle, 
  FileText,
  Activity,
  ArrowRight
} from 'lucide-react';

export default function AppointmentsListPage() {
  const [bookings, setBookings] = useState<any[]>([]);
  const [filter, setFilter] = useState<'ALL' | 'ACTIVE' | 'COMPLETED'>('ALL');
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    async function loadBookings() {
      try {
        const res = await fetch('/api/patient/bookings');
        const data = await res.json();
        setBookings(data.bookings || []);
      } catch (err) {
        console.error('Error fetching bookings:', err);
      } finally {
        setLoading(false);
      }
    }
    loadBookings();
  }, []);

  const filteredBookings = filter === 'ALL'
    ? bookings
    : filter === 'ACTIVE'
    ? bookings.filter((b) => b.status !== 'COMPLETED' && b.status !== 'CANCELLED')
    : bookings.filter((b) => b.status === 'COMPLETED');

  return (
    <div className="space-y-8 animate-in fade-in duration-200">
      
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl sm:text-3xl font-black font-heading text-slate-900 tracking-tight">
            My Appointments
          </h1>
          <p className="text-xs sm:text-sm text-slate-500 font-medium">
            Track active clinician visits, view past medical summaries and invoices
          </p>
        </div>

        <Link
          href="/patient/book"
          className="px-5 py-2.5 rounded-2xl bg-teal-700 hover:bg-teal-800 text-white font-bold text-xs flex items-center gap-2 shadow-md shadow-teal-700/20 transition-all hover:scale-105"
        >
          <PlusCircle className="w-4 h-4" />
          <span>Book Visit</span>
        </Link>
      </div>

      {/* Filter Tabs */}
      <div className="flex gap-2 border-b border-slate-200 pb-3">
        {[
          { id: 'ALL', label: 'All Visits' },
          { id: 'ACTIVE', label: 'Active & In-Progress' },
          { id: 'COMPLETED', label: 'Completed' },
        ].map((tab) => (
          <button
            key={tab.id}
            onClick={() => setFilter(tab.id as any)}
            className={`px-4 py-2 rounded-xl text-xs font-bold transition-all ${
              filter === tab.id
                ? 'bg-teal-700 text-white shadow-sm'
                : 'bg-white hover:bg-slate-100 text-slate-600 border border-slate-200'
            }`}
          >
            {tab.label}
          </button>
        ))}
      </div>

      {/* Bookings List */}
      <div className="space-y-4">
        {loading ? (
          <div className="space-y-4 animate-pulse">
            {[1, 2, 3].map((i) => (
              <div key={i} className="bg-white rounded-3xl p-6 border border-slate-200/90 shadow-xs space-y-5">
                <div className="flex items-center justify-between border-b border-slate-100 pb-4">
                  <div className="flex items-center gap-3">
                    <div className="w-36 h-5 bg-slate-200 rounded-lg" />
                    <div className="w-20 h-4 bg-slate-100 rounded-md" />
                  </div>
                  <div className="w-32 h-6 bg-slate-200 rounded-full" />
                </div>
                <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-center">
                  <div className="lg:col-span-4 flex items-center gap-3.5">
                    <div className="w-14 h-14 rounded-2xl bg-slate-200" />
                    <div className="space-y-2">
                      <div className="w-28 h-4 bg-slate-200 rounded-md" />
                      <div className="w-36 h-3 bg-slate-100 rounded-md" />
                    </div>
                  </div>
                  <div className="lg:col-span-5 grid grid-cols-2 gap-2.5">
                    <div className="h-12 bg-slate-50 rounded-xl" />
                    <div className="h-12 bg-slate-50 rounded-xl" />
                  </div>
                  <div className="lg:col-span-3">
                    <div className="h-11 bg-slate-200 rounded-xl" />
                  </div>
                </div>
              </div>
            ))}
          </div>
        ) : filteredBookings.length === 0 ? (
          <div className="p-12 text-center bg-white rounded-3xl border border-slate-200 space-y-3">
            <Calendar className="w-10 h-10 text-slate-300 mx-auto" />
            <h3 className="text-base font-bold text-slate-800">No appointments found</h3>
            <p className="text-xs text-slate-500">Book your first doorstep doctor or nurse visit in under a minute.</p>
            <Link
              href="/patient/book"
              className="inline-flex px-5 py-2.5 rounded-xl bg-teal-700 text-white text-xs font-bold shadow-md hover:bg-teal-800 transition-all"
            >
              Book Now
            </Link>
          </div>
        ) : (
          filteredBookings.map((b) => (
            <div
              key={b.id}
              className="bg-white rounded-3xl p-6 border border-slate-200/90 shadow-sm hover:shadow-md transition-all space-y-5"
            >
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 border-b border-slate-100 pb-4">
                <div className="flex items-center gap-3">
                  <span className="text-sm font-black text-slate-900 font-heading">
                    {b.service_title}
                  </span>
                  <span className="text-xs font-mono text-slate-400 font-semibold">
                    #{b.booking_number}
                  </span>
                </div>

                <span className={`inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-bold ${
                  b.status === 'ON_THE_WAY'
                    ? 'bg-blue-50 text-blue-700 border border-blue-200 animate-pulse'
                    : b.status === 'COMPLETED'
                    ? 'bg-emerald-50 text-emerald-700 border border-emerald-200'
                    : 'bg-amber-50 text-amber-700 border border-amber-200'
                }`}>
                  <Clock className="w-3.5 h-3.5" />
                  <span>
                    {b.status === 'ON_THE_WAY' ? 'Clinician On The Way' : b.status === 'COMPLETED' ? 'Visit Completed' : b.status}
                  </span>
                </span>
              </div>

              <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-center">
                {/* Clinician Card */}
                <div className="lg:col-span-4 flex items-center gap-3.5">
                  <img
                    src={b.partner_img || 'https://images.unsplash.com/photo-1559839734-2b71ea197ec2?auto=format&fit=crop&w=256&q=80'}
                    alt={b.partner_name}
                    className="w-14 h-14 rounded-2xl object-cover ring-2 ring-blue-500/20 shadow-2xs"
                  />
                  <div>
                    <h4 className="text-sm font-bold text-slate-900 font-heading">{b.partner_name}</h4>
                    <p className="text-xs text-slate-500 font-medium">{b.partner_title}</p>
                    <div className="flex items-center gap-1 mt-0.5 text-amber-500 text-xs font-bold">
                      <Star className="w-3.5 h-3.5 fill-amber-400" />
                      <span>{b.partner_rating || 4.9}</span>
                    </div>
                  </div>
                </div>

                {/* Visit Metadata */}
                <div className="lg:col-span-5 grid grid-cols-2 gap-2.5 text-xs">
                  <div className="p-2.5 rounded-xl bg-slate-50 border border-slate-100">
                    <span className="text-[10px] font-bold text-slate-400 uppercase">Patient</span>
                    <p className="font-bold text-slate-800 mt-0.5">{b.patient_name}</p>
                  </div>
                  <div className="p-2.5 rounded-xl bg-slate-50 border border-slate-100">
                    <span className="text-[10px] font-bold text-slate-400 uppercase">Slot</span>
                    <p className="font-bold text-slate-800 mt-0.5">{b.scheduled_date}, {b.scheduled_time_slot}</p>
                  </div>
                </div>

                {/* Action Link */}
                <div className="lg:col-span-3 flex flex-col gap-2">
                  <Link
                    href={`/patient/appointments/${b.id}`}
                    className="w-full py-3 px-4 rounded-xl bg-teal-700 hover:bg-teal-800 text-white font-bold text-xs flex items-center justify-center gap-2 shadow-md shadow-teal-700/20 transition-all hover:scale-102"
                  >
                    <span>{b.status === 'COMPLETED' ? 'View Summary & Rx' : 'Live GPS Tracker'}</span>
                    <ArrowRight className="w-3.5 h-3.5" />
                  </Link>
                </div>
              </div>
            </div>
          ))
        )}
      </div>

    </div>
  );
}
