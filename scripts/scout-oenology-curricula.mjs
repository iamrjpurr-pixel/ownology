#!/usr/bin/env node
/**
 * Phase A · Oenology Curriculum Scouting Pass
 *
 * Iterates the 22 known unit codes from CSU Bachelor of Wine Science and
 * Adelaide BVitOenol, calls Perplexity Sonar-Pro with a strict JSON schema,
 * and writes one consolidated JSON file to /app/references/education/.
 *
 * NO DB writes. NO schema changes. Pure scouting so we can eyeball the raw
 * output before committing to the two-layer data model.
 *
 * Usage:
 *   PERPLEXITY_API_KEY=... node scripts/scout-oenology-curricula.mjs
 *   node scripts/scout-oenology-curricula.mjs --limit 3          # test with 3 units
 *   node scripts/scout-oenology-curricula.mjs --unit WSC318       # single unit
 *
 * Cost estimate: ~$0.02/unit × 22 units ≈ $0.44 total.
 */

import fs from "node:fs";
import path from "node:path";

// --- Config ---------------------------------------------------------------

const OUT_DIR = "/app/references/education";
const OUT_FILE = path.join(
  OUT_DIR,
  `scouting-pass-${new Date().toISOString().slice(0, 10)}.json`,
);
const MODEL = "sonar-pro";
const SLEEP_MS = 800; // stay under Perplexity soft rate ceiling
const TIMEOUT_MS = 45_000;

// --- Unit catalogue -------------------------------------------------------
// Extracted from /app/references/education/{oenology-comparison-slides.md,
// calendar.adelaide.edu.au_aprcw_2025_bvito_bvitoenol.md}.

const UNITS = [
  // CSU — Bachelor of Wine Science (10 wine-specific units)
  { source: "csu", code: "WSC111", title: "Grape and Wine Science", level: 1, focus: "Introductory overview" },
  { source: "csu", code: "WSC115", title: "Wine Science 1", level: 1, focus: "Fermentation, SO₂, phenolics, oxidation, QC" },
  { source: "csu", code: "WSC202", title: "Wine Production 1", level: 2, focus: "Table wine production fundamentals" },
  { source: "csu", code: "WSC217", title: "Sensory Science", level: 2, focus: "Taste/smell physiology, fault identification" },
  { source: "csu", code: "WSC303", title: "Wine Production 2", level: 3, focus: "Sparkling, fortified, NOLO wines" },
  { source: "csu", code: "WSC316", title: "Wine Sensory Assessment", level: 3, focus: "Advanced sensory evaluation" },
  { source: "csu", code: "WSC317", title: "Wine Science 2", level: 3, focus: "Flavour compounds, phenolic chemistry" },
  { source: "csu", code: "WSC318", title: "Wine Microbiology", level: 3, focus: "Yeast ecology, MLF, spoilage control" },
  { source: "csu", code: "WSC319", title: "Wine Chemistry", level: 3, focus: "Fining agents, stability, enzyme treatments" },
  { source: "csu", code: "WSC321", title: "Winery Engineering", level: 3, focus: "Equipment design, utilities, waste compliance" },

  // Adelaide — Bachelor of Viticulture & Oenology (12 core oenology units)
  { source: "adelaide", code: "OENOLOGY 1018NW", title: "Foundations of Wine Science I", level: 1, focus: "Viticulture, oenology, sensory — integrated intro" },
  { source: "adelaide", code: "OENOLOGY 2501WT", title: "Microbiology for Viticulture and Oenology II", level: 2, focus: "Yeast + bacteria + spoilage" },
  { source: "adelaide", code: "OENOLOGY 2502WT", title: "Sensory Studies II", level: 2, focus: "Sensory science foundations" },
  { source: "adelaide", code: "OENOLOGY 2503WT", title: "Introductory Winemaking II", level: 2, focus: "Table wine production" },
  { source: "adelaide", code: "OENOLOGY 3003WT", title: "Wine Packaging and Quality Management III", level: 3, focus: "Packaging, QC, shelf life" },
  { source: "adelaide", code: "OENOLOGY 3007WT", title: "Stabilisation and Clarification III", level: 3, focus: "Fining, cold-stab, filtration" },
  { source: "adelaide", code: "OENOLOGY 3016WT", title: "Cellar and Winery Waste Management III", level: 3, focus: "Waste streams, environmental compliance" },
  { source: "adelaide", code: "OENOLOGY 3037WT", title: "Distillation, Fortified & Sparkling Winemaking III", level: 3, focus: "Fortified + sparkling + spirits" },
  { source: "adelaide", code: "OENOLOGY 3046WT", title: "Fermentation Technology III", level: 3, focus: "Advanced fermentation" },
  { source: "adelaide", code: "OENOLOGY 3047WT", title: "Winemaking at Vintage III", level: 3, focus: "Vintage operations, practicum" },
  { source: "adelaide", code: "OENOLOGY 3520WT", title: "Advances in Wine Science III", level: 4, focus: "Contemporary research topics" },
  { source: "adelaide", code: "OENOLOGY 3530WT", title: "Engineering for Viticulture and Oenology III", level: 3, focus: "Winery engineering, utilities" },
];

// --- Perplexity JSON schema ----------------------------------------------

const responseSchema = {
  type: "object",
  properties: {
    learningOutcomes: {
      type: "array",
      items: { type: "string" },
      description: "3-8 verbatim or paraphrased learning outcomes from the university's official handbook or subject outline.",
    },
    keyConcepts: {
      type: "array",
      items: { type: "string" },
      description: "8-15 discrete concepts covered (e.g. 'malolactic fermentation nutrient requirements', 'anthocyanin polymerisation kinetics').",
    },
    prescribedTexts: {
      type: "array",
      items: {
        type: "object",
        properties: {
          citation: { type: "string", description: "Full citation — author(s), year, title, publisher, edition." },
          chapters: { type: "array", items: { type: "string" }, description: "Specific chapter numbers or titles referenced in the unit, if known." },
          copyright: { type: "string", enum: ["paywalled", "open_access", "unknown"], description: "Best-guess access status." },
        },
        required: ["citation", "chapters", "copyright"],
        additionalProperties: false,
      },
      description: "Prescribed or recommended textbooks (e.g. Boulton PPW, Iland CAGW, Ribéreau-Gayon, Jackson, Robinson).",
    },
    awriCrossRefs: {
      type: "array",
      items: { type: "string" },
      description: "AWRI fact sheets, technical reviews, or Wine Australia final reports that map to this unit's content.",
    },
    openAccessPapers: {
      type: "array",
      items: {
        type: "object",
        properties: {
          title: { type: "string" },
          authors: { type: "string" },
          journal: { type: "string" },
          year: { type: ["integer", "null"] },
          url: { type: ["string", "null"] },
        },
        required: ["title", "authors", "journal", "year", "url"],
        additionalProperties: false,
      },
      description: "Peer-reviewed open-access papers matching the unit's topic (max 5).",
    },
    wbsDomainCandidates: {
      type: "array",
      items: {
        type: "string",
        enum: ["D1_vineyard", "D2_harvest", "D3_crushing_ferment", "D4_fermentation", "D5_post_ferment", "D6_stabilisation", "D7_packaging", "D8_sensory", "D9_maintenance", "D10_compliance"],
      },
      description: "Which of Ownology's WBS domains this unit's content best maps to. Usually 1-3 domains.",
    },
    layer: {
      type: "string",
      enum: ["basic", "advanced"],
      description: "Which of Ownology's two education layers this unit belongs to. Level-1 undergrad = basic; Level-2/3/4 with heavy chemistry/microbiology = advanced.",
    },
    ownedContentBridges: {
      type: "array",
      items: { type: "string" },
      description: "Ownology assets we ALREADY hold that speak to this unit's concepts: MoreWine bibles (red/white), MoreWine papers (SO₂, MLF, oak, sanitation, fining, bench trials, inert gas, pH meter, oxygen ferment), AWRI fact sheets (stuck ferment, Brett, botrytis, MLF, protein stability, ethanol reduction, small-lot). Return the specific asset name(s).",
    },
    assessmentStyle: {
      type: "string",
      description: "One-line summary of how the unit is assessed (exam + practical + lab report + portfolio, etc.).",
    },
    urlCandidates: {
      type: "array",
      items: { type: "string" },
      description: "Public URLs Perplexity relied on — handbook page, subject outline PDF, or degree calendar.",
    },
  },
  required: [
    "learningOutcomes",
    "keyConcepts",
    "prescribedTexts",
    "awriCrossRefs",
    "openAccessPapers",
    "wbsDomainCandidates",
    "layer",
    "ownedContentBridges",
    "assessmentStyle",
    "urlCandidates",
  ],
  additionalProperties: false,
};

const SYSTEM_PROMPT = `You are a research assistant scouting the Australian tertiary oenology (wine science) curriculum. Given a subject code + title + institution, your job is to search public sources — university handbooks, subject outline PDFs, calendar pages, AWRI, Wine Australia, and open-access journal repositories — and return a strict-JSON structured summary.

The output is being used to build a scaffold for an "advanced" education layer inside a winemaker-facing platform. We are NOT ingesting copyrighted textbook content. We ARE cataloguing (a) what these units teach, (b) which public/open-access sources back the teaching, and (c) which of our own assets we can bridge into each unit.

CRITICAL — WHERE TO LOOK
- CSU codes (WSC*, VIT*): hit handbook.csu.edu.au/subject/2026/{CODE} and handbook.csu.edu.au/subject/2024/{CODE} directly. The CSU handbook pages list Abstract, Syllabus Topics, Learning Outcomes, Assessment Items, and Prescribed Texts in a structured format — that is your primary source. Also check study.csu.edu.au/courses/bachelor-wine-science for the course-level overview.
- Adelaide codes (OENOLOGY *WT, VITICULT *WT): hit calendar.adelaide.edu.au/aprcw/2025/{CODE} and courseoutlines.adelaide.edu.au/course/{CODE}. Also check the Waite Campus / School of Agriculture, Food and Wine pages.
- Do NOT rely on aggregator sites (open.edu.au, uac.edu.au, educations.com) for learning outcomes or prescribed texts — they do not publish subject-level detail.
- If the direct handbook URL returns nothing, say so honestly with empty arrays rather than making up content.

RULES
1. Cite handbook/calendar URLs by including them in the urlCandidates array. Prefer official .edu.au pages.
2. For prescribed texts, be conservative — include a citation only if the source names it (handbook, syllabus, subject outline, or a corroborating .edu.au page). Do not guess.
3. AWRI cross-refs must be REAL AWRI fact sheets or technical reviews. If you're unsure whether an AWRI resource exists on this topic, leave it out.
4. Open-access papers must resolve to real journal URLs. Prefer AJGWR, OENO One, AJEV, Food Chemistry, JASBC.
5. For ownedContentBridges, ONLY reference assets from this exact list — do not invent asset names:
   - MoreWine Red Winemaking Outline
   - MoreWine Guide to Red Winemaking (bible)
   - MoreWine Guide to White Wine Making (bible)
   - MoreWine paper: SO2 management
   - MoreWine paper: MLF
   - MoreWine paper: Oak barrel care
   - MoreWine paper: Oak info
   - MoreWine paper: Fining agents
   - MoreWine paper: Sanitation
   - MoreWine paper: Bench trials
   - MoreWine paper: Inert gas
   - MoreWine paper: pH meter
   - MoreWine paper: Oxygen in ferment
   - AWRI fact sheet: Stuck fermentation
   - AWRI fact sheet: Controlling Brett
   - AWRI fact sheet: Managing botrytis
   - AWRI fact sheet: MLF (achieving successful)
   - AWRI fact sheet: MLF in red wine
   - AWRI fact sheet: Protein stability
   - AWRI fact sheet: Reducing ethanol
   - AWRI fact sheet: Small-lot fermentation
   - AWRI fact sheet: Avoiding lab spoilage
6. layer: basic = introductory / level-1 units with home-scale relevance. advanced = level-2+ units with heavy chemistry, microbiology, or engineering content.
7. Never fabricate. If you can't find a category's content, return an empty array or empty string.

Return ONLY the requested JSON. No prose. No markdown fences.`;

// --- Helpers --------------------------------------------------------------

function parseArgs() {
  const args = process.argv.slice(2);
  const out = { limit: null, unit: null };
  for (let i = 0; i < args.length; i++) {
    if (args[i] === "--limit" && args[i + 1]) {
      out.limit = parseInt(args[i + 1], 10);
      i++;
    } else if (args[i] === "--unit" && args[i + 1]) {
      out.unit = args[i + 1];
      i++;
    }
  }
  return out;
}

async function callPerplexity(unit, key) {
  const userMsg = [
    `Institution: ${unit.source === "csu" ? "Charles Sturt University (CSU) — Bachelor of Wine Science" : "University of Adelaide — Bachelor of Viticulture and Oenology"}`,
    `Subject code: ${unit.code}`,
    `Subject title: ${unit.title}`,
    `Level: ${unit.level}`,
    `Known focus: ${unit.focus}`,
    "",
    "Search the university's public handbook and any linked subject outline. Return the structured JSON per the schema.",
  ].join("\n");

  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), TIMEOUT_MS);

  const resp = await fetch("https://api.perplexity.ai/chat/completions", {
    method: "POST",
    signal: controller.signal,
    headers: {
      Authorization: `Bearer ${key}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      model: MODEL,
      max_tokens: 2500,
      messages: [
        { role: "system", content: SYSTEM_PROMPT },
        { role: "user", content: userMsg },
      ],
      response_format: {
        type: "json_schema",
        json_schema: { schema: responseSchema },
      },
    }),
  }).finally(() => clearTimeout(timer));

  if (!resp.ok) {
    const text = await resp.text().catch(() => "");
    throw new Error(`Perplexity ${resp.status}: ${text.slice(0, 300)}`);
  }

  const data = await resp.json();
  const content = data?.choices?.[0]?.message?.content ?? "";
  const citations = Array.isArray(data?.citations) ? data.citations : [];
  const usage = data?.usage ?? {};

  let parsed;
  try {
    parsed = JSON.parse(content);
  } catch {
    // Sometimes wrapped in ```json — strip fences and retry.
    const stripped = content.replace(/^```json\s*/i, "").replace(/```\s*$/, "").trim();
    parsed = JSON.parse(stripped);
  }

  return { parsed, citations, usage };
}

function sleep(ms) {
  return new Promise((r) => setTimeout(r, ms));
}

// --- Main ------------------------------------------------------------------

(async () => {
  const key = process.env.PERPLEXITY_API_KEY;
  if (!key) {
    console.error("✖ PERPLEXITY_API_KEY missing. Set it in /app/.env and re-run.");
    process.exit(1);
  }

  const { limit, unit: filterUnit } = parseArgs();
  let queue = UNITS.slice();
  if (filterUnit) queue = queue.filter((u) => u.code.toLowerCase() === filterUnit.toLowerCase());
  if (limit) queue = queue.slice(0, limit);

  console.log(`▶ Scouting ${queue.length} unit${queue.length === 1 ? "" : "s"} via Perplexity ${MODEL}…`);
  console.log(`  Estimated cost: ~$${(queue.length * 0.02).toFixed(2)} USD`);
  console.log(`  Output → ${OUT_FILE}`);
  console.log("");

  const results = [];
  let totalPromptTokens = 0;
  let totalCompletionTokens = 0;

  for (let i = 0; i < queue.length; i++) {
    const u = queue[i];
    const label = `[${i + 1}/${queue.length}] ${u.source.toUpperCase()} · ${u.code} · ${u.title}`;
    process.stdout.write(`${label} … `);
    const t0 = Date.now();
    try {
      const { parsed, citations, usage } = await callPerplexity(u, key);
      totalPromptTokens += usage?.prompt_tokens ?? 0;
      totalCompletionTokens += usage?.completion_tokens ?? 0;
      results.push({
        source: u.source,
        code: u.code,
        title: u.title,
        level: u.level,
        focus: u.focus,
        scoutedAt: new Date().toISOString(),
        perplexity: parsed,
        perplexityCitations: citations,
        latencyMs: Date.now() - t0,
      });
      console.log(`OK · ${Date.now() - t0}ms · ${parsed.learningOutcomes?.length ?? 0} LO / ${parsed.keyConcepts?.length ?? 0} concepts / ${parsed.prescribedTexts?.length ?? 0} texts / bridges:${parsed.ownedContentBridges?.length ?? 0} · layer:${parsed.layer ?? "?"}`);
    } catch (err) {
      console.log(`FAIL · ${err.message.slice(0, 120)}`);
      results.push({
        source: u.source,
        code: u.code,
        title: u.title,
        level: u.level,
        focus: u.focus,
        scoutedAt: new Date().toISOString(),
        error: err.message,
      });
    }
    if (i < queue.length - 1) await sleep(SLEEP_MS);
  }

  fs.mkdirSync(OUT_DIR, { recursive: true });
  const payload = {
    generatedAt: new Date().toISOString(),
    model: MODEL,
    units: results,
    tokenTotals: { prompt: totalPromptTokens, completion: totalCompletionTokens },
  };
  fs.writeFileSync(OUT_FILE, JSON.stringify(payload, null, 2));

  const ok = results.filter((r) => !r.error).length;
  const failed = results.length - ok;
  console.log("");
  console.log(`✔ Wrote ${results.length} units → ${OUT_FILE}`);
  console.log(`   Success: ${ok} · Failed: ${failed}`);
  console.log(`   Tokens · prompt=${totalPromptTokens} completion=${totalCompletionTokens}`);
})().catch((err) => {
  console.error("✖ Fatal:", err);
  process.exit(1);
});
