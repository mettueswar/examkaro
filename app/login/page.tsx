'use client';

import { useEffect, useState } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import { BookOpen, Shield, Smartphone, Zap } from 'lucide-react';
import { useAuth } from '@/components/providers/AuthProvider';
import Link from 'next/link';

export default function LoginPage() {
  const { user, signInWithGoogle, loading } = useAuth();
  const router = useRouter();
  const searchParams = useSearchParams();
  const redirect = searchParams.get('redirect') || '/dashboard';
  const [tab, setTab] = useState<'google' | 'phone'>('google');

  useEffect(() => {
    if (user) router.replace(redirect);
  }, [user, router, redirect]);

  return (
    <div className="min-h-screen bg-gradient-to-br from-brand-700 via-brand-600 to-brand-500 flex items-center justify-center p-4">
      <div className="w-full max-w-sm">
        {/* Logo */}
        <div className="text-center mb-8">
          <Link href="/" className="inline-flex items-center gap-2 text-white font-display font-bold text-2xl">
            <div className="w-10 h-10 bg-white/20 backdrop-blur-sm rounded-xl flex items-center justify-center">
              <BookOpen size={20} className="text-white" />
            </div>
            ExamKaro
          </Link>
          <p className="text-blue-100 text-sm mt-2">India's Best Exam Prep Platform</p>
        </div>

        {/* Card */}
        <div className="bg-white rounded-2xl shadow-overlay p-6">
          <h1 className="text-xl font-display font-bold text-surface-900 mb-1">Welcome back!</h1>
          <p className="text-sm text-surface-500 mb-5">Sign in to access your tests and track progress</p>

          {/* Tabs */}
          <div className="flex bg-surface-100 rounded-xl p-1 mb-5">
            <button
              onClick={() => setTab('google')}
              className={`flex-1 flex items-center justify-center gap-1.5 py-2 text-sm font-medium rounded-lg transition-all ${tab === 'google' ? 'bg-white shadow-sm text-surface-900' : 'text-surface-500'}`}
            >
              <Shield size={13} /> Google
            </button>
            <button
              onClick={() => setTab('phone')}
              className={`flex-1 flex items-center justify-center gap-1.5 py-2 text-sm font-medium rounded-lg transition-all ${tab === 'phone' ? 'bg-white shadow-sm text-surface-900' : 'text-surface-500'}`}
            >
              <Smartphone size={13} /> Phone
            </button>
          </div>

          {tab === 'google' ? (
            <>
              <button
                onClick={async () => { await signInWithGoogle(); }}
                disabled={loading}
                className="w-full flex items-center justify-center gap-3 border border-surface-200 hover:bg-surface-50 rounded-xl py-3 font-semibold text-surface-700 transition-colors disabled:opacity-50 mb-4"
              >
                <svg viewBox="0 0 24 24" width="18" height="18">
                  <path fill="#4285F4" d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z"/>
                  <path fill="#34A853" d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"/>
                  <path fill="#FBBC05" d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z"/>
                  <path fill="#EA4335" d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z"/>
                </svg>
                {loading ? 'Signing in...' : 'Continue with Google'}
              </button>

              <div className="flex items-center gap-3 mb-4">
                <div className="flex-1 h-px bg-surface-200" />
                <span className="text-xs text-surface-400">Why Google?</span>
                <div className="flex-1 h-px bg-surface-200" />
              </div>

              <div className="space-y-2">
                {[
                  'Fast & secure one-click login',
                  'No password to remember',
                  'Your data is always protected',
                ].map((f) => (
                  <div key={f} className="flex items-center gap-2 text-xs text-surface-600">
                    <Zap size={11} className="text-brand-500 shrink-0" /> {f}
                  </div>
                ))}
              </div>
            </>
          ) : (
            <div className="text-center py-6">
              <Smartphone size={36} className="text-surface-300 mx-auto mb-3" />
              <p className="text-sm font-medium text-surface-600 mb-1">Phone Login — Coming Soon</p>
              <p className="text-xs text-surface-400">OTP-based phone authentication will be available soon. Please use Google login.</p>
              <button onClick={() => setTab('google')} className="mt-4 text-sm text-brand-500 hover:underline">
                Use Google instead →
              </button>
            </div>
          )}

          <p className="text-xs text-center text-surface-400 mt-5">
            By signing in, you agree to our{' '}
            <Link href="/terms" className="text-brand-500 hover:underline">Terms</Link> and{' '}
            <Link href="/privacy" className="text-brand-500 hover:underline">Privacy Policy</Link>
          </p>
        </div>

        <p className="text-center text-blue-100 text-xs mt-4">
          <Link href="/" className="hover:text-white">← Back to home</Link>
        </p>
      </div>
    </div>
  );
}
