'use client';

import React, { useState, useEffect, Suspense } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import { useSession, signIn } from 'next-auth/react';
import Link from 'next/link';
import {
  User,
  ShieldCheck,
  ArrowRight,
  Sparkles,
  Lock,
  Mail,
  Phone,
  CheckCircle2,
  AlertCircle,
  RefreshCw,
  Stethoscope
} from 'lucide-react';
import Logo from '@/components/shared/Logo';

export default function PatientLoginPage() {
  return (
    <Suspense
      fallback={
        <div className="min-h-screen bg-slate-50 flex items-center justify-center">
          <RefreshCw className="w-6 h-6 animate-spin text-teal-600" />
        </div>
      }
    >
      <PatientLoginContent />
    </Suspense>
  );
}

function PatientLoginContent() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const { data: session, status } = useSession();

  const doctorParam = searchParams.get('doctor');
  const redirectParam = searchParams.get('redirect');

  const targetUrl = doctorParam
    ? `/patient/book?doctor=${encodeURIComponent(doctorParam)}&service=srv_doc`
    : redirectParam || '/patient/dashboard';

  const [mode, setMode] = useState<'LOGIN' | 'REGISTER'>('LOGIN');
  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [phone, setPhone] = useState('');
  const [password, setPassword] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // If already authenticated, redirect
  useEffect(() => {
    if (status === 'authenticated' && session?.user) {
      router.push(targetUrl);
    }
  }, [status, session, targetUrl, router]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError(null);

    try {
      if (mode === 'REGISTER') {
        const res = await fetch('/api/auth/register', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            name,
            email,
            phone,
            password: password || 'Patient@123',
            role: 'PATIENT',
          }),
        });
        const data = await res.json();
        if (!res.ok) {
          throw new Error(data.error || 'Failed to create patient account');
        }
      }

      // Sign in using NextAuth credentials
      const signInRes = await signIn('credentials', {
        redirect: false,
        email: email.trim().toLowerCase(),
        password: password || 'Patient@123',
      });

      if (signInRes?.error) {
        throw new Error(signInRes.error);
      }

      router.push(targetUrl);
    } catch (err: any) {
      setError(err.message || 'Authentication failed. Please check your credentials.');
    } finally {
      setLoading(false);
    }
  };

  const handleQuickGuestBooking = () => {
    router.push(targetUrl);
  };

  return (
    <div className="min-h-screen bg-slate-50 flex flex-col justify-center py-12 sm:px-6 lg:px-8">
      <div className="sm:mx-auto sm:w-full sm:max-w-md text-center space-y-4">
        <div className="flex justify-center">
          <Logo size="lg" href="/" />
        </div>
        <div className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-teal-50 border border-teal-200 text-teal-800 text-xs font-bold">
          <Sparkles className="w-3.5 h-3.5 text-teal-600" />
          <span>Patient Portal & Home Care Booking</span>
        </div>
        <h2 className="text-2xl font-black text-slate-900 font-heading">
          {mode === 'LOGIN' ? 'Sign In to Book Care' : 'Create Patient Account'}
        </h2>
        <p className="text-xs text-slate-500 max-w-xs mx-auto">
          Schedule doctor home visits, view lab reports, and manage family health profiles.
        </p>
      </div>

      <div className="mt-8 sm:mx-auto sm:w-full sm:max-w-md px-4 sm:px-0">
        <div className="bg-white py-8 px-6 sm:px-10 rounded-3xl border border-slate-200 shadow-xl space-y-6">
          {doctorParam && (
            <div className="p-4 rounded-2xl bg-teal-50 border border-teal-200 flex items-center justify-between text-xs">
              <div className="flex items-center gap-2 text-teal-900 font-bold">
                <Stethoscope className="w-4 h-4 text-teal-600 shrink-0" />
                <span>Doctor pre-selected for your home visit</span>
              </div>
              <button
                type="button"
                onClick={handleQuickGuestBooking}
                className="px-3 py-1 rounded-lg bg-teal-600 text-white font-bold hover:bg-teal-700 transition-all shrink-0"
              >
                Proceed &rarr;
              </button>
            </div>
          )}

          {error && (
            <div className="p-3.5 rounded-2xl bg-rose-50 border border-rose-200 text-rose-800 text-xs font-semibold flex items-center gap-2">
              <AlertCircle className="w-4 h-4 shrink-0 text-rose-600" />
              <span>{error}</span>
            </div>
          )}

          <form onSubmit={handleSubmit} className="space-y-4 text-xs">
            {mode === 'REGISTER' && (
              <div>
                <label className="block text-slate-700 font-bold mb-1">Full Name</label>
                <div className="relative">
                  <User className="w-4 h-4 text-slate-400 absolute left-3.5 top-1/2 -translate-y-1/2" />
                  <input
                    type="text"
                    required
                    placeholder="e.g. Ramesh Kumar"
                    value={name}
                    onChange={(e) => setName(e.target.value)}
                    className="w-full pl-10 pr-3.5 py-2.5 rounded-xl border border-slate-200 bg-slate-50 text-slate-900 font-medium focus:outline-none focus:border-teal-600"
                  />
                </div>
              </div>
            )}

            <div>
              <label className="block text-slate-700 font-bold mb-1">Email Address</label>
              <div className="relative">
                <Mail className="w-4 h-4 text-slate-400 absolute left-3.5 top-1/2 -translate-y-1/2" />
                <input
                  type="email"
                  required
                  placeholder="patient@homedigo.care"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  className="w-full pl-10 pr-3.5 py-2.5 rounded-xl border border-slate-200 bg-slate-50 text-slate-900 font-medium focus:outline-none focus:border-teal-600"
                />
              </div>
            </div>

            {mode === 'REGISTER' && (
              <div>
                <label className="block text-slate-700 font-bold mb-1">Phone Number</label>
                <div className="relative">
                  <Phone className="w-4 h-4 text-slate-400 absolute left-3.5 top-1/2 -translate-y-1/2" />
                  <input
                    type="tel"
                    required
                    placeholder="+91 98450 12345"
                    value={phone}
                    onChange={(e) => setPhone(e.target.value)}
                    className="w-full pl-10 pr-3.5 py-2.5 rounded-xl border border-slate-200 bg-slate-50 text-slate-900 font-medium focus:outline-none focus:border-teal-600"
                  />
                </div>
              </div>
            )}

            <div>
              <label className="block text-slate-700 font-bold mb-1">Password</label>
              <div className="relative">
                <Lock className="w-4 h-4 text-slate-400 absolute left-3.5 top-1/2 -translate-y-1/2" />
                <input
                  type="password"
                  required
                  placeholder="••••••••"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  className="w-full pl-10 pr-3.5 py-2.5 rounded-xl border border-slate-200 bg-slate-50 text-slate-900 font-medium focus:outline-none focus:border-teal-600"
                />
              </div>
            </div>

            <button
              type="submit"
              disabled={loading}
              className="w-full py-3 px-4 rounded-xl bg-teal-600 hover:bg-teal-700 text-white font-bold text-xs shadow-md shadow-teal-600/20 transition-all flex items-center justify-center gap-2"
            >
              {loading && <RefreshCw className="w-4 h-4 animate-spin" />}
              <span>{mode === 'LOGIN' ? 'Sign In & Continue' : 'Create Account & Continue'}</span>
              <ArrowRight className="w-4 h-4" />
            </button>
          </form>

          <div className="relative border-t border-slate-100 pt-4 text-center">
            <button
              type="button"
              onClick={() => setMode(mode === 'LOGIN' ? 'REGISTER' : 'LOGIN')}
              className="text-xs font-bold text-teal-700 hover:underline"
            >
              {mode === 'LOGIN' ? "Don't have an account? Sign Up" : 'Already have an account? Sign In'}
            </button>
          </div>

          <div className="pt-2 border-t border-slate-100 flex items-center justify-center gap-2 text-[11px] text-slate-400">
            <ShieldCheck className="w-3.5 h-3.5 text-emerald-600" />
            <span>256-bit Encrypted Clinical Privacy</span>
          </div>
        </div>
      </div>
    </div>
  );
}
