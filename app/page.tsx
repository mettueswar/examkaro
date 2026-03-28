import Link from 'next/link';
import { ArrowRight, BookOpen, Users, Trophy, CheckCircle, Zap, Star } from 'lucide-react';
import { Header } from '@/components/layout/Header';
import { Footer } from '@/components/layout/Footer';
import { query } from '@/lib/db';
import type { Category, MockTest } from '@/types';

export default async function HomePage() {
  const categories = await query<Category>(
    'SELECT * FROM categories WHERE is_active = 1 AND parent_id IS NULL ORDER BY order_index LIMIT 8'
  ).catch(() => []);

  const featuredTests = await query<MockTest & { category_name: string; category_slug: string }>(
    `SELECT t.*, c.name as category_name, c.slug as category_slug
     FROM mock_tests t JOIN categories c ON t.category_id = c.id
     WHERE t.is_active = 1 ORDER BY t.attempt_count DESC LIMIT 6`
  ).catch(() => []);

  const stats = [
    { label: 'Mock Tests', value: '5,000+', icon: BookOpen },
    { label: 'Students', value: '2L+', icon: Users },
    { label: 'Questions', value: '50,000+', icon: CheckCircle },
    { label: 'Success Rate', value: '94%', icon: Trophy },
  ];

  const EXAM_CATEGORIES = [
    { name: 'SSC', color: '#1a56db', icon: '📋' },
    { name: 'Banking', color: '#16a34a', icon: '🏦' },
    { name: 'Railway', color: '#dc2626', icon: '🚂' },
    { name: 'UPSC', color: '#9333ea', icon: '🏛️' },
    { name: 'State PCS', color: '#f59e0b', icon: '📜' },
    { name: 'Defence', color: '#0891b2', icon: '🪖' },
    { name: 'Teaching', color: '#db2777', icon: '📚' },
    { name: 'Police', color: '#64748b', icon: '👮' },
  ];

  return (
    <>
      <Header />
      <main>
        {/* Hero */}
        <section className="bg-gradient-to-br from-brand-700 via-brand-600 to-brand-500 text-white py-16 px-4">
          <div className="max-w-4xl mx-auto text-center">
            <div className="inline-flex items-center gap-2 bg-white/10 backdrop-blur-sm border border-white/20 rounded-full px-4 py-1.5 text-sm mb-6">
              <Zap size={13} className="text-yellow-300" />
              <span>India's fastest growing exam platform</span>
            </div>
            <h1 className="font-display text-4xl sm:text-5xl font-bold mb-4 leading-tight">
              Crack Your Dream Exam<br />
              <span className="text-blue-200">with Smart Mock Tests</span>
            </h1>
            <p className="text-blue-100 text-lg mb-8 max-w-2xl mx-auto">
              Practice with 5,000+ mock tests for SSC, Banking, Railway, UPSC and more. 
              Get detailed analytics and improve your rank.
            </p>
            <div className="flex flex-col sm:flex-row gap-3 justify-center">
              <Link href="/tests" className="inline-flex items-center gap-2 bg-white text-brand-600 font-bold px-6 py-3 rounded-xl hover:bg-blue-50 transition-colors">
                Start Free Tests <ArrowRight size={16} />
              </Link>
              <Link href="/packages" className="inline-flex items-center gap-2 bg-white/10 border border-white/30 hover:bg-white/20 px-6 py-3 rounded-xl transition-colors font-semibold">
                View Plans
              </Link>
            </div>
          </div>
        </section>

        {/* Stats */}
        <section className="border-b border-surface-200 bg-white">
          <div className="max-w-5xl mx-auto px-4 py-8 grid grid-cols-2 sm:grid-cols-4 gap-4">
            {stats.map(({ label, value, icon: Icon }) => (
              <div key={label} className="text-center">
                <div className="w-10 h-10 bg-brand-50 rounded-xl flex items-center justify-center mx-auto mb-2">
                  <Icon size={18} className="text-brand-500" />
                </div>
                <div className="text-2xl font-display font-bold text-surface-900">{value}</div>
                <div className="text-sm text-surface-500">{label}</div>
              </div>
            ))}
          </div>
        </section>

        {/* Categories */}
        <section className="max-w-6xl mx-auto px-4 py-12">
          <div className="flex items-center justify-between mb-6">
            <div>
              <h2 className="text-xl font-display font-bold text-surface-900">Browse by Exam</h2>
              <p className="text-sm text-surface-500 mt-0.5">Choose your target exam</p>
            </div>
            <Link href="/categories" className="text-sm text-brand-500 hover:underline flex items-center gap-1">
              See all <ArrowRight size={14} />
            </Link>
          </div>
          <div className="grid grid-cols-4 sm:grid-cols-8 gap-3">
            {(categories.length ? categories : EXAM_CATEGORIES).slice(0, 8).map((cat: Category & { icon?: string; color?: string }) => (
              <Link
                key={cat.name}
                href={`/tests?category=${cat.slug || cat.name?.toLowerCase()}`}
                className="flex flex-col items-center gap-2 p-3 bg-white rounded-xl border border-surface-200 hover:border-brand-300 hover:shadow-card transition-all group"
              >
                <span className="text-2xl">{cat.icon || '📋'}</span>
                <span className="text-xs font-medium text-surface-700 text-center leading-tight">{cat.name}</span>
              </Link>
            ))}
          </div>
        </section>

        {/* Featured Tests */}
        <section className="bg-surface-50 py-12 px-4">
          <div className="max-w-6xl mx-auto">
            <div className="flex items-center justify-between mb-6">
              <div>
                <h2 className="text-xl font-display font-bold text-surface-900">Popular Tests</h2>
                <p className="text-sm text-surface-500 mt-0.5">Most attempted by students</p>
              </div>
              <Link href="/tests" className="text-sm text-brand-500 hover:underline flex items-center gap-1">
                All tests <ArrowRight size={14} />
              </Link>
            </div>
            <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-4">
              {(featuredTests.length ? featuredTests : MOCK_TESTS_PLACEHOLDER).map((test) => (
                <TestCard key={test.id || test.title} test={test} />
              ))}
            </div>
          </div>
        </section>

        {/* CTA */}
        <section className="bg-brand-600 text-white py-14 px-4 text-center">
          <h2 className="font-display text-3xl font-bold mb-3">Ready to Start Preparing?</h2>
          <p className="text-blue-100 mb-6 max-w-lg mx-auto">
            Join 2 lakh+ students already preparing with ExamKaro. Free tests available, no credit card needed.
          </p>
          <Link href="/tests" className="inline-flex items-center gap-2 bg-white text-brand-600 font-bold px-8 py-3 rounded-xl hover:bg-blue-50 transition-colors">
            Explore Free Tests <ArrowRight size={16} />
          </Link>
        </section>
      </main>
      <Footer />
    </>
  );
}

const MOCK_TESTS_PLACEHOLDER = [
  { id: 1, title: 'SSC CGL Tier I - Full Mock Test', type: 'free', duration: 60, totalQuestions: 100, difficulty: 'medium', attemptCount: 12450, category_name: 'SSC', category_slug: 'ssc' },
  { id: 2, title: 'SBI PO Prelims Mock Test', type: 'premium', duration: 60, totalQuestions: 100, difficulty: 'hard', attemptCount: 8320, category_name: 'Banking', category_slug: 'banking' },
  { id: 3, title: 'RRB NTPC CBT 1 Mock', type: 'free', duration: 90, totalQuestions: 100, difficulty: 'medium', attemptCount: 15600, category_name: 'Railway', category_slug: 'railway' },
  { id: 4, title: 'IBPS Clerk Prelims 2024', type: 'premium', duration: 60, totalQuestions: 100, difficulty: 'medium', attemptCount: 6890, category_name: 'Banking', category_slug: 'banking' },
  { id: 5, title: 'SSC CHSL Tier I Practice', type: 'free', duration: 60, totalQuestions: 100, difficulty: 'easy', attemptCount: 9200, category_name: 'SSC', category_slug: 'ssc' },
  { id: 6, title: 'UPSC Prelims GS Paper I', type: 'premium', duration: 120, totalQuestions: 100, difficulty: 'hard', attemptCount: 4100, category_name: 'UPSC', category_slug: 'upsc' },
];

function TestCard({ test }: { test: Partial<MockTest> & { category_name?: string; category_slug?: string; locked?: boolean } }) {
  return (
    <Link
      href={`/tests/${test.slug || test.id}`}
      className="card p-4 hover:shadow-elevated transition-all group hover:border-brand-200"
    >
      <div className="flex items-start justify-between gap-3 mb-3">
        <span className={`badge ${test.type === 'free' ? 'badge-free' : 'badge-premium'}`}>
          {test.type === 'premium' ? '👑 Premium' : '✓ Free'}
        </span>
        <span className="text-xs text-surface-400 capitalize">{test.difficulty}</span>
      </div>
      <h3 className="text-sm font-semibold text-surface-800 leading-snug mb-3 group-hover:text-brand-600 transition-colors line-clamp-2">
        {test.title}
      </h3>
      <div className="flex items-center gap-3 text-xs text-surface-500">
        <span>{test.totalQuestions || 100} Qs</span>
        <span>·</span>
        <span>{test.duration} min</span>
        <span>·</span>
        <span>{(test.attemptCount || 0).toLocaleString()} attempts</span>
      </div>
      {test.category_name && (
        <div className="mt-3 pt-3 border-t border-surface-100">
          <span className="text-xs text-brand-500 font-medium">{test.category_name}</span>
        </div>
      )}
    </Link>
  );
}
