'use client';

import { useState, useEffect, useCallback } from 'react';
import { Plus, Pencil, Trash2, Save, X } from 'lucide-react';
import toast from 'react-hot-toast';
import type { Category } from '@/types';

export default function AdminCategoriesPage() {
  const [categories, setCategories] = useState<(Category & { test_count?: number })[]>([]);
  const [loading, setLoading] = useState(true);
  const [editing, setEditing] = useState<Partial<Category> | null>(null);
  const [saving, setSaving] = useState(false);

  const fetch_ = useCallback(async () => {
    setLoading(true);
    const res = await fetch('/api/categories');
    const json = await res.json();
    if (json.success) setCategories(json.data);
    setLoading(false);
  }, []);

  useEffect(() => { fetch_(); }, [fetch_]);

  const handleSave = async () => {
    if (!editing?.name) { toast.error('Name required'); return; }
    setSaving(true);
    try {
      const method = editing.id ? 'PUT' : 'POST';
      const res = await fetch('/api/categories', {
        method,
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(editing),
      });
      const json = await res.json();
      if (!json.success) throw new Error(json.error);
      toast.success(editing.id ? 'Category updated' : 'Category created');
      setEditing(null);
      fetch_();
    } catch (err: unknown) {
      toast.error(err instanceof Error ? err.message : 'Failed');
    } finally {
      setSaving(false);
    }
  };

  const handleDelete = async (id: number) => {
    if (!confirm('Delete this category?')) return;
    await fetch(`/api/categories?id=${id}`, { method: 'DELETE' });
    toast.success('Category deleted');
    fetch_();
  };

  const ICONS = ['📋', '🏦', '🚂', '🏛️', '📜', '🪖', '📚', '👮', '⚖️', '🏥', '💻', '🎓'];

  return (
    <div>
      <div className="flex items-center justify-between mb-6">
        <h1 className="text-xl font-display font-bold text-surface-900">Categories</h1>
        <button
          onClick={() => setEditing({ name: '', icon: '📋', color: '#1a56db', orderIndex: 0 })}
          className="btn-primary flex items-center gap-2 text-sm"
        >
          <Plus size={15} /> Add Category
        </button>
      </div>

      {/* Inline editor */}
      {editing !== null && (
        <div className="card p-5 mb-5 border-brand-200 border-2">
          <h3 className="font-semibold text-surface-800 mb-4 text-sm">
            {editing.id ? 'Edit Category' : 'New Category'}
          </h3>
          <div className="grid sm:grid-cols-2 lg:grid-cols-4 gap-4 mb-4">
            <div>
              <label className="block text-xs font-semibold text-surface-700 mb-1">Name (English) *</label>
              <input
                value={editing.name || ''}
                onChange={e => setEditing(p => ({ ...p, name: e.target.value }))}
                className="input-base text-sm"
                placeholder="SSC, Banking..."
              />
            </div>
            <div>
              <label className="block text-xs font-semibold text-surface-700 mb-1">Name (Hindi)</label>
              <input
                value={(editing as Record<string, string>).nameHindi || ''}
                onChange={e => setEditing(p => ({ ...p, nameHindi: e.target.value } as Partial<Category>))}
                className="input-base text-sm"
                placeholder="हिंदी नाम"
              />
            </div>
            <div>
              <label className="block text-xs font-semibold text-surface-700 mb-1">Icon</label>
              <div className="flex gap-1 flex-wrap">
                {ICONS.map(ic => (
                  <button
                    key={ic}
                    onClick={() => setEditing(p => ({ ...p, icon: ic }))}
                    className={`w-8 h-8 text-base rounded-lg border-2 transition-all ${editing.icon === ic ? 'border-brand-500 bg-brand-50' : 'border-surface-200'}`}
                  >
                    {ic}
                  </button>
                ))}
              </div>
            </div>
            <div>
              <label className="block text-xs font-semibold text-surface-700 mb-1">Color</label>
              <input
                type="color"
                value={editing.color || '#1a56db'}
                onChange={e => setEditing(p => ({ ...p, color: e.target.value }))}
                className="w-full h-10 rounded-lg border border-surface-200 cursor-pointer"
              />
            </div>
          </div>
          <div className="flex gap-2">
            <button onClick={handleSave} disabled={saving} className="btn-primary flex items-center gap-2 text-sm">
              <Save size={13} /> {saving ? 'Saving...' : 'Save'}
            </button>
            <button onClick={() => setEditing(null)} className="btn-secondary text-sm flex items-center gap-2">
              <X size={13} /> Cancel
            </button>
          </div>
        </div>
      )}

      {/* Categories grid */}
      <div className="grid sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
        {loading ? (
          Array.from({ length: 8 }).map((_, i) => (
            <div key={i} className="card p-4 animate-pulse">
              <div className="w-10 h-10 bg-surface-200 rounded-xl mb-3" />
              <div className="h-4 bg-surface-200 rounded w-3/4 mb-2" />
              <div className="h-3 bg-surface-100 rounded w-1/2" />
            </div>
          ))
        ) : categories.map(cat => (
          <div key={cat.id} className="card p-4">
            <div className="flex items-start justify-between mb-3">
              <div
                className="w-10 h-10 rounded-xl flex items-center justify-center text-xl"
                style={{ backgroundColor: `${cat.color}20` }}
              >
                {cat.icon}
              </div>
              <div className="flex gap-1">
                <button
                  onClick={() => setEditing({ ...cat })}
                  className="p-1.5 text-surface-400 hover:text-brand-600 hover:bg-brand-50 rounded-lg"
                >
                  <Pencil size={13} />
                </button>
                <button
                  onClick={() => handleDelete(cat.id)}
                  className="p-1.5 text-surface-400 hover:text-danger-600 hover:bg-danger-50 rounded-lg"
                >
                  <Trash2 size={13} />
                </button>
              </div>
            </div>
            <h3 className="font-semibold text-surface-800 text-sm">{cat.name}</h3>
            {cat.description && (
              <p className="text-xs text-surface-500 mt-0.5 line-clamp-1">{cat.description}</p>
            )}
            <p className="text-xs text-surface-400 mt-2">
              {cat.testCount ?? 0} tests · /{cat.slug}
            </p>
          </div>
        ))}
      </div>
    </div>
  );
}
