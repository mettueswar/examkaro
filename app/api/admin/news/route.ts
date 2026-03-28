import { NextRequest } from 'next/server';
import { query, queryOne, execute } from '@/lib/db';
import { verifyRequest, unauthorizedResponse, forbiddenResponse } from '@/lib/auth/jwt';
import { newsSchema } from '@/lib/validations';
import { successResponse, errorResponse, generateSlug } from '@/lib/security';
import type { NewsArticle } from '@/types';

export async function GET(req: NextRequest) {
  const auth = await verifyRequest(req);
  if (!auth) return unauthorizedResponse();
  if (auth.role !== 'admin' && auth.role !== 'moderator') return forbiddenResponse();

  try {
    const articles = await query<NewsArticle>(
      `SELECT n.*, u.name as author_name FROM news_articles n
       LEFT JOIN users u ON n.author_id = u.id
       ORDER BY n.created_at DESC LIMIT 50`
    );
    return successResponse(articles);
  } catch (err) {
    return errorResponse('Failed to fetch articles');
  }
}

export async function PUT(req: NextRequest) {
  const auth = await verifyRequest(req);
  if (!auth) return unauthorizedResponse();
  if (auth.role !== 'admin' && auth.role !== 'moderator') return forbiddenResponse();

  try {
    const id = req.nextUrl.searchParams.get('id');
    if (!id) return errorResponse('ID required');

    const body = await req.json();
    const data = newsSchema.partial().parse(body);

    await execute(
      `UPDATE news_articles SET
         title = COALESCE(?, title),
         content = COALESCE(?, content),
         excerpt = COALESCE(?, excerpt),
         published = COALESCE(?, published),
         published_at = CASE WHEN ? = 1 AND published_at IS NULL THEN NOW() ELSE published_at END,
         updated_at = NOW()
       WHERE id = ?`,
      [data.title, data.content, data.excerpt ?? null, data.published, data.published ? 1 : null, id]
    );

    return successResponse(await queryOne<NewsArticle>('SELECT * FROM news_articles WHERE id = ?', [id]));
  } catch (err) {
    return errorResponse('Failed to update article');
  }
}

export async function DELETE(req: NextRequest) {
  const auth = await verifyRequest(req);
  if (!auth) return unauthorizedResponse();
  if (auth.role !== 'admin') return forbiddenResponse();

  const id = req.nextUrl.searchParams.get('id');
  if (!id) return errorResponse('ID required');
  await execute('DELETE FROM news_articles WHERE id = ?', [id]);
  return successResponse({ deleted: true });
}
