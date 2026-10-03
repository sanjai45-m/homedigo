'use client';

import React, { useEffect, useState } from 'react';
import Link from 'next/link';
import {
  TrendingUp,
  DollarSign,
  Radio,
  UserCheck,
  CheckCircle2,
  Clock,
  ArrowUpRight,
  Shield,
  Activity,
  Layers,
  RefreshCw
} from 'lucide-react';

export default function AdminDashboardPage() {
  const [metrics, setMetrics] = useState({
    totalBookings: 0,
    activeDispatches: 0,
    completedVisits: 0,
    totalRevenue: 0,
    activePartners: 0,
    totalPartners: 0,
    totalServices: 0,
  });
  const [recentBookings, setRecentBookings] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  const fetchStats = async () => {
    try {
      setLoading(true);
      const [statsRes, dispatchRes] = await Promise.all([
        fetch('/api/admin/stats').then((r) => r.json()),
        fetch('/api/admin/dispatch').then((r) => r.json()),
      ]);

      if (statsRes.metrics) setMetrics(statsRes.metrics);
      if (dispatchRes.bookings) setRecentBookings(dispatchRes.bookings.slice(0, 5));
    } catch (e) {
      console.error(e);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchStats();
  }, []);

  return (
    <div className="p-6 md:p-8 max-w-7xl mx-auto space-y-8 animate-in fade-in duration-200">
      {/* Top Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <div className="flex items-center gap-2">
            <span className="text-xs font-bold uppercase tracking-wider text-amber-800 bg-amber-50 border border-amber-200 px-3 py-0.5 rounded-full">
              Admin Portal
            </span>
            <span className="text-xs font-semibold text-emerald-600 bg-emerald-50 px-2.5 py-0.5 rounded-full border border-emerald-200">
              ● Live System Active
            </span>
          </div>
          <h1 className="text-3xl font-black font-heading tracking-tight text-slate-900 mt-1">
            Admin Dashboard & Control Center
          </h1>
          <p className="text-xs text-slate-500 font-medium">
            Manage clinician dispatching, service pricing, KYC verification, and live bookings.
          </p>
        </div>

        <div className="flex items-center gap-3">
          <button
            onClick={fetchStats}
            className="flex items-center gap-2 px-3.5 py-2.5 rounded-xl bg-white border border-slate-200 hover:bg-slate-50 text-slate-700 text-xs font-bold shadow-2xs transition-all"
          >
            <RefreshCw className={`w-3.5 h-3.5 ${loading ? 'animate-spin text-amber-600' : ''}`} />
            <span>Sync Live Telemetry</span>
          </button>
          <Link
            href="/admin/services"
            className="flex items-center gap-2 px-4 py-2.5 rounded-xl bg-gradient-to-r from-amber-500 to-amber-600 hover:from-amber-600 hover:to-amber-700 text-slate-950 font-bold text-xs shadow-md shadow-amber-500/20 transition-all"
          >
            <DollarSign className="w-4 h-4" />
            <span>Configure Pricing</span>
          </Link>
        </div>
      </div>

      {/* KPI Stats Grid */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        <div className="p-6 rounded-3xl bg-white border border-slate-200/80 shadow-xs hover:shadow-md transition-all">
          <div className="flex items-center justify-between text-slate-500 text-xs font-bold">
            <span>Total Gross Revenue</span>
            <div className="p-2 rounded-xl bg-emerald-50 text-emerald-600">
              <DollarSign className="w-4 h-4" />
            </div>
          </div>
          {loading ? (
            <div className="h-8 w-28 bg-slate-100 animate-pulse rounded-lg mt-3" />
          ) : (
            <div className="text-2xl font-black text-slate-900 font-heading mt-3">
              ₹{metrics.totalRevenue.toLocaleString('en-IN')}
            </div>
          )}
          <div className="text-xs text-emerald-600 mt-1.5 flex items-center gap-1 font-semibold">
            <TrendingUp className="w-3.5 h-3.5" />
            <span>Live DB Telemetry</span>
          </div>
        </div>

        <div className="p-6 rounded-3xl bg-white border border-slate-200/80 shadow-xs hover:shadow-md transition-all">
          <div className="flex items-center justify-between text-slate-500 text-xs font-bold">
            <span>Active Live Dispatches</span>
            <div className="p-2 rounded-xl bg-teal-50 text-teal-600">
              <Radio className="w-4 h-4 animate-pulse" />
            </div>
          </div>
          {loading ? (
            <div className="h-8 w-16 bg-slate-100 animate-pulse rounded-lg mt-3" />
          ) : (
            <div className="text-2xl font-black text-slate-900 font-heading mt-3">
              {metrics.activeDispatches}
            </div>
          )}
          <div className="text-xs text-teal-600 mt-1.5 flex items-center gap-1 font-semibold">
            <Clock className="w-3.5 h-3.5" />
            <span>Real-Time Dispatch</span>
          </div>
        </div>

        <div className="p-6 rounded-3xl bg-white border border-slate-200/80 shadow-xs hover:shadow-md transition-all">
          <div className="flex items-center justify-between text-slate-500 text-xs font-bold">
            <span>Clinicians on Duty</span>
            <div className="p-2 rounded-xl bg-blue-50 text-blue-600">
              <UserCheck className="w-4 h-4" />
            </div>
          </div>
          {loading ? (
            <div className="h-8 w-24 bg-slate-100 animate-pulse rounded-lg mt-3" />
          ) : (
            <div className="text-2xl font-black text-slate-900 font-heading mt-3">
              {metrics.activePartners} <span className="text-xs font-normal text-slate-400">/ {metrics.totalPartners}</span>
            </div>
          )}
          <div className="text-xs text-blue-600 mt-1.5 flex items-center gap-1 font-semibold">
            <CheckCircle2 className="w-3.5 h-3.5" />
            <span>100% KYC Verified</span>
          </div>
        </div>

        <div className="p-6 rounded-3xl bg-white border border-slate-200/80 shadow-xs hover:shadow-md transition-all">
          <div className="flex items-center justify-between text-slate-500 text-xs font-bold">
            <span>Completed Home Visits</span>
            <div className="p-2 rounded-xl bg-purple-50 text-purple-600">
              <CheckCircle2 className="w-4 h-4" />
            </div>
          </div>
          {loading ? (
            <div className="h-8 w-16 bg-slate-100 animate-pulse rounded-lg mt-3" />
          ) : (
            <div className="text-2xl font-black text-slate-900 font-heading mt-3">
              {metrics.completedVisits}
            </div>
          )}
          <div className="text-xs text-purple-600 mt-1.5 flex items-center gap-1 font-semibold">
            <Shield className="w-3.5 h-3.5" />
            <span>Quality Rating Managed</span>
          </div>
        </div>
      </div>

      {/* Quick Operations Row */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Dynamic Services & Pricing Banner */}
        <div className="p-6 rounded-3xl bg-gradient-to-br from-amber-50/70 via-white to-white border border-amber-200/80 shadow-xs flex flex-col justify-between hover:shadow-md transition-all">
          <div>
            <div className="w-11 h-11 rounded-2xl bg-amber-500/20 text-amber-700 flex items-center justify-center mb-3">
              <DollarSign className="w-5 h-5" />
            </div>
            <h3 className="text-lg font-bold text-slate-900 font-heading">Dynamic Pricing & Catalog</h3>
            <p className="text-xs text-slate-500 leading-relaxed mt-1">
              No hardcoded values. Configure doctor visit rates, visiting fees, and platform commission percentages dynamically with instant DB synchronization.
            </p>
          </div>
          <Link
            href="/admin/services"
            className="mt-5 inline-flex items-center justify-between px-4 py-2.5 rounded-xl bg-amber-500 hover:bg-amber-400 text-slate-950 text-xs font-bold transition-all"
          >
            <span>Manage Catalog & Rates</span>
            <ArrowUpRight className="w-4 h-4" />
          </Link>
        </div>

        {/* Doctor & Partner KYC Desk Promo */}
        <div className="p-6 rounded-3xl bg-gradient-to-br from-teal-50/70 via-white to-white border border-teal-200/80 shadow-xs flex flex-col justify-between hover:shadow-md transition-all">
          <div>
            <div className="w-11 h-11 rounded-2xl bg-teal-500/20 text-teal-700 flex items-center justify-center mb-3">
              <UserCheck className="w-5 h-5" />
            </div>
            <h3 className="text-lg font-bold text-slate-900 font-heading">Doctor & Partner KYC Desk</h3>
            <p className="text-xs text-slate-500 leading-relaxed mt-1">
              Onboard new physicians, nurses, and therapists. Verify medical council registrations, approve or reject credentials, and inspect ratings.
            </p>
          </div>
          <Link
            href="/admin/partners"
            className="mt-5 inline-flex items-center justify-between px-4 py-2.5 rounded-xl bg-teal-600 hover:bg-teal-700 text-white text-xs font-bold transition-all"
          >
            <span>Doctor Verification Desk</span>
            <ArrowUpRight className="w-4 h-4" />
          </Link>
        </div>

        {/* Live Dispatch & Reassignment Promo */}
        <div className="p-6 rounded-3xl bg-gradient-to-br from-rose-50/70 via-white to-white border border-rose-200/80 shadow-xs flex flex-col justify-between hover:shadow-md transition-all">
          <div>
            <div className="w-11 h-11 rounded-2xl bg-rose-500/20 text-rose-700 flex items-center justify-center mb-3">
              <Radio className="w-5 h-5" />
            </div>
            <h3 className="text-lg font-bold text-slate-900 font-heading">Live Telemetry & Reassignment</h3>
            <p className="text-xs text-slate-500 leading-relaxed mt-1">
              Monitor active en-route visits, reassign bookings in case of clinician delay, and enforce the 11-step No-Show SLA protocol.
            </p>
          </div>
          <Link
            href="/admin/dispatch"
            className="mt-5 inline-flex items-center justify-between px-4 py-2.5 rounded-xl bg-rose-600 hover:bg-rose-700 text-white text-xs font-bold transition-all"
          >
            <span>Live Dispatch Console</span>
            <ArrowUpRight className="w-4 h-4" />
          </Link>
        </div>
      </div>

      {/* Active Bookings Dispatch Stream */}
      <div className="p-6 rounded-3xl bg-white border border-slate-200/80 shadow-xs space-y-4">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2.5">
            <Activity className="w-5 h-5 text-amber-600" />
            <h2 className="text-lg font-bold text-slate-900 font-heading">Recent Live Dispatches & Bookings</h2>
          </div>
          <Link href="/admin/dispatch" className="text-xs font-bold text-amber-700 hover:underline">
            View All Dispatches &rarr;
          </Link>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs">
            <thead>
              <tr className="border-b border-slate-100 text-slate-400 font-bold uppercase tracking-wider">
                <th className="pb-3">Booking ID</th>
                <th className="pb-3">Patient</th>
                <th className="pb-3">Service</th>
                <th className="pb-3">Assigned Clinician</th>
                <th className="pb-3">Slot</th>
                <th className="pb-3">Status</th>
                <th className="pb-3 text-right">Amount</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100 text-slate-700">
              {recentBookings.length > 0 ? (
                recentBookings.map((b) => (
                  <tr key={b.id} className="hover:bg-slate-50 transition-colors">
                    <td className="py-3 font-mono font-bold text-slate-900">{b.booking_number || b.id}</td>
                    <td className="py-3 font-medium">{b.patient_name}</td>
                    <td className="py-3 text-teal-700 font-bold">{b.service_title}</td>
                    <td className="py-3 text-slate-800">{b.partner_name || 'Auto-assigning...'}</td>
                    <td className="py-3 text-slate-500">{b.scheduled_time_slot}</td>
                    <td className="py-3">
                      <span className={`px-2 py-0.5 rounded-full text-[10px] font-bold ${
                        b.status === 'ON_THE_WAY'
                          ? 'bg-teal-50 text-teal-700 border border-teal-200'
                          : b.status === 'COMPLETED'
                          ? 'bg-purple-50 text-purple-700'
                          : 'bg-amber-50 text-amber-700'
                      }`}>
                        {b.status}
                      </span>
                    </td>
                    <td className="py-3 text-right font-black text-slate-900">₹{b.total_amount}</td>
                  </tr>
                ))
              ) : (
                <tr>
                  <td colSpan={7} className="py-8 text-center text-slate-400">
                    No active dispatches found.
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}
