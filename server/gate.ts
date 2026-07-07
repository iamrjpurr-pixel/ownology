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
import { db } from "./db.js";
import * as schema from "../drizzle/schema.js";
import { eq } from "drizzle-orm";

/** Cookie name — deliberately distinct from `app_session_id` (Google OAuth
 *  cookie) so both can co-exist and one doesn't invalidate the other. */
export const GATE_COOKIE_NAME = "ow_gate";
const GATE_MAX_AGE_SECONDS = 30 * 24 * 60 * 60; // 30 days

function getSecret(): Uint8Array | null {
  const s = process.env.JWT_SECRET;
  if (!s) return null;
  return new TextEncoder().encode(s);
}

/** Mint an ow_gate cookie value for the SHARED-PASSWORD path. Returns null
 *  if JWT_SECRET is missing (in which case the caller should refuse to
 *  create the cookie at all). */
export async function mintGateToken(): Promise<string | null> {
  const secret = getSecret();
  if (!secret) return null;
  return await new SignJWT({ gate: "ok" })
    .setProtectedHeader({ alg: "HS256" })
    .setIssuedAt()
    .setExpirationTime(`${GATE_MAX_AGE_SECONDS}s`)
    .sign(secret);
}

/** Mint an ow_gate cookie value scoped to a specific INVITE. Payload
 *  includes the invite ID so verifyGateCookie can check the DB row for
 *  revocation on every request — that's what makes individual revoke
 *  work. Returns null if JWT_SECRET is missing. */
export async function mintInviteToken(inviteId: number): Promise<string | null> {
  const secret = getSecret();
  if (!secret) return null;
  return await new SignJWT({ gate: "invite", id: inviteId })
    .setProtectedHeader({ alg: "HS256" })
    .setIssuedAt()
    .setExpirationTime(`${GATE_MAX_AGE_SECONDS}s`)
    .sign(secret);
}

// ─── Trial-tier cookie mint (Feb 2026) ────────────────────────────────────
// Same JWT shape as an invite cookie — verifyGateCookieDetailed reads the
// invite row to discover the tier. This helper exists purely for symmetry
// and readability at call sites. The 14-day expiry is enforced by the
// invite row's `expires_at`, not the JWT itself (JWT still uses the
// 30-day GATE_MAX_AGE for consistency).
export async function mintTrialInviteToken(inviteId: number): Promise<string | null> {
  return mintInviteToken(inviteId);
}

/** Membership tiers granted by a valid gate cookie. Feb 2026 progressive-
 *  exposure model:
 *   - "gate"   → legacy shared-password (or invite with tier='gate').
 *                Full public + member-facing surfaces (subject to /admin
 *                role checks). Used for existing beta testers.
 *   - "trial"  → 14-day trial invite. LIMITED to TRIAL_ALLOWED_PREFIXES.
 *   - "member" → Paying member invite (or legacy 'gate' promoted after
 *                Stripe conversion). Full non-admin surface.
 *  Return `null` when there is no valid cookie. */
export type GateTier = "gate" | "trial" | "member";

export interface GateVerification {
  tier: GateTier;
  inviteId: number | null;   // null for shared-password path
}

/** Extended verifier: returns full verification result (tier + invite id)
 *  or null. Legacy `verifyGateCookie` remains for boolean callers. */
export async function verifyGateCookieDetailed(req: express.Request): Promise<GateVerification | null> {
  try {
    const cookieHeader = req.headers.cookie;
    if (!cookieHeader) return null;
    const cookies = parseCookies(cookieHeader);
    const token = cookies[GATE_COOKIE_NAME];
    if (!token) return null;
    const secret = getSecret();
    if (!secret) return null;
    const { payload } = await jwtVerify(token, secret);
    // Shared-password JWT — legacy 'gate' tier.
    if (payload.gate === "ok") {
      return { tier: "gate", inviteId: null };
    }
    // Invite JWT — look up the row for tier + revocation + pause state.
    if (payload.gate === "invite" && typeof payload.id === "number") {
      const rows = await db
        .select()
        .from(schema.gateInvites)
        .where(eq(schema.gateInvites.id, payload.id))
        .limit(1);
      const row = rows[0];
      if (!row) return null;
      if (row.revokedAt) return null;
      if (row.pausedAt) return null;                 // soft-pause
      if (row.expiresAt && row.expiresAt < Date.now()) return null;
      const tier: GateTier = (row.tier === "trial" || row.tier === "member") ? row.tier : "gate";
      return { tier, inviteId: row.id };
    }
    return null;
  } catch {
    return null;
  }
}

/** Verify an incoming ow_gate cookie. Returns true iff the JWT signature
 *  + expiry are valid AND (for invite tokens) the underlying invite row
 *  is not revoked or expired. Two paths:
 *   - Shared-password JWT `{ gate: "ok" }` → JWT signature check only.
 *   - Invite JWT `{ gate: "invite", id: N }` → JWT check + DB lookup for
 *     the invite row, verify not revoked and not past expires_at.
 *  Any error returns false (never throws — caller uses the boolean). */
export async function verifyGateCookie(req: express.Request): Promise<boolean> {
  const detail = await verifyGateCookieDetailed(req);
  return detail !== null;
}

// ─── Trial-tier allowlist ────────────────────────────────────────────────
// When a cookie's tier is 'trial', the SPA can only reach these prefixes.
// Everything else redirects to /trial-locked (a landing page explaining
// what's included in the trial vs full membership).
export const TRIAL_ALLOWED_PREFIXES = [
  "/onboarding",
  "/the-press",
  "/cellar-brief",
  "/import",
  "/ask",
  "/try",           // sandbox still available
  "/join",          // /join Card 06 is the upgrade CTA
  "/founding-partners",
  "/pricing",
  "/upgrade",       // future
  "/trial-locked",  // the landing shown to trial users who click a locked route
];

/** Returns true if a `trial`-tier cookie is allowed to reach this path. */
export function isTrialAllowedPath(pathname: string): boolean {
  for (const p of TRIAL_ALLOWED_PREFIXES) {
    if (pathname === p) return true;
    if (pathname.startsWith(p + "/")) return true;
  }
  return false;
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

// ─── IP allowlist bypass (S4) ─────────────────────────────────────────────
// Team members hitting the app from a known IP (home, office) skip the
// password wall entirely. Set OWNOLOGY_GATE_IP_ALLOWLIST as a comma-
// separated list of IPs or IP prefixes. Prefix match: "203.0.113." matches
// 203.0.113.42 etc. Deliberately simple — no CIDR parsing — since the
// operator manages the list by hand.
export function isIpAllowlisted(ip: string): boolean {
  const raw = process.env.OWNOLOGY_GATE_IP_ALLOWLIST;
  if (!raw) return false;
  const entries = raw.split(",").map((s) => s.trim()).filter(Boolean);
  for (const entry of entries) {
    if (entry === ip) return true;
    if (entry.endsWith(".") && ip.startsWith(entry)) return true;
  }
  return false;
}

// ─── Generic per-IP rate limiter (S2) ─────────────────────────────────────
// Reused across /api/gate/verify, /api/trpc/*, /api/scheduled/*. Each call
// site passes its own bucket name so limits are independent.
const buckets = new Map<string, { count: number; windowStart: number }>();

/** Check + record one request against a named bucket. Returns { allowed,
 *  retryAfterMs } and increments the counter on the way through. */
export function rateLimitCheck(
  bucket: string,
  ip: string,
  windowMs: number,
  max: number
): { allowed: boolean; retryAfterMs?: number } {
  const key = `${bucket}::${ip}`;
  const now = Date.now();
  const cur = buckets.get(key);
  if (!cur || now - cur.windowStart > windowMs) {
    buckets.set(key, { count: 1, windowStart: now });
    return { allowed: true };
  }
  if (cur.count >= max) {
    return { allowed: false, retryAfterMs: windowMs - (now - cur.windowStart) };
  }
  cur.count += 1;
  buckets.set(key, cur);
  return { allowed: true };
}
