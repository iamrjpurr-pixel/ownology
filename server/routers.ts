import { z } from "zod";
import Stripe from "stripe";
import { freeRunRouter } from "./freeRunRouter.js";
import { cellarJournalRouter, persistJournalEntry } from "./cellarJournalRouter.js";
import { trinityRouter } from "./trinityRouter.js";
import { eq, or, like, and, desc, sql } from "drizzle-orm";
import { router, publicProcedure, ownerProcedure, protectedProcedure } from "./trpc.js";
import { routeQuery, buildLiveCellarContext } from "./queryRouter.js";
import { embedText, semanticSopSearch, backfillSopEmbeddings } from "./sopEmbeddings.js";
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
  addVintageLogEntry,
  listVintageLogEntries,
  getUsedTankNames,
  deleteVintageLogEntry,
  getUserByOpenId,
  getUserCellarContext,
  type EventType,
  upsertTankReminder,
  listTankReminders,
  deleteTankReminder,
  type ReminderEventType,
  createWineBatch,
  listWineBatches,
  updateWineBatchNotes,
  updateWineBatch,
  deleteWineBatch,
  updateTankVolumeOnRacking,
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
});

// ─── Vintage Log Router ───────────────────────────────────────────────────────
// All procedures are protectedProcedure — any authenticated user can log entries.
// Entries are scoped to ctx.user.id so users only see their own log.

const EVENT_TYPES = ["addition", "measurement", "racking", "inoculation", "observation", "pre_harvest_sample", "bottling_run", "weather_event", "other"] as const;

/**
 * Auto-generate searchable tags from event type + details.
 * Called server-side so the client never needs to replicate the logic.
 */
function generateTags(eventType: EventType, details: Record<string, unknown>, variety: string, tankName: string): string[] {
  const tags: string[] = [eventType, variety, tankName];
  if (eventType === "addition") {
    const what = (details.what as string) ?? "";
    if (what) tags.push(what);
    const timing = (details.timing as string) ?? "";
    if (timing) tags.push(timing);
  } else if (eventType === "measurement") {
    const what = (details.what as string) ?? "";
    if (what) tags.push(what);
  } else if (eventType === "racking") {
    tags.push("racking");
    const leesStatus = (details.leesStatus as string) ?? "";
    if (leesStatus) tags.push(leesStatus);
  } else if (eventType === "inoculation") {
    const what = (details.what as string) ?? "";
    if (what) tags.push(what);
    const product = (details.productName as string) ?? "";
    if (product) tags.push(product);
  }
  // Deduplicate and normalise
  return Array.from(new Set(tags.map((t) => t.trim().toLowerCase()).filter(Boolean)));
}

const vintageLogRouter = router({
  add: protectedProcedure
    .input(
      z.object({
        tankName: z.string().min(1).max(128),
        variety: z.string().min(1).max(128),
        eventType: z.enum(["addition", "measurement", "racking", "inoculation", "observation", "pre_harvest_sample", "bottling_run", "weather_event", "sanitation", "other"]),
        details: z.record(z.string(), z.unknown()),
        noteText: z.string().max(2000).optional(),
        entryAt: z.number().optional(),
      })
    )
    .mutation(async ({ ctx, input }) => {
      const dbUser = await getUserByOpenId(ctx.user.openId);
      if (!dbUser) throw new Error("User not found");
      const tags = generateTags(input.eventType, input.details, input.variety, input.tankName);
      const id = await addVintageLogEntry({
        userId: dbUser.id,
        tankName: input.tankName,
        variety: input.variety,
        eventType: input.eventType,
        detailsJson: JSON.stringify(input.details),
        noteText: input.noteText,
        tagsJson: JSON.stringify(tags),
        entryAt: input.entryAt,
      });
      // DR-04: Auto-update live tank volume on Racking events
      if (input.eventType === "racking") {
        const d = input.details as { fromLocation?: string; toLocation?: string; volumeL?: number };
        if (d.fromLocation && d.volumeL) {
          await updateTankVolumeOnRacking(
            dbUser.id,
            d.fromLocation,
            d.toLocation ?? "",
            Number(d.volumeL)
          ).catch(() => { /* non-fatal — volume update is best-effort */ });
        }
      }
      return { success: true, id };
    }),

  list: protectedProcedure
    .input(z.object({ limit: z.number().min(1).max(200).optional() }))
    .query(async ({ ctx, input }) => {
      const dbUser = await getUserByOpenId(ctx.user.openId);
      if (!dbUser) return [];
      const rows = await listVintageLogEntries(dbUser.id, input.limit ?? 50);
      return rows.map((r) => ({
        ...r,
        details: JSON.parse(r.detailsJson) as Record<string, unknown>,
        tags: JSON.parse(r.tagsJson) as string[],
      }));
    }),

  getUsedTanks: protectedProcedure.query(async ({ ctx }) => {
    const dbUser = await getUserByOpenId(ctx.user.openId);
    if (!dbUser) return [];
    return getUsedTankNames(dbUser.id);
  }),

  /**
   * Real-time alerts engine. Scans the user's recent vintage_log_entries and
   * emits actionable alerts for the cellar floor: DAP due, high temp, stuck
   * ferment, ready-to-rack, tank-gone-quiet. Returns up to 6 alerts ordered
   * by severity.
   */
  alerts: protectedProcedure.query(async ({ ctx }) => {
    const dbUser = await getUserByOpenId(ctx.user.openId);
    if (!dbUser) return { alerts: [] };

    const rows = await listVintageLogEntries(dbUser.id, 400);
    if (rows.length === 0) return { alerts: [] };

    // Group events by tank, keeping most-recent first (rows already DESC by entryAt)
    const byTank = new Map<string, typeof rows>();
    for (const r of rows) {
      if (!byTank.has(r.tankName)) byTank.set(r.tankName, []);
      byTank.get(r.tankName)!.push(r);
    }

    const now = Date.now();
    const day = 86400 * 1000;
    type Alert = {
      kind: "dap_due" | "high_temp" | "stuck_ferment" | "ready_to_rack" | "tank_quiet";
      severity: "high" | "medium" | "low";
      tankName: string;
      variety: string;
      title: string;
      detail: string;
      action: string;
    };
    const alerts: Alert[] = [];

    function parseDetails(detailsJson: string): Record<string, unknown> {
      try { return JSON.parse(detailsJson) as Record<string, unknown>; } catch { return {}; }
    }

    for (const [tankName, events] of byTank.entries()) {
      const variety = events[0]?.variety ?? "—";
      const newest = events[0];
      const daysSinceNewest = (now - newest.entryAt) / day;

      // Skip tanks where the last event was >120 days ago — that vintage is over
      if (daysSinceNewest > 120) continue;

      // Helpers — find specific events
      const inoculation = events.find((e) => e.eventType === "inoculation");
      const lastRacking = events.find((e) => e.eventType === "racking");
      const measurements = events
        .filter((e) => e.eventType === "measurement")
        .map((e) => ({ at: e.entryAt, d: parseDetails(e.detailsJson) }));
      const additions = events
        .filter((e) => e.eventType === "addition")
        .map((e) => ({ at: e.entryAt, d: parseDetails(e.detailsJson) }));

      // ── Rule 1: DAP due (YAN low, no DAP added since) ──
      const lastYan = measurements.find((m) => String(m.d.what ?? "").toLowerCase() === "yan");
      if (lastYan) {
        const yanValue = parseFloat(String(lastYan.d.value ?? "")) || 0;
        const dapSinceYan = additions.find(
          (a) => String(a.d.what ?? "").toLowerCase().includes("dap") && a.at >= lastYan.at
        );
        if (yanValue > 0 && yanValue < 200 && !dapSinceYan) {
          alerts.push({
            kind: "dap_due",
            severity: yanValue < 150 ? "high" : "medium",
            tankName,
            variety,
            title: `${tankName}: DAP due`,
            detail: `YAN at ${yanValue} ppm (below 200 ppm target). No DAP added since measurement.`,
            action: "Add DAP — split addition recommended.",
          });
        }
      }

      // ── Rule 2: High fermentation temperature ──
      const lastTemp = measurements.find((m) => {
        const w = String(m.d.what ?? "").toLowerCase();
        return w === "temperature" || w === "temp";
      });
      if (lastTemp) {
        const temp = parseFloat(String(lastTemp.d.value ?? "")) || 0;
        const ageHrs = (now - lastTemp.at) / (3600 * 1000);
        if (temp > 22 && ageHrs < 24) {
          alerts.push({
            kind: "high_temp",
            severity: temp > 26 ? "high" : "medium",
            tankName,
            variety,
            title: `${tankName}: High temp (${temp}°C)`,
            detail: `Last reading ${Math.round(ageHrs)}h ago — above 22°C threshold.`,
            action: "Cool ferment — risk of stuck ferment / volatile loss.",
          });
        }
      }

      // ── Rule 3: Stuck ferment (Brix not moving) ──
      const brixSeries = measurements
        .filter((m) => String(m.d.what ?? "").toLowerCase() === "brix")
        .slice(0, 4); // most recent 4 brix
      if (brixSeries.length >= 2 && inoculation) {
        const latest = parseFloat(String(brixSeries[0].d.value ?? "")) || 0;
        const oldest = parseFloat(String(brixSeries[brixSeries.length - 1].d.value ?? "")) || 0;
        const spanDays = (brixSeries[0].at - brixSeries[brixSeries.length - 1].at) / day;
        const delta = oldest - latest;
        if (latest > 4 && spanDays >= 2 && delta < 1) {
          alerts.push({
            kind: "stuck_ferment",
            severity: "high",
            tankName,
            variety,
            title: `${tankName}: Possible stuck ferment`,
            detail: `Brix moved only ${delta.toFixed(1)}° in ${spanDays.toFixed(1)} days (currently ${latest}°Bx).`,
            action: "Check temp, YAN, and yeast viability. Consider restart protocol.",
          });
        }
      }

      // ── Rule 4: Ready to rack (Brix at dry, no recent racking) ──
      const lastBrix = brixSeries[0];
      if (lastBrix && inoculation) {
        const brix = parseFloat(String(lastBrix.d.value ?? "")) || 0;
        const rackingSinceDry = lastRacking && lastBrix.at < lastRacking.entryAt;
        const ageHrs = (now - lastBrix.at) / (3600 * 1000);
        if (brix <= 2 && brix >= -2 && !rackingSinceDry && ageHrs < 96) {
          alerts.push({
            kind: "ready_to_rack",
            severity: "medium",
            tankName,
            variety,
            title: `${tankName}: Ready to rack`,
            detail: `Brix at ${brix}°Bx (dry). No racking recorded since.`,
            action: "Plan racking off gross lees.",
          });
        }
      }

      // ── Rule 5: Tank gone quiet during active vintage ──
      if (inoculation && daysSinceNewest > 5 && daysSinceNewest < 14) {
        alerts.push({
          kind: "tank_quiet",
          severity: "low",
          tankName,
          variety,
          title: `${tankName}: No recent activity`,
          detail: `Last log entry ${Math.round(daysSinceNewest)} days ago. Active vintage tank.`,
          action: "Walk the cellar — check on this tank.",
        });
      }
    }

    const order = { high: 0, medium: 1, low: 2 };
    alerts.sort((a, b) => order[a.severity] - order[b.severity]);
    return { alerts: alerts.slice(0, 6) };
  }),

  delete: protectedProcedure
    .input(z.object({ id: z.number() }))
    .mutation(async ({ ctx, input }) => {
      const dbUser = await getUserByOpenId(ctx.user.openId);
      if (!dbUser) throw new Error("User not found");
      await deleteVintageLogEntry(input.id, dbUser.id);
      return { success: true };
    }),

  // ── DR-01: Inline AI interpretation of measurement log entries ──────────────
  interpretMeasurement: protectedProcedure
    .input(
      z.object({
        tankName: z.string(),
        variety: z.string(),
        details: z.record(z.string(), z.unknown()),
        // Optional context: recent entries for the same tank
        recentContext: z.string().max(2000).optional(),
      })
    )
    .mutation(async ({ input }) => {
      const forgeUrl = process.env.BUILT_IN_FORGE_API_URL;
      const forgeKey = process.env.BUILT_IN_FORGE_API_KEY;
      if (!forgeUrl || !forgeKey) throw new Error("LLM service not configured");

      const detailsText = Object.entries(input.details)
        .map(([k, v]) => `${k}: ${v}`)
        .join(", ");

      const systemPrompt = `You are a concise winemaking assistant. Given a measurement log entry, provide a brief (2-4 sentence) professional interpretation. Focus on:
- Whether the reading is within normal range for this stage of winemaking
- Any immediate action recommended (e.g., SO₂ addition, nutrient addition, racking)
- Any risk flag if the value is outside acceptable range
Be direct and practical. Use winemaking terminology. Do not repeat the values back verbatim.`;

      const userMessage = `Tank: ${input.tankName} (${input.variety})
Measurement: ${detailsText}${input.recentContext ? `\nRecent context: ${input.recentContext}` : ""}`;

      const resp = await fetch(`${forgeUrl}/v1/chat/completions`, {
        method: "POST",
        headers: { "Content-Type": "application/json", Authorization: `Bearer ${forgeKey}` },
        body: JSON.stringify({
          messages: [
            { role: "system", content: systemPrompt },
            { role: "user", content: userMessage },
          ],
          stream: false,
        }),
      });

      if (!resp.ok) throw new Error("LLM request failed");
      const data = await resp.json();
      const interpretation = data.choices?.[0]?.message?.content ?? "Unable to interpret this measurement.";
      return { interpretation };
    }),

  generateVintageCard: protectedProcedure
    .input(z.object({ batchId: z.string() }))
    .mutation(async ({ ctx, input }) => {
      const dbUser = await getUserByOpenId(ctx.user.openId);
      if (!dbUser) throw new Error("User not found");

      // Fetch batch details
      const allBatches = await listWineBatches(dbUser.id);
      const batch = allBatches.find((b) => b.batchId === input.batchId);
      if (!batch) throw new Error("Batch not found");

      // Fetch all log entries for this tank
      const allEntries = (await listVintageLogEntries(dbUser.id, 200)).filter(
        (e) => e.tankName === batch.tankName
      );

      // Build a compact summary of the log
      const logSummary = allEntries
        .slice(0, 40)
        .map((e) => {
          const d = new Date(e.entryAt).toLocaleDateString("en-AU", { day: "numeric", month: "short" });
          const details = (e as unknown as { details?: Record<string, unknown> }).details ? Object.entries((e as unknown as { details: Record<string, unknown> }).details).map(([k, v]) => `${k}: ${v}`).join(", ") : "";
          return `${d} [${e.eventType}] ${details}${e.noteText ? " — " + e.noteText : ""}`;
        })
        .join("\n");

      const forgeUrl = process.env.BUILT_IN_FORGE_API_URL;
      const forgeKey = process.env.BUILT_IN_FORGE_API_KEY;
      if (!forgeUrl || !forgeKey) throw new Error("LLM service not configured");

      const systemPrompt = `You are a winemaker writing a professional vintage card narrative for a wine batch. Write in an authoritative, evocative style — like a back-label story combined with a technical winemaker's note. Structure your response as:

## Vintage Story
[2-3 sentences: evocative narrative about this vintage, the variety, and the season]

## Winemaking Notes
[3-5 bullet points: key decisions made during fermentation and maturation, referencing actual data from the log]

## Profile
[2-3 sentences: expected flavour profile, structure, and drinking window]

Be specific and use real data from the log. Keep the total length to 200-280 words.`;

      const userMessage = `Batch: ${batch.batchId}\nTank: ${batch.tankName ?? "unknown"}\nVariety: ${batch.variety}\nVolume: ${batch.volumeLitres ? batch.volumeLitres + "L" : "unknown"}\nGrower: ${batch.growerDetails ?? "estate"}\nRegion: ${batch.gi ?? "unknown"}\n\nVintage Log:\n${logSummary || "No log entries recorded yet."}`;

      const resp = await fetch(`${forgeUrl}/v1/chat/completions`, {
        method: "POST",
        headers: { "Content-Type": "application/json", Authorization: `Bearer ${forgeKey}` },
        body: JSON.stringify({
          messages: [
            { role: "system", content: systemPrompt },
            { role: "user", content: userMessage },
          ],
          stream: false,
        }),
      });

      if (!resp.ok) throw new Error("LLM request failed");
      const llmData = await resp.json();
      const content = llmData.choices?.[0]?.message?.content ?? "Unable to generate vintage card.";
      return { content };
    }),

  // ── Import: parse raw text (paste or CSV) into structured entries ──────────
  parseFromText: protectedProcedure
    .input(z.object({
      rawText: z.string().min(1).max(50000),
    }))
    .mutation(async ({ input }) => {
      const forgeUrl = process.env.BUILT_IN_FORGE_API_URL;
      const forgeKey = process.env.BUILT_IN_FORGE_API_KEY;
      if (!forgeUrl || !forgeKey) throw new Error("LLM service not configured");

      const systemPrompt = `You are a winery data extraction assistant. The user will paste raw text from their cellar records — this could be copied from Excel, typed notes, emails, or handwritten notes transcribed.

Extract every cellar event you can identify and return a JSON array of entries. Each entry must have:
- tankName: string (e.g. "Tank 7", "Barrel 12A", "Press Fraction")
- variety: string (e.g. "Shiraz", "Chardonnay", "Cabernet Sauvignon")
- eventType: one of: addition | measurement | racking | inoculation | observation | pre_harvest_sample | bottling_run | weather_event | sanitation | other
- details: object with event-specific fields:
  - addition: { what: string, quantity: string, unit: string, timing?: string }
  - measurement: { what: string, value: string, unit: string }
  - racking: { fromLocation: string, toLocation: string, volumeL?: string, leesStatus?: string }
  - inoculation: { what: string, productName?: string, ratePerHL?: string }
  - observation: { text: string }
  - other: { text: string }
- entryDate: ISO date string (YYYY-MM-DD) if identifiable, otherwise null
- noteText: any additional context not captured in details, or null

Return ONLY a valid JSON array. No markdown, no explanation. If you cannot identify any entries, return [].`;

      const resp = await fetch(`${forgeUrl}/v1/chat/completions`, {
        method: "POST",
        headers: { "Content-Type": "application/json", Authorization: `Bearer ${forgeKey}` },
        body: JSON.stringify({
          messages: [
            { role: "system", content: systemPrompt },
            { role: "user", content: input.rawText },
          ],
          stream: false,
        }),
      });
      if (!resp.ok) throw new Error("LLM request failed");
      const llmData = await resp.json();
      const raw = llmData.choices?.[0]?.message?.content ?? "[]";
      try {
        const cleaned = raw.replace(/^```json\s*/i, "").replace(/^```\s*/i, "").replace(/```\s*$/i, "").trim();
        const entries = JSON.parse(cleaned);
        return { entries: Array.isArray(entries) ? entries : [] };
      } catch {
        return { entries: [] };
      }
    }),

  // ── Import: parse an image (camera/scan) into structured entries ─────────
  parseFromImage: protectedProcedure
    .input(z.object({
      imageBase64: z.string().min(1),
      mimeType: z.string().default("image/jpeg"),
    }))
    .mutation(async ({ input }) => {
      const forgeUrl = process.env.BUILT_IN_FORGE_API_URL;
      const forgeKey = process.env.BUILT_IN_FORGE_API_KEY;
      if (!forgeUrl || !forgeKey) throw new Error("LLM service not configured");

      const systemPrompt = `You are a winery data extraction assistant. The user has photographed their cellar records — this could be a handwritten notebook, whiteboard, printed lab report, or any other document.

Extract every cellar event you can identify from the image and return a JSON array of entries. Each entry must have:
- tankName: string (e.g. "Tank 7", "Barrel 12A")
- variety: string (e.g. "Shiraz", "Chardonnay")
- eventType: one of: addition | measurement | racking | inoculation | observation | pre_harvest_sample | bottling_run | weather_event | sanitation | other
- details: object with event-specific fields:
  - addition: { what: string, quantity: string, unit: string, timing?: string }
  - measurement: { what: string, value: string, unit: string }
  - racking: { fromLocation: string, toLocation: string, volumeL?: string, leesStatus?: string }
  - inoculation: { what: string, productName?: string, ratePerHL?: string }
  - observation: { text: string }
  - other: { text: string }
- entryDate: ISO date string (YYYY-MM-DD) if identifiable, otherwise null
- noteText: any additional context, or null

Return ONLY a valid JSON array. No markdown, no explanation. If you cannot identify any entries, return [].`;

      const resp = await fetch(`${forgeUrl}/v1/chat/completions`, {
        method: "POST",
        headers: { "Content-Type": "application/json", Authorization: `Bearer ${forgeKey}` },
        body: JSON.stringify({
          messages: [
            { role: "system", content: systemPrompt },
            {
              role: "user",
              content: [
                {
                  type: "image_url",
                  image_url: { url: `data:${input.mimeType};base64,${input.imageBase64}`, detail: "high" },
                },
                { type: "text", text: "Please extract all cellar log entries from this image." },
              ],
            },
          ],
          stream: false,
        }),
      });
      if (!resp.ok) throw new Error("LLM vision request failed");
      const llmData = await resp.json();
      const raw = llmData.choices?.[0]?.message?.content ?? "[]";
      try {
        const cleaned = raw.replace(/^```json\s*/i, "").replace(/^```\s*/i, "").replace(/```\s*$/i, "").trim();
        const entries = JSON.parse(cleaned);
        return { entries: Array.isArray(entries) ? entries : [] };
      } catch {
        return { entries: [] };
      }
    }),

  // ── Import: bulk-save confirmed parsed entries ────────────────────────────
  bulkSave: protectedProcedure
    .input(z.object({
      entries: z.array(z.object({
        tankName: z.string().min(1).max(128),
        variety: z.string().min(1).max(128),
        eventType: z.enum(["addition", "measurement", "racking", "inoculation", "observation", "pre_harvest_sample", "bottling_run", "weather_event", "sanitation", "other"]),
        details: z.record(z.string(), z.unknown()),
        entryDate: z.string().nullable().optional(),
        noteText: z.string().max(2000).nullable().optional(),
      })),
      importSource: z.enum(["paste", "csv", "image"]),
    }))
    .mutation(async ({ ctx, input }) => {
      const dbUser = await getUserByOpenId(ctx.user.openId);
      if (!dbUser) throw new Error("User not found");
      const batchId = `${Date.now()}-${Math.random().toString(36).slice(2, 8)}`;
      let saved = 0;
      for (const entry of input.entries) {
        const tags = generateTags(entry.eventType, entry.details, entry.variety, entry.tankName);
        const entryAt = entry.entryDate ? new Date(entry.entryDate).getTime() : Date.now();
        await addVintageLogEntry({
          userId: dbUser.id,
          tankName: entry.tankName,
          variety: entry.variety,
          eventType: entry.eventType,
          detailsJson: JSON.stringify(entry.details),
          noteText: entry.noteText ?? undefined,
          tagsJson: JSON.stringify(tags),
          entryAt: isNaN(entryAt) ? Date.now() : entryAt,
          importSource: input.importSource,
          importBatchId: batchId,
        });
        saved++;
      }
      return { saved, batchId };
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

// ─── Knowledge Platform Router (Sprint 7) ────────────────────────────────────

const knowledgeRouter = router({
  // ── SOP Library ─────────────────────────────────────────────────────────────

  // Public: list SOPs, optionally filtered by category and/or audience ('commercial' | 'diy')
  listSops: publicProcedure
    .input(z.object({
      category: z.string().optional(),
      audience: z.enum(["commercial", "diy"]).optional(),
    }).optional())
    .query(async ({ input }) => {
      const { eq, and: andOp, asc } = await import("drizzle-orm");
      let q = db.select().from(schema.sopLibrary).$dynamic();
      const conditions: any[] = [];
      if (input?.category) conditions.push(eq(schema.sopLibrary.category, input.category));
      if (input?.audience) conditions.push(eq(schema.sopLibrary.audience, input.audience));
      if (conditions.length === 1) q = q.where(conditions[0]);
      else if (conditions.length > 1) q = q.where(andOp(...conditions));
      return q.orderBy(asc(schema.sopLibrary.category), asc(schema.sopLibrary.sortOrder));
    }),

  // Public: get a single SOP by id (with vintage notes and training records)
  getSop: publicProcedure
    .input(z.object({ id: z.number().int() }))
    .query(async ({ input }) => {
      const { eq, desc } = await import("drizzle-orm");
      const [sop] = await db
        .select()
        .from(schema.sopLibrary)
        .where(eq(schema.sopLibrary.id, input.id))
        .limit(1);
      if (!sop) return null;
      const vintageNotes = await db
        .select()
        .from(schema.sopVintageNotes)
        .where(eq(schema.sopVintageNotes.sopId, input.id))
        .orderBy(desc(schema.sopVintageNotes.vintageYear));
      const trainingRecords = await db
        .select()
        .from(schema.sopTrainingRecords)
        .where(eq(schema.sopTrainingRecords.sopId, input.id))
        .orderBy(desc(schema.sopTrainingRecords.trainedAt));
      return { ...sop, vintageNotes, trainingRecords };
    }),

  // Protected: update decision logic on an SOP
  updateDecisionLogic: protectedProcedure
    .input(z.object({ id: z.number().int(), decisionLogic: z.string().max(10000) }))
    .mutation(async ({ input }) => {
      const { eq } = await import("drizzle-orm");
      await db
        .update(schema.sopLibrary)
        .set({ decisionLogic: input.decisionLogic, updatedAt: Date.now() })
        .where(eq(schema.sopLibrary.id, input.id));
      return { ok: true };
    }),

  // Public during build/test phase — lock to protectedProcedure before launch
  updateTribalKnowledge: publicProcedure
    .input(z.object({ id: z.number().int(), tribalKnowledge: z.string().max(10000) }))
    .mutation(async ({ input }) => {
      const { eq } = await import("drizzle-orm");
      await db
        .update(schema.sopLibrary)
        .set({ tribalKnowledge: input.tribalKnowledge, updatedAt: Date.now() })
        .where(eq(schema.sopLibrary.id, input.id));
      return { ok: true };
    }),

  // Public during build/test phase — lock to protectedProcedure before launch
  updateProcedureText: publicProcedure
    .input(z.object({ id: z.number().int(), procedureText: z.string().max(50000) }))
    .mutation(async ({ input }) => {
      const { eq } = await import("drizzle-orm");
      await db
        .update(schema.sopLibrary)
        .set({ procedureText: input.procedureText, isTemplate: false, updatedAt: Date.now() })
        .where(eq(schema.sopLibrary.id, input.id));
      return { ok: true };
    }),

  // ── Vintage Notes ────────────────────────────────────────────────────────────

  // Public during build/test phase — lock to protectedProcedure before launch
  addVintageNote: publicProcedure
    .input(
      z.object({
        sopId: z.number().int(),
        vintageYear: z.number().int().min(2000).max(2100),
        whatWorked: z.string().max(5000).optional(),
        whatFailed: z.string().max(5000).optional(),
        whatToChange: z.string().max(5000).optional(),
        linkedBatchId: z.number().int().optional(),
        createdBy: z.string().max(255).optional(),
      })
    )
    .mutation(async ({ ctx, input }) => {
      const now = Date.now();
      await db.insert(schema.sopVintageNotes).values({
        sopId: input.sopId,
        vintageYear: input.vintageYear,
        whatWorked: input.whatWorked ?? null,
        whatFailed: input.whatFailed ?? null,
        whatToChange: input.whatToChange ?? null,
        linkedBatchId: input.linkedBatchId ?? null,
        createdBy: input.createdBy ?? (ctx as { user?: { name?: string } }).user?.name ?? "Winemaker",
        createdAt: now,
        updatedAt: now,
      });
      return { ok: true };
    }),

  // Public: get all vintage notes for a given vintage year (for debrief view)
  getVintageDebrief: publicProcedure
    .input(z.object({ vintageYear: z.number().int() }))
    .query(async ({ input }) => {
      const { eq, desc } = await import("drizzle-orm");
      const notes = await db
        .select({
          id: schema.sopVintageNotes.id,
          sopId: schema.sopVintageNotes.sopId,
          vintageYear: schema.sopVintageNotes.vintageYear,
          whatWorked: schema.sopVintageNotes.whatWorked,
          whatFailed: schema.sopVintageNotes.whatFailed,
          whatToChange: schema.sopVintageNotes.whatToChange,
          linkedBatchId: schema.sopVintageNotes.linkedBatchId,
          createdBy: schema.sopVintageNotes.createdBy,
          createdAt: schema.sopVintageNotes.createdAt,
          sopTitle: schema.sopLibrary.title,
          sopCategory: schema.sopLibrary.category,
        })
        .from(schema.sopVintageNotes)
        .innerJoin(schema.sopLibrary, eq(schema.sopVintageNotes.sopId, schema.sopLibrary.id))
        .where(eq(schema.sopVintageNotes.vintageYear, input.vintageYear))
        .orderBy(desc(schema.sopVintageNotes.createdAt));
      return notes;
    }),

  // Protected: delete a vintage note
  deleteVintageNote: protectedProcedure
    .input(z.object({ id: z.number().int() }))
    .mutation(async ({ input }) => {
      const { eq } = await import("drizzle-orm");
      await db.delete(schema.sopVintageNotes).where(eq(schema.sopVintageNotes.id, input.id));
      return { ok: true };
    }),

  // ── Training Records ─────────────────────────────────────────────────────────

  // Protected: add a training record
  addTrainingRecord: protectedProcedure
    .input(
      z.object({
        sopId: z.number().int(),
        trainedAt: z.number().int(),
        trainerName: z.string().max(255),
        traineeName: z.string().max(255),
        traineeRole: z.string().max(100).optional(),
        status: z.enum(["completed", "in_progress", "not_started"]).default("completed"),
        notes: z.string().max(5000).optional(),
      })
    )
    .mutation(async ({ input }) => {
      await db.insert(schema.sopTrainingRecords).values({
        sopId: input.sopId,
        trainedAt: input.trainedAt,
        trainerName: input.trainerName,
        traineeName: input.traineeName,
        traineeRole: input.traineeRole ?? null,
        status: input.status,
        notes: input.notes ?? null,
        createdAt: Date.now(),
      });
      return { ok: true };
    }),

  // Public: list training records for an SOP or a trainee name
  listTrainingRecords: publicProcedure
    .input(
      z.object({
        sopId: z.number().int().optional(),
        traineeName: z.string().optional(),
      }).optional()
    )
    .query(async ({ input }) => {
      const { eq, and, desc, like } = await import("drizzle-orm");
      let q = db
        .select({
          id: schema.sopTrainingRecords.id,
          sopId: schema.sopTrainingRecords.sopId,
          trainedAt: schema.sopTrainingRecords.trainedAt,
          trainerName: schema.sopTrainingRecords.trainerName,
          traineeName: schema.sopTrainingRecords.traineeName,
          traineeRole: schema.sopTrainingRecords.traineeRole,
          status: schema.sopTrainingRecords.status,
          notes: schema.sopTrainingRecords.notes,
          sopTitle: schema.sopLibrary.title,
          sopCategory: schema.sopLibrary.category,
        })
        .from(schema.sopTrainingRecords)
        .innerJoin(schema.sopLibrary, eq(schema.sopTrainingRecords.sopId, schema.sopLibrary.id))
        .$dynamic();
      const conditions = [];
      if (input?.sopId) conditions.push(eq(schema.sopTrainingRecords.sopId, input.sopId));
      if (input?.traineeName) conditions.push(like(schema.sopTrainingRecords.traineeName, `%${input.traineeName}%`));
      if (conditions.length > 0) q = q.where(and(...conditions));
      return q.orderBy(desc(schema.sopTrainingRecords.trainedAt));
    }),

  // Protected: delete a training record
  deleteTrainingRecord: protectedProcedure
    .input(z.object({ id: z.number().int() }))
    .mutation(async ({ input }) => {
      const { eq } = await import("drizzle-orm");
      await db.delete(schema.sopTrainingRecords).where(eq(schema.sopTrainingRecords.id, input.id));
      return { ok: true };
    }),
});

// ─── Tutor Router (Scoped RAG — SOP-backed winemaking AI) ──────────────────────

// Keyword → SOP category mapping for fast retrieval
const KEYWORD_CATEGORY_MAP: Record<string, string[]> = {
  // Fermentation
  ferment: ["Fermentation Management", "Yeast & Fermentation"],
  fermentation: ["Fermentation Management", "Yeast & Fermentation"],
  stuck: ["Fermentation Management"],
  stall: ["Fermentation Management"],
  brix: ["Fermentation Management", "Harvest & Receival"],
  sg: ["Fermentation Management"],
  gravity: ["Fermentation Management"],
  temperature: ["Fermentation Management"],
  cap: ["Fermentation Management"],
  punchdown: ["Fermentation Management"],
  pump: ["Fermentation Management"],
  // Yeast & Nutrition
  yeast: ["Yeast & Fermentation", "Fermentation Management"],
  yan: ["Yeast & Fermentation"],
  dap: ["Yeast & Fermentation"],
  nutrient: ["Yeast & Fermentation"],
  inoculation: ["Yeast & Fermentation"],
  rehydration: ["Yeast & Fermentation"],
  strain: ["Yeast & Fermentation"],
  // SO2 / Sulphur
  so2: ["SO₂ Management", "Additions & Chemistry"],
  sulphur: ["SO₂ Management"],
  sulfur: ["SO₂ Management"],
  "k-meta": ["SO₂ Management"],
  kmeta: ["SO₂ Management"],
  metabisulphite: ["SO₂ Management"],
  molecular: ["SO₂ Management"],
  // MLF
  mlf: ["Malolactic Fermentation"],
  malolactic: ["Malolactic Fermentation"],
  malic: ["Malolactic Fermentation"],
  lactic: ["Malolactic Fermentation"],
  bacteria: ["Malolactic Fermentation"],
  // Racking & Clarification
  rack: ["Racking & Clarification"],
  racking: ["Racking & Clarification"],
  lees: ["Racking & Clarification"],
  fining: ["Racking & Clarification", "Additions & Chemistry"],
  bentonite: ["Racking & Clarification", "Additions & Chemistry"],
  gelatin: ["Racking & Clarification"],
  clarity: ["Racking & Clarification"],
  haze: ["Racking & Clarification"],
  filter: ["Racking & Clarification"],
  // Additions & Chemistry
  addition: ["Additions & Chemistry"],
  tartaric: ["Additions & Chemistry"],
  acid: ["Additions & Chemistry"],
  ph: ["Additions & Chemistry"],
  ta: ["Additions & Chemistry"],
  tannin: ["Additions & Chemistry"],
  oak: ["Additions & Chemistry"],
  // Harvest
  harvest: ["Harvest & Receival"],
  pick: ["Harvest & Receival"],
  receival: ["Harvest & Receival"],
  crush: ["Harvest & Receival"],
  press: ["Harvest & Receival", "Pressing & Free-Run"],
  pressing: ["Pressing & Free-Run"],
  "free-run": ["Pressing & Free-Run"],
  // Bottling & Packaging
  bottle: ["Bottling & Packaging"],
  bottling: ["Bottling & Packaging"],
  cork: ["Bottling & Packaging"],
  label: ["Bottling & Packaging"],
  packaging: ["Bottling & Packaging"],
  // Sanitation & Equipment
  sanitise: ["Sanitation & Equipment"],
  sanitize: ["Sanitation & Equipment"],
  sanitising: ["Sanitation & Equipment"],
  clean: ["Sanitation & Equipment"],
  cleaning: ["Sanitation & Equipment"],
  equipment: ["Sanitation & Equipment"],
  carboy: ["Sanitation & Equipment"],
  bubbler: ["Sanitation & Equipment"],
  demijohn: ["Sanitation & Equipment"],
  // Faults
  fault: ["Fault Diagnosis", "Fermentation Management"],
  h2s: ["Fault Diagnosis"],
  "rotten egg": ["Fault Diagnosis"],
  brett: ["Fault Diagnosis"],
  va: ["Fault Diagnosis"],
  volatile: ["Fault Diagnosis"],
  oxidation: ["Fault Diagnosis"],
  oxidised: ["Fault Diagnosis"],
};

function detectSopCategories(question: string): string[] {
  const lower = question.toLowerCase();
  const matched = new Set<string>();
  for (const [keyword, categories] of Object.entries(KEYWORD_CATEGORY_MAP)) {
    if (lower.includes(keyword)) {
      categories.forEach((c) => matched.add(c));
    }
  }
  return Array.from(matched);
}

const tutorRouter = router({
  ask: publicProcedure
    .input(
      z.object({
        question: z.string().min(1).max(2000),
        mode: z.enum(["winemaking", "home_winemaker"]).optional().default("winemaking"),
        batchSizeLitres: z.number().min(1).max(9999).optional(),
        history: z
          .array(z.object({ role: z.enum(["user", "assistant"]), content: z.string() }))
          .max(10)
          .optional(),
      })
    )
    .mutation(async ({ input, ctx }) => {
      const forgeUrl = process.env.BUILT_IN_FORGE_API_URL;
      const forgeKey = process.env.BUILT_IN_FORGE_API_KEY;
      if (!forgeUrl || !forgeKey) throw new Error("LLM service not configured");

      const isHomeWinemaker = input.mode === "home_winemaker";

      // ═══════════════════════════════════════════════════════════════════════
      // DIY HOME WINEMAKER PATH — Document-grounded bible chunk retrieval
      // Only uses published chunks from diy_knowledge_chunks.
      // Applies reasoning layer + risk assessment. Cites chapter in answer.
      // ═══════════════════════════════════════════════════════════════════════
      if (isHomeWinemaker) {
        // ── Colloquial normalisation map ──────────────────────────────────────
        // Maps home winemaker slang to technical winemaking concepts.
        // Used to expand keyword search — NOT shown to the user.
        const COLLOQUIAL_MAP: Record<string, string[]> = {
          "bubbles stopped": ["stuck fermentation", "fermentation stalled", "activity"],
          "bubbles": ["fermentation", "CO2", "activity", "yeast"],
          "stopped bubbling": ["stuck fermentation", "fermentation complete", "activity"],
          "not bubbling": ["fermentation", "MLF", "activity", "stuck"],
          "smells like eggs": ["hydrogen sulphide", "H2S", "reductive", "sulphur"],
          "egg smell": ["hydrogen sulphide", "H2S", "reductive"],
          "smells like nail polish": ["ethyl acetate", "volatile acidity", "VA"],
          "nail polish remover": ["ethyl acetate", "volatile acidity", "VA"],
          "smells off": ["fault", "volatile acidity", "H2S", "oxidation"],
          "tastes sharp": ["acidity", "TA", "pH", "tartaric"],
          "too acidic": ["TA", "pH", "acid adjustment", "calcium carbonate"],
          "too sweet": ["residual sugar", "Brix", "stuck fermentation", "dry"],
          "not dry": ["residual sugar", "stuck fermentation", "Brix"],
          "campden tablets": ["potassium metabisulphite", "SO2", "sulphite"],
          "campden": ["potassium metabisulphite", "SO2", "sulphite"],
          "marbles trick": ["headspace", "oxidation", "top-up"],
          "cap": ["pomace cap", "punch down", "cap management"],
          "punch down": ["cap management", "punch down", "extraction"],
          "pump over": ["cap management", "extraction", "oxygen"],
          "rack": ["racking", "siphon", "lees", "sediment"],
          "racking": ["racking", "lees", "siphon", "sediment"],
          "sediment": ["lees", "gross lees", "fine lees", "racking"],
          "cloudy": ["haze", "clarity", "fining", "protein", "bentonite"],
          "gone cloudy": ["haze", "clarity", "fining", "protein"],
          "white powder": ["film yeast", "oxidation", "Kahm yeast"],
          "film on surface": ["film yeast", "oxidation", "Kahm yeast"],
          "how many campden": ["SO2", "sulphite", "potassium metabisulphite", "ppm"],
          "how much sulphite": ["SO2", "sulphite", "ppm", "free SO2"],
          "when do i rack": ["racking timing", "lees", "gross lees", "sediment"],
          "when to rack": ["racking timing", "lees", "gross lees"],
          "how long do i leave it": ["fermentation duration", "aging", "maturation"],
          "can i drink it": ["maturation", "readiness", "aging", "bottle"],
          "is it ready": ["maturation", "readiness", "aging"],
          "hydrometer": ["Brix", "specific gravity", "sugar", "fermentation"],
          "refractometer": ["Brix", "sugar", "alcohol correction"],
          "carboy": ["fermenter", "vessel", "storage", "headspace"],
          "demijohn": ["fermenter", "vessel", "storage", "headspace"],
          "bucket": ["fermenter", "vessel", "primary fermentation"],
          "airlock": ["CO2", "oxygen", "fermentation", "headspace"],
          "stuck": ["stuck fermentation", "stalled", "YAN", "nutrient"],
          "mlf": ["malolactic fermentation", "lactic acid", "malic acid", "bacteria"],
          "malo": ["malolactic fermentation", "lactic acid", "malic acid"],
          "lees": ["gross lees", "fine lees", "sediment", "racking"],
          "gross lees": ["gross lees", "racking", "sediment", "pressing"],
          "press": ["pressing", "extraction", "skins", "juice"],
          "pressing": ["pressing", "extraction", "bladder press"],
          "dap": ["DAP", "diammonium phosphate", "YAN", "nutrient"],
          "fermaid": ["Fermaid-O", "Fermaid-K", "nutrient", "YAN"],
          "goferm": ["GoFerm", "yeast rehydration", "yeast hydration"],
          "oak chips": ["oak", "aging", "tannin", "flavor"],
          "oak cubes": ["oak", "aging", "tannin", "flavor"],
          "bottle shock": ["bottle shock", "sulfite", "bottling"],
          "corking": ["cork", "bottling", "sealing"],
          "fining": ["fining", "clarity", "bentonite", "gelatin"],
          "bentonite": ["fining", "protein", "clarity", "bentonite"],
          "isinglass": ["fining", "clarity", "isinglass"],
          "ph": ["pH", "acidity", "tartaric", "calcium carbonate"],
          "ta": ["TA", "total acidity", "tartaric", "acid"],
          "brix": ["Brix", "sugar", "refractometer", "hydrometer"],
          "specific gravity": ["Brix", "sugar", "hydrometer", "fermentation"],
          "sg": ["specific gravity", "Brix", "hydrometer"],
          "temperature": ["fermentation temperature", "temperature control", "cooling"],
          "too hot": ["fermentation temperature", "temperature", "cooling"],
          "too cold": ["fermentation temperature", "temperature", "yeast"],
          "yeast": ["yeast", "inoculation", "fermentation", "Saccharomyces"],
          "inoculate": ["inoculation", "yeast", "pitch"],
          "pitch": ["inoculation", "yeast", "pitch rate"],
          "sulphur": ["sulphur", "SO2", "H2S", "sulphite"],
          "sulfur": ["sulphur", "SO2", "H2S", "sulphite"],
          "oxidation": ["oxidation", "oxygen", "browning", "SO2"],
          "browning": ["oxidation", "browning", "SO2", "colour"],
          "color": ["colour", "extraction", "anthocyanins", "tannin"],
          "colour": ["colour", "extraction", "anthocyanins", "tannin"],
          "tannin": ["tannin", "structure", "mouthfeel", "extraction"],
          "mouthfeel": ["mouthfeel", "tannin", "body", "texture"],
          "flat": ["mouthfeel", "acidity", "CO2", "body"],
          "thin": ["body", "mouthfeel", "tannin", "extract"],
          "headspace": ["headspace", "oxygen", "top-up", "oxidation"],
          "top up": ["headspace", "top-up", "oxidation", "oxygen"],
          "top-up": ["headspace", "top-up", "oxidation"],
          "siphon": ["racking", "siphon", "transfer", "lees"],
          "transfer": ["racking", "transfer", "lees", "vessel"],
          // ── White wine specific ───────────────────────────────────────────
          "cold settling": ["settling", "cold settling", "solids", "juice clarity", "fining"],
          "cold soak": ["cold soaking", "skin contact", "maceration", "phenolics"],
          "skin contact": ["skin contact", "maceration", "phenolics", "cold soak"],
          "whole cluster": ["whole cluster", "pressing", "crush", "destem"],
          "pressing white": ["pressing", "press", "juice", "extraction"],
          "reductive": ["reductive", "inert gas", "oxidation", "sulphur", "H2S"],
          "inert gas": ["inert gas", "argon", "nitrogen", "CO2", "oxidation", "headspace"],
          "argon": ["argon", "inert gas", "oxidation protection", "headspace"],
          "nitrogen": ["nitrogen", "inert gas", "oxidation", "headspace"],
          "sur lie": ["sur-lie", "lees ageing", "lees contact", "autolysis", "texture"],
          "sur-lie": ["sur-lie", "lees ageing", "lees contact", "autolysis"],
          "lees ageing": ["sur-lie", "lees ageing", "autolysis", "texture", "complexity"],
          "cold stable": ["cold stability", "tartrate", "tartaric", "crystals", "stabilisation"],
          "crystals": ["tartrate crystals", "cold stability", "tartaric", "stabilisation"],
          "tartrate": ["tartrate", "cold stability", "tartaric acid", "crystals"],
          "protein stable": ["protein stability", "bentonite", "haze", "fining"],
          "protein haze": ["protein haze", "bentonite", "protein stability", "fining"],
          "heat test": ["protein stability", "heat test", "bentonite", "haze"],
          "crisp": ["acidity", "TA", "pH", "tartaric", "malic", "freshness"],
          "green": ["malic acid", "acidity", "unripe", "pH", "TA"],
          "flabby": ["low acidity", "TA", "pH", "acid addition", "tartaric"],
          "oxidised": ["oxidation", "browning", "SO2", "inert gas", "colour"],
          "oxidized": ["oxidation", "browning", "SO2", "inert gas", "colour"],
          "brett": ["Brettanomyces", "fault", "barnyard", "phenolic", "contamination"],
          "barnyard": ["Brettanomyces", "brett", "fault", "contamination"],
          "mousy": ["mousiness", "fault", "MLF", "bacteria", "contamination"],
          "geranium": ["geranium taint", "sorbate", "MLF", "fault"],
          "sorbate": ["potassium sorbate", "geranium taint", "MLF", "stabilisation"],
          "chardonnay": ["Chardonnay", "white wine", "oak", "MLF", "sur-lie"],
          "sauvignon blanc": ["Sauvignon Blanc", "white wine", "reductive", "acidity", "thiols"],
          "riesling": ["Riesling", "white wine", "acidity", "residual sugar", "low pH"],
          "pinot gris": ["Pinot Gris", "Pinot Grigio", "white wine", "skin contact"],
          "white wine": ["white wine", "white", "juice", "pressing", "cold settling"],
          "juice": ["juice", "must", "pressing", "white wine", "settling"],
          "must": ["must", "juice", "Brix", "pH", "TA", "adjustment"],
          "chromatography": ["chromatography", "MLF", "malic acid", "lactic acid", "MLF completion"],
          "paper chromatography": ["chromatography", "MLF", "malic acid", "MLF completion"],
        };

        // Expand the question with colloquial synonyms for better keyword matching
        const questionLower = input.question.toLowerCase();
        const expandedTerms = new Set<string>();
        // Add original question words
        questionLower.split(/\s+/).filter(w => w.length > 2).forEach(w => expandedTerms.add(w));
        // Add colloquial expansions
        for (const [phrase, synonyms] of Object.entries(COLLOQUIAL_MAP)) {
          if (questionLower.includes(phrase)) {
            synonyms.forEach(s => s.toLowerCase().split(/\s+/).forEach(w => expandedTerms.add(w)));
          }
        }
        const questionWords = Array.from(expandedTerms).filter(w => w.length > 2).slice(0, 20);

        // ── Wine type auto-detection ──────────────────────────────────────────
        // Detect red or white wine from question keywords. Defaults to 'both' if ambiguous.
        const RED_VARIETY_SIGNALS = [
          "shiraz", "cabernet", "merlot", "pinot noir", "grenache", "malbec", "tempranillo",
          "sangiovese", "zinfandel", "mourvedre", "nebbiolo", "barbera", "dolcetto",
          "red wine", "red grape", "red kit", "cap management", "punch down", "pump over",
          "pomace", "skin contact red", "maceration", "anthocyanin",
        ];
        const WHITE_VARIETY_SIGNALS = [
          "chardonnay", "sauvignon blanc", "riesling", "pinot gris", "pinot grigio",
          "gewurztraminer", "viognier", "semillon", "muscat", "verdejo", "albarino",
          "white wine", "white grape", "white kit", "cold settling", "cold soak",
          "sur lie", "sur-lie", "cold stable", "cold stab", "tartrate", "protein haze",
          "free-run", "press juice", "reductive", "inert gas", "argon", "nitrogen flush",
        ];
        const isRedSignal = RED_VARIETY_SIGNALS.some(s => questionLower.includes(s));
        const isWhiteSignal = WHITE_VARIETY_SIGNALS.some(s => questionLower.includes(s));
        // Determine detected wine type
        let detectedWineType: "red" | "white" | "both" = "both";
        if (isRedSignal && !isWhiteSignal) detectedWineType = "red";
        else if (isWhiteSignal && !isRedSignal) detectedWineType = "white";
        // else both (ambiguous — search all sources)
        console.log(`[DIYTutor] Detected wine type: ${detectedWineType} | red signal: ${isRedSignal} | white signal: ${isWhiteSignal}`);

        // Step 1: Retrieve published chunks — scoped to detected wine type
        const allPublishedChunks = await db
          .select({
            id: schema.diyKnowledgeChunks.id,
            chapterRef: schema.diyKnowledgeChunks.chapterRef,
            chapterTitle: schema.diyKnowledgeChunks.chapterTitle,
            topicTags: schema.diyKnowledgeChunks.topicTags,
            wbsCode: schema.diyKnowledgeChunks.wbsCode,
            content: schema.diyKnowledgeChunks.content,
            sourceDoc: schema.diyKnowledgeChunks.sourceDoc,
            wineType: schema.diyKnowledgeChunks.wineType,
          })
          .from(schema.diyKnowledgeChunks)
          .where(eq(schema.diyKnowledgeChunks.published, true))
          .limit(300);

        // Filter by detected wine type — if 'both', include all
        const scopedChunks = detectedWineType === "both"
          ? allPublishedChunks
          : allPublishedChunks.filter(c =>
              c.wineType === detectedWineType ||
              c.sourceDoc === "morew_red_outline" && detectedWineType === "red" ||
              c.sourceDoc === "morew_white_outline" && detectedWineType === "white"
            );

        // Score each chunk by expanded keyword overlap
        const scored = scopedChunks.map((chunk) => {
          const haystack = [
            (chunk.topicTags ?? "").toLowerCase(),
            (chunk.chapterTitle ?? "").toLowerCase(),
            chunk.content.toLowerCase().slice(0, 800),
          ].join(" ");
          const score = questionWords.reduce((acc, word) => acc + (haystack.includes(word) ? 1 : 0), 0);
          // Boost outline chunks — they are home-scale by design
          const sourceBoost = (chunk.sourceDoc === "morew_red_outline" || chunk.sourceDoc === "morew_white_outline") ? 0.5 : 0;
          return { ...chunk, score: score + sourceBoost };
        });

        // Take top 6 most relevant chunks (mix of sources)
        const topChunks = scored
          .filter((c) => c.score > 0)
          .sort((a, b) => b.score - a.score)
          .slice(0, 6);

        // If no keyword match, take fermentation intro chunks from both sources
        const relevantChunks = topChunks.length > 0 ? topChunks : allPublishedChunks.slice(0, 4);

        console.log(`[DIYTutor] Retrieved ${relevantChunks.length} published chunks (top score: ${topChunks[0]?.score ?? 0}) | sources: ${Array.from(new Set<string>(relevantChunks.map(c => c.sourceDoc ?? ''))).join(', ')}`);

        // Step 2: Build document context with source labels
        const docContext = relevantChunks
          .map((chunk) => {
            let docLabel: string;
            if (chunk.sourceDoc === "red_wine_bible") docLabel = "Red Wine Bible";
            else if (chunk.sourceDoc === "morew_red_outline") docLabel = "MoreWine! Red Winemaking Outline (home scale)";
            else if (chunk.sourceDoc === "white_wine_bible") docLabel = "White Wine Bible";
            else docLabel = chunk.sourceDoc ?? "Reference Document";
            return `## ${docLabel} — ${chunk.chapterTitle ?? `Chapter ${chunk.chapterRef}`}\n${chunk.content.slice(0, 2000)}`;
          })
          .join("\n\n---\n\n");

        const sourceRefs = Array.from(new Set<string>(relevantChunks.map((c) => c.chapterTitle ?? `Chapter ${c.chapterRef}`))).slice(0, 4);

        // Step 3: Batch size extraction — use explicit input if provided, else parse from question text
        let batchSizeContext: string;
        if (input.batchSizeLitres) {
          batchSizeContext = `The user has selected a batch size of ${input.batchSizeLitres} litres. Scale ALL quantities, dosages, and measurements to this exact volume. Always state "for your ${input.batchSizeLitres}L batch" when giving quantities.`;
        } else {
          const batchSizeMatch = questionLower.match(/(\d+(?:\.\d+)?)\s*(litre|liter|l\b|gallon|gal|L)/);
          const batchSize = batchSizeMatch ? `${batchSizeMatch[1]} ${batchSizeMatch[2]}` : null;
          batchSizeContext = batchSize
            ? `The user has stated their batch size is ${batchSize}. Scale all quantities and dosages to this volume.`
            : `The user has not stated their batch size. Assume a standard home winemaker batch of 23 litres (5 gallons) and state this assumption in your answer.`;
        }

        // Step 4: Risk classification — detect high-risk topics
        const highRiskKeywords = ["so2", "sulfite", "sulphite", "metabisulphite", "metabisulfite",
          "campden", "potassium", "sorbate", "bentonite", "tartaric", "citric", "acid addition",
          "dap", "yan", "nutrient", "dosage", "ppm", "grams per", "g/l", "mg/l",
          "fining", "isinglass", "gelatin", "casein", "food safe", "how much", "how many"];
        const isHighRisk = highRiskKeywords.some((kw) => questionLower.includes(kw));

        // Step 5: Build DIY system prompt — colloquial, scale-aware, document-grounded
        const diySystemPrompt = `You are a friendly, knowledgeable home winemaking assistant. You help home winemakers at garage scale (typically 10–100 litres). You speak in plain, everyday English — not textbook language.

COLLOQUIAL LANGUAGE RULES:
- If the user says "bubbles stopped" they mean stuck or completed fermentation
- If they say "smells like eggs" they mean hydrogen sulphide (H2S)
- If they say "nail polish remover" they mean ethyl acetate or volatile acidity
- If they say "campden tablets" they mean potassium metabisulphite (SO2 source)
- If they say "cap" they mean the pomace cap that forms during red wine fermentation
- If they say "rack" or "racking" they mean siphoning wine off the sediment
- If they say "marbles trick" they mean filling headspace to prevent oxidation
- Translate any commercial-scale language in the documents to home-scale equivalents

SCALE TRANSLATION RULES:
- Convert all quantities from per hectolitre (hL) to per litre, then scale to the user's batch
- "Pump-over" → "punch-down or gentle stir with a spoon"
- "Laboratory analysis" → "hydrometer or refractometer reading"
- "Tank" → "carboy, bucket, or demijohn"
- "Inoculation rate in g/hL" → convert to grams for the user's batch size
- Always state the assumed or stated batch size in your answer

BATCH SIZE: ${batchSizeContext}

WINE TYPE CONTEXT: The user appears to be asking about ${detectedWineType === 'both' ? 'general winemaking (could be red or white)' : detectedWineType + ' wine'}. Tailor your answer to ${detectedWineType === 'both' ? 'the applicable wine type, or both if relevant' : detectedWineType + ' wine specifically'}.

DOCUMENT-GROUNDED RULES:
1. Answer from the reference documents provided. If the exact answer is not there, reason from the principles in the documents and say so.
2. Cite the source document and section (e.g. "According to the MoreWine! Outline, Section C...").
3. If the question is outside the scope of all provided documents, say so honestly and suggest what topics are covered.

RISK GUIDANCE:
${isHighRisk ? '- This question involves chemical additions or dosages. Provide the document guidance, scale the quantities to the user\'s batch size, and add: "Always do a bench trial on a small sample before treating the whole batch. Verify products with your homebrew supplier."' : '- This is a process or technique question. Answer confidently and practically.'}

RESPONSE FORMAT — respond with a JSON object only, no markdown fences:
{
  "answer": "<plain English answer, scaled to batch size, citing source>",
  "sourceChapters": ["<source and section 1>", "<source and section 2>"],
  "riskLevel": "${isHighRisk ? 'high' : 'low'}",
  "disclaimer": "${isHighRisk ? 'Scale quantities to your batch size. Do a bench trial before treating the whole batch. Verify products with your homebrew supplier.' : 'Home winemaking varies — always taste and trust your senses.'}"
}

REFERENCE DOCUMENTS:
${docContext}`;

        const diyMessages = [
          { role: "system" as const, content: diySystemPrompt },
          ...(input.history ?? []).map((m) => ({ role: m.role as "user" | "assistant", content: m.content })),
          { role: "user" as const, content: input.question },
        ];

        const diyResponse = await fetch(`${forgeUrl}/v1/chat/completions`, {
          method: "POST",
          headers: { "Content-Type": "application/json", Authorization: `Bearer ${forgeKey}` },
          body: JSON.stringify({ messages: diyMessages, stream: false, response_format: { type: "json_object" } }),
        });

        if (!diyResponse.ok) {
          const errText = await diyResponse.text();
          console.error("[DIYTutor] LLM error:", diyResponse.status, errText);
          throw new Error(`LLM error: ${diyResponse.status}`);
        }

        const diyData = await diyResponse.json();
        const diyRawContent = diyData.choices?.[0]?.message?.content || "{}";

        let diyAnswer = "No response received.";
        let diySourceChapters: string[] = sourceRefs;
        let diyDisclaimer = isHighRisk
          ? "Verify chemical quantities and products with your homebrew supplier before use."
          : "Home winemaking practices vary — always taste and judge your wine yourself.";
        let diyRiskLevel = isHighRisk ? "high" : "low";

        try {
          const parsed = JSON.parse(diyRawContent);
          if (parsed.answer) diyAnswer = parsed.answer;
          if (Array.isArray(parsed.sourceChapters)) diySourceChapters = parsed.sourceChapters;
          if (parsed.disclaimer) diyDisclaimer = parsed.disclaimer;
          if (parsed.riskLevel) diyRiskLevel = parsed.riskLevel;
        } catch {
          diyAnswer = diyRawContent;
        }

        // ── Persist to Cellar Journal (fire-and-forget) ──
        persistJournalEntry({
          question: input.question,
          topicTag:
            Array.isArray(diySourceChapters) && diySourceChapters.length > 0
              ? diySourceChapters[0]
              : "Home Winemaking",
          fullAnswer: diyAnswer,
          source: "tutor.ask",
          audience: "home_winemaker",
          wineType: detectedWineType ?? "unknown",
          citations: (diySourceChapters || []).map((c) => ({ label: c })),
        }).catch((e) => console.warn("[CellarJournal] persist failed:", e?.message));

        return {
          answer: diyAnswer,
          sopTitles: diySourceChapters,
          disclaimer: diyDisclaimer,
          riskLevel: diyRiskLevel,
        };
      }

      // ═══════════════════════════════════════════════════════════════════════
      // COMMERCIAL WINEMAKER PATH — SOP-based retrieval (unchanged)
      // ═══════════════════════════════════════════════════════════════════════

      // ── Step 1: Query Router — classify intent and determine retrieval strategy ────
      const routerDecision = await routeQuery(input.question, forgeUrl, forgeKey);
      console.log(`[QueryRouter] intents=${routerDecision.intents.join(",")} categories=${routerDecision.sopCategories.join(",")} confidence=${routerDecision.confidence} | ${routerDecision.reasoning}`);

      // If compliance question, signal to the LLM to redirect
      const isComplianceRedirect = routerDecision.isCompliance;

      // ── Step 2: SOP Retriever ─────────────────────────────────────────────────
      let sops: Array<{ title: string; category: string; procedureText: string | null; decisionLogic: string | null; tribalKnowledge: string | null }> = [];

      if (routerDecision.sopCategories.length > 0) {
        // Commercial: Router-guided category retrieval
        const categoryConditions = routerDecision.sopCategories.map((cat) =>
          like(schema.sopLibrary.category, `%${cat}%`)
        );
        sops = await db
          .select({
            title: schema.sopLibrary.title,
            category: schema.sopLibrary.category,
            procedureText: schema.sopLibrary.procedureText,
            decisionLogic: schema.sopLibrary.decisionLogic,
            tribalKnowledge: schema.sopLibrary.tribalKnowledge,
          })
          .from(schema.sopLibrary)
          .where(and(eq(schema.sopLibrary.audience, "commercial"), or(...categoryConditions)))
          .limit(3);
      }

      // Fallback: keyword search on title if no results yet
      if (sops.length === 0) {
        const words = input.question.toLowerCase().split(/\s+/).filter((w) => w.length > 4).slice(0, 3);
        if (words.length > 0) {
          const titleConditions = words.map((w) => like(schema.sopLibrary.title, `%${w}%`));
          sops = await db
            .select({
              title: schema.sopLibrary.title,
              category: schema.sopLibrary.category,
              procedureText: schema.sopLibrary.procedureText,
              decisionLogic: schema.sopLibrary.decisionLogic,
              tribalKnowledge: schema.sopLibrary.tribalKnowledge,
            })
            .from(schema.sopLibrary)
            .where(and(eq(schema.sopLibrary.audience, "commercial"), or(...titleConditions)))
            .limit(3);
        }
      }

      // ── Step 2b: Live Cellar Retriever — inject this winemaker's own history ─
      // Pulls last ~120 vintage_log entries + tank/variety inventory + event mix
      // so the AI grounds advice in THEIR cellar, not just generic SOPs.
      let liveCellarContext = "";
      if (ctx.user) {
        try {
          const dbUser = await getUserByOpenId(ctx.user.openId);
          if (dbUser) {
            liveCellarContext = await getUserCellarContext(dbUser.id);
          }
        } catch (e) {
          console.warn("[Tutor] cellar context fetch failed:", (e as Error)?.message);
        }
      }

      // ── Step 3: Build scoped context from retrieved SOPs ────────────────────

      let sopContext = "";

      if (sops.length > 0) {
        sopContext = sops
          .map((sop) => {
            const parts = [`## ${sop.title} (${sop.category})`];
            if (sop.procedureText) parts.push(`### Procedure\n${sop.procedureText.slice(0, 1500)}`);
            if (sop.decisionLogic) parts.push(`### Decision Logic\n${sop.decisionLogic.slice(0, 800)}`);
            if (sop.tribalKnowledge) parts.push(`### Tribal Knowledge\n${sop.tribalKnowledge.slice(0, 500)}`);
            return parts.join("\n");
          })
          .join("\n\n---\n\n");
      } else {
        // No SOPs found — use general winemaking knowledge
        sopContext = "No specific SOP found for this topic. Answer from general oenological knowledge.";
      }

      // ── Step 3b: Detect vintage year and region mentions; inject vintage context ─
      // Known Australian wine regions for detection
      const KNOWN_REGIONS = [
        "Barossa Valley", "Barossa",
        "Eden Valley",
        "McLaren Vale",
        "Margaret River",
        "Hunter Valley", "Hunter",
        "Yarra Valley", "Yarra",
        "Mudgee",
        "Orange",
        "Canberra District", "Canberra",
        "Clare Valley", "Clare",
        "Coonawarra",
        "Mornington Peninsula", "Mornington",
        "Heathcote",
        "Grampians",
        "Rutherglen",
        "Langhorne Creek",
        "Padthaway",
        "Wrattonbully",
        "Adelaide Hills",
        "Riverland",
        "Riverina",
        "King Valley",
      ];

      // Detect year mentions (e.g. "2024", "2023 vintage", "'24")
      const yearMatches = input.question.match(/\b(20[0-9]{2})\b/);
      const mentionedYear = yearMatches ? parseInt(yearMatches[1]) : null;

      // Detect region mentions
      const questionLower = input.question.toLowerCase();
      const mentionedRegion = KNOWN_REGIONS.find((r) => questionLower.includes(r.toLowerCase()));

      let vintageContext = "";
      if (mentionedRegion || mentionedYear) {
        // Try to find a matching vintage intelligence entry
        const targetYear = mentionedYear ?? new Date().getFullYear();
        let vintageRows: Array<{
          region: string;
          year: number;
          state: string;
          conditions: string;
          standoutVarieties: string | null;
          qualityRating: number;
          yieldAssessment: string | null;
          winemakingNotes: string | null;
          source: string | null;
        }> = [];

        if (mentionedRegion) {
          // Try exact region match first
          const exactRow = await db
            .select({
              region: schema.vintageIntelligence.region,
              year: schema.vintageIntelligence.year,
              state: schema.vintageIntelligence.state,
              conditions: schema.vintageIntelligence.conditions,
              standoutVarieties: schema.vintageIntelligence.standoutVarieties,
              qualityRating: schema.vintageIntelligence.qualityRating,
              yieldAssessment: schema.vintageIntelligence.yieldAssessment,
              winemakingNotes: schema.vintageIntelligence.winemakingNotes,
              source: schema.vintageIntelligence.source,
            })
            .from(schema.vintageIntelligence)
            .where(
              and(
                like(schema.vintageIntelligence.region, `%${mentionedRegion}%`),
                eq(schema.vintageIntelligence.year, targetYear)
              )
            )
            .limit(1);
          if (exactRow.length > 0) vintageRows = exactRow;
        }

        // If no region match but year mentioned, get national overview
        if (vintageRows.length === 0 && mentionedYear) {
          const nationalRow = await db
            .select({
              region: schema.vintageIntelligence.region,
              year: schema.vintageIntelligence.year,
              state: schema.vintageIntelligence.state,
              conditions: schema.vintageIntelligence.conditions,
              standoutVarieties: schema.vintageIntelligence.standoutVarieties,
              qualityRating: schema.vintageIntelligence.qualityRating,
              yieldAssessment: schema.vintageIntelligence.yieldAssessment,
              winemakingNotes: schema.vintageIntelligence.winemakingNotes,
              source: schema.vintageIntelligence.source,
            })
            .from(schema.vintageIntelligence)
            .where(
              and(
                eq(schema.vintageIntelligence.year, mentionedYear),
                like(schema.vintageIntelligence.region, "%National%")
              )
            )
            .limit(1);
          if (nationalRow.length > 0) vintageRows = nationalRow;
        }

        if (vintageRows.length > 0) {
          const vi = vintageRows[0];
          const ratingLabels: Record<number, string> = { 1: "Poor", 2: "Below Average", 3: "Average", 4: "Excellent", 5: "Exceptional" };
          const parts = [
            `## ${vi.region} ${vi.year} Vintage Intelligence`,
            `**Quality Rating:** ${vi.qualityRating}/5 — ${ratingLabels[vi.qualityRating] ?? "Unknown"}`,
          ];
          if (vi.yieldAssessment) parts.push(`**Yield:** ${vi.yieldAssessment}`);
          if (vi.standoutVarieties) parts.push(`**Standout Varieties:** ${vi.standoutVarieties}`);
          parts.push(`\n### Growing Season Conditions\n${vi.conditions.slice(0, 1200)}`);
          if (vi.winemakingNotes) parts.push(`\n### Winemaking Implications\n${vi.winemakingNotes.slice(0, 800)}`);
          if (vi.source) parts.push(`\n*Source: ${vi.source}*`);
          vintageContext = parts.join("\n");
        }
      }

      const personaLine = isHomeWinemaker
        ? "You are a friendly, practical home winemaking assistant helping a home winemaker in their garage or cellar."
        : "You are an expert winemaking assistant helping a professional winemaker or cellar hand.";

      const complianceNote = isComplianceRedirect
        ? "\n- IMPORTANT: This question involves regulatory compliance, licensing, or labelling law. Answer briefly then explicitly direct the user to the Compliance AI at /compliance for authoritative guidance."
        : "";

      const systemPrompt = `${personaLine}
You answer questions about winemaking based on the Standard Operating Procedures (SOPs) provided below.

Rules:
- Answer from the SOPs provided. If the SOPs don't cover the question, use sound oenological knowledge and say so.
- Be specific and actionable. Give numbers, ranges, and decision criteria where relevant.
- ${isHomeWinemaker ? "Keep language accessible — avoid jargon where possible, or explain it briefly." : "Use professional winemaking terminology."}${complianceNote}
- ${liveCellarContext ? "PERSONAL HISTORY PRIORITY: A 'THIS WINEMAKER'S CELLAR HISTORY' block is provided below with this winemaker's own logged entries. When the question relates to a tank/variety/event in their history, CITE specific past entries by date + tank — e.g. 'Looking at your 18 Mar entry on Tank 7 (Shiraz), you measured…'. Ground your numbers in their actual data when possible. Never expose source labels (no 'CELLAR HISTORY says…'); speak naturally as their assistant." : ""}
- Respond with a JSON object only, no markdown fences:
{
  "answer": "<your full answer, may include newlines>",
  "sopTitles": ["<SOP title 1>", "<SOP title 2>"],
  "disclaimer": "${isHomeWinemaker ? "Home winemaking practices vary — always taste and judge your wine yourself." : "Always validate decisions against your own vintage data and consult a qualified winemaker for critical decisions."}"
}

SOPs:
${sopContext}${vintageContext ? `\n\n---\n\n## Regional Vintage Context\n${vintageContext}` : ""}${liveCellarContext ? `\n\n---\n\n${liveCellarContext}` : ""}`;

      const messages = [
        { role: "system" as const, content: systemPrompt },
        ...(input.history ?? []).map((m) => ({ role: m.role as "user" | "assistant", content: m.content })),
        { role: "user" as const, content: input.question },
      ];

      const response = await fetch(`${forgeUrl}/v1/chat/completions`, {
        method: "POST",
        headers: { "Content-Type": "application/json", Authorization: `Bearer ${forgeKey}` },
        body: JSON.stringify({ messages, stream: false, response_format: { type: "json_object" } }),
      });

      if (!response.ok) {
        const errText = await response.text();
        console.error("[Tutor] LLM error:", response.status, errText);
        throw new Error(`LLM error: ${response.status}`);
      }

      const data = await response.json();
      const rawContent = data.choices?.[0]?.message?.content || "{}";

      let answer = "No response received.";
      let sopTitles: string[] = [];
      let disclaimer = isHomeWinemaker
        ? "Home winemaking practices vary — always taste and judge your wine yourself."
        : "Always validate decisions against your own vintage data.";

      try {
        const parsed = JSON.parse(rawContent);
        if (parsed.answer) answer = parsed.answer;
        if (Array.isArray(parsed.sopTitles)) sopTitles = parsed.sopTitles;
        if (parsed.disclaimer) disclaimer = parsed.disclaimer;
      } catch {
        answer = rawContent;
      }

            return { answer, sopTitles, disclaimer };
    }),

  // Owner-only: backfill embedding vectors for all SOPs that don't have them
  backfillEmbeddings: ownerProcedure
    .input(z.object({ audience: z.enum(["diy", "commercial"]).optional() }).optional())
    .mutation(async ({ input }) => {
      const forgeUrl = process.env.BUILT_IN_FORGE_API_URL;
      const forgeKey = process.env.BUILT_IN_FORGE_API_KEY;
      if (!forgeUrl || !forgeKey) throw new Error("LLM service not configured");
      const result = await backfillSopEmbeddings(forgeUrl, forgeKey, input?.audience);
      return result;
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

// ─── WBS Admin Router ───────────────────────────────────────────────────────
// Owner-only: manage published status of bible knowledge chunks by WBS domain.

const wbsAdminRouter = router({
  // List all unique WBS domains with chunk counts and published status
  listDomains: ownerProcedure.query(async () => {
    // Get summary by wbs_domain: total chunks, published chunks, chapter titles
    const rows = await db
      .select({
        wbsDomain: schema.diyKnowledgeChunks.wbsDomain,
        wbsCode: schema.diyKnowledgeChunks.wbsCode,
        chapterTitle: schema.diyKnowledgeChunks.chapterTitle,
        sourceDoc: schema.diyKnowledgeChunks.sourceDoc,
        published: schema.diyKnowledgeChunks.published,
        id: schema.diyKnowledgeChunks.id,
      })
      .from(schema.diyKnowledgeChunks)
      .orderBy(schema.diyKnowledgeChunks.wbsDomain, schema.diyKnowledgeChunks.chapterRef);

    // Group by wbsDomain + chapterTitle
    const groups: Record<string, {
      wbsDomain: string | null;
      wbsCode: string | null;
      chapterTitle: string | null;
      sourceDoc: string | null;
      totalChunks: number;
      publishedChunks: number;
      chunkIds: number[];
    }> = {};

    for (const row of rows) {
      const key = `${row.wbsDomain ?? "none"}::${row.chapterTitle ?? "unknown"}::${row.sourceDoc ?? ""}`;
      if (!groups[key]) {
        groups[key] = {
          wbsDomain: row.wbsDomain,
          wbsCode: row.wbsCode,
          chapterTitle: row.chapterTitle,
          sourceDoc: row.sourceDoc,
          totalChunks: 0,
          publishedChunks: 0,
          chunkIds: [],
        };
      }
      groups[key].totalChunks++;
      if (row.published) groups[key].publishedChunks++;
      groups[key].chunkIds.push(row.id);
    }

    return Object.values(groups).sort((a, b) => {
      const da = parseFloat(a.wbsDomain ?? "99");
      const db_ = parseFloat(b.wbsDomain ?? "99");
      return da - db_;
    });
  }),

  // Toggle published status for all chunks in a chapter (by chapterTitle + sourceDoc)
  setChapterPublished: ownerProcedure
    .input(
      z.object({
        chapterTitle: z.string(),
        sourceDoc: z.string(),
        published: z.boolean(),
      })
    )
    .mutation(async ({ input }) => {
      const now = Date.now();
      await db
        .update(schema.diyKnowledgeChunks)
        .set({
          published: input.published,
          publishedAt: input.published ? now : null,
        })
        .where(
          and(
            eq(schema.diyKnowledgeChunks.chapterTitle, input.chapterTitle),
            eq(schema.diyKnowledgeChunks.sourceDoc, input.sourceDoc)
          )
        );
      return { success: true, published: input.published, updatedAt: now };
    }),

  // Bulk publish/unpublish all chunks in a WBS domain
  setDomainPublished: ownerProcedure
    .input(
      z.object({
        wbsDomain: z.string(),
        sourceDoc: z.string().optional(),
        published: z.boolean(),
      })
    )
    .mutation(async ({ input }) => {
      const now = Date.now();
      const conditions = [eq(schema.diyKnowledgeChunks.wbsDomain, input.wbsDomain)];
      if (input.sourceDoc) conditions.push(eq(schema.diyKnowledgeChunks.sourceDoc, input.sourceDoc));
      await db
        .update(schema.diyKnowledgeChunks)
        .set({
          published: input.published,
          publishedAt: input.published ? now : null,
        })
        .where(and(...conditions));
      return { success: true, published: input.published, updatedAt: now };
    }),

  // List ghost questions (paginated, filterable by wbs_code)
  listGhostQuestions: ownerProcedure
    .input(
      z.object({
        wbsCode: z.string().optional(),
        wineType: z.string().optional(),
        limit: z.number().min(1).max(200).optional().default(50),
        offset: z.number().min(0).optional().default(0),
      })
    )
    .query(async ({ input }) => {
      const conditions = [eq(schema.ghostQuestions.active, true)];
      if (input.wbsCode) conditions.push(eq(schema.ghostQuestions.wbsCode, input.wbsCode));
      if (input.wineType) conditions.push(eq(schema.ghostQuestions.wineType, input.wineType));
      const questions = await db
        .select({
          id: schema.ghostQuestions.id,
          wbsCode: schema.ghostQuestions.wbsCode,
          wineType: schema.ghostQuestions.wineType,
          question: schema.ghostQuestions.question,
          difficulty: schema.ghostQuestions.difficulty,
          category: schema.ghostQuestions.category,
          createdAt: schema.ghostQuestions.createdAt,
        })
        .from(schema.ghostQuestions)
        .where(and(...conditions))
        .orderBy(schema.ghostQuestions.wbsCode, schema.ghostQuestions.id)
        .limit(input.limit)
        .offset(input.offset);
      // Count total matching
      const allMatching = await db
        .select({ id: schema.ghostQuestions.id })
        .from(schema.ghostQuestions)
        .where(and(...conditions));
      return { questions, total: allMatching.length };
    }),

  // Get ghost questions summary by wbs_code
  ghostQuestionsSummary: ownerProcedure.query(async () => {
    const all = await db
      .select({
        wbsCode: schema.ghostQuestions.wbsCode,
        wineType: schema.ghostQuestions.wineType,
        category: schema.ghostQuestions.category,
        id: schema.ghostQuestions.id,
      })
      .from(schema.ghostQuestions)
      .where(eq(schema.ghostQuestions.active, true));
    // Group by wbsCode + wineType
    const grouped = all.reduce((acc, r) => {
      const key = `${r.wbsCode}|${r.wineType}`;
      if (!acc[key]) acc[key] = { wbsCode: r.wbsCode, wineType: r.wineType, category: r.category ?? "", cnt: 0 };
      acc[key].cnt++;
      return acc;
    }, {} as Record<string, { wbsCode: string; wineType: string; category: string; cnt: number }>);
    return Object.values(grouped).sort((a, b) => a.wbsCode.localeCompare(b.wbsCode));
  }),

  // Get chunk count summary (for dashboard)
  summary: ownerProcedure.query(async () => {
    const all = await db
      .select({
        published: schema.diyKnowledgeChunks.published,
        sourceDoc: schema.diyKnowledgeChunks.sourceDoc,
        id: schema.diyKnowledgeChunks.id,
      })
      .from(schema.diyKnowledgeChunks);

    const total = all.length;
    const published = all.filter((r) => r.published).length;
    const byDoc = all.reduce((acc, r) => {
      const doc = r.sourceDoc ?? "unknown";
      if (!acc[doc]) acc[doc] = { total: 0, published: 0 };
      acc[doc].total++;
      if (r.published) acc[doc].published++;
      return acc;
    }, {} as Record<string, { total: number; published: number }>);

    return { total, published, unpublished: total - published, byDoc };
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
