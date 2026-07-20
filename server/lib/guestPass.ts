/**
 * Guest passes — signed HMAC tokens that grant temporary Curriculum access
 * to specific prospects (e.g. Andrew Pirie) without a Stripe subscription.
 *
 * Feb 2026 — Rich. Built as the pragmatic interim while the full Stripe
 * subscription loop is still missing (see /app/memory/PRD.md § Stripe gaps).
 *
 * Design:
 *   - Stateless HMAC-signed tokens (no DB write per pass) — one signing
 *     secret revokes ALL outstanding passes if compromised (rotate secret).
 *   - Format:  base64url({tier, exp, jti, label?}).base64url(hmac_sha256)
 *   - jti     is a random 8-byte hex id — allows targeted revocation via
 *             an in-memory or DB denylist if a specific pass leaks.
 *   - exp     is a unix seconds timestamp; token invalid past exp.
 *   - label   is an optional human tag (e.g. "andrew-pirie-apogee") — kept
 *             short (<40 chars) so the URL stays scannable.
 *
 * The cookie set on /unlock is HttpOnly + Secure + SameSite=Lax with the
 * same expiry as the token. Server-side paywall (curriculum router)
 * checks this cookie BEFORE hitting the wineries.plan lookup so guest
 * passes take priority over the caller's real tier.
 */

import crypto from "node:crypto";

export type GuestPassTier = "cellar_hand" | "press" | "vigneron";

export interface GuestPassPayload {
  tier: GuestPassTier;
  exp: number;       // unix seconds
  jti: string;       // random id for revocation
  label?: string;    // optional human tag
}

const b64url = {
  encode(s: string | Buffer): string {
    const b = typeof s === "string" ? Buffer.from(s, "utf8") : s;
    return b.toString("base64").replace(/=+$/g, "").replace(/\+/g, "-").replace(/\//g, "_");
  },
  decode(s: string): Buffer {
    return Buffer.from(s.replace(/-/g, "+").replace(/_/g, "/"), "base64");
  },
};

function secret(): string {
  // Reuse JWT_SECRET as the signing key — one fewer env var to manage.
  // If we ever need to invalidate every outstanding pass at once, rotate
  // JWT_SECRET (this will also invalidate every session — deliberate: a
  // pass compromise big enough to warrant total rotation warrants that).
  const s = process.env.JWT_SECRET;
  if (!s || s.length < 32) {
    throw new Error("JWT_SECRET missing or too short for guest-pass signing");
  }
  return s;
}

function hmac(input: string): string {
  return b64url.encode(crypto.createHmac("sha256", secret()).update(input).digest());
}

/** Create a signed guest-pass token. */
export function createGuestPass(input: {
  tier: GuestPassTier;
  ttlDays: number;
  label?: string;
}): { token: string; payload: GuestPassPayload } {
  if (input.ttlDays <= 0 || input.ttlDays > 365) {
    throw new Error("ttlDays must be between 1 and 365");
  }
  const payload: GuestPassPayload = {
    tier: input.tier,
    exp: Math.floor(Date.now() / 1000) + input.ttlDays * 24 * 60 * 60,
    jti: crypto.randomBytes(8).toString("hex"),
    label: input.label?.slice(0, 40) || undefined,
  };
  const body = b64url.encode(JSON.stringify(payload));
  const sig = hmac(body);
  return { token: `${body}.${sig}`, payload };
}

/** Verify + parse a token. Returns null if signature invalid or expired. */
export function verifyGuestPass(token: string | null | undefined): GuestPassPayload | null {
  if (!token) return null;
  const parts = token.split(".");
  if (parts.length !== 2) return null;
  const [body, sig] = parts;
  const expected = hmac(body);
  // Constant-time comparison — guards against timing-based signature attacks.
  const a = Buffer.from(sig, "utf8");
  const b = Buffer.from(expected, "utf8");
  if (a.length !== b.length || !crypto.timingSafeEqual(a, b)) return null;
  try {
    const payload = JSON.parse(b64url.decode(body).toString("utf8")) as GuestPassPayload;
    if (!payload || typeof payload !== "object") return null;
    if (payload.exp <= Math.floor(Date.now() / 1000)) return null;
    if (!["cellar_hand", "press", "vigneron"].includes(payload.tier)) return null;
    return payload;
  } catch {
    return null;
  }
}

/** Cookie name used by the /unlock endpoint. Read by curriculum router. */
export const GUEST_PASS_COOKIE = "ow_curriculum_guest";
