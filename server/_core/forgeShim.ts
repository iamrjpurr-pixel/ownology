/**
 * Forge → Emergent LLM proxy shim + universal cost meter.
 *
 * The Ownology codebase calls `${BUILT_IN_FORGE_API_URL}/v1/chat/completions`
 * in ~15 places. The Emergent LLM proxy is OpenAI-compatible but REQUIRES an
 * explicit `model` field, and the new GPT-5 family uses `max_completion_tokens`
 * instead of `max_tokens`. Rather than edit every call site, this shim wraps
 * `globalThis.fetch` once at boot and:
 *   - injects a default `model` (gpt-5.4-mini) if missing
 *   - rewrites `max_tokens` → `max_completion_tokens` for GPT-5/o-family
 *   - meters cost via `recordLlmCall()` on every successful response (28 Jun 2026)
 *
 * Source tagging priority:
 *   1. Explicit `x-ow-source` request header (set by `chatCompletion` adapter)
 *   2. Stack-trace walk to first frame inside `/server/...` (filename:line)
 *   3. "unknown"
 *
 * Streaming responses (`stream: true`) are NOT metered — the proxy doesn't
 * emit a final usage block on the SSE wire for every provider. Today no
 * call site uses streaming, so this is theoretical.
 *
 * Per-endpoint upgrades (e.g. claude-sonnet-4-6 for Free Run) bypass the
 * model-injection branch by passing an explicit model.
 */

import { recordLlmCall, isDailyBudgetExceeded, getDailyBudgetUsd } from "./llmMeter.js";

const DEFAULT_MODEL = "gpt-5.4-mini";
const PROXY_HOST = "integrations.emergentagent.com";

const isOpenAiNewFamily = (model: string) => /^(gpt-5|o[134])/i.test(model);

/** Synthetic response returned when the daily LLM budget is exhausted. Shaped
 *  like an OpenAI chat-completion success so every existing caller's
 *  `data.choices[0].message.content` access works unchanged. */
function buildBudgetExceededResponse(model: string): Response {
  const budget = getDailyBudgetUsd();
  const message =
    "AI service temporarily paused — Ownology has reached today's AI budget. " +
    "Please try again after UTC midnight, or contact your administrator. " +
    "(This protects us from a runaway loop or traffic spike eating the monthly bill.)";
  const body = {
    id: "chatcmpl-budget-paused",
    object: "chat.completion",
    created: Math.floor(Date.now() / 1000),
    model,
    choices: [
      {
        index: 0,
        finish_reason: "stop",
        message: { role: "assistant", content: message },
      },
    ],
    usage: { prompt_tokens: 0, completion_tokens: 0, total_tokens: 0 },
    _ownology_budget_paused: true,
    _ownology_budget_usd: budget,
  };
  return new Response(JSON.stringify(body), {
    status: 200,
    headers: { "content-type": "application/json", "x-ow-budget-paused": "1" },
  });
}

/** Walk the current stack to find the first frame inside /server/ that
 *  isn't the shim itself or the centralised llm adapter. Returns a tag like
 *  "tutor.ts:725" so the meter can group spend by call site. */
function deriveSourceFromStack(): string {
  const stack = new Error().stack ?? "";
  const lines = stack.split("\n");
  for (const line of lines) {
    // Skip the shim and the llm adapter — we want the actual caller.
    if (line.includes("/_core/forgeShim.") || line.includes("/_core/llm.")) continue;
    // Match e.g. "at fn (/app/server/routers/tutor.ts:725:24)"
    const m = line.match(/\/server\/([^\s)]+?\.[jt]s):(\d+)/);
    if (m) {
      // Strip leading directories for compactness: "routers/tutor.ts:725" → "tutor.ts:725"
      const file = m[1].split("/").pop();
      return `direct:${file}:${m[2]}`;
    }
  }
  return "direct:unknown";
}

const originalFetch = globalThis.fetch.bind(globalThis);

globalThis.fetch = (async (input: RequestInfo | URL, init?: RequestInit) => {
  let isChatCompletion = false;
  let bodyStreaming = false;
  let sourceFromHeader: string | undefined;

  try {
    const url =
      typeof input === "string"
        ? input
        : input instanceof URL
          ? input.toString()
          : input.url;

    if (
      init?.method === "POST" &&
      url.includes(PROXY_HOST) &&
      url.includes("/chat/completions") &&
      typeof init.body === "string"
    ) {
      isChatCompletion = true;
      const body = JSON.parse(init.body) as Record<string, unknown>;

      if (!body.model) body.model = DEFAULT_MODEL;

      const model = String(body.model);
      if (
        isOpenAiNewFamily(model) &&
        body.max_tokens !== undefined &&
        body.max_completion_tokens === undefined
      ) {
        body.max_completion_tokens = body.max_tokens;
        delete body.max_tokens;
      }

      if (body.stream === true) bodyStreaming = true;

      // Pull source tag from caller-supplied header (set by chatCompletion()).
      const headers = init.headers as Record<string, string> | undefined;
      if (headers) {
        for (const k of Object.keys(headers)) {
          if (k.toLowerCase() === "x-ow-source") {
            sourceFromHeader = headers[k];
            break;
          }
        }
      }

      init = { ...init, body: JSON.stringify(body) };

      // ── Daily budget guard ──────────────────────────────────────────────
      // Short-circuit BEFORE hitting the LLM proxy. Returns a synthetic
      // success response so callers keep working — just with a "paused"
      // message instead of a real answer.
      if (isDailyBudgetExceeded()) {
        const model = String(body.model);
        console.warn(
          `[forge-shim] budget exceeded — returning synthetic paused response (source=${sourceFromHeader ?? "unknown"})`
        );
        return buildBudgetExceededResponse(model);
      }
    }
  } catch {
    // best-effort — fall through to original fetch on any parse error
  }

  const resp = await originalFetch(input, init);

  // Meter on the way back. Cloning the response is cheap and lets us read the
  // JSON body without consuming the stream the caller will read.
  if (isChatCompletion && !bodyStreaming && resp.ok) {
    const source = sourceFromHeader ?? deriveSourceFromStack();
    resp
      .clone()
      .json()
      .then((data: unknown) => {
        try {
          const obj = data as {
            model?: string;
            usage?: { prompt_tokens?: number; completion_tokens?: number };
          };
          const tokensIn = obj.usage?.prompt_tokens ?? 0;
          const tokensOut = obj.usage?.completion_tokens ?? 0;
          const modelOut = obj.model ?? "unknown";
          if (tokensIn || tokensOut) {
            recordLlmCall(modelOut, tokensIn, tokensOut, source);
          }
        } catch {
          /* metering is non-fatal */
        }
      })
      .catch(() => {
        /* metering is non-fatal */
      });
  }

  return resp;
}) as typeof fetch;

console.log(
  `[forge-shim] active — default model=${DEFAULT_MODEL}, proxy=${PROXY_HOST}, meter=enabled`
);
