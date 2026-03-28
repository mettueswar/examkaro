import Link from 'next/link';
import { BookOpen } from 'lucide-react';

export function Footer() {
  return (
    <footer className="bg-surface-900 text-surface-300 py-12 px-4 mt-0">
      <div className="max-w-6xl mx-auto">
        <div className="grid sm:grid-cols-2 lg:grid-cols-4 gap-8 mb-8">
          <div>
            <div className="flex items-center gap-2 text-white font-display font-bold text-lg mb-3">
              <div className="w-7 h-7 bg-brand-500 rounded-lg flex items-center justify-center">
                <BookOpen size={14} className="text-white" />
              </div>
              ExamKaro
            </div>
            <p className="text-sm text-surface-400 leading-relaxed">
              India's most comprehensive exam preparation platform. Practice smarter, score higher.
            </p>
          </div>
          <div>
            <h4 className="text-white font-semibold text-sm mb-3">Exams</h4>
            <ul className="space-y-2 text-sm">
              {['SSC', 'Banking', 'Railway', 'UPSC', 'State PCS'].map(e => (
                <li key={e}><Link href={`/tests?category=${e.toLowerCase()}`} className="hover:text-white transition-colors">{e}</Link></li>
              ))}
            </ul>
          </div>
          <div>
            <h4 className="text-white font-semibold text-sm mb-3">Resources</h4>
            <ul className="space-y-2 text-sm">
              <li><Link href="/news" className="hover:text-white transition-colors">Current Affairs</Link></li>
              <li><Link href="/packages" className="hover:text-white transition-colors">Packages</Link></li>
              <li><Link href="/dashboard" className="hover:text-white transition-colors">Dashboard</Link></li>
            </ul>
          </div>
          <div>
            <h4 className="text-white font-semibold text-sm mb-3">Company</h4>
            <ul className="space-y-2 text-sm">
              <li><Link href="/about" className="hover:text-white transition-colors">About</Link></li>
              <li><Link href="/contact" className="hover:text-white transition-colors">Contact</Link></li>
              <li><Link href="/privacy" className="hover:text-white transition-colors">Privacy Policy</Link></li>
              <li><Link href="/terms" className="hover:text-white transition-colors">Terms of Service</Link></li>
            </ul>
          </div>
        </div>
        <div className="pt-6 border-t border-surface-700 flex flex-col sm:flex-row items-center justify-between gap-2">
          <p className="text-xs text-surface-500">© 2025 ExamKaro. All rights reserved.</p>
          <p className="text-xs text-surface-500">Made with ❤️ for Indian students</p>
        </div>
      </div>
    </footer>
  );
}
