import { z } from "zod";
import Stripe from "stripe";
import { freeRunRouter } from "./freeRunRouter.js";
import { cellarJournalRouter } from "./cellarJournalRouter.js";
import { trinityRouter } from "./trinityRouter.js";
import { vintageLogRouter } from "./routers/vintageLog.js";
import { knowledgeRouter } from "./routers/knowledge.js";
import { tutorRouter } from "./routers/tutor.js";
import { wbsAdminRouter } from "./routers/wbsAdmin.js";
import { eq, or, like, and, desc, sql } from "drizzle-orm";
import { router, publicProcedure, ownerProcedure, protectedProcedure } from "./trpc.js";
import { getLlmStats, resetLlmStats } from "./_core/llmMeter.js";
import { buildScopedKnowledgeBase, buildSourceDoctrineSummary } from "./complianceKnowledgeBase.js";
import { buildQADoctrineSummary, QA_DOCTRINE, getTopics } from "./complianceQADoctrine.js";
import {
  listBarrels,
  createBarrel,
  updateBarrel,
  deleteBarrel,
  listPackagingInventory,
  addPackagingItem,
  updatePackagingItem,
  deletePackagingItem,
  getCampaignMetricsHistory,
  getLatestCampaignMetrics,
  upsertCampaignMetricsSnapshot,
  getFoundingMemberCount,
  listFoundingMembers,
  addFoundingMember,
  listVintageLogEntries,
  getUserByOpenId,
  upsertTankReminder,
  listTankReminders,
  deleteTankReminder,
  type ReminderEventType,
  createWineBatch,
  listWineBatches,
  updateWineBatchNotes,
  updateWineBatch,
  deleteWineBatch,
  addLead,
  listLeads,
  updateLeadNotes,
  updateLead,
  deleteLead,
  listCellarEquipment,
  addCellarEquipment,
  updateCellarEquipment,
  deleteCellarEquipment,
  deleteTasksByEquipment,
  listCellarTasks,
  addCellarTask,
  completeCellarTask,
  uncompleteCellarTask,
  deleteCellarTask,
  type EquipmentType,
  type EquipmentMaterial,
  type TaskType,
  db,
  listVineyardBlocks,
  createVineyardBlock,
  updateVineyardBlock,
  deleteVineyardBlock,
  listVineyardObservations,
  createVineyardObservation,
  deleteVineyardObservation,
  listVintageIntelligence,
  getVintageIntelligenceByRegionYear,
  upsertVintageIntelligence,
  deleteVintageIntelligence,
} from "./db.js";
import * as schema from "../drizzle/schema.js";

function getStripe(): Stripe {
  const key = process.env.STRIPE_SECRET_KEY;
  if (!key) throw new Error("STRIPE_SECRET_KEY is not configured");
  return new Stripe(key, { apiVersion: "2026-04-22.dahlia" });
}

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

  // Public: create a Stripe Checkout session for a founding member subscription.
  // Uses price_data so no pre-created Stripe products are needed.
  // Cycle: 'monthly' = $19/mo, 'annual' = $190/yr.
  createCheckout: publicProcedure
    .input(
      z.object({
        tier: z.enum(["cellar", "press", "cellar_master"]).default("cellar"),
        cycle: z.enum(["monthly", "annual"]).default("monthly"),
        customerEmail: z.string().email().optional(),
        origin: z.string().url(),
      })
    )
    .mutation(async ({ input }) => {
      const stripe = getStripe();

      // Tier pricing (AUD cents)
      const TIER_PRICES: Record<string, { monthly: number; annual: number; name: string }> = {
        cellar: { monthly: 1900, annual: 19000, name: "Ownology — The Cellar" },
        press: { monthly: 4900, annual: 49000, name: "Ownology — The Press" },
        cellar_master: { monthly: 9900, annual: 99000, name: "Ownology — The Vigneron" },
      };

      const tierInfo = TIER_PRICES[input.tier];
      const unitAmount = input.cycle === "annual" ? tierInfo.annual : tierInfo.monthly;
      const interval = input.cycle === "annual" ? "year" : "month";
      const tierLabel = input.tier === "cellar" ? "The Cellar Hand" : input.tier === "press" ? "The Press" : "The Vigneron";
      const cycleLabel = input.cycle === "annual" ? "Annual" : "Monthly";

      const session = await stripe.checkout.sessions.create({
        mode: "subscription",
        payment_method_types: ["card"],
        allow_promotion_codes: true,
        ...(input.customerEmail ? { customer_email: input.customerEmail } : {}),
        line_items: [
          {
            quantity: 1,
            price_data: {
              currency: "aud",
              unit_amount: unitAmount,
              recurring: { interval },
              product_data: {
                name: `${tierInfo.name} (${cycleLabel})`,
                description:
                  input.tier === "cellar"
                    ? "Unlimited Compliance Agent queries, Full Free Run lesson library, 30 AI tutor credits/mo, The Press working board. Founding member pricing locked for life."
                    : input.tier === "press"
                    ? "Everything in The Cellar + 150 AI tutor credits/mo, custom document upload, priority responses, vintage log PDF export."
                    : "Everything in The Press + unlimited AI credits, 3 team seats, dedicated onboarding call, annual knowledge base review alert.",
              },
            },
          },
        ],
        metadata: {
          tier: input.tier,
          tier_label: tierLabel,
          cycle: input.cycle,
          customer_email: input.customerEmail ?? "",
          founding_member: "true",
        },
        subscription_data: {
          metadata: {
            tier: input.tier,
            founding_member: "true",
          },
        },
        success_url: `${input.origin}/founding-member/success?session_id={CHECKOUT_SESSION_ID}`,
        cancel_url: `${input.origin}/pricing?cancelled=1`,
      });

      return { url: session.url };
    }),
});

// ─── Orders Router ───────────────────────────────────────────────────────────
// Reads directly from Stripe — no local DB table needed.

export interface OrderLineItem {
  productId: string;
  productName: string;
  quantity: number;
  unitAmountAud: number; // cents
  totalAmountAud: number; // cents
}

export interface MerchOrder {
  sessionId: string;
  createdAt: number; // Unix ms
  customerEmail: string | null;
  customerName: string | null;
  amountTotalAud: number; // cents
  currency: string;
  status: "complete" | "expired" | "open";
  paymentStatus: string;
  lineItems: OrderLineItem[];
  stripeUrl: string;
}

const ordersRouter = router({
  // Owner-only: list recent completed checkout sessions with expanded line items
  list: ownerProcedure
    .input(
      z.object({
        limit: z.number().min(1).max(100).default(50),
        startingAfter: z.string().optional(),
      }).optional()
    )
    .query(async ({ input }) => {
      const stripe = getStripe();
      const limit = input?.limit ?? 50;

      const params: Stripe.Checkout.SessionListParams = {
        limit,
        expand: ["data.line_items"],
      };
      if (input?.startingAfter) params.starting_after = input.startingAfter;

      const sessions = await stripe.checkout.sessions.list(params);

      const orders: MerchOrder[] = sessions.data.map((session) => {
        const lineItems: OrderLineItem[] = (session.line_items?.data ?? []).map((li) => ({
          productId: (li.price?.metadata?.product_id as string | undefined) ?? li.price?.id ?? "unknown",
          productName: li.description ?? li.price?.product?.toString() ?? "Unknown product",
          quantity: li.quantity ?? 1,
          unitAmountAud: li.price?.unit_amount ?? 0,
          totalAmountAud: li.amount_total ?? 0,
        }));

        return {
          sessionId: session.id,
          createdAt: session.created * 1000,
          customerEmail: session.customer_details?.email ?? session.customer_email ?? null,
          customerName: session.customer_details?.name ?? null,
          amountTotalAud: session.amount_total ?? 0,
          currency: session.currency ?? "aud",
          status: session.status as MerchOrder["status"],
          paymentStatus: session.payment_status,
          lineItems,
          stripeUrl: `https://dashboard.stripe.com/payments/${session.payment_intent}`,
        };
      });

      // Summary stats
      const completedOrders = orders.filter(
        (o) => o.status === "complete" && o.paymentStatus === "paid"
      );
      const totalRevenue = completedOrders.reduce((sum, o) => sum + o.amountTotalAud, 0);
      const totalOrders = completedOrders.length;

      return {
        orders,
        hasMore: sessions.has_more,
        summary: {
          totalOrders,
          totalRevenue,
          avgOrderValue: totalOrders > 0 ? Math.round(totalRevenue / totalOrders) : 0,
        },
      };
    }),
});

// ─── Admin Router ────────────────────────────────────────────────────────────
// Single ownerProcedure that confirms ownership and returns a lightweight
// summary for the /admin hub page (avoids multiple round-trips).

const adminRouter = router({
  complianceDoctrine: ownerProcedure.query(() => {
    const topics = getTopics();
    const entries = QA_DOCTRINE.map((e) => ({
      id: e.id,
      topic: e.topic,
      jurisdiction: e.jurisdiction,
      question: e.question,
      keywords: e.keywords,
      answer: e.answer,
      citations: e.citations,
      lastVerified: e.lastVerified,
    }));
    return { topics, entries, total: entries.length };
  }),
  summary: ownerProcedure.query(async () => {
    // Latest campaign snapshot
    const latest = await getLatestCampaignMetrics();
    // Founding member count
    const foundingMemberCount = await getFoundingMemberCount();
    // Stripe: count of completed sessions (last 100)
    let stripeOrderCount = 0;
    let stripeRevenueCents = 0;
    try {
      const stripe = getStripe();
      const sessions = await stripe.checkout.sessions.list({ limit: 100 });
      const completed = sessions.data.filter(
        (s) => s.status === "complete" && s.payment_status === "paid"
      );
      stripeOrderCount = completed.length;
      stripeRevenueCents = completed.reduce((sum, s) => sum + (s.amount_total ?? 0), 0);
    } catch {
      // Stripe not configured yet — return zeros
    }
    return {
      waitlistCount: latest?.waitlistCount ?? 0,
      foundingMemberCount,
      stripeOrderCount,
      stripeRevenueCents,
      latestWeek: latest?.weekLabel ?? null,
      snapshotAt: latest?.snapshotAt ?? null,
    };
  }),

  /**
   * LLM cost meter — in-memory aggregator showing what we've spent on LLM
   * calls since the last deploy/reset. Granularity: by model, by source.
   * Zero-cost to operate (no LLM calls, no DB writes).
   */
  llmStats: ownerProcedure.query(async () => {
    return getLlmStats();
  }),

  /** Reset the LLM cost meter — useful for cost-experiments. */
  resetLlmStats: ownerProcedure.mutation(async () => {
    resetLlmStats();
    return { ok: true };
  }),

  /**
   * Reset today's Free Run quota — CI/QA helper so test runs can repeatedly
   * exercise freeRun.curiosityAsk without hitting the 3/day cap.
   * Optional `userId`: if omitted, clears ALL users' usage for today.
   */
  resetFreeRunQuota: ownerProcedure
    .input(z.object({ userId: z.number().optional() }).optional())
    .mutation(async ({ input }) => {
      const today = new Date().toISOString().slice(0, 10);
      const userId = input?.userId;
      if (userId !== undefined) {
        await db
          .delete(schema.freeRunDailyUsage)
          .where(
            and(
              eq(schema.freeRunDailyUsage.userId, userId),
              eq(schema.freeRunDailyUsage.dateKey, today)
            )
          );
        return { ok: true, scope: "user", userId, dateKey: today };
      }
      await db
        .delete(schema.freeRunDailyUsage)
        .where(eq(schema.freeRunDailyUsage.dateKey, today));
      return { ok: true, scope: "all", dateKey: today };
    }),

  /**
   * AI answer feedback list (admin view) — shows recent thumbs-down feedback
   * so prompts/RAG gaps can be hunted. Limit 50 most recent.
   */
  aiFeedback: ownerProcedure.query(async () => {
    const rows = await db
      .select()
      .from(schema.aiAnswerFeedback)
      .orderBy(desc(schema.aiAnswerFeedback.createdAt))
      .limit(50);
    return rows;
  }),
});


// ─── Tank Reminders Router ──────────────────────────────────────────────────────────────────────────────

const REMINDER_EVENT_TYPES = ["addition", "measurement", "racking", "inoculation", "observation", "any"] as const;

const vintageReminderRouter = router({
  upsert: protectedProcedure
    .input(
      z.object({
        tankName: z.string().min(1).max(128),
        eventType: z.enum(REMINDER_EVENT_TYPES),
        thresholdHours: z.number().int().min(1).max(168), // 1h to 7 days
        isActive: z.boolean(),
      })
    )
    .mutation(async ({ ctx, input }) => {
      const dbUser = await getUserByOpenId(ctx.user.openId);
      if (!dbUser) throw new Error("User not found");
      const id = await upsertTankReminder({
        userId: dbUser.id,
        tankName: input.tankName,
        eventType: input.eventType as ReminderEventType,
        thresholdHours: input.thresholdHours,
        isActive: input.isActive,
      });
      return { success: true, id };
    }),

  list: protectedProcedure.query(async ({ ctx }) => {
    const dbUser = await getUserByOpenId(ctx.user.openId);
    if (!dbUser) return [];
    return listTankReminders(dbUser.id);
  }),

  delete: protectedProcedure
    .input(z.object({ id: z.number() }))
    .mutation(async ({ ctx, input }) => {
      const dbUser = await getUserByOpenId(ctx.user.openId);
      if (!dbUser) throw new Error("User not found");
      await deleteTankReminder(input.id, dbUser.id);
      return { success: true };
    }),
});

// ─── Wine Batch Router (Winemaker's Batch Book) ──────────────────────────────────────────────────
const wineBatchRouter = router({
  list: protectedProcedure.query(async ({ ctx }) => {
    const dbUser = await getUserByOpenId(ctx.user.openId);
    if (!dbUser) return [];
    return listWineBatches(dbUser.id);
  }),
  create: protectedProcedure
    .input(
      z.object({
        batchId: z.string().min(1).max(32),
        vintage: z.number().int().min(1900).max(2100),
        variety: z.string().min(1).max(128),
        gi: z.string().max(128).default(""),
        growerDetails: z.string().max(1000).optional(),
        receivedAt: z.number().optional(),
        quantityValue: z.string().max(32).optional(),
        quantityUnit: z.enum(["kg", "t", "L"]).optional(),
        tankName: z.string().max(128).optional(),
        volumeLitres: z.number().int().min(1).max(1000000).optional(),
        costPerLitre: z.number().int().min(0).max(100000).optional(),
      })
    )
    .mutation(async ({ ctx, input }) => {
      const dbUser = await getUserByOpenId(ctx.user.openId);
      if (!dbUser) throw new Error("User not found");
      const id = await createWineBatch({ userId: dbUser.id, ...input });
      return { success: true, id };
    }),
  updateNotes: protectedProcedure
    .input(
      z.object({
        id: z.number(),
        notesJson: z.string(),
      })
    )
    .mutation(async ({ ctx, input }) => {
      const dbUser = await getUserByOpenId(ctx.user.openId);
      if (!dbUser) throw new Error("User not found");
      await updateWineBatchNotes(input.id, dbUser.id, input.notesJson);
      return { success: true };
    }),
  update: protectedProcedure
    .input(
      z.object({
        id: z.number(),
        batchId: z.string().min(1).max(32).optional(),
        vintage: z.number().int().min(1900).max(2100).optional(),
        variety: z.string().min(1).max(128).optional(),
        gi: z.string().max(128).optional(),
        growerDetails: z.string().max(1000).optional(),
        receivedAt: z.number().optional(),
        quantityValue: z.string().max(32).optional(),
        quantityUnit: z.enum(["kg", "t", "L"]).optional(),
        tankName: z.string().max(128).optional(),
        volumeLitres: z.number().int().min(1).max(1000000).optional(),
        costPerLitre: z.number().int().min(0).max(100000).optional(),
      })
    )
    .mutation(async ({ ctx, input }) => {
      const dbUser = await getUserByOpenId(ctx.user.openId);
      if (!dbUser) throw new Error("User not found");
      const { id, ...data } = input;
      await updateWineBatch(id, dbUser.id, data);
      return { success: true };
    }),
  delete: protectedProcedure
    .input(z.object({ id: z.number() }))
    .mutation(async ({ ctx, input }) => {
      const dbUser = await getUserByOpenId(ctx.user.openId);
      if (!dbUser) throw new Error("User not found");
      await deleteWineBatch(input.id, dbUser.id);
      return { success: true };
    }),
});

// ─── Email Subscribe Router ──────────────────────────────────────────────────
// Server-side Buttondown subscription — keeps the API key off the frontend.
const emailRouter = router({
  subscribe: publicProcedure
    .input(
      z.object({
        email: z.string().email(),
        tags: z.array(z.string()).optional(),
        source: z.string().optional(),
        name: z.string().optional(),
        wineryName: z.string().optional(),
      })
    )
    .mutation(async ({ input }) => {
      const source = input.source ?? (input.tags?.[0] ?? "unknown");
      const tags = input.tags ?? [];

      // 1. Always save to our own CRM first (independent of Buttondown)
      try {
        await addLead({
          email: input.email,
          source,
          tags,
          name: input.name,
          wineryName: input.wineryName,
        });
      } catch (err) {
        console.error("[emailRouter] Failed to save lead to DB", err);
        // Don't fail the whole request — DB write failure shouldn't block the user
      }

      // 2. Also subscribe to Buttondown if key is configured
      const apiKey = process.env.BUTTONDOWN_API_KEY ?? "";
      if (apiKey) {
        try {
          const res = await fetch("https://api.buttondown.email/v1/subscribers", {
            method: "POST",
            headers: {
              "Content-Type": "application/json",
              Authorization: `Token ${apiKey}`,
            },
            body: JSON.stringify({
              email_address: input.email,
              tags,
            }),
          });
          if (res.status !== 201 && res.status !== 200 && res.status !== 409) {
            const body = await res.text();
            console.error("[emailRouter] Buttondown error", res.status, body);
          }
        } catch (err) {
          console.error("[emailRouter] Buttondown fetch error", err);
        }
      }

      return { ok: true };
    }),
});

// ─── Leads (CRM) Router ─────────────────────────────────────────────────────────────
// All procedures are ownerProcedure — only the site owner can view/edit leads.

const leadsRouter = router({
  list: ownerProcedure
    .input(z.object({ limit: z.number().min(1).max(1000).default(500) }).optional())
    .query(async ({ input }) => {
      const rows = await listLeads(input?.limit ?? 500);
      return rows.map((r) => ({
        ...r,
        tags: JSON.parse(r.tagsJson) as string[],
      }));
    }),

  updateNotes: ownerProcedure
    .input(z.object({ id: z.number(), notes: z.string().max(4000) }))
    .mutation(async ({ input }) => {
      await updateLeadNotes(input.id, input.notes);
      return { ok: true };
    }),

  update: ownerProcedure
    .input(
      z.object({
        id: z.number(),
        name: z.string().max(256).optional(),
        wineryName: z.string().max(256).optional(),
        notes: z.string().max(4000).optional(),
        source: z.string().max(64).optional(),
        tags: z.array(z.string()).optional(),
      })
    )
    .mutation(async ({ input }) => {
      const { id, tags, ...rest } = input;
      await updateLead(id, {
        ...rest,
        tagsJson: tags ? JSON.stringify(tags) : undefined,
      });
      return { ok: true };
    }),

  delete: ownerProcedure
    .input(z.object({ id: z.number() }))
    .mutation(async ({ input }) => {
      await deleteLead(input.id);
      return { ok: true };
    }),

  // Manual add from admin panel
  add: ownerProcedure
    .input(
      z.object({
        email: z.string().email(),
        source: z.string().max(64).default("manual"),
        tags: z.array(z.string()).optional(),
        name: z.string().max(256).optional(),
        wineryName: z.string().max(256).optional(),
        notes: z.string().max(4000).optional(),
      })
    )
    .mutation(async ({ input }) => {
      const id = await addLead({
        email: input.email,
        source: input.source,
        tags: input.tags,
        name: input.name,
        wineryName: input.wineryName,
      });
            if (input.notes) await updateLeadNotes(id, input.notes);
      return { ok: true, id };
    }),
  // Public: join the professional tier waitlist
  join: publicProcedure
    .input(
      z.object({
        email: z.string().email(),
        name: z.string().max(256).optional(),
        wineryName: z.string().max(256).optional(),
        annualProduction: z.string().max(64).optional(),
        tier: z.enum(["cellar_master", "press", "cellar"]).default("cellar_master"),
        message: z.string().max(1000).optional(),
      })
    )
    .mutation(async ({ input }) => {
      const tags = ["waitlist", `tier:${input.tier}`];
      if (input.annualProduction) tags.push(`production:${input.annualProduction}`);
      const id = await addLead({
        email: input.email,
        source: "waitlist",
        name: input.name,
        wineryName: input.wineryName,
        tags,
      });
      if (input.message) await updateLeadNotes(id, input.message);
      return { ok: true, id };
    }),
});
// ─── Site Content Router (Owner Inline Editing) ─────────────────────────────

const siteContentRouter = router({
  // Public: get all content overrides as a key→value map
  getAll: publicProcedure.query(async () => {
    const rows = await db.query.siteContent.findMany();
    const map: Record<string, string> = {};
    for (const row of rows) map[row.contentKey] = row.value;
    return map;
  }),

  // Owner only: upsert a content key
  set: ownerProcedure
    .input(z.object({ key: z.string().max(256), value: z.string().max(10000) }))
    .mutation(async ({ input }) => {
      await db
        .insert(schema.siteContent)
        .values({ contentKey: input.key, value: input.value, updatedAt: Date.now() })
        .onDuplicateKeyUpdate({ set: { value: input.value, updatedAt: Date.now() } });
      return { ok: true };
    }),
});

// ─── Compliance Router ──────────────────────────────────────────────────────

const complianceRouter = router({
  ask: publicProcedure
    .input(
      z.object({
        question: z.string().min(1).max(2000),
        jurisdictions: z.array(z.string()).optional(),
        stateFilter: z.string().optional(),
        history: z
          .array(z.object({ role: z.enum(["user", "assistant"]), content: z.string() }))
          .max(20)
          .optional(),
      })
    )
    .mutation(async ({ input }) => {
      const forgeUrl = process.env.BUILT_IN_FORGE_API_URL;
      const forgeKey = process.env.BUILT_IN_FORGE_API_KEY;

      if (!forgeUrl || !forgeKey) {
        throw new Error("LLM service not configured");
      }

      // ── Stage 1: Jurisdiction classifier ──────────────────────────────────
      const classifierPrompt = `You are a jurisdiction classifier for Australian winery regulatory questions.
Given a user question, identify which Australian jurisdictions it relates to.
Respond with a JSON object only, no explanation:
{"jurisdictions": ["Federal", "SA", "VIC", "NSW", "WA", "QLD", "TAS"], "inScope": true}

Rules:
- "jurisdictions" must be an array containing only values from: "Federal", "SA", "VIC", "NSW", "WA", "QLD", "TAS"
- Always include "Federal" if the question touches on Wine Australia, FSANZ, WET, biosecurity, or WHS model law
- "inScope" must be false if the question is completely unrelated to Australian winery regulations
- If the user filter is not "All", bias toward that jurisdiction but include Federal if relevant

User jurisdiction filter: ${input.stateFilter === "All" || !input.stateFilter ? "All jurisdictions" : input.stateFilter}
User question: ${input.question}`;

      let detectedJurisdictions: string[] = ["Federal", "SA", "VIC", "NSW", "WA", "QLD", "TAS"];
      let inScope = true;

      try {
        const classifierResp = await fetch(`${forgeUrl}/v1/chat/completions`, {
          method: "POST",
          headers: { "Content-Type": "application/json", Authorization: `Bearer ${forgeKey}` },
          body: JSON.stringify({
            messages: [{ role: "user", content: classifierPrompt }],
            response_format: { type: "json_object" },
            stream: false,
          }),
        });
        if (classifierResp.ok) {
          const classifierData = await classifierResp.json();
          const parsed = JSON.parse(classifierData.choices?.[0]?.message?.content || "{}");
          if (Array.isArray(parsed.jurisdictions) && parsed.jurisdictions.length > 0) {
            detectedJurisdictions = parsed.jurisdictions;
          }
          if (parsed.inScope === false) inScope = false;
        }
      } catch {
        // classifier failed — fall back to full knowledge base
      }

      if (!inScope) {
        return {
          answer:
            "That question appears to be outside the scope of Australian winery compliance. " +
            "I can help with topics such as liquor licensing, environmental obligations, WHS, " +
            "food safety, water licensing, Wine Australia registration, FSANZ standards, and WET. " +
            "Please ask a question related to these areas.",
          outOfScope: true,
        };
      }

      // ── Stage 2: Focused answer with scoped knowledge base ────────────────────────────────────────
      const isHomeWinemaker = input.stateFilter === "HomeWinemaker";
      const scopeJurisdictions = isHomeWinemaker
        ? ["HomeWinemaker"]
        : input.stateFilter && input.stateFilter !== "All" && input.stateFilter !== "Federal"
          ? ["Federal", input.stateFilter]
          : input.stateFilter === "Federal"
          ? ["Federal"]
          : detectedJurisdictions;

      const scopedKB = buildScopedKnowledgeBase(scopeJurisdictions);
      const jurisdictionLabel = isHomeWinemaker ? "Home Winemaker Practical Guide" : scopeJurisdictions.join(", ");

      const systemPrompt = isHomeWinemaker
        ? `You are a practical home winemaking assistant. You help home winemakers with hands-on questions about the winemaking process.
You have been given a Home Winemaker Practical Guide as your knowledge base.

Answer questions accurately and helpfully based ONLY on the knowledge base provided below.
If a question falls outside home winemaking (e.g. commercial licensing, export regulations), say so clearly.
Keep answers practical, specific, and actionable — the user is likely standing in their garage or cellar.

You MUST respond with a JSON object only — no markdown fences, no explanation outside the JSON.
The JSON must have exactly this shape:
{
  "answer": "<your full answer text, may include newlines>",
  "disclaimer": "Home winemaking practices vary — always taste and judge your wine yourself. For commercial production, consult a qualified winemaker.",
  "citations": [
    {
      "title": "Home Winemaker Practical Guide",
      "section": "<Relevant section name, e.g. Cap Management, Racking and Free-Run>",
      "jurisdiction": "Home Winemaker",
      "url": null
    }
  ]
}

Knowledge base:
${scopedKB}`
        : `You are a regulatory compliance assistant specialising in Australian winery regulations.
You have been given a targeted knowledge base covering: ${jurisdictionLabel}.

Answer questions accurately and concisely based ONLY on the knowledge base provided below.
If a question falls outside the knowledge base, say so clearly and suggest the relevant agency to contact.

You MUST respond with a JSON object only — no markdown fences, no explanation outside the JSON.
The JSON must have exactly this shape:
{
  "answer": "<your full answer text, may include newlines>",
  "disclaimer": "Always verify current requirements with the relevant agency or a qualified compliance professional.",
  "citations": [
    {
      "title": "<Full act or standard name>",
      "section": "<Specific section, clause, or standard number if applicable, otherwise null>",
      "jurisdiction": "<Federal | SA | VIC | NSW | WA | QLD | TAS>",
      "url": "<Official URL to the legislation or agency page if you are confident it is correct, otherwise null>"
    }
  ]
}

Rules for citations:
- Include one citation object per distinct piece of legislation, standard, or regulation referenced in your answer.
- Use the exact act name as it appears in the knowledge base (e.g. "Liquor Licensing Act 1997 (SA)", "Food Standards Code — Standard 4.5.1", "Wine Australia Act 2013").
- If the answer draws on multiple acts, list each separately.
- If no specific legislation applies, return an empty citations array.
- For the url field: use ONLY the verified URLs listed in the VERIFIED SOURCE URLS section below. Do NOT fabricate or guess URLs. If the act is not in the list, set url to null.

${buildSourceDoctrineSummary()}

${buildQADoctrineSummary(scopeJurisdictions)}

KNOWLEDGE BASE:
${scopedKB}`;

      const messages = [
        { role: "system" as const, content: systemPrompt },
        ...(input.history ?? []).map((m) => ({ role: m.role as "user" | "assistant", content: m.content })),
        { role: "user" as const, content: input.question },
      ];

      const response = await fetch(`${forgeUrl}/v1/chat/completions`, {
        method: "POST",
        headers: { "Content-Type": "application/json", Authorization: `Bearer ${forgeKey}` },
        body: JSON.stringify({
          messages,
          stream: false,
          response_format: { type: "json_object" },
        }),
      });

      if (!response.ok) {
        const errText = await response.text();
        console.error("[Compliance] LLM error:", response.status, errText);
        throw new Error(`LLM error: ${response.status}`);
      }

      const data = await response.json();
      const rawContent = data.choices?.[0]?.message?.content || "{}";

      let answer = "No response received.";
      let disclaimer = "Always verify current requirements with the relevant agency or a qualified compliance professional.";
      let citations: Array<{ title: string; section: string | null; jurisdiction: string; url: string | null }> = [];

      try {
        const parsed = JSON.parse(rawContent);
        if (parsed.answer) answer = parsed.answer;
        if (parsed.disclaimer) disclaimer = parsed.disclaimer;
        if (Array.isArray(parsed.citations)) citations = parsed.citations;
      } catch {
        // JSON parse failed — treat raw content as plain answer
        answer = rawContent;
      }

      return { answer, disclaimer, citations, outOfScope: false };
    }),
});

// ─── Cellar Equipment Router ──────────────────────────────────────────────────────────────────────────────────────────────

const EQUIPMENT_TYPES = [
  "fermentation_tank",
  "barrel",
  "press",
  "pump",
  "sorting_table",
  "destemmer",
  "cold_room",
  "hose",
  "other",
] as const;

const EQUIPMENT_MATERIALS = [
  "stainless",
  "wood",
  "concrete",
  "fibreglass",
  "other",
] as const;

const TASK_TYPES = ["clean", "sanitise", "inspect", "maintain", "fault_log", "other"] as const;

const cellarEquipmentRouter = router({
  list: protectedProcedure.query(async ({ ctx }) => {
    const dbUser = await getUserByOpenId(ctx.user.openId);
    if (!dbUser) return [];
    return listCellarEquipment(dbUser.id);
  }),

  add: protectedProcedure
    .input(
      z.object({
        name: z.string().min(1).max(128),
        equipmentType: z.enum(EQUIPMENT_TYPES),
        material: z.enum(EQUIPMENT_MATERIALS).default("stainless"),
        capacityL: z.number().int().positive().optional(),
        quantity: z.number().int().min(1).max(9999).default(1),
        notes: z.string().max(1000).optional(),
      })
    )
    .mutation(async ({ ctx, input }) => {
      const dbUser = await getUserByOpenId(ctx.user.openId);
      if (!dbUser) throw new Error("User not found");
      const id = await addCellarEquipment({
        userId: dbUser.id,
        name: input.name,
        equipmentType: input.equipmentType as EquipmentType,
        material: input.material as EquipmentMaterial,
        capacityL: input.capacityL,
        quantity: input.quantity,
        notes: input.notes,
      });
      return { success: true, id };
    }),

  update: protectedProcedure
    .input(
      z.object({
        id: z.number(),
        name: z.string().min(1).max(128).optional(),
        equipmentType: z.enum(EQUIPMENT_TYPES).optional(),
        material: z.enum(EQUIPMENT_MATERIALS).optional(),
        capacityL: z.number().int().positive().nullable().optional(),
        quantity: z.number().int().min(1).max(9999).optional(),
        notes: z.string().max(1000).nullable().optional(),
      })
    )
    .mutation(async ({ ctx, input }) => {
      const dbUser = await getUserByOpenId(ctx.user.openId);
      if (!dbUser) throw new Error("User not found");
      const { id, ...data } = input;
      await updateCellarEquipment(id, dbUser.id, data as Parameters<typeof updateCellarEquipment>[2]);
      return { success: true };
    }),

  delete: protectedProcedure
    .input(z.object({ id: z.number() }))
    .mutation(async ({ ctx, input }) => {
      const dbUser = await getUserByOpenId(ctx.user.openId);
      if (!dbUser) throw new Error("User not found");
      await deleteTasksByEquipment(input.id, dbUser.id);
      await deleteCellarEquipment(input.id, dbUser.id);
      return { success: true };
    }),

  batchAdd: protectedProcedure
    .input(
      z.array(
        z.object({
          name: z.string().min(1).max(128),
          equipmentType: z.enum(EQUIPMENT_TYPES),
          material: z.enum(EQUIPMENT_MATERIALS).default("other"),
          capacityL: z.number().int().positive().optional(),
          quantity: z.number().int().min(1).max(9999).default(1),
          notes: z.string().max(1000).optional(),
        })
      ).max(50)
    )
    .mutation(async ({ ctx, input }) => {
      const dbUser = await getUserByOpenId(ctx.user.openId);
      if (!dbUser) throw new Error("User not found");
      const ids: number[] = [];
      for (const item of input) {
        const id = await addCellarEquipment({
          userId: dbUser.id,
          name: item.name,
          equipmentType: item.equipmentType as EquipmentType,
          material: item.material as EquipmentMaterial,
          capacityL: item.capacityL,
          quantity: item.quantity,
          notes: item.notes,
        });
        ids.push(id);
      }
      return { success: true, count: ids.length, ids };
    }),
});

// ─── Cellar Tasks Router ──────────────────────────────────────────────────────────────────────────────────────────────

const cellarTasksRouter = router({
  list: protectedProcedure.query(async ({ ctx }) => {
    const dbUser = await getUserByOpenId(ctx.user.openId);
    if (!dbUser) return [];
    return listCellarTasks(dbUser.id);
  }),

  add: protectedProcedure
    .input(
      z.object({
        equipmentId: z.number().optional(),
        equipmentName: z.string().min(1).max(128),
        taskType: z.enum(TASK_TYPES),
        title: z.string().min(1).max(256),
        methodNotes: z.string().max(2000).optional(),
        frequency: z.string().max(64).optional(),
        dueAt: z.number().optional(),
        aiGenerated: z.boolean().optional(),
        // DR-03: vessel linkage
        vesselId: z.string().max(128).optional(),
        vesselType: z.enum(["tank", "barrel", "other"]).optional(),
      })
    )
    .mutation(async ({ ctx, input }) => {
      const dbUser = await getUserByOpenId(ctx.user.openId);
      if (!dbUser) throw new Error("User not found");
      const id = await addCellarTask({
        userId: dbUser.id,
        equipmentId: input.equipmentId,
        equipmentName: input.equipmentName,
        taskType: input.taskType as TaskType,
        title: input.title,
        methodNotes: input.methodNotes,
        frequency: input.frequency,
        dueAt: input.dueAt,
        aiGenerated: input.aiGenerated,
        vesselId: input.vesselId,
        vesselType: input.vesselType,
      });
      return { success: true, id };
    }),

  complete: protectedProcedure
    .input(z.object({ id: z.number(), completedBy: z.string().max(256).default("Me") }))
    .mutation(async ({ ctx, input }) => {
      const dbUser = await getUserByOpenId(ctx.user.openId);
      if (!dbUser) throw new Error("User not found");
      await completeCellarTask(input.id, dbUser.id, input.completedBy);
      return { success: true };
    }),

  uncomplete: protectedProcedure
    .input(z.object({ id: z.number() }))
    .mutation(async ({ ctx, input }) => {
      const dbUser = await getUserByOpenId(ctx.user.openId);
      if (!dbUser) throw new Error("User not found");
      await uncompleteCellarTask(input.id, dbUser.id);
      return { success: true };
    }),

  delete: protectedProcedure
    .input(z.object({ id: z.number() }))
    .mutation(async ({ ctx, input }) => {
      const dbUser = await getUserByOpenId(ctx.user.openId);
      if (!dbUser) throw new Error("User not found");
      await deleteCellarTask(input.id, dbUser.id);
      return { success: true };
    }),

  generateForEquipment: protectedProcedure
    .input(
      z.object({
        equipmentId: z.number(),
        equipmentName: z.string().min(1).max(128),
        equipmentType: z.enum(EQUIPMENT_TYPES),
        material: z.enum(EQUIPMENT_MATERIALS),
        capacityL: z.number().optional(),
        quantity: z.number().optional(),
        notes: z.string().optional(),
      })
    )
    .mutation(async ({ ctx, input }) => {
      const dbUser = await getUserByOpenId(ctx.user.openId);
      if (!dbUser) throw new Error("User not found");

      const forgeUrl = process.env.BUILT_IN_FORGE_API_URL;
      const forgeKey = process.env.BUILT_IN_FORGE_API_KEY;
      if (!forgeUrl || !forgeKey) throw new Error("LLM service not configured");

      const equipmentDesc = [
        `Name: ${input.equipmentName}`,
        `Type: ${input.equipmentType.replace(/_/g, " ")}`,
        `Material: ${input.material}`,
        input.capacityL ? `Capacity: ${input.capacityL}L` : null,
        input.quantity && input.quantity > 1 ? `Quantity: ${input.quantity}` : null,
        input.notes ? `Notes: ${input.notes}` : null,
      ]
        .filter(Boolean)
        .join("\n");

      const prompt = `You are a cellar hygiene expert for boutique wineries. Given the following piece of winery equipment, generate 3-6 practical cleaning and maintenance tasks specific to this equipment type and material. For wood: include sulfur wick treatment and tartrate inspection. For stainless: include CIP protocols and cooling jacket flushing. For presses: include membrane/basket inspection. For pumps: include seal inspection and line flushing.\n\nEquipment:\n${equipmentDesc}\n\nRespond with a JSON array only:\n[{"taskType":"clean"|"sanitise"|"inspect"|"maintain","title":"<max 60 chars>","methodNotes":"<1-3 sentences>","frequency":"Before use"|"After use"|"Weekly"|"Monthly"|"Annual"|"Pre-vintage"|"Post-vintage"}]`;

      const resp = await fetch(`${forgeUrl}/v1/chat/completions`, {
        method: "POST",
        headers: { "Content-Type": "application/json", Authorization: `Bearer ${forgeKey}` },
        body: JSON.stringify({
          messages: [{ role: "user", content: prompt }],
          response_format: { type: "json_object" },
          stream: false,
        }),
      });

      if (!resp.ok) throw new Error("LLM request failed");
      const data = await resp.json();
      const rawContent = data.choices?.[0]?.message?.content || "[]";

      let tasks: Array<{ taskType: string; title: string; methodNotes: string; frequency: string }>;
      try {
        const parsed = JSON.parse(rawContent);
        tasks = Array.isArray(parsed) ? parsed : (parsed.tasks ?? parsed.items ?? []);
      } catch {
        tasks = [];
      }

      const validTypes = ["clean", "sanitise", "inspect", "maintain", "fault_log", "other"];
      const insertedIds: number[] = [];
      for (const t of tasks) {
        const taskType = validTypes.includes(t.taskType) ? t.taskType : "other";
        const id = await addCellarTask({
          userId: dbUser.id,
          equipmentId: input.equipmentId,
          equipmentName: input.equipmentName,
          taskType: taskType as TaskType,
          title: t.title?.slice(0, 256) || "Untitled task",
          methodNotes: t.methodNotes?.slice(0, 2000),
          frequency: t.frequency || "After use",
          aiGenerated: true,
        });
        insertedIds.push(id);
      }

      return { success: true, count: insertedIds.length, ids: insertedIds };
    }),
});

// ─── Production Dashboard Router ──────────────────────────────────────────────
// Aggregates across all vintage log entries and wine batches for the dashboard.

const dashboardRouter = router({
  getStats: protectedProcedure.query(async ({ ctx }) => {
    const dbUser = await getUserByOpenId(ctx.user.openId);
    if (!dbUser) return null;

    const now = Date.now();
    const fourteenDaysAgo = now - 14 * 24 * 60 * 60 * 1000;

    // All log entries for this user (up to 500 for aggregation)
    const allEntries = await listVintageLogEntries(dbUser.id, 500);

    // All wine batches
    const batches = await listWineBatches(dbUser.id);

    // Unique tank names from log entries
    const tankNames = Array.from(new Set(allEntries.map((e) => e.tankName))).sort();

    // Per-tank summary
    const tankSummaries = tankNames.map((tankName) => {
      const entries = allEntries.filter((e) => e.tankName === tankName);
      const inoculationEntry = entries.find((e) => e.eventType === "inoculation");
      const lastEntry = entries[0]; // already sorted desc by entryAt
      const variety = lastEntry?.variety ?? "Unknown";

      // Days since inoculation
      let daysSinceInoculation: number | null = null;
      if (inoculationEntry) {
        daysSinceInoculation = Math.floor((now - inoculationEntry.entryAt) / (24 * 60 * 60 * 1000));
      }

      // Active ferment = inoculated within 14 days
      const isActiveFerment = daysSinceInoculation !== null && daysSinceInoculation <= 14;

      // Last event type
      const lastEventType = lastEntry?.eventType ?? null;
      const lastEventAt = lastEntry?.entryAt ?? null;

      // Linked batch volume and cost
      const linkedBatch = batches.find((b) => b.tankName === tankName);
      const volumeLitres = linkedBatch?.volumeLitres ?? null;
      const costPerLitre = linkedBatch?.costPerLitre ?? null;
      const batchId = linkedBatch?.batchId ?? null;
      const vintage = linkedBatch?.vintage ?? null;

      return {
        tankName,
        variety,
        daysSinceInoculation,
        isActiveFerment,
        lastEventType,
        lastEventAt,
        volumeLitres,
        costPerLitre,
        batchId,
        vintage,
        entryCount: entries.length,
      };
    });

    // Aggregate counts
    const activeFermentCount = tankSummaries.filter((t) => t.isActiveFerment).length;
    const totalTanks = tankSummaries.length;
    const totalLogEntries = allEntries.length;
    const totalBatches = batches.length;

    // Total litres in active ferment
    const totalActiveFermentLitres = tankSummaries
      .filter((t) => t.isActiveFerment && t.volumeLitres)
      .reduce((sum, t) => sum + (t.volumeLitres ?? 0), 0);

    // Tanks approaching bottling: inoculated 60-120 days ago (post-ferment window)
    const approachingBottlingCount = tankSummaries.filter(
      (t) => t.daysSinceInoculation !== null && t.daysSinceInoculation >= 60 && t.daysSinceInoculation <= 120
    ).length;

    // Recent additions (last 7 days)
    const sevenDaysAgo = now - 7 * 24 * 60 * 60 * 1000;
    const recentAdditions = allEntries.filter(
      (e) => e.eventType === "addition" && e.entryAt >= sevenDaysAgo
    ).length;

    // Build per-vintage summary for the multi-vintage comparison table
    const vintageGroups: Record<number, { variety: string; volumeLitres: number | null; inoculationDate: number | null; bottlingDate: number | null; status: string; batchId: string; tankName: string | null }[]> = {};
    for (const b of batches) {
      if (!vintageGroups[b.vintage]) vintageGroups[b.vintage] = [];
      // Find inoculation and bottling dates from log entries for this batch's tank
      const batchEntries = b.tankName ? allEntries.filter((e) => e.tankName === b.tankName) : [];
      const inoculationEntry = batchEntries.find((e) => e.eventType === "inoculation");
      const bottlingEntry = batchEntries.find((e) => e.eventType === "bottling_run");
      const lastEntry = batchEntries[0];
      let status = "Registered";
      if (bottlingEntry) status = "Bottled";
      else if (lastEntry?.eventType === "racking") status = "Post-Ferment";
      else if (inoculationEntry) {
        const daysSince = Math.floor((now - inoculationEntry.entryAt) / (24 * 60 * 60 * 1000));
        if (daysSince <= 14) status = "Fermenting";
        else if (daysSince <= 120) status = "Maturing";
        else status = "Awaiting Bottling";
      }
      vintageGroups[b.vintage].push({
        variety: b.variety,
        volumeLitres: b.volumeLitres ?? null,
        inoculationDate: inoculationEntry?.entryAt ?? null,
        bottlingDate: bottlingEntry?.entryAt ?? null,
        status,
        batchId: b.batchId,
        tankName: b.tankName ?? null,
      });
    }
    const vintageComparison = Object.entries(vintageGroups)
      .sort(([a], [b]) => Number(b) - Number(a))
      .map(([year, batchList]) => ({
        vintage: Number(year),
        batches: batchList,
        totalVolume: batchList.reduce((s, b) => s + (b.volumeLitres ?? 0), 0),
      }));

    return {
      totalTanks,
      activeFermentCount,
      totalActiveFermentLitres,
      approachingBottlingCount,
      totalLogEntries,
      totalBatches,
      recentAdditions,
      tankSummaries,
      vintageComparison,
    };
  }),
});

// ─── Barrel Router (DR-08) ──────────────────────────────────────────────────
const OAK_TYPES = ["French", "American", "Hungarian", "Slavonian", "Other"] as const;
const BARREL_FORMATS = ["Barrique (225L)", "Hogshead (300L)", "Puncheon (500L)", "Foudre (>500L)", "Other"] as const;

const barrelRouter = router({
  list: protectedProcedure.query(async ({ ctx }) => {
    const dbUser = await getUserByOpenId(ctx.user.openId);
    if (!dbUser) return [];
    return listBarrels(dbUser.id);
  }),

  create: protectedProcedure
    .input(
      z.object({
        barrelId: z.string().min(1).max(64),
        oakType: z.enum(OAK_TYPES),
        format: z.enum(BARREL_FORMATS),
        ageYears: z.number().int().min(0).max(100),
        fillDate: z.number().optional(),
        wineLot: z.string().max(256).optional(),
        notes: z.string().max(2000).optional(),
      })
    )
    .mutation(async ({ ctx, input }) => {
      const dbUser = await getUserByOpenId(ctx.user.openId);
      if (!dbUser) throw new Error("User not found");
      const id = await createBarrel({ userId: dbUser.id, ...input });
      return { success: true, id };
    }),

  update: protectedProcedure
    .input(
      z.object({
        id: z.number(),
        barrelId: z.string().min(1).max(64).optional(),
        oakType: z.enum(OAK_TYPES).optional(),
        format: z.enum(BARREL_FORMATS).optional(),
        ageYears: z.number().int().min(0).max(100).optional(),
        fillDate: z.number().nullable().optional(),
        lastToppedDate: z.number().nullable().optional(),
        wineLot: z.string().max(256).nullable().optional(),
        notes: z.string().max(2000).nullable().optional(),
        isActive: z.boolean().optional(),
      })
    )
    .mutation(async ({ ctx, input }) => {
      const dbUser = await getUserByOpenId(ctx.user.openId);
      if (!dbUser) throw new Error("User not found");
      const { id, ...rest } = input;
      await updateBarrel(id, dbUser.id, rest);
      return { success: true };
    }),

  recordTopping: protectedProcedure
    .input(z.object({ id: z.number() }))
    .mutation(async ({ ctx, input }) => {
      const dbUser = await getUserByOpenId(ctx.user.openId);
      if (!dbUser) throw new Error("User not found");
      await updateBarrel(input.id, dbUser.id, { lastToppedDate: Date.now() });
      return { success: true };
    }),

  delete: protectedProcedure
    .input(z.object({ id: z.number() }))
    .mutation(async ({ ctx, input }) => {
      const dbUser = await getUserByOpenId(ctx.user.openId);
      if (!dbUser) throw new Error("User not found");
      await deleteBarrel(input.id, dbUser.id);
      return { success: true };
    }),
});

// ─── Packaging Inventory Router (DR-13) ────────────────────────────────────

const packagingRouter = router({
  list: protectedProcedure.query(async ({ ctx }) => {
    const dbUser = await getUserByOpenId(ctx.user.openId);
    if (!dbUser) return [];
    return listPackagingInventory(dbUser.id);
  }),

  add: protectedProcedure
    .input(z.object({
      itemName: z.string().min(1).max(256),
      category: z.enum(["bottle", "label", "capsule", "cork", "box", "other"]),
      quantityOnHand: z.number().int().min(0),
      reorderLevel: z.number().int().min(0),
      unit: z.string().min(1).max(32).default("units"),
      notes: z.string().max(1000).optional(),
    }))
    .mutation(async ({ ctx, input }) => {
      const dbUser = await getUserByOpenId(ctx.user.openId);
      if (!dbUser) throw new Error("User not found");
      const id = await addPackagingItem({ userId: dbUser.id, ...input });
      return { id };
    }),

  update: protectedProcedure
    .input(z.object({
      id: z.number(),
      itemName: z.string().min(1).max(256).optional(),
      category: z.enum(["bottle", "label", "capsule", "cork", "box", "other"]).optional(),
      quantityOnHand: z.number().int().min(0).optional(),
      reorderLevel: z.number().int().min(0).optional(),
      unit: z.string().min(1).max(32).optional(),
      notes: z.string().max(1000).nullable().optional(),
    }))
    .mutation(async ({ ctx, input }) => {
      const dbUser = await getUserByOpenId(ctx.user.openId);
      if (!dbUser) throw new Error("User not found");
      const { id, ...rest } = input;
      await updatePackagingItem(id, dbUser.id, rest);
      return { success: true };
    }),

  delete: protectedProcedure
    .input(z.object({ id: z.number() }))
    .mutation(async ({ ctx, input }) => {
      const dbUser = await getUserByOpenId(ctx.user.openId);
      if (!dbUser) throw new Error("User not found");
      await deletePackagingItem(input.id, dbUser.id);
      return { success: true };
    }),
});

// ─── Vineyard Router (DR-06) ─────────────────────────────────────────────────

const TRAINING_SYSTEMS = ["VSP", "Scott Henry", "Smart-Dyson", "Pergola", "Bush Vine", "Other"] as const;
const OBSERVATION_TYPES = ["budburst", "flowering", "veraison", "harvest_date", "spray_application", "irrigation", "canopy_management", "disease_scouting", "pest_scouting", "disease_pest_event", "yield_estimate", "other"] as const;

const vineyardRouter = router({
  listBlocks: protectedProcedure.query(async ({ ctx }) => {
    const dbUser = await getUserByOpenId(ctx.user.openId);
    if (!dbUser) return [];
    return listVineyardBlocks(dbUser.id);
  }),

  addBlock: protectedProcedure
    .input(z.object({
      blockName: z.string().min(1).max(128),
      variety: z.string().min(1).max(128),
      areaHa: z.number().positive().optional(),
      plantingYear: z.number().int().min(1800).max(2100).optional(),
      rootstock: z.string().max(128).optional(),
      trainingSystem: z.enum(TRAINING_SYSTEMS).optional(),
      soilType: z.string().max(256).optional(),
      aspect: z.string().max(256).optional(),
      notes: z.string().optional(),
    }))
    .mutation(async ({ ctx, input }) => {
      const dbUser = await getUserByOpenId(ctx.user.openId);
      if (!dbUser) throw new Error("User not found");
      await createVineyardBlock(dbUser.id, input);
    }),

  updateBlock: protectedProcedure
    .input(z.object({
      id: z.number().int(),
      blockName: z.string().min(1).max(128).optional(),
      variety: z.string().min(1).max(128).optional(),
      areaHa: z.number().positive().nullable().optional(),
      plantingYear: z.number().int().min(1800).max(2100).nullable().optional(),
      rootstock: z.string().max(128).nullable().optional(),
      trainingSystem: z.enum(TRAINING_SYSTEMS).optional(),
      soilType: z.string().max(256).nullable().optional(),
      aspect: z.string().max(256).nullable().optional(),
      notes: z.string().nullable().optional(),
      isActive: z.boolean().optional(),
    }))
    .mutation(async ({ ctx, input }) => {
      const dbUser = await getUserByOpenId(ctx.user.openId);
      if (!dbUser) throw new Error("User not found");
      const { id, ...data } = input;
      await updateVineyardBlock(id, dbUser.id, data);
    }),

  deleteBlock: protectedProcedure
    .input(z.object({ id: z.number().int() }))
    .mutation(async ({ ctx, input }) => {
      const dbUser = await getUserByOpenId(ctx.user.openId);
      if (!dbUser) throw new Error("User not found");
      await deleteVineyardBlock(input.id, dbUser.id);
    }),

  listObservations: protectedProcedure
    .input(z.object({
      blockId: z.number().int().optional(),
      vintageYear: z.number().int().optional(),
    }).optional())
    .query(async ({ ctx, input }) => {
      const dbUser = await getUserByOpenId(ctx.user.openId);
      if (!dbUser) return [];
      return listVineyardObservations(dbUser.id, input?.blockId, input?.vintageYear);
    }),

  addObservation: protectedProcedure
    .input(z.object({
      blockId: z.number().int(),
      observationType: z.enum(OBSERVATION_TYPES),
      observedAt: z.number().int(),
      vintageYear: z.number().int().min(2000).max(2100),
      value: z.number().optional(),
      unit: z.string().max(32).optional(),
      notes: z.string().optional(),
    }))
    .mutation(async ({ ctx, input }) => {
      const dbUser = await getUserByOpenId(ctx.user.openId);
      if (!dbUser) throw new Error("User not found");
      await createVineyardObservation(dbUser.id, input);
    }),

  deleteObservation: protectedProcedure
    .input(z.object({ id: z.number().int() }))
    .mutation(async ({ ctx, input }) => {
      const dbUser = await getUserByOpenId(ctx.user.openId);
      if (!dbUser) throw new Error("User not found");
      await deleteVineyardObservation(input.id, dbUser.id);
    }),
});


// ─── Vintage Intelligence Router ────────────────────────────────────────────

const vintageIntelligenceRouter = router({
  // Public: list all entries (optionally filtered by year/state)
  list: publicProcedure
    .input(
      z.object({
        year: z.number().optional(),
        state: z.string().optional(),
      }).optional()
    )
    .query(async ({ input }) => {
      return listVintageIntelligence(input ?? {});
    }),

  // Public: get a single entry by region + year (used for AI context injection)
  getByRegionYear: publicProcedure
    .input(
      z.object({
        region: z.string(),
        year: z.number(),
      })
    )
    .query(async ({ input }) => {
      return getVintageIntelligenceByRegionYear(input.region, input.year);
    }),

  // Owner-only: create or update a vintage intelligence entry
  upsert: ownerProcedure
    .input(
      z.object({
        region: z.string().min(1).max(128),
        year: z.number().int().min(2000).max(2100),
        state: z.string().min(1).max(10),
        country: z.string().optional().default("Australia"),
        conditions: z.string().min(1),
        standoutVarieties: z.string().optional(),
        qualityRating: z.number().int().min(1).max(5).optional().default(3),
        yieldAssessment: z.string().optional(),
        winemakingNotes: z.string().optional(),
        source: z.string().optional(),
      })
    )
    .mutation(async ({ input }) => {
      return upsertVintageIntelligence(input);
    }),

  // Owner-only: delete a vintage intelligence entry
  delete: ownerProcedure
    .input(z.object({ id: z.number().int() }))
    .mutation(async ({ input }) => {
      await deleteVintageIntelligence(input.id);
      return { success: true };
    }),
});

// ─── App Router (re-export with knowledge) ───────────────────────────────────
export const appRouter = router({
  campaignMetrics: campaignMetricsRouter,
  foundingMembers: foundingMembersRouter,
  orders: ordersRouter,
  admin: adminRouter,
  vintageLog: vintageLogRouter,
  vintageReminder: vintageReminderRouter,
  wineBatch: wineBatchRouter,
  email: emailRouter,
  leads: leadsRouter,
  siteContent: siteContentRouter,
  compliance: complianceRouter,
  cellarEquipment: cellarEquipmentRouter,
  cellarTasks: cellarTasksRouter,
  dashboard: dashboardRouter,
  barrel: barrelRouter,
  packaging: packagingRouter,
  vineyard: vineyardRouter,
  knowledge: knowledgeRouter,
  tutor: tutorRouter,
  vintageIntelligence: vintageIntelligenceRouter,
  wbsAdmin: wbsAdminRouter,
  freeRun: freeRunRouter,
  cellarJournal: cellarJournalRouter,
  trinity: trinityRouter,
});
export type AppRouter = typeof appRouter;
