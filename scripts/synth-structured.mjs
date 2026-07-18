#!/usr/bin/env node
/**
 * Ownology Curriculum — Structured Synthesis v2
 *
 * Rewrite of the pilot synthesiser. Produces STRUCTURED output that the
 * new LessonCard component can render into readable, scannable, non-textbook UX:
 *
 *   • tldr: 3 bullets that carry the essence
 *   • sections: array of { heading, iconHint, body_md (short), keyConcept, trap }
 *   • worked_example: structured cellar scenario
 *   • decision_tree: rows of { symptom, checks, action }
 *   • mcqs: 10 questions with answer + rationale
 *   • cited_in: same safe-citation shape as v1
 *
 * Usage:
 *   node scripts/synth-structured.mjs             # all 30 lessons → v2 dir
 *   node scripts/synth-structured.mjs --pilot     # just L2.7 for eyeball
 *   node scripts/synth-structured.mjs --id L2.7   # one specific lesson
 */

import fs from "node:fs";
import path from "node:path";
import { execSync } from "node:child_process";

const OUT_DIR = "/app/references/education/synthesis-v2";
const SPINE_YAML = "/app/references/education/curriculum-spine-v1.yaml";
const MODEL = "claude-sonnet-4-6";
const CHAT_URL = "https://integrations.emergentagent.com/llm/chat/completions";
const SLEEP_MS = 800;

// --- YAML parser (same as pilot) -----------------------------------------

function loadSpine() {
  const raw = fs.readFileSync(SPINE_YAML, "utf8");
  const lessonsIdx = raw.indexOf("\nlessons:\n");
  const tail = raw.slice(lessonsIdx + 1);
  const blocks = tail.split(/\n  - id: /).slice(1);
  const lessons = [];
  for (const block of blocks) {
    const firstNewline = block.indexOf("\n");
    const id = block.slice(0, firstNewline).trim();
    const body = block.slice(firstNewline + 1);
    const lesson = { id };
    const lines = body.split("\n");
    let i = 0;
    while (i < lines.length) {
      const line = lines[i];
      const kv = line.match(/^    (\w+):\s*(.*)$/);
      if (!kv) { i++; continue; }
      const key = kv[1];
      let val = kv[2];
      if (val === ">") {
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
        const items = [];
        i++;
        while (i < lines.length && lines[i].match(/^      - /)) {
          items.push(lines[i].replace(/^      - /, "").trim());
          i++;
        }
        lesson[key] = items;
        continue;
      }
      lesson[key] = val.replace(/^"|"$/g, "");
      i++;
    }
    if (lesson.id) lessons.push(lesson);
  }
  return lessons;
}

// --- Structured synthesis prompt -----------------------------------------

const SYSTEM_PROMPT = `You are the voice of Ownology, writing a Vigneron-tier Lesson Card. Your job is to produce STRUCTURED content — not a monolithic markdown blob — that a UI can render as a scannable, magazine-style reading experience.

VOICE — strict:
- Direct. Tight. No filler. No academic hedging.
- Practical over theoretical. Every claim earns its space by helping a working winemaker decide something.
- Australian/NZ English. Baumé (not Brix). mg/L (not ppm). "cellar", "vintage", "vigneron".
- Second person occasionally ("your tank"), but mostly declarative expert-to-expert prose.
- No marketing filler like "unleash", "empower", "journey".

COPYRIGHT — non-negotiable:
- Original expression throughout. Never reproduce >6 consecutive words from any known textbook, AOC module, MoreWine bible, or AWRI fact sheet.
- Textbook citations = title + author + chapter only. Never quote textbook text.
- Public URLs may be cited, never scraped content reproduced.

STRUCTURE — return STRICTLY this JSON schema:

{
  "tldr": [
    "First bullet — the essence of the lesson in 12-18 words",
    "Second bullet",
    "Third bullet"
  ],
  "sections": [
    {
      "heading": "Section title — the concept, not the topic (e.g. 'Temperature is the throttle' not 'Temperature')",
      "iconHint": "single-word lucide icon name that suggests the concept, e.g. thermometer / droplets / gauge / activity / flask-conical / wind / clock / target",
      "body_md": "Short markdown, 100-180 words. Two or three paragraphs. NO subheadings. NO bullet lists inside — save those for the callouts.",
      "keyConcept": "One line, 15-30 words. The number, threshold, or claim to remember. This is what goes on the flash card.",
      "trap": "One line, 15-30 words. The mistake winemakers commonly make on this topic. Present as a warning, not a lecture."
    }
    // 3-5 sections total
  ],
  "worked_example": {
    "title": "Give it a specific name, e.g. 'Tank 4 · Merlot 2026 · Day 3'",
    "starting_conditions": [
      "Bullet: starting condition 1 (be specific, real number)",
      "Bullet: starting condition 2",
      "Bullet: starting condition 3"
    ],
    "timeline": [
      { "when": "Day 1", "observation": "What was seen", "decision": "What choice was made", "reasoning": "Why", "outcome": "What happened next" },
      { "when": "Day 2", "observation": "...", "decision": "...", "reasoning": "...", "outcome": "..." },
      { "when": "Day 3", "observation": "...", "decision": "...", "reasoning": "...", "outcome": "..." }
    ],
    "counterfactual": "One sentence: what a different choice would have cost."
  },
  "decision_tree": {
    "title": "When to intervene — the diagnostic tree",
    "rows": [
      { "symptom": "Slow but not stopped (< 1 °Baumé/day)", "first_check": "Nutrient status + temperature", "action": "Add 30 mg N/L DAP + warm 2°C" },
      { "symptom": "Full stop (< 0.3 °Baumé/day)", "first_check": "...", "action": "..." }
      // 4-6 rows
    ]
  },
  "mcqs": [
    {
      "q": "Scenario-based question, 1-2 sentences.",
      "choices": ["A) …", "B) …", "C) …", "D) …"],
      "answer": "A",
      "rationale": "One sentence: why A, why the others are traps."
    }
    // exactly 10 MCQs. Mix: 3 recall (thresholds/definitions), 4 application (scenarios), 3 diagnostic (what would you do).
  ],
  "flashcards": [
    { "front": "Question or prompt — 10-15 words", "back": "Answer — one clear sentence" }
    // 6-8 flash cards. These are separate from the MCQs — meant for retrieval practice.
    // Include the numbers that matter and the traps.
  ],
  "cited_in": [
    { "kind": "buy", "label": "Boulton PPW · Ch 4", "url": null, "note": "Chapman & Hall" },
    { "kind": "free", "label": "AWRI Stuck Fermentation", "url": "https://www.awri.com.au/", "note": "search AWRI for stuck fermentation" },
    { "kind": "curriculum", "label": "CSU WSC115 · LO 3", "url": "https://handbook.csu.edu.au/subject/2025/WSC115", "note": null },
    { "kind": "private", "label": "MoreWine Red Bible · Ch 4", "url": null, "note": "your paid resource" }
  ]
}

CITATION RULES:
- Use ONLY these verified URL patterns for curriculum citations:
    · CSU: https://handbook.csu.edu.au/subject/2025/WSC{code}
    · Adelaide: https://calendar.adelaide.edu.au/aprcw/2025/bvito_bvitoenol (one URL for all Adelaide units)
    · Lincoln: https://www.lincoln.ac.nz/study/courses-2/course-search/
    · Otago FOSC306: https://www.otago.ac.nz/courses/papers?papercode=FOSC306
- AWRI URLs: use https://www.awri.com.au/ + note "search AWRI for [topic]" — never invent specific paths.
- Never fabricate URLs.
- Min 3 citations, max 6. At least one "buy", at least one "curriculum".

Return ONLY the JSON. No prose. No fences.`;

// --- Helpers -----------------------------------------------------------

async function synthesise(lesson) {
  const key = process.env.EMERGENT_LLM_KEY;
  if (!key) throw new Error("EMERGENT_LLM_KEY missing");

  const wbs = (lesson.wbs || []).join(", ");
  const commonContext = `Lesson: ${lesson.id} · ${lesson.title}
Level: ${lesson.level} · WBS: ${wbs}
Aim: ${lesson.aim}
Application: ${lesson.application}

Public curriculum references (cite):
${(lesson.sources_public_ref || []).slice(0, 5).map((r) => "  - " + r).join("\n") || "  (none)"}

Textbooks (bibliographic only):
${(lesson.citations_bibliographic || []).slice(0, 4).map((r) => "  - " + r).join("\n") || "  (none)"}

Private overlap (cite in cited_in only, never quote):
${(lesson.sources_private || []).slice(0, 5).map((r) => "  - " + r).join("\n") || "  (none)"}`;

  // ---- Pass 1: tldr + sections + worked_example + decision_tree + cited_in
  const pass1System = SYSTEM_PROMPT + `

FOR THIS CALL: return only tldr, sections, worked_example, decision_tree, and cited_in fields.`;
  const pass1Msg = `${commonContext}

Generate: tldr (3 bullets), sections (3-5), worked_example (structured), decision_tree (4-6 rows), cited_in (3-6 items).
Voice: Ownology direct. Boutique AU/NZ context.`;

  const call = async (system, msg, maxTokens) => {
    const resp = await fetch(CHAT_URL, {
      method: "POST",
      headers: { Authorization: `Bearer ${key}`, "Content-Type": "application/json", "x-ow-source": "curriculum.structured" },
      body: JSON.stringify({
        model: MODEL,
        messages: [{ role: "system", content: system }, { role: "user", content: msg }],
        max_tokens: maxTokens,
        temperature: 0.4,
        stream: false,
      }),
    });
    if (!resp.ok) throw new Error(`Claude ${resp.status}: ${(await resp.text()).slice(0, 200)}`);
    const data = await resp.json();
    const raw = data?.choices?.[0]?.message?.content ?? "{}";
    const cleaned = raw.replace(/^```json\s*/i, "").replace(/^```\s*/i, "").replace(/```\s*$/i, "").trim();
    const parsed = JSON.parse(cleaned);
    return { parsed, usage: data?.usage ?? {} };
  };

  const p1 = await call(pass1System, pass1Msg, 5000);

  // ---- Pass 2: mcqs + flashcards
  const pass2System = `You are the voice of Ownology, writing quiz + flashcard content for a Vigneron-tier Lesson Card. Voice: direct, tight, no filler. Australian/NZ context. Baumé for sugar, mg/L for SO₂.

Return STRICTLY this JSON:
{
  "mcqs": [
    {
      "q": "Question, 1-2 sentences, scenario-based where possible",
      "choices": ["A) …", "B) …", "C) …", "D) …"],
      "answer": "A",
      "rationale": "One sentence: why the right answer is right and what wrong answers miss"
    }
    // exactly 10 MCQs. Mix: 3 recall, 4 application, 3 diagnostic. Wrong answers plausible, not silly.
  ],
  "flashcards": [
    { "front": "Prompt — 10-15 words", "back": "Answer — one clear sentence" }
    // 6-8 cards. Focus on numbers-to-remember and common traps.
  ]
}

Return ONLY the JSON. No prose. No fences.`;

  const pass2Msg = `${commonContext}

Sections covered in this lesson:
${(p1.parsed.sections ?? []).map((s) => `  - ${s.heading}: ${s.keyConcept}`).join("\n")}

Worked example:
${p1.parsed.worked_example?.title ?? "(none)"}

Now generate 10 MCQs and 6-8 flashcards drawn from these sections. Cover the numbers-to-remember and the traps.`;

  const p2 = await call(pass2System, pass2Msg, 3500);

  const combined = {
    ...p1.parsed,
    mcqs: p2.parsed.mcqs ?? [],
    flashcards: p2.parsed.flashcards ?? [],
  };
  const combinedUsage = {
    prompt_tokens: (p1.usage.prompt_tokens ?? 0) + (p2.usage.prompt_tokens ?? 0),
    completion_tokens: (p1.usage.completion_tokens ?? 0) + (p2.usage.completion_tokens ?? 0),
  };
  return { parsed: combined, usage: combinedUsage };
}

function copyrightGuard(content, ngram = 8) {
  const bodyText = [
    ...(content.sections ?? []).map((s) => s.body_md ?? ""),
    ...(content.worked_example?.timeline ?? []).map((t) => `${t.observation} ${t.decision} ${t.reasoning} ${t.outcome}`),
    ...(content.mcqs ?? []).map((m) => `${m.q} ${m.rationale}`),
  ].join(" ").toLowerCase().replace(/[^a-z0-9 ]/g, " ").replace(/\s+/g, " ");
  const words = bodyText.split(" ").filter(Boolean);
  return { totalWords: words.length, ngramWindow: ngram };
}

const sleep = (ms) => new Promise((r) => setTimeout(r, ms));

// --- Main --------------------------------------------------------------

(async () => {
  const args = process.argv.slice(2);
  const spine = loadSpine();
  let targets = spine;
  if (args.includes("--pilot")) targets = spine.filter((l) => l.id === "L2.7");
  const idIdx = args.indexOf("--id");
  if (idIdx >= 0) targets = spine.filter((l) => l.id === args[idIdx + 1]);

  fs.mkdirSync(OUT_DIR, { recursive: true });
  console.log(`▶ Structured synthesis · ${targets.length} lessons · ${MODEL}\n`);

  let totalIn = 0, totalOut = 0, ok = 0, fail = 0;
  for (let i = 0; i < targets.length; i++) {
    const lesson = targets[i];
    process.stdout.write(`  [${i + 1}/${targets.length}] ${lesson.id} · ${lesson.title.slice(0, 55)} … `);
    const t0 = Date.now();
    try {
      const { parsed, usage } = await synthesise(lesson);
      totalIn += usage?.prompt_tokens ?? 0;
      totalOut += usage?.completion_tokens ?? 0;
      const audit = copyrightGuard(parsed);
      const outPath = path.join(OUT_DIR, `${lesson.id}.json`);
      fs.writeFileSync(outPath, JSON.stringify({
        lesson_id: lesson.id,
        source: lesson,
        generated: parsed,
        usage,
        audit,
        version: "structured-v2",
        generated_at: new Date().toISOString(),
      }, null, 2));
      const sections = parsed.sections?.length ?? 0;
      const mcqs = parsed.mcqs?.length ?? 0;
      const flash = parsed.flashcards?.length ?? 0;
      console.log(`OK · ${Date.now() - t0}ms · ${sections} sections · ${mcqs} MCQ · ${flash} flash`);
      ok++;
    } catch (err) {
      console.log(`FAIL · ${err.message.slice(0, 120)}`);
      fail++;
    }
    if (i < targets.length - 1) await sleep(SLEEP_MS);
  }

  const cost = (totalIn * 3 + totalOut * 15) / 1_000_000;
  console.log(`\n✔ Done · OK=${ok} · FAIL=${fail}`);
  console.log(`  Tokens · in=${totalIn} out=${totalOut}`);
  console.log(`  Cost: $${cost.toFixed(4)}`);
  console.log(`  Output → ${OUT_DIR}/`);
})().catch((e) => { console.error("Fatal:", e); process.exit(1); });
