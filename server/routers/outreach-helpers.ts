/**
 * outreach-helpers — pure synchronous helpers extracted from outreach.ts
 * (Jul 2026 split; the parent router was ~3,700 lines and slowing the LSP
 * to a crawl).
 *
 * Zero DB, zero fetch, zero side-effects except reading process.env.
 * Safe to unit-test in isolation.
 */

export function slugify(...parts: string[]): string {
  return parts
    .filter(Boolean)
    .join(" ")
    .toLowerCase()
    .trim()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "")
    .slice(0, 80) || `c-${Date.now().toString(36)}`;
}

export function normaliseMobile(raw: string | undefined | null): string | null {
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
export type SampleVintageVariant = "hunter" | "boutique" | "large";

// Hunter Valley markers — region names + specific known Hunter wineries.
// (Most of these are 30-80 tank operations — the "Hunter Estate" mockup
// fits them better than the 128-tank "large" view.)
export const HUNTER_MARKERS = [
  "hunter", "broke", "pokolbin", "lovedale", "rothbury", "cessnock",
  "brokenwood", "tyrrell", "margan", "mount pleasant", "de iuliis",
  "thomas wines", "audrey wilkinson", "pooles rock", "m+j becker",
  "usher tinkler", "charteris", "majama",
];

// Only TRULY large multi-region producers go here — used to pin them to
// the 128-tank view regardless of region. Empty for now; most Australian
// indie + boutique winemakers see boutique or hunter views.
export const LARGE_PRODUCER_MARKERS = [
  "treasury", "accolade", "pernod", "casella", "yalumba", "de bortoli",
];

// Explicit indie/cult labels — single-vineyard, side-projects, no scale.
export const BOUTIQUE_NAME_MARKERS = [
  "ur 1st luv", "château acid", "chateau acid", "pride of lunatics",
  "hopeless thoughtful", "jilly", "frankly", "sabi wabi", "balmy nights",
  "tim ward", "toppers mountain", "sassafras",
];

export function pickSampleVintageVariant(input: {
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
export const WHITE_FOCUS_MARKERS = [
  "chardonnay", "riesling", "sauvignon", "semillon", "sémillon",
  "viognier", "pinot gris", "pinot grigio", "prosecco", "sparkling",
  "champagne", "blanc", "white wines", "white house",
];

/** Decide which crush cascade theme to auto-fire on /hi/:slug.
 *  Hunter Valley + most boutique reds → red-crush.
 *  Producers with explicit white/sparkling markers → white-crush.
 *  Default → red-crush (matches brand wine-rose). */
export function pickCrushVariant(input: {
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
export function pickCtaVariant(slug: string): "book" | "reply" {
  if (!process.env.SMS_INBOUND_NUMBER?.trim()) return "book";
  // Simple deterministic hash: sum of char codes mod 2.
  let h = 0;
  for (let i = 0; i < slug.length; i++) h = (h + slug.charCodeAt(i)) | 0;
  return h % 2 === 0 ? "book" : "reply";
}

/** QMS-framing A/B test on /hi/:slug 3-tile block. Deterministic per slug,
 *  and INDEPENDENT of pickCtaVariant (uses only odd-indexed characters +
 *  a shift) so the two experiments don't confound each other.
 *    - "qms"            → "A winemaking QMS with an AI apprentice."
 *    - "quality-system" → "A winemaking quality system with an AI apprentice."
 *  Feb 2026 soft launch — QMS is the sharper category noun but risks reading
 *  as corporate jargon on a Halliday-Young-Gun audience. Spelt-out version
 *  is the plain-English hedge. Kill the loser after ~1 week. */
export function pickQmsVariant(slug: string): "qms" | "quality-system" {
  let h = 0;
  for (let i = 1; i < slug.length; i += 2) h = (h * 17 + slug.charCodeAt(i)) | 0;
  return Math.abs(h) % 2 === 0 ? "qms" : "quality-system";
}

/** Detect canonical placeholder phone numbers that should never render as a
 *  live "Text me" button. Jul 2026: caught a `+61400000000` slip in prod
 *  that sent every /hi/<slug> prospect to a fake destination — this guards
 *  against a repeat. Accepts anything that E.164-cleans to all-zeros or one
 *  of a handful of well-known dummy numbers. */
export function isPlaceholderPhone(raw: string): boolean {
  const digits = raw.replace(/[^\d]/g, "");
  if (!digits) return true;
  // All-zero suffixes after the country code — the classic mis-copy pattern.
  // "+61400000000" → digits "61400000000" → all-zero after the +614 prefix.
  if (/^\d{1,3}0+$/.test(digits)) return true;
  if (/0{7,}/.test(digits)) return true; // 7+ consecutive zeros → dummy
  const KNOWN_DUMMIES = new Set([
    "61400000000", "61400000001", // AU mobile placeholder
    "15551234567", "15555550100", // US 555 test range
    "12025550100",
    "441234567890",               // UK placeholder
  ]);
  return KNOWN_DUMMIES.has(digits);
}

/** Build the `sms:` href that pre-fills the operator's number with the
 *  prospect's identity. iOS and Android both support `sms:+number?body=...`.
 *  Returns null if no inbound number configured OR the configured number
 *  looks like a placeholder (see isPlaceholderPhone).
 *
 *  Jul 2026 copy change: dropped the "RED — " prefix from the SMS body.
 *  The keyword existed as an internal filter idea that was never actually
 *  wired to any inbound automation — meanwhile customers were seeing
 *  "Reply RED" and "RED — Hi..." with zero context. Body is now written
 *  in the customer's voice as if they were composing the text themselves. */
export function buildSmsReplyHref(input: {
  firstName: string;
  winery: string | null;
}): string | null {
  const num = process.env.SMS_INBOUND_NUMBER?.trim();
  if (!num) return null;
  if (isPlaceholderPhone(num)) {
    console.warn(`[buildSmsReplyHref] SMS_INBOUND_NUMBER "${num}" looks like a placeholder — suppressing Text-me button. Set a real E.164 mobile in .env / Railway env vars.`);
    return null;
  }
  const body = `Hi Rich, it's ${input.firstName}${input.winery ? ` from ${input.winery}` : ""}. Please lock me in for Ownology onboarding.`;
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
export function buildWaHref(input: {
  firstName: string;
  winery: string | null;
}): string | null {
  const raw = (process.env.WHATSAPP_INBOUND_NUMBER || process.env.SMS_INBOUND_NUMBER || "").trim();
  if (!raw) return null;
  if (isPlaceholderPhone(raw)) return null; // Same guard as buildSmsReplyHref — never render a WA link to a fake number.
  const digits = raw.replace(/[^\d+]/g, "").replace(/^\+/, "");
  const body = `Hi Rich, it's ${input.firstName}${input.winery ? ` from ${input.winery}` : ""}. Please lock me in for Ownology onboarding.`;
  return `https://wa.me/${digits}?text=${encodeURIComponent(body)}`;
}
