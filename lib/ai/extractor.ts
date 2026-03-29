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
      { signal: AbortSignal.timeout(5000) },
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
  // FIX 1: pdfjs-dist (used internally by pdf-parse) references browser-only
  // globals that don't exist in the Node.js runtime. Polyfill them before loading.
  polyfillNodeDOMGlobals();

  // FIX 2: require('pdf-parse') (the package index.js) calls fs.readFileSync on
  // test PDF files at import time, which can fail or trigger unrelated errors in
  // Next.js. Bypass it by requiring the inner implementation file directly.
  // eslint-disable-next-line @typescript-eslint/no-require-imports
  const pdfParse = require("pdf-parse/lib/pdf-parse.js") as (
    buf: Buffer,
    opts?: Record<string, unknown>,
  ) => Promise<{ text: string; numpages: number }>;

  if (typeof pdfParse !== "function") {
    throw new Error("pdf-parse/lib/pdf-parse.js did not export a function");
  }

  const data = await pdfParse(buffer, {
    // Suppress pdfjs worker warning noise in server logs
    verbosity: 0,
  });

  return {
    text: data.text.replace(/\s{3,}/g, "\n\n").trim(),
    pageCount: data.numpages,
  };
}

/**
 * Polyfills browser-only globals that pdfjs-dist accesses at module load time
 * in a Node.js (server) environment.  We set them on `globalThis` so they are
 * visible to any subsequently required CommonJS module.
 *
 * Only the shapes that pdfjs-dist actually calls are implemented — these are
 * intentionally minimal stubs, not full DOM implementations.
 */
function polyfillNodeDOMGlobals() {
  const g = globalThis as Record<string, unknown>;

  // DOMMatrix — used by pdfjs-dist for canvas transform operations
  if (!g.DOMMatrix) {
    g.DOMMatrix = class DOMMatrix {
      a = 1;
      b = 0;
      c = 0;
      d = 1;
      e = 0;
      f = 0;
      m11 = 1;
      m12 = 0;
      m13 = 0;
      m14 = 0;
      m21 = 0;
      m22 = 1;
      m23 = 0;
      m24 = 0;
      m31 = 0;
      m32 = 0;
      m33 = 1;
      m34 = 0;
      m41 = 0;
      m42 = 0;
      m43 = 0;
      m44 = 1;
      is2D = true;
      isIdentity = true;
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      constructor(_init?: any) {}
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      multiply(_other?: any) {
        return new (g.DOMMatrix as any)();
      }
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      translate(_tx?: number, _ty?: number, _tz?: number): any {
        return new (g.DOMMatrix as any)();
      }
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      scale(_s?: number): any {
        return new (g.DOMMatrix as any)();
      }
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      inverse(): any {
        return new (g.DOMMatrix as any)();
      }
      transformPoint(p?: { x?: number; y?: number }) {
        return { x: p?.x ?? 0, y: p?.y ?? 0, z: 0, w: 1 };
      }
    };
  }

  // DOMPoint — occasionally referenced alongside DOMMatrix
  if (!g.DOMPoint) {
    g.DOMPoint = class DOMPoint {
      x: number;
      y: number;
      z: number;
      w: number;
      constructor(x = 0, y = 0, z = 0, w = 1) {
        this.x = x;
        this.y = y;
        this.z = z;
        this.w = w;
      }
    };
  }

  // ImageData — pdfjs-dist creates ImageData objects for canvas rendering
  if (!g.ImageData) {
    g.ImageData = class ImageData {
      data: Uint8ClampedArray;
      width: number;
      height: number;
      constructor(widthOrData: number | Uint8ClampedArray, height: number) {
        if (typeof widthOrData === "number") {
          this.width = widthOrData;
          this.height = height;
          this.data = new Uint8ClampedArray(widthOrData * height * 4);
        } else {
          this.data = widthOrData;
          this.width = height; // second arg is width when first is array
          this.height = widthOrData.length / height / 4;
        }
      }
    };
  }

  // Path2D — used by some pdfjs-dist canvas rendering paths
  if (!g.Path2D) {
    g.Path2D = class Path2D {
      constructor(_path?: string) {}
      addPath() {}
      closePath() {}
      moveTo() {}
      lineTo() {}
      bezierCurveTo() {}
      quadraticCurveTo() {}
      arc() {}
      arcTo() {}
      ellipse() {}
      rect() {}
    };
  }
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
