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
      return {
        ...row,
        calendlyUrl,
        sampleVintageLogUrl,
        sampleVintageLogVariant: variant,
        crushVariant,
        ctaVariant,
        smsReplyHref,
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

  // ── OWNER — URL-quick-add a contact ────────────────────────────────────
  // Paste a URL (winery website, Google Business listing, LinkedIn page,
  // Instagram profile, wine-show exhibitor page). We fetch, extract every
  // signal we can — JSON-LD schema.org, tel:/mailto: links, social handles,
  // main page text — and feed it to an LLM to structure into contact
  // fields. Returns a DRAFT the UI shows for review + confirm.
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

Return a single JSON object with these fields:
- firstName: string — the primary contact person, if identifiable. If the page is a company (no named person), use the winery/business name here (we'll flip it in the UI).
- lastName: string | null
- mobileAu: string | null — first Australian mobile you find, normalised to "04XX XXX XXX". If only a landline is available, use that raw.
- email: string | null — first business email you find
- winery: string | null — the winery/company name
- website: string | null — the URL passed in (echo it back so it lands in notes)
- instagram: string | null — Instagram handle WITHOUT the @ (just the username)
- event: string | null — if the URL is a wine-show/exhibitor page, name the event
- painPoint: string | null — a one-sentence summary of what the business focuses on that a wine-tech tool could help with (e.g. "Boutique Hunter Semillon producer, no digital cellar records", "Emerging cool-climate Chardonnay estate; 3-person team")
- notes: string | null — anything else worth remembering (address, hours, size of operation, distinctive detail). Include the source URL as a suffix.
- status: "warm" | "lukewarm" | "cold" — default to "cold" (this is a prospecting-from-URL flow, not a warm-intro)
- confidence: "high" | "medium" | "low" — high if you found a named person + phone/email; medium if you found the business + one contact channel; low if you only got the business name

Speech-recognition normalisations do NOT apply here — this is scraped HTML. But:
- Strip any trailing punctuation from phone numbers ("0400 123 456." → "0400 123 456")
- Instagram handles: strip @ sign if present, remove trailing "/"
- If multiple people are listed, pick the winemaker/founder/GM over marketing/admin
- Return ONLY valid JSON. No markdown fences. If no useful data can be extracted, return {"firstName": null, "confidence": "low"}.`;

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
      try {
        const cleaned = raw.replace(/^```json\s*/i, "").replace(/^```\s*/i, "").replace(/```\s*$/i, "").trim();
        const draft = JSON.parse(cleaned);
        if (!draft || typeof draft !== "object" || !draft.firstName) {
          return { draft: null, signals };
        }
        return { draft, signals };
      } catch {
        return { draft: null, signals };
      }
    }),

  // ── OWNER — Deep research from just a business name ────────────────────
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
                content: `You are a wine-industry sales-research assistant. Given a business or person name, deep-search the public web for CURRENT contact details. Prioritise official winery websites, verified LinkedIn profiles, Instagram bios, and reputable trade publications (Halliday, WBM, Real Review, Winetitles). Ignore stale info — if two sources disagree, prefer the more recent one.

For "role", identify the primary point-of-contact — winemaker, founder, GM, or cellar-door manager — in that priority order. Skip marketing / admin staff.

For "mobileAu" — normalise to "04XX XXX XXX". If only a landline is public, use "(0X) XXXX XXXX". If only an international mobile, keep original format.

For "instagram" — return the primary handle WITHOUT the @ (e.g. "lesfruitswine"). This should be the WINERY / BUSINESS account (the public brand handle).

For "instagramPersonal" — if the winemaker / founder has a SEPARATE personal Instagram AND it's publicly cross-linked with the winery account (either the winery bio mentions the person's handle, or the person's bio mentions the winery, or trade press links the two), return that personal handle without the @. If they've deliberately kept them separate, return null — that separation is a signal to respect.

For "painPoint" — write ONE sentence describing what a cellar-intelligence AI tool could help this producer with, inferred from their scale / focus / recent public commentary. Examples: "Small natural-wine producer, minimal digital record-keeping"; "Established mid-sized producer scaling into cellar-door tourism"; "Cool-climate boutique estate with vintage variability challenges".

For "confidence":
- "high" = named person + at least 2 direct channels (phone/email/verified IG) found
- "medium" = winery + 1 channel found, no named person OR named person + only 1 channel
- "low" = only the winery name confirmed, no direct contact channels

Return ONLY the requested JSON — no prose, no explanation. Use null for any field you cannot verify. Do NOT invent URLs, phone numbers, or emails — null is always correct over hallucination.`,
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
