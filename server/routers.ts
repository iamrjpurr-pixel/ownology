import { z } from "zod";
import Stripe from "stripe";
import { router, publicProcedure, ownerProcedure, protectedProcedure } from "./trpc.js";
import { buildScopedKnowledgeBase, buildSourceDoctrineSummary } from "./complianceKnowledgeBase.js";
import {
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
  type EventType,
  upsertTankReminder,
  listTankReminders,
  deleteTankReminder,
  type ReminderEventType,
  addLead,
  listLeads,
  updateLeadNotes,
  updateLead,
  deleteLead,
  db,
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

const EVENT_TYPES = ["addition", "measurement", "racking", "inoculation", "observation", "other"] as const;

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
        eventType: z.enum(["addition", "measurement", "racking", "inoculation", "observation", "other"]),
        details: z.record(z.string(), z.unknown()),
        noteText: z.string().max(2000).optional(),
        entryAt: z.number().optional(),
      })
    )
    .mutation(async ({ ctx, input }) => {
      const dbUser = await getUserByOpenId(ctx.user.openId);
      if (!dbUser) throw new Error("User not found");
      const tags = generateTags(input.eventType, input.details, input.variety, input.tankName);
      await addVintageLogEntry({
        userId: dbUser.id,
        tankName: input.tankName,
        variety: input.variety,
        eventType: input.eventType,
        detailsJson: JSON.stringify(input.details),
        noteText: input.noteText,
        tagsJson: JSON.stringify(tags),
        entryAt: input.entryAt,
      });
      return { success: true };
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

  delete: protectedProcedure
    .input(z.object({ id: z.number() }))
    .mutation(async ({ ctx, input }) => {
      const dbUser = await getUserByOpenId(ctx.user.openId);
      if (!dbUser) throw new Error("User not found");
      await deleteVintageLogEntry(input.id, dbUser.id);
      return { success: true };
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

// ─── Email Subscribe Router ─────────────────────────────────────────────────
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

      // ── Stage 2: Focused answer with scoped knowledge base ────────────────
      const scopeJurisdictions =
        input.stateFilter && input.stateFilter !== "All" && input.stateFilter !== "Federal"
          ? ["Federal", input.stateFilter]
          : input.stateFilter === "Federal"
          ? ["Federal"]
          : detectedJurisdictions;

      const scopedKB = buildScopedKnowledgeBase(scopeJurisdictions);
      const jurisdictionLabel = scopeJurisdictions.join(", ");

      const systemPrompt = `You are a regulatory compliance assistant specialising in Australian winery regulations.
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

// ─── App Router ──────────────────────────────────────────────────────────────────────────────
export const appRouter = router({
  campaignMetrics: campaignMetricsRouter,
  foundingMembers: foundingMembersRouter,
  orders: ordersRouter,
  admin: adminRouter,
  vintageLog: vintageLogRouter,
  vintageReminder: vintageReminderRouter,
  email: emailRouter,
  leads: leadsRouter,
  siteContent: siteContentRouter,
  compliance: complianceRouter,
});

export type AppRouter = typeof appRouter;
