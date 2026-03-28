import { NextRequest } from 'next/server';
import { query, queryOne } from '@/lib/db';
import { paginationSchema } from '@/lib/validations';
import { paginatedResponse, errorResponse } from '@/lib/security';
import { verifyRequest } from '@/lib/auth/jwt';
import type { MockTest } from '@/types';

export async function GET(req: NextRequest) {
  try {
    const { searchParams } = req.nextUrl;
    const params = paginationSchema.parse(Object.fromEntries(searchParams));
    const { page, limit, search } = params;
    const offset = (page - 1) * limit;

    const categorySlug = searchParams.get('category');
    const type = searchParams.get('type'); // free | premium
    const difficulty = searchParams.get('difficulty');
    const auth = await verifyRequest(req);

    const conditions: string[] = ['t.is_active = 1'];
    const values: unknown[] = [];

    if (categorySlug) {
      conditions.push('c.slug = ?');
      values.push(categorySlug);
    }
    if (type) {
      conditions.push('t.type = ?');
      values.push(type);
    }
    if (difficulty) {
      conditions.push('t.difficulty = ?');
      values.push(difficulty);
    }
    if (search) {
      conditions.push('(t.title LIKE ? OR t.title_hindi LIKE ?)');
      values.push(`%${search}%`, `%${search}%`);
    }

    const where = conditions.length ? `WHERE ${conditions.join(' AND ')}` : '';

    const [countResult] = await query<{ total: number }>(
      `SELECT COUNT(*) as total FROM mock_tests t
       LEFT JOIN categories c ON t.category_id = c.id ${where}`,
      values
    );

    const tests = await query<MockTest>(
      `SELECT t.*, c.name as category_name, c.slug as category_slug,
              c.color as category_color, c.icon as category_icon
       FROM mock_tests t
       LEFT JOIN categories c ON t.category_id = c.id
       ${where}
       ORDER BY t.created_at DESC
       LIMIT ? OFFSET ?`,
      [...values, limit, offset]
    );

    // If not premium user, mark premium tests but don't block listing
    const userPlan = auth?.plan ?? 'free';
    const processedTests = tests.map((t: MockTest & Record<string, unknown>) => ({
      ...t,
      locked: t.type === 'premium' && userPlan !== 'premium',
    }));

    return paginatedResponse(processedTests, countResult.total, page, limit);
  } catch (err) {
    console.error('Tests GET error:', err);
    return errorResponse('Failed to fetch tests');
  }
}
