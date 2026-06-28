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
const warnedUnknownSources = new Set<string>();
let startedAt = Date.now();

// ─── Daily Budget Guard ─────────────────────────────────────────────────────
// Tracks today's spend separately so we can compare against DAILY_LLM_BUDGET_USD.
// Resets automatically at UTC midnight.
let dailySpendUsd = 0;
let dailyDateKey = ""; // YYYY-MM-DD UTC

// Per-tier spend buckets (free/premium/system) — for tiered budget enforcement.
const TIERS = ["free", "premium", "system"] as const;
export type Tier = (typeof TIERS)[number];
const dailySpendByTier: Record<Tier, number> = { free: 0, premium: 0, system: 0 };

/**
 * Classify an x-ow-source tag into a budget tier.
 *
 *   system   = Internal pipelines that must never be paused — alert
 *              classifiers, embeddings, tag/topic classifiers. Subject only
 *              to the overall DAILY_LLM_BUDGET_USD safety cap.
 *   premium  = Paying-tier features: full tutor, premium Curiosity (Claude),
 *              vintage compare, decision-grounded answers. Pauses when
 *              DAILY_PREMIUM_BUDGET_USD reached.
 *   free     = Free-tier and anonymous calls (freeRun.curiosityAsk on
 *              non-premium accounts, demo flows). Pauses first.
 *
 * Mapping is intentionally readable — extend it by appending rules below.
 * Unknown sources default to "free" (safest cost-wise).
 */
export function classifySource(source: string | null | undefined): Tier {
  const s = (source ?? "").toLowerCase();
  // System: internal classifiers, embeddings, scheduled pipelines.
  if (
    s.startsWith("freerun.tag") ||
    s.startsWith("direct:queryrouter") ||
    s.startsWith("direct:vintagelog") ||
    s.startsWith("direct:trinitypipeline") ||
    s.startsWith("direct:sopembeddings") ||
    s.startsWith("scheduled.")
  ) return "system";
  // Premium: tutor (paying-tier intent) and premium curiosity adapter.
  if (
    s === "tutor.ask" ||
    s.startsWith("tutor.") ||
    s.startsWith("direct:tutor") ||
    s.startsWith("direct:routers.ts") ||
    s.startsWith("freerun.curiosityask.premium") ||
    s.startsWith("merch.")
  ) return "premium";
  // Default = free (covers freeRun.curiosityAsk, demo flows, unknown).
  // Warn ONCE per unrecognised source so a typo doesn't silently drain the
  // free budget — keeps the classifier honest as we add new call sites.
  if (
    s &&
    s !== "unknown" &&
    !s.startsWith("freerun.curiosityask") &&
    !s.startsWith("freerun.curiosity") &&
    !s.startsWith("demo.") &&
    !warnedUnknownSources.has(s)
  ) {
    warnedUnknownSources.add(s);
    console.warn(
      `[llm-meter] unknown source "${source}" — defaulting to "free" tier. Add a rule in classifySource() if this should be system/premium.`
    );
  }
  return "free";
}

function todayKey(): string {
  return new Date().toISOString().slice(0, 10);
}

function rollDailyIfNeeded(): void {
  const k = todayKey();
  if (k !== dailyDateKey) {
    if (dailyDateKey !== "") {
      console.log(
        `[llm-meter] daily spend rolled over: ${dailyDateKey} → ${k} (yesterday: $${dailySpendUsd.toFixed(4)}, free $${dailySpendByTier.free.toFixed(4)}, premium $${dailySpendByTier.premium.toFixed(4)}, system $${dailySpendByTier.system.toFixed(4)})`
      );
    }
    dailyDateKey = k;
    dailySpendUsd = 0;
    dailySpendByTier.free = 0;
    dailySpendByTier.premium = 0;
    dailySpendByTier.system = 0;
  }
}

/** Returns the OVERALL daily budget in USD from env, or null when unconfigured. */
export function getDailyBudgetUsd(): number | null {
  const raw = process.env.DAILY_LLM_BUDGET_USD;
  if (!raw) return null;
  const n = parseFloat(raw);
  if (!Number.isFinite(n) || n <= 0) return null;
  return n;
}

/** Returns the per-tier daily budget in USD from env, or null when unconfigured. */
export function getTierBudgetUsd(tier: Tier): number | null {
  // System tier is intentionally uncapped at the tier level — it's only
  // subject to the overall DAILY_LLM_BUDGET_USD safety cap.
  if (tier === "system") return null;
  const envKey = tier === "free" ? "DAILY_FREE_BUDGET_USD" : "DAILY_PREMIUM_BUDGET_USD";
  const raw = process.env[envKey];
  if (!raw) return null;
  const n = parseFloat(raw);
  if (!Number.isFinite(n) || n <= 0) return null;
  return n;
}

/**
 * Pause decision for a single call. Pauses only if:
 *   - The tier's per-tier budget is configured AND reached, OR
 *   - The overall DAILY_LLM_BUDGET_USD is configured AND reached.
 * System-tier calls only obey the overall cap.
 */
export function isCallPaused(source: string | null | undefined): {
  paused: boolean;
  tier: Tier;
  reason: "tier" | "overall" | null;
} {
  rollDailyIfNeeded();
  const tier = classifySource(source);
  const tierBudget = getTierBudgetUsd(tier);
  if (tierBudget !== null && dailySpendByTier[tier] >= tierBudget) {
    return { paused: true, tier, reason: "tier" };
  }
  const overallBudget = getDailyBudgetUsd();
  if (overallBudget !== null && dailySpendUsd >= overallBudget) {
    return { paused: true, tier, reason: "overall" };
  }
  return { paused: false, tier, reason: null };
}

/** Returns true when today's overall spend has reached/exceeded the configured budget. */
export function isDailyBudgetExceeded(): boolean {
  rollDailyIfNeeded();
  const budget = getDailyBudgetUsd();
  if (budget === null) return false;
  return dailySpendUsd >= budget;
}

/** Manual override — used by admin.resetDailyBudget. */
export function resetDailyBudget(): void {
  rollDailyIfNeeded();
  dailySpendUsd = 0;
  dailySpendByTier.free = 0;
  dailySpendByTier.premium = 0;
  dailySpendByTier.system = 0;
  dailyDateKey = todayKey();
}

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

  // Daily budget tracking — roll the day if needed, then accumulate.
  rollDailyIfNeeded();
  dailySpendUsd += cost;

  // Tiered accumulation (free | premium | system).
  const tier = classifySource(source);
  const tierSpendBefore = dailySpendByTier[tier];
  dailySpendByTier[tier] = tierSpendBefore + cost;
  const tierBudget = getTierBudgetUsd(tier);
  if (tierBudget !== null && dailySpendByTier[tier] >= tierBudget && tierSpendBefore < tierBudget) {
    console.warn(
      `[llm-meter] ⚠ TIER BUDGET REACHED — tier=${tier} spend=$${dailySpendByTier[tier].toFixed(4)} >= $${tierBudget.toFixed(2)}. Further ${tier}-tier calls pause until UTC midnight or admin.resetDailyBudget.`
    );
  }

  const budget = getDailyBudgetUsd();
  if (budget !== null && dailySpendUsd >= budget) {
    // Loud warning once per day-roll when threshold is crossed.
    if (dailySpendUsd - cost < budget) {
      console.warn(
        `[llm-meter] ⚠ OVERALL DAILY BUDGET REACHED — todaySpend=$${dailySpendUsd.toFixed(4)} >= budget=$${budget.toFixed(2)}. ALL further chat-completion calls (including system tier) receive synthetic "AI paused" response until UTC midnight or admin.resetDailyBudget.`
      );
    }
  }

  // Single-line structured log so Railway logs can be greped/aggregated.
  console.log(
    `[llm-meter] model=${model} source=${source} tier=${tier} in=${tokensIn} out=${tokensOut} cost=$${cost.toFixed(6)}`
  );
}

export type LlmStatsRow = {
  key: string;
  calls: number;
  tokensIn: number;
  tokensOut: number;
  costUsd: number;
};

export type TierState = {
  spendUsd: number;
  budgetUsd: number | null;
  exceeded: boolean;
  remainingUsd: number | null;
};

export type LlmStats = {
  startedAt: number;
  uptimeSec: number;
  totals: Bucket;
  byModel: LlmStatsRow[];
  bySource: LlmStatsRow[];
  daily: {
    dateKey: string;
    spendUsd: number;
    budgetUsd: number | null;
    exceeded: boolean;
    remainingUsd: number | null;
    tiers: Record<Tier, TierState>;
  };
};

function buildTierState(tier: Tier): TierState {
  const budgetUsd = getTierBudgetUsd(tier);
  const spendUsd = dailySpendByTier[tier];
  return {
    spendUsd,
    budgetUsd,
    exceeded: budgetUsd !== null && spendUsd >= budgetUsd,
    remainingUsd: budgetUsd !== null ? Math.max(0, budgetUsd - spendUsd) : null,
  };
}

export function getLlmStats(): LlmStats {
  const toRows = (m: Map<string, Bucket>): LlmStatsRow[] =>
    Array.from(m.entries())
      .map(([key, b]) => ({ key, ...b }))
      .sort((a, b) => b.costUsd - a.costUsd);
  rollDailyIfNeeded();
  const budgetUsd = getDailyBudgetUsd();
  return {
    startedAt,
    uptimeSec: Math.round((Date.now() - startedAt) / 1000),
    totals: { ...totals },
    byModel: toRows(byModel),
    bySource: toRows(bySource),
    daily: {
      dateKey: dailyDateKey || todayKey(),
      spendUsd: dailySpendUsd,
      budgetUsd,
      exceeded: budgetUsd !== null && dailySpendUsd >= budgetUsd,
      remainingUsd: budgetUsd !== null ? Math.max(0, budgetUsd - dailySpendUsd) : null,
      tiers: {
        free: buildTierState("free"),
        premium: buildTierState("premium"),
        system: buildTierState("system"),
      },
    },
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
  dailySpendUsd = 0;
  dailySpendByTier.free = 0;
  dailySpendByTier.premium = 0;
  dailySpendByTier.system = 0;
  dailyDateKey = todayKey();
}
