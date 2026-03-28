// MyMemory Free Translation API — 1000 words/day, no API key needed
// Docs: https://mymemory.translated.net/doc/spec.php

const TRANSLATE_CACHE = new Map<string, string>();

export async function translateText(
  text: string,
  from: 'en' | 'hi' = 'en',
  to: 'en' | 'hi' = 'hi'
): Promise<string> {
  if (!text?.trim() || from === to) return text;

  // Strip HTML tags for translation, preserve them after
  const htmlTagRegex = /<[^>]+>/g;
  const tags: string[] = [];
  let cleanText = text.replace(htmlTagRegex, (tag) => {
    tags.push(tag);
    return `__TAG${tags.length - 1}__`;
  });

  const cacheKey = `${from}:${to}:${cleanText}`;
  if (TRANSLATE_CACHE.has(cacheKey)) return TRANSLATE_CACHE.get(cacheKey)!;

  try {
    const langPair = `${from}|${to}`;
    const url = `https://api.mymemory.translated.net/get?q=${encodeURIComponent(cleanText)}&langpair=${langPair}&de=examkaro@gmail.com`;

    const res = await fetch(url, {
      signal: AbortSignal.timeout(5000),
      headers: { 'User-Agent': 'ExamKaro/1.0' },
    });

    if (!res.ok) throw new Error(`HTTP ${res.status}`);

    const data = await res.json();
    if (data.responseStatus !== 200) throw new Error(data.responseDetails);

    let translated = data.responseData.translatedText || cleanText;

    // Restore HTML tags
    tags.forEach((tag, i) => {
      translated = translated.replace(`__TAG${i}__`, tag);
    });

    TRANSLATE_CACHE.set(cacheKey, translated);
    // Keep cache small
    if (TRANSLATE_CACHE.size > 200) {
      const firstKey = TRANSLATE_CACHE.keys().next().value;
      if (firstKey) TRANSLATE_CACHE.delete(firstKey);
    }

    return translated;
  } catch (err) {
    console.warn('Translation failed:', err);
    return text; // Fallback to original
  }
}

// Batch translate multiple strings
export async function translateBatch(
  texts: string[],
  from: 'en' | 'hi',
  to: 'en' | 'hi'
): Promise<string[]> {
  const results = await Promise.allSettled(
    texts.map(t => translateText(t, from, to))
  );
  return results.map((r, i) => r.status === 'fulfilled' ? r.value : texts[i]);
}
