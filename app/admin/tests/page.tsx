'use client';

import { useState, useEffect, useCallback } from 'react';
import { Plus, Pencil, Trash2, Search, Eye, EyeOff, ChevronLeft, ChevronRight } from 'lucide-react';
import { TestFormModal } from '@/components/admin/TestFormModal';
import toast from 'react-hot-toast';
import type { MockTest } from '@/types';

export default function AdminTestsPage() {
  const [tests, setTests] = useState<(MockTest & { category_name?: string })[]>([]);
  const [total, setTotal] = useState(0);
  const [page, setPage] = useState(1);
  const [search, setSearch] = useState('');
  const [loading, setLoading] = useState(true);
  const [modalOpen, setModalOpen] = useState(false);
  const [editing, setEditing] = useState<MockTest | null>(null);

  const fetchTests = useCallback(async () => {
    setLoading(true);
    const sp = new URLSearchParams({ page: String(page), limit: '15' });
    if (search) sp.set('search', search);
    const res = await fetch(`/api/admin/tests?${sp}`);
    const json = await res.json();
    if (json.success) { setTests(json.data); setTotal(json.pagination.total); }
    setLoading(false);
  }, [page, search]);

  useEffect(() => { fetchTests(); }, [fetchTests]);

  const handleDelete = async (id: number) => {
    if (!confirm('Delete this test?')) return;
    await fetch(`/api/admin/tests?id=${id}`, { method: 'DELETE' });
    toast.success('Test deleted');
    fetchTests();
  };

  const handleToggle = async (test: MockTest) => {
    await fetch('/api/admin/tests', {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ id: test.id, isActive: !test.isActive }),
    });
    fetchTests();
  };

  const totalPages = Math.ceil(total / 15);

  return (
    <div>
      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="text-xl font-display font-bold text-surface-900">Mock Tests</h1>
          <p className="text-sm text-surface-500 mt-0.5">{total} total tests</p>
        </div>
        <button onClick={() => { setEditing(null); setModalOpen(true); }} className="btn-primary flex items-center gap-2 text-sm">
          <Plus size={15} /> Add Test
        </button>
      </div>

      {/* Search */}
      <div className="card p-4 mb-4 flex items-center gap-3">
        <Search size={15} className="text-surface-400" />
        <input
          type="text"
          placeholder="Search tests..."
          value={search}
          onChange={e => { setSearch(e.target.value); setPage(1); }}
          className="flex-1 outline-none text-sm text-surface-700 placeholder:text-surface-400"
        />
      </div>

      {/* Table */}
      <div className="card overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="bg-surface-50 border-b border-surface-100">
                {['Title', 'Category', 'Type', 'Questions', 'Duration', 'Status', 'Actions'].map(h => (
                  <th key={h} className="text-left px-4 py-3 text-xs font-semibold text-surface-500 uppercase tracking-wide whitespace-nowrap">
                    {h}
                  </th>
                ))}
              </tr>
            </thead>
            <tbody className="divide-y divide-surface-100">
              {loading ? (
                Array.from({ length: 5 }).map((_, i) => (
                  <tr key={i}>
                    {Array.from({ length: 7 }).map((_, j) => (
                      <td key={j} className="px-4 py-3">
                        <div className="h-4 bg-surface-200 rounded animate-pulse w-24" />
                      </td>
                    ))}
                  </tr>
                ))
              ) : tests.length === 0 ? (
                <tr>
                  <td colSpan={7} className="px-4 py-10 text-center text-surface-400">No tests found</td>
                </tr>
              ) : tests.map((test) => (
                <tr key={test.id} className="hover:bg-surface-50">
                  <td className="px-4 py-3">
                    <div className="font-medium text-surface-800 max-w-xs truncate">{test.title}</div>
                    <div className="text-xs text-surface-400 mt-0.5 font-mono">{test.slug}</div>
                  </td>
                  <td className="px-4 py-3 text-surface-600">{test.category_name || '—'}</td>
                  <td className="px-4 py-3">
                    <span className={`badge ${test.type === 'free' ? 'badge-free' : 'badge-premium'}`}>
                      {test.type}
                    </span>
                  </td>
                  <td className="px-4 py-3 text-surface-600">{test.totalQuestions}</td>
                  <td className="px-4 py-3 text-surface-600">{test.duration} min</td>
                  <td className="px-4 py-3">
                    <button onClick={() => handleToggle(test)} className={`flex items-center gap-1 text-xs font-medium px-2 py-1 rounded-full ${test.isActive ? 'bg-success-50 text-success-600' : 'bg-surface-100 text-surface-500'}`}>
                      {test.isActive ? <><Eye size={11} /> Active</> : <><EyeOff size={11} /> Hidden</>}
                    </button>
                  </td>
                  <td className="px-4 py-3">
                    <div className="flex items-center gap-1">
                      <button
                        onClick={() => { setEditing(test); setModalOpen(true); }}
                        className="p-1.5 text-surface-500 hover:text-brand-600 hover:bg-brand-50 rounded-lg transition-colors"
                      >
                        <Pencil size={13} />
                      </button>
                      <button
                        onClick={() => handleDelete(test.id)}
                        className="p-1.5 text-surface-500 hover:text-danger-600 hover:bg-danger-50 rounded-lg transition-colors"
                      >
                        <Trash2 size={13} />
                      </button>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>

        {/* Pagination */}
        {totalPages > 1 && (
          <div className="px-4 py-3 border-t border-surface-100 flex items-center justify-between">
            <span className="text-xs text-surface-500">Page {page} of {totalPages}</span>
            <div className="flex items-center gap-1">
              <button onClick={() => setPage(p => Math.max(1, p - 1))} disabled={page === 1} className="p-1.5 hover:bg-surface-100 rounded-lg disabled:opacity-40">
                <ChevronLeft size={14} />
              </button>
              <button onClick={() => setPage(p => Math.min(totalPages, p + 1))} disabled={page === totalPages} className="p-1.5 hover:bg-surface-100 rounded-lg disabled:opacity-40">
                <ChevronRight size={14} />
              </button>
            </div>
          </div>
        )}
      </div>

      {modalOpen && (
        <TestFormModal
          test={editing}
          onClose={() => setModalOpen(false)}
          onSaved={() => { setModalOpen(false); fetchTests(); }}
        />
      )}
    </div>
  );
}
