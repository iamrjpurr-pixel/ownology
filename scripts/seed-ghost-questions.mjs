/**
 * seed-ghost-questions.mjs — Feb 2026.
 *
 * Generates ~225 ghost questions (5 per WBS code × 3 wine types) using
 * gpt-5.4-mini, grounded in the published diy_knowledge_chunks (Red +
 * White Wine Bibles + AU regulations) AND sop_library for that WBS.
 *
 * Surfaced by the Cellar Brief engine: each card looks up 1 relevant
 * ghost question matching (stage→WBS_codes × wine_color) → "Worth knowing"
 * teaching block in the expanded card body.
 *
 * Each Q&A:
 *   - question:  plain-language working-winemaker voice, 80–140 chars
 *   - answer:    80–140 words, grounded, Aus/NZ metric, no fluff
 *   - category:  short tag (fermentation, sanitation, additions, …)
 *   - difficulty: beginner | intermediate | advanced (mostly beginner)
 *
 * Idempotent: deletes any prior `(wbs_code, wine_type, question)` rows
 * before re-inserting, so re-runs replace the LLM-generated set in place.
 *
 * Coverage matrix follows the Cellar Brief engine's STAGE_TO_WBS:
 *   3.1, 3.3, 4.1, 4.2, 4.3, 4.4, 4.6, 4.8, 5.1, 5.2, 5.3, 5.4, 6.1, 7.1, 8.1
 *
 * Run: node scripts/seed-ghost-questions.mjs
 *      node scripts/seed-ghost-questions.mjs --dry-run   (skip DB writes)
 *      node scripts/seed-ghost-questions.mjs --only=4.4  (single WBS code)
 */
import "dotenv/config";
import mysql from "mysql2/promise";

const LLM_URL = "https://integrations.emergentagent.com/llm/chat/completions";
const LLM_KEY = process.env.EMERGENT_LLM_KEY;
const MODEL = "gpt-5.4-mini";

if (!LLM_KEY) {
  console.error("EMERGENT_LLM_KEY missing in .env");
  process.exit(1);
}

const ARGS = process.argv.slice(2);
const DRY = ARGS.includes("--dry-run");
const ONLY = ARGS.find((a) => a.startsWith("--only="))?.slice("--only=".length);

// ── WBS catalog with per-stage topic hints ──────────────────────────────────
// Each entry: WBS code + canonical name + bible search keywords + cellar
// stage that surfaces this code. The `stage` is informational only — the
// engine joins via wbsCode, not via stage string.
const WBS_CATALOG = [
  { code: "3.1", name: "Cold Soak & Pre-Fermentation",      stage: "pre_ferment",     keywords: "cold soak pre-fermentation maceration colour extraction" },
  { code: "3.3", name: "SO₂ at the Crush",                  stage: "pre_ferment",     keywords: "SO2 sulphite crush ppm receival" },
  { code: "4.1", name: "Primary Fermentation",              stage: "primary_active",  keywords: "primary fermentation Brix temperature cap" },
  { code: "4.2", name: "Yeast Rehydration & Inoculation",   stage: "pre_ferment",     keywords: "yeast rehydration GoFerm inoculation strain" },
  { code: "4.3", name: "Yeast Nutrition & DAP",             stage: "primary_active",  keywords: "yeast nutrition DAP Fermaid YAN split" },
  { code: "4.4", name: "Stuck Fermentation",                stage: "primary_slowing", keywords: "stuck ferment restart hot temperature osmotic" },
  { code: "4.6", name: "Pressing",                          stage: "pressed",         keywords: "press wine free run cycle pressure" },
  { code: "4.8", name: "Malolactic Fermentation",           stage: "mlf_active",      keywords: "malolactic MLF Oenococcus oeni co-inoculation pH" },
  { code: "5.1", name: "Oak Programme & Barrel Selection",  stage: "aging_barrel",    keywords: "oak barrel toast French American hogshead puncheon" },
  { code: "5.2", name: "Post-MLF SO₂ Adjustment",           stage: "aging_tank",      keywords: "SO2 post MLF free molecular pH adjustment" },
  { code: "5.3", name: "Racking & Lees",                    stage: "aging_tank",      keywords: "racking gross lees fine lees transfer batonnage" },
  { code: "5.4", name: "Barrel Top-Up & Ullage",            stage: "aging_barrel",    keywords: "barrel top-up topping ullage evaporation oxidation" },
  { code: "6.1", name: "Cold Stabilisation",                stage: "aging_tank",      keywords: "cold stabilisation tartrate KHT chill bentonite" },
  { code: "7.1", name: "Bottling & Closures",               stage: "bottled",         keywords: "bottling closure cork screwcap filtration filling" },
  { code: "8.1", name: "Laboratory Testing",                stage: "primary_active",  keywords: "lab testing pH TA Brix YAN bench trial" },
];

const WINE_TYPES = [
  { id: "red",     name: "red wine",   note: "Red wine flow — ferment on skins, press after primary." },
  { id: "white",   name: "white wine", note: "White wine flow — press at receival, settle, ferment cool 12–18°C juice only." },
  { id: "general", name: "general",    note: "Process applies broadly across red and white. Mention any color-specific deltas only briefly." },
];

// ── DB / LLM plumbing ──────────────────────────────────────────────────────
const conn = await mysql.createConnection(process.env.DATABASE_URL);

async function getContextForWbs(wbsCode, keywords, wineType) {
  // Pull a few bible chunks + the matching SOP for grounding.
  const kws = keywords.split(/\s+/).filter((w) => w.length > 2);
  const likes = kws.map(() => "(topic_tags LIKE ? OR content LIKE ?)").join(" OR ");
  const params = kws.flatMap((k) => [`%${k}%`, `%${k}%`]);
  // For whites, prefer white bible; for reds, red bible; general = any
  const sourceFilter = wineType === "white"
    ? "AND source_doc IN ('white_wine_bible', 'morew_white_outline')"
    : wineType === "red"
      ? "AND source_doc IN ('red_wine_bible', 'morew_red_outline')"
      : "";
  const [chunks] = await conn.execute(
    `SELECT source_doc, chapter_title, content
       FROM diy_knowledge_chunks
      WHERE published = 1 ${sourceFilter} AND (${likes})
      LIMIT 3`,
    params
  );
  // Fallback: if no color-specific chunks, allow any
  let chunkRows = chunks;
  if (chunkRows.length === 0 && wineType !== "general") {
    const [fallback] = await conn.execute(
      `SELECT source_doc, chapter_title, content
         FROM diy_knowledge_chunks
        WHERE published = 1 AND (${likes})
        LIMIT 3`,
      params
    );
    chunkRows = fallback;
  }
  const [sops] = await conn.execute(
    `SELECT title, procedure_text, decision_logic
       FROM sop_library
      WHERE published = 1 AND wbs_code = ?
      LIMIT 2`,
    [wbsCode]
  );
  const bibleBlock = chunkRows
    .map((r) => `[${r.source_doc} — ${r.chapter_title}]\n${r.content.slice(0, 900)}`)
    .join("\n\n---\n\n");
  const sopBlock = sops
    .map((s) => `[SOP: ${s.title}]\nProcedure: ${(s.procedure_text || "").slice(0, 700)}\nDecision logic: ${(s.decision_logic || "").slice(0, 400)}`)
    .join("\n\n---\n\n");
  return `# WINE BIBLE EXCERPTS\n${bibleBlock || "(no chunks matched — write from general knowledge)"}\n\n# RELATED SOPs\n${sopBlock || "(no SOP exists for this WBS yet)"}`;
}

async function callLLM(messages) {
  const body = {
    model: MODEL,
    messages,
    stream: false,
    response_format: { type: "json_object" },
    max_completion_tokens: 1800,
  };
  const resp = await fetch(LLM_URL, {
    method: "POST",
    headers: { "Content-Type": "application/json", Authorization: `Bearer ${LLM_KEY}` },
    body: JSON.stringify(body),
  });
  if (!resp.ok) {
    const err = await resp.text();
    throw new Error(`LLM ${resp.status}: ${err.slice(0, 300)}`);
  }
  const data = await resp.json();
  return data.choices?.[0]?.message?.content ?? "";
}

function buildPrompts(wbs, wineType, context) {
  const system = `You write "ghost questions" for a winemaking knowledge base — the kind of practical, working-winemaker questions a cellar hand wishes someone had explained to them in their first vintage. Voice: experienced cellar hand teaching a curious junior. Aus/NZ English, metric units (°C, g/L, ppm, hL, mL). No fluff, no jargon without explanation.

You will return STRICT JSON with shape:
{ "items": [
    { "question": "...", "answer": "...", "category": "...", "difficulty": "beginner" },
    ...
] }

Constraints per item:
- question: 80–140 characters, ends with a question mark, plain-English voice
- answer: 80–140 words, grounded in the provided context where possible, includes at least one concrete number / range / threshold from the source material
- category: ONE short tag from: fermentation | nutrition | so2 | mlf | pressing | racking | additions | bottling | sanitation | lab | barrel | stabilisation | faults | stuck-ferment
- difficulty: "beginner" | "intermediate" | "advanced" — mostly beginner

Return ONLY the JSON object. No markdown fences, no commentary.`;

  const user = `Generate 5 ghost Q&A items for:
- WBS code: ${wbs.code}  (${wbs.name})
- Stage: ${wbs.stage}
- Wine type focus: ${wineType.name} — ${wineType.note}

The 5 questions should cover a SPREAD of angles:
  1. A practical "when do I…" / "how often…" question (timing/frequency)
  2. A "what's the right value/range for…" question (numbers)
  3. A "what goes wrong if…" question (failure mode + recovery)
  4. A "is it OK to…" or "can I skip…" question (common misconceptions)
  5. An advanced or scale-specific question (e.g. boutique 200L vs commercial, or a tribal-knowledge point)

Use the source material below as grounding. Where the bibles or SOPs give exact numbers, USE THOSE numbers in the answer.

# CONTEXT FOR ${wbs.code} (${wineType.name})

${context.slice(0, 6000)}
`;

  return [
    { role: "system", content: system },
    { role: "user", content: user },
  ];
}

function parseLlm(text) {
  // Be liberal about stray markdown fences
  let s = text.trim();
  if (s.startsWith("```")) {
    s = s.replace(/^```(?:json)?\s*/i, "").replace(/```\s*$/, "");
  }
  const parsed = JSON.parse(s);
  if (!parsed.items || !Array.isArray(parsed.items)) {
    throw new Error("LLM response missing items[]");
  }
  return parsed.items;
}

function validateItem(it) {
  if (!it.question || !it.answer) return null;
  const q = String(it.question).trim();
  const a = String(it.answer).trim();
  if (q.length < 20 || q.length > 280) return null;
  if (a.length < 50) return null;
  const allowedCats = new Set([
    "fermentation","nutrition","so2","mlf","pressing","racking","additions",
    "bottling","sanitation","lab","barrel","stabilisation","faults","stuck-ferment",
  ]);
  const cat = String(it.category ?? "").toLowerCase().trim();
  const allowedDiff = new Set(["beginner", "intermediate", "advanced"]);
  const diff = String(it.difficulty ?? "beginner").toLowerCase().trim();
  return {
    question: q,
    answer: a,
    category: allowedCats.has(cat) ? cat : "fermentation",
    difficulty: allowedDiff.has(diff) ? diff : "beginner",
  };
}

// ── Main loop ───────────────────────────────────────────────────────────────
const now = Date.now();
let totalInserted = 0;
let totalReplaced = 0;
const errors = [];

const targets = WBS_CATALOG.filter((w) => !ONLY || w.code === ONLY);
console.log(`Targeting ${targets.length} WBS codes × ${WINE_TYPES.length} wine_types = ${targets.length * WINE_TYPES.length} LLM calls\n`);

for (const wbs of targets) {
  for (const wt of WINE_TYPES) {
    const tag = `${wbs.code}/${wt.id}`;
    try {
      const ctx = await getContextForWbs(wbs.code, wbs.keywords, wt.id);
      const messages = buildPrompts(wbs, wt, ctx);
      const raw = await callLLM(messages);
      const items = parseLlm(raw).map(validateItem).filter(Boolean);
      if (items.length === 0) {
        console.log(`  · ${tag} → 0 valid items (skipping)`);
        continue;
      }
      if (DRY) {
        console.log(`  · ${tag} → ${items.length} items (dry-run)`);
        for (const it of items.slice(0, 1)) {
          console.log(`      Q: ${it.question}`);
          console.log(`      A: ${it.answer.slice(0, 100)}…`);
        }
        continue;
      }
      // Idempotent replace: drop prior LLM-generated rows for this (wbs, wine_type)
      const [delRes] = await conn.execute(
        "DELETE FROM ghost_questions WHERE wbs_code = ? AND wine_type = ?",
        [wbs.code, wt.id]
      );
      totalReplaced += delRes.affectedRows ?? 0;
      for (const it of items) {
        await conn.execute(
          `INSERT INTO ghost_questions
             (wbs_code, wine_type, question, answer, difficulty, category, active, created_at)
           VALUES (?, ?, ?, ?, ?, ?, 1, ?)`,
          [wbs.code, wt.id, it.question, it.answer, it.difficulty, it.category, now]
        );
        totalInserted++;
      }
      console.log(`  ✓ ${tag} → ${items.length} inserted`);
    } catch (e) {
      console.log(`  ✗ ${tag} → ${e.message}`);
      errors.push({ tag, err: e.message });
    }
  }
}

console.log(`\n──────────────────────────────────────────`);
console.log(`Inserted: ${totalInserted}   (replaced ${totalReplaced} prior rows)`);
console.log(`Errors:   ${errors.length}`);
if (errors.length > 0) {
  for (const e of errors.slice(0, 5)) console.log(`  · ${e.tag}: ${e.err}`);
}

if (!DRY) {
  const [counts] = await conn.execute(
    "SELECT wine_type, COUNT(*) AS n FROM ghost_questions GROUP BY wine_type ORDER BY wine_type"
  );
  console.log(`\nFinal counts:`, counts);
}
await conn.end();
