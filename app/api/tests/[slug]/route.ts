import { NextRequest } from 'next/server';
import { queryOne, query } from '@/lib/db';
import { errorResponse, successResponse } from '@/lib/security';
import { verifyRequest, unauthorizedResponse, forbiddenResponse } from '@/lib/auth/jwt';
import type { MockTest, Question, TestSection } from '@/types';
import {
  hasFullPremiumPlan,
  userCanAccessPremiumTestViaPackage,
} from '@/lib/package-test-access';

export async function GET(
  req: NextRequest,
  { params }: { params: Promise<{ slug: string }> }
) {
  try {
    const { slug } = await params;
    const auth = await verifyRequest(req);

    const test = await queryOne<MockTest>(
      `SELECT t.*, c.name as category_name, c.slug as category_slug
       FROM mock_tests t
       LEFT JOIN categories c ON t.category_id = c.id
       WHERE t.slug = ? AND t.is_active = 1`,
      [slug]
    );

    if (!test) return errorResponse('Test not found', 404);

    // Access check for premium tests
    if (test.type === 'premium') {
      if (!auth) return unauthorizedResponse('Login to access this test');
      if (!hasFullPremiumPlan(auth.plan)) {
        const hasAccess = await userCanAccessPremiumTestViaPackage(auth.userId, test.id);
        if (!hasAccess) {
          return forbiddenResponse('Upgrade or purchase a package to access this test');
        }
      }
    }

    const sections = await query<TestSection>(
      'SELECT * FROM test_sections WHERE test_id = ? ORDER BY order_index',
      [test.id]
    );

    // For the test detail page, don't return actual question content (only metadata)
    const questionCount = await queryOne<{ count: number }>(
      'SELECT COUNT(*) as count FROM questions WHERE test_id = ? AND is_active = 1',
      [test.id]
    );

    return successResponse({ test, sections, questionCount: questionCount?.count ?? 0 });
  } catch (err) {
    console.error('Test slug GET error:', err);
    return errorResponse('Failed to fetch test');
  }
}
