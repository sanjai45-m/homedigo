'use client';

import { HOMEDIGO_REVENUE_PERCENT, CLINICIAN_REVENUE_PERCENT } from '@/lib/revenue';

import React, { useState, useEffect } from 'react';
import {
  DollarSign,
  TrendingUp,
  Download,
  CheckCircle2,
  Calendar,
  CreditCard,
  Building,
  ShieldCheck,
  ArrowUpRight,
  Sparkles,
  Loader2,
  Receipt,
  FileText,
  PieChart,
} from 'lucide-react';

import { generateTaxLedgerPdf } from '@/lib/pdf-generator';

export default function PartnerEarningsPage() {
  const [partnerName, setPartnerName] = useState('Clinician Partner');
  const [loading, setLoading] = useState(true);
  const [earnings, setEarnings] = useState({
    todayEarnings: 0,
    grossVolume: 0,
    platformFeePaid: 0,
    settledEarnings: 0,
    pendingPayout: 0,
    nextPayoutDate: 'Monday, 10:00 AM',
  });

  const [payouts, setPayouts] = useState<any[]>([]);

  const fetchEarnings = async () => {
    try {
      setLoading(true);
      const res = await fetch('/api/pro/earnings');
      const data = await res.json();
      if (data.earnings) {
        setEarnings(data.earnings);
      }
      if (data.payouts) {
        setPayouts(data.payouts);
      }
      if (data.partnerName) {
        setPartnerName(data.partnerName);
      }
    } catch (err) {
      console.error('Failed to load partner earnings:', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchEarnings();
  }, []);

  const handleDownloadLedger = () => {
    generateTaxLedgerPdf({
      partnerName: partnerName,
      partnerRole: 'Attending Physician & Healthcare Partner',
      bankAccount: 'HDFC Bank · Direct Settlement Account',
      todayEarnings: earnings.todayEarnings,
      weeklyEarnings: earnings.settledEarnings,
      monthlyEarnings: earnings.grossVolume,
      pendingPayout: earnings.pendingPayout,
      payouts: payouts,
    });
  };

  return (
    <div className="p-6 md:p-10 max-w-7xl mx-auto space-y-8 animate-fadeIn">
      {/* Top Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-emerald-50 border border-emerald-200 text-emerald-800 text-xs font-semibold mb-2">
            <Sparkles className="w-3.5 h-3.5 text-emerald-600" />
            <span>Direct Payout Settlements</span>
          </div>
          <h1 className="text-2xl md:text-3xl font-extrabold text-slate-900 tracking-tight flex items-center gap-3">
            <DollarSign className="w-8 h-8 text-emerald-600" />
            <span>Earnings & Payout Ledger</span>
          </h1>
          <p className="text-slate-500 text-sm mt-1">
            Real-time per-visit revenue splits, automatic {HOMEDIGO_REVENUE_PERCENT}% platform commission deductions, and instant bank transfers.
          </p>
        </div>

        <button
          type="button"
          onClick={handleDownloadLedger}
          className="flex items-center gap-2 px-4 py-2.5 rounded-xl bg-white hover:bg-slate-50 text-slate-700 text-xs font-bold border border-slate-200 shadow-xs hover:shadow-sm transition-all cursor-pointer"
        >
          <Download className="w-4 h-4 text-slate-500" />
          <span>Download Tax Ledger (PDF)</span>
        </button>
      </div>

      {/* Loading Skeleton vs Real Distinct KPI Cards */}
      {loading ? (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6 animate-pulse">
          {[1, 2, 3, 4].map((i) => (
            <div key={i} className="p-6 rounded-3xl bg-white border border-slate-200 space-y-3">
              <div className="w-24 h-4 bg-slate-200 rounded" />
              <div className="w-32 h-8 bg-slate-300 rounded" />
              <div className="w-20 h-3 bg-slate-100 rounded" />
            </div>
          ))}
        </div>
      ) : (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6">
          {/* Card 1: Today Net Take Home */}
          <div className="p-6 rounded-3xl bg-white border border-slate-200/80 shadow-xs hover:shadow-md transition-all">
            <div className="flex items-center justify-between text-slate-500 text-xs font-semibold uppercase tracking-wider">
              <span>Today's Net Take-Home</span>
              <div className="p-2 rounded-xl bg-emerald-50 text-emerald-600">
                <DollarSign className="w-4 h-4" />
              </div>
            </div>
            <div className="text-3xl font-extrabold text-emerald-600 mt-3">
              ₹{earnings.todayEarnings.toLocaleString('en-IN')}
            </div>
            <div className="text-[11px] text-slate-400 mt-1 font-medium">Net {CLINICIAN_REVENUE_PERCENT}% after {HOMEDIGO_REVENUE_PERCENT}% platform fee</div>
          </div>

          {/* Card 2: Gross Consultation Volume */}
          <div className="p-6 rounded-3xl bg-white border border-slate-200/80 shadow-xs hover:shadow-md transition-all">
            <div className="flex items-center justify-between text-slate-500 text-xs font-semibold uppercase tracking-wider">
              <span>Gross Consult Volume</span>
              <div className="p-2 rounded-xl bg-blue-50 text-blue-600">
                <TrendingUp className="w-4 h-4" />
              </div>
            </div>
            <div className="text-3xl font-extrabold text-slate-900 mt-3">
              ₹{earnings.grossVolume.toLocaleString('en-IN')}
            </div>
            <div className="text-[11px] text-blue-700 mt-1 font-semibold flex items-center gap-1">
              <span>Total patient fees collected</span>
            </div>
          </div>

          {/* Card 3: Platform Fee Paid ({HOMEDIGO_REVENUE_PERCENT}%) */}
          <div className="p-6 rounded-3xl bg-white border border-slate-200/80 shadow-xs hover:shadow-md transition-all">
            <div className="flex items-center justify-between text-slate-500 text-xs font-semibold uppercase tracking-wider">
              <span>Platform Fee ({HOMEDIGO_REVENUE_PERCENT}%)</span>
              <div className="p-2 rounded-xl bg-rose-50 text-rose-600">
                <PieChart className="w-4 h-4" />
              </div>
            </div>
            <div className="text-3xl font-extrabold text-rose-600 mt-3">
              -₹{earnings.platformFeePaid.toLocaleString('en-IN')}
            </div>
            <div className="text-[11px] text-slate-400 mt-1 font-medium">HomeDigo network operational cut</div>
          </div>

          {/* Card 4: Net Disbursed Payout */}
          <div className="p-6 rounded-3xl bg-gradient-to-br from-teal-500/10 via-teal-50/50 to-white border border-teal-200/80 shadow-xs">
            <div className="flex items-center justify-between text-teal-800 text-xs font-bold uppercase tracking-wider">
              <span>Net Bank Disbursal</span>
              <div className="p-2 rounded-xl bg-teal-100 text-teal-700">
                <CreditCard className="w-4 h-4" />
              </div>
            </div>
            <div className="text-3xl font-extrabold text-teal-700 mt-3">
              ₹{earnings.settledEarnings.toLocaleString('en-IN')}
            </div>
            <div className="text-[11px] text-slate-600 mt-1 font-medium">Settled to HDFC Bank A/C</div>
          </div>
        </div>
      )}

      {/* Linked Bank Account Card */}
      <div className="p-6 md:p-8 rounded-3xl bg-white border border-slate-200/80 shadow-xs flex flex-col sm:flex-row sm:items-center justify-between gap-6">
        <div className="flex items-center gap-4">
          <div className="w-14 h-14 rounded-2xl bg-teal-50 border border-teal-100 flex items-center justify-center text-teal-600 shrink-0">
            <Building className="w-7 h-7" />
          </div>
          <div>
            <div className="text-xs text-slate-400 font-semibold uppercase tracking-wider">Linked Direct Settlement Account</div>
            <div className="text-lg font-bold text-slate-900">HDFC Bank · A/C Ending in **8492</div>
            <div className="text-xs text-emerald-700 font-mono flex items-center gap-1.5 mt-1 font-semibold">
              <ShieldCheck className="w-4 h-4 text-emerald-600" />
              <span>IFSC: HDFC0001234 · Direct NEFT/IMPS Active</span>
            </div>
          </div>
        </div>

        <div className="px-4 py-2 rounded-xl bg-emerald-50 text-emerald-800 border border-emerald-200 text-xs font-bold self-start sm:self-auto">
          Instant Daily Settlements Enabled
        </div>
      </div>

      {/* Settlement Breakdown Table */}
      <div className="p-6 md:p-8 rounded-3xl bg-white border border-slate-200/80 shadow-xs space-y-6">
        <div className="flex items-center justify-between">
          <h3 className="text-lg font-bold text-slate-900">Recent Visit Settlements Ledger</h3>
          <span className="text-xs text-slate-500 font-semibold">
            {payouts.length} Visit Transactions Recorded
          </span>
        </div>

        {loading ? (
          <div className="p-8 text-center text-slate-400 font-semibold flex items-center justify-center gap-2">
            <Loader2 className="w-5 h-5 animate-spin text-teal-600" />
            <span>Loading earnings ledger from Neon DB...</span>
          </div>
        ) : payouts.length === 0 ? (
          <div className="p-12 text-center text-slate-400 space-y-2 border border-dashed border-slate-200 rounded-2xl">
            <Receipt className="w-10 h-10 text-slate-300 mx-auto" />
            <div className="text-sm font-bold text-slate-700">No Visit Earnings Recorded Yet</div>
            <div className="text-xs text-slate-500">Earnings will automatically appear as you complete patient visits.</div>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs">
              <thead>
                <tr className="border-b border-slate-100 text-slate-400 font-semibold uppercase tracking-wider">
                  <th className="pb-3.5">Date & Time</th>
                  <th className="pb-3.5">Booking ID</th>
                  <th className="pb-3.5">Service & Patient</th>
                  <th className="pb-3.5 text-right">Gross Amount</th>
                  <th className="pb-3.5 text-right">Platform Fee ({HOMEDIGO_REVENUE_PERCENT}%)</th>
                  <th className="pb-3.5 text-right">Net Payout</th>
                  <th className="pb-3.5 text-right">Status</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 text-slate-700">
                {payouts.map((tx) => (
                  <tr key={tx.id} className="hover:bg-slate-50/70 transition-colors">
                    <td className="py-3.5 text-slate-500 font-medium">{tx.date}</td>
                    <td className="py-3.5 font-mono font-bold text-teal-700 bg-teal-50 px-2 py-0.5 rounded border border-teal-100">{tx.bookingId}</td>
                    <td className="py-3.5">
                      <div className="font-bold text-slate-900">{tx.service}</div>
                      <div className="text-slate-500 text-[11px]">{tx.patient}</div>
                    </td>
                    <td className="py-3.5 text-right font-medium text-slate-700">₹{tx.grossAmount}</td>
                    <td className="py-3.5 text-right font-medium text-rose-600">-₹{tx.commission}</td>
                    <td className="py-3.5 text-right font-extrabold text-emerald-700 text-sm">₹{tx.netPayout}</td>
                    <td className="py-3.5 text-right">
                      <span className="px-2.5 py-0.5 rounded-full text-[10px] font-bold bg-emerald-100 text-emerald-800 border border-emerald-200">
                        {tx.status}
                      </span>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  );
}
