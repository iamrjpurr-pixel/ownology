/**
 * LLM Cost Meter
 *
 * In-memory cost tracker. Single source of truth for "what did we burn?"
 * Used by `chatCompletion` (server/_core/llm.ts) — see VALUE-ENGINEERING.md.
 *
 * Why in-memory rather than a MySQL table:
 * - Single Railway dyno today → process-local counter is fine
 * - Resets on deploy = intentional (we don't need infinite history right now)
 * - Zero LLM cost to operate, zero DB writes, zero ongoing infra burden
 *
 * If/when we scale to multiple dynos or want long-term history, upgrade this
 * to write to a `llm_call_log` table — but only when the dashboard is being
 * looked at in anger. Until then, KISS.
 */

// Pricing as of Jun 2026 (USD per million tokens — input/output).
// Source: Emergent LLM proxy passes through provider pricing; see /app/memory/VALUE-ENGINEERING.md.
const PRICING: Record<string, { input: number; output: number }> = {
  "gpt-5.4-mini": { input: 0.15, output: 0.60 },
  "gpt-5.2-mini": { input: 0.15, output: 0.60 },
  "claude-sonnet-4-6": { input: 3.0, output: 15.0 },
  "claude-haiku-4-5": { input: 1.0, output: 5.0 },
  // Fallback if model unknown — assume mini pricing
  default: { input: 0.15, output: 0.60 },
};

type Bucket = {
  calls: number;
  tokensIn: number;
  tokensOut: number;
  costUsd: number;
};

const totals: Bucket = { calls: 0, tokensIn: 0, tokensOut: 0, costUsd: 0 };
const byModel = new Map<string, Bucket>();
const bySource = new Map<string, Bucket>();
const warnedUnknownModels = new Set<string>();
let startedAt = Date.now();

function bump(b: Bucket, tokensIn: number, tokensOut: number, cost: number) {
  b.calls += 1;
  b.tokensIn += tokensIn;
  b.tokensOut += tokensOut;
  b.costUsd += cost;
}

function emptyBucket(): Bucket {
  return { calls: 0, tokensIn: 0, tokensOut: 0, costUsd: 0 };
}

/**
 * Record one LLM call. Call this from any wrapper that has token counts.
 * Source = caller tag (e.g. "freeRun.curiosityAsk", "tutor.ask"). Used to
 * group spend by feature.
 */
export function recordLlmCall(
  model: string,
  tokensIn: number,
  tokensOut: number,
  source = "unknown"
): void {
  const price = PRICING[model] ?? PRICING.default;
  if (!PRICING[model] && !warnedUnknownModels.has(model)) {
    warnedUnknownModels.add(model);
    console.warn(
      `[llm-meter] unknown model "${model}" — using default pricing (in $${PRICING.default.input}/M, out $${PRICING.default.output}/M). Add to PRICING in llmMeter.ts for accurate cost.`
    );
  }
  const cost = (tokensIn * price.input + tokensOut * price.output) / 1_000_000;

  bump(totals, tokensIn, tokensOut, cost);

  if (!byModel.has(model)) byModel.set(model, emptyBucket());
  bump(byModel.get(model)!, tokensIn, tokensOut, cost);

  if (!bySource.has(source)) bySource.set(source, emptyBucket());
  bump(bySource.get(source)!, tokensIn, tokensOut, cost);

  // Single-line structured log so Railway logs can be greped/aggregated.
  console.log(
    `[llm-meter] model=${model} source=${source} in=${tokensIn} out=${tokensOut} cost=$${cost.toFixed(6)}`
  );
}

export type LlmStatsRow = {
  key: string;
  calls: number;
  tokensIn: number;
  tokensOut: number;
  costUsd: number;
};

export type LlmStats = {
  startedAt: number;
  uptimeSec: number;
  totals: Bucket;
  byModel: LlmStatsRow[];
  bySource: LlmStatsRow[];
};

export function getLlmStats(): LlmStats {
  const toRows = (m: Map<string, Bucket>): LlmStatsRow[] =>
    Array.from(m.entries())
      .map(([key, b]) => ({ key, ...b }))
      .sort((a, b) => b.costUsd - a.costUsd);
  return {
    startedAt,
    uptimeSec: Math.round((Date.now() - startedAt) / 1000),
    totals: { ...totals },
    byModel: toRows(byModel),
    bySource: toRows(bySource),
  };
}

/** Reset (useful for tests + cost-experiments). Owner-only in routers. */
export function resetLlmStats(): void {
  totals.calls = 0;
  totals.tokensIn = 0;
  totals.tokensOut = 0;
  totals.costUsd = 0;
  byModel.clear();
  bySource.clear();
  startedAt = Date.now();
}
