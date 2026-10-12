'use client';

import { useEffect, useState } from 'react';
import { DEMO_UPI_ID, MAX_RECEIPT_BYTES, upiPaymentLink } from '@/lib/payment';
import type { PaymentSettings } from '@/lib/payment-settings';

export default function PaymentCheckout({ amount, reference, receipt, onReceipt, onMethod, beforeOpen }: {
  amount: number;
  reference: string;
  receipt: string;
  onReceipt: (value: string) => void;
  onMethod: (value: 'GPAY' | 'PHONEPE' | 'UPI') => void;
  beforeOpen: () => boolean;
}) {
  const [config, setConfig] = useState<PaymentSettings | null>(null);
  const [configError, setConfigError] = useState('');
  const [message, setMessage] = useState('');
  const [error, setError] = useState('');
  const [reading, setReading] = useState(false);
  async function loadConfig() {
    setConfigError('');
    try {
      const response = await fetch('/api/patient/payment', { cache: 'no-store' });
      const data = await response.json();
      if (!response.ok) throw new Error(data.error || 'Payment details are unavailable.');
      setConfig(data);
    } catch {
      setConfig(null);
      setConfigError('Payment details could not be loaded. Please retry before paying.');
    }
  }
  useEffect(() => { void loadConfig(); }, []);

  function openApp(app: 'GPAY' | 'PHONEPE' | 'UPI') {
    if (!config || !beforeOpen()) return;
    if (!config.upiId) { setMessage('Direct app payments are not configured. Contact the clinic or use the manual payment details below.'); return; }
    const label = app === 'GPAY' ? 'Google Pay' : app === 'PHONEPE' ? 'PhonePe' : 'your UPI app';
    const mobile = /Android|iPhone|iPad|iPod/i.test(navigator.userAgent) || (navigator.platform === 'MacIntel' && navigator.maxTouchPoints > 1);
    if (!mobile) { setMessage(`Open this booking on your phone to launch ${label}. Desktop browsers cannot open the payment app on a separate phone.`); return; }
    const paymentUrl = upiPaymentLink(app, config.upiId, config.payeeName, amount, reference, /Android/i.test(navigator.userAgent));
    if (!paymentUrl) { setMessage('Check the configured UPI ID and appointment amount before paying.'); return; }
    onMethod(app);
    setMessage(config.upiId === DEMO_UPI_ID ? `Opening ${label} with a demo recipient. No real payment can be made with this demo ID.`
      : `Opening ${label} with ${config.upiId} and ₹${amount.toFixed(2)}. If the app does not open, make sure it is installed and try your phone’s browser. Return here after payment to upload the receipt.`);
    // Navigate directly in the tap handler so browsers retain user activation.
    window.location.href = paymentUrl;
  }

  async function copyNumber() {
    if (!config || !beforeOpen()) return;
    try { await navigator.clipboard.writeText(config.phone); setMessage('Phone number copied for manual payment.'); }
    catch { setMessage(`Copy this number manually: ${config.phone}`); }
  }

  async function upload(file?: File) {
    onReceipt('');
    setError('');
    if (!file) return;
    if (!['image/png', 'image/jpeg', 'image/webp'].includes(file.type) || file.size > MAX_RECEIPT_BYTES || file.size === 0) {
      setError('Choose a PNG, JPEG or WebP screenshot up to 2 MB.');
      return;
    }
    setReading(true);
    try {
      const data = await new Promise<string>((resolve, reject) => {
        const reader = new FileReader();
        reader.onload = () => resolve(String(reader.result));
        reader.onerror = () => reject(new Error('Could not read this screenshot.'));
        reader.readAsDataURL(file);
      });
      onReceipt(data);
    } catch { setError('Could not read this screenshot. Please select it again.'); }
    finally { setReading(false); }
  }

  return <div className="space-y-5">
    <div className="rounded-2xl border border-teal-200 bg-teal-50 p-5 space-y-3">
      <h3 className="font-bold text-slate-900">1. Pay with Google Pay or PhonePe</h3>
      {configError ? <div role="alert" className="text-sm text-red-700">
        <p>{configError}</p><button type="button" onClick={() => void loadConfig()} className="mt-2 font-bold underline">Retry loading payment details</button>
      </div> : !config && <p role="status" className="text-sm text-slate-600">Loading payment details…</p>}
      {config && <>
      <p className="text-sm text-slate-700">Pay <strong>₹{amount.toFixed(2)}</strong> to phone number <strong className="select-all">{config.phone}</strong>.</p>
      {config.upiId && <p className="text-xs text-slate-600">UPI ID: <span className="select-all">{config.upiId}</span></p>}
      {config.upiId === DEMO_UPI_ID && <p role="status" className="rounded-xl border border-amber-200 bg-amber-50 p-3 text-sm text-amber-900"><strong>Demo payment link.</strong> This dummy UPI ID cannot receive payments. The clinic must replace it with a real linked UPI ID before collecting payments.</p>}
      <p className="text-xs text-slate-600">{config.upiId ? 'On your phone, tap an app to open the payment screen with the recipient and amount filled in.' : 'Direct app payment is not configured. For manual payment, copy the number and enter it in your payment app.'}</p>
      <div className="flex flex-wrap gap-3">
        {config.upiId && <>
        <button type="button" onClick={() => openApp('GPAY')} className="rounded-xl bg-white border border-slate-300 px-5 py-3 font-bold text-sm text-slate-900">Open Google Pay</button>
        <button type="button" onClick={() => openApp('PHONEPE')} className="rounded-xl bg-violet-700 px-5 py-3 font-bold text-sm text-white">Open PhonePe</button>
        {config.upiId && <button type="button" onClick={() => openApp('UPI')} className="rounded-xl border border-teal-600 px-4 py-3 text-sm text-teal-900">Other UPI app</button>}
        </>}
        <button type="button" onClick={() => void copyNumber()} className="rounded-xl border border-slate-300 px-4 py-3 text-sm text-slate-700">Copy number for manual payment</button>
      </div>
      {message && <p role="status" className="text-sm text-teal-900">{message}</p>}
      <p className="text-xs text-slate-600">Opening an app does not confirm payment. Check that the payment succeeded before uploading.</p>
      </>}
    </div>
    <div className="rounded-2xl border border-slate-200 p-5 space-y-3">
      <label htmlFor="payment-receipt" className="block font-bold text-slate-900">2. Upload your payment receipt</label>
      <p className="text-xs text-slate-600">Show the recipient, amount, date and transaction ID. Your doctor will review this screenshot before accepting your appointment.</p>
      <input id="payment-receipt" type="file" accept="image/png,image/jpeg,image/webp" disabled={reading} onChange={e => void upload(e.target.files?.[0])} className="block w-full text-sm file:mr-3 file:rounded-lg file:border-0 file:bg-teal-50 file:px-4 file:py-2 file:text-teal-800" />
      <p className="text-xs text-slate-500">PNG, JPEG or WebP · Maximum 2 MB</p>
      {reading && <p role="status">Reading screenshot…</p>}
      {error && <p role="alert" className="text-sm text-red-700">{error}</p>}
      {receipt && <img src={receipt} alt="Selected payment receipt" className="max-h-72 rounded-xl border border-slate-200 object-contain" />}
    </div>
  </div>;
}
