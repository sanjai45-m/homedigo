'use client';

import { staffFetch } from '@/lib/staff-client';

import React, { useState, useEffect, useRef } from 'react';
import Link from 'next/link';
import { RevenueSplit } from '@/components/RevenueSplit';
import { HOMEDIGO_REVENUE_PERCENT } from '@/lib/revenue';
import {
  Sparkles,
  TrendingUp,
  DollarSign,
  ShieldAlert,
  UserCheck,
  CreditCard,
  Building,
  ArrowUpRight,
  Activity,
  Layers,
  CheckCircle2,
  Clock,
  RefreshCw,
  Plus
} from 'lucide-react';

export default function SuperAdminDashboardPage() {
  const [stats, setStats] = useState<any>({
    totalAdmins: 0,
    totalPartners: 0,
    totalPatients: 0,
    totalBookings: 0,
    totalGmv: 0,
    totalServices: 5,
    uptime: '99.98%',
  });
  const [billingSummary, setBillingSummary] = useState<any>({
    grossRevenue: 0,
    platformCommission: 0,
    netClinicianPayouts: 0,
    gstTaxCollected: 0,
  });
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const fetching = useRef(false);

  const loadData = async (quiet = false) => {
    if (fetching.current) return;
    fetching.current = true;
    try {
      if (!quiet) setLoading(true);
      const read = async (path: string) => {
        const response = await staffFetch(path, { cache: 'no-store' });
        const data = await response.json();
        if (!response.ok) throw new Error(data.error || 'Dashboard totals could not be loaded. Please retry.');
        return data;
      };
      const [statsRes, billingRes] = await Promise.all([
        read('/api/super-admin/stats'),
        read('/api/super-admin/billing'),
      ]);
      setError('');
      if (statsRes.metrics) setStats(statsRes.metrics);
      if (billingRes.summary) setBillingSummary(billingRes.summary);
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Dashboard totals could not be loaded. Please retry.');
    } finally {
      setLoading(false);
      fetching.current = false;
    }
  };

  useEffect(() => {
    void loadData();
    const refresh = () => { void loadData(true); };
    const timer = setInterval(refresh, 15000);
    window.addEventListener('focus', refresh);
    return () => { clearInterval(timer); window.removeEventListener('focus', refresh); };
  }, []);

  return (
    <div className="p-6 md:p-8 max-w-7xl mx-auto space-y-8 animate-in fade-in duration-200">
      {/* Top Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <div className="flex items-center gap-2">
            <span className="text-xs font-bold uppercase tracking-wider text-purple-700 bg-purple-50 border border-purple-200 px-3 py-0.5 rounded-full">
              Platform Executive Level
            </span>
            <span className="text-xs font-semibold text-emerald-600 bg-emerald-50 px-2.5 py-0.5 rounded-full border border-emerald-200">
              ● All Systems Normal
            </span>
          </div>
          <h1 className="text-3xl font-black font-heading tracking-tight text-slate-900 mt-1">
            Super Admin Executive Cockpit
          </h1>
          <p className="text-xs text-slate-500 font-medium">
            Centralized platform oversight: Operations admin governance, doctor onboarding, billing settlements & {HOMEDIGO_REVENUE_PERCENT}% Homedigo revenue ledger.
          </p>
        </div>

        <div className="flex items-center gap-3">
          <button
            onClick={() => void loadData()}
            className="flex items-center gap-2 px-3.5 py-2.5 rounded-xl bg-white border border-slate-200 hover:bg-slate-50 text-slate-700 text-xs font-bold shadow-2xs transition-all"
          >
            <RefreshCw className={`w-3.5 h-3.5 ${loading ? 'animate-spin text-purple-600' : ''}`} />
            <span>Refresh Telemetry</span>
          </button>
          <Link
            href="/super-admin/admins"
            className="flex items-center gap-2 px-4 py-2.5 rounded-xl bg-gradient-to-r from-purple-600 to-indigo-600 hover:from-purple-700 hover:to-indigo-700 text-white font-bold text-xs shadow-md shadow-indigo-600/20 transition-all"
          >
            <Plus className="w-4 h-4" />
            <span>Create New Admin</span>
          </Link>
        </div>
      </div>

      {/* KPI Cards Strip */}
      {error && <p role="alert" className="rounded-xl bg-red-50 p-4 text-sm text-red-700">{error}</p>}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        {/* Total GMV */}
        <div className="p-6 rounded-3xl bg-white border border-slate-200/80 shadow-xs hover:shadow-md transition-all">
          <div className="flex items-center justify-between text-slate-500 text-xs font-bold">
            <span>Doctor-Verified Payment Amount</span>
            <div className="p-2 rounded-xl bg-emerald-50 text-emerald-600">
              <DollarSign className="w-4 h-4" />
            </div>
          </div>
          <div className="text-2xl font-black text-slate-900 font-heading mt-3">
            ₹{(billingSummary.grossRevenue ?? 0).toLocaleString('en-IN')}
          </div>
          <div className="text-xs text-emerald-600 mt-1.5 flex items-center gap-1 font-semibold">
            <TrendingUp className="w-3.5 h-3.5" />
            <span>Added after doctor payment verification; updates every 15 seconds</span>
          </div>
        </div>

        {/* Homedigo application revenue */}
        <div className="p-6 rounded-3xl bg-white border border-slate-200/80 shadow-xs hover:shadow-md transition-all">
          <div className="flex items-center justify-between text-slate-500 text-xs font-bold">
            <span>Homedigo Revenue ({HOMEDIGO_REVENUE_PERCENT}%)</span>
            <div className="p-2 rounded-xl bg-purple-50 text-purple-600">
              <Sparkles className="w-4 h-4" />
            </div>
          </div>
          <div className="text-2xl font-black text-purple-700 font-heading mt-3">
            ₹{(billingSummary.platformCommission || 0).toLocaleString('en-IN')}
          </div>
          <div className="text-xs text-purple-600 mt-1.5 font-semibold">
            Net HomeDigo Revenue Margin
          </div>
        </div>

        {/* Active Admins */}
        <div className="p-6 rounded-3xl bg-white border border-slate-200/80 shadow-xs hover:shadow-md transition-all">
          <div className="flex items-center justify-between text-slate-500 text-xs font-bold">
            <span>Operations Admins</span>
            <div className="p-2 rounded-xl bg-indigo-50 text-indigo-600">
              <ShieldAlert className="w-4 h-4" />
            </div>
          </div>
          <div className="text-2xl font-black text-slate-900 font-heading mt-3">
            {stats.totalAdmins} <span className="text-xs font-normal text-slate-400">Managers</span>
          </div>
          <div className="text-xs text-indigo-600 mt-1.5 font-semibold">
            Regional Dispatch Authority
          </div>
        </div>

        {/* Registered Doctors */}
        <div className="p-6 rounded-3xl bg-white border border-slate-200/80 shadow-xs hover:shadow-md transition-all">
          <div className="flex items-center justify-between text-slate-500 text-xs font-bold">
            <span>Verified Clinicians</span>
            <div className="p-2 rounded-xl bg-teal-50 text-teal-600">
              <UserCheck className="w-4 h-4" />
            </div>
          </div>
          <div className="text-2xl font-black text-slate-900 font-heading mt-3">
            {stats.totalPartners} <span className="text-xs font-normal text-slate-400">Partners</span>
          </div>
          <div className="text-xs text-teal-600 mt-1.5 font-semibold">
            Medical Council & KYC Verified
          </div>
        </div>
      </div>

      {/* 3 Executive Control Banners */}
      <RevenueSplit total={billingSummary.grossRevenue} homedigo={billingSummary.platformCommission} clinician={billingSummary.netClinicianPayouts} />

      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        {/* Card 1: Admin Governance */}
        <div className="p-6 rounded-3xl bg-gradient-to-br from-indigo-50/70 via-white to-white border border-indigo-200/80 shadow-xs flex flex-col justify-between space-y-4 hover:shadow-md transition-all">
          <div>
            <div className="w-11 h-11 rounded-2xl bg-indigo-600 text-white flex items-center justify-center mb-3 shadow-md shadow-indigo-500/20">
              <ShieldAlert className="w-5 h-5" />
            </div>
            <h3 className="text-lg font-bold text-slate-900 font-heading">Operations Admin Studio</h3>
            <p className="text-xs text-slate-500 leading-relaxed mt-1">
              Create, invite, and manage regional operations admins. Delegate dispatch powers, KYC approvals, and service catalogs.
            </p>
          </div>
          <Link
            href="/super-admin/admins"
            className="inline-flex items-center justify-between px-4 py-2.5 rounded-xl bg-indigo-600 hover:bg-indigo-700 text-white text-xs font-bold transition-all"
          >
            <span>Manage Admin Team</span>
            <ArrowUpRight className="w-4 h-4" />
          </Link>
        </div>

        {/* Card 2: Partner Governance */}
        <div className="p-6 rounded-3xl bg-gradient-to-br from-teal-50/70 via-white to-white border border-teal-200/80 shadow-xs flex flex-col justify-between space-y-4 hover:shadow-md transition-all">
          <div>
            <div className="w-11 h-11 rounded-2xl bg-teal-600 text-white flex items-center justify-center mb-3 shadow-md shadow-teal-500/20">
              <UserCheck className="w-5 h-5" />
            </div>
            <h3 className="text-lg font-bold text-slate-900 font-heading">Global Partner Governance</h3>
            <p className="text-xs text-slate-500 leading-relaxed mt-1">
              Directly onboard doctors, nurses, and physios. Inspect medical council registrations and review the fixed 10% Homedigo revenue split.
            </p>
          </div>
          <Link
            href="/super-admin/partners"
            className="inline-flex items-center justify-between px-4 py-2.5 rounded-xl bg-teal-600 hover:bg-teal-700 text-white text-xs font-bold transition-all"
          >
            <span>Govern Doctor Network</span>
            <ArrowUpRight className="w-4 h-4" />
          </Link>
        </div>

        {/* Card 3: Platform Billing & Settlements */}
        <div className="p-6 rounded-3xl bg-gradient-to-br from-purple-50/70 via-white to-white border border-purple-200/80 shadow-xs flex flex-col justify-between space-y-4 hover:shadow-md transition-all">
          <div>
            <div className="w-11 h-11 rounded-2xl bg-purple-600 text-white flex items-center justify-center mb-3 shadow-md shadow-purple-500/20">
              <CreditCard className="w-5 h-5" />
            </div>
            <h3 className="text-lg font-bold text-slate-900 font-heading">Financial Billing & Payouts</h3>
            <p className="text-xs text-slate-500 leading-relaxed mt-1">
              Audit doctor-verified payments, review invoices, and track the Homedigo and clinician shares of each accepted payment.
            </p>
          </div>
          <Link
            href="/super-admin/billing"
            className="inline-flex items-center justify-between px-4 py-2.5 rounded-xl bg-purple-600 hover:bg-purple-700 text-white text-xs font-bold transition-all"
          >
            <span>Settlement Ledger</span>
            <ArrowUpRight className="w-4 h-4" />
          </Link>
        </div>
      </div>
    </div>
  );
}
