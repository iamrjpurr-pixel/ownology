/**
 * ownology-descriptor.ts — canonical Ownology sell stack.
 *
 * Three layers (Feb 2026 rewrite, Rich): category descriptor →
 * metaphor → category noun. Import from here everywhere the pitch
 * surfaces so tuning wording propagates by one edit.
 *
 * Rewrite note (Feb 2026): retired the "second brain" / "cellar AI"
 * framings across the site. Ownology now positions as quality and
 * risk management for winemakers — Trinity-grounded (quality panels
 * · vintage-log reasoning · asset trail) — with productivity and
 * profit compounding as the commercial anchor.
 */

// Layer 1 — Category descriptor. Reused as page kicker + meta title.
export const OWNOLOGY_CATEGORY_DESCRIPTOR = "Quality & Risk Management for Winemakers";

// Layer 2 — Metaphor strapline. Amber italic on Home / HeroPillars /
// Ask / Cellar Journal / Founding Partners / Site Footer / Preview.
export const OWNOLOGY_METAPHOR = "You are the must. Ownology is the ferment.";

// Layer 3 — Category noun. The H1 promise.
export const OWNOLOGY_CATEGORY_NOUN = "Quality and risk, across the whole business.";

// Composite one-liner — Layer 2 + Layer 3 fused into a single sentence.
// Used on /hi/:slug (SMS landing) after the personalised hook so the
// pitch anchors in the site's canonical vocabulary.
export const OWNOLOGY_SELL_STACK =
  "You are the must. Ownology is the ferment — quality and risk management for winemakers, stretched across the whole business.";
