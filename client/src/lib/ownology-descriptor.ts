/**
 * ownology-descriptor.ts — canonical Ownology sell stack.
 *
 * Three layers, chosen Feb 2026 (UserJourneyDeck.tsx line 173 is the
 * editorial vote): category descriptor → metaphor → category noun.
 * Import from here everywhere the pitch surfaces so tuning the wording
 * propagates by one edit instead of a scavenger hunt.
 */

// Layer 1 — Category descriptor. Reused as page kicker + meta title.
export const OWNOLOGY_CATEGORY_DESCRIPTOR = "Cellar Intelligence Platform for Winemakers";

// Layer 2 — Metaphor strapline. Amber italic on Home / HeroPillars /
// Ask / Cellar Journal / Founding Partners / Site Footer / Preview.
export const OWNOLOGY_METAPHOR = "You are the must. Ownology is the ferment.";

// Layer 3 — Category noun. The H1 promise. UserJourneyDeck editorial
// note: "Category noun in five words. If they don't get it here, they're
// not our audience."
export const OWNOLOGY_CATEGORY_NOUN = "The winemaker's second brain.";

// Composite one-liner — Layer 2 + Layer 3 fused into a single sentence.
// Used on /hi/:slug (SMS landing) after the personalised hook so the
// pitch anchors in the site's canonical vocabulary.
export const OWNOLOGY_SELL_STACK =
  "You are the must. Ownology is the ferment — the winemaker's second brain, grounded in your own vintage logs.";
