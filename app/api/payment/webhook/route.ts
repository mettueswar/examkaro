import { NextRequest, NextResponse } from 'next/server';
import crypto from 'crypto';
import { execute, queryOne } from '@/lib/db';
import type { Payment, Package } from '@/types';

/**
 * Razorpay sends webhook events to this endpoint.
 * Configure in Razorpay Dashboard → Settings → Webhooks:
 * URL: https://examkaro.com/api/payment/webhook
 * Events: payment.captured, payment.failed, refund.created
 */
export async function POST(req: NextRequest) {
  try {
    const body = await req.text();
    const signature = req.headers.get('x-razorpay-signature');

    if (!signature) {
      return NextResponse.json({ error: 'Missing signature' }, { status: 400 });
    }

    // Verify webhook signature
    const expectedSig = crypto
      .createHmac('sha256', process.env.RAZORPAY_WEBHOOK_SECRET!)
      .update(body)
      .digest('hex');

    if (expectedSig !== signature) {
      console.error('Razorpay webhook signature mismatch');
      return NextResponse.json({ error: 'Invalid signature' }, { status: 400 });
    }

    const event = JSON.parse(body);
    const { event: eventName, payload } = event;

    switch (eventName) {
      case 'payment.captured': {
        const payment = payload.payment?.entity;
        if (!payment) break;

        const orderId = payment.order_id;
        const paymentId = payment.id;

        // Check if already processed
        const existing = await queryOne<Payment>(
          "SELECT * FROM payments WHERE order_id = ? AND status = 'success'",
          [orderId]
        );
        if (existing) break;

        // Update payment status
        await execute(
          "UPDATE payments SET payment_id = ?, status = 'success' WHERE order_id = ? AND status = 'pending'",
          [paymentId, orderId]
        );

        // Get payment record
        const paymentRecord = await queryOne<Payment & { packageId: number; userId: number }>(
          'SELECT * FROM payments WHERE order_id = ?',
          [orderId]
        );

        if (paymentRecord?.packageId) {
          const pkg = await queryOne<Package>(
            'SELECT * FROM packages WHERE id = ?',
            [paymentRecord.packageId]
          );

          if (pkg) {
            const validFrom = new Date();
            const validUntil = new Date();
            validUntil.setDate(validUntil.getDate() + pkg.validityDays);

            // Check if user_package already exists
            const existingPackage = await queryOne(
              'SELECT id FROM user_packages WHERE user_id = ? AND package_id = ? AND payment_id = ?',
              [paymentRecord.userId, pkg.id, paymentRecord.id]
            );

            if (!existingPackage) {
              await execute(
                `INSERT INTO user_packages (user_id, package_id, payment_id, valid_from, valid_until, is_active)
                 VALUES (?, ?, ?, ?, ?, 1)`,
                [paymentRecord.userId, pkg.id, paymentRecord.id, validFrom, validUntil]
              );

              await execute(
                "UPDATE users SET plan = 'premium', plan_expiry = ?, updated_at = NOW() WHERE id = ?",
                [validUntil, paymentRecord.userId]
              );
            }
          }
        }
        break;
      }

      case 'payment.failed': {
        const payment = payload.payment?.entity;
        if (!payment) break;
        await execute(
          "UPDATE payments SET status = 'failed' WHERE order_id = ? AND status = 'pending'",
          [payment.order_id]
        );
        break;
      }

      case 'refund.created': {
        const refund = payload.refund?.entity;
        if (!refund) break;
        await execute(
          "UPDATE payments SET status = 'refunded' WHERE payment_id = ?",
          [refund.payment_id]
        );
        // Optionally downgrade user plan here
        break;
      }
    }

    return NextResponse.json({ status: 'ok' });
  } catch (err) {
    console.error('Webhook error:', err);
    return NextResponse.json({ error: 'Webhook processing failed' }, { status: 500 });
  }
}
