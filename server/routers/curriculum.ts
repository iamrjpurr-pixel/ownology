/**
 * Curriculum Router — Vigneron Tier Education Layer
 *
 * Reads synthesised Lesson Card JSONs from /app/references/education/synthesis-pilot/
 * and vends them via tRPC.
 *
 * Server-side paywall (Feb 2026, security audit P0):
 *   Client-side tier gating alone is insufficient — a savvy user can spoof
 *   ?preview=vigneron and unlock premium content in the client bundle. So
 *   every lesson response is now stripped SERVER-SIDE based on the caller's
 *   real subscription tier (from wineries.plan). The client hook still
 *   controls UI (lock icons, upgrade prompts) but the actual sections /
 *   worked_example / decision_tree / mcqs / flashcards / body_md are
 *   redacted from the JSON payload for tiers that shouldn't see them.
 *
 * Design decision: for the MVP demo we skip the DB layer for lesson content
 * and serve the JSON files as-is. This lets us ship the UI in the same
 * session as the synthesis without a schema migration. Once Rich signs off
 * on the shape, a later pass migrates these into a proper
 * `curriculum_lessons` table.
 */

import fs from "node:fs";
import path from "node:path";
import { z } from "zod";
import { eq } from "drizzle-orm";
import { router, publicProcedure } from "../trpc.js";
import { db } from "../db.js";
import * as schema from "../../drizzle/schema.js";
import { verifyGuestPass, GUEST_PASS_COOKIE } from "../lib/guestPass.js";

const SYNTH_V1_DIR = "/app/references/education/synthesis-pilot";
const SYNTH_V2_DIR = "/app/references/education/synthesis-v2";

type CitedIn = {
  kind: "buy" | "free" | "curriculum" | "private";
  label: string;
  url: string | null;
  note: string | null;
};

type Section = {
  heading: string;
  iconHint: string;
  body_md: string;
  keyConcept: string;
  trap: string;
};

type WorkedExample = {
  title: string;
  starting_conditions: string[];
  timeline: Array<{ when: string; observation: string; decision: string; reasoning: string; outcome: string }>;
  counterfactual: string;
};

type DecisionTree = {
  title: string;
  rows: Array<{ symptom: string; first_check: string; action: string }>;
};

type Mcq = { q: string; choices: string[]; answer: string; rationale: string };
type Flashcard = { front: string; back: string };

type LessonCard = {
  id: string;
  slug: string;
  level: number;
  wbs: string[];
  reading_min: number;
  title: string;
  aim: string;
  application: string;
  // v2 structured
  tldr: string[] | null;
  sections: Section[] | null;
  worked_example: WorkedExample | null;
  decision_tree: DecisionTree | null;
  mcqs: Mcq[] | null;
  flashcards: Flashcard[] | null;
  // v1 fallback
  body_md: string | null;
  // Common
  cited_in: CitedIn[];
  version: "v1" | "v2";
};

function loadFrom(dir: string, mapper: (file: string, raw: any) => LessonCard | null): LessonCard[] {
  if (!fs.existsSync(dir)) return [];
  const files = fs.readdirSync(dir).filter((f) => f.endsWith(".json"));
  const out: LessonCard[] = [];
  for (const f of files) {
    try {
      const raw = JSON.parse(fs.readFileSync(path.join(dir, f), "utf8"));
      const card = mapper(f, raw);
      if (card) out.push(card);
    } catch { /* skip malformed */ }
  }
  return out;
}

function readAll(): LessonCard[] {
  // Prefer v2 (structured) over v1 for each lesson id
  const v2 = loadFrom(SYNTH_V2_DIR, (f, raw) => {
    const src = raw.source ?? {};
    const gen = raw.generated ?? {};
    return {
      id: raw.lesson_id ?? src.id ?? f.replace(".json", ""),
      slug: src.slug ?? "",
      level: Number(src.level ?? 0),
      wbs: Array.isArray(src.wbs) ? src.wbs : [],
      reading_min: Number(src.reading_min ?? 0),
      title: src.title ?? "",
      aim: gen.aim ?? src.aim ?? "",
      application: gen.application ?? src.application ?? "",
      tldr: gen.tldr ?? null,
      sections: gen.sections ?? null,
      worked_example: gen.worked_example ?? null,
      decision_tree: gen.decision_tree ?? null,
      mcqs: gen.mcqs ?? null,
      flashcards: gen.flashcards ?? null,
      body_md: null,
      cited_in: gen.cited_in ?? [],
      version: "v2",
    };
  });

  const v2Ids = new Set(v2.map((c) => c.id));

  const v1 = loadFrom(SYNTH_V1_DIR, (f, raw) => {
    const id = raw.lesson_id ?? raw.source?.id ?? f.replace(".json", "");
    if (v2Ids.has(id)) return null;
    const src = raw.source ?? {};
    const gen = raw.generated ?? {};
    return {
      id,
      slug: src.slug ?? "",
      level: Number(src.level ?? 0),
      wbs: Array.isArray(src.wbs) ? src.wbs : [],
      reading_min: Number(src.reading_min ?? 0),
      title: src.title ?? "",
      aim: gen.aim ?? src.aim ?? "",
      application: gen.application ?? src.application ?? "",
      tldr: null,
      sections: null,
      worked_example: null,
      decision_tree: null,
      mcqs: null,
      flashcards: null,
      body_md: gen.body_md ?? null,
      cited_in: gen.cited_in ?? [],
      version: "v1",
    };
  });

  return [...v2, ...v1].sort((a, b) => a.id.localeCompare(b.id));
}

const curriculumRouter = router({
  list: publicProcedure.query(async ({ ctx }) => {
    const cards = readAll();
    const tier = await resolveCurriculumTier(ctx);
    // Every tier sees titles + aim + level of every lesson — the "shelf".
    // What differs is the reading-mode access, gated in bySlug.
    return {
      tier,
      lessons: cards.map((c) => ({
        id: c.id,
        slug: c.slug,
        level: c.level,
        wbs: c.wbs,
        reading_min: c.reading_min,
        title: c.title,
        aim: c.aim,
        version: c.version,
        hasBody: Boolean(c.body_md || c.sections),
      })),
    };
  }),

  bySlug: publicProcedure
    .input(z.object({ slug: z.string().min(1) }))
    .query(async ({ input, ctx }) => {
      const cards = readAll();
      const card = cards.find((c) => c.slug === input.slug);
      if (!card) return null;
      const tier = await resolveCurriculumTier(ctx);
      return { tier, lesson: gateLessonByTier(card, tier) };
    }),
});

// ─── Server-side paywall helpers ────────────────────────────────────────────
//
// We resolve the caller's real subscription tier from wineries.plan on every
// request. Cheap (indexed single-row lookup, cached-friendly). See
// /app/server/routers/curriculum.ts header comment for the design rationale.

export type CurriculumTier = "free" | "cellar_hand" | "press" | "vigneron";

/** Map a raw wineries.plan enum value to a curriculum access tier.
 *  wineries.plan values: 'free' | 'press' | 'amphora' | 'coopers' | 'founding_member'
 *  Curriculum tiers:     'free' | 'cellar_hand' | 'press' | 'vigneron'
 *  founding_member gets vigneron courtesy — they backed early. */
function planToCurriculumTier(plan: string | null | undefined): CurriculumTier {
  switch (plan) {
    case "coopers":
    case "founding_member":
      return "vigneron";
    case "press":
      return "press";
    case "amphora":
      return "cellar_hand";
    case "free":
    default:
      return "free";
  }
}

/** Read the caller's tier from ctx.user.wineryId → wineries.plan.
 *
 *  Admin bypass: an authenticated admin can pass `?preview=<tier>` on the
 *  URL and see the app as that tier. This is what lets Rich QA each tier
 *  without needing multiple test accounts. Non-admin `?preview` is ignored.
 *  This is enforced HERE not in the client to prevent bundle-hack bypass.
 *
 *  Unauthenticated visitors → 'free'. */
async function resolveCurriculumTier(ctx: {
  user: { wineryId: number | null; role?: string | null } | null;
  req?: { query?: Record<string, unknown>; url?: string; headers?: Record<string, string | string[] | undefined>; cookies?: Record<string, string> } | undefined;
}): Promise<CurriculumTier> {
  // ── Guest-pass short-circuit ────────────────────────────────────────
  // Signed HMAC token in the ow_curriculum_guest cookie grants the tier
  // encoded in the token, taking priority over the caller's actual
  // wineries.plan. This is the pragmatic interim path until the Stripe
  // subscription loop is closed (see /app/server/lib/guestPass.ts).
  const guestToken = extractGuestPassToken(ctx.req);
  if (guestToken) {
    const payload = verifyGuestPass(guestToken);
    if (payload) return payload.tier;
  }

  // Admin preview escape hatch (server-enforced — admin role only)
  const isAdmin = ctx.user?.role === "admin";
  if (isAdmin && ctx.req) {
    // Extract ?preview= from the request URL. Works whether tRPC gave us
    // parsed query object or just a URL string.
    let previewParam: string | null = null;
    const q = ctx.req.query;
    if (q && typeof q === "object") {
      const p = q.preview;
      if (typeof p === "string") previewParam = p;
    }
    if (!previewParam && typeof ctx.req.url === "string") {
      try {
        const u = new URL(ctx.req.url, "http://localhost");
        previewParam = u.searchParams.get("preview");
      } catch {
        /* ignore malformed */
      }
    }
    if (previewParam) {
      const normalised = previewParam.toLowerCase().replace(/[\s-]+/g, "_").replace(/^the_/, "");
      if (normalised === "vigneron" || normalised === "coopers") return "vigneron";
      if (normalised === "press") return "press";
      if (normalised === "cellar_hand" || normalised === "amphora" || normalised === "cellarhand") return "cellar_hand";
      if (normalised === "free") return "free";
    }
  }

  const wineryId = ctx.user?.wineryId ?? null;
  if (wineryId === null) return "free";
  try {
    const rows = await db
      .select({ plan: schema.wineries.plan })
      .from(schema.wineries)
      .where(eq(schema.wineries.id, wineryId))
      .limit(1);
    return planToCurriculumTier(rows[0]?.plan);
  } catch (err) {
    // If DB lookup fails, fail closed (free) rather than falsely granting access.
    console.warn("[curriculum] tier lookup failed, defaulting to free:", (err as Error)?.message);
    return "free";
  }
}

/** Redact lesson fields based on the caller's tier.
 *
 *   free         → titles + aim + tldr + section HEADINGS + keyConcept +
 *                  trap only (Skim mode — teaser of every lesson).
 *   cellar_hand+ → full content: sections body_md, worked_example,
 *                  decision_tree, mcqs (rationale still included so learners
 *                  can self-check), flashcards, citations.
 *   press+       → same content as cellar_hand — differentiation is in
 *                  persistence (scored MCQs, progress) handled elsewhere.
 *   vigneron+    → same content — differentiation is team seats + branded
 *                  attainment PDFs handled elsewhere.
 */
function gateLessonByTier(card: LessonCard, tier: CurriculumTier): LessonCard {
  if (tier === "free") {
    return {
      ...card,
      // Skim: keep section HEADINGS and the keyConcept/trap callouts, drop
      // the prose body. Enough to hook a reader; not enough to substitute
      // for the full lesson.
      sections: card.sections
        ? card.sections.map((s) => ({
            heading: s.heading,
            iconHint: s.iconHint,
            body_md: "",
            keyConcept: s.keyConcept,
            trap: s.trap,
          }))
        : null,
      worked_example: null,
      decision_tree: null,
      mcqs: null,
      flashcards: null,
      body_md: null, // v1 lessons: no body for free tier
      cited_in: [], // sources shown only to paid tiers
    };
  }
  // cellar_hand and up get everything.
  return card;
}

export { curriculumRouter };

/** Pull the guest-pass token out of the request cookie header, if present.
 *  Works whether tRPC context gave us a parsed cookies object or just raw
 *  headers. Failure to find the cookie is not an error — most requests
 *  won't have one. */
function extractGuestPassToken(
  req: { headers?: Record<string, string | string[] | undefined>; cookies?: Record<string, string> } | undefined,
): string | null {
  if (!req) return null;
  const parsed = req.cookies?.[GUEST_PASS_COOKIE];
  if (typeof parsed === "string" && parsed.length > 0) return parsed;
  const raw = req.headers?.cookie;
  const cookieHeader = Array.isArray(raw) ? raw.join("; ") : raw ?? "";
  if (!cookieHeader) return null;
  for (const chunk of cookieHeader.split(";")) {
    const [k, ...rest] = chunk.trim().split("=");
    if (k === GUEST_PASS_COOKIE) return decodeURIComponent(rest.join("="));
  }
  return null;
}
