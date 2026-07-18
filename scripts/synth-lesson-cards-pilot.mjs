#!/usr/bin/env node
/**
 * Ownology Curriculum Spine — Claude Synthesis Pilot
 *
 * Generates 3 pilot Lesson Cards from curriculum-spine-v1.yaml to prove the
 * voice, depth, application angle, and safe-citation shape before we commit
 * to the full 30-lesson synthesis pass.
 *
 * Copyright architecture enforced in the system prompt:
 *   • Layer 1 — Ownology Original (the body we generate here)
 *   • Layer 2 — Private grounding read privately, NEVER reproduced verbatim
 *   • Layer 3 — Bibliographic citation only (author + title + chapter + link)
 *
 * Output: JSON file per lesson at /app/references/education/synthesis-pilot/
 *
 * Cost estimate: ~$0.04 per lesson × 3 = ~$0.12 total.
 * Model: claude-sonnet-4-6 via EMERGENT_LLM_KEY proxy.
 */

import fs from "node:fs";
import path from "node:path";
import { execSync } from "node:child_process";

// --- Config ---------------------------------------------------------------

const OUT_DIR = "/app/references/education/synthesis-pilot";
const MODEL = "claude-sonnet-4-6";
const CHAT_URL = "https://integrations.emergentagent.com/llm/chat/completions";
const SCOUT_JSON = "/app/references/education/scouting-pass-2026-07-17-v2.json";
const SPINE_YAML = "/app/references/education/curriculum-spine-v1.yaml";

const PILOT_LESSON_IDS = ["L1.4", "L2.7", "L3.4"];

// --- Load spine + scouting ----------------------------------------------

function loadYaml(fp) {
  // Purpose-built parser for our specific spine YAML shape. Not a general YAML lib.
  // Extracts each lesson block under `lessons:` where each starts with `  - id: L*`.
  const raw = fs.readFileSync(fp, "utf8");
  // Split off just the lessons: section
  const lessonsIdx = raw.indexOf("\nlessons:\n");
  if (lessonsIdx < 0) return { lessons: [] };
  const tail = raw.slice(lessonsIdx + 1);
  // Now split each lesson at "  - id: " (only lessons — levels used `- id: 1` numeric)
  const blocks = tail.split(/\n  - id: /).slice(1);
  const lessons = [];
  for (const block of blocks) {
    // First line is the id itself (e.g. "L1.4"), rest is the body
    const firstNewline = block.indexOf("\n");
    const id = block.slice(0, firstNewline).trim();
    const body = block.slice(firstNewline + 1);
    const lesson = { id };

    // Simple line-by-line key extraction
    const lines = body.split("\n");
    let i = 0;
    while (i < lines.length) {
      const line = lines[i];
      const kv = line.match(/^    (\w+):\s*(.*)$/);
      if (!kv) { i++; continue; }
      const key = kv[1];
      let val = kv[2];

      if (val === ">") {
        // Folded multiline — collect indented lines that follow until next key
        let acc = "";
        i++;
        while (i < lines.length && lines[i].match(/^      /)) {
          acc += " " + lines[i].trim();
          i++;
        }
        lesson[key] = acc.trim();
        continue;
      }
      if (val.startsWith("[") && val.endsWith("]")) {
        const inner = val.slice(1, -1).trim();
        lesson[key] = inner ? inner.split(",").map((s) => s.trim().replace(/^"|"$/g, "")) : [];
        i++;
        continue;
      }
      if (val === "") {
        // Might be a nested list — check next lines
        const items = [];
        i++;
        while (i < lines.length && lines[i].match(/^      - /)) {
          items.push(lines[i].replace(/^      - /, "").trim());
          i++;
        }
        lesson[key] = items;
        continue;
      }
      // Plain scalar
      lesson[key] = val.replace(/^"|"$/g, "");
      i++;
    }
    if (lesson.id) lessons.push(lesson);
  }
  return { lessons };
}

const spine = loadYaml(SPINE_YAML);
const scout = JSON.parse(fs.readFileSync(SCOUT_JSON, "utf8"));

// --- Reference resolver -------------------------------------------------

const CANONICAL_TEXT_TITLES = {
  boulton_ppw: "Boulton, R.B. et al. (1996). Principles and Practices of Winemaking. Chapman & Hall.",
  iland_cagw: "Iland, P. et al. (2004). Chemical Analysis of Grapes and Wine. Patrick Iland Wine Promotions.",
  rgayon_handbook_v1: "Ribéreau-Gayon, P. et al. (2006). Handbook of Enology Vol. 1 (2nd ed.). Wiley.",
  rgayon_handbook_v2: "Ribéreau-Gayon, P. et al. (2006). Handbook of Enology Vol. 2 (2nd ed.). Wiley.",
  jackson_wine_science: "Jackson, R.S. (2020). Wine Science: Principles and Applications (5th ed.). Academic Press.",
  waterhouse_sacks: "Waterhouse, A.L., Sacks, G.L. & Jeffery, D.W. (2016). Understanding Wine Chemistry. Wiley.",
  moreno_polo: "Moreno-Arribas, M.V. & Polo, M.C. (2009). Wine Chemistry and Biochemistry. Springer.",
  meilgaard_sensory: "Meilgaard, M. et al. (2016). Sensory Evaluation Techniques (5th ed.). CRC Press.",
  lawless_heymann: "Lawless, H.T. & Heymann, H. (2010). Sensory Evaluation of Food (2nd ed.). Springer.",
};

const UNIT_URLS = {
  csu_wsc115: { title: "CSU WSC115 Wine Science 1", url: "https://handbook.csu.edu.au/subject/2025/WSC115" },
  csu_wsc317: { title: "CSU WSC317 Wine Science 2", url: "https://handbook.csu.edu.au/subject/2025/WSC317" },
  csu_wsc318: { title: "CSU WSC318 Wine Microbiology", url: "https://handbook.csu.edu.au/subject/2025/WSC318" },
  csu_wsc319: { title: "CSU WSC319 Wine Chemistry", url: "https://handbook.csu.edu.au/subject/2025/WSC319" },
  adelaide_oenology_2503wt: { title: "Adelaide OENOLOGY 2503WT Introductory Winemaking II", url: "https://calendar.adelaide.edu.au/aprcw/2025/bvito_bvitoenol" },
  adelaide_oenology_3046wt: { title: "Adelaide OENOLOGY 3046WT Fermentation Technology III", url: "https://calendar.adelaide.edu.au/aprcw/2025/bvito_bvitoenol" },
  adelaide_oenology_3007wt: { title: "Adelaide OENOLOGY 3007WT Stabilisation and Clarification III", url: "https://calendar.adelaide.edu.au/aprcw/2025/bvito_bvitoenol" },
};

function resolveUnitData(refKey) {
  // Match "csu_wsc317" → find scout unit code "WSC317"
  const parts = refKey.split("_");
  const inst = parts[0];
  const code = parts.slice(1).join(" ").toUpperCase();
  // Try several code shapes
  const candidates = [code, code.replace(" ", ""), parts.slice(1).join("").toUpperCase()];
  for (const c of candidates) {
    const found = scout.units.find((u) => u.code.replace(/\s+/g, "").toUpperCase() === c.replace(/\s+/g, ""));
    if (found) return found;
  }
  return null;
}

// --- Private grounding assembly (never reproduced verbatim in output) ---

function extractPdfPages(pdfPath, maxChars = 4000) {
  try {
    const raw = execSync(`pdftotext -layout "${pdfPath}" - 2>/dev/null`, { maxBuffer: 5_000_000 }).toString();
    return raw.replace(/\s+/g, " ").trim().slice(0, maxChars);
  } catch { return ""; }
}

const AOC_MAP = {
  aoc_2_2_fermentation_science: "/app/references/oenology-modules/Oenology Modules/Advanced Certificate of Viticulture and Winemaking (Oenology) - 2026_ 2.2 Fermentation Science _ AOC.pdf",
  aoc_2_3_wine_making_process: "/app/references/oenology-modules/Oenology Modules/Advanced Certificate of Viticulture and Winemaking (Oenology) - 2026_ 2.3 The Wine Making Process _ AOC.pdf",
  aoc_2_4_yeasts: "/app/references/oenology-modules/Oenology Modules/Advanced Certificate of Viticulture and Winemaking (Oenology) - 2026_ 2.4 Yeasts and Factors Affecting Grape Characteristics _ AOC.pdf",
  aoc_1_5_grapevine_culture_a: "/app/references/viticulture-modules/Viticulture Modules/Advanced Certificate of Viticulture and Winemaking (Oenology) - 2026_ 1.5 Grapevine Culture Part A _ AOC.pdf",
};

function buildGroundingContext(lesson) {
  const parts = [];

  // AOC excerpts (Rich's paid content — used as private grounding only)
  const pKey = "sources_private";
  const priv = Array.isArray(lesson[pKey]) ? lesson[pKey] : [];
  for (const src of priv) {
    if (AOC_MAP[src]) {
      const excerpt = extractPdfPages(AOC_MAP[src], 3500);
      if (excerpt) parts.push(`[PRIVATE GROUNDING — ${src}]\n${excerpt}\n[END ${src}]`);
    }
  }

  // Adjacent university-unit LOs + concepts (bibliographic-safe)
  const pubKey = "sources_public_ref";
  const pub = Array.isArray(lesson[pubKey]) ? lesson[pubKey] : [];
  for (const refKey of pub) {
    const unit = resolveUnitData(refKey);
    if (unit) {
      parts.push(
        `[UNIVERSITY REFERENCE — ${unit.code} · ${unit.title} (${unit.source})]\n` +
        `Learning outcomes:\n${(unit.perplexity?.learningOutcomes ?? []).slice(0, 4).map((l, i) => `  ${i + 1}. ${l}`).join("\n")}\n` +
        `Key concepts:\n${(unit.perplexity?.keyConcepts ?? []).slice(0, 6).map((c) => `  - ${c}`).join("\n")}`
      );
    }
  }

  return parts.join("\n\n---\n\n");
}

// --- The heart of it: the system prompt ---------------------------------

const SYSTEM_PROMPT = `You are the voice of Ownology, writing a Lesson Card for the Vigneron-tier education layer.

VOICE — read this before writing anything:
- Direct. Tight. No filler. No academic hedging like "it should be noted that" or "in the context of".
- Practical over theoretical. Every claim earns its space by helping a boutique winemaker decide something in the next 48 hours.
- Australian/NZ English, industry-current. Baumé (not Brix) for sugar, mg/L (not ppm) for SO₂.
- Never marketing-speak. Never "unleash", "empower", "journey". Ownology respects the reader.
- Ownology's tagline: "You are the must. Ownology is the ferment." Never repeat it, but let it inform the tone — humble, useful, respects the winemaker's craft.
- Second person occasionally ("your tank"), but sparingly. Mostly declarative expert-to-expert prose.

COPYRIGHT — this is non-negotiable:
- The context between [PRIVATE GROUNDING] markers is Rich Purr's PAID content (MoreWine + AOC + AWRI). You may READ it. You must NEVER reproduce phrases of >6 consecutive words verbatim. Paraphrase every sentence into your own construction.
- The context under [UNIVERSITY REFERENCE] is public handbook data — cite institution + code + LO number by reference only; never quote the LO text verbatim.
- Bibliographic citations (author + title + chapter) are always safe. Include them; never quote textbook content.

STRUCTURE — return STRICTLY this JSON shape and nothing else:
{
  "aim": "1-2 sentences. Verbatim from the lesson's aim field or lightly tightened. This is the shipping label of the lesson.",
  "application": "2-3 sentences. How this lands in Ownology's user's cellar this week. Reference their tank/vintage log/Owen alerts by name (Tank 4, cellar brief, ferment trajectory, bench trial workbook, etc.).",
  "body_md": "The main lesson. Markdown. 700-1000 words. Structure: 3-5 H3 sections (### heading). Bullet lists where they earn their place. NO block quotes. NO code blocks. NO emojis. End with a 2-sentence 'What to do this vintage' paragraph.",
  "cited_in": [
    { "kind": "buy", "label": "Boulton PPW · Ch 4", "url": null, "note": "Chapman & Hall" },
    { "kind": "free", "label": "AWRI Stuck Fermentation", "url": "https://awri.com.au/...", "note": "AU industry reference" },
    { "kind": "curriculum", "label": "CSU WSC115 Wine Science 1 · LO 3", "url": "https://handbook.csu.edu.au/subject/2025/WSC115", "note": null },
    { "kind": "private", "label": "MoreWine Red Bible · Ch 4", "url": null, "note": "your paid resource" }
  ]
}

CITATION RULES:
- kind: "buy" = paywalled textbook you cite for further reading, no URL needed, always include publisher in note
- kind: "free" = free-to-web reference (AWRI, Wine Australia, GWRDC), URL required
- kind: "curriculum" = a scouted university unit that covers this territory, URL to handbook, LO number if referenced
- kind: "private" = user's own paid library (MoreWine bibles + AOC modules), no URL, note "your paid resource"
- Minimum 3 citations, maximum 6. At least one "buy", at least one "curriculum".
- NEVER cite anything you don't have in the context provided.

Return ONLY the JSON. No prose. No fences.`;

// --- The synthesis call --------------------------------------------------

async function synthesise(lesson) {
  const grounding = buildGroundingContext(lesson);
  const wbs = (lesson.wbs || []).join(", ");
  const bibKeys = (lesson.citations_bibliographic || []).map((k) => k.split("_")[0]).filter(Boolean);
  const canonicalCitations = bibKeys
    .map((k) => Object.entries(CANONICAL_TEXT_TITLES).find(([key]) => key.startsWith(k)))
    .filter(Boolean)
    .map(([, v]) => v);

  const userMsg = `Lesson to write:
- ID: ${lesson.id}
- Level: ${lesson.level}
- Slug: ${lesson.slug}
- Working title: ${lesson.title}
- WBS domains: ${wbs}
- Target reading time: ${lesson.reading_min} min
- Aim (from spine): ${lesson.aim}
- Application (from spine): ${lesson.application}

Textbooks in scope for citation (canonical shortlist):
${canonicalCitations.map((c, i) => `  ${i + 1}. ${c}`).join("\n") || "  (none specified — use judgement from the university refs in the grounding context)"}

---

GROUNDING CONTEXT (Layer 2 private + Layer 3 reference):

${grounding}

---

Now write the Lesson Card as strict JSON per the schema. Voice: Ownology direct.`;

  const key = process.env.EMERGENT_LLM_KEY;
  if (!key) throw new Error("EMERGENT_LLM_KEY missing");

  const resp = await fetch(CHAT_URL, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      Authorization: `Bearer ${key}`,
      "x-ow-source": "curriculum.synthesisPilot",
    },
    body: JSON.stringify({
      model: MODEL,
      messages: [
        { role: "system", content: SYSTEM_PROMPT },
        { role: "user", content: userMsg },
      ],
      max_tokens: 3000,
      temperature: 0.4,
      stream: false,
    }),
  });

  if (!resp.ok) throw new Error(`Claude ${resp.status}: ${(await resp.text()).slice(0, 300)}`);
  const data = await resp.json();
  const raw = data?.choices?.[0]?.message?.content ?? "{}";
  const cleaned = raw.replace(/^```json\s*/i, "").replace(/^```\s*/i, "").replace(/```\s*$/i, "").trim();
  const parsed = JSON.parse(cleaned);
  const usage = data?.usage ?? {};
  return { parsed, usage, groundingBytes: grounding.length };
}

// --- Copyright guard — n-gram overlap check ------------------------------

function checkOverlap(body, grounding, ngram = 8) {
  const norm = (s) => s.toLowerCase().replace(/\s+/g, " ").replace(/[^a-z0-9 ]/g, "");
  const bodyWords = norm(body).split(" ").filter(Boolean);
  const groundingWords = norm(grounding).split(" ").filter(Boolean);
  const groundingNgrams = new Set();
  for (let i = 0; i <= groundingWords.length - ngram; i++) {
    groundingNgrams.add(groundingWords.slice(i, i + ngram).join(" "));
  }
  const hits = [];
  for (let i = 0; i <= bodyWords.length - ngram; i++) {
    const key = bodyWords.slice(i, i + ngram).join(" ");
    if (groundingNgrams.has(key)) hits.push(key);
  }
  return hits;
}

// --- Main --------------------------------------------------------------

(async () => {
  fs.mkdirSync(OUT_DIR, { recursive: true });
  console.log(`▶ Synthesising ${PILOT_LESSON_IDS.length} pilot Lesson Cards via ${MODEL}\n`);

  const summary = [];
  let totalIn = 0, totalOut = 0;

  for (const id of PILOT_LESSON_IDS) {
    const lesson = spine.lessons.find((l) => l.id === id);
    if (!lesson) { console.log(`  ${id}: NOT FOUND`); continue; }
    process.stdout.write(`  ${id} · ${lesson.title.slice(0, 55)} … `);
    const t0 = Date.now();
    try {
      const { parsed, usage, groundingBytes } = await synthesise(lesson);
      totalIn += usage?.prompt_tokens ?? 0;
      totalOut += usage?.completion_tokens ?? 0;
      // Copyright guard
      const overlaps = checkOverlap(parsed.body_md ?? "", buildGroundingContext(lesson));
      const bodyLen = (parsed.body_md ?? "").split(/\s+/).length;
      const outPath = path.join(OUT_DIR, `${id}.json`);
      fs.writeFileSync(outPath, JSON.stringify({ lesson_id: id, source: lesson, generated: parsed, usage, groundingBytes, overlaps }, null, 2));
      console.log(`OK · ${Date.now() - t0}ms · ${bodyLen}w · cites:${parsed.cited_in?.length ?? 0} · 8-gram overlaps:${overlaps.length}`);
      summary.push({ id, ok: true, bodyLen, cites: parsed.cited_in?.length ?? 0, overlaps: overlaps.length });
    } catch (err) {
      console.log(`FAIL · ${err.message.slice(0, 200)}`);
      summary.push({ id, ok: false, err: err.message });
    }
  }

  console.log(`\n✔ Tokens · in=${totalIn} out=${totalOut}`);
  console.log(`  Estimated cost · $${((totalIn * 3 + totalOut * 15) / 1_000_000).toFixed(4)}`);
  console.log(`  Output → ${OUT_DIR}`);
})().catch((e) => { console.error("Fatal:", e); process.exit(1); });
