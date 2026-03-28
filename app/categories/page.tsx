import type { Metadata } from 'next';
import Link from 'next/link';
import { query } from '@/lib/db';
import { Header } from '@/components/layout/Header';
import { Footer } from '@/components/layout/Footer';
import { BookOpen, ChevronRight } from 'lucide-react';
import type { Category } from '@/types';

export const metadata: Metadata = {
  title: 'Exam Categories – Browse All Exams',
  description: 'Browse mock tests by exam category — SSC, Banking, Railway, UPSC, Defence, Teaching and more.',
};

export default async function CategoriesPage() {
  const categories = await query<Category & { testCount: number; freeCount: number; premiumCount: number }>(
    `SELECT c.*,
       COUNT(DISTINCT t.id) as test_count,
       COUNT(DISTINCT CASE WHEN t.type='free' THEN t.id END) as free_count,
       COUNT(DISTINCT CASE WHEN t.type='premium' THEN t.id END) as premium_count
     FROM categories c
     LEFT JOIN mock_tests t ON t.category_id = c.id AND t.is_active = 1
     WHERE c.is_active = 1 AND c.parent_id IS NULL
     GROUP BY c.id
     ORDER BY c.order_index, c.name`
  ).catch(() => []);

  const FALLBACK = [
    { id: 1, name: 'SSC', slug: 'ssc', icon: '📋', color: '#1a56db', description: 'SSC CGL, CHSL, MTS, CPO, GD Constable', testCount: 120, freeCount: 30, premiumCount: 90 },
    { id: 2, name: 'Banking', slug: 'banking', icon: '🏦', color: '#16a34a', description: 'SBI PO/Clerk, IBPS PO/Clerk/RRB, RBI', testCount: 95, freeCount: 20, premiumCount: 75 },
    { id: 3, name: 'Railway', slug: 'railway', icon: '🚂', color: '#dc2626', description: 'RRB NTPC, Group D, ALP, JE', testCount: 80, freeCount: 25, premiumCount: 55 },
    { id: 4, name: 'UPSC', slug: 'upsc', icon: '🏛️', color: '#9333ea', description: 'Civil Services, IAS, IPS, IFS Prelims & Mains', testCount: 45, freeCount: 10, premiumCount: 35 },
    { id: 5, name: 'State PCS', slug: 'state-pcs', icon: '📜', color: '#f59e0b', description: 'BPSC, UPPSC, MPSC, RPSC, TNPSC', testCount: 60, freeCount: 15, premiumCount: 45 },
    { id: 6, name: 'Defence', slug: 'defence', icon: '🪖', color: '#0891b2', description: 'CDS, AFCAT, NDA, CAPF', testCount: 35, freeCount: 12, premiumCount: 23 },
    { id: 7, name: 'Teaching', slug: 'teaching', icon: '📚', color: '#db2777', description: 'CTET, STET, KVS, DSSSB', testCount: 42, freeCount: 10, premiumCount: 32 },
    { id: 8, name: 'Police', slug: 'police', icon: '👮', color: '#64748b', description: 'SSC CPO, State Police Constable, SI', testCount: 38, freeCount: 14, premiumCount: 24 },
    { id: 9, name: 'Insurance', slug: 'insurance', icon: '🛡️', color: '#059669', description: 'LIC AAO, NIACL, UIIC, GIC', testCount: 22, freeCount: 8, premiumCount: 14 },
    { id: 10, name: 'Judiciary', slug: 'judiciary', icon: '⚖️', color: '#7c3aed', description: 'District Judge, Law Officer exams', testCount: 18, freeCount: 5, premiumCount: 13 },
  ];

  const displayCategories = categories.length ? categories : FALLBACK;

  return (
    <>
      <Header />
      <main className="max-w-6xl mx-auto px-4 py-8">
        <div className="mb-7">
          <h1 className="text-2xl font-display font-bold text-surface-900">Browse by Exam Category</h1>
          <p className="text-surface-500 text-sm mt-1">
            {displayCategories.length} exam categories · Practice with targeted mock tests
          </p>
        </div>

        <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-4">
          {displayCategories.map((cat) => (
            <Link
              key={cat.id}
              href={`/tests?category=${cat.slug}`}
              className="card p-5 hover:shadow-elevated hover:border-brand-200 transition-all group"
            >
              <div className="flex items-start gap-4">
                <div
                  className="w-12 h-12 rounded-xl flex items-center justify-center text-2xl shrink-0"
                  style={{ backgroundColor: `${cat.color}20` }}
                >
                  {cat.icon}
                </div>
                <div className="flex-1 min-w-0">
                  <h2 className="font-display font-bold text-surface-900 group-hover:text-brand-600 transition-colors">
                    {cat.name}
                  </h2>
                  {cat.description && (
                    <p className="text-xs text-surface-500 mt-0.5 line-clamp-2">{cat.description}</p>
                  )}
                  <div className="flex items-center gap-3 mt-2">
                    <span className="badge badge-free text-xs">{cat.freeCount || 0} Free</span>
                    <span className="badge badge-premium text-xs">{cat.premiumCount || 0} Premium</span>
                  </div>
                </div>
                <ChevronRight size={16} className="text-surface-300 group-hover:text-brand-400 transition-colors shrink-0 mt-1" />
              </div>

              <div className="mt-4 pt-3 border-t border-surface-100 flex items-center gap-1.5 text-xs text-surface-500">
                <BookOpen size={12} />
                <span>{cat.testCount || 0} mock tests available</span>
              </div>
            </Link>
          ))}
        </div>
      </main>
      <Footer />
    </>
  );
}
