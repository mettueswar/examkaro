import { redirect } from 'next/navigation';
import Link from 'next/link';
import { getAuthPayload } from '@/lib/auth/jwt';
import { query, queryOne } from '@/lib/db';
import { Header } from '@/components/layout/Header';
import { Footer } from '@/components/layout/Footer';
import { formatTime, getScoreColor, cn } from '@/lib/utils';
import { BookOpen, Trophy, Clock, TrendingUp, ArrowRight, BarChart2 } from 'lucide-react';
import type { TestAttempt, MockTest } from '@/types';

export default async function DashboardPage() {
  const auth = await getAuthPayload();
  if (!auth) redirect('/login');

  const recentAttempts = await query<TestAttempt & { test_title: string; test_slug: string; category_name: string }>(
    `SELECT ta.*, t.title as test_title, t.slug as test_slug, c.name as category_name
     FROM test_attempts ta
     JOIN mock_tests t ON ta.test_id = t.id
     LEFT JOIN categories c ON t.category_id = c.id
     WHERE ta.user_id = ? AND ta.status = 'submitted'
     ORDER BY ta.submitted_at DESC LIMIT 10`,
    [auth.userId]
  ).catch(() => []);

  const stats = await queryOne<{
    total_attempts: number;
    avg_score: number;
    best_score: number;
    total_time: number;
  }>(
    `SELECT
       COUNT(*) as total_attempts,
       AVG(CASE WHEN total_marks > 0 THEN (score / total_marks * 100) ELSE 0 END) as avg_score,
       MAX(CASE WHEN total_marks > 0 THEN (score / total_marks * 100) ELSE 0 END) as best_score,
       SUM(time_taken) as total_time
     FROM test_attempts WHERE user_id = ? AND status = 'submitted'`,
    [auth.userId]
  ).catch(() => null);

  const recommendations = await query<MockTest & { category_name: string }>(
    `SELECT t.*, c.name as category_name FROM mock_tests t
     LEFT JOIN categories c ON t.category_id = c.id
     WHERE t.is_active = 1 AND t.type = 'free'
     AND t.id NOT IN (SELECT test_id FROM test_attempts WHERE user_id = ?)
     ORDER BY t.attempt_count DESC LIMIT 4`,
    [auth.userId]
  ).catch(() => []);

  const statCards = [
    { label: 'Tests Attempted', value: stats?.total_attempts ?? 0, icon: BookOpen, color: 'text-brand-600', bg: 'bg-brand-50' },
    { label: 'Avg Score', value: `${Math.round(stats?.avg_score ?? 0)}%`, icon: BarChart2, color: 'text-success-600', bg: 'bg-success-50' },
    { label: 'Best Score', value: `${Math.round(stats?.best_score ?? 0)}%`, icon: Trophy, color: 'text-warning-500', bg: 'bg-warning-50' },
    { label: 'Time Spent', value: formatTime(stats?.total_time ?? 0), icon: Clock, color: 'text-purple-600', bg: 'bg-purple-50' },
  ];

  return (
    <>
      <Header />
      <main className="max-w-6xl mx-auto px-4 py-8">
        <div className="mb-7">
          <h1 className="text-2xl font-display font-bold text-surface-900">Dashboard</h1>
          <p className="text-surface-500 text-sm mt-1">Track your preparation progress</p>
        </div>

        {/* Plan banner */}
        {auth.plan === 'free' && (
          <div className="mb-6 p-4 bg-gradient-to-r from-brand-600 to-brand-500 rounded-xl text-white flex items-center justify-between flex-wrap gap-3">
            <div>
              <p className="font-semibold">Upgrade to Premium</p>
              <p className="text-blue-100 text-sm">Get access to 5,000+ premium mock tests and detailed analytics</p>
            </div>
            <Link href="/packages" className="bg-white text-brand-600 font-semibold px-4 py-2 rounded-lg text-sm hover:bg-blue-50 transition-colors shrink-0">
              View Plans →
            </Link>
          </div>
        )}

        {/* Stats */}
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-4 mb-8">
          {statCards.map(({ label, value, icon: Icon, color, bg }) => (
            <div key={label} className="card p-4">
              <div className={cn('w-9 h-9 rounded-xl flex items-center justify-center mb-3', bg)}>
                <Icon size={18} className={color} />
              </div>
              <div className="text-2xl font-display font-bold text-surface-900">{value}</div>
              <div className="text-xs text-surface-500 mt-0.5">{label}</div>
            </div>
          ))}
        </div>

        <div className="grid lg:grid-cols-3 gap-6">
          {/* Recent Attempts */}
          <div className="lg:col-span-2">
            <div className="flex items-center justify-between mb-4">
              <h2 className="font-display font-bold text-surface-900">Recent Attempts</h2>
              <Link href="/attempts" className="text-sm text-brand-500 hover:underline flex items-center gap-1">
                View all <ArrowRight size={13} />
              </Link>
            </div>
            {recentAttempts.length === 0 ? (
              <div className="card p-8 text-center">
                <BookOpen size={32} className="text-surface-300 mx-auto mb-3" />
                <p className="text-surface-500 font-medium">No tests attempted yet</p>
                <p className="text-sm text-surface-400 mb-4">Start with a free mock test</p>
                <Link href="/tests" className="btn-primary text-sm inline-block">Browse Tests</Link>
              </div>
            ) : (
              <div className="space-y-3">
                {recentAttempts.map((attempt) => {
                  const pct = attempt.totalMarks && attempt.totalMarks > 0
                    ? Math.round(((attempt.score ?? 0) / attempt.totalMarks) * 100)
                    : 0;
                  return (
                    <Link
                      key={attempt.id}
                      href={`/results/${attempt.id}`}
                      className="card p-4 flex items-center gap-4 hover:shadow-elevated hover:border-brand-200 transition-all"
                    >
                      <div className={cn(
                        'w-12 h-12 rounded-xl flex items-center justify-center text-sm font-bold shrink-0',
                        pct >= 80 ? 'bg-success-50 text-success-600' :
                        pct >= 60 ? 'bg-warning-50 text-warning-500' : 'bg-danger-50 text-danger-600'
                      )}>
                        {pct}%
                      </div>
                      <div className="flex-1 min-w-0">
                        <p className="text-sm font-semibold text-surface-800 truncate">{attempt.test_title}</p>
                        <p className="text-xs text-surface-500 mt-0.5">
                          {attempt.category_name} · {attempt.correct} correct · {formatTime(attempt.timeTaken ?? 0)}
                        </p>
                      </div>
                      <div className="text-xs text-surface-400 shrink-0">
                        {new Date(attempt.submittedAt!).toLocaleDateString('en-IN')}
                      </div>
                    </Link>
                  );
                })}
              </div>
            )}
          </div>

          {/* Recommended Tests */}
          <div>
            <h2 className="font-display font-bold text-surface-900 mb-4">Recommended</h2>
            <div className="space-y-3">
              {recommendations.map((test) => (
                <Link
                  key={test.id}
                  href={`/tests/${test.slug}`}
                  className="card p-3 flex items-center gap-3 hover:shadow-card hover:border-brand-200 transition-all"
                >
                  <div className="w-9 h-9 bg-brand-50 rounded-lg flex items-center justify-center shrink-0">
                    <BookOpen size={15} className="text-brand-500" />
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="text-xs font-semibold text-surface-800 truncate">{test.title}</p>
                    <p className="text-xs text-surface-500 mt-0.5">{test.totalQuestions} Qs · {test.duration} min</p>
                  </div>
                  <span className="badge badge-free text-xs shrink-0">Free</span>
                </Link>
              ))}
              <Link href="/tests" className="flex items-center justify-center gap-2 text-sm text-brand-500 hover:underline py-2">
                Explore More <ArrowRight size={13} />
              </Link>
            </div>
          </div>
        </div>
      </main>
      <Footer />
    </>
  );
}
