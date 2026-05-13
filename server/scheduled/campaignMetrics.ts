import type { Request, Response } from "express";
import { upsertCampaignMetricsSnapshot, getFoundingMemberCount } from "../db.js";
import { format, getISOWeek, getYear } from "date-fns";

/**
 * Weekly Heartbeat handler — POST /api/scheduled/campaign-metrics
 *
 * Called every Monday at 09:00 AEST (23:00 UTC Sunday) by the Manus Heartbeat cron.
 * Collects available metrics from internal sources and inserts a snapshot row.
 *
 * Metrics that require external API calls (Buttondown email stats, Google Search Console)
 * are left as 0 by default and can be backfilled via the owner dashboard or the
 * trpc.campaignMetrics.upsert mutation.
 */
export async function campaignMetricsHandler(req: Request, res: Response) {
  try {
    const now = new Date();
    const week = getISOWeek(now);
    const year = getYear(now);
    const weekLabel = `${year}-W${String(week).padStart(2, "0")}`;

    // ── Internal metrics we can compute directly ──────────────────────────────
    const foundingMemberCount = await getFoundingMemberCount();

    // ── Placeholder for external metrics (filled in via dashboard or API) ─────
    // These will be 0 until the owner manually updates them or connects the APIs.
    const snapshot = {
      weekLabel,
      snapshotAt: Date.now(),
      foundingMemberCount,
      // External metrics — set to 0, owner updates via dashboard
      waitlistCount: 0,
      emailOpenRate: 0,
      emailClickRate: 0,
      organicSessions: 0,
      topKeywordRank: 0,
      mrr: foundingMemberCount * 2900, // AUD cents: assume Cellar tier ($29/mo) as baseline
      merchOrders: 0,
      merchRevenue: 0,
      complianceQueries: 0,
      notes: `Auto-snapshot for ${weekLabel}. External metrics (email, SEO) require manual update.`,
    };

    await upsertCampaignMetricsSnapshot(snapshot);

    console.log(`[campaign-metrics] Snapshot saved for ${weekLabel} — founding members: ${foundingMemberCount}`);

    res.json({
      ok: true,
      weekLabel,
      foundingMemberCount,
      message: `Snapshot saved for ${weekLabel}`,
    });
  } catch (err) {
    console.error("[campaign-metrics] Handler error:", err);
    res.status(500).json({ ok: false, error: String(err) });
  }
}
