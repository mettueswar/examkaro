import { query, queryOne } from '@/lib/db';
import { BookOpen, Users, FileQuestion, TrendingUp, DollarSign, Trophy } from 'lucide-react';
import Link from 'next/link';

export default async function AdminOverview() {
  const stats = await queryOne<{
    total_tests: number; total_questions: number;
    total_users: number; total_attempts: number;
    premium_users: number; total_revenue: number;
  }>(
    `SELECT
       (SELECT COUNT(*) FROM mock_tests WHERE is_active=1) as total_tests,
       (SELECT COUNT(*) FROM questions WHERE is_active=1) as total_questions,
       (SELECT COUNT(*) FROM users) as total_users,
       (SELECT COUNT(*) FROM test_attempts WHERE status='submitted') as total_attempts,
       (SELECT COUNT(*) FROM users WHERE plan='premium') as premium_users,
       (SELECT COALESCE(SUM(amount),0) FROM payments WHERE status='success') as total_revenue`
  ).catch(() => null);

  const recentAttempts = await query<{
    user_name: string; test_title: string; score: number;
    total_marks: number; submitted_at: Date;
  }>(
    `SELECT u.name as user_name, t.title as test_title, ta.score, ta.total_marks, ta.submitted_at
     FROM test_attempts ta
     JOIN users u ON ta.user_id = u.id
     JOIN mock_tests t ON ta.test_id = t.id
     WHERE ta.status = 'submitted'
     ORDER BY ta.submitted_at DESC LIMIT 8`
  ).catch(() => []);

  const cards = [
    { label: 'Total Tests', value: stats?.total_tests ?? 0, icon: BookOpen, color: 'text-brand-600', bg: 'bg-brand-50', href: '/admin/tests' },
    { label: 'Questions', value: stats?.total_questions ?? 0, icon: FileQuestion, color: 'text-purple-600', bg: 'bg-purple-50', href: '/admin/questions' },
    { label: 'Users', value: stats?.total_users ?? 0, icon: Users, color: 'text-success-600', bg: 'bg-success-50', href: '/admin/users' },
    { label: 'Attempts', value: stats?.total_attempts ?? 0, icon: TrendingUp, color: 'text-warning-500', bg: 'bg-warning-50', href: '#' },
    { label: 'Premium Users', value: stats?.premium_users ?? 0, icon: Trophy, color: 'text-yellow-600', bg: 'bg-yellow-50', href: '/admin/users' },
    { label: 'Revenue', value: `₹${((stats?.total_revenue ?? 0) / 100).toFixed(0)}`, icon: DollarSign, color: 'text-emerald-600', bg: 'bg-emerald-50', href: '#' },
  ];

  return (
    <div>
      <h1 className="text-xl font-display font-bold text-surface-900 mb-6">Overview</h1>

      <div className="grid grid-cols-2 lg:grid-cols-3 xl:grid-cols-6 gap-4 mb-8">
        {cards.map(({ label, value, icon: Icon, color, bg, href }) => (
          <Link key={label} href={href} className="card p-4 hover:shadow-elevated transition-shadow">
            <div className={`w-9 h-9 rounded-xl flex items-center justify-center mb-3 ${bg}`}>
              <Icon size={17} className={color} />
            </div>
            <div className="text-xl font-bold text-surface-900">{value}</div>
            <div className="text-xs text-surface-500 mt-0.5">{label}</div>
          </Link>
        ))}
      </div>

      {/* Recent attempts table */}
      <div className="card">
        <div className="px-5 py-4 border-b border-surface-100">
          <h2 className="font-semibold text-surface-800">Recent Test Attempts</h2>
        </div>
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-surface-100 bg-surface-50">
                <th className="text-left px-5 py-3 text-xs font-semibold text-surface-500 uppercase tracking-wide">User</th>
                <th className="text-left px-5 py-3 text-xs font-semibold text-surface-500 uppercase tracking-wide">Test</th>
                <th className="text-left px-5 py-3 text-xs font-semibold text-surface-500 uppercase tracking-wide">Score</th>
                <th className="text-left px-5 py-3 text-xs font-semibold text-surface-500 uppercase tracking-wide">Date</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-surface-100">
              {recentAttempts.length === 0 ? (
                <tr>
                  <td colSpan={4} className="px-5 py-8 text-center text-surface-400 text-sm">No attempts yet</td>
                </tr>
              ) : recentAttempts.map((a, i) => {
                const pct = a.total_marks > 0 ? Math.round((a.score / a.total_marks) * 100) : 0;
                return (
                  <tr key={i} className="hover:bg-surface-50">
                    <td className="px-5 py-3 font-medium text-surface-800">{a.user_name}</td>
                    <td className="px-5 py-3 text-surface-600 max-w-xs truncate">{a.test_title}</td>
                    <td className="px-5 py-3">
                      <span className={`font-semibold ${pct >= 60 ? 'text-success-600' : 'text-danger-600'}`}>{pct}%</span>
                    </td>
                    <td className="px-5 py-3 text-surface-500 text-xs">
                      {new Date(a.submitted_at).toLocaleDateString('en-IN')}
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}
