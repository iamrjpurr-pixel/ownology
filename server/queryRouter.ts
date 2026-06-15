/**
 * queryRouter.ts — AI Query Router Agent (Sprint 3)
 *
 * Architecture:
 *   User Question
 *       ↓
 *   QueryRouter (LLM classifier)
 *       ↓ routes to one or more:
 *   ┌─────────────┬──────────────┬──────────────┬─────────────┐
 *   │ SOP         │ Vintage      │ Live Cellar  │ Compliance  │
 *   │ Retriever   │ Retriever    │ Retriever    │ Flag        │
 *   └─────────────┴──────────────┴──────────────┴─────────────┘
 *       ↓
 *   Context Assembler → Reasoning Agent → Final Answer
 *
 * The router uses a fast LLM call to classify intent, then fires
 * the appropriate retrievers. This replaces the static KEYWORD_CATEGORY_MAP
 * with semantic intent classification.
 */

export type QueryIntent =
  | "sop_lookup"        // Needs SOP procedural knowledge
  | "vintage_data"      // Needs regional vintage intelligence
  | "live_cellar"       // Needs the user's own cellar readings
  | "compliance"        // Needs regulatory/compliance knowledge → redirect
  | "general"           // General oenological knowledge, no specific retriever needed
  | "multi";            // Multiple intents detected

export interface RouterDecision {
  intents: QueryIntent[];
  sopCategories: string[];     // Suggested SOP categories to retrieve
  vintageYear?: number;        // Year mentioned, if any
  vintageRegion?: string;      // Region mentioned, if any
  needsLiveCellar: boolean;    // Whether to inject user's recent log entries
  isCompliance: boolean;       // Whether to redirect to Compliance AI
  confidence: "high" | "medium" | "low";
  reasoning: string;           // Brief explanation for logging/debugging
}

// ─── SOP Category taxonomy (mirrors the database) ────────────────────────────
const SOP_CATEGORIES = [
  "Fermentation Management",
  "Yeast & Fermentation",
  "SO₂ Management",
  "Malolactic Fermentation",
  "Racking & Clarification",
  "Additions & Chemistry",
  "Harvest & Receival",
  "Pressing & Free-Run",
  "Bottling & Packaging",
  "Sanitation & Equipment",
  "Fault Diagnosis",
  "Laboratory Testing",
];

// ─── Fast LLM-based classifier ───────────────────────────────────────────────
export async function routeQuery(
  question: string,
  forgeUrl: string,
  forgeKey: string
): Promise<RouterDecision> {
  const classifierPrompt = `You are a winemaking query router. Classify the user's question to determine which knowledge sources to retrieve.

Available SOP categories: ${SOP_CATEGORIES.join(", ")}

Classify the question and respond with JSON only (no markdown):
{
  "intents": ["sop_lookup" | "vintage_data" | "live_cellar" | "compliance" | "general"],
  "sopCategories": ["<category1>", "<category2>"],
  "vintageYear": <number or null>,
  "vintageRegion": "<region name or null>",
  "needsLiveCellar": <true if question references "my tank", "my wine", "my reading", "my ferment", specific gravity readings, or personal cellar data>,
  "isCompliance": <true if question is about licensing, export permits, labelling law, food standards, or regulations>,
  "confidence": "high" | "medium" | "low",
  "reasoning": "<one sentence>"
}

Rules:
- intents can have multiple values if the question spans multiple domains
- sopCategories: pick 1-3 most relevant categories from the list above; empty array if no SOP needed
- vintageYear: extract 4-digit year if mentioned (e.g. 2022, 2023); null otherwise
- vintageRegion: extract Australian wine region if mentioned (e.g. "Barossa Valley", "McLaren Vale"); null otherwise
- needsLiveCellar: true when the user says "my" + a cellar noun, or gives specific readings suggesting they want personalised advice
- isCompliance: true only for regulatory/legal questions — NOT for general winemaking chemistry

User question: "${question.slice(0, 500)}"`;

  try {
    const resp = await fetch(`${forgeUrl}/v1/chat/completions`, {
      method: "POST",
      headers: { "Content-Type": "application/json", Authorization: `Bearer ${forgeKey}` },
      body: JSON.stringify({
        messages: [{ role: "user", content: classifierPrompt }],
        stream: false,
        response_format: { type: "json_object" },
        // Use a fast/cheap model for classification
        max_tokens: 300,
      }),
    });

    if (!resp.ok) throw new Error(`Classifier HTTP ${resp.status}`);
    const data = await resp.json();
    const raw = data.choices?.[0]?.message?.content ?? "{}";
    const parsed = JSON.parse(raw);

    return {
      intents: Array.isArray(parsed.intents) ? parsed.intents : ["sop_lookup"],
      sopCategories: Array.isArray(parsed.sopCategories) ? parsed.sopCategories.slice(0, 3) : [],
      vintageYear: typeof parsed.vintageYear === "number" ? parsed.vintageYear : undefined,
      vintageRegion: typeof parsed.vintageRegion === "string" ? parsed.vintageRegion : undefined,
      needsLiveCellar: Boolean(parsed.needsLiveCellar),
      isCompliance: Boolean(parsed.isCompliance),
      confidence: parsed.confidence ?? "medium",
      reasoning: parsed.reasoning ?? "",
    };
  } catch (err) {
    console.warn("[QueryRouter] Classifier failed, falling back to keyword detection:", err);
    // Graceful fallback — return a generic SOP lookup decision
    return {
      intents: ["sop_lookup"],
      sopCategories: [],
      vintageYear: undefined,
      vintageRegion: undefined,
      needsLiveCellar: false,
      isCompliance: false,
      confidence: "low",
      reasoning: "Classifier failed — using fallback",
    };
  }
}

// ─── Live cellar context builder ─────────────────────────────────────────────
// Injects the user's most recent log entries as "Your Cellar Right Now" context
export function buildLiveCellarContext(
  entries: Array<{
    tankName: string;
    variety: string;
    eventType: string;
    detailsJson: string;
    noteText: string | null;
    entryAt: number | null;
    createdAt: Date;
  }>
): string {
  if (entries.length === 0) return "";

  const lines = entries.map((e) => {
    const ts = e.entryAt
      ? new Date(e.entryAt).toLocaleDateString("en-AU", { day: "numeric", month: "short" })
      : e.createdAt.toLocaleDateString("en-AU", { day: "numeric", month: "short" });
    let detail = "";
    try {
      const d = JSON.parse(e.detailsJson) as Record<string, unknown>;
      detail = Object.entries(d)
        .filter(([, v]) => v !== null && v !== "")
        .map(([k, v]) => `${k}: ${v}`)
        .join(", ");
    } catch {
      detail = e.noteText ?? "";
    }
    return `- [${ts}] ${e.tankName} (${e.variety}) — ${e.eventType}: ${detail}${e.noteText ? ` | Note: ${e.noteText.slice(0, 100)}` : ""}`;
  });

  return `## Your Cellar — Recent Activity\n${lines.join("\n")}`;
}
