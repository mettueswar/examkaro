import { NextRequest } from 'next/server';
import { query } from '@/lib/db';
import { successResponse, errorResponse } from '@/lib/security';
import type { MockTest, NewsArticle } from '@/types';

export async function GET(req: NextRequest) {
  try {
    const q = req.nextUrl.searchParams.get('q')?.trim();
    if (!q || q.length < 2) return successResponse({ tests: [], news: [] });

    const [tests, news] = await Promise.all([
      query<MockTest & { categoryName: string; categorySlug: string }>(
        `SELECT t.id, t.title, t.slug, t.type, t.duration, t.total_questions,
                c.name as category_name, c.slug as category_slug
         FROM mock_tests t LEFT JOIN categories c ON t.category_id = c.id
         WHERE t.is_active = 1 AND (t.title LIKE ? OR t.title_hindi LIKE ?)
         ORDER BY t.attempt_count DESC LIMIT 5`,
        [`%${q}%`, `%${q}%`]
      ),
      query<NewsArticle>(
        `SELECT id, title, slug, excerpt, published_at
         FROM news_articles WHERE published = 1 AND title LIKE ?
         ORDER BY published_at DESC LIMIT 3`,
        [`%${q}%`]
      ),
    ]);

    return successResponse({ tests, news, query: q });
  } catch (err) {
    return errorResponse('Search failed');
  }
}
