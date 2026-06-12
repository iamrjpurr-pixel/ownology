/**
 * Compliance Q&A Doctrine Map
 * ───────────────────────────────────────────────────────────────────────────
 * This file is the authoritative mapping of canonical compliance questions
 * to their answers and the exact source doctrine entries they draw from.
 *
 * PURPOSE:
 *   - Provides a grounding layer for the Compliance Assistant LLM.
 *   - Each entry maps a topic + question to a canonical answer and citations.
 *   - The LLM system prompt injects matching Q&A entries when a user's question
 *     aligns with a known topic, ensuring grounded, auditable responses.
 *   - This file is the single source of truth for compliance content — update
 *     here when regulations change, not in the raw knowledge base prose.
 *
 * STRUCTURE:
 *   Each QAEntry has:
 *     - id:          Unique stable identifier (kebab-case)
 *     - topic:       High-level topic area (used for grouping and filtering)
 *     - jurisdiction: "Federal" | "SA" | "VIC" | "NSW" | "WA" | "QLD" | "TAS" | "All"
 *     - question:    The canonical question (used for semantic matching)
 *     - keywords:    Additional terms that should trigger this entry
 *     - answer:      The canonical answer text (plain prose, no markdown)
 *     - citations:   Array of source doctrine references
 *     - lastVerified: ISO date when this entry was last checked against source
 *
 * MAINTENANCE:
 *   When the regulation monitor detects a new publication, review this file
 *   and update any affected entries. Bump lastVerified to today's date.
 *   Run `pnpm tsc --noEmit` to confirm no type errors after edits.
 */

export type QACitation = {
  /** Full act/standard name as it appears in SOURCE_DOCTRINE */
  title: string;
  /** Specific section, clause, or standard number */
  section: string | null;
  /** Jurisdiction */
  jurisdiction: "Federal" | "SA" | "VIC" | "NSW" | "WA" | "QLD" | "TAS";
  /** Official URL from SOURCE_DOCTRINE — never fabricated */
  url: string | null;
};

export type QAEntry = {
  id: string;
  topic: string;
  jurisdiction: "Federal" | "SA" | "VIC" | "NSW" | "WA" | "QLD" | "TAS" | "All";
  question: string;
  keywords: string[];
  answer: string;
  citations: QACitation[];
  lastVerified: string; // ISO date YYYY-MM-DD
};

// ─── TOPIC AREAS ─────────────────────────────────────────────────────────────
// 1. Producer Registration & Licensing
// 2. Cellar Door & On-Site Sales
// 3. Wine Labelling
// 4. Export Compliance
// 5. Food Safety & Additives
// 6. Wine Equalisation Tax (WET)
// 7. Work Health & Safety (WHS)
// 8. Environmental & Water
// 9. Biosecurity
// 10. Label Integrity Program (LIP)

export const QA_DOCTRINE: QAEntry[] = [

  // ═══════════════════════════════════════════════════════════════════════════
  // 1. PRODUCER REGISTRATION & LICENSING — FEDERAL
  // ═══════════════════════════════════════════════════════════════════════════

  {
    id: "fed-producer-registration",
    topic: "Producer Registration & Licensing",
    jurisdiction: "Federal",
    question: "Do I need to register as a wine producer with Wine Australia?",
    keywords: ["register", "wine producer", "Wine Australia", "registration", "producer number", "AWBI"],
    answer:
      "Yes. Any person or entity that produces wine in Australia for commercial sale must be registered with Wine Australia under the Wine Australia Act 2013. Registration is required before you can sell wine, claim the Wine Producer Rebate (WET rebate), or export wine. You apply online via the Wine Australia portal. There is no fee for initial registration. You must notify Wine Australia of any changes to your registration details within 28 days.",
    citations: [
      {
        title: "Wine Australia Act 2013",
        section: "Part 2 — Registration of wine producers",
        jurisdiction: "Federal",
        url: "https://www.legislation.gov.au/Details/C2022C00326",
      },
      {
        title: "Wine Australia Regulations 2018",
        section: "Part 1 (s.4 definitions); Part 2 (s.5–6 grape product and prescribed GI definitions)",
        jurisdiction: "Federal",
        url: "https://www.legislation.gov.au/current/F2018L00286",
      },
    ],
    lastVerified: "2026-05-01",
  },

  {
    id: "fed-wet-registration",
    topic: "Wine Equalisation Tax (WET)",
    jurisdiction: "Federal",
    question: "When do I need to register for Wine Equalisation Tax (WET)?",
    keywords: ["WET", "wine equalisation tax", "register WET", "ATO", "GST", "wholesale"],
    answer:
      "You must register for WET with the Australian Taxation Office (ATO) if your annual WET liability exceeds $1,000. WET is a 29% tax on the wholesale value of wine, applied at the last wholesale sale in Australia. Most boutique wineries selling direct to consumers are liable for WET on those sales. You register for WET through the ATO's Business Portal or via your tax agent. If you are already registered for GST, you can add WET registration to your existing registration.",
    citations: [
      {
        title: "A New Tax System (Wine Equalisation Tax) Act 1999",
        section: "Division 5 — Registration",
        jurisdiction: "Federal",
        url: "https://www.legislation.gov.au/Details/C2019C00052",
      },
    ],
    lastVerified: "2026-05-01",
  },

  {
    id: "fed-wet-rebate",
    topic: "Wine Equalisation Tax (WET)",
    jurisdiction: "Federal",
    question: "How much is the Wine Producer Rebate and who is eligible?",
    keywords: ["WET rebate", "wine producer rebate", "rebate cap", "$350,000", "$400,000", "eligible", "WET offset"],
    answer:
      "Eligible wine producers can claim a rebate of WET paid, up to a cap of $350,000 per financial year (rising to $400,000 from 1 July 2026). To be eligible you must: be an Australian resident; produce wine from grapes, honey, fruit, or vegetables; and sell the wine under your own brand or in bulk. You are ineligible if you are associated with another wine producer that has already claimed the full rebate, or if the wine is sold in bulk to another producer who will rebrand it. The rebate is claimed on your Business Activity Statement (BAS).",
    citations: [
      {
        title: "A New Tax System (Wine Equalisation Tax) Act 1999",
        section: "Division 19 — Wine producer rebate",
        jurisdiction: "Federal",
        url: "https://www.legislation.gov.au/Details/C2019C00052",
      },
    ],
    lastVerified: "2026-05-01",
  },

  // ═══════════════════════════════════════════════════════════════════════════
  // 2. CELLAR DOOR & ON-SITE SALES
  // ═══════════════════════════════════════════════════════════════════════════

  {
    id: "sa-cellar-door-licence",
    topic: "Cellar Door & On-Site Sales",
    jurisdiction: "SA",
    question: "What licences do I need to open a cellar door in South Australia?",
    keywords: ["cellar door", "licence", "South Australia", "SA", "CBS", "tasting", "on-site", "Class 2"],
    answer:
      "To operate a cellar door in South Australia you need a Producer's Licence — Class 2 from Consumer and Business Services (CBS) SA under the Liquor Licensing Act 1997 (SA). Class 2 permits on-site tastings and sales, and allows customers to consume wine on the premises. You will also need: (1) Development approval from your local council for the cellar door use; (2) RSA (Responsible Service of Alcohol) certification for all staff who serve alcohol; and (3) compliance with the Food Act 2001 (SA) if you serve food. The application is lodged via the Liquor and Gaming Online (LGO) portal. Application fees are approximately $1,000–$2,500 for a Class 2 licence.",
    citations: [
      {
        title: "Liquor Licensing Act 1997 (SA)",
        section: "Part 4 — Producer's Licence, Class 2",
        jurisdiction: "SA",
        url: "https://www.legislation.sa.gov.au/LZ/C/A/LIQUOR%20LICENSING%20ACT%201997.aspx",
      },
    ],
    lastVerified: "2026-05-01",
  },

  {
    id: "vic-cellar-door-licence",
    topic: "Cellar Door & On-Site Sales",
    jurisdiction: "VIC",
    question: "What licence do I need for a cellar door in Victoria?",
    keywords: ["cellar door", "licence", "Victoria", "VIC", "VCGLR", "producer", "tasting"],
    answer:
      "In Victoria, a cellar door requires a Producer's Licence from the Victorian Commission for Gambling and Liquor Regulation (VCGLR) under the Liquor Control Reform Act 1998 (VIC). The Producer's Licence allows on-site tastings and sales of wine produced at the premises. If you wish to sell wine produced by other Victorian producers, you may need an additional endorsement. You must also comply with local planning requirements — check with your council whether a planning permit is required for the cellar door use. RSA training is mandatory for all staff serving alcohol.",
    citations: [
      {
        title: "Liquor Control Reform Act 1998 (VIC)",
        section: "Part 3 — Producer's Licence",
        jurisdiction: "VIC",
        url: "https://www.legislation.vic.gov.au/in-force/acts/liquor-control-reform-act-1998",
      },
    ],
    lastVerified: "2026-05-01",
  },

  {
    id: "nsw-cellar-door-licence",
    topic: "Cellar Door & On-Site Sales",
    jurisdiction: "NSW",
    question: "What licence do I need for a cellar door in New South Wales?",
    keywords: ["cellar door", "licence", "New South Wales", "NSW", "Liquor & Gaming", "producer", "tasting"],
    answer:
      "In New South Wales, a cellar door requires a Producer/Wholesaler Licence from Liquor & Gaming NSW under the Liquor Act 2007 (NSW). This licence permits the sale and supply of liquor produced at the premises for consumption on or off the premises. A separate Small Bar Licence may be required if you operate a bar-style service. Planning approval from your local council is required before applying. All staff serving alcohol must hold a valid RSA competency card.",
    citations: [
      {
        title: "Liquor Act 2007 (NSW)",
        section: "Part 2 — Producer/Wholesaler Licence",
        jurisdiction: "NSW",
        url: "https://legislation.nsw.gov.au/view/html/inforce/current/act-2007-090",
      },
    ],
    lastVerified: "2026-05-01",
  },

  {
    id: "wa-cellar-door-licence",
    topic: "Cellar Door & On-Site Sales",
    jurisdiction: "WA",
    question: "What licence do I need for a cellar door in Western Australia?",
    keywords: ["cellar door", "licence", "Western Australia", "WA", "DLGSC", "producer", "tasting"],
    answer:
      "In Western Australia, a cellar door requires a Producer's Licence from the Department of Local Government, Sport and Cultural Industries (DLGSC) under the Liquor Control Act 1988 (WA). The Producer's Licence allows tastings and sales of wine produced on the premises. The 2025 amendments to the Act now permit acceptance of digital ID forms for age verification. Planning approval from your local council or the WAPC may be required. RSA training is mandatory for all staff.",
    citations: [
      {
        title: "Liquor Control Act 1988 (WA)",
        section: "Part 4 — Producer's Licence",
        jurisdiction: "WA",
        url: "https://www.legislation.wa.gov.au/legislation/statutes.nsf/main_mrtitle_540_homepage.html",
      },
    ],
    lastVerified: "2026-05-01",
  },

  {
    id: "qld-cellar-door-licence",
    topic: "Cellar Door & On-Site Sales",
    jurisdiction: "QLD",
    question: "What licence do I need for a cellar door in Queensland?",
    keywords: ["cellar door", "licence", "Queensland", "QLD", "OLGR", "producer", "tasting"],
    answer:
      "In Queensland, a cellar door requires a Producer/Wholesaler Licence from the Office of Liquor and Gaming Regulation (OLGR) under the Liquor Act 1992 (QLD). This licence permits on-site tastings and sales of wine produced at the premises. A separate approval may be required for events or extended trading hours. Planning approval from your local council is required. RSA training is mandatory for all staff serving alcohol.",
    citations: [
      {
        title: "Liquor Act 1992 (QLD)",
        section: "Part 4 — Producer/Wholesaler Licence",
        jurisdiction: "QLD",
        url: "https://www.legislation.qld.gov.au/view/html/inforce/current/act-1992-055",
      },
    ],
    lastVerified: "2026-05-01",
  },

  {
    id: "tas-cellar-door-licence",
    topic: "Cellar Door & On-Site Sales",
    jurisdiction: "TAS",
    question: "What licence do I need for a cellar door in Tasmania?",
    keywords: ["cellar door", "licence", "Tasmania", "TAS", "CBOS", "producer", "tasting"],
    answer:
      "In Tasmania, a cellar door requires a Producer's Licence from Consumer, Building and Occupational Services (CBOS) under the Liquor Licensing Act 1990 (TAS). This licence permits tastings and sales of wine produced at the premises. Planning approval from your local council is required. RSA training is mandatory for all staff serving alcohol.",
    citations: [
      {
        title: "Liquor Licensing Act 1990 (TAS)",
        section: "Part 3 — Producer's Licence",
        jurisdiction: "TAS",
        url: "https://www.legislation.tas.gov.au/view/html/inforce/current/act-1990-062",
      },
    ],
    lastVerified: "2026-05-01",
  },

  // ═══════════════════════════════════════════════════════════════════════════
  // 3. WINE LABELLING
  // ═══════════════════════════════════════════════════════════════════════════

  {
    id: "fed-label-mandatory-info",
    topic: "Wine Labelling",
    jurisdiction: "Federal",
    question: "What information is mandatory on an Australian wine label?",
    keywords: ["label", "mandatory", "labelling", "wine label", "requirements", "what must", "Food Standards Code"],
    answer:
      "Under the Food Standards Code — Standard 2.7.1 (Wine) and Standard 1.2 (Labelling), the following information is mandatory on an Australian domestic wine label: (1) Name of the food ('wine', 'red wine', 'sparkling wine', etc.); (2) Lot identification; (3) Name and address of the supplier (producer or importer); (4) Country of origin; (5) Net contents (volume in mL or L); (6) Alcohol content (% v/v, to one decimal place); (7) Standard drinks statement; (8) Allergen declaration — sulphites must be declared if present at 10 mg/kg or more (as 'contains sulphites' or 'contains sulfites'); (9) Pregnancy warning label (mandatory from 31 July 2023 under Standard 2.7.1 Amendment 2022). The Label Integrity Program (LIP) administered by Wine Australia requires that vintage, variety, and geographic indication claims on labels are substantiated by records.",
    citations: [
      {
        title: "Food Standards Code — Standard 2.7.1 (Wine)",
        section: "Standard 2.7.1 — Wine",
        jurisdiction: "Federal",
        url: "https://www.foodstandards.gov.au/food-standards-code",
      },
      {
        title: "Food Standards Code — Standard 1.2.1 (Labelling)",
        section: "Standard 1.2.1 — Requirements to have labels or otherwise provide information",
        jurisdiction: "Federal",
        url: "https://www.foodstandards.gov.au/food-standards-code",
      },
      {
        title: "Wine Australia Act 2013",
        section: "Part 5 — Label Integrity Program",
        jurisdiction: "Federal",
        url: "https://www.legislation.gov.au/Details/C2022C00326",
      },
    ],
    lastVerified: "2026-05-01",
  },

  {
    id: "fed-label-pregnancy-warning",
    topic: "Wine Labelling",
    jurisdiction: "Federal",
    question: "Is a pregnancy warning label required on wine?",
    keywords: ["pregnancy", "warning", "label", "pregnant", "alcohol warning", "mandatory", "2023"],
    answer:
      "Yes. A pregnancy warning label is mandatory on all packaged alcoholic beverages sold in Australia and New Zealand, including wine, from 31 July 2023 under an amendment to Food Standards Code Standard 2.7.1. The warning must use the approved graphic (a pregnant woman with a line through it) and the text 'Any amount of alcohol can harm your baby'. The label must appear on the front or back of the package and meet minimum size requirements. Existing stock produced before 31 July 2023 was permitted to be sold through until 30 June 2025.",
    citations: [
      {
        title: "Food Standards Code — Standard 2.7.1 (Wine)",
        section: "Standard 2.7.1 — Pregnancy warning label amendment 2022",
        jurisdiction: "Federal",
        url: "https://www.foodstandards.gov.au/food-standards-code",
      },
    ],
    lastVerified: "2026-05-01",
  },

  {
    id: "fed-label-sulphites",
    topic: "Wine Labelling",
    jurisdiction: "Federal",
    question: "Do I need to declare sulphites on my wine label?",
    keywords: ["sulphites", "sulfites", "SO2", "allergen", "label", "declare", "10 mg/kg"],
    answer:
      "Yes. Sulphites (sulfur dioxide and sulfites) must be declared on the wine label if present at 10 mg/kg (10 ppm) or more. The declaration must appear as 'contains sulphites' or 'contains sulfites'. This is an allergen declaration requirement under Food Standards Code Standard 1.2.3. Most commercially produced wines contain sulphites well above this threshold, so the declaration is almost universally required. The declaration must be clearly legible and not obscured.",
    citations: [
      {
        title: "Food Standards Code — Standard 1.2.3 (Mandatory Warning Statements)",
        section: "Standard 1.2.3 — Mandatory warning and advisory statements and declarations",
        jurisdiction: "Federal",
        url: "https://www.foodstandards.gov.au/food-standards-code",
      },
    ],
    lastVerified: "2026-05-01",
  },

  {
    id: "fed-label-gi-variety-vintage",
    topic: "Wine Labelling",
    jurisdiction: "Federal",
    question: "What are the rules for claiming a vintage, variety, or geographic indication on a label?",
    keywords: ["vintage", "variety", "geographic indication", "GI", "region", "label claim", "85%", "850ml", "Label Integrity", "LIP"],
    answer:
      "The precise thresholds are set by the Wine Australia Regulations 2018 (F2018L00286), Parts 4 and 5, made under the Wine Australia Act 2013.\n\n" +
      "VINTAGE (s.27 of the Regulations): Wine may be labelled as a single vintage if at least 850 mL/L (85%) is obtained from grapes harvested in that vintage. If wine is made from multiple vintages and any vintage is mentioned on the label, ALL vintages must be listed in descending order of proportion. For fortified wine, volume is calculated exclusive of added grape spirit or brandy.\n\n" +
      "GRAPE VARIETY (s.25): Variety names must be recognised by OIV, UPOV, or IPGRI. Single variety claim: at least 850 mL/L (85%) must be from that variety. Multi-variety blend: varieties listed in descending order; each named variety must be present in greater proportion than any unnamed variety; in total at least 850 mL/L (85%) must come from the named varieties. Sweetening products and microorganism cultures up to 50 mL/L are excluded from calculations.\n\n" +
      "GEOGRAPHICAL INDICATION — Single Australian GI (s.26(2)): at least 850 mL/L (85%) must come from grapes grown in the GI region.\n\n" +
      "GEOGRAPHICAL INDICATION — Multiple GIs (s.26(4)–(5)): when 2 or 3 registered GIs are used (at least one Australian), total from all named GIs must be at least 950 mL/L (95%); at least 50 mL/L from each GI; listed in descending order.\n\n" +
      "MAXIMUM GIs ON A LABEL (s.26(1)): no more than 3 registered GIs and foreign place names in total on any label.\n\n" +
      "MULTI-COUNTRY WINE (s.24): if wine is made from grapes grown in more than one country, the label must identify the proportion from each country (grape-derived additives up to 20 mL/L excluded).\n\n" +
      "LIP RECORDS: must be retained for 5 years and include grape receival records, tank/barrel movement records, blending records, and bottling records. Wine Australia may request records to verify any label claim.",
    citations: [
      {
        title: "Wine Australia Regulations 2018",
        section: "s.24 (multi-country), s.25 (variety), s.26 (GI), s.27 (vintage) — Part 4 Description and Presentation of Wine",
        jurisdiction: "Federal",
        url: "https://www.legislation.gov.au/current/F2018L00286",
      },
      {
        title: "Wine Australia Act 2013",
        section: "s.39F — Label Integrity Program record-keeping; s.40F — Description and presentation requirements",
        jurisdiction: "Federal",
        url: "https://www.legislation.gov.au/Details/C2022C00326",
      },
    ],
    lastVerified: "2026-06-12",
  },

  // ═══════════════════════════════════════════════════════════════════════════
  // 4. EXPORT COMPLIANCE
  // ═══════════════════════════════════════════════════════════════════════════

  {
    id: "fed-export-licence",
    topic: "Export Compliance",
    jurisdiction: "Federal",
    question: "What do I need to export wine from Australia?",
    keywords: ["export", "licence", "Wine Australia", "export permit", "certificate", "overseas", "international", "export conditions"],
    answer:
      "Under the Wine Australia Regulations 2018 (F2018L00286), Part 3, the export of any grape product consignment is prohibited unless ALL of the following conditions are met (s.7):\n\n" +
      "1. You hold a current Wine Australia export licence (s.9). Apply to Wine Australia in the approved form. The licence is granted for up to 3 years and may be extended in further periods of up to 3 years (s.11). Wine Australia assesses financial standing, Australian place of business, ability to source Australian grape products, and whether you are a fit and proper person.\n\n" +
      "2. The specific grape product is approved for export by you under s.14. You must apply separately for each product. Wine Australia must be satisfied the product: complies with the Australia New Zealand Food Standards Code (or any non-compliance will not compromise Australian grape product reputation); is sound and merchantable; and has appropriate description and presentation under Australian and destination-country laws.\n\n" +
      "3. A current export certificate for the consignment is in force (s.20). Application must be lodged at least 5 days before the export date, identifying the export date, destination country, and consignee. Wine Australia must issue or refuse before the export date. Wine Australia must refuse if it reasonably believes the product cannot lawfully be sold in the destination country.\n\n" +
      "4. If Wine Australia has issued a quantity direction (s.22), the export complies with it.\n\n" +
      "EXEMPTIONS (s.8): The export licence/approval/certificate requirements do NOT apply to: consignments of 100 litres or less; traveller's personal luggage; house-moving wine for domestic use; trade fair display samples; scientific/technical purpose exports; diplomatic duty-free allowances; victualling supplies; or commercial samples for a prospective buyer.\n\n" +
      "REVIEW: Refusals and adverse decisions are reviewable by the Administrative Appeals Tribunal (s.23).",
    citations: [
      {
        title: "Wine Australia Regulations 2018",
        section: "Part 3 — Export controls (ss.7–23): conditions, exemptions, licences, product approvals, export certificates, quantity directions, AAT review",
        jurisdiction: "Federal",
        url: "https://www.legislation.gov.au/current/F2018L00286",
      },
      {
        title: "Wine Australia Act 2013",
        section: "s.46 — Export offence; Part 3 — Export licensing",
        jurisdiction: "Federal",
        url: "https://www.legislation.gov.au/Details/C2022C00326",
      },
    ],
    lastVerified: "2026-06-12",
  },

  {
    id: "fed-export-product-approval",
    topic: "Export Compliance",
    jurisdiction: "Federal",
    question: "How do I get a grape product approved for export by Wine Australia?",
    keywords: ["export approval", "product approval", "approved grape product", "s.14", "sound merchantable", "export label"],
    answer:
      "Under s.14 of the Wine Australia Regulations 2018 (F2018L00286), a licensee must apply to Wine Australia (in the approved form) for each grape product to be approved for export.\n\n" +
      "Wine Australia may approve the product if satisfied that: (a) it complies with the Australia New Zealand Food Standards Code, or any non-compliance will not compromise the reputation of Australian grape products; (b) it is sound and merchantable; and (c) its description and presentation is appropriate under the Act, Australian laws, and the laws of the destination country.\n\n" +
      "RESTRICTION: Wine Australia must NOT approve a non-wine/brandy/grape spirit product if its label uses a registered GI other than 'Australia' or a registered translation (s.14(4)).\n\n" +
      "CONDITIONS: Approval may be subject to conditions, including country-specific restrictions (e.g. approved only for export to specified countries).\n\n" +
      "AUTHORISING OTHERS: An approval holder may authorise another licensee in writing to export the same product (s.15). The authorised licensee cannot further sub-authorise.\n\n" +
      "INFORMATION REQUESTS: Wine Australia may request records demonstrating Food Standards Code compliance, soundness and merchantability, or copies of LIP records to verify label claims (s.16). Failure to comply triggers mandatory suspension of the approval (s.17).",
    citations: [
      {
        title: "Wine Australia Regulations 2018",
        section: "ss.14–17 — Division 3: Approved grape products",
        jurisdiction: "Federal",
        url: "https://www.legislation.gov.au/current/F2018L00286",
      },
    ],
    lastVerified: "2026-06-12",
  },

  {
    id: "fed-export-certificate",
    topic: "Export Compliance",
    jurisdiction: "Federal",
    question: "How do I obtain an export certificate for a wine shipment?",
    keywords: ["export certificate", "export permit", "shipment", "consignment", "5 days", "s.18", "s.20"],
    answer:
      "Under the Wine Australia Regulations 2018 (F2018L00286), ss.18–21, a licensee must apply for an export certificate for each consignment.\n\n" +
      "APPLICATION (s.18): Must be lodged at least 5 days before the export date, in the form approved by Wine Australia. The application must identify: (a) the export date; (b) the destination country; and (c) the consignee.\n\n" +
      "ISSUE (s.20): Wine Australia must issue or refuse before the export date. Wine Australia may issue if satisfied that: the product is approved for export by the licensee; any approval conditions would be met; any labelling compliance information requested under s.19 has been provided; and any quantity direction would be complied with.\n\n" +
      "REFUSAL (s.20(4)): Wine Australia must refuse if it reasonably believes the product cannot lawfully be sold in the destination country, or if the licensee fails to provide requested compliance information.\n\n" +
      "INFORMATION REQUESTS (s.19): Wine Australia may ask the licensee to demonstrate compliance with Australian labelling laws (e.g. organic certification) at least 2 days before the export date.\n\n" +
      "REVOCATION (s.21): Wine Australia may revoke an export certificate if the export no longer meets the conditions under s.20(2).",
    citations: [
      {
        title: "Wine Australia Regulations 2018",
        section: "ss.18–21 — Division 4: Export certificates",
        jurisdiction: "Federal",
        url: "https://www.legislation.gov.au/current/F2018L00286",
      },
    ],
    lastVerified: "2026-06-12",
  },

  // ═══════════════════════════════════════════════════════════════════════════
  // 5. FOOD SAFETY & ADDITIVES
  // ═══════════════════════════════════════════════════════════════════════════

  {
    id: "fed-permitted-additives",
    topic: "Food Safety & Additives",
    jurisdiction: "Federal",
    question: "What additives are permitted in Australian wine production?",
    keywords: ["additives", "permitted", "SO2", "sulphur dioxide", "fining agents", "oak", "tartaric", "bentonite", "Standard 4.5.1"],
    answer:
      "Permitted additives and processing aids for wine are listed in Food Standards Code Standard 4.5.1 (Primary Production and Processing Standard for Wine). Key permitted additives include: sulphur dioxide (SO₂) up to 300 mg/L for red wine and 400 mg/L for white/rosé wine (lower limits for wines labelled 'low sulphite'); tartaric acid (acidification); calcium carbonate and potassium bicarbonate (de-acidification); bentonite (fining); oak chips and staves; yeast and yeast nutrients (DAP, thiamine); copper sulfate (up to 1 mg/L in final wine for H₂S removal); and various other permitted fining agents. Water addition is permitted only for diluting high-sugar must (not below 13.5° Brix) or incidentally; total added water must not exceed 70 mL/L (7%) of final wine volume. Any additive not listed in Standard 4.5.1 is not permitted without a specific approval from FSANZ.",
    citations: [
      {
        title: "Food Standards Code — Standard 4.5.1 (Wine)",
        section: "Standard 4.5.1 — Primary Production and Processing Standard for Wine",
        jurisdiction: "Federal",
        url: "https://www.foodstandards.gov.au/food-standards-code",
      },
    ],
    lastVerified: "2026-05-01",
  },

  {
    id: "fed-food-business-registration",
    topic: "Food Safety & Additives",
    jurisdiction: "Federal",
    question: "Do wineries need to register as a food business?",
    keywords: ["food business", "register", "food premises", "council", "food safety", "Standard 3.2.2", "food safety management"],
    answer:
      "Yes. Wineries are classified as food businesses under the Food Standards Code and must register with the relevant local council as a food premises under Standard 3.2.2 (Food Safety Practices and General Requirements) and Standard 3.2.3 (Food Premises and Equipment). Registration is required before commencing production. From December 2023, Standard 3.2.2A may require a food safety management system depending on the winery's classification and activities (particularly if you serve food at a cellar door). Contact your local council to confirm registration requirements and whether a food safety management system is required for your operation.",
    citations: [
      {
        title: "Food Standards Code — Standard 3.2.2 (Food Safety Practices)",
        section: "Standard 3.2.2 — Food safety practices and general requirements",
        jurisdiction: "Federal",
        url: "https://www.foodstandards.gov.au/food-standards-code",
      },
      {
        title: "Food Standards Code — Standard 3.2.3 (Food Premises)",
        section: "Standard 3.2.3 — Food premises and equipment",
        jurisdiction: "Federal",
        url: "https://www.foodstandards.gov.au/food-standards-code",
      },
    ],
    lastVerified: "2026-05-01",
  },

  // ═══════════════════════════════════════════════════════════════════════════
  // 6. WORK HEALTH & SAFETY
  // ═══════════════════════════════════════════════════════════════════════════

  {
    id: "fed-whs-co2",
    topic: "Work Health & Safety",
    jurisdiction: "Federal",
    question: "What are the CO2 safety requirements during fermentation?",
    keywords: ["CO2", "carbon dioxide", "fermentation", "confined space", "WHS", "SafeWork", "monitoring", "dangerous"],
    answer:
      "Fermentation produces dangerous levels of carbon dioxide (CO₂), which can rapidly displace oxygen in enclosed spaces and cause asphyxiation. Under the Model WHS Act and Regulations (adopted in SA as the Work Health and Safety Act 2012 (SA)), wineries must: (1) Identify all confined spaces where CO₂ may accumulate (fermentation tanks, underground cellars, enclosed areas near active ferments); (2) Implement a confined space management program including atmospheric testing before entry; (3) Provide CO₂ monitoring equipment (fixed or portable gas detectors) in areas where fermentation is occurring; (4) Ensure adequate ventilation; (5) Establish a permit-to-enter system for confined spaces; (6) Train all workers who may enter or work near confined spaces. CO₂ concentrations above 0.5% (5,000 ppm) are hazardous; above 10% are immediately dangerous to life. Never enter a fermenting tank without atmospheric testing and appropriate PPE.",
    citations: [
      {
        title: "Work Health and Safety Act 2012 (SA)",
        section: "Part 2 — Health and safety duties; Confined Spaces Code of Practice",
        jurisdiction: "SA",
        url: "https://www.legislation.sa.gov.au/LZ/C/A/WORK%20HEALTH%20AND%20SAFETY%20ACT%202012.aspx",
      },
    ],
    lastVerified: "2026-05-01",
  },

  {
    id: "fed-whs-so2",
    topic: "Work Health & Safety",
    jurisdiction: "Federal",
    question: "What are the WHS requirements for handling SO2 (sulphur dioxide) in the winery?",
    keywords: ["SO2", "sulphur dioxide", "sulfur dioxide", "chemical", "WHS", "handling", "safety", "PPE", "exposure limit"],
    answer:
      "Sulphur dioxide (SO₂) is a hazardous chemical requiring careful management under the Model WHS Act and Regulations. Key obligations: (1) Safety Data Sheet (SDS) must be obtained and kept accessible for all SO₂ products used; (2) Exposure standard: the 8-hour time-weighted average (TWA) is 2 ppm; the short-term exposure limit (STEL) is 5 ppm; (3) Adequate ventilation must be provided in areas where SO₂ is used or stored; (4) PPE: chemical-resistant gloves, eye protection, and respiratory protection (appropriate respirator cartridge for SO₂) must be provided and worn when handling concentrated SO₂ solutions or gas; (5) Emergency procedures: eyewash stations and first aid equipment must be accessible; (6) Storage: SO₂ cylinders must be stored upright, secured, and away from heat sources; (7) Workers must be trained in safe handling procedures. Contact SafeWork SA (or the relevant state authority) for winery-specific guidance.",
    citations: [
      {
        title: "Work Health and Safety Act 2012 (SA)",
        section: "Part 2 — Hazardous chemicals; WHS Regulations — Schedule 1 (Exposure standards)",
        jurisdiction: "SA",
        url: "https://www.legislation.sa.gov.au/LZ/C/A/WORK%20HEALTH%20AND%20SAFETY%20ACT%202012.aspx",
      },
    ],
    lastVerified: "2026-05-01",
  },

  // ═══════════════════════════════════════════════════════════════════════════
  // 7. ENVIRONMENTAL & WATER
  // ═══════════════════════════════════════════════════════════════════════════

  {
    id: "sa-wastewater",
    topic: "Environmental & Water",
    jurisdiction: "SA",
    question: "How must I manage winery wastewater in South Australia?",
    keywords: ["wastewater", "winery waste", "marc", "lees", "EPA", "discharge", "environment", "South Australia", "SA"],
    answer:
      "Winery wastewater (wash water, grape marc, lees, and other winery effluent) must be managed under the Environment Protection Act 1993 (SA) and the EPA SA's Winery and Distillery Wastewater guidelines. Key requirements: (1) Discharge to land: permitted under an EPA licence if volumes exceed prescribed thresholds; must comply with soil application rates and setback distances from waterways; (2) Discharge to waterways: generally prohibited without an EPA licence; (3) Irrigation of wastewater: must comply with soil application rates and nutrient loading limits; (4) Large wineries (prescribed activities): require an Environment Protection Licence (EPL) from EPA SA; (5) All wineries must manage wastewater to prevent odour, pest attraction, and groundwater contamination. Contact EPA SA for the current Winery and Distillery Wastewater guidelines and to determine whether your operation requires an EPL.",
    citations: [
      {
        title: "Environment Protection Act 1993 (SA)",
        section: "Part 7 — Environment Protection Licences; Winery and Distillery Wastewater EPA guidelines",
        jurisdiction: "SA",
        url: "https://www.legislation.sa.gov.au/LZ/C/A/ENVIRONMENT%20PROTECTION%20ACT%201993.aspx",
      },
    ],
    lastVerified: "2026-05-01",
  },

  // ═══════════════════════════════════════════════════════════════════════════
  // 7b. WHS — STATE-SPECIFIC (WA, QLD, TAS, VIC, NSW)
  // ═══════════════════════════════════════════════════════════════════════════

  {
    id: "wa-whs",
    topic: "Work Health & Safety",
    jurisdiction: "WA",
    question: "What are the WHS obligations for a winery in Western Australia?",
    keywords: ["WHS", "work health", "safety", "WorkSafe", "WA", "Western Australia", "confined space", "CO2", "SO2"],
    answer:
      "Western Australia adopted the Model WHS Act as the Work Health and Safety Act 2020 (WA), administered by WorkSafe WA. Key obligations for wineries: (1) PCBU duty to eliminate or minimise risks so far as reasonably practicable; (2) Confined space management for fermentation tanks and underground cellars — entry permits, atmospheric testing for CO2, and rescue procedures are mandatory; (3) CO2 monitoring during fermentation — CO2 can reach lethal concentrations in enclosed spaces; (4) Manual handling risk management for barrels and cases; (5) Chemical handling procedures for SO2, tartaric acid, and cleaning chemicals under the WHS (Hazardous Chemicals) Regulations; (6) Working at heights procedures for tank access; (7) Incident reporting — serious injuries, dangerous incidents, and deaths must be notified to WorkSafe WA immediately. Note: WA adopted the Model WHS Act in 2020, later than all other states — if your business previously operated under the Occupational Safety and Health Act 1984 (WA), ensure your systems have been updated to the 2020 Act requirements.",
    citations: [
      {
        title: "Work Health and Safety Act 2020 (WA)",
        section: "Part 2 — Health and safety duties",
        jurisdiction: "WA",
        url: "https://www.legislation.wa.gov.au/legislation/statutes.nsf/main_mrtitle_14082_homepage.html",
      },
    ],
    lastVerified: "2026-05-01",
  },

  {
    id: "wa-wastewater",
    topic: "Environmental",
    jurisdiction: "WA",
    question: "What are the wastewater and environmental discharge requirements for a winery in Western Australia?",
    keywords: ["wastewater", "discharge", "environment", "WA", "Western Australia", "DWER", "EPA", "licence"],
    answer:
      "In Western Australia, winery wastewater discharge is regulated by the Department of Water and Environmental Regulation (DWER) under the Environmental Protection Act 1986 (WA). Key requirements: (1) A works approval and operating licence from DWER is required for any discharge of winery wastewater to land or water; (2) Discharge to land (irrigation) must comply with DWER guidelines for winery wastewater — typically requires a nutrient management plan and setback distances from waterways; (3) Discharge to sewer requires a trade waste agreement with the relevant water utility (Water Corporation in most of WA); (4) Wineries in the Swan Valley and Margaret River regions may have additional local planning and environmental requirements; (5) Groundwater extraction requires a licence from DWER; (6) Non-compliance can result in significant penalties under the Environmental Protection Act 1986.",
    citations: [
      {
        title: "Environmental Protection Act 1986 (WA)",
        section: "Part V — Environmental Protection (Noise) Regulations; works approvals and licences",
        jurisdiction: "WA",
        url: "https://www.legislation.wa.gov.au/legislation/statutes.nsf/main_mrtitle_304_homepage.html",
      },
    ],
    lastVerified: "2026-05-01",
  },

  {
    id: "wa-planning",
    topic: "Planning",
    jurisdiction: "WA",
    question: "What planning approvals does a winery in Western Australia need?",
    keywords: ["planning", "development approval", "WA", "Western Australia", "WAPC", "cellar door", "Margaret River", "Swan Valley"],
    answer:
      "In Western Australia, winery and cellar door development is regulated under the Planning and Development Act 2005 (WA) and administered by local councils and the Western Australian Planning Commission (WAPC). Key requirements: (1) Development approval from the local council is required for new winery buildings, cellar doors, and significant expansions; (2) In rural zones, a change of use approval may be required to operate a cellar door or function centre; (3) Margaret River region: the Shire of Augusta-Margaret River has specific local planning policies for wineries and cellar doors — check the Local Planning Policy for Winery and Cellar Door Development; (4) Swan Valley: the Swan Valley Planning Act 1995 applies — development must be consistent with the Swan Valley Planning Scheme; (5) Event activities at wineries may require a separate development approval or a planning permit; (6) Significant expansions require a development application to the local council, potentially with referral to WAPC.",
    citations: [
      {
        title: "Planning and Development Act 2005 (WA)",
        section: "Part 10 — Development applications",
        jurisdiction: "WA",
        url: "https://www.legislation.wa.gov.au/legislation/statutes.nsf/main_mrtitle_1412_homepage.html",
      },
    ],
    lastVerified: "2026-05-01",
  },

  {
    id: "qld-whs",
    topic: "Work Health & Safety",
    jurisdiction: "QLD",
    question: "What are the WHS obligations for a winery in Queensland?",
    keywords: ["WHS", "work health", "safety", "WHSQ", "QLD", "Queensland", "confined space", "CO2", "SO2"],
    answer:
      "Queensland adopted the Model WHS Act as the Work Health and Safety Act 2011 (QLD), administered by Workplace Health and Safety Queensland (WHSQ). Key obligations for wineries: (1) PCBU duty to eliminate or minimise risks so far as reasonably practicable; (2) Confined space management for fermentation tanks — entry permits, atmospheric testing for CO2, and rescue procedures are mandatory; (3) CO2 monitoring during fermentation — CO2 can reach lethal concentrations in enclosed spaces; (4) Manual handling risk management for barrels and cases; (5) Chemical handling procedures for SO2 and cleaning chemicals under the WHS (Hazardous Chemicals) Regulations; (6) Working at heights procedures for tank access; (7) Incident reporting — serious injuries, dangerous incidents, and deaths must be notified to WHSQ immediately. The Granite Belt wine region (Stanthorpe area) is subject to the same QLD WHS Act requirements as all other QLD wineries.",
    citations: [
      {
        title: "Work Health and Safety Act 2011 (QLD)",
        section: "Part 2 — Health and safety duties",
        jurisdiction: "QLD",
        url: "https://www.legislation.qld.gov.au/view/html/inforce/current/act-2011-018",
      },
    ],
    lastVerified: "2026-05-01",
  },

  {
    id: "qld-wastewater",
    topic: "Environmental",
    jurisdiction: "QLD",
    question: "What are the wastewater and environmental discharge requirements for a winery in Queensland?",
    keywords: ["wastewater", "discharge", "environment", "QLD", "Queensland", "DES", "EPA", "licence"],
    answer:
      "In Queensland, winery wastewater discharge is regulated by the Department of Environment and Science (DES) under the Environmental Protection Act 1994 (QLD). Key requirements: (1) An environmental authority (EA) from DES is required for any discharge of winery wastewater to land or water above threshold volumes; (2) Discharge to land (irrigation) must comply with DES guidelines — typically requires a nutrient management plan and setback distances from waterways; (3) Discharge to sewer requires a trade waste agreement with the relevant local water utility; (4) Wineries in the Granite Belt region should check with the Southern Downs Regional Council and DES for specific local requirements; (5) Water extraction (irrigation) requires a water licence from the Department of Regional Development, Manufacturing and Water; (6) Non-compliance can result in significant penalties under the Environmental Protection Act 1994.",
    citations: [
      {
        title: "Environmental Protection Act 1994 (QLD)",
        section: "Chapter 4 — Environmental authorities; Chapter 5 — Environmental obligations",
        jurisdiction: "QLD",
        url: "https://www.legislation.qld.gov.au/view/html/inforce/current/act-1994-062",
      },
    ],
    lastVerified: "2026-05-01",
  },

  {
    id: "qld-planning",
    topic: "Planning",
    jurisdiction: "QLD",
    question: "What planning approvals does a winery in Queensland need?",
    keywords: ["planning", "development approval", "QLD", "Queensland", "Granite Belt", "cellar door", "material change of use"],
    answer:
      "In Queensland, winery and cellar door development is regulated under the Planning Act 2016 (QLD) and administered by local councils. Key requirements: (1) A development approval (material change of use) from the local council is required for new winery buildings, cellar doors, and significant expansions; (2) In rural zones, a material change of use approval is required to operate a cellar door or function centre; (3) Granite Belt region: the Southern Downs Regional Council has specific planning overlays for wineries — check the Southern Downs Regional Council Planning Scheme; (4) Scenic Rim region: the Scenic Rim Regional Council Planning Scheme applies; (5) Event activities at wineries may require a separate development approval; (6) Significant expansions require a development application to the local council. The Planning Act 2016 replaced the Sustainable Planning Act 2009 — ensure your approvals reference the current Act.",
    citations: [
      {
        title: "Planning Act 2016 (QLD)",
        section: "Chapter 3 — Development assessment",
        jurisdiction: "QLD",
        url: "https://www.legislation.qld.gov.au/view/html/inforce/current/act-2016-025",
      },
    ],
    lastVerified: "2026-05-01",
  },

  {
    id: "tas-whs",
    topic: "Work Health & Safety",
    jurisdiction: "TAS",
    question: "What are the WHS obligations for a winery in Tasmania?",
    keywords: ["WHS", "work health", "safety", "WorkSafe Tasmania", "TAS", "Tasmania", "confined space", "CO2", "SO2"],
    answer:
      "Tasmania adopted the Model WHS Act as the Work Health and Safety Act 2012 (TAS), administered by WorkSafe Tasmania. Key obligations for wineries: (1) PCBU duty to eliminate or minimise risks so far as reasonably practicable; (2) Confined space management for fermentation tanks and underground cellars — entry permits, atmospheric testing for CO2, and rescue procedures are mandatory; (3) CO2 monitoring during fermentation — CO2 can reach lethal concentrations in enclosed spaces; (4) Manual handling risk management for barrels and cases; (5) Chemical handling procedures for SO2 and cleaning chemicals under the WHS (Hazardous Chemicals) Regulations; (6) Working at heights procedures for tank access; (7) Incident reporting — serious injuries, dangerous incidents, and deaths must be notified to WorkSafe Tasmania immediately. Tasmania's wine regions (Derwent Valley, Huon Valley, Coal River Valley, Tamar Valley) are all subject to the same TAS WHS Act requirements.",
    citations: [
      {
        title: "Work Health and Safety Act 2012 (TAS)",
        section: "Part 2 — Health and safety duties",
        jurisdiction: "TAS",
        url: "https://www.legislation.tas.gov.au/view/html/inforce/current/act-2012-001",
      },
    ],
    lastVerified: "2026-05-01",
  },

  {
    id: "tas-wastewater",
    topic: "Environmental",
    jurisdiction: "TAS",
    question: "What are the wastewater and environmental discharge requirements for a winery in Tasmania?",
    keywords: ["wastewater", "discharge", "environment", "TAS", "Tasmania", "EPA", "licence"],
    answer:
      "In Tasmania, winery wastewater discharge is regulated by the Environment Protection Authority (EPA Tasmania) under the Environmental Management and Pollution Control Act 1994 (TAS). Key requirements: (1) An environment protection notice or permit from EPA Tasmania is required for any discharge of winery wastewater to land or water above threshold volumes; (2) Discharge to land (irrigation) must comply with EPA Tasmania guidelines — typically requires a nutrient management plan and setback distances from waterways; (3) Discharge to sewer requires a trade waste agreement with TasWater; (4) Wineries in the Derwent Valley and Huon Valley should check with the relevant council and EPA Tasmania for specific local requirements; (5) Water extraction (irrigation) requires a water licence from NRE Tasmania; (6) Non-compliance can result in significant penalties under the Environmental Management and Pollution Control Act 1994.",
    citations: [
      {
        title: "Environmental Management and Pollution Control Act 1994 (TAS)",
        section: "Part 5 — Environmental licences and permits",
        jurisdiction: "TAS",
        url: "https://www.legislation.tas.gov.au/view/html/inforce/current/act-1994-044",
      },
    ],
    lastVerified: "2026-05-01",
  },

  {
    id: "tas-planning",
    topic: "Planning",
    jurisdiction: "TAS",
    question: "What planning approvals does a winery in Tasmania need?",
    keywords: ["planning", "development approval", "TAS", "Tasmania", "cellar door", "planning permit", "Tasmanian Planning Scheme"],
    answer:
      "In Tasmania, winery and cellar door development is regulated under the Land Use Planning and Approvals Act 1993 (TAS) and the Tasmanian Planning Scheme (TPS), which applies statewide from 2022. Key requirements: (1) A planning permit from the local council is required for new winery buildings, cellar doors, and significant expansions; (2) In rural resource zones, wineries are typically a permitted or discretionary use — check the specific zone provisions in the TPS; (3) Derwent Valley: the Derwent Valley Council Planning Scheme applies; (4) Huon Valley: the Huon Valley Council Planning Scheme applies; (5) Coal River Valley: the Clarence City Council Planning Scheme applies; (6) Event activities at wineries may require a separate planning permit; (7) The TPS replaced individual council planning schemes from 2022 — ensure your approvals reference the current TPS provisions.",
    citations: [
      {
        title: "Land Use Planning and Approvals Act 1993 (TAS)",
        section: "Part 3 — Planning schemes; Tasmanian Planning Scheme",
        jurisdiction: "TAS",
        url: "https://www.legislation.tas.gov.au/view/html/inforce/current/act-1993-070",
      },
    ],
    lastVerified: "2026-05-01",
  },

  // ═══════════════════════════════════════════════════════════════════════════
  // 8. BIOSECURITY
  // ═══════════════════════════════════════════════════════════════════════════

  {
    id: "fed-phylloxera",
    topic: "Biosecurity",
    jurisdiction: "Federal",
    question: "What are the biosecurity rules for moving grapevine material between states?",
    keywords: ["phylloxera", "grapevine", "biosecurity", "interstate", "movement", "cuttings", "rootlings", "DAFF"],
    answer:
      "Interstate movement of grapevine material (vines, cuttings, rootlings, budwood) is strictly regulated to prevent the spread of phylloxera and other vine diseases. Key requirements: (1) All plant material must comply with state and federal biosecurity requirements before interstate movement; (2) A phylloxera risk assessment and/or a Plant Health Assurance Certificate (PHAC) is required for most interstate movements; (3) Some states (notably Victoria and SA) have phylloxera exclusion zones — movement into these zones is heavily restricted; (4) Contact the relevant state biosecurity authority (e.g. PIRSA in SA, Agriculture Victoria) before moving any grapevine material; (5) Imported grapevine material from overseas must comply with Australian biosecurity import conditions administered by DAFF and must be accompanied by appropriate phytosanitary certificates.",
    citations: [
      {
        title: "Biosecurity Act 2015 (Federal)",
        section: "Part 3 — Biosecurity measures; DAFF Grapevine import conditions",
        jurisdiction: "Federal",
        url: "https://www.legislation.gov.au/Details/C2022C00148",
      },
    ],
    lastVerified: "2026-05-01",
  },

  // ═══════════════════════════════════════════════════════════════════════════
  // 9. NEW ZEALAND
  // ═══════════════════════════════════════════════════════════════════════════

  {
    id: "nz-wsmp",
    topic: "Winemaking Registration",
    jurisdiction: "Federal",
    question: "Do I need a licence or registration to make wine in New Zealand?",
    keywords: ["NZ", "New Zealand", "WSMP", "Wine Standards Management Plan", "MPI", "register", "licence", "winemaker"],
    answer:
      "In New Zealand, there is no winemaking licence as such. Instead, all winemakers making wine for trade or retail sale must register a Wine Standards Management Plan (WSMP) with the Ministry for Primary Industries (MPI) before commencing production. The WSMP is the primary compliance mechanism under the Wine Act 2003 (NZ). Key requirements: (1) The WSMP must be registered with MPI before you start making wine for sale; (2) The WSMP must be annually verified (audited) by an MPI-approved verifier; (3) The WSMP must include: a WSMP outline, the NZ Winegrowers Code of Practice, a HACCP plan, a winery site plan, and records; (4) Contract winemakers must ensure WSMP records are maintained; (5) Non-compliance must be reported to MPI within 24 hours of discovery; (6) Exemption: winemakers producing fewer than 20,000 litres over a two-year period AND not exporting may apply to MPI for an exemption from full WSMP registration. Contact MPI Wine at mpi.govt.nz for registration forms and current WSMP templates.",
    citations: [
      {
        title: "Wine Act 2003 (NZ)",
        section: "Part 2 — Wine standards management plans; ss.9-25",
        jurisdiction: "Federal",
        url: "https://www.legislation.govt.nz/act/public/2003/0114/latest/whole.html",
      },
    ],
    lastVerified: "2026-05-01",
  },

  {
    id: "nz-cellar-door",
    topic: "Licensing",
    jurisdiction: "Federal",
    question: "What licences do I need to open a cellar door in New Zealand?",
    keywords: ["NZ", "New Zealand", "cellar door", "licence", "on-licence", "off-licence", "ARLA", "Sale and Supply of Alcohol"],
    answer:
      "In New Zealand, cellar door operations require licences under the Sale and Supply of Alcohol Act 2012 (NZ), administered by local District Licensing Committees (DLCs) and the Alcohol Regulatory and Licensing Authority (ARLA). Key requirements: (1) On-Licence: required for cellar door tastings and on-site consumption of wine; (2) Off-Licence: required for retail sales of wine to take away; (3) Applications are made to the local DLC — contact your local council for the relevant DLC; (4) Licence holders must comply with host responsibility obligations (e.g. not serving intoxicated persons, providing food and water, displaying licence); (5) Licences must be displayed on the premises; (6) Remote sale licences are available for direct-to-consumer online sales; (7) Licence renewal is required every three years. Note: unlike Australia, NZ does not have a separate producer's licence — the WSMP registration covers production, and the Sale and Supply of Alcohol Act licences cover sales.",
    citations: [
      {
        title: "Sale and Supply of Alcohol Act 2012 (NZ)",
        section: "Part 1 — Licences; ss.34-100",
        jurisdiction: "Federal",
        url: "https://www.legislation.govt.nz/act/public/2012/0120/latest/whole.html",
      },
    ],
    lastVerified: "2026-05-01",
  },

  {
    id: "nz-labelling",
    topic: "Labelling",
    jurisdiction: "Federal",
    question: "What are the wine labelling requirements in New Zealand?",
    keywords: ["NZ", "New Zealand", "label", "labelling", "variety", "vintage", "GI", "geographical indication", "pregnancy warning", "sulphites"],
    answer:
      "Wine labels in New Zealand must comply with both the NZ Food (Safety) Regulations 2002 and the FSANZ Food Standards Code (which applies in both Australia and NZ). Key requirements: (1) Variety claims: wine must contain at least 75% of the stated grape variety; (2) Vintage claims: wine must contain at least 75% from the stated vintage year; (3) Geographical Indication (GI) claims: wine must contain at least 85% from the stated region (e.g. Marlborough, Hawke's Bay, Central Otago); (4) Pregnancy warning label: mandatory from 31 July 2023 — the label must include the pregnancy warning symbol and text; (5) Allergen declarations: sulphites must be declared if present above 10mg/kg; (6) Alcohol content must be stated; (7) Country of origin must be stated; (8) Importer details must be on labels for imported wine. NZ wine exported to Australia must comply with Australian labelling requirements in addition to NZ requirements.",
    citations: [
      {
        title: "Wine Act 2003 (NZ)",
        section: "Part 3 — Wine standards; labelling requirements",
        jurisdiction: "Federal",
        url: "https://www.legislation.govt.nz/act/public/2003/0114/latest/whole.html",
      },
      {
        title: "Geographical Indications (Wine and Spirits) Registration Act 2006 (NZ)",
        section: "Part 2 — Registered geographical indications",
        jurisdiction: "Federal",
        url: "https://www.legislation.govt.nz/act/public/2006/0060/latest/whole.html",
      },
    ],
    lastVerified: "2026-05-01",
  },

  {
    id: "nz-export",
    topic: "Export",
    jurisdiction: "Federal",
    question: "What are the export requirements for New Zealand wine?",
    keywords: ["NZ", "New Zealand", "export", "MPI", "Trade Certification", "Wine e-Cert", "certificate", "market access"],
    answer:
      "All wine exported from New Zealand must comply with the Wine Act 2003 (NZ) and MPI Trade Certification requirements. Key requirements: (1) Exporters must register with MPI and use the MPI Trade Certification system (formerly Wine e-Cert) for all export consignments; (2) All wine in an export consignment must be registered in MPI Trade Certification prior to export; (3) Export documentation: a Certificate of Analysis (CoA) and Certificate of Origin may be required depending on the destination market; (4) Destination market requirements vary significantly — check MPI's market access database for specific country requirements (e.g. EU requires a VI-1 certificate, USA requires TTB label approval); (5) Phytosanitary certificates may be required for some markets; (6) Wine must comply with the importing country's labelling, additive, and alcohol content requirements; (7) Organic wine exports require additional certification. Contact MPI Trade Certification at mpi.govt.nz for current requirements and to register as an exporter.",
    citations: [
      {
        title: "Wine Act 2003 (NZ)",
        section: "Part 4 — Export of wine; MPI Trade Certification",
        jurisdiction: "Federal",
        url: "https://www.legislation.govt.nz/act/public/2003/0114/latest/whole.html",
      },
    ],
    lastVerified: "2026-05-01",
  },

  {
    id: "nz-whs",
    topic: "Work Health & Safety",
    jurisdiction: "Federal",
    question: "What are the WHS obligations for a winery in New Zealand?",
    keywords: ["NZ", "New Zealand", "WHS", "health and safety", "WorkSafe NZ", "HSWA", "confined space", "CO2", "SO2", "HSNO"],
    answer:
      "In New Zealand, workplace health and safety for wineries is governed by the Health and Safety at Work Act 2015 (NZ) (HSWA), administered by WorkSafe New Zealand. Key obligations: (1) PCBU duty to eliminate or minimise risks so far as reasonably practicable; (2) Confined space management for fermentation tanks — entry permits, atmospheric testing for CO2, and rescue procedures are mandatory; (3) CO2 monitoring during fermentation — CO2 can reach lethal concentrations in enclosed spaces; (4) Manual handling risk management for barrels and cases; (5) Chemical handling: SO2, pesticides, and cleaning chemicals must be managed under the Hazardous Substances and New Organisms Act 1996 (HSNO Act), administered by WorkSafe NZ and EPA NZ — hazardous substance location certificates may be required; (6) Working at heights procedures for tank access; (7) Incident reporting — serious injuries, dangerous incidents, and deaths must be notified to WorkSafe NZ immediately. WorkSafe NZ has published specific guidance for the agriculture and horticulture sectors that applies to wineries.",
    citations: [
      {
        title: "Health and Safety at Work Act 2015 (NZ)",
        section: "Part 2 — Health and safety duties; ss.36-48",
        jurisdiction: "Federal",
        url: "https://www.legislation.govt.nz/act/public/2015/0070/latest/whole.html",
      },
    ],
    lastVerified: "2026-05-01",
  },

  {
    id: "nz-environment",
    topic: "Environmental",
    jurisdiction: "Federal",
    question: "What are the environmental and wastewater requirements for a winery in New Zealand?",
    keywords: ["NZ", "New Zealand", "wastewater", "discharge", "RMA", "Resource Management Act", "regional council", "consent", "permit"],
    answer:
      "In New Zealand, winery environmental and wastewater obligations are governed by the Resource Management Act 1991 (RMA), administered by regional councils and district councils. Key requirements: (1) Winery wastewater discharge to land or water requires a discharge permit from the relevant regional council (e.g. Marlborough District Council, Hawke's Bay Regional Council, Otago Regional Council, Environment Canterbury); (2) New national wastewater discharge standards took effect from December 2025 — check with your regional council for current requirements; (3) Land use consent is required from the district council for new winery buildings or significant expansions in rural zones; (4) Water extraction (irrigation) requires a water permit from the regional council; (5) Regional plans set specific rules for discharge volumes, treatment standards, and setback distances from waterways; (6) Marlborough wineries: the Marlborough Environment Plan sets specific rules for winery wastewater discharge; (7) Non-compliance can result in significant penalties under the RMA. Note: RMA reform is ongoing — the Natural and Built Environments Act (NBA) may replace the RMA; check with your regional council for the latest requirements.",
    citations: [
      {
        title: "Resource Management Act 1991 (NZ)",
        section: "Part 3 — Duties and restrictions; ss.9-20; discharge consents",
        jurisdiction: "Federal",
        url: "https://www.legislation.govt.nz/act/public/1991/0069/latest/whole.html",
      },
    ],
    lastVerified: "2026-05-01",
  },

  {
    id: "nz-biosecurity",
    topic: "Biosecurity",
    jurisdiction: "Federal",
    question: "What are the biosecurity obligations for a winery or vineyard in New Zealand?",
    keywords: ["NZ", "New Zealand", "biosecurity", "phylloxera", "grapevine", "MPI", "Biosecurity Act", "movement", "plant material"],
    answer:
      "In New Zealand, vineyard and winery biosecurity is governed by the Biosecurity Act 1993 (NZ), administered by MPI Biosecurity New Zealand. Key requirements: (1) Phylloxera management plans are required in affected regions — Marlborough, Hawke's Bay, and Central Otago all have active phylloxera management programmes; (2) Movement of plant material (cuttings, rootstocks, budwood) between regions is regulated — contact MPI Biosecurity before moving any grapevine material; (3) A biosecurity levy applies to grape growers — this funds the national phylloxera and disease management programme; (4) Freshwater Farm Plans are being introduced for properties with significant water use or discharge; (5) Imported grapevine material must comply with MPI biosecurity import conditions and must be accompanied by appropriate phytosanitary certificates; (6) Growers must report any suspected new pest or disease to MPI Biosecurity immediately. The NZ Winegrowers Biosecurity programme provides practical guidance and is available to all NZ Winegrowers members.",
    citations: [
      {
        title: "Biosecurity Act 1993 (NZ)",
        section: "Part 5 — Pest management; s.70 movement controls",
        jurisdiction: "Federal",
        url: "https://www.legislation.govt.nz/act/public/1993/0095/latest/whole.html",
      },
    ],
    lastVerified: "2026-05-01",
  },

  // ══════════════════════════════════════════════════════════════════════════
  // 11. ISO & QUALITY MANAGEMENT STANDARDS
  // ══════════════════════════════════════════════════════════════════════════

  {
    id: "iso-9001-overview",
    topic: "ISO & Quality Management",
    jurisdiction: "All",
    question: "What is ISO 9001 and why should a winery pursue certification?",
    keywords: ["ISO 9001", "ISO 9000", "quality management", "QMS", "certification", "batch consistency", "export", "traceability"],
    answer:
      "ISO 9001:2015 is the international standard for Quality Management Systems (QMS). For wineries, it provides a framework to standardise every stage of production from grape receival and fermentation through to bottling and dispatch, ensuring consistent taste, safety, and regulatory compliance across all batches.\n\nKey benefits for boutique wineries:\n- Batch Consistency: Standardises fermentation, aging, and bottling procedures so wine quality remains uniform year to year.\n- Global Market Access: EU, UK, and USA supermarket chains increasingly require ISO 9001 or equivalent as a supply condition. Certification removes a significant barrier to retail and wholesale export contracts.\n- Waste Reduction: Streamlines cellar and vineyard operations to reduce operational costs and spoilage.\n- Customer Confidence: Demonstrates a verifiable commitment to quality, critical for hospitality and tourism.\n- Label Integrity Program alignment: Wine Australia's LIP audit trail requirements (traceability from grape to bottle) align directly with ISO 9001 Clause 8.5.2 (Identification and Traceability).\n- NZ WSMP alignment: The NZ Wine Standards Management Plan required under the Wine Act 2003 (NZ) is structurally equivalent to an ISO 9001 QMS; some certifiers accept a validated WSMP as partial evidence toward ISO 9001 certification.\n\nCertification bodies in Australia: SAI Global, Bureau Veritas, SGS, DNV, LRQA. Typical cost: $3,000-$8,000/year. Timeframe: 6-18 months to initial certification.",
    citations: [
      {
        title: "ISO 9001:2015 — Quality Management Systems",
        section: "Clause 8.5.2 — Identification and Traceability; Clause 9.1 — Monitoring and Measurement",
        jurisdiction: "Federal",
        url: "https://www.iso.org/iso-9001-quality-management.html",
      },
    ],
    lastVerified: "2026-05-01",
  },

  {
    id: "iso-22000-haccp",
    topic: "ISO & Quality Management",
    jurisdiction: "All",
    question: "What is ISO 22000 and how does it relate to HACCP requirements for wineries?",
    keywords: ["ISO 22000", "HACCP", "food safety", "food safety management", "hazard analysis", "critical control points", "FSANZ", "Standard 3.2.1"],
    answer:
      "ISO 22000:2018 is the international standard for Food Safety Management Systems. It integrates HACCP (Hazard Analysis Critical Control Points) principles into a full management system framework, and is directly applicable to winery food safety obligations under FSANZ Standard 3.2.1.\n\nISO 22000 certification is accepted as an alternative compliance pathway to a standalone HACCP plan under FSANZ Standard 3.2.1 (Food Safety Programs).\n\nKey HACCP Critical Control Points (CCPs) for wineries:\n- Grape receival: Pesticide residue testing; foreign matter inspection\n- SO2 addition: Allergen control — must not exceed 10 mg/L in finished wine without mandatory allergen declaration on label\n- Filtration: Microbiological control — Brettanomyces, acetic acid bacteria\n- Bottling line: Fill level accuracy; closure integrity (cork taint, screw cap torque)\n- Labelling: Allergen declaration accuracy; vintage/variety/GI compliance\n\nKey winery hazards addressed: SO2 allergen declaration, histamine/biogenic amines, pesticide residues, glass contamination, microbiological hazards. Typical cost: $4,000-$10,000/year. Timeframe: 6-18 months.",
    citations: [
      {
        title: "ISO 22000:2018 — Food Safety Management Systems",
        section: "Clause 8 — Operation; HACCP principles integration",
        jurisdiction: "Federal",
        url: "https://www.iso.org/iso-22000-food-safety-management.html",
      },
      {
        title: "Food Standards Code — Standard 3.2.1 (Food Safety Programs)",
        section: "Standard 3.2.1 — Food Safety Programs",
        jurisdiction: "Federal",
        url: "https://www.foodstandards.gov.au/food-standards-code",
      },
    ],
    lastVerified: "2026-05-01",
  },

  {
    id: "iso-14001-environmental",
    topic: "ISO & Quality Management",
    jurisdiction: "All",
    question: "How does ISO 14001 apply to winery environmental management and how does it relate to AWISSP?",
    keywords: ["ISO 14001", "environmental management", "EMS", "AWISSP", "Entwine", "sustainability", "wastewater", "water", "energy"],
    answer:
      "ISO 14001:2015 is the international standard for Environmental Management Systems (EMS). For wineries, it formalises sustainable viticulture, water usage, wastewater management, chemical storage, and waste management obligations, many of which are also regulated under state EPA legislation.\n\nRelationship to AWISSP: The Australian Wine Industry Standard of Sustainable Practice (AWISSP / Entwine Australia) incorporates ISO 14001 principles and is accepted as a complementary framework. Many wineries use AWISSP as a stepping stone to full ISO 14001 certification. AWISSP certification is recognised by major EU and UK export markets as a credible sustainability credential.\n\nKey implementation elements for wineries:\n- Environmental aspects register: water consumption, energy use, wastewater volumes, chemical use, waste generation\n- Legal register: state EPA licence conditions, water licence conditions, council planning conditions\n- Emergency response plans: chemical spill procedures, SO2 release protocols\n- Supplier environmental requirements: chemical suppliers, packaging suppliers\n\nAustralian winery adoption: Taylors Wines (Clare Valley) has held ISO 14001 certification since 2009. Typical cost: $3,000-$8,000/year. Timeframe: 6-12 months.",
    citations: [
      {
        title: "ISO 14001:2015 — Environmental Management Systems",
        section: "Clause 6.1.2 — Environmental aspects; Clause 6.1.3 — Compliance obligations",
        jurisdiction: "Federal",
        url: "https://www.iso.org/iso-14001-environmental-management.html",
      },
      {
        title: "AWISSP — Entwine Australia",
        section: "Winery sustainability module",
        jurisdiction: "Federal",
        url: "https://entwine.com.au",
      },
    ],
    lastVerified: "2026-05-01",
  },

  {
    id: "iso-45001-whs",
    topic: "ISO & Quality Management",
    jurisdiction: "All",
    question: "What is ISO 45001 and how does it relate to WHS obligations for Australian wineries?",
    keywords: ["ISO 45001", "AS/NZS 45001", "OHS", "WHS", "occupational health", "safety management", "confined space", "CO2", "barrel"],
    answer:
      "ISO 45001:2018 is the international standard for Occupational Health and Safety Management Systems, adopted in Australia as AS/NZS 45001:2018. It replaces the former AS/NZS 4801 standard.\n\nISO 45001 certification does not replace WHS Act compliance obligations, but provides a documented management system that demonstrates due diligence to regulators (SafeWork SA, WorkSafe VIC, WorkSafe WA, etc.).\n\nKey winery-specific hazards addressed by ISO 45001:\n- Confined space entry: Fermentation tanks and underground cellars — CO2 asphyxiation risk. Requires confined space register, entry permits, atmospheric testing, rescue procedures.\n- Manual handling: Barrel handling (225L barrels = approx. 300kg full), bin tipping, case stacking — requires manual handling risk assessments and mechanical aids.\n- Chemical handling: SO2 (gas and solution), caustic cleaning agents (CIP), pesticides — requires SDS management, PPE, emergency eyewash stations.\n- Noise: Bottling lines, pumps, crushers — requires noise monitoring and hearing protection programs.\n- Working at heights: Tank access platforms, mezzanines — requires fall protection systems.\n- Seasonal worker management: Harvest casual workers require induction, training records, and supervision.\n\nCertification bodies: SAI Global, Bureau Veritas, SGS, DNV. Typical cost: $3,000-$7,000/year.",
    citations: [
      {
        title: "ISO 45001:2018 — Occupational Health and Safety Management Systems",
        section: "Clause 6.1.2 — Hazard identification; Clause 8.1.4 — Procurement",
        jurisdiction: "Federal",
        url: "https://www.iso.org/iso-45001-occupational-health-and-safety.html",
      },
      {
        title: "Safe Work Australia — Model WHS Act",
        section: "Part 2 — Health and Safety Duties; s.19 Primary duty of care",
        jurisdiction: "Federal",
        url: "https://www.safeworkaustralia.gov.au/law-and-regulation/model-whs-laws",
      },
    ],
    lastVerified: "2026-05-01",
  },

  {
    id: "awissp-entwine",
    topic: "ISO & Quality Management",
    jurisdiction: "Federal",
    question: "What is AWISSP / Entwine Australia and is it mandatory for Australian wineries?",
    keywords: ["AWISSP", "Entwine", "sustainable practice", "sustainability", "Australian Wine Industry Standard", "AGW", "Wine Australia", "export"],
    answer:
      "AWISSP (Australian Wine Industry Standard of Sustainable Practice), delivered through the Entwine Australia program, is an industry-specific sustainability certification administered by Australian Grape and Wine (AGW) and Wine Australia. It is not legally mandatory, but is effectively required for export to major EU and UK retail markets.\n\nKey modules: Vineyard sustainability, winery sustainability, chemical use, water management, energy, waste, biodiversity, and social responsibility.\n\nRelationship to ISO standards: AWISSP is designed to complement ISO 14001 (Environmental Management) and can be used as evidence toward ISO 14001 certification. It does not replace ISO 9001 or ISO 22000.\n\nExport market recognition: The AWISSP/Entwine certification is recognised by major EU and UK buyers as a credible sustainability credential. For NZ wineries, the equivalent is Sustainable Winegrowing New Zealand (SWNZ), which appears on approximately 95% of NZ wine exported.\n\nCost: Approximately $500-$2,000/year depending on winery size. Timeframe: 3-6 months to initial certification. To enrol: visit entwine.com.au and complete the online self-assessment.",
    citations: [
      {
        title: "AWISSP — Entwine Australia",
        section: "Program overview and module requirements",
        jurisdiction: "Federal",
        url: "https://entwine.com.au",
      },
      {
        title: "Wine Australia — Sustainability",
        section: "Sustainability guidance for Australian wineries",
        jurisdiction: "Federal",
        url: "https://www.wineaustralia.com/growing-making/sustainability",
      },
    ],
    lastVerified: "2026-05-01",
  },

  {
    id: "iso-certification-pathway",
    topic: "ISO & Quality Management",
    jurisdiction: "All",
    question: "What is the recommended ISO certification pathway for a boutique winery?",
    keywords: ["ISO certification", "pathway", "which ISO", "start", "first", "priority", "boutique winery", "small winery", "certification order"],
    answer:
      "For a boutique winery, the recommended ISO certification pathway depends on your primary business goal:\n\nIf your priority is export market access (EU/UK retail):\n1. AWISSP/Entwine Australia first — lowest cost ($500-$2,000/yr), fastest (3-6 months), directly recognised by EU/UK buyers, and builds the foundation for ISO 14001.\n2. ISO 9001:2015 — adds QMS framework for batch consistency and traceability; required by some major retail buyers.\n3. ISO 14001:2015 — environmental management; can leverage AWISSP evidence.\n\nIf your priority is food safety compliance:\n1. HACCP plan (mandatory under FSANZ Standard 3.2.1 for some winery classifications) — implement this first as it is legally required.\n2. ISO 22000:2018 — formalises the HACCP plan into a full food safety management system; accepted as alternative to standalone HACCP.\n\nIf your priority is WHS compliance:\n1. WHS Act compliance (mandatory) — ensure all legal obligations are met first.\n2. ISO 45001:2018 — formalises WHS management; demonstrates due diligence to regulators.\n\nCertification cost summary (AU):\nAWISSP/Entwine: $500-$2,000/yr, 3-6 months\nISO 9001:2015: $3,000-$8,000/yr, 6-18 months\nISO 22000:2018: $4,000-$10,000/yr, 6-18 months\nISO 14001:2015: $3,000-$8,000/yr, 6-12 months\nISO 45001:2018: $3,000-$7,000/yr, 6-12 months",
    citations: [
      {
        title: "ISO 9001:2015 — Quality Management Systems",
        section: "Overview",
        jurisdiction: "Federal",
        url: "https://www.iso.org/iso-9001-quality-management.html",
      },
      {
        title: "AWISSP — Entwine Australia",
        section: "Program overview",
        jurisdiction: "Federal",
        url: "https://entwine.com.au",
      },
    ],
    lastVerified: "2026-05-01",
  },

  // ═══════════════════════════════════════════════════════════════════════════
  // 11. OPERATIONAL COMPLIANCE
  // ═══════════════════════════════════════════════════════════════════════════

  {
    id: "confined-space-tank-entry",
    topic: "Operational Compliance",
    jurisdiction: "All",
    question: "What are the legal requirements before a worker enters a wine tank for cleaning?",
    keywords: ["tank entry", "confined space", "wine tank", "cleaning tank", "enter tank", "tank cleaning", "confined space permit", "CO2 tank", "oxygen tank", "tank safety"],
    answer:
      "Before any worker enters a wine tank (which is a confined space under WHS Regulation 2011 Part 4.1), the following steps are legally required:\n\n1. Confined Space Entry Permit: A written entry permit must be issued and authorised before entry (WHS Reg s.66). The permit must identify the space, work to be done, hazards, control measures, atmospheric test results, authorised entrants, standby person, and emergency procedures.\n\n2. Atmospheric Testing: A competent person must test the atmosphere before entry and continuously during work (WHS Reg s.70):\n   - Oxygen: 19.5%-23.5% (below 19.5% = oxygen-deficient, immediately dangerous)\n   - CO2: below 0.5% (5,000 ppm) — CO2 from fermentation can be lethal at >5%\n   - Flammable gases: below 5% of the Lower Explosive Limit (LEL)\n\n3. Energy Isolation (Lock-out/Tag-out): All energy sources (electrical, pneumatic, hydraulic) must be isolated and locked out. All inlet/outlet valves must be closed, locked, and tagged. Refrigeration must be isolated (WHS Reg ss.208-215).\n\n4. Standby Person: A trained standby person must remain outside the space at all times, maintaining communication and monitoring conditions (WHS Reg s.71). The standby person must NOT enter the space to rescue without air-supplied respiratory protection.\n\n5. PPE: Workers must be provided with appropriate PPE for the chemicals used in cleaning (chemical-resistant gloves, eye protection, apron, respiratory protection if required).\n\n6. Training: All workers entering confined spaces must be trained in confined space hazards, the entry permit system, and emergency procedures (WHS Reg s.79).\n\nIn Victoria, equivalent obligations apply under the OHS Regulations 2017. In New Zealand, the Health and Safety at Work (General Risk and Workplace Management) Regulations 2016 apply.",
    citations: [
      {
        title: "Work Health and Safety Regulation 2011 (NSW) — Part 4.1 Confined Spaces",
        section: "ss.60-79 (entry permits, atmospheric testing, standby persons, training)",
        jurisdiction: "NSW",
        url: "https://legislation.nsw.gov.au/view/html/inforce/current/sl-2011-0674#pt.4.1",
      },
      {
        title: "Safe Work Australia Code of Practice: Confined Spaces",
        section: "Sections 3-6 (entry permits, atmospheric testing, emergency procedures)",
        jurisdiction: "Federal",
        url: "https://www.safeworkaustralia.gov.au/doc/model-code-practice-confined-spaces",
      },
      {
        title: "SafeWork NSW Guide to Managing Risks in Wineries",
        section: "Section 10 (Confined Spaces)",
        jurisdiction: "NSW",
        url: "https://www.safework.nsw.gov.au/resource-library/list-of-all-resources/publications/guide-to-managing-risks-in-wineries",
      },
    ],
    lastVerified: "2026-05-01",
  },
  {
    id: "co2-asphyxiation-risks",
    topic: "Operational Compliance",
    jurisdiction: "All",
    question: "How dangerous is CO2 in a winery and what monitoring is required?",
    keywords: ["CO2", "carbon dioxide", "fermentation gas", "asphyxiation", "oxygen depletion", "CO2 monitoring", "barrel hall", "CO2 danger", "fermentation CO2", "CO2 levels"],
    answer:
      "CO2 is one of the most serious hazards in a winery. During fermentation, CO2 is produced in large quantities (approximately 46 g CO2 per 100 g of sugar fermented). CO2 is heavier than air and accumulates at low points — inside tanks, in barrel halls, and in underground cellars.\n\nCO2 concentration effects:\n- 1-2%: Headaches, shortness of breath\n- 3-4%: Dizziness, rapid breathing, impaired judgment\n- >5%: Unconsciousness within minutes\n- >10%: Death within minutes\n\nOxygen depletion: CO2 displaces oxygen. Normal atmospheric oxygen is 20.9%. Below 19.5% is oxygen-deficient; below 16% causes impaired judgment; below 6% causes death.\n\nLegal requirements (WHS Regulation 2011 Part 4.1):\n- Any enclosed or partially enclosed space where CO2 may accumulate is a confined space and requires a confined space entry permit before entry.\n- Atmospheric testing must confirm O2 is between 19.5%-23.5% and CO2 is below 0.5% (5,000 ppm) before entry.\n- Continuous atmospheric monitoring during work in the space is required.\n- Barrel halls and underground cellars must be adequately ventilated, particularly during and after fermentation.\n- Workers must be trained to recognise CO2 hazards and never enter a tank or enclosed space without testing.\n\nBest practice: Install fixed CO2 monitors in barrel halls and fermentation areas with audible alarms. Portable multi-gas detectors should be used before and during any confined space entry.",
    citations: [
      {
        title: "Work Health and Safety Regulation 2011 (NSW) — Part 4.1 Confined Spaces",
        section: "s.70 (atmospheric testing requirements)",
        jurisdiction: "NSW",
        url: "https://legislation.nsw.gov.au/view/html/inforce/current/sl-2011-0674#pt.4.1",
      },
      {
        title: "SafeWork NSW Guide to Managing Risks in Wineries",
        section: "Section 10.1 (CO2 and asphyxiant risks in confined spaces)",
        jurisdiction: "NSW",
        url: "https://www.safework.nsw.gov.au/resource-library/list-of-all-resources/publications/guide-to-managing-risks-in-wineries",
      },
    ],
    lastVerified: "2026-05-01",
  },
  {
    id: "lockout-tagout-maintenance",
    topic: "Operational Compliance",
    jurisdiction: "All",
    question: "What is the lock-out/tag-out procedure for winery equipment maintenance?",
    keywords: ["lock out", "tag out", "LOTO", "isolation procedure", "plant maintenance", "equipment isolation", "personal danger lock", "out of service", "pump maintenance", "press maintenance"],
    answer:
      "Lock-out/tag-out (LOTO) is a mandatory isolation procedure that must be followed before any maintenance, cleaning, or non-production work on plant and equipment (WHS Regulation 2011 Part 5.1, ss.208-215).\n\nThe 7-step LOTO procedure for winery equipment:\n\n1. Shut down plant: Notify the plant operator. Shut down all energy sources in the correct sequence (electrical, pneumatic, hydraulic, chemical).\n\n2. Isolate energy sources: Isolate at the main isolation point — circuit breaker or main switch for electrical; close and lock valves for pneumatic/hydraulic.\n\n3. De-energise stored energy: Release or restrain all stored energy (capacitors, springs, hydraulic accumulators, gravity-loaded components). Allow rotating parts to stop completely.\n\n4. Lock out — personal danger locks: Each person performing maintenance attaches their own personal danger lock to every isolation point. One lock per person per isolation point. Locks remain on until work is complete.\n\n5. Lock out — out of service locks: For work spanning multiple shifts or days, a supervisor applies an out-of-service lock (yellow/black) in addition to personal danger locks.\n\n6. Tag out: Attach personal danger tags (red/white) to all isolation points after locking out. Tags identify who is working on the plant and must not be removed by anyone other than the person who attached them.\n\n7. Confirm isolation: Test that the plant cannot be energised. Check for residual pressure/voltage. Confirm all stored energy has been dissipated.\n\nNote: Tagging alone is NOT sufficient — locking out must always precede tagging. Emergency stop buttons are NOT isolation devices and cannot be used for LOTO.",
    citations: [
      {
        title: "Work Health and Safety Regulation 2011 (NSW) — Part 5.1 Plant Management",
        section: "ss.208-215 (isolation of plant, lock-out/tag-out requirements)",
        jurisdiction: "NSW",
        url: "https://legislation.nsw.gov.au/view/html/inforce/current/sl-2011-0674#pt.5.1",
      },
      {
        title: "SafeWork NSW Guide to Managing Risks in Wineries",
        section: "Section 13 (Plant Maintenance — isolation procedures, LOTO steps)",
        jurisdiction: "NSW",
        url: "https://www.safework.nsw.gov.au/resource-library/list-of-all-resources/publications/guide-to-managing-risks-in-wineries",
      },
    ],
    lastVerified: "2026-05-01",
  },
  {
    id: "hazardous-chemicals-register-sds",
    topic: "Operational Compliance",
    jurisdiction: "All",
    question: "What are the requirements for a winery's hazardous chemicals register and Safety Data Sheets?",
    keywords: ["hazardous chemicals", "chemical register", "SDS", "safety data sheet", "GHS", "caustic", "SO2", "peracetic acid", "chemical storage", "chemical labelling"],
    answer:
      "Under WHS Regulation 2011 (NSW) Part 7.1, wineries that use, store, or handle hazardous chemicals must:\n\n1. Maintain a Hazardous Chemicals Register (WHS Reg s.346): List all hazardous chemicals used, stored, or handled at the winery. Include: chemical name, GHS classification, quantity stored, location, SDS reference. Keep the register accessible to all workers. Update whenever chemicals are added or removed.\n\n2. Obtain and maintain Safety Data Sheets (SDS) (WHS Reg s.340): Obtain SDS from the manufacturer or supplier for every hazardous chemical. SDS must be in the 16-section Australian/GHS format. Keep SDS accessible near the work area where the chemical is used. Review and update SDS at least every 5 years.\n\n3. GHS Labelling (mandatory from 1 January 2017): All containers must display GHS-compliant labels with: signal word (Danger/Warning), hazard statements, precautionary statements, and GHS pictograms. Labels must be in English and legible.\n\n4. Chemical Storage: Store chemicals in accordance with SDS requirements (segregation, ventilation, containment, temperature). Incompatible chemicals must be segregated (e.g., oxidisers separate from flammables).\n\nCommon winery hazardous chemicals requiring SDS and register entries: caustic soda (NaOH) — cleaning; peracetic acid (PAA) — sanitising; sodium/potassium metabisulphite (SO2 source) — winemaking; citric acid — cleaning; sodium hypochlorite — sanitising; hydrochloric acid — cleaning; tartaric acid — winemaking; diatomaceous earth — filtration (inhalation hazard).",
    citations: [
      {
        title: "Work Health and Safety Regulation 2011 (NSW) — Part 7.1 Hazardous Chemicals",
        section: "ss.340-349 (SDS, register, labelling, notification)",
        jurisdiction: "NSW",
        url: "https://legislation.nsw.gov.au/view/html/inforce/current/sl-2011-0674#pt.7.1",
      },
      {
        title: "SafeWork NSW Guide to Managing Risks in Wineries",
        section: "Section 7 (Hazardous Chemicals)",
        jurisdiction: "NSW",
        url: "https://www.safework.nsw.gov.au/resource-library/list-of-all-resources/publications/guide-to-managing-risks-in-wineries",
      },
    ],
    lastVerified: "2026-05-01",
  },
  {
    id: "electrical-equipment-testing-rcd",
    topic: "Operational Compliance",
    jurisdiction: "All",
    question: "How often must electrical equipment be tested in a winery and are RCDs required?",
    keywords: ["electrical testing", "test and tag", "RCD", "residual current device", "safety switch", "AS/NZS 3760", "electrical inspection", "plug in equipment", "electrical safety", "winery electrical"],
    answer:
      "Under WHS Regulation 2011 (NSW) Part 4.7 (Electrical Risks), electrical equipment used in a winery must be regularly inspected and tested because wineries are a 'hostile operating environment' (exposure to moisture, heat, vibration, and corrosive chemicals).\n\nInspection and testing intervals (per AS/NZS 3760:2022):\n- Portable electrical equipment (leads, power tools, pumps): every 6 months in hostile environments\n- Fixed electrical equipment: every 12 months\n- RCDs (residual current devices): push-button test monthly; full electrical test every 12 months\n\nRecord-keeping requirements (WHS Reg s.152): Records must be kept until the equipment is next tested or permanently removed from service. Records must specify: tester's name, date of test, outcome (pass/fail), and next test due date. Records may be in the form of a tag attached to the equipment (test-and-tag label).\n\nRCD requirements (WHS Reg s.154): RCDs (safety switches) must be used for all plug-in electrical equipment in winery environments. This includes pumps, motors, lighting, power tools, and any equipment connected via socket outlets in areas exposed to moisture, heat, vibration, or corrosive chemicals. Type II RCDs (tripping current <=30 mA, tripping time <=300 ms) are required for personal protection. RCDs must be tested regularly by a competent person (WHS Reg s.155).\n\nIn Victoria, equivalent obligations apply under the OHS Regulations 2017. In New Zealand, the Health and Safety at Work (Electrical) Regulations 2016 apply.",
    citations: [
      {
        title: "Work Health and Safety Regulation 2011 (NSW) — Part 4.1 Confined Spaces",
        section: "ss.150-155 (inspection, testing, records, RCDs)",
        jurisdiction: "NSW",
        url: "https://legislation.nsw.gov.au/view/html/inforce/current/sl-2011-0674#pt.4.1",
      },
      {
        title: "AS/NZS 3760:2022 — In-service Safety Inspection and Testing of Electrical Equipment",
        section: "Table 4 (inspection and testing intervals for hostile environments)",
        jurisdiction: "Federal",
        url: "https://www.standards.org.au/standards-catalogue/sa-snz/electrotechnology/el-043/as-nzs-3760-2022",
      },
      {
        title: "SafeWork NSW Guide to Managing Risks in Wineries",
        section: "Section 11 (Electrical Safety — RCDs, testing, records)",
        jurisdiction: "NSW",
        url: "https://www.safework.nsw.gov.au/resource-library/list-of-all-resources/publications/guide-to-managing-risks-in-wineries",
      },
    ],
    lastVerified: "2026-05-01",
  },
  {
    id: "cip-cleaning-protocol",
    topic: "Operational Compliance",
    jurisdiction: "All",
    question: "What is the correct CIP (Clean-in-Place) sequence for winery tanks and what are the food safety obligations?",
    keywords: ["CIP", "clean in place", "tank cleaning", "caustic wash", "sanitise", "peracetic acid", "SO2 rinse", "cleaning sequence", "food safety cleaning", "FSANZ cleaning"],
    answer:
      "CIP (Clean-in-Place) is the standard method for cleaning wine tanks, pipework, heat exchangers, and bottling lines without disassembly. Food safety obligations for cleaning are set out in FSANZ Standard 3.2.2 (Food Safety Practices and General Requirements).\n\nStandard CIP sequence for winery tanks:\n1. Pre-rinse with water: Remove gross soils (marc residues, tartrate deposits, lees). Drain completely.\n2. Caustic wash: 1-2% NaOH (caustic soda) at 60-80 degrees C for 15-30 minutes. Removes organic soils, proteins, polysaccharides. Drain and collect for disposal.\n3. Intermediate rinse: Flush with water to remove caustic residues. Check pH of rinse water (should be neutral, ~7.0).\n4. Acid wash: 0.5-1% citric or nitric acid. Removes mineral deposits and tartrate scale. Drain.\n5. Final rinse: Potable water. Drain completely.\n6. Sanitise: Peracetic acid (PAA) at 100-200 ppm, or SO2 solution (50-100 ppm potassium metabisulphite), or hot water (>80 degrees C for 5 min). Leave in contact for the required contact time per the SDS.\n\nFor oak barrels: hot water rinse (80 degrees C), SO2 fumigation (5g sulphur wicks), or ozone treatment. Store bung-down or with SO2 solution.\n\nFSANZ Standard 3.2.2 obligations: Clause 19 requires food contact surfaces to be cleaned and sanitised as often as necessary to prevent contamination, and cleaned before use after any period of disuse. Cleaning efficacy should be validated periodically (ATP bioluminescence testing, microbiological swabs).\n\nChemical safety: All cleaning chemicals must be handled in accordance with their SDS. Workers must wear appropriate PPE (chemical-resistant gloves, eye protection, apron). Caustic and acid solutions must never be mixed.",
    citations: [
      {
        title: "Food Standards Code — Standard 3.2.2 (Food Safety Practices and General Requirements)",
        section: "Clauses 19-20 (cleaning, sanitising, and single-use items)",
        jurisdiction: "Federal",
        url: "https://www.legislation.gov.au/F2015L00404/latest/text",
      },
      {
        title: "Work Health and Safety Regulation 2011 (NSW) — Part 7.1 Hazardous Chemicals",
        section: "ss.340-346 (SDS and chemical register for cleaning chemicals)",
        jurisdiction: "NSW",
        url: "https://legislation.nsw.gov.au/view/html/inforce/current/sl-2011-0674#pt.7.1",
      },
    ],
    lastVerified: "2026-05-01",
  },
  {
    id: "plant-register-maintenance-records",
    topic: "Operational Compliance",
    jurisdiction: "All",
    question: "What plant must be registered and what maintenance records must a winery keep?",
    keywords: ["plant register", "registered plant", "pressure vessel", "forklift", "maintenance records", "plant inspection", "boiler registration", "equipment register", "WHS plant"],
    answer:
      "Under WHS Regulation 2011 (NSW) Part 5.1, wineries must maintain a register of plant and keep maintenance records.\n\nRegistered plant in wineries (requires design registration and item registration with SafeWork NSW): pressure vessels with design pressure >50 kPa or capacity >500 L (includes most wine storage tanks with pressure fittings); boilers; forklifts and other powered mobile plant (e.g., pallet jacks, telehandlers); cranes and hoists; certain pumps and compressors above prescribed thresholds.\n\nPlant register must record (WHS Reg s.246): plant item description and serial/identification number; design registration number; date of last inspection; next inspection due date; any defects identified.\n\nMaintenance records must be kept for all plant (WHS Reg s.247): description of maintenance work performed; date of maintenance; name of person who performed maintenance; any defects identified and corrective actions taken; next scheduled maintenance date.\n\nInspection intervals: registered plant at intervals specified by the designer/manufacturer, or at least every 2 years for pressure vessels; electrical equipment every 6-12 months.\n\nRecord retention: maintenance records for registered plant for the life of the plant; electrical equipment test records until next test or disposal.\n\nIn Victoria, equivalent obligations apply under OHS Regulations 2017. In New Zealand, the Health and Safety at Work (General Risk and Workplace Management) Regulations 2016 apply.",
    citations: [
      {
        title: "Work Health and Safety Regulation 2011 (NSW) — Part 5.1 Plant Management",
        section: "ss.246-247 (plant register and maintenance records)",
        jurisdiction: "NSW",
        url: "https://legislation.nsw.gov.au/view/html/inforce/current/sl-2011-0674#pt.5.1",
      },
      {
        title: "SafeWork NSW Guide to Managing Risks in Wineries",
        section: "Section 13 (Plant Maintenance — plant register, maintenance records)",
        jurisdiction: "NSW",
        url: "https://www.safework.nsw.gov.au/resource-library/list-of-all-resources/publications/guide-to-managing-risks-in-wineries",
      },
    ],
    lastVerified: "2026-05-01",
  },
  {
    id: "calibration-records-winery",
    topic: "Operational Compliance",
    jurisdiction: "All",
    question: "What winery measuring equipment must be calibrated and what records are required?",
    keywords: ["calibration", "refractometer", "pH meter", "scales", "calibration records", "Brix meter", "SO2 titration", "measuring equipment", "ISO 9001 calibration", "NATA calibration"],
    answer:
      "Under ISO 9001:2015 Clause 7.1.5 (Monitoring and Measuring Resources) and ISO 22000:2018 Clause 8.7, measuring equipment used for critical process control must be calibrated at defined intervals. Even for wineries not ISO-certified, calibration records are best practice and support compliance with FSANZ Standard 3.2.2 (food safety) and Wine Australia Label Integrity Program (LIP) traceability requirements.\n\nWinery measuring equipment requiring calibration records:\n- Refractometer (Brix): before each use (distilled water zero check); annual NATA calibration\n- pH meter: before each use (2-point calibration with pH 4.0 and 7.0 buffers); electrode replacement 12-monthly\n- Free SO2 titration (Ripper/AO method): each use; annual verification with known SO2 standard\n- Scales/balances: annual NATA calibration with certified reference weights\n- Thermometers: annual verification against reference thermometer\n- Dissolved oxygen meter: per manufacturer instructions before each use\n- Turbidity meter (NTU): annual calibration with formazin standards\n\nCalibration records must include: equipment ID and description; calibration date; calibration method and reference standard used; result (pass/fail, measured value vs. reference); next calibration due date; name of person who performed calibration.\n\nRecord retention: at least 3 years (ISO 9001 Clause 7.5; Wine Australia LIP records 5 years).",
    citations: [
      {
        title: "ISO 9001:2015 — Quality Management Systems",
        section: "Clause 7.1.5 (Monitoring and measuring resources — calibration)",
        jurisdiction: "Federal",
        url: "https://www.iso.org/iso-9001-quality-management.html",
      },
      {
        title: "ISO 22000:2018 — Food Safety Management Systems",
        section: "Clause 8.7 (Control of monitoring and measuring)",
        jurisdiction: "Federal",
        url: "https://www.iso.org/standard/65464.html",
      },
    ],
    lastVerified: "2026-05-01",
  },
  {
    id: "whs-incident-reporting",
    topic: "Operational Compliance",
    jurisdiction: "All",
    question: "What WHS incidents must be reported to SafeWork NSW and what records must be kept?",
    keywords: ["incident reporting", "notifiable incident", "serious injury", "dangerous incident", "WHS reporting", "SafeWork notification", "incident register", "near miss", "workplace injury", "WHS records"],
    answer:
      "Under the Work Health and Safety Act 2011 (NSW) s.38, certain incidents must be notified to SafeWork NSW immediately (by the fastest means possible, e.g., phone 13 10 50).\n\nNotifiable incidents requiring immediate notification:\n1. Death of a person at the workplace.\n2. Serious injury or illness: immediate treatment as an in-patient in a hospital; amputation of any part of the body; serious head or eye injury; serious burns; loss of bodily function (e.g., loss of consciousness, loss of movement); serious lacerations requiring immediate medical treatment.\n3. Dangerous incident (near miss with potential for serious injury): uncontrolled escape, spillage, or leakage of a substance (e.g., chemical spill, SO2 release); implosion, explosion, or fire; electric shock; collapse or failure of an excavation or structure; uncontrolled collapse or failure of any plant; inrush of water, mud, or gas in any underground workings.\n\nRecord-keeping requirements (WHS Act s.38(6)): records of all notifiable incidents must be kept for at least 5 years. The incident scene must be preserved until an inspector arrives or SafeWork NSW gives permission to disturb it.\n\nBest practice — WHS Incident Register: record ALL workplace injuries, near misses, and hazard reports (not just notifiable incidents). Include: date, time, location, persons involved, description, immediate cause, contributing factors, corrective actions. Review incident register regularly to identify trends and implement preventive measures.\n\nIn Victoria, notify WorkSafe Victoria (1800 136 089) under the OHS Act 2004. In New Zealand, notify WorkSafe NZ (0800 030 040) under the Health and Safety at Work Act 2015.",
    citations: [
      {
        title: "Work Health and Safety Act 2011 (NSW)",
        section: "s.38 (duty to notify notifiable incidents)",
        jurisdiction: "NSW",
        url: "https://legislation.nsw.gov.au/view/html/inforce/current/act-2011-010",
      },
      {
        title: "ISO 45001:2018 — Occupational Health and Safety Management Systems",
        section: "Clause 9.1.1 (monitoring, measurement, analysis and performance evaluation)",
        jurisdiction: "Federal",
        url: "https://www.iso.org/iso-45001-occupational-health-and-safety.html",
      },
    ],
    lastVerified: "2026-05-01",
  },

];

// ─── HELPERS ─────────────────────────────────────────────────────────────────

/**
 * Returns all Q&A entries relevant to a given jurisdiction.
 * "All" entries are always included.
 */
export function getQAForJurisdiction(jurisdiction: string): QAEntry[] {
  return QA_DOCTRINE.filter(
    (e) => e.jurisdiction === "All" || e.jurisdiction === jurisdiction || jurisdiction === "All"
  );
}

/**
 * Returns a formatted string of Q&A entries for injection into the LLM system prompt.
 * Includes the canonical question, answer, and citation titles/sections.
 */
export function buildQADoctrineSummary(jurisdictions: string[]): string {
  const relevant = QA_DOCTRINE.filter(
    (e) =>
      e.jurisdiction === "All" ||
      jurisdictions.includes(e.jurisdiction) ||
      jurisdictions.includes("All")
  );

  if (relevant.length === 0) return "";

  const lines: string[] = [
    "CANONICAL Q&A DOCTRINE",
    "The following are authoritative question-and-answer pairs drawn from verified regulatory sources.",
    "When the user's question closely matches a canonical question below, ground your answer in the canonical answer and use the listed citations.",
    "",
  ];

  for (const entry of relevant) {
    lines.push(`[${entry.id}] ${entry.topic} — ${entry.jurisdiction}`);
    lines.push(`Q: ${entry.question}`);
    lines.push(`A: ${entry.answer}`);
    lines.push(`Sources: ${entry.citations.map((c) => `${c.title}${c.section ? `, ${c.section}` : ""}`).join("; ")}`);
    lines.push("");
  }

  return lines.join("\n");
}

/**
 * Returns all unique topic areas in the doctrine.
 */
export function getTopics(): string[] {
  const seen = new Set<string>();
  return QA_DOCTRINE.map((e) => e.topic).filter((t) => {
    if (seen.has(t)) return false;
    seen.add(t);
    return true;
  });
}

/**
 * Returns all Q&A entries for a given topic.
 */
export function getQAByTopic(topic: string): QAEntry[] {
  return QA_DOCTRINE.filter((e) => e.topic === topic);
}
