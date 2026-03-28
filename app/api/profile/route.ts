import { NextRequest } from 'next/server';
import { execute, queryOne } from '@/lib/db';
import { verifyRequest, unauthorizedResponse } from '@/lib/auth/jwt';
import { updateProfileSchema } from '@/lib/validations';
import { successResponse, errorResponse } from '@/lib/security';
import type { User } from '@/types';

export async function GET(req: NextRequest) {
  const auth = await verifyRequest(req);
  if (!auth) return unauthorizedResponse();
  const user = await queryOne<User>('SELECT id, uid, name, email, phone, avatar, role, plan, plan_expiry, created_at FROM users WHERE id = ?', [auth.userId]);
  return successResponse(user);
}

export async function PUT(req: NextRequest) {
  const auth = await verifyRequest(req);
  if (!auth) return unauthorizedResponse();

  try {
    const body = await req.json();
    const data = updateProfileSchema.parse(body);

    await execute(
      'UPDATE users SET name = COALESCE(?, name), phone = COALESCE(?, phone), updated_at = NOW() WHERE id = ?',
      [data.name ?? null, data.phone ?? null, auth.userId]
    );

    const user = await queryOne<User>('SELECT id, uid, name, email, phone, avatar, role, plan FROM users WHERE id = ?', [auth.userId]);
    return successResponse(user);
  } catch (err) {
    return errorResponse('Failed to update profile');
  }
}
