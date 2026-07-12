/**
 * Admin Health Status — GET /api/admin/health-status
 *
 * Gated by adminGate (JWT/Basic Auth/dev-bypass). Returns:
 *   - `probes`: fresh observation from runAllProbes() (~1–2s call)
 *   - `state`: last-known DB rows from health_probe_state (includes
 *     lastTransitionedAt, lastAlertedAt) so the UI can render "STABLE
 *     FOR 3d" / "JUST FLIPPED" chips per probe.
 *
 * Consumed by /admin/health page.
 */
import type { Request, Response } from "express";
import { db } from "./db.js";
import { healthProbeState } from "../drizzle/schema.js";
import { runAllProbes } from "./scheduled/healthDigest.js";

export async function adminHealthStatusHandler(_req: Request, res: Response): Promise<void> {
  const [probes, state] = await Promise.all([
    runAllProbes(),
    db.select().from(healthProbeState),
  ]);
  res.json({
    generatedAt: new Date().toISOString(),
    probes,
    state: state.map((r) => ({
      probeName: r.probeName,
      lastStatus: r.lastStatus,
      lastDetail: r.lastDetail,
      lastCheckedAt: r.lastCheckedAt,
      lastTransitionedAt: r.lastTransitionedAt,
      lastAlertedAt: r.lastAlertedAt,
    })),
  });
}
