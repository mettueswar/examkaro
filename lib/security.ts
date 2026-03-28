import { NextRequest, NextResponse } from 'next/server';

// ─── In-memory rate limiter (use Redis in production) ─────────────────────────
const rateLimitMap = new Map<string, { count: number; resetAt: number }>();

interface RateLimitOptions {
  windowMs?: number;
  maxRequests?: number;
}

export function rateLimit(options: RateLimitOptions = {}) {
  const { windowMs = 60_000, maxRequests = 60 } = options;

  return function check(identifier: string): { success: boolean; remaining: number; resetAt: number } {
    const now = Date.now();
    const entry = rateLimitMap.get(identifier);

    if (!entry || now > entry.resetAt) {
      const resetAt = now + windowMs;
      rateLimitMap.set(identifier, { count: 1, resetAt });
      return { success: true, remaining: maxRequests - 1, resetAt };
    }

    if (entry.count >= maxRequests) {
      return { success: false, remaining: 0, resetAt: entry.resetAt };
    }

    entry.count++;
    return { success: true, remaining: maxRequests - entry.count, resetAt: entry.resetAt };
  };
}

// Cleanup old entries periodically
setInterval(() => {
  const now = Date.now();
  rateLimitMap.forEach((v, k) => {
    if (now > v.resetAt) rateLimitMap.delete(k);
  });
}, 60_000);

// ─── Predefined limiters ──────────────────────────────────────────────────────
export const authLimiter = rateLimit({ windowMs: 15 * 60_000, maxRequests: 10 });
export const apiLimiter = rateLimit({ windowMs: 60_000, maxRequests: 100 });
export const uploadLimiter = rateLimit({ windowMs: 60_000, maxRequests: 10 });

// ─── Helper to apply rate limit in route handlers ─────────────────────────────
export function applyRateLimit(
  req: NextRequest,
  limiter: ReturnType<typeof rateLimit>
): NextResponse | null {
  const ip =
    req.headers.get('x-forwarded-for')?.split(',')[0] ??
    req.headers.get('x-real-ip') ??
    'unknown';

  const result = limiter(ip);

  if (!result.success) {
    return NextResponse.json(
      { success: false, error: 'Too many requests. Please try again later.' },
      {
        status: 429,
        headers: {
          'X-RateLimit-Remaining': '0',
          'X-RateLimit-Reset': String(Math.ceil(result.resetAt / 1000)),
          'Retry-After': String(Math.ceil((result.resetAt - Date.now()) / 1000)),
        },
      }
    );
  }

  return null;
}

// ─── CSRF protection ─────────────────────────────────────────────────────────
export function validateOrigin(req: NextRequest): boolean {
  const origin = req.headers.get('origin');
  const allowedOrigins = [
    'https://examkaro.com',
    'https://www.examkaro.com',
    'http://localhost:3000',
  ];
  if (!origin) return true; // same-origin requests don't have origin header
  return allowedOrigins.includes(origin);
}

// ─── Sanitize HTML ────────────────────────────────────────────────────────────
export function sanitizeText(input: string): string {
  return input
    .replace(/[<>]/g, (char) => ({ '<': '&lt;', '>': '&gt;' }[char] || char))
    .trim();
}

// ─── CDN URL helper ───────────────────────────────────────────────────────────
export function getCdnUrl(path: string): string {
  const base = process.env.NEXT_PUBLIC_CDN_URL || 'https://cdn.examkaro.com/uploads';
  return `${base}/${path.replace(/^\//, '')}`;
}

// ─── Slug generator ───────────────────────────────────────────────────────────
export function generateSlug(text: string): string {
  return text
    .toLowerCase()
    .replace(/[^\w\s-]/g, '')
    .replace(/[\s_]+/g, '-')
    .replace(/^-+|-+$/g, '')
    .slice(0, 200);
}

// ─── API Response helpers ─────────────────────────────────────────────────────
export function successResponse<T>(data: T, message?: string, status = 200) {
  return NextResponse.json({ success: true, data, message }, { status });
}

export function errorResponse(error: string, status = 400) {
  return NextResponse.json({ success: false, error }, { status });
}

export function paginatedResponse<T>(
  data: T[],
  total: number,
  page: number,
  limit: number
) {
  return NextResponse.json({
    success: true,
    data,
    pagination: {
      page,
      limit,
      total,
      totalPages: Math.ceil(total / limit),
    },
  });
}
