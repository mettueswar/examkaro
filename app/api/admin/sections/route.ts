import { NextRequest } from 'next/server';
import { query, queryOne, execute } from '@/lib/db';
import { verifyRequest, unauthorizedResponse, forbiddenResponse } from '@/lib/auth/jwt';
import { successResponse, errorResponse } from '@/lib/security';
import { z } from 'zod';
import type { TestSection } from '@/types';

const sectionSchema = z.object({
  testId: z.number().int().positive(),
  name: z.string().min(1).max(255),
  nameHindi: z.string().max(255).optional(),
  questionCount: z.number().int().min(0).default(0),
  timeLimit: z.number().int().min(0).optional(),
  orderIndex: z.number().int().min(0).default(0),
});

export async function GET(req: NextRequest) {
  const testId = req.nextUrl.searchParams.get('testId');
  if (!testId) return errorResponse('testId required');
  const sections = await query<TestSection>(
    'SELECT * FROM test_sections WHERE test_id = ? ORDER BY order_index',
    [testId]
  );
  return successResponse(sections);
}

export async function POST(req: NextRequest) {
  const auth = await verifyRequest(req);
  if (!auth) return unauthorizedResponse();
  if (auth.role !== 'admin' && auth.role !== 'moderator') return forbiddenResponse();

  try {
    const data = sectionSchema.parse(await req.json());
    const result = await execute(
      `INSERT INTO test_sections (test_id, name, name_hindi, question_count, time_limit, order_index)
       VALUES (?, ?, ?, ?, ?, ?)`,
      [data.testId, data.name, data.nameHindi || null, data.questionCount, data.timeLimit || null, data.orderIndex]
    );
    return successResponse(
      await queryOne<TestSection>('SELECT * FROM test_sections WHERE id = ?', [result.insertId]),
      'Section created', 201
    );
  } catch (err) {
    return errorResponse('Failed to create section');
  }
}

export async function PUT(req: NextRequest) {
  const auth = await verifyRequest(req);
  if (!auth) return unauthorizedResponse();
  if (auth.role !== 'admin' && auth.role !== 'moderator') return forbiddenResponse();

  try {
    const body = await req.json();
    const { id, ...rest } = body;
    if (!id) return errorResponse('Section ID required');
    const data = sectionSchema.partial().parse(rest);

    await execute(
      `UPDATE test_sections SET
         name = COALESCE(?, name), name_hindi = COALESCE(?, name_hindi),
         question_count = COALESCE(?, question_count),
         time_limit = COALESCE(?, time_limit), order_index = COALESCE(?, order_index)
       WHERE id = ?`,
      [data.name, data.nameHindi, data.questionCount, data.timeLimit, data.orderIndex, id]
    );
    return successResponse(await queryOne<TestSection>('SELECT * FROM test_sections WHERE id = ?', [id]));
  } catch (err) {
    return errorResponse('Failed to update section');
  }
}

export async function DELETE(req: NextRequest) {
  const auth = await verifyRequest(req);
  if (!auth) return unauthorizedResponse();
  if (auth.role !== 'admin') return forbiddenResponse();
  const id = req.nextUrl.searchParams.get('id');
  if (!id) return errorResponse('ID required');
  await execute('DELETE FROM test_sections WHERE id = ?', [id]);
  return successResponse({ deleted: true });
}
