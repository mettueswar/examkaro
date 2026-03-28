import type { Metadata } from 'next';
import { Header } from '@/components/layout/Header';
import { Footer } from '@/components/layout/Footer';

export const metadata: Metadata = { title: 'Privacy Policy – ExamKaro' };

export default function PrivacyPage() {
  const sections = [
    { title: 'Information We Collect', content: 'We collect information you provide directly to us, such as when you create an account (name, email address, profile picture from Google), attempt tests, or contact us for support. We also collect usage data such as which tests you attempt, scores, and time spent.' },
    { title: 'How We Use Your Information', content: 'We use the information we collect to provide, maintain, and improve our services; personalize your experience and recommend tests; process payments through Razorpay (we do not store card details); send you updates about your preparation progress; and respond to your queries.' },
    { title: 'Data Storage & Security', content: 'Your data is stored on secure servers in India. We use industry-standard encryption (TLS/SSL) for all data transmission. Authentication is handled via Firebase (Google Cloud), and we use JWT tokens stored in HTTP-only cookies for session management.' },
    { title: 'Third-Party Services', content: 'We use Firebase (Google) for authentication and file storage, Razorpay for payment processing, and Vercel/cloud hosting for our infrastructure. These services have their own privacy policies and we recommend reviewing them.' },
    { title: 'Data Sharing', content: 'We do not sell, rent, or share your personal information with third parties for their marketing purposes. We may share aggregated, anonymized data for analytics. Data may be disclosed if required by law.' },
    { title: 'Your Rights', content: 'You may request access to, correction of, or deletion of your personal data by contacting support@examkaro.com. You can delete your account at any time from your profile settings. We will respond to such requests within 30 days.' },
    { title: 'Cookies', content: 'We use HTTP-only cookies for secure session management. We do not use third-party tracking cookies or advertising cookies.' },
    { title: 'Updates to This Policy', content: 'We may update this Privacy Policy from time to time. We will notify you of any significant changes via email or a prominent notice on our website.' },
  ];

  return (
    <>
      <Header />
      <main className="max-w-3xl mx-auto px-4 py-10">
        <h1 className="text-3xl font-display font-bold text-surface-900 mb-2">Privacy Policy</h1>
        <p className="text-surface-500 text-sm mb-8">Last updated: January 1, 2025</p>
        <div className="space-y-7">
          {sections.map(({ title, content }) => (
            <section key={title}>
              <h2 className="text-lg font-display font-bold text-surface-900 mb-2">{title}</h2>
              <p className="text-surface-600 text-sm leading-relaxed">{content}</p>
            </section>
          ))}
        </div>
        <div className="mt-10 p-4 bg-surface-50 rounded-xl border border-surface-200">
          <p className="text-sm text-surface-600">
            Questions about this policy? Contact us at{' '}
            <a href="mailto:privacy@examkaro.com" className="text-brand-500 hover:underline">privacy@examkaro.com</a>
          </p>
        </div>
      </main>
      <Footer />
    </>
  );
}
