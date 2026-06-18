/**
 * Trinity Content Pipeline — tRPC router
 * ─────────────────────────────────────────────────────────────────────────────
 * Public procedures power the community blog surfaces + the Free Run "shared with
 * the community" badge. Owner procedures power the Trinity Review admin screen
 * (promote to featured, suppress duplicates, surface accuracy flags) and a manual
 * pipeline trigger for testing.
 */

import { z } from "zod";
import { router, publicProcedure, ownerProcedure } from "./trpc.js";
import {
  listPublishedTrinity,
  listTrinityByStatus,
  getTrinityStatusCounts,
  setTrinityStatus,
  getPublishedTrinityByReveal,
  listTrinityFaqClusters,
  getLatestNewsletterDraft,
} from "./db.js";
import {
  runTrinityClustering,
  generateFaqFromClusters,
  runMonthlyNewsletter,
  approveNewsletter,
  skipNewsletter,
} from "./trinityPipeline.js";

const primaryActSchema = z.enum(["science", "vineyard", "craft"]).optional();

export const trinityRouter = router({
  // ── Public: community blog surfaces ─────────────────────────────────────────
  /** Published (pending + featured) pieces, optionally filtered by Trinity act. */
  listPublished: publicProcedure
    .input(z.object({ act: primaryActSchema }).optional())
    .query(async ({ input }) => {
      return listPublishedTrinity(input?.act);
    }),

  /** The published piece a given reveal was folded into (for the FreeRun badge). */
  getByReveal: publicProcedure
    .input(z.object({ revealId: z.number().int().positive() }))
    .query(async ({ input }) => {
      const piece = await getPublishedTrinityByReveal(input.revealId);
      if (!piece) return { shared: false as const };
      return {
        shared: true as const,
        id: piece.id,
        question: piece.questionCanonical,
        status: piece.status,
        clusterSize: piece.clusterSize,
      };
    }),

  /** Active auto-FAQ entries for FAQ.tsx. */
  listFaq: publicProcedure
    .input(z.object({ limit: z.number().int().min(1).max(20).optional() }).optional())
    .query(async ({ input }) => {
      return listTrinityFaqClusters(input?.limit ?? 10);
    }),

  // ── Owner: Trinity Review admin ─────────────────────────────────────────────
  listPending: ownerProcedure.query(async () => {
    return listTrinityByStatus("pending");
  }),

  listFeatured: ownerProcedure.query(async () => {
    return listTrinityByStatus("featured");
  }),

  listSuppressed: ownerProcedure.query(async () => {
    return listTrinityByStatus("suppressed");
  }),

  statusCounts: ownerProcedure.query(async () => {
    return getTrinityStatusCounts();
  }),

  promoteToFeatured: ownerProcedure
    .input(z.object({ id: z.number().int().positive() }))
    .mutation(async ({ input }) => {
      await setTrinityStatus(input.id, "featured");
      return { ok: true };
    }),

  suppress: ownerProcedure
    .input(z.object({ id: z.number().int().positive() }))
    .mutation(async ({ input }) => {
      await setTrinityStatus(input.id, "suppressed");
      return { ok: true };
    }),

  unsuppress: ownerProcedure
    .input(z.object({ id: z.number().int().positive() }))
    .mutation(async ({ input }) => {
      // Restore a suppressed piece back to pending for re-review.
      await setTrinityStatus(input.id, "pending");
      return { ok: true };
    }),

  /** Manual pipeline trigger (owner-only) — same logic the nightly cron runs. */
  runNow: ownerProcedure.mutation(async () => {
    const summary = await runTrinityClustering();
    let faqCount = 0;
    try {
      faqCount = await generateFaqFromClusters();
    } catch {
      // non-fatal
    }
    return { ...summary, faqCount };
  }),

  // ── Owner: monthly newsletter (24h preview window) ──────────────────────────
  /** The most recent newsletter draft (for the Review screen Newsletter panel). */
  latestNewsletter: ownerProcedure.query(async () => {
    const draft = await getLatestNewsletterDraft();
    if (!draft) return { exists: false as const };
    return {
      exists: true as const,
      id: draft.id,
      period: draft.periodLabel,
      subject: draft.subject,
      body: draft.body,
      status: draft.status,
      previewUntil: draft.previewUntil,
      sentAt: draft.sentAt,
    };
  }),

  /** Compose this month's issue now (idempotent per period). */
  composeNewsletterNow: ownerProcedure.mutation(async () => {
    return runMonthlyNewsletter();
  }),

  /** Approve a preview draft — sends immediately via Buttondown. */
  approveNewsletter: ownerProcedure
    .input(z.object({ id: z.number().int().positive() }))
    .mutation(async ({ input }) => {
      const sent = await approveNewsletter(input.id);
      return { ok: sent };
    }),

  /** Skip a preview draft — it will never be sent. */
  skipNewsletter: ownerProcedure
    .input(z.object({ id: z.number().int().positive() }))
    .mutation(async ({ input }) => {
      const ok = await skipNewsletter(input.id);
      return { ok };
    }),
});
