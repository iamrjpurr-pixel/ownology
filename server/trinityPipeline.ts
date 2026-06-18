/**
 * Trinity Content Pipeline — core logic
 * ─────────────────────────────────────────────────────────────────────────────
 * Turns real Free Run "Go Deeper" reveals (canonical Trinity Q + three polished
 * panels) into community blog pieces. Invoked nightly by the Heartbeat handler
 * in server/scheduled/trinityCluster.ts, but kept here (pure-ish, dependency-
 * injectable) so it can be unit-tested without Express/cron.
 *
 * EMBEDDINGS NOTE: the Forge API exposes only /v1/chat/completions — there is
 * NO /v1/embeddings endpoint (see server/sopEmbeddings.ts). Vector-cosine
 * clustering is therefore not available. We substitute an LLM semantic-grouping
 * pass: the model groups near-duplicate questions and emits a canonical question
 * per cluster. Same product outcome (group 3+ similar Qs, canonicalise, suppress
 * dupes) within the platform's real capability.
 *
 * BIBLE PRIVACY: diy_knowledge_chunks (Red/White Wine Bibles) are used ONLY as a
 * private accuracy layer. Their names/sources are NEVER cited or exposed to
 * users. Authority is always presented as Ownology's own.
 */

import {
  db,
  getUnclusteredReveals,
  getRevealFeedbackScores,
  getPublishedCanonicalQuestions,
  insertPublishedTrinity,
  markRevealsClustered,
  replaceTrinityFaqClusters,
  type TrinityReveal,
} from "./db.js";
import * as schema from "../drizzle/schema.js";
import { eq, and } from "drizzle-orm";

// ── Tunables ────────────────────────────────────────────────────────────────
export const MIN_CLUSTER_SIZE = 3; // need 3+ similar reveals to publish a piece
export const MAX_BATCH = 200; // cap reveals processed per run
export const MAX_FAQ = 10; // top N clusters become FAQ entries

// ── LLM caller (injectable for tests) ────────────────────────────────────────
export type LLMCaller = (
  messages: { role: "system" | "user" | "assistant"; content: string }[],
  opts?: { json?: boolean }
) => Promise<string>;

export const defaultLLM: LLMCaller = async (messages, opts) => {
  const forgeUrl = process.env.BUILT_IN_FORGE_API_URL;
  const forgeKey = process.env.BUILT_IN_FORGE_API_KEY;
  if (!forgeUrl || !forgeKey) throw new Error("LLM service not configured");
  const body: Record<string, unknown> = { messages, stream: false };
  if (opts?.json) body.response_format = { type: "json_object" };
  const resp = await fetch(`${forgeUrl.replace(/\/+$/, "")}/v1/chat/completions`, {
    method: "POST",
    headers: { "Content-Type": "application/json", Authorization: `Bearer ${forgeKey}` },
    body: JSON.stringify(body),
  });
  if (!resp.ok) throw new Error(`LLM error: ${resp.status}`);
  const data = await resp.json();
  return (data.choices?.[0]?.message?.content ?? "") as string;
};

/** Tolerant JSON extraction — strips ```json fences and trailing prose. */
export function parseJsonLoose<T>(raw: string, fallback: T): T {
  if (!raw) return fallback;
  let s = raw.trim();
  const fence = s.match(/```(?:json)?\s*([\s\S]*?)```/i);
  if (fence) s = fence[1].trim();
  // Grab the outermost {...} or [...] if there is surrounding prose.
  const firstObj = s.search(/[[{]/);
  const lastObj = Math.max(s.lastIndexOf("]"), s.lastIndexOf("}"));
  if (firstObj >= 0 && lastObj > firstObj) s = s.slice(firstObj, lastObj + 1);
  try {
    return JSON.parse(s) as T;
  } catch {
    return fallback;
  }
}

// ── Types ─────────────────────────────────────────────────────────────────
export type Cluster = {
  canonicalQuestion: string;
  revealIds: number[];
};

export type EditorialResult = {
  questionCanonical: string;
  excerpt: string;
  contentScience: string;
  contentVineyard: string;
  contentCraft: string;
  primaryAct: "science" | "vineyard" | "craft";
};

export type AccuracyResult = {
  flag: boolean;
  note: string | null;
};

// ── Step 1: semantic clustering ──────────────────────────────────────────────
/**
 * Ask the LLM to group near-duplicate questions. Returns clusters with a
 * canonical question and the member reveal ids. Clusters smaller than
 * MIN_CLUSTER_SIZE are filtered out by the caller.
 */
export async function clusterReveals(
  reveals: Pick<TrinityReveal, "id" | "question">[],
  llm: LLMCaller = defaultLLM
): Promise<Cluster[]> {
  if (reveals.length === 0) return [];
  const list = reveals
    .map((r) => `${r.id}: ${r.question.replace(/\s+/g, " ").slice(0, 240)}`)
    .join("\n");

  const sys =
    "You are a content editor for a winemaking knowledge platform. You group " +
    "wine questions that ask essentially the same thing (same underlying topic " +
    "and intent), even when worded differently. Ignore superficial differences. " +
    "Respond with JSON only.";
  const user =
    `Group these questions into clusters of near-duplicates. Each question has ` +
    `an id. Only group questions that genuinely share the same intent.\n\n` +
    `Questions:\n${list}\n\n` +
    `Return JSON of this exact shape:\n` +
    `{"clusters":[{"canonical_question":"the clearest single phrasing of the shared question","reveal_ids":[1,2,3]}]}\n` +
    `Rules: every reveal_id must come from the list; do not invent ids; a ` +
    `question may belong to at most one cluster; singletons may be returned as ` +
    `their own cluster.`;

  const raw = await llm([{ role: "system", content: sys }, { role: "user", content: user }], { json: true });
  const parsed = parseJsonLoose<{ clusters?: { canonical_question?: string; reveal_ids?: number[] }[] }>(
    raw,
    { clusters: [] }
  );
  const validIds = new Set(reveals.map((r) => r.id));
  const out: Cluster[] = [];
  for (const c of parsed.clusters ?? []) {
    const ids = Array.from(new Set((c.reveal_ids ?? []).filter((id) => validIds.has(id))));
    const q = (c.canonical_question ?? "").trim();
    if (ids.length > 0 && q) out.push({ canonicalQuestion: q, revealIds: ids });
  }
  return out;
}

// ── Step 2: pick canonical source reveal (highest net feedback) ───────────────
export function pickSourceReveal(
  cluster: Cluster,
  scores: Map<number, number>
): number {
  let best = cluster.revealIds[0];
  let bestScore = scores.get(best) ?? 0;
  for (const id of cluster.revealIds) {
    const s = scores.get(id) ?? 0;
    if (s > bestScore) {
      best = id;
      bestScore = s;
    }
  }
  return best;
}

// ── Step 3: editorial polish ──────────────────────────────────────────────────
export async function editorialPass(
  cluster: Cluster,
  source: TrinityReveal,
  llm: LLMCaller = defaultLLM
): Promise<EditorialResult> {
  const sys =
    "You are the editor of Ownology, a winemaking knowledge platform. You polish " +
    "community answers into concise, standalone blog content. Authority is " +
    "Ownology's own — never cite external books, documents, or sources by name. " +
    "Keep the winemaker's practical, grounded voice. Respond with JSON only.";
  const user =
    `Polish this community Trinity answer into a publishable piece.\n\n` +
    `Canonical question: ${cluster.canonicalQuestion}\n\n` +
    `THE SCIENCE panel:\n${source.sciencePanel ?? ""}\n\n` +
    `THE VINEYARD panel:\n${source.vineyardPanel ?? ""}\n\n` +
    `THE CRAFT panel:\n${source.craftPanel ?? ""}\n\n` +
    `Return JSON:\n` +
    `{"question":"clearest canonical phrasing","excerpt":"one-sentence hook (<160 chars)",` +
    `"science":"polished markdown","vineyard":"polished markdown","craft":"polished markdown",` +
    `"primary_act":"science|vineyard|craft"}\n` +
    `primary_act = whichever panel most directly answers the question. Do not add ` +
    `claims that are not present in the source panels.`;

  const raw = await llm([{ role: "system", content: sys }, { role: "user", content: user }], { json: true });
  const p = parseJsonLoose<{
    question?: string;
    excerpt?: string;
    science?: string;
    vineyard?: string;
    craft?: string;
    primary_act?: string;
  }>(raw, {});
  const act =
    p.primary_act === "vineyard" || p.primary_act === "craft" ? p.primary_act : "science";
  return {
    questionCanonical: (p.question ?? cluster.canonicalQuestion).trim(),
    excerpt: (p.excerpt ?? "").trim(),
    contentScience: (p.science ?? source.sciencePanel ?? "").trim(),
    contentVineyard: (p.vineyard ?? source.vineyardPanel ?? "").trim(),
    contentCraft: (p.craft ?? source.craftPanel ?? "").trim(),
    primaryAct: act,
  };
}

// ── Step 4: private bible accuracy cross-reference ────────────────────────────
/**
 * Retrieve a few published bible chunks relevant to the topic (keyword routing
 * over topic tags / content), then ask the LLM whether the piece's claims are
 * supported. Bible names are NEVER returned to the user — only an internal flag
 * + note for owner review.
 */
export async function accuracyPass(
  editorial: EditorialResult,
  topicTag: string | null,
  llm: LLMCaller = defaultLLM
): Promise<AccuracyResult> {
  // Pull a small set of published bible chunks (Domain-4 fermentation et al.).
  const chunks = await db.query.diyKnowledgeChunks.findMany({
    where: eq(schema.diyKnowledgeChunks.published, true),
    columns: { content: true, topicTags: true, chapterTitle: true },
    limit: 400,
  });
  if (chunks.length === 0) {
    // No private reference material available — do not block publishing.
    return { flag: false, note: null };
  }

  // Keyword route: score chunks by overlap with the question + topic tag.
  const needle = `${editorial.questionCanonical} ${topicTag ?? ""} ${editorial.contentScience}`
    .toLowerCase()
    .split(/[^a-z]+/)
    .filter((w) => w.length > 4);
  const needleSet = new Set(needle);
  const scored = chunks
    .map((c) => {
      const hay = `${c.topicTags ?? ""} ${c.chapterTitle ?? ""} ${c.content}`.toLowerCase();
      let score = 0;
      for (const w of Array.from(needleSet)) if (hay.includes(w)) score++;
      return { c, score };
    })
    .filter((x) => x.score > 0)
    .sort((a, b) => b.score - a.score)
    .slice(0, 4);

  if (scored.length === 0) {
    return { flag: false, note: null };
  }

  const reference = scored
    .map((x, i) => `[Ref ${i + 1}]\n${x.c.content.slice(0, 800)}`)
    .join("\n\n");

  const sys =
    "You are a winemaking fact-checker. You are given reference passages and a " +
    "draft answer. Identify any claim in the draft that is contradicted by, or " +
    "clearly unsupported relative to, the references. Be conservative: only flag " +
    "genuine factual conflicts, not stylistic differences. Respond with JSON only.";
  const user =
    `Reference passages (internal, never shown to users):\n${reference}\n\n` +
    `Draft answer:\nQ: ${editorial.questionCanonical}\nScience: ${editorial.contentScience}\n` +
    `Vineyard: ${editorial.contentVineyard}\nCraft: ${editorial.contentCraft}\n\n` +
    `Return JSON: {"flag": true|false, "note": "if flag is true, one sentence naming the questionable claim; otherwise empty string"}`;

  const raw = await llm([{ role: "system", content: sys }, { role: "user", content: user }], { json: true });
  const p = parseJsonLoose<{ flag?: boolean; note?: string }>(raw, { flag: false, note: "" });
  return { flag: !!p.flag, note: p.flag ? (p.note ?? "").trim() || "Unspecified claim flagged for review" : null };
}

// ── Step 5: dedupe against already-published canonical questions ──────────────
export async function isDuplicate(
  canonicalQuestion: string,
  published: { id: number; questionCanonical: string }[],
  llm: LLMCaller = defaultLLM
): Promise<boolean> {
  if (published.length === 0) return false;
  const list = published
    .map((p) => `${p.id}: ${p.questionCanonical.replace(/\s+/g, " ").slice(0, 200)}`)
    .join("\n");
  const sys =
    "You decide whether a new question is essentially a duplicate of any existing " +
    "published question (same topic and intent). Respond with JSON only.";
  const user =
    `New question: ${canonicalQuestion}\n\nExisting published questions:\n${list}\n\n` +
    `Return JSON: {"duplicate": true|false}`;
  const raw = await llm([{ role: "system", content: sys }, { role: "user", content: user }], { json: true });
  const p = parseJsonLoose<{ duplicate?: boolean }>(raw, { duplicate: false });
  return !!p.duplicate;
}

// ── Orchestrator: the nightly run ─────────────────────────────────────────────
export type RunSummary = {
  scanned: number;
  clusters: number;
  published: number;
  flagged: number;
  suppressedDuplicates: number;
  pieces: { id: number; question: string; clusterSize: number; flagged: boolean }[];
};

export async function runTrinityClustering(llm: LLMCaller = defaultLLM): Promise<RunSummary> {
  const reveals = await getUnclusteredReveals(MAX_BATCH);
  const summary: RunSummary = {
    scanned: reveals.length,
    clusters: 0,
    published: 0,
    flagged: 0,
    suppressedDuplicates: 0,
    pieces: [],
  };
  if (reveals.length === 0) return summary;

  // Only reveals that actually have Trinity panels are publishable candidates.
  const candidates = reveals.filter(
    (r) => r.sciencePanel || r.vineyardPanel || r.craftPanel
  );

  const clusters = await clusterReveals(
    candidates.map((r) => ({ id: r.id, question: r.question })),
    llm
  );
  const bigClusters = clusters.filter((c) => c.revealIds.length >= MIN_CLUSTER_SIZE);
  summary.clusters = bigClusters.length;

  const revealById = new Map(reveals.map((r) => [r.id, r]));
  const published = await getPublishedCanonicalQuestions();
  const now = Date.now();
  const allProcessedIds = new Set<number>();

  for (const cluster of bigClusters) {
    const ids = cluster.revealIds;
    ids.forEach((id) => allProcessedIds.add(id));

    // Pick canonical source by highest net feedback.
    const scores = await getRevealFeedbackScores(ids);
    const sourceId = pickSourceReveal(cluster, scores);
    const source = revealById.get(sourceId);
    if (!source) continue;

    // Dedupe against existing published pieces.
    const dup = await isDuplicate(cluster.canonicalQuestion, published, llm);
    if (dup) {
      summary.suppressedDuplicates++;
      await markRevealsClustered(ids, null, now);
      continue;
    }

    // Editorial polish + private accuracy check.
    const editorial = await editorialPass(cluster, source, llm);
    const accuracy = await accuracyPass(editorial, source.topicTag, llm);

    const pieceId = await insertPublishedTrinity({
      questionCanonical: editorial.questionCanonical,
      excerpt: editorial.excerpt,
      contentScience: editorial.contentScience,
      contentVineyard: editorial.contentVineyard,
      contentCraft: editorial.contentCraft,
      primaryAct: editorial.primaryAct,
      topicTag: source.topicTag,
      clusterSize: ids.length,
      memberRevealIds: ids,
      sourceRevealId: sourceId,
      accuracyFlag: accuracy.flag,
      accuracyNote: accuracy.note,
    });

    await markRevealsClustered(ids, pieceId, now);
    published.push({ id: pieceId, questionCanonical: editorial.questionCanonical });
    summary.published++;
    if (accuracy.flag) summary.flagged++;
    summary.pieces.push({
      id: pieceId,
      question: editorial.questionCanonical,
      clusterSize: ids.length,
      flagged: accuracy.flag,
    });
  }

  // Mark all remaining scanned reveals (singletons / sub-threshold) as processed
  // so they are not re-evaluated forever. They remain eligible to be folded in
  // later only if re-asked (new rows). This keeps the backlog draining.
  const leftover = reveals
    .map((r) => r.id)
    .filter((id) => !allProcessedIds.has(id));
  if (leftover.length > 0) {
    await markRevealsClustered(leftover, null, now);
  }

  return summary;
}

// ── FAQ generation: top clusters by volume → short Q&A ────────────────────────
/**
 * Builds auto-FAQ entries from the highest-volume published pieces. Uses the
 * already-published pieces (cluster_size = volume signal) and asks the LLM for a
 * concise FAQ answer per entry. Replaces the FAQ cluster set atomically.
 */
export async function generateFaqFromClusters(llm: LLMCaller = defaultLLM): Promise<number> {
  const pieces = await db.query.publishedTrinityResponses.findMany({
    where: and(
      // Only surface non-suppressed pieces in FAQ
      eq(schema.publishedTrinityResponses.status, "featured")
    ),
    columns: { questionCanonical: true, excerpt: true, clusterSize: true, contentScience: true, contentCraft: true },
  });
  // Fall back to pending if not enough featured pieces yet.
  let pool = pieces;
  if (pool.length < 3) {
    pool = await db.query.publishedTrinityResponses.findMany({
      columns: { questionCanonical: true, excerpt: true, clusterSize: true, contentScience: true, contentCraft: true },
    });
  }
  const top = pool
    .filter((p) => p.questionCanonical)
    .sort((a, b) => (b.clusterSize ?? 0) - (a.clusterSize ?? 0))
    .slice(0, MAX_FAQ);
  if (top.length === 0) {
    await replaceTrinityFaqClusters([]);
    return 0;
  }

  const entries: { canonicalQuestion: string; answer: string; clusterSize: number; rank: number }[] = [];
  for (let i = 0; i < top.length; i++) {
    const p = top[i];
    const sys =
      "You write concise FAQ answers for Ownology, a winemaking knowledge " +
      "platform. 1–2 short paragraphs, plain English, no external sources cited. " +
      "Respond with JSON only.";
    const user =
      `Question: ${p.questionCanonical}\nContext (do not quote verbatim):\n` +
      `${(p.contentScience ?? "").slice(0, 600)}\n${(p.contentCraft ?? "").slice(0, 400)}\n\n` +
      `Return JSON: {"answer":"concise FAQ answer"}`;
    let answer = (p.excerpt ?? "").trim();
    try {
      const raw = await llm([{ role: "system", content: sys }, { role: "user", content: user }], { json: true });
      const parsed = parseJsonLoose<{ answer?: string }>(raw, {});
      if (parsed.answer && parsed.answer.trim()) answer = parsed.answer.trim();
    } catch {
      // keep excerpt fallback
    }
    entries.push({
      canonicalQuestion: p.questionCanonical,
      answer: answer || "See the full Trinity piece for details.",
      clusterSize: p.clusterSize ?? 1,
      rank: i + 1,
    });
  }
  await replaceTrinityFaqClusters(entries);
  return entries.length;
}

// ─────────────────────────────────────────────────────────────────────────────
// MONTHLY NEWSLETTER
// ─────────────────────────────────────────────────────────────────────────────
// Composes a monthly issue from the top featured Trinity pieces (ideally one per
// act). Creates the email in Buttondown as a DRAFT, persists a local row in
// "preview", and notifies the owner. The issue is NOT sent immediately: it sits
// in a 24h owner-preview window. The owner can approve (send now) or skip; a
// daily finalizer auto-sends any still-"preview" issue once the window elapses.
//
// Buttondown stores the actual email. We keep only draft metadata locally.

import {
  listFeaturedTrinity,
  insertNewsletterDraft,
  getNewsletterDraftByPeriod,
  getNewsletterDraftById,
  getExpiredPreviewDrafts,
  setNewsletterStatus,
  type PublishedTrinity,
} from "./db.js";

const PREVIEW_WINDOW_MS = 24 * 60 * 60 * 1000; // 24h owner-preview window
const ACT_LABEL: Record<"science" | "vineyard" | "craft", string> = {
  science: "The Science",
  vineyard: "The Vineyard",
  craft: "The Craft",
};

/** YYYY-MM in UTC — one issue per calendar month. */
export function periodLabelFor(now = Date.now()): string {
  const d = new Date(now);
  const m = `${d.getUTCMonth() + 1}`.padStart(2, "0");
  return `${d.getUTCFullYear()}-${m}`;
}

/**
 * Pick up to three featured pieces, preferring one per act (Science / Vineyard /
 * Craft) for a balanced Trinity issue, falling back to highest cluster volume.
 */
export function selectNewsletterPieces(
  featured: PublishedTrinity[]
): PublishedTrinity[] {
  const byVolume = [...featured].sort(
    (a, b) => (b.clusterSize ?? 0) - (a.clusterSize ?? 0)
  );
  const picked: PublishedTrinity[] = [];
  const usedActs = new Set<string>();
  // First pass: one strongest piece per act.
  for (const act of ["science", "vineyard", "craft"] as const) {
    const best = byVolume.find(
      (p) => p.primaryAct === act && !picked.includes(p)
    );
    if (best) {
      picked.push(best);
      usedActs.add(act);
    }
  }
  // Backfill to 3 with remaining highest-volume pieces.
  for (const p of byVolume) {
    if (picked.length >= 3) break;
    if (!picked.includes(p)) picked.push(p);
  }
  return picked.slice(0, 3);
}

/** Build the subject + Markdown body for the issue. */
export function composeNewsletter(
  pieces: PublishedTrinity[],
  period: string
): { subject: string; body: string } {
  const monthName = new Date(`${period}-01T00:00:00Z`).toLocaleString("en-AU", {
    month: "long",
    year: "numeric",
    timeZone: "UTC",
  });
  const subject = `Ownology Cellar Notes — ${monthName}`;
  const intro =
    `The most-asked questions from the Ownology community this month, ` +
    `answered across the Trinity: the science, the vineyard, and the craft.`;
  const sections = pieces
    .map((p) => {
      const act = ACT_LABEL[p.primaryAct] ?? "The Science";
      const lead =
        p.primaryAct === "science"
          ? p.contentScience
          : p.primaryAct === "vineyard"
            ? p.contentVineyard
            : p.contentCraft;
      const snippet = (p.excerpt || (lead ?? "")).slice(0, 280);
      return `## ${p.questionCanonical}\n\n_${act}_\n\n${snippet}\n`;
    })
    .join("\n---\n\n");
  const body =
    `# ${subject}\n\n${intro}\n\n---\n\n${sections}\n\n---\n\n` +
    `_You're receiving this because you joined the Ownology community. ` +
    `Reply any time — a real winemaker reads these._`;
  return { subject, body };
}

/** Create a Buttondown email as a draft. Returns the upstream email id, or null. */
export async function createButtondownDraft(
  subject: string,
  body: string
): Promise<string | null> {
  const apiKey = process.env.BUTTONDOWN_API_KEY ?? "";
  if (!apiKey) return null;
  try {
    const res = await fetch("https://api.buttondown.email/v1/emails", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Token ${apiKey}`,
      },
      body: JSON.stringify({ subject, body, status: "draft" }),
    });
    if (res.status !== 201 && res.status !== 200) {
      const t = await res.text();
      console.error("[newsletter] Buttondown draft error", res.status, t);
      return null;
    }
    const data = (await res.json()) as { id?: string };
    return data.id ?? null;
  } catch (err) {
    console.error("[newsletter] Buttondown draft fetch error", err);
    return null;
  }
}

/** Publish (send) a Buttondown draft email by id. Returns success. */
export async function sendButtondownDraft(emailId: string): Promise<boolean> {
  const apiKey = process.env.BUTTONDOWN_API_KEY ?? "";
  if (!apiKey || !emailId) return false;
  try {
    // Buttondown: PATCH status from draft → about_to_send to dispatch.
    const res = await fetch(
      `https://api.buttondown.email/v1/emails/${emailId}`,
      {
        method: "PATCH",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Token ${apiKey}`,
        },
        body: JSON.stringify({ status: "about_to_send" }),
      }
    );
    if (res.status >= 200 && res.status < 300) return true;
    const t = await res.text();
    console.error("[newsletter] Buttondown send error", res.status, t);
    return false;
  } catch (err) {
    console.error("[newsletter] Buttondown send fetch error", err);
    return false;
  }
}

export type NewsletterRunResult = {
  created: boolean;
  reason?: string;
  draftId?: number;
  period: string;
  subject?: string;
  pieceCount: number;
};

/**
 * Compose this month's issue (idempotent per period). Creates a Buttondown draft
 * and a local "preview" row; the caller notifies the owner.
 */
export async function runMonthlyNewsletter(
  now = Date.now()
): Promise<NewsletterRunResult> {
  const period = periodLabelFor(now);
  const existing = await getNewsletterDraftByPeriod(period);
  if (existing) {
    return {
      created: false,
      reason: "already_exists",
      period,
      pieceCount: 0,
    };
  }
  const featured = await listFeaturedTrinity();
  if (featured.length === 0) {
    return { created: false, reason: "no_featured_pieces", period, pieceCount: 0 };
  }
  const pieces = selectNewsletterPieces(featured);
  const { subject, body } = composeNewsletter(pieces, period);
  const buttondownEmailId = await createButtondownDraft(subject, body);
  const draftId = await insertNewsletterDraft({
    periodLabel: period,
    subject,
    body,
    featuredIds: pieces.map((p) => p.id),
    buttondownEmailId,
    previewUntil: now + PREVIEW_WINDOW_MS,
  });
  return {
    created: true,
    draftId,
    period,
    subject,
    pieceCount: pieces.length,
  };
}

/** Owner action: approve a preview draft now (sends immediately). */
export async function approveNewsletter(id: number): Promise<boolean> {
  const draft = await getNewsletterDraftById(id);
  if (!draft || draft.status !== "preview") return false;
  let sent = false;
  if (draft.buttondownEmailId) {
    sent = await sendButtondownDraft(draft.buttondownEmailId);
  }
  await setNewsletterStatus(id, sent ? "sent" : "failed", {
    sentAt: sent ? Date.now() : undefined,
  });
  return sent;
}

/** Owner action: skip a preview draft (never send). */
export async function skipNewsletter(id: number): Promise<boolean> {
  const draft = await getNewsletterDraftById(id);
  if (!draft || draft.status !== "preview") return false;
  await setNewsletterStatus(id, "skipped");
  return true;
}

/**
 * Daily finalizer: auto-send any draft whose 24h preview window has elapsed and
 * that the owner has neither approved nor skipped. Returns how many were sent.
 */
export async function finalizeExpiredNewsletters(
  now = Date.now()
): Promise<{ sent: number; failed: number }> {
  const expired = await getExpiredPreviewDrafts(now);
  let sent = 0;
  let failed = 0;
  for (const draft of expired) {
    let ok = false;
    if (draft.buttondownEmailId) {
      ok = await sendButtondownDraft(draft.buttondownEmailId);
    }
    await setNewsletterStatus(draft.id, ok ? "sent" : "failed", {
      sentAt: ok ? now : undefined,
    });
    if (ok) sent++;
    else failed++;
  }
  return { sent, failed };
}
