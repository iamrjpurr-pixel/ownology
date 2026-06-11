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
        section: "Division 2.1 — Producer registration",
        jurisdiction: "Federal",
        url: "https://www.legislation.gov.au/Details/F2018L00960",
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
    keywords: ["vintage", "variety", "geographic indication", "GI", "region", "label claim", "85%", "Label Integrity"],
    answer:
      "Under the Label Integrity Program (LIP) administered by Wine Australia: (1) Vintage claim: at least 85% of the wine must be made from grapes harvested in the stated vintage year. (2) Variety claim: at least 85% of the wine must be made from the stated grape variety. (3) Geographic Indication (GI) claim: at least 85% of the wine must be made from grapes grown in the stated GI region. For blends of two or three varieties or regions, each component must be listed in descending order of proportion, and the 85% rule applies to the total blend. Producers must maintain records sufficient to substantiate all label claims for at least seven years. Wine Australia audits producers and can require label amendments or impose penalties for non-compliance.",
    citations: [
      {
        title: "Wine Australia Act 2013",
        section: "Part 5 — Label Integrity Program; s.40C — Percentage rules",
        jurisdiction: "Federal",
        url: "https://www.legislation.gov.au/Details/C2022C00326",
      },
      {
        title: "Wine Australia Regulations 2018",
        section: "Part 4 — Label Integrity",
        jurisdiction: "Federal",
        url: "https://www.legislation.gov.au/Details/F2018L00960",
      },
    ],
    lastVerified: "2026-05-01",
  },

  // ═══════════════════════════════════════════════════════════════════════════
  // 4. EXPORT COMPLIANCE
  // ═══════════════════════════════════════════════════════════════════════════

  {
    id: "fed-export-licence",
    topic: "Export Compliance",
    jurisdiction: "Federal",
    question: "What do I need to export wine from Australia?",
    keywords: ["export", "licence", "Wine Australia", "export permit", "certificate", "overseas", "international"],
    answer:
      "To export wine from Australia you need: (1) An Export Licence from Wine Australia under the Wine Australia Act 2013 — this is separate from your producer registration. (2) An Export Permit for each shipment, obtained through the Wine Australia portal. (3) A Certificate of Origin or Health Certificate (depending on the destination country's requirements) — issued by Wine Australia. (4) Labels for export must be pre-registered in the Wine Australia Label Directory before shipment. Some destination countries have additional requirements (e.g. EU requires a VI-1 certificate; China requires specific label registration). Contact Wine Australia's export team for country-specific requirements.",
    citations: [
      {
        title: "Wine Australia Act 2013",
        section: "Part 3 — Export licences; Part 4 — Export permits",
        jurisdiction: "Federal",
        url: "https://www.legislation.gov.au/Details/C2022C00326",
      },
      {
        title: "Wine Australia Regulations 2018",
        section: "Part 3 — Export",
        jurisdiction: "Federal",
        url: "https://www.legislation.gov.au/Details/F2018L00960",
      },
    ],
    lastVerified: "2026-05-01",
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
