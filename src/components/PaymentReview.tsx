'use client';

import { staffFetch } from '@/lib/staff-client';

import { useEffect, useState } from 'react';

type ReviewVisit = {
  id: string; patient_name: string; patient_age?: number; patient_gender?: string;
  patient_email?: string; patient_phone?: string; blood_group?: string; medical_notes?: string;
  address_text: string; clinical_instructions?: string; total_amount: number; payment_status: string;
  payment_ref?: string; payment_method?: string; has_receipt?: boolean; doctor_confirmed_at?: string; status: string;
};

export default function PaymentReview({ visit, onAccepted }: { visit: ReviewVisit; onAccepted: (visit: ReviewVisit) => void }) {
  const [verified, setVerified] = useState(false);
  const [receiptLoaded, setReceiptLoaded] = useState(false);
  const [receiptUrl, setReceiptUrl] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);
  const [message, setMessage] = useState('');
  const [error, setError] = useState('');
  const canReview = !visit.doctor_confirmed_at && ['PENDING', 'ASSIGNED', 'CONFIRMED'].includes(visit.status);
  useEffect(() => {
    const controller = new AbortController();
    let objectUrl: string | undefined;
    setReceiptUrl(null);
    setReceiptLoaded(false);
    setVerified(false);
    if (visit.has_receipt) {
      void (async () => {
        try {
          const response = await staffFetch(`/api/bookings/${encodeURIComponent(visit.id)}/receipt`, { signal: controller.signal });
          if (!response.ok) throw new Error('Receipt could not be loaded. Refresh and try again.');
          const blob = await response.blob();
          if (controller.signal.aborted) return;
          objectUrl = URL.createObjectURL(blob);
          setReceiptUrl(objectUrl);
        } catch (error) {
          if (!controller.signal.aborted) setError(error instanceof Error ? error.message : 'Receipt could not be loaded.');
        }
      })();
    }
    return () => { controller.abort(); if (objectUrl) URL.revokeObjectURL(objectUrl); };
  }, [visit.id, visit.has_receipt]);
  async function accept() {
    setSaving(true); setError('');
    try {
      const response = await staffFetch(`/api/pro/visits/${encodeURIComponent(visit.id)}/confirm`, {
        method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ paymentVerified: verified }),
      });
      const data = await response.json();
      if (!response.ok) throw new Error(data.error || 'Could not accept appointment.');
      onAccepted({ ...visit, ...data.visit });
      setMessage(data.message);
    } catch (e) { setError(e instanceof Error ? e.message : 'Please try again.'); }
    finally { setSaving(false); }
  }
  async function reject() {
    setSaving(true); setError('');
    try {
      const response = await staffFetch(`/api/pro/visits/${encodeURIComponent(visit.id)}`, {
        method: 'PUT', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ status: 'CANCELLED' }),
      });
      const data = await response.json();
      if (!response.ok) throw new Error(data.error || 'Could not decline appointment.');
      onAccepted({ ...visit, ...data.visit }); setMessage('Appointment declined. No booking confirmation will be sent.');
    } catch (e) { setError(e instanceof Error ? e.message : 'Please try again.'); }
    finally { setSaving(false); }
  }
  return <section className="bg-white border border-slate-200 rounded-2xl p-6 space-y-5">
    <h2 className="text-xl font-bold text-slate-900">Patient details & payment review</h2>
    <div className="grid sm:grid-cols-2 gap-3 text-sm text-slate-700">
      <p><strong>Patient:</strong> {visit.patient_name}</p>
      <p><strong>Age / gender:</strong> {visit.patient_age ?? 'Not provided'} / {visit.patient_gender || 'Not provided'}</p>
      <p><strong>Email:</strong> {visit.patient_email || 'Not provided'}</p>
      <p><strong>Phone:</strong> {visit.patient_phone || 'Not provided'}</p>
      <p><strong>Blood group:</strong> {visit.blood_group || 'Not provided'}</p>
      <p><strong>Address:</strong> {visit.address_text}</p>
    </div>
    <p className="text-sm"><strong>Medical notes:</strong> {visit.medical_notes || 'None provided'}</p>
    <p className="text-sm"><strong>Visit instructions:</strong> {visit.clinical_instructions || 'None provided'}</p>
    <div className="rounded-xl bg-slate-50 p-4 space-y-2 text-sm">
      <p><strong>Amount:</strong> ₹{Number(visit.total_amount).toFixed(2)} · <strong>Status:</strong> {visit.payment_status === 'UNDER_REVIEW' ? 'Awaiting verification' : visit.payment_status}</p>
      <p><strong>Payment app:</strong> {visit.payment_method || 'UPI'} · <strong>Transaction ID:</strong> {visit.payment_ref || 'See receipt'}</p>
      {receiptUrl ? <>
        <a href={receiptUrl} target="_blank" rel="noreferrer" className="inline-block font-bold text-teal-700 underline">Open full payment receipt</a>
        <img src={receiptUrl} alt="Patient payment receipt" onLoad={() => setReceiptLoaded(true)} onError={() => { setReceiptLoaded(false); setError('Receipt could not be loaded. Refresh and try again.'); }} className="max-h-96 max-w-full rounded-lg border border-slate-200 object-contain" />
      </> : <p>{visit.has_receipt ? 'Loading payment receipt…' : 'No receipt is available for this appointment.'}</p>}
    </div>
    {canReview && <div className="space-y-4">
      {visit.payment_status !== 'PAID' && <label className="flex items-start gap-3 text-sm text-slate-700">
        <input type="checkbox" checked={verified} disabled={!receiptLoaded} onChange={e => setVerified(e.target.checked)} className="mt-1" />
        I reviewed the screenshot and verified receipt of the correct amount for this appointment.
      </label>}
      <div className="flex flex-wrap gap-3">
        <button type="button" onClick={() => void accept()} disabled={saving || (visit.payment_status !== 'PAID' && (!verified || !receiptLoaded))} className="rounded-xl bg-teal-700 px-5 py-3 text-white font-bold disabled:opacity-50">{saving ? 'Saving…' : 'Verify Payment & Accept Appointment'}</button>
        <button type="button" onClick={() => void reject()} disabled={saving} className="rounded-xl border border-red-200 px-5 py-3 text-red-700 font-bold disabled:opacity-50">Decline Appointment</button>
      </div>
      <p className="text-xs text-slate-500">Acceptance sends the patient a booking confirmation email.</p>
    </div>}
    {message && <p role="status" className="text-sm text-teal-800">{message}</p>}
    {error && <p role="alert" className="text-sm text-red-700">{error}</p>}
  </section>;
}
