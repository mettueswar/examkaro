'use client';

import { useState, useEffect, useCallback } from 'react';
import { Plus, Pencil, Trash2, Upload, ChevronDown } from 'lucide-react';
import { QuestionFormModal } from '@/components/admin/QuestionFormModal';
import { BulkImportModal } from '@/components/admin/BulkImportModal';
import toast from 'react-hot-toast';
import type { Question, MockTest } from '@/types';

export default function AdminQuestionsPage() {
  const [tests, setTests] = useState<MockTest[]>([]);
  const [selectedTest, setSelectedTest] = useState<number | null>(null);
  const [questions, setQuestions] = useState<Question[]>([]);
  const [total, setTotal] = useState(0);
  const [loading, setLoading] = useState(false);
  const [modalOpen, setModalOpen] = useState(false);
  const [editing, setEditing] = useState<Question | null>(null);
  const [bulkOpen, setBulkOpen] = useState(false);

  useEffect(() => {
    fetch('/api/admin/tests?limit=100')
      .then(r => r.json())
      .then(j => { if (j.success) setTests(j.data); });
  }, []);

  const fetchQuestions = useCallback(async () => {
    if (!selectedTest) return;
    setLoading(true);
    const res = await fetch(`/api/admin/questions?testId=${selectedTest}&limit=50`);
    const json = await res.json();
    if (json.success) { setQuestions(json.data); setTotal(json.pagination?.total ?? 0); }
    setLoading(false);
  }, [selectedTest]);

  useEffect(() => { fetchQuestions(); }, [fetchQuestions]);

  const handleDelete = async (id: number) => {
    if (!confirm('Delete this question?')) return;
    await fetch(`/api/admin/questions?id=${id}`, { method: 'DELETE' });
    toast.success('Question deleted');
    fetchQuestions();
  };

  return (
    <div>
      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="text-xl font-display font-bold text-surface-900">Questions</h1>
          {selectedTest && <p className="text-sm text-surface-500 mt-0.5">{total} questions in this test</p>}
        </div>
        <div className="flex items-center gap-2">
          <button
            className="btn-outline flex items-center gap-2 text-sm"
            onClick={() => setBulkOpen(true)}
            disabled={!selectedTest}
          >
            <Upload size={14} /> Bulk Import
          </button>
          <button
            onClick={() => { setEditing(null); setModalOpen(true); }}
            disabled={!selectedTest}
            className="btn-primary flex items-center gap-2 text-sm disabled:opacity-50"
          >
            <Plus size={15} /> Add Question
          </button>
        </div>
      </div>

      {/* Test selector */}
      <div className="card p-4 mb-5 flex items-center gap-3">
        <label className="text-sm font-semibold text-surface-700 whitespace-nowrap">Select Test:</label>
        <div className="relative flex-1 max-w-sm">
          <select
            value={selectedTest || ''}
            onChange={e => setSelectedTest(e.target.value ? parseInt(e.target.value) : null)}
            className="input-base text-sm appearance-none pr-8"
          >
            <option value="">— Choose a test —</option>
            {tests.map(t => <option key={t.id} value={t.id}>{t.title}</option>)}
          </select>
          <ChevronDown size={14} className="absolute right-3 top-1/2 -translate-y-1/2 text-surface-400 pointer-events-none" />
        </div>
      </div>

      {!selectedTest ? (
        <div className="card p-12 text-center text-surface-400">
          <p className="font-medium">Select a test to manage its questions</p>
        </div>
      ) : loading ? (
        <div className="card p-8 text-center text-surface-400">Loading questions...</div>
      ) : questions.length === 0 ? (
        <div className="card p-12 text-center">
          <p className="text-surface-500 font-medium mb-1">No questions yet</p>
          <p className="text-sm text-surface-400 mb-4">Add questions to this test</p>
          <button onClick={() => setModalOpen(true)} className="btn-primary text-sm">
            Add First Question
          </button>
        </div>
      ) : (
        <div className="card overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="bg-surface-50 border-b border-surface-100">
                  <th className="text-left px-4 py-3 text-xs font-semibold text-surface-500 uppercase w-12">#</th>
                  <th className="text-left px-4 py-3 text-xs font-semibold text-surface-500 uppercase">Question</th>
                  <th className="text-left px-4 py-3 text-xs font-semibold text-surface-500 uppercase">Type</th>
                  <th className="text-left px-4 py-3 text-xs font-semibold text-surface-500 uppercase">Marks</th>
                  <th className="text-left px-4 py-3 text-xs font-semibold text-surface-500 uppercase">Difficulty</th>
                  <th className="text-left px-4 py-3 text-xs font-semibold text-surface-500 uppercase">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-surface-100">
                {questions.map((q, idx) => (
                  <tr key={q.id} className="hover:bg-surface-50">
                    <td className="px-4 py-3 text-surface-500 font-mono text-xs">{idx + 1}</td>
                    <td className="px-4 py-3 max-w-md">
                      <div
                        className="text-surface-800 line-clamp-2 text-xs leading-relaxed"
                        dangerouslySetInnerHTML={{ __html: q.text }}
                      />
                    </td>
                    <td className="px-4 py-3 text-surface-600 text-xs uppercase">{q.type}</td>
                    <td className="px-4 py-3 text-surface-600 text-xs">+{q.marks} / -{q.negativeMarks}</td>
                    <td className="px-4 py-3">
                      <span className={`badge text-xs capitalize ${
                        q.difficulty === 'easy' ? 'bg-success-50 text-success-600' :
                        q.difficulty === 'hard' ? 'bg-danger-50 text-danger-600' :
                        'bg-warning-50 text-warning-500'
                      }`}>
                        {q.difficulty}
                      </span>
                    </td>
                    <td className="px-4 py-3">
                      <div className="flex items-center gap-1">
                        <button
                          onClick={() => { setEditing(q); setModalOpen(true); }}
                          className="p-1.5 text-surface-500 hover:text-brand-600 hover:bg-brand-50 rounded-lg"
                        >
                          <Pencil size={13} />
                        </button>
                        <button
                          onClick={() => handleDelete(q.id)}
                          className="p-1.5 text-surface-500 hover:text-danger-600 hover:bg-danger-50 rounded-lg"
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
        </div>
      )}

      {modalOpen && selectedTest && (
        <QuestionFormModal
          question={editing}
          testId={selectedTest}
          onClose={() => setModalOpen(false)}
          onSaved={() => { setModalOpen(false); fetchQuestions(); }}
        />
      )}
      {bulkOpen && selectedTest && (
        <BulkImportModal
          testId={selectedTest}
          onImported={fetchQuestions}
          onClose={() => setBulkOpen(false)}
        />
      )}
    </div>
  );
}
