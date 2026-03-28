'use client';

import { useState, useEffect } from 'react';
import { X, Save } from 'lucide-react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { mockTestSchema } from '@/lib/validations';
import toast from 'react-hot-toast';
import type { MockTest, Category } from '@/types';
import type { z } from 'zod';

type FormData = z.infer<typeof mockTestSchema>;

interface Props {
  test: MockTest | null;
  onClose: () => void;
  onSaved: () => void;
}

export function TestFormModal({ test, onClose, onSaved }: Props) {
  const [categories, setCategories] = useState<Category[]>([]);
  const [saving, setSaving] = useState(false);

  const { register, handleSubmit, formState: { errors } } = useForm<FormData>({
    resolver: zodResolver(mockTestSchema),
    defaultValues: test ? {
      title: test.title,
      titleHindi: test.titleHindi,
      description: test.description,
      categoryId: test.categoryId,
      type: test.type,
      language: test.language,
      duration: test.duration,
      negativeMarking: test.negativeMarking,
      difficulty: test.difficulty,
      isActive: test.isActive,
    } : {
      type: 'free', language: 'both', duration: 60,
      negativeMarking: 0.25, difficulty: 'medium', isActive: true,
    },
  });

  useEffect(() => {
    fetch('/api/categories').then(r => r.json()).then(j => { if (j.success) setCategories(j.data); });
  }, []);

  const onSubmit = async (data: FormData) => {
    setSaving(true);
    try {
      const method = test ? 'PUT' : 'POST';
      const body = test ? { ...data, id: test.id } : data;
      const res = await fetch('/api/admin/tests', {
        method,
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(body),
      });
      const json = await res.json();
      if (!json.success) throw new Error(json.error);
      toast.success(test ? 'Test updated' : 'Test created');
      onSaved();
    } catch (err: unknown) {
      toast.error(err instanceof Error ? err.message : 'Failed to save');
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
      <div className="absolute inset-0 bg-black/50" onClick={onClose} />
      <div className="relative bg-white rounded-2xl w-full max-w-2xl shadow-overlay max-h-[90vh] flex flex-col">
        <div className="flex items-center justify-between px-6 py-4 border-b border-surface-100">
          <h2 className="font-bold text-surface-900">{test ? 'Edit Test' : 'Add New Test'}</h2>
          <button onClick={onClose} className="p-1.5 hover:bg-surface-100 rounded-lg">
            <X size={16} />
          </button>
        </div>

        <form onSubmit={handleSubmit(onSubmit)} className="overflow-y-auto flex-1">
          <div className="p-6 space-y-4">
            <div className="grid sm:grid-cols-2 gap-4">
              <div className="sm:col-span-2">
                <label className="block text-xs font-semibold text-surface-700 mb-1">Title (English) *</label>
                <input {...register('title')} className="input-base text-sm" placeholder="SSC CGL Tier I Mock Test 1" />
                {errors.title && <p className="text-xs text-danger-600 mt-1">{errors.title.message}</p>}
              </div>
              <div className="sm:col-span-2">
                <label className="block text-xs font-semibold text-surface-700 mb-1">Title (Hindi)</label>
                <input {...register('titleHindi')} className="input-base text-sm" placeholder="हिंदी में शीर्षक" />
              </div>
            </div>

            <div className="grid sm:grid-cols-3 gap-4">
              <div>
                <label className="block text-xs font-semibold text-surface-700 mb-1">Category *</label>
                <select {...register('categoryId', { valueAsNumber: true })} className="input-base text-sm">
                  <option value="">Select...</option>
                  {categories.map(c => <option key={c.id} value={c.id}>{c.name}</option>)}
                </select>
              </div>
              <div>
                <label className="block text-xs font-semibold text-surface-700 mb-1">Type *</label>
                <select {...register('type')} className="input-base text-sm">
                  <option value="free">Free</option>
                  <option value="premium">Premium</option>
                </select>
              </div>
              <div>
                <label className="block text-xs font-semibold text-surface-700 mb-1">Language *</label>
                <select {...register('language')} className="input-base text-sm">
                  <option value="both">Both</option>
                  <option value="english">English only</option>
                  <option value="hindi">Hindi only</option>
                </select>
              </div>
            </div>

            <div className="grid sm:grid-cols-3 gap-4">
              <div>
                <label className="block text-xs font-semibold text-surface-700 mb-1">Duration (min) *</label>
                <input {...register('duration', { valueAsNumber: true })} type="number" className="input-base text-sm" />
              </div>
              <div>
                <label className="block text-xs font-semibold text-surface-700 mb-1">Negative Marking</label>
                <input {...register('negativeMarking', { valueAsNumber: true })} type="number" step="0.25" className="input-base text-sm" />
              </div>
              <div>
                <label className="block text-xs font-semibold text-surface-700 mb-1">Difficulty</label>
                <select {...register('difficulty')} className="input-base text-sm">
                  <option value="easy">Easy</option>
                  <option value="medium">Medium</option>
                  <option value="hard">Hard</option>
                </select>
              </div>
            </div>

            <div>
              <label className="block text-xs font-semibold text-surface-700 mb-1">Instructions</label>
              <textarea {...register('instructions')} rows={3} className="input-base text-sm resize-none" placeholder="Test instructions..." />
            </div>

            <div className="flex items-center gap-3">
              <input type="checkbox" {...register('isActive')} id="isActive" className="w-4 h-4 accent-brand-500" />
              <label htmlFor="isActive" className="text-sm text-surface-700">Active (visible to users)</label>
            </div>
          </div>

          <div className="px-6 py-4 border-t border-surface-100 flex items-center justify-end gap-3">
            <button type="button" onClick={onClose} className="btn-secondary text-sm">Cancel</button>
            <button type="submit" disabled={saving} className="btn-primary flex items-center gap-2 text-sm">
              <Save size={14} /> {saving ? 'Saving...' : 'Save Test'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
