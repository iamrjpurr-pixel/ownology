/**
 * outreach-ai-helpers — async LLM-adjacent helpers extracted from
 * outreach.ts (Jul 2026 split, see outreach-helpers.ts for context).
 *
 * These wrap external LLM APIs (Perplexity Sonar, Claude via Emergent
 * Forge) and are the heaviest part of the file at ~340 lines of prompt
 * copy. Moving them out gives the LSP big relief without touching any
 * tRPC procedure.
 */

/**
 * mineInstagramHooks
 * ──────────────────
 * Given up to 3 Instagram handles + the contact's name/winery, ask
 * Perplexity Sonar to read their PUBLIC IG posts from the last ~90 days
 * and extract a specific, dated, pain-point-or-celebration signal we
 * can drop into a first-touch SMS.
 *
 * Why Perplexity instead of a direct IG fetch?
 * ───────────────────────────────────────────
 * Instagram's public-profile pages are login-walled for unauthenticated
 * Node fetches — you get a "please log in" HTML shell. Sonar's crawler
 * has broader access via aggregators, cached indexes and embed-friendly
 * mirrors. It also handles the entity resolution (which of the 3 handles
 * is winery vs. personal) without us having to think.
 *
 * Returned hook obeys the same 4-tier waterfall as deepResearch — Tier 1
 * (recent_signal) preferred, Tier 4 (vintage_pain) as the last resort.
 * When the model can't find anything cite-able across all 3 handles,
 * everything is null. Null is always correct over fabrication (the
 * downstream smsDraft() then falls back to the honest Tier-3 template).
 */
export async function mineInstagramHooks(input: {
  firstName: string | null;
  lastName: string | null;
  winery: string | null;
  region: string | null;
  handles: string[]; // 1-3 IG handles, no @ sign
}): Promise<{
  hookTier: "recent_signal" | "quoted_voice" | "peer_signal" | "vintage_pain" | null;
  hookText: string | null;
  hookSourceUrl: string | null;
  painPoint: string | null; // Sharper pain-point derived from IG posts
  citations: string[];
}> {
  const key = process.env.PERPLEXITY_API_KEY;
  const empty = { hookTier: null, hookText: null, hookSourceUrl: null, painPoint: null, citations: [] };
  if (!key) return empty;
  const cleanHandles = input.handles.map((h) => h.replace(/^@/, "").trim()).filter(Boolean).slice(0, 3);
  if (cleanHandles.length === 0) return empty;

  const contactSchema = {
    type: "object",
    properties: {
      hookTier: {
        type: ["string", "null"],
        enum: ["recent_signal", "quoted_voice", "peer_signal", "vintage_pain", null],
      },
      hookText: { type: ["string", "null"] },
      hookSourceUrl: { type: ["string", "null"] },
      painPoint: { type: ["string", "null"] },
    },
    required: ["hookTier", "hookText", "hookSourceUrl", "painPoint"],
    additionalProperties: false,
  } as const;

  const systemPrompt = `You are a wine-industry research assistant. You will be given 1-3 Instagram handles for a small Australian winery and its founders, plus the founder's name(s). Your job is to READ THEIR RECENT PUBLIC INSTAGRAM POSTS (last ~90 days) and extract ONE specific, dated, verifiable signal that a first-touch SMS opener can hang off.

═══════════════════════════════════════════════════════════════
HANDLE DISCOVERY — do this BEFORE reading anything:
═══════════════════════════════════════════════════════════════

If only the WINERY handle is provided (or the personal handle is missing), independently search Instagram for the founder's PERSONAL account before you start reading. Aim to end up with THREE handles to work from:
  1. The winery / brand account (given)
  2. The primary founder's personal account (search by their name + winery affiliation — e.g. "Bernice Ong Ministry of Clouds Instagram")
  3. A co-founder / partner's personal account if the winery is a duo

Personal accounts are usually where the raw pain-signal lives (weather rants, tank shortage vents, freight cost complaints, MLF frustration). Winery brand accounts skew polished and marketing-heavy — treat them as tertiary.

If you cannot verify a personal handle exists (or you're not confident it's the right person), don't guess. Use only the handles you can cite.

═══════════════════════════════════════════════════════════════
POST READING & SIGNAL EXTRACTION:
═══════════════════════════════════════════════════════════════

Rules:
1. PRIORITISE PAIN-POINT signals over celebration signals. If they've complained about weather, freight, MLF, tank space, staffing, bottle costs, distribution, DBS/APCO paperwork, or vintage variability — THAT is your hook. Celebrations (medals, releases) are secondary.
2. Quote or paraphrase what they ACTUALLY posted — not "family-owned winery balancing hospitality with production" fluff. If you can't cite a specific post, return null.
3. The hookText should sound like a friend who saw the post yesterday. Lower-case, Australian idiom, max 140 chars, no emojis, no exclamation marks.
4. Prefer PERSONAL-account posts over WINERY-brand posts when you have both. Personal voices are more specific.
5. If NONE of the handles yield a concrete, dated, cite-able signal, return all four fields as null. NULL IS ALWAYS CORRECT OVER FABRICATION.

═══════════════════════════════════════════════════════════════
HOOK WATERFALL — search these tiers in order, first-match wins:
═══════════════════════════════════════════════════════════════

Tier 1 — "recent_signal" (best):
  • A dated IG post from the last ~90 days showing a specific event, complaint, celebration, or observation. This is where 80% of good hooks live.
  • Pain examples: "just posted about the January rain messing with acid retention" · "flagged tank shortages during peak crush on Feb 12" · "vented about bottle-freight cost blowing budget"
  • Celebration examples: "just released the 2023 Semillon — dry-farmed, minimal-intervention" · "picked up a Halliday 96 for the Chardonnay last week"
  • hookText MUST paraphrase the specific post — never a generic label.
  • Example hookText: "saw the post about the January rain and MLF dragging — sounds brutal"

Tier 2 — "quoted_voice":
  • A direct quote from a caption or a linked interview (podcast, newsletter) where the winemaker uses their own words about a technique, philosophy, or headache.
  • Example hookText: "read your caption on wild ferment risk — that's the exact question owen answers"

Tier 3 — "peer_signal":
  • A specific dated event at a NEIGHBOURING winery in the same region, referenced or engaged with by the target IG account.
  • Example hookText: "noticed you liked chalk hill's newest chardonnay release — mclaren vale chard is popping right now"

Tier 4 — "vintage_pain":
  • Current-vintage conditions in the target's region (smoke, drought, heatwave, rain).
  • Example hookText: "the mclaren vale rainfall reports for feb look ugly — hope your gsm block held"

═══════════════════════════════════════════════════════════════
painPoint output:
═══════════════════════════════════════════════════════════════
Independently, in ONE sentence, write a specific pain-point summary based on the ACTUAL IG content you found. Not "small natural-wine producer" fluff — something like "vents publicly about tank rotation stress during peak crush" or "small volume, hand-picked, sensitive to weather variability, no digital SOP system evident". This becomes the CRM's structured pain-point tag.

Return ONLY the requested JSON. No prose. No markdown fences.`;

  const contextParts: string[] = [];
  const fullName = [input.firstName, input.lastName].filter(Boolean).join(" ").trim();
  if (fullName) contextParts.push(`Founder name: ${fullName}${input.winery ? ` (${input.winery})` : ""}`);
  else if (input.winery) contextParts.push(`Winery: ${input.winery}`);
  if (input.region) contextParts.push(`Region: ${input.region}`);
  contextParts.push(`Known Instagram handle(s) — start with these: ${cleanHandles.map((h) => "@" + h).join(", ")}`);
  if (fullName) {
    contextParts.push(`Search Instagram for the founder's personal account by name if the given handles are all brand/winery accounts.`);
  }

  const controller = new AbortController();
  const timeoutId = setTimeout(() => controller.abort(), 45_000);
  let resp: Response;
  try {
    resp = await fetch("https://api.perplexity.ai/chat/completions", {
      method: "POST",
      signal: controller.signal,
      headers: {
        Authorization: `Bearer ${key}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        model: "sonar-pro",
        max_tokens: 1200,
        messages: [
          { role: "system", content: systemPrompt },
          { role: "user", content: contextParts.join("\n") + "\n\nRead their recent Instagram posts and return the structured JSON." },
        ],
        response_format: {
          type: "json_schema",
          json_schema: { schema: contactSchema },
        },
      }),
    });
    clearTimeout(timeoutId);
  } catch (err) {
    clearTimeout(timeoutId);
    // Never fail the outer parseFromUrl flow because of an IG-enrichment
    // hiccup. Best-effort: return empty and let the operator save without
    // an auto-generated hook.
    console.error("[mineInstagramHooks] fetch error:", err instanceof Error ? err.message : String(err));
    return empty;
  }

  if (!resp.ok) {
    const errText = await resp.text().catch(() => "");
    console.error(`[mineInstagramHooks] Perplexity ${resp.status}: ${errText.slice(0, 200)}`);
    return empty;
  }

  const data = await resp.json() as {
    choices?: Array<{ message?: { content?: string } }>;
    citations?: string[];
  };
  const content = data.choices?.[0]?.message?.content ?? "";
  const citations = Array.isArray(data.citations) ? data.citations.slice(0, 10) : [];

  try {
    const cleaned = content.replace(/^```json\s*/i, "").replace(/^```\s*/i, "").replace(/```\s*$/i, "").trim();
    const parsed = JSON.parse(cleaned) as {
      hookTier?: string | null;
      hookText?: string | null;
      hookSourceUrl?: string | null;
      painPoint?: string | null;
    };
    const validTiers = ["recent_signal", "quoted_voice", "peer_signal", "vintage_pain"] as const;
    type ValidTier = (typeof validTiers)[number];
    const hookTier = validTiers.includes(parsed.hookTier as ValidTier) ? (parsed.hookTier as ValidTier) : null;
    return {
      hookTier,
      hookText: typeof parsed.hookText === "string" && parsed.hookText.trim() ? parsed.hookText.trim().slice(0, 400) : null,
      hookSourceUrl: typeof parsed.hookSourceUrl === "string" && parsed.hookSourceUrl.trim() ? parsed.hookSourceUrl.trim().slice(0, 500) : null,
      painPoint: typeof parsed.painPoint === "string" && parsed.painPoint.trim() ? parsed.painPoint.trim().slice(0, 400) : null,
      citations,
    };
  } catch (err) {
    console.error("[mineInstagramHooks] JSON parse failed:", err instanceof Error ? err.message : String(err));
    return { ...empty, citations };
  }
}


/**
 * Call Claude via Emergent's Built-in Forge to rewrite an SMS draft that
 * acknowledges research signals (winery / winemaker / region) WITHOUT
 * quoting them verbatim. Shared by `rewriteSmsAI` (single contact) and
 * `bulkRewriteSmsAI` (batch across the outbound queue).
 *
 * Returns the raw SMS string. Throws on any failure (caller decides
 * whether to swallow or propagate).
 */
export async function claudeRewriteOne(args: {
  forgeUrl: string;
  forgeKey: string;
  previewBase: string;
  tone: "warm" | "brief" | "regional";
  contact: {
    slug: string;
    firstName: string;
    lastName: string | null;
    winery: string | null;
    region: string | null;
    event: string | null;
    painPoint: string | null;
    hookText: string | null;
    hookTier: string | null;
    notes: string | null;
    persona: string | null;
  };
}): Promise<{ sms: string; signalsAcknowledged: string[] }> {
  const { forgeUrl, forgeKey, previewBase, tone, contact: c } = args;
  const link = `${previewBase}/hi/${c.slug}`;

  const researchBits: string[] = [];
  if (c.winery) researchBits.push(`Winery: ${c.winery}`);
  if (c.region) researchBits.push(`Region: ${c.region}`);
  if (c.event) researchBits.push(`Where we met / context: ${c.event}`);
  if (c.painPoint) researchBits.push(`Business summary (from Perplexity): ${c.painPoint}`);
  if (c.hookText) researchBits.push(`Recent signal / quote (from Perplexity — DO NOT QUOTE VERBATIM, but you may reference the topic): ${c.hookText}`);
  if (c.notes) researchBits.push(`Additional notes: ${c.notes.slice(0, 500)}`);
  if (c.persona) researchBits.push(`Their role at the winery: ${c.persona}`);

  const toneGuidance = {
    warm:     "Warm, mate-to-mate, Australian idiom. Feels like a text from a friend who happens to make winemaking software.",
    brief:    "Short and sharp. Under 220 chars. One acknowledgment, one offer, one link.",
    regional: "Lead with regional context. Show you understand what's happening in their patch this vintage.",
  }[tone];

  const systemPrompt = `You are Rich, the founder of Ownology (a cellar-intelligence AI for boutique winemakers). You write personal SMS messages to fellow winemakers — the kind of message a mate who did their homework would send. Never sales-y, never templated.

The operator (Rich, running BD) will paste your output straight into their phone. Your job is to spin the research below into an SMS that ACKNOWLEDGES three signals warmly without quoting them verbatim:

  (A) You've read about the winery — its scale, focus, style of business
  (B) You've read about the winemaker as a person — their role, journey, philosophy
  (C) You understand their region and its current challenges — vintage conditions, market pressure, or a peer signal

You do NOT need to hit all three every time — but the SMS must feel like the sender genuinely knows who they're texting, not like they scraped a bio and templated a line.

CANONICAL PITCH LANGUAGE — position Ownology as **business-wide quality and risk management** for winemakers, grounded in the Trinity (quality panels · vintage-log reasoning · asset trail). The commercial anchor is **productivity and profit compounding year on year** instead of restarting each vintage. Quality and risk management should NOT stop at the cellar door — they belong across the whole business. Avoid category framings like "cellar AI", "second brain", "AI apprentice", "compliance tool", "cellar app", "winemaking software" — those invert the value stack (AI is a consequence of the discipline, not the pitch). Do NOT feature AI in the SMS; if unavoidable, put it last and frame it as consequence. Prefer to leave AI unmentioned in the SMS layer — the /hi landing page reveals it.

BANNED VOCABULARY — never use B2B / growth-marketing acronyms in an SMS to a winemaker. Specifically:
  - NEVER write "DTC", "D2C", "B2B", "B2C", "SaaS", "MRR", "CAC", "LTV", "CRM", "ROI", "KPI", "SKU" or any similar acronym.
  - When you mean "direct-to-consumer" or a winery's direct book, use one of these AU-native alternatives instead: "cellar door", "cellar-door orders", "direct sales", "wine club", "orders", or "the shop out front".
  - This applies even if the source research uses the acronym — translate it.

RULES — absolute:
1. Never directly quote the research. If the research says "juggling growing demand with keeping it all feeling family-run", DO NOT write "juggling growing demand" back to them. Instead: acknowledge the tension around scale in a family business ("scaling a family label without losing the feel is a real trick").
2. Never say "family-owned winery balancing hospitality with production" or any variation of scraped-About-page prose.
3. Lower-case start. Australian idiom OK ("g'day", "reckon", "gday" ok). No exclamation marks. No emojis.
4. 200–320 chars total (SMS-length friendly). Include their personal URL at the end: ${link}
5. Sign off with " — Rich P · 0408 105 067" (space, em-dash, space, "Rich P · 0408 105 067").
6. If a signal is absent from the research, DO NOT invent one. Silence is better than fabrication.
7. Tone: ${toneGuidance}
8. Structure the message as: acknowledgment (1 short sentence about them / their patch) → what you built using the canonical pitch language above (1 sentence, plainspoken, no jargon) → soft offer (link + "have a squiz" / "worth 90 sec" / "if useful").

Return JSON with two fields:
  - "sms": the final SMS string (200-320 chars, includes the URL, includes " — Rich P · 0408 105 067" sign-off)
  - "signalsAcknowledged": array of strings from ["winery", "winemaker", "region"] indicating which of the three signals you actually managed to weave in (be honest — don't claim "region" if you didn't mention their region at all)

Return ONLY the JSON. No prose. No markdown fences.`;

  const userPayload = `Contact: ${c.firstName}${c.lastName ? ` ${c.lastName}` : ""}
Their personal URL: ${link}

Research on file:
${researchBits.length > 0 ? researchBits.join("\n") : "(no research on file — write a warm cold-outreach opener without inventing details)"}
`;

  const chatResp = await fetch(`${forgeUrl}/v1/chat/completions`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      Authorization: `Bearer ${forgeKey}`,
      "x-ow-source": "outreach.rewriteSmsAI",
    },
    body: JSON.stringify({
      model: "claude-sonnet-4-5",
      messages: [
        { role: "system", content: systemPrompt },
        { role: "user", content: userPayload },
      ],
      stream: false,
    }),
  });
  if (!chatResp.ok) {
    const errText = await chatResp.text().catch(() => "");
    throw new Error(`Claude rewrite failed: ${chatResp.status} ${errText.slice(0, 200)}`);
  }
  const chatData = await chatResp.json();
  const raw = chatData.choices?.[0]?.message?.content ?? "{}";
  const cleaned = raw.replace(/^```json\s*/i, "").replace(/^```\s*/i, "").replace(/```\s*$/i, "").trim();
  const parsed = JSON.parse(cleaned) as { sms?: string; signalsAcknowledged?: string[] };
  if (typeof parsed.sms !== "string" || !parsed.sms.trim()) {
    throw new Error("Claude returned malformed output");
  }
  const signalsAcknowledged = Array.isArray(parsed.signalsAcknowledged)
    ? parsed.signalsAcknowledged
        .filter((s) => typeof s === "string" && ["winery", "winemaker", "region"].includes(s))
        .slice(0, 3)
    : [];
  return { sms: parsed.sms.trim().slice(0, 500), signalsAcknowledged };
}

/**
 * Classify a pasted reply into one of: interested | objection | not-now | cold.
 * Uses Claude via the Emergent Forge shim. Kept lean — one call, one word.
 * Called inline from `saveReply` so the frontend gets sentiment in the
 * same round-trip. Throws on any failure (caller decides to swallow).
 */
export async function classifyReplySentiment(
  forgeUrl: string,
  forgeKey: string,
  replyText: string
): Promise<"interested" | "objection" | "not-now" | "cold"> {
  const systemPrompt = `Classify this winemaker's reply to a cold-outreach SMS into exactly one category:

- "interested" — they've engaged positively, asked a question, said yes, want to know more, or are open to a call
- "objection" — they raised a concern, disagreed, or pushed back on the pitch (but didn't close the door)
- "not-now" — they said interested but not right now, "circle back later", "busy with vintage", etc.
- "cold" — polite brush-off, "no thanks", "not for us", "please remove me"

Return JSON: { "sentiment": "<one of the four>" }. No prose. No fences.`;

  const chatResp = await fetch(`${forgeUrl}/v1/chat/completions`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      Authorization: `Bearer ${forgeKey}`,
      "x-ow-source": "outreach.classifyReply",
    },
    body: JSON.stringify({
      model: "claude-sonnet-4-5",
      messages: [
        { role: "system", content: systemPrompt },
        { role: "user", content: replyText },
      ],
      stream: false,
    }),
  });
  if (!chatResp.ok) throw new Error(`Claude classify failed: ${chatResp.status}`);
  const chatData = await chatResp.json();
  const raw = chatData.choices?.[0]?.message?.content ?? "{}";
  const cleaned = raw.replace(/^```json\s*/i, "").replace(/^```\s*/i, "").replace(/```\s*$/i, "").trim();
  const parsed = JSON.parse(cleaned) as { sentiment?: string };
  const s = parsed.sentiment;
  if (s === "interested" || s === "objection" || s === "not-now" || s === "cold") return s;
  throw new Error(`Claude returned unrecognised sentiment: ${s}`);
}

/**
 * mineMobileNumber
 * ────────────────
 * Given a contact's name + winery + email, ask Perplexity Sonar to find
 * their PUBLIC Australian mobile number from open-web sources (winery
 * contact page, industry directory listings, event exhibitor lists,
 * LinkedIn public snippets, association member pages).
 *
 * Why this exists
 * ───────────────
 * The outbound queue (Jul 2026) now scores +614xxxxxxxx mobile-holders
 * at 100 pts vs 30 for email-only. But 116 of 208 queue rows are
 * email-only — that top-priority SMS band is starved. Most of those
 * winemakers DO publish a mobile somewhere (contact page footers, event
 * exhibitor CSVs, chamber-of-commerce listings) — it just wasn't captured
 * at ingest time. This helper closes that gap.
 *
 * Confidence gating
 * ─────────────────
 * Perplexity returns one of "high" | "medium" | "low" | null. The caller
 * MUST only persist "high" matches — that means Sonar cited a source that
 * unambiguously ties the mobile to THIS person at THIS winery. Anything
 * else is fabrication risk (auto-hallucinating a mobile is worse than no
 * mobile — an SMS to the wrong person burns the brand).
 *
 * Returns { mobileAu, sourceUrl, confidence, citations }; all fields null
 * when the model can't find a defensible AU mobile.
 */
export async function mineMobileNumber(input: {
  firstName: string | null;
  lastName: string | null;
  winery: string | null;
  region: string | null;
  email: string | null;
}): Promise<{
  mobileAu: string | null;
  sourceUrl: string | null;
  confidence: "high" | "medium" | "low" | null;
  citations: string[];
}> {
  const key = process.env.PERPLEXITY_API_KEY;
  const empty = { mobileAu: null, sourceUrl: null, confidence: null, citations: [] };
  if (!key) return empty;

  const fullName = [input.firstName, input.lastName].filter(Boolean).join(" ").trim();
  if (!fullName && !input.winery) return empty;

  const responseSchema = {
    type: "object",
    properties: {
      mobileAu: { type: ["string", "null"], description: "AU mobile in E.164 format like +61412345678, or null if not confidently found" },
      sourceUrl: { type: ["string", "null"], description: "URL of the page where the mobile was found" },
      confidence: { type: ["string", "null"], enum: ["high", "medium", "low", null] },
    },
    required: ["mobileAu", "sourceUrl", "confidence"],
    additionalProperties: false,
  } as const;

  const systemPrompt = `You are a research assistant hunting for a specific person's PUBLIC Australian mobile phone number so they can be reached for a business conversation (winemaking software outreach). You will be given a person's name, their winery, and their email address. Your job is to search the open web for their mobile number and return it in strict E.164 format.

═══════════════════════════════════════════════════════════════
WHERE TO LOOK — search these in order, first hit wins:
═══════════════════════════════════════════════════════════════

Tier 1 (BEST — the winery publishes it themselves):
  • The winery's own "Contact" or "About Us" page — footer, sidebar, staff-bio blocks
  • A dedicated "Meet the winemaker" or team page on the winery site
  • The winery's LinkedIn Company Page → About → Contact info

Tier 2 (industry sources):
  • Australian Grape & Wine, WFA, or state wine association member directories
  • Regional wine-region body pages (e.g. Hunter Valley Wine, Barossa Grape & Wine Association)
  • Cellar-door directory sites like Wine Selectors, Halliday, Vinehealth
  • Trade-event exhibitor lists (Rootstock, Pinot Palooza, Prowein AU) — often list a mobile for booth contact

Tier 3 (LinkedIn):
  • The person's LinkedIn profile "Contact info" section if publicly cached
  • A LinkedIn post they've made themselves that includes a mobile

Tier 4 (LAST RESORT):
  • Australian Business Register public records for the winery entity
  • Chamber of commerce / regional business directory listings

═══════════════════════════════════════════════════════════════
FORMAT RULES:
═══════════════════════════════════════════════════════════════
1. Return the mobile in strict E.164: "+614" followed by 8 digits. NO spaces, NO dashes, NO parentheses.
   • "0412 345 678"     → "+61412345678"
   • "(04) 1234 5678"   → "+61412345678"
   • "+61 412 345 678"  → "+61412345678"
2. ONLY return AU MOBILE numbers. Format must be +614 + 8 digits.
   • Landlines (+612xxx, +613xxx, +617xxx, +618xxx) — REJECT, return null.
   • Overseas mobiles — REJECT, return null.
   • Freephone numbers (1300, 1800) — REJECT, return null.
3. The number MUST be tied to THIS specific person at THIS specific winery. Not the winery's general contact line, not a receptionist, not the marketing manager. The winemaker / founder / owner named in the input.
4. If you find multiple candidate numbers on different pages, prefer the one on the winery's OWN site over third-party listings.

═══════════════════════════════════════════════════════════════
CONFIDENCE SCORING — be honest:
═══════════════════════════════════════════════════════════════
  "high"    — You cited a page that explicitly shows the mobile next to THIS person's name at THIS winery. E.g. "James Smith, Winemaker — Mobile: 0412 345 678". Only "high" matches will be saved to the database.
  "medium"  — The number is on the winery's own site or LinkedIn, but is not explicitly labelled as belonging to this person (could be a shared cellar-door line, or the winery's main mobile).
  "low"     — You inferred the number from context, or the source is a third-party directory of uncertain freshness.

═══════════════════════════════════════════════════════════════
REFUSAL:
═══════════════════════════════════════════════════════════════
If you cannot find a defensible AU mobile after searching all tiers, return all three fields as null. NULL IS ALWAYS CORRECT OVER FABRICATION. Never invent a plausible-looking number. An SMS to the wrong person burns the brand.

Return ONLY the requested JSON. No prose. No markdown fences.`;

  const contextParts: string[] = [];
  if (fullName) contextParts.push(`Person: ${fullName}`);
  if (input.winery) contextParts.push(`Winery: ${input.winery}`);
  if (input.region) contextParts.push(`Region: ${input.region}`);
  if (input.email) contextParts.push(`Known email: ${input.email}`);

  const controller = new AbortController();
  const timeoutId = setTimeout(() => controller.abort(), 30_000);
  let resp: Response;
  try {
    resp = await fetch("https://api.perplexity.ai/chat/completions", {
      method: "POST",
      signal: controller.signal,
      headers: {
        Authorization: `Bearer ${key}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        model: "sonar-pro",
        max_tokens: 500,
        messages: [
          { role: "system", content: systemPrompt },
          { role: "user", content: contextParts.join("\n") + "\n\nSearch for their public AU mobile and return the structured JSON." },
        ],
        response_format: {
          type: "json_schema",
          json_schema: { schema: responseSchema },
        },
      }),
    });
    clearTimeout(timeoutId);
  } catch (err) {
    clearTimeout(timeoutId);
    console.error("[mineMobileNumber] fetch error:", err instanceof Error ? err.message : String(err));
    return empty;
  }

  if (!resp.ok) {
    const errText = await resp.text().catch(() => "");
    console.error(`[mineMobileNumber] Perplexity ${resp.status}: ${errText.slice(0, 200)}`);
    return empty;
  }

  const data = await resp.json() as {
    choices?: Array<{ message?: { content?: string } }>;
    citations?: string[];
  };
  const content = data.choices?.[0]?.message?.content ?? "";
  const citations = Array.isArray(data.citations) ? data.citations.slice(0, 8) : [];

  try {
    const cleaned = content.replace(/^```json\s*/i, "").replace(/^```\s*/i, "").replace(/```\s*$/i, "").trim();
    const parsed = JSON.parse(cleaned) as {
      mobileAu?: string | null;
      sourceUrl?: string | null;
      confidence?: string | null;
    };

    // Post-validate the mobile format even if Perplexity claims it's valid.
    // Sonar sometimes returns "0412345678" or "+61 4 1234 5678" — normalise.
    let mobile: string | null = null;
    if (typeof parsed.mobileAu === "string" && parsed.mobileAu.trim()) {
      const digits = parsed.mobileAu.replace(/[^\d+]/g, "");
      // Accept "+614XXXXXXXX", "614XXXXXXXX", "04XXXXXXXX", "4XXXXXXXX"
      let normalised: string | null = null;
      if (/^\+614\d{8}$/.test(digits)) normalised = digits;
      else if (/^614\d{8}$/.test(digits)) normalised = "+" + digits;
      else if (/^04\d{8}$/.test(digits)) normalised = "+61" + digits.slice(1);
      else if (/^4\d{8}$/.test(digits)) normalised = "+61" + digits;
      mobile = normalised;
    }

    const validConfidence = ["high", "medium", "low"] as const;
    type ValidC = (typeof validConfidence)[number];
    const confidence = validConfidence.includes(parsed.confidence as ValidC)
      ? (parsed.confidence as ValidC)
      : null;

    return {
      mobileAu: mobile,
      sourceUrl: typeof parsed.sourceUrl === "string" && parsed.sourceUrl.trim() ? parsed.sourceUrl.trim().slice(0, 500) : null,
      confidence,
      citations,
    };
  } catch (err) {
    console.error("[mineMobileNumber] JSON parse failed:", err instanceof Error ? err.message : String(err));
    return { ...empty, citations };
  }
}

