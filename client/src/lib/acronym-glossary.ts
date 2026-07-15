/**
 * acronym-glossary.ts — canonical source of truth for every winemaking /
 * compliance / regulatory acronym that surfaces on Ownology.
 *
 * Consumed by:
 *   - <AcronymTooltip term="WBS" />  → hover/tap-to-reveal on /hi/:slug
 *     and admin pages
 *   - Future: RiskGlossary + HomeWinemakerGlossary pages can migrate to
 *     read from this instead of maintaining their own copies
 *
 * Keep entries SHORT — the tooltip is a mid-sentence interruption, not a
 * lecture. If a term needs > 20 words to explain, link to the full
 * glossary page instead.
 *
 * Add entries as acronyms surface elsewhere in the UI. Never invent an
 * abbreviation — only document what's actually used in the industry.
 */

export interface AcronymEntry {
  /** The exact string as it appears in copy — case-sensitive. */
  term: string;
  /** Long-form expansion (what the letters stand for). */
  expansion: string;
  /** One-sentence plain-English explanation. */
  definition: string;
  /** Optional deeper-dive link. */
  href?: string;
}

export const ACRONYM_GLOSSARY: Record<string, AcronymEntry> = {
  WBS: {
    term: "WBS",
    expansion: "Work Breakdown Structure",
    definition:
      "Hierarchical breakdown of every task, batch, and record needed to complete a vintage. Auditors trace each entry back to its WBS code.",
    href: "/risk-glossary#wbs",
  },
  LIP: {
    term: "LIP",
    expansion: "Licensed Industry Participant",
    definition:
      "Wine Australia's producer register. LIP compliance means your batches, exports and additions are logged in the format Wine Australia will accept at audit.",
    href: "/risk-glossary#lip",
  },
  HACCP: {
    term: "HACCP",
    expansion: "Hazard Analysis and Critical Control Points",
    definition:
      "Food-safety framework used across Australian wine production. Identifies where contamination can occur and how each step is controlled and documented.",
    href: "/risk-glossary#haccp",
  },
  QMS: {
    term: "QMS",
    expansion: "Quality Management System",
    definition:
      "The complete system of records, procedures and audits that proves your wine was made to spec — from grape intake through to bottling.",
  },
  APCO: {
    term: "APCO",
    expansion: "Australian Packaging Covenant Organisation",
    definition:
      "Federal packaging-stewardship regulator. Wineries above 5,000 cases/year must submit an annual APCO report on recyclability, recovery and labelling.",
    href: "/risk-glossary#apco",
  },
  AWRI: {
    term: "AWRI",
    expansion: "Australian Wine Research Institute",
    definition:
      "Adelaide-based industry research body. Publishes technical fact sheets on additions, faults, chemistry and best practice — the closest thing Australian wine has to an official rulebook.",
  },
  DTC: {
    term: "DTC",
    expansion: "Direct-to-Consumer",
    definition:
      "Selling wine straight to drinkers — cellar door, wine club, online — rather than through distributors or retailers. Higher margin, more compliance work.",
  },
  WET: {
    term: "WET",
    expansion: "Wine Equalisation Tax",
    definition:
      "Australian tax applied to wholesale wine sales. Producers below the threshold claim a rebate; over it, you remit each quarter with a matching schedule of batches.",
    href: "/risk-glossary#wet",
  },
  SO2: {
    term: "SO2",
    expansion: "Sulphur Dioxide",
    definition:
      "The primary antioxidant and antimicrobial addition in winemaking. Managed as 'free SO2' at bottling; regulated per FSANZ Standard 4.5.1.",
  },
  OIV: {
    term: "OIV",
    expansion: "Organisation Internationale de la Vigne et du Vin",
    definition:
      "Intergovernmental body headquartered in Paris. Sets the international reference standards Australian regulators (FSANZ, AWRI, Wine Australia) usually align with.",
  },
  FSANZ: {
    term: "FSANZ",
    expansion: "Food Standards Australia New Zealand",
    definition:
      "The bi-national regulator that maintains the Food Standards Code, including Standard 4.5.1 which governs additions, permitted maxima and labelling for wine.",
  },
  RAG: {
    term: "RAG",
    expansion: "Red / Amber / Green",
    definition:
      "Traffic-light status system on the Cellar Board. Red = act today; Amber = check this week; Green = tracking normally.",
  },
};

/** Case-insensitive lookup. Returns undefined if the acronym isn't
 *  in the glossary — components should render the raw string in that case
 *  rather than throwing. */
export function lookupAcronym(term: string): AcronymEntry | undefined {
  return ACRONYM_GLOSSARY[term.toUpperCase()];
}

/** Every acronym string, useful for auto-wrap regexes. Sorted longest-first
 *  so "HACCP" matches before "AC" (if we ever add short terms). */
export const ACRONYM_TERMS_SORTED: string[] = Object.keys(ACRONYM_GLOSSARY)
  .slice()
  .sort((a, b) => b.length - a.length);
