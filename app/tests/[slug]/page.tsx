import type { Metadata } from 'next';
import { notFound } from 'next/navigation';
import { queryOne, query } from '@/lib/db';
import { Header } from '@/components/layout/Header';
import { TestStartClient } from '@/components/test/TestStartClient';
import type { MockTest, TestSection } from '@/types';
import { getAuthPayload } from '@/lib/auth/jwt';
import {
  hasFullPremiumPlan,
  userCanAccessPremiumTestViaPackage,
} from '@/lib/package-test-access';

interface Props {
  params: Promise<{ slug: string }>;
}

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const { slug } = await params;
  const test = await queryOne<MockTest>(
    'SELECT title, description FROM mock_tests WHERE slug = ?',
    [slug]
  ).catch(() => null);

  return {
    title: test?.title || 'Mock Test',
    description: test?.description || 'Practice mock test on ExamKaro',
  };
}

export default async function TestDetailPage({ params }: Props) {
  const { slug } = await params;

  const test = await queryOne<MockTest & { category_name: string; category_slug: string }>(
    `SELECT t.*, c.name as category_name, c.slug as category_slug
     FROM mock_tests t LEFT JOIN categories c ON t.category_id = c.id
     WHERE t.slug = ? AND t.is_active = 1`,
    [slug]
  ).catch(() => null);

  if (!test) notFound();

  const sections = await query<TestSection>(
    'SELECT * FROM test_sections WHERE test_id = ? ORDER BY order_index',
    [test.id]
  ).catch(() => []);

  const auth = await getAuthPayload();
  let unlockedViaPackage = false;
  if (
    test.type === 'premium' &&
    auth &&
    !hasFullPremiumPlan(auth.plan)
  ) {
    unlockedViaPackage = await userCanAccessPremiumTestViaPackage(auth.userId, test.id);
  }

  return (
    <>
      <Header />
      <main className="max-w-4xl mx-auto px-4 py-8">
        <TestStartClient
          test={test}
          sections={sections}
          unlockedViaPackage={unlockedViaPackage}
        />
      </main>
    </>
  );
}
