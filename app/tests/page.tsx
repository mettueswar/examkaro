import { Suspense } from 'react';
import type { Metadata } from 'next';
import { Header } from '@/components/layout/Header';
import { Footer } from '@/components/layout/Footer';
import { TestsGrid } from '@/components/test/TestsGrid';

export const metadata: Metadata = {
  title: 'Mock Tests – All Exams',
  description: 'Browse thousands of free and premium mock tests for SSC, Banking, Railway, UPSC and more.',
};

interface Props {
  searchParams: Promise<{ category?: string; type?: string; page?: string; difficulty?: string; q?: string }>;
}

export default async function TestsPage({ searchParams }: Props) {
  const params = await searchParams;

  return (
    <>
      <Header />
      <main className="max-w-7xl mx-auto px-4 py-8">
        <div className="mb-6">
          <h1 className="text-2xl font-display font-bold text-surface-900">Mock Tests</h1>
          <p className="text-surface-500 text-sm mt-1">
            {params.category ? `Tests for ${params.category.toUpperCase()}` : 'All available mock tests'}
          </p>
        </div>
        <Suspense fallback={<TestsGridSkeleton />}>
          <TestsGrid filters={params} />
        </Suspense>
      </main>
      <Footer />
    </>
  );
}

function TestsGridSkeleton() {
  return (
    <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-4">
      {Array.from({ length: 9 }).map((_, i) => (
        <div key={i} className="card p-4 animate-pulse">
          <div className="h-4 bg-surface-200 rounded w-16 mb-3" />
          <div className="h-5 bg-surface-200 rounded w-full mb-2" />
          <div className="h-4 bg-surface-200 rounded w-3/4 mb-3" />
          <div className="h-3 bg-surface-100 rounded w-1/2" />
        </div>
      ))}
    </div>
  );
}
