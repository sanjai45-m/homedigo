'use client';

import { useCallback, useEffect, useState } from 'react';
import { staffFetch } from '@/lib/staff-client';

type ResetRequest = { id: string; name: string; email: string; status: string; created_at: string; expires_at: string; expired: boolean; decided_by_name?: string };
export default function PasswordResetRequests() {
  const [requests, setRequests] = useState<ResetRequest[]>([]);
  const [loading, setLoading] = useState(true);
  const [busy, setBusy] = useState<string | null>(null);
  const [error, setError] = useState('');
  const [message, setMessage] = useState('');
  const load = useCallback(async () => {
    try {
      const response = await staffFetch('/api/super-admin/password-resets');
      const data = await response.json();
      if (!response.ok) throw new Error(data.error || 'Could not load reset requests.');
      setRequests(data.requests); setError('');
    } catch (error) { setError(error instanceof Error ? error.message : 'Please retry.'); }
    finally { setLoading(false); }
  }, []);
  useEffect(() => { let active = true; queueMicrotask(() => { if (active) void load(); }); return () => { active = false; }; }, [load]);
  async function decide(id: string, action: 'approve' | 'reject') {
    setBusy(id); setMessage(''); setError('');
    try {
      const response = await staffFetch('/api/super-admin/password-resets', {
        method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ id, action }),
      });
      const data = await response.json();
      await load();
      if (!response.ok) throw new Error(data.error || 'Could not process request.');
      setMessage(data.message);
    } catch (error) { setError(error instanceof Error ? error.message : 'Please retry.'); }
    finally { setBusy(null); }
  }
  return <main className="p-6 md:p-10 space-y-6 max-w-5xl mx-auto">
    <div className="flex items-start justify-between gap-4">
      <div><h1 className="text-2xl font-bold">Admin password reset requests</h1>
        <p className="text-sm text-slate-600 mt-2">Approve only requests you recognize. Approval emails a one-time reset link to the admin’s registered address. Requests expire after 24 hours.</p></div>
      <button type="button" onClick={() => void load()} disabled={busy !== null} className="rounded-xl border px-4 py-2 text-sm">Refresh</button>
    </div>
    {error && <p role="alert" className="rounded-xl bg-red-50 p-4 text-red-800">{error}</p>}
    {message && <p role="status" className="rounded-xl bg-teal-50 p-4 text-teal-900">{message}</p>}
    {loading ? <p role="status">Loading requests…</p> : requests.length === 0 ? <p>No admin password reset requests.</p> :
      <ul className="space-y-4">{requests.map(request => {
        const expired = request.expired;
        const actionable = !expired && ['PENDING', 'EMAIL_FAILED'].includes(request.status);
        const sendingStale = !expired && request.status === 'SENDING';
        return <li key={request.id} className="rounded-2xl border border-slate-200 bg-white p-5 space-y-3">
          <div className="flex flex-wrap justify-between gap-3"><div><h2 className="font-bold">{request.name}</h2><p className="text-sm text-slate-600">{request.email}</p></div>
            <span className="text-xs font-semibold">{expired && !['USED', 'REJECTED'].includes(request.status) ? 'EXPIRED' : request.status.replaceAll('_', ' ')}</span></div>
          <p className="text-xs text-slate-500">Requested {new Date(request.created_at).toLocaleString()}{request.decided_by_name ? ` · Reviewed by ${request.decided_by_name}` : ''}</p>
          {(actionable || sendingStale) && <div className="flex flex-wrap gap-3">
            <button disabled={busy !== null} onClick={() => void decide(request.id, 'approve')} className="rounded-xl bg-teal-700 px-4 py-2 text-sm font-semibold text-white disabled:opacity-50">{busy === request.id ? 'Processing…' : request.status === 'PENDING' ? 'Approve & email reset link' : 'Retry sending reset link'}</button>
            {actionable && <button disabled={busy !== null} onClick={() => void decide(request.id, 'reject')} className="rounded-xl border border-red-200 px-4 py-2 text-sm text-red-700 disabled:opacity-50">Reject request</button>}
          </div>}
          {sendingStale && <p className="text-xs text-slate-500">If delivery was interrupted, retry after five minutes.</p>}
        </li>;
      })}</ul>}
  </main>;
}
