import type { Metadata } from 'next';
import { Header } from '@/components/layout/Header';
import { Footer } from '@/components/layout/Footer';
import { BookOpen, Users, Trophy, Zap, Target, Shield } from 'lucide-react';

export const metadata: Metadata = {
  title: 'About ExamKaro',
  description: 'ExamKaro is India\'s fastest growing exam preparation platform',
};

export default function AboutPage() {
  const values = [
    { icon: Target, title: 'Mission-Driven', desc: 'We exist to help every Indian student crack their dream government job exam.' },
    { icon: Zap, title: 'Quality First', desc: 'Our questions are curated by experts with 10+ years of experience in competitive exams.' },
    { icon: Shield, title: 'Trusted Platform', desc: 'Used by 2 lakh+ students. Your data is safe, private, and never sold.' },
  ];

  const stats = [
    { value: '2L+', label: 'Active Students' },
    { value: '5,000+', label: 'Mock Tests' },
    { value: '50,000+', label: 'Questions' },
    { value: '94%', label: 'Success Rate' },
  ];

  return (
    <>
      <Header />
      <main>
        {/* Hero */}
        <section className="bg-gradient-to-br from-brand-700 to-brand-500 text-white py-16 px-4 text-center">
          <div className="max-w-3xl mx-auto">
            <div className="w-16 h-16 bg-white/10 rounded-2xl flex items-center justify-center mx-auto mb-4">
              <BookOpen size={28} className="text-white" />
            </div>
            <h1 className="font-display text-4xl font-bold mb-3">About ExamKaro</h1>
            <p className="text-blue-100 text-lg max-w-xl mx-auto">
              We're on a mission to make quality exam preparation accessible to every student in India — regardless of location or budget.
            </p>
          </div>
        </section>

        {/* Stats */}
        <section className="bg-white border-b border-surface-200 py-10 px-4">
          <div className="max-w-4xl mx-auto grid grid-cols-2 sm:grid-cols-4 gap-6 text-center">
            {stats.map(({ value, label }) => (
              <div key={label}>
                <div className="text-3xl font-display font-bold text-brand-600">{value}</div>
                <div className="text-sm text-surface-500 mt-1">{label}</div>
              </div>
            ))}
          </div>
        </section>

        {/* Story */}
        <section className="max-w-3xl mx-auto px-4 py-12">
          <h2 className="text-2xl font-display font-bold text-surface-900 mb-4">Our Story</h2>
          <div className="prose prose-sm max-w-none text-surface-600 leading-relaxed space-y-4">
            <p>ExamKaro was founded by a group of IIT and IIM graduates who understood firsthand the struggles of government exam preparation — expensive coaching, outdated material, and lack of quality practice tests.</p>
            <p>We built ExamKaro to democratize exam preparation. Every feature, every question, every analysis tool is designed with one goal in mind: helping you score higher on your next attempt.</p>
            <p>Today, we serve students across all 28 states and 8 union territories of India, covering SSC, Banking, Railway, UPSC, State PCS, Defence, Teaching, and Police exams.</p>
          </div>
        </section>

        {/* Values */}
        <section className="bg-surface-50 py-12 px-4">
          <div className="max-w-4xl mx-auto">
            <h2 className="text-2xl font-display font-bold text-surface-900 mb-7 text-center">Our Values</h2>
            <div className="grid sm:grid-cols-3 gap-6">
              {values.map(({ icon: Icon, title, desc }) => (
                <div key={title} className="card p-5 text-center">
                  <div className="w-12 h-12 bg-brand-50 rounded-2xl flex items-center justify-center mx-auto mb-3">
                    <Icon size={22} className="text-brand-500" />
                  </div>
                  <h3 className="font-bold text-surface-900 mb-2">{title}</h3>
                  <p className="text-sm text-surface-600">{desc}</p>
                </div>
              ))}
            </div>
          </div>
        </section>
      </main>
      <Footer />
    </>
  );
}
