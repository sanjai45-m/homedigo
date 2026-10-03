'use client';

import React, { useState, useEffect } from 'react';
import { Download, Receipt } from 'lucide-react';
import { generateInvoicePdf } from '@/lib/pdf-generator';

export default function InvoicesPage() {
  const [invoices, setInvoices] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    async function loadInvoices() {
      try {
        const res = await fetch('/api/patient/invoices');
        const data = await res.json();
        setInvoices(data.invoices || []);
      } catch (err) {
        console.error('Failed to load invoices:', err);
      } finally {
        setLoading(false);
      }
    }
    loadInvoices();
  }, []);

  return (
    <div className="space-y-8 animate-in fade-in duration-200">
      
      {/* Header */}
      <div>
        <h1 className="text-2xl sm:text-3xl font-black font-heading text-slate-900 tracking-tight">
          Invoices & Tax Receipts
        </h1>
        <p className="text-xs sm:text-sm text-slate-500 font-medium">
          Download GST itemized tax receipts and UPI payment proofs for all doorstep healthcare visits
        </p>
      </div>

      {/* Invoices Table / Card List */}
      <div className="bg-white rounded-3xl border border-slate-200 shadow-sm overflow-hidden">
        <div className="p-6 border-b border-slate-100 flex items-center justify-between">
          <h2 className="text-base font-bold text-slate-900 font-heading">
            Billing History
          </h2>
          <span className="text-xs font-bold text-slate-400">
            {invoices.length} Invoices Generated
          </span>
        </div>

        <div className="divide-y divide-slate-100">
          {loading ? (
            <div className="p-6 space-y-4 animate-pulse">
              {[1, 2, 3].map((i) => (
                <div key={i} className="flex items-center justify-between py-3">
                  <div className="space-y-2">
                    <div className="w-44 h-4 bg-slate-200 rounded-md" />
                    <div className="w-64 h-3 bg-slate-100 rounded-md" />
                  </div>
                  <div className="flex items-center gap-4">
                    <div className="w-16 h-5 bg-slate-200 rounded-md" />
                    <div className="w-28 h-8 bg-slate-100 rounded-xl" />
                  </div>
                </div>
              ))}
            </div>
          ) : invoices.length === 0 ? (
            <div className="p-12 text-center space-y-2">
              <Receipt className="w-10 h-10 text-slate-300 mx-auto" />
              <h3 className="text-sm font-bold text-slate-800">No Invoices Found</h3>
              <p className="text-xs text-slate-500">Invoices will automatically generate when you book visits.</p>
            </div>
          ) : (
            invoices.map((inv) => (
              <div
                key={inv.id}
                className="p-6 flex flex-col sm:flex-row sm:items-center justify-between gap-4 hover:bg-slate-50/70 transition-colors"
              >
                <div className="space-y-1">
                  <div className="flex items-center gap-2.5">
                    <Receipt className="w-4 h-4 text-teal-700" />
                    <span className="text-sm font-bold text-slate-900 font-heading">{inv.service_title}</span>
                    <span className="text-xs font-mono text-slate-400 font-semibold">{inv.invoice_number}</span>
                  </div>
                  <p className="text-xs text-slate-500">
                    Ref: <span className="font-mono text-slate-700">{inv.payment_ref}</span> · Issued: {new Date(inv.issued_at).toLocaleDateString()}
                  </p>
                </div>

                <div className="flex items-center justify-between sm:justify-end gap-6">
                  <div className="text-right">
                    <span className="text-base font-black text-slate-900 font-heading">₹{inv.total_paid}</span>
                    <p className="text-[10px] text-emerald-600 font-bold uppercase">✓ Paid via UPI</p>
                  </div>

                  <button
                    type="button"
                    onClick={() => generateInvoicePdf(inv)}
                    className="px-4 py-2 rounded-xl bg-teal-50 hover:bg-teal-100 text-teal-800 font-bold text-xs flex items-center gap-1.5 transition-colors cursor-pointer"
                  >
                    <Download className="w-3.5 h-3.5" />
                    <span>Download PDF</span>
                  </button>
                </div>
              </div>
            ))
          )}
        </div>
      </div>

    </div>
  );
}
