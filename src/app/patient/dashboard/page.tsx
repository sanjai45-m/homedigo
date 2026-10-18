'use client';

import Link from 'next/link';
import { useSession } from 'next-auth/react';
import { PlusCircle, ArrowRight, Users, MapPin, FileText, Calendar } from 'lucide-react';
import { activeVisit, usePatientVisits, VisitCard, visitStart } from '@/components/appointments/PatientVisits';

export default function PatientDashboard() {
  const { data: session } = useSession();
  const { bookings, loading, error, retry } = usePatientVisits();
  const nextVisit = [...bookings].filter(activeVisit).sort((a, b) => {
    const ongoing = (status: string) => ['ON_THE_WAY', 'ARRIVED', 'IN_PROGRESS'].includes(status) ? 0 : 1;
    return ongoing(a.status) - ongoing(b.status) || visitStart(a) - visitStart(b);
  })[0];
  return <div className="mx-auto max-w-4xl space-y-6">
    <header><p className="text-sm text-slate-500">Your care at home</p><h1 className="mt-1 text-2xl font-semibold tracking-tight text-teal-950 sm:text-3xl">Hello, {session?.user?.name?.split(' ')[0] || 'there'}</h1></header>
    <section className="rounded-2xl bg-teal-800 p-5 text-white sm:p-7"><h2 className="text-xl font-semibold">How can we help today?</h2><p className="mt-2 text-sm text-teal-100">Choose your care and a time that works for you.</p><Link href="/patient/book" className="mt-5 inline-flex min-h-12 items-center gap-2 rounded-xl bg-white px-5 text-sm font-semibold text-teal-900"><PlusCircle className="h-5 w-5" />Book a home visit</Link></section>
    <section aria-labelledby="next-visit"><div className="mb-3 flex items-center justify-between gap-3"><h2 id="next-visit" className="text-lg font-semibold text-slate-900">Your next visit</h2><Link href="/patient/appointments" className="py-2 text-sm font-semibold text-teal-700">View all</Link></div>
      {error ? <div role="alert" className="rounded-xl bg-amber-50 p-4 text-sm text-amber-900">{error}<button onClick={retry} className="ml-3 py-2 font-semibold underline">Try again</button></div> : loading ? <div role="status" className="rounded-2xl bg-white p-6 text-sm text-slate-500">Loading your visits…</div> : nextVisit ? <VisitCard visit={nextVisit} /> : <div className="rounded-2xl border border-slate-200 bg-white p-5"><Calendar className="mb-3 h-6 w-6 text-teal-600" /><p className="font-semibold text-slate-800">No upcoming visits</p><p className="mt-1 text-sm text-slate-500">Your requested appointments will appear here.</p></div>}
    </section>
    <section aria-label="Manage your account" className="divide-y divide-slate-100 rounded-2xl border border-slate-200 bg-white">
      {[{ href: '/patient/family', label: 'Family profiles', icon: Users }, { href: '/patient/addresses', label: 'Saved addresses', icon: MapPin }, { href: '/patient/invoices', label: 'Invoices & receipts', icon: FileText }].map(item => <Link key={item.href} href={item.href} className="flex min-h-14 items-center gap-3 p-4 text-sm font-medium text-slate-700"><item.icon className="h-5 w-5 text-teal-700" />{item.label}<ArrowRight className="ml-auto h-4 w-4 text-slate-400" /></Link>)}
    </section>
  </div>;
}
