import { NextRequest } from "next/server";
import { query, queryOne, execute, transaction } from "@/lib/db";
import { verifyRequest, unauthorizedResponse } from "@/lib/auth/jwt";
import { startAttemptSchema, submitAttemptSchema } from "@/lib/validations";
import { successResponse, errorResponse } from "@/lib/security";
import type { MockTest, Question, TestAttempt, QuestionAttempt } from "@/types";

// ─── Start Attempt ─────────────────────────────────────────────────────────
export async function POST(req: NextRequest) {
  const auth = await verifyRequest(req);
  if (!auth) return unauthorizedResponse();

  try {
    const body = await req.json();
    const { testId, language } = startAttemptSchema.parse(body);

    const test = await queryOne<MockTest>(
      "SELECT * FROM mock_tests WHERE id = ? AND is_active = 1",
      [testId],
    );
    if (!test) return errorResponse("Test not found", 404);

    if (test.type === "premium") {
      const { hasFullPremiumPlan } = await import("@/lib/package-test-shared");
      const { userCanAccessPremiumTestViaPackage } =
        await import("@/lib/package-test-access");
      if (!hasFullPremiumPlan(auth.plan)) {
        const ok = await userCanAccessPremiumTestViaPackage(
          auth.userId,
          testId,
        );
        if (!ok)
          return errorResponse(
            "Upgrade or purchase a package to access this test",
            403,
          );
      }
    }

    // Check for existing in-progress attempt
    const existing = await queryOne<TestAttempt>(
      `SELECT * FROM test_attempts WHERE user_id = ? AND test_id = ? AND status = 'in_progress'`,
      [auth.userId, testId],
    );

    if (existing) {
      const questions = await query<Question>(
        `SELECT id, test_id, section_id, subject, text, text_hindi, type, options, image,
                marks, negative_marks, difficulty, order_index
         FROM questions WHERE test_id = ? AND is_active = 1 ORDER BY order_index`,
        [testId],
      );
      return successResponse({ attempt: existing, questions, resumed: true });
    }

    // Create new attempt
    const result = await execute(
      `INSERT INTO test_attempts (user_id, test_id, answers, start_time, status, language)
       VALUES (?, ?, '{}', NOW(), 'in_progress', ?)`,
      [auth.userId, testId, language],
    );

    await execute(
      "UPDATE mock_tests SET attempt_count = attempt_count + 1 WHERE id = ?",
      [testId],
    );

    const attempt = await queryOne<TestAttempt>(
      "SELECT * FROM test_attempts WHERE id = ?",
      [result.insertId],
    );

    const questionsClean = await query<Question>(
      `SELECT id, test_id, section_id, subject, text, text_hindi, type,
              options, image, marks, negative_marks, difficulty, order_index
       FROM questions WHERE test_id = ? AND is_active = 1 ORDER BY order_index`,
      [testId],
    );

    const sanitized = questionsClean.map((q: Question) => ({
      ...q,
      options: (q.options as Question["options"]).map((o) => ({
        id: o.id,
        text: o.text,
        textHindi: o.textHindi,
        image: o.image,
      })),
    }));

    return successResponse({ attempt, questions: sanitized, resumed: false });
  } catch (err) {
    console.error("Start attempt error:", err);
    return errorResponse("Failed to start test");
  }
}

// ─── Submit Attempt ────────────────────────────────────────────────────────
export async function PUT(req: NextRequest) {
  const auth = await verifyRequest(req);
  if (!auth) return unauthorizedResponse();

  try {
    const body = await req.json();
    const { attemptId } = submitAttemptSchema.parse(body);

    // FIX: Check if already submitted (idempotent submit)
    const alreadySubmitted = await queryOne<TestAttempt>(
      `SELECT * FROM test_attempts WHERE id = ? AND user_id = ? AND status = 'submitted'`,
      [attemptId, auth.userId],
    );
    if (alreadySubmitted) {
      return successResponse({
        attempt: alreadySubmitted,
        score: alreadySubmitted.score ?? 0,
        correct: alreadySubmitted.correct ?? 0,
        incorrect: alreadySubmitted.incorrect ?? 0,
        skipped: alreadySubmitted.skipped ?? 0,
      });
    }

    const attempt = await queryOne<TestAttempt & { answers_raw: string }>(
      `SELECT * FROM test_attempts WHERE id = ? AND user_id = ? AND status = 'in_progress'`,
      [attemptId, auth.userId],
    );
    if (!attempt) return errorResponse("Attempt not found", 404);

    const test = await queryOne<MockTest>(
      "SELECT * FROM mock_tests WHERE id = ?",
      [attempt.testId],
    );
    if (!test) return errorResponse("Test not found", 404);

    const questions = await query<Question>(
      "SELECT * FROM questions WHERE test_id = ? AND is_active = 1",
      [attempt.testId],
    );

    const answers: Record<number, QuestionAttempt> =
      typeof attempt.answers === "string"
        ? JSON.parse(attempt.answers)
        : attempt.answers;

    let score = 0,
      correct = 0,
      incorrect = 0,
      skipped = 0;

    for (const q of questions) {
      const ans = answers[q.id];
      if (
        !ans ||
        !ans.selectedOption ||
        ans.status === "not_visited" ||
        ans.status === "not_answered"
      ) {
        skipped++;
        continue;
      }
      const correctOption = q.options.find((o) => o.isCorrect);
      if (ans.selectedOption === correctOption?.id) {
        score += q.marks;
        correct++;
      } else {
        score -= q.negativeMarks;
        incorrect++;
      }
    }

    const timeTaken = Math.floor(
      (Date.now() - new Date(attempt.startTime).getTime()) / 1000,
    );

    // FIX: Delete any prior submitted attempts for same user+test BEFORE updating,
    // to avoid the UNIQUE constraint on (user_id, test_id, status)
    await execute(
      `DELETE FROM test_attempts WHERE user_id = ? AND test_id = ? AND status = 'submitted' AND id != ?`,
      [auth.userId, attempt.testId, attemptId],
    );

    await transaction(async (conn) => {
      await conn.execute(
        `UPDATE test_attempts SET
           status = 'submitted', submitted_at = NOW(), end_time = NOW(),
           score = ?, total_marks = ?, correct = ?, incorrect = ?, skipped = ?, time_taken = ?
         WHERE id = ?`,
        [
          Math.max(0, score),
          test.totalMarks,
          correct,
          incorrect,
          skipped,
          timeTaken,
          attemptId,
        ],
      );
    });

    const updated = await queryOne<TestAttempt>(
      "SELECT * FROM test_attempts WHERE id = ?",
      [attemptId],
    );

    return successResponse({
      attempt: updated,
      score: Math.max(0, score),
      correct,
      incorrect,
      skipped,
    });
  } catch (err) {
    console.error("Submit attempt error:", err);
    return errorResponse("Failed to submit test");
  }
}
