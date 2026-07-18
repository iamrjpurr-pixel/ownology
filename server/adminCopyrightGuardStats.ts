/**
 * Admin Copyright-Guard Stats — GET /api/admin/copyright-guard-stats
 *
 * Behind adminGate. Aggregates copyright_guard_events into a dashboard
 * payload for /admin/health:
 *   - Rolling 7-day and 30-day totals + outcome breakdown
 *   - Top offending sources (which reference docs Claude keeps almost-
 *     quoting) so we know where to tighten the system prompt or resynth
 *     the chunks
 *   - Recent 20 events for spot-checking
 *
 * Read-only. Fast — one query per aggregate (< 20 ms on a ~1000-row table).
 *
 * Feb 2026, Rich.
 */
import type { Request, Response } from "express";
import { desc, sql } from "drizzle-orm";
import { db } from "./db.js";
import { copyrightGuardEvents } from "../drizzle/schema.js";

const DAY_MS = 24 * 60 * 60 * 1000;

export async function adminCopyrightGuardStatsHandler(
  _req: Request,
  res: Response,
): Promise<void> {
  try {
    const now = Date.now();
    const cutoff7 = now - 7 * DAY_MS;
    const cutoff30 = now - 30 * DAY_MS;

    // ── 1) Outcome breakdown for last 7 and 30 days (two clean queries) ──
    const [breakdown7d, breakdown30d] = await Promise.all([
      db
        .select({
          outcome: copyrightGuardEvents.outcome,
          count: sql<number>`COUNT(*)`,
        })
        .from(copyrightGuardEvents)
        .where(sql`${copyrightGuardEvents.occurredAt} >= ${cutoff7}`)
        .groupBy(copyrightGuardEvents.outcome),
      db
        .select({
          outcome: copyrightGuardEvents.outcome,
          count: sql<number>`COUNT(*)`,
        })
        .from(copyrightGuardEvents)
        .where(sql`${copyrightGuardEvents.occurredAt} >= ${cutoff30}`)
        .groupBy(copyrightGuardEvents.outcome),
    ]);

    // Fold breakdowns into { 7d: {clean, still_leaking, regen_failed, total}, 30d: {…} }
    const totals: Record<"7d" | "30d", Record<string, number>> = {
      "7d": { clean: 0, still_leaking: 0, regen_failed: 0, total: 0 },
      "30d": { clean: 0, still_leaking: 0, regen_failed: 0, total: 0 },
    };
    for (const row of breakdown7d) {
      totals["7d"][row.outcome] = Number(row.count);
      totals["7d"].total += Number(row.count);
    }
    for (const row of breakdown30d) {
      totals["30d"][row.outcome] = Number(row.count);
      totals["30d"].total += Number(row.count);
    }

    // ── 2) Top offending sources (30-day window) ────────────────────────
    const topSources = await db
      .select({
        primarySource: copyrightGuardEvents.primarySource,
        count: sql<number>`COUNT(*)`,
        cleanCount: sql<number>`SUM(CASE WHEN ${copyrightGuardEvents.outcome} = 'clean' THEN 1 ELSE 0 END)`,
        stillLeakingCount: sql<number>`SUM(CASE WHEN ${copyrightGuardEvents.outcome} = 'still_leaking' THEN 1 ELSE 0 END)`,
      })
      .from(copyrightGuardEvents)
      .where(sql`${copyrightGuardEvents.occurredAt} >= ${cutoff30} AND ${copyrightGuardEvents.primarySource} IS NOT NULL`)
      .groupBy(copyrightGuardEvents.primarySource)
      .orderBy(desc(sql`COUNT(*)`))
      .limit(10);

    // ── 3) Recent 20 events for spot-checking ────────────────────────────
    const recent = await db
      .select({
        id: copyrightGuardEvents.id,
        occurredAt: copyrightGuardEvents.occurredAt,
        questionSnippet: copyrightGuardEvents.questionSnippet,
        hitsJson: copyrightGuardEvents.hitsJson,
        sourceHitsJson: copyrightGuardEvents.sourceHitsJson,
        outcome: copyrightGuardEvents.outcome,
        primarySource: copyrightGuardEvents.primarySource,
        originalAnswerLen: copyrightGuardEvents.originalAnswerLen,
      })
      .from(copyrightGuardEvents)
      .orderBy(desc(copyrightGuardEvents.occurredAt))
      .limit(20);

    const recentParsed = recent.map((r) => {
      let hits: string[] = [];
      let sourceHits: string[] = [];
      try { hits = JSON.parse(r.hitsJson) || []; } catch { /* ignore */ }
      try { sourceHits = JSON.parse(r.sourceHitsJson) || []; } catch { /* ignore */ }
      return {
        id: r.id,
        occurredAt: r.occurredAt,
        questionSnippet: r.questionSnippet,
        hits: hits.slice(0, 3), // trim for wire payload
        sourceHits: sourceHits.slice(0, 3),
        outcome: r.outcome,
        primarySource: r.primarySource,
        originalAnswerLen: r.originalAnswerLen,
      };
    });

    // Clean-rate percentage across the 30-day window (paraphrase-guard
    // effectiveness — higher is better).
    const cleanRate30d =
      totals["30d"].total > 0
        ? Math.round((totals["30d"].clean / totals["30d"].total) * 100)
        : null;

    res.json({
      generatedAt: new Date().toISOString(),
      totals,
      cleanRate30d,
      topSources: topSources.map((s) => ({
        primarySource: s.primarySource,
        count: Number(s.count),
        cleanCount: Number(s.cleanCount),
        stillLeakingCount: Number(s.stillLeakingCount),
      })),
      recent: recentParsed,
    });
  } catch (err) {
    console.error("[adminCopyrightGuardStats] failed:", err);
    res.status(500).json({ error: (err as Error).message ?? "stats query failed" });
  }
}
