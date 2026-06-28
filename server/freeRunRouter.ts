/**
 * Free Run Router
 * ─────────────────────────────────────────────────────────────────────────────
 * Powers the wine curiosity experience for wine virgins.
 * Audience: wine lovers, curious drinkers — NOT winemakers.
 * No winemaking SOPs, no production guides.
 *
 * Mechanics:
 *   - 3 curiosity questions per day (midnight UTC reset)
 *   - Every answer has a "Deep Dive" button (1 credit, first one free)
 *   - Deep Dive unlocks the Triangle: Science / Vineyard / Craft
 *   - Thumbs up/down per panel for quality analytics
 *   - Panel expansion + thumbs + credit purchase tracked as analytics events
 */

import { z } from "zod";
import { eq, and } from "drizzle-orm";
import { router, protectedProcedure, publicProcedure } from "./trpc.js";
import * as schema from "../drizzle/schema.js";
import { db, getUserByOpenId } from "./db.js";
import Stripe from "stripe";

// ─── Credit Pack Definitions ─────────────────────────────────────────────────
export const CREDIT_PACKS = [
  { id: "bottle",   name: "A Bottle of Curiosity",  credits: 5,  priceAud: 400,  description: "5 Deep Dive reveals" },
  { id: "case",     name: "A Case of Questions",    credits: 15, priceAud: 900,  description: "15 Deep Dive reveals" },
  { id: "obsessed", name: "The Obsessive",           credits: 40, priceAud: 1600, description: "40 Divine Trinity reveals" },
] as const;

function getStripe(): Stripe {
  const key = process.env.STRIPE_SECRET_KEY;
  if (!key) throw new Error("STRIPE_SECRET_KEY is not configured");
  return new Stripe(key, { apiVersion: "2026-04-22.dahlia" });
}

const DAILY_FREE_QUESTIONS = 3;

// ─── Helpers ─────────────────────────────────────────────────────────────────

function todayUTC(): string {
  return new Date().toISOString().slice(0, 10); // "YYYY-MM-DD"
}

import { chatCompletion, MODELS } from "./_core/llm.js";
import { persistJournalEntry } from "./cellarJournalRouter.js";

async function callLLM(messages: { role: "system" | "user" | "assistant"; content: string }[], source = "freeRun") {
  return chatCompletion(messages, { model: MODELS.PREMIUM, maxTokens: 1500, source });
}

async function callLLMJson(messages: { role: "system" | "user" | "assistant"; content: string }[], source = "freeRun.tag") {
  // Value engineering: tag classification is a 3-word categorisation — no quality
  // benefit from PREMIUM. Use CHEAP gpt-5.4-mini (~20× cheaper). See
  // /app/memory/VALUE-ENGINEERING.md for the cost-control doctrine.
  const out = await chatCompletion(messages, { model: MODELS.CHEAP, json: true, maxTokens: 300, source });
  return out || "{}";
}

// ─── Router ──────────────────────────────────────────────────────────────────

export const freeRunRouter = router({
  /** Public: check if the current request is authenticated */
  authCheck: publicProcedure.query(async ({ ctx }) => {
    return { isAuthenticated: !!ctx.user };
  }),

  /**
   * Ask a wine curiosity question.
   * Returns a surface-level answer grounded in real oenology.
   * Enforces 3 questions/day limit.
   */
  curiosityAsk: protectedProcedure
    .input(
      z.object({
        question: z.string().min(1).max(500),
      })
    )
    .mutation(async ({ input, ctx }) => {
      const dbUser = await getUserByOpenId(ctx.user.openId);
      if (!dbUser) throw new Error("User not found");
      const userId = dbUser.id;
      const dateKey = todayUTC();

      // ── Check daily limit ────────────────────────────────────────────────
      const [usage] = await db
        .select()
        .from(schema.freeRunDailyUsage)
        .where(
          and(
            eq(schema.freeRunDailyUsage.userId, userId),
            eq(schema.freeRunDailyUsage.dateKey, dateKey)
          )
        )
        .limit(1);

      const currentCount = usage?.questionCount ?? 0;
      if (currentCount >= DAILY_FREE_QUESTIONS) {
        return {
          answer: null,
          limitReached: true,
          questionsUsed: currentCount,
          questionsTotal: DAILY_FREE_QUESTIONS,
        };
      }

      // ── Generate surface answer ──────────────────────────────────────────
      const systemPrompt = `You are Ownology's wine curiosity guide — a knowledgeable, enthusiastic companion for people who love wine and want to understand it more deeply.

Your audience: wine lovers, curious drinkers, food & wine enthusiasts. They are NOT winemakers. They want to understand wine — its flavours, aromas, science, and origins — not how to produce it commercially.

Answer style:
- Warm, intelligent, and genuinely curious — like a sommelier friend at dinner
- Grounded in real oenology and wine science — never dumbed down, never condescending
- 2–4 paragraphs maximum — leave them wanting more
- End with a single sentence that hints at a deeper layer (science, vineyard, or craft) to create curiosity
- Do NOT mention winemaking production, SOPs, commercial processes, or compliance
- Do NOT answer questions about how to make wine commercially — redirect warmly to the curiosity angle

If the question is about making wine commercially or winemaking technique, respond:
"That's a winemaking question — it lives in The Press, our tool for winemakers. Here in Free Run, we explore the science and soul of wine. Let me answer the curiosity behind your question instead: [then answer the wine science angle]"`;

      const answer = await callLLM([
        { role: "system", content: systemPrompt },
        { role: "user", content: input.question },
      ], "freeRun.curiosityAsk");

      // ── Detect synthetic budget-paused response ──────────────────────────
      // The forge shim returns a graceful "AI service temporarily paused"
      // message when the daily LLM budget is exhausted. When that happens we:
      //   1. DON'T charge a free-tier question against the user's daily quota
      //   2. DON'T persist the paused message into the Cellar Journal
      //   3. Return a structured `paused: true` payload so the UI can render
      //      a polite upgrade CTA instead of the synthetic text.
      // Detection: match the most stable substring of the canonical message
      // built in server/_core/forgeShim.ts::buildBudgetExceededResponse().
      // Using "temporarily paused" (case-insensitive) so a future em-dash
      // / en-dash / hyphen copy-edit doesn't silently break this branch.
      const isPaused = /temporarily paused/i.test(answer);
      // Free-tier message contains "free-tier" verbatim; overall-cap message
      // does NOT. Verified against forgeShim.ts message templates.
      const pausedTier: "free" | "overall" = /free-tier/i.test(answer) ? "free" : "overall";
      if (isPaused) {
        // Compute next UTC midnight ISO string for the retry hint.
        const next = new Date();
        next.setUTCHours(24, 0, 0, 0);
        const retryAtIso = next.toISOString();
        return {
          answer: "",
          topicTag: null,
          limitReached: false,
          paused: true,
          pausedTier,
          pausedMessage:
            pausedTier === "free"
              ? "We've reached today's free-tier AI budget. Premium members keep going — upgrade for unlimited curiosity, or try again at UTC midnight."
              : "Our AI service is temporarily paused while we reset the daily safety cap. Everything will be back online at UTC midnight.",
          retryAt: retryAtIso,
          questionsUsed: currentCount,
          questionsTotal: DAILY_FREE_QUESTIONS,
        };
      }

      // ── Detect topic tag ─────────────────────────────────────────────────
      let topicTag: string | null = null;
      try {
        const tagJson = await callLLMJson([
          {
            role: "system",
            content:
              'Extract a single short topic tag (max 3 words) from this wine question. Return JSON: {"tag": "..."}. Examples: "MLF", "Tannins", "Chardonnay", "Terroir", "Fermentation", "Food Pairing", "Pinot Noir".',
          },
          { role: "user", content: input.question },
        ], "freeRun.tag");
        const parsed = JSON.parse(tagJson);
        if (parsed.tag) topicTag = String(parsed.tag).slice(0, 100);
      } catch {
        // tag is optional
      }

      // ── Update daily usage ───────────────────────────────────────────────
      const now = Date.now();
      if (usage) {
        await db
          .update(schema.freeRunDailyUsage)
          .set({ questionCount: currentCount + 1, updatedAt: now })
          .where(eq(schema.freeRunDailyUsage.id, usage.id));
      } else {
        await db.insert(schema.freeRunDailyUsage).values({
          userId,
          dateKey,
          questionCount: 1,
          updatedAt: now,
        });
      }

      // ── Persist to Cellar Journal (fire-and-forget) ──
      persistJournalEntry({
        question: input.question,
        topicTag: topicTag || "Wine Curiosity",
        fullAnswer: answer,
        source: "freeRun.curiosityAsk",
        audience: "curious",
      }).catch((e) => console.warn("[CellarJournal] persist failed:", e?.message));

      return {
        answer,
        topicTag,
        limitReached: false,
        paused: false as const,
        questionsUsed: currentCount + 1,
        questionsTotal: DAILY_FREE_QUESTIONS,
      };
    }),

  /**
   * Unlock the Deep Dive triangle for a question.
   * Costs 1 credit (first reveal ever is free).
   * Returns Science, Vineyard, and Craft panels.
   */
  goDeeper: protectedProcedure
    .input(
      z.object({
        question: z.string().min(1).max(500),
        surfaceAnswer: z.string().min(1).max(5000),
        topicTag: z.string().max(100).optional(),
      })
    )
    .mutation(async ({ input, ctx }) => {
      const dbUser = await getUserByOpenId(ctx.user.openId);
      if (!dbUser) throw new Error("User not found");
      const userId = dbUser.id;
      const now = Date.now();

      // ── Check if this is the user's first ever reveal (free hook) ────────
      const [existingReveal] = await db
        .select({ id: schema.goDeeperReveals.id })
        .from(schema.goDeeperReveals)
        .where(eq(schema.goDeeperReveals.userId, userId))
        .limit(1);

      const isFirstEver = !existingReveal;

      // ── Check credit balance if not free ────────────────────────────────
      if (!isFirstEver) {
        const [credits] = await db
          .select()
          .from(schema.freeRunCredits)
          .where(eq(schema.freeRunCredits.userId, userId))
          .limit(1);

        const balance = credits?.balance ?? 0;
        if (balance < 1) {
          return {
            success: false,
            insufficientCredits: true,
            balance,
            sciencePanel: null,
            vineyardPanel: null,
            craftPanel: null,
            revealId: null,
          };
        }

        // Deduct 1 credit
        if (credits) {
          await db
            .update(schema.freeRunCredits)
            .set({
              balance: balance - 1,
              totalConsumed: (credits.totalConsumed ?? 0) + 1,
              updatedAt: now,
            })
            .where(eq(schema.freeRunCredits.id, credits.id));
        }
      }

      // ── Generate the three triangle panels in parallel ───────────────────
      const baseContext = `Original question: "${input.question}"\n\nSurface answer already given: "${input.surfaceAnswer}"\n\nTopic: ${input.topicTag ?? "wine"}`;

      const sciencePrompt = `You are a wine science expert writing for curious wine lovers (not winemakers).

${baseContext}

Write "The Science" panel — go one level deeper into the chemistry, biology, or physics behind this topic. Stay strictly on this topic. Do not introduce new subjects. 2–3 paragraphs. Use accessible but precise scientific language. Make it fascinating.`;

      const vineyardPrompt = `You are a viticulture expert writing for curious wine lovers (not winemakers).

${baseContext}

Write "The Vineyard" panel — explain how this characteristic originates in the vineyard: the grape variety, soil, climate, canopy management, or geography. Stay strictly on this topic. Do not introduce new subjects. 2–3 paragraphs. Make the connection between vineyard and glass vivid and tangible.`;

      const craftPrompt = `You are a winemaking expert writing for curious wine lovers who want to understand the craft (not commercial winemakers).

${baseContext}

Write "The Craft" panel — explain how a winemaker shapes, controls, or exploits this characteristic during winemaking. Stay strictly on this topic. Do not introduce new subjects. 2–3 paragraphs. Make the winemaker's decisions feel like artistry, not industrial process.`;

      const [sciencePanel, vineyardPanel, craftPanel] = await Promise.all([
        callLLM([{ role: "user", content: sciencePrompt }], "freeRun.goDeeper.science"),
        callLLM([{ role: "user", content: vineyardPrompt }], "freeRun.goDeeper.vineyard"),
        callLLM([{ role: "user", content: craftPrompt }], "freeRun.goDeeper.craft"),
      ]);

      // ── Store the reveal ─────────────────────────────────────────────────
      const [inserted] = await db.insert(schema.goDeeperReveals).values({
        userId,
        question: input.question,
        topicTag: input.topicTag ?? null,
        surfaceAnswer: input.surfaceAnswer,
        sciencePanel,
        vineyardPanel,
        craftPanel,
        wasFreeHook: isFirstEver,
        creditsConsumed: isFirstEver ? 0 : 1,
        createdAt: now,
      });

      const revealId = (inserted as unknown as { insertId: number }).insertId;

      return {
        success: true,
        insufficientCredits: false,
        balance: null,
        sciencePanel,
        vineyardPanel,
        craftPanel,
        revealId,
        wasFreeHook: isFirstEver,
      };
    }),

  /**
   * Submit thumbs up/down feedback for a Deep Dive panel.
   */
  submitFeedback: protectedProcedure
    .input(
      z.object({
        revealId: z.number().int().positive(),
        panel: z.enum(["science", "vineyard", "craft"]),
        thumbsUp: z.boolean(),
      })
    )
    .mutation(async ({ input, ctx }) => {
      const dbUser = await getUserByOpenId(ctx.user.openId);
      if (!dbUser) throw new Error("User not found");
      await db.insert(schema.goDeeperFeedback).values({
        userId: dbUser.id,
        revealId: input.revealId,
        panel: input.panel,
        thumbsUp: input.thumbsUp,
        createdAt: Date.now(),
      });
      return { success: true };
    }),

  /**
   * Create a Stripe Checkout session for a credit pack purchase.
   */
  createCreditPackCheckout: protectedProcedure
    .input(
      z.object({
        packId: z.enum(["bottle", "case", "obsessed"]),
        origin: z.string().url(),
      })
    )
    .mutation(async ({ input, ctx }) => {
      const pack = CREDIT_PACKS.find((p) => p.id === input.packId);
      if (!pack) throw new Error("Invalid pack");

      const stripe = getStripe();
      const session = await stripe.checkout.sessions.create({
        mode: "payment",
        payment_method_types: ["card"],
        allow_promotion_codes: true,
        customer_email: ctx.user.email ?? undefined,
        line_items: [
          {
            quantity: 1,
            price_data: {
              currency: "aud",
              unit_amount: pack.priceAud,
              product_data: {
                name: `Ownology Credits — ${pack.name}`,
                description: pack.description,
              },
            },
          },
        ],
        metadata: {
          credit_pack: "true",
          pack_id: pack.id,
          credits: String(pack.credits),
          user_open_id: ctx.user.openId,
          customer_email: ctx.user.email ?? "",
        },
        success_url: `${input.origin}/free-run?credits_purchased=1`,
        cancel_url: `${input.origin}/free-run?credits_cancelled=1`,
      });

      return { url: session.url };
    }),

  /**
   * Get the user's current credit balance and daily usage.
   */
  status: protectedProcedure.query(async ({ ctx }) => {
    const dbUser = await getUserByOpenId(ctx.user.openId);
    if (!dbUser) return { creditBalance: 0, totalPurchased: 0, questionsUsedToday: 0, questionsTotal: DAILY_FREE_QUESTIONS, questionsRemaining: DAILY_FREE_QUESTIONS };
    const userId = dbUser.id;
    const dateKey = todayUTC();

    const [[credits], [usage]] = await Promise.all([
      db
        .select()
        .from(schema.freeRunCredits)
        .where(eq(schema.freeRunCredits.userId, userId))
        .limit(1),
      db
        .select()
        .from(schema.freeRunDailyUsage)
        .where(
          and(
            eq(schema.freeRunDailyUsage.userId, userId),
            eq(schema.freeRunDailyUsage.dateKey, dateKey)
          )
        )
        .limit(1),
    ]);

    return {
      creditBalance: credits?.balance ?? 0,
      totalPurchased: credits?.totalPurchased ?? 0,
      questionsUsedToday: usage?.questionCount ?? 0,
      questionsTotal: DAILY_FREE_QUESTIONS,
      questionsRemaining: Math.max(0, DAILY_FREE_QUESTIONS - (usage?.questionCount ?? 0)),
    };
  }),
});
