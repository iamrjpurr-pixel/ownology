/**
 * Pricing — single source of truth for subscription tiers, EOFY promo
 * math, and credit-pack economics.
 *
 * Before this file existed (Jul 2026), `/pricing` used `ANNUAL_MULTIPLIER
 * = 9` (EOFY 3-months-free promo) while `/waitlist` hard-coded annuals at
 * `× 10` — visitors saw $440/yr on `/waitlist` but $396/yr on `/pricing`.
 * They also saw a 3-tier ladder on `/pricing` and only a 2-tier one on
 * `/waitlist` (no Cellar Hand). Both breaches were caused by duplicated
 * tier data.
 *
 * From now on, any page that mentions a subscription price imports from
 * this module. There is no other source of pricing truth.
 *
 * Currency: AUD only (AU + NZ market). USD tier structure will be added
 * as a separate `USD_TIERS` export when the US launch begins.
 */

// ─── EOFY promo window ────────────────────────────────────────────────────
// While the promo is active, annual = monthly × 9 (save 3 months).
// Outside the window it reverts to monthly × 10 (save 2 months). This
// auto-flips on Aug 1 2026 with no code deploy needed.
export const EOFY_END_MS = new Date("2026-08-01T00:00:00+10:00").getTime();
export const EOFY_ACTIVE = Date.now() < EOFY_END_MS;
export const ANNUAL_MULTIPLIER = EOFY_ACTIVE ? 9 : 10;

// ─── Tier shape ───────────────────────────────────────────────────────────
export type TierId = "free_run" | "cellar" | "press" | "cellar_master";

export interface Tier {
  id: TierId;
  name: string;
  tagline: string;
  audience: string;
  monthlyPrice: number; // AUD, ex-GST-inclusive rounded whole numbers
  annualPrice: number; // AUD, derived via ANNUAL_MULTIPLIER
  retailMonthlyPrice?: number; // What price reverts to after founding cohort closes
  highlight: boolean;
  badge: string | null;
  color: string; // CSS var or oklch()
  features: string[];
  cta: string;
  ctaHref: string;
  note: string | null;
}

// ─── The four tiers ───────────────────────────────────────────────────────
export const TIERS: Tier[] = [
  {
    id: "free_run",
    name: "Free Run",
    tagline: "Home-scale winemaking, from the inside out.",
    audience: "Wine lovers, curious drinkers, food & wine enthusiasts.",
    monthlyPrice: 0,
    annualPrice: 0,
    highlight: false,
    badge: null,
    color: "var(--ow-text-lo)",
    features: [
      "3 curiosity questions / day",
      "Flavour science, varietals & regions",
      "Divine Trinity \u2014 Science, Vineyard, Craft",
      "First Divine Trinity reveal free",
      "Curriculum library \u2014 Skim mode across all 30 lessons",
      "Free account \u2014 no card needed",
    ],
    cta: "Start Exploring",
    ctaHref: "/free-run",
    note: null,
  },
  {
    id: "cellar",
    name: "The Cellar Hand",
    tagline: "Learn the craft. Stay compliant.",
    audience: "Home winemakers and wine students who want to learn.",
    monthlyPrice: 22,
    annualPrice: 22 * ANNUAL_MULTIPLIER,
    retailMonthlyPrice: 28,
    highlight: false,
    badge: "FOUNDING MEMBER",
    color: "oklch(0.65 0.08 75)",
    features: [
      "Full curiosity AI \u2014 40+ subjects",
      "100 Divine Trinity reveals / mo",
      "Unlimited Compliance AI",
      "Vintage log \u2014 unlimited entries",
      "Curriculum unlocked \u2014 Deep, Skim & Flash + MCQ practice",
      "Email support",
      "Founding Cohort \u00b7 2026 badge",
    ],
    cta: "Join The Cellar Hand",
    ctaHref: "#waitlist",
    note: "Less than a bottle of decent Shiraz per month.",
  },
  {
    id: "press",
    name: "The Press",
    tagline: "Full cellar operations \u00b7 commercial scale.",
    audience: "Boutique winery teams who need operations and protocol management.",
    monthlyPrice: 44,
    annualPrice: 44 * ANNUAL_MULTIPLIER,
    retailMonthlyPrice: 59,
    highlight: true,
    badge: "MOST POPULAR",
    color: "var(--ow-amber)",
    features: [
      "Full cellar operations suite",
      "38 SOPs across 12 categories",
      "Decision Logic + Tribal Knowledge",
      "Priority Compliance AI",
      "Unlimited Divine Trinity reveals",
      "Curriculum \u2014 scored MCQs, saved progress, attainment PDF",
      "Vintage log PDF export",
      "Email support",
    ],
    cta: "Enter The Press",
    ctaHref: "#waitlist",
    note: null,
  },
  {
    id: "cellar_master",
    name: "The Vigneron",
    tagline: "Your whole operation. Your whole team. The cellar's memory, cited.",
    audience: "Owner-operator boutique vignerons \u2014 you grow the grapes and make the wine.",
    monthlyPrice: 88,
    annualPrice: 88 * ANNUAL_MULTIPLIER,
    retailMonthlyPrice: 124,
    highlight: false,
    badge: "TEAM",
    color: "oklch(0.80 0.14 75)",
    features: [
      "Everything in The Press",
      "Unlimited Divine Trinity reveals",
      "Team seats (roll-out with multi-tenant)",
      "Team curriculum \u2014 seats, admin view, branded attainment PDFs",
      "Annual knowledge base review",
      "Vigneron badge + number",
    ],
    cta: "Claim The Vigneron",
    ctaHref: "#waitlist",
    note: null,
  },
];

// ─── Convenience selectors ────────────────────────────────────────────────
export const PAID_TIERS = TIERS.filter((t) => t.monthlyPrice > 0);

/** Formatted price labels — the ONLY place we render dollar strings for
 *  subscription tiers. Any page that needs "$44/mo" or "$396/yr" calls
 *  these, so we can never drift from the numeric source of truth. */
export function monthlyLabel(t: Tier): string {
  return t.monthlyPrice === 0 ? "Free" : `$${t.monthlyPrice}/mo`;
}
export function annualLabel(t: Tier): string {
  return t.annualPrice === 0 ? "Free" : `$${t.annualPrice}/yr`;
}

// ─── Credit packs (Pour / Glass / Flight / Cellar) ────────────────────────
// AUD-only for now. See PRD (Feb 2026 credit-pack pricing revision) for
// the tapered per-credit rate design.
export interface CreditPack {
  id: string;
  name: string;
  price: number;
  credits: number;
  perCredit: string;
  tagline: string;
  badge: string | null;
}

export const CREDIT_PACKS: CreditPack[] = [
  { id: "pour",   name: "Pour",   price: 2,  credits: 5,  perCredit: "$0.40", tagline: "Five reveals \u2014 cheaper than a coffee, a week of curiosity.",                 badge: null },
  { id: "glass",  name: "Glass",  price: 5,  credits: 15, perCredit: "$0.33", tagline: "Fifteen reveals \u2014 a weekend research pack.",                                  badge: null },
  { id: "flight", name: "Flight", price: 10, credits: 35, perCredit: "$0.29", tagline: "Thirty-five reveals \u2014 a month+ of daily learning at 42% off.",              badge: "MOST POPULAR" },
  { id: "cellar", name: "Cellar", price: 20, credits: 80, perCredit: "$0.25", tagline: "Eighty reveals. A vintage's worth of curiosity, at the best rate.",             badge: "BEST VALUE" },
];
