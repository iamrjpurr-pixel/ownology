/**
 * demoRouter — powers the public /demo landing experience.
 *
 * Product intent (Feb 2026, Rich): stranger lands on ownology.ai/demo,
 * pastes any old vintage notes, and within 30 seconds sees the AI
 * quoting THEIR OWN winemaking decisions back to them. Highest-leverage
 * conversion tool on the site — no login, no email required to get
 * the "oh sh*t" moment.
 *
 * Two-stage flow:
 *   1. analyze  — Claude reads the notes, extracts structured cellar
 *                 events, picks the single most interesting tank/moment,
 *                 crafts ONE curious question about it.
 *   2. answer   — user replies, Claude weaves a response that CITES
 *                 specific fragments from their notes back to them.
 *
 * Both endpoints are publicProcedure — deliberately anonymous. A soft
 * email-capture chip lives on the client after Stage 3.
 *
 * Persistence: single row per demo session in `demo_submissions`. Both
 * stages update the same row via session_id. Rich reviews qualitative
 * results on /admin/demo-submissions (todo — a small future dashboard).
 */

import { z } from "zod";
import { randomUUID, createHash } from "crypto";
import { eq, sql } from "drizzle-orm";
import { router, publicProcedure } from "../trpc.js";
import { db } from "../db.js";
import { chatCompletion, MODELS } from "../_core/llm.js";
import * as schema from "../../drizzle/schema.js";

const ANALYSIS_SYSTEM_PROMPT = `You are the AI reader inside Ownology, a quality-and-risk system for winemakers. A stranger has just pasted some of their own past vintage notes onto the /demo page. Your job in 15 seconds:

1. Read the notes carefully — they may be handwritten-style shorthand, structured tables, freeform paragraphs, or anything in between.
2. Silently extract the cellar events you can identify: tanks, dates, actions (racking, additions, filtration, MLF, blending), lab readings (Brix, pH, TA, SO₂, temp), decisions (why they chose a yeast, why they held back, why they rushed).
3. Pick the SINGLE most interesting tank / batch / moment in their notes — the one where a real decision was made, or a genuine uncertainty was resolved, or something surprising was recorded.
4. Craft ONE curious, specific question about that tank/moment. The question must:
   - Reference a REAL identifier or fact from their notes (tank number, date, variety, reading). Not generic.
   - Be the kind of question a smart apprentice would ask them.
   - Fit in 22 words or less.
   - Show that you actually read the notes.

Return STRICT JSON with these keys:
{
  "extract": "1-2 sentences describing what you found — mention the specific tank(s) or dates you identified. Sound impressed but factual. Max 60 words.",
  "focusTank": "The identifier of the tank/batch you picked (e.g. 'T-04', '2022 Shiraz Block 3'). Copy verbatim from their notes.",
  "question": "The single specific question, exactly as you'll ask them."
}

Rules:
- Never fabricate identifiers. If they wrote 'T-04', don't say 'Tank 4'.
- If the notes are truly empty or unparseable, return question = "The notes are too sparse to pick a moment — try pasting more? Even a handful of dated readings works.".
- Return ONLY the JSON. No prose, no fences.`;

const ANSWER_SYSTEM_PROMPT = `You are the AI inside Ownology. The user has just answered a specific question about one of their own tanks, based on notes they pasted. Your job: reply in a way that PROVES you read their actual notes — cite short verbatim fragments back to them, connect their answer to their own historical entries, and end with ONE concrete observation about what compounds if they keep this record.

Format the reply as:
1. Warm opener (max 12 words) — "That checks out with the notes — you wrote…"
2. Cite 1-3 SHORT verbatim fragments from their notes in quotes ("…"). Use ellipses for context. Quote what's actually there — never fabricate.
3. Connect their answer to those fragments — what pattern do you now see? Max 40 words.
4. One concrete "here's what happens when this becomes structured" observation — very brief. Max 25 words.

Rules:
- Keep the whole reply under 140 words.
- Voice: warm, specific, curious. Australian idiom. No emojis, no exclamation marks, no marketing spiel.
- Never invent facts that aren't in the notes.
- End with a soft nudge but NOT a hard CTA — something like "That's the sort of thing that stops needing to be rediscovered each vintage."`;

interface AnalysisResponse {
  extract: string;
  focusTank: string;
  question: string;
}

/** Hash an IP address so we can rate-limit without storing raw IPs. */
function hashIp(raw: string | null | undefined): string {
  if (!raw) return "unknown";
  return createHash("sha256").update(String(raw)).digest("hex").slice(0, 32);
}

/** Parse the JSON-shaped LLM response, tolerating markdown fences. */
function safeParse(raw: string): Partial<AnalysisResponse> {
  const cleaned = raw
    .replace(/^```json\s*/i, "")
    .replace(/^```\s*/i, "")
    .replace(/```\s*$/i, "")
    .trim();
  try {
    return JSON.parse(cleaned) as Partial<AnalysisResponse>;
  } catch {
    return {};
  }
}

export const demoRouter = router({
  /**
   * analyze — Stage 1. Reads the pasted notes, returns the extract +
   * focus tank + one specific question. Persists the row so Stage 2
   * can look it up by sessionId without re-sending the full notes.
   */
  analyze: publicProcedure
    .input(z.object({
      notes: z.string().min(20, "Paste at least a couple of lines").max(20_000),
      sourceHint: z.string().max(200).optional(), // e.g. "hunter valley 2023 vintage"
    }))
    .mutation(async ({ input, ctx }) => {
      const notes = input.notes.trim();
      const sessionId = randomUUID();

      const messages = [
        { role: "system" as const, content: ANALYSIS_SYSTEM_PROMPT },
        {
          role: "user" as const,
          content: `${input.sourceHint ? `Context hint from user: ${input.sourceHint}\n\n` : ""}Notes:\n\n${notes}`,
        },
      ];

      let raw = "";
      try {
        raw = await chatCompletion(messages, {
          model: MODELS.PREMIUM,
          json: true,
          maxTokens: 500,
          temperature: 0.3,
          source: "demo.analyze",
        });
      } catch (err) {
        throw new Error(`AI analysis failed: ${err instanceof Error ? err.message : String(err)}`);
      }

      const parsed = safeParse(raw);
      if (!parsed.question) {
        throw new Error("AI couldn't form a question from those notes — try pasting more detail?");
      }

      const now = Date.now();
      const ipHash = hashIp((ctx as { ip?: string })?.ip);
      await db.insert(schema.demoSubmissions).values({
        sessionId,
        notesText: notes.slice(0, 15_000),
        aiExtract: parsed.extract?.slice(0, 1000) ?? null,
        aiFocusTank: parsed.focusTank?.slice(0, 100) ?? null,
        aiQuestion: parsed.question.slice(0, 1000),
        userAnswer: null,
        aiResponse: null,
        email: null,
        ipHash,
        createdAt: now,
      });

      return {
        sessionId,
        extract: parsed.extract ?? "",
        focusTank: parsed.focusTank ?? "",
        question: parsed.question,
      };
    }),

  /**
   * answer — Stage 2. User has answered the question. Claude replies
   * citing specific fragments from the original notes back to them.
   * Row is updated in place with the user's answer + AI response.
   */
  answer: publicProcedure
    .input(z.object({
      sessionId: z.string().uuid(),
      userAnswer: z.string().min(1).max(3000),
    }))
    .mutation(async ({ input }) => {
      const rows = await db
        .select()
        .from(schema.demoSubmissions)
        .where(eq(schema.demoSubmissions.sessionId, input.sessionId))
        .limit(1);
      if (rows.length === 0) throw new Error("Session not found. Refresh and try again.");
      const session = rows[0];

      const messages = [
        { role: "system" as const, content: ANSWER_SYSTEM_PROMPT },
        {
          role: "user" as const,
          content: `Their original notes:\n\n${session.notesText}\n\n---\n\nYour question to them:\n${session.aiQuestion}\n\n---\n\nTheir answer:\n${input.userAnswer.trim()}\n\n---\n\nWrite the response following your system rules.`,
        },
      ];

      let aiResponse = "";
      try {
        aiResponse = await chatCompletion(messages, {
          model: MODELS.PREMIUM,
          maxTokens: 400,
          temperature: 0.6,
          source: "demo.answer",
        });
      } catch (err) {
        throw new Error(`AI response failed: ${err instanceof Error ? err.message : String(err)}`);
      }

      const trimmed = aiResponse.trim();
      await db
        .update(schema.demoSubmissions)
        .set({
          userAnswer: input.userAnswer.trim().slice(0, 3000),
          aiResponse: trimmed.slice(0, 3000),
        })
        .where(eq(schema.demoSubmissions.sessionId, input.sessionId));

      return { aiResponse: trimmed };
    }),

  /**
   * captureEmail — Stage 3. Optional email capture on the "sign up for
   * a real trial" chip. Cheap. Stored on the same row so we can see
   * the conversation the visitor had before they left their email.
   */
  captureEmail: publicProcedure
    .input(z.object({
      sessionId: z.string().uuid(),
      email: z.string().email().max(200),
    }))
    .mutation(async ({ input }) => {
      await db
        .update(schema.demoSubmissions)
        .set({ email: input.email.trim().slice(0, 200) })
        .where(eq(schema.demoSubmissions.sessionId, input.sessionId));
      return { ok: true };
    }),

  /**
   * recentCount — small "N winemakers tried this today" chip for the
   * demo page. Purely a social-proof signal for the visitor. Cheap.
   */
  recentCount: publicProcedure.query(async () => {
    const cutoff = Date.now() - 24 * 60 * 60 * 1000;
    const [res] = await db.execute(sql`
      SELECT COUNT(*) AS n FROM demo_submissions WHERE created_at >= ${cutoff}
    `);
    const rowsRes = res as unknown as { n: number | string }[];
    const count = Number(rowsRes?.[0]?.n ?? 0);
    return { count };
  }),
});
