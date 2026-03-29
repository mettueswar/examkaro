import { NextRequest } from "next/server";
import { execute } from "@/lib/db";
import { verifyRequest, unauthorizedResponse } from "@/lib/auth/jwt";
import {
  checkSuperAccess,
  superRequiredResponse,
  logAIUsage,
} from "@/lib/ai/guard";
import { successResponse, errorResponse } from "@/lib/security";
import {
  extractPDFContent,
  extractDOCXContent,
  cleanText,
  wordCount,
} from "@/lib/ai/extractor";
import { adminStorage } from "@/lib/firebase/admin";
import { nanoid } from "nanoid";

const MAX_SIZE = 20 * 1024 * 1024; // 20MB

export async function POST(req: NextRequest) {
  const auth = await verifyRequest(req);
  if (!auth) return unauthorizedResponse();

  const access = await checkSuperAccess(req);
  if (!access) return superRequiredResponse();

  try {
    const formData = await req.formData();
    const file = formData.get("file") as File | null;
    const title = formData.get("title") as string | null;

    if (!file) return errorResponse("No file provided");
    if (file.size > MAX_SIZE)
      return errorResponse("File too large. Maximum 20MB");

    const isDocx =
      file.type ===
        "application/vnd.openxmlformats-officedocument.wordprocessingml.document" ||
      file.name.endsWith(".docx");
    const isPDF = file.type === "application/pdf" || file.name.endsWith(".pdf");

    if (!isPDF && !isDocx) {
      return errorResponse("Only PDF and DOCX files are supported");
    }

    const buffer = Buffer.from(await file.arrayBuffer());
    let extractedText = "";
    let metadata: Record<string, unknown> = {};

    if (isPDF) {
      const result = await extractPDFContent(buffer);
      extractedText = cleanText(result.text);
      metadata = { pageCount: result.pageCount, fileSize: file.size };
    } else {
      const result = await extractDOCXContent(buffer);
      extractedText = cleanText(result.text);
      metadata = { fileSize: file.size };
    }

    if (!extractedText || extractedText.length < 100) {
      return errorResponse(
        "Could not extract readable text from file. Ensure the file is not image-only.",
      );
    }

    // Upload file to Firebase Storage for reference
    const ext = isPDF ? "pdf" : "docx";
    const filename = `materials/${auth.userId}/${nanoid(12)}.${ext}`;
    const bucket = adminStorage.bucket();
    const fileRef = bucket.file(filename);
    await fileRef.save(buffer, { metadata: { contentType: file.type } });

    const materialTitle =
      title || file.name.replace(/\.(pdf|docx)$/i, "") || "Study Material";

    // FIX: INSERT used "type" column which doesn't exist — schema column is "source_type"
    const result = await execute(
      `INSERT INTO study_materials (user_id, title, source_type, file_path, content, word_count, status, metadata)
       VALUES (?, ?, ?, ?, ?, ?, 'ready', ?)`,
      [
        auth.userId,
        materialTitle,
        isPDF ? "pdf" : "docx", // value for source_type ENUM
        filename,
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
        type: isPDF ? "pdf" : "docx",
        wordCount: wordCount(extractedText),
        pageCount: (metadata.pageCount as number) || null,
      },
      "File processed successfully",
      201,
    );
  } catch (err: unknown) {
    console.error("File upload error:", err);
    return errorResponse(
      err instanceof Error ? err.message : "File processing failed",
    );
  }
}
