import { NextRequest, NextResponse } from "next/server";
import { verifyToken, getTokenFromRequest } from "@/lib/auth/jwt";

// ─── Route Config ─────────────────────────────────────────────────────────────
const PUBLIC_PATHS = [
  "/",
  "/login",
  "/register",
  "/tests",
  "/news",
  "/categories",
  "/about",
  "/contact",
  "/privacy",
  "/terms",
];

const AUTH_PATHS = ["/dashboard", "/profile", "/attempts", "/ai", "/bookmarks"];
const ADMIN_PATHS = ["/admin"];
const API_PUBLIC = [
  "/api/auth",
  "/api/tests",
  "/api/categories",
  "/api/news",
  "/api/packages",
];
const API_ADMIN = ["/api/admin"];

function isPathMatch(pathname: string, patterns: string[]): boolean {
  return patterns.some((p) => pathname === p || pathname.startsWith(p + "/"));
}

export async function proxy(req: NextRequest) {
  const { pathname } = req.nextUrl;

  // ── Static assets & Next internals ─────────────────────────────────────────
  if (
    pathname.startsWith("/_next") ||
    pathname.startsWith("/favicon") ||
    pathname.includes(".") // static files
  ) {
    return NextResponse.next();
  }

  // ── Security Headers ────────────────────────────────────────────────────────
  const response = NextResponse.next();
  response.headers.set("X-Content-Type-Options", "nosniff");
  response.headers.set("X-Frame-Options", "SAMEORIGIN");
  response.headers.set("Referrer-Policy", "strict-origin-when-cross-origin");
  response.headers.set(
    "Permissions-Policy",
    "camera=(), microphone=(), geolocation=()",
  );

  // ── Rate limiting hint header for API routes ────────────────────────────────
  if (pathname.startsWith("/api/")) {
    const ip =
      req.headers.get("x-forwarded-for")?.split(",")[0] ??
      req.headers.get("x-real-ip") ??
      "unknown";
    response.headers.set("X-Client-IP", ip);
  }

  const token = getTokenFromRequest(req);
  const auth = token ? await verifyToken(token) : null;

  // ── Admin routes ────────────────────────────────────────────────────────────
  if (isPathMatch(pathname, ADMIN_PATHS) || isPathMatch(pathname, API_ADMIN)) {
    if (!auth) {
      return NextResponse.redirect(
        new URL("/login?redirect=" + pathname, req.url),
      );
    }
    if (auth.role !== "admin" && auth.role !== "moderator") {
      return NextResponse.redirect(new URL("/?error=forbidden", req.url));
    }
    return response;
  }

  // ── Authenticated routes ────────────────────────────────────────────────────
  if (isPathMatch(pathname, AUTH_PATHS)) {
    if (!auth) {
      return NextResponse.redirect(
        new URL("/login?redirect=" + pathname, req.url),
      );
    }
    return response;
  }

  // ── API auth guard ─────────────────────────────────────────────────────────
  if (pathname.startsWith("/api/") && !isPathMatch(pathname, API_PUBLIC)) {
    if (!auth) {
      return NextResponse.json(
        { success: false, error: "Unauthorized" },
        { status: 401 },
      );
    }
  }

  // ── Redirect logged-in users away from auth pages ──────────────────────────
  if (auth && (pathname === "/login" || pathname === "/register")) {
    return NextResponse.redirect(new URL("/dashboard", req.url));
  }

  return response;
}

export const config = {
  matcher: ["/((?!_next/static|_next/image|favicon.ico).*)"],
};
