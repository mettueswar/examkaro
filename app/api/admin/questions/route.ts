import { NextRequest } from 'next/server';
import { query, queryOne, execute } from '@/lib/db';
import { verifyRequest, unauthorizedResponse, forbiddenResponse } from '@/lib/auth/jwt';
import { questionSchema } from '@/lib/validations';
import { successResponse, errorResponse, paginatedResponse } from '@/lib/security';
import type { Question } from '@/types';

export async function GET(req: NextRequest) {
  const auth = await verifyRequest(req);
  if (!auth) return unauthorizedResponse();
  if (auth.role !== 'admin' && auth.role !== 'moderator') return forbiddenResponse();

  try {
    const { searchParams } = req.nextUrl;
    const testId = searchParams.get('testId');
    const page = parseInt(searchParams.get('page') || '1');
    const limit = parseInt(searchParams.get('limit') || '50');
    const offset = (page - 1) * limit;

    if (!testId) return errorResponse('testId required');

    const [{ total }] = await query<{ total: number }>(
      'SELECT COUNT(*) as total FROM questions WHERE test_id = ?',
      [testId]
    );
    const questions = await query<Question>(
      'SELECT * FROM questions WHERE test_id = ? ORDER BY order_index LIMIT ? OFFSET ?',
      [testId, limit, offset]
    );

    return paginatedResponse(questions, total, page, limit);
  } catch (err) {
    return errorResponse('Failed to fetch questions');
  }
}

export async function POST(req: NextRequest) {
  const auth = await verifyRequest(req);
  if (!auth) return unauthorizedResponse();
  if (auth.role !== 'admin' && auth.role !== 'moderator') return forbiddenResponse();

  try {
    const body = await req.json();
    const data = questionSchema.parse(body);

    const result = await execute(
      `INSERT INTO questions (test_id, section_id, text, text_hindi, type, options,
        explanation, explanation_hindi, image, marks, negative_marks, difficulty, tags, order_index)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
      [
        data.testId, data.sectionId || null, data.text, data.textHindi || null,
        data.type, JSON.stringify(data.options), data.explanation || null,
        data.explanationHindi || null, data.image || null,
        data.marks, data.negativeMarks, data.difficulty,
        data.tags ? JSON.stringify(data.tags) : null, data.orderIndex,
      ]
    );

    // Update test question count
    await execute(
      'UPDATE mock_tests SET total_questions = (SELECT COUNT(*) FROM questions WHERE test_id = ? AND is_active = 1) WHERE id = ?',
      [data.testId, data.testId]
    );

    const question = await queryOne<Question>('SELECT * FROM questions WHERE id = ?', [result.insertId]);
    return successResponse(question, 'Question created', 201);
  } catch (err) {
    console.error('Admin POST question:', err);
    return errorResponse('Failed to create question');
  }
}

export async function PUT(req: NextRequest) {
  const auth = await verifyRequest(req);
  if (!auth) return unauthorizedResponse();
  if (auth.role !== 'admin' && auth.role !== 'moderator') return forbiddenResponse();

  try {
    const body = await req.json();
    const { id, ...rest } = body;
    if (!id) return errorResponse('Question ID required');
    const data = questionSchema.partial().parse(rest);

    await execute(
      `UPDATE questions SET
        text = COALESCE(?, text),
        text_hindi = COALESCE(?, text_hindi),
        options = COALESCE(?, options),
        explanation = COALESCE(?, explanation),
        explanation_hindi = COALESCE(?, explanation_hindi),
        marks = COALESCE(?, marks),
        negative_marks = COALESCE(?, negative_marks),
        difficulty = COALESCE(?, difficulty)
       WHERE id = ?`,
      [
        data.text, data.textHindi,
        data.options ? JSON.stringify(data.options) : null,
        data.explanation, data.explanationHindi,
        data.marks, data.negativeMarks, data.difficulty, id,
      ]
    );

    const question = await queryOne<Question>('SELECT * FROM questions WHERE id = ?', [id]);
    return successResponse(question);
  } catch (err) {
    return errorResponse('Failed to update question');
  }
}

export async function DELETE(req: NextRequest) {
  const auth = await verifyRequest(req);
  if (!auth) return unauthorizedResponse();
  if (auth.role !== 'admin') return forbiddenResponse();

  try {
    const { searchParams } = req.nextUrl;
    const id = searchParams.get('id');
    if (!id) return errorResponse('Question ID required');

    const q = await queryOne<Question>('SELECT test_id FROM questions WHERE id = ?', [id]);
    await execute('UPDATE questions SET is_active = 0 WHERE id = ?', [id]);

    if (q) {
      await execute(
        'UPDATE mock_tests SET total_questions = (SELECT COUNT(*) FROM questions WHERE test_id = ? AND is_active = 1) WHERE id = ?',
        [q.testId, q.testId]
      );
    }

    return successResponse({ deleted: true });
  } catch (err) {
    return errorResponse('Failed to delete question');
  }
}
