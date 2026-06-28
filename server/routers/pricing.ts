/**
 * Pricing-page conversion-attribution router.
 *
 * Two procedures power the /admin/funnel dashboard:
 *   - pricing.logView({source})  — PUBLIC mutation. Called once on every
 *                                  /pricing page mount with the `?from=`
 *                                  source. Anonymous-friendly (userId nullable).
 *   - pricing.funnelStats({days?}) — OWNER query. Aggregates pricing_views
 *                                    grouped by source, with daily counts
 *                                    for sparkline rendering.
 *
 * Why this matters: lets you measure which acquisition channel actually
 * converts and tune DAILY_FREE_BUDGET_USD / homepage CTAs accordingly.
 */

import { z } from "zod";
import { sql, gte, desc } from "drizzle-orm";
import { router, publicProcedure, ownerProcedure } from "../trpc.js";
import { db } from "../db.js";
import * as schema from "../../drizzle/schema.js";

const KNOWN_SOURCES = [
  "free-paused",
  "free-quota",
  "homepage",
  "press",
  "cellar-journal",
  "competitive-advantage",
  "preview",
  "stats",
  "direct",
] as const;

export const pricingRouter = router({
  /** Log a /pricing page visit. Anonymous-friendly. */
  logView: publicProcedure
    .input(
      z.object({
        source: z.string().min(1).max(32),
        referer: z.string().max(500).optional(),
        userAgent: z.string().max(500).optional(),
      })
    )
    .mutation(async ({ input, ctx }) => {
      // Normalise source: lowercase, trim, fall back to "direct" if unrecognised.
      const raw = input.source.trim().toLowerCase().replace(/[^a-z0-9-]/g, "-").slice(0, 32);
      const source = (KNOWN_SOURCES as readonly string[]).includes(raw) ? raw : raw || "direct";
      const userId = ctx.user?.openId ? null : null; // anonymous OK; user wiring deferred until real auth
      await db.insert(schema.pricingViews).values({
        source,
        userId,
        referer: input.referer?.slice(0, 500),
        userAgent: input.userAgent?.slice(0, 500),
        viewedAt: Date.now(),
      });
      return { ok: true, source };
    }),

  /**
   * Aggregated funnel stats for the /admin/funnel dashboard.
   * Returns:
   *   - bySource: per-source totals (count, mostRecent, first)
   *   - daily:   per-day counts across all sources, last N days (for sparkline)
   *   - totals:  grand totals & coverage period
   */
  funnelStats: ownerProcedure
    .input(z.object({ days: z.number().min(1).max(365).default(30) }).optional())
    .query(async ({ input }) => {
      const days = input?.days ?? 30;
      const sinceMs = Date.now() - days * 86400000;

      // Per-source aggregation
      const bySource = await db
        .select({
          source: schema.pricingViews.source,
          count: sql<number>`count(*)`,
          firstAt: sql<number>`min(${schema.pricingViews.viewedAt})`,
          lastAt: sql<number>`max(${schema.pricingViews.viewedAt})`,
        })
        .from(schema.pricingViews)
        .where(gte(schema.pricingViews.viewedAt, sinceMs))
        .groupBy(schema.pricingViews.source)
        .orderBy(desc(sql`count(*)`));

      // Per-day timeline (for sparkline). Bucket on UTC day.
      const dailyRaw = await db
        .select({
          dayKey: sql<string>`DATE(FROM_UNIXTIME(${schema.pricingViews.viewedAt} / 1000))`,
          count: sql<number>`count(*)`,
        })
        .from(schema.pricingViews)
        .where(gte(schema.pricingViews.viewedAt, sinceMs))
        .groupBy(sql`DATE(FROM_UNIXTIME(${schema.pricingViews.viewedAt} / 1000))`)
        .orderBy(sql`DATE(FROM_UNIXTIME(${schema.pricingViews.viewedAt} / 1000))`);

      // Build a dense daily series (fill zero-days) so sparkline doesn't lie.
      const daily: { dayKey: string; count: number }[] = [];
      const map = new Map<string, number>();
      for (const r of dailyRaw) map.set(String(r.dayKey), Number(r.count));
      for (let i = days - 1; i >= 0; i--) {
        const d = new Date(Date.now() - i * 86400000);
        const k = d.toISOString().slice(0, 10);
        daily.push({ dayKey: k, count: map.get(k) ?? 0 });
      }

      const totalViews = bySource.reduce((s, r) => s + Number(r.count), 0);
      return {
        windowDays: days,
        sinceIso: new Date(sinceMs).toISOString(),
        totals: { views: totalViews, sources: bySource.length },
        bySource: bySource.map((r) => ({
          source: r.source,
          count: Number(r.count),
          firstAt: Number(r.firstAt),
          lastAt: Number(r.lastAt),
          sharePct: totalViews > 0 ? Number(((Number(r.count) / totalViews) * 100).toFixed(1)) : 0,
        })),
        daily,
      };
    }),
});
