/**
 * cellarBriefRouter — Feb 2026.
 *
 * Exposes the Cellar Brief engine over tRPC. Three procedures:
 *   - generateNow:  on-demand brief generation (used by /cellar-brief Refresh
 *                   button + by the test page during scenario validation).
 *   - latest:       returns the most recent brief for the user's winery
 *                   without regenerating — cheap, used for first paint.
 *   - history:      paginated list of past briefs for case-study + audit.
 *
 * All procedures are wineryProcedure — multi-tenant isolation enforced at
 * the DB layer via the winery_id FK introduced in Phase 2.
 */
import { z } from "zod";
import { router, wineryProcedure } from "../trpc.js";
import { db } from "../db.js";
import * as schema from "../../drizzle/schema.js";
import { and, eq, lt, desc } from "drizzle-orm";
import { generateCellarBrief } from "../cellarBriefEngine.js";

const wineryRouter = router;

export const cellarBriefRouter = wineryRouter({
  /**
   * Generate a fresh brief now (manual trigger). Cron handlers call the same
   * underlying engine for the 06:00 / 17:00 / weekly schedule.
   */
  generateNow: wineryProcedure
    .input(z.object({
      trigger: z.enum(["morning", "evening", "weekly", "manual"]).default("manual"),
    }))
    .mutation(async ({ ctx, input }) => {
      const result = await generateCellarBrief(ctx.wineryId, input.trigger);
      return result;
    }),

  /**
   * Return the most recent brief for the current winery. Falls back to
   * generating a fresh one if none exists yet (so first-load on /cellar-brief
   * is never empty).
   */
  latest: wineryProcedure.query(async ({ ctx }) => {
    const [row] = await db
      .select()
      .from(schema.cellarBriefs)
      .where(eq(schema.cellarBriefs.wineryId, ctx.wineryId))
      .orderBy(desc(schema.cellarBriefs.generatedAt))
      .limit(1);
    if (row) {
      return {
        id: row.id,
        trigger: row.trigger,
        generatedAt: row.generatedAt,
        summary: JSON.parse(row.summaryJson),
      };
    }
    // No prior brief — generate one on first visit.
    const fresh = await generateCellarBrief(ctx.wineryId, "manual");
    return {
      id: fresh.id,
      trigger: "manual" as const,
      generatedAt: Date.now(),
      summary: fresh.summary,
    };
  }),

  /**
   * Paginated past briefs. Lightweight: returns headline fields only so the
   * list view is fast. The summary_json blob hydrates on click.
   */
  history: wineryProcedure
    .input(z.object({
      limit: z.number().int().min(1).max(60).default(20),
      beforeGeneratedAt: z.number().int().optional(),
    }))
    .query(async ({ ctx, input }) => {
      // Apply the optional pagination cursor: return briefs strictly older
      // than the cursor timestamp so callers can walk backwards through history.
      const whereExpr = input.beforeGeneratedAt
        ? and(
            eq(schema.cellarBriefs.wineryId, ctx.wineryId),
            lt(schema.cellarBriefs.generatedAt, input.beforeGeneratedAt),
          )
        : eq(schema.cellarBriefs.wineryId, ctx.wineryId);
      const rows = await db
        .select({
          id: schema.cellarBriefs.id,
          trigger: schema.cellarBriefs.trigger,
          attentionCount: schema.cellarBriefs.attentionCount,
          decisionsDueCount: schema.cellarBriefs.decisionsDueCount,
          tankCount: schema.cellarBriefs.tankCount,
          execSummary: schema.cellarBriefs.execSummary,
          generatedAt: schema.cellarBriefs.generatedAt,
        })
        .from(schema.cellarBriefs)
        .where(whereExpr)
        .orderBy(desc(schema.cellarBriefs.generatedAt))
        .limit(input.limit);
      return rows;
    }),

  /**
   * Hydrate one historical brief by id (with full summary_json).
   * Used when the user clicks a row in the history list.
   */
  getById: wineryProcedure
    .input(z.object({ id: z.number().int() }))
    .query(async ({ ctx, input }) => {
      const [row] = await db
        .select()
        .from(schema.cellarBriefs)
        .where(and(
          eq(schema.cellarBriefs.id, input.id),
          eq(schema.cellarBriefs.wineryId, ctx.wineryId),
        ))
        .limit(1);
      if (!row) return null;
      return {
        id: row.id,
        trigger: row.trigger,
        generatedAt: row.generatedAt,
        summary: JSON.parse(row.summaryJson),
      };
    }),
});
