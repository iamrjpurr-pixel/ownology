/**
 * Admin endpoint — POST /api/admin/guest-pass/create
 * Creates a signed guest-pass token that grants temporary Curriculum tier
 * access to a specific prospect. Behind adminGate.
 *
 * Request body:
 *   { tier: "cellar_hand" | "press" | "vigneron",
 *     ttlDays: 1..365,
 *     label?: string }
 *
 * Response:
 *   { token, unlockUrl, expiresAt, label, tier, jti }
 *
 * Feb 2026 — Rich.
 */
import type { Request, Response } from "express";
import { createGuestPass, type GuestPassTier } from "./lib/guestPass.js";

const ALLOWED_TIERS = new Set<GuestPassTier>(["cellar_hand", "press", "vigneron"]);

export function adminGuestPassCreateHandler(req: Request, res: Response): void {
  try {
    const body = (req.body ?? {}) as { tier?: string; ttlDays?: number; label?: string };
    const tier = String(body.tier || "").trim() as GuestPassTier;
    const ttlDays = Number(body.ttlDays);
    const label = typeof body.label === "string" ? body.label.trim() : undefined;

    if (!ALLOWED_TIERS.has(tier)) {
      res.status(400).json({ error: "invalid tier — must be cellar_hand | press | vigneron" });
      return;
    }
    if (!Number.isFinite(ttlDays) || ttlDays <= 0 || ttlDays > 365) {
      res.status(400).json({ error: "ttlDays must be a number between 1 and 365" });
      return;
    }

    const { token, payload } = createGuestPass({ tier, ttlDays, label });
    // Build the shareable unlock URL from the request host so it works on
    // both preview and prod without hardcoding a domain.
    const proto = (req.headers["x-forwarded-proto"] as string) || (req.secure ? "https" : "http");
    const host = (req.headers["x-forwarded-host"] as string) || req.headers.host || "ownology.ai";
    const unlockUrl = `${proto}://${host}/unlock?t=${encodeURIComponent(token)}`;

    res.json({
      token,
      unlockUrl,
      tier: payload.tier,
      label: payload.label ?? null,
      jti: payload.jti,
      expiresAt: new Date(payload.exp * 1000).toISOString(),
    });
  } catch (err) {
    console.error("[adminGuestPassCreate] failed:", err);
    res.status(500).json({ error: (err as Error)?.message ?? "failed" });
  }
}
