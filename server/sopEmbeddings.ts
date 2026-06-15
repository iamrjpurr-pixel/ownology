/**
 * sopEmbeddings.ts — DIY SOP Semantic Search (Sprint 4)
 *
 * Architecture note: The Forge API only exposes /v1/chat/completions (no /v1/embeddings).
 * We therefore use LLM-based semantic scoring: ask the model to rank which SOPs are
 * most relevant to the user's question. This is functionally equivalent for our use
 * case (7 DIY SOPs) and requires no additional infrastructure.
 *
 * For future scale (100+ SOPs), replace with a proper vector DB (pgvector, Pinecone, etc.)
 * once an embeddings endpoint becomes available.
 */

import { db } from "./db.js";
import * as schema from "../drizzle/schema.js";
import { eq } from "drizzle-orm";

// ─── LLM-based semantic SOP ranking ──────────────────────────────────────────
// Asks the LLM to select the most relevant SOPs for a given question.
// Returns the top-k SOPs ranked by relevance.
export async function semanticSopSearch(
  question: string,
  audience: "diy" | "commercial",
  topK: number = 3,
  forgeUrl?: string,
  forgeKey?: string
): Promise<Array<{
  id: number;
  title: string;
  category: string;
  procedureText: string | null;
  decisionLogic: string | null;
  tribalKnowledge: string | null;
  similarity: number;
}>> {
  // Fetch all SOPs for this audience
  const sops = await db
    .select({
      id: schema.sopLibrary.id,
      title: schema.sopLibrary.title,
      category: schema.sopLibrary.category,
      procedureText: schema.sopLibrary.procedureText,
      decisionLogic: schema.sopLibrary.decisionLogic,
      tribalKnowledge: schema.sopLibrary.tribalKnowledge,
      quickSteps: schema.sopLibrary.quickSteps,
    })
    .from(schema.sopLibrary)
    .where(eq(schema.sopLibrary.audience, audience));

  if (sops.length === 0) return [];

  // If no LLM available, fall back to simple keyword matching
  if (!forgeUrl || !forgeKey) {
    return keywordFallback(question, sops, topK);
  }

  // Build a compact SOP index for the LLM to rank
  const sopIndex = sops.map((s, i) => `${i + 1}. [${s.id}] "${s.title}" (${s.category})`).join("\n");

  const prompt = `You are a semantic search engine for winemaking SOPs.

Given this question from a home winemaker:
"${question}"

And these available SOPs:
${sopIndex}

Return the IDs of the ${topK} most relevant SOPs as a JSON array of numbers, ordered by relevance (most relevant first).
Only return the JSON array, nothing else. Example: [30003, 30001, 30005]`;

  try {
    const resp = await fetch(`${forgeUrl}/v1/chat/completions`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${forgeKey}`,
      },
      body: JSON.stringify({
        model: "gpt-4o-mini",
        messages: [{ role: "user", content: prompt }],
        max_tokens: 100,
        temperature: 0,
      }),
    });

    const data = await resp.json() as { choices?: Array<{ message: { content: string } }> };
    const content = data.choices?.[0]?.message?.content?.trim() ?? "[]";

    // Parse the JSON array of IDs
    const rankedIds = JSON.parse(content) as number[];

    // Map IDs back to SOPs with synthetic similarity scores
    const results = rankedIds
      .map((id, rank) => {
        const sop = sops.find((s) => s.id === id);
        if (!sop) return null;
        return {
          id: sop.id,
          title: sop.title,
          category: sop.category,
          procedureText: sop.procedureText,
          decisionLogic: sop.decisionLogic,
          tribalKnowledge: sop.tribalKnowledge,
          similarity: 1 - rank * 0.1, // Synthetic score: 1.0, 0.9, 0.8...
        };
      })
      .filter((s): s is NonNullable<typeof s> => s !== null)
      .slice(0, topK);

    return results;
  } catch (err) {
    console.warn("[SemanticSearch] LLM ranking failed, using keyword fallback:", err);
    return keywordFallback(question, sops, topK);
  }
}

// ─── Keyword fallback ─────────────────────────────────────────────────────────
function keywordFallback(
  question: string,
  sops: Array<{
    id: number;
    title: string;
    category: string;
    procedureText: string | null;
    decisionLogic: string | null;
    tribalKnowledge: string | null;
    quickSteps: string | null;
  }>,
  topK: number
) {
  const words = question.toLowerCase().split(/\s+/).filter((w) => w.length > 3);
  const scored = sops.map((sop) => {
    const text = `${sop.title} ${sop.category} ${sop.quickSteps ?? ""} ${sop.procedureText?.slice(0, 200) ?? ""}`.toLowerCase();
    const matches = words.filter((w) => text.includes(w)).length;
    return { ...sop, similarity: matches / Math.max(words.length, 1) };
  });
  return scored.sort((a, b) => b.similarity - a.similarity).slice(0, topK);
}

// ─── Stub: backfillSopEmbeddings ─────────────────────────────────────────────
// Kept for API compatibility. No-op since we use LLM ranking instead of vectors.
export async function backfillSopEmbeddings(
  _forgeUrl: string,
  _forgeKey: string,
  audienceFilter?: "diy" | "commercial"
): Promise<{ embedded: number; skipped: number; errors: number }> {
  const count = await db
    .select({ id: schema.sopLibrary.id })
    .from(schema.sopLibrary)
    .then((rows) => rows.length);
  console.log(`[Embeddings] LLM-based ranking active — no vector backfill needed. ${count} SOPs available.`);
  return { embedded: 0, skipped: count, errors: 0 };
}

// ─── Legacy exports (kept for compatibility) ─────────────────────────────────
export function cosineSimilarity(_a: number[], _b: number[]): number { return 0; }
export function buildSopEmbeddingText(sop: { title: string; category: string }): string {
  return `${sop.title} ${sop.category}`;
}
export async function embedText(_text: string, _url: string, _key: string): Promise<number[]> {
  throw new Error("Vector embeddings not available — use semanticSopSearch instead");
}
