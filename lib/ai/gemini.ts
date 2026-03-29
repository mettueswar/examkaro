import { GoogleGenAI } from "@google/genai";
import type { GenerateContentConfig, SafetySetting } from "@google/genai";

// ─── Client ───────────────────────────────────────────────────────────────────

const getClient = (): GoogleGenAI => {
  if (!process.env.GEMINI_API_KEY) throw new Error("GEMINI_API_KEY not set");
  return new GoogleGenAI({ apiKey: process.env.GEMINI_API_KEY });
};

// ─── Safety Settings ──────────────────────────────────────────────────────────
// Using string literals as recommended by the new SDK (enums are no longer
// imported from this package — the new @google/genai uses plain strings).

const safetySettings: SafetySetting[] = [
  {
    category: "HARM_CATEGORY_HARASSMENT" as any,
    threshold: "BLOCK_MEDIUM_AND_ABOVE" as any,
  },
  {
    category: "HARM_CATEGORY_HATE_SPEECH" as any,
    threshold: "BLOCK_MEDIUM_AND_ABOVE" as any,
  },
  {
    category: "HARM_CATEGORY_SEXUALLY_EXPLICIT" as any,
    threshold: "BLOCK_MEDIUM_AND_ABOVE" as any,
  },
  {
    category: "HARM_CATEGORY_DANGEROUS_CONTENT" as any,
    threshold: "BLOCK_MEDIUM_AND_ABOVE" as any,
  },
];

// ─── Model config factory ─────────────────────────────────────────────────────

function getConfig(
  overrides?: Partial<GenerateContentConfig>,
): GenerateContentConfig {
  return {
    temperature: 0.7,
    topK: 40,
    topP: 0.95,
    maxOutputTokens: 8192,
    safetySettings,
    ...overrides,
  };
}

// Model IDs — updated to current Gemini 2.5 generation (March 2026)
const MODEL_FAST = "gemini-2.5-flash"; // fast, efficient, great for structured output
const MODEL_PRO = "gemini-2.5-pro"; // higher reasoning, complex tasks

function parseGeminiJSON<T>(text: string): T {
  const cleaned = text
    .replace(/```json\n?/g, "")
    .replace(/```\n?/g, "")
    .trim();
  return JSON.parse(cleaned);
}

// ─── Types ────────────────────────────────────────────────────────────────────

export interface GeneratedFlashcard {
  front: string;
  back: string;
  frontHindi?: string;
  backHindi?: string;
  hint?: string;
  difficulty: "easy" | "medium" | "hard";
}

export interface GeneratedQuizQuestion {
  question: string;
  questionHindi?: string;
  options: Array<{
    id: string;
    text: string;
    textHindi?: string;
    isCorrect: boolean;
  }>;
  explanation: string;
  explanationHindi?: string;
  difficulty: "easy" | "medium" | "hard";
}

// ─── Flashcard Generation ─────────────────────────────────────────────────────

export async function generateFlashcards(
  content: string,
  count = 20,
  language: "english" | "hindi" | "both" = "english",
  topic?: string,
): Promise<GeneratedFlashcard[]> {
  const ai = getClient();
  const truncated = content.slice(0, 15000);
  const withHindi = language !== "english";

  const prompt = `You are an expert educator creating flashcards for Indian competitive exam preparation.

Study material${topic ? ` on "${topic}"` : ""}:
---
${truncated}
---

Create exactly ${count} flashcards. Rules:
- FRONT: clear question or key term
- BACK: concise answer/definition (1-3 sentences)
- Vary difficulty: ~30% easy, ~50% medium, ~20% hard
- Focus on key facts, definitions, formulas, dates important for exams
${withHindi ? "- Include Hindi translations (frontHindi, backHindi)" : ""}

Return ONLY valid JSON, no markdown:
[{"front":"...","back":"...","hint":"...or null","difficulty":"easy|medium|hard"${withHindi ? ',"frontHindi":"...","backHindi":"..."' : ""}}]`;

  const response = await ai.models.generateContent({
    model: MODEL_FAST,
    contents: prompt,
    config: getConfig(),
  });

  return parseGeminiJSON<GeneratedFlashcard[]>(response.text ?? "");
}

// ─── Quiz Generation ──────────────────────────────────────────────────────────

export async function generateQuiz(
  content: string,
  count = 15,
  difficulty: "easy" | "medium" | "hard" | "mixed" = "mixed",
  language: "english" | "hindi" | "both" = "english",
  topic?: string,
): Promise<GeneratedQuizQuestion[]> {
  const ai = getClient();
  const truncated = content.slice(0, 15000);
  const withHindi = language !== "english";

  const prompt = `You are an expert MCQ creator for Indian competitive exams (SSC, Banking, Railways, UPSC).

Study material${topic ? ` on "${topic}"` : ""}:
---
${truncated}
---

Create exactly ${count} MCQ questions. Difficulty: ${difficulty === "mixed" ? "30% easy, 50% medium, 20% hard" : difficulty}.

Rules:
- Exactly 4 options (A, B, C, D), only one correct
- Distractors must be plausible but clearly wrong
- Include brief explanation for correct answer
${withHindi ? "- Include Hindi translations" : ""}

Return ONLY valid JSON, no markdown:
[{"question":"...","options":[{"id":"A","text":"...","isCorrect":false},...,{"id":"B","text":"...","isCorrect":true},...],"explanation":"...","difficulty":"easy|medium|hard"${withHindi ? ',"questionHindi":"...","explanationHindi":"..."' : ""}}]`;

  const response = await ai.models.generateContent({
    model: MODEL_FAST,
    contents: prompt,
    config: getConfig(),
  });

  return parseGeminiJSON<GeneratedQuizQuestion[]>(response.text ?? "");
}

// ─── Summarize ────────────────────────────────────────────────────────────────

export async function summarizeContent(
  content: string,
  maxWords = 300,
): Promise<string> {
  const ai = getClient();

  const response = await ai.models.generateContent({
    model: MODEL_FAST,
    contents: `Summarize in ${maxWords} words for exam prep. Focus on key facts:\n\n${content.slice(0, 20000)}`,
    config: getConfig(),
  });

  return response.text ?? "";
}

// ─── Extract Topics ───────────────────────────────────────────────────────────

export async function extractTopics(content: string): Promise<string[]> {
  const ai = getClient();

  const response = await ai.models.generateContent({
    model: MODEL_FAST,
    contents: `Extract main topics from this content. Return ONLY JSON array (max 8): ["topic1","topic2",...]\n\n${content.slice(0, 5000)}`,
    config: getConfig({ maxOutputTokens: 512 }),
  });

  try {
    return parseGeminiJSON<string[]>(response.text ?? "");
  } catch {
    return [];
  }
}
