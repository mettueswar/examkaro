import { redirect } from 'next/navigation';
import Link from 'next/link';
import { getAuthPayload } from '@/lib/auth/jwt';
import {
  LayoutDashboard, BookOpen, FileQuestion, FolderOpen,
  Package, Newspaper, Users, Settings, ChevronRight,
} from 'lucide-react';

const ADMIN_NAV = [
  { label: 'Overview', href: '/admin', icon: LayoutDashboard },
  { label: 'Mock Tests', href: '/admin/tests', icon: BookOpen },
  { label: 'Questions', href: '/admin/questions', icon: FileQuestion },
  { label: 'Sections', href: '/admin/sections', icon: FolderOpen },
  { label: 'Categories', href: '/admin/categories', icon: FolderOpen },
  { label: 'Packages', href: '/admin/packages', icon: Package },
  { label: 'News', href: '/admin/news', icon: Newspaper },
  { label: 'Users', href: '/admin/users', icon: Users },
  { label: 'Settings', href: '/admin/settings', icon: Settings },
];

export default async function AdminLayout({ children }: { children: React.ReactNode }) {
  const auth = await getAuthPayload();
  if (!auth || (auth.role !== 'admin' && auth.role !== 'moderator')) {
    redirect('/');
  }

  return (
    <div className="flex min-h-screen bg-surface-50">
      {/* Sidebar */}
      <aside className="w-56 bg-surface-900 text-surface-300 flex flex-col shrink-0 hidden lg:flex">
        <div className="px-4 py-4 border-b border-surface-700">
          <Link href="/" className="flex items-center gap-2 text-white font-display font-bold">
            <div className="w-7 h-7 bg-brand-500 rounded-lg flex items-center justify-center">
              <BookOpen size={14} className="text-white" />
            </div>
            ExamKaro
          </Link>
          <p className="text-xs text-surface-500 mt-0.5">Admin Panel</p>
        </div>
        <nav className="flex-1 py-4 px-2 space-y-0.5">
          {ADMIN_NAV.map(({ label, href, icon: Icon }) => (
            <Link
              key={href}
              href={href}
              className="flex items-center gap-2.5 px-3 py-2 text-sm rounded-lg hover:bg-surface-700 hover:text-white transition-colors"
            >
              <Icon size={15} />
              {label}
            </Link>
          ))}
        </nav>
        <div className="px-4 py-3 border-t border-surface-700 text-xs text-surface-500">
          Logged as <span className="text-surface-300 font-medium capitalize">{auth.role}</span>
        </div>
      </aside>

      {/* Main */}
      <div className="flex-1 flex flex-col min-w-0">
        {/* Top bar */}
        <header className="bg-white border-b border-surface-200 px-6 py-3 flex items-center justify-between">
          <div className="flex items-center gap-2 text-sm text-surface-500">
            <Link href="/" className="hover:text-brand-500">Home</Link>
            <ChevronRight size={14} />
            <span className="text-surface-700 font-medium">Admin</span>
          </div>
          <Link href="/" className="text-sm text-surface-500 hover:text-surface-800">← Back to site</Link>
        </header>

        <main className="flex-1 p-6">
          {children}
        </main>
      </div>
    </div>
  );
}
