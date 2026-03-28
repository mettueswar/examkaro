import { NextRequest } from 'next/server';
import { verifyRequest } from '@/lib/auth/jwt';
import { queryOne } from '@/lib/db';
import { errorResponse } from '@/lib/security';

export interface SuperUserAccess {
  userId: number;
  subscriptionId: number;
  creditsUsed: number;
  creditsLimit: number;
  canUseAI: boolean;
}

// ─── Check if user has active super subscription ──────────────────────────────
export async function checkSuperAccess(req: NextRequest): Promise<SuperUserAccess | null> {
  const auth = await verifyRequest(req);
  if (!auth) return null;

  // Admin always has access
  if (auth.role === 'admin') {
    return { userId: auth.userId, subscriptionId: 0, creditsUsed: 0, creditsLimit: 9999, canUseAI: true };
  }

  const sub = await queryOne<{
    id: number; planId: number; aiCreditsPerMonth: number; validUntil: Date;
  }>(
    `SELECT us.id, us.plan_id, sp.ai_credits_per_month, us.valid_until
     FROM user_subscriptions us
     JOIN subscription_plans sp ON us.plan_id = sp.id
     WHERE us.user_id = ? AND us.status = 'active' AND us.valid_until > NOW()
     ORDER BY us.valid_until DESC LIMIT 1`,
    [auth.userId]
  );

  if (!sub) return null;

  // Count AI usage this month
  const usage = await queryOne<{ used: number }>(
    `SELECT COUNT(*) as used FROM ai_usage
     WHERE user_id = ? AND created_at >= DATE_FORMAT(NOW(), '%Y-%m-01')`,
    [auth.userId]
  );

  const creditsUsed = usage?.used ?? 0;
  const creditsLimit = sub.aiCreditsPerMonth;

  return {
    userId: auth.userId,
    subscriptionId: sub.id,
    creditsUsed,
    creditsLimit,
    canUseAI: creditsUsed < creditsLimit,
  };
}

export function superRequiredResponse() {
  return errorResponse('Super subscription required for AI features. Upgrade your plan.', 403);
}

export function creditLimitResponse(used: number, limit: number) {
  return errorResponse(`Monthly AI credit limit reached (${used}/${limit}). Upgrade for more.`, 429);
}

// ─── Log AI usage ─────────────────────────────────────────────────────────────
export async function logAIUsage(
  userId: number,
  action: 'flashcard_gen' | 'quiz_gen' | 'summarize' | 'process_material',
  materialId?: number,
  tokensUsed?: number
) {
  const { execute } = await import('@/lib/db');
  await execute(
    'INSERT INTO ai_usage (user_id, action, material_id, tokens_used) VALUES (?, ?, ?, ?)',
    [userId, action, materialId || null, tokensUsed || 0]
  ).catch(() => {});
}
