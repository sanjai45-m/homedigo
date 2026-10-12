'use client';

import { useEffect, useState } from 'react';
import { useSession } from 'next-auth/react';
import Link from 'next/link';
import { CreditCard, Loader2, Save } from 'lucide-react';
import type { PaymentSettings } from '@/lib/payment-settings';

export default function PaymentSettingsPage() {
  const { data: session, status } = useSession();
  const isSuperAdmin = (session?.user as { role?: string } | undefined)?.role === 'SUPER_ADMIN';
  const [settings, setSettings] = useState<PaymentSettings | null>(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');
  const [message, setMessage] = useState('');

  async function loadSettings() {
    setLoading(true); setError('');
    try {
      const response = await fetch('/api/super-admin/payment-settings', { cache: 'no-store' });
      const data = await response.json();
      if (!response.ok) throw new Error(data.error || 'Could not load payment settings.');
      setSettings(data.settings);
    } catch (error) { setError(error instanceof Error ? error.message : 'Could not load payment settings.'); }
    finally { setLoading(false); }
  }
  useEffect(() => { if (isSuperAdmin) void loadSettings(); }, [isSuperAdmin]);

  async function save(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (saving || !settings) return;
    setSaving(true); setError(''); setMessage('');
    try {
      const response = await fetch('/api/super-admin/payment-settings', {
        method: 'PUT', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(settings),
      });
      const data = await response.json();
      if (!response.ok) throw new Error(data.error || 'Could not save payment settings.');
      setSettings(data.settings);
      setMessage('Payment settings saved. Patients opening the payment step will see the updated number.');
    } catch (error) { setError(error instanceof Error ? error.message : 'Could not save payment settings.'); }
    finally { setSaving(false); }
  }

  if (status === 'loading') return <p role="status" className="p-8">Loading payment settings…</p>;
  if (!isSuperAdmin) return <div className="p-8 space-y-3"><p>Sign in as a super admin to manage payment settings.</p><Link href="/super-admin/login" className="text-indigo-700 underline">Super-admin sign in</Link></div>;

  return <div className="p-6 md:p-8 max-w-3xl mx-auto space-y-6">
    <div>
      <h1 className="text-2xl font-bold text-slate-900 flex items-center gap-3"><CreditCard className="text-indigo-600" />Payment Settings</h1>
      <p className="mt-2 text-sm text-slate-600">Set the GPay and PhonePe recipient for patient appointment payments.</p>
    </div>
    {error && <p role="alert" className="rounded-xl bg-red-50 p-4 text-sm text-red-700">{error}</p>}
    {message && <p role="status" className="rounded-xl bg-emerald-50 p-4 text-sm text-emerald-800">{message}</p>}
    {loading ? <p role="status" className="flex items-center gap-2"><Loader2 className="w-5 h-5 animate-spin" />Loading…</p> : settings ?
      <form onSubmit={save} className="rounded-2xl border border-slate-200 bg-white p-6 space-y-5">
        <fieldset disabled={saving} className="space-y-5 disabled:opacity-60">
          <label className="block text-sm font-semibold text-slate-800">GPay / PhonePe mobile number
            <input required type="tel" inputMode="tel" autoComplete="off" maxLength={20} value={settings.phone} onChange={e => { setSettings({ ...settings, phone: e.target.value, upiId: '' }); setMessage(''); }} className="mt-2 block w-full rounded-xl border border-slate-300 px-4 py-3" aria-describedby="payment-phone-help" />
          </label>
          <p id="payment-phone-help" className="text-xs text-slate-500">Use the 10-digit Indian mobile number that receives payments. Both payment buttons use this number.</p>
          <label className="block text-sm font-semibold text-slate-800">Recipient name
            <input required maxLength={100} value={settings.payeeName} onChange={e => { setSettings({ ...settings, payeeName: e.target.value }); setMessage(''); }} className="mt-2 block w-full rounded-xl border border-slate-300 px-4 py-3" />
          </label>
          <label className="block text-sm font-semibold text-slate-800">Linked UPI ID (optional)
            <input maxLength={255} autoCapitalize="none" autoCorrect="off" spellCheck={false} value={settings.upiId} onChange={e => { setSettings({ ...settings, upiId: e.target.value }); setMessage(''); }} placeholder="Leave blank for phone-number payments" className="mt-2 block w-full rounded-xl border border-slate-300 px-4 py-3" aria-describedby="payment-upi-help" />
          </label>
          <p id="payment-upi-help" className="text-xs text-slate-500">Changing the number clears the previous UPI ID. You can enter the new recipient’s linked ID here. When present, payment links send to this UPI ID. Leave it blank to copy the phone number and open the app.</p>
          <button type="submit" className="inline-flex items-center gap-2 rounded-xl bg-indigo-600 px-5 py-3 text-sm font-bold text-white hover:bg-indigo-700"><Save className="w-4 h-4" />{saving ? 'Saving…' : 'Save Payment Settings'}</button>
        </fieldset>
      </form> : <button type="button" onClick={() => void loadSettings()} className="rounded-xl bg-indigo-600 px-5 py-3 text-sm font-bold text-white">Retry</button>}
  </div>;
}
