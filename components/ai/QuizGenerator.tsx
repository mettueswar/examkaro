'use client';

import { useState, useEffect, useCallback } from 'react';
import {
  Brain, Plus, Trash2, Play, Loader2, Sparkles, ChevronDown,
  CheckCircle, XCircle, ArrowRight, Trophy,
} from 'lucide-react';
import { cn } from '@/lib/utils';
import toast from 'react-hot-toast';

interface Quiz {
  id: number;
  title: string;
  questionCount: number;
  difficulty: string;
  attemptCount: number;
  createdAt: string;
}

interface QuizQuestion {
  id: number;
  question: string;
  questionHindi?: string;
  options: Array<{ id: string; text: string; textHindi?: string; isCorrect: boolean }>;
  explanation: string;
  explanationHindi?: string;
  difficulty: string;
}

interface Material {
  id: number;
  title: string;
  wordCount: number;
  status: string;
}

export function QuizGenerator() {
  const [quizzes, setQuizzes] = useState<Quiz[]>([]);
  const [materials, setMaterials] = useState<Material[]>([]);
  const [loading, setLoading] = useState(true);
  const [generating, setGenerating] = useState(false);
  const [showForm, setShowForm] = useState(false);
  const [activeQuiz, setActiveQuiz] = useState<{ quiz: Quiz; questions: QuizQuestion[] } | null>(null);
  const [quizState, setQuizState] = useState<{
    currentIdx: number;
    answers: Record<number, string>;
    showResult: boolean;
    showExplanation: boolean;
  }>({ currentIdx: 0, answers: {}, showResult: false, showExplanation: false });

  const [form, setForm] = useState({
    materialId: '',
    customText: '',
    title: '',
    count: 15,
    difficulty: 'mixed' as 'easy' | 'medium' | 'hard' | 'mixed',
    language: 'english' as 'english' | 'hindi' | 'both',
    timeLimit: 0,
  });

  const fetchQuizzes = useCallback(async () => {
    const res = await fetch('/api/ai/quizzes');
    const json = await res.json();
    if (json.success) setQuizzes(json.data);
    setLoading(false);
  }, []);

  const fetchMaterials = useCallback(async () => {
    const res = await fetch('/api/ai/materials?limit=100');
    const json = await res.json();
    if (json.success) setMaterials(json.data.filter((m: Material) => m.status === 'ready'));
  }, []);

  useEffect(() => { fetchQuizzes(); fetchMaterials(); }, [fetchQuizzes, fetchMaterials]);

  const handleGenerate = async () => {
    if (!form.title.trim()) { toast.error('Title required'); return; }
    if (!form.materialId && !form.customText.trim()) { toast.error('Select a material or enter custom text'); return; }

    setGenerating(true);
    try {
      const payload: Record<string, unknown> = {
        title: form.title, count: form.count,
        difficulty: form.difficulty, language: form.language,
        timeLimit: form.timeLimit,
      };
      if (form.materialId) payload.materialId = parseInt(form.materialId);
      else payload.customText = form.customText;

      const res = await fetch('/api/ai/quizzes', {
        method: 'POST', headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload),
      });
      const json = await res.json();
      if (!json.success) throw new Error(json.error);
      toast.success(`${json.data.questionCount} questions generated!`);
      setShowForm(false);
      setForm({ materialId: '', customText: '', title: '', count: 15, difficulty: 'mixed', language: 'english', timeLimit: 0 });
      fetchQuizzes();
    } catch (err: unknown) {
      toast.error(err instanceof Error ? err.message : 'Generation failed');
    } finally { setGenerating(false); }
  };

  const startQuiz = async (quizId: number) => {
    const res = await fetch(`/api/ai/quizzes?quizId=${quizId}`);
    const json = await res.json();
    if (json.success) {
      setActiveQuiz(json.data);
      setQuizState({ currentIdx: 0, answers: {}, showResult: false, showExplanation: false });
    }
  };

  const deleteQuiz = async (id: number) => {
    if (!confirm('Delete this quiz?')) return;
    await fetch(`/api/ai/quizzes?id=${id}`, { method: 'DELETE' });
    setQuizzes(q => q.filter(x => x.id !== id));
  };

  // ── Active Quiz Screen ───────────────────────────────────────────────────────
  if (activeQuiz) {
    const { quiz, questions } = activeQuiz;
    const { currentIdx, answers, showResult, showExplanation } = quizState;
    const currentQ = questions[currentIdx];
    const totalQuestions = questions.length;

    if (showResult) {
      let correct = 0;
      questions.forEach(q => {
        const correctOpt = q.options.find(o => o.isCorrect);
        if (answers[q.id] === correctOpt?.id) correct++;
      });
      const score = Math.round((correct / totalQuestions) * 100);

      return (
        <div className="max-w-lg mx-auto py-8 text-center">
          <div className={cn('w-20 h-20 rounded-full flex items-center justify-center mx-auto mb-5', score >= 60 ? 'bg-green-100' : 'bg-red-100')}>
            <Trophy size={36} className={score >= 60 ? 'text-green-600' : 'text-red-500'} />
          </div>
          <h2 className="text-2xl font-display font-bold text-surface-900 mb-1">
            {score >= 80 ? 'Excellent!' : score >= 60 ? 'Good Job!' : 'Keep Practicing!'}
          </h2>
          <p className="text-surface-500 mb-6">{quiz.title}</p>

          <div className="grid grid-cols-3 gap-4 mb-8">
            {[
              { label: 'Score', value: `${score}%`, cls: 'bg-brand-50 text-brand-700 border-brand-200' },
              { label: 'Correct', value: correct, cls: 'bg-green-50 text-green-700 border-green-200' },
              { label: 'Wrong', value: totalQuestions - correct, cls: 'bg-red-50 text-red-700 border-red-200' },
            ].map(({ label, value, cls }) => (
              <div key={label} className={cn('border-2 rounded-2xl p-4', cls)}>
                <div className="text-2xl font-bold">{value}</div>
                <div className="text-sm font-medium mt-0.5">{label}</div>
              </div>
            ))}
          </div>

          <div className="flex gap-3 justify-center">
            <button onClick={() => setQuizState(s => ({ ...s, currentIdx: 0, showResult: false }))} className="btn-outline flex items-center gap-2">
              Review Answers
            </button>
            <button onClick={() => setActiveQuiz(null)} className="btn-primary flex items-center gap-2">
              Back to Quizzes
            </button>
          </div>
        </div>
      );
    }

    return (
      <div className="max-w-2xl mx-auto">
        <div className="flex items-center gap-3 mb-5">
          <button onClick={() => setActiveQuiz(null)} className="p-2 hover:bg-surface-100 rounded-xl">
            <XCircle size={16} className="text-surface-500" />
          </button>
          <div className="flex-1">
            <h3 className="font-bold text-surface-900 text-sm">{quiz.title}</h3>
            <p className="text-xs text-surface-400">Q {currentIdx + 1} of {totalQuestions}</p>
          </div>
          <div className="text-sm font-semibold text-brand-600">{Math.round(((currentIdx) / totalQuestions) * 100)}%</div>
        </div>

        <div className="h-2 bg-surface-100 rounded-full mb-6 overflow-hidden">
          <div className="h-full bg-brand-500 rounded-full transition-all" style={{ width: `${(currentIdx / totalQuestions) * 100}%` }} />
        </div>

        <div className="card p-5 mb-4">
          <p className="text-surface-800 font-medium text-base leading-relaxed mb-5">{currentQ.question}</p>
          <div className="space-y-2.5">
            {currentQ.options.map(opt => {
              const selected = answers[currentQ.id] === opt.id;
              const correct = opt.isCorrect;
              const answered = answers[currentQ.id] !== undefined;
              return (
                <button
                  key={opt.id}
                  onClick={() => !answered && setQuizState(s => ({ ...s, answers: { ...s.answers, [currentQ.id]: opt.id }, showExplanation: true }))}
                  disabled={answered}
                  className={cn(
                    'w-full text-left flex items-start gap-3 p-3.5 rounded-xl border-2 text-sm transition-all',
                    !answered ? 'border-surface-200 hover:border-brand-300 hover:bg-brand-50 cursor-pointer' :
                    correct ? 'border-green-500 bg-green-50' :
                    selected ? 'border-red-500 bg-red-50' :
                    'border-surface-200 opacity-60'
                  )}
                >
                  <span className={cn('w-6 h-6 rounded-full border-2 flex items-center justify-center text-xs font-bold shrink-0',
                    !answered ? 'border-surface-300 text-surface-500' :
                    correct ? 'border-green-500 bg-green-500 text-white' :
                    selected ? 'border-red-500 bg-red-500 text-white' :
                    'border-surface-300 text-surface-400'
                  )}>{opt.id}</span>
                  <span>{opt.text}</span>
                  {answered && correct && <CheckCircle size={15} className="text-green-500 ml-auto shrink-0" />}
                  {answered && selected && !correct && <XCircle size={15} className="text-red-500 ml-auto shrink-0" />}
                </button>
              );
            })}
          </div>

          {showExplanation && currentQ.explanation && (
            <div className="mt-4 p-3 bg-blue-50 rounded-xl border border-blue-100">
              <p className="text-xs font-semibold text-blue-700 mb-1">Explanation</p>
              <p className="text-sm text-blue-700">{currentQ.explanation}</p>
            </div>
          )}
        </div>

        <div className="flex justify-end">
          {answers[currentQ?.id] !== undefined && (
            <button
              onClick={() => {
                if (currentIdx + 1 >= totalQuestions) {
                  setQuizState(s => ({ ...s, showResult: true }));
                } else {
                  setQuizState(s => ({ ...s, currentIdx: s.currentIdx + 1, showExplanation: false }));
                }
              }}
              className="flex items-center gap-2 btn-primary"
            >
              {currentIdx + 1 >= totalQuestions ? 'See Results' : 'Next Question'}
              <ArrowRight size={15} />
            </button>
          )}
        </div>
      </div>
    );
  }

  // ── Quiz List ──────────────────────────────────────────────────────────────
  return (
    <div>
      <div className="flex items-center justify-between mb-5">
        <h3 className="font-bold text-surface-900 flex items-center gap-2">
          <Brain size={18} className="text-brand-600" /> AI Quizzes
        </h3>
        <button
          onClick={() => setShowForm(!showForm)}
          className="flex items-center gap-2 btn-primary text-sm"
        >
          <Sparkles size={14} /> {showForm ? 'Cancel' : 'Generate Quiz'}
        </button>
      </div>

      {showForm && (
        <div className="card p-5 mb-5 border-2 border-brand-200 bg-brand-50/20">
          <h4 className="font-semibold text-surface-800 mb-4 flex items-center gap-2">
            <Sparkles size={15} className="text-brand-500" /> AI Quiz Generator
          </h4>
          <div className="grid sm:grid-cols-2 gap-4 mb-4">
            <div className="sm:col-span-2">
              <label className="block text-xs font-semibold text-surface-700 mb-1">Quiz Title *</label>
              <input value={form.title} onChange={e => setForm(p => ({ ...p, title: e.target.value }))} className="input-base text-sm" placeholder="e.g. Indian Geography Quiz" />
            </div>
            <div>
              <label className="block text-xs font-semibold text-surface-700 mb-1">Source Material</label>
              <div className="relative">
                <select value={form.materialId} onChange={e => setForm(p => ({ ...p, materialId: e.target.value, customText: '' }))} className="input-base text-sm appearance-none pr-8">
                  <option value="">— Custom text —</option>
                  {materials.map(m => <option key={m.id} value={m.id}>{m.title}</option>)}
                </select>
                <ChevronDown size={13} className="absolute right-3 top-1/2 -translate-y-1/2 text-surface-400 pointer-events-none" />
              </div>
            </div>
            <div>
              <label className="block text-xs font-semibold text-surface-700 mb-1">Questions</label>
              <input type="number" min={5} max={40} value={form.count} onChange={e => setForm(p => ({ ...p, count: parseInt(e.target.value) || 15 }))} className="input-base text-sm" />
            </div>
            <div>
              <label className="block text-xs font-semibold text-surface-700 mb-1">Difficulty</label>
              <div className="relative">
                <select value={form.difficulty} onChange={e => setForm(p => ({ ...p, difficulty: e.target.value as typeof form.difficulty }))} className="input-base text-sm appearance-none pr-8">
                  <option value="mixed">Mixed</option>
                  <option value="easy">Easy</option>
                  <option value="medium">Medium</option>
                  <option value="hard">Hard</option>
                </select>
                <ChevronDown size={13} className="absolute right-3 top-1/2 -translate-y-1/2 text-surface-400 pointer-events-none" />
              </div>
            </div>
            <div>
              <label className="block text-xs font-semibold text-surface-700 mb-1">Language</label>
              <div className="relative">
                <select value={form.language} onChange={e => setForm(p => ({ ...p, language: e.target.value as typeof form.language }))} className="input-base text-sm appearance-none pr-8">
                  <option value="english">English</option>
                  <option value="hindi">Hindi</option>
                  <option value="both">Bilingual</option>
                </select>
                <ChevronDown size={13} className="absolute right-3 top-1/2 -translate-y-1/2 text-surface-400 pointer-events-none" />
              </div>
            </div>
            {!form.materialId && (
              <div className="sm:col-span-2">
                <label className="block text-xs font-semibold text-surface-700 mb-1">Custom Text</label>
                <textarea value={form.customText} onChange={e => setForm(p => ({ ...p, customText: e.target.value }))} rows={4} className="input-base text-sm resize-none" placeholder="Paste study content... (min 100 chars)" />
              </div>
            )}
          </div>
          <div className="flex gap-3">
            <button onClick={handleGenerate} disabled={generating} className="flex items-center gap-2 btn-primary text-sm">
              {generating ? <><Loader2 size={14} className="animate-spin" /> Generating...</> : <><Sparkles size={14} /> Generate {form.count} Questions</>}
            </button>
            <button onClick={() => setShowForm(false)} className="btn-secondary text-sm">Cancel</button>
          </div>
          {generating && <p className="text-xs text-brand-500 mt-3 animate-pulse">✨ Gemini AI is creating your quiz... 15-30 seconds.</p>}
        </div>
      )}

      {loading ? (
        <div className="grid sm:grid-cols-2 gap-4">
          {[1, 2].map(i => <div key={i} className="card p-5 animate-pulse h-32" />)}
        </div>
      ) : quizzes.length === 0 ? (
        <div className="card p-12 text-center text-surface-400">
          <Brain size={36} className="mx-auto mb-3 text-surface-300" />
          <p className="font-medium">No quizzes yet</p>
          <p className="text-sm mt-1">Generate an AI quiz from any study material</p>
        </div>
      ) : (
        <div className="grid sm:grid-cols-2 gap-4">
          {quizzes.map(quiz => (
            <div key={quiz.id} className="card p-5 hover:shadow-elevated transition-all group">
              <div className="flex items-start justify-between gap-2 mb-3">
                <div className="w-10 h-10 bg-brand-50 rounded-xl flex items-center justify-center">
                  <Brain size={18} className="text-brand-500" />
                </div>
                <div className="flex items-center gap-1">
                  <span className={cn('badge text-xs capitalize', quiz.difficulty === 'easy' ? 'badge-free' : quiz.difficulty === 'hard' ? 'badge-premium' : 'bg-surface-100 text-surface-500')}>
                    {quiz.difficulty}
                  </span>
                  <button onClick={() => deleteQuiz(quiz.id)} className="p-1.5 text-surface-300 hover:text-red-500 rounded-lg opacity-0 group-hover:opacity-100 transition-all">
                    <Trash2 size={13} />
                  </button>
                </div>
              </div>
              <h4 className="font-bold text-surface-800 text-sm mb-1 line-clamp-2">{quiz.title}</h4>
              <p className="text-xs text-surface-400 mb-4">{quiz.questionCount} questions · {quiz.attemptCount} attempts</p>
              <button onClick={() => startQuiz(quiz.id)} className="w-full flex items-center justify-center gap-2 btn-primary text-sm py-2">
                <Play size={13} /> Start Quiz
              </button>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
