import { query } from '@/lib/db';
import type { User } from '@/types';
import { Shield, Crown } from 'lucide-react';

export default async function AdminUsersPage() {
  const users = await query<User & { attempt_count: number }>(
    `SELECT u.*, COUNT(ta.id) as attempt_count
     FROM users u LEFT JOIN test_attempts ta ON u.id = ta.user_id
     GROUP BY u.id ORDER BY u.created_at DESC LIMIT 100`
  ).catch(() => []);

  return (
    <div>
      <div className="flex items-center justify-between mb-6">
        <h1 className="text-xl font-display font-bold text-surface-900">Users</h1>
        <span className="text-sm text-surface-500">{users.length} users</span>
      </div>

      <div className="card overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="bg-surface-50 border-b border-surface-100">
                {['User', 'Email', 'Plan', 'Role', 'Attempts', 'Joined', 'Last Login'].map(h => (
                  <th key={h} className="text-left px-4 py-3 text-xs font-semibold text-surface-500 uppercase whitespace-nowrap">{h}</th>
                ))}
              </tr>
            </thead>
            <tbody className="divide-y divide-surface-100">
              {users.length === 0 ? (
                <tr><td colSpan={7} className="px-4 py-8 text-center text-surface-400">No users yet</td></tr>
              ) : users.map(u => (
                <tr key={u.id} className="hover:bg-surface-50">
                  <td className="px-4 py-3">
                    <div className="flex items-center gap-2">
                      {u.avatar ? (
                        <img src={u.avatar} alt={u.name} className="w-7 h-7 rounded-full" />
                      ) : (
                        <div className="w-7 h-7 bg-brand-100 rounded-full flex items-center justify-center text-brand-600 text-xs font-bold">
                          {u.name?.[0]}
                        </div>
                      )}
                      <span className="font-medium text-surface-800 max-w-[120px] truncate">{u.name}</span>
                    </div>
                  </td>
                  <td className="px-4 py-3 text-surface-600 max-w-[160px] truncate">{u.email}</td>
                  <td className="px-4 py-3">
                    <span className={`badge ${u.plan === 'premium' ? 'badge-premium' : 'bg-surface-100 text-surface-500'}`}>
                      {u.plan === 'premium' ? <><Crown size={10} /> Premium</> : 'Free'}
                    </span>
                  </td>
                  <td className="px-4 py-3">
                    <span className={`badge capitalize ${u.role === 'admin' ? 'bg-brand-50 text-brand-600' : 'bg-surface-100 text-surface-500'}`}>
                      {u.role === 'admin' && <Shield size={10} />} {u.role}
                    </span>
                  </td>
                  <td className="px-4 py-3 text-surface-600">{u.attempt_count}</td>
                  <td className="px-4 py-3 text-surface-500 text-xs whitespace-nowrap">
                    {new Date(u.createdAt).toLocaleDateString('en-IN')}
                  </td>
                  <td className="px-4 py-3 text-surface-500 text-xs whitespace-nowrap">
                    {u.lastLogin ? new Date(u.lastLogin).toLocaleDateString('en-IN') : '—'}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}
