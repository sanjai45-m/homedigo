'use client';

import { useId, useState } from 'react';
import { staffFetch } from '@/lib/staff-client';
import { MAX_CANCELLATION_REASON } from '@/lib/cancellation';
import FeedbackToast from '@/components/shared/FeedbackToast';

type CancelledAppointment = { id: string; status: string; cancellation_reason: string | null };

export function CancellationNotice({ reason }: { reason?: string | null }) {
  return <div role="status" className="rounded-2xl border border-rose-200 bg-rose-50 p-4 text-sm text-rose-900">
    <p className="font-semibold">Appointment cancelled</p>
    <p className="mt-1 whitespace-pre-wrap break-words">{reason ? `Reason: ${reason}` : 'No reason was provided.'}</p>
  </div>;
}

export default function CancelAppointment({ endpoint, staff = false, label = 'Cancel appointment', onCancelled }: {
  endpoint: string; staff?: boolean; label?: string; onCancelled: (appointment: CancelledAppointment) => void;
}) {
  const id = useId();
  const [open, setOpen] = useState(false);
  const [reason, setReason] = useState('');
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');
  async function cancel() {
    if (saving) return;
    setSaving(true); setError('');
    try {
      const response = await (staff ? staffFetch : fetch)(endpoint, {
        method: staff ? 'PUT' : 'PATCH', headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ status: 'CANCELLED', cancellationReason: reason.trim() }),
      });
      const data = await response.json();
      if (!response.ok || !data.success) throw new Error(data.error || 'Could not cancel appointment. Please retry.');
      onCancelled(data.booking || data.visit);
    } catch (error) { setError(error instanceof Error ? error.message : 'Could not cancel appointment. Please retry.'); }
    finally { setSaving(false); }
  }
  return <div className="space-y-3">
    <button type="button" aria-expanded={open} aria-controls={id} disabled={saving} onClick={() => setOpen(true)}
      className="rounded-xl border border-rose-200 bg-white px-4 py-3 text-sm font-semibold text-rose-700 disabled:opacity-50">{label}</button>
    {open && <div id={id} className="space-y-3 rounded-2xl border border-rose-200 bg-rose-50/50 p-4">
      <label htmlFor={`${id}-reason`} className="block text-sm font-semibold text-slate-800">Reason for cancellation <span className="font-normal text-slate-500">(optional)</span></label>
      <textarea id={`${id}-reason`} autoFocus rows={3} maxLength={MAX_CANCELLATION_REASON} value={reason} disabled={saving}
        aria-describedby={`${id}-help`} onChange={event => setReason(event.target.value)} placeholder="Let us know why this appointment is being cancelled"
        className="w-full resize-y rounded-xl border border-slate-200 bg-white p-3 text-base text-slate-900 focus:border-teal-600 focus:outline-none focus:ring-2 focus:ring-teal-600/20" />
      <p id={`${id}-help`} className="text-xs text-slate-600">This reason will be shared with the patient and assigned doctor by email and push notification. {reason.length}/{MAX_CANCELLATION_REASON}</p>
      <div className="flex flex-wrap gap-3">
        <button type="button" disabled={saving} onClick={() => void cancel()} className="rounded-xl bg-rose-700 px-4 py-3 text-sm font-semibold text-white disabled:opacity-50">{saving ? 'Cancelling...' : 'Confirm cancellation'}</button>
        <button type="button" disabled={saving} onClick={() => { setOpen(false); setError(''); }} className="rounded-xl border border-slate-200 bg-white px-4 py-3 text-sm font-semibold text-teal-800 disabled:opacity-50">Keep appointment</button>
      </div>
    </div>}
    <FeedbackToast message={error} type="error" onDismiss={() => setError('')} />
  </div>;
}
