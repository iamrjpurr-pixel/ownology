/** Test with the EXACT endpoint prompt (long, elaborate). */
const key = process.env.PERPLEXITY_API_KEY;
const url = "https://www.nakedwines.com.au/winemakers/leighton-joy";

const REGIONS = ["adelaide-hills","barossa","beechworth","canberra","clare","coonawarra","eden-valley","geographe","gippsland","grampians","granite-belt","great-southern","heathcote","hunter","king-valley","langhorne-creek","margaret-river","mclaren-vale","mornington-peninsula","mudgee","murray-darling","orange","riverina","riverland","rutherglen","swan-valley","tasmania","tumbarumba","yarra-valley","marlborough-nz","central-otago-nz","hawkes-bay-nz","nelson-nz"];

const responseSchema = {
  type: "object",
  properties: {
    firstName: { type: ["string", "null"] },
    lastName: { type: ["string", "null"] },
    estateWinery: { type: ["string", "null"] },
    region: { type: ["string", "null"], enum: [...REGIONS, null] },
    painPoint: { type: ["string", "null"] },
    hookTier: { type: ["string", "null"], enum: ["recent_signal","quoted_voice","peer_signal","vintage_pain", null] },
    hookText: { type: ["string", "null"] },
    hookSourceUrl: { type: ["string", "null"] },
    persona: { type: ["string", "null"], enum: ["winemaker","owner", null] },
  },
  required: ["firstName","lastName","estateWinery","region","painPoint","hookTier","hookText","hookSourceUrl","persona"],
  additionalProperties: false,
};

const systemPrompt = `You are a wine-industry research assistant. You will be given the URL of a Naked Wines "Angel" winemaker profile (nakedwines.com.au/winemakers/<slug>). Your job in 15 seconds:

STEP 1 — Read the Naked Wines profile: Fetch the URL. Extract: firstName + lastName, the winemaker's OWN estate name (NOT "Naked Wines"), their region.

STEP 2 — Independent verification: Verify via at least one non-Naked source (estate website, Instagram/LinkedIn, WBM Online, Halliday, Real Review, Grapegrower).

STEP 3 — Signal / hook extraction: Look for ONE specific dated public signal from the last ~120 days. Categorise into: "recent_signal" (dated event/complaint), "quoted_voice" (direct quote), "peer_signal" (dated event at neighbouring winery), "vintage_pain" (current-vintage regional conditions).
hookText: max 140 chars, lower-case, Australian idiom, sounds like a mate. NO emojis, NO exclamation marks, NO fabrication.
If no dated signal, return hookTier/hookText/hookSourceUrl as null. NULL IS ALWAYS CORRECT OVER FABRICATION.

STEP 4 — painPoint: ONE sentence describing operation re: quality and risk management.

STEP 5 — persona: "winemaker" if hands-on. "owner" if MD/proprietor.

REGION SLUG VOCABULARY (must match one exactly): ${REGIONS.join(", ")}. If region doesn't map, return null.

Return ONLY the requested JSON. No prose. No markdown fences.`;

const resp = await fetch("https://api.perplexity.ai/chat/completions", {
  method: "POST",
  headers: { Authorization: `Bearer ${key}`, "Content-Type": "application/json" },
  body: JSON.stringify({
    model: "sonar-pro",
    max_tokens: 1500,
    messages: [
      { role: "system", content: systemPrompt },
      { role: "user", content: `Naked Wines Angel profile URL: ${url}\n\nRead it, verify independently, extract the structured JSON.` },
    ],
    response_format: { type: "json_schema", json_schema: { schema: responseSchema } },
  }),
});
console.log("HTTP:", resp.status);
const j = await resp.json();
console.log("finish_reason:", j.choices?.[0]?.finish_reason);
console.log("content:", j.choices?.[0]?.message?.content);
