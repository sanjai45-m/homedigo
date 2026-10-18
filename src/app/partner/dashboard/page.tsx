'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';
import { ArrowRight, CalendarDays, Clock, MapPin, RefreshCw } from 'lucide-react';
import { staffFetch } from '@/lib/staff-client';
import FeedbackToast from '@/components/shared/FeedbackToast';

type Visit = {
  id: string; booking_number: string; patient_name: string; service_title: string; address_text: string;
  status: string; scheduled_date: string; scheduled_time_slot: string; appointment_starts_at?: string;
  doctor_confirmed_at?: string | null;
};
const active = (visit: Visit) => !['COMPLETED', 'CANCELLED'].includes(visit.status);
const needsReview = (visit: Visit) => !visit.doctor_confirmed_at && ['PENDING', 'ASSIGNED', 'CONFIRMED'].includes(visit.status);
const labels: Record<string, string> = {
  PENDING: 'Needs review', ASSIGNED: 'Needs review', CONFIRMED: 'Confirmed', ON_THE_WAY: 'On the way',
  ARRIVED: 'Arrived', IN_PROGRESS: 'Visit in progress', COMPLETED: 'Completed', CANCELLED: 'Cancelled',
};
const priority: Record<string, number> = { IN_PROGRESS: 0, ARRIVED: 1, ON_THE_WAY: 2 };

export default function PartnerDashboardPage() {
  const [name, setName] = useState('');
  const [visits, setVisits] = useState<Visit[]>([]);
  const [loading, setLoading] = useState(true);
  const [notice, setNotice] = useState('');
  const [filter, setFilter] = useState<'ACTIVE' | 'REVIEW' | 'COMPLETED' | 'ALL'>('ACTIVE');
  async function refresh() {
    setLoading(true); setNotice('');
    try {
      const response = await staffFetch('/api/pro/dashboard');
      const data = await response.json();
      if (!response.ok) throw new Error(data.error || 'Could not load appointments.');
      setName(data.partner?.name || ''); setVisits(data.visits || []);
    } catch (error) { setNotice(error instanceof Error ? error.message : 'Could not load appointments. Please retry.'); }
    finally { setLoading(false); }
  }
  useEffect(() => {
    let mounted = true;
    queueMicrotask(() => { if (mounted) void refresh(); });
    return () => { mounted = false; };
  }, []);
  const filters = [
    { value: 'ACTIVE', label: 'Upcoming & active', count: visits.filter(active).length },
    { value: 'REVIEW', label: 'Needs review', count: visits.filter(needsReview).length },
    { value: 'COMPLETED', label: 'Completed', count: visits.filter(visit => visit.status === 'COMPLETED').length },
    { value: 'ALL', label: 'All visits', count: visits.length },
  ] as const;
  const displayed = visits.filter(visit => filter === 'ALL' || (filter === 'ACTIVE' ? active(visit) : filter === 'REVIEW' ? needsReview(visit) : visit.status === 'COMPLETED'))
    .sort((a, b) => {
      const stage = (priority[a.status] ?? 3) - (priority[b.status] ?? 3);
      if (stage) return stage;
      const timeA = Date.parse(a.appointment_starts_at || a.scheduled_date);
      const timeB = Date.parse(b.appointment_starts_at || b.scheduled_date);
      return Number.isFinite(timeA) && Number.isFinite(timeB) ? (filter === 'COMPLETED' || filter === 'ALL' ? timeB - timeA : timeA - timeB) : 0;
    });
  return <div className="mx-auto max-w-4xl space-y-5">
    <FeedbackToast message={notice} onDismiss={() => setNotice('')} />
    <header className="flex items-start justify-between gap-3">
      <div className="min-w-0"><h1 className="text-3xl font-semibold text-teal-950">Your visits</h1><p className="mt-1 text-sm text-slate-600 break-words">{name ? `Welcome, ${name}.` : 'Your appointment workspace.'}</p></div>
      <button type="button" aria-label="Refresh visits" disabled={loading} onClick={() => void refresh()} className="flex min-h-11 min-w-11 shrink-0 items-center justify-center gap-2 rounded-xl border border-slate-200 bg-white px-3 text-sm font-semibold text-teal-700 disabled:opacity-50"><RefreshCw size={18} className={loading ? 'animate-spin' : ''} /><span className="hidden sm:inline">Refresh</span></button>
    </header>
    <div role="group" aria-label="Filter visits" className="grid grid-cols-2 gap-2 sm:grid-cols-4">
      {filters.map(item => <button key={item.value} type="button" aria-pressed={filter === item.value} onClick={() => setFilter(item.value)} className="flex min-h-14 items-center justify-between gap-2 rounded-xl border border-slate-200 bg-white px-3 py-2 text-left text-xs font-medium text-slate-600 aria-pressed:border-teal-700 aria-pressed:bg-teal-50 aria-pressed:text-teal-900">
        <span>{item.label}</span><span className="text-lg font-semibold">{loading ? '?' : item.count}</span>
      </button>)}
    </div>
    <section aria-label="Appointments" aria-busy={loading} className="space-y-3">
      {loading ? <p role="status" className="rounded-2xl bg-white p-6 text-sm text-slate-500">Loading your visits...</p> : notice && !visits.length ? <div className="rounded-2xl border border-amber-200 bg-amber-50 p-5 text-sm"><p>Your appointments could not be loaded.</p><button type="button" onClick={() => void refresh()} className="mt-2 min-h-11 font-semibold text-teal-800 underline">Try again</button></div> : !displayed.length ? <div className="rounded-2xl border border-slate-200 bg-white p-6 text-center"><CalendarDays size={28} className="mx-auto mb-3 text-teal-700" /><h2 className="font-semibold">{filter === 'REVIEW' ? 'No requests waiting for review' : filter === 'ACTIVE' ? 'No upcoming visits' : 'No visits in this category'}</h2><p className="mt-2 text-sm text-slate-500">{filter === 'ACTIVE' ? 'New appointment requests will appear here.' : 'Choose another filter to see your appointments.'}</p></div> : displayed.map(visit => <article key={visit.id} className="space-y-3 rounded-2xl border border-slate-200 bg-white p-4 sm:p-5">
        <div className="flex flex-wrap items-center justify-between gap-2"><h2 className="min-w-0 break-words text-base font-semibold text-slate-900">{visit.patient_name}</h2><span className={`rounded-full px-3 py-1 text-xs font-medium ${needsReview(visit) ? 'bg-amber-50 text-amber-900' : visit.status === 'CANCELLED' ? 'bg-rose-50 text-rose-700' : 'bg-teal-50 text-teal-800'}`}>{needsReview(visit) ? 'Needs review' : labels[visit.status] || visit.status.replaceAll('_', ' ')}</span></div>
        <p className="text-sm text-slate-600">{visit.service_title}</p>
        <div className="grid gap-2 text-sm text-slate-700 sm:grid-cols-2"><p className="flex items-start gap-2"><CalendarDays size={16} className="mt-0.5 shrink-0 text-teal-700" />{visit.scheduled_date}</p><p className="flex items-start gap-2"><Clock size={16} className="mt-0.5 shrink-0 text-teal-700" /><span>{visit.scheduled_time_slot} <span className="text-xs text-slate-500">IST</span></span></p></div>
        <p className="flex items-start gap-2 text-sm text-slate-500"><MapPin size={16} className="mt-0.5 shrink-0" /><span className="break-words">{visit.address_text || 'Open appointment for address details'}</span></p>
        <Link href={`/partner/visit/${encodeURIComponent(visit.id)}`} className="flex min-h-12 items-center justify-center gap-2 rounded-xl bg-teal-700 px-4 py-3 text-sm font-semibold text-white sm:ml-auto sm:w-fit">
          {needsReview(visit) ? 'Review request' : visit.status === 'CANCELLED' ? 'View cancellation' : visit.status === 'COMPLETED' ? 'View visit summary' : 'Open visit'}<ArrowRight size={16} />
        </Link>
      </article>)}
    </section>
  </div>;
}
