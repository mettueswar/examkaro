import type { Metadata } from 'next';
import { Header } from '@/components/layout/Header';
import { Footer } from '@/components/layout/Footer';

export const metadata: Metadata = { title: 'Terms of Service – ExamKaro' };

export default function TermsPage() {
  const sections = [
    { title: '1. Acceptance of Terms', content: 'By accessing and using ExamKaro ("the Platform"), you agree to be bound by these Terms of Service. If you do not agree to these terms, please do not use our services.' },
    { title: '2. Account Registration', content: 'You must register for an account to access most features. You are responsible for maintaining the confidentiality of your account and for all activities that occur under your account. You must provide accurate and complete information during registration.' },
    { title: '3. Permitted Use', content: 'ExamKaro is for personal, non-commercial exam preparation use only. You may not reproduce, distribute, or resell any content from the platform. You may not use automated tools, bots, or scripts to access the platform.' },
    { title: '4. Premium Access & Payments', content: 'Some content requires a paid subscription. All payments are processed securely via Razorpay. Prices are in Indian Rupees (INR) inclusive of applicable taxes. Subscriptions are non-transferable.' },
    { title: '5. Refund Policy', content: 'We offer a 7-day money-back guarantee on all purchases if you are not satisfied. Refund requests must be submitted within 7 days of purchase to support@examkaro.com. Refunds are processed within 5-7 business days.' },
    { title: '6. Intellectual Property', content: 'All content on ExamKaro — including questions, explanations, designs, and code — is owned by ExamKaro or its licensors and is protected by Indian and international copyright laws. You may not copy or redistribute any content without prior written permission.' },
    { title: '7. Disclaimer', content: 'ExamKaro does not guarantee that practicing on our platform will result in success in any examination. Our content is for preparation purposes only. We strive for accuracy but cannot guarantee that all content is error-free.' },
    { title: '8. Limitation of Liability', content: 'To the maximum extent permitted by law, ExamKaro shall not be liable for any indirect, incidental, special, or consequential damages arising from use of the platform.' },
    { title: '9. Governing Law', content: 'These terms are governed by and construed in accordance with the laws of India. Any disputes shall be subject to the exclusive jurisdiction of courts in New Delhi, India.' },
    { title: '10. Changes to Terms', content: 'We reserve the right to modify these terms at any time. Continued use of the platform after changes constitutes acceptance of the new terms.' },
  ];

  return (
    <>
      <Header />
      <main className="max-w-3xl mx-auto px-4 py-10">
        <h1 className="text-3xl font-display font-bold text-surface-900 mb-2">Terms of Service</h1>
        <p className="text-surface-500 text-sm mb-8">Last updated: January 1, 2025</p>
        <div className="space-y-6">
          {sections.map(({ title, content }) => (
            <section key={title}>
              <h2 className="text-base font-bold text-surface-900 mb-1.5">{title}</h2>
              <p className="text-surface-600 text-sm leading-relaxed">{content}</p>
            </section>
          ))}
        </div>
      </main>
      <Footer />
    </>
  );
}
