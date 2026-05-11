import { getSessionCookie } from "better-auth/cookies";
import { type NextRequest, NextResponse } from "next/server";
import { RateLimitedError, UnauthorizedError } from "./server/errors";

/**
 * Handles cheap cross cutting concerns: request IDs, cookie auth gate,
 * rate limiting (TODO), security headers. Cookie checks here are defense
 * in depth only - route handlers still call requireUser() for the real DB check.
 */

/**
 * A step returns a `Response` to short-circuit (e.g. 401 from the auth gate)
 * or `undefined` to continue the chain.
 */
type ProxyStepResult = Response | undefined;
type ProxyStep = (
  req: NextRequest,
  res: NextResponse,
) => ProxyStepResult | Promise<ProxyStepResult>;

const RATE_LIMIT_WINDOW_MS = 60_000;
const RATE_LIMIT_MAX_REQUESTS = 30;
const rateLimitBuckets = new Map<string, { count: number; resetAt: number }>();

// --- Security Headers -------------------------------------------------------

/** Content-Security-Policy configuration. */
const CSP_DIRECTIVES: Record<string, string> = {
  "default-src": "'self'",
  "script-src": "'self' 'unsafe-inline' 'unsafe-eval'",
  "style-src": "'self' 'unsafe-inline'",
  "img-src": "'self' data: blob: https:",
  "font-src": "'self'",
  "connect-src": "'self' ws: localhost:*",
  "media-src": "'self'",
  "object-src": "'none'",
  "child-src": "'none'",
  "frame-src": "'none'",
  "frame-ancestors": "'none'",
  "form-action": "'self'",
  "base-uri": "'self'",
  "manifest-src": "'self'",
  "worker-src": "'self' blob:",
  "upgrade-insecure-requests": "",
};

function buildCsp(): string {
  return Object.entries(CSP_DIRECTIVES)
    .map(([directive, value]) => (value ? `${directive} ${value}` : directive))
    .join("; ");
}

const SECURITY_HEADERS: Record<string, string> = {
  "X-Content-Type-Options": "nosniff",
  "X-Frame-Options": "DENY",
  "X-XSS-Protection": "0",
  "Strict-Transport-Security": "max-age=63072000; includeSubDomains; preload",
  "Referrer-Policy": "strict-origin-when-cross-origin",
  "Permissions-Policy": [
    "camera=()",
    "microphone=()",
    "geolocation=()",
    "interest-cohort=()",
    "payment=()",
    "usb=()",
  ].join(", "),
  "X-DNS-Prefetch-Control": "on",
  "X-Permitted-Cross-Domain-Policies": "none",
  "Content-Security-Policy": buildCsp(),
};

/** Attach all security headers to an outgoing NextResponse */
function applySecurityHeaders(response: NextResponse): NextResponse {
  for (const [key, value] of Object.entries(SECURITY_HEADERS)) {
    response.headers.set(key, value);
  }
  return response;
}

// --- Steps ------------------------------------------------------------------

/** Attach an x-request-id header for log correlation. */
const withRequestId: ProxyStep = (req, res) => {
  const id = req.headers.get("x-request-id") ?? crypto.randomUUID();
  // Make it visible to route handlers via request.headers...
  req.headers.set("x-request-id", id);
  // ...and echo it on the response for client-side debugging.
  res.headers.set("x-request-id", id);
  return undefined;
};

/**
 * Cookie-only session gate via better-auth. Does not validate the session
 * server-side — route handlers must still call requireUser().
 */
const requireSessionCookie: ProxyStep = (req) => {
  const cookie = getSessionCookie(req);
  if (!cookie) {
    const error = new UnauthorizedError("authentication required");
    return Response.json(error.toJSON(), { status: error.httpStatus });
  }
  return undefined;
};

/** Rate-limit slot. Phase 3 wires a token bucket (Upstash / Redis). */
const rateLimit: ProxyStep = (req) => {
  const now = Date.now();
  const forwardedFor = req.headers
    .get("x-forwarded-for")
    ?.split(",")[0]
    ?.trim();
  const key = `${req.nextUrl.pathname}:${forwardedFor || "unknown"}`;
  const bucket = rateLimitBuckets.get(key);

  if (!bucket || bucket.resetAt <= now) {
    rateLimitBuckets.set(key, {
      count: 1,
      resetAt: now + RATE_LIMIT_WINDOW_MS,
    });
    return undefined;
  }

  if (bucket.count >= RATE_LIMIT_MAX_REQUESTS) {
    const error = new RateLimitedError("rate limit exceeded");
    return Response.json(error.toJSON(), {
      status: error.httpStatus,
      headers: {
        "Retry-After": Math.ceil((bucket.resetAt - now) / 1000).toString(),
      },
    });
  }

  bucket.count += 1;

  if (rateLimitBuckets.size > 10_000) {
    for (const [bucketKey, value] of rateLimitBuckets) {
      if (value.resetAt <= now) rateLimitBuckets.delete(bucketKey);
    }
  }

  return undefined;
};

// --- Routing ----------------------------------------------------------------

interface Pipeline {
  readonly test: (pathname: string) => boolean;
  readonly steps: readonly ProxyStep[];
}

/**
 * Order matters: the first matching pipeline wins. Add new feature prefixes
 * here. Cross-cutting concerns are functions above; pipelines compose them.
 */
const PIPELINES: readonly Pipeline[] = [
  // Auth handler must remain reachable without a session.
  {
    test: (p) => p.startsWith("/api/auth"),
    steps: [withRequestId],
  },
  // Chat is authenticated (anonymous sessions count).
  {
    test: (p) => p.startsWith("/api/chat"),
    steps: [withRequestId, requireSessionCookie, rateLimit],
  },
  {
    test: (p) => p.startsWith("/api/generate"),
    steps: [withRequestId, requireSessionCookie, rateLimit],
  },
];

export async function proxy(request: NextRequest): Promise<Response> {
  const res = NextResponse.next({ request });
  const pipeline = PIPELINES.find((p) => p.test(request.nextUrl.pathname));
  if (!pipeline) return applySecurityHeaders(res);

  for (const step of pipeline.steps) {
    const out = await step(request, res);
    if (out instanceof Response) return out;
  }
  return applySecurityHeaders(res);
}

export const config = {
  matcher: [
    /*
     * Run proxy on every route EXCEPT:
     * - static assets (_next/static, images)
     * - metadata (favicon, robots, sitemap)
     */
    "/((?!_next/static|_next/image|favicon\\.ico|sitemap\\.xml|robots\\.txt|.*\\.(?:png|jpg|jpeg|gif|webp|svg|ico|woff2?)$).*)",
  ],
};
