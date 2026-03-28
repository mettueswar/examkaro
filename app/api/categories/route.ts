import { NextRequest } from "next/server";
import { query, queryOne, execute } from "@/lib/db";
import {
  verifyRequest,
  unauthorizedResponse,
  forbiddenResponse,
} from "@/lib/auth/jwt";
import { categorySchema } from "@/lib/validations";
import { successResponse, errorResponse, generateSlug } from "@/lib/security";
import type { Category } from "@/types";

export async function GET() {
  try {
    const categories = await query<Category>(
      `SELECT c.*, COUNT(t.id) as test_count
       FROM categories c
       LEFT JOIN mock_tests t ON t.category_id = c.id AND t.is_active = 1
       WHERE c.is_active = 1
       GROUP BY c.id
       ORDER BY c.order_index, c.name`,
    );
    return successResponse(categories);
  } catch (err) {
    return errorResponse("Failed to fetch categories");
  }
}

export async function POST(req: NextRequest) {
  const auth = await verifyRequest(req);
  if (!auth) return unauthorizedResponse();
  if (auth.role !== "admin") return forbiddenResponse();

  try {
    const body = await req.json();
    const data = categorySchema.parse(body);
    const slug = data.slug || generateSlug(data.name);

    const existing = await queryOne(
      "SELECT id FROM categories WHERE slug = ?",
      [slug],
    );
    if (existing) return errorResponse("Slug already exists", 409);

    const result = await execute(
      `INSERT INTO categories (name, name_hindi, slug, description, icon, color, parent_id, order_index)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?)`,
      [
        data.name,
        data.nameHindi || null,
        slug,
        data.description || null,
        data.icon || null,
        data.color || null,
        data.parentId || null,
        data.orderIndex,
      ],
    );

    const category = await queryOne<Category>(
      "SELECT * FROM categories WHERE id = ?",
      [result.insertId],
    );
    return successResponse(category, "Category created", 201);
  } catch (err) {
    console.error("POST category:", err);
    return errorResponse("Failed to create category");
  }
}

export async function PUT(req: NextRequest) {
  const auth = await verifyRequest(req);

  if (!auth) return unauthorizedResponse();
  if (auth.role !== "admin") return forbiddenResponse();

  try {
    const body = await req.json();

    const { id, ...rest } = body;
    if (!id) return errorResponse("Category ID required");
    const data = categorySchema.partial().parse(rest);

    await execute(
      `UPDATE categories SET
         name = COALESCE(?, name),
         name_hindi = COALESCE(?, name_hindi),
         description = COALESCE(?, description),
         icon = COALESCE(?, icon),
         color = COALESCE(?, color),
         order_index = COALESCE(?, order_index)
       WHERE id = ?`,
      [
        data.name,
        data.nameHindi,
        data.description,
        data.icon,
        data.color,
        data.orderIndex,
        id,
      ],
    );

    return successResponse(
      await queryOne<Category>("SELECT * FROM categories WHERE id = ?", [id]),
    );
  } catch (err) {
    console.error("PUT outer catch:", err); // <-- this is firing
    return errorResponse("Failed to update category");
  }
}

export async function DELETE(req: NextRequest) {
  const auth = await verifyRequest(req);
  if (!auth) return unauthorizedResponse();
  if (auth.role !== "admin") return forbiddenResponse();

  const id = req.nextUrl.searchParams.get("id");
  if (!id) return errorResponse("Category ID required");
  await execute("UPDATE categories SET is_active = 0 WHERE id = ?", [id]);
  return successResponse({ deleted: true });
}
