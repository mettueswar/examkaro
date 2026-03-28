import { redirect } from 'next/navigation';
import type { Metadata } from 'next';
import { getAuthPayload } from '@/lib/auth/jwt';
import { queryOne } from '@/lib/db';
import { Header } from '@/components/layout/Header';
import { Footer } from '@/components/layout/Footer';
import { AIHubClient } from '@/components/ai/AIHubClient';

export const metadata: Metadata = {
  title: 'AI Study Hub – ExamKaro',
  description: 'Generate flashcards and quizzes from your study materials using AI',
};

export default async function AIHubPage() {
  const auth = await getAuthPayload();
  if (!auth) redirect('/login?redirect=/ai');

  const subscription = await queryOne(
    `SELECT us.*, sp.name as plan_name, sp.billing, sp.ai_credits_per_month
     FROM user_subscriptions us
     JOIN subscription_plans sp ON us.plan_id = sp.id
     WHERE us.user_id = ? AND us.status = 'active' AND us.valid_until > NOW()
     ORDER BY us.valid_until DESC LIMIT 1`,
    [auth.userId]
  ).catch(() => null);

  const isSuper = !!subscription || auth.role === 'admin';

  return (
    <>
      <Header />
      <main className="max-w-6xl mx-auto px-4 py-8">
        <AIHubClient isSuper={isSuper} subscription={subscription as Record<string, unknown> | null} />
      </main>
      <Footer />
    </>
  );
}
