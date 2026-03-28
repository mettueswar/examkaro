'use client';

import { useState } from 'react';
import { Check, Crown, Zap } from 'lucide-react';
import { useAuth } from '@/components/providers/AuthProvider';
import { LoginModal } from '@/components/auth/LoginModal';
import { formatCurrency, cn } from '@/lib/utils';
import toast from 'react-hot-toast';
import type { Package } from '@/types';

declare global {
  interface Window {
    Razorpay: new (options: RazorpayOptions) => { open: () => void };
  }
}

interface RazorpayOptions {
  key: string;
  amount: number;
  currency: string;
  name: string;
  description: string;
  order_id: string;
  prefill: { name: string; email: string };
  handler: (response: { razorpay_payment_id: string; razorpay_order_id: string; razorpay_signature: string }) => void;
  modal: { ondismiss: () => void };
}

export function PackagesClient({ packages }: { packages: Package[] }) {
  const { user } = useAuth();
  const [loginOpen, setLoginOpen] = useState(false);
  const [purchasing, setPurchasing] = useState<number | null>(null);

  const loadRazorpay = () => {
    return new Promise<boolean>((resolve) => {
      if (window.Razorpay) { resolve(true); return; }
      const script = document.createElement('script');
      script.src = 'https://checkout.razorpay.com/v1/checkout.js';
      script.onload = () => resolve(true);
      script.onerror = () => resolve(false);
      document.body.appendChild(script);
    });
  };

  const handlePurchase = async (pkg: Package) => {
    if (!user) { setLoginOpen(true); return; }
    setPurchasing(pkg.id);

    try {
      const loaded = await loadRazorpay();
      if (!loaded) throw new Error('Payment gateway failed to load');

      const res = await fetch('/api/payment', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ packageId: pkg.id }),
      });
      const json = await res.json();
      if (!json.success) throw new Error(json.error);

      const { orderId, amount, currency, keyId, prefill } = json.data;

      const rzp = new window.Razorpay({
        key: keyId,
        amount,
        currency,
        name: 'ExamKaro',
        description: pkg.name,
        order_id: orderId,
        prefill,
        handler: async (response) => {
          const verifyRes = await fetch('/api/payment', {
            method: 'PUT',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
              orderId: response.razorpay_order_id,
              paymentId: response.razorpay_payment_id,
              signature: response.razorpay_signature,
              packageId: pkg.id,
            }),
          });
          const verifyJson = await verifyRes.json();
          if (verifyJson.success) {
            toast.success('Payment successful! Access unlocked 🎉');
            window.location.href = '/dashboard';
          } else {
            toast.error('Payment verification failed');
          }
        },
        modal: { ondismiss: () => setPurchasing(null) },
      });
      rzp.open();
    } catch (err: unknown) {
      toast.error(err instanceof Error ? err.message : 'Payment failed');
    } finally {
      setPurchasing(null);
    }
  };

  const highlighted = packages.findIndex((_, i) => i === Math.floor(packages.length / 2));

  return (
    <>
      <div className="max-w-5xl mx-auto px-4 py-12">
        <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-6">
          {packages.map((pkg, idx) => {
            const isHighlighted = idx === highlighted;
            const discount = pkg.price && pkg.discountedPrice
              ? Math.round(((pkg.price - pkg.discountedPrice) / pkg.price) * 100)
              : 0;

            return (
              <div
                key={pkg.id}
                className={cn(
                  'card p-6 relative flex flex-col',
                  isHighlighted && 'border-brand-500 shadow-elevated ring-2 ring-brand-500/20'
                )}
              >
                {isHighlighted && (
                  <div className="absolute -top-3 left-1/2 -translate-x-1/2 bg-brand-500 text-white text-xs font-bold px-4 py-1 rounded-full flex items-center gap-1">
                    <Zap size={11} /> Most Popular
                  </div>
                )}

                {discount > 0 && (
                  <div className="absolute top-4 right-4 bg-danger-500 text-white text-xs font-bold px-2 py-0.5 rounded-full">
                    {discount}% OFF
                  </div>
                )}

                <div className="mb-5">
                  <div className={cn(
                    'w-10 h-10 rounded-xl flex items-center justify-center mb-3',
                    isHighlighted ? 'bg-brand-500' : 'bg-surface-100'
                  )}>
                    <Crown size={18} className={isHighlighted ? 'text-white' : 'text-surface-500'} />
                  </div>
                  <h3 className="font-display font-bold text-surface-900 text-lg">{pkg.name}</h3>
                  {pkg.description && (
                    <p className="text-surface-500 text-sm mt-1">{pkg.description}</p>
                  )}
                </div>

                <div className="mb-5">
                  <div className="flex items-baseline gap-2">
                    <span className="text-3xl font-display font-bold text-surface-900">
                      {formatCurrency(pkg.discountedPrice ?? pkg.price)}
                    </span>
                    {pkg.discountedPrice && pkg.discountedPrice < pkg.price && (
                      <span className="text-surface-400 line-through text-sm">{formatCurrency(pkg.price)}</span>
                    )}
                  </div>
                  <p className="text-xs text-surface-500 mt-1">Valid for {pkg.validityDays} days</p>
                </div>

                <ul className="space-y-2.5 mb-6 flex-1">
                  {(pkg.features || []).map((f) => (
                    <li key={f} className="flex items-start gap-2 text-sm text-surface-700">
                      <Check size={15} className="text-success-500 shrink-0 mt-0.5" />
                      {f}
                    </li>
                  ))}
                </ul>

                <button
                  onClick={() => handlePurchase(pkg)}
                  disabled={purchasing === pkg.id}
                  className={cn(
                    'w-full py-2.5 rounded-xl font-semibold text-sm transition-all',
                    isHighlighted
                      ? 'bg-brand-500 hover:bg-brand-600 text-white'
                      : 'border-2 border-brand-500 text-brand-600 hover:bg-brand-50'
                  )}
                >
                  {purchasing === pkg.id ? 'Processing...' : `Buy Now — ${formatCurrency(pkg.discountedPrice ?? pkg.price)}`}
                </button>
              </div>
            );
          })}
        </div>

        <p className="text-center text-sm text-surface-400 mt-8">
          🔒 Secure payment via Razorpay · 100% money-back guarantee within 7 days
        </p>
      </div>
      <LoginModal open={loginOpen} onClose={() => setLoginOpen(false)} />
    </>
  );
}
