/**
 * /unlock — public endpoint that redeems a guest-pass token.
 *
 * Flow:
 *   1. Recipient (e.g. Andrew Pirie) opens URL: /unlock?t=<signed-token>
 *   2. Server verifies signature + expiry
 *   3. Sets HttpOnly, Secure, SameSite=Lax cookie with the same token
 *   4. Redirects to /curriculum (or /?err=guest-pass-invalid on failure)
 *
 * The cookie is what the curriculum router reads on every request — see
 * server/routers/curriculum.ts:resolveCurriculumTier() for how the tier
 * grant is applied.
 *
 * Safe to expose publicly — a valid token IS the credential. If someone
 * shares their unlock URL, that's on them (same threat model as a
 * shareable magic-link password reset).
 *
 * Feb 2026 — Rich.
 */
import type { Request, Response } from "express";
import { verifyGuestPass, GUEST_PASS_COOKIE } from "./lib/guestPass.js";

export function unlockHandler(req: Request, res: Response): void {
  const token = (req.query?.t ?? req.query?.token ?? "") as string;
  const payload = verifyGuestPass(token);
  if (!payload) {
    res.status(302).setHeader("Location", "/?err=guest-pass-invalid").end();
    return;
  }
  const maxAgeMs = Math.max(0, payload.exp * 1000 - Date.now());
  res.cookie(GUEST_PASS_COOKIE, token, {
    httpOnly: true,
    secure: true,
    sameSite: "lax",
    maxAge: maxAgeMs,
    path: "/",
  });
  // Land people on the curriculum index so they immediately see what
  // they've been granted. Query flag lets the client show a "Guest pass
  // active" toast if we ever want to.
  res.status(302).setHeader("Location", "/curriculum?guest=1").end();
}
