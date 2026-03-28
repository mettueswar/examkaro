'use client';

import { useState, useEffect, useCallback } from 'react';
import { X, Save, Plus, Trash2, CheckCircle } from 'lucide-react';
import toast from 'react-hot-toast';
import type { Question, TestSection } from '@/types';

interface Option {
  id: string;
  text: string;
  textHindi: string;
  isCorrect: boolean;
}

const DEFAULT_OPTIONS: Option[] = [
  { id: 'A', text: '', textHindi: '', isCorrect: false },
  { id: 'B', text: '', textHindi: '', isCorrect: false },
  { id: 'C', text: '', textHindi: '', isCorrect: false },
  { id: 'D', text: '', textHindi: '', isCorrect: false },
];

interface Props {
  question: Question | null;
  testId: number;
  onClose: () => void;
  onSaved: () => void;
}

export function QuestionFormModal({ question, testId, onClose, onSaved }: Props) {
  const [text, setText] = useState(question?.text || '');
  const [textHindi, setTextHindi] = useState(question?.textHindi || '');
  const [explanation, setExplanation] = useState(question?.explanation || '');
  const [explanationHindi, setExplanationHindi] = useState(question?.explanationHindi || '');
  const [marks, setMarks] = useState(question?.marks ?? 1);
  const [negativeMarks, setNegativeMarks] = useState(question?.negativeMarks ?? 0.25);
  const [difficulty, setDifficulty] = useState(question?.difficulty || 'medium');
  const [sectionId, setSectionId] = useState<number | null>(question?.sectionId ?? null);
  const [subject, setSubject] = useState(question?.subject?.trim() || '');
  const [testSections, setTestSections] = useState<TestSection[]>([]);
  const [options, setOptions] = useState<Option[]>(
    question?.options
      ? question.options.map(o => ({ id: o.id, text: o.text, textHindi: o.textHindi || '', isCorrect: o.isCorrect }))
      : DEFAULT_OPTIONS
  );
  const [saving, setSaving] = useState(false);
  const [activeTab, setActiveTab] = useState<'en' | 'hi'>('en');

  const loadSections = useCallback(async () => {
    const res = await fetch(`/api/admin/sections?testId=${testId}`);
    const json = await res.json();
    if (json.success) setTestSections(json.data);
  }, [testId]);

  useEffect(() => {
    loadSections();
  }, [loadSections]);

  useEffect(() => {
    setText(question?.text || '');
    setTextHindi(question?.textHindi || '');
    setExplanation(question?.explanation || '');
    setExplanationHindi(question?.explanationHindi || '');
    setMarks(question?.marks ?? 1);
    setNegativeMarks(question?.negativeMarks ?? 0.25);
    setDifficulty(question?.difficulty || 'medium');
    setSectionId(question?.sectionId ?? null);
    setSubject(question?.subject?.trim() || '');
    setOptions(
      question?.options
        ? question.options.map(o => ({ id: o.id, text: o.text, textHindi: o.textHindi || '', isCorrect: o.isCorrect }))
        : DEFAULT_OPTIONS
    );
  }, [question?.id]);

  const updateOption = (idx: number, field: keyof Option, value: string | boolean) => {
    setOptions(prev => prev.map((o, i) => {
      if (i !== idx) {
        if (field === 'isCorrect' && value === true) return { ...o, isCorrect: false };
        return o;
      }
      return { ...o, [field]: value };
    }));
  };

  const handleSave = async () => {
    if (!text.trim()) { toast.error('Question text required'); return; }
    const correctCount = options.filter(o => o.isCorrect).length;
    if (correctCount !== 1) { toast.error('Exactly one option must be marked as correct'); return; }
    if (options.some(o => !o.text.trim())) { toast.error('All option texts are required'); return; }

    setSaving(true);
    try {
      const method = question ? 'PUT' : 'POST';
      const payload = {
        ...(question ? { id: question.id } : {}),
        testId,
        sectionId: testSections.length ? (sectionId ?? null) : undefined,
        subject: subject.trim() || undefined,
        text,
        textHindi: textHindi || undefined,
        type: 'mcq',
        options: options.map(o => ({
          id: o.id, text: o.text, textHindi: o.textHindi || undefined, isCorrect: o.isCorrect,
        })),
        explanation: explanation || undefined,
        explanationHindi: explanationHindi || undefined,
        marks,
        negativeMarks,
        difficulty,
        orderIndex: question?.orderIndex ?? 0,
      };

      const res = await fetch('/api/admin/questions', {
        method,
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload),
      });
      const json = await res.json();
      if (!json.success) throw new Error(json.error);
      toast.success(question ? 'Question updated' : 'Question added');
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
      <div className="relative bg-white rounded-2xl w-full max-w-3xl shadow-overlay max-h-[92vh] flex flex-col">
        <div className="flex items-center justify-between px-6 py-4 border-b border-surface-100 shrink-0">
          <h2 className="font-bold text-surface-900">{question ? 'Edit Question' : 'Add Question'}</h2>
          <button onClick={onClose} className="p-1.5 hover:bg-surface-100 rounded-lg"><X size={16} /></button>
        </div>

        <div className="overflow-y-auto flex-1 p-6 space-y-5">
          {/* Language tab */}
          <div className="flex bg-surface-100 rounded-lg p-1 w-fit">
            {(['en', 'hi'] as const).map(t => (
              <button
                key={t}
                onClick={() => setActiveTab(t)}
                className={`px-4 py-1.5 text-xs font-semibold rounded-md transition-all ${activeTab === t ? 'bg-white shadow-sm' : 'text-surface-500'}`}
              >
                {t === 'en' ? '🇬🇧 English' : '🇮🇳 Hindi'}
              </button>
            ))}
          </div>

          {/* Question text */}
          <div>
            <label className="block text-xs font-semibold text-surface-700 mb-1">
              Question Text ({activeTab === 'en' ? 'English' : 'Hindi'}) *
            </label>
            <textarea
              value={activeTab === 'en' ? text : textHindi}
              onChange={e => activeTab === 'en' ? setText(e.target.value) : setTextHindi(e.target.value)}
              rows={3}
              className="input-base text-sm resize-none"
              placeholder={activeTab === 'en' ? 'Enter question text... (supports HTML & MathJax: $x^2$)' : 'हिंदी में प्रश्न लिखें...'}
            />
            <p className="text-xs text-surface-400 mt-1">
              Use <code className="bg-surface-100 px-1 rounded">$formula$</code> for inline math, <code className="bg-surface-100 px-1 rounded">$$formula$$</code> for display math
            </p>
          </div>

          {/* Options */}
          <div>
            <div className="flex items-center justify-between mb-2">
              <label className="text-xs font-semibold text-surface-700">Answer Options *</label>
              <span className="text-xs text-surface-400">Click ✓ to mark correct answer</span>
            </div>
            <div className="space-y-2.5">
              {options.map((opt, idx) => (
                <div key={opt.id} className={`flex items-start gap-3 p-3 rounded-xl border-2 transition-all ${opt.isCorrect ? 'border-success-400 bg-success-50' : 'border-surface-200 bg-white'}`}>
                  <span className={`w-7 h-7 rounded-full flex items-center justify-center text-xs font-bold shrink-0 mt-0.5 ${opt.isCorrect ? 'bg-success-500 text-white' : 'bg-surface-200 text-surface-600'}`}>
                    {opt.id}
                  </span>
                  <div className="flex-1 space-y-1.5">
                    <input
                      value={activeTab === 'en' ? opt.text : opt.textHindi}
                      onChange={e => updateOption(idx, activeTab === 'en' ? 'text' : 'textHindi', e.target.value)}
                      className="w-full text-sm outline-none bg-transparent placeholder:text-surface-400 text-surface-800"
                      placeholder={`Option ${opt.id} ${activeTab === 'hi' ? '(हिंदी)' : ''}`}
                    />
                  </div>
                  <button
                    onClick={() => updateOption(idx, 'isCorrect', true)}
                    className={`p-1.5 rounded-lg transition-colors shrink-0 ${opt.isCorrect ? 'text-success-600' : 'text-surface-300 hover:text-success-500'}`}
                    title="Mark as correct"
                  >
                    <CheckCircle size={16} />
                  </button>
                </div>
              ))}
            </div>
          </div>

          {/* Subject (test_sections row) + free-text subject for filters */}
          <div className="grid sm:grid-cols-2 gap-4">
            {testSections.length > 0 && (
              <div>
                <label className="block text-xs font-semibold text-surface-700 mb-1">Subject (from test)</label>
                <select
                  value={sectionId ?? ''}
                  onChange={e => setSectionId(e.target.value ? parseInt(e.target.value, 10) : null)}
                  className="input-base text-sm w-full"
                >
                  <option value="">— None —</option>
                  {testSections.map(s => (
                    <option key={s.id} value={s.id}>{s.name}</option>
                  ))}
                </select>
              </div>
            )}
            <div className={testSections.length ? '' : 'sm:col-span-2'}>
              <label className="block text-xs font-semibold text-surface-700 mb-1">Subject label (optional)</label>
              <input
                value={subject}
                onChange={e => setSubject(e.target.value)}
                className="input-base text-sm w-full"
                placeholder="e.g. Quant, Reasoning, GK"
                maxLength={100}
              />
              <p className="text-xs text-surface-400 mt-1">Shown in the attempt screen when the test has no subject rows, or alongside section grouping.</p>
            </div>
          </div>

          {/* Meta */}
          <div className="grid grid-cols-3 gap-4">
            <div>
              <label className="block text-xs font-semibold text-surface-700 mb-1">Marks</label>
              <input
                type="number" step="0.5" min="0" max="10"
                value={marks}
                onChange={e => setMarks(parseFloat(e.target.value))}
                className="input-base text-sm"
              />
            </div>
            <div>
              <label className="block text-xs font-semibold text-surface-700 mb-1">Negative Marks</label>
              <input
                type="number" step="0.25" min="0" max="5"
                value={negativeMarks}
                onChange={e => setNegativeMarks(parseFloat(e.target.value))}
                className="input-base text-sm"
              />
            </div>
            <div>
              <label className="block text-xs font-semibold text-surface-700 mb-1">Difficulty</label>
              <select value={difficulty} onChange={e => setDifficulty(e.target.value)} className="input-base text-sm">
                <option value="easy">Easy</option>
                <option value="medium">Medium</option>
                <option value="hard">Hard</option>
              </select>
            </div>
          </div>

          {/* Explanation */}
          <div>
            <label className="block text-xs font-semibold text-surface-700 mb-1">
              Explanation ({activeTab === 'en' ? 'English' : 'Hindi'})
            </label>
            <textarea
              value={activeTab === 'en' ? explanation : explanationHindi}
              onChange={e => activeTab === 'en' ? setExplanation(e.target.value) : setExplanationHindi(e.target.value)}
              rows={2}
              className="input-base text-sm resize-none"
              placeholder="Explain the correct answer..."
            />
          </div>
        </div>

        <div className="px-6 py-4 border-t border-surface-100 flex justify-end gap-3 shrink-0">
          <button onClick={onClose} className="btn-secondary text-sm">Cancel</button>
          <button onClick={handleSave} disabled={saving} className="btn-primary flex items-center gap-2 text-sm">
            <Save size={14} /> {saving ? 'Saving...' : 'Save Question'}
          </button>
        </div>
      </div>
    </div>
  );
}
