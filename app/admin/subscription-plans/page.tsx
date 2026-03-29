"use client";

import { useState, useEffect, useCallback } from "react";
import {
  Plus,
  Pencil,
  Trash2,
  Save,
  X,
  Check,
  Zap,
  Brain,
  Crown,
} from "lucide-react";
import toast from "react-hot-toast";
import { formatCurrency } from "@/lib/utils";

interface Plan {
  id: number;
  name: string;
  slug: string;
  billing: "monthly" | "quarterly" | "yearly";
  price: number;
  discountedPrice?: number | null;
  features: string[];
  aiCreditsPerMonth: number;
  isActive: boolean;
}

const BILLING_LABELS = {
  monthly: "Monthly",
  quarterly: "Quarterly",
  yearly: "Yearly",
};
const BILLING_DAYS = { monthly: 30, quarterly: 90, yearly: 365 };

export default function AdminSubscriptionPlansPage() {
  const [plans, setPlans] = useState<Plan[]>([]);
  const [loading, setLoading] = useState(true);
  const [editing, setEditing] = useState<Partial<Plan> | null>(null);
  const [saving, setSaving] = useState(false);
  const [featureInput, setFeatureInput] = useState("");
  const [deleting, setDeleting] = useState<number | null>(null);

  const fetch_ = useCallback(async () => {
    setLoading(true);
    const res = await fetch("/api/admin/subscription-plans");
    const json = await res.json();
    if (json.success) setPlans(json.data);
    setLoading(false);
  }, []);

  useEffect(() => {
    fetch_();
  }, [fetch_]);

  const handleSave = async () => {
    if (
      !editing?.name ||
      !editing?.price ||
      !editing?.billing ||
      !editing?.aiCreditsPerMonth
    ) {
      toast.error("Name, price, billing and AI credits are required");
      return;
    }
    setSaving(true);
    try {
      const method = editing.id ? "PUT" : "POST";
      const res = await fetch("/api/admin/subscription-plans", {
        method,
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(editing),
      });
      const json = await res.json();
      if (!json.success) throw new Error(json.error);
      toast.success(editing.id ? "Plan updated" : "Plan created");
      setEditing(null);
      fetch_();
    } catch (err: unknown) {
      toast.error(err instanceof Error ? err.message : "Failed");
    } finally {
      setSaving(false);
    }
  };

  const handleDelete = async (id: number) => {
    if (
      !confirm(
        "Delete this plan? This will fail if there are active subscribers.",
      )
    )
      return;
    setDeleting(id);
    try {
      const res = await fetch(`/api/admin/subscription-plans?id=${id}`, {
        method: "DELETE",
      });
      const json = await res.json();
      if (!json.success) throw new Error(json.error);
      toast.success("Plan deleted");
      fetch_();
    } catch (err: unknown) {
      toast.error(err instanceof Error ? err.message : "Failed");
    } finally {
      setDeleting(null);
    }
  };

  const toggleActive = async (plan: Plan) => {
    const res = await fetch("/api/admin/subscription-plans", {
      method: "PUT",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ id: plan.id, isActive: !plan.isActive }),
    });
    const json = await res.json();
    if (json.success) {
      toast.success(`Plan ${plan.isActive ? "deactivated" : "activated"}`);
      fetch_();
    }
  };

  const addFeature = () => {
    if (!featureInput.trim()) return;
    setEditing((p) => ({
      ...p,
      features: [...(p?.features || []), featureInput.trim()],
    }));
    setFeatureInput("");
  };

  const removeFeature = (idx: number) => {
    setEditing((p) => ({
      ...p,
      features: (p?.features || []).filter((_, i) => i !== idx),
    }));
  };

  const discount = (p: Plan) =>
    p.price && p.discountedPrice
      ? Math.round(((p.price - p.discountedPrice) / p.price) * 100)
      : 0;

  return (
    <div>
      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="text-xl font-display font-bold text-surface-900">
            AI Subscription Plans
          </h1>
          <p className="text-sm text-surface-500 mt-0.5">
            Manage plans users can buy for AI features access via Razorpay
          </p>
        </div>
        <button
          onClick={() =>
            setEditing({
              name: "",
              billing: "monthly",
              price: 0,
              features: [],
              aiCreditsPerMonth: 50,
              isActive: true,
            })
          }
          className="btn-primary flex items-center gap-2 text-sm"
        >
          <Plus size={15} /> Add Plan
        </button>
      </div>

      {/* Editor */}
      {editing !== null && (
        <div className="card p-5 mb-6 border-2 border-violet-200">
          <h3 className="font-semibold text-surface-800 mb-4 text-sm flex items-center gap-2">
            <Brain size={15} className="text-violet-600" />
            {editing.id ? "Edit Plan" : "New Subscription Plan"}
          </h3>
          <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-4 mb-4">
            <div>
              <label className="block text-xs font-semibold text-surface-700 mb-1">
                Plan Name *
              </label>
              <input
                value={editing.name || ""}
                onChange={(e) =>
                  setEditing((p) => ({ ...p, name: e.target.value }))
                }
                className="input-base text-sm"
                placeholder="ExamKaro Super"
              />
            </div>
            <div>
              <label className="block text-xs font-semibold text-surface-700 mb-1">
                Billing Period *
              </label>
              <select
                value={editing.billing || "monthly"}
                onChange={(e) =>
                  setEditing((p) => ({
                    ...p,
                    billing: e.target.value as Plan["billing"],
                  }))
                }
                className="input-base text-sm"
              >
                <option value="monthly">Monthly (30 days)</option>
                <option value="quarterly">Quarterly (90 days)</option>
                <option value="yearly">Yearly (365 days)</option>
              </select>
            </div>
            <div>
              <label className="block text-xs font-semibold text-surface-700 mb-1">
                AI Credits / Month *
              </label>
              <input
                type="number"
                min={1}
                max={99999}
                value={editing.aiCreditsPerMonth || ""}
                onChange={(e) =>
                  setEditing((p) => ({
                    ...p,
                    aiCreditsPerMonth: parseInt(e.target.value) || 0,
                  }))
                }
                className="input-base text-sm"
                placeholder="50"
              />
              <p className="text-xs text-surface-400 mt-1">
                Each flashcard/quiz generation = 1 credit
              </p>
            </div>
            <div>
              <label className="block text-xs font-semibold text-surface-700 mb-1">
                Price (₹) *
              </label>
              <input
                type="number"
                min={0}
                value={editing.price || ""}
                onChange={(e) =>
                  setEditing((p) => ({
                    ...p,
                    price: parseFloat(e.target.value) || 0,
                  }))
                }
                className="input-base text-sm"
              />
            </div>
            <div>
              <label className="block text-xs font-semibold text-surface-700 mb-1">
                Discounted Price (₹)
              </label>
              <input
                type="number"
                min={0}
                value={editing.discountedPrice || ""}
                onChange={(e) =>
                  setEditing((p) => ({
                    ...p,
                    discountedPrice: parseFloat(e.target.value) || null,
                  }))
                }
                className="input-base text-sm"
                placeholder="Leave blank for no discount"
              />
            </div>
            <div className="flex items-end">
              <label className="flex items-center gap-2 cursor-pointer">
                <input
                  type="checkbox"
                  checked={editing.isActive ?? true}
                  onChange={(e) =>
                    setEditing((p) => ({ ...p, isActive: e.target.checked }))
                  }
                  className="w-4 h-4 accent-violet-600"
                />
                <span className="text-sm text-surface-700 font-medium">
                  Active (visible to users)
                </span>
              </label>
            </div>
          </div>

          {/* Features */}
          <div className="mb-4">
            <label className="block text-xs font-semibold text-surface-700 mb-2">
              Features
            </label>
            <div className="flex gap-2 mb-2">
              <input
                value={featureInput}
                onChange={(e) => setFeatureInput(e.target.value)}
                onKeyDown={(e) => e.key === "Enter" && addFeature()}
                className="input-base text-sm flex-1"
                placeholder="e.g. PDF & DOCX Upload (press Enter)"
              />
              <button onClick={addFeature} className="btn-outline text-sm px-3">
                Add
              </button>
            </div>
            <div className="flex flex-wrap gap-2">
              {(editing.features || []).map((f, i) => (
                <span
                  key={i}
                  className="flex items-center gap-1.5 bg-violet-50 text-violet-700 text-xs px-2.5 py-1 rounded-lg border border-violet-100"
                >
                  <Check size={11} /> {f}
                  <button
                    onClick={() => removeFeature(i)}
                    className="ml-1 hover:text-red-500"
                  >
                    <X size={11} />
                  </button>
                </span>
              ))}
              {(editing.features || []).length === 0 && (
                <span className="text-xs text-surface-400">
                  No features added yet
                </span>
              )}
            </div>
          </div>

          <div className="flex gap-2">
            <button
              onClick={handleSave}
              disabled={saving}
              className="btn-primary flex items-center gap-2 text-sm"
              style={{ background: "#7c3aed" }}
            >
              <Save size={13} /> {saving ? "Saving..." : "Save Plan"}
            </button>
            <button
              onClick={() => setEditing(null)}
              className="btn-secondary text-sm flex items-center gap-2"
            >
              <X size={13} /> Cancel
            </button>
          </div>
        </div>
      )}

      {/* Plans Grid */}
      {loading ? (
        <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-4">
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
        <div className="card p-16 text-center">
          <Brain size={40} className="text-surface-300 mx-auto mb-3" />
          <p className="text-surface-500 font-medium">
            No subscription plans yet
          </p>
          <p className="text-sm text-surface-400 mt-1">
            Create plans to monetize AI features
          </p>
        </div>
      ) : (
        <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-4">
          {plans.map((plan) => (
            <div
              key={plan.id}
              className={`card p-5 relative ${!plan.isActive ? "opacity-60" : ""}`}
            >
              {discount(plan) > 0 && (
                <div className="absolute top-3 right-3 bg-red-500 text-white text-xs font-bold px-2 py-0.5 rounded-full">
                  {discount(plan)}% OFF
                </div>
              )}

              <div className="flex items-start justify-between mb-3">
                <div className="w-10 h-10 bg-violet-100 rounded-xl flex items-center justify-center">
                  <Crown size={18} className="text-violet-600" />
                </div>
                <div className="flex gap-1">
                  <button
                    onClick={() => setEditing({ ...plan })}
                    className="p-1.5 text-surface-400 hover:text-violet-600 hover:bg-violet-50 rounded-lg"
                  >
                    <Pencil size={13} />
                  </button>
                  <button
                    onClick={() => handleDelete(plan.id)}
                    disabled={deleting === plan.id}
                    className="p-1.5 text-surface-400 hover:text-red-600 hover:bg-red-50 rounded-lg"
                  >
                    <Trash2 size={13} />
                  </button>
                </div>
              </div>

              <h3 className="font-bold text-surface-900 mb-0.5">{plan.name}</h3>
              <p className="text-xs text-surface-500 mb-3">
                {BILLING_LABELS[plan.billing]} · {BILLING_DAYS[plan.billing]}{" "}
                days
              </p>

              <div className="flex items-baseline gap-2 mb-1">
                <span className="text-2xl font-bold text-surface-900">
                  {formatCurrency(plan.discountedPrice ?? plan.price)}
                </span>
                {plan.discountedPrice && (
                  <span className="text-surface-400 line-through text-sm">
                    {formatCurrency(plan.price)}
                  </span>
                )}
              </div>

              <div className="flex items-center gap-1.5 mb-3 text-violet-700">
                <Zap size={13} className="text-violet-500" />
                <span className="text-sm font-semibold">
                  {plan.aiCreditsPerMonth} AI credits/month
                </span>
              </div>

              <ul className="space-y-1.5 mb-4">
                {(plan.features || []).slice(0, 5).map((f, i) => (
                  <li
                    key={i}
                    className="flex items-center gap-2 text-xs text-surface-600"
                  >
                    <Check size={11} className="text-green-500 shrink-0" /> {f}
                  </li>
                ))}
              </ul>

              <button
                onClick={() => toggleActive(plan)}
                className={`w-full py-1.5 rounded-lg text-xs font-semibold transition-colors ${
                  plan.isActive
                    ? "bg-green-50 text-green-700 hover:bg-green-100"
                    : "bg-surface-100 text-surface-500 hover:bg-surface-200"
                }`}
              >
                {plan.isActive ? "● Active" : "○ Inactive"}
              </button>
            </div>
          ))}
        </div>
      )}

      {/* Info box */}
      <div className="mt-6 p-4 bg-blue-50 rounded-xl border border-blue-100">
        <p className="text-sm font-semibold text-blue-700 mb-1">
          💡 How it works
        </p>
        <p className="text-xs text-blue-600">
          Users purchase these plans via Razorpay on the AI Study Hub page. Each
          plan grants AI feature access for its validity period. Credits reset
          monthly. The <code className="bg-blue-100 px-1 rounded">slug</code>{" "}
          must match what's referenced in the subscription gate. Plan changes
          take effect immediately for new subscribers.
        </p>
      </div>
    </div>
  );
}
