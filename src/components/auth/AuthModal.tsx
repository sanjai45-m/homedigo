'use client';

import React, { useState, Suspense } from 'react';
import { signIn, signOut, useSession } from 'next-auth/react';
import { useSearchParams } from 'next/navigation';
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
  LogOut,
  AlertCircle
} from 'lucide-react';

interface AuthModalProps {
  isOpen: boolean;
  onClose: () => void;
  defaultRole?: 'PATIENT' | 'PARTNER' | 'ADMIN';
}

function AuthModalContent({ isOpen, onClose, defaultRole = 'PATIENT' }: AuthModalProps) {
  const searchParams = useSearchParams();
  const { data: session } = useSession();
  const [selectedRole, setSelectedRole] = useState<'PATIENT' | 'PARTNER' | 'ADMIN'>(defaultRole);
  const [loading, setLoading] = useState(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  if (!isOpen) return null;

  const callbackUrl = searchParams?.get('callbackUrl') || '/';

  const handleGoogleSignIn = async () => {
    setLoading(true);
    setErrorMessage(null);
    try {
      const res = await signIn('google', { callbackUrl });
      if (res?.error) {
        setErrorMessage('Google Sign In was not successful. Ensure GOOGLE_CLIENT_ID & GOOGLE_CLIENT_SECRET are configured in environment variables.');
      }
    } catch (err: any) {
      console.error('Google Sign In Error:', err);
      setErrorMessage(err?.message || 'Failed to initiate Google Sign In.');
    } finally {
      setLoading(false);
    }
  };

  const handleDemoRoleSignIn = async (role: 'PATIENT' | 'PARTNER' | 'ADMIN') => {
    setLoading(true);
    setErrorMessage(null);
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
              {errorMessage && (
                <div className="p-3.5 rounded-2xl bg-amber-50 border border-amber-200 text-amber-900 text-xs font-semibold flex items-start gap-2.5">
                  <AlertCircle className="w-4 h-4 shrink-0 text-amber-600 mt-0.5" />
                  <div>
                    <p>{errorMessage}</p>
                  </div>
                </div>
              )}

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
            </>
          )}
        </div>
      </div>
    </div>
  );
}

export default function AuthModal(props: AuthModalProps) {
  if (!props.isOpen) return null;
  return (
    <Suspense fallback={null}>
      <AuthModalContent {...props} />
    </Suspense>
  );
}
