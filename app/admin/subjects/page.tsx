'use client';

import { useState, useEffect, useCallback } from 'react';
import { Plus, Pencil, Trash2, Save, X, ChevronDown, GripVertical } from 'lucide-react';
import toast from 'react-hot-toast';
import type { TestSection, MockTest } from '@/types';

export default function AdminSubjectsPage() {
  const [tests, setTests] = useState<MockTest[]>([]);
  const [selectedTest, setSelectedTest] = useState<number | null>(null);
  const [subjects, setSubjects] = useState<TestSection[]>([]);
  const [editing, setEditing] = useState<Partial<TestSection> | null>(null);
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    fetch('/api/admin/tests?limit=100')
      .then(r => r.json())
      .then(j => { if (j.success) setTests(j.data); });
  }, []);

  const fetchSubjects = useCallback(async () => {
    if (!selectedTest) return;
    const res = await fetch(`/api/admin/sections?testId=${selectedTest}`);
    const json = await res.json();
    if (json.success) setSubjects(json.data);
  }, [selectedTest]);

  useEffect(() => { fetchSubjects(); }, [fetchSubjects]);

  const handleSave = async () => {
    if (!editing?.name || !selectedTest) { toast.error('Name required'); return; }
    setSaving(true);
    try {
      const method = editing.id ? 'PUT' : 'POST';
      const res = await fetch('/api/admin/sections', {
        method,
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ ...editing, testId: selectedTest }),
      });
      const json = await res.json();
      if (!json.success) throw new Error(json.error);
      toast.success(editing.id ? 'Subject updated' : 'Subject created');
      setEditing(null);
      fetchSubjects();
    } catch (err: unknown) {
      toast.error(err instanceof Error ? err.message : 'Failed');
    } finally {
      setSaving(false);
    }
  };

  const handleDelete = async (id: number) => {
    if (!confirm('Delete this subject? Questions stay in the test; only the grouping is removed.')) return;
    await fetch(`/api/admin/sections?id=${id}`, { method: 'DELETE' });
    toast.success('Subject deleted');
    fetchSubjects();
  };

  return (
    <div>
      <div className="flex items-center justify-between mb-6">
        <h1 className="text-xl font-display font-bold text-surface-900">Test subjects</h1>
        <button
          disabled={!selectedTest}
          onClick={() => setEditing({ name: '', orderIndex: subjects.length })}
          className="btn-primary flex items-center gap-2 text-sm disabled:opacity-50"
        >
          <Plus size={15} /> Add subject
        </button>
      </div>

      <div className="card p-4 mb-5 flex items-center gap-3">
        <label className="text-sm font-semibold text-surface-700 whitespace-nowrap">Test:</label>
        <div className="relative flex-1 max-w-sm">
          <select
            value={selectedTest || ''}
            onChange={e => setSelectedTest(e.target.value ? parseInt(e.target.value) : null)}
            className="input-base text-sm appearance-none pr-8"
          >
            <option value="">— Select a test —</option>
            {tests.map(t => <option key={t.id} value={t.id}>{t.title}</option>)}
          </select>
          <ChevronDown size={14} className="absolute right-3 top-1/2 -translate-y-1/2 text-surface-400 pointer-events-none" />
        </div>
      </div>

      {editing !== null && (
        <div className="card p-5 mb-5 border-2 border-brand-200">
          <h3 className="font-semibold text-surface-800 mb-4 text-sm">{editing.id ? 'Edit subject' : 'New subject'}</h3>
          <div className="grid sm:grid-cols-2 lg:grid-cols-4 gap-4 mb-4">
            <div>
              <label className="block text-xs font-semibold text-surface-700 mb-1">Name (English) *</label>
              <input
                value={editing.name || ''}
                onChange={e => setEditing(p => ({ ...p, name: e.target.value }))}
                className="input-base text-sm"
                placeholder="General Awareness"
              />
            </div>
            <div>
              <label className="block text-xs font-semibold text-surface-700 mb-1">Name (Hindi)</label>
              <input
                value={(editing as Record<string, string>).nameHindi || ''}
                onChange={e => setEditing(p => ({ ...p, nameHindi: e.target.value } as Partial<TestSection>))}
                className="input-base text-sm"
                placeholder="सामान्य जागरूकता"
              />
            </div>
            <div>
              <label className="block text-xs font-semibold text-surface-700 mb-1">Question count</label>
              <input
                type="number"
                value={editing.questionCount || 0}
                onChange={e => setEditing(p => ({ ...p, questionCount: parseInt(e.target.value) }))}
                className="input-base text-sm"
              />
            </div>
            <div>
              <label className="block text-xs font-semibold text-surface-700 mb-1">Time limit (sec)</label>
              <input
                type="number"
                value={(editing as Record<string, number>).timeLimit || ''}
                onChange={e => setEditing(p => ({ ...p, timeLimit: e.target.value ? parseInt(e.target.value) : undefined } as Partial<TestSection>))}
                className="input-base text-sm"
                placeholder="Blank = no limit"
              />
            </div>
          </div>
          <div className="flex gap-2">
            <button onClick={handleSave} disabled={saving} className="btn-primary flex items-center gap-2 text-sm">
              <Save size={13} /> {saving ? 'Saving...' : 'Save subject'}
            </button>
            <button onClick={() => setEditing(null)} className="btn-secondary text-sm flex items-center gap-2">
              <X size={13} /> Cancel
            </button>
          </div>
        </div>
      )}

      {!selectedTest ? (
        <div className="card p-12 text-center text-surface-400">Select a test to manage its subjects</div>
      ) : subjects.length === 0 ? (
        <div className="card p-12 text-center">
          <p className="text-surface-500 font-medium mb-1">No subjects defined</p>
          <p className="text-sm text-surface-400 mb-4">Subjects are optional. Add them to group questions, or use the subject field on each question instead.</p>
          <button onClick={() => setEditing({ name: '', orderIndex: 0 })} className="btn-primary text-sm">Add first subject</button>
        </div>
      ) : (
        <div className="card overflow-hidden">
          <table className="w-full text-sm">
            <thead>
              <tr className="bg-surface-50 border-b border-surface-100">
                {['Order', 'Subject', 'Hindi name', 'Questions', 'Time limit', 'Actions'].map(h => (
                  <th key={h} className="text-left px-4 py-3 text-xs font-semibold text-surface-500 uppercase">{h}</th>
                ))}
              </tr>
            </thead>
            <tbody className="divide-y divide-surface-100">
              {subjects.map(s => (
                <tr key={s.id} className="hover:bg-surface-50">
                  <td className="px-4 py-3">
                    <GripVertical size={14} className="text-surface-300 cursor-grab" />
                  </td>
                  <td className="px-4 py-3 font-medium text-surface-800">{s.name}</td>
                  <td className="px-4 py-3 text-surface-600">{(s as Record<string, string>).nameHindi || '—'}</td>
                  <td className="px-4 py-3 text-surface-600">{s.questionCount}</td>
                  <td className="px-4 py-3 text-surface-600">
                    {(s as Record<string, number>).timeLimit ? `${(s as Record<string, number>).timeLimit}s` : 'No limit'}
                  </td>
                  <td className="px-4 py-3">
                    <div className="flex items-center gap-1">
                      <button onClick={() => setEditing({ ...s })} className="p-1.5 text-surface-500 hover:text-brand-600 hover:bg-brand-50 rounded-lg">
                        <Pencil size={13} />
                      </button>
                      <button onClick={() => handleDelete(s.id)} className="p-1.5 text-surface-500 hover:text-danger-600 hover:bg-danger-50 rounded-lg">
                        <Trash2 size={13} />
                      </button>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}
