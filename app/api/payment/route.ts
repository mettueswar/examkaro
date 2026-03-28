import { NextRequest } from 'next/server';
import Razorpay from 'razorpay';
import crypto from 'crypto';
import { queryOne, execute, transaction } from '@/lib/db';
import { verifyRequest, unauthorizedResponse } from '@/lib/auth/jwt';
import { createOrderSchema, verifyPaymentSchema } from '@/lib/validations';
import { successResponse, errorResponse } from '@/lib/security';
import type { Package } from '@/types';

const razorpay = new Razorpay({
  key_id: process.env.RAZORPAY_KEY_ID!,
  key_secret: process.env.RAZORPAY_KEY_SECRET!,
});

// ─── Create Order ──────────────────────────────────────────────────────────
export async function POST(req: NextRequest) {
  const auth = await verifyRequest(req);
  if (!auth) return unauthorizedResponse();

  try {
    const body = await req.json();
    const { packageId } = createOrderSchema.parse(body);

    const pkg = await queryOne<Package>(
      'SELECT * FROM packages WHERE id = ? AND is_active = 1',
      [packageId]
    );
    if (!pkg) return errorResponse('Package not found', 404);

    const amount = (pkg.discountedPrice ?? pkg.price) * 100; // paise

    const order = await razorpay.orders.create({
      amount,
      currency: 'INR',
      receipt: `ek_${auth.userId}_${packageId}_${Date.now()}`,
      notes: {
        userId: String(auth.userId),
        packageId: String(packageId),
        packageName: pkg.name,
      },
    });

    // Save pending payment
    await execute(
      `INSERT INTO payments (user_id, package_id, order_id, amount, currency, status)
       VALUES (?, ?, ?, ?, 'INR', 'pending')`,
      [auth.userId, packageId, order.id, amount / 100]
    );

    return successResponse({
      orderId: order.id,
      amount,
      currency: 'INR',
      keyId: process.env.RAZORPAY_KEY_ID,
      prefill: { name: auth.email.split('@')[0], email: auth.email },
    });
  } catch (err) {
    console.error('Create order error:', err);
    return errorResponse('Failed to create payment order');
  }
}

// ─── Verify Payment ─────────────────────────────────────────────────────────
export async function PUT(req: NextRequest) {
  const auth = await verifyRequest(req);
  if (!auth) return unauthorizedResponse();

  try {
    const body = await req.json();
    const { orderId, paymentId, signature, packageId } = verifyPaymentSchema.parse(body);

    // Verify signature
    const expectedSignature = crypto
      .createHmac('sha256', process.env.RAZORPAY_KEY_SECRET!)
      .update(`${orderId}|${paymentId}`)
      .digest('hex');

    if (expectedSignature !== signature) {
      return errorResponse('Payment verification failed', 400);
    }

    const pkg = await queryOne<Package>('SELECT * FROM packages WHERE id = ?', [packageId]);
    if (!pkg) return errorResponse('Package not found', 404);

    await transaction(async (conn) => {
      // Update payment record
      await conn.execute(
        `UPDATE payments SET payment_id = ?, signature = ?, status = 'success'
         WHERE order_id = ? AND user_id = ?`,
        [paymentId, signature, orderId, auth.userId]
      );

      const [paymentRows] = await conn.execute(
        'SELECT id FROM payments WHERE order_id = ?',
        [orderId]
      );
      const payment = (paymentRows as { id: number }[])[0];

      // Grant package access
      const validFrom = new Date();
      const validUntil = new Date();
      validUntil.setDate(validUntil.getDate() + pkg.validityDays);

      await conn.execute(
        `INSERT INTO user_packages (user_id, package_id, payment_id, valid_from, valid_until, is_active)
         VALUES (?, ?, ?, ?, ?, 1)`,
        [auth.userId, packageId, payment.id, validFrom, validUntil]
      );

      // Upgrade user plan
      await conn.execute(
        `UPDATE users SET plan = 'premium', plan_expiry = ? WHERE id = ?`,
        [validUntil, auth.userId]
      );
    });

    return successResponse({ success: true, message: 'Payment successful! Access granted.' });
  } catch (err) {
    console.error('Verify payment error:', err);
    return errorResponse('Payment verification failed');
  }
}
