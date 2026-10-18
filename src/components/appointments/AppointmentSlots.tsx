'use client';

import { useEffect, useState } from 'react';
import { appointmentDate } from '@/lib/appointment-time';
import { BOOKING_DAYS, defaultSchedule, scheduleSlots, type DoctorSlot } from '@/lib/doctor-schedule';

export function useAppointmentSlots(doctorId: string, date: string, needsDoctor: boolean) {
  const [clock, setClock] = useState(() => Date.now());
  const [revision, setRevision] = useState(0);
  const [result, setResult] = useState<{ key: string; slots: DoctorSlot[]; error: string; received: number; serverTime: number } | null>(null);
  const key = `${doctorId}:${date}`;
  useEffect(() => {
    const timer = setInterval(() => setClock(Date.now()), 10000);
    return () => clearInterval(timer);
  }, []);
  useEffect(() => {
    if (!doctorId) return;
    const controller = new AbortController();
    let pending = false;
    async function refresh() {
      if (pending) return;
      pending = true;
      try {
        const response = await fetch(`/api/doctors/${encodeURIComponent(doctorId)}/slots?date=${encodeURIComponent(appointmentDate(date))}`, { cache: 'no-store', signal: controller.signal });
        const data = await response.json();
        if (!response.ok) throw new Error(data.error || 'Could not load appointment times.');
        if (!controller.signal.aborted) setResult({ key, slots: data.slots, received: Date.now(), serverTime: Date.parse(data.serverNow), error:
          data.availability !== 'AVAILABLE' ? 'This doctor is currently not available. Please choose another doctor.'
            : !data.configured ? 'This doctor has not published appointment hours yet. Please choose another doctor.' : '' });
      } catch (error) {
        if (!controller.signal.aborted) setResult({ key, slots: [], received: Date.now(), serverTime: Date.now(), error: error instanceof Error ? error.message : 'Could not load appointment times.' });
      } finally { pending = false; }
    }
    void refresh();
    const focused = () => { if (document.visibilityState === 'visible') void refresh(); };
    const timer = setInterval(focused, 15000);
    window.addEventListener('focus', focused);
    return () => { controller.abort(); clearInterval(timer); window.removeEventListener('focus', focused); };
  }, [doctorId, date, key, revision]);
  const now = result?.key === key ? result.serverTime + Math.max(0, clock - result.received) : clock;
  let slots: DoctorSlot[] = [];
  let error = '';
  if (doctorId) {
    if (result?.key === key) { slots = result.slots; error = result.error; }
  } else if (needsDoctor) error = 'Choose your doctor first to see their appointment times.';
  else {
    const schedule = defaultSchedule();
    schedule.days = schedule.days.map(() => [{ start: '09:00', end: '19:00' }]);
    schedule.bufferMinutes = 0;
    try { slots = scheduleSlots(schedule, date, [], new Date(now)); } catch { error = 'Choose a future appointment date.'; }
  }
  return { slots: slots.map(slot => Date.parse(slot.start) <= now ? { ...slot, available: false, reason: 'Time passed' } : slot),
    error, loading: Boolean(doctorId && result?.key !== key), retry: () => setRevision(value => value + 1) };
}

export default function AppointmentSlots({ date, selected, onDate, onSelect, slots, error, loading, retry }: {
  date: string; selected: string; onDate: (date: string) => void; onSelect: (slot: string) => void;
  slots: DoctorSlot[]; error: string; loading: boolean; retry: () => void;
}) {
  const today = appointmentDate('Today');
  const max = new Date(Date.parse(today) + (BOOKING_DAYS - 1) * 86400000).toISOString().slice(0, 10);
  return <section aria-label="Appointment date and time" className="space-y-5">
    <div className="grid grid-cols-2 items-end gap-3 sm:grid-cols-[1fr_auto_auto]">
      <label className="col-span-2 grid gap-2 text-sm font-semibold text-slate-800 sm:col-span-1">Visit date
        <input type="date" min={today} max={max} value={appointmentDate(date)} onChange={event => { if (event.target.value) onDate(event.target.value); }} className="min-h-12 rounded-xl border border-slate-200 bg-white px-4 text-base" /></label>
      {['Today', 'Tomorrow'].map(day => <button key={day} type="button" onClick={() => onDate(appointmentDate(day))} aria-pressed={appointmentDate(date) === appointmentDate(day)} className="min-h-12 rounded-xl border border-teal-200 px-4 text-sm font-semibold text-teal-800 aria-pressed:bg-teal-50">{day}</button>)}
    </div>
    <p className="text-sm text-slate-500">All times are IST. Past and booked times cannot be selected.</p>
    {loading ? <p role="status" className="py-6 text-sm text-teal-700">Checking available times…</p> : error ? <div role="alert" className="rounded-xl bg-amber-50 p-4 text-sm text-amber-900">{error}<button type="button" onClick={retry} className="ml-3 font-semibold underline">Refresh</button></div> : <>
      {!slots.some(slot => slot.available) && <p role="status" className="rounded-xl bg-slate-50 p-4 text-sm text-slate-600">No available times on this date. Try another day.</p>}
      <div className="grid grid-cols-2 gap-3 sm:grid-cols-3">{slots.filter(slot => slot.available).map(slot => <button key={slot.start} type="button" aria-pressed={selected === slot.label} onClick={() => onSelect(slot.label)} className="min-h-16 rounded-xl border border-slate-200 px-3 py-3 text-left text-sm font-semibold text-slate-700 aria-pressed:border-teal-700 aria-pressed:bg-teal-50 aria-pressed:text-teal-900">
        <span className="block">{slot.label.split(' - ')[0]}</span><span className="mt-1 block text-xs font-normal">{slot.available ? `until ${slot.label.split(' - ')[1]}` : slot.reason}</span>
      </button>)}</div>
      {slots.some(slot => !slot.available) && <details className="rounded-xl border border-slate-100 p-3"><summary className="cursor-pointer py-1 text-sm text-slate-500">Unavailable times ({slots.filter(slot => !slot.available).length})</summary><div className="mt-3 grid grid-cols-2 gap-3 sm:grid-cols-3">{slots.filter(slot => !slot.available).map(slot => <button key={slot.start} type="button" disabled className="min-h-16 cursor-not-allowed rounded-xl border border-slate-100 bg-slate-50 p-3 text-left text-sm text-slate-400"><span className="block">{slot.label.split(' - ')[0]}</span><span className="mt-1 block text-xs">{slot.reason}</span></button>)}</div></details>}
    </>}
  </section>;
}
