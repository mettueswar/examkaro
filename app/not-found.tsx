import Link from 'next/link';
import { Header } from '@/components/layout/Header';
import { Footer } from '@/components/layout/Footer';

export default function NotFound() {
  return (
    <>
      <Header />
      <main className="max-w-2xl mx-auto px-4 py-24 text-center">
        <div className="text-7xl font-display font-bold text-brand-500 mb-4">404</div>
        <h1 className="text-2xl font-display font-bold text-surface-900 mb-2">Page Not Found</h1>
        <p className="text-surface-500 mb-8">The page you're looking for doesn't exist or has been moved.</p>
        <div className="flex items-center justify-center gap-3">
          <Link href="/" className="btn-primary">Go Home</Link>
          <Link href="/tests" className="btn-outline">Browse Tests</Link>
        </div>
      </main>
      <Footer />
    </>
  );
}
