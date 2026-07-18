/**
 * copyrightGuard — paraphrase enforcement for RAG responses.
 *
 * The /ask endpoint retrieves chunks from copyrighted third-party sources
 * (MoreWine bibles, AWRI factsheets, Boulton, Iland) and stuffs them into
 * Claude's context as private grounding. Those books are licensed to
 * Ownology for internal use only — never for redistribution to end users.
 *
 * A well-crafted system prompt catches most verbatim leakage (Layer 1,
 * lives in tutor.ts). This module is Layer 2 — a belt-and-braces N-gram
 * overlap detector that runs on every LLM response before it goes to the
 * user. If the answer shares 8+ consecutive words with any reference
 * chunk, it flags the hit so tutor.ts can regenerate with a stricter
 * prompt.
 *
 * Design notes:
 *   - Threshold of 8 words is deliberately conservative. Short factual
 *     phrases (e.g. "add 5 g of potassium metabisulphite per hectolitre")
 *     under 8 words are fine to reproduce — those are facts, not prose.
 *   - We normalise aggressively (lowercase, strip punctuation, collapse
 *     whitespace) so trivial edits like "the" -> "a" don't leak past.
 *   - Runs in ~1-5ms per response for typical chunk counts. Pure JS,
 *     no external dependencies.
 *
 * Feb 2026, Rich — Copyright Guardrails project.
 */

export interface CopyrightGuardResult {
  /** True if any 8+ word overlap was detected. */
  scrubbed: boolean;
  /** The specific overlapping phrases (up to 5, deduped). */
  hits: string[];
  /** Source labels for the offending chunks, for logging. */
  sourceHits: string[];
}

export interface GuardChunk {
  content: string;
  sourceDoc?: string | null;
  chapterTitle?: string | null;
}

const NGRAM_THRESHOLD = 8;

/** Normalise text for overlap comparison. Strips punctuation, collapses
 *  whitespace, lowercases. Preserves word boundaries only. */
function normalise(text: string): string {
  return text
    .toLowerCase()
    .replace(/[^\p{L}\p{N}\s]/gu, " ")  // strip all punctuation (unicode-aware)
    .replace(/\s+/g, " ")
    .trim();
}

/** Split into an array of word tokens. */
function tokenise(text: string): string[] {
  return normalise(text).split(" ").filter((w) => w.length > 0);
}

/**
 * Detect N-gram overlaps between the LLM answer and each reference chunk.
 *
 * Returns the specific phrases that overlap (for logging + prompt-strict
 * regeneration) plus a scrubbed flag the caller can act on.
 *
 * Runs O(answerWords × chunkCount) with a Set-based lookup per chunk. For
 * a typical /ask response (~200-word answer, 4 chunks of ~2000 words each)
 * this is <5ms on Node.
 */
export function detectCopyrightOverlap(
  answer: string,
  chunks: GuardChunk[],
  ngramSize: number = NGRAM_THRESHOLD,
): CopyrightGuardResult {
  if (!answer || chunks.length === 0) {
    return { scrubbed: false, hits: [], sourceHits: [] };
  }

  const answerWords = tokenise(answer);
  if (answerWords.length < ngramSize) {
    return { scrubbed: false, hits: [], sourceHits: [] };
  }

  const hitsSet = new Set<string>();
  const sourceHitsSet = new Set<string>();

  for (const chunk of chunks) {
    if (!chunk?.content) continue;
    const chunkNormalised = normalise(chunk.content);
    if (chunkNormalised.length < ngramSize * 4) continue;

    for (let i = 0; i <= answerWords.length - ngramSize; i++) {
      const ngram = answerWords.slice(i, i + ngramSize).join(" ");
      if (chunkNormalised.includes(ngram)) {
        hitsSet.add(ngram);
        const label = chunk.chapterTitle ?? chunk.sourceDoc ?? "unknown source";
        sourceHitsSet.add(label);
        if (hitsSet.size >= 5) break;
      }
    }
    if (hitsSet.size >= 5) break;
  }

  return {
    scrubbed: hitsSet.size > 0,
    hits: Array.from(hitsSet),
    sourceHits: Array.from(sourceHitsSet),
  };
}

/**
 * Build a stricter regeneration prompt when an overlap is caught.
 *
 * We give Claude the specific phrases that leaked plus a firm directive
 * to rewrite them. Cheaper than a full retry from scratch because most of
 * the reasoning is already done — this is just a paraphrase pass.
 */
export function buildStricterPrompt(offendingPhrases: string[]): string {
  const phraseList = offendingPhrases
    .slice(0, 5)
    .map((p) => `  - "${p}"`)
    .join("\n");
  return `Your previous answer contained phrases copied near-verbatim from the licensed reference material. That material is licensed to Ownology for grounding only, NOT for redistribution.

The offending phrases were:
${phraseList}

Rewrite your answer completely in your own working-winemaker voice. The facts, numbers, and conclusions must remain accurate. But no consecutive run of 8+ words from the reference material may appear in your reply. Cite the source (e.g. "AWRI's stuck ferment guidance…") without reproducing the text.

Respond in the same JSON format as before.`;
}

/** Exposed for unit tests. */
export const _internal = { normalise, tokenise, NGRAM_THRESHOLD };

// ─── Persistence ───────────────────────────────────────────────────────────
// Detection events are logged to `copyright_guard_events` so the
// /admin/health page can surface hit rates, top offending sources, and
// regen success stats. Failure is soft — a broken DB write must never
// break the /ask flow, so we wrap in try/catch and just warn on error.

export type GuardOutcome = "clean" | "still_leaking" | "regen_failed" | "no_regen";

export interface RecordGuardEventInput {
  question: string;
  hits: string[];
  sourceHits: string[];
  outcome: GuardOutcome;
  originalAnswerLen: number;
}

/**
 * Insert a copyright-guard detection event into the DB.
 *
 * The `dbClient` and `table` are injected so this module stays free of
 * server-side dependencies (keeps unit tests fast and the module reusable
 * from scripts). tutor.ts passes them at call time.
 */
export async function recordGuardEvent(
  dbClient: { insert: (t: unknown) => { values: (v: unknown) => { execute: () => Promise<unknown> } } },
  table: unknown,
  input: RecordGuardEventInput,
): Promise<void> {
  try {
    const snippet = input.question.length > 240
      ? input.question.slice(0, 237) + "..."
      : input.question;
    const primarySource = input.sourceHits[0] ?? null;
    await dbClient
      .insert(table)
      .values({
        occurredAt: Date.now(),
        questionSnippet: snippet,
        hitsJson: JSON.stringify(input.hits.slice(0, 5)),
        sourceHitsJson: JSON.stringify(input.sourceHits.slice(0, 10)),
        outcome: input.outcome,
        primarySource,
        originalAnswerLen: input.originalAnswerLen,
      })
      .execute();
  } catch (e) {
    console.warn("[CopyrightGuard] recordGuardEvent failed:", (e as Error)?.message);
  }
}
