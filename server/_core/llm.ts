/**
 * Centralised LLM adapter.
 *
 * Routes chat completions and embeddings through the Emergent Universal LLM
 * proxy (`https://integrations.emergentagent.com/llm/...`) using the
 * `EMERGENT_LLM_KEY` from environment. The proxy is OpenAI-compatible for both
 * OpenAI and Anthropic models, so we can swap models per call-site without
 * changing the request shape.
 *
 * Replaces the Manus Forge call sites previously scattered across:
 *   - server/freeRunRouter.ts
 *   - server/queryRouter.ts
 *   - server/sopEmbeddings.ts
 *   - server/trinityPipeline.ts
 *   - server/routers.ts (compliance search)
 */

const PROXY_BASE = "https://integrations.emergentagent.com";
const CHAT_URL = `${PROXY_BASE}/llm/chat/completions`;
const EMBED_URL = `${PROXY_BASE}/llm/openai/v1/embeddings`;

export const MODELS = {
  /** Fast & cheap — Trinity clustering, query routing, semantic ranking,
   *  vintage card summaries. ~$0.15 / $0.60 per M tokens. */
  CHEAP: "gpt-5.4-mini",
  /** Top-tier reasoning + citations — Free Run user answers, Compliance Q&A.
   *  ~$3 / $15 per M tokens. */
  PREMIUM: "claude-sonnet-4-6",
} as const;

export type ChatMessage = {
  role: "system" | "user" | "assistant";
  content: string;
};

export type ChatOpts = {
  model?: string;
  json?: boolean;
  maxTokens?: number;
  temperature?: number;
};

function getKey(): string {
  const key = process.env.EMERGENT_LLM_KEY;
  if (!key) throw new Error("EMERGENT_LLM_KEY not configured");
  return key;
}

/** Is this an OpenAI-style model that uses `max_completion_tokens` (the new
 *  GPT-5 family) instead of the legacy `max_tokens`? */
function isOpenAiNewFamily(model: string): boolean {
  return /^(gpt-5|o[134])/i.test(model);
}

/** Chat completion. Returns the assistant's text content. */
export async function chatCompletion(
  messages: ChatMessage[],
  opts: ChatOpts = {}
): Promise<string> {
  const model = opts.model ?? MODELS.CHEAP;
  const body: Record<string, unknown> = { model, messages, stream: false };
  if (opts.json) body.response_format = { type: "json_object" };
  if (opts.temperature !== undefined) body.temperature = opts.temperature;
  if (opts.maxTokens !== undefined) {
    body[isOpenAiNewFamily(model) ? "max_completion_tokens" : "max_tokens"] =
      opts.maxTokens;
  }

  const resp = await fetch(CHAT_URL, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      Authorization: `Bearer ${getKey()}`,
    },
    body: JSON.stringify(body),
  });

  if (!resp.ok) {
    const errText = await resp.text().catch(() => "");
    throw new Error(`LLM error: ${resp.status} ${errText.slice(0, 300)}`);
  }
  const data = (await resp.json()) as {
    choices?: { message?: { content?: string } }[];
  };
  return data.choices?.[0]?.message?.content ?? "";
}

/** OpenAI text embedding. 1536 dims for text-embedding-3-small. */
export async function embed(
  input: string | string[],
  model = "text-embedding-3-small"
): Promise<number[][]> {
  const resp = await fetch(EMBED_URL, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      Authorization: `Bearer ${getKey()}`,
    },
    body: JSON.stringify({ model, input }),
  });
  if (!resp.ok) {
    const errText = await resp.text().catch(() => "");
    throw new Error(`Embedding error: ${resp.status} ${errText.slice(0, 300)}`);
  }
  const data = (await resp.json()) as {
    data?: { embedding: number[] }[];
  };
  return (data.data ?? []).map((d) => d.embedding);
}
