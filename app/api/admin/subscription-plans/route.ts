import { NextRequest } from "next/server";
import { query, queryOne, execute } from "@/lib/db";
import {
  verifyRequest,
  unauthorizedResponse,
  forbiddenResponse,
} from "@/lib/auth/jwt";
import { successResponse, errorResponse, generateSlug } from "@/lib/security";
import { z } from "zod";

const planSchema = z.object({
  name: z.string().min(2).max(100),
  slug: z
    .string()
    .regex(/^[a-z0-9-]+$/)
    .optional(),
  billing: z.enum(["monthly", "quarterly", "yearly"]),
  price: z.number().min(0),
  discountedPrice: z.number().min(0).optional().nullable(),
  features: z.array(z.string()).default([]),
  aiCreditsPerMonth: z.number().int().min(1).max(99999),
  isActive: z.boolean().default(true),
});

export async function GET(req: NextRequest) {
  const auth = await verifyRequest(req);
  if (!auth) return unauthorizedResponse();
  if (auth.role !== "admin" && auth.role !== "moderator")
    return forbiddenResponse();

  try {
    const plans = await query(
      "SELECT * FROM subscription_plans ORDER BY price ASC",
    );
    return successResponse(plans);
  } catch {
    return errorResponse("Failed to fetch plans");
  }
}

export async function POST(req: NextRequest) {
  const auth = await verifyRequest(req);
  if (!auth) return unauthorizedResponse();
  if (auth.role !== "admin") return forbiddenResponse();

  try {
    const body = await req.json();
    const data = planSchema.parse(body);
    const slug = data.slug || generateSlug(`${data.name}-${data.billing}`);

    const existing = await queryOne(
      "SELECT id FROM subscription_plans WHERE slug = ?",
      [slug],
    );
    if (existing) return errorResponse("Slug already exists", 409);

    const result = await execute(
      `INSERT INTO subscription_plans (name, slug, billing, price, discounted_price, features, ai_credits_per_month, is_active)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?)`,
      [
        data.name,
        slug,
        data.billing,
        data.price,
        data.discountedPrice ?? null,
        JSON.stringify(data.features),
        data.aiCreditsPerMonth,
        data.isActive ? 1 : 0,
      ],
    );

    return successResponse(
      await queryOne("SELECT * FROM subscription_plans WHERE id = ?", [
        result.insertId,
      ]),
      "Plan created",
      201,
    );
  } catch (err) {
    console.error("POST subscription plan:", err);
    return errorResponse("Failed to create plan");
  }
}

export async function PUT(req: NextRequest) {
  const auth = await verifyRequest(req);
  if (!auth) return unauthorizedResponse();
  if (auth.role !== "admin") return forbiddenResponse();

  try {
    const body = await req.json();
    const { id, ...rest } = body;
    if (!id) return errorResponse("ID required");
    const data = planSchema.partial().parse(rest);

    const sets: string[] = [];
    const vals: unknown[] = [];

    if (data.name !== undefined) {
      sets.push("name=?");
      vals.push(data.name);
    }
    if (data.billing !== undefined) {
      sets.push("billing=?");
      vals.push(data.billing);
    }
    if (data.price !== undefined) {
      sets.push("price=?");
      vals.push(data.price);
    }
    if (data.discountedPrice !== undefined) {
      sets.push("discounted_price=?");
      vals.push(data.discountedPrice);
    }
    if (data.features !== undefined) {
      sets.push("features=?");
      vals.push(JSON.stringify(data.features));
    }
    if (data.aiCreditsPerMonth !== undefined) {
      sets.push("ai_credits_per_month=?");
      vals.push(data.aiCreditsPerMonth);
    }
    if (data.isActive !== undefined) {
      sets.push("is_active=?");
      vals.push(data.isActive ? 1 : 0);
    }

    if (sets.length === 0) {
      return successResponse(
        await queryOne("SELECT * FROM subscription_plans WHERE id = ?", [id]),
      );
    }

    await execute(
      `UPDATE subscription_plans SET ${sets.join(",")} WHERE id=?`,
      [...vals, id],
    );
    return successResponse(
      await queryOne("SELECT * FROM subscription_plans WHERE id = ?", [id]),
    );
  } catch (err) {
    console.error("PUT subscription plan:", err);
    return errorResponse("Failed to update plan");
  }
}

export async function DELETE(req: NextRequest) {
  const auth = await verifyRequest(req);
  if (!auth) return unauthorizedResponse();
  if (auth.role !== "admin") return forbiddenResponse();

  const id = req.nextUrl.searchParams.get("id");
  if (!id) return errorResponse("ID required");

  // Check if anyone is subscribed
  const activeCount = await queryOne<{ cnt: number }>(
    "SELECT COUNT(*) as cnt FROM user_subscriptions WHERE plan_id = ? AND status = 'active'",
    [id],
  );
  if ((activeCount?.cnt ?? 0) > 0) {
    return errorResponse(
      "Cannot delete plan with active subscribers. Deactivate it instead.",
      409,
    );
  }

  await execute("DELETE FROM subscription_plans WHERE id = ?", [id]);
  return successResponse({ deleted: true });
}
