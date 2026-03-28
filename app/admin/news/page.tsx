'use client';

import { useState, useEffect, useCallback } from 'react';
import { Plus, Pencil, Trash2, Eye, EyeOff } from 'lucide-react';
import toast from 'react-hot-toast';
import type { NewsArticle } from '@/types';
import { NewsFormModal } from '@/components/admin/NewsFormModal';

export default function AdminNewsPage() {
  const [articles, setArticles] = useState<NewsArticle[]>([]);
  const [loading, setLoading] = useState(true);
  const [modalOpen, setModalOpen] = useState(false);
  const [editing, setEditing] = useState<NewsArticle | null>(null);

  const fetchArticles = useCallback(async () => {
    setLoading(true);
    // Admin can see all including unpublished
    const res = await fetch('/api/admin/news');
    const json = await res.json();
    if (json.success) setArticles(json.data);
    setLoading(false);
  }, []);

  useEffect(() => { fetchArticles(); }, [fetchArticles]);

  const handleDelete = async (id: number) => {
    if (!confirm('Delete this article?')) return;
    await fetch(`/api/admin/news?id=${id}`, { method: 'DELETE' });
    toast.success('Article deleted');
    fetchArticles();
  };

  return (
    <div>
      <div className="flex items-center justify-between mb-6">
        <h1 className="text-xl font-display font-bold text-surface-900">News & Articles</h1>
        <button onClick={() => { setEditing(null); setModalOpen(true); }} className="btn-primary flex items-center gap-2 text-sm">
          <Plus size={15} /> New Article
        </button>
      </div>

      <div className="card overflow-hidden">
        <table className="w-full text-sm">
          <thead>
            <tr className="bg-surface-50 border-b border-surface-100">
              {['Title', 'Status', 'Views', 'Date', 'Actions'].map(h => (
                <th key={h} className="text-left px-4 py-3 text-xs font-semibold text-surface-500 uppercase">{h}</th>
              ))}
            </tr>
          </thead>
          <tbody className="divide-y divide-surface-100">
            {loading ? (
              <tr><td colSpan={5} className="px-4 py-8 text-center text-surface-400">Loading...</td></tr>
            ) : articles.length === 0 ? (
              <tr><td colSpan={5} className="px-4 py-8 text-center text-surface-400">No articles yet</td></tr>
            ) : articles.map((a) => (
              <tr key={a.id} className="hover:bg-surface-50">
                <td className="px-4 py-3">
                  <div className="font-medium text-surface-800 max-w-xs truncate">{a.title}</div>
                  <div className="text-xs text-surface-400 font-mono">{a.slug}</div>
                </td>
                <td className="px-4 py-3">
                  <span className={`badge ${a.published ? 'badge-free' : 'bg-surface-100 text-surface-500'}`}>
                    {a.published ? 'Published' : 'Draft'}
                  </span>
                </td>
                <td className="px-4 py-3 text-surface-600">{a.viewCount}</td>
                <td className="px-4 py-3 text-surface-500 text-xs">
                  {a.publishedAt ? new Date(a.publishedAt).toLocaleDateString('en-IN') : '—'}
                </td>
                <td className="px-4 py-3">
                  <div className="flex items-center gap-1">
                    <button onClick={() => { setEditing(a); setModalOpen(true); }} className="p-1.5 text-surface-500 hover:text-brand-600 hover:bg-brand-50 rounded-lg">
                      <Pencil size={13} />
                    </button>
                    <button onClick={() => handleDelete(a.id)} className="p-1.5 text-surface-500 hover:text-danger-600 hover:bg-danger-50 rounded-lg">
                      <Trash2 size={13} />
                    </button>
                  </div>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {modalOpen && (
        <NewsFormModal
          article={editing}
          onClose={() => setModalOpen(false)}
          onSaved={() => { setModalOpen(false); fetchArticles(); }}
        />
      )}
    </div>
  );
}
