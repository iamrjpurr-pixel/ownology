import { z } from "zod";
import { router, publicProcedure, ownerProcedure } from "./trpc.js";
import {
  getCampaignMetricsHistory,
  getLatestCampaignMetrics,
  upsertCampaignMetricsSnapshot,
  getFoundingMemberCount,
  listFoundingMembers,
  addFoundingMember,
} from "./db.js";

// ─── Campaign Metrics Router ──────────────────────────────────────────────────

const campaignMetricsRouter = router({
  // Public: get the latest snapshot (used on Pricing page for founding member count)
  getLatest: publicProcedure.query(async () => {
    return getLatestCampaignMetrics();
  }),

  // Owner-only: get full history for the dashboard chart
  getHistory: ownerProcedure
    .input(z.object({ limit: z.number().min(1).max(104).default(26) }).optional())
    .query(async ({ input }) => {
      return getCampaignMetricsHistory(input?.limit ?? 26);
    }),

  // Owner-only: manually upsert a snapshot (for backfilling or corrections)
  upsert: ownerProcedure
    .input(
      z.object({
        weekLabel: z.string().regex(/^\d{4}-W\d{2}$/, "Must be ISO week format e.g. 2026-W20"),
        snapshotAt: z.number().optional(),
        waitlistCount: z.number().min(0).optional(),
        emailOpenRate: z.number().min(0).max(10000).optional(), // basis points
        emailClickRate: z.number().min(0).max(10000).optional(),
        organicSessions: z.number().min(0).optional(),
        topKeywordRank: z.number().min(0).optional(),
        foundingMemberCount: z.number().min(0).optional(),
        mrr: z.number().min(0).optional(), // AUD cents
        merchOrders: z.number().min(0).optional(),
        merchRevenue: z.number().min(0).optional(), // AUD cents
        complianceQueries: z.number().min(0).optional(),
        notes: z.string().max(1000).optional(),
      })
    )
    .mutation(async ({ input }) => {
      await upsertCampaignMetricsSnapshot({
        ...input,
        snapshotAt: input.snapshotAt ?? Date.now(),
      });
      return { ok: true };
    }),
});

// ─── Founding Members Router ──────────────────────────────────────────────────

const foundingMembersRouter = router({
  // Public: get the count (used on Pricing page)
  getCount: publicProcedure.query(async () => {
    return { count: await getFoundingMemberCount() };
  }),

  // Owner-only: list all founding members
  list: ownerProcedure.query(async () => {
    return listFoundingMembers();
  }),

  // Owner-only: add a founding member manually
  add: ownerProcedure
    .input(
      z.object({
        email: z.string().email(),
        name: z.string().optional(),
        wineryName: z.string().optional(),
        state: z.string().optional(),
        tier: z.enum(["cellar", "press", "cellar_master"]).optional(),
        stripeCustomerId: z.string().optional(),
        notes: z.string().optional(),
      })
    )
    .mutation(async ({ input }) => {
      await addFoundingMember(input);
      return { ok: true };
    }),
});

// ─── App Router ───────────────────────────────────────────────────────────────

export const appRouter = router({
  campaignMetrics: campaignMetricsRouter,
  foundingMembers: foundingMembersRouter,
});

export type AppRouter = typeof appRouter;
