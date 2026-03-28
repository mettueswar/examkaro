'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import {
  Clock, FileQuestion, AlertTriangle, CheckCircle,
  Languages, Play, Lock, ChevronRight, BookOpen, BarChart2, Users,
} from 'lucide-react';
import { useAuth } from '@/components/providers/AuthProvider';
import { LoginModal } from '@/components/auth/LoginModal';
import { formatCurrency } from '@/lib/utils';
import toast from 'react-hot-toast';
import type { MockTest, TestSection } from '@/types';

interface Props {
  test: MockTest & { category_name?: string; category_slug?: string };
  sections: TestSection[];
  /** Server-detected: user has this test in an active purchased package */
  unlockedViaPackage?: boolean;
}

function hasPaidSitePlan(plan: string | undefined): boolean {
  return plan === 'premium' || plan === 'super';
}

export function TestStartClient({ test, sections, unlockedViaPackage = false }: Props) {
  const { user } = useAuth();
  const router = useRouter();
  const [loginOpen, setLoginOpen] = useState(false);
  const [langModal, setLangModal] = useState(false);
  const [language, setLanguage] = useState<'english' | 'hindi'>('english');
  const [starting, setStarting] = useState(false);

  const isLocked =
    test.type === 'premium' &&
    !hasPaidSitePlan(user?.plan) &&
    !unlockedViaPackage;

  const handleStartAttempt = async () => {
    if (!user) { setLoginOpen(true); return; }
    if (isLocked) { router.push('/packages'); return; }
    if (test.language === 'both') { setLangModal(true); return; }
    await startTest(test.language === 'hindi' ? 'hindi' : 'english');
  };

  const startTest = async (lang: 'hindi' | 'english') => {
    setStarting(true);
    try {
      const res = await fetch('/api/attempts', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ testId: test.id, language: lang }),
      });
      const json = await res.json();
      if (!json.success) throw new Error(json.error);
      router.push(`/attempt/${json.data.attempt.id}`);
    } catch (err: unknown) {
      toast.error(err instanceof Error ? err.message : 'Failed to start test');
    } finally {
      setStarting(false);
    }
  };

  const infoItems = [
    { icon: FileQuestion, label: 'Questions', value: test.totalQuestions },
    { icon: Clock, label: 'Duration', value: `${test.duration} min` },
    { icon: BarChart2, label: 'Total Marks', value: test.totalMarks },
    { icon: AlertTriangle, label: 'Negative Marking', value: `-${test.negativeMarking} per wrong` },
    { icon: Users, label: 'Attempts', value: test.attemptCount.toLocaleString() },
    { icon: BookOpen, label: 'Difficulty', value: test.difficulty, className: 'capitalize' },
  ];

  return (
    <>
      {/* Breadcrumb */}
      <div className="flex items-center gap-1 text-xs text-surface-500 mb-6">
        <Link href="/" className="hover:text-brand-500">Home</Link>
        <ChevronRight size={12} />
        <Link href="/tests" className="hover:text-brand-500">Tests</Link>
        <ChevronRight size={12} />
        {test.category_name && (
          <>
            <Link href={`/tests?category=${test.category_slug}`} className="hover:text-brand-500">{test.category_name}</Link>
            <ChevronRight size={12} />
          </>
        )}
        <span className="text-surface-700 truncate max-w-48">{test.title}</span>
      </div>

      <div className="grid lg:grid-cols-3 gap-6">
        {/* Main Info */}
        <div className="lg:col-span-2 space-y-5">
          <div className="card p-6">
            <div className="flex items-start gap-3 mb-4">
              <span className={`badge ${test.type === 'free' ? 'badge-free' : 'badge-premium'} text-sm px-3 py-1`}>
                {test.type === 'premium' ? '👑 Premium' : '✓ Free'}
              </span>
            </div>
            <h1 className="text-xl font-display font-bold text-surface-900 mb-2">{test.title}</h1>
            {test.titleHindi && (
              <p className="text-surface-500 text-sm mb-3">{test.titleHindi}</p>
            )}
            {test.description && (
              <p className="text-surface-600 text-sm leading-relaxed">{test.description}</p>
            )}
          </div>

          {/* Test Info Grid */}
          <div className="card p-5">
            <h3 className="font-semibold text-surface-800 mb-4 text-sm">Test Details</h3>
            <div className="grid grid-cols-2 sm:grid-cols-3 gap-4">
              {infoItems.map(({ icon: Icon, label, value, className }) => (
                <div key={label} className="bg-surface-50 rounded-lg p-3">
                  <div className="flex items-center gap-2 mb-1">
                    <Icon size={14} className="text-brand-500" />
                    <span className="text-xs text-surface-500">{label}</span>
                  </div>
                  <span className={`text-sm font-semibold text-surface-800 ${className || ''}`}>{value}</span>
                </div>
              ))}
            </div>
          </div>

          {/* Subjects (test_sections) */}
          {sections.length > 0 && (
            <div className="card p-5">
              <h3 className="font-semibold text-surface-800 mb-3 text-sm">Subjects ({sections.length})</h3>
              <div className="space-y-2">
                {sections.map((s) => (
                  <div key={s.id} className="flex items-center justify-between text-sm px-3 py-2 bg-surface-50 rounded-lg">
                    <span className="text-surface-700">{s.name}</span>
                    <span className="text-surface-500">{s.questionCount} questions</span>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Instructions */}
          {test.instructions && (
            <div className="card p-5">
              <h3 className="font-semibold text-surface-800 mb-3 text-sm">Instructions</h3>
              <div
                className="text-sm text-surface-600 leading-relaxed prose prose-sm max-w-none"
                dangerouslySetInnerHTML={{ __html: test.instructions }}
              />
            </div>
          )}
        </div>

        {/* Start Panel */}
        <div className="lg:col-span-1">
          <div className="card p-5 sticky top-20">
            {isLocked ? (
              <>
                <div className="text-center mb-5">
                  <div className="w-12 h-12 bg-warning-50 rounded-2xl flex items-center justify-center mx-auto mb-3">
                    <Lock size={22} className="text-warning-500" />
                  </div>
                  <h3 className="font-bold text-surface-900">Premium Test</h3>
                  <p className="text-sm text-surface-500 mt-1">Upgrade to access this test</p>
                </div>
                <Link href="/packages" className="btn-primary w-full text-center block mb-3">
                  View Plans
                </Link>
              </>
            ) : (
              <>
                <div className="space-y-3 mb-5">
                  <div className="flex items-center gap-2 text-sm text-surface-600">
                    <CheckCircle size={15} className="text-success-500 shrink-0" />
                    <span>{test.totalQuestions} questions</span>
                  </div>
                  <div className="flex items-center gap-2 text-sm text-surface-600">
                    <CheckCircle size={15} className="text-success-500 shrink-0" />
                    <span>{test.duration} minutes to complete</span>
                  </div>
                  <div className="flex items-center gap-2 text-sm text-surface-600">
                    <CheckCircle size={15} className="text-success-500 shrink-0" />
                    <span>Auto-submit when time's up</span>
                  </div>
                  <div className="flex items-center gap-2 text-sm text-surface-600">
                    <CheckCircle size={15} className="text-success-500 shrink-0" />
                    <span>Detailed result analysis</span>
                  </div>
                  {test.language === 'both' && (
                    <div className="flex items-center gap-2 text-sm text-surface-600">
                      <Languages size={15} className="text-brand-500 shrink-0" />
                      <span>Available in Hindi & English</span>
                    </div>
                  )}
                </div>

                <button
                  onClick={handleStartAttempt}
                  disabled={starting}
                  className="btn-primary w-full flex items-center justify-center gap-2"
                >
                  <Play size={15} />
                  {starting ? 'Starting...' : 'Start Test'}
                </button>

                {!user && (
                  <p className="text-xs text-surface-400 text-center mt-3">
                    Login required to attempt
                  </p>
                )}
              </>
            )}
          </div>
        </div>
      </div>

      {/* Language selection modal */}
      {langModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
          <div className="absolute inset-0 bg-black/50" onClick={() => setLangModal(false)} />
          <div className="relative bg-white rounded-2xl p-6 w-full max-w-sm shadow-overlay">
            <h3 className="font-bold text-surface-900 text-lg mb-2">Select Language</h3>
            <p className="text-sm text-surface-500 mb-5">Choose the language for this test</p>
            <div className="grid grid-cols-2 gap-3 mb-5">
              {(['english', 'hindi'] as const).map(lang => (
                <button
                  key={lang}
                  onClick={() => setLanguage(lang)}
                  className={`p-4 rounded-xl border-2 text-center transition-all ${
                    language === lang
                      ? 'border-brand-500 bg-brand-50 text-brand-700'
                      : 'border-surface-200 text-surface-600 hover:border-surface-300'
                  }`}
                >
                  <div className="text-2xl mb-1">{lang === 'english' ? '🇬🇧' : '🇮🇳'}</div>
                  <div className="font-semibold text-sm capitalize">{lang}</div>
                  {lang === 'hindi' && <div className="text-xs text-surface-400 mt-0.5">हिंदी</div>}
                </button>
              ))}
            </div>
            <button
              onClick={() => { setLangModal(false); startTest(language); }}
              disabled={starting}
              className="btn-primary w-full flex items-center justify-center gap-2"
            >
              <Play size={15} />
              {starting ? 'Starting...' : `Start in ${language === 'hindi' ? 'Hindi' : 'English'}`}
            </button>
          </div>
        </div>
      )}

      <LoginModal open={loginOpen} onClose={() => setLoginOpen(false)} />
    </>
  );
}
