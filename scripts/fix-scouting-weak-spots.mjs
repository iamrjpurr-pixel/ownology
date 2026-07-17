#!/usr/bin/env node
/**
 * Phase A.5 · Weak-Spot Fixer
 *
 * Addresses the 3 weak spots surfaced by the initial Perplexity scouting pass:
 *   1. 6 CSU units returned empty (handbook.csu.edu.au is JS-rendered → Perplexity can't crawl deeply).
 *      - 3 have local markdown scrapes: WSC115, WSC202, WSC303 → deterministic parse.
 *      - 4 truly missing: WSC111, WSC217, WSC317, WSC321 → targeted Perplexity retry with
 *        multiple URL patterns and a fallback to archived / degree-finder pages.
 *   2. `prescribedTexts` came back empty for most units. → Second Perplexity pass across all
 *      22 units with the canonical AU wine-science reading list forced as the candidate set.
 *   3. `assessmentStyle` mostly empty. Fill from local scrape where available; leave nulls elsewhere.
 *
 * Output: scouting-pass-2026-07-17-v2.json (does NOT overwrite v1 — audit-preserving).
 */

import fs from "node:fs";
import path from "node:path";

const IN_FILE = "/app/references/education/scouting-pass-2026-07-17.json";
const OUT_FILE = "/app/references/education/scouting-pass-2026-07-17-v2.json";
const EDU_DIR = "/app/references/education";

// --- Canonical AU wine-science textbook reading list --------------------
// These are the ~10 core texts that appear across CSU + Adelaide + UC Davis
// oenology curricula. Perplexity has struggled to cite them without prompting —
// giving it the shortlist as the target set to *match against* fixes that.

const CANONICAL_TEXTS = [
  { key: "boulton_ppw",       citation: "Boulton, R.B., Singleton, V.L., Bisson, L.F. & Kunkee, R.E. (1996). Principles and Practices of Winemaking. Chapman & Hall." },
  { key: "iland_cagw",        citation: "Iland, P., Bruer, N., Edwards, G., Weeks, S. & Wilkes, E. (2004). Chemical Analysis of Grapes and Wine: Techniques and Concepts. Patrick Iland Wine Promotions." },
  { key: "iland_ecology",     citation: "Iland, P., Grbin, P., Grinbergs, M., Schmidtke, L. & Soden, A. (2007). Microbiological Analysis of Grapes and Wine: Techniques and Concepts. Patrick Iland Wine Promotions." },
  { key: "rgayon_handbook_v1", citation: "Ribéreau-Gayon, P., Dubourdieu, D., Donèche, B. & Lonvaud, A. (2006). Handbook of Enology, Vol. 1: The Microbiology of Wine and Vinifications (2nd ed.). John Wiley & Sons." },
  { key: "rgayon_handbook_v2", citation: "Ribéreau-Gayon, P., Glories, Y., Maujean, A. & Dubourdieu, D. (2006). Handbook of Enology, Vol. 2: The Chemistry of Wine — Stabilization and Treatments (2nd ed.). John Wiley & Sons." },
  { key: "jackson_wine_science", citation: "Jackson, R.S. (2020). Wine Science: Principles and Applications (5th ed.). Academic Press." },
  { key: "robinson_oxford", citation: "Robinson, J. & Harding, J. (2015). The Oxford Companion to Wine (4th ed.). Oxford University Press." },
  { key: "moreno_polo", citation: "Moreno-Arribas, M.V. & Polo, M.C. (2009). Wine Chemistry and Biochemistry. Springer." },
  { key: "meilgaard_sensory", citation: "Meilgaard, M., Civille, G.V. & Carr, B.T. (2016). Sensory Evaluation Techniques (5th ed.). CRC Press." },
  { key: "coombe_iland_visc", citation: "Coombe, B.G. & Dry, P.R. (eds.) (1988-2004). Viticulture Vol. 1 & 2. Winetitles." },
  { key: "waterhouse_sacks", citation: "Waterhouse, A.L., Sacks, G.L. & Jeffery, D.W. (2016). Understanding Wine Chemistry. John Wiley & Sons." },
];

// --- 1. Local CSU markdown parser ---------------------------------------

function parseHandbookMd(filePath) {
  const raw = fs.readFileSync(filePath, "utf8");
  const lines = raw.split("\n");

  // Extract subject code from URL line
  const urlLine = lines.find((l) => l.startsWith("**URL:**")) ?? "";
  const url = urlLine.replace(/^\*\*URL:\*\*\s*/, "").trim();
  const codeMatch = url.match(/\/subject\/\d+\/(\w+)/);
  const code = codeMatch ? codeMatch[1].toUpperCase() : null;

  // Find learning outcomes: numbered items after "Learning outcomes" section header,
  // before "Assumed knowledge"
  const loStartIdx = lines.findIndex((l) => l.trim() === "Learning outcomes");
  const loEndIdx = lines.findIndex((l, i) => i > loStartIdx && (l.trim() === "Assumed knowledge" || l.trim() === "Enrolment restrictions"));
  const learningOutcomes = [];
  if (loStartIdx >= 0 && loEndIdx > loStartIdx) {
    const block = lines.slice(loStartIdx + 1, loEndIdx);
    // Pattern: "1." on one line, actual outcome text on next non-empty line, "keyboard_arrow_down" after
    for (let i = 0; i < block.length; i++) {
      const l = block[i].trim();
      if (/^\d+\.$/.test(l)) {
        // Find the next non-empty, non-decorative line
        for (let j = i + 1; j < block.length; j++) {
          const cand = block[j].trim();
          if (!cand || cand === "keyboard_arrow_down" || cand === "Expand all") continue;
          if (/^\d+\.$/.test(cand)) break;
          learningOutcomes.push(cand.replace(/;$/, "").replace(/\.$/, "").trim());
          break;
        }
      }
    }
  }

  // Extract syllabus topics = key concepts. Between "Syllabus" section header and "Offerings".
  const sylStartIdx = lines.findIndex((l) => l.trim() === "Syllabus" && lines[l + 1] !== undefined);
  const sylEndIdx = lines.findIndex((l, i) => i > sylStartIdx && (l.trim() === "Offerings" || l.trim() === "Read More"));
  const keyConcepts = [];
  if (sylStartIdx >= 0 && sylEndIdx > sylStartIdx) {
    const block = lines.slice(sylStartIdx + 1, sylEndIdx);
    // Grab lines that end with ";" or "; and" — those are the enumerated syllabus topics
    for (const l of block) {
      const t = l.trim();
      if (!t) continue;
      if (t.endsWith(";") || t.endsWith("; and") || t.endsWith("; and,")) {
        const cleaned = t.replace(/;( and,?)?$/, "").trim();
        if (cleaned.length > 5 && !cleaned.startsWith("This subject") && !cleaned.startsWith("For more content")) {
          keyConcepts.push(cleaned);
        }
      }
    }
  }

  // Assessment style — usually mentioned in "Work integrated learning" section
  const wilStartIdx = lines.findIndex((l) => l.trim() === "Work integrated learning");
  const wilEndIdx = lines.findIndex((l, i) => i > wilStartIdx && (l.trim() === "Learning activities" || l.trim() === "Learning resources"));
  let assessmentStyle = "";
  if (wilStartIdx >= 0 && wilEndIdx > wilStartIdx) {
    const block = lines.slice(wilStartIdx + 1, wilEndIdx).map((l) => l.trim()).filter(Boolean);
    // Take first line that starts with "Fieldwork" or "Placement" or mentions "Duration"
    const firstDetail = block.find((l) => /Placement|Fieldwork|Duration/.test(l));
    if (firstDetail) assessmentStyle = firstDetail.slice(0, 200);
  }

  return { code, url, learningOutcomes, keyConcepts, assessmentStyle };
}

function parseWsc115FromRaw() {
  // WSC115 is inside oenology-units-raw.md, not a dedicated handbook file
  const raw = fs.readFileSync(path.join(EDU_DIR, "oenology-units-raw.md"), "utf8");
  const section = raw.split(/^## /m).find((s) => s.startsWith("CSU — WSC115"));
  if (!section) return null;

  const abstract = (section.match(/\*\*Abstract:\*\*\s*([^\n]+)/) || [])[1] ?? "";
  const syllabusMatch = section.match(/\*\*Syllabus Topics:\*\*([\s\S]*?)\*\*Learning Outcomes:\*\*/);
  const outcomesMatch = section.match(/\*\*Learning Outcomes:\*\*([\s\S]*?)\*\*Workload:/);

  const keyConcepts = syllabusMatch
    ? syllabusMatch[1].split("\n").filter((l) => l.trim().startsWith("- ")).map((l) => l.replace(/^- /, "").trim())
    : [];
  const learningOutcomes = outcomesMatch
    ? outcomesMatch[1].split("\n").filter((l) => /^\d+\./.test(l.trim())).map((l) => l.replace(/^\d+\.\s*/, "").trim())
    : [];

  return {
    code: "WSC115",
    url: "https://handbook.csu.edu.au/subject/2026/wsc115",
    abstract,
    learningOutcomes,
    keyConcepts,
    assessmentStyle: "Coursework + practical (140–160 hours, HD/FL grading)",
  };
}

// --- 2. Targeted Perplexity retry for the 4 truly-missing units ---------

const PERPLEXITY_KEY = process.env.PERPLEXITY_API_KEY;
const MODEL = "sonar-pro";

async function retryPerplexity(unit) {
  if (!PERPLEXITY_KEY) throw new Error("PERPLEXITY_API_KEY missing");
  const codeLower = unit.code.toLowerCase();
  const systemPrompt = `You are researching a specific Charles Sturt University subject. Search these EXACT URLs (try each; the handbook is JS-rendered so may be sparse — combine with UAC, Open Universities Australia listings, and the CSU subject-outline PDFs):
  - https://handbook.csu.edu.au/subject/2026/${codeLower}
  - https://handbook.csu.edu.au/subject/2024/${codeLower}
  - https://web.archive.org/web/2024*/handbook.csu.edu.au/subject/*/${codeLower}
  - https://www.uac.edu.au (search "${unit.code}")
  - CSU subject outline PDFs (search "${unit.code} subject outline")

Return ONLY the JSON per the schema. If a field is genuinely empty on the sources, return an empty array — DO NOT fabricate.

For ownedContentBridges, ONLY use asset names from this list (exact match):
  MoreWine Red Winemaking Outline · MoreWine Guide to Red Winemaking (bible) · MoreWine Guide to White Wine Making (bible)
  MoreWine paper: SO2 management · MLF · Oak barrel care · Oak info · Fining agents · Sanitation · Bench trials · Inert gas · pH meter · Oxygen in ferment
  AWRI fact sheet: Stuck fermentation · Controlling Brett · Managing botrytis · MLF (achieving successful) · MLF in red wine · Protein stability · Reducing ethanol · Small-lot fermentation · Avoiding lab spoilage`;

  const responseSchema = {
    type: "object",
    properties: {
      learningOutcomes: { type: "array", items: { type: "string" } },
      keyConcepts: { type: "array", items: { type: "string" } },
      awriCrossRefs: { type: "array", items: { type: "string" } },
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
      },
      wbsDomainCandidates: { type: "array", items: { type: "string" } },
      layer: { type: "string", enum: ["basic", "advanced"] },
      ownedContentBridges: { type: "array", items: { type: "string" } },
      assessmentStyle: { type: "string" },
      urlCandidates: { type: "array", items: { type: "string" } },
    },
    required: ["learningOutcomes", "keyConcepts", "awriCrossRefs", "openAccessPapers", "wbsDomainCandidates", "layer", "ownedContentBridges", "assessmentStyle", "urlCandidates"],
    additionalProperties: false,
  };

  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), 45_000);
  const resp = await fetch("https://api.perplexity.ai/chat/completions", {
    method: "POST",
    signal: controller.signal,
    headers: { Authorization: `Bearer ${PERPLEXITY_KEY}`, "Content-Type": "application/json" },
    body: JSON.stringify({
      model: MODEL,
      max_tokens: 2500,
      messages: [
        { role: "system", content: systemPrompt },
        { role: "user", content: `Subject code ${unit.code} — ${unit.title}. Focus: ${unit.focus}. Return structured JSON.` },
      ],
      response_format: { type: "json_schema", json_schema: { schema: responseSchema } },
    }),
  }).finally(() => clearTimeout(timer));

  if (!resp.ok) throw new Error(`Perplexity ${resp.status}: ${(await resp.text()).slice(0, 200)}`);
  const data = await resp.json();
  const content = data?.choices?.[0]?.message?.content ?? "{}";
  const parsed = JSON.parse(content.replace(/^```json\s*/i, "").replace(/```\s*$/, "").trim());
  return { parsed, citations: data?.citations ?? [] };
}

// --- 3. Prescribed-texts enrichment pass (canonical list matching) -------

async function enrichPrescribedTexts(unit) {
  if (!PERPLEXITY_KEY) throw new Error("PERPLEXITY_API_KEY missing");
  const canonicalList = CANONICAL_TEXTS.map((t, i) => `${i + 1}. [${t.key}] ${t.citation}`).join("\n");

  const systemPrompt = `You are matching a wine science subject to the canonical Australian wine-science textbook shortlist below. For the given subject, identify which of these textbooks would MOST LIKELY be prescribed or referenced, and which chapters/topics of each would apply. Only include a text if the subject's focus genuinely maps to that text's scope. Be conservative — no more than 4 texts per subject.

Canonical shortlist:
${canonicalList}

For each match, return the "key" from the list above (e.g. "boulton_ppw"), plus specific chapters/topics that would apply. If no text on the list is a strong match, return an empty array.

Return ONLY the JSON.`;

  const responseSchema = {
    type: "object",
    properties: {
      prescribedTexts: {
        type: "array",
        items: {
          type: "object",
          properties: {
            key: { type: "string", enum: CANONICAL_TEXTS.map((t) => t.key) },
            chapters: { type: "array", items: { type: "string" }, description: "Chapters or topic areas within the text that map to this subject." },
            relevance: { type: "string", enum: ["core", "supporting"], description: "core = likely prescribed; supporting = referenced/further-reading." },
          },
          required: ["key", "chapters", "relevance"],
          additionalProperties: false,
        },
      },
    },
    required: ["prescribedTexts"],
    additionalProperties: false,
  };

  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), 45_000);
  const focus = unit.focus ?? "";
  const concepts = (unit.perplexity?.keyConcepts ?? []).slice(0, 8).join("; ");
  const userMsg = `Subject: ${unit.code} — ${unit.title}\nFocus: ${focus}\nKey concepts covered: ${concepts || "(none extracted)"}\n\nMatch to the canonical shortlist. Return structured JSON.`;

  const resp = await fetch("https://api.perplexity.ai/chat/completions", {
    method: "POST",
    signal: controller.signal,
    headers: { Authorization: `Bearer ${PERPLEXITY_KEY}`, "Content-Type": "application/json" },
    body: JSON.stringify({
      model: MODEL,
      max_tokens: 900,
      messages: [
        { role: "system", content: systemPrompt },
        { role: "user", content: userMsg },
      ],
      response_format: { type: "json_schema", json_schema: { schema: responseSchema } },
    }),
  }).finally(() => clearTimeout(timer));

  if (!resp.ok) throw new Error(`Perplexity ${resp.status}: ${(await resp.text()).slice(0, 200)}`);
  const data = await resp.json();
  const content = data?.choices?.[0]?.message?.content ?? "{}";
  const parsed = JSON.parse(content.replace(/^```json\s*/i, "").replace(/```\s*$/, "").trim());
  // Expand key → full citation
  const expanded = (parsed.prescribedTexts ?? []).map((t) => {
    const canon = CANONICAL_TEXTS.find((c) => c.key === t.key);
    return canon ? { citation: canon.citation, chapters: t.chapters, relevance: t.relevance, copyright: "paywalled" } : null;
  }).filter(Boolean);
  return expanded;
}

// --- Main orchestrator ---------------------------------------------------

const sleep = (ms) => new Promise((r) => setTimeout(r, ms));

(async () => {
  // Load Phase A output
  const scouting = JSON.parse(fs.readFileSync(IN_FILE, "utf8"));

  console.log("▶ Phase A.5 — fixing weak spots\n");

  // ---- Step 1: parse local CSU files
  console.log("Step 1 · Parsing local CSU handbook scrapes…");
  const localCsu = {
    WSC115: parseWsc115FromRaw(),
    WSC202: parseHandbookMd(path.join(EDU_DIR, "handbook.csu.edu.au_subject_2024_wsc202.md")),
    WSC303: parseHandbookMd(path.join(EDU_DIR, "handbook.csu.edu.au_subject_2026_wsc303.md")),
  };
  for (const [code, data] of Object.entries(localCsu)) {
    if (!data) {
      console.log(`  ${code}: FAIL (no local file)`);
      continue;
    }
    console.log(`  ${code}: LO=${data.learningOutcomes.length} concepts=${data.keyConcepts.length} assess="${(data.assessmentStyle || "").slice(0, 40)}..."`);
    const target = scouting.units.find((u) => u.code === code);
    if (target && target.perplexity) {
      if (target.perplexity.learningOutcomes.length === 0) target.perplexity.learningOutcomes = data.learningOutcomes;
      if (target.perplexity.keyConcepts.length === 0) target.perplexity.keyConcepts = data.keyConcepts;
      if (!target.perplexity.assessmentStyle) target.perplexity.assessmentStyle = data.assessmentStyle;
      target.perplexity.urlCandidates = Array.from(new Set([...(target.perplexity.urlCandidates ?? []), data.url].filter(Boolean)));
      target.enrichedFromLocal = true;
    }
  }

  // ---- Step 2: targeted Perplexity retry on truly-missing units
  const stillEmpty = scouting.units.filter((u) => u.source === "csu" && (u.perplexity?.learningOutcomes?.length ?? 0) === 0 && (u.perplexity?.keyConcepts?.length ?? 0) === 0);
  console.log(`\nStep 2 · Targeted Perplexity retry on ${stillEmpty.length} still-empty CSU units…`);
  for (let i = 0; i < stillEmpty.length; i++) {
    const u = stillEmpty[i];
    process.stdout.write(`  [${i + 1}/${stillEmpty.length}] ${u.code} — ${u.title} … `);
    try {
      const { parsed, citations } = await retryPerplexity(u);
      // Overwrite Phase A entry
      u.perplexity = parsed;
      u.perplexityCitations = citations;
      u.retried = true;
      console.log(`OK · LO=${parsed.learningOutcomes.length} concepts=${parsed.keyConcepts.length} bridges=${parsed.ownedContentBridges.length}`);
    } catch (err) {
      console.log(`FAIL · ${err.message.slice(0, 100)}`);
    }
    if (i < stillEmpty.length - 1) await sleep(800);
  }

  // ---- Step 3: prescribed-texts enrichment across ALL units
  console.log(`\nStep 3 · Enriching prescribed texts across ${scouting.units.length} units…`);
  let textsTotal = 0;
  for (let i = 0; i < scouting.units.length; i++) {
    const u = scouting.units[i];
    process.stdout.write(`  [${i + 1}/${scouting.units.length}] ${u.code} … `);
    try {
      const expanded = await enrichPrescribedTexts(u);
      u.perplexity.prescribedTexts = expanded;
      textsTotal += expanded.length;
      console.log(`OK · texts=${expanded.length}`);
    } catch (err) {
      console.log(`FAIL · ${err.message.slice(0, 100)}`);
    }
    if (i < scouting.units.length - 1) await sleep(600);
  }

  // ---- Write v2 output
  scouting.generatedAt = new Date().toISOString();
  scouting.phase = "A.5-weak-spots-fixed";
  fs.writeFileSync(OUT_FILE, JSON.stringify(scouting, null, 2));

  console.log(`\n✔ Wrote ${OUT_FILE}`);
  console.log(`   Prescribed texts added: ${textsTotal}`);
})().catch((err) => { console.error("Fatal:", err); process.exit(1); });
