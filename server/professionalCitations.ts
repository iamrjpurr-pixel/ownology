/**
 * Professional Citations lookup — matches a question against the
 * professional_citations index and returns the top named-bible
 * pointers ranked by topic-tag intersection score × row priority.
 *
 * Zero LLM cost. Read-only pull from MySQL. Used by tutor.ask to
 * append named-bible citations to `sourceChapters` so Owen surfaces
 * Boulton / Iland / Ribéreau-Gayon / Rankine / etc. by name when a
 * topic-tag match exists.
 *
 * See also: /app/scripts/seed-professional-citations.mjs
 */
import { db } from "./db.js";
import * as schema from "../drizzle/schema.js";

export type ProfessionalCitationHit = {
  id: number;
  sourceKey: string;
  authors: string;
  title: string;
  edition: string | null;
  chapterRef: string | null;
  sectionRef: string | null;
  pageRange: string | null;
  sectionTitle: string;
  topicTags: string;
  score: number;
};

/** Simple non-stopword tokeniser — lower-case, alnum only, min length 3. */
const STOPWORDS = new Set([
  "the", "and", "for", "with", "how", "what", "when", "where", "why", "does",
  "into", "that", "this", "from", "have", "are", "was", "will", "you", "your",
  "any", "can", "get", "out", "our", "one", "two", "not", "but", "which",
]);

function tokenise(text: string): string[] {
  return (text || "")
    .toLowerCase()
    .replace(/[^a-z0-9\s]/g, " ")
    .split(/\s+/)
    .filter((w) => w.length >= 3 && !STOPWORDS.has(w));
}

/**
 * Match `question` (plus any pre-computed WBS code) against the citation
 * index and return the top-N hits. Scoring:
 *   score = (topic-tag ∩ question-tokens count) + wbs-match-bonus + priority/100
 * Rows with score = 0 are dropped.
 */
export async function findProfessionalCitations(opts: {
  question: string;
  wbsCode?: string | null;
  limit?: number;
}): Promise<ProfessionalCitationHit[]> {
  const limit = opts.limit ?? 3;
  const rows = await db.select().from(schema.professionalCitations);
  if (rows.length === 0) return [];

  const qTokens = new Set(tokenise(opts.question));
  if (qTokens.size === 0) return [];

  const scored: ProfessionalCitationHit[] = rows.map((r) => {
    const tagTokens = tokenise(r.topicTags ?? "");
    let overlap = 0;
    for (const t of tagTokens) if (qTokens.has(t)) overlap++;
    const wbsBonus = opts.wbsCode && r.wbsCode && r.wbsCode === opts.wbsCode ? 1.5 : 0;
    const priorityWeight = (r.priority ?? 50) / 100;
    return {
      id: r.id,
      sourceKey: r.sourceKey,
      authors: r.authors,
      title: r.title,
      edition: r.edition,
      chapterRef: r.chapterRef,
      sectionRef: r.sectionRef,
      pageRange: r.pageRange,
      sectionTitle: r.sectionTitle,
      topicTags: r.topicTags,
      score: overlap + wbsBonus + priorityWeight,
    };
  });

  // Require at least one topic-tag overlap OR a WBS match — pure priority
  // alone shouldn't force a citation onto an unrelated question.
  return scored
    .filter((h) => h.score >= 1.5)
    .sort((a, b) => b.score - a.score)
    .slice(0, limit);
}

/**
 * Render a citation as the human-readable string used in Owen's
 * `sourceChapters` array. Format:
 *   "Boulton et al., Principles and Practices of Winemaking (1st edn) — §5.3 Cold Stabilisation, pp 322–338"
 */
export function renderCitation(hit: ProfessionalCitationHit): string {
  // Author list — "et al." if more than two authors, else keep as-is.
  const authorPart = hit.authors.includes("&") || hit.authors.includes(",")
    ? `${hit.authors.split(/[,&]/)[0]!.trim()} et al.`
    : hit.authors;

  const editionPart = hit.edition ? ` (${hit.edition})` : "";
  const sectionBits: string[] = [];
  if (hit.sectionRef) sectionBits.push(hit.sectionRef);
  else if (hit.chapterRef) sectionBits.push(`Ch. ${hit.chapterRef}`);
  sectionBits.push(hit.sectionTitle);
  const pagePart = hit.pageRange && hit.pageRange !== "n/a" ? `, pp ${hit.pageRange}` : "";

  return `${authorPart}, ${hit.title}${editionPart} — ${sectionBits.join(" ")}${pagePart}`;
}
