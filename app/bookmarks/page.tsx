'use client';

import { useState, useEffect } from 'react';
import Link from 'next/link';
import { BookmarkX, BookOpen, StickyNote, ArrowRight, Trash2 } from 'lucide-react';
import { Header } from '@/components/layout/Header';
import { Footer } from '@/components/layout/Footer';
import toast from 'react-hot-toast';

interface Bookmark {
  id: number;
  questionId: number;
  questionText: string;
  textHindi?: string;
  note?: string;
  testTitle: string;
  testSlug: string;
  createdAt: string;
}

export default function BookmarksPage() {
  const [bookmarks, setBookmarks] = useState<Bookmark[]>([]);
  const [loading, setLoading] = useState(true);

  const fetchBookmarks = async () => {
    const res = await fetch('/api/bookmarks');
    const json = await res.json();
    if (json.success) setBookmarks(json.data);
    setLoading(false);
  };

  useEffect(() => { fetchBookmarks(); }, []);

  const handleRemove = async (questionId: number) => {
    await fetch(`/api/bookmarks?questionId=${questionId}`, { method: 'DELETE' });
    setBookmarks(prev => prev.filter(b => b.questionId !== questionId));
    toast.success('Bookmark removed');
  };

  return (
    <>
      <Header />
      <main className="max-w-4xl mx-auto px-4 py-8">
        <div className="mb-6">
          <h1 className="text-2xl font-display font-bold text-surface-900">Bookmarked Questions</h1>
          <p className="text-surface-500 text-sm mt-1">
            {bookmarks.length} saved question{bookmarks.length !== 1 ? 's' : ''}
          </p>
        </div>

        {loading ? (
          <div className="space-y-3">
            {[1,2,3].map(i => (
              <div key={i} className="card p-5 animate-pulse">
                <div className="h-4 bg-surface-200 rounded w-3/4 mb-3" />
                <div className="h-3 bg-surface-100 rounded w-1/2" />
              </div>
            ))}
          </div>
        ) : bookmarks.length === 0 ? (
          <div className="card p-16 text-center">
            <BookmarkX size={40} className="text-surface-300 mx-auto mb-3" />
            <p className="text-surface-500 font-medium text-lg mb-1">No bookmarks yet</p>
            <p className="text-surface-400 text-sm mb-5">
              Bookmark questions while attempting tests to review them later
            </p>
            <Link href="/tests" className="btn-primary inline-flex items-center gap-2">
              Browse Tests <ArrowRight size={14} />
            </Link>
          </div>
        ) : (
          <div className="space-y-3">
            {bookmarks.map(bookmark => (
              <div key={bookmark.id} className="card p-5">
                <div className="flex items-start justify-between gap-4">
                  <div className="flex-1 min-w-0">
                    <div
                      className="text-sm text-surface-800 leading-relaxed mb-2 line-clamp-3"
                      dangerouslySetInnerHTML={{ __html: bookmark.questionText }}
                    />
                    {bookmark.note && (
                      <div className="flex items-start gap-2 mt-2 p-2 bg-warning-50 rounded-lg border border-warning-100">
                        <StickyNote size={12} className="text-warning-500 shrink-0 mt-0.5" />
                        <p className="text-xs text-warning-700">{bookmark.note}</p>
                      </div>
                    )}
                    <div className="flex items-center gap-3 mt-3">
                      <Link
                        href={`/tests/${bookmark.testSlug}`}
                        className="flex items-center gap-1.5 text-xs text-brand-500 hover:underline"
                      >
                        <BookOpen size={11} /> {bookmark.testTitle}
                      </Link>
                      <span className="text-xs text-surface-400">
                        {new Date(bookmark.createdAt).toLocaleDateString('en-IN')}
                      </span>
                    </div>
                  </div>
                  <button
                    onClick={() => handleRemove(bookmark.questionId)}
                    className="p-1.5 text-surface-400 hover:text-danger-500 hover:bg-danger-50 rounded-lg transition-colors shrink-0"
                  >
                    <Trash2 size={14} />
                  </button>
                </div>
              </div>
            ))}
          </div>
        )}
      </main>
      <Footer />
    </>
  );
}
