/**
 * premiumCitations.ts — keep Owen's citation surface on-positioning.
 *
 * The /ask page promises "cited from the bibles." When the DIY / home-
 * winemaker path lets the LLM pick citations freely, it sometimes cites
 * homebrew-supplier titles (MoreWine!, Northern Brewer, Winemaker
 * Magazine). Those undermine the positioning — visitors see a homebrew
 * PDF cited and assume Owen reads forums, not AWRI.
 *
 * Fix approach: denylist. Suppress known homebrew-supplier / consumer
 * magazine patterns, keep everything else. Denylist beats allowlist for
 * this job because valid but obscure premium refs (e.g. "AWRI Fact
 * Sheet 2019", "Wine Australia LIP Guide") should always be allowed —
 * we don't want to accidentally kill them by not matching a hard-coded
 * allowlist entry.
 *
 * Used on:
 *   - server/routers/tutor.ts — filters `sopTitles` before returning
 *     from tutor.ask (both commercial + DIY paths).
 *   - client/src/pages/Ask.tsx — belt-and-braces filter before render.
 *
 * If a new supplier / magazine name creeps in through the LLM, add it
 * to HOMEBREW_SUPPRESS_PATTERNS here and both surfaces catch it.
 */

/** Case-insensitive patterns whose match in a citation title = suppress. */
export const HOMEBREW_SUPPRESS_PATTERNS: RegExp[] = [
  /morewine/i,                    // MoreWine! Red/White Winemaking Outline
  /more\s*wine\!/i,               // "More Wine!" spelled with a space
  /(red|white)\s+winemaking\s+outline/i, // "Red Winemaking Outline" — MoreWine!'s document title
  /northern\s*brewer/i,           // Northern Brewer
  /midwest\s+(home|brew|supply)/i,// MidWest Homebrewing / MidWest Supplies
  /e[\.\s]*c[\.\s]*kraus/i,       // E.C. Kraus
  /home\s*brew(ing|ers?)?/i,      // "Homebrewing.org", "Homebrew Talk", "Homebrewers Association"
  /wine\s*maker\s+mag(azine)?/i,  // Winemaker Magazine
  /winexpert/i,                   // Winexpert kits
  /beersmith/i,                   // Wrong domain (beer, not wine)
  /brewersfriend/i,               // Brewer's Friend
  /brulosophy/i,                  // Brulosophy (beer-focused)
  /amateur\s+winemaker/i,         // Amateur Winemaker magazine
];

/** True if the citation title looks like a homebrew-supplier / hobby mag. */
export function isSuppressedCitation(title: string): boolean {
  if (!title || typeof title !== "string") return true;
  return HOMEBREW_SUPPRESS_PATTERNS.some((p) => p.test(title));
}

/** Filter a list of citation titles down to the on-positioning subset. */
export function filterPremiumCitations(titles: readonly string[] | null | undefined): string[] {
  if (!titles || !Array.isArray(titles)) return [];
  return titles.filter((t) => t && !isSuppressedCitation(t));
}

/** Compact string of premium bibles for LLM prompts. Kept short so it
 *  doesn't blow the context budget. Names chosen from the AU/NZ
 *  commercial oenology canon plus the regulator anchors. */
export const PREMIUM_BIBLES_LIST = [
  "AWRI (Australian Wine Research Institute) technical documents and fact sheets",
  "Boulton, Singleton, Bisson & Kunkee — Principles and Practices of Winemaking",
  "Iland, Bruer, Edwards, Weeks & Wilkes — Chemical Analysis of Grapes and Wine",
  "Rankine — Making Good Wine",
  "Zoecklein, Fugelsang, Gump & Nury — Wine Analysis and Production",
  "Ribéreau-Gayon, Dubourdieu, Donèche & Lonvaud — Handbook of Enology",
  "Jackson — Wine Science: Principles and Applications",
  "Margalit — Concepts in Wine Chemistry",
  "Australian Wine Regulations / Wine Australia Act 2013",
  "FSANZ Food Standards Code (Standards 3.2.2, 3.2.2A, 4.5.1)",
  "OIV (International Organisation of Vine and Wine) resolutions",
].join(", ");

/**
 * Scrub forbidden brand/source names out of LLM-generated answer prose.
 *
 * Belt-and-braces: even with the citation-lane rule in the system
 * prompt, the LLM sometimes name-drops MoreWine! or "the red winemaking
 * outline" mid-answer. This helper does a regex replace pass on the
 * final prose before returning to the client. Replacements are chosen
 * to preserve meaning ("the home-scale winemaking guide") without
 * naming the suppressed source.
 *
 * Keep this list narrower than HOMEBREW_SUPPRESS_PATTERNS — some
 * patterns there (e.g. /home\s*brew/i) match legitimate phrases like
 * "your home-brew supplier" that we don't want to scrub from prose.
 */
const PROSE_REPLACEMENTS: Array<[RegExp, string]> = [
  // MoreWine!-branded document names → generic
  [/\b(the\s+)?morewine!?[\s'"]*/gi, "the home-scale winemaking guide "],
  [/\b(the\s+)?(red|white)\s+winemaking\s+outline\b/gi, "the home-scale winemaking guide"],
  // Kit / supplier brand names → generic
  [/\bnorthern\s*brewer\b/gi, "a home-winemaking supplier"],
  [/\bmidwest\s+(home\s*brew(ing)?|brewing\s+supply|supplies)\b/gi, "a home-winemaking supplier"],
  [/\be[\.\s]*c[\.\s]*kraus\b/gi, "a home-winemaking supplier"],
  [/\bwinexpert\b/gi, "a home-winemaking kit supplier"],
  // Consumer magazines → generic
  [/\bwine\s*maker\s+mag(azine)?\b/gi, "a home-winemaking magazine"],
  [/\bamateur\s+winemaker\b/gi, "a home-winemaking guide"],
  // Beer sources → generic (should be rare, but catch anyway)
  [/\bbeersmith\b/gi, "a fermentation guide"],
  [/\bbrulosophy\b/gi, "a fermentation guide"],
];

/**
 * Apply the prose scrub. Idempotent. Case-insensitive replacements
 * preserve the source case where possible via the replacement string.
 * Also collapses double spaces that can appear after a replacement
 * with a trailing space.
 */
export function scrubHomebrewMentions(text: string): string {
  if (!text || typeof text !== "string") return text;
  let out = text;
  for (const [pattern, replacement] of PROSE_REPLACEMENTS) {
    out = out.replace(pattern, replacement);
  }
  // Tidy any accidental double-space runs the replacements introduced.
  return out.replace(/[ \t]{2,}/g, " ");
}
