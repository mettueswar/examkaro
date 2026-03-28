import { NextRequest } from "next/server";
import { query, queryOne, execute } from "@/lib/db";
import {
  verifyRequest,
  unauthorizedResponse,
  forbiddenResponse,
} from "@/lib/auth/jwt";
import { mockTestSchema } from "@/lib/validations";
import {
  successResponse,
  errorResponse,
  paginatedResponse,
  generateSlug,
} from "@/lib/security";
import type { MockTest } from "@/types";
import { z } from "zod";

// FIX: Admin-specific pagination schema that allows limit up to 1000
const adminPaginationSchema = z.object({
  page: z.coerce.number().int().min(1).default(1),
  limit: z.coerce.number().int().min(1).max(1000).default(20), // was 100, now 1000
  search: z.string().optional(),
});

// ─── GET all tests (admin) ─────────────────────────────────────────────────────
export async function GET(req: NextRequest) {
  const auth = await verifyRequest(req);
  if (!auth) return unauthorizedResponse();
  if (auth.role !== "admin" && auth.role !== "moderator")
    return forbiddenResponse();

  try {
    const { searchParams } = req.nextUrl;
    const { page, limit, search } = adminPaginationSchema.parse(
      Object.fromEntries(searchParams),
    );
    const offset = (page - 1) * limit;

    const conditions: string[] = [];
    const values: unknown[] = [];
    if (search) {
      conditions.push("(t.title LIKE ? OR t.title_hindi LIKE ?)");
      values.push(`%${search}%`, `%${search}%`);
    }
    const where = conditions.length ? `WHERE ${conditions.join(" AND ")}` : "";

    const [{ total }] = await query<{ total: number }>(
      `SELECT COUNT(*) as total FROM mock_tests t ${where}`,
      values,
    );

    const tests = await query<MockTest>(
      `SELECT t.*, c.name as category_name FROM mock_tests t
       LEFT JOIN categories c ON t.category_id = c.id
       ${where} ORDER BY t.created_at DESC LIMIT ? OFFSET ?`,
      [...values, limit, offset],
    );

    return paginatedResponse(tests, total, page, limit);
  } catch (err) {
    console.error("Admin GET tests:", err);
    return errorResponse("Failed to fetch tests");
  }
}

// ─── POST create test ──────────────────────────────────────────────────────
export async function POST(req: NextRequest) {
  const auth = await verifyRequest(req);
  if (!auth) return unauthorizedResponse();
  if (auth.role !== "admin" && auth.role !== "moderator")
    return forbiddenResponse();

  try {
    const body = await req.json();
    const data = mockTestSchema.parse(body);

    const slug = data.slug || generateSlug(data.title);
    const existing = await queryOne(
      "SELECT id FROM mock_tests WHERE slug = ?",
      [slug],
    );
    if (existing) return errorResponse("Slug already exists", 409);

    const result = await execute(
      `INSERT INTO mock_tests (title, title_hindi, slug, description, category_id, type, language,
        duration, negative_marking, passing_marks, difficulty, instructions, instructions_hindi,
        is_active, created_by)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
      [
        data.title,
        data.titleHindi || null,
        slug,
        data.description || null,
        data.categoryId,
        data.type,
        data.language,
        data.duration,
        data.negativeMarking,
        data.passingMarks || null,
        data.difficulty,
        data.instructions || null,
        data.instructionsHindi || null,
        data.isActive,
        auth.userId,
      ],
    );

    const test = await queryOne<MockTest>(
      "SELECT * FROM mock_tests WHERE id = ?",
      [result.insertId],
    );
    return successResponse(test, "Test created", 201);
  } catch (err) {
    console.error("Admin POST test:", err);
    return errorResponse("Failed to create test");
  }
}

// ─── PUT update test ───────────────────────────────────────────────────────
export async function PUT(req: NextRequest) {
  const auth = await verifyRequest(req);
  if (!auth) return unauthorizedResponse();
  if (auth.role !== "admin") return forbiddenResponse();

  try {
    const body = await req.json();
    const { id, ...rest } = body;
    if (!id) return errorResponse("Test ID required");
    const data = mockTestSchema.partial().parse(rest);

    // FIX: Build dynamic SET clause to only update provided fields
    const sets: string[] = [];
    const vals: unknown[] = [];

    if (data.title !== undefined) {
      sets.push("title = ?");
      vals.push(data.title);
    }
    if (data.titleHindi !== undefined) {
      sets.push("title_hindi = ?");
      vals.push(data.titleHindi ?? null);
    }
    if (data.description !== undefined) {
      sets.push("description = ?");
      vals.push(data.description ?? null);
    }
    if (data.categoryId !== undefined) {
      sets.push("category_id = ?");
      vals.push(data.categoryId);
    }
    if (data.type !== undefined) {
      sets.push("type = ?");
      vals.push(data.type);
    }
    if (data.language !== undefined) {
      sets.push("language = ?");
      vals.push(data.language);
    }
    if (data.duration !== undefined) {
      sets.push("duration = ?");
      vals.push(data.duration);
    }
    if (data.difficulty !== undefined) {
      sets.push("difficulty = ?");
      vals.push(data.difficulty);
    }
    if (data.negativeMarking !== undefined) {
      sets.push("negative_marking = ?");
      vals.push(data.negativeMarking);
    }
    if (data.passingMarks !== undefined) {
      sets.push("passing_marks = ?");
      vals.push(data.passingMarks ?? null);
    }
    if (data.instructions !== undefined) {
      sets.push("instructions = ?");
      vals.push(data.instructions ?? null);
    }
    if (data.isActive !== undefined) {
      sets.push("is_active = ?");
      vals.push(data.isActive);
    }

    sets.push("updated_at = NOW()");

    if (sets.length > 1) {
      await execute(`UPDATE mock_tests SET ${sets.join(", ")} WHERE id = ?`, [
        ...vals,
        id,
      ]);
    }

    const test = await queryOne<MockTest>(
      "SELECT * FROM mock_tests WHERE id = ?",
      [id],
    );
    return successResponse(test);
  } catch (err) {
    console.error("Admin PUT test:", err);
    return errorResponse("Failed to update test");
  }
}

// ─── DELETE test ───────────────────────────────────────────────────────────
export async function DELETE(req: NextRequest) {
  const auth = await verifyRequest(req);
  if (!auth) return unauthorizedResponse();
  if (auth.role !== "admin") return forbiddenResponse();

  try {
    const { searchParams } = req.nextUrl;
    const id = searchParams.get("id");
    if (!id) return errorResponse("Test ID required");

    await execute("UPDATE mock_tests SET is_active = 0 WHERE id = ?", [id]);
    return successResponse({ deleted: true });
  } catch (err) {
    console.error("Admin DELETE test:", err);
    return errorResponse("Failed to delete test");
  }
}
