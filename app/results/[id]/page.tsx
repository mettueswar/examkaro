import { notFound } from 'next/navigation';
import Link from 'next/link';
import { queryOne, query } from '@/lib/db';
import { getAuthPayload } from '@/lib/auth/jwt';
import { Header } from '@/components/layout/Header';
import { Footer } from '@/components/layout/Footer';
import { ResultsClient } from '@/components/test/ResultsClient';
import type { TestAttempt, MockTest, Question } from '@/types';

interface Props {
  params: Promise<{ id: string }>;
}

export default async function ResultsPage({ params }: Props) {
  const { id } = await params;
  const auth = await getAuthPayload();
  if (!auth) notFound();

  const attempt = await queryOne<TestAttempt & { answers: string }>(
    "SELECT * FROM test_attempts WHERE id = ? AND user_id = ? AND status = 'submitted'",
    [id, auth.userId]
  ).catch(() => null);
  if (!attempt) notFound();

  const test = await queryOne<MockTest & { category_name: string }>(
    `SELECT t.*, c.name as category_name FROM mock_tests t
     LEFT JOIN categories c ON t.category_id = c.id WHERE t.id = ?`,
    [attempt.testId]
  ).catch(() => null);
  if (!test) notFound();

  const questions = await query<Question>(
    'SELECT * FROM questions WHERE test_id = ? AND is_active = 1 ORDER BY order_index',
    [attempt.testId]
  ).catch(() => []);

  const answers = typeof attempt.answers === 'string'
    ? JSON.parse(attempt.answers)
    : attempt.answers;

  return (
    <>
      <Header />
      <main className="max-w-5xl mx-auto px-4 py-8">
        <ResultsClient attempt={{ ...attempt, answers }} test={test} questions={questions} />
      </main>
      <Footer />
    </>
  );
}
