import { CLINICIAN_REVENUE_PERCENT, HOMEDIGO_REVENUE_PERCENT, formatRevenue } from '@/lib/revenue';

export function RevenueSplit({ total, homedigo, clinician }: { total: number; homedigo: number; clinician: number }) {
  return (
    <section className="rounded-3xl border border-purple-200 bg-purple-50/50 p-6 space-y-4">
      <div>
        <h2 className="text-lg font-bold text-slate-900">Appointment revenue split</h2>
        <p className="text-sm text-slate-600 mt-1">
          Homedigo receives {HOMEDIGO_REVENUE_PERCENT}% of each appointment amount. The remaining {CLINICIAN_REVENUE_PERCENT}% is the clinician share.
          Shares are rounded per appointment to the nearest paisa.
        </p>
      </div>
      <div className="grid gap-4 sm:grid-cols-3">
        <div><p className="text-xs font-semibold text-slate-500">Total appointment amount (100%)</p><p className="text-xl font-bold text-slate-900 mt-1">₹{formatRevenue(total)}</p></div>
        <div><p className="text-xs font-semibold text-purple-700">Homedigo revenue ({HOMEDIGO_REVENUE_PERCENT}%)</p><p className="text-xl font-bold text-purple-700 mt-1">₹{formatRevenue(homedigo)}</p></div>
        <div><p className="text-xs font-semibold text-teal-700">Remaining clinician share ({CLINICIAN_REVENUE_PERCENT}%)</p><p className="text-xl font-bold text-teal-700 mt-1">₹{formatRevenue(clinician)}</p></div>
      </div>
      <div className="flex h-3 overflow-hidden rounded-full bg-teal-500" aria-hidden="true"><div className="bg-purple-600" style={{ width: `${HOMEDIGO_REVENUE_PERCENT}%` }} /></div>
      <p className="text-xs text-slate-600">Example: ₹1,000.00 total = ₹100.00 for Homedigo + ₹900.00 for the clinician. Totals cover all recorded appointments; payment and appointment status are shown separately.</p>
    </section>
  );
}
