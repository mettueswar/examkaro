import { NextRequest } from "next/server";
import { query, execute, queryOne } from "@/lib/db";
import { verifyRequest, unauthorizedResponse } from "@/lib/auth/jwt";
import {
  checkSuperAccess,
  superRequiredResponse,
  logAIUsage,
} from "@/lib/ai/guard";
import {
  successResponse,
  errorResponse,
  paginatedResponse,
} from "@/lib/security";
import {
  extractYouTubeTranscript,
  extractWebsiteContent,
  extractPDFContent,
  extractDOCXContent,
  cleanText,
  wordCount,
} from "@/lib/ai/extractor";
import { z } from "zod";

const urlSchema = z.object({
  type: z.enum(["url", "youtube", "text"]),
  url: z.string().url().optional(),
  text: z.string().min(100).optional(),
  title: z.string().max(500).optional(),
});

// ─── GET list user's materials ────────────────────────────────────────────────
export async function GET(req: NextRequest) {
  const auth = await verifyRequest(req);
  if (!auth) return unauthorizedResponse();

  try {
    const { searchParams } = req.nextUrl;
    const page = parseInt(searchParams.get("page") || "1");
    const limit = 20;
    const offset = (page - 1) * limit;

    const [{ total }] = await query<{ total: number }>(
      "SELECT COUNT(*) as total FROM study_materials WHERE user_id = ?",
      [auth.userId],
    );

    const materials = await query(
      `SELECT id, title, type, source_url, word_count, status, error_message, created_at
       FROM study_materials WHERE user_id = ? ORDER BY created_at DESC LIMIT ? OFFSET ?`,
      [auth.userId, limit, offset],
    );

    return paginatedResponse(materials, total, page, limit);
  } catch {
    return errorResponse("Failed to fetch materials");
  }
}

// ─── POST: upload URL or text material ────────────────────────────────────────
export async function POST(req: NextRequest) {
  const auth = await verifyRequest(req);
  if (!auth) return unauthorizedResponse();

  const access = await checkSuperAccess(req);
  if (!access) return superRequiredResponse();

  try {
    const body = await req.json();
    const { type, url, text, title } = urlSchema.parse(body);

    let extractedText = "";
    let materialTitle = title || url || "Study Material";
    let metadata: Record<string, unknown> = {};

    if (type === "youtube" && url) {
      const result = await extractYouTubeTranscript(url);
      extractedText = cleanText(result.text);
      materialTitle = title || result.title;
      metadata = { duration: result.duration, videoId: url };
    } else if (type === "url" && url) {
      const result = await extractWebsiteContent(url);
      extractedText = cleanText(result.text);
      materialTitle = title || result.title;
      metadata = { url };
    } else if (type === "text" && text) {
      extractedText = cleanText(text);
    } else {
      return errorResponse("Invalid input: provide url or text");
    }

    if (!extractedText || extractedText.length < 100) {
      return errorResponse(
        "Could not extract enough content (minimum 100 characters)",
      );
    }

    const result = await execute(
      `INSERT INTO study_materials (user_id, title, type, source_url, content, word_count, status, metadata)
       VALUES (?, ?, ?, ?, ?, ?, 'ready', ?)`,
      [
        auth.userId,
        materialTitle,
        type,
        url || null,
        extractedText,
        wordCount(extractedText),
        JSON.stringify(metadata),
      ],
    );

    await logAIUsage(auth.userId, "process_material", result.insertId);

    return successResponse(
      {
        id: result.insertId,
        title: materialTitle,
        wordCount: wordCount(extractedText),
        type,
      },
      "Material processed successfully",
      201,
    );
  } catch (err: unknown) {
    console.error("Material processing error:", err);
    return errorResponse(
      err instanceof Error ? err.message : "Processing failed",
    );
  }
}

// ─── DELETE material ──────────────────────────────────────────────────────────
export async function DELETE(req: NextRequest) {
  const auth = await verifyRequest(req);
  if (!auth) return unauthorizedResponse();

  const id = req.nextUrl.searchParams.get("id");
  if (!id) return errorResponse("id required");

  const material = await queryOne(
    "SELECT user_id FROM study_materials WHERE id = ?",
    [id],
  );
  if (!material || (material as { userId: number }).userId !== auth.userId) {
    return errorResponse("Not found", 404);
  }

  await execute("DELETE FROM study_materials WHERE id = ?", [id]);
  return successResponse({ deleted: true });
}
