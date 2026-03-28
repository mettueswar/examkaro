'use client';

import { useState } from 'react';
import Link from 'next/link';
import Image from 'next/image';
import { usePathname } from 'next/navigation';
import {
  BookOpen, ChevronDown, Menu, X, User, LogOut,
  LayoutDashboard, Crown,
} from 'lucide-react';
import { useAuth } from '@/components/providers/AuthProvider';
import { LoginModal } from '@/components/auth/LoginModal';
import { GlobalSearch } from '@/components/layout/GlobalSearch';
import { cn } from '@/lib/utils';

const NAV_LINKS = [
  { label: 'Mock Tests', href: '/tests' },
  { label: 'Categories', href: '/categories' },
  { label: 'Current Affairs', href: '/news' },
  { label: 'AI Study Hub', href: '/ai' },
  { label: 'Plans', href: '/packages' },
];

export function Header() {
  const { user, signOut } = useAuth();
  const pathname = usePathname();
  const [mobileOpen, setMobileOpen] = useState(false);
  const [loginOpen, setLoginOpen] = useState(false);
  const [userMenuOpen, setUserMenuOpen] = useState(false);

  return (
    <>
      <header className="sticky top-0 z-50 bg-white border-b border-surface-200 shadow-sm">
        <div className="max-w-7xl mx-auto px-4 sm:px-6">
          <div className="flex items-center justify-between h-14">
            {/* Logo */}
            <Link href="/" className="flex items-center gap-2 font-display font-bold text-xl text-brand-600">
              <div className="w-8 h-8 bg-brand-500 rounded-lg flex items-center justify-center">
                <BookOpen size={16} className="text-white" />
              </div>
              <span>ExamKaro</span>
            </Link>

            {/* Desktop Nav */}
            <nav className="hidden md:flex items-center gap-1">
              {NAV_LINKS.map((link) => (
                <Link
                  key={link.href}
                  href={link.href}
                  className={cn(
                    'px-3 py-1.5 text-sm font-medium rounded-md transition-colors',
                    pathname.startsWith(link.href)
                      ? 'bg-brand-50 text-brand-600'
                      : 'text-surface-600 hover:text-surface-900 hover:bg-surface-50'
                  )}
                >
                  {link.label}
                </Link>
              ))}
            </nav>

            {/* Right side */}
            <div className="flex items-center gap-2">
              <GlobalSearch />

              {user ? (
                <div className="relative">
                  <button
                    onClick={() => setUserMenuOpen(!userMenuOpen)}
                    className="flex items-center gap-2 hover:bg-surface-50 rounded-lg px-2 py-1.5 transition-colors"
                  >
                    {user.avatar ? (
                      <Image src={user.avatar} alt={user.name} width={28} height={28} className="rounded-full" />
                    ) : (
                      <div className="w-7 h-7 bg-brand-100 rounded-full flex items-center justify-center text-brand-600 font-semibold text-xs">
                        {user.name[0].toUpperCase()}
                      </div>
                    )}
                    <span className="hidden sm:block text-sm font-medium text-surface-700 max-w-24 truncate">
                      {user.name.split(' ')[0]}
                    </span>
                    {user.plan === 'premium' && (
                      <Crown size={12} className="text-warning-500" />
                    )}
                    {user.plan === 'super' && (
                      <Crown size={12} className="text-violet-500" />
                    )}
                    <ChevronDown size={14} className="text-surface-400" />
                  </button>

                  {userMenuOpen && (
                    <>
                      <div className="fixed inset-0 z-10" onClick={() => setUserMenuOpen(false)} />
                      <div className="absolute right-0 top-full mt-1 w-48 bg-white rounded-xl border border-surface-200 shadow-overlay z-20 py-1">
                        <div className="px-3 py-2 border-b border-surface-100">
                          <p className="text-sm font-semibold text-surface-800 truncate">{user.name}</p>
                          <p className="text-xs text-surface-500 truncate">{user.email}</p>
                        </div>
                        <Link href="/dashboard" className="flex items-center gap-2 px-3 py-2 text-sm text-surface-700 hover:bg-surface-50" onClick={() => setUserMenuOpen(false)}>
                          <LayoutDashboard size={14} /> Dashboard
                        </Link>
                        <Link href="/attempts" className="flex items-center gap-2 px-3 py-2 text-sm text-surface-700 hover:bg-surface-50" onClick={() => setUserMenuOpen(false)}>
                          <BookOpen size={14} /> My Attempts
                        </Link>
                        <Link href="/bookmarks" className="flex items-center gap-2 px-3 py-2 text-sm text-surface-700 hover:bg-surface-50" onClick={() => setUserMenuOpen(false)}>
                          <BookOpen size={14} /> Bookmarks
                        </Link>
                        <Link href="/profile" className="flex items-center gap-2 px-3 py-2 text-sm text-surface-700 hover:bg-surface-50" onClick={() => setUserMenuOpen(false)}>
                          <User size={14} /> My Profile
                        </Link>
                        {user.role === 'admin' && (
                          <Link href="/admin" className="flex items-center gap-2 px-3 py-2 text-sm text-surface-700 hover:bg-surface-50" onClick={() => setUserMenuOpen(false)}>
                            <LayoutDashboard size={14} /> Admin Panel
                          </Link>
                        )}
                        <button
                          onClick={() => { signOut(); setUserMenuOpen(false); }}
                          className="w-full flex items-center gap-2 px-3 py-2 text-sm text-danger-600 hover:bg-danger-50"
                        >
                          <LogOut size={14} /> Sign Out
                        </button>
                      </div>
                    </>
                  )}
                </div>
              ) : (
                <button onClick={() => setLoginOpen(true)} className="btn-primary text-sm py-1.5 px-4">
                  Login
                </button>
              )}

              <button
                className="md:hidden p-1.5 text-surface-600 hover:bg-surface-100 rounded-lg"
                onClick={() => setMobileOpen(!mobileOpen)}
              >
                {mobileOpen ? <X size={20} /> : <Menu size={20} />}
              </button>
            </div>
          </div>
        </div>

        {/* Mobile menu */}
        {mobileOpen && (
          <div className="md:hidden border-t border-surface-100 bg-white px-4 py-3 flex flex-col gap-1">
            {NAV_LINKS.map((link) => (
              <Link
                key={link.href}
                href={link.href}
                className="px-3 py-2 text-sm font-medium text-surface-700 hover:bg-surface-50 rounded-lg"
                onClick={() => setMobileOpen(false)}
              >
                {link.label}
              </Link>
            ))}
          </div>
        )}
      </header>

      <LoginModal open={loginOpen} onClose={() => setLoginOpen(false)} />
    </>
  );
}
