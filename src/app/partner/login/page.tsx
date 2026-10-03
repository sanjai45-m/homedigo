'use client';

import React, { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { signIn, useSession } from 'next-auth/react';
import Link from 'next/link';
import {
  Stethoscope,
  Lock,
  Mail,
  Eye,
  EyeOff,
  ArrowRight,
  ShieldCheck,
  AlertCircle,
  HeartPulse,
  Loader2,
  UserCheck,
  UserPlus,
  User,
  Phone,
  Briefcase,
  CheckCircle2,
} from 'lucide-react';
import Logo from '@/components/shared/Logo';

export default function PartnerLoginPage() {
  const router = useRouter();
  const { data: session, status } = useSession();
  
  // Active mode: 'login' | 'register'
  const [mode, setMode] = useState<'login' | 'register'>('login');

  // Form states
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [name, setName] = useState('');
  const [phone, setPhone] = useState('');
  const [partnerType, setPartnerType] = useState<'DOCTOR' | 'NURSE' | 'PHYSIOTHERAPIST' | 'CAREGIVER'>('DOCTOR');
  const [specialization, setSpecialization] = useState('General Physician & Home Care');

  const [showPassword, setShowPassword] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [successMsg, setSuccessMsg] = useState<string | null>(null);

  // If already logged in as PARTNER, go to dashboard
  useEffect(() => {
    if (status === 'authenticated') {
      const role = (session?.user as any)?.role;
      if (role === 'PARTNER') {
        router.replace('/partner/dashboard');
      }
    }
  }, [status, session, router]);

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    setSuccessMsg(null);
    setLoading(true);

    try {
      const res = await signIn('credentials-login', {
        email: email.trim().toLowerCase(),
        password,
        expectedRole: 'PARTNER',
        redirect: false,
      });

      if (res?.error) {
        setError(res.error);
      } else if (res?.ok) {
        router.push('/partner/dashboard');
        router.refresh();
      }
    } catch (err: any) {
      setError(err.message || 'Login failed. Please check your credentials.');
    } finally {
      setLoading(false);
    }
  };

  const handleRegister = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    setSuccessMsg(null);
    setLoading(true);

    try {
      const regRes = await fetch('/api/partner/register', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          name,
          email: email.trim().toLowerCase(),
          phone,
          password,
          partnerType,
          specialization,
        }),
      });

      const data = await regRes.json();

      if (!regRes.ok || data.error) {
        throw new Error(data.error || 'Failed to register account');
      }

      setSuccessMsg('Account created successfully! Auto-signing in...');

      // Auto sign-in with the new credentials
      const res = await signIn('credentials-login', {
        email: email.trim().toLowerCase(),
        password,
        expectedRole: 'PARTNER',
        redirect: false,
      });

      if (res?.ok) {
        router.push('/partner/dashboard');
        router.refresh();
      } else {
        // Fallback to login mode if auto-sign-in fails
        setMode('login');
      }
    } catch (err: any) {
      setError(err.message || 'Registration failed. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-900 via-teal-950 to-emerald-950 flex flex-col justify-center py-12 sm:px-6 lg:px-8 relative overflow-hidden">
      {/* Background decorative blobs */}
      <div className="absolute top-0 right-0 w-[500px] h-[500px] bg-teal-500/10 rounded-full blur-3xl pointer-events-none -mr-40 -mt-40" />
      <div className="absolute bottom-0 left-0 w-[500px] h-[500px] bg-emerald-500/10 rounded-full blur-3xl pointer-events-none -ml-40 -mb-40" />
      <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[800px] h-[800px] bg-teal-600/5 rounded-full blur-3xl pointer-events-none" />

      <div className="sm:mx-auto sm:w-full sm:max-w-md relative z-10">
        {/* Logo & Brand */}
        <div className="flex flex-col items-center justify-center text-center mb-6 space-y-3">
          <div className="p-3 bg-white/5 backdrop-blur-sm rounded-3xl border border-white/10 inline-block">
            <Logo size="lg" href="/" showBadge="Clinician Portal" />
          </div>

          <div className="space-y-1">
            <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-teal-500/20 border border-teal-500/30 text-teal-300 text-xs font-bold">
              <HeartPulse className="w-3.5 h-3.5" />
              <span>Clinician Field Operations Portal</span>
            </div>
            <h1 className="text-2xl font-black text-white tracking-tight mt-2">
              {mode === 'login' ? 'Partner / Clinician Sign In' : 'Register New Partner / Doctor'}
            </h1>
            <p className="text-sm text-slate-400 font-medium">
              {mode === 'login'
                ? 'Doctors & Nurses — Access your field visit dashboard'
                : 'Create your partner account to accept home care visits'}
            </p>
          </div>
        </div>

        {/* Mode Switcher Tabs */}
        <div className="flex bg-white/5 backdrop-blur-md p-1 rounded-2xl border border-white/10 mb-6">
          <button
            type="button"
            onClick={() => {
              setMode('login');
              setError(null);
              setSuccessMsg(null);
            }}
            className={`flex-1 py-2.5 rounded-xl text-xs font-bold transition-all flex items-center justify-center gap-2 ${
              mode === 'login'
                ? 'bg-gradient-to-r from-teal-600 to-emerald-600 text-white shadow-md'
                : 'text-slate-400 hover:text-white'
            }`}
          >
            <UserCheck className="w-3.5 h-3.5" />
            <span>Sign In</span>
          </button>
          <button
            type="button"
            onClick={() => {
              setMode('register');
              setError(null);
              setSuccessMsg(null);
            }}
            className={`flex-1 py-2.5 rounded-xl text-xs font-bold transition-all flex items-center justify-center gap-2 ${
              mode === 'register'
                ? 'bg-gradient-to-r from-teal-600 to-emerald-600 text-white shadow-md'
                : 'text-slate-400 hover:text-white'
            }`}
          >
            <UserPlus className="w-3.5 h-3.5" />
            <span>Create Partner Account</span>
          </button>
        </div>

        {/* Main Card */}
        <div className="bg-white/5 backdrop-blur-xl border border-white/10 rounded-3xl px-8 py-8 shadow-2xl space-y-6">
          {error && (
            <div className="p-4 rounded-2xl bg-rose-500/10 border border-rose-500/30 text-rose-300 text-xs font-medium flex items-start gap-3">
              <AlertCircle className="w-5 h-5 text-rose-400 shrink-0 mt-0.5" />
              <span>{error}</span>
            </div>
          )}

          {successMsg && (
            <div className="p-4 rounded-2xl bg-emerald-500/10 border border-emerald-500/30 text-emerald-300 text-xs font-medium flex items-start gap-3">
              <CheckCircle2 className="w-5 h-5 text-emerald-400 shrink-0 mt-0.5" />
              <span>{successMsg}</span>
            </div>
          )}

          {mode === 'login' ? (
            /* ================= LOGIN FORM ================= */
            <form className="space-y-5" onSubmit={handleLogin}>
              {/* Email */}
              <div>
                <label className="block text-xs font-bold text-slate-300 uppercase tracking-wider mb-2">
                  Registered Email Address
                </label>
                <div className="relative">
                  <div className="absolute inset-y-0 left-0 pl-3.5 flex items-center pointer-events-none">
                    <Mail className="w-4 h-4 text-slate-500" />
                  </div>
                  <input
                    id="partner-email"
                    type="email"
                    required
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    placeholder="doctor@homedigo.care"
                    className="block w-full pl-10 pr-4 py-3 bg-white/5 border border-white/10 rounded-2xl text-white text-xs font-medium placeholder-slate-500 focus:outline-none focus:ring-2 focus:ring-teal-500/50 focus:border-teal-500/50 transition-all"
                  />
                </div>
              </div>

              {/* Password */}
              <div>
                <label className="block text-xs font-bold text-slate-300 uppercase tracking-wider mb-2">
                  Password
                </label>
                <div className="relative">
                  <div className="absolute inset-y-0 left-0 pl-3.5 flex items-center pointer-events-none">
                    <Lock className="w-4 h-4 text-slate-500" />
                  </div>
                  <input
                    id="partner-password"
                    type={showPassword ? 'text' : 'password'}
                    required
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    placeholder="••••••••••••"
                    className="block w-full pl-10 pr-10 py-3 bg-white/5 border border-white/10 rounded-2xl text-white text-xs font-medium placeholder-slate-500 focus:outline-none focus:ring-2 focus:ring-teal-500/50 focus:border-teal-500/50 transition-all"
                  />
                  <button
                    type="button"
                    onClick={() => setShowPassword(!showPassword)}
                    className="absolute inset-y-0 right-0 pr-3.5 flex items-center text-slate-500 hover:text-slate-300 transition-colors"
                  >
                    {showPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                  </button>
                </div>
              </div>

              {/* Security notice */}
              <div className="p-3.5 rounded-2xl bg-teal-500/10 border border-teal-500/20 flex items-center gap-2.5 text-teal-300 text-[11px] font-medium">
                <ShieldCheck className="w-4 h-4 text-teal-400 shrink-0" />
                <span>Direct Neon DB verification — Role-restricted to registered Partners</span>
              </div>

              {/* Submit */}
              <button
                id="partner-login-btn"
                type="submit"
                disabled={loading}
                className="w-full flex justify-center items-center gap-2 py-3.5 px-4 rounded-2xl text-white font-bold text-sm bg-gradient-to-r from-teal-600 to-emerald-600 hover:from-teal-500 hover:to-emerald-500 shadow-lg shadow-teal-900/40 hover:shadow-teal-700/30 transition-all transform active:scale-[0.99] disabled:opacity-60 disabled:cursor-not-allowed"
              >
                {loading ? (
                  <>
                    <Loader2 className="w-4 h-4 animate-spin" />
                    <span>Authenticating...</span>
                  </>
                ) : (
                  <>
                    <UserCheck className="w-4 h-4" />
                    <span>Sign In to Field Portal</span>
                    <ArrowRight className="w-4 h-4" />
                  </>
                )}
              </button>
            </form>
          ) : (
            /* ================= REGISTER FORM ================= */
            <form className="space-y-4" onSubmit={handleRegister}>
              {/* Partner Type Selector */}
              <div>
                <label className="block text-xs font-bold text-slate-300 uppercase tracking-wider mb-2">
                  Select Healthcare Role
                </label>
                <div className="grid grid-cols-2 gap-2">
                  {[
                    { val: 'DOCTOR', label: 'Doctor / Physician' },
                    { val: 'NURSE', label: 'Registered Nurse' },
                    { val: 'PHYSIOTHERAPIST', label: 'Physiotherapist' },
                    { val: 'CAREGIVER', label: 'Caregiver / Attendant' },
                  ].map((t) => (
                    <button
                      key={t.val}
                      type="button"
                      onClick={() => {
                        setPartnerType(t.val as any);
                        setSpecialization(
                          t.val === 'DOCTOR'
                            ? 'General Physician & Home Care'
                            : t.val === 'NURSE'
                            ? 'ICU / Clinical Nurse'
                            : t.val === 'PHYSIOTHERAPIST'
                            ? 'Orthopedic Physiotherapist'
                            : 'Patient Assistant'
                        );
                      }}
                      className={`p-2.5 rounded-xl border text-xs font-bold text-left transition-all ${
                        partnerType === t.val
                          ? 'border-teal-500 bg-teal-500/20 text-teal-200'
                          : 'border-white/10 bg-white/5 text-slate-400 hover:bg-white/10'
                      }`}
                    >
                      {t.label}
                    </button>
                  ))}
                </div>
              </div>

              {/* Full Name */}
              <div>
                <label className="block text-xs font-bold text-slate-300 uppercase tracking-wider mb-1.5">
                  Full Name
                </label>
                <div className="relative">
                  <div className="absolute inset-y-0 left-0 pl-3.5 flex items-center pointer-events-none">
                    <User className="w-4 h-4 text-slate-500" />
                  </div>
                  <input
                    type="text"
                    required
                    value={name}
                    onChange={(e) => setName(e.target.value)}
                    placeholder={partnerType === 'DOCTOR' ? 'Dr. Ananya Mukherjee' : 'Priya Sharma'}
                    className="block w-full pl-10 pr-4 py-2.5 bg-white/5 border border-white/10 rounded-2xl text-white text-xs font-medium placeholder-slate-500 focus:outline-none focus:ring-2 focus:ring-teal-500/50"
                  />
                </div>
              </div>

              {/* Email */}
              <div>
                <label className="block text-xs font-bold text-slate-300 uppercase tracking-wider mb-1.5">
                  Email Address
                </label>
                <div className="relative">
                  <div className="absolute inset-y-0 left-0 pl-3.5 flex items-center pointer-events-none">
                    <Mail className="w-4 h-4 text-slate-500" />
                  </div>
                  <input
                    type="email"
                    required
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    placeholder="doctor@homedigo.care"
                    className="block w-full pl-10 pr-4 py-2.5 bg-white/5 border border-white/10 rounded-2xl text-white text-xs font-medium placeholder-slate-500 focus:outline-none focus:ring-2 focus:ring-teal-500/50"
                  />
                </div>
              </div>

              {/* Password */}
              <div>
                <label className="block text-xs font-bold text-slate-300 uppercase tracking-wider mb-1.5">
                  Create Password (Min 6 chars)
                </label>
                <div className="relative">
                  <div className="absolute inset-y-0 left-0 pl-3.5 flex items-center pointer-events-none">
                    <Lock className="w-4 h-4 text-slate-500" />
                  </div>
                  <input
                    type={showPassword ? 'text' : 'password'}
                    required
                    minLength={6}
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    placeholder="Set your account password"
                    className="block w-full pl-10 pr-10 py-2.5 bg-white/5 border border-white/10 rounded-2xl text-white text-xs font-medium placeholder-slate-500 focus:outline-none focus:ring-2 focus:ring-teal-500/50"
                  />
                  <button
                    type="button"
                    onClick={() => setShowPassword(!showPassword)}
                    className="absolute inset-y-0 right-0 pr-3.5 flex items-center text-slate-500 hover:text-slate-300"
                  >
                    {showPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                  </button>
                </div>
              </div>

              {/* Phone & Specialization */}
              <div className="grid grid-cols-2 gap-2">
                <div>
                  <label className="block text-xs font-bold text-slate-300 uppercase tracking-wider mb-1.5">
                    Phone Number
                  </label>
                  <div className="relative">
                    <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                      <Phone className="w-3.5 h-3.5 text-slate-500" />
                    </div>
                    <input
                      type="text"
                      value={phone}
                      onChange={(e) => setPhone(e.target.value)}
                      placeholder="+91 98765 43210"
                      className="block w-full pl-9 pr-3 py-2.5 bg-white/5 border border-white/10 rounded-2xl text-white text-xs font-medium placeholder-slate-500 focus:outline-none focus:ring-2 focus:ring-teal-500/50"
                    />
                  </div>
                </div>

                <div>
                  <label className="block text-xs font-bold text-slate-300 uppercase tracking-wider mb-1.5">
                    Specialization
                  </label>
                  <div className="relative">
                    <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                      <Briefcase className="w-3.5 h-3.5 text-slate-500" />
                    </div>
                    <input
                      type="text"
                      value={specialization}
                      onChange={(e) => setSpecialization(e.target.value)}
                      placeholder="e.g. Diabetologist"
                      className="block w-full pl-9 pr-3 py-2.5 bg-white/5 border border-white/10 rounded-2xl text-white text-xs font-medium placeholder-slate-500 focus:outline-none focus:ring-2 focus:ring-teal-500/50"
                    />
                  </div>
                </div>
              </div>

              {/* Submit Register */}
              <button
                type="submit"
                disabled={loading}
                className="w-full flex justify-center items-center gap-2 py-3.5 px-4 rounded-2xl text-white font-bold text-sm bg-gradient-to-r from-teal-600 to-emerald-600 hover:from-teal-500 hover:to-emerald-500 shadow-lg shadow-teal-900/40 hover:shadow-teal-700/30 transition-all transform active:scale-[0.99] disabled:opacity-60 disabled:cursor-not-allowed mt-4"
              >
                {loading ? (
                  <>
                    <Loader2 className="w-4 h-4 animate-spin" />
                    <span>Registering Account...</span>
                  </>
                ) : (
                  <>
                    <UserPlus className="w-4 h-4" />
                    <span>Create Partner Account & Log In</span>
                    <ArrowRight className="w-4 h-4" />
                  </>
                )}
              </button>
            </form>
          )}

          {/* Bottom Navigation Links */}
          <div className="relative border-t border-white/10 pt-5 space-y-2 text-center">
            <p className="text-[11px] text-slate-500">
              {mode === 'login'
                ? "Don't have a partner account yet? Click 'Create Partner Account' above."
                : "Already have an account? Click 'Sign In' above."}
            </p>
            <div className="flex items-center justify-center gap-4 pt-1">
              <Link
                href="/patient/login"
                className="text-xs font-semibold text-slate-400 hover:text-teal-300 transition-colors"
              >
                Patient Login →
              </Link>
              <span className="text-slate-600">·</span>
              <Link
                href="/admin/login"
                className="text-xs font-semibold text-slate-400 hover:text-amber-300 transition-colors"
              >
                Admin Login →
              </Link>
            </div>
          </div>
        </div>

        {/* Footer badge */}
        <div className="mt-6 text-center">
          <p className="text-[11px] text-slate-600 flex items-center justify-center gap-1.5">
            <Stethoscope className="w-3.5 h-3.5 text-teal-600" />
            <span>Homedigo Clinician Field Management System</span>
          </p>
        </div>
      </div>
    </div>
  );
}
