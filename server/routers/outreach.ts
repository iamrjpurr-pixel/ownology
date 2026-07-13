/**
 * Outreach contacts — personalised SMS landing pages for winemakers met
 * in person at wine events. Each contact gets /hi/:slug. Tracks SMS sent /
 * first opened / demo booked timestamps.
 */
import { z } from "zod";
import { eq, sql, desc, isNull, and } from "drizzle-orm";
import { router, publicProcedure, ownerProcedure } from "../trpc.js";
import { db } from "../db.js";
import * as schema from "../../drizzle/schema.js";

function slugify(...parts: string[]): string {
  return parts
    .filter(Boolean)
    .join(" ")
    .toLowerCase()
    .trim()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "")
    .slice(0, 80) || `c-${Date.now().toString(36)}`;
}

function normaliseMobile(raw: string | undefined | null): string | null {
  if (!raw) return null;
  const digits = raw.replace(/\D/g, "");
  if (!digits) return null;
  if (digits.startsWith("61")) return `+${digits}`;
  if (digits.startsWith("04") && digits.length === 10) return `+61${digits.slice(1)}`;
  if (digits.startsWith("4") && digits.length === 9) return `+61${digits}`;
  return `+${digits}`;
}

/** Pick which sample-vintage-log variant best matches the prospect.
 *  Returns one of: "hunter" | "boutique" | "large" (default fallback). */
type SampleVintageVariant = "hunter" | "boutique" | "large";

// Hunter Valley markers — region names + specific known Hunter wineries.
// (Most of these are 30-80 tank operations — the "Hunter Estate" mockup
// fits them better than the 128-tank "large" view.)
const HUNTER_MARKERS = [
  "hunter", "broke", "pokolbin", "lovedale", "rothbury", "cessnock",
  "brokenwood", "tyrrell", "margan", "mount pleasant", "de iuliis",
  "thomas wines", "audrey wilkinson", "pooles rock", "m+j becker",
  "usher tinkler", "charteris", "majama",
];

// Only TRULY large multi-region producers go here — used to pin them to
// the 128-tank view regardless of region. Empty for now; most Australian
// indie + boutique winemakers see boutique or hunter views.
const LARGE_PRODUCER_MARKERS = [
  "treasury", "accolade", "pernod", "casella", "yalumba", "de bortoli",
];

// Explicit indie/cult labels — single-vineyard, side-projects, no scale.
const BOUTIQUE_NAME_MARKERS = [
  "ur 1st luv", "château acid", "chateau acid", "pride of lunatics",
  "hopeless thoughtful", "jilly", "frankly", "sabi wabi", "balmy nights",
  "tim ward", "toppers mountain", "sassafras",
];

function pickSampleVintageVariant(input: {
  winery: string | null;
  event: string | null;
}): SampleVintageVariant {
  const haystack = `${input.winery ?? ""} ${input.event ?? ""}`.toLowerCase();
  if (!haystack.trim()) return "large";
  // Order matters: region trumps name (a Hunter producer that happens to
  // also be in a "large" or "boutique" list still gets Hunter).
  if (HUNTER_MARKERS.some((m) => haystack.includes(m))) return "hunter";
  if (LARGE_PRODUCER_MARKERS.some((m) => haystack.includes(m))) return "large";
  if (BOUTIQUE_NAME_MARKERS.some((m) => haystack.includes(m))) return "boutique";
  // Fallback heuristic: a short single-name winery (≤ 14 chars after
  // stripping "Wines/Estate/Cellars/Vineyards") tends to be a small indie
  // brand. Bigger established names rarely fit that profile.
  const wineryNorm = (input.winery ?? "").toLowerCase().replace(/\b(wines?|estate|cellars?|vineyards?)\b/g, "").trim();
  if (wineryNorm.length > 0 && wineryNorm.length <= 14) return "boutique";
  return "large";
}

// Markers that strongly suggest a white-wine-focused producer. Used by
// pickCrushVariant() to decide which crush cascade to auto-fire on the
// SMS landing page. Order matters: more specific wins.
const WHITE_FOCUS_MARKERS = [
  "chardonnay", "riesling", "sauvignon", "semillon", "sémillon",
  "viognier", "pinot gris", "pinot grigio", "prosecco", "sparkling",
  "champagne", "blanc", "white wines", "white house",
];

/** Decide which crush cascade theme to auto-fire on /hi/:slug.
 *  Hunter Valley + most boutique reds → red-crush.
 *  Producers with explicit white/sparkling markers → white-crush.
 *  Default → red-crush (matches brand wine-rose). */
function pickCrushVariant(input: {
  winery: string | null;
  event: string | null;
}): "red-crush" | "white-crush" {
  const haystack = `${input.winery ?? ""} ${input.event ?? ""}`.toLowerCase();
  if (WHITE_FOCUS_MARKERS.some((m) => haystack.includes(m))) return "white-crush";
  // Hunter region and explicit boutique-red signals already covered by
  // the default — return red so the wow-moment matches the brand colour.
  return "red-crush";
}

/** CTA A/B test on /hi/:slug. Deterministic per slug — the same prospect
 *  always sees the same variant across visits/devices.
 *    - "book"  → existing big Calendly button (5-step commitment)
 *    - "reply" → one-tap SMS reply that pre-fills "RED — <name>, <winery>"
 *      directly to the operator's inbound number. Lower-friction conversion
 *      event for vintage-busy winemakers who won't pick a calendar slot.
 *  Falls back to "book" if SMS_INBOUND_NUMBER isn't configured. */
function pickCtaVariant(slug: string): "book" | "reply" {
  if (!process.env.SMS_INBOUND_NUMBER?.trim()) return "book";
  // Simple deterministic hash: sum of char codes mod 2.
  let h = 0;
  for (let i = 0; i < slug.length; i++) h = (h + slug.charCodeAt(i)) | 0;
  return h % 2 === 0 ? "book" : "reply";
}

/** Build the `sms:` href that pre-fills the operator's number with the
 *  prospect's identity. iOS and Android both support `sms:+number?body=...`.
 *  Returns null if no inbound number configured. */
function buildSmsReplyHref(input: {
  firstName: string;
  winery: string | null;
}): string | null {
  const num = process.env.SMS_INBOUND_NUMBER?.trim();
  if (!num) return null;
  const keyword = process.env.SMS_REPLY_KEYWORD?.trim() || "RED";
  const body = `${keyword} — Hi, it's ${input.firstName}${input.winery ? ` from ${input.winery}` : ""}. Please lock me in for Ownology onboarding.`;
  // RFC-compliant body encoding (URLSearchParams encodes spaces as +, but
  // sms: URI scheme expects %20). encodeURIComponent works on both platforms.
  return `sms:${num}?&body=${encodeURIComponent(body)}`;
}

/** Build a `wa.me/` href that opens WhatsApp with the same pre-filled reply.
 *  Falls back to SMS_INBOUND_NUMBER if WHATSAPP_INBOUND_NUMBER isn't set
 *  (most operators use the same SIM for both). E.164 without the leading +,
 *  per wa.me's URL requirements. Returns null if no number configured.
 *
 *  Rationale (Feb 2026, Rich): SMS is universal but limited for photos and
 *  docs. WhatsApp deepens the thread once a prospect has engaged. Offering
 *  both = universal door, richer couch. */
function buildWaHref(input: {
  firstName: string;
  winery: string | null;
}): string | null {
  const raw = (process.env.WHATSAPP_INBOUND_NUMBER || process.env.SMS_INBOUND_NUMBER || "").trim();
  if (!raw) return null;
  // wa.me expects E.164 digits only, no leading + or spaces
  const digits = raw.replace(/[^\d]/g, "");
  if (!digits) return null;
  const keyword = process.env.SMS_REPLY_KEYWORD?.trim() || "RED";
  const body = `${keyword} — Hi, it's ${input.firstName}${input.winery ? ` from ${input.winery}` : ""}. Please lock me in for Ownology onboarding.`;
  return `https://wa.me/${digits}?text=${encodeURIComponent(body)}`;
}

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
async function mineInstagramHooks(input: {
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



export const outreachRouter = router({
  /** PUBLIC — fetch a single contact by slug for the /hi/:slug page.
   *  Resolves on the server:
   *    - calendlyUrl: per-contact override → CALENDLY_DEFAULT_URL → null
   *    - sampleVintageLogUrl: variant-tagged URL chosen by event+winery text
   *      (hunter | boutique | large fallback). Frontend just renders. */
  bySlug: publicProcedure
    .input(z.object({ slug: z.string().min(1).max(80) }))
    .query(async ({ input }) => {
      const rows = await db
        .select({
          slug: schema.outreachContacts.slug,
          firstName: schema.outreachContacts.firstName,
          winery: schema.outreachContacts.winery,
          event: schema.outreachContacts.event,
          painPoint: schema.outreachContacts.painPoint,
          hookTier: schema.outreachContacts.hookTier,
          hookText: schema.outreachContacts.hookText,
          hookSourceUrl: schema.outreachContacts.hookSourceUrl,
          notes: schema.outreachContacts.notes,
          calendlyOverride: schema.outreachContacts.calendlyOverride,
          viewCount: schema.outreachContacts.viewCount,
          persona: schema.outreachContacts.persona,
        })
        .from(schema.outreachContacts)
        .where(eq(schema.outreachContacts.slug, input.slug))
        .limit(1);
      const row = rows[0];
      if (!row) return null;
      const defaultCalendly = process.env.CALENDLY_DEFAULT_URL?.trim() || null;
      const calendlyUrl = row.calendlyOverride?.trim() || defaultCalendly || null;
      const variant = pickSampleVintageVariant({ winery: row.winery, event: row.event });
      const sampleVintageLogUrl = `/sample-vintage-log?variant=${variant}&from=sms-${encodeURIComponent(row.slug)}`;
      const crushVariant = pickCrushVariant({ winery: row.winery, event: row.event });
      const ctaVariant = pickCtaVariant(row.slug);
      const smsReplyHref = ctaVariant === "reply"
        ? buildSmsReplyHref({ firstName: row.firstName, winery: row.winery })
        : null;
      // WhatsApp is offered whenever we have a number configured — regardless
      // of ctaVariant. Even the "book" variant benefits from a richer channel
      // for prospects who want to attach photos of their notebook mid-chat.
      const waHref = buildWaHref({ firstName: row.firstName, winery: row.winery });
      return {
        ...row,
        calendlyUrl,
        sampleVintageLogUrl,
        sampleVintageLogVariant: variant,
        crushVariant,
        ctaVariant,
        smsReplyHref,
        waHref,
      };
    }),

  /** PUBLIC — mark a slug as viewed (called once on landing-page mount).
   *  On the FIRST view (firstViewedAt was null), fire an alert email to
   *  the operator via Resend so they can reply while the prospect is
   *  still on the page. Best-effort — email failures never break the
   *  view-tracking. Operator email = OPERATOR_ALERT_EMAIL env var,
   *  falls back to OWNER_EMAIL, silently no-ops if neither set. */
  markViewed: publicProcedure
    .input(z.object({ slug: z.string().min(1).max(80) }))
    .mutation(async ({ input }) => {
      const now = Date.now();
      // Read current state so we know if this is the FIRST view.
      const existing = await db
        .select({
          slug: schema.outreachContacts.slug,
          firstName: schema.outreachContacts.firstName,
          winery: schema.outreachContacts.winery,
          mobileAu: schema.outreachContacts.mobileAu,
          firstViewedAt: schema.outreachContacts.firstViewedAt,
        })
        .from(schema.outreachContacts)
        .where(eq(schema.outreachContacts.slug, input.slug))
        .limit(1);
      const isFirstView = existing.length > 0 && !existing[0].firstViewedAt;
      await db
        .update(schema.outreachContacts)
        .set({
          viewCount: sql`view_count + 1`,
          firstViewedAt: sql`COALESCE(first_viewed_at, ${now})`,
        })
        .where(eq(schema.outreachContacts.slug, input.slug));
      // A4 — real-time alert. Fire-and-forget; NEVER await inside the
      // mutation response path so slow SMTP doesn't slow the page load.
      if (isFirstView && existing.length > 0) {
        const alertTo = process.env.OPERATOR_ALERT_EMAIL || process.env.OWNER_EMAIL;
        const resendKey = process.env.RESEND_API_KEY;
        if (alertTo && resendKey) {
          const c = existing[0];
          const previewBase = process.env.PREVIEW_BASE_URL || process.env.PUBLIC_BASE_URL || "https://ownology.ai";
          const link = `${previewBase}/hi/${c.slug}`;
          // Best-effort fetch to Resend HTTPS API. Wrapped so any error
          // (network, auth, quota) is silently swallowed — this is
          // instrumentation, not a user-facing feature.
          fetch("https://api.resend.com/emails", {
            method: "POST",
            headers: {
              "Authorization": `Bearer ${resendKey}`,
              "Content-Type": "application/json",
            },
            body: JSON.stringify({
              from: process.env.RESEND_FROM || "Ownology Alerts <alerts@ownology.ai>",
              to: [alertTo],
              subject: `📡 ${c.firstName || "Prospect"} just opened their link${c.winery ? ` — ${c.winery}` : ""}`,
              text: `${c.firstName || "A prospect"} from ${c.winery || "an unknown winery"} just opened ${link}.\n\nThey're on the page right now. Reply to their SMS while it's warm.\n\nMobile: ${c.mobileAu || "(no mobile)"}\n\nAdmin: ${previewBase}/admin/contacts`,
            }),
          }).catch(() => { /* silent */ });
        }
      }
      return { ok: true };
    }),

  /** PUBLIC — record that the prospect tapped the primary CTA on /hi/:slug.
   *  Idempotent (`COALESCE`) so multi-clicks don't reset the first-click ts.
   *  Used by /admin/contacts + /admin/funnel to compute conversion per A/B
   *  variant. */
  markCtaClicked: publicProcedure
    .input(z.object({ slug: z.string().min(1).max(80) }))
    .mutation(async ({ input }) => {
      const now = Date.now();
      await db
        .update(schema.outreachContacts)
        .set({ ctaClickedAt: sql`COALESCE(cta_clicked_at, ${now})` })
        .where(eq(schema.outreachContacts.slug, input.slug));
      return { ok: true };
    }),

  /** OWNER — A/B conversion stats by CTA variant. Computed from the
   *  deterministic slug-based assignment (no per-row variant stored). */
  ctaStats: ownerProcedure.query(async () => {
    const rows = await db
      .select({
        slug: schema.outreachContacts.slug,
        status: schema.outreachContacts.status,
        firstViewedAt: schema.outreachContacts.firstViewedAt,
        ctaClickedAt: schema.outreachContacts.ctaClickedAt,
        demoBookedAt: schema.outreachContacts.demoBookedAt,
      })
      .from(schema.outreachContacts);
    type Bucket = { variant: "book" | "reply"; total: number; viewed: number; clicked: number; booked: number };
    const buckets: Record<"book" | "reply", Bucket> = {
      book:  { variant: "book",  total: 0, viewed: 0, clicked: 0, booked: 0 },
      reply: { variant: "reply", total: 0, viewed: 0, clicked: 0, booked: 0 },
    };
    for (const r of rows) {
      if (r.status === "sales" || r.status === "skip") continue; // exclude noise
      const v = pickCtaVariant(r.slug);
      buckets[v].total++;
      if (r.firstViewedAt) buckets[v].viewed++;
      if (r.ctaClickedAt) buckets[v].clicked++;
      if (r.demoBookedAt) buckets[v].booked++;
    }
    const enabled = !!process.env.SMS_INBOUND_NUMBER?.trim();
    return { enabled, buckets: Object.values(buckets) };
  }),

  /** OWNER — list all contacts with their engagement state. */
  list: ownerProcedure.query(async () => {
    const rows = await db
      .select()
      .from(schema.outreachContacts)
      .orderBy(desc(schema.outreachContacts.createdAt));
    return { contacts: rows };
  }),

  /** OWNER — create a new contact. Slug auto-generated unless overridden. */
  create: ownerProcedure
    .input(
      z.object({
        firstName: z.string().min(1).max(80),
        lastName: z.string().max(80).optional(),
        mobileAu: z.string().max(20).optional(),
        winery: z.string().max(120).optional(),
        event: z.string().max(120).optional(),
        painPoint: z.string().max(300).optional(),
        hookTier: z.enum(["recent_signal", "quoted_voice", "peer_signal", "vintage_pain"]).nullable().optional(),
        hookText: z.string().max(400).nullable().optional(),
        hookSourceUrl: z.string().max(500).nullable().optional(),
        calendlyOverride: z.string().max(300).optional(),
        notes: z.string().max(500).optional(),
        slug: z.string().max(80).optional(),
        status: z.enum(["warm", "lukewarm", "cold", "sales", "skip"]).optional(),
        persona: z.enum(["md", "winemaker", "owner", "sales-rep"]).optional(),
      })
    )
    .mutation(async ({ input }) => {
      const slug = (input.slug && slugify(input.slug)) || slugify(input.firstName, input.winery ?? input.lastName ?? "");
      const mobile = normaliseMobile(input.mobileAu);
      try {
        await db.insert(schema.outreachContacts).values({
          slug,
          firstName: input.firstName.trim(),
          lastName: input.lastName?.trim() || null,
          mobileAu: mobile,
          winery: input.winery?.trim() || null,
          event: input.event?.trim() || null,
          painPoint: input.painPoint?.trim() || null,
          hookTier: input.hookTier ?? null,
          hookText: input.hookText?.trim() || null,
          hookSourceUrl: input.hookSourceUrl?.trim() || null,
          calendlyOverride: input.calendlyOverride?.trim() || null,
          notes: input.notes?.trim() || null,
          status: input.status ?? "cold",
          persona: input.persona ?? null,
          viewCount: 0,
          createdAt: Date.now(),
        });
      } catch (err) {
        const msg = err instanceof Error ? err.message : String(err);
        if (msg.includes("Duplicate") || msg.includes("UNIQUE")) {
          throw new Error(`Slug "${slug}" already exists. Pick a different first name + winery, or supply a custom slug.`);
        }
        throw err;
      }
      return { ok: true, slug };
    }),

  // ── OWNER — Voice-quick-add a contact ──────────────────────────────────
  // Speak the contact detail while driving / walking / muddy hands. Same
  // Whisper → structuring LLM pipeline that powers /import voice memos.
  //
  // Example memo: "Add Nathan Purr from Brokenwood Wines, mobile 0400 123
  //   456, met him at the Hunter Valley trade fair last week, he's worried
  //   about a stuck ferment in his 2025 Semillon."
  //
  // Returns a DRAFT contact object the UI shows for review + confirm.
  // Nothing is saved server-side here — the client then calls create()
  // once the user has approved / corrected the fields. Same pattern as
  // vintageLog.parseFromVoice → bulkSave.
  parseFromVoice: ownerProcedure
    .input(z.object({
      audioBase64: z.string().min(1).max(35_000_000),
      mimeType: z.string().default("audio/webm"),
      language: z.string().optional(),
    }))
    .mutation(async ({ input }) => {
      const emergentKey = process.env.EMERGENT_LLM_KEY;
      if (!emergentKey) throw new Error("EMERGENT_LLM_KEY not configured");

      const audioBuffer = Buffer.from(input.audioBase64, "base64");
      if (audioBuffer.length === 0) throw new Error("Empty audio payload");
      if (audioBuffer.length > 25 * 1024 * 1024) {
        throw new Error("Audio exceeds 25MB Whisper limit — please record a shorter memo");
      }

      const ext =
        input.mimeType.includes("webm") ? "webm" :
        input.mimeType.includes("ogg") ? "webm" :
        input.mimeType.includes("mp4") || input.mimeType.includes("m4a") ? "m4a" :
        input.mimeType.includes("mpeg") || input.mimeType.includes("mp3") ? "mp3" :
        input.mimeType.includes("wav") ? "wav" :
        "webm";

      const audioBlob = new Blob([new Uint8Array(audioBuffer)], { type: input.mimeType });
      const fd = new FormData();
      fd.append("file", audioBlob, `contact-memo.${ext}`);
      fd.append("model", "whisper-1");
      fd.append("response_format", "json");
      if (input.language) fd.append("language", input.language);
      // Vocabulary hint — winery names are the #1 thing Whisper mishears.
      // Also seed common Australian wine-industry terms + phone-number
      // pattern words ("oh" → 0, "double oh" → 00) that come up in memos.
      fd.append(
        "prompt",
        "Australian wine industry contact log. Vocabulary: Brokenwood, Tyrrell's, McGuigan, Audrey Wilkinson, Hunter Valley, Barossa, Margaret River, McLaren Vale, Adelaide Hills, Yarra Valley, Coonawarra, Semillon, Shiraz, Chardonnay, Pinot Noir, stuck ferment, MLF, malolactic, LIP audit, Wine Australia, cellar door. Phone digits — 'oh' means 0, 'double oh' means 00."
      );

      const whisperResp = await fetch(
        "https://integrations.emergentagent.com/llm/openai/v1/audio/transcriptions",
        { method: "POST", headers: { Authorization: `Bearer ${emergentKey}` }, body: fd as unknown as BodyInit }
      );
      if (!whisperResp.ok) {
        const errText = await whisperResp.text().catch(() => "");
        throw new Error(`Transcription failed: ${whisperResp.status} ${errText.slice(0, 200)}`);
      }
      const whisperData = (await whisperResp.json()) as { text?: string };
      const transcription = (whisperData.text ?? "").trim();

      if (!transcription) {
        return { draft: null, transcription: "" };
      }

      const forgeUrl = process.env.BUILT_IN_FORGE_API_URL;
      const forgeKey = process.env.BUILT_IN_FORGE_API_KEY;
      if (!forgeUrl || !forgeKey) throw new Error("LLM service not configured");

      const systemPrompt = `You are extracting structured contact-record fields from a wine-industry sales voice memo. The winemaker (Rich) is dictating notes about a person they just met.

Return a single JSON object with these fields:
- firstName: string (required)
- lastName: string | null
- mobileAu: string | null — normalise Australian mobiles to "04XX XXX XXX" format. If Rich says "oh four hundred one twenty three four fifty six" → "0400 123 456"
- winery: string | null — the business/winery name they work for
- event: string | null — where they met (e.g. "Hunter Valley Wine Show 2026")
- painPoint: string | null — the specific problem or interest they mentioned (e.g. "stuck ferment on 2025 Semillon", "compliance PDFs", "budget under $5k")
- notes: string | null — anything else worth remembering (referrals, mutual contacts, follow-up context)
- status: "warm" | "lukewarm" | "cold" | "sales" | "skip" — infer from Rich's tone. "warm" = actively interested, "lukewarm" = curious but not urgent, "cold" = polite courtesy contact, default to "warm" if unclear.

Speech-recognition normalisations:
- Numbers spoken as words → digits ("four hundred" → 400, "twenty-six" → 26)
- Common winery names Whisper mishears: "Broken wood" → "Brokenwood", "Tyrell's" → "Tyrrell's"
- Interpret ambiguous "he/she said" attributions as belonging to the contact, not to Rich

Return ONLY valid JSON. No markdown. If no contact can be identified, return {"firstName": null}. If a field wasn't mentioned, use null (do NOT invent).`;

      const chatResp = await fetch(`${forgeUrl}/v1/chat/completions`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${forgeKey}`,
          "x-ow-source": "outreach.parseFromVoice",
        },
        body: JSON.stringify({
          messages: [
            { role: "system", content: systemPrompt },
            { role: "user", content: transcription },
          ],
          stream: false,
        }),
      });
      if (!chatResp.ok) {
        return { draft: null, transcription };
      }
      const chatData = await chatResp.json();
      const raw = chatData.choices?.[0]?.message?.content ?? "{}";
      try {
        const cleaned = raw.replace(/^```json\s*/i, "").replace(/^```\s*/i, "").replace(/```\s*$/i, "").trim();
        const draft = JSON.parse(cleaned);
        if (!draft || typeof draft !== "object" || !draft.firstName) {
          return { draft: null, transcription };
        }
        return { draft, transcription };
      } catch {
        return { draft: null, transcription };
      }
    }),

  // ── OWNER — Migration bridge: dump all contacts as JSON  (Feb 2026) ──
  // Rich, one-shot dev→prod migration. Returns every real contact
  // (excluding rows explicitly tagged "test") as a JSON payload the
  // operator can save + upload on prod via importContacts below.
  exportAllContacts: ownerProcedure
    .query(async () => {
      const all = await db.select().from(schema.outreachContacts).orderBy(desc(schema.outreachContacts.createdAt));
      return {
        exportedAt: Date.now(),
        count: all.length,
        // Only include the fields prod's import will accept. We drop the
        // primary-key `id` because we upsert-by-slug; and we drop the
        // volatile pipeline timestamps (smsSentAt, firstViewedAt,
        // viewCount, demoBookedAt, repliedAt, ctaClickedAt) because
        // pipeline state should reset on the new environment — you
        // don't want a stale "sent 6 months ago" carrying over.
        contacts: all.map((c) => ({
          slug: c.slug,
          firstName: c.firstName,
          lastName: c.lastName,
          mobileAu: c.mobileAu,
          winery: c.winery,
          event: c.event,
          painPoint: c.painPoint,
          hookTier: c.hookTier,
          hookText: c.hookText,
          hookSourceUrl: c.hookSourceUrl,
          calendlyOverride: c.calendlyOverride,
          notes: c.notes,
          smsDraftOverride: c.smsDraftOverride,
          status: c.status,
          persona: c.persona,
          createdAt: c.createdAt,
        })),
      };
    }),

  // ── OWNER — Migration bridge: import contacts from a JSON payload ─────
  // Upserts by slug. If a contact with the same slug already exists in
  // this environment, it's SKIPPED (never overwritten) so the operator
  // can't accidentally wipe fresher data by re-uploading an older dump.
  importContacts: ownerProcedure
    .input(z.object({
      contacts: z.array(z.object({
        slug: z.string().min(1).max(80),
        firstName: z.string().min(1).max(80),
        lastName: z.string().max(80).nullable().optional(),
        mobileAu: z.string().max(20).nullable().optional(),
        winery: z.string().max(120).nullable().optional(),
        event: z.string().max(120).nullable().optional(),
        painPoint: z.string().max(300).nullable().optional(),
        hookTier: z.string().max(32).nullable().optional(),
        hookText: z.string().max(400).nullable().optional(),
        hookSourceUrl: z.string().max(500).nullable().optional(),
        calendlyOverride: z.string().max(300).nullable().optional(),
        notes: z.string().max(500).nullable().optional(),
        smsDraftOverride: z.string().max(500).nullable().optional(),
        status: z.string().max(16).default("cold"),
        persona: z.string().max(32).nullable().optional(),
        createdAt: z.number().optional(),
      })).max(500),
    }))
    .mutation(async ({ input }) => {
      let inserted = 0;
      let skipped = 0;
      const skippedSlugs: string[] = [];
      for (const c of input.contacts) {
        // Check if a contact with this slug already exists — never overwrite
        const existing = await db.select({ slug: schema.outreachContacts.slug })
          .from(schema.outreachContacts)
          .where(eq(schema.outreachContacts.slug, c.slug))
          .limit(1);
        if (existing.length > 0) {
          skipped++;
          skippedSlugs.push(c.slug);
          continue;
        }
        await db.insert(schema.outreachContacts).values({
          slug: c.slug,
          firstName: c.firstName,
          lastName: c.lastName ?? null,
          mobileAu: c.mobileAu ?? null,
          winery: c.winery ?? null,
          event: c.event ?? null,
          painPoint: c.painPoint ?? null,
          hookTier: c.hookTier ?? null,
          hookText: c.hookText ?? null,
          hookSourceUrl: c.hookSourceUrl ?? null,
          calendlyOverride: c.calendlyOverride ?? null,
          notes: c.notes ?? null,
          smsDraftOverride: c.smsDraftOverride ?? null,
          status: c.status,
          persona: c.persona ?? null,
          viewCount: 0,
          createdAt: c.createdAt ?? Date.now(),
        });
        inserted++;
      }
      return { inserted, skipped, skippedSlugs };
    }),

  // ── OWNER — OCR a business card / email-signature screenshot ─────────
  // Rich, Feb 2026: "paste a screenshot of an email signature or a
  // business card into /admin/contacts and let it OCR + auto-fill the
  // Add contact form". This turns every business card he snaps into a
  // ~20-second fully-drafted lead. Same 2-stage pipeline as the /import
  // Paste tab: vision-LLM OCR (verbatim, marks uncertainty) → text-LLM
  // structured-contact extraction. Returns both the raw OCR and the
  // extracted fields so the UI can show a confidence card + auto-fill
  // the form + let the operator manually fix anything the AI missed.
  ocrContactCard: ownerProcedure
    .input(z.object({
      imageBase64: z.string().min(1),
      mimeType: z.string().default("image/png"),
    }))
    .mutation(async ({ input }) => {
      const forgeUrl = process.env.BUILT_IN_FORGE_API_URL;
      const forgeKey = process.env.BUILT_IN_FORGE_API_KEY;
      if (!forgeUrl || !forgeKey) throw new Error("LLM service not configured");

      // ── Stage 1: verbatim OCR — reads exactly what's visible ─────
      const ocrSystemPrompt = `You are a verbatim OCR engine for business cards and email signatures. Transcribe every visible line, exactly as printed. Preserve line breaks. Do NOT correct. Do NOT paraphrase. If a word is unclear, wrap it in brackets with a question mark: [Broke?nwood]. If nothing is readable, return the word EMPTY.`;

      const ocrResp = await fetch(`${forgeUrl}/v1/chat/completions`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${forgeKey}`,
          "x-ow-source": "outreach.ocrContactCard.ocr",
        },
        body: JSON.stringify({
          messages: [
            { role: "system", content: ocrSystemPrompt },
            {
              role: "user",
              content: [
                { type: "image_url", image_url: { url: `data:${input.mimeType};base64,${input.imageBase64}`, detail: "high" } },
                { type: "text", text: "Transcribe every visible line. Mark uncertainty with brackets." },
              ],
            },
          ],
          stream: false,
        }),
      });
      if (!ocrResp.ok) throw new Error("OCR request failed");
      const ocrData = await ocrResp.json();
      const rawOcrText = (ocrData.choices?.[0]?.message?.content ?? "").trim();
      if (!rawOcrText || rawOcrText === "EMPTY") {
        return {
          rawOcrText: "",
          fields: null,
          totalWords: 0,
          recognisedWords: 0,
          confidencePct: 0,
        };
      }

      // Word-quality score from bracketed uncertainty markers
      const totalWords = (rawOcrText.match(/\b[\w'.-]+\b/g) ?? []).length;
      const uncertainCount = (rawOcrText.match(/\[[^\]]*\?\]/g) ?? []).length;
      const recognisedWords = Math.max(0, totalWords - uncertainCount);
      const confidencePct = totalWords === 0 ? 0 : Math.round((recognisedWords / totalWords) * 100);

      // ── Stage 2: extract structured contact fields ──────────────
      const extractSystemPrompt = `You are extracting a wine-industry contact from the raw OCR of a business card OR email signature.

Return ONE JSON object with these fields (use null if the field isn't visible):
- firstName: string | null
- lastName: string | null
- mobileAu: string | null — normalise Australian mobiles to "04XX XXX XXX" format. If the number starts with +61 4, drop the +61 and prefix with 0. Landlines / international mobiles stay in their original format.
- winery: string | null — business / winery / company name. Prefer the main brand name, not tagline.
- email: string | null — first valid email address
- notes: string | null — assemble a one-line note with: job title (if any), address / state / country (if any), website, instagram, linkedin. Skip null pieces. Example: "Head Winemaker · Barossa Valley, SA · @brokenwood_wines"
- status: "warm" | "lukewarm" | "cold" — default to "lukewarm" since a business card exchange implies mild interest.
- persona: "md" | "winemaker" | "owner" | "sales-rep" — infer from job title. "MD"/"CEO"/"GM"/"Managing Director" → md. "Winemaker"/"Assistant Winemaker"/"Cellar Manager" → winemaker. "Owner"/"Proprietor"/"Founder" → owner. "Sales"/"BDM"/"Rep"/"Ambassador" → sales-rep. Default to "winemaker" if unclear.

Return ONLY valid JSON. No markdown fences. If the OCR text has no recognisable contact info, return {"firstName": null}.`;

      const extractResp = await fetch(`${forgeUrl}/v1/chat/completions`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${forgeKey}`,
          "x-ow-source": "outreach.ocrContactCard.extract",
        },
        body: JSON.stringify({
          messages: [
            { role: "system", content: extractSystemPrompt },
            { role: "user", content: `Raw OCR:\n\n${rawOcrText}` },
          ],
          stream: false,
        }),
      });
      if (!extractResp.ok) {
        return { rawOcrText, fields: null, totalWords, recognisedWords, confidencePct };
      }
      const extractData = await extractResp.json();
      const raw = (extractData.choices?.[0]?.message?.content ?? "{}").trim();
      const stripped = raw.replace(/^```json\s*/i, "").replace(/^```\s*/i, "").replace(/```\s*$/i, "").trim();
      let fields: {
        firstName: string | null;
        lastName: string | null;
        mobileAu: string | null;
        winery: string | null;
        email: string | null;
        notes: string | null;
        status: "warm" | "lukewarm" | "cold";
        persona: "md" | "winemaker" | "owner" | "sales-rep";
      } | null = null;
      try {
        const parsed = JSON.parse(stripped);
        if (parsed && typeof parsed === "object" && (parsed.firstName || parsed.lastName || parsed.email || parsed.mobileAu)) {
          fields = {
            firstName: parsed.firstName ?? null,
            lastName: parsed.lastName ?? null,
            mobileAu: parsed.mobileAu ?? null,
            winery: parsed.winery ?? null,
            email: parsed.email ?? null,
            notes: parsed.notes ?? null,
            status: (["warm","lukewarm","cold"].includes(parsed.status) ? parsed.status : "lukewarm") as "warm" | "lukewarm" | "cold",
            persona: (["md","winemaker","owner","sales-rep"].includes(parsed.persona) ? parsed.persona : "winemaker") as "md" | "winemaker" | "owner" | "sales-rep",
          };
        }
      } catch { /* fields stays null */ }

      return { rawOcrText, fields, totalWords, recognisedWords, confidencePct };
    }),

  // ── OWNER — Extract contact draft from a URL (winery site, LinkedIn, etc.) ─
  parseFromUrl: ownerProcedure
    .input(z.object({
      url: z.string().url("Please paste a full URL starting with https:// or http://"),
    }))
    .mutation(async ({ input }) => {
      const forgeUrl = process.env.BUILT_IN_FORGE_API_URL;
      const forgeKey = process.env.BUILT_IN_FORGE_API_KEY;
      if (!forgeUrl || !forgeKey) throw new Error("LLM service not configured");

      // Validate protocol — refuse file://, javascript:, data:, etc.
      const parsed = new URL(input.url);
      if (parsed.protocol !== "http:" && parsed.protocol !== "https:") {
        throw new Error("URL must use http:// or https://");
      }

      // Fetch with realistic UA + 12s timeout. Some winery sites 403 the
      // default node UA, so we masquerade as a modern browser.
      const controller = new AbortController();
      const timeoutId = setTimeout(() => controller.abort(), 12_000);
      let html: string;
      try {
        const resp = await fetch(input.url, {
          signal: controller.signal,
          redirect: "follow",
          headers: {
            "User-Agent": "Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/126.0 Safari/537.36",
            Accept: "text/html,application/xhtml+xml,application/xml;q=0.9,*/*;q=0.8",
            "Accept-Language": "en-AU,en;q=0.9",
          },
        });
        clearTimeout(timeoutId);
        if (!resp.ok) throw new Error(`Fetch failed: ${resp.status} ${resp.statusText}`);
        const contentType = resp.headers.get("content-type") ?? "";
        if (!contentType.includes("html") && !contentType.includes("text")) {
          throw new Error(`Unsupported content type: ${contentType}`);
        }
        // 2MB cap — plenty for any winery page, refuses bloated PDFs served as text
        const buf = await resp.arrayBuffer();
        if (buf.byteLength > 2 * 1024 * 1024) throw new Error("Page too large (>2MB)");
        html = new TextDecoder("utf-8", { fatal: false }).decode(buf);
      } catch (err) {
        clearTimeout(timeoutId);
        const msg = err instanceof Error ? err.message : String(err);
        if (msg.includes("aborted")) throw new Error("Page took too long to load (>12s). Try a different URL.");
        throw new Error(`Could not load page — ${msg}`);
      }

      // ── Signal extraction ─────────────────────────────────────────────
      // JSON-LD schema.org — the gold-standard. Wineries with proper SEO
      // publish LocalBusiness or Organization blocks with everything we
      // need (name, telephone, email, address, sameAs social links).
      const jsonLdBlocks: unknown[] = [];
      const ldRe = /<script[^>]*type=["']application\/ld\+json["'][^>]*>([\s\S]*?)<\/script>/gi;
      for (const m of html.matchAll(ldRe)) {
        try {
          const parsed = JSON.parse(m[1].trim());
          jsonLdBlocks.push(parsed);
        } catch { /* malformed JSON — skip */ }
      }

      // <title> + <meta description>
      const titleMatch = html.match(/<title[^>]*>([^<]+)<\/title>/i);
      const descMatch = html.match(/<meta\s+name=["']description["']\s+content=["']([^"']+)["']/i)
        ?? html.match(/<meta\s+property=["']og:description["']\s+content=["']([^"']+)["']/i);
      const ogSiteMatch = html.match(/<meta\s+property=["']og:site_name["']\s+content=["']([^"']+)["']/i);

      // Regex sweep for contact primitives — these fire even when JSON-LD is absent
      const telLinks = Array.from(html.matchAll(/href=["']tel:([^"']+)["']/gi)).map((m) => m[1].trim());
      const mailtoLinks = Array.from(html.matchAll(/href=["']mailto:([^"'?]+)/gi)).map((m) => m[1].trim());
      const instagram = Array.from(html.matchAll(/(?:https?:\/\/(?:www\.)?)?instagram\.com\/([A-Za-z0-9_.]+)/gi))
        .map((m) => m[1]).filter((h) => h.length > 1 && !["reel", "p", "explore", "accounts"].includes(h.toLowerCase()));
      const facebook = Array.from(html.matchAll(/(?:https?:\/\/(?:www\.)?)?facebook\.com\/([A-Za-z0-9_.-]+)/gi))
        .map((m) => m[1]).filter((h) => h.length > 2 && !["sharer", "share", "dialog"].includes(h.toLowerCase()));
      const linkedin = Array.from(html.matchAll(/(?:https?:\/\/(?:www\.)?)?linkedin\.com\/(?:in|company)\/([A-Za-z0-9_.-]+)/gi)).map((m) => m[1]);
      // Free-form phone numbers in text (0400 123 456 style; +61 4XX XXX XXX)
      const phoneMatches = Array.from(html.replace(/<[^>]+>/g, " ").matchAll(/(\+?61[\s.-]?4\d{2}[\s.-]?\d{3}[\s.-]?\d{3}|\b04\d{2}[\s.-]?\d{3}[\s.-]?\d{3}|\b0[2378][\s.-]?\d{4}[\s.-]?\d{4})/g)).map((m) => m[1]);
      // Free-form emails in text
      const emailMatches = Array.from(html.replace(/<[^>]+>/g, " ").matchAll(/[a-z0-9._%+-]+@[a-z0-9.-]+\.[a-z]{2,}/gi)).map((m) => m[0]);

      // Main text — strip scripts/styles/nav/footer, then collapse whitespace.
      // Cap at 5000 chars to keep the LLM prompt small.
      const stripped = html
        .replace(/<script[\s\S]*?<\/script>/gi, " ")
        .replace(/<style[\s\S]*?<\/style>/gi, " ")
        .replace(/<nav[\s\S]*?<\/nav>/gi, " ")
        .replace(/<footer[\s\S]*?<\/footer>/gi, " ")
        .replace(/<header[\s\S]*?<\/header>/gi, " ")
        .replace(/<[^>]+>/g, " ")
        .replace(/&[a-z]+;/gi, " ")
        .replace(/\s+/g, " ")
        .trim()
        .slice(0, 5000);

      // Build the extraction payload for the LLM. Dedupe.
      const uniq = <T,>(arr: T[]) => Array.from(new Set(arr));
      const signals = {
        url: input.url,
        pageTitle: titleMatch?.[1]?.trim() ?? null,
        pageDescription: descMatch?.[1]?.trim() ?? null,
        siteName: ogSiteMatch?.[1]?.trim() ?? null,
        jsonLd: jsonLdBlocks.length > 0 ? JSON.stringify(jsonLdBlocks).slice(0, 4000) : null,
        telLinks: uniq(telLinks).slice(0, 5),
        phoneMatchesInText: uniq(phoneMatches).slice(0, 5),
        mailtoLinks: uniq(mailtoLinks).slice(0, 5),
        emailMatchesInText: uniq(emailMatches).slice(0, 5),
        instagram: uniq(instagram).slice(0, 3),
        facebook: uniq(facebook).slice(0, 3),
        linkedin: uniq(linkedin).slice(0, 3),
        mainText: stripped,
      };

      const systemPrompt = `You extract structured wine-industry contact fields from a scraped webpage. The user pastes a URL — a winery website, Google Business listing, LinkedIn page, Instagram profile, or wine-show exhibitor page — and you return the best contact record you can from the extracted signals.

Prefer JSON-LD structured data when present (that's the source of truth). Fall back to regex-matched tel:/mailto: links, then to free-form phone/email in the page text. Use pageTitle/siteName for the winery/business name. Use pageDescription and mainText to infer the person's role or the winery's specialty (which becomes the painPoint hint).

═══════════════════════════════════════════════════════════════
MULTI-PERSON EXTRACTION — CRITICAL:
═══════════════════════════════════════════════════════════════
Many winery pages list TWO OR THREE people (co-founders, husband/wife, winemaker + GM, etc.) with SEPARATE emails or phones. The old rule "pick the winemaker/founder" caused us to drop Julian@ministryofclouds when Bernice was the primary — losing structured data we already had. That's now a bug, not a feature.

Return the PRIMARY person as the top-level fields (firstName / lastName / mobileAu / email / etc.) — pick the winemaker/founder over marketing/admin as before.

Then, if the page clearly lists ADDITIONAL people from the same business who have their OWN email or phone attributed to THEM specifically, return them in the "otherPeople" array (max 4 extras). Only include a person if:
  - They have a specific email OR phone attributed to them (name-adjacent in the text, or in a "Contact team" list, or in JSON-LD Person entries with the same organization).
  - They are a founder / winemaker / GM / owner / co-founder — NOT admin/marketing/PR/media/comms/events staff.
  - They are clearly linked to this business (same winery, same page). Don't include generic contacts (info@, hello@, cellar-door@) as "people".

For "otherPeople[i]" each entry has: firstName, lastName, email, mobileAu, role (short, e.g. "Co-founder & winemaker"). All except firstName are nullable. If no additional people qualify, return "otherPeople": [].

═══════════════════════════════════════════════════════════════
FIELDS:
═══════════════════════════════════════════════════════════════
- firstName: string — the primary contact person, if identifiable. If the page is a company (no named person), use the winery/business name here (we'll flip it in the UI).
- lastName: string | null
- mobileAu: string | null — first Australian mobile you find, normalised to "04XX XXX XXX". If only a landline is available, use that raw.
- email: string | null — first business email you find
- winery: string | null — the winery/company name
- website: string | null — the URL passed in (echo it back so it lands in notes)
- instagram: string | null — Instagram handle WITHOUT the @ (just the username)
- event: string | null — if the URL is a wine-show/exhibitor page, name the event
- painPoint: string | null — a one-sentence summary of what the business focuses on that a wine-tech tool could help with
- notes: string | null — anything else worth remembering (address, hours, size of operation, distinctive detail). Include the source URL as a suffix.
- status: "warm" | "lukewarm" | "cold" — default to "cold"
- confidence: "high" | "medium" | "low"
- otherPeople: array (see above)

Speech-recognition normalisations do NOT apply here — this is scraped HTML. But:
- Strip any trailing punctuation from phone numbers ("0400 123 456." → "0400 123 456")
- Instagram handles: strip @ sign if present, remove trailing "/"
- Return ONLY valid JSON. No markdown fences. If no useful data can be extracted, return {"firstName": null, "confidence": "low", "otherPeople": []}.`;

      const chatResp = await fetch(`${forgeUrl}/v1/chat/completions`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${forgeKey}`,
          "x-ow-source": "outreach.parseFromUrl",
        },
        body: JSON.stringify({
          messages: [
            { role: "system", content: systemPrompt },
            { role: "user", content: JSON.stringify(signals) },
          ],
          stream: false,
        }),
      });
      if (!chatResp.ok) {
        throw new Error(`LLM extraction failed: ${chatResp.status}`);
      }
      const chatData = await chatResp.json();
      const raw = chatData.choices?.[0]?.message?.content ?? "{}";
      let draft: Record<string, unknown> | null = null;
      try {
        const cleaned = raw.replace(/^```json\s*/i, "").replace(/^```\s*/i, "").replace(/```\s*$/i, "").trim();
        const parsed = JSON.parse(cleaned);
        if (parsed && typeof parsed === "object" && parsed.firstName) {
          draft = parsed;
        }
      } catch {
        /* draft stays null */
      }
      if (!draft) return { draft: null, signals, otherPeople: [] };

      // ── Multi-person cross-match ─────────────────────────────────────
      // Rich, Jul 2026: winery About pages routinely list two co-founders
      // (Bernice + Julian, Sarah + Sam, husband/wife duos). The old
      // extractor picked ONE and dropped the other's email — a hard loss
      // when the second person often already exists in the CRM.
      //
      // Now we surface the extras as `otherPeople`, cross-matched against
      // outreach_contacts by (winery match + firstName ILIKE) so the UI
      // can offer a one-click "→ Update Julian's card" merge instead of
      // silently discarding structured data we already had.
      type ExtraPerson = {
        firstName: string;
        lastName: string | null;
        email: string | null;
        mobileAu: string | null;
        role: string | null;
        matchedSlug: string | null; // set when an existing contact matches
      };
      const rawOthers = Array.isArray((draft as { otherPeople?: unknown }).otherPeople)
        ? ((draft as { otherPeople: unknown[] }).otherPeople as Array<Record<string, unknown>>)
        : [];
      const primaryFirst = typeof draft.firstName === "string" ? draft.firstName.toLowerCase().trim() : "";
      const wineryName = typeof draft.winery === "string" ? draft.winery.trim() : null;

      // Fetch candidate existing contacts by winery match (case-insensitive
      // ILIKE approximation via LOWER()) so we only do ONE DB query.
      let existingByWinery: Array<{ slug: string; firstName: string; lastName: string | null }> = [];
      if (wineryName) {
        try {
          const rows = await db
            .select({
              slug: schema.outreachContacts.slug,
              firstName: schema.outreachContacts.firstName,
              lastName: schema.outreachContacts.lastName,
            })
            .from(schema.outreachContacts)
            .where(sql`LOWER(${schema.outreachContacts.winery}) = LOWER(${wineryName})`)
            .limit(20);
          existingByWinery = rows;
        } catch {
          /* best-effort — a match miss is not a failure */
        }
      }

      const otherPeople: ExtraPerson[] = rawOthers
        .filter((p) => typeof p.firstName === "string" && p.firstName.trim().length > 0)
        .filter((p) => (p.firstName as string).toLowerCase().trim() !== primaryFirst) // dedupe against primary
        .slice(0, 4)
        .map((p) => {
          const first = (p.firstName as string).trim();
          const firstLower = first.toLowerCase();
          const lastLower = typeof p.lastName === "string" ? p.lastName.trim().toLowerCase() : "";
          // Match rule: same winery + firstName prefix match (handles
          // "Julian Forwood" ↔ "Julian" and "J. Forwood" ↔ "Julian Forwood")
          const match = existingByWinery.find((row) => {
            const rowFirst = row.firstName.toLowerCase().trim();
            const rowLast = (row.lastName ?? "").toLowerCase().trim();
            return (
              rowFirst === firstLower ||
              rowFirst.startsWith(firstLower.slice(0, 3)) && rowFirst.length >= 3 ||
              (lastLower && rowLast === lastLower)
            );
          });
          return {
            firstName: first,
            lastName: typeof p.lastName === "string" ? p.lastName.trim() : null,
            email: typeof p.email === "string" ? p.email.trim() : null,
            mobileAu: typeof p.mobileAu === "string" ? normaliseMobile(p.mobileAu) : null,
            role: typeof p.role === "string" ? p.role.trim() : null,
            matchedSlug: match?.slug ?? null,
          };
        });

      // ── Instagram enrichment ──────────────────────────────────────────
      // Rich, Jul 2026: the source URL scrape gives us 1-3 IG handles as
      // *pointers* but doesn't actually read the accounts. That leaves
      // the Tier-1 SMS hook empty, and smsDraft() falls back to the
      // generic Tier-3 template — which Rich correctly called "not
      // impressive" against a rich-signal source like ministryofclouds.
      //
      // Fix: after the primary parse succeeds, if we have IG handles,
      // fire a Perplexity Sonar call that specifically reads those
      // accounts' recent posts and extracts a dated pain-point signal.
      // Result gets merged into the draft as hookTier / hookText /
      // hookSourceUrl (feeds smsDraft's Tier-1 template) plus a sharper
      // painPoint. Best-effort — failures never break the outer flow.
      const igHandles = signals.instagram ?? [];
      if (igHandles.length > 0) {
        const firstName = typeof draft.firstName === "string" ? draft.firstName : null;
        const lastName = typeof draft.lastName === "string" ? draft.lastName : null;
        const winery = typeof draft.winery === "string" ? draft.winery : null;
        const region =
          typeof (draft as { region?: unknown }).region === "string"
            ? ((draft as { region?: string }).region ?? null)
            : null;
        const enrich = await mineInstagramHooks({
          firstName,
          lastName,
          winery,
          region,
          handles: igHandles,
        });
        if (enrich.hookTier && enrich.hookText && enrich.hookSourceUrl) {
          draft.hookTier = enrich.hookTier;
          draft.hookText = enrich.hookText;
          draft.hookSourceUrl = enrich.hookSourceUrl;
        }
        // Prefer IG-derived painPoint over the generic one from the URL
        // scrape — IG signal is always sharper. Only overwrite if we got
        // a real string back; never clobber good data with null.
        if (enrich.painPoint) {
          draft.painPoint = enrich.painPoint;
        }
        return { draft, signals, otherPeople, igCitations: enrich.citations };
      }

      return { draft, signals, otherPeople };
    }),

  /** OWNER — Merge additional channels (email, mobile, IG) into an
   *  existing contact card. Powers the "Also found on this page → Update
   *  Julian's card" one-click action in AdminContacts.
   *
   *  Only OVERWRITES a field when the current value is null/empty. Never
   *  clobbers hand-entered data. Additional channels not covered by a
   *  first-class column (personal-IG, LinkedIn, website, role) are
   *  appended to the notes field using the recognised label prefixes so
   *  the existing extractChannels() UI can surface them. */
  mergeFields: ownerProcedure
    .input(
      z.object({
        slug: z.string().min(1).max(80),
        email: z.string().max(200).nullable().optional(),
        mobileAu: z.string().max(20).nullable().optional(),
        instagramPersonal: z.string().max(80).nullable().optional(),
        role: z.string().max(120).nullable().optional(),
        sourceUrl: z.string().max(500).nullable().optional(),
      })
    )
    .mutation(async ({ input }) => {
      const rows = await db
        .select()
        .from(schema.outreachContacts)
        .where(eq(schema.outreachContacts.slug, input.slug))
        .limit(1);
      const existing = rows[0];
      if (!existing) throw new Error(`Contact not found: ${input.slug}`);

      // Only merge non-null incoming values, and only overwrite empty
      // slots on the existing row (don't clobber hand-typed data).
      const update: Record<string, unknown> = {};
      const mobileNorm = input.mobileAu ? normaliseMobile(input.mobileAu) : null;
      if (mobileNorm && !existing.mobileAu) update.mobileAu = mobileNorm;

      // Channel data that lives in the free-form notes field. We APPEND
      // rather than replace so the operator's own notes stay intact. We
      // also dedupe against what's already in the notes (crude substring
      // check — good enough for this workflow).
      const existingNotes = (existing.notes ?? "").trim();
      const appendages: string[] = [];
      const notesLower = existingNotes.toLowerCase();
      if (input.email && !notesLower.includes(input.email.toLowerCase())) {
        appendages.push(`Email: ${input.email}`);
      }
      if (input.instagramPersonal) {
        const igClean = input.instagramPersonal.replace(/^@/, "");
        if (!notesLower.includes(igClean.toLowerCase())) {
          appendages.push(`IG-personal: @${igClean}`);
        }
      }
      if (input.role && !notesLower.includes(input.role.toLowerCase())) {
        appendages.push(`Role: ${input.role}`);
      }
      if (input.sourceUrl && !notesLower.includes(input.sourceUrl.toLowerCase())) {
        appendages.push(`Source: ${input.sourceUrl}`);
      }
      if (appendages.length > 0) {
        update.notes = existingNotes ? `${existingNotes} · ${appendages.join(" · ")}` : appendages.join(" · ");
      }

      if (Object.keys(update).length === 0) {
        return { ok: true, slug: input.slug, patched: [] as string[], skipped: "no new data to merge" };
      }
      await db
        .update(schema.outreachContacts)
        .set(update)
        .where(eq(schema.outreachContacts.slug, input.slug));
      return { ok: true, slug: input.slug, patched: Object.keys(update) };
    }),


  // ── OWNER — Deep research from just a business name ────────────────────

  /** OWNER — Turn a podcast / YouTube / video transcript into structured
   *  enrichment for an existing contact card.
   *
   *  Rich, Jul 2026 — added after the Stephen Pannell SC Pannell interview
   *  transcript (McLaren Vale ganache manifesto) proved that first-hand
   *  long-form voice content is the strongest sales asset we have: it's
   *  cite-able, un-fake-able, and yields 4 uses at once — hook lines for
   *  SMS/email, refined painPoint for the CRM, pull-quotes for the Cellar
   *  Journal blog, and a summary paragraph in the operator's voice.
   *
   *  Returns candidates only — never auto-merges. Rich reviews then picks
   *  what to save. That review discipline is what stops fabrication /
   *  paraphrase drift creeping into outreach copy over time. */
  transcriptEnrich: ownerProcedure
    .input(z.object({
      transcriptText: z.string().min(200).max(60_000),
      sourceUrl: z.string().url().max(500).optional(),
      contactFirstName: z.string().max(80).optional(),
      contactWinery: z.string().max(120).optional(),
    }))
    .mutation(async ({ input }) => {
      const forgeUrl = process.env.BUILT_IN_FORGE_API_URL;
      const forgeKey = process.env.BUILT_IN_FORGE_API_KEY;
      if (!forgeUrl || !forgeKey) throw new Error("LLM service not configured");

      const systemPrompt = `You transform a first-person interview or podcast transcript into four structured artefacts for a wine-industry CRM + blog pipeline. The subject is an Australian winemaker; the transcript is their own words, lightly cleaned up from an auto-caption.

Return a single JSON object with these fields:

1. "summary" — one 120-160 word paragraph, third-person, that captures WHO this person is, WHERE they work, their signature philosophy, and the 2-3 most distinctive things they said. Written to slot into a CRM notes field — informative not laudatory. No "revolutionary" / "visionary" / "renowned" fluff.

2. "hookCandidates" — array of 3-5 SMS/email opener lines in Rich's voice. Each is a Tier-2 "quoted_voice" hook: reflects THEIR own language back at them so an SMS reads like a friend who watched the video. Rules per line:
   - Lower-case start, no exclamation, no emoji.
   - 60-140 chars.
   - Australian idiom OK ("g'day", "reckon").
   - Must quote or paraphrase something SPECIFIC they said (grape variety, place, technique, philosophy) — no generic "loved your interview" openers.
   - Example: "read what you said about wine having to taste like it comes from somewhere — that's the exact question owen answers"

3. "painPointRefined" — one sentence, sharper than the generic CRM default. What in their own words is the STRUCTURAL tension in their operation? (e.g. "manually orchestrating 6 varieties + 3 vineyards + 85% self-sufficiency across McLaren Vale and Adelaide Hills — no digital SOP layer evident from the interview"). Grounded in the transcript, not inferred fluff.

4. "blogQuotes" — array of 3-5 pull-quotes suitable for a long-form Cellar Journal blog post. Each 15-50 words. Verbatim (or minimally cleaned) from the transcript. Choose quotes that stand alone as a philosophical or technical point.

5. "philosophyTags" — short kebab-case tags (max 8) that describe their approach: e.g. "sense-of-place", "medium-body-tannic", "no-acid-addition", "vineyard-as-forest", "grenache-focus", "ocean-influenced". These become search facets on the CRM.

Rules:
- NEVER fabricate. If the transcript doesn't say something, don't include it. Null the field over inventing.
- Quotes MUST appear in the transcript (near-verbatim OK to fix ASR errors). Don't paraphrase into invented phrasing.
- Return ONLY the requested JSON. No markdown fences. No prose commentary.`;

      const userPayload: string[] = [];
      if (input.contactFirstName || input.contactWinery) {
        const parts = [input.contactFirstName, input.contactWinery ? `(${input.contactWinery})` : null].filter(Boolean);
        userPayload.push(`Subject: ${parts.join(" ")}`);
      }
      if (input.sourceUrl) userPayload.push(`Source: ${input.sourceUrl}`);
      userPayload.push("");
      userPayload.push("--- TRANSCRIPT ---");
      userPayload.push(input.transcriptText);
      userPayload.push("--- END TRANSCRIPT ---");

      const chatResp = await fetch(`${forgeUrl}/v1/chat/completions`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${forgeKey}`,
          "x-ow-source": "outreach.transcriptEnrich",
        },
        body: JSON.stringify({
          messages: [
            { role: "system", content: systemPrompt },
            { role: "user", content: userPayload.join("\n") },
          ],
          stream: false,
        }),
      });
      if (!chatResp.ok) {
        const errText = await chatResp.text().catch(() => "");
        throw new Error(`LLM enrichment failed: ${chatResp.status} ${errText.slice(0, 200)}`);
      }
      const chatData = await chatResp.json();
      const raw = chatData.choices?.[0]?.message?.content ?? "{}";
      try {
        const cleaned = raw.replace(/^```json\s*/i, "").replace(/^```\s*/i, "").replace(/```\s*$/i, "").trim();
        const parsed = JSON.parse(cleaned) as {
          summary?: string;
          hookCandidates?: string[];
          painPointRefined?: string;
          blogQuotes?: string[];
          philosophyTags?: string[];
        };
        return {
          summary: typeof parsed.summary === "string" ? parsed.summary.slice(0, 2000) : null,
          hookCandidates: Array.isArray(parsed.hookCandidates)
            ? parsed.hookCandidates.filter((h) => typeof h === "string").slice(0, 5).map((h) => h.slice(0, 400))
            : [],
          painPointRefined: typeof parsed.painPointRefined === "string" ? parsed.painPointRefined.slice(0, 400) : null,
          blogQuotes: Array.isArray(parsed.blogQuotes)
            ? parsed.blogQuotes.filter((q) => typeof q === "string").slice(0, 5).map((q) => q.slice(0, 800))
            : [],
          philosophyTags: Array.isArray(parsed.philosophyTags)
            ? parsed.philosophyTags.filter((t) => typeof t === "string").slice(0, 8)
            : [],
          sourceUrl: input.sourceUrl ?? null,
        };
      } catch (err) {
        throw new Error(`Enrichment returned malformed JSON: ${err instanceof Error ? err.message : String(err)}`);
      }
    }),

  // Paste a winery name → Perplexity Sonar-Pro multi-hop web-searches for
  // the winemaker, phone, email, IG, website, address → returns structured
  // JSON with citations. Same review-then-Save UX as parseFromUrl.
  //
  // Cost: ~$0.005-$0.015 per lookup (search fee + tokens). $5 credit gets
  // ~500-1000 lookups depending on how many sources Sonar pulls per query.
  // Timeout: 60s (deep research takes 15-30s of real time).
  //
  // Citations are on the response's TOP-LEVEL `citations` array — must use
  // raw fetch (not openai SDK — the SDK strips citations).
  deepResearch: ownerProcedure
    .input(z.object({
      businessName: z.string().min(2).max(200),
    }))
    .mutation(async ({ input }) => {
      const key = process.env.PERPLEXITY_API_KEY;
      if (!key) throw new Error("PERPLEXITY_API_KEY not configured");

      // Structured-output schema. Fields align to our outreachContacts
      // table + the extra channels (email, instagram) we already stash
      // into notes on the parseFromUrl flow.
      const contactSchema = {
        type: "object",
        properties: {
          firstName: { type: ["string", "null"] },
          lastName: { type: ["string", "null"] },
          winery: { type: ["string", "null"] },
          role: { type: ["string", "null"] }, // e.g. "Winemaker & Founder"
          mobileAu: { type: ["string", "null"] },
          email: { type: ["string", "null"] },
          instagram: { type: ["string", "null"] },
          instagramPersonal: { type: ["string", "null"] },
          facebook: { type: ["string", "null"] },
          linkedin: { type: ["string", "null"] },
          website: { type: ["string", "null"] },
          region: { type: ["string", "null"] },
          address: { type: ["string", "null"] },
          painPoint: { type: ["string", "null"] },
          // Hook-waterfall fields (Feb 2026). Perplexity searches four
          // tiers in order — recent_signal → quoted_voice → peer_signal
          // → vintage_pain — and returns whichever tier it can source
          // with a real citation. hookTier is null only when all four
          // tiers fail; hookText and hookSourceUrl must both be present
          // when hookTier is not null.
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
      const timeoutId = setTimeout(() => controller.abort(), 60_000);
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
            max_tokens: 1500,
            messages: [
              {
                role: "system",
                content: `You are a wine-industry sales-research assistant. Given a business or person name, deep-search the public web for CURRENT contact details AND a specific, human, dated opening hook. Prioritise official winery websites, verified LinkedIn profiles, Instagram bios, and reputable trade publications (Halliday, WBM, Real Review, Winetitles, Young Gun of Wine, Vinous, Wine Australia, The Real Review, Drinks Trade). Also check winery newsletter archives, podcast transcripts, and public blog comments where accessible. Ignore stale info — if two sources disagree, prefer the more recent one.

For "role", identify the primary point-of-contact — winemaker, founder, GM, or cellar-door manager — in that priority order. Skip marketing / admin staff.

For "mobileAu" — normalise to "04XX XXX XXX". If only a landline is public, use "(0X) XXXX XXXX". If only an international mobile, keep original format.

For "instagram" — return the primary handle WITHOUT the @ (e.g. "lesfruitswine"). This should be the WINERY / BUSINESS account (the public brand handle).

For "instagramPersonal" — if the winemaker / founder has a SEPARATE personal Instagram AND it's publicly cross-linked with the winery account (either the winery bio mentions the person's handle, or the person's bio mentions the winery, or trade press links the two), return that personal handle without the @. If they've deliberately kept them separate, return null — that separation is a signal to respect.

For "painPoint" — write ONE sentence describing what a cellar-intelligence AI tool could help this producer with, inferred from their scale / focus / recent public commentary. This is a fallback business summary; the sharper opener lives in hookText below. Examples: "Small natural-wine producer, minimal digital record-keeping"; "Established mid-sized producer scaling into cellar-door tourism"; "Cool-climate boutique estate with vintage variability challenges".

═══════════════════════════════════════════════════════════════
HOOK WATERFALL — this is the most important part of the response.
═══════════════════════════════════════════════════════════════

The operator uses hookText as the OPENING LINE of a personal SMS. Generic "family-owned winery balancing hospitality with production"-style summaries FAIL. The hook must sound like a friend who read something specific about them yesterday — not like an AI that skimmed an About page.

Search these FOUR tiers IN ORDER. Return the FIRST tier that yields a concrete, verifiable, dated hook with a real source URL. Skip any tier that would force you to fabricate.

Tier 1 — "recent_signal" (best): ONE dated event from the last ~90 days.
  • A new vintage release, a wine-show medal, a Halliday / WBM / Real Review score, a cellar-door renovation, a new winemaker joining, a distribution deal, a mention in trade press, or a distinctive Instagram post about harvest / bottling / pruning.
  • Must have a specific date, score, or dated URL (e.g. an IG post from Feb 2026, a review published this month, an event they exhibited at last week).
  • Example hookText: "just saw the 2023 Semillon picked up 96 from Halliday — well done"
  • Example hookText: "noticed you just opened the new tasting room in Broke — how's the traffic tracking"

Tier 2 — "quoted_voice": a direct quote from the winemaker in a podcast transcript, blog post, newsletter, or long-form interview.
  • The hook echoes their OWN LANGUAGE back to them. Not paraphrased — quoted.
  • Podcasts to check: Young Gun of Wine, The Wine Show podcast, Grape Minds, Vinous Table, WineBusiness.com.au. Also winery-run newsletters (Mailchimp archives), Substack, and personal blogs.
  • Example hookText: "you mentioned on the Young Gun pod that MLF timing is your annual headache — that's actually why i built this"
  • Example hookText: "in your Feb newsletter you wrote about the acid retention pressure this year — same story i'm hearing across the Hunter"

Tier 3 — "peer_signal": a specific, dated thing a NEIGHBOURING or PEER winery in the same region is doing (award, tech adoption, distribution change, exit, new hire).
  • The hook opens a lateral conversation about a regional shift.
  • Example hookText: "saw Tyrrell's just released their oldest-ever library Semillon — feels like the Hunter's finally getting the credit it deserves"
  • Example hookText: "noticed Audrey Wilkinson switched to a lighter bottle last month — are you seeing the same freight pressure"

Tier 4 — "vintage_pain": the current vintage conditions in their specific region (smoke, drought, heatwave, botrytis pressure, frost, rainfall anomalies).
  • Reference the CURRENT vintage window — check Wine Australia vintage reports, Bureau of Meteorology summaries, regional-body updates (Hunter Valley Wine & Tourism Association, WBGA, etc.).
  • Example hookText: "brutal January rain in the Hunter this year — how are the Semillons holding acid"
  • Example hookText: "the smoke reports out of the Adelaide Hills are grim — hope your fruit escaped it"

═══════════════════════════════════════════════════════════════
HOOK OUTPUT FORMAT — three linked fields, all-or-nothing:
═══════════════════════════════════════════════════════════════
- hookTier: "recent_signal" | "quoted_voice" | "peer_signal" | "vintage_pain" | null
- hookText: the polished one-liner. Rules:
    * Lower-case start (yes, no capital)
    * No exclamation marks. No emoji.
    * Max 140 chars. Aim for 60–110.
    * Australian idiom OK ("g'day" not "hi", "reckon" not "believe")
    * Never invent numbers, dates, scores, or quotes — if you can't cite it, drop that tier and try the next one
- hookSourceUrl: direct URL to the article / IG post / podcast episode / newsletter that grounds the hook. MUST be a URL that appears in your citations list. If you can't cite it, return null for all three hook fields.

If NONE of the four tiers can be sourced with a real citation, set hookTier, hookText, and hookSourceUrl all to null. Do not fill hookText with a generic "family-owned winery" summary — that's what painPoint is for. Null is always correct over fabrication.

For "confidence":
- "high" = named person + at least 2 direct channels (phone/email/verified IG) found
- "medium" = winery + 1 channel found, no named person OR named person + only 1 channel
- "low" = only the winery name confirmed, no direct contact channels

Return ONLY the requested JSON — no prose, no explanation. Use null for any field you cannot verify. Do NOT invent URLs, phone numbers, emails, quotes, dates, or scores — null is always correct over hallucination.`,
              },
              {
                role: "user",
                content: `Business/winery name: ${input.businessName}\n\nFind the primary contact. Return the structured JSON.`,
              },
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
        const msg = err instanceof Error ? err.message : String(err);
        if (msg.includes("aborted")) {
          throw new Error("Perplexity took too long (>60s). Try again or paste a direct URL instead.");
        }
        throw new Error(`Perplexity request failed: ${msg}`);
      }

      if (!resp.ok) {
        const errText = await resp.text().catch(() => "");
        // Common cases: 401 (bad key), 402 (out of credit), 429 (rate limited)
        if (resp.status === 401) throw new Error("Perplexity key invalid — check PERPLEXITY_API_KEY.");
        if (resp.status === 402) throw new Error("Perplexity credit exhausted — top up at console.perplexity.ai.");
        if (resp.status === 429) throw new Error("Perplexity rate-limited — wait a minute and retry.");
        throw new Error(`Perplexity ${resp.status}: ${errText.slice(0, 200)}`);
      }

      const data = await resp.json() as {
        choices?: Array<{ message?: { content?: string } }>;
        citations?: string[];
        usage?: { total_tokens?: number };
      };

      const content = data.choices?.[0]?.message?.content ?? "";
      const citations = Array.isArray(data.citations) ? data.citations.slice(0, 10) : [];

      let draft: Record<string, unknown> | null = null;
      try {
        const cleaned = content.replace(/^```json\s*/i, "").replace(/^```\s*/i, "").replace(/```\s*$/i, "").trim();
        const parsed = JSON.parse(cleaned);
        if (parsed && typeof parsed === "object") draft = parsed;
      } catch {
        // Fall through — return null draft with citations so UI can show sources
      }

      // ── Email-pattern guesses ──────────────────────────────────────────
      // Perplexity rarely surfaces personal emails (they're hidden behind
      // contact forms). But if we have firstName + a website domain, we can
      // generate standard business-email patterns that hit 80%+ of the time
      // for small operations. Marked as guesses so the UI shows them as
      // "try one of these" rather than as verified data.
      const emailGuesses: string[] = [];
      if (draft && typeof draft.website === "string" && typeof draft.firstName === "string") {
        // Extract bare domain from website (strip protocol, path, www)
        const rawSite = draft.website.trim().toLowerCase();
        const domainMatch = rawSite.match(/^(?:https?:\/\/)?(?:www\.)?([a-z0-9-]+(?:\.[a-z0-9-]+)+)/);
        const domain = domainMatch?.[1];
        const first = draft.firstName.trim().toLowerCase().replace(/[^a-z]/g, "");
        const last = typeof draft.lastName === "string" ? draft.lastName.trim().toLowerCase().replace(/[^a-z]/g, "") : "";
        if (domain && first) {
          // Ranked by hit rate for small AU business inboxes
          const patterns = new Set<string>();
          patterns.add(`${first}@${domain}`);
          if (last) {
            patterns.add(`${first}.${last}@${domain}`);
            patterns.add(`${first[0]}${last}@${domain}`);
            patterns.add(`${last}@${domain}`);
          }
          patterns.add(`hello@${domain}`);
          patterns.add(`info@${domain}`);
          patterns.add(`contact@${domain}`);
          patterns.add(`wine@${domain}`);
          emailGuesses.push(...patterns);
        }
      }

      // Auto-suggest role-based persona from Perplexity's role + notes.
      // The operator sees this pre-populated in the create form and can
      // override before saving. Import at the top of the file below the
      // other imports.
      let suggestedPersona: "md" | "winemaker" | "owner" | "sales-rep" = "winemaker";
      if (draft) {
        const role = String(draft.role ?? "").toLowerCase();
        const notes = String(draft.notes ?? "").toLowerCase();
        const blob = `${role} ${notes}`;
        if (/\b(managing director|general manager|\bmd\b|\bgm\b|\bceo\b)\b/.test(blob)) suggestedPersona = "md";
        else if (/\b(owner|founder|proprietor|principal|generation|family[- ]owned|patriarch)\b/.test(blob)) suggestedPersona = "owner";
        else if (/\b(sales rep|sales representative|brand ambassador|distributor|cellar door manager|events|trade)\b/.test(blob)) suggestedPersona = "sales-rep";
      }

      return {
        draft,
        citations,
        emailGuesses: emailGuesses.slice(0, 8),
        tokensUsed: data.usage?.total_tokens ?? null,
        suggestedPersona,
      };
    }),

  // ── OWNER — Audio-hook: IG reel / TikTok / podcast → SMS opener ────────
  // Rich, Feb 2026: Perplexity can't hear audio (Sonar is text-only) and
  // IG is login-walled — so social video is dark to the AI. This closes
  // the loop: paste an audio file the operator captured manually →
  // Whisper transcribes → Claude proposes 3 Tier-2 "quoted_voice" hooks
  // in Rich's SMS voice → operator picks + saves to a contact.
  //
  // The result is a hookText grounded in something the prospect ACTUALLY
  // said (with the IG/YouTube URL as hookSourceUrl for verify). Impossible
  // for a generic outreach tool to fake — that's the whole edge.
  audioHookPropose: ownerProcedure
    .input(z.object({
      audioBase64: z.string().min(1).max(35_000_000),
      mimeType: z.string().default("audio/webm"),
      // Optional context Rich types in — winemaker name, winery, and a
      // one-line note about who they're pitching. Sharpens Claude's hook.
      context: z.string().max(500).optional(),
      language: z.string().optional(),
    }))
    .mutation(async ({ input }) => {
      const emergentKey = process.env.EMERGENT_LLM_KEY;
      if (!emergentKey) throw new Error("EMERGENT_LLM_KEY not configured");

      const audioBuffer = Buffer.from(input.audioBase64, "base64");
      if (audioBuffer.length === 0) throw new Error("Empty audio payload");
      if (audioBuffer.length > 25 * 1024 * 1024) {
        throw new Error("Audio exceeds 25MB Whisper limit — trim the clip");
      }

      const ext =
        input.mimeType.includes("webm") ? "webm" :
        input.mimeType.includes("ogg") ? "webm" :
        input.mimeType.includes("mp4") || input.mimeType.includes("m4a") ? "m4a" :
        input.mimeType.includes("mpeg") || input.mimeType.includes("mp3") ? "mp3" :
        input.mimeType.includes("wav") ? "wav" :
        "webm";

      // Whisper transcription — same endpoint as parseFromVoice.
      const audioBlob = new Blob([new Uint8Array(audioBuffer)], { type: input.mimeType });
      const fd = new FormData();
      fd.append("file", audioBlob, `hook-audio.${ext}`);
      fd.append("model", "whisper-1");
      fd.append("response_format", "json");
      if (input.language) fd.append("language", input.language);
      fd.append(
        "prompt",
        // Vocabulary-hint biases Whisper toward the correct spellings/terms.
        // Whisper struggles most with variety-vs-region ambiguity: e.g. hears
        // "Grenache" as "Coonawarra" (both plausible-sounding words). We list
        // varieties FIRST so the model prefers them when context is ambiguous.
        [
          "Australian wine industry tasting reel or vineyard walk.",
          "Grape varieties (bias toward these when word could be a region): Grenache, Nebbiolo, Sangiovese, Pecorino, Fiano, Vermentino, Semillon, Shiraz, Syrah, Chardonnay, Riesling, Cabernet Sauvignon, Sauvignon Blanc, Pinot Noir, Pinot Gris, Gamay, Nero d'Avola, Aglianico, Montepulciano, Tempranillo, Mataro, Mourvedre, Grüner Veltliner.",
          "Regions (only use these if the speaker names a place, not a grape): McLaren Vale, Barossa, Adelaide Hills, Basket Range, Forest Range, Clare Valley, Coonawarra, Hunter Valley, Margaret River, Yarra Valley, Heathcote, Beechworth, Mornington, King Valley, Tasmania, Canberra, Orange, Mudgee, Le Marche, Offida.",
          "Wineries + vineyards commonly named: Landsdowne, Corroboree, Top Range, Commune of Buttons, Parley Wine, Primo Estate, Tyrrell's, Audrey Wilkinson.",
          "Winemaking terms: MLF, malolactic, stainless steel, hand-picked, wild ferment, ambient yeast, skin contact, whole bunch, whole cluster, lees, oak, texture, phenolics, acid, brix, pH, TA, botrytis, canopy, veraison.",
        ].join(" ")
      );

      const whisperResp = await fetch(
        "https://integrations.emergentagent.com/llm/openai/v1/audio/transcriptions",
        { method: "POST", headers: { Authorization: `Bearer ${emergentKey}` }, body: fd as unknown as BodyInit }
      );
      if (!whisperResp.ok) {
        const errText = await whisperResp.text().catch(() => "");
        throw new Error(`Transcription failed: ${whisperResp.status} ${errText.slice(0, 200)}`);
      }
      const whisperData = (await whisperResp.json()) as { text?: string };
      const transcription = (whisperData.text ?? "").trim();
      if (!transcription) return { transcription: "", candidates: [] as { angle: string; text: string }[], transcriptWarnings: [] as string[] };

      // Hand transcript to Claude → 3 hook candidates in Rich's voice.
      const forgeUrl = process.env.BUILT_IN_FORGE_API_URL;
      const forgeKey = process.env.BUILT_IN_FORGE_API_KEY;
      if (!forgeUrl || !forgeKey) throw new Error("LLM service not configured");

      const systemPrompt = `You are helping Rich craft a warm, human SMS opener to a fellow Australian winemaker. Rich has just listened to an audio clip (an IG reel, a podcast, a tasting note video) featuring the prospect or their winery. Your job: propose THREE candidate opening lines Rich could paste into an SMS.

Voice rules — non-negotiable:
- Lower-case start (yes, no capital first letter). No exclamation marks. No emoji.
- Max 140 characters per candidate. Aim for 70–120.
- Australian idiom OK ("g'day", "reckon", "proper", "punt"). Avoid American phrasing ("stoked", "amazing", "check out").
- Never fabricate. Only echo details that appear in the transcript. If a fact isn't in the transcript, don't invent it.
- The hook should sound like a peer winemaker who genuinely listened — not a fan, not a marketer.
- If Rich's context provides the prospect's first name, USE IT after "g'day". If not, leave it out — never guess.

════════════════════════════════════════════════════════════
TRANSCRIPT SANITY CHECK — do this BEFORE drafting hooks:
════════════════════════════════════════════════════════════

Whisper is not perfect. It will sometimes mishear grape varieties as region names (or vice versa) because they sound alike. Common mishearings we've caught:
- "Grenache" → transcribed as "Coonawarra"
- "Nebbiolo" → transcribed as "Napoleon" or "Nebulon"
- "Semillon" → transcribed as "Salmon" or "Sea-Millan"
- "Fiano" → transcribed as "Piano" or "Viano"
- Vineyard names (e.g. "Landsdowne", "Corroboree") sometimes mis-spelled

Before drafting, do a plausibility scan of the transcript. Ask yourself:
1. Does any word that LOOKS like a region actually make no sense as a region in context? (e.g. "taking Coonawarra from Lansdowne vineyard" — Coonawarra is 400km from Lansdowne; the speaker almost certainly said a GRAPE VARIETY there, not a region.)
2. Does a grape "region" appear where a variety would fit? Same logic in reverse.
3. Any wine name that's grammatically wrong given the surrounding sentence?

If you spot a likely mishearing, DO NOT paper over it by using the wrong term in a hook. Instead, either:
(a) rewrite the hook to reference only the parts of the transcript you're confident are correct, OR
(b) if the mishearing is central to the audio's content, return an empty candidates array and let Rich sanity-check the transcript manually.

Fabricating a "correction" is worse than admitting uncertainty. It's better to return 1 or 2 hooks with high confidence than 3 with one that contains a Whisper artefact.

════════════════════════════════════════════════════════════

The three candidates should attack DIFFERENT angles:
1. A specific technique or decision the winemaker mentioned (varietal choice, ferment style, timing, region-picking).
2. A direct quote or turn-of-phrase echoed back verbatim (in quotes).
3. A question that invites reply — grounded in something specific from the audio.

Return ONLY valid JSON with this exact shape:
{
  "candidates": [
    { "angle": "technique", "text": "..." },
    { "angle": "quoted_voice", "text": "..." },
    { "angle": "question", "text": "..." }
  ],
  "transcriptWarnings": ["..."]
}

transcriptWarnings is a string array — include any word or phrase in the transcript you suspect Whisper mis-transcribed, so Rich can eyeball it. Empty array if none.

No markdown fences. No prose outside the JSON.`;

      const userContent = `Transcript of the audio:
"""
${transcription}
"""

Extra context Rich provided (optional):
"""
${input.context ?? "(none)"}
"""

Propose the three hook candidates.`;

      const chatResp = await fetch(`${forgeUrl}/v1/chat/completions`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${forgeKey}`,
          "x-ow-source": "outreach.audioHookPropose",
        },
        body: JSON.stringify({
          messages: [
            { role: "system", content: systemPrompt },
            { role: "user", content: userContent },
          ],
          stream: false,
        }),
      });
      if (!chatResp.ok) {
        // Whisper succeeded — return transcript so Rich can still craft manually
        return { transcription, candidates: [] as { angle: string; text: string }[] };
      }
      const chatData = await chatResp.json();
      const raw = chatData.choices?.[0]?.message?.content ?? "{}";
      try {
        const cleaned = raw.replace(/^```json\s*/i, "").replace(/^```\s*/i, "").replace(/```\s*$/i, "").trim();
        const parsed = JSON.parse(cleaned);
        const candidates = Array.isArray(parsed.candidates)
          ? parsed.candidates
              .filter((c: unknown) => c && typeof c === "object" && typeof (c as { text?: unknown }).text === "string")
              .map((c: { angle?: string; text: string }) => ({
                angle: typeof c.angle === "string" ? c.angle : "quoted_voice",
                text: c.text.trim().slice(0, 400),
              }))
              .slice(0, 3)
          : [];
        // Claude flags likely Whisper mishearings so Rich can eyeball the
        // transcript before saving. Empty array means Claude was confident.
        const transcriptWarnings = Array.isArray(parsed.transcriptWarnings)
          ? parsed.transcriptWarnings
              .filter((w: unknown) => typeof w === "string" && w.trim().length > 0)
              .map((w: string) => w.trim().slice(0, 200))
              .slice(0, 5)
          : [];
        return { transcription, candidates, transcriptWarnings };
      } catch {
        return { transcription, candidates: [] as { angle: string; text: string }[], transcriptWarnings: [] as string[] };
      }
    }),

  /** OWNER — save an audio-derived hook against an existing contact.
   *  Overwrites hookTier/hookText/hookSourceUrl for the given slug. */
  audioHookSave: ownerProcedure
    .input(z.object({
      slug: z.string().min(1).max(80),
      hookText: z.string().min(1).max(400),
      hookSourceUrl: z.string().max(500).nullable().optional(),
      // Tier is fixed to quoted_voice for audio-derived hooks — that's
      // the whole point of the tool.
    }))
    .mutation(async ({ input }) => {
      const [existing] = await db
        .select({ slug: schema.outreachContacts.slug })
        .from(schema.outreachContacts)
        .where(eq(schema.outreachContacts.slug, input.slug))
        .limit(1);
      if (!existing) throw new Error(`Contact "${input.slug}" not found`);
      await db
        .update(schema.outreachContacts)
        .set({
          hookText: input.hookText.trim(),
          hookTier: "quoted_voice",
          hookSourceUrl: input.hookSourceUrl?.trim() || null,
        })
        .where(eq(schema.outreachContacts.slug, input.slug));
      return { ok: true };
    }),



  /** OWNER — update triage status (warm/lukewarm/cold/sales/skip). */
  setStatus: ownerProcedure
    .input(
      z.object({
        slug: z.string(),
        status: z.enum(["warm", "lukewarm", "cold", "sales", "skip"]),
      })
    )
    .mutation(async ({ input }) => {
      await db
        .update(schema.outreachContacts)
        .set({ status: input.status })
        .where(eq(schema.outreachContacts.slug, input.slug));
      return { ok: true };
    }),

  /** OWNER — update the role-based persona on an existing contact.
   *  Called from the row-level persona pills in /admin/contacts when
   *  the operator realises they mis-tagged a lead (e.g. Sarah is
   *  actually the MD, not the owner). The change propagates to
   *  /hi/{slug} immediately — no cache invalidation needed since
   *  outreach.bySlug is a live query. */
  setPersona: ownerProcedure
    .input(
      z.object({
        slug: z.string(),
        persona: z.enum(["md", "winemaker", "owner", "sales-rep"]),
      })
    )
    .mutation(async ({ input }) => {
      await db
        .update(schema.outreachContacts)
        .set({ persona: input.persona })
        .where(eq(schema.outreachContacts.slug, input.slug));
      return { ok: true };
    }),

  /** OWNER — set/clear a per-contact SMS override. Pass null or empty
   *  string to revert back to the auto-generated template. */
  setSmsDraft: ownerProcedure
    .input(
      z.object({
        slug: z.string(),
        draft: z.string().max(500).nullable(),
      })
    )
    .mutation(async ({ input }) => {
      const value = input.draft && input.draft.trim().length > 0 ? input.draft.trim() : null;
      await db
        .update(schema.outreachContacts)
        .set({ smsDraftOverride: value })
        .where(eq(schema.outreachContacts.slug, input.slug));
      return { ok: true, cleared: value === null };
    }),

  /** OWNER — update the display name (firstName + optional lastName) on
   *  an existing contact. Used by the inline pencil-edit UI on each row
   *  so the operator can quickly correct a name they misheard at an
   *  event (e.g. "Sally" → "Sally Rainbows") without opening the full
   *  edit form. Trims both fields; empty lastName is stored as null. */
  setName: ownerProcedure
    .input(
      z.object({
        slug: z.string(),
        firstName: z.string().min(1).max(120),
        lastName: z.string().max(120).nullable().optional(),
      })
    )
    .mutation(async ({ input }) => {
      const firstName = input.firstName.trim();
      if (!firstName) {
        throw new Error("First name is required.");
      }
      const lastRaw = (input.lastName ?? "").trim();
      const lastName = lastRaw.length > 0 ? lastRaw : null;
      await db
        .update(schema.outreachContacts)
        .set({ firstName, lastName })
        .where(eq(schema.outreachContacts.slug, input.slug));
      return { ok: true };
    }),

  /** OWNER — update the winery on an existing contact via inline
   *  click-to-edit on the contact row. Empty string clears the field. */
  setWinery: ownerProcedure
    .input(
      z.object({
        slug: z.string(),
        winery: z.string().max(200),
      })
    )
    .mutation(async ({ input }) => {
      const value = input.winery.trim() || null;
      await db
        .update(schema.outreachContacts)
        .set({ winery: value })
        .where(eq(schema.outreachContacts.slug, input.slug));
      return { ok: true };
    }),

  /** OWNER — update the mobile on an existing contact via inline
   *  click-to-edit. Runs the same AU normalisation as create() so
   *  "0412 345 678" and "+61 412 345 678" store as one canonical
   *  format. Empty string clears the field. */
  setMobile: ownerProcedure
    .input(
      z.object({
        slug: z.string(),
        mobileAu: z.string().max(30),
      })
    )
    .mutation(async ({ input }) => {
      const raw = input.mobileAu.trim();
      const value = raw.length > 0 ? normaliseMobile(raw) : null;
      await db
        .update(schema.outreachContacts)
        .set({ mobileAu: value })
        .where(eq(schema.outreachContacts.slug, input.slug));
      return { ok: true, mobileAu: value };
    }),

  /** OWNER — update the private notes on an existing contact.
   *  Notes are the source-of-truth for extra channels (IG-personal,
   *  LinkedIn, Email, Web, Addr) rendered as chips on the contact row. */
  setNotes: ownerProcedure
    .input(
      z.object({
        slug: z.string(),
        notes: z.string().max(2000),
      })
    )
    .mutation(async ({ input }) => {
      const value = input.notes.trim() || null;
      await db
        .update(schema.outreachContacts)
        .set({ notes: value })
        .where(eq(schema.outreachContacts.slug, input.slug));
      return { ok: true };
    }),

  /** OWNER — drag-and-drop pipeline stage transition. Sets the canonical
   *  timestamps in one atomic write so the derived board view stays
   *  consistent. Stages:
   *    - lead     : pre-outreach. Clears smsSentAt/repliedAt/demoBookedAt.
   *    - sent     : SMS sent, no engagement yet. Sets smsSentAt only.
   *    - awaiting : SMS sent + prospect viewed but no reply. Same DB state
   *                 as 'sent' — the board sorts by viewCount > 0.
   *    - replied  : prospect replied. Sets smsSentAt + repliedAt.
   *    - booked   : demo booked. Sets smsSentAt + demoBookedAt.
   *  Idempotent: existing timestamps preserved when possible. */
  setPipelineStage: ownerProcedure
    .input(
      z.object({
        slug: z.string(),
        stage: z.enum(["lead", "sent", "awaiting", "replied", "booked"]),
      })
    )
    .mutation(async ({ input }) => {
      const now = Date.now();
      const rows = await db
        .select({
          smsSentAt: schema.outreachContacts.smsSentAt,
          repliedAt: schema.outreachContacts.repliedAt,
          demoBookedAt: schema.outreachContacts.demoBookedAt,
        })
        .from(schema.outreachContacts)
        .where(eq(schema.outreachContacts.slug, input.slug))
        .limit(1);
      const existing = rows[0];
      if (!existing) throw new Error(`Contact ${input.slug} not found`);

      // Compute the new state based on target stage. Preserve prior
      // timestamps where the stage still implies them.
      let smsSentAt = existing.smsSentAt ?? null;
      let repliedAt = existing.repliedAt ?? null;
      let demoBookedAt = existing.demoBookedAt ?? null;

      switch (input.stage) {
        case "lead":
          smsSentAt = null;
          repliedAt = null;
          demoBookedAt = null;
          break;
        case "sent":
        case "awaiting":
          // First time entering this column: stamp smsSentAt. Clear later-
          // stage timestamps so dragging backward really moves the card.
          smsSentAt = smsSentAt ?? now;
          repliedAt = null;
          demoBookedAt = null;
          break;
        case "replied":
          smsSentAt = smsSentAt ?? now;
          repliedAt = repliedAt ?? now;
          demoBookedAt = null;
          break;
        case "booked":
          smsSentAt = smsSentAt ?? now;
          demoBookedAt = demoBookedAt ?? now;
          // repliedAt left alone — booking implies they engaged
          break;
      }

      await db
        .update(schema.outreachContacts)
        .set({ smsSentAt, repliedAt, demoBookedAt })
        .where(eq(schema.outreachContacts.slug, input.slug));
      return { ok: true, stage: input.stage };
    }),

  /** OWNER — record SMS sent (operator marks it after they hit send). */
  markSmsSent: ownerProcedure
    .input(z.object({ slug: z.string() }))
    .mutation(async ({ input }) => {
      await db
        .update(schema.outreachContacts)
        .set({ smsSentAt: Date.now() })
        .where(eq(schema.outreachContacts.slug, input.slug));
      return { ok: true };
    }),

  /** OWNER — record demo booked (operator marks it manually for now). */
  markBooked: ownerProcedure
    .input(z.object({ slug: z.string() }))
    .mutation(async ({ input }) => {
      await db
        .update(schema.outreachContacts)
        .set({ demoBookedAt: Date.now() })
        .where(eq(schema.outreachContacts.slug, input.slug));
      return { ok: true };
    }),

  /** OWNER — remove a contact. */
  remove: ownerProcedure
    .input(z.object({ slug: z.string() }))
    .mutation(async ({ input }) => {
      await db
        .delete(schema.outreachContacts)
        .where(eq(schema.outreachContacts.slug, input.slug));
      return { ok: true };
    }),

  /** OWNER — return the un-activated cold contacts (no smsSentAt).
   *  Powers the "Bulk activation" action on /admin/contacts. Deliberately
   *  filters to status='cold' AND smsSentAt IS NULL AND mobileAu present
   *  so the operator can't accidentally re-blast someone already engaged. */
  unactivatedCold: ownerProcedure.query(async () => {
    const rows = await db
      .select({
        slug: schema.outreachContacts.slug,
        firstName: schema.outreachContacts.firstName,
        lastName: schema.outreachContacts.lastName,
        mobileAu: schema.outreachContacts.mobileAu,
        winery: schema.outreachContacts.winery,
      })
      .from(schema.outreachContacts)
      .where(
        and(
          isNull(schema.outreachContacts.smsSentAt),
          eq(schema.outreachContacts.status, "cold")
        )
      )
      .orderBy(schema.outreachContacts.firstName);
    // Only return rows with a mobile — no point flagging contacts without
    // a number for a bulk SMS blast.
    return { contacts: rows.filter((r) => r.mobileAu && r.mobileAu.length > 0) };
  }),

  // ── OWNER — Parse a wine-event page → producer + winemaker line-up ──
  // Paste any wine-festival / trade-tasting URL (Humanitix, Eventbrite,
  // winery website, or the event host's own page) and we extract:
  //   - event metadata (name, ISO date, venue, city, tickets URL)
  //   - the full producer lineup (winery + winemaker where named)
  //   - which producers are named vs mentioned only in a list
  //
  // Returns a DRAFT the operator reviews on /admin/event-ingest. From
  // there they tick which producers to research (per-row deepResearch)
  // and batch-save selected contacts into the CRM with `event` pre-filled.
  //
  // Why: event lineups are the single best cold-outbound signal in the
  // wine trade — every producer listed is (a) actively marketing, (b)
  // attending live trade events, and (c) gives us a natural warm-open
  // line ("see you at LITF" / "loved your grenache at LITF").
  parseEventUrl: ownerProcedure
    .input(z.object({
      url: z.string().url("Please paste a full URL starting with https:// or http://"),
    }))
    .mutation(async ({ input }) => {
      const forgeUrl = process.env.BUILT_IN_FORGE_API_URL;
      const forgeKey = process.env.BUILT_IN_FORGE_API_KEY;
      if (!forgeUrl || !forgeKey) throw new Error("LLM service not configured");

      const parsed = new URL(input.url);
      if (parsed.protocol !== "http:" && parsed.protocol !== "https:") {
        throw new Error("URL must use http:// or https://");
      }

      // Fetch with browser-like UA + 15s timeout.
      const controller = new AbortController();
      const timeoutId = setTimeout(() => controller.abort(), 15_000);
      let html: string;
      try {
        const resp = await fetch(input.url, {
          signal: controller.signal,
          redirect: "follow",
          headers: {
            "User-Agent": "Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/126.0 Safari/537.36",
            Accept: "text/html,application/xhtml+xml,application/xml;q=0.9,*/*;q=0.8",
            "Accept-Language": "en-AU,en;q=0.9",
          },
        });
        clearTimeout(timeoutId);
        if (!resp.ok) throw new Error(`Fetch failed: ${resp.status} ${resp.statusText}`);
        const contentType = resp.headers.get("content-type") ?? "";
        if (!contentType.includes("html") && !contentType.includes("text")) {
          throw new Error(`Unsupported content type: ${contentType}`);
        }
        const buf = await resp.arrayBuffer();
        if (buf.byteLength > 3 * 1024 * 1024) throw new Error("Page too large (>3MB)");
        html = new TextDecoder("utf-8", { fatal: false }).decode(buf);
      } catch (err) {
        clearTimeout(timeoutId);
        const msg = err instanceof Error ? err.message : String(err);
        if (msg.includes("aborted")) throw new Error("Page took too long to load (>15s). Try a different URL.");
        throw new Error(`Could not load page — ${msg}`);
      }

      // Signal extraction — reuse the same recipe as parseFromUrl.
      const jsonLdBlocks: unknown[] = [];
      const ldRe = /<script[^>]*type=["']application\/ld\+json["'][^>]*>([\s\S]*?)<\/script>/gi;
      for (const m of html.matchAll(ldRe)) {
        try { jsonLdBlocks.push(JSON.parse(m[1].trim())); } catch { /* skip */ }
      }
      const titleMatch = html.match(/<title[^>]*>([^<]+)<\/title>/i);
      const descMatch = html.match(/<meta\s+name=["']description["']\s+content=["']([^"']+)["']/i)
        ?? html.match(/<meta\s+property=["']og:description["']\s+content=["']([^"']+)["']/i);

      // Main text — event pages have long producer lists so we cap higher (10k).
      const stripped = html
        .replace(/<script[\s\S]*?<\/script>/gi, " ")
        .replace(/<style[\s\S]*?<\/style>/gi, " ")
        .replace(/<nav[\s\S]*?<\/nav>/gi, " ")
        .replace(/<footer[\s\S]*?<\/footer>/gi, " ")
        .replace(/<[^>]+>/g, " ")
        .replace(/&[a-z]+;/gi, " ")
        .replace(/\s+/g, " ")
        .trim()
        .slice(0, 10_000);

      const signals = {
        url: input.url,
        pageTitle: titleMatch?.[1]?.trim() ?? null,
        pageDescription: descMatch?.[1]?.trim() ?? null,
        jsonLd: jsonLdBlocks.length > 0 ? JSON.stringify(jsonLdBlocks).slice(0, 6000) : null,
        mainText: stripped,
      };

      const systemPrompt = `You extract structured data from a wine-industry event page. The page could be a festival, trade tasting, masterclass, or exhibitor listing.

Return a single JSON object:
- eventName: string — the official event title (e.g. "Lost in the F.O.G.", "Barossa Wine Show 2026")
- eventDateIso: string | null — start date in "YYYY-MM-DD" format. Look in JSON-LD startDate first, then in body text ("Saturday 1 August 2026", "1 Aug"). If year is missing, assume the closest upcoming year. Return null if you cannot confidently determine a specific date.
- eventDateDisplay: string | null — human-readable date as it appears on the page (e.g. "Sat, 1 Aug 2026, 2pm–5pm AEST")
- venue: string | null — venue name (e.g. "The Wine Bar at The International")
- address: string | null — venue street address
- city: string | null — Australian city (Sydney, Melbourne, Adelaide, etc.)
- ticketsUrl: string | null — direct link to buy tickets (Humanitix / Eventbrite / venue booking page)
- eventKind: "festival" | "trade-tasting" | "masterclass" | "wine-show" | "other" — inferred from copy
- producers: Array of { winery: string, winemakerName: string | null, role: string | null, notes: string | null }
    * INCLUDE every producer / winery / brand named in the copy, whether they're described in a paragraph OR only listed as a name in a lineup
    * winery = the business/brand name as it appears
    * winemakerName = only fill this if the copy explicitly links a named person to the winery (e.g. "Alex Head of Head Wines", "Amelia Nolan of Alkina"). Otherwise null.
    * role = "Winemaker", "Founder", "Chief Winemaker", "Owner" etc when stated. Otherwise null.
    * notes = one sentence of context from the page copy about that producer's style/region/reputation. Null if none.
    * DO NOT invent producers. Only include names the page explicitly mentions.

Return ONLY valid JSON. No markdown fences. If the page doesn't look like a wine event, return {"eventName": null, "producers": []}.`;

      const chatResp = await fetch(`${forgeUrl}/v1/chat/completions`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${forgeKey}`,
          "x-ow-source": "outreach.parseEventUrl",
        },
        body: JSON.stringify({
          messages: [
            { role: "system", content: systemPrompt },
            { role: "user", content: JSON.stringify(signals) },
          ],
          stream: false,
        }),
      });
      if (!chatResp.ok) {
        const errText = await chatResp.text().catch(() => "");
        throw new Error(`LLM extraction failed: ${chatResp.status} ${errText.slice(0, 200)}`);
      }
      const chatData = await chatResp.json();
      const raw = chatData.choices?.[0]?.message?.content ?? "{}";
      let draft: {
        eventName: string | null;
        eventDateIso: string | null;
        eventDateDisplay: string | null;
        venue: string | null;
        address: string | null;
        city: string | null;
        ticketsUrl: string | null;
        eventKind: string | null;
        producers: Array<{ winery: string; winemakerName: string | null; role: string | null; notes: string | null }>;
      } | null = null;
      try {
        const cleaned = raw.replace(/^```json\s*/i, "").replace(/^```\s*/i, "").replace(/```\s*$/i, "").trim();
        const p = JSON.parse(cleaned);
        if (p && typeof p === "object") {
          draft = {
            eventName: typeof p.eventName === "string" ? p.eventName : null,
            eventDateIso: typeof p.eventDateIso === "string" ? p.eventDateIso : null,
            eventDateDisplay: typeof p.eventDateDisplay === "string" ? p.eventDateDisplay : null,
            venue: typeof p.venue === "string" ? p.venue : null,
            address: typeof p.address === "string" ? p.address : null,
            city: typeof p.city === "string" ? p.city : null,
            ticketsUrl: typeof p.ticketsUrl === "string" ? p.ticketsUrl : null,
            eventKind: typeof p.eventKind === "string" ? p.eventKind : null,
            producers: Array.isArray(p.producers)
              ? p.producers
                  .filter((prod: unknown): prod is { winery?: unknown } => !!prod && typeof prod === "object" && typeof (prod as { winery?: unknown }).winery === "string")
                  .map((prod: { winery: string; winemakerName?: unknown; role?: unknown; notes?: unknown }) => ({
                    winery: String(prod.winery).trim(),
                    winemakerName: typeof prod.winemakerName === "string" ? prod.winemakerName.trim() : null,
                    role: typeof prod.role === "string" ? prod.role.trim() : null,
                    notes: typeof prod.notes === "string" ? prod.notes.trim() : null,
                  }))
                  .filter((prod: { winery: string }) => prod.winery.length > 0)
              : [],
          };
        }
      } catch {
        draft = null;
      }

      // Sanity-check the ISO date so the client can trust past/future logic.
      let eventStatus: "past" | "future" | "unknown" = "unknown";
      if (draft?.eventDateIso) {
        const parsedDate = new Date(draft.eventDateIso);
        if (!Number.isNaN(parsedDate.getTime())) {
          eventStatus = parsedDate.getTime() >= Date.now() ? "future" : "past";
        }
      }

      // ── Persist the parse to event_ingests so the operator can revisit
      // this event later ("Add more from this event") without another
      // LLM round-trip. Upsert on URL — re-parsing the same URL bumps
      // updatedAt + refreshes the snapshot.
      let ingestId: number | null = null;
      if (draft && draft.eventName) {
        const now = Date.now();
        const producersJson = JSON.stringify(draft.producers);
        try {
          // Try insert first. MySQL will throw a duplicate-key error if
          // the URL already exists; we then fall through to an update.
          const inserted = await db.insert(schema.eventIngests).values({
            url: input.url,
            eventName: draft.eventName,
            eventDateIso: draft.eventDateIso,
            eventDateDisplay: draft.eventDateDisplay,
            venue: draft.venue,
            address: draft.address,
            city: draft.city,
            ticketsUrl: draft.ticketsUrl,
            eventKind: draft.eventKind,
            producersJson,
            producerCount: draft.producers.length,
            createdAt: now,
            updatedAt: now,
            lastUsedAt: now,
          });
          // mysql2 returns insertId on the raw result — narrow safely.
          const anyResult = inserted as unknown as { insertId?: number } | Array<{ insertId?: number }>;
          const insertId = Array.isArray(anyResult) ? anyResult[0]?.insertId : anyResult?.insertId;
          if (typeof insertId === "number" && insertId > 0) ingestId = insertId;
        } catch {
          // Duplicate URL — update the existing row.
          await db
            .update(schema.eventIngests)
            .set({
              eventName: draft.eventName,
              eventDateIso: draft.eventDateIso,
              eventDateDisplay: draft.eventDateDisplay,
              venue: draft.venue,
              address: draft.address,
              city: draft.city,
              ticketsUrl: draft.ticketsUrl,
              eventKind: draft.eventKind,
              producersJson,
              producerCount: draft.producers.length,
              updatedAt: now,
              lastUsedAt: now,
            })
            .where(eq(schema.eventIngests.url, input.url));
          const existing = await db
            .select({ id: schema.eventIngests.id })
            .from(schema.eventIngests)
            .where(eq(schema.eventIngests.url, input.url))
            .limit(1);
          ingestId = existing[0]?.id ?? null;
        }
      }

      return { draft, eventStatus, ingestId };
    }),

  // ── OWNER — List past event ingests (history panel) ────────────────────
  // Returns the last 30 events the operator has parsed, each with a count
  // of contacts already saved from that event (matched by exact `event`
  // name on outreach_contacts). Powers the "Recent event ingests" panel
  // on /admin/event-ingest.
  listIngests: ownerProcedure.query(async () => {
    const rows = await db
      .select({
        id: schema.eventIngests.id,
        url: schema.eventIngests.url,
        eventName: schema.eventIngests.eventName,
        eventDateIso: schema.eventIngests.eventDateIso,
        eventDateDisplay: schema.eventIngests.eventDateDisplay,
        venue: schema.eventIngests.venue,
        city: schema.eventIngests.city,
        eventKind: schema.eventIngests.eventKind,
        producerCount: schema.eventIngests.producerCount,
        createdAt: schema.eventIngests.createdAt,
        updatedAt: schema.eventIngests.updatedAt,
        lastUsedAt: schema.eventIngests.lastUsedAt,
      })
      .from(schema.eventIngests)
      .orderBy(desc(schema.eventIngests.updatedAt))
      .limit(30);

    // For each ingest, count how many contacts we've already saved with
    // event = eventName. Small N (≤30) so an N+1 is fine here.
    const withCounts = await Promise.all(
      rows.map(async (r) => {
        const savedCount = r.eventName
          ? await db
              .select({ c: sql<number>`COUNT(*)` })
              .from(schema.outreachContacts)
              .where(eq(schema.outreachContacts.event, r.eventName))
              .then((res) => Number(res[0]?.c ?? 0))
          : 0;
        return { ...r, savedCount };
      })
    );
    return { ingests: withCounts };
  }),

  // ── OWNER — Load the full producer snapshot for one past ingest ────────
  // Returns the same shape as parseEventUrl (draft + eventStatus) but
  // hydrated from the persisted JSON — no LLM call, no network. Bumps
  // lastUsedAt so the history sorts recently-touched first.
  getIngest: ownerProcedure
    .input(z.object({ id: z.number().int().positive() }))
    .mutation(async ({ input }) => {
      const rows = await db
        .select()
        .from(schema.eventIngests)
        .where(eq(schema.eventIngests.id, input.id))
        .limit(1);
      const row = rows[0];
      if (!row) throw new Error("Event ingest not found");

      await db
        .update(schema.eventIngests)
        .set({ lastUsedAt: Date.now() })
        .where(eq(schema.eventIngests.id, input.id));

      let producers: Array<{ winery: string; winemakerName: string | null; role: string | null; notes: string | null }> = [];
      try {
        const parsed = JSON.parse(row.producersJson ?? "[]");
        if (Array.isArray(parsed)) producers = parsed;
      } catch { /* corrupt JSON — return empty list */ }

      const draft = {
        eventName: row.eventName,
        eventDateIso: row.eventDateIso,
        eventDateDisplay: row.eventDateDisplay,
        venue: row.venue,
        address: row.address,
        city: row.city,
        ticketsUrl: row.ticketsUrl,
        eventKind: row.eventKind,
        producers,
      };
      let eventStatus: "past" | "future" | "unknown" = "unknown";
      if (row.eventDateIso) {
        const parsedDate = new Date(row.eventDateIso);
        if (!Number.isNaN(parsedDate.getTime())) {
          eventStatus = parsedDate.getTime() >= Date.now() ? "future" : "past";
        }
      }
      return { draft, eventStatus, url: row.url, ingestId: row.id };
    }),

  // ── OWNER — Remove a past ingest from history (irreversible) ───────────
  deleteIngest: ownerProcedure
    .input(z.object({ id: z.number().int().positive() }))
    .mutation(async ({ input }) => {
      await db.delete(schema.eventIngests).where(eq(schema.eventIngests.id, input.id));
      return { ok: true };
    }),

  /** OWNER — mark a whole batch of contacts as smsSentAt=now in one call.
   *  Client owns the actual SMS sending (via the "Copy" clipboard flow or
   *  a bulk-Messages export). This endpoint just records the timestamp so
   *  the KPI counter + pipeline board move forward. */
  markSmsSentBulk: ownerProcedure
    .input(z.object({ slugs: z.array(z.string()).min(1).max(200) }))
    .mutation(async ({ input }) => {
      const now = Date.now();
      let count = 0;
      for (const slug of input.slugs) {
        const r = await db
          .update(schema.outreachContacts)
          .set({ smsSentAt: now })
          .where(
            and(
              eq(schema.outreachContacts.slug, slug),
              isNull(schema.outreachContacts.smsSentAt)
            )
          );
        // Drizzle returns rowsAffected via the driver — best-effort count.
        void r;
        count += 1;
      }
      return { ok: true, count };
    }),
});
