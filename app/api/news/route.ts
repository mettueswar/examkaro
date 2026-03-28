import { NextRequest } from 'next/server';
import { query, queryOne, execute } from '@/lib/db';
import { verifyRequest, unauthorizedResponse, forbiddenResponse } from '@/lib/auth/jwt';
import { newsSchema, paginationSchema } from '@/lib/validations';
import { successResponse, errorResponse, paginatedResponse, generateSlug } from '@/lib/security';
import type { NewsArticle } from '@/types';

export async function GET(req: NextRequest) {
  try {
    const { searchParams } = req.nextUrl;
    const { page, limit, search } = paginationSchema.parse(Object.fromEntries(searchParams));
    const offset = (page - 1) * limit;

    const conditions = ['n.published = 1'];
    const values: unknown[] = [];
    if (search) {
      conditions.push('(n.title LIKE ? OR n.excerpt LIKE ?)');
      values.push(`%${search}%`, `%${search}%`);
    }
    const where = `WHERE ${conditions.join(' AND ')}`;
    const [{ total }] = await query<{ total: number }>(
      `SELECT COUNT(*) as total FROM news_articles n ${where}`,
      values
    );
    const articles = await query<NewsArticle>(
      `SELECT n.id, n.title, n.slug, n.excerpt, n.featured_image, n.published_at,
              n.view_count, u.name as author_name
       FROM news_articles n
       LEFT JOIN users u ON n.author_id = u.id
       ${where} ORDER BY n.published_at DESC LIMIT ? OFFSET ?`,
      [...values, limit, offset]
    );

    return paginatedResponse(articles, total, page, limit);
  } catch (err) {
    return errorResponse('Failed to fetch news');
  }
}

export async function POST(req: NextRequest) {
  const auth = await verifyRequest(req);
  if (!auth) return unauthorizedResponse();
  if (auth.role !== 'admin' && auth.role !== 'moderator') return forbiddenResponse();

  try {
    const body = await req.json();
    const data = newsSchema.parse(body);
    const slug = data.slug || generateSlug(data.title);

    const existing = await queryOne('SELECT id FROM news_articles WHERE slug = ?', [slug]);
    if (existing) return errorResponse('Slug already exists', 409);

    const result = await execute(
      `INSERT INTO news_articles (title, slug, content, excerpt, featured_image, author_id,
        category_id, tags, published, published_at)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
      [
        data.title, slug, data.content, data.excerpt || null, data.featuredImage || null,
        auth.userId, data.categoryId || null, data.tags ? JSON.stringify(data.tags) : null,
        data.published, data.published ? new Date() : null,
      ]
    );

    return successResponse(
      await queryOne<NewsArticle>('SELECT * FROM news_articles WHERE id = ?', [result.insertId]),
      'Article created', 201
    );
  } catch (err) {
    console.error('POST news:', err);
    return errorResponse('Failed to create article');
  }
}
