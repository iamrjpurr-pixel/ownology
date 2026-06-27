/**
 * Cellar Journal — public, SEO-friendly Q&A library.
 *
 * Every Q&A from the AI tutor / Free Run is persisted here. The web reader
 * sees a ~40% teaser + wax-sealed CTA wall; Googlebot is given full content
 * with `isAccessibleForFree=false` + `hasPart` Schema.org markup so we get
 * indexed without cloaking.
 */
import { z } from "zod";
import { and, desc, eq, sql, like, or, isNotNull } from "drizzle-orm";
import { router, publicProcedure } from "./trpc.js";
import { db } from "./db.js";
import { embed } from "./_core/llm.js";
import * as schema from "../drizzle/schema.js";

/* -- topic inference (keyword-based; cheap, deterministic) ---------------- */

/** Curated topic catalogue — keyword → canonical topic tag. */
const TOPIC_KEYWORDS: Array<{ topic: string; rx: RegExp }> = [
  { topic: "Stuck Fermentation",   rx: /\b(stuck|stall(ed|ing)?|stopped (bubbl|ferment)|won.?t finish|residual sugar)\b/i },
  { topic: "Malolactic Fermentation", rx: /\b(mlf|malolactic|malic|lactic)\b/i },
  { topic: "SO₂ & Sulphites",      rx: /\b(so2|so₂|sulph?ite|campden|kmbs|kms|free so2|molecular so2)\b/i },
  { topic: "Racking & Lees",       rx: /\b(rack(ing)?|lees|sediment|gross lees|fine lees)\b/i },
  { topic: "Fermentation",         rx: /\b(ferment(ation|ing)?|primary|brix|sg|specific gravity|inoculat|pitch)\b/i },
  { topic: "Yeast & Nutrients",    rx: /\b(yeast|dap|fermaid|go.?ferm|nutrient|yan)\b/i },
  { topic: "Oxidation & Browning", rx: /\b(oxidation|oxidised|browning|brown(ed)?|topping|ullage|headspace)\b/i },
  { topic: "Faults & Off-Flavours", rx: /\b(brett(anomyces)?|h2s|hydrogen sulph?ide|volatile acidity|\bva\b|nail polish|reductive|sulph?ur smell|rotten egg)\b/i },
  { topic: "Acid & pH",            rx: /\b(\bph\b|titratable|tartaric|malic|acidity|\bta\b|acid adjust)\b/i },
  { topic: "Pressing & Free-Run",  rx: /\b(press(ing)?|free.?run|whole.?bunch|whole.?cluster)\b/i },
  { topic: "Harvest & Receival",   rx: /\b(harvest|pick(ing)?|receival|destem|crush(ing)?|cold soak)\b/i },
  { topic: "Sanitation",           rx: /\b(clean(ing)?|sanit|cip|sterile|kahm|film yeast)\b/i },
  { topic: "Bottling & Closures",  rx: /\b(bottl(ing|e)?|cork|screwcap|closure|fill level|headspace)\b/i },
  { topic: "Tannin & Oak",         rx: /\b(tannin|oak|barrel|toast|chips|cubes)\b/i },
  { topic: "Fining & Clarification", rx: /\b(fining|bentonite|isinglass|gelatin|clarif|haze|cloudy)\b/i },
  { topic: "Temperature Control",  rx: /\b(temperature|too hot|too cold|cooling|warm|chilled)\b/i },
  { topic: "Cold Stabilisation",   rx: /\b(cold stab|tartrate|crystals|cold stable)\b/i },
];

export function inferTopic(question: string, fallback?: string): string {
  for (const { topic, rx } of TOPIC_KEYWORDS) {
    if (rx.test(question)) return topic;
  }
  // Reject obvious garbage (e.g. "no reference document provided" from LLM)
  if (fallback && /^[A-Z]/i.test(fallback.trim()) && fallback.length < 60 &&
      !/no reference|home winemaking$|provided|outline\s*–|^chapter/i.test(fallback)) {
    return fallback.trim();
  }
  return "Winemaking";
}

/* -- slug + teaser helpers ----------------------------------------------- */

export function slugifyQuestion(q: string, topic: string): string {
  const base = `${topic}-${q}`
    .toLowerCase()
    .replace(/[''`""]/g, "")
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "")
    .slice(0, 180);
  return base || `journal-${Date.now()}`;
}

/**
 * Build a teaser containing the diagnosis + first ~40% of the procedure.
 * Strategy:
 *  - Always include first paragraph in full (usually the diagnosis/setup)
 *  - Then include 40% of remaining content, rounded to paragraph boundary
 */
export function buildTeaser(full: string): { teaser: string; diagnosis: string } {
  const paragraphs = full.split(/\n\s*\n/).filter((p) => p.trim());
  if (paragraphs.length === 0) return { teaser: full, diagnosis: "" };
  // Diagnosis = first sentence of first paragraph (used as meta-description too)
  const firstPara = paragraphs[0].trim();
  const firstSentence = firstPara.split(/(?<=[.!?])\s+/)[0] || firstPara;
  const diagnosis = firstSentence.slice(0, 500);

  const targetPercent = 0.4;
  const totalLen = full.length;
  const targetLen = Math.floor(totalLen * targetPercent);

  let acc = 0;
  const kept: string[] = [];
  for (const p of paragraphs) {
    kept.push(p);
    acc += p.length + 2;
    if (acc >= targetLen) break;
  }
  // Ensure at least the first paragraph survives; otherwise teaser feels empty.
  if (kept.length === 0) kept.push(firstPara);

  return { teaser: kept.join("\n\n"), diagnosis };
}

/* -- core persist function (called from tutor.ask / freeRun) ------------- */

/** Cosine similarity between two equal-length vectors. */
function cosine(a: number[], b: number[]): number {
  let dot = 0,
    na = 0,
    nb = 0;
  const len = Math.min(a.length, b.length);
  for (let i = 0; i < len; i++) {
    dot += a[i] * b[i];
    na += a[i] * a[i];
    nb += b[i] * b[i];
  }
  if (!na || !nb) return 0;
  return dot / (Math.sqrt(na) * Math.sqrt(nb));
}

/** Trinity-style dedup threshold. ≥0.80 = "same question, different phrasing"
 *  for text-embedding-3-small. Empirically tuned: typical paraphrases score
 *  0.82-0.85, while semantically-different Qs in the same topic stay below 0.70. */
const SIMILARITY_THRESHOLD = 0.80;

export async function persistJournalEntry(opts: {
  question: string;
  topicTag: string;
  fullAnswer: string;
  source: "tutor.ask" | "freeRun.curiosityAsk";
  audience?: string;
  wineType?: "red" | "white" | "both" | "unknown";
  citations?: Array<{ label: string; source_doc?: string; chapter?: string }>;
}): Promise<{ id: number; slug: string; isNew: boolean; clusterMatch?: number }> {
  const now = Date.now();
  const cleanQ = opts.question.trim().replace(/\s+/g, " ").slice(0, 480);
  const topic = inferTopic(cleanQ, opts.topicTag);
  const slug = slugifyQuestion(cleanQ, topic);
  const { teaser, diagnosis } = buildTeaser(opts.fullAnswer);

  // 1) Fast exact-slug dedup (paraphrase-identical Q)
  const [exactMatch] = await db
    .select({ id: schema.cellarJournal.id, askedCount: schema.cellarJournal.askedCount, variants: schema.cellarJournal.variants })
    .from(schema.cellarJournal)
    .where(eq(schema.cellarJournal.slug, slug))
    .limit(1);

  if (exactMatch) {
    await db
      .update(schema.cellarJournal)
      .set({
        askedCount: exactMatch.askedCount + 1,
        lastAskedAt: now,
        updatedAt: now,
      })
      .where(eq(schema.cellarJournal.id, exactMatch.id));
    return { id: exactMatch.id, slug, isNew: false };
  }

  // 2) Trinity semantic dedup — embed the new question, compare cosine sim
  //    against all entries in the same topic. If best match ≥ threshold,
  //    fold this question in as a variant of the canonical entry.
  let newEmbedding: number[] | null = null;
  try {
    const [vec] = await embed(cleanQ);
    if (Array.isArray(vec)) newEmbedding = vec;
  } catch (e) {
    console.warn("[CellarJournal] embed failed (continuing without dedup):", (e as Error).message);
  }

  if (newEmbedding) {
    const candidates = await db
      .select({
        id: schema.cellarJournal.id,
        slug: schema.cellarJournal.slug,
        askedCount: schema.cellarJournal.askedCount,
        variants: schema.cellarJournal.variants,
        embedding: schema.cellarJournal.embedding,
      })
      .from(schema.cellarJournal)
      .where(
        and(
          eq(schema.cellarJournal.topicTag, topic),
          isNotNull(schema.cellarJournal.embedding)
        )
      )
      .limit(200);

    let best: { id: number; slug: string; askedCount: number; variants: string | null; score: number } | null = null;
    for (const c of candidates) {
      if (!c.embedding) continue;
      try {
        const vec = JSON.parse(c.embedding) as number[];
        const score = cosine(newEmbedding, vec);
        if (!best || score > best.score) {
          best = { id: c.id, slug: c.slug, askedCount: c.askedCount, variants: c.variants, score };
        }
      } catch {
        // ignore corrupt embedding rows
      }
    }

    if (best && best.score >= SIMILARITY_THRESHOLD) {
      // Fold this variant into the canonical entry
      let variants: Array<{ q: string; askedAt: number }> = [];
      try {
        variants = best.variants ? JSON.parse(best.variants) : [];
      } catch {
        variants = [];
      }
      // Avoid storing the same variant string twice
      if (!variants.find((v) => v.q === cleanQ)) {
        variants.push({ q: cleanQ, askedAt: now });
      }
      await db
        .update(schema.cellarJournal)
        .set({
          askedCount: best.askedCount + 1,
          lastAskedAt: now,
          updatedAt: now,
          variants: JSON.stringify(variants),
        })
        .where(eq(schema.cellarJournal.id, best.id));
      console.log(`[CellarJournal] Trinity-clustered "${cleanQ.slice(0, 50)}…" → ${best.slug} (score=${best.score.toFixed(3)})`);
      return { id: best.id, slug: best.slug, isNew: false, clusterMatch: best.score };
    } else if (best) {
      console.log(`[CellarJournal] No cluster match (best=${best.score.toFixed(3)} < ${SIMILARITY_THRESHOLD}) → creating new entry for "${cleanQ.slice(0, 60)}…"`);
    }
  }

  // 3) No match — insert as a new canonical entry
  const result = await db.insert(schema.cellarJournal).values({
    slug,
    question: cleanQ,
    topicTag: topic,
    fullAnswer: opts.fullAnswer,
    teaserAnswer: teaser,
    diagnosis,
    source: opts.source,
    audience: opts.audience ?? null,
    wineType: opts.wineType ?? "unknown",
    citations: opts.citations ? JSON.stringify(opts.citations) : null,
    viewCount: 0,
    askedCount: 1,
    featured: false,
    published: true,
    embedding: newEmbedding ? JSON.stringify(newEmbedding) : null,
    variants: null,
    firstAskedAt: now,
    lastAskedAt: now,
    createdAt: now,
    updatedAt: now,
  });

  return { id: Number(result[0].insertId), slug, isNew: true };
}

/* -- public router ------------------------------------------------------- */

export const cellarJournalRouter = router({
  /** Listing — paginated, optionally filtered by topic or search text */
  list: publicProcedure
    .input(
      z
        .object({
          topic: z.string().optional(),
          search: z.string().optional(),
          featuredOnly: z.boolean().optional(),
          limit: z.number().min(1).max(60).default(24),
          offset: z.number().min(0).default(0),
        })
        .default({})
    )
    .query(async ({ input }) => {
      const cj = schema.cellarJournal;
      const conds = [eq(cj.published, true)];
      if (input.topic) conds.push(eq(cj.topicTag, input.topic));
      if (input.featuredOnly) conds.push(eq(cj.featured, true));
      if (input.search) {
        conds.push(
          or(
            like(cj.question, `%${input.search}%`),
            like(cj.topicTag, `%${input.search}%`)
          )!
        );
      }

      const rows = await db
        .select({
          id: cj.id,
          slug: cj.slug,
          question: cj.question,
          topicTag: cj.topicTag,
          diagnosis: cj.diagnosis,
          wineType: cj.wineType,
          viewCount: cj.viewCount,
          askedCount: cj.askedCount,
          lastAskedAt: cj.lastAskedAt,
          featured: cj.featured,
        })
        .from(cj)
        .where(and(...conds))
        .orderBy(desc(cj.featured), desc(cj.askedCount), desc(cj.lastAskedAt))
        .limit(input.limit)
        .offset(input.offset);

      const [{ total } = { total: 0 }] = await db
        .select({ total: sql<number>`count(*)` })
        .from(cj)
        .where(and(...conds));

      return { rows, total: Number(total) };
    }),

  /** Topics — group counts for the index filter chips */
  topics: publicProcedure.query(async () => {
    const cj = schema.cellarJournal;
    const rows = await db
      .select({
        topic: cj.topicTag,
        count: sql<number>`count(*)`,
      })
      .from(cj)
      .where(eq(cj.published, true))
      .groupBy(cj.topicTag)
      .orderBy(desc(sql<number>`count(*)`));
    return rows.map((r) => ({ topic: r.topic, count: Number(r.count) }));
  }),

  /** Full entry by slug — increments viewCount on every fetch */
  getBySlug: publicProcedure
    .input(z.object({ slug: z.string() }))
    .query(async ({ input }) => {
      const cj = schema.cellarJournal;
      const [row] = await db
        .select()
        .from(cj)
        .where(and(eq(cj.slug, input.slug), eq(cj.published, true)))
        .limit(1);
      if (!row) return null;

      // Fire-and-forget view increment
      db.update(cj)
        .set({ viewCount: row.viewCount + 1 })
        .where(eq(cj.id, row.id))
        .catch(() => {});

      let citations: Array<{ label: string; source_doc?: string; chapter?: string }> = [];
      try {
        citations = row.citations ? JSON.parse(row.citations) : [];
      } catch {
        citations = [];
      }
      let variants: Array<{ q: string; askedAt: number }> = [];
      try {
        variants = row.variants ? JSON.parse(row.variants) : [];
      } catch {
        variants = [];
      }

      // Related: 3 most-asked entries with same topic (excluding self)
      const related = await db
        .select({
          slug: cj.slug,
          question: cj.question,
          topicTag: cj.topicTag,
          diagnosis: cj.diagnosis,
        })
        .from(cj)
        .where(
          and(
            eq(cj.published, true),
            eq(cj.topicTag, row.topicTag),
            sql`${cj.id} != ${row.id}`
          )
        )
        .orderBy(desc(cj.askedCount))
        .limit(3);

      return { entry: { ...row, citations, variants }, related };
    }),
});
