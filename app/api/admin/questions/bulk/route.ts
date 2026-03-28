import { NextRequest } from 'next/server';
import { execute, queryOne } from '@/lib/db';
import { verifyRequest, unauthorizedResponse, forbiddenResponse } from '@/lib/auth/jwt';
import { successResponse, errorResponse } from '@/lib/security';
import type { MockTest } from '@/types';

/**
 * Bulk import questions from CSV.
 * CSV format (header row required):
 * text,text_hindi,option_a,option_b,option_c,option_d,correct,explanation,explanation_hindi,marks,negative_marks,difficulty
 * 
 * correct = A|B|C|D
 * difficulty = easy|medium|hard
 */
export async function POST(req: NextRequest) {
  const auth = await verifyRequest(req);
  if (!auth) return unauthorizedResponse();
  if (auth.role !== 'admin' && auth.role !== 'moderator') return forbiddenResponse();

  try {
    const formData = await req.formData();
    const file = formData.get('file') as File | null;
    const testId = formData.get('testId');

    if (!file) return errorResponse('CSV file required');
    if (!testId) return errorResponse('testId required');

    const test = await queryOne<MockTest>('SELECT id FROM mock_tests WHERE id = ?', [testId]);
    if (!test) return errorResponse('Test not found', 404);

    const text = await file.text();
    const lines = text.split('\n').map(l => l.trim()).filter(Boolean);
    if (lines.length < 2) return errorResponse('CSV must have header + at least 1 data row');

    const headers = lines[0].split(',').map(h => h.trim().toLowerCase());
    const requiredCols = ['text', 'option_a', 'option_b', 'option_c', 'option_d', 'correct'];
    const missing = requiredCols.filter(c => !headers.includes(c));
    if (missing.length) return errorResponse(`Missing CSV columns: ${missing.join(', ')}`);

    const col = (row: string[], name: string) => {
      const idx = headers.indexOf(name);
      return idx >= 0 ? row[idx]?.trim() || '' : '';
    };

    let imported = 0;
    const errors: string[] = [];

    // Get current max order_index for this test
    const [{ maxIdx }] = await import('@/lib/db').then(m =>
      m.query<{ maxIdx: number }>('SELECT COALESCE(MAX(order_index), -1) as max_idx FROM questions WHERE test_id = ?', [testId])
    );
    let orderIndex = (maxIdx ?? -1) + 1;

    for (let i = 1; i < lines.length; i++) {
      try {
        // Handle commas inside quotes
        const row = parseCSVLine(lines[i]);
        const questionText = col(row, 'text');
        if (!questionText) continue;

        const correct = col(row, 'correct').toUpperCase();
        if (!['A', 'B', 'C', 'D'].includes(correct)) {
          errors.push(`Row ${i + 1}: Invalid correct answer "${correct}". Must be A, B, C, or D.`);
          continue;
        }

        const options = [
          { id: 'A', text: col(row, 'option_a'), isCorrect: correct === 'A' },
          { id: 'B', text: col(row, 'option_b'), isCorrect: correct === 'B' },
          { id: 'C', text: col(row, 'option_c'), isCorrect: correct === 'C' },
          { id: 'D', text: col(row, 'option_d'), isCorrect: correct === 'D' },
        ];

        if (options.some(o => !o.text)) {
          errors.push(`Row ${i + 1}: All four options (A, B, C, D) are required.`);
          continue;
        }

        const marks = parseFloat(col(row, 'marks') || '1') || 1;
        const negativeMarks = parseFloat(col(row, 'negative_marks') || '0.25') || 0.25;
        const difficulty = ['easy', 'medium', 'hard'].includes(col(row, 'difficulty'))
          ? col(row, 'difficulty') : 'medium';

        await execute(
          `INSERT INTO questions
             (test_id, text, text_hindi, type, options, explanation, explanation_hindi,
              marks, negative_marks, difficulty, order_index, is_active)
           VALUES (?, ?, ?, 'mcq', ?, ?, ?, ?, ?, ?, ?, 1)`,
          [
            testId,
            questionText,
            col(row, 'text_hindi') || null,
            JSON.stringify(options),
            col(row, 'explanation') || null,
            col(row, 'explanation_hindi') || null,
            marks, negativeMarks, difficulty, orderIndex++,
          ]
        );
        imported++;
      } catch (rowErr) {
        errors.push(`Row ${i + 1}: ${rowErr instanceof Error ? rowErr.message : 'Parse error'}`);
      }
    }

    // Update test question count
    await execute(
      'UPDATE mock_tests SET total_questions = (SELECT COUNT(*) FROM questions WHERE test_id = ? AND is_active = 1) WHERE id = ?',
      [testId, testId]
    );

    return successResponse({
      imported,
      errors,
      total: lines.length - 1,
    }, `Imported ${imported} questions${errors.length ? ` (${errors.length} errors)` : ''}`);
  } catch (err) {
    console.error('Bulk import error:', err);
    return errorResponse('Import failed');
  }
}

function parseCSVLine(line: string): string[] {
  const result: string[] = [];
  let current = '';
  let inQuotes = false;

  for (let i = 0; i < line.length; i++) {
    const char = line[i];
    if (char === '"') {
      if (inQuotes && line[i + 1] === '"') {
        current += '"';
        i++;
      } else {
        inQuotes = !inQuotes;
      }
    } else if (char === ',' && !inQuotes) {
      result.push(current.trim());
      current = '';
    } else {
      current += char;
    }
  }
  result.push(current.trim());
  return result;
}
