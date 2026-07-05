/**
 * gate — shared-secret password wall for member-only pages.
 *
 * A pragmatic bridge between "wide-open preview" and "real per-user auth":
 *   1. Operator sets OWNOLOGY_GATE_PASSWORD in .env.
 *   2. Anonymous visitor hits a MEMBER_ONLY_PREFIXES route (e.g. /import)
 *      → redirected to /try?from=/import (existing sales-funnel wall).
 *   3. On /try there's a small "Team access" link that POSTs to
 *      /api/gate/verify with the password. On success we set an httpOnly
 *      `ow_gate` cookie (signed HMAC using JWT_SECRET, 30-day expiry).
 *   4. All subsequent requests carrying `ow_gate` pass the wall the same
 *      way an authenticated `app_session_id` cookie would.
 *
 * Not a substitute for the P0 tRPC auth-scope audit — the wall is a UX
 * fence, not a data-security guarantee. tRPC endpoints must still enforce
 * `ctx.user.id` scoping when we get to Phase 2. But it stops casual
 * pokers from finding /admin/quiz-picks, /import, etc. via URL guessing.
 */
import { SignJWT, jwtVerify } from "jose";
import type express from "express";
import { parse as parseCookies } from "cookie";

/** Cookie name — deliberately distinct from `app_session_id` (Google OAuth
 *  cookie) so both can co-exist and one doesn't invalidate the other. */
export const GATE_COOKIE_NAME = "ow_gate";
const GATE_MAX_AGE_SECONDS = 30 * 24 * 60 * 60; // 30 days

function getSecret(): Uint8Array | null {
  const s = process.env.JWT_SECRET;
  if (!s) return null;
  return new TextEncoder().encode(s);
}

/** Mint an ow_gate cookie value. Returns null if JWT_SECRET is missing
 *  (in which case the caller should refuse to create the cookie at all). */
export async function mintGateToken(): Promise<string | null> {
  const secret = getSecret();
  if (!secret) return null;
  return await new SignJWT({ gate: "ok" })
    .setProtectedHeader({ alg: "HS256" })
    .setIssuedAt()
    .setExpirationTime(`${GATE_MAX_AGE_SECONDS}s`)
    .sign(secret);
}

/** Verify an incoming ow_gate cookie. Returns true iff the signature +
 *  expiry are valid AND JWT_SECRET is configured. Any error returns false
 *  (never throws — the caller uses the boolean directly). */
export async function verifyGateCookie(req: express.Request): Promise<boolean> {
  try {
    const cookieHeader = req.headers.cookie;
    if (!cookieHeader) return false;
    const cookies = parseCookies(cookieHeader);
    const token = cookies[GATE_COOKIE_NAME];
    if (!token) return false;
    const secret = getSecret();
    if (!secret) return false;
    const { payload } = await jwtVerify(token, secret);
    return payload.gate === "ok";
  } catch {
    return false;
  }
}

/** Send the ow_gate cookie header on a response. httpOnly + SameSite=Lax
 *  is the sweet spot: the cookie ships with normal same-site navigation
 *  (following a redirect from /gate to /import) but not on cross-site
 *  POSTs (CSRF hardening). Secure flag on in production. */
export function setGateCookie(res: express.Response, token: string): void {
  const isProd = process.env.NODE_ENV === "production";
  res.cookie(GATE_COOKIE_NAME, token, {
    httpOnly: true,
    secure: isProd,
    sameSite: "lax",
    maxAge: GATE_MAX_AGE_SECONDS * 1000,
    path: "/",
  });
}

/** Clear the ow_gate cookie (logout). */
export function clearGateCookie(res: express.Response): void {
  res.clearCookie(GATE_COOKIE_NAME, { path: "/" });
}

// ─── Rate limiter (in-memory, per-IP) ─────────────────────────────────────
// Stops brute-forcing OWNOLOGY_GATE_PASSWORD. 5 attempts / 15 min per IP
// is a reasonable trade-off: enough for a typo-prone human on a shared
// office network, tight enough that a brute-force is impractical.
// Deliberately NOT persisted — process restart resets counters. That's
// fine at our scale; the password is long-lived so a full brute-force
// even with restarts would take longer than we care about.
const attemptsByIp = new Map<string, { count: number; windowStart: number }>();
const RATE_LIMIT_WINDOW_MS = 15 * 60 * 1000;
const RATE_LIMIT_MAX_ATTEMPTS = 5;

/** Returns true if this IP is allowed to attempt password verification. */
export function checkGateRateLimit(ip: string): { allowed: boolean; retryAfterMs?: number } {
  const now = Date.now();
  const cur = attemptsByIp.get(ip);
  if (!cur || now - cur.windowStart > RATE_LIMIT_WINDOW_MS) {
    attemptsByIp.set(ip, { count: 0, windowStart: now });
    return { allowed: true };
  }
  if (cur.count >= RATE_LIMIT_MAX_ATTEMPTS) {
    return { allowed: false, retryAfterMs: RATE_LIMIT_WINDOW_MS - (now - cur.windowStart) };
  }
  return { allowed: true };
}

/** Record one attempt against the rate limit. Call once per verify request. */
export function recordGateAttempt(ip: string): void {
  const now = Date.now();
  const cur = attemptsByIp.get(ip);
  if (!cur || now - cur.windowStart > RATE_LIMIT_WINDOW_MS) {
    attemptsByIp.set(ip, { count: 1, windowStart: now });
    return;
  }
  cur.count += 1;
  attemptsByIp.set(ip, cur);
}

/** Best-effort client IP extraction — respects X-Forwarded-For when behind
 *  a proxy (Emergent's ingress sets it). Falls back to remote address. */
export function clientIpOf(req: express.Request): string {
  const xff = req.headers["x-forwarded-for"];
  if (typeof xff === "string" && xff.length > 0) {
    // XFF can be "client, proxy1, proxy2" — first entry is the origin.
    const first = xff.split(",")[0]?.trim();
    if (first) return first;
  }
  return req.ip || req.socket.remoteAddress || "unknown";
}
