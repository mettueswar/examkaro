'use client';

import { useState, useRef, useEffect } from 'react';
import Link from 'next/link';
import { Search, BookOpen, Newspaper, X } from 'lucide-react';
import type { MockTest, NewsArticle } from '@/types';

interface SearchResult {
  tests: (MockTest & { categoryName?: string; categorySlug?: string })[];
  news: NewsArticle[];
  query: string;
}

export function GlobalSearch() {
  const [open, setOpen] = useState(false);
  const [query, setQuery] = useState('');
  const [results, setResults] = useState<SearchResult | null>(null);
  const [loading, setLoading] = useState(false);
  const ref = useRef<HTMLDivElement>(null);
  const timerRef = useRef<ReturnType<typeof setTimeout>>();

  useEffect(() => {
    function handleClick(e: MouseEvent) {
      if (ref.current && !ref.current.contains(e.target as Node)) setOpen(false);
    }
    document.addEventListener('mousedown', handleClick);
    return () => document.removeEventListener('mousedown', handleClick);
  }, []);

  const doSearch = (q: string) => {
    clearTimeout(timerRef.current);
    if (!q || q.length < 2) { setResults(null); return; }
    setLoading(true);
    timerRef.current = setTimeout(async () => {
      const res = await fetch(`/api/search?q=${encodeURIComponent(q)}`);
      const json = await res.json();
      if (json.success) setResults(json.data);
      setLoading(false);
    }, 300);
  };

  const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const val = e.target.value;
    setQuery(val);
    doSearch(val);
    setOpen(true);
  };

  const hasResults = results && (results.tests.length > 0 || results.news.length > 0);

  return (
    <div ref={ref} className="relative">
      <div className="flex items-center gap-2 border border-surface-200 bg-surface-50 hover:bg-white hover:border-surface-300 rounded-xl px-3 py-1.5 transition-all w-48 sm:w-64 cursor-text" onClick={() => setOpen(true)}>
        <Search size={14} className="text-surface-400 shrink-0" />
        <input
          value={query}
          onChange={handleChange}
          onFocus={() => setOpen(true)}
          placeholder="Search tests..."
          className="text-sm bg-transparent outline-none text-surface-700 placeholder:text-surface-400 w-full"
        />
        {query && (
          <button onClick={() => { setQuery(''); setResults(null); }} className="text-surface-300 hover:text-surface-500">
            <X size={12} />
          </button>
        )}
      </div>

      {open && query.length >= 2 && (
        <div className="absolute top-full mt-2 left-0 w-80 bg-white rounded-xl border border-surface-200 shadow-overlay z-50 overflow-hidden">
          {loading ? (
            <div className="px-4 py-6 text-center text-sm text-surface-400">Searching...</div>
          ) : !hasResults ? (
            <div className="px-4 py-6 text-center text-sm text-surface-400">
              No results for &quot;{query}&quot;
            </div>
          ) : (
            <>
              {results.tests.length > 0 && (
                <div>
                  <div className="px-4 py-2 bg-surface-50 border-b border-surface-100">
                    <span className="text-xs font-semibold text-surface-500 uppercase tracking-wide flex items-center gap-1.5">
                      <BookOpen size={11} /> Mock Tests
                    </span>
                  </div>
                  {results.tests.map(t => (
                    <Link
                      key={t.id}
                      href={`/tests/${t.slug}`}
                      onClick={() => { setOpen(false); setQuery(''); }}
                      className="flex items-center gap-3 px-4 py-2.5 hover:bg-surface-50 transition-colors"
                    >
                      <div className="flex-1 min-w-0">
                        <p className="text-sm font-medium text-surface-800 truncate">{t.title}</p>
                        <p className="text-xs text-surface-400">{t.categoryName} · {t.duration} min</p>
                      </div>
                      <span className={`badge text-xs shrink-0 ${t.type === 'free' ? 'badge-free' : 'badge-premium'}`}>
                        {t.type}
                      </span>
                    </Link>
                  ))}
                </div>
              )}
              {results.news.length > 0 && (
                <div className="border-t border-surface-100">
                  <div className="px-4 py-2 bg-surface-50 border-b border-surface-100">
                    <span className="text-xs font-semibold text-surface-500 uppercase tracking-wide flex items-center gap-1.5">
                      <Newspaper size={11} /> News
                    </span>
                  </div>
                  {results.news.map(n => (
                    <Link
                      key={n.id}
                      href={`/news/${n.slug}`}
                      onClick={() => { setOpen(false); setQuery(''); }}
                      className="block px-4 py-2.5 hover:bg-surface-50 transition-colors"
                    >
                      <p className="text-sm font-medium text-surface-800 truncate">{n.title}</p>
                    </Link>
                  ))}
                </div>
              )}
              <div className="border-t border-surface-100 px-4 py-2">
                <Link
                  href={`/tests?q=${encodeURIComponent(query)}`}
                  onClick={() => setOpen(false)}
                  className="text-xs text-brand-500 hover:underline"
                >
                  See all results for &quot;{query}&quot; →
                </Link>
              </div>
            </>
          )}
        </div>
      )}
    </div>
  );
}
