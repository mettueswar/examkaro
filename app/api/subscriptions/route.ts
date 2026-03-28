import { NextRequest } from 'next/server';
import Razorpay from 'razorpay';
import crypto from 'crypto';
import { query, queryOne, execute, transaction } from '@/lib/db';
import { verifyRequest, unauthorizedResponse } from '@/lib/auth/jwt';
import { successResponse, errorResponse } from '@/lib/security';
import { z } from 'zod';

const razorpay = new Razorpay({
  key_id: process.env.RAZORPAY_KEY_ID!,
  key_secret: process.env.RAZORPAY_KEY_SECRET!,
});

// ─── GET subscription plans + current user subscription ───────────────────────
export async function GET(req: NextRequest) {
  try {
    const plans = await query(
      'SELECT * FROM subscription_plans WHERE is_active = 1 ORDER BY price ASC'
    );

    const auth = await verifyRequest(req);
    let currentSub = null;
    if (auth) {
      currentSub = await queryOne(
        `SELECT us.*, sp.name as plan_name, sp.billing, sp.ai_credits_per_month
         FROM user_subscriptions us
         JOIN subscription_plans sp ON us.plan_id = sp.id
         WHERE us.user_id = ? AND us.status = 'active' AND us.valid_until > NOW()
         ORDER BY us.valid_until DESC LIMIT 1`,
        [auth.userId]
      );

      if (currentSub) {
        const usage = await queryOne<{ used: number }>(
          `SELECT COUNT(*) as used FROM ai_usage
           WHERE user_id = ? AND created_at >= DATE_FORMAT(NOW(), '%Y-%m-01')`,
          [auth.userId]
        );
        (currentSub as Record<string, unknown>).creditsUsed = usage?.used ?? 0;
      }
    }

    return successResponse({ plans, currentSub });
  } catch (err) {
    return errorResponse('Failed to fetch plans');
  }
}

// ─── POST create subscription order ──────────────────────────────────────────
export async function POST(req: NextRequest) {
  const auth = await verifyRequest(req);
  if (!auth) return unauthorizedResponse();

  try {
    const body = await req.json();
    const { planId } = z.object({ planId: z.number().int().positive() }).parse(body);

    const plan = await queryOne<{
      id: number; name: string; price: number; discountedPrice: number; billing: string;
    }>('SELECT * FROM subscription_plans WHERE id = ? AND is_active = 1', [planId]);

    if (!plan) return errorResponse('Plan not found', 404);

    const amount = Math.round((plan.discountedPrice ?? plan.price) * 100);

    const order = await razorpay.orders.create({
      amount,
      currency: 'INR',
      receipt: `sub_${auth.userId}_${planId}_${Date.now()}`,
      notes: { userId: String(auth.userId), planId: String(planId), type: 'subscription' },
    });

    return successResponse({
      orderId: order.id,
      amount,
      currency: 'INR',
      keyId: process.env.RAZORPAY_KEY_ID,
      planName: plan.name,
      billing: plan.billing,
      prefill: { email: auth.email },
    });
  } catch (err) {
    return errorResponse('Failed to create order');
  }
}

// ─── PUT verify and activate subscription ────────────────────────────────────
export async function PUT(req: NextRequest) {
  const auth = await verifyRequest(req);
  if (!auth) return unauthorizedResponse();

  try {
    const body = await req.json();
    const { orderId, paymentId, signature, planId } = z.object({
      orderId: z.string(), paymentId: z.string(), signature: z.string(),
      planId: z.number().int().positive(),
    }).parse(body);

    // Verify signature
    const expected = crypto
      .createHmac('sha256', process.env.RAZORPAY_KEY_SECRET!)
      .update(`${orderId}|${paymentId}`)
      .digest('hex');
    if (expected !== signature) return errorResponse('Payment verification failed', 400);

    const plan = await queryOne<{
      id: number; billing: string; aiCreditsPerMonth: number;
    }>('SELECT * FROM subscription_plans WHERE id = ?', [planId]);
    if (!plan) return errorResponse('Plan not found', 404);

    const now = new Date();
    const validUntil = new Date(now);
    const days = plan.billing === 'monthly' ? 30 : plan.billing === 'quarterly' ? 90 : 365;
    validUntil.setDate(validUntil.getDate() + days);

    await transaction(async (conn) => {
      // Record payment
      const [payResult] = await conn.execute(
        `INSERT INTO payments (user_id, order_id, payment_id, signature, amount, currency, status, metadata)
         VALUES (?, ?, ?, ?, (SELECT discounted_price FROM subscription_plans WHERE id = ?), 'INR', 'success', ?)`,
        [auth.userId, orderId, paymentId, signature, planId, JSON.stringify({ type: 'subscription', planId })]
      );
      const paymentDbId = (payResult as { insertId: number }).insertId;

      // Cancel any existing active subscription
      await conn.execute(
        "UPDATE user_subscriptions SET status = 'cancelled' WHERE user_id = ? AND status = 'active'",
        [auth.userId]
      );

      // Create new subscription
      await conn.execute(
        `INSERT INTO user_subscriptions (user_id, plan_id, payment_id, order_id, status, valid_from, valid_until)
         VALUES (?, ?, ?, ?, 'active', ?, ?)`,
        [auth.userId, planId, paymentDbId, orderId, now, validUntil]
      );

      // Upgrade user to super
      await conn.execute(
        "UPDATE users SET plan = 'super', plan_expiry = ?, updated_at = NOW() WHERE id = ?",
        [validUntil, auth.userId]
      );
    });

    return successResponse({ activated: true, validUntil, message: 'Subscription activated! AI features unlocked.' });
  } catch (err) {
    console.error('Subscription activation error:', err);
    return errorResponse('Activation failed');
  }
}
