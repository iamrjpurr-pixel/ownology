/**
 * qualFlags router — qualitative risk capture on Cellar Brief cards.
 *
 * The Cellar Brief engine (server/cellarBriefEngine.ts) detects
 * QUANTITATIVE risks derived from lab readings: SO₂ decay, Brix stall,
 * temp excursion, MLF drift, silent-barrel age.
 *
 * QUALITATIVE risks require winemaker observation (taste, smell, visual):
 *   - brett     — Brettanomyces / 4-EP / band-aid, barnyard on the nose
 *   - tca       — cork taint / musty smell
 *   - oxidation — flat aromas / browning / vinegar hint
 *   - h2s       — reducing / rotten-egg / mercaptan
 *   - sanitation — visible mould, biofilm, off-clean vessel
 *   - other     — winemaker's freeform observation
 *
 * Each flag ties to a specific vessel_id (matching CellarBrief Card.vesselId)
 * scoped by wineryId. When rendered on the card as an amber chip until
 * resolved. Resolution is either "confirmed and treated" or "false alarm"
 * — the operator writes a resolution note either way.
 *
 * Not a workflow engine — deliberately simple. The value is CAPTURE +
 * VISIBILITY, not automation. Follow-up actions (SO₂ dose, blend
 * decision, isolate barrel) happen in your existing Cellar Brief flow.
 */
import { z } from "zod";
import { router, wineryProcedure } from "../trpc.js";
import { db } from "../db.js";
import * as schema from "../../drizzle/schema.js";
import { and, eq, isNull, desc } from "drizzle-orm";

const FLAG_TYPES = ["brett", "tca", "oxidation", "h2s", "sanitation", "other"] as const;

export const qualFlagsRouter = router({
  /**
   * WINERY — list active (unresolved) qual flags for the winery.
   * Returned sorted vessel-first so the client can bucket them by vessel
   * card without extra grouping logic.
   */
  listActive: wineryProcedure.query(async ({ ctx }) => {
    const rows = await db
      .select()
      .from(schema.vesselQualFlags)
      .where(and(eq(schema.vesselQualFlags.wineryId, ctx.wineryId), isNull(schema.vesselQualFlags.resolvedAt)))
      .orderBy(schema.vesselQualFlags.vesselId, desc(schema.vesselQualFlags.flaggedAt));
    return rows;
  }),

  /**
   * WINERY — flag a qualitative risk on a vessel. No dedupe: if the
   * winemaker flags brett twice with different observations, that's two
   * data points, not a duplicate. Resolution collapses them.
   */
  flag: wineryProcedure
    .input(
      z.object({
        vesselId: z.string().trim().min(1).max(40),
        flagType: z.enum(FLAG_TYPES),
        note: z.string().trim().max(500).optional(),
      })
    )
    .mutation(async ({ ctx, input }) => {
      const [result] = await db.insert(schema.vesselQualFlags).values({
        wineryId: ctx.wineryId,
        vesselId: input.vesselId,
        flagType: input.flagType,
        note: input.note ?? null,
        flaggedAt: Date.now(),
      });
      return { id: (result as { insertId: number }).insertId };
    }),

  /**
   * WINERY — resolve a flag. Soft-delete via resolvedAt so the audit
   * trail survives; resolvedNote captures whether it was a real issue
   * ("confirmed brett — isolated & topped") or a false alarm ("re-tasted
   * clean, was probably yeast lees").
   */
  resolve: wineryProcedure
    .input(
      z.object({
        id: z.number().int(),
        resolvedNote: z.string().trim().max(500).optional(),
      })
    )
    .mutation(async ({ ctx, input }) => {
      await db
        .update(schema.vesselQualFlags)
        .set({ resolvedAt: Date.now(), resolvedNote: input.resolvedNote ?? null })
        .where(and(eq(schema.vesselQualFlags.id, input.id), eq(schema.vesselQualFlags.wineryId, ctx.wineryId)));
      return { ok: true };
    }),

  /**
   * WINERY — history for one vessel (resolved + unresolved, newest first).
   * Used by the "history" drawer under each vessel's flag chips.
   */
  history: wineryProcedure
    .input(z.object({ vesselId: z.string().trim().min(1).max(40) }))
    .query(async ({ ctx, input }) => {
      const rows = await db
        .select()
        .from(schema.vesselQualFlags)
        .where(and(eq(schema.vesselQualFlags.wineryId, ctx.wineryId), eq(schema.vesselQualFlags.vesselId, input.vesselId)))
        .orderBy(desc(schema.vesselQualFlags.flaggedAt));
      return rows;
    }),
});
