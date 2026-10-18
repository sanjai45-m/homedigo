'use client';

import FeedbackToast from '@/components/shared/FeedbackToast';

import { useState, type FormEvent } from 'react';
import { signIn, useSession } from 'next-auth/react';

export default function CheckoutSignIn({ onSignedIn }: { onSignedIn: () => void }) {
  const { data: session, update } = useSession();
  const [register, setRegister] = useState(false);
  const [name, setName] = useState('');
  const [phone, setPhone] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState('');

  async function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (busy) return;
    setBusy(true); setError('');
    try {
      if (register) {
        const response = await fetch('/api/auth/register', {
          method: 'POST', headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ name, phone, email, password }),
        });
        const data = await response.json();
        if (!response.ok) throw new Error(data.error || 'Could not create your account.');
        setRegister(false);
      }
      const result = await signIn('credentials-login', {
        email: email.trim().toLowerCase(), password, expectedRole: 'PATIENT', redirect: false,
      });
      if (!result?.ok || result.error) throw new Error('Could not sign in. Check your patient email and password.');
      const refreshed = await update();
      if ((refreshed?.user as { role?: string })?.role !== 'PATIENT') throw new Error('Please use a patient account to book this visit.');
      setPassword('');
      onSignedIn();
    } catch (error) { setError(error instanceof Error ? error.message : 'Could not sign in. Please try again.'); }
    finally { setBusy(false); }
  }

  return <section className="rounded-2xl border border-teal-200 bg-teal-50 p-5 space-y-4" aria-labelledby="checkout-sign-in-title">
    <h3 id="checkout-sign-in-title" className="text-lg font-bold text-slate-900">{register ? 'Create a patient account' : 'Sign in to continue your appointment'}</h3>
    <p className="text-sm text-slate-600">Your booking selections and receipt stay here while you sign in.</p>
    {session && <p className="text-sm text-slate-600">Use a patient account to continue. Signing in will switch this browser to that account.</p>}
    <form onSubmit={submit}>
      <fieldset disabled={busy} className="grid gap-4 sm:grid-cols-2 disabled:opacity-60">
        {register && <>
          <label className="text-sm font-semibold">Full name<input required maxLength={100} autoComplete="name" value={name} onChange={e => setName(e.target.value)} className="mt-1 block w-full rounded-xl border border-slate-300 bg-white p-3" /></label>
          <label className="text-sm font-semibold">Phone number<input required type="tel" maxLength={20} autoComplete="tel" value={phone} onChange={e => setPhone(e.target.value)} className="mt-1 block w-full rounded-xl border border-slate-300 bg-white p-3" /></label>
        </>}
        <label className="text-sm font-semibold">Patient email<input required type="email" maxLength={254} autoComplete="email" value={email} onChange={e => setEmail(e.target.value)} className="mt-1 block w-full rounded-xl border border-slate-300 bg-white p-3" /></label>
        <label className="text-sm font-semibold">Password<input required type="password" maxLength={128} minLength={register ? 8 : undefined} autoComplete={register ? 'new-password' : 'current-password'} value={password} onChange={e => setPassword(e.target.value)} className="mt-1 block w-full rounded-xl border border-slate-300 bg-white p-3" /></label>
        <button type="submit" className="rounded-xl bg-teal-700 px-5 py-3 font-bold text-white sm:col-span-2">{busy ? 'Please wait…' : register ? 'Create account & continue' : 'Sign in & continue'}</button>
      </fieldset>
    </form>
    {!register && <a href="/reset-password/patient" target="_blank" rel="noopener noreferrer" className="block text-sm font-semibold text-teal-700 underline">Forgot password? Reset in a new tab</a>}
    <FeedbackToast message={error} onDismiss={() => setError('')} />
    <button type="button" disabled={busy} onClick={() => { setRegister(!register); setError(''); }} className="text-sm font-bold text-teal-800 underline">{register ? 'Already have an account? Sign in' : 'New patient? Create an account'}</button>
  </section>;
}
