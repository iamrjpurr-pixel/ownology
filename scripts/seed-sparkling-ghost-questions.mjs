/**
 * seed-sparkling-ghost-questions.mjs — Feb 2026.
 *
 * Fills the sparkling knowledge gap. Ownology has red + white bibles but NO
 * dedicated sparkling bible; this seeds ~54 educational Q&As covering the
 * full méthode traditionnelle + Charmat + ancestral (pét-nat) flows, anchored
 * to a new 9.x WBS branch. Tasmania-forward: many questions reference the
 * cool-climate context (House of Arras, Jansz, Clover Hill, Pipers Brook),
 * regional Australian sparkling styles (Yarra Valley, King Valley Prosecco,
 * Adelaide Hills, Great Southern, Macedon Ranges), and how AU sparkling
 * differs from Champagne.
 *
 * WBS taxonomy created here:
 *   9.1 Base Wine Production   — dry, high-acid, restrained aromatics
 *   9.2 Cuvée Blending         — assemblage of base wines pre-tirage
 *   9.3 Tirage                 — sugar + yeast + nutrient at bottling
 *   9.4 Prise de Mousse        — secondary fermentation in bottle
 *   9.5 Aging on Lees          — autolysis, 12/18/24/36+ months
 *   9.6 Riddling / Remuage     — moving lees to the neck
 *   9.7 Disgorging             — expelling the lees plug
 *   9.8 Dosage & Liqueur       — sweetness class + top-up
 *   9.9 Bottling Under Pressure — Charmat / tank method
 *
 * Each Q&A:
 *   - question:  80–140 chars, practical winemaker voice
 *   - answer:    80–140 words, concrete numbers (tirage sugar 24 g/L,
 *                bar pressure 5–6 bar, dosage classes brut nature 0–3 g/L,
 *                extra-brut 0–6, brut 0–12, extra-dry 12–17, sec 17–32,
 *                demi-sec 32–50, doux >50, aging times)
 *   - category:  "sparkling" (new tag)
 *   - difficulty: beginner (~50%), intermediate (~40%), advanced (~10%)
 *
 * wine_type = "sparkling" — new fourth value alongside red/white/general.
 *
 * Idempotent: deletes prior wine_type='sparkling' rows before insert.
 *
 * Run: node scripts/seed-sparkling-ghost-questions.mjs
 *      node scripts/seed-sparkling-ghost-questions.mjs --dry-run
 *      node scripts/seed-sparkling-ghost-questions.mjs --only=9.5
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

const WBS_SPARKLING = [
  { code: "9.1", name: "Base Wine Production",       method: "traditional/charmat", angles: "high acid (2.9-3.1 pH, 8-10 g/L TA); restrained aromatics; no MLF (usually); early press for freshness" },
  { code: "9.2", name: "Cuvée Blending",             method: "traditional",         angles: "assemblage across varieties (Chardonnay/Pinot/Meunier) and vineyard parcels; NV consistency vs vintage cuvée; reserve wines" },
  { code: "9.3", name: "Tirage",                     method: "traditional",         angles: "24 g/L sugar target for 6 atm; yeast strain (EC1118, IOC 18-2007, DV10, Prise de Mousse); riddling agent (bentonite/alginate); cage vs crown seal" },
  { code: "9.4", name: "Prise de Mousse",            method: "traditional",         angles: "secondary ferment 15-30 days at 10-15°C; too warm = coarse bubbles; slow cool ferment = fine mousse; pressure build to 5-6 bar" },
  { code: "9.5", name: "Aging on Lees (Autolysis)",  method: "traditional",         angles: "12 months minimum NV, 24+ for vintage cuvée; toast/brioche/nut notes; Tasmania premium 36-84 months; Champagne-comparable" },
  { code: "9.6", name: "Riddling / Remuage",         method: "traditional",         angles: "manual pupitre 4-8 weeks vs gyropalette 4-7 days; angle progression 20°→75°; end state = sur-pointe with lees at cork" },
  { code: "9.7", name: "Disgorging",                 method: "traditional",         angles: "à la volée (manual, cold) vs frozen neck (-25°C brine dip); loss ~5-10 mL cuvée; oxygen exposure risk" },
  { code: "9.8", name: "Dosage & Liqueur d'Expédition", method: "traditional",      angles: "sweetness classes brut nature 0-3, extra-brut 0-6, brut 0-12, extra-dry 12-17, sec 17-32, demi-sec 32-50, doux >50 g/L; liqueur components (base wine + sugar + optional cognac/spirit)" },
  { code: "9.9", name: "Bottling Under Pressure (Charmat)", method: "charmat",      angles: "tank method for Prosecco/King Valley; 30-90 day autoclave secondary; simpler, cheaper, less autolytic than traditional; ancestral (pét-nat) as third path" },
];

const conn = await mysql.createConnection(process.env.DATABASE_URL);

async function callLLM(messages) {
  const body = {
    model: MODEL,
    messages,
    stream: false,
    response_format: { type: "json_object" },
    max_completion_tokens: 2000,
  };
  const resp = await fetch(LLM_URL, {
    method: "POST",
    headers: { "Content-Type": "application/json", Authorization: `Bearer ${LLM_KEY}` },
    body: JSON.stringify(body),
  });
  if (!resp.ok) throw new Error(`LLM ${resp.status}: ${(await resp.text()).slice(0, 300)}`);
  const data = await resp.json();
  return data.choices?.[0]?.message?.content ?? "";
}

async function getSparklingContext(wbsCode) {
  // Pull real MoreWine sparkling content + secondary specialist manuals so
  // the LLM cites concrete numbers/protocols instead of relying on its own
  // training data. We fetch primary WBS chunks + the sparkling protocol
  // documents regardless of WBS (they cover the full flow in one PDF).
  const [chunks] = await conn.execute(
    `SELECT source_doc, chapter_title, content
       FROM diy_knowledge_chunks
      WHERE published = 1
        AND (
          (source_doc IN ('morew_sparkling_yeast','morew_sparkling_proelif'))
          OR (wbs_code = ? AND source_doc IN ('morew_yeast_hydration','morew_yeast_pairing','morew_so2_mgmt','morew_so2_protocol','morew_mlf_paper','white_wine_bible'))
        )
      LIMIT 6`,
    [wbsCode]
  );
  if (chunks.length === 0) return "(no MoreWine grounding available for this WBS code — write from general sparkling knowledge)";
  return chunks
    .map((r) => `[${r.source_doc.replace(/_/g, " ")} — ${r.chapter_title ?? ""}]\n${r.content.slice(0, 900)}`)
    .join("\n\n---\n\n");
}

function buildPrompts(wbs, context) {
  const system = `You write "ghost questions" for a winemaking knowledge base — Australian sparkling wine focus. Voice: experienced sparkling winemaker teaching a curious junior. Aus/NZ English, metric units.

You return STRICT JSON:
{ "items": [
    { "question": "...", "answer": "...", "category": "sparkling", "difficulty": "beginner"|"intermediate"|"advanced" },
    ...
] }

Constraints per item:
- question: 80–140 chars, ends "?", winemaker voice, plain English
- answer:   80–140 words, MUST use concrete numbers from the MoreWine context below where possible (e.g. rehydrate at 35-40°C at 10× water; tirage sugar 22-24 g/L; FSO2 <15 ppm before tirage; 5% starter volume; 1.0-1.5×10⁶ cells/mL; ProElif dose rate; pH >2.9). Also include at least one Australian regional reference where appropriate (Tasmania — House of Arras / Jansz / Clover Hill / Pipers Brook / Delatite; Yarra — Chandon / Dominique Portet; King Valley — Dal Zotto Prosecco; Adelaide Hills — Deviation Road / Petaluma; Macedon — Hanging Rock; Great Southern WA)
- category:  always "sparkling"
- difficulty: "beginner" | "intermediate" | "advanced"

Aus perspective: Australian sparkling is world-class in cool-climate regions (Tasmania especially), diverges from Champagne in style/climate, and Prosecco (Charmat method) is legally protected in EU but permitted in Australia when made from Glera grapes (mostly King Valley VIC). Ancestral method (pét-nat) is a growing category in AU.

Return ONLY the JSON object.`;

  const user = `Generate 6 ghost Q&A items for:
- WBS code: ${wbs.code} (${wbs.name})
- Method context: ${wbs.method}
- Key angles: ${wbs.angles}

The 6 questions should cover a spread:
  1. Practical timing / frequency ("when do I…", "how long…")
  2. Specific numbers / thresholds — LEAN ON THE MOREWINE CONTEXT NUMBERS BELOW
  3. Failure mode + recovery
  4. Common misconception or "can I skip…"
  5. Australian regional context — Tasmania or another AU sparkling region
  6. Advanced or comparative (traditional vs Charmat vs ancestral, or vs Champagne)

# GROUNDING CONTEXT (real MoreWine content — cite these numbers verbatim where relevant)

${context.slice(0, 7000)}

Return the JSON now.`;

  return [
    { role: "system", content: system },
    { role: "user", content: user },
  ];
}

function parseLlm(text) {
  let s = text.trim();
  if (s.startsWith("```")) s = s.replace(/^```(?:json)?\s*/i, "").replace(/```\s*$/, "");
  const parsed = JSON.parse(s);
  if (!parsed.items || !Array.isArray(parsed.items)) throw new Error("missing items[]");
  return parsed.items;
}

function validateItem(it) {
  if (!it.question || !it.answer) return null;
  const q = String(it.question).trim();
  const a = String(it.answer).trim();
  if (q.length < 20 || q.length > 280) return null;
  if (a.length < 60) return null;
  const allowedDiff = new Set(["beginner", "intermediate", "advanced"]);
  const diff = String(it.difficulty ?? "beginner").toLowerCase().trim();
  return {
    question: q, answer: a,
    category: "sparkling",
    difficulty: allowedDiff.has(diff) ? diff : "beginner",
  };
}

const now = Date.now();
let totalInserted = 0, totalReplaced = 0;
const errors = [];
const targets = WBS_SPARKLING.filter((w) => !ONLY || w.code === ONLY);
console.log(`Targeting ${targets.length} sparkling WBS codes × 6 Q&As = ${targets.length * 6} target questions\n`);

// Idempotent: wipe prior sparkling rows so re-runs replace the set
if (!DRY && !ONLY) {
  const [d] = await conn.execute("DELETE FROM ghost_questions WHERE wine_type = 'sparkling'");
  totalReplaced = d.affectedRows ?? 0;
  console.log(`Removed ${totalReplaced} prior sparkling rows\n`);
}

for (const wbs of targets) {
  const tag = wbs.code;
  try {
    const context = await getSparklingContext(wbs.code);
    const raw = await callLLM(buildPrompts(wbs, context));
    const items = parseLlm(raw).map(validateItem).filter(Boolean);
    if (items.length === 0) { console.log(`  · ${tag} → 0 valid items`); continue; }
    if (DRY) {
      console.log(`  · ${tag} → ${items.length} items (dry-run)`);
      console.log(`      Q: ${items[0].question}`);
      console.log(`      A: ${items[0].answer.slice(0, 140)}…\n`);
      continue;
    }
    if (ONLY) {
      // When re-running one code only, wipe just this code
      await conn.execute("DELETE FROM ghost_questions WHERE wine_type = 'sparkling' AND wbs_code = ?", [wbs.code]);
    }
    for (const it of items) {
      await conn.execute(
        `INSERT INTO ghost_questions
           (wbs_code, wine_type, question, answer, difficulty, category, active, created_at)
         VALUES (?, 'sparkling', ?, ?, ?, ?, 1, ?)`,
        [wbs.code, it.question, it.answer, it.difficulty, it.category, now]
      );
      totalInserted++;
    }
    console.log(`  ✓ ${tag} → ${items.length} inserted`);
  } catch (e) {
    console.log(`  ✗ ${tag} → ${e.message}`);
    errors.push({ tag, err: e.message });
  }
}

console.log(`\n──────────────────────────────────────────`);
console.log(`Inserted: ${totalInserted}   Errors: ${errors.length}`);
if (!DRY) {
  const [c] = await conn.execute("SELECT wbs_code, COUNT(*) n FROM ghost_questions WHERE wine_type='sparkling' AND active=1 GROUP BY wbs_code ORDER BY wbs_code");
  console.log(`By WBS:`, c);
}
await conn.end();
