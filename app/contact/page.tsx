import type { Metadata } from 'next';
import { Header } from '@/components/layout/Header';
import { Footer } from '@/components/layout/Footer';
import { Mail, MessageSquare, Clock, MapPin } from 'lucide-react';

export const metadata: Metadata = {
  title: 'Contact Us – ExamKaro',
  description: 'Get in touch with the ExamKaro team',
};

export default function ContactPage() {
  return (
    <>
      <Header />
      <main className="max-w-4xl mx-auto px-4 py-12">
        <div className="text-center mb-10">
          <h1 className="text-3xl font-display font-bold text-surface-900 mb-2">Contact Us</h1>
          <p className="text-surface-500">We'd love to hear from you. Our team is always here to help.</p>
        </div>

        <div className="grid sm:grid-cols-2 gap-6">
          {/* Contact Info */}
          <div className="space-y-4">
            {[
              { icon: Mail, title: 'Email Support', desc: 'support@examkaro.com', sub: 'Avg response: 2-4 hours' },
              { icon: MessageSquare, title: 'WhatsApp', desc: '+91 98765 43210', sub: 'Mon–Sat, 9AM–6PM IST' },
              { icon: Clock, title: 'Support Hours', desc: 'Mon – Sat: 9AM to 8PM', sub: 'Sun: 10AM to 4PM IST' },
              { icon: MapPin, title: 'Office', desc: 'New Delhi, India', sub: 'Registered company' },
            ].map(({ icon: Icon, title, desc, sub }) => (
              <div key={title} className="card p-4 flex items-start gap-4">
                <div className="w-10 h-10 bg-brand-50 rounded-xl flex items-center justify-center shrink-0">
                  <Icon size={18} className="text-brand-500" />
                </div>
                <div>
                  <p className="font-semibold text-surface-800 text-sm">{title}</p>
                  <p className="text-surface-700 text-sm">{desc}</p>
                  <p className="text-surface-400 text-xs mt-0.5">{sub}</p>
                </div>
              </div>
            ))}
          </div>

          {/* Contact Form */}
          <div className="card p-5">
            <h2 className="font-bold text-surface-900 mb-4">Send a Message</h2>
            <form className="space-y-4" onSubmit={(e) => e.preventDefault()}>
              <div>
                <label className="block text-xs font-semibold text-surface-700 mb-1">Your Name</label>
                <input type="text" className="input-base text-sm" placeholder="Rahul Sharma" />
              </div>
              <div>
                <label className="block text-xs font-semibold text-surface-700 mb-1">Email Address</label>
                <input type="email" className="input-base text-sm" placeholder="rahul@example.com" />
              </div>
              <div>
                <label className="block text-xs font-semibold text-surface-700 mb-1">Subject</label>
                <select className="input-base text-sm">
                  <option>Technical Support</option>
                  <option>Payment Issue</option>
                  <option>Content Feedback</option>
                  <option>Partnership</option>
                  <option>Other</option>
                </select>
              </div>
              <div>
                <label className="block text-xs font-semibold text-surface-700 mb-1">Message</label>
                <textarea rows={4} className="input-base text-sm resize-none" placeholder="Describe your issue or query..." />
              </div>
              <button type="submit" className="btn-primary w-full">Send Message</button>
            </form>
          </div>
        </div>
      </main>
      <Footer />
    </>
  );
}
