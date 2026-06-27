/**
 * Forge → Emergent LLM proxy shim.
 *
 * The Ownology codebase (inherited from Manus) calls
 * `${BUILT_IN_FORGE_API_URL}/v1/chat/completions` in ~30 places, relying on
 * Forge to pick a default model (gpt-4o-mini). The Emergent LLM proxy is
 * OpenAI-compatible but REQUIRES an explicit `model` field, and the new GPT-5
 * family uses `max_completion_tokens` instead of `max_tokens`.
 *
 * Rather than edit every call site, this shim wraps `globalThis.fetch` once at
 * boot. Any POST to `/llm/v1/chat/completions` on the Emergent host gets:
 *   - a default `model` injected if missing (gpt-5.4-mini — cheap & fast)
 *   - `max_tokens` rewritten to `max_completion_tokens` when needed
 *
 * Per-endpoint upgrades (e.g. claude-sonnet-4-6 for Free Run answers) bypass
 * this shim by calling `server/_core/llm.ts` directly with an explicit model.
 */

const DEFAULT_MODEL = "gpt-5.4-mini";
const PROXY_HOST = "integrations.emergentagent.com";

const isOpenAiNewFamily = (model: string) => /^(gpt-5|o[134])/i.test(model);

const originalFetch = globalThis.fetch.bind(globalThis);

globalThis.fetch = (async (input: RequestInfo | URL, init?: RequestInit) => {
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

      init = { ...init, body: JSON.stringify(body) };
    }
  } catch {
    // best-effort — fall through to original fetch on any parse error
  }

  return originalFetch(input, init);
}) as typeof fetch;

console.log(
  `[forge-shim] active — default model=${DEFAULT_MODEL}, proxy=${PROXY_HOST}`
);
