'use client';

import { useState, useEffect, useCallback } from 'react';
import { Plus, Pencil, Trash2, Save, X, Check } from 'lucide-react';
import toast from 'react-hot-toast';
import { formatCurrency } from '@/lib/utils';
import type { Package } from '@/types';

export default function AdminPackagesPage() {
  const [packages, setPackages] = useState<Package[]>([]);
  const [loading, setLoading] = useState(true);
  const [editing, setEditing] = useState<Partial<Package> | null>(null);
  const [saving, setSaving] = useState(false);
  const [featureInput, setFeatureInput] = useState('');

  const fetch_ = useCallback(async () => {
    setLoading(true);
    const res = await fetch('/api/admin/packages');
    const json = await res.json();
    if (json.success) setPackages(json.data);
    setLoading(false);
  }, []);

  useEffect(() => { fetch_(); }, [fetch_]);

  const addFeature = () => {
    if (!featureInput.trim()) return;
    setEditing(p => ({ ...p, features: [...(p?.features || []), featureInput.trim()] }));
    setFeatureInput('');
  };

  const removeFeature = (idx: number) => {
    setEditing(p => ({ ...p, features: (p?.features || []).filter((_, i) => i !== idx) }));
  };

  const handleSave = async () => {
    if (!editing?.name || !editing?.price) { toast.error('Name and price required'); return; }
    setSaving(true);
    try {
      const method = editing.id ? 'PUT' : 'POST';
      const res = await fetch('/api/admin/packages', {
        method,
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ ...editing, testIds: editing.testIds || [] }),
      });
      const json = await res.json();
      if (!json.success) throw new Error(json.error);
      toast.success('Package saved');
      setEditing(null);
      fetch_();
    } catch (err: unknown) {
      toast.error(err instanceof Error ? err.message : 'Failed');
    } finally {
      setSaving(false);
    }
  };

  const handleDelete = async (id: number) => {
    if (!confirm('Delete this package?')) return;
    await fetch(`/api/admin/packages?id=${id}`, { method: 'DELETE' });
    toast.success('Package deleted');
    fetch_();
  };

  return (
    <div>
      <div className="flex items-center justify-between mb-6">
        <h1 className="text-xl font-display font-bold text-surface-900">Packages</h1>
        <button
          onClick={() => setEditing({ name: '', price: 0, validityDays: 365, features: [], testIds: [], isActive: true })}
          className="btn-primary flex items-center gap-2 text-sm"
        >
          <Plus size={15} /> Add Package
        </button>
      </div>

      {/* Editor */}
      {editing !== null && (
        <div className="card p-5 mb-6 border-2 border-brand-200">
          <h3 className="font-semibold text-surface-800 mb-4 text-sm">{editing.id ? 'Edit Package' : 'New Package'}</h3>
          <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-4 mb-4">
            <div>
              <label className="block text-xs font-semibold text-surface-700 mb-1">Name *</label>
              <input value={editing.name || ''} onChange={e => setEditing(p => ({ ...p, name: e.target.value }))} className="input-base text-sm" placeholder="SSC Starter Pack" />
            </div>
            <div>
              <label className="block text-xs font-semibold text-surface-700 mb-1">Price (₹) *</label>
              <input type="number" value={editing.price || ''} onChange={e => setEditing(p => ({ ...p, price: parseFloat(e.target.value) }))} className="input-base text-sm" />
            </div>
            <div>
              <label className="block text-xs font-semibold text-surface-700 mb-1">Discounted Price (₹)</label>
              <input type="number" value={editing.discountedPrice || ''} onChange={e => setEditing(p => ({ ...p, discountedPrice: parseFloat(e.target.value) }))} className="input-base text-sm" />
            </div>
            <div>
              <label className="block text-xs font-semibold text-surface-700 mb-1">Validity (days)</label>
              <input type="number" value={editing.validityDays || 365} onChange={e => setEditing(p => ({ ...p, validityDays: parseInt(e.target.value) }))} className="input-base text-sm" />
            </div>
            <div className="sm:col-span-2">
              <label className="block text-xs font-semibold text-surface-700 mb-1">Description</label>
              <input value={editing.description || ''} onChange={e => setEditing(p => ({ ...p, description: e.target.value }))} className="input-base text-sm" placeholder="Short description..." />
            </div>
          </div>

          {/* Features builder */}
          <div className="mb-4">
            <label className="block text-xs font-semibold text-surface-700 mb-2">Features</label>
            <div className="flex gap-2 mb-2">
              <input
                value={featureInput}
                onChange={e => setFeatureInput(e.target.value)}
                onKeyDown={e => e.key === 'Enter' && addFeature()}
                className="input-base text-sm flex-1"
                placeholder="Add feature and press Enter..."
              />
              <button onClick={addFeature} className="btn-outline text-sm px-3">Add</button>
            </div>
            <div className="flex flex-wrap gap-2">
              {(editing.features || []).map((f, i) => (
                <span key={i} className="flex items-center gap-1.5 bg-brand-50 text-brand-700 text-xs px-2 py-1 rounded-lg">
                  <Check size={11} /> {f}
                  <button onClick={() => removeFeature(i)} className="ml-1 text-brand-400 hover:text-danger-600"><X size={11} /></button>
                </span>
              ))}
            </div>
          </div>

          <div className="flex gap-2">
            <button onClick={handleSave} disabled={saving} className="btn-primary flex items-center gap-2 text-sm">
              <Save size={13} /> {saving ? 'Saving...' : 'Save Package'}
            </button>
            <button onClick={() => setEditing(null)} className="btn-secondary text-sm flex items-center gap-2">
              <X size={13} /> Cancel
            </button>
          </div>
        </div>
      )}

      {/* Packages list */}
      <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-4">
        {loading ? (
          Array.from({ length: 3 }).map((_, i) => (
            <div key={i} className="card p-5 animate-pulse space-y-3">
              <div className="h-5 bg-surface-200 rounded w-3/4" />
              <div className="h-8 bg-surface-200 rounded w-1/2" />
              <div className="space-y-2">
                {[1,2,3].map(j => <div key={j} className="h-3 bg-surface-100 rounded" />)}
              </div>
            </div>
          ))
        ) : packages.map(pkg => (
          <div key={pkg.id} className="card p-5 relative">
            <div className="flex items-start justify-between mb-3">
              <h3 className="font-bold text-surface-900">{pkg.name}</h3>
              <div className="flex gap-1">
                <button onClick={() => setEditing({ ...pkg })} className="p-1.5 text-surface-400 hover:text-brand-600 hover:bg-brand-50 rounded-lg"><Pencil size={13} /></button>
                <button onClick={() => handleDelete(pkg.id)} className="p-1.5 text-surface-400 hover:text-danger-600 hover:bg-danger-50 rounded-lg"><Trash2 size={13} /></button>
              </div>
            </div>
            <div className="flex items-baseline gap-2 mb-3">
              <span className="text-2xl font-bold text-surface-900">{formatCurrency(pkg.discountedPrice ?? pkg.price)}</span>
              {pkg.discountedPrice && <span className="text-surface-400 line-through text-sm">{formatCurrency(pkg.price)}</span>}
            </div>
            <p className="text-xs text-surface-500 mb-3">Valid {pkg.validityDays} days</p>
            <ul className="space-y-1.5">
              {(pkg.features || []).slice(0, 4).map((f, i) => (
                <li key={i} className="flex items-center gap-2 text-xs text-surface-600">
                  <Check size={11} className="text-success-500 shrink-0" /> {f}
                </li>
              ))}
            </ul>
            <div className={`mt-3 badge ${pkg.isActive ? 'badge-free' : 'bg-surface-100 text-surface-400'}`}>
              {pkg.isActive ? 'Active' : 'Hidden'}
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
