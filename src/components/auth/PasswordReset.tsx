'use client';

import { useEffect, useState, type FormEvent } from 'react';
import Link from 'next/link';

export default function PasswordReset({ portal }: { portal: 'patient' | 'partner' | 'admin' }) {
  const [email, setEmail] = useState('');
  const [requestId, setRequestId] = useState('');
  const [code, setCode] = useState('');
  const [token, setToken] = useState('');
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [stage, setStage] = useState<'request' | 'reset' | 'waiting' | 'done'>('request');
  const [busy, setBusy] = useState(false);
  const [message, setMessage] = useState('');
  const [error, setError] = useState('');
  const [resendAt, setResendAt] = useState(0);
  const [seconds, setSeconds] = useState(0);

  useEffect(() => {
    if (portal !== 'admin') return;
    const params = new URLSearchParams(window.location.hash.slice(1));
    const id = params.get('id'), secret = params.get('token');
    if (id && secret) {
      // The secret stays out of server logs, referrers and subsequent browser history entries.
      window.history.replaceState(null, '', window.location.pathname);
      queueMicrotask(() => { setRequestId(id); setToken(secret); setStage('reset'); });
    }
  }, [portal]);
  useEffect(() => {
    const timer = window.setInterval(() => setSeconds(Math.max(0, Math.ceil((resendAt - Date.now()) / 1000))), 500);
    return () => window.clearInterval(timer);
  }, [resendAt]);

  async function sendRequest() {
    setBusy(true); setError(''); setMessage('');
    try {
      const response = await fetch('/api/auth/password-reset', {
        method: 'POST', headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ action: 'request', email, role: portal.toUpperCase() }),
      });
      const data = await response.json();
      if (!response.ok) throw new Error(data.error || 'Could not request a password reset.');
      setRequestId(data.requestId); setCode(''); setMessage(data.message);
      setStage(portal === 'admin' ? 'waiting' : 'reset');
      setResendAt(Date.now() + 60000); setSeconds(60);
    } catch (error) { setError(error instanceof Error ? error.message : 'Please try again.'); }
    finally { setBusy(false); }
  }
  async function submit(event: FormEvent) {
    event.preventDefault();
    if (stage === 'request') { await sendRequest(); return; }
    if (password !== confirmPassword) { setError('The passwords do not match.'); return; }
    setBusy(true); setError(''); setMessage('');
    try {
      const response = await fetch('/api/auth/password-reset', {
        method: 'POST', headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ action: 'reset', role: portal.toUpperCase(), requestId, secret: portal === 'admin' ? token : code, password, confirmPassword }),
      });
      const data = await response.json();
      if (!response.ok) throw new Error(data.error || 'Could not reset your password.');
      setMessage(data.message); setPassword(''); setConfirmPassword(''); setToken(''); setCode(''); setStage('done');
    } catch (error) { setError(error instanceof Error ? error.message : 'Please try again.'); }
    finally { setBusy(false); }
  }
  const fieldClass = 'mt-2 w-full rounded-xl border border-slate-300 p-3 text-slate-900';
  return <main className="min-h-screen bg-teal-50/40 flex items-center justify-center px-4 py-12">
    <section className="w-full max-w-md rounded-3xl border border-slate-200 bg-white p-7 shadow-sm space-y-5">
      <Link href="/" className="text-teal-700 font-bold">HomeDigo</Link>
      <p className="text-xs uppercase tracking-wide text-slate-500">{portal} password recovery</p>
      <h1 className="text-2xl font-bold text-slate-900">{stage === 'done' ? 'Password reset complete' : stage === 'waiting' ? 'Approval requested' : stage === 'reset' ? 'Set a new password' : 'Forgot your password?'}</h1>
      {stage === 'request' && <p className="text-sm text-slate-600">{portal === 'admin'
        ? 'Enter your admin email. A Super Admin must approve your request before a secure reset link is emailed to you.'
        : 'Enter your account email to receive a six-digit verification code.'}</p>}
      {message && <p role="status" className="rounded-xl bg-teal-50 p-3 text-sm text-teal-900">{message}</p>}
      {error && <p role="alert" className="rounded-xl bg-red-50 p-3 text-sm text-red-800">{error}</p>}
      {(stage === 'request' || stage === 'reset') && <form onSubmit={submit} className="space-y-4">
        <fieldset disabled={busy} className="space-y-4">
          {stage === 'request' ? <label className="block text-sm font-medium">Account email
            <input type="email" autoComplete="email" required maxLength={254} value={email} onChange={event => setEmail(event.target.value)} className={fieldClass} />
          </label> : <>
            {portal !== 'admin' && <label className="block text-sm font-medium">Verification code
              <input type="text" inputMode="numeric" autoComplete="one-time-code" pattern="[0-9]{6}" maxLength={6} required value={code} onChange={event => setCode(event.target.value.replace(/\D/g, ''))} className={fieldClass} />
              <span className="mt-2 block font-normal text-xs text-slate-500">Sent to {email}. Valid for 10 minutes, with up to 5 attempts. Use the latest code.</span>
            </label>}
            <label className="block text-sm font-medium">New password
              <input type="password" autoComplete="new-password" minLength={12} maxLength={128} required value={password} onChange={event => setPassword(event.target.value)} className={fieldClass} />
              <span className="mt-1 block text-xs font-normal text-slate-500">Use 12 to 128 characters.</span>
            </label>
            <label className="block text-sm font-medium">Confirm new password
              <input type="password" autoComplete="new-password" minLength={12} maxLength={128} required value={confirmPassword} onChange={event => setConfirmPassword(event.target.value)} className={fieldClass} />
            </label>
          </>}
          <button type="submit" className="w-full rounded-xl bg-teal-700 p-3 font-bold text-white disabled:opacity-50">
            {busy ? 'Please wait…' : stage === 'reset' ? 'Reset password' : portal === 'admin' ? 'Request Super Admin approval' : 'Send verification code'}
          </button>
        </fieldset>
      </form>}
      {stage === 'reset' && portal !== 'admin' && <button type="button" disabled={busy || seconds > 0} onClick={() => void sendRequest()} className="text-sm font-semibold text-teal-700 disabled:text-slate-400">
        {seconds > 0 ? `Resend code in ${seconds}s` : 'Resend verification code'}
      </button>}
      {(stage === 'waiting' || stage === 'reset') && <button type="button" disabled={busy} onClick={() => { setStage('request'); setMessage(''); setError(''); setToken(''); }} className="block text-sm text-teal-700 underline">Start a new request</button>}
      <Link href={`/${portal}/login`} className="block text-sm font-semibold text-teal-700 underline">Back to sign in</Link>
    </section>
  </main>;
}
