/** Test Perplexity directly against one Naked Wines URL to see raw response. */
const key = process.env.PERPLEXITY_API_KEY;
console.log("Key present:", !!key, "prefix:", key?.slice(0, 8));

const url = "https://www.nakedwines.com.au/winemakers/leighton-joy";

const REGIONS = ["adelaide-hills","barossa","beechworth","canberra","clare","coonawarra","eden-valley","geographe","gippsland","grampians","granite-belt","great-southern","heathcote","hunter","king-valley","langhorne-creek","margaret-river","mclaren-vale","mornington-peninsula","mudgee","murray-darling","orange","riverina","riverland","rutherglen","swan-valley","tasmania","tumbarumba","yarra-valley","marlborough-nz","central-otago-nz","hawkes-bay-nz","nelson-nz"];
const TIERS = ["recent_signal","quoted_voice","peer_signal","vintage_pain"];
const PERSONAS = ["winemaker","owner"];

// Same schema structure the endpoint uses — inline for testing
const schema = {
  type: "object",
  properties: {
    firstName: { type: ["string", "null"] },
    lastName: { type: ["string", "null"] },
    estateWinery: { type: ["string", "null"] },
    region: { type: ["string", "null"], enum: [...REGIONS, null] },
    painPoint: { type: ["string", "null"] },
    hookTier: { type: ["string", "null"], enum: [...TIERS, null] },
    hookText: { type: ["string", "null"] },
    hookSourceUrl: { type: ["string", "null"] },
    persona: { type: ["string", "null"], enum: [...PERSONAS, null] },
  },
  required: ["firstName", "lastName", "estateWinery", "region", "painPoint", "hookTier", "hookText", "hookSourceUrl", "persona"],
  additionalProperties: false,
};

const resp = await fetch("https://api.perplexity.ai/chat/completions", {
  method: "POST",
  headers: { Authorization: `Bearer ${key}`, "Content-Type": "application/json" },
  body: JSON.stringify({
    model: "sonar-pro",
    max_tokens: 1500,
    messages: [
      { role: "system", content: `Return STRICT JSON with keys: firstName, lastName, estateWinery, region, painPoint, hookTier, hookText, hookSourceUrl, persona. Only JSON, no fences.` },
      { role: "user", content: `Read ${url} and extract the winemaker profile.` },
    ],
    response_format: { type: "json_schema", json_schema: { schema } },
  }),
});
console.log("HTTP:", resp.status);
const text = await resp.text();
console.log("Body first 1500 chars:");
console.log(text.slice(0, 1500));
