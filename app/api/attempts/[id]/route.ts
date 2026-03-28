import { NextRequest } from 'next/server';
import { queryOne, query } from '@/lib/db';
import { verifyRequest, unauthorizedResponse } from '@/lib/auth/jwt';
import { successResponse, errorResponse } from '@/lib/security';
import type { TestAttempt, MockTest, Question, TestSection } from '@/types';

export async function GET(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const auth = await verifyRequest(req);
  if (!auth) return unauthorizedResponse();

  try {
    const { id } = await params;
    const attempt = await queryOne<TestAttempt & { answers: string }>(
      'SELECT * FROM test_attempts WHERE id = ? AND user_id = ?',
      [id, auth.userId]
    );
    if (!attempt) return errorResponse('Attempt not found', 404);

    const test = await queryOne<MockTest>(
      'SELECT * FROM mock_tests WHERE id = ?',
      [attempt.testId]
    );

    const sections = await query<TestSection>(
      'SELECT * FROM test_sections WHERE test_id = ? ORDER BY order_index',
      [attempt.testId]
    );

    const questions = await query<Question>(
      `SELECT id, test_id, section_id, subject, text, text_hindi, type,
              options, image, marks, negative_marks, difficulty, order_index
       FROM questions WHERE test_id = ? AND is_active = 1 ORDER BY order_index`,
      [attempt.testId]
    );

    const isInProgress = attempt.status === 'in_progress';
    const processedQuestions = isInProgress
      ? questions.map((q: Question) => ({
          ...q,
          options: (q.options as Question['options']).map((o) => ({
            id: o.id, text: o.text, textHindi: o.textHindi, image: o.image,
          })),
        }))
      : questions;

    const answers = typeof attempt.answers === 'string'
      ? JSON.parse(attempt.answers)
      : attempt.answers;

    return successResponse({ attempt: { ...attempt, answers }, questions: processedQuestions, sections, test });
  } catch (err) {
    console.error('GET attempt error:', err);
    return errorResponse('Failed to fetch attempt');
  }
}
