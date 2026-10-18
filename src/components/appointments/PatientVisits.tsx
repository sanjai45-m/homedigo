'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';
import { Calendar, ArrowRight } from 'lucide-react';
import { appointmentStart } from '@/lib/appointment-time';

export type PatientVisit = { id: string; service_title: string; patient_name: string; partner_name: string; status: string;
  scheduled_date: string; scheduled_time_slot: string; appointment_starts_at?: string; booking_number: string };
export const activeVisit = (visit: PatientVisit) => !['COMPLETED', 'CANCELLED'].includes(visit.status);
export function visitStart(visit: PatientVisit) {
  try { return Date.parse(visit.appointment_starts_at || appointmentStart(visit.scheduled_date, visit.scheduled_time_slot)); } catch { return 0; }
}
export function usePatientVisits() {
  const [bookings, setBookings] = useState<PatientVisit[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [revision, setRevision] = useState(0);
  useEffect(() => {
    const controller = new AbortController();
    let pending = false;
    async function load() {
      if (pending) return;
      pending = true;
      try {
        const response = await fetch('/api/patient/bookings', { cache: 'no-store', signal: controller.signal });
        const data = await response.json();
        if (!response.ok) throw new Error(data.error || 'Could not load your appointments.');
        if (!controller.signal.aborted) { setBookings(data.bookings || []); setError(''); }
      } catch (error) { if (!controller.signal.aborted) setError(error instanceof Error ? error.message : 'Could not load your appointments.'); }
      finally { if (!controller.signal.aborted) setLoading(false); pending = false; }
    }
    void load();
    const refresh = () => { if (document.visibilityState === 'visible') void load(); };
    const timer = setInterval(refresh, 30000);
    window.addEventListener('focus', refresh);
    return () => { controller.abort(); clearInterval(timer); window.removeEventListener('focus', refresh); };
  }, [revision]);
  return { bookings, loading, error, retry: () => setRevision(value => value + 1) };
}
const labels: Record<string, string> = { PENDING: 'Awaiting acceptance', ASSIGNED: 'Awaiting acceptance', CONFIRMED: 'Confirmed', ON_THE_WAY: 'Clinician on the way', ARRIVED: 'Clinician arrived', IN_PROGRESS: 'Visit in progress', COMPLETED: 'Completed', CANCELLED: 'Cancelled' };
export function VisitCard({ visit }: { visit: PatientVisit }) {
  const starts = visitStart(visit);
  const date = starts ? new Date(starts).toLocaleDateString('en-IN', { timeZone: 'Asia/Kolkata', weekday: 'short', day: 'numeric', month: 'short', year: 'numeric' }) : visit.scheduled_date;
  return <article className="rounded-2xl border border-slate-200 bg-white p-4 sm:p-6">
    <div className="flex flex-wrap items-center justify-between gap-2"><h3 className="font-semibold text-slate-900">{visit.service_title}</h3><span className={`rounded-full px-3 py-1 text-xs font-semibold ${visit.status === 'CANCELLED' ? 'bg-rose-50 text-rose-700' : 'bg-teal-50 text-teal-800'}`}>{labels[visit.status] || visit.status.replaceAll('_', ' ')}</span></div>
    <div className="my-4 flex gap-3 rounded-xl bg-slate-50 p-3"><Calendar className="mt-0.5 h-5 w-5 shrink-0 text-teal-700" /><div><p className="text-sm font-semibold text-slate-900">{date}</p><p className="mt-1 text-sm text-slate-600">{visit.scheduled_time_slot} <span className="text-xs">IST</span></p></div></div>
    <p className="text-sm text-slate-700">{visit.partner_name || 'Clinician to be assigned'}</p><p className="mt-1 text-sm text-slate-500">For {visit.patient_name}</p>
    <Link href={`/patient/appointments/${visit.id}`} className="mt-4 flex min-h-11 items-center justify-between rounded-xl border border-teal-200 px-4 text-sm font-semibold text-teal-800">View appointment<ArrowRight className="h-4 w-4" /></Link>
  </article>;
}
