import { NextRequest } from 'next/server';
import { execute, queryOne } from '@/lib/db';
import { verifyRequest, unauthorizedResponse } from '@/lib/auth/jwt';
import { saveAnswerSchema } from '@/lib/validations';
import { successResponse, errorResponse } from '@/lib/security';
import type { TestAttempt, QuestionAttempt } from '@/types';

export async function PATCH(req: NextRequest) {
  const auth = await verifyRequest(req);
  if (!auth) return unauthorizedResponse();

  try {
    const body = await req.json();
    const { attemptId, questionId, selectedOption, markedForReview, timeSpent } =
      saveAnswerSchema.parse(body);

    const attempt = await queryOne<TestAttempt & { answers: string }>(
      `SELECT * FROM test_attempts WHERE id = ? AND user_id = ? AND status = 'in_progress'`,
      [attemptId, auth.userId]
    );
    if (!attempt) return errorResponse('Attempt not found or already submitted', 404);

    const answers: Record<number, QuestionAttempt> =
      typeof attempt.answers === 'string' ? JSON.parse(attempt.answers) : attempt.answers;

    let status: QuestionAttempt['status'] = 'not_answered';
    if (selectedOption) {
      status = markedForReview ? 'answered_marked' : 'answered';
    } else if (markedForReview) {
      status = 'marked';
    }

    answers[questionId] = {
      questionId,
      selectedOption,
      status,
      timeSpent,
      markedForReview,
    };

    await execute(
      'UPDATE test_attempts SET answers = ? WHERE id = ?',
      [JSON.stringify(answers), attemptId]
    );

    return successResponse({ saved: true, status });
  } catch (err) {
    console.error('Save answer error:', err);
    return errorResponse('Failed to save answer');
  }
}
