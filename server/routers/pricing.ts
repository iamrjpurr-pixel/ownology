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
// KNOWN_SOURCES is documentation only — see SOURCE_LABEL in AdminFunnel.tsx
// for the canonical display-name map.
void KNOWN_SOURCES;

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
      // Normalise source: lowercase, trim, fall back to "direct" if empty
      // after stripping non-[a-z0-9-] chars. Cap at 32 chars to match DB.
      const raw = input.source.trim().toLowerCase().replace(/[^a-z0-9-]/g, "-").slice(0, 32);
      const source = raw || "direct";
      // user wiring deferred until real auth lands — see /admin auth TODO.
      const userId: number | null = null;
      await db.insert(schema.pricingViews).values({
        source,
        userId,
        referer: input.referer?.slice(0, 500),
        userAgent: input.userAgent?.slice(0, 500),
        viewedAt: Date.now(),
      });
      return { ok: true, source };
    }),

  /** Log a conversion (signup / paid). Called by /merch/success,
   *  /founding-member/success, or any Stripe webhook handler. Stores a
   *  second row with source = `<orig>:converted` — keeps the existing
   *  pricing_views schema, lets funnelStats split views vs conversions
   *  by suffix. */
  logConversion: publicProcedure
    .input(
      z.object({
        source: z.string().min(1).max(32),
      })
    )
    .mutation(async ({ input }) => {
      const raw = input.source.trim().toLowerCase().replace(/[^a-z0-9-]/g, "-").slice(0, 32);
      const SUFFIX = ":converted";
      // Reserve room for the suffix so funnelStats' endsWith(":converted")
      // check is never defeated by truncation on a too-long source.
      const baseSource = (raw || "direct").slice(0, 32 - SUFFIX.length);
      const source = `${baseSource}${SUFFIX}`;
      const userId: number | null = null;
      await db.insert(schema.pricingViews).values({
        source,
        userId,
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

      // Split views vs conversions by `:converted` suffix. Both share the
      // same canonical source (e.g. "free-paused" + "free-paused:converted").
      const viewsByCanonical = new Map<string, number>();
      const convByCanonical = new Map<string, number>();
      const firstByCanonical = new Map<string, number>();
      const lastByCanonical = new Map<string, number>();
      for (const r of bySource) {
        const isConv = r.source.endsWith(":converted");
        const canonical = isConv ? r.source.slice(0, -":converted".length) : r.source;
        const count = Number(r.count);
        if (isConv) {
          convByCanonical.set(canonical, (convByCanonical.get(canonical) ?? 0) + count);
        } else {
          viewsByCanonical.set(canonical, (viewsByCanonical.get(canonical) ?? 0) + count);
        }
        const f = Number(r.firstAt), l = Number(r.lastAt);
        const prevF = firstByCanonical.get(canonical);
        if (prevF == null || f < prevF) firstByCanonical.set(canonical, f);
        const prevL = lastByCanonical.get(canonical);
        if (prevL == null || l > prevL) lastByCanonical.set(canonical, l);
      }
      const canonicalSources = Array.from(new Set([...viewsByCanonical.keys(), ...convByCanonical.keys()]));
      const merged = canonicalSources
        .map((source) => {
          const views = viewsByCanonical.get(source) ?? 0;
          const conversions = convByCanonical.get(source) ?? 0;
          return {
            source,
            count: views,
            conversions,
            conversionPct: views > 0 ? Number(((conversions / views) * 100).toFixed(1)) : 0,
            firstAt: firstByCanonical.get(source) ?? 0,
            lastAt: lastByCanonical.get(source) ?? 0,
            sharePct: totalViews > 0 ? Number(((views / totalViews) * 100).toFixed(1)) : 0,
          };
        })
        .sort((a, b) => b.count - a.count);

      const totalConversions = Array.from(convByCanonical.values()).reduce((s, n) => s + n, 0);
      return {
        windowDays: days,
        sinceIso: new Date(sinceMs).toISOString(),
        totals: {
          views: totalViews,
          conversions: totalConversions,
          conversionPct: totalViews > 0 ? Number(((totalConversions / totalViews) * 100).toFixed(1)) : 0,
          sources: merged.length,
        },
        bySource: merged,
        daily,
      };
    }),
});
