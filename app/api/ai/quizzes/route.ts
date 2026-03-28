import { NextRequest } from 'next/server';
import { query, queryOne, execute, transaction } from '@/lib/db';
import { verifyRequest, unauthorizedResponse } from '@/lib/auth/jwt';
import { checkSuperAccess, superRequiredResponse, creditLimitResponse, logAIUsage } from '@/lib/ai/guard';
import { successResponse, errorResponse, paginatedResponse } from '@/lib/security';
import { generateQuiz } from '@/lib/ai/gemini';
import { z } from 'zod';

const generateSchema = z.object({
  materialId: z.number().int().positive().optional(),
  customText: z.string().min(100).max(50000).optional(),
  title: z.string().min(2).max(500),
  count: z.number().int().min(5).max(40).default(15),
  difficulty: z.enum(['easy', 'medium', 'hard', 'mixed']).default('mixed'),
  language: z.enum(['english', 'hindi', 'both']).default('english'),
  timeLimit: z.number().int().min(0).default(0),
});

export async function GET(req: NextRequest) {
  const auth = await verifyRequest(req);
  if (!auth) return unauthorizedResponse();

  const { searchParams } = req.nextUrl;
  const page = parseInt(searchParams.get('page') || '1');
  const quizId = searchParams.get('quizId');

  if (quizId) {
    const quiz = await queryOne('SELECT * FROM ai_quizzes WHERE id = ? AND user_id = ?', [quizId, auth.userId]);
    if (!quiz) return errorResponse('Quiz not found', 404);
    const questions = await query(
      'SELECT * FROM ai_quiz_questions WHERE quiz_id = ? ORDER BY order_index',
      [quizId]
    );
    return successResponse({ quiz, questions });
  }

  const limit = 20;
  const offset = (page - 1) * limit;
  const [{ total }] = await query<{ total: number }>(
    'SELECT COUNT(*) as total FROM ai_quizzes WHERE user_id = ?', [auth.userId]
  );
  const quizzes = await query(
    'SELECT * FROM ai_quizzes WHERE user_id = ? ORDER BY created_at DESC LIMIT ? OFFSET ?',
    [auth.userId, limit, offset]
  );
  return paginatedResponse(quizzes, total, page, limit);
}

export async function POST(req: NextRequest) {
  const auth = await verifyRequest(req);
  if (!auth) return unauthorizedResponse();

  const access = await checkSuperAccess(req);
  if (!access) return superRequiredResponse();
  if (!access.canUseAI) return creditLimitResponse(access.creditsUsed, access.creditsLimit);

  try {
    const body = await req.json();
    const { materialId, customText, title, count, difficulty, language, timeLimit } = generateSchema.parse(body);

    let content = customText || '';
    if (materialId) {
      const material = await queryOne<{ content: string; userId: number }>(
        "SELECT content, user_id FROM study_materials WHERE id = ? AND status = 'ready'",
        [materialId]
      );
      if (!material) return errorResponse('Material not found', 404);
      if (material.userId !== auth.userId) return errorResponse('Unauthorized', 403);
      content = material.content;
    }

    if (!content || content.length < 100) return errorResponse('Need at least 100 characters of content');

    const questions = await generateQuiz(content, count, difficulty, language, title);
    if (!questions?.length) return errorResponse('AI failed to generate quiz questions.');

    let quizId!: number;
    await transaction(async (conn) => {
      const [qResult] = await conn.execute(
        `INSERT INTO ai_quizzes (user_id, material_id, title, difficulty, question_count, time_limit)
         VALUES (?, ?, ?, ?, ?, ?)`,
        [auth.userId, materialId || null, title, difficulty, questions.length, timeLimit]
      );
      quizId = (qResult as { insertId: number }).insertId;

      for (let i = 0; i < questions.length; i++) {
        const q = questions[i];
        await conn.execute(
          `INSERT INTO ai_quiz_questions (quiz_id, question, question_hindi, options, explanation, explanation_hindi, difficulty, order_index)
           VALUES (?, ?, ?, ?, ?, ?, ?, ?)`,
          [quizId, q.question, q.questionHindi || null, JSON.stringify(q.options),
           q.explanation, q.explanationHindi || null, q.difficulty, i]
        );
      }
    });

    await logAIUsage(auth.userId, 'quiz_gen', materialId);

    return successResponse({ quizId, title, questionCount: questions.length, difficulty }, 'Quiz created!', 201);
  } catch (err: unknown) {
    console.error('Quiz generation error:', err);
    return errorResponse(err instanceof Error ? err.message : 'Generation failed');
  }
}

export async function DELETE(req: NextRequest) {
  const auth = await verifyRequest(req);
  if (!auth) return unauthorizedResponse();
  const id = req.nextUrl.searchParams.get('id');
  if (!id) return errorResponse('id required');
  const quiz = await queryOne<{ userId: number }>('SELECT user_id FROM ai_quizzes WHERE id = ?', [id]);
  if (!quiz || quiz.userId !== auth.userId) return errorResponse('Not found', 404);
  await execute('DELETE FROM ai_quizzes WHERE id = ?', [id]);
  return successResponse({ deleted: true });
}
