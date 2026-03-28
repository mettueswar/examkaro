import { NextRequest } from "next/server";
import { query, queryOne, execute } from "@/lib/db";
import {
  verifyRequest,
  unauthorizedResponse,
  forbiddenResponse,
} from "@/lib/auth/jwt";
import { packageSchema } from "@/lib/validations";
import { successResponse, errorResponse, generateSlug } from "@/lib/security";
import type { Package } from "@/types";

export async function GET(req: NextRequest) {
  const auth = await verifyRequest(req);
  if (!auth) return unauthorizedResponse();
  if (auth.role !== "admin" && auth.role !== "moderator")
    return forbiddenResponse();
  const pkgs = await query<Package>("SELECT * FROM packages ORDER BY price ASC");
  return successResponse(pkgs);
}

export async function POST(req: NextRequest) {
  const auth = await verifyRequest(req);
  if (!auth) return unauthorizedResponse();
  if (auth.role !== "admin") return forbiddenResponse();

  try {
    const body = await req.json();
    const data = packageSchema.parse(body);
    const slug = data.slug || generateSlug(data.name);

    const result = await execute(
      `INSERT INTO packages (name, slug, description, price, discounted_price, validity_days, test_ids, category_ids, features, is_active, mock_test_access_limit)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
      [
        data.name,
        slug,
        data.description || null,
        data.price,
        data.discountedPrice || null,
        data.validityDays,
        JSON.stringify(data.testIds),
        JSON.stringify(data.categoryIds || []),
        JSON.stringify(data.features),
        data.isActive,
        data.mockTestAccessLimit ?? null,
      ],
    );
    return successResponse(
      await queryOne<Package>("SELECT * FROM packages WHERE id = ?", [
        result.insertId,
      ]),
      "Created",
      201,
    );
  } catch (err) {
    return errorResponse("Failed to create package");
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
    const data = packageSchema.partial().parse(rest);

    const sets: string[] = [];
    const vals: unknown[] = [];
    if (data.name !== undefined) {
      sets.push("name=?");
      vals.push(data.name);
    }
    if (data.description !== undefined) {
      sets.push("description=?");
      vals.push(data.description);
    }
    if (data.price !== undefined) {
      sets.push("price=?");
      vals.push(data.price);
    }
    if (data.discountedPrice !== undefined) {
      sets.push("discounted_price=?");
      vals.push(data.discountedPrice);
    }
    if (data.validityDays !== undefined) {
      sets.push("validity_days=?");
      vals.push(data.validityDays);
    }
    if (data.testIds !== undefined) {
      sets.push("test_ids=?");
      vals.push(JSON.stringify(data.testIds));
    }
    if (data.categoryIds !== undefined) {
      sets.push("category_ids=?");
      vals.push(JSON.stringify(data.categoryIds));
    }
    if (data.mockTestAccessLimit !== undefined) {
      sets.push("mock_test_access_limit=?");
      vals.push(data.mockTestAccessLimit);
    }
    if (data.features !== undefined) {
      sets.push("features=?");
      vals.push(JSON.stringify(data.features));
    }
    if (data.isActive !== undefined) {
      sets.push("is_active=?");
      vals.push(data.isActive);
    }
    if (sets.length === 0) {
      return successResponse(await queryOne<Package>("SELECT * FROM packages WHERE id = ?", [id]));
    }
    await execute(
      `UPDATE packages SET ${sets.join(", ")} WHERE id=?`,
      [...vals, id],
    );
    return successResponse(await queryOne<Package>("SELECT * FROM packages WHERE id = ?", [id]));
  } catch (err) {
    return errorResponse("Failed to update");
  }
}

export async function DELETE(req: NextRequest) {
  const auth = await verifyRequest(req);
  if (!auth) return unauthorizedResponse();
  if (auth.role !== "admin") return forbiddenResponse();
  const id = req.nextUrl.searchParams.get("id");
  if (!id) return errorResponse("ID required");
  await execute("UPDATE packages SET is_active = 0 WHERE id = ?", [id]);
  return successResponse({ deleted: true });
}
