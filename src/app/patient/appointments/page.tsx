'use client';

import { useState } from 'react';
import Link from 'next/link';
import { activeVisit, usePatientVisits, VisitCard, visitStart } from '@/components/appointments/PatientVisits';

export default function AppointmentsListPage() {
  const { bookings, loading, error, retry } = usePatientVisits();
  const [filter, setFilter] = useState('active');
  const filtered = bookings.filter(visit => filter === 'all' || (filter === 'active' ? activeVisit(visit) : !activeVisit(visit)))
    .sort((a, b) => filter === 'active' ? visitStart(a) - visitStart(b) : visitStart(b) - visitStart(a));
  return <div className="mx-auto max-w-4xl space-y-5">
    <header className="flex flex-wrap items-center justify-between gap-3"><div><h1 className="text-2xl font-semibold tracking-tight text-teal-950 sm:text-3xl">My appointments</h1><p className="mt-1 text-sm text-slate-500">Visit times, updates and care details.</p></div><Link href="/patient/book" className="inline-flex min-h-11 items-center rounded-xl bg-teal-700 px-4 text-sm font-semibold text-white">Book a visit</Link></header>
    <div aria-label="Filter appointments" className="flex gap-2">{[['active', 'Active'], ['past', 'History'], ['all', 'All']].map(([id, label]) => <button key={id} onClick={() => setFilter(id)} aria-pressed={filter === id} className="min-h-11 flex-1 rounded-xl border border-slate-200 bg-white px-4 text-sm font-semibold text-slate-600 aria-pressed:border-teal-700 aria-pressed:bg-teal-700 aria-pressed:text-white sm:flex-none">{label}</button>)}</div>
    {error ? <div role="alert" className="rounded-xl bg-amber-50 p-4 text-sm text-amber-900">{error}<button onClick={retry} className="ml-3 py-2 font-semibold underline">Try again</button></div> : loading ? <p role="status" className="py-10 text-center text-sm text-slate-500">Loading appointments…</p> : filtered.length ? <div className="grid items-start gap-4 md:grid-cols-2">{filtered.map(visit => <VisitCard key={visit.id} visit={visit} />)}</div> : <div className="rounded-2xl border border-slate-200 bg-white p-8 text-center"><p className="font-semibold text-slate-800">No appointments here yet</p><Link href="/patient/book" className="mt-3 inline-block py-2 text-sm font-semibold text-teal-700">Book a home visit</Link></div>}
  </div>;
}
