import { NextRequest } from 'next/server';
import { query, execute, queryOne } from '@/lib/db';
import { verifyRequest, unauthorizedResponse } from '@/lib/auth/jwt';
import { successResponse, errorResponse } from '@/lib/security';
import { z } from 'zod';

const bookmarkSchema = z.object({
  questionId: z.number().int().positive(),
  note: z.string().max(500).optional(),
});

// GET /api/bookmarks - list user's bookmarks
export async function GET(req: NextRequest) {
  const auth = await verifyRequest(req);
  if (!auth) return unauthorizedResponse();

  try {
    const bookmarks = await query(
      `SELECT b.id, b.question_id, b.note, b.created_at,
              q.text as question_text, q.text_hindi,
              t.title as test_title, t.slug as test_slug
       FROM bookmarks b
       JOIN questions q ON b.question_id = q.id
       JOIN mock_tests t ON q.test_id = t.id
       WHERE b.user_id = ?
       ORDER BY b.created_at DESC`,
      [auth.userId]
    );
    return successResponse(bookmarks);
  } catch (err) {
    return errorResponse('Failed to fetch bookmarks');
  }
}

// POST /api/bookmarks - add bookmark
export async function POST(req: NextRequest) {
  const auth = await verifyRequest(req);
  if (!auth) return unauthorizedResponse();

  try {
    const body = await req.json();
    const { questionId, note } = bookmarkSchema.parse(body);

    // Upsert: if already bookmarked, update note; otherwise insert
    const existing = await queryOne(
      'SELECT id FROM bookmarks WHERE user_id = ? AND question_id = ?',
      [auth.userId, questionId]
    );

    if (existing) {
      await execute(
        'UPDATE bookmarks SET note = ? WHERE user_id = ? AND question_id = ?',
        [note || null, auth.userId, questionId]
      );
      return successResponse({ bookmarked: true, updated: true });
    }

    await execute(
      'INSERT INTO bookmarks (user_id, question_id, note) VALUES (?, ?, ?)',
      [auth.userId, questionId, note || null]
    );
    return successResponse({ bookmarked: true }, 'Bookmarked', 201);
  } catch (err) {
    return errorResponse('Failed to bookmark question');
  }
}

// DELETE /api/bookmarks?questionId=X - remove bookmark
export async function DELETE(req: NextRequest) {
  const auth = await verifyRequest(req);
  if (!auth) return unauthorizedResponse();

  const questionId = req.nextUrl.searchParams.get('questionId');
  if (!questionId) return errorResponse('questionId required');

  await execute(
    'DELETE FROM bookmarks WHERE user_id = ? AND question_id = ?',
    [auth.userId, parseInt(questionId)]
  );
  return successResponse({ bookmarked: false });
}
