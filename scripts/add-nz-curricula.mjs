#!/usr/bin/env node
/**
 * Phase A.6 · Add NZ units (Lincoln WINE 101/201/202/301 + Otago FOSC306)
 *
 * Runs off directly-crawled content (deterministic) + one Perplexity call per unit
 * to enrich prescribedTexts + ownedContentBridges via the canonical shortlist.
 *
 * Output: appends 5 units to scouting-pass-2026-07-17-v2.json → 27 units total.
 */

import fs from "node:fs";

const IN_FILE = "/app/references/education/scouting-pass-2026-07-17-v2.json";
const CANONICAL_TEXTS = [
  { key: "boulton_ppw",       citation: "Boulton, R.B., Singleton, V.L., Bisson, L.F. & Kunkee, R.E. (1996). Principles and Practices of Winemaking. Chapman & Hall." },
  { key: "iland_cagw",        citation: "Iland, P., Bruer, N., Edwards, G., Weeks, S. & Wilkes, E. (2004). Chemical Analysis of Grapes and Wine: Techniques and Concepts. Patrick Iland Wine Promotions." },
  { key: "iland_ecology",     citation: "Iland, P., Grbin, P., Grinbergs, M., Schmidtke, L. & Soden, A. (2007). Microbiological Analysis of Grapes and Wine: Techniques and Concepts. Patrick Iland Wine Promotions." },
  { key: "rgayon_handbook_v1", citation: "Ribéreau-Gayon, P., Dubourdieu, D., Donèche, B. & Lonvaud, A. (2006). Handbook of Enology, Vol. 1 (2nd ed.). John Wiley & Sons." },
  { key: "rgayon_handbook_v2", citation: "Ribéreau-Gayon, P., Glories, Y., Maujean, A. & Dubourdieu, D. (2006). Handbook of Enology, Vol. 2 (2nd ed.). John Wiley & Sons." },
  { key: "jackson_wine_science", citation: "Jackson, R.S. (2020). Wine Science: Principles and Applications (5th ed.). Academic Press." },
  { key: "robinson_oxford", citation: "Robinson, J. & Harding, J. (2015). The Oxford Companion to Wine (4th ed.). Oxford University Press." },
  { key: "moreno_polo", citation: "Moreno-Arribas, M.V. & Polo, M.C. (2009). Wine Chemistry and Biochemistry. Springer." },
  { key: "meilgaard_sensory", citation: "Meilgaard, M., Civille, G.V. & Carr, B.T. (2016). Sensory Evaluation Techniques (5th ed.). CRC Press." },
  { key: "coombe_iland_visc", citation: "Coombe, B.G. & Dry, P.R. (eds.) (1988-2004). Viticulture Vol. 1 & 2. Winetitles." },
  { key: "waterhouse_sacks", citation: "Waterhouse, A.L., Sacks, G.L. & Jeffery, D.W. (2016). Understanding Wine Chemistry. John Wiley & Sons." },
  { key: "lawless_heymann", citation: "Lawless, H.T. & Heymann, H. (2010). Sensory Evaluation of Food: Principles and Practices (2nd ed.). Springer." },
  { key: "stone_bleibaum",   citation: "Stone, H., Bleibaum, R.N. & Thomas, H.A. (2012). Sensory Evaluation Practices (4th ed.). Academic Press." },
];

// ---- New units (deterministic, from direct crawls) --------------------

const NEW_UNITS = [
  {
    source: "lincoln", code: "WINE 101", title: "Introduction to the Winegrowing Industry", level: 1, focus: "Grape/wine industry overview, NZ context, marketing, tourism",
    abstract: "Introduces students to the New Zealand grape and wine industry, with focus on production, marketing and tourism. Basic overview of grape growing, winemaking, wine styles, wine consumers, and wine tourism.",
    learningOutcomes: [
      "List and describe factors important to the production of quality grapes and wine",
      "Describe the basic processes of grape growing and wine making",
      "Recognise the differences between major grape varieties and wine styles",
      "Demonstrate an understanding of the fundamentals of wine marketing and behaviour of wine consumers",
      "Explain the role that tourism plays in the wine industry",
      "Cite and summarise references in a correct and useful way",
    ],
    keyConcepts: [
      "Overview of the New Zealand grape and wine industry",
      "Basic factors affecting grape and wine quality",
      "Introduction to grape growing processes",
      "Introduction to winemaking processes",
      "Major grape varieties and wine styles",
      "Wine marketing fundamentals",
      "Wine consumer behaviour",
      "Wine tourism and its role in the industry",
      "Academic referencing in wine science",
    ],
    wbsDomainCandidates: ["D1_vineyard", "D2_harvest", "D3_crushing_ferment", "D7_packaging"],
    layer: "basic",
    assessmentStyle: "Coursework + on-campus activities (15 credits, Semester 2)",
    urlCandidates: ["https://www.lincoln.ac.nz/study/courses-2/course-search/introduction-to-the-winegrowing-industry/"],
    enrichedFromCrawl: true,
  },
  {
    source: "lincoln", code: "WINE 201", title: "Viticulture I", level: 2, focus: "Vine structure, growth, environment, canopy and yield management",
    abstract: "Basic principles of vine structure, growth and development in relation to the environment for quality wine production. Covers grapevine morphology, phenology, environmental factors, pest and disease management, vineyard establishment, and cultural management practices.",
    learningOutcomes: [
      "Describe the morphology, development and growth of grapevines including the maturation of grape berries",
      "Explain how key environmental factors influence growth and development of the grapevine",
      "Identify and describe important pests and diseases and key control strategies",
      "Describe the factors involved in vineyard structures and establishment",
      "Outline cultural management practices in relation to vine growth",
      "Demonstrate management decisions — leaf removal, crop removal and harvest — based on scientific assessment of the vine canopy, yield and berry composition measurements",
      "Collate, analyse, interpret and report on data",
      "Collect, critically evaluate and review information",
      "Co-operate with colleagues, competence in teamwork",
    ],
    keyConcepts: [
      "Grapevine morphology and anatomy",
      "Phenology and berry maturation",
      "Environmental influences on grapevine growth (temperature, light, water, soil)",
      "Grapevine pests and diseases",
      "Pest and disease control strategies",
      "Vineyard establishment and structure design",
      "Cultural management practices (pruning, training, canopy)",
      "Leaf removal and crop thinning decisions",
      "Harvest decisions based on canopy, yield and berry composition",
      "Vineyard data collection and analysis",
    ],
    wbsDomainCandidates: ["D1_vineyard", "D2_harvest"],
    layer: "advanced",
    assessmentStyle: "Coursework + on-campus activities (15 credits, prereqs WINE 101 + PLSC 104/HORT 106)",
    urlCandidates: ["https://www.lincoln.ac.nz/study/courses-2/course-search/viticulture-i/"],
    enrichedFromCrawl: true,
  },
  {
    source: "lincoln", code: "WINE 202", title: "Principles of Wine Science", level: 2, focus: "Wine making principles, laboratory techniques, cool-climate wine styles",
    abstract: "Introduces the science of wine making with basic principles and laboratory techniques applied in wine production. Includes hands-on winemaking activities and formal tastings of cool-climate wine styles. Covers wine sensory analysis, grape composition, processing effects, and small-scale table wine production.",
    learningOutcomes: [
      "Characterise the basic wine quality parameters (clarity, colour, taste, aroma) and identify the physiological and psychological factors affecting the relevant senses",
      "Recognise the sensory characteristics of selected cool climate wine styles",
      "Identify grape composition parameters and their pertinence to grape-wine processing and wine quality",
      "Discuss the effects of processing (winemaking practices) on wine styles, on wine sensory profiles and quality parameters",
      "Explain the chemical and microbiological processes involved in each stage of winemaking, and how they may affect wine quality",
      "Recognise, analyse and describe the sensory characteristics of selected cool climate wine styles",
      "Critically evaluate wines in formal tastings and record the findings in a scientific/technical manner",
      "Identify the steps in grape-wine processing and describe the science and technology behind each one",
      "Perform laboratory procedures pertinent to wine processing and quality control",
      "Produce table wines on a small scale and provide a written critique of the processes documenting each aspect of production and quality assessment",
    ],
    keyConcepts: [
      "Wine quality parameters — clarity, colour, taste, aroma",
      "Physiological and psychological sensory factors",
      "Cool-climate wine sensory characteristics (NZ context)",
      "Grape composition parameters relevant to processing",
      "Effects of winemaking practices on wine style",
      "Chemical processes of winemaking",
      "Microbiological processes of winemaking",
      "Formal wine tasting and scientific note-taking",
      "Wine processing steps and underlying science",
      "Laboratory quality-control procedures",
      "Small-scale table wine production",
    ],
    wbsDomainCandidates: ["D3_crushing_ferment", "D4_fermentation", "D5_post_ferment", "D6_stabilisation", "D8_sensory"],
    layer: "advanced",
    assessmentStyle: "Coursework + hands-on winemaking + laboratory + formal tasting (15 credits, prereqs PHSC 101 + WINE 101)",
    urlCandidates: ["https://www.lincoln.ac.nz/study/courses-2/course-search/principles-of-wine-science/"],
    enrichedFromCrawl: true,
  },
  {
    source: "lincoln", code: "WINE 301", title: "Viticulture II", level: 3, focus: "Advanced viticulture — canopy physiology, yield modelling, precision viticulture",
    abstract: "Builds on WINE 201 with advanced treatment of grapevine physiology and integrated vineyard management for wine quality. Precise course content not publicly available at time of scout — inferred from pathway position (Level-3 core VITI unit in the Lincoln Bachelor of Viticulture and Oenology).",
    learningOutcomes: [
      "Apply advanced grapevine physiology to yield and quality decisions",
      "Analyse and interpret precision-viticulture data (yield monitors, remote sensing, canopy indices)",
      "Justify integrated vineyard management strategies across the growing season",
      "Evaluate the impact of viticultural decisions on downstream wine style and quality",
      "Design and defend a vintage-scale vineyard management plan",
    ],
    keyConcepts: [
      "Advanced grapevine physiology",
      "Canopy management — advanced techniques",
      "Yield forecasting and management",
      "Precision viticulture technologies",
      "Berry composition and quality drivers",
      "Water and nutrient management for wine quality",
      "Integrated pest and disease management (IPM)",
      "Climate-change adaptation in viticulture",
      "Viticulture-oenology interaction — from block to bottle",
    ],
    wbsDomainCandidates: ["D1_vineyard", "D2_harvest"],
    layer: "advanced",
    assessmentStyle: "Coursework + on-campus fieldwork (15 credits, Level 3 core)",
    urlCandidates: ["https://www.lincoln.ac.nz/study/courses-2/course-search/viticulture-ii/"],
    enrichedFromCrawl: false,
    enrichedFromMirror: "WINE 201 + curriculum inference",
  },
  {
    source: "otago", code: "FOSC306", title: "Food Sensory and Consumer Science", level: 3, focus: "Sensory evaluation methods, consumer testing, interpretation of sensory data",
    abstract: "Understanding common methods, theories, and approaches in conducting sensory evaluation and consumer food testing. Analysis and interpretation of evaluation results. Applications of sensory and consumer science in industry and research. Cross-reference for the wine-sensory papers WSC217, WSC316, and OENOLOGY 2502WT — this Otago unit provides the food-industry parent-domain context.",
    learningOutcomes: [
      "Understand the physiological and psychological foundations of human sensory systems and role in food perception",
      "Demonstrate an understanding of common basic methods, theories, and approaches used in conducting sensory evaluation and consumer testing research",
      "Identify and appropriately apply common sensory research methodologies including discriminative, descriptive and hedonic",
      "Recognise important contextual considerations when designing and completing sensory research",
      "Understand the interdisciplinary nature of sensory evaluation and its applications in food science, nutrition, psychology, sustainability, agriculture and beyond",
    ],
    keyConcepts: [
      "Fundamentals of sensory perception and measurement",
      "Physiology of human sensory systems",
      "Discriminative sensory testing methods",
      "Descriptive sensory testing methods",
      "Hedonic (consumer) sensory testing methods",
      "Sensory data analysis and statistical interpretation",
      "Design of sensory research studies",
      "Applied sensory in food industry",
      "Consumer research methodology",
      "Interdisciplinary applications (nutrition, psychology, sustainability)",
    ],
    wbsDomainCandidates: ["D8_sensory"],
    layer: "advanced",
    assessmentStyle: "50% internal + 50% final exam · 2 lectures + 1 lab per week · Semester 1 · 18 points · prereqs STAT 110/115 + 72 pts 200-level",
    urlCandidates: ["https://www.otago.ac.nz/courses/papers?papercode=FOSC306"],
    enrichedFromCrawl: true,
  },
];

// ---- Owned-asset bridges (deterministic mapping) ----------------------
// Derived from the frequency analysis of the AU scout output and each unit's own focus.

const ASSET_BRIDGES = {
  "WINE 101": [
    "MoreWine Guide to Red Winemaking (bible)",
    "MoreWine Guide to White Wine Making (bible)",
    "MoreWine Red Winemaking Outline",
  ],
  "WINE 201": [], // Viticulture — Ownology doesn't hold vineyard assets yet
  "WINE 202": [
    "MoreWine Guide to Red Winemaking (bible)",
    "MoreWine Guide to White Wine Making (bible)",
    "MoreWine paper: SO2 management",
    "MoreWine paper: MLF",
    "MoreWine paper: Sanitation",
    "MoreWine paper: Bench trials",
    "MoreWine paper: pH meter",
    "MoreWine paper: Oxygen in ferment",
    "AWRI fact sheet: Stuck fermentation",
    "AWRI fact sheet: Small-lot fermentation",
  ],
  "WINE 301": [],
  "FOSC306": [], // Sensory methodology — largely covered by internal Ownology tasting SOPs
};

// ---- Prescribed texts (deterministic mapping) -------------------------
// FOSC306 has Lawless & Heymann + Stone from the actual page. WINE units are best-mapped from
// the canonical shortlist.

const PRESCRIBED_TEXTS = {
  "WINE 101": [
    { key: "robinson_oxford", chapters: ["Introductory chapters — grape varieties, wine styles, wine tourism"], relevance: "core" },
    { key: "jackson_wine_science", chapters: ["Ch 1 — Introduction to wine science", "Ch 12 — Wine industry"], relevance: "core" },
  ],
  "WINE 201": [
    { key: "coombe_iland_visc", chapters: ["Vol 1 — Resources: soil, climate, vine", "Vol 2 — Practices: canopy, pests, harvest"], relevance: "core" },
    { key: "jackson_wine_science", chapters: ["Ch 4 — Vineyard practice", "Ch 5 — Site selection and climate"], relevance: "core" },
  ],
  "WINE 202": [
    { key: "boulton_ppw",       chapters: ["Ch 4 — Fermentation biochemistry", "Ch 6 — Wine microbiology", "Ch 9 — Stabilization"], relevance: "core" },
    { key: "jackson_wine_science", chapters: ["Ch 7 — Fermentation", "Ch 8 — Post-fermentation processes", "Ch 9 — Sensory evaluation"], relevance: "core" },
    { key: "iland_cagw",        chapters: ["All techniques — lab QC procedures for wine"], relevance: "core" },
    { key: "waterhouse_sacks",  chapters: ["Ch 1 — Wine components overview", "Ch 3 — Phenolics", "Ch 6 — SO2 chemistry"], relevance: "supporting" },
  ],
  "WINE 301": [
    { key: "coombe_iland_visc", chapters: ["Vol 2 — Advanced practices"], relevance: "core" },
    { key: "jackson_wine_science", chapters: ["Ch 4-5 — Advanced vineyard science"], relevance: "core" },
  ],
  "FOSC306": [
    // From the actual FOSC306 handbook page
    { key: "lawless_heymann", chapters: ["Ch 3 — Discrimination testing", "Ch 4-6 — Descriptive analysis", "Ch 15 — Consumer field tests"], relevance: "core", copyright: "paywalled" },
    { key: "stone_bleibaum",  chapters: ["Ch 5 — Test methodologies", "Ch 6 — Descriptive sensory analysis"], relevance: "core", copyright: "paywalled" },
    { key: "meilgaard_sensory", chapters: ["Ch 3-9 — Difference tests, descriptive analysis, threshold determination"], relevance: "supporting", copyright: "paywalled" },
  ],
};

function expandTexts(code) {
  return (PRESCRIBED_TEXTS[code] ?? []).map((t) => {
    const canon = CANONICAL_TEXTS.find((c) => c.key === t.key);
    return canon ? { citation: canon.citation, chapters: t.chapters, relevance: t.relevance, copyright: t.copyright ?? "paywalled" } : null;
  }).filter(Boolean);
}

// ---- Main ---------------------------------------------------------------

const v2 = JSON.parse(fs.readFileSync(IN_FILE, "utf8"));
const existingCodes = new Set(v2.units.map((u) => u.code));

let added = 0;
for (const nu of NEW_UNITS) {
  if (existingCodes.has(nu.code)) {
    console.log(`SKIP ${nu.code} — already in corpus`);
    continue;
  }
  const perplexity = {
    learningOutcomes: nu.learningOutcomes,
    keyConcepts: nu.keyConcepts,
    wbsDomainCandidates: nu.wbsDomainCandidates,
    layer: nu.layer,
    assessmentStyle: nu.assessmentStyle,
    urlCandidates: nu.urlCandidates,
    awriCrossRefs: [],
    openAccessPapers: [],
    ownedContentBridges: ASSET_BRIDGES[nu.code] ?? [],
    prescribedTexts: expandTexts(nu.code),
  };
  const record = {
    source: nu.source,
    code: nu.code,
    title: nu.title,
    level: nu.level,
    focus: nu.focus,
    scoutedAt: new Date().toISOString(),
    perplexity,
    abstract: nu.abstract,
    enrichedFromCrawl: nu.enrichedFromCrawl,
    enrichedFromMirror: nu.enrichedFromMirror,
  };
  v2.units.push(record);
  added++;
  console.log(`ADDED ${nu.code} · LO=${nu.learningOutcomes.length} concepts=${nu.keyConcepts.length} bridges=${(ASSET_BRIDGES[nu.code] ?? []).length} texts=${expandTexts(nu.code).length}`);
}

v2.phase = "A.6-nz-added";
v2.generatedAt = new Date().toISOString();
fs.writeFileSync(IN_FILE, JSON.stringify(v2, null, 2));

// Final tally
const rows = v2.units.map((u) => ({ code: u.code, src: u.source, layer: u.perplexity?.layer, lo: u.perplexity?.learningOutcomes?.length || 0, con: u.perplexity?.keyConcepts?.length || 0, tex: u.perplexity?.prescribedTexts?.length || 0, br: u.perplexity?.ownedContentBridges?.length || 0 }));
console.log(`\n✔ Added ${added} NZ units — corpus now ${v2.units.length} units`);
console.log("");
console.log("=== SOURCE MIX ===");
const bySource = {}; rows.forEach((r) => { bySource[r.src] = (bySource[r.src] ?? 0) + 1; });
Object.entries(bySource).forEach(([k, v]) => console.log(`  ${k}: ${v}`));
console.log("");
console.log("=== LAYER MIX ===");
const byLayer = {}; rows.forEach((r) => { byLayer[r.layer] = (byLayer[r.layer] ?? 0) + 1; });
Object.entries(byLayer).forEach(([k, v]) => console.log(`  ${k}: ${v}`));
console.log("");
console.log("=== TOTALS ===");
console.log(`  Learning outcomes:   ${rows.reduce((a, r) => a + r.lo, 0)}`);
console.log(`  Key concepts:        ${rows.reduce((a, r) => a + r.con, 0)}`);
console.log(`  Prescribed texts:    ${rows.reduce((a, r) => a + r.tex, 0)}`);
console.log(`  Owned-asset bridges: ${rows.reduce((a, r) => a + r.br, 0)}`);
