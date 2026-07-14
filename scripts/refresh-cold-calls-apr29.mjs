/**
 * One-shot refresh for the Apr 29 Intl Sydney Wine Takeover cold calls.
 *
 * For each target contact:
 *   1. Set event = "Intl Sydney Wine Takeover (Apr 29)"
 *   2. If no hookText yet, run Perplexity deepResearch (same call shape
 *      as server/routers/outreach.ts::deepResearch — mirror, not copy,
 *      so this script stays runnable standalone).
 *   3. Clear stale smsDraftOverride so the Claude rewrite is authoritative.
 *   4. Run Claude rewriteSmsAI (same system prompt as outreach.ts's
 *      claudeRewriteOne) and persist to smsDraftOverride.
 *   5. Print the fresh SMS drafts for the operator to eyeball.
 */
import fs from "fs";
import mysql from "mysql2/promise";

const env = fs.readFileSync("/app/.env", "utf8");
function envVal(name) {
  const m = env.match(new RegExp(`^${name}=(.+)$`, "m"));
  return m ? m[1].trim() : null;
}
const DB_URL = envVal("DATABASE_URL");
const PERPLEXITY_KEY = envVal("PERPLEXITY_API_KEY");
const FORGE_URL = envVal("BUILT_IN_FORGE_API_URL");
const FORGE_KEY = envVal("BUILT_IN_FORGE_API_KEY");
const PREVIEW_BASE = envVal("PUBLIC_SITE_URL") || "https://ownology.ai";

const EVENT_LABEL = "Intl Sydney Wine Takeover (Apr 29)";
const TARGETS = [
  { slug: "tim-les-fruits-wine",  businessName: "Les Fruits Wine (Tim Stock)" },
  { slug: "sarah-parley-wines",   businessName: "Parley Wines (Sarah Feehan)" },
];

async function deepResearch(businessName) {
  const contactSchema = {
    type: "object",
    properties: {
      firstName: { type: ["string", "null"] },
      lastName: { type: ["string", "null"] },
      winery: { type: ["string", "null"] },
      role: { type: ["string", "null"] },
      mobileAu: { type: ["string", "null"] },
      email: { type: ["string", "null"] },
      instagram: { type: ["string", "null"] },
      website: { type: ["string", "null"] },
      region: { type: ["string", "null"] },
      painPoint: { type: ["string", "null"] },
      hookTier: {
        type: ["string", "null"],
        enum: ["recent_signal", "quoted_voice", "peer_signal", "vintage_pain", null],
      },
      hookText: { type: ["string", "null"] },
      hookSourceUrl: { type: ["string", "null"] },
      notes: { type: ["string", "null"] },
      confidence: { type: "string", enum: ["high", "medium", "low"] },
    },
    required: ["firstName", "winery", "confidence"],
    additionalProperties: false,
  };

  const controller = new AbortController();
  const to = setTimeout(() => controller.abort(), 60_000);
  let resp;
  try {
    resp = await fetch("https://api.perplexity.ai/chat/completions", {
      method: "POST",
      signal: controller.signal,
      headers: {
        Authorization: `Bearer ${PERPLEXITY_KEY}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        model: "sonar-pro",
        max_tokens: 1500,
        messages: [
          {
            role: "system",
            content:
`You are a wine-industry sales-research assistant. Given a business/person name, deep-search the public web for a specific, human, dated opening hook.

HOOK WATERFALL — search these tiers IN ORDER, return the first that yields a real, cited hook:
  Tier 1 "recent_signal" — one dated event in the last ~90 days (new release, wine-show medal, Halliday/WBM score, cellar-door change, distribution deal, harvest IG post).
  Tier 2 "quoted_voice" — direct quote from the winemaker in a podcast, blog, newsletter, or interview.
  Tier 3 "peer_signal" — dated thing a neighbouring winery in the same region is doing.
  Tier 4 "vintage_pain" — current vintage conditions in their specific region.

hookText rules: lower-case start, no exclamation marks, no emoji, max 140 chars, aim 60–110. Australian idiom OK ("g'day", "reckon"). Never invent numbers, dates, scores, or quotes — null is always correct over hallucination.

hookSourceUrl MUST be a URL from your citations list.

If none of the four tiers can be sourced, set hookTier, hookText, hookSourceUrl all to null.

Return ONLY the requested JSON.`,
          },
          {
            role: "user",
            content: `Business/winery name: ${businessName}\n\nFind a specific, dated opening hook. Return the structured JSON.`,
          },
        ],
        response_format: {
          type: "json_schema",
          json_schema: { schema: contactSchema },
        },
      }),
    });
    clearTimeout(to);
  } catch (err) {
    clearTimeout(to);
    throw new Error(`Perplexity request failed: ${err.message}`);
  }
  if (!resp.ok) {
    const t = await resp.text().catch(() => "");
    throw new Error(`Perplexity ${resp.status}: ${t.slice(0, 300)}`);
  }
  const data = await resp.json();
  const content = data.choices?.[0]?.message?.content ?? "";
  const citations = Array.isArray(data.citations) ? data.citations : [];
  const cleaned = content.replace(/^```json\s*/i, "").replace(/^```\s*/i, "").replace(/```\s*$/i, "").trim();
  let parsed = null;
  try { parsed = JSON.parse(cleaned); } catch { /* leave null */ }
  return { draft: parsed, citations };
}

async function claudeRewrite({ tone = "warm", contact }) {
  const link = `${PREVIEW_BASE}/hi/${contact.slug}`;
  const bits = [];
  if (contact.winery)    bits.push(`Winery: ${contact.winery}`);
  if (contact.region)    bits.push(`Region: ${contact.region}`);
  if (contact.event)     bits.push(`Where we met / context: ${contact.event}`);
  if (contact.painPoint) bits.push(`Business summary (from Perplexity): ${contact.painPoint}`);
  if (contact.hookText)  bits.push(`Recent signal / quote (from Perplexity — DO NOT QUOTE VERBATIM, but you may reference the topic): ${contact.hookText}`);
  if (contact.notes)     bits.push(`Additional notes: ${String(contact.notes).slice(0, 500)}`);
  if (contact.persona)   bits.push(`Their role at the winery: ${contact.persona}`);

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

RULES — absolute:
1. Never directly quote the research verbatim.
2. Never say "family-owned winery balancing hospitality with production" or any scraped-About-page prose.
3. Lower-case start. Australian idiom OK ("g'day", "reckon"). No exclamation marks. No emojis.
4. 200–320 chars total. Include their personal URL at the end: ${link}
5. Sign off with " — Rich".
6. If a signal is absent from the research, DO NOT invent one. Silence beats fabrication.
7. Tone: ${toneGuidance}
8. Structure: acknowledgment → what you built (plainspoken, no jargon) → soft offer (link + "have a squiz" / "worth 90 sec" / "if useful").
9. If "Where we met / context" is provided, gently reference it early — this contact is a warm-ish lead, not a cold stranger.

Return JSON: { "sms": string, "signalsAcknowledged": ["winery"|"winemaker"|"region"] }
Return ONLY the JSON. No prose. No markdown fences.`;

  const userPayload = `Contact: ${contact.firstName}${contact.lastName ? ` ${contact.lastName}` : ""}
Their personal URL: ${link}

Research on file:
${bits.length > 0 ? bits.join("\n") : "(no research on file)"}
`;

  const chatResp = await fetch(`${FORGE_URL}/v1/chat/completions`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      Authorization: `Bearer ${FORGE_KEY}`,
      "x-ow-source": "scripts.refresh-cold-calls-apr29",
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
    const t = await chatResp.text().catch(() => "");
    throw new Error(`Claude rewrite failed: ${chatResp.status} ${t.slice(0, 200)}`);
  }
  const data = await chatResp.json();
  const raw = data.choices?.[0]?.message?.content ?? "{}";
  const cleaned = raw.replace(/^```json\s*/i, "").replace(/^```\s*/i, "").replace(/```\s*$/i, "").trim();
  const parsed = JSON.parse(cleaned);
  if (typeof parsed.sms !== "string" || !parsed.sms.trim()) {
    throw new Error(`Claude returned malformed output: ${JSON.stringify(parsed).slice(0, 200)}`);
  }
  return {
    sms: parsed.sms.trim().slice(0, 500),
    signals: Array.isArray(parsed.signalsAcknowledged) ? parsed.signalsAcknowledged : [],
  };
}

async function main() {
  const conn = await mysql.createConnection(DB_URL);

  for (const t of TARGETS) {
    console.log(`\n────────── ${t.slug} ──────────`);

    // 1. Anchor the event
    const [beforeRows] = await conn.query(
      `SELECT id, slug, first_name AS firstName, last_name AS lastName, winery, region, event,
              pain_point AS painPoint, hook_text AS hookText, hook_tier AS hookTier,
              hook_source_url AS hookSourceUrl, notes, persona, sms_draft_override AS smsDraftOverride
       FROM outreach_contacts WHERE slug=? LIMIT 1`,
      [t.slug],
    );
    if (!beforeRows[0]) {
      console.log(`  ✗ contact not found`);
      continue;
    }
    let c = beforeRows[0];
    console.log(`  before: hookText=${c.hookText ? `"${c.hookText.slice(0, 60)}…"` : "(none)"}, override=${c.smsDraftOverride ? "SET" : "(none)"}, event=${c.event ?? "(none)"}`);

    if (c.event !== EVENT_LABEL) {
      await conn.query(`UPDATE outreach_contacts SET event=? WHERE id=?`, [EVENT_LABEL, c.id]);
      c.event = EVENT_LABEL;
      console.log(`  ✓ event → "${EVENT_LABEL}"`);
    } else {
      console.log(`  · event already anchored`);
    }

    // 2. Perplexity — only if no hook yet
    if (!c.hookText) {
      console.log(`  · running Perplexity deepResearch (this takes 15-30s)…`);
      try {
        const { draft, citations } = await deepResearch(t.businessName);
        if (draft && draft.hookText && draft.hookTier) {
          await conn.query(
            `UPDATE outreach_contacts SET hook_text=?, hook_tier=?, hook_source_url=? WHERE id=?`,
            [draft.hookText, draft.hookTier, draft.hookSourceUrl ?? null, c.id],
          );
          c.hookText = draft.hookText;
          c.hookTier = draft.hookTier;
          c.hookSourceUrl = draft.hookSourceUrl ?? null;
          console.log(`  ✓ hook [${draft.hookTier}]: "${draft.hookText}"`);
          if (draft.hookSourceUrl) console.log(`    source: ${draft.hookSourceUrl}`);
        } else {
          console.log(`  · Perplexity found no citable hook — will fall back to painPoint/event only`);
          if (citations?.length) console.log(`    citations checked: ${citations.length}`);
        }
      } catch (e) {
        console.log(`  ✗ Perplexity failed: ${e.message}`);
      }
    } else {
      console.log(`  · hook already on file — skipping Perplexity`);
    }

    // 3. Clear stale override so the rewrite is authoritative
    if (c.smsDraftOverride) {
      await conn.query(`UPDATE outreach_contacts SET sms_draft_override=NULL WHERE id=?`, [c.id]);
      console.log(`  · cleared stale sms_draft_override`);
    }

    // 4. Claude rewrite
    try {
      const { sms, signals } = await claudeRewrite({ tone: "warm", contact: c });
      await conn.query(`UPDATE outreach_contacts SET sms_draft_override=? WHERE id=?`, [sms, c.id]);
      console.log(`  ✓ claude rewrite (${sms.length} chars, signals=[${signals.join(", ")}])`);
      console.log(`  ───`);
      console.log(`  ${sms}`);
      console.log(`  ───`);
    } catch (e) {
      console.log(`  ✗ Claude failed: ${e.message}`);
    }
  }

  await conn.end();
  console.log(`\nDone.`);
}

main().catch((err) => {
  console.error("FATAL:", err);
  process.exit(1);
});
