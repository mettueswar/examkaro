'use client';

import { useState, useEffect, useCallback } from 'react';
import Link from 'next/link';
import { Filter, Search, Lock, Clock, FileQuestion, ArrowRight } from 'lucide-react';
import { useAuth } from '@/components/providers/AuthProvider';
import { LoginModal } from '@/components/auth/LoginModal';
import type { MockTest } from '@/types';

interface Filters {
  category?: string;
  type?: string;
  page?: string;
  difficulty?: string;
  q?: string;
}

export function TestsGrid({ filters }: { filters: Filters }) {
  const { user } = useAuth();
  const [tests, setTests] = useState<(MockTest & { locked?: boolean; category_name?: string })[]>([]);
  const [total, setTotal] = useState(0);
  const [loading, setLoading] = useState(true);
  const [page, setPage] = useState(1);
  const [search, setSearch] = useState(filters.q || '');
  const [type, setType] = useState(filters.type || '');
  const [difficulty, setDifficulty] = useState(filters.difficulty || '');
  const [loginOpen, setLoginOpen] = useState(false);

  const fetchTests = useCallback(async () => {
    setLoading(true);
    const sp = new URLSearchParams();
    if (filters.category) sp.set('category', filters.category);
    if (type) sp.set('type', type);
    if (difficulty) sp.set('difficulty', difficulty);
    if (search) sp.set('search', search);
    sp.set('page', String(page));
    sp.set('limit', '12');

    const res = await fetch(`/api/tests?${sp}`);
    const json = await res.json();
    if (json.success) {
      setTests(json.data);
      setTotal(json.pagination.total);
    }
    setLoading(false);
  }, [filters.category, type, difficulty, search, page]);

  useEffect(() => { fetchTests(); }, [fetchTests]);

  const totalPages = Math.ceil(total / 12);

  return (
    <>
      {/* Filters */}
      <div className="flex flex-wrap items-center gap-3 mb-6 p-4 bg-white rounded-xl border border-surface-200">
        <div className="flex-1 min-w-[200px] relative">
          <Search size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-surface-400" />
          <input
            type="text"
            placeholder="Search tests..."
            value={search}
            onChange={e => { setSearch(e.target.value); setPage(1); }}
            className="input-base pl-8 text-sm"
          />
        </div>
        <select
          value={type}
          onChange={e => { setType(e.target.value); setPage(1); }}
          className="input-base text-sm w-auto min-w-[120px]"
        >
          <option value="">All Types</option>
          <option value="free">Free</option>
          <option value="premium">Premium</option>
        </select>
        <select
          value={difficulty}
          onChange={e => { setDifficulty(e.target.value); setPage(1); }}
          className="input-base text-sm w-auto min-w-[130px]"
        >
          <option value="">All Levels</option>
          <option value="easy">Easy</option>
          <option value="medium">Medium</option>
          <option value="hard">Hard</option>
        </select>
        <div className="text-sm text-surface-500">
          {total} tests found
        </div>
      </div>

      {/* Grid */}
      {loading ? (
        <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-4">
          {Array.from({ length: 9 }).map((_, i) => (
            <div key={i} className="card p-4 animate-pulse">
              <div className="h-4 bg-surface-200 rounded w-16 mb-3" />
              <div className="h-5 bg-surface-200 rounded w-full mb-2" />
              <div className="h-3 bg-surface-100 rounded w-1/2" />
            </div>
          ))}
        </div>
      ) : tests.length === 0 ? (
        <div className="text-center py-16">
          <FileQuestion size={40} className="text-surface-300 mx-auto mb-3" />
          <p className="text-surface-500 font-medium">No tests found</p>
          <p className="text-sm text-surface-400 mt-1">Try adjusting your filters</p>
        </div>
      ) : (
        <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-4">
          {tests.map((test) => (
            <TestCard
              key={test.id}
              test={test}
              isLoggedIn={!!user}
              onLoginRequired={() => setLoginOpen(true)}
            />
          ))}
        </div>
      )}

      {/* Pagination */}
      {totalPages > 1 && (
        <div className="flex items-center justify-center gap-2 mt-8">
          <button
            onClick={() => setPage(p => Math.max(1, p - 1))}
            disabled={page === 1}
            className="btn-outline text-sm disabled:opacity-40"
          >
            Previous
          </button>
          {Array.from({ length: Math.min(5, totalPages) }, (_, i) => {
            const p = i + Math.max(1, page - 2);
            if (p > totalPages) return null;
            return (
              <button
                key={p}
                onClick={() => setPage(p)}
                className={`w-9 h-9 rounded-lg text-sm font-medium ${p === page ? 'bg-brand-500 text-white' : 'btn-outline'}`}
              >
                {p}
              </button>
            );
          })}
          <button
            onClick={() => setPage(p => Math.min(totalPages, p + 1))}
            disabled={page === totalPages}
            className="btn-outline text-sm disabled:opacity-40"
          >
            Next
          </button>
        </div>
      )}

      <LoginModal open={loginOpen} onClose={() => setLoginOpen(false)} />
    </>
  );
}

function TestCard({
  test,
  isLoggedIn,
  onLoginRequired,
}: {
  test: MockTest & { locked?: boolean; category_name?: string };
  isLoggedIn: boolean;
  onLoginRequired: () => void;
}) {
  const handleClick = (e: React.MouseEvent) => {
    if (!isLoggedIn) {
      e.preventDefault();
      onLoginRequired();
    }
  };

  return (
    <Link
      href={`/tests/${test.slug}`}
      onClick={handleClick}
      className="card p-4 hover:shadow-elevated hover:border-brand-200 transition-all group relative"
    >
      {test.locked && (
        <div className="absolute inset-0 bg-white/80 backdrop-blur-[1px] rounded-xl flex items-center justify-center z-10">
          <div className="text-center">
            <Lock size={20} className="text-surface-400 mx-auto mb-1" />
            <p className="text-xs font-medium text-surface-500">Premium Test</p>
            <Link href="/packages" className="text-xs text-brand-500 hover:underline" onClick={e => e.stopPropagation()}>
              Upgrade →
            </Link>
          </div>
        </div>
      )}
      <div className="flex items-start justify-between gap-2 mb-3">
        <span className={`badge ${test.type === 'free' ? 'badge-free' : 'badge-premium'}`}>
          {test.type === 'premium' ? '👑 Premium' : '✓ Free'}
        </span>
        <span className="text-xs text-surface-400 capitalize px-2 py-0.5 bg-surface-100 rounded-md">{test.difficulty}</span>
      </div>

      <h3 className="text-sm font-semibold text-surface-800 leading-snug mb-3 group-hover:text-brand-600 transition-colors line-clamp-2 min-h-[2.5rem]">
        {test.title}
      </h3>

      <div className="flex items-center gap-3 text-xs text-surface-500">
        <span className="flex items-center gap-1"><FileQuestion size={11} /> {test.totalQuestions} Qs</span>
        <span className="flex items-center gap-1"><Clock size={11} /> {test.duration} min</span>
      </div>

      <div className="mt-3 pt-3 border-t border-surface-100 flex items-center justify-between">
        <span className="text-xs text-brand-500 font-medium">{test.category_name || 'General'}</span>
        <span className="text-xs text-surface-400">{(test.attemptCount || 0).toLocaleString()} attempts</span>
      </div>
    </Link>
  );
}
