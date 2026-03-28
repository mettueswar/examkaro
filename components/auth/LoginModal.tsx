'use client';

import { useState } from 'react';
import { X, LogIn, Shield, Smartphone } from 'lucide-react';
import { useAuth } from '@/components/providers/AuthProvider';

interface LoginModalProps {
  open: boolean;
  onClose: () => void;
}

export function LoginModal({ open, onClose }: LoginModalProps) {
  const { signInWithGoogle, loading } = useAuth();
  const [tab, setTab] = useState<'google' | 'phone'>('google');

  if (!open) return null;

  const handleGoogle = async () => {
    await signInWithGoogle();
    onClose();
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
      <div className="absolute inset-0 bg-black/50 backdrop-blur-sm" onClick={onClose} />
      <div className="relative bg-white rounded-2xl shadow-overlay w-full max-w-sm p-6 animate-in fade-in zoom-in-95 duration-200">
        {/* Close */}
        <button
          onClick={onClose}
          className="absolute top-4 right-4 p-1.5 text-surface-400 hover:text-surface-600 hover:bg-surface-100 rounded-lg transition-colors"
        >
          <X size={18} />
        </button>

        {/* Header */}
        <div className="text-center mb-6">
          <div className="w-12 h-12 bg-brand-500 rounded-2xl flex items-center justify-center mx-auto mb-3">
            <LogIn size={22} className="text-white" />
          </div>
          <h2 className="text-xl font-display font-bold text-surface-900">Welcome to ExamKaro</h2>
          <p className="text-sm text-surface-500 mt-1">Login to access mock tests & track your progress</p>
        </div>

        {/* Tabs */}
        <div className="flex bg-surface-100 rounded-lg p-1 mb-5">
          <button
            onClick={() => setTab('google')}
            className={`flex-1 flex items-center justify-center gap-1.5 py-1.5 text-sm font-medium rounded-md transition-all ${
              tab === 'google' ? 'bg-white shadow-sm text-surface-900' : 'text-surface-500'
            }`}
          >
            <Shield size={13} /> Google
          </button>
          <button
            onClick={() => setTab('phone')}
            className={`flex-1 flex items-center justify-center gap-1.5 py-1.5 text-sm font-medium rounded-md transition-all ${
              tab === 'phone' ? 'bg-white shadow-sm text-surface-900' : 'text-surface-500'
            }`}
          >
            <Smartphone size={13} /> Phone
          </button>
        </div>

        {tab === 'google' ? (
          <button
            onClick={handleGoogle}
            disabled={loading}
            className="w-full flex items-center justify-center gap-3 border border-surface-200 hover:bg-surface-50 rounded-xl py-3 font-semibold text-surface-700 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
          >
            <svg viewBox="0 0 24 24" width="18" height="18">
              <path fill="#4285F4" d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z"/>
              <path fill="#34A853" d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"/>
              <path fill="#FBBC05" d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z"/>
              <path fill="#EA4335" d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z"/>
            </svg>
            {loading ? 'Signing in...' : 'Continue with Google'}
          </button>
        ) : (
          <div className="text-center py-4">
            <Smartphone size={32} className="text-surface-300 mx-auto mb-2" />
            <p className="text-sm text-surface-500">Phone authentication coming soon!</p>
            <p className="text-xs text-surface-400 mt-1">Please use Google login for now.</p>
          </div>
        )}

        <p className="text-xs text-center text-surface-400 mt-4">
          By continuing, you agree to our{' '}
          <a href="/terms" className="text-brand-500 hover:underline">Terms</a> and{' '}
          <a href="/privacy" className="text-brand-500 hover:underline">Privacy Policy</a>
        </p>
      </div>
    </div>
  );
}
