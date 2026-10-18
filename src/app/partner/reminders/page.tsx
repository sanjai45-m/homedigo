'use client';

import { useEffect, useState } from 'react';
import { Bell, Plus, Trash2 } from 'lucide-react';
import { staffFetch } from '@/lib/staff-client';
import { DEFAULT_REMINDERS, reminderExample, validateReminders } from '@/lib/doctor-reminders';
import FeedbackToast from '@/components/shared/FeedbackToast';

export default function DoctorRemindersPage() {
  const [minutes, setMinutes] = useState<number[]>(DEFAULT_REMINDERS);
  const [ready, setReady] = useState(false);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [feedback, setFeedback] = useState<{ type: 'error' | 'success'; message: string } | null>(null);
  async function load() {
    try {
      const response = await staffFetch('/api/pro/reminders');
      const data = await response.json();
      if (!response.ok) throw new Error(data.error);
      setMinutes(validateReminders(data.minutes)); setReady(true);
    } catch { setFeedback({ type: 'error', message: 'Reminder settings could not be loaded. Please retry.' }); }
    finally { setLoading(false); }
  }
  useEffect(() => {
    let active = true;
    queueMicrotask(() => { if (active) void load(); });
    return () => { active = false; };
  }, []);
  async function save(event: React.FormEvent) {
    event.preventDefault(); setFeedback(null); setSaving(true);
    try {
      const selected = validateReminders(minutes);
      const response = await staffFetch('/api/pro/reminders', { method: 'PUT', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ minutes: selected }) });
      const data = await response.json();
      if (!response.ok) throw new Error(data.error || 'Could not save reminders.');
      setMinutes(data.minutes);
      setFeedback({ type: 'success', message: selected.length ? 'Reminders saved for your upcoming confirmed visits.' : 'Visit push reminders turned off.' });
    } catch (error) { setFeedback({ type: 'error', message: error instanceof Error ? error.message : 'Could not save reminders.' }); }
    finally { setSaving(false); }
  }
  return <div className="mx-auto max-w-3xl space-y-6">
    <FeedbackToast message={feedback?.message} type={feedback?.type} onDismiss={() => setFeedback(null)} />
    <header><p className="text-sm font-semibold text-teal-700">Plan your visits</p><h1 className="mt-2 text-3xl font-semibold text-teal-950">Visit reminders</h1><p className="mt-2 text-sm text-slate-600">A heads-up before each confirmed appointment, at the times you choose.</p></header>
    {loading ? <p role="status">Loading reminder settings…</p> : !ready ? <button onClick={() => { setLoading(true); void load(); }} className="rounded-xl border px-4 py-3">Retry loading reminders</button> : <form onSubmit={save}>
      <fieldset disabled={saving} className="space-y-5 rounded-2xl border border-slate-200 bg-white p-4 sm:p-6">
        <div className="flex flex-wrap items-center justify-between gap-3"><h2 className="flex items-center gap-2 font-semibold text-teal-950"><Bell size={18} />Before each visit</h2><button type="button" onClick={() => setMinutes([...DEFAULT_REMINDERS])} className="min-h-11 text-sm font-semibold text-teal-700">Restore defaults</button></div>
        <p className="text-sm text-slate-500">Choose up to 5 alerts, from 1 minute to 24 hours before your visit. Remove all alerts to turn visit push reminders off.</p>
        <div className="space-y-3">{minutes.map((value, index) => <div key={index} className="flex items-end gap-2"><label className="min-w-0 flex-1 text-sm font-medium text-slate-700">Reminder {index + 1}<span className="mt-2 flex items-center gap-3"><input aria-label={`Reminder ${index + 1} minutes before visit`} type="number" min="1" max="1440" required value={value || ''} onChange={event => setMinutes(previous => previous.map((item, i) => i === index ? Number(event.target.value) : item))} className="min-h-12 w-24 rounded-xl border border-slate-200 px-3 text-base" /><span>minutes before</span></span></label><button type="button" aria-label={`Remove reminder ${index + 1}`} onClick={() => setMinutes(previous => previous.filter((_, i) => i !== index))} className="min-h-12 rounded-xl p-3 text-slate-500 hover:bg-rose-50 hover:text-rose-700"><Trash2 size={18} /></button></div>)}</div>
        {!minutes.length && <p role="status" className="rounded-xl bg-slate-50 p-4 text-sm text-slate-600">No visit push reminders selected.</p>}
        {minutes.length < 5 && <button type="button" onClick={() => setMinutes(previous => [...previous, [10, 5, 120, 45, 90, 1].find(value => !previous.includes(value))!])} className="flex min-h-11 items-center gap-2 text-sm font-semibold text-teal-700"><Plus size={17} />Add reminder</button>}
        <div className="rounded-xl bg-teal-50 p-4 text-sm text-teal-900"><p className="font-semibold">Example: a 10:00 AM visit</p><p className="mt-2" aria-label="Reminder preview">{minutes.length ? [...minutes].filter(value => value >= 1 && value <= 1440).sort((a, b) => b - a).map(reminderExample).join(' · ') : 'No push reminders'}</p><p className="mt-2 text-xs text-teal-700">All times are IST. Already-passed reminders are skipped.</p></div>
        <p className="text-sm leading-relaxed text-slate-500">Enable browser notifications above to receive these alerts. Changes apply to upcoming reminders; alerts already sent are not repeated. Your email reminder remains 15 minutes before the visit.</p>
        <button type="submit" className="min-h-12 w-full rounded-xl bg-teal-700 px-6 font-semibold text-white disabled:opacity-60 sm:w-auto">{saving ? 'Saving…' : 'Save reminders'}</button>
      </fieldset>
    </form>}
    <section className="rounded-2xl border border-slate-200 bg-white p-5"><h2 className="font-semibold text-teal-950">Patient visit updates</h2><p className="mt-2 text-sm leading-relaxed text-slate-600">Patients with notifications enabled receive updates when you are on the way, arrive, start the visit, or complete it. With location sharing active, accurate GPS within 500 metres of the visit address marks you as arrived. Repeated location updates do not repeat the arrival alert.</p></section>
  </div>;
}
