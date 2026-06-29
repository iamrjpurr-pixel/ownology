/**
 * Outreach contacts — personalised SMS landing pages for winemakers met
 * in person at wine events. Each contact gets /hi/:slug. Tracks SMS sent /
 * first opened / demo booked timestamps.
 */
import { z } from "zod";
import { eq, sql, desc } from "drizzle-orm";
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

  /** PUBLIC — mark a slug as viewed (called once on landing-page mount). */
  markViewed: publicProcedure
    .input(z.object({ slug: z.string().min(1).max(80) }))
    .mutation(async ({ input }) => {
      const now = Date.now();
      // Bump view_count and set first_viewed_at if null.
      await db
        .update(schema.outreachContacts)
        .set({
          viewCount: sql`view_count + 1`,
          firstViewedAt: sql`COALESCE(first_viewed_at, ${now})`,
        })
        .where(eq(schema.outreachContacts.slug, input.slug));
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
});
