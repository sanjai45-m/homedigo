'use client';

import React, { useState, useEffect } from 'react';
import Link from 'next/link';
import {
  Calendar,
  Navigation,
  CheckCircle2,
  Clock,
  MapPin,
  ArrowRight,
  TrendingUp,
  DollarSign,
  Activity,
  ShieldCheck,
  Stethoscope,
  ChevronRight,
  Sparkles,
  Loader2,
  Radio,
  Users,
} from 'lucide-react';

// Shimmer skeleton component
function Shimmer({ className }: { className?: string }) {
  return (
    <div
      className={`bg-gradient-to-r from-slate-200 via-slate-100 to-slate-200 bg-[length:400%_100%] animate-[shimmer_1.5s_ease-in-out_infinite] rounded-2xl ${className}`}
    />
  );
}

const statusColors: Record<string, string> = {
  COMPLETED: 'bg-purple-100 text-purple-800 border-purple-200',
  ON_THE_WAY: 'bg-teal-100 text-teal-800 border-teal-200',
  IN_PROGRESS: 'bg-amber-100 text-amber-800 border-amber-200',
  ASSIGNED: 'bg-blue-100 text-blue-800 border-blue-200',
  ARRIVED: 'bg-emerald-100 text-emerald-800 border-emerald-200',
  CONFIRMED: 'bg-slate-100 text-slate-800 border-slate-200',
  PENDING: 'bg-orange-100 text-orange-800 border-orange-200',
};

export default function PartnerDashboardPage() {
  const [partner, setPartner] = useState<any>(null);
  const [visits, setVisits] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [filter, setFilter] = useState<'ALL' | 'ACTIVE' | 'COMPLETED'>('ALL');

  const fetchDashboard = async () => {
    try {
      setLoading(true);
      const res = await fetch('/api/pro/dashboard');
      const data = await res.json();
      if (data.partner) setPartner(data.partner);
      if (data.visits) setVisits(data.visits);
    } catch (e) {
      console.error(e);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchDashboard();
  }, []);

  const activeVisits = visits.filter((v) =>
    ['ON_THE_WAY', 'ASSIGNED', 'IN_PROGRESS', 'ARRIVED'].includes(v.status)
  );
  const completedVisits = visits.filter((v) => v.status === 'COMPLETED');
  const displayedVisits =
    filter === 'ALL'
      ? visits
      : filter === 'ACTIVE'
      ? activeVisits
      : completedVisits;

  const activeVisit = activeVisits[0]; // primary active visit for banner

  return (
    <div className="p-6 md:p-10 max-w-7xl mx-auto space-y-8 animate-fadeIn">
      <style>{`
        @keyframes shimmer {
          0% { background-position: 100% 50%; }
          100% { background-position: -100% 50%; }
        }
      `}</style>

      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-teal-50 border border-teal-200 text-teal-700 text-xs font-semibold mb-2">
            <Sparkles className="w-3.5 h-3.5" />
            <span>Field Operations Cockpit</span>
          </div>
          <h1 className="text-2xl md:text-3xl font-extrabold text-slate-900 tracking-tight flex items-center gap-3">
            <span>Clinician Field Cockpit</span>
            <span className="px-2.5 py-0.5 rounded-full text-xs font-semibold bg-emerald-100 text-emerald-800 border border-emerald-200">
              Shift Active
            </span>
          </h1>
          <p className="text-slate-500 text-sm mt-1">
            Welcome back,{' '}
            <strong className="text-slate-800">{partner?.name || 'Clinician'}</strong>. Manage
            your doorstep home visits and clinical telemetry.
          </p>
        </div>

        <button
          onClick={fetchDashboard}
          className="flex items-center gap-2 px-4 py-2.5 rounded-xl bg-white hover:bg-slate-50 text-teal-700 font-bold text-xs border border-slate-200 shadow-xs hover:shadow-sm transition-all"
        >
          <Radio className="w-4 h-4 text-teal-600" />
          <span>Refresh Queue</span>
        </button>
      </div>

      {/* KPI Cards */}
      {loading ? (
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-6">
          {[1, 2, 3].map((i) => (
            <Shimmer key={i} className="h-32" />
          ))}
        </div>
      ) : (
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-6">
          {/* Active Now */}
          <div className="p-6 rounded-3xl bg-white border border-slate-200/80 shadow-xs hover:shadow-md transition-all">
            <div className="flex items-center justify-between text-slate-500 text-xs font-semibold uppercase tracking-wider">
              <span>Active Visits Now</span>
              <div className="p-2.5 rounded-xl bg-teal-50 text-teal-600 border border-teal-100">
                <Radio className="w-4 h-4" />
              </div>
            </div>
            <div className="text-3xl font-extrabold text-slate-900 mt-3">
              {activeVisits.length}{' '}
              <span className="text-sm font-semibold text-slate-400">En-Route / In-Progress</span>
            </div>
            <div className="text-xs text-teal-700 mt-1 font-semibold">
              {activeVisit ? `#${activeVisit.booking_number} currently active` : 'No active visit right now'}
            </div>
          </div>

          {/* Total Visits */}
          <div className="p-6 rounded-3xl bg-white border border-slate-200/80 shadow-xs hover:shadow-md transition-all">
            <div className="flex items-center justify-between text-slate-500 text-xs font-semibold uppercase tracking-wider">
              <span>Total Assigned Visits</span>
              <div className="p-2.5 rounded-xl bg-blue-50 text-blue-600 border border-blue-100">
                <Calendar className="w-4 h-4" />
              </div>
            </div>
            <div className="text-3xl font-extrabold text-slate-900 mt-3">
              {visits.length}{' '}
              <span className="text-sm font-semibold text-slate-400">Patients</span>
            </div>
            <div className="text-xs text-blue-700 mt-1 font-semibold">
              {activeVisits.length} active · {completedVisits.length} completed
            </div>
          </div>

          {/* Completed */}
          <div className="p-6 rounded-3xl bg-white border border-slate-200/80 shadow-xs hover:shadow-md transition-all">
            <div className="flex items-center justify-between text-slate-500 text-xs font-semibold uppercase tracking-wider">
              <span>Completed Visits</span>
              <div className="p-2.5 rounded-xl bg-purple-50 text-purple-600 border border-purple-100">
                <CheckCircle2 className="w-4 h-4" />
              </div>
            </div>
            <div className="text-3xl font-extrabold text-slate-900 mt-3">
              {completedVisits.length}{' '}
              <span className="text-sm font-semibold text-slate-400">Done</span>
            </div>
            <div className="text-xs text-purple-700 mt-1 font-semibold">
              {partner?.completed_visits
                ? `${partner.completed_visits} lifetime visits`
                : 'Keep up the great work!'}
            </div>
          </div>
        </div>
      )}

      {/* Active En-Route Callout Banner */}
      {!loading && activeVisit && (
        <div className="p-6 md:p-8 rounded-3xl bg-gradient-to-r from-teal-600 via-teal-700 to-emerald-700 text-white shadow-xl shadow-teal-700/10 relative overflow-hidden">
          <div className="flex flex-col md:flex-row md:items-center justify-between gap-6 relative z-10">
            <div className="space-y-2">
              <div className="flex items-center gap-2">
                <span className="w-2.5 h-2.5 rounded-full bg-white animate-ping" />
                <span className="text-xs font-bold uppercase tracking-wider text-teal-100">
                  Current Active Visit — En Route Now
                </span>
                <span className="text-xs font-mono font-bold text-teal-900 bg-teal-100 px-2.5 py-0.5 rounded-md">
                  {activeVisit.booking_number}
                </span>
              </div>
              <h2 className="text-2xl font-extrabold text-white">{activeVisit.service_title}</h2>
              <div className="flex flex-wrap items-center gap-4 text-xs text-teal-100 font-medium">
                <div className="flex items-center gap-1.5">
                  <MapPin className="w-4 h-4 text-rose-300" />
                  <span>{activeVisit.address_text}</span>
                </div>
                <div className="flex items-center gap-1.5">
                  <Clock className="w-4 h-4 text-teal-200" />
                  <span>Slot: {activeVisit.scheduled_time_slot}</span>
                </div>
              </div>
            </div>

            <Link
              href={`/partner/visit/${activeVisit.id}`}
              className="inline-flex items-center justify-center gap-2 px-6 py-3.5 rounded-2xl bg-white hover:bg-teal-50 text-teal-900 font-bold text-sm shadow-md shrink-0 transition-all transform hover:-translate-y-0.5"
            >
              <Navigation className="w-4 h-4 text-teal-700" />
              <span>Launch Live Visit Cockpit</span>
              <ArrowRight className="w-4 h-4 text-teal-700" />
            </Link>
          </div>
        </div>
      )}

      {/* Today's Full Queue */}
      <div className="p-6 md:p-8 rounded-3xl bg-white border border-slate-200/80 shadow-xs space-y-6">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
          <h3 className="text-lg font-bold text-slate-900 flex items-center gap-2">
            <Calendar className="w-5 h-5 text-teal-600" />
            <span>All Assigned Patients Queue</span>
          </h3>

          {/* Filter tabs */}
          <div className="flex gap-1.5 p-1 bg-slate-100 rounded-xl text-xs font-bold">
            {(['ALL', 'ACTIVE', 'COMPLETED'] as const).map((f) => (
              <button
                key={f}
                onClick={() => setFilter(f)}
                className={`px-3 py-1.5 rounded-lg transition-all ${
                  filter === f
                    ? 'bg-white text-teal-700 shadow-xs'
                    : 'text-slate-500 hover:text-slate-700'
                }`}
              >
                {f === 'ALL'
                  ? `All (${visits.length})`
                  : f === 'ACTIVE'
                  ? `Active (${activeVisits.length})`
                  : `Done (${completedVisits.length})`}
              </button>
            ))}
          </div>
        </div>

        {loading ? (
          <div className="space-y-3">
            {[1, 2, 3].map((i) => (
              <Shimmer key={i} className="h-20" />
            ))}
          </div>
        ) : displayedVisits.length === 0 ? (
          <div className="py-12 text-center text-slate-400">
            <Users className="w-10 h-10 mx-auto mb-3 text-slate-300" />
            <p className="font-semibold text-sm">No visits in this category</p>
            <p className="text-xs mt-1">Check with Admin if you're expecting assignments.</p>
          </div>
        ) : (
          <div className="divide-y divide-slate-100">
            {displayedVisits.map((v) => (
              <div
                key={v.id}
                className="py-4 flex flex-col sm:flex-row sm:items-center justify-between gap-4 hover:bg-slate-50/60 rounded-2xl px-2 transition-colors"
              >
                <div className="space-y-1">
                  <div className="flex items-center gap-2 flex-wrap">
                    <span className="text-xs font-mono font-bold text-teal-700 bg-teal-50 px-2 py-0.5 rounded border border-teal-100">
                      {v.booking_number || v.id}
                    </span>
                    <span
                      className={`px-2.5 py-0.5 rounded-full text-[11px] font-bold border ${
                        statusColors[v.status] || 'bg-slate-100 text-slate-700 border-slate-200'
                      }`}
                    >
                      {v.status.replace(/_/g, ' ')}
                    </span>
                    {(v.status === 'ON_THE_WAY' || v.status === 'IN_PROGRESS') && (
                      <span className="text-[10px] font-bold text-teal-600 flex items-center gap-1">
                        <span className="w-1.5 h-1.5 rounded-full bg-teal-500 animate-ping inline-block" />
                        LIVE
                      </span>
                    )}
                  </div>
                  <h4 className="text-sm font-bold text-slate-900">{v.service_title}</h4>
                  <p className="text-xs text-slate-500">
                    Patient: <strong className="text-slate-800">{v.patient_name}</strong> ·{' '}
                    {v.address_text}
                  </p>
                  {v.vital_bp && (
                    <div className="text-[11px] text-teal-700 font-mono mt-1 bg-teal-50/70 p-1.5 rounded-lg border border-teal-100 inline-block">
                      Vitals: BP {v.vital_bp} | Pulse {v.vital_pulse} | SpO2 {v.vital_spo2} |
                      Sugar {v.vital_sugar}
                    </div>
                  )}
                </div>

                <div className="flex items-center gap-3 shrink-0">
                  <div className="text-right">
                    <div className="text-xs text-slate-500">{v.scheduled_time_slot}</div>
                    <div className="text-base font-extrabold text-slate-900">
                      ₹{v.total_amount}
                    </div>
                  </div>
                  <Link
                    href={`/partner/visit/${v.id}`}
                    className="p-2.5 rounded-xl bg-slate-100 hover:bg-teal-50 text-slate-600 hover:text-teal-700 transition-colors"
                    title="Open Visit Cockpit"
                  >
                    <ChevronRight className="w-4 h-4" />
                  </Link>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
