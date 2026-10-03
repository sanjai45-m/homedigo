'use client';

import React, { useState } from 'react';
import { signIn, signOut, useSession } from 'next-auth/react';
import Image from 'next/image';
import { 
  X, 
  ShieldCheck, 
  User, 
  Stethoscope, 
  Lock, 
  Sparkles, 
  CheckCircle2, 
  ArrowRight,
  LogOut
} from 'lucide-react';

interface AuthModalProps {
  isOpen: boolean;
  onClose: () => void;
  defaultRole?: 'PATIENT' | 'PARTNER' | 'ADMIN';
}

export default function AuthModal({ isOpen, onClose, defaultRole = 'PATIENT' }: AuthModalProps) {
  const { data: session } = useSession();
  const [selectedRole, setSelectedRole] = useState<'PATIENT' | 'PARTNER' | 'ADMIN'>(defaultRole);
  const [loading, setLoading] = useState(false);

  if (!isOpen) return null;

  const handleGoogleSignIn = async () => {
    setLoading(true);
    try {
      await signIn('google', { callbackUrl: '/' });
    } catch (err) {
      console.error('Google Sign In Error:', err);
    } finally {
      setLoading(false);
    }
  };

  const handleDemoRoleSignIn = async (role: 'PATIENT' | 'PARTNER' | 'ADMIN') => {
    setLoading(true);
    try {
      await signIn('demo-role-login', {
        role,
        redirect: false,
      });
      onClose();
    } catch (err) {
      console.error('Demo Login Error:', err);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-sm animate-in fade-in duration-200">
      <div 
        className="relative w-full max-w-md bg-white rounded-3xl shadow-2xl border border-slate-100 overflow-hidden"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header decoration */}
        <div className="bg-gradient-to-r from-blue-600 via-indigo-600 to-teal-500 p-6 text-white relative">
          <button 
            onClick={onClose}
            className="absolute top-5 right-5 p-1.5 rounded-full bg-white/20 hover:bg-white/30 transition-colors text-white"
          >
            <X className="w-5 h-5" />
          </button>
          
          <div className="flex items-center gap-3 mb-3">
            <div className="w-11 h-11 rounded-2xl bg-white p-0.5 flex items-center justify-center shadow-md">
              <Image
                src="/logo.png"
                alt="HomeDigo Logo"
                width={40}
                height={40}
                className="object-contain"
              />
            </div>
            <span className="text-xs font-bold uppercase tracking-wider bg-white/20 px-3 py-1 rounded-full">
              Secure Access
            </span>
          </div>
          
          <h3 className="text-2xl font-bold tracking-tight">
            {session ? 'Your Account' : 'Welcome to HomeDigo'}
          </h3>
          <p className="text-blue-100 text-sm mt-1">
            {session 
              ? `Logged in as ${(session.user as any)?.role || 'Patient'}`
              : 'Sign in to access personalized healthcare at home'}
          </p>
        </div>

        {/* Modal Body */}
        <div className="p-6 space-y-6">
          {session ? (
            /* Logged in state */
            <div className="space-y-4">
              <div className="flex items-center gap-4 p-4 rounded-2xl bg-blue-50/70 border border-blue-100">
                <img 
                  src={session.user?.image || 'https://images.unsplash.com/photo-1534528741775-53994a69daeb?auto=format&fit=crop&w=128&q=80'} 
                  alt={session.user?.name || 'User'} 
                  className="w-14 h-14 rounded-full object-cover ring-2 ring-blue-500/20"
                />
                <div>
                  <h4 className="font-semibold text-slate-900">{session.user?.name}</h4>
                  <p className="text-xs text-slate-500">{session.user?.email}</p>
                  <span className="inline-block mt-1 text-[11px] font-bold px-2 py-0.5 rounded-md bg-blue-600 text-white uppercase tracking-wider">
                    Role: {(session.user as any)?.role || 'PATIENT'}
                  </span>
                </div>
              </div>

              <div className="flex gap-3">
                <button
                  onClick={() => signOut()}
                  className="flex-1 flex items-center justify-center gap-2 py-3 px-4 rounded-xl border border-red-200 text-red-600 hover:bg-red-50 font-medium text-sm transition-colors"
                >
                  <LogOut className="w-4 h-4" />
                  Sign Out
                </button>
                <button
                  onClick={onClose}
                  className="flex-1 py-3 px-4 rounded-xl bg-blue-600 text-white hover:bg-blue-700 font-medium text-sm transition-colors shadow-sm"
                >
                  Continue
                </button>
              </div>
            </div>
          ) : (
            /* Not logged in: Sign in options */
            <>
              {/* Google Sign In (Primary OAuth) */}
              <div>
                <button
                  onClick={handleGoogleSignIn}
                  disabled={loading}
                  className="w-full flex items-center justify-center gap-3 py-3.5 px-4 bg-white hover:bg-slate-50 border-2 border-slate-200 hover:border-slate-300 text-slate-800 rounded-2xl font-semibold text-sm transition-all shadow-sm hover:shadow active:scale-[0.99] group"
                >
                  {/* Google G Logo SVG */}
                  <svg className="w-5 h-5" viewBox="0 0 24 24">
                    <path
                      fill="#4285F4"
                      d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z"
                    />
                    <path
                      fill="#34A853"
                      d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"
                    />
                    <path
                      fill="#FBBC05"
                      d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.06H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.94l2.85-2.22.81-.63z"
                    />
                    <path
                      fill="#EA4335"
                      d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.06l3.66 2.84c.87-2.6 3.3-4.52 6.16-4.52z"
                    />
                  </svg>
                  <span>Continue with Google</span>
                </button>
                <p className="text-[11px] text-slate-400 text-center mt-2 flex items-center justify-center gap-1.5">
                  <Lock className="w-3 h-3 text-slate-400" />
                  Fast & secure 1-click authentication
                </p>
              </div>

              {/* Divider */}
              <div className="relative flex items-center justify-center">
                <div className="border-t border-slate-200 w-full"></div>
                <span className="bg-white px-3 text-xs font-semibold text-slate-600 uppercase tracking-wider">
                  Or Instant Demo Access
                </span>
              </div>

              {/* Instant Role Access Buttons */}
              <div className="space-y-2.5">
                <p className="text-xs font-medium text-slate-600">
                  Select a portal role to experience the workflow:
                </p>
                
                {/* 1. Patient */}
                <button
                  onClick={() => handleDemoRoleSignIn('PATIENT')}
                  disabled={loading}
                  className="w-full flex items-center justify-between p-3 rounded-xl border border-blue-100 hover:border-blue-400 bg-blue-50/40 hover:bg-blue-50 text-left transition-all group"
                >
                  <div className="flex items-center gap-3">
                    <div className="w-9 h-9 rounded-lg bg-blue-600 text-white flex items-center justify-center shadow-sm">
                      <User className="w-4 h-4" />
                    </div>
                    <div>
                      <div className="font-semibold text-slate-800 text-sm flex items-center gap-1.5">
                        Patient / Family
                        <span className="text-[10px] bg-blue-100 text-blue-700 font-bold px-1.5 py-0.2 rounded">Sanju K.</span>
                      </div>
                      <div className="text-xs text-slate-600">Book visits, UPI checkout, live tracking</div>
                    </div>
                  </div>
                  <ArrowRight className="w-4 h-4 text-slate-400 group-hover:text-blue-600 group-hover:translate-x-0.5 transition-all" />
                </button>

                {/* 2. Healthcare Partner */}
                <button
                  onClick={() => handleDemoRoleSignIn('PARTNER')}
                  disabled={loading}
                  className="w-full flex items-center justify-between p-3 rounded-xl border border-teal-100 hover:border-teal-400 bg-teal-50/40 hover:bg-teal-50 text-left transition-all group"
                >
                  <div className="flex items-center gap-3">
                    <div className="w-9 h-9 rounded-lg bg-teal-600 text-white flex items-center justify-center shadow-sm">
                      <Stethoscope className="w-4 h-4" />
                    </div>
                    <div>
                      <div className="font-semibold text-slate-800 text-sm flex items-center gap-1.5">
                        Healthcare Partner
                        <span className="text-[10px] bg-teal-100 text-teal-700 font-bold px-1.5 py-0.2 rounded">Dr. Priya S.</span>
                      </div>
                      <div className="text-xs text-slate-600">Schedule, navigate, log vitals & earn</div>
                    </div>
                  </div>
                  <ArrowRight className="w-4 h-4 text-slate-400 group-hover:text-teal-600 group-hover:translate-x-0.5 transition-all" />
                </button>

                {/* 3. Administrator */}
                <button
                  onClick={() => handleDemoRoleSignIn('ADMIN')}
                  disabled={loading}
                  className="w-full flex items-center justify-between p-3 rounded-xl border border-indigo-100 hover:border-indigo-400 bg-indigo-50/40 hover:bg-indigo-50 text-left transition-all group"
                >
                  <div className="flex items-center gap-3">
                    <div className="w-9 h-9 rounded-lg bg-indigo-600 text-white flex items-center justify-center shadow-sm">
                      <ShieldCheck className="w-4 h-4" />
                    </div>
                    <div>
                      <div className="font-semibold text-slate-800 text-sm flex items-center gap-1.5">
                        Admin & Operations
                        <span className="text-[10px] bg-indigo-100 text-indigo-700 font-bold px-1.5 py-0.2 rounded">Operations</span>
                      </div>
                      <div className="text-xs text-slate-600">KYC verification, dispatch & services</div>
                    </div>
                  </div>
                  <ArrowRight className="w-4 h-4 text-slate-400 group-hover:text-indigo-600 group-hover:translate-x-0.5 transition-all" />
                </button>

                {/* 4. Super Administrator */}
                <button
                  onClick={() => handleDemoRoleSignIn('SUPER_ADMIN' as any)}
                  disabled={loading}
                  className="w-full flex items-center justify-between p-3 rounded-xl border border-purple-100 hover:border-purple-400 bg-purple-50/40 hover:bg-purple-50 text-left transition-all group"
                >
                  <div className="flex items-center gap-3">
                    <div className="w-9 h-9 rounded-lg bg-gradient-to-tr from-purple-600 to-indigo-600 text-white flex items-center justify-center shadow-sm">
                      <Sparkles className="w-4 h-4" />
                    </div>
                    <div>
                      <div className="font-semibold text-slate-800 text-sm flex items-center gap-1.5">
                        Super Admin Panel
                        <span className="text-[10px] bg-purple-100 text-purple-700 font-bold px-1.5 py-0.2 rounded">Executive</span>
                      </div>
                      <div className="text-xs text-slate-600">Create admins, billing settlements & partners</div>
                    </div>
                  </div>
                  <ArrowRight className="w-4 h-4 text-slate-400 group-hover:text-purple-600 group-hover:translate-x-0.5 transition-all" />
                </button>
              </div>
            </>
          )}
        </div>
      </div>
    </div>
  );
}
