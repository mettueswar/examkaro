import { YoutubeTranscript } from "youtube-transcript";

// ─── YouTube transcript extractor ─────────────────────────────────────────────
export async function extractYouTubeTranscript(
  url: string,
): Promise<{ text: string; title: string; duration?: number }> {
  const videoId = extractYouTubeId(url);
  if (!videoId) throw new Error("Invalid YouTube URL");

  const transcriptItems = await YoutubeTranscript.fetchTranscript(videoId, {
    lang: "en",
  }).catch(() => YoutubeTranscript.fetchTranscript(videoId, { lang: "hi" }));

  const text = transcriptItems
    .map((item) => item.text)
    .join(" ")
    .replace(/\[.*?\]/g, "")
    .trim();

  const duration =
    transcriptItems.length > 0
      ? Math.ceil(
          (transcriptItems[transcriptItems.length - 1].offset +
            transcriptItems[transcriptItems.length - 1].duration) /
            1000,
        )
      : undefined;

  let title = `YouTube Video (${videoId})`;
  try {
    const res = await fetch(
      `https://www.youtube.com/oembed?url=https://youtu.be/${videoId}&format=json`,
      {
        signal: AbortSignal.timeout(5000),
      },
    );
    if (res.ok) {
      const data = await res.json();
      title = data.title || title;
    }
  } catch {
    /* ignore */
  }

  return { text, title, duration };
}

function extractYouTubeId(url: string): string | null {
  const patterns = [
    /(?:youtube\.com\/watch\?v=|youtu\.be\/|youtube\.com\/embed\/)([a-zA-Z0-9_-]{11})/,
    /youtube\.com\/shorts\/([a-zA-Z0-9_-]{11})/,
  ];
  for (const p of patterns) {
    const m = url.match(p);
    if (m) return m[1];
  }
  return null;
}

// ─── Website URL extractor ─────────────────────────────────────────────────────
export async function extractWebsiteContent(
  url: string,
): Promise<{ text: string; title: string }> {
  if (!url.startsWith("http")) throw new Error("Invalid URL");

  const res = await fetch(url, {
    headers: {
      "User-Agent":
        "Mozilla/5.0 (compatible; ExamKaro/1.0; +https://examkaro.com)",
      Accept: "text/html,application/xhtml+xml,application/xml",
    },
    signal: AbortSignal.timeout(10000),
  });

  if (!res.ok) throw new Error(`Failed to fetch URL: HTTP ${res.status}`);
  const contentType = res.headers.get("content-type") || "";
  if (!contentType.includes("text/html"))
    throw new Error("URL must point to an HTML page");

  const html = await res.text();

  const title = (
    html.match(/<title[^>]*>([^<]+)<\/title>/i)?.[1] || "Web Page"
  ).trim();

  const cleaned = html
    .replace(/<script[\s\S]*?<\/script>/gi, "")
    .replace(/<style[\s\S]*?<\/style>/gi, "")
    .replace(/<nav[\s\S]*?<\/nav>/gi, "")
    .replace(/<footer[\s\S]*?<\/footer>/gi, "")
    .replace(/<header[\s\S]*?<\/header>/gi, "")
    .replace(/<[^>]+>/g, " ")
    .replace(/&nbsp;/g, " ")
    .replace(/&amp;/g, "&")
    .replace(/&lt;/g, "<")
    .replace(/&gt;/g, ">")
    .replace(/&quot;/g, '"')
    .replace(/\s{2,}/g, " ")
    .trim();

  if (cleaned.length < 100)
    throw new Error("Could not extract meaningful content from this URL");

  return { text: cleaned.slice(0, 50000), title };
}

// ─── PDF extractor (server-side only) ────────────────────────────────────────
export async function extractPDFContent(
  buffer: Buffer,
): Promise<{ text: string; pageCount: number }> {
  // FIX: pdf-parse may export as CommonJS module; handle both default and named exports
  let pdfParse: (buffer: Buffer) => Promise<{ text: string; numpages: number }>;
  try {
    // eslint-disable-next-line @typescript-eslint/no-require-imports
    pdfParse = require("pdf-parse");
    // Some versions wrap it in a .default
    if (
      typeof pdfParse !== "function" &&
      (pdfParse as unknown as { default: typeof pdfParse }).default
    ) {
      pdfParse = (pdfParse as unknown as { default: typeof pdfParse }).default;
    }
  } catch {
    const mod = await import("pdf-parse");
    pdfParse = (mod.default ?? mod) as unknown as typeof pdfParse;
  }

  if (typeof pdfParse !== "function") {
    throw new Error("pdf-parse module could not be loaded as a function");
  }

  const data = await pdfParse(buffer);
  return {
    text: data.text.replace(/\s{3,}/g, "\n\n").trim(),
    pageCount: data.numpages,
  };
}

// ─── DOCX extractor (server-side only) ───────────────────────────────────────
export async function extractDOCXContent(
  buffer: Buffer,
): Promise<{ text: string }> {
  const mammoth = await import("mammoth");
  const result = await mammoth.extractRawText({ buffer });
  return { text: result.value.trim() };
}

// ─── Plain text cleaner ───────────────────────────────────────────────────────
export function cleanText(text: string): string {
  return text
    .replace(/\r\n/g, "\n")
    .replace(/\n{3,}/g, "\n\n")
    .replace(/[ \t]{2,}/g, " ")
    .trim();
}

// ─── Word count ───────────────────────────────────────────────────────────────
export function wordCount(text: string): number {
  return text.split(/\s+/).filter(Boolean).length;
}
