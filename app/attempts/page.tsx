import { redirect } from 'next/navigation';
import Link from 'next/link';
import { getAuthPayload } from '@/lib/auth/jwt';
import { query, queryOne } from '@/lib/db';
import { Header } from '@/components/layout/Header';
import { Footer } from '@/components/layout/Footer';
import { formatTime, getScoreColor, cn } from '@/lib/utils';
import { BarChart2, Clock, CheckCircle, XCircle, ArrowRight, FileQuestion } from 'lucide-react';
import type { TestAttempt, MockTest } from '@/types';

export default async function AttemptsPage() {
  const auth = await getAuthPayload();
  if (!auth) redirect('/login');

  const attempts = await query<TestAttempt & {
    testTitle: string; testSlug: string; categoryName: string; totalQuestions: number;
  }>(
    `SELECT ta.*, t.title as test_title, t.slug as test_slug,
            t.total_questions, c.name as category_name
     FROM test_attempts ta
     JOIN mock_tests t ON ta.test_id = t.id
     LEFT JOIN categories c ON t.category_id = c.id
     WHERE ta.user_id = ? AND ta.status = 'submitted'
     ORDER BY ta.submitted_at DESC`,
    [auth.userId]
  ).catch(() => []);

  const overallStats = await queryOne<{
    totalAttempts: number; avgScore: number; bestScore: number;
    totalCorrect: number; totalIncorrect: number; totalTime: number;
  }>(
    `SELECT
       COUNT(*) as total_attempts,
       AVG(CASE WHEN total_marks > 0 THEN (score / total_marks * 100) ELSE 0 END) as avg_score,
       MAX(CASE WHEN total_marks > 0 THEN (score / total_marks * 100) ELSE 0 END) as best_score,
       SUM(correct) as total_correct,
       SUM(incorrect) as total_incorrect,
       SUM(time_taken) as total_time
     FROM test_attempts WHERE user_id = ? AND status = 'submitted'`,
    [auth.userId]
  ).catch(() => null);

  return (
    <>
      <Header />
      <main className="max-w-5xl mx-auto px-4 py-8">
        <div className="mb-6">
          <h1 className="text-2xl font-display font-bold text-surface-900">My Attempts</h1>
          <p className="text-surface-500 text-sm mt-1">Complete history of all your test attempts</p>
        </div>

        {/* Stats summary */}
        {attempts.length > 0 && (
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-4 mb-7">
            {[
              { label: 'Total Attempts', value: overallStats?.totalAttempts ?? 0, icon: FileQuestion, color: 'text-brand-600', bg: 'bg-brand-50' },
              { label: 'Avg Score', value: `${Math.round(overallStats?.avgScore ?? 0)}%`, icon: BarChart2, color: 'text-success-600', bg: 'bg-success-50' },
              { label: 'Best Score', value: `${Math.round(overallStats?.bestScore ?? 0)}%`, icon: CheckCircle, color: 'text-warning-500', bg: 'bg-warning-50' },
              { label: 'Time Spent', value: formatTime(overallStats?.totalTime ?? 0), icon: Clock, color: 'text-purple-600', bg: 'bg-purple-50' },
            ].map(({ label, value, icon: Icon, color, bg }) => (
              <div key={label} className="card p-4 text-center">
                <div className={cn('w-9 h-9 rounded-xl flex items-center justify-center mx-auto mb-2', bg)}>
                  <Icon size={17} className={color} />
                </div>
                <div className="text-xl font-bold text-surface-900">{value}</div>
                <div className="text-xs text-surface-500">{label}</div>
              </div>
            ))}
          </div>
        )}

        {/* Attempts list */}
        {attempts.length === 0 ? (
          <div className="card p-16 text-center">
            <FileQuestion size={40} className="text-surface-300 mx-auto mb-3" />
            <p className="text-surface-500 font-medium text-lg mb-1">No attempts yet</p>
            <p className="text-surface-400 text-sm mb-5">Start attempting mock tests to see your history here</p>
            <Link href="/tests" className="btn-primary inline-flex items-center gap-2">
              Browse Tests <ArrowRight size={14} />
            </Link>
          </div>
        ) : (
          <div className="card overflow-hidden">
            <div className="px-5 py-3 border-b border-surface-100 bg-surface-50">
              <p className="text-xs font-semibold text-surface-500 uppercase tracking-wide">
                {attempts.length} attempt{attempts.length !== 1 ? 's' : ''}
              </p>
            </div>
            <div className="divide-y divide-surface-100">
              {attempts.map((attempt) => {
                const pct = attempt.totalMarks && attempt.totalMarks > 0
                  ? Math.round(((attempt.score ?? 0) / attempt.totalMarks) * 100) : 0;
                return (
                  <Link
                    key={attempt.id}
                    href={`/results/${attempt.id}`}
                    className="flex items-center gap-4 px-5 py-4 hover:bg-surface-50 transition-colors"
                  >
                    {/* Score circle */}
                    <div className={cn(
                      'w-14 h-14 rounded-2xl flex flex-col items-center justify-center shrink-0 font-bold',
                      pct >= 80 ? 'bg-success-50 text-success-600' :
                      pct >= 60 ? 'bg-warning-50 text-warning-500' : 'bg-danger-50 text-danger-600'
                    )}>
                      <span className="text-lg leading-none">{pct}%</span>
                      <span className="text-xs font-normal opacity-70">Score</span>
                    </div>

                    <div className="flex-1 min-w-0">
                      <p className="font-semibold text-surface-800 text-sm truncate">{attempt.testTitle}</p>
                      <p className="text-xs text-surface-500 mt-0.5">{attempt.categoryName}</p>
                      <div className="flex items-center gap-3 mt-1.5 text-xs text-surface-500">
                        <span className="flex items-center gap-1 text-success-600">
                          <CheckCircle size={10} /> {attempt.correct ?? 0} correct
                        </span>
                        <span className="flex items-center gap-1 text-danger-500">
                          <XCircle size={10} /> {attempt.incorrect ?? 0} wrong
                        </span>
                        <span className="flex items-center gap-1">
                          <Clock size={10} /> {formatTime(attempt.timeTaken ?? 0)}
                        </span>
                      </div>
                    </div>

                    <div className="text-right shrink-0">
                      <p className="text-xs text-surface-500">
                        {attempt.submittedAt ? new Date(attempt.submittedAt).toLocaleDateString('en-IN', {
                          day: 'numeric', month: 'short', year: 'numeric'
                        }) : ''}
                      </p>
                      <p className="text-xs text-brand-500 mt-1 flex items-center gap-0.5 justify-end">
                        View Analysis <ArrowRight size={11} />
                      </p>
                    </div>
                  </Link>
                );
              })}
            </div>
          </div>
        )}
      </main>
      <Footer />
    </>
  );
}
