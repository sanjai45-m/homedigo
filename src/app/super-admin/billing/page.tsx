'use client';

import { staffFetch } from '@/lib/staff-client';

import React, { useState, useEffect, useRef } from 'react';
import {
  CreditCard,
  DollarSign,
  TrendingUp,
  Download,
  CheckCircle2,
  Calendar,
  Building,
  ShieldCheck,
  ArrowUpRight,
  Sparkles,
  Send,
  RefreshCw,
  FileText,
  Loader2
} from 'lucide-react';
import { generateTaxLedgerPdf } from '@/lib/pdf-generator';
import { RevenueSplit } from '@/components/RevenueSplit';
import { formatRevenue, HOMEDIGO_REVENUE_PERCENT, CLINICIAN_REVENUE_PERCENT } from '@/lib/revenue';

interface AppointmentRevenue {
  id: string;
  booking_number: string;
  service_title: string;
  patient_name: string;
  partner_name: string | null;
  payment_status: string;
  status: string;
  grossAmount: number;
  commission: number;
  netPayout: number;
  payment_verified_at: string;
  payment_verified_by: string;
  verified_by_name: string | null;
}

export default function SuperAdminBillingPage() {
  const [summary, setSummary] = useState({
    grossRevenue: 0,
    platformCommission: 0,
    netClinicianPayouts: 0,
    gstTaxCollected: 0,
    successfulPayments: 0,
    totalTransactions: 0,
  });
  const [invoices, setInvoices] = useState<any[]>([]);
  const [appointments, setAppointments] = useState<AppointmentRevenue[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const fetching = useRef(false);

  const fetchBilling = async (quiet = false) => {
    if (fetching.current) return;
    fetching.current = true;
    try {
      if (!quiet) setLoading(true);
      const res = await staffFetch('/api/super-admin/billing', { cache: 'no-store' });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || 'Billing could not be loaded. Please retry.');
      setError('');
      if (data.summary) setSummary(data.summary);
      if (data.invoices) setInvoices(data.invoices);
      if (data.appointments) setAppointments(data.appointments);
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Billing could not be loaded. Please retry.');
    } finally {
      setLoading(false);
      fetching.current = false;
    }
  };

  useEffect(() => {
    void fetchBilling();
    const refresh = () => { void fetchBilling(true); };
    const timer = setInterval(refresh, 15000);
    window.addEventListener('focus', refresh);
    return () => { clearInterval(timer); window.removeEventListener('focus', refresh); };
  }, []);

  return (
    <div className="p-6 md:p-8 max-w-7xl mx-auto space-y-8 animate-in fade-in duration-200">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <div className="flex items-center gap-2">
            <span className="text-xs font-bold uppercase tracking-wider text-purple-700 bg-purple-50 border border-purple-200 px-3 py-0.5 rounded-full">
              Financial Settlements
            </span>
          </div>
          <h1 className="text-3xl font-black font-heading tracking-tight text-slate-900 mt-1">
            Platform Billing & Revenue Settlements
          </h1>
          <p className="text-xs text-slate-500 font-medium">
            Amounts enter this ledger after the doctor verifies payment and accepts the appointment. Verified amounts are split into {HOMEDIGO_REVENUE_PERCENT}% Homedigo revenue and {CLINICIAN_REVENUE_PERCENT}% clinician share.
          </p>
        </div>

        <div className="flex items-center gap-3">
          <button
            onClick={() => void fetchBilling()}
            className="flex items-center gap-2 px-3.5 py-2.5 rounded-xl bg-white border border-slate-200 hover:bg-slate-50 text-slate-700 text-xs font-bold shadow-2xs transition-all"
          >
            <RefreshCw className={`w-3.5 h-3.5 ${loading ? 'animate-spin text-purple-600' : ''}`} />
            <span>Sync Ledger</span>
          </button>
        </div>
      </div>

      {/* Feedback banner */}
      {error && <p role="alert" className="rounded-xl bg-red-50 p-4 text-sm text-red-700">{error}</p>}

      {/* Financial Metrics Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        <div className="p-6 rounded-3xl bg-white border border-slate-200/80 shadow-xs hover:shadow-md transition-all">
          <div className="flex items-center justify-between text-slate-500 text-xs font-bold">
            <span>Doctor-Verified Payment Amount</span>
            <div className="p-2 rounded-xl bg-emerald-50 text-emerald-600">
              <DollarSign className="w-4 h-4" />
            </div>
          </div>
          <div className="text-2xl font-black text-slate-900 font-heading mt-3">
            ₹{formatRevenue(summary.grossRevenue)}
          </div>
          <div className="text-xs text-emerald-600 mt-1 font-semibold">
            {summary.totalTransactions} Appointments · {summary.successfulPayments} Paid
          </div>
        </div>

        <div className="p-6 rounded-3xl bg-white border border-slate-200/80 shadow-xs hover:shadow-md transition-all">
          <div className="flex items-center justify-between text-slate-500 text-xs font-bold">
            <span>Homedigo Revenue ({HOMEDIGO_REVENUE_PERCENT}%)</span>
            <div className="p-2 rounded-xl bg-purple-50 text-purple-600">
              <Sparkles className="w-4 h-4" />
            </div>
          </div>
          <div className="text-2xl font-black text-purple-700 font-heading mt-3">
            ₹{formatRevenue(summary.platformCommission)}
          </div>
          <div className="text-xs text-purple-600 mt-1 font-semibold">
            Application share of each appointment
          </div>
        </div>

        <div className="p-6 rounded-3xl bg-white border border-slate-200/80 shadow-xs hover:shadow-md transition-all">
          <div className="flex items-center justify-between text-slate-500 text-xs font-bold">
            <span>Clinician Share ({CLINICIAN_REVENUE_PERCENT}%)</span>
            <div className="p-2 rounded-xl bg-teal-50 text-teal-600">
              <CreditCard className="w-4 h-4" />
            </div>
          </div>
          <div className="text-2xl font-black text-teal-700 font-heading mt-3">
            ₹{formatRevenue(summary.netClinicianPayouts)}
          </div>
          <div className="text-xs text-teal-600 mt-1 font-semibold">
            Remaining after Homedigo&apos;s share
          </div>
        </div>

        <div className="p-6 rounded-3xl bg-white border border-slate-200/80 shadow-xs hover:shadow-md transition-all">
          <div className="flex items-center justify-between text-slate-500 text-xs font-bold">
            <span>GST Tax Invoiced (18%)</span>
            <div className="p-2 rounded-xl bg-amber-50 text-amber-600">
              <FileText className="w-4 h-4" />
            </div>
          </div>
          <div className="text-2xl font-black text-amber-700 font-heading mt-3">
            ₹{summary.gstTaxCollected.toLocaleString('en-IN')}
          </div>
          <div className="text-xs text-amber-600 mt-1 font-semibold">
            Tax component of verified payments
          </div>
        </div>
      </div>

      <RevenueSplit total={summary.grossRevenue} homedigo={summary.platformCommission} clinician={summary.netClinicianPayouts} />

      <section className="p-6 rounded-3xl bg-white border border-slate-200/80 shadow-xs space-y-4">
        <h2 className="text-lg font-bold text-slate-900">Recent Appointment Revenue Splits</h2>
        <p className="text-xs text-slate-500">Latest 20 doctor-verified payments. Totals include all verified payments and refresh every 15 seconds. Pending payment reviews are excluded.</p>
        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs">
            <thead><tr className="border-b border-slate-100 text-slate-500">
              <th className="pb-3 pr-4">Appointment</th><th className="pb-3 pr-4">Patient / Clinician</th><th className="pb-3 pr-4">Status / Payment</th>
              <th className="pb-3 text-right">Total Amount</th><th className="pb-3 text-right">Homedigo ({HOMEDIGO_REVENUE_PERCENT}%)</th><th className="pb-3 text-right">Clinician ({CLINICIAN_REVENUE_PERCENT}%)</th>
            </tr></thead>
            <tbody className="divide-y divide-slate-100">
              {loading ? <tr><td colSpan={6} className="py-8 text-center text-slate-500">Loading appointment splits...</td></tr> : appointments.length ? appointments.map((appointment) => (
                <tr key={appointment.id}>
                  <td className="py-3 pr-4"><div className="font-bold">{appointment.booking_number || appointment.id}</div><div className="text-slate-500">{appointment.service_title}</div></td>
                  <td className="py-3 pr-4"><div>{appointment.patient_name}</div><div className="text-slate-500">{appointment.partner_name || 'Not assigned'}</div></td>
                  <td className="py-3 pr-4"><div>{appointment.status}</div><div className="text-slate-500">Payment verified by {appointment.verified_by_name || appointment.payment_verified_by}</div><div className="text-slate-500">{new Date(appointment.payment_verified_at).toLocaleString('en-IN', { timeZone: 'Asia/Kolkata' })} IST</div></td>
                  <td className="py-3 text-right font-bold">₹{formatRevenue(appointment.grossAmount)}</td>
                  <td className="py-3 text-right font-bold text-purple-700">₹{formatRevenue(appointment.commission)}</td>
                  <td className="py-3 text-right font-bold text-teal-700">₹{formatRevenue(appointment.netPayout)}</td>
                </tr>
              )) : <tr><td colSpan={6} className="py-8 text-center text-slate-500">No doctor-verified payments yet.</td></tr>}
            </tbody>
          </table>
        </div>
      </section>

      {/* Direct Settlement Gateway Status */}
      <div className="p-6 rounded-3xl bg-white border border-slate-200/80 shadow-xs flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div className="flex items-center gap-4">
          <div className="w-12 h-12 rounded-2xl bg-indigo-50 text-indigo-600 flex items-center justify-center">
            <Building className="w-6 h-6" />
          </div>
          <div>
            <div className="text-xs font-bold text-slate-500 uppercase tracking-wider">Manual Payment Audit</div>
            <div className="text-base font-bold text-slate-900">Doctor-verified UPI receipts</div>
            <div className="text-xs text-emerald-600 font-semibold flex items-center gap-1 mt-0.5">
              <ShieldCheck className="w-3.5 h-3.5" />
              <span>No payment gateway is connected. Recording a payment does not transfer clinician payouts.</span>
            </div>
          </div>
        </div>

        <button
          type="button"
          onClick={() =>
            generateTaxLedgerPdf({
              partnerName: 'Platform Super Admin Audit',
              partnerRole: 'System Billing Administrator',
              bankAccount: 'Manual UPI payments verified by doctors',
              revenueSummary: summary,
              todayEarnings: 0,
              weeklyEarnings: 0,
              monthlyEarnings: 0,
              pendingPayout: 0,
              payouts: invoices.map((inv, idx) => ({
                id: inv.id || `tx_${idx}`,
                date: new Date(inv.created_at || Date.now()).toLocaleDateString('en-IN'),
                bookingId: inv.invoice_number || `HD-${1000 + idx}`,
                service: inv.service_title || 'Healthcare Visit',
                patient: inv.patient_name || 'Patient User',
                grossAmount: inv.grossAmount,
                commission: inv.commission,
                netPayout: inv.netPayout,
                status: 'PAYMENT VERIFIED',
                utr: inv.payment_ref || 'Not provided',
              })),
            })
          }
          className="px-4 py-2.5 rounded-xl border border-slate-200 hover:bg-slate-50 text-slate-700 text-xs font-bold flex items-center gap-2 transition-all self-start sm:self-auto cursor-pointer"
        >
          <Download className="w-4 h-4" />
          <span>Export Tax Audit (PDF)</span>
        </button>
      </div>

      {/* Itemized Invoices Table */}
      <div className="p-6 rounded-3xl bg-white border border-slate-200/80 shadow-xs space-y-4">
        <div className="flex items-center justify-between">
          <h3 className="text-lg font-bold text-slate-900 font-heading">Recent Itemized Tax Invoices</h3>
          <span className="text-xs font-semibold text-slate-500">Live Invoicing Stream</span>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs">
            <thead>
              <tr className="border-b border-slate-100 text-slate-400 font-bold uppercase tracking-wider">
                <th className="pb-3">Invoice Number</th>
                <th className="pb-3">Service</th>
                <th className="pb-3">Payment Ref</th>
                <th className="pb-3 text-right">Subtotal</th>
                <th className="pb-3 text-right">GST (18%)</th>
                <th className="pb-3 text-right">Total Paid</th>
                <th className="pb-3 text-right">Homedigo ({HOMEDIGO_REVENUE_PERCENT}%)</th>
                <th className="pb-3 text-right">Clinician ({CLINICIAN_REVENUE_PERCENT}%)</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100 text-slate-700">
              {invoices.length > 0 ? (
                invoices.map((inv) => (
                  <tr key={inv.id} className="hover:bg-slate-50 transition-colors">
                    <td className="py-3 font-mono font-bold text-slate-900">{inv.invoice_number}</td>
                    <td className="py-3 font-semibold text-indigo-700">{inv.service_title}</td>
                    <td className="py-3 font-mono text-slate-500 text-[11px]">{inv.payment_ref}</td>
                    <td className="py-3 text-right">₹{inv.subtotal}</td>
                    <td className="py-3 text-right text-amber-600">₹{inv.tax_amount}</td>
                    <td className="py-3 text-right font-black text-slate-900">₹{inv.total_paid}</td>
                    <td className="py-3 text-right font-bold text-purple-700">
                      ₹{formatRevenue(inv.commission)}
                    </td>
                    <td className="py-3 text-right font-bold text-teal-700">₹{formatRevenue(inv.netPayout)}</td>
                  </tr>
                ))
              ) : (
                <tr>
                  <td colSpan={8} className="py-8 text-center text-slate-400">
                    No recent invoices recorded in database yet.
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
