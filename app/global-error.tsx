'use client';

import Link from 'next/link';
import { useEffect } from 'react';
import { AlertTriangle } from 'lucide-react';

export default function GlobalError({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  useEffect(() => {
    console.error('Global error:', error);
  }, [error]);

  return (
    <html>
      <body className="min-h-screen bg-surface-50 flex items-center justify-center p-4 font-sans">
        <div className="max-w-md w-full text-center">
          <div className="w-16 h-16 bg-danger-50 rounded-2xl flex items-center justify-center mx-auto mb-4">
            <AlertTriangle size={28} className="text-danger-500" />
          </div>
          <h1 className="text-2xl font-bold text-surface-900 mb-2">Something went wrong</h1>
          <p className="text-surface-500 mb-6 text-sm">
            An unexpected error occurred. Please try again or go back to the home page.
          </p>
          <div className="flex gap-3 justify-center">
            <button
              onClick={reset}
              className="px-5 py-2 bg-brand-500 text-white rounded-xl font-semibold text-sm hover:bg-brand-600 transition-colors"
            >
              Try Again
            </button>
            <Link
              href="/"
              className="px-5 py-2 border border-surface-200 text-surface-700 rounded-xl font-semibold text-sm hover:bg-surface-100 transition-colors"
            >
              Go Home
            </Link>
          </div>
          {process.env.NODE_ENV === 'development' && (
            <pre className="mt-6 text-left text-xs bg-surface-100 rounded-xl p-4 overflow-auto text-danger-700">
              {error.message}
            </pre>
          )}
        </div>
      </body>
    </html>
  );
}
