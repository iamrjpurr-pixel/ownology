/**
 * quiz router — anonymous telemetry + operator analytics for /quiz.
 *
 * Public:
 *   logPick — fired once when the user lands on the result page. Stores
 *   the six answers, winner slug, trueMatch slug, region, session id.
 *
 *   logCtaClick — fired when the visitor taps "See a Founding-Member Plan"
 *   on the result page. Correlates pick → conversion. Best-effort — we
 *   look up by sessionId + winnerSlug and stamp ctaClickedAt.
 *
 * Owner:
 *   stats — winner distribution, region split, budget downgrade rate,
 *   home-market swap rate over last N days.
 *
 *   list — recent picks with the full answer context, for eyeballing
 *   at /admin/quiz-picks.
 */
import { z } from "zod";
import { and, desc, eq, gte, isNull, sql } from "drizzle-orm";
import { router, publicProcedure, ownerProcedure } from "../trpc.js";
import { db } from "../db.js";
import * as schema from "../../drizzle/schema.js";

const WINE_TYPE = z.enum(["red", "white"]);
const FRUIT = z.enum(["red", "dark", "citrus", "savoury"]);
const BODY = z.enum(["light", "medium", "full"]);
const SWEETNESS = z.enum(["bone_dry", "hint", "off_dry", "sweet"]);
const GRIP = z.enum(["bright", "grippy", "soft", "both"]);
const AGE = z.enum(["young", "developed", "old"]);
const BUDGET = z.enum(["under_25", "25_50", "50_100", "100_plus"]);
const REGION = z.enum(["AU", "NZ", "US", "UK", "OTHER"]);

export const quizRouter = router({
  /** PUBLIC — log one quiz completion. Fire-and-forget from the client. */
  logPick: publicProcedure
    .input(
      z.object({
        sessionId: z.string().min(6).max(64),
        wineType: WINE_TYPE,
        fruit: FRUIT,
        body: BODY,
        sweetness: SWEETNESS,
        grip: GRIP,
        age: AGE,
        budget: BUDGET,
        winnerSlug: z.string().max(80),
        trueMatchSlug: z.string().max(80),
        region: REGION,
      })
    )
    .mutation(async ({ input }) => {
      await db.insert(schema.quizPicks).values({
        sessionId: input.sessionId,
        wineType: input.wineType,
        fruit: input.fruit,
        body: input.body,
        sweetness: input.sweetness,
        grip: input.grip,
        age: input.age,
        budget: input.budget,
        winnerSlug: input.winnerSlug,
        trueMatchSlug: input.trueMatchSlug,
        region: input.region,
        pickedAt: Date.now(),
      });
      return { ok: true };
    }),

  /** PUBLIC — mark the "See a Founding-Member Plan" CTA as clicked for the
   *  most-recent pick from this session. Best-effort: if no matching row,
   *  silently no-op. This is a conversion signal, not a source of truth. */
  logCtaClick: publicProcedure
    .input(
      z.object({
        sessionId: z.string().min(6).max(64),
        winnerSlug: z.string().max(80),
      })
    )
    .mutation(async ({ input }) => {
      // Update the latest un-clicked row for this (session, winner) pair.
      // ORDER BY + LIMIT 1 semantics via a subselect id lookup.
      const rows = await db
        .select({ id: schema.quizPicks.id })
        .from(schema.quizPicks)
        .where(
          and(
            eq(schema.quizPicks.sessionId, input.sessionId),
            eq(schema.quizPicks.winnerSlug, input.winnerSlug),
            isNull(schema.quizPicks.ctaClickedAt)
          )
        )
        .orderBy(desc(schema.quizPicks.pickedAt))
        .limit(1);
      if (rows.length > 0) {
        await db
          .update(schema.quizPicks)
          .set({ ctaClickedAt: Date.now() })
          .where(eq(schema.quizPicks.id, rows[0].id));
      }
      return { ok: true, matched: rows.length > 0 };
    }),

  /** OWNER — aggregate stats over the last N days for /admin/quiz-picks. */
  stats: ownerProcedure
    .input(z.object({ days: z.number().int().min(1).max(365).default(30) }).optional())
    .query(async ({ input }) => {
      const days = input?.days ?? 30;
      const sinceMs = Date.now() - days * 24 * 60 * 60 * 1000;

      // Winner distribution
      const winnerRows = await db
        .select({
          slug: schema.quizPicks.winnerSlug,
          count: sql<number>`COUNT(*)`,
          ctas: sql<number>`SUM(CASE WHEN cta_clicked_at IS NOT NULL THEN 1 ELSE 0 END)`,
        })
        .from(schema.quizPicks)
        .where(gte(schema.quizPicks.pickedAt, sinceMs))
        .groupBy(schema.quizPicks.winnerSlug);

      // Region distribution
      const regionRows = await db
        .select({
          region: schema.quizPicks.region,
          count: sql<number>`COUNT(*)`,
        })
        .from(schema.quizPicks)
        .where(gte(schema.quizPicks.pickedAt, sinceMs))
        .groupBy(schema.quizPicks.region);

      // Swap rate — how often winnerSlug != trueMatchSlug (budget downgrade
      // OR home-market swap). Useful to see how much the algorithm is
      // "correcting" the pure-palate pick.
      const totalRow = await db
        .select({
          total: sql<number>`COUNT(*)`,
          swaps: sql<number>`SUM(CASE WHEN winner_slug <> true_match_slug THEN 1 ELSE 0 END)`,
          ctas: sql<number>`SUM(CASE WHEN cta_clicked_at IS NOT NULL THEN 1 ELSE 0 END)`,
        })
        .from(schema.quizPicks)
        .where(gte(schema.quizPicks.pickedAt, sinceMs));

      const total = Number(totalRow[0]?.total ?? 0);
      const swaps = Number(totalRow[0]?.swaps ?? 0);
      const ctas = Number(totalRow[0]?.ctas ?? 0);

      return {
        days,
        total,
        swaps,
        swapRate: total > 0 ? swaps / total : 0,
        ctas,
        ctaRate: total > 0 ? ctas / total : 0,
        winners: winnerRows
          .map((r) => ({
            slug: r.slug,
            count: Number(r.count),
            ctas: Number(r.ctas ?? 0),
          }))
          .sort((a, b) => b.count - a.count),
        regions: regionRows
          .map((r) => ({ region: r.region, count: Number(r.count) }))
          .sort((a, b) => b.count - a.count),
      };
    }),

  /** OWNER — most recent picks, with full answer context. */
  list: ownerProcedure
    .input(z.object({ limit: z.number().int().min(1).max(500).default(100) }).optional())
    .query(async ({ input }) => {
      const limit = input?.limit ?? 100;
      const rows = await db
        .select()
        .from(schema.quizPicks)
        .orderBy(desc(schema.quizPicks.pickedAt))
        .limit(limit);
      return { picks: rows };
    }),
});
