import { GoogleGenerativeAI, HarmCategory, HarmBlockThreshold } from '@google/generative-ai';

const getClient = () => {
  if (!process.env.GEMINI_API_KEY) throw new Error('GEMINI_API_KEY not set');
  return new GoogleGenerativeAI(process.env.GEMINI_API_KEY);
};

const safetySettings = [
  { category: HarmCategory.HARM_CATEGORY_HARASSMENT,        threshold: HarmBlockThreshold.BLOCK_MEDIUM_AND_ABOVE },
  { category: HarmCategory.HARM_CATEGORY_HATE_SPEECH,       threshold: HarmBlockThreshold.BLOCK_MEDIUM_AND_ABOVE },
  { category: HarmCategory.HARM_CATEGORY_SEXUALLY_EXPLICIT, threshold: HarmBlockThreshold.BLOCK_MEDIUM_AND_ABOVE },
  { category: HarmCategory.HARM_CATEGORY_DANGEROUS_CONTENT, threshold: HarmBlockThreshold.BLOCK_MEDIUM_AND_ABOVE },
];

function getModel(fast = true) {
  return getClient().getGenerativeModel({
    model: fast ? 'gemini-1.5-flash' : 'gemini-1.5-pro',
    safetySettings,
    generationConfig: { temperature: 0.7, topK: 40, topP: 0.95, maxOutputTokens: 8192 },
  });
}

function parseGeminiJSON<T>(text: string): T {
  const cleaned = text.replace(/```json\n?/g, '').replace(/```\n?/g, '').trim();
  return JSON.parse(cleaned);
}

export interface GeneratedFlashcard {
  front: string; back: string;
  frontHindi?: string; backHindi?: string;
  hint?: string; difficulty: 'easy' | 'medium' | 'hard';
}

export interface GeneratedQuizQuestion {
  question: string; questionHindi?: string;
  options: Array<{ id: string; text: string; textHindi?: string; isCorrect: boolean }>;
  explanation: string; explanationHindi?: string;
  difficulty: 'easy' | 'medium' | 'hard';
}

// ─── Flashcard Generation ─────────────────────────────────────────────────────
export async function generateFlashcards(
  content: string,
  count = 20,
  language: 'english' | 'hindi' | 'both' = 'english',
  topic?: string
): Promise<GeneratedFlashcard[]> {
  const model = getModel(true);
  const truncated = content.slice(0, 15000);
  const withHindi = language !== 'english';
  const lang = language === 'hindi' ? 'Hindi' : 'English';

  const prompt = `You are an expert educator creating flashcards for Indian competitive exam preparation.

Study material${topic ? ` on "${topic}"` : ''}:
---
${truncated}
---

Create exactly ${count} flashcards. Rules:
- FRONT: clear question or key term
- BACK: concise answer/definition (1-3 sentences)
- Vary difficulty: ~30% easy, ~50% medium, ~20% hard
- Focus on key facts, definitions, formulas, dates important for exams
${withHindi ? '- Include Hindi translations (frontHindi, backHindi)' : ''}

Return ONLY valid JSON, no markdown:
[{"front":"...","back":"...","hint":"...or null","difficulty":"easy|medium|hard"${withHindi ? ',"frontHindi":"...","backHindi":"..."' : ''}}]`;

  const result = await model.generateContent(prompt);
  return parseGeminiJSON<GeneratedFlashcard[]>(result.response.text());
}

// ─── Quiz Generation ──────────────────────────────────────────────────────────
export async function generateQuiz(
  content: string,
  count = 15,
  difficulty: 'easy' | 'medium' | 'hard' | 'mixed' = 'mixed',
  language: 'english' | 'hindi' | 'both' = 'english',
  topic?: string
): Promise<GeneratedQuizQuestion[]> {
  const model = getModel(true);
  const truncated = content.slice(0, 15000);
  const withHindi = language !== 'english';

  const prompt = `You are an expert MCQ creator for Indian competitive exams (SSC, Banking, Railways, UPSC).

Study material${topic ? ` on "${topic}"` : ''}:
---
${truncated}
---

Create exactly ${count} MCQ questions. Difficulty: ${difficulty === 'mixed' ? '30% easy, 50% medium, 20% hard' : difficulty}.

Rules:
- Exactly 4 options (A, B, C, D), only one correct
- Distractors must be plausible but clearly wrong
- Include brief explanation for correct answer
${withHindi ? '- Include Hindi translations' : ''}

Return ONLY valid JSON, no markdown:
[{"question":"...","options":[{"id":"A","text":"...","isCorrect":false},...,{"id":"B","text":"...","isCorrect":true},...],"explanation":"...","difficulty":"easy|medium|hard"${withHindi ? ',"questionHindi":"...","explanationHindi":"..."' : ''}}]`;

  const result = await model.generateContent(prompt);
  return parseGeminiJSON<GeneratedQuizQuestion[]>(result.response.text());
}

// ─── Summarize ────────────────────────────────────────────────────────────────
export async function summarizeContent(content: string, maxWords = 300): Promise<string> {
  const model = getModel(true);
  const result = await model.generateContent(
    `Summarize in ${maxWords} words for exam prep. Focus on key facts:\n\n${content.slice(0, 20000)}`
  );
  return result.response.text();
}

// ─── Extract topics ───────────────────────────────────────────────────────────
export async function extractTopics(content: string): Promise<string[]> {
  const model = getModel(true);
  const result = await model.generateContent(
    `Extract main topics from this content. Return ONLY JSON array (max 8): ["topic1","topic2",...]\n\n${content.slice(0, 5000)}`
  );
  try { return parseGeminiJSON<string[]>(result.response.text()); }
  catch { return []; }
}
