import { NextRequest } from 'next/server';
import { query, execute } from '@/lib/db';
import { verifyRequest, unauthorizedResponse, forbiddenResponse } from '@/lib/auth/jwt';
import { paginationSchema } from '@/lib/validations';
import { successResponse, errorResponse, paginatedResponse } from '@/lib/security';
import { z } from 'zod';
import type { User } from '@/types';

export async function GET(req: NextRequest) {
  const auth = await verifyRequest(req);
  if (!auth) return unauthorizedResponse();
  if (auth.role !== 'admin' && auth.role !== 'moderator') return forbiddenResponse();

  try {
    const { searchParams } = req.nextUrl;
    const { page, limit, search } = paginationSchema.parse(Object.fromEntries(searchParams));
    const offset = (page - 1) * limit;

    const conditions: string[] = [];
    const values: unknown[] = [];
    if (search) {
      conditions.push('(u.name LIKE ? OR u.email LIKE ?)');
      values.push(`%${search}%`, `%${search}%`);
    }
    const where = conditions.length ? `WHERE ${conditions.join(' AND ')}` : '';

    const [{ total }] = await query<{ total: number }>(
      `SELECT COUNT(*) as total FROM users u ${where}`, values
    );

    const users = await query<User & { attemptCount: number }>(
      `SELECT u.*, COUNT(ta.id) as attempt_count
       FROM users u
       LEFT JOIN test_attempts ta ON u.id = ta.user_id
       ${where}
       GROUP BY u.id
       ORDER BY u.created_at DESC
       LIMIT ? OFFSET ?`,
      [...values, limit, offset]
    );

    return paginatedResponse(users, total, page, limit);
  } catch (err) {
    return errorResponse('Failed to fetch users');
  }
}

const updateUserSchema = z.object({
  id: z.number().int().positive(),
  role: z.enum(['user', 'admin', 'moderator']).optional(),
  plan: z.enum(['free', 'premium']).optional(),
  isActive: z.boolean().optional(),
});

export async function PUT(req: NextRequest) {
  const auth = await verifyRequest(req);
  if (!auth) return unauthorizedResponse();
  if (auth.role !== 'admin') return forbiddenResponse();

  try {
    const body = await req.json();
    const { id, role, plan, isActive } = updateUserSchema.parse(body);

    await execute(
      `UPDATE users SET
         role = COALESCE(?, role),
         plan = COALESCE(?, plan),
         is_active = COALESCE(?, is_active),
         updated_at = NOW()
       WHERE id = ?`,
      [role ?? null, plan ?? null, isActive ?? null, id]
    );

    return successResponse({ updated: true });
  } catch (err) {
    return errorResponse('Failed to update user');
  }
}
