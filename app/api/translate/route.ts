import { NextRequest } from 'next/server';
import { translateText } from '@/lib/translate';
import { successResponse, errorResponse } from '@/lib/security';
import { z } from 'zod';

const schema = z.object({
  text: z.string().min(1).max(2000),
  from: z.enum(['en', 'hi']).default('en'),
  to: z.enum(['en', 'hi']).default('hi'),
});

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const { text, from, to } = schema.parse(body);
    const translated = await translateText(text, from, to);
    return successResponse({ translated, from, to });
  } catch (err) {
    return errorResponse('Translation failed');
  }
}
