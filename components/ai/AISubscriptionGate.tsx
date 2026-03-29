"use client";

import { useState, useEffect } from "react";
import {
  Crown,
  Check,
  Zap,
  Brain,
  Layers,
  Play,
  FileText,
  Link,
  Loader2,
} from "lucide-react";
import { formatCurrency, cn } from "@/lib/utils";
import { useAuth } from "@/components/providers/AuthProvider";
import { LoginModal } from "@/components/auth/LoginModal";
import toast from "react-hot-toast";

declare global {
  interface Window {
    Razorpay: new (opts: Record<string, unknown>) => { open(): void };
  }
}

interface Plan {
  id: number;
  name: string;
  slug: string;
  billing: "monthly" | "quarterly" | "yearly";
  price: number;
  discountedPrice?: number | null;
  aiCreditsPerMonth: number;
  features: string[];
  isActive: boolean;
}

const BILLING_LABELS = {
  monthly: "Monthly",
  quarterly: "Quarterly",
  yearly: "Yearly",
};
const BILLING_DAYS = { monthly: 30, quarterly: 90, yearly: 365 };
const POPULAR_BILLING = "quarterly";

const FEATURE_ICONS = [
  {
    icon: FileText,
    label: "PDF & DOCX Upload",
    desc: "Extract content from documents",
  },
  { icon: Play, label: "YouTube Transcription", desc: "Learn from any video" },
  { icon: Link, label: "Website Extraction", desc: "Import from any webpage" },
  {
    icon: Layers,
    label: "AI Flashcard Decks",
    desc: "Gemini-powered study cards",
  },
  { icon: Brain, label: "AI Quiz Generation", desc: "MCQs from your material" },
  { icon: Zap, label: "Hindi + English", desc: "Bilingual content support" },
];

export function AISubscriptionGate() {
  const { user } = useAuth();
  const [loginOpen, setLoginOpen] = useState(false);
  const [purchasing, setPurchasing] = useState<number | null>(null);
  const [plans, setPlans] = useState<Plan[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetch("/api/subscriptions")
      .then((r) => r.json())
      .then((json) => {
        if (json.success && json.data?.plans) {
          setPlans(json.data.plans.filter((p: Plan) => p.isActive));
        }
      })
      .catch(() => {})
      .finally(() => setLoading(false));
  }, []);

  const handleSubscribe = async (plan: Plan) => {
    if (!user) {
      setLoginOpen(true);
      return;
    }
    setPurchasing(plan.id);

    try {
      if (!window.Razorpay) {
        await new Promise<void>((res, rej) => {
          const s = document.createElement("script");
          s.src = "https://checkout.razorpay.com/v1/checkout.js";
          s.onload = () => res();
          s.onerror = () => rej(new Error("Payment gateway load failed"));
          document.body.appendChild(s);
        });
      }

      const orderRes = await fetch("/api/subscriptions", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ planId: plan.id }),
      });
      const orderJson = await orderRes.json();
      if (!orderJson.success) throw new Error(orderJson.error);

      const { orderId, amount, keyId } = orderJson.data;

      const rzp = new window.Razorpay({
        key: keyId,
        amount,
        currency: "INR",
        name: "ExamKaro Super",
        description: `${plan.name} — ${BILLING_LABELS[plan.billing]}`,
        order_id: orderId,
        prefill: { email: user.email, name: user.name },
        handler: async (response: {
          razorpay_payment_id: string;
          razorpay_order_id: string;
          razorpay_signature: string;
        }) => {
          const verifyRes = await fetch("/api/subscriptions", {
            method: "PUT",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({
              orderId: response.razorpay_order_id,
              paymentId: response.razorpay_payment_id,
              signature: response.razorpay_signature,
              planId: plan.id,
            }),
          });
          const verifyJson = await verifyRes.json();
          if (verifyJson.success) {
            toast.success(
              "🎉 Super subscription activated! AI features unlocked.",
            );
            window.location.reload();
          } else {
            toast.error("Payment verification failed. Contact support.");
          }
        },
        modal: { ondismiss: () => setPurchasing(null) },
      });
      rzp.open();
    } catch (err: unknown) {
      toast.error(err instanceof Error ? err.message : "Payment failed");
      setPurchasing(null);
    }
  };

  const discountPct = (plan: Plan) =>
    plan.price && plan.discountedPrice
      ? Math.round(((plan.price - plan.discountedPrice) / plan.price) * 100)
      : 0;

  return (
    <div>
      {/* Hero */}
      <div className="text-center py-10 px-4 bg-gradient-to-br from-violet-50 via-indigo-50 to-blue-50 rounded-2xl border border-violet-100 mb-8">
        <div className="w-16 h-16 bg-gradient-to-br from-violet-600 to-indigo-600 rounded-2xl flex items-center justify-center mx-auto mb-4">
          <Crown size={28} className="text-white" />
        </div>
        <h2 className="text-2xl font-display font-bold text-surface-900 mb-2">
          Unlock AI Features
        </h2>
        <p className="text-surface-500 max-w-lg mx-auto text-sm leading-relaxed">
          Upgrade to <strong>ExamKaro Super</strong> to generate AI-powered
          flashcards and quizzes from any PDF, YouTube video, or website —
          powered by Google Gemini.
        </p>
      </div>

      {/* Feature grid */}
      <div className="grid grid-cols-2 sm:grid-cols-3 gap-3 mb-8">
        {FEATURE_ICONS.map(({ icon: Icon, label, desc }) => (
          <div key={label} className="card p-4 text-center">
            <div className="w-10 h-10 bg-violet-100 rounded-xl flex items-center justify-center mx-auto mb-2">
              <Icon size={18} className="text-violet-600" />
            </div>
            <p className="text-sm font-semibold text-surface-800">{label}</p>
            <p className="text-xs text-surface-400 mt-0.5">{desc}</p>
          </div>
        ))}
      </div>

      {/* Pricing */}
      <h3 className="text-lg font-display font-bold text-surface-900 mb-4 text-center">
        Choose Your Plan
      </h3>

      {loading ? (
        <div className="grid sm:grid-cols-3 gap-4 mb-6">
          {[1, 2, 3].map((i) => (
            <div key={i} className="card p-5 animate-pulse space-y-3">
              <div className="h-5 bg-surface-200 rounded w-3/4" />
              <div className="h-8 bg-surface-200 rounded w-1/2" />
              <div className="space-y-2">
                {[1, 2, 3].map((j) => (
                  <div key={j} className="h-3 bg-surface-100 rounded" />
                ))}
              </div>
            </div>
          ))}
        </div>
      ) : plans.length === 0 ? (
        <div className="card p-10 text-center mb-6">
          <Brain size={32} className="text-surface-300 mx-auto mb-3" />
          <p className="text-surface-500 font-medium">
            No plans available right now
          </p>
          <p className="text-sm text-surface-400 mt-1">
            Check back soon or contact support
          </p>
        </div>
      ) : (
        <div
          className={cn(
            "grid gap-4 mb-6",
            plans.length === 1
              ? "sm:grid-cols-1 max-w-sm mx-auto"
              : plans.length === 2
                ? "sm:grid-cols-2"
                : "sm:grid-cols-3",
          )}
        >
          {plans.map((plan) => {
            const isPopular = plan.billing === POPULAR_BILLING;
            const disc = discountPct(plan);

            return (
              <div
                key={plan.id}
                className={cn(
                  "card p-5 relative flex flex-col",
                  isPopular && "border-violet-500 ring-2 ring-violet-500/20",
                )}
              >
                {isPopular && (
                  <div className="absolute -top-3 left-1/2 -translate-x-1/2 bg-violet-600 text-white text-xs font-bold px-3 py-1 rounded-full flex items-center gap-1">
                    <Zap size={10} /> Most Popular
                  </div>
                )}
                {disc > 0 && (
                  <div className="absolute top-3 right-3 bg-red-500 text-white text-xs font-bold px-2 py-0.5 rounded-full">
                    {disc}% OFF
                  </div>
                )}

                <p className="font-bold text-surface-900 text-base mb-1">
                  {plan.name}
                </p>
                <p className="text-xs text-surface-400 mb-2">
                  {BILLING_LABELS[plan.billing]} · {BILLING_DAYS[plan.billing]}{" "}
                  days
                </p>

                <div className="flex items-baseline gap-2 mb-1">
                  <span className="text-2xl font-display font-bold text-surface-900">
                    {formatCurrency(plan.discountedPrice ?? plan.price)}
                  </span>
                  {plan.discountedPrice &&
                    plan.discountedPrice < plan.price && (
                      <span className="text-surface-400 line-through text-sm">
                        {formatCurrency(plan.price)}
                      </span>
                    )}
                </div>

                <div className="flex items-center gap-1.5 mb-4 text-violet-700">
                  <Zap size={12} className="text-violet-500" />
                  <span className="text-xs font-semibold">
                    {plan.aiCreditsPerMonth} AI credits/month
                  </span>
                </div>

                <ul className="space-y-2 mb-5 flex-1">
                  {(plan.features || []).map((f, i) => (
                    <li
                      key={i}
                      className="flex items-start gap-2 text-xs text-surface-600"
                    >
                      <Check
                        size={13}
                        className="text-green-500 shrink-0 mt-0.5"
                      />{" "}
                      {f}
                    </li>
                  ))}
                </ul>

                <button
                  onClick={() => handleSubscribe(plan)}
                  disabled={purchasing === plan.id}
                  className={cn(
                    "w-full py-2.5 rounded-xl font-semibold text-sm transition-all",
                    isPopular
                      ? "bg-violet-600 hover:bg-violet-700 text-white"
                      : "border-2 border-violet-500 text-violet-700 hover:bg-violet-50",
                  )}
                >
                  {purchasing === plan.id ? (
                    <span className="flex items-center justify-center gap-2">
                      <Loader2 size={14} className="animate-spin" />{" "}
                      Processing...
                    </span>
                  ) : (
                    `Subscribe — ${formatCurrency(plan.discountedPrice ?? plan.price)}`
                  )}
                </button>
              </div>
            );
          })}
        </div>
      )}

      <p className="text-center text-xs text-surface-400">
        🔒 Secure payment via Razorpay · Cancel anytime · 7-day money-back
        guarantee
      </p>

      <LoginModal open={loginOpen} onClose={() => setLoginOpen(false)} />
    </div>
  );
}
