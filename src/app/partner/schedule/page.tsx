'use client';

import { useEffect, useState } from 'react';
import { CalendarDays, Clock, Copy, Plus, Trash2 } from 'lucide-react';
import { staffFetch } from '@/lib/staff-client';
import { DAY_NAMES, defaultSchedule, scheduleSlots, validateSchedule, type DoctorSchedule } from '@/lib/doctor-schedule';
import { appointmentDate } from '@/lib/appointment-time';
import FeedbackToast from '@/components/shared/FeedbackToast';

export default function DoctorSchedulePage() {
  const [schedule, setSchedule] = useState(defaultSchedule);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [ready, setReady] = useState(false);
  const [configured, setConfigured] = useState(false);
  const [feedback, setFeedback] = useState<{ message: string; type: 'error' | 'success' } | null>(null);
  const [previewDate, setPreviewDate] = useState(() => appointmentDate('Tomorrow'));
  const [leaveDate, setLeaveDate] = useState('');
  async function load() {
    try {
      const response = await staffFetch('/api/pro/schedule');
      const data = await response.json();
      if (!response.ok) throw new Error(data.error);
      setSchedule(data.schedule); setConfigured(data.configured); setReady(true);
    } catch { setFeedback({ type: 'error', message: 'Your hours could not be loaded. Please retry.' }); }
    finally { setLoading(false); }
  }
  useEffect(() => {
    let active = true;
    queueMicrotask(() => { if (active) void load(); });
    return () => { active = false; };
  }, []);
  async function save() {
    setFeedback(null); setSaving(true);
    try {
      const validated = validateSchedule(schedule);
      const response = await staffFetch('/api/pro/schedule', { method: 'PUT', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(validated) });
      const data = await response.json();
      if (!response.ok) throw new Error(data.error);
      setSchedule(data.schedule); setConfigured(true);
      setFeedback({ type: 'success', message: 'Hours saved. Patients can book these times while you are on duty.' });
    } catch (error) { setFeedback({ type: 'error', message: error instanceof Error ? error.message : 'Hours could not be saved.' }); }
    finally { setSaving(false); }
  }
  const updateDay = (day: number, ranges: DoctorSchedule['days'][number]) => setSchedule(previous => ({ ...previous, days: previous.days.map((value, index) => index === day ? ranges : value) }));
  let preview: string[] = [];
  try { preview = scheduleSlots(validateSchedule(schedule), previewDate).filter(slot => slot.available).map(slot => slot.label); } catch { /* Invalid drafts are explained on save. */ }
  const field = 'min-h-11 rounded-xl border border-slate-200 bg-white px-3 py-2 text-base text-slate-800';
  return <div className="mx-auto max-w-4xl space-y-6">
    <FeedbackToast message={feedback?.message} type={feedback?.type} onDismiss={() => setFeedback(null)} />
    <header><p className="text-sm font-semibold text-teal-700">Your availability</p><h1 className="mt-2 text-3xl font-semibold text-teal-950">Appointment hours</h1>
      <p className="mt-2 text-sm text-slate-600">Set your usual week once. We create your slots and keep booked times unavailable.</p></header>
    {loading ? <p role="status">Loading your hours…</p> : !ready ? <button onClick={() => { setLoading(true); void load(); }} className={field}>Retry loading hours</button> : <>
      {!configured && <p className="rounded-xl bg-amber-50 p-4 text-sm text-amber-900">Save your hours to start offering appointment slots. These suggested hours are not published yet.</p>}
      <fieldset disabled={saving} className="space-y-6 disabled:opacity-60">
        <section className="grid gap-4 rounded-2xl border border-teal-100 bg-white p-5 sm:grid-cols-2">
          <label className="grid gap-2 text-sm font-semibold"><span className="flex items-center gap-2"><Clock size={17} />Visit duration</span>
            <select className={field} value={schedule.slotMinutes} onChange={event => setSchedule({ ...schedule, slotMinutes: Number(event.target.value) })}>{[30,45,60,90,120].map(value => <option key={value} value={value}>{value} minutes</option>)}</select></label>
          <label className="grid gap-2 text-sm font-semibold">Travel time between visits
            <select className={field} value={schedule.bufferMinutes} onChange={event => setSchedule({ ...schedule, bufferMinutes: Number(event.target.value) })}>{[0,15,30,45,60].map(value => <option key={value} value={value}>{value ? `${value} minutes` : 'No gap'}</option>)}</select></label>
        </section>
        <section className="rounded-2xl border border-slate-200 bg-white p-5">
          <div className="mb-5 flex flex-wrap items-center justify-between gap-3"><h2 className="font-semibold text-teal-950">Weekly hours · IST</h2>
            <button type="button" className="flex min-h-11 items-center gap-2 text-sm font-semibold text-teal-700" onClick={() => setSchedule({ ...schedule, days: schedule.days.map((day, index) => index >= 1 && index <= 5 ? schedule.days[1].map(range => ({ ...range })) : day) })}><Copy size={16} />Copy Monday to weekdays</button></div>
          <div className="divide-y divide-slate-100">{[1,2,3,4,5,6,0].map(day => <div key={day} className="grid gap-3 py-4 sm:grid-cols-[150px_1fr]">
            <label className="flex min-h-11 items-center gap-3 font-medium"><input type="checkbox" className="h-5 w-5 accent-teal-700" checked={schedule.days[day].length > 0} onChange={event => updateDay(day, event.target.checked ? [{ start: '09:00', end: '17:00' }] : [])} />{DAY_NAMES[day]}</label>
            <div className="space-y-2">{!schedule.days[day].length && <p className="py-3 text-sm text-slate-500">Day off</p>}
              {schedule.days[day].map((range, index) => <div key={index} className="flex flex-wrap items-center gap-2">
                <input aria-label={`${DAY_NAMES[day]} start ${index + 1}`} type="time" className={`${field} min-w-0 flex-1`} value={range.start} onChange={event => updateDay(day, schedule.days[day].map((item, n) => n === index ? { ...item, start: event.target.value } : item))} />
                <span className="text-slate-400">to</span>
                <input aria-label={`${DAY_NAMES[day]} end ${index + 1}`} type="time" className={`${field} min-w-0 flex-1`} value={range.end} onChange={event => updateDay(day, schedule.days[day].map((item, n) => n === index ? { ...item, end: event.target.value } : item))} />
                <button type="button" aria-label={`Remove ${DAY_NAMES[day]} period ${index + 1}`} className="p-3 text-slate-500" onClick={() => updateDay(day, schedule.days[day].filter((_, n) => n !== index))}><Trash2 size={17} /></button>
              </div>)}
              {schedule.days[day].length === 1 && <button type="button" className="flex min-h-11 items-center gap-1 text-sm text-teal-700" onClick={() => updateDay(day, [...schedule.days[day], { start: '18:00', end: '20:00' }])}><Plus size={16} />Add another period</button>}
            </div></div>)}</div>
        </section>
        <section className="rounded-2xl border border-slate-200 bg-white p-5"><h2 className="font-semibold text-teal-950">Days away</h2><p className="mt-1 text-sm text-slate-500">Pause new bookings on a specific date. Existing appointments stay in your queue.</p>
          <div className="mt-4 flex flex-wrap gap-2"><input aria-label="Date off" type="date" min={appointmentDate('Today')} value={leaveDate} onChange={event => setLeaveDate(event.target.value)} className={field} />
            <button type="button" disabled={!leaveDate} className="rounded-xl bg-teal-50 px-4 text-sm font-semibold text-teal-800 disabled:opacity-40" onClick={() => { setSchedule({ ...schedule, daysOff: [...new Set([...schedule.daysOff, leaveDate])] }); setLeaveDate(''); }}>Add day off</button></div>
          <div className="mt-3 flex flex-wrap gap-2">{schedule.daysOff.map(date => <button key={date} type="button" aria-label={`Remove day off ${date}`} className="rounded-lg border px-3 py-2 text-sm" onClick={() => setSchedule({ ...schedule, daysOff: schedule.daysOff.filter(value => value !== date) })}>{date} ×</button>)}</div>
        </section>
        <details className="rounded-2xl border border-slate-200 bg-white p-5"><summary className="cursor-pointer font-semibold text-teal-950">Preview your slots</summary>
          <p className="my-3 text-sm text-slate-500">Preview of your working hours; booked visits are excluded on the patient booking screen.</p>
          <input aria-label="Preview date" type="date" min={appointmentDate('Today')} value={previewDate} onChange={event => setPreviewDate(event.target.value)} className={field} />
          <div className="mt-3 flex flex-wrap gap-2">{preview.map(label => <span key={label} className="rounded-lg bg-teal-50 px-3 py-2 text-xs text-teal-900">{label}</span>)}{!preview.length && <p className="text-sm text-slate-500">No future slots on this date.</p>}</div>
        </details>
        <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between"><p className="text-sm text-slate-500">Changes affect new bookings only. All times are India Standard Time.</p>
          <button type="button" onClick={save} className="flex min-h-12 items-center justify-center gap-2 rounded-xl bg-teal-700 px-6 py-3 font-semibold text-white"><CalendarDays size={18} />{saving ? 'Saving…' : 'Save appointment hours'}</button></div>
      </fieldset>
    </>}
  </div>;
}
