import { NextRequest } from 'next/server';
import { query, queryOne, execute, transaction } from '@/lib/db';
import { verifyRequest, unauthorizedResponse } from '@/lib/auth/jwt';
import { checkSuperAccess, superRequiredResponse, creditLimitResponse, logAIUsage } from '@/lib/ai/guard';
import { successResponse, errorResponse, paginatedResponse } from '@/lib/security';
import { generateFlashcards } from '@/lib/ai/gemini';
import { z } from 'zod';

const generateSchema = z.object({
  materialId: z.number().int().positive().optional(),
  customText: z.string().min(100).max(50000).optional(),
  title: z.string().min(2).max(500),
  count: z.number().int().min(5).max(50).default(20),
  language: z.enum(['english', 'hindi', 'both']).default('english'),
});

// ─── GET user's flashcard decks ───────────────────────────────────────────────
export async function GET(req: NextRequest) {
  const auth = await verifyRequest(req);
  if (!auth) return unauthorizedResponse();

  const { searchParams } = req.nextUrl;
  const page = parseInt(searchParams.get('page') || '1');
  const deckId = searchParams.get('deckId');

  // If deckId provided, return cards for that deck
  if (deckId) {
    const deck = await queryOne('SELECT * FROM flashcard_decks WHERE id = ? AND user_id = ?', [deckId, auth.userId]);
    if (!deck) return errorResponse('Deck not found', 404);
    const cards = await query('SELECT * FROM flashcards WHERE deck_id = ? ORDER BY order_index', [deckId]);
    return successResponse({ deck, cards });
  }

  const limit = 20;
  const offset = (page - 1) * limit;
  const [{ total }] = await query<{ total: number }>(
    'SELECT COUNT(*) as total FROM flashcard_decks WHERE user_id = ?', [auth.userId]
  );
  const decks = await query(
    'SELECT * FROM flashcard_decks WHERE user_id = ? ORDER BY created_at DESC LIMIT ? OFFSET ?',
    [auth.userId, limit, offset]
  );
  return paginatedResponse(decks, total, page, limit);
}

// ─── POST generate new flashcard deck ────────────────────────────────────────
export async function POST(req: NextRequest) {
  const auth = await verifyRequest(req);
  if (!auth) return unauthorizedResponse();

  const access = await checkSuperAccess(req);
  if (!access) return superRequiredResponse();
  if (!access.canUseAI) return creditLimitResponse(access.creditsUsed, access.creditsLimit);

  try {
    const body = await req.json();
    const { materialId, customText, title, count, language } = generateSchema.parse(body);

    let content = customText || '';
    if (materialId) {
      const material = await queryOne<{ content: string; userId: number }>(
        "SELECT content, user_id FROM study_materials WHERE id = ? AND status = 'ready'",
        [materialId]
      );
      if (!material) return errorResponse('Material not found', 404);
      if (material.userId !== auth.userId) return errorResponse('Unauthorized', 403);
      content = material.content;
    }

    if (!content || content.length < 100) return errorResponse('Need at least 100 characters of content');

    // Generate flashcards using Gemini
    const flashcards = await generateFlashcards(content, count, language, title);

    if (!flashcards?.length) return errorResponse('AI failed to generate flashcards. Try with different content.');

    // Save to database
    let deckId!: number;
    await transaction(async (conn) => {
      const [deckResult] = await conn.execute(
        `INSERT INTO flashcard_decks (user_id, material_id, title, card_count, language)
         VALUES (?, ?, ?, ?, ?)`,
        [auth.userId, materialId || null, title, flashcards.length, language]
      );
      deckId = (deckResult as { insertId: number }).insertId;

      for (let i = 0; i < flashcards.length; i++) {
        const card = flashcards[i];
        await conn.execute(
          `INSERT INTO flashcards (deck_id, front, back, front_hindi, back_hindi, hint, difficulty, order_index)
           VALUES (?, ?, ?, ?, ?, ?, ?, ?)`,
          [deckId, card.front, card.back, card.frontHindi || null, card.backHindi || null, card.hint || null, card.difficulty, i]
        );
      }
    });

    await logAIUsage(auth.userId, 'flashcard_gen', materialId);

    return successResponse({
      deckId,
      title,
      cardCount: flashcards.length,
      language,
    }, `${flashcards.length} flashcards created!`, 201);
  } catch (err: unknown) {
    console.error('Flashcard generation error:', err);
    return errorResponse(err instanceof Error ? err.message : 'Generation failed');
  }
}

// ─── DELETE deck ──────────────────────────────────────────────────────────────
export async function DELETE(req: NextRequest) {
  const auth = await verifyRequest(req);
  if (!auth) return unauthorizedResponse();
  const id = req.nextUrl.searchParams.get('id');
  if (!id) return errorResponse('id required');
  const deck = await queryOne<{ userId: number }>('SELECT user_id FROM flashcard_decks WHERE id = ?', [id]);
  if (!deck || deck.userId !== auth.userId) return errorResponse('Not found', 404);
  await execute('DELETE FROM flashcard_decks WHERE id = ?', [id]);
  return successResponse({ deleted: true });
}
