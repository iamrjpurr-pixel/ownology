/**
 * Seeds 38 SOPs across the canonical 12 categories.
 *
 *   1. Renames the existing 7 SOPs to the new category taxonomy.
 *   2. Generates 31 new SOPs using gpt-5.4-mini, grounded in published
 *      diy_knowledge_chunks (Red + White Wine Bibles).
 *
 * Each generated SOP gets:
 *   - procedure_text   (≈600 words, Markdown, step-by-step)
 *   - decision_logic   (≈150 words, why this approach)
 *   - tribal_knowledge (≈120 words, practical quirks)
 *   - quick_steps      (3–5 bullet point cellar-floor checklist)
 *
 * Idempotent: re-running won't duplicate — uses (category,title) as a natural key.
 *
 * Run:  node scripts/seed-38-sops.mjs
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

// ── 12 Canonical Categories (per server/queryRouter.ts) ─────────────────────
// 38 SOP catalog. WBS codes follow the existing 10-domain scheme.
const SOP_CATALOG = [
  // ── Harvest & Receival ───────────────────────────────────────────────────
  { cat: "Harvest & Receival",       title: "Harvest Decision & Sampling",            wbs: "2.1", bibleQuery: "harvest sugar acid sampling" },
  { cat: "Harvest & Receival",       title: "Fruit Reception & Sorting",              wbs: "2.2", bibleQuery: "reception sorting destem" },
  { cat: "Harvest & Receival",       title: "Cold Soak & Pre-Fermentation Hold",      wbs: "3.1", bibleQuery: "cold soak pre-fermentation maceration" },

  // ── Fermentation Management ──────────────────────────────────────────────
  { cat: "Fermentation Management",  title: "Red Wine Fermentation",                  wbs: "4.1", bibleQuery: "red wine fermentation primary",   keep: true },
  { cat: "Fermentation Management",  title: "Pump-Over Protocol",                     wbs: "4.1", bibleQuery: "pump over cap punch down",         keep: true },
  { cat: "Fermentation Management",  title: "White Wine Fermentation Temperature Control", wbs: "4.1", bibleQuery: "white wine fermentation temperature cool" },
  { cat: "Fermentation Management",  title: "Cap Management & Extraction Strategy",   wbs: "4.1", bibleQuery: "cap management extraction tannin" },

  // ── Yeast & Fermentation ─────────────────────────────────────────────────
  { cat: "Yeast & Fermentation",     title: "Yeast Rehydration & Inoculation",        wbs: "4.2", bibleQuery: "yeast rehydration inoculation Go-Ferm", keep: true },
  { cat: "Yeast & Fermentation",     title: "Yeast Strain Selection",                 wbs: "4.2", bibleQuery: "yeast strain selection variety" },
  { cat: "Yeast & Fermentation",     title: "Yeast Nutrition & DAP Additions",        wbs: "4.3", bibleQuery: "yeast nutrition DAP Fermaid YAN" },

  // ── SO₂ Management ──────────────────────────────────────────────────────
  { cat: "SO₂ Management",           title: "SO₂ at the Crush",                       wbs: "3.3", bibleQuery: "SO2 sulphite crush ppm" },
  { cat: "SO₂ Management",           title: "Post-MLF SO₂ Adjustment",                wbs: "5.2", bibleQuery: "SO2 post malolactic sulphite" },
  { cat: "SO₂ Management",           title: "Free vs Molecular SO₂ Calculation",      wbs: "8.2", bibleQuery: "free SO2 molecular pH calculation" },

  // ── Malolactic Fermentation ──────────────────────────────────────────────
  { cat: "Malolactic Fermentation",  title: "Malolactic Fermentation Management",     wbs: "4.8", bibleQuery: "malolactic MLF management bacteria", keep: true },
  { cat: "Malolactic Fermentation",  title: "MLF Inoculation & Co-Inoculation",       wbs: "4.8", bibleQuery: "MLF co-inoculation oenococcus bacteria" },

  // ── Pressing & Free-Run ──────────────────────────────────────────────────
  { cat: "Pressing & Free-Run",      title: "Wine Press Operation & Pressing",        wbs: "4.6", bibleQuery: "wine press operation pressing protocol", keep: true },
  { cat: "Pressing & Free-Run",      title: "Free-Run vs Press-Run Separation",       wbs: "4.6", bibleQuery: "free run press run separation tannin" },
  { cat: "Pressing & Free-Run",      title: "Whole-Bunch & Whole-Cluster Pressing",   wbs: "4.6", bibleQuery: "whole bunch whole cluster pressing" },

  // ── Racking & Clarification ──────────────────────────────────────────────
  { cat: "Racking & Clarification",  title: "Racking off Gross Lees",                 wbs: "5.3", bibleQuery: "racking gross lees transfer first" },
  { cat: "Racking & Clarification",  title: "Fine Lees Stirring (Bâtonnage)",         wbs: "5.3", bibleQuery: "lees stirring batonnage white wine" },
  { cat: "Racking & Clarification",  title: "Cold Stabilisation",                     wbs: "6.1", bibleQuery: "cold stabilisation tartrate KHT" },
  { cat: "Racking & Clarification",  title: "Protein Stability & Bentonite Fining",   wbs: "6.2", bibleQuery: "protein stability bentonite fining heat test" },

  // ── Additions & Chemistry ────────────────────────────────────────────────
  { cat: "Additions & Chemistry",    title: "Acid Adjustment — Tartaric Addition",    wbs: "3.2", bibleQuery: "acid adjustment tartaric TA pH" },
  { cat: "Additions & Chemistry",    title: "Sugar Adjustment & Chaptalisation",      wbs: "3.2", bibleQuery: "sugar adjustment chaptalisation Brix" },
  { cat: "Additions & Chemistry",    title: "Tannin Additions",                       wbs: "4.5", bibleQuery: "tannin addition oak grape skin" },
  { cat: "Additions & Chemistry",    title: "Oak Programme — Barrel & Adjunct Selection", wbs: "5.1", bibleQuery: "oak barrel toast French American adjunct" },

  // ── Bottling & Packaging ─────────────────────────────────────────────────
  { cat: "Bottling & Packaging",     title: "Bottling & Packaging",                   wbs: "7.1", bibleQuery: "bottling filtration packaging", keep: true },
  { cat: "Bottling & Packaging",     title: "Pre-Bottling Filtration",                wbs: "6.3", bibleQuery: "filtration sterile cartridge depth" },
  { cat: "Bottling & Packaging",     title: "Closure Selection (Screwcap / Cork)",    wbs: "7.1", bibleQuery: "closure cork screwcap oxygen" },

  // ── Sanitation & Equipment ───────────────────────────────────────────────
  { cat: "Sanitation & Equipment",   title: "Tank Cleaning & Sanitisation",           wbs: "1.1", bibleQuery: "tank cleaning sanitisation caustic", keep: true },
  { cat: "Sanitation & Equipment",   title: "Barrel Preparation & Topping Schedule",  wbs: "5.4", bibleQuery: "barrel preparation topping ullage" },
  { cat: "Sanitation & Equipment",   title: "Hose, Pump & Transfer-Line Hygiene",     wbs: "1.2", bibleQuery: "hose pump transfer hygiene sanitation" },

  // ── Fault Diagnosis ──────────────────────────────────────────────────────
  { cat: "Fault Diagnosis",          title: "Stuck Fermentation — Diagnosis & Restart", wbs: "4.4", bibleQuery: "stuck fermentation restart yeast nutrient" },
  { cat: "Fault Diagnosis",          title: "Brettanomyces — Detection & Control",    wbs: "8.3", bibleQuery: "Brett Brettanomyces detection 4-EP" },
  { cat: "Fault Diagnosis",          title: "Volatile Acidity (VA) & Reductive Faults", wbs: "8.3", bibleQuery: "VA volatile acidity H2S reductive" },

  // ── Laboratory Testing ───────────────────────────────────────────────────
  { cat: "Laboratory Testing",       title: "Brix / Specific Gravity Monitoring",     wbs: "8.1", bibleQuery: "Brix specific gravity hydrometer monitoring" },
  { cat: "Laboratory Testing",       title: "pH & Titratable Acidity (TA) Testing",   wbs: "8.1", bibleQuery: "pH titratable acidity TA testing" },
  { cat: "Laboratory Testing",       title: "Bench Trials — Fining & Acid Adjustment", wbs: "8.1", bibleQuery: "bench trials fining acid adjustment" },
];

console.log(`Catalog: ${SOP_CATALOG.length} SOPs across ${new Set(SOP_CATALOG.map(s=>s.cat)).size} categories\n`);

// ── LLM call ───────────────────────────────────────────────────────────────
async function callLLM(messages, json = true) {
  const body = {
    model: MODEL,
    messages,
    stream: false,
    max_completion_tokens: 2400,
  };
  if (json) body.response_format = { type: "json_object" };

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

// ── DB helpers ────────────────────────────────────────────────────────────
async function getBibleContext(conn, query) {
  const keywords = query.split(/\s+/).filter(w => w.length > 2);
  if (keywords.length === 0) return "";
  // simple keyword OR match on topic_tags / content
  const likes = keywords.map(() => "(topic_tags LIKE ? OR content LIKE ?)").join(" OR ");
  const params = keywords.flatMap(k => [`%${k}%`, `%${k}%`]);
  const [rows] = await conn.execute(
    `SELECT source_doc, chapter_title, content
       FROM diy_knowledge_chunks
      WHERE published = 1 AND (${likes})
      LIMIT 4`,
    params
  );
  return rows
    .map(r => `[${r.source_doc} — ${r.chapter_title}]\n${r.content.slice(0, 1200)}`)
    .join("\n\n---\n\n");
}

async function upsertSop(conn, sop, content, sortByCategory) {
  const now = Date.now();
  const [existing] = await conn.execute(
    "SELECT id FROM sop_library WHERE category = ? AND title = ? LIMIT 1",
    [sop.cat, sop.title]
  );

  const wbs = sop.wbs;
  const domain = wbs.split(".")[0];

  if (existing.length > 0) {
    await conn.execute(
      `UPDATE sop_library
         SET sort_order = ?, procedure_text = ?, decision_logic = ?, tribal_knowledge = ?,
             quick_steps = ?, audience = 'commercial', is_template = 1,
             wbs_domain = ?, wbs_process_family = ?, wbs_code = ?,
             published = 1, published_at = COALESCE(published_at, ?),
             updated_at = ?
       WHERE id = ?`,
      [
        sortByCategory,
        content.procedure_text, content.decision_logic, content.tribal_knowledge,
        content.quick_steps,
        domain, wbs, wbs,
        now, now, existing[0].id,
      ]
    );
    return { id: existing[0].id, action: "updated" };
  }
  const [res] = await conn.execute(
    `INSERT INTO sop_library
       (category, sort_order, title, procedure_text, decision_logic, tribal_knowledge,
        quick_steps, is_template, audience,
        wbs_domain, wbs_process_family, wbs_code,
        published, published_at, created_at, updated_at)
     VALUES (?, ?, ?, ?, ?, ?, ?, 1, 'commercial', ?, ?, ?, 1, ?, ?, ?)`,
    [
      sop.cat, sortByCategory, sop.title,
      content.procedure_text, content.decision_logic, content.tribal_knowledge,
      content.quick_steps,
      domain, wbs, wbs, now, now, now,
    ]
  );
  return { id: res.insertId, action: "inserted" };
}

// ── Generate content via LLM ──────────────────────────────────────────────
async function generateSopContent(sop, bibleContext) {
  const systemPrompt = `You are a senior winemaker writing Standard Operating Procedures (SOPs) for a boutique winery's quality system. Your voice is practical, precise, and grounded in real cellar experience. You write in Australian/New Zealand English (metric units, °C, hL, g/L, ppm). Use numbered steps, exact dosing where possible, and the safety/compliance angle when relevant.

You will produce JSON with these four fields:
- procedure_text: Markdown, ~500-700 words, step-by-step procedure with numbered headings (## Step 1 — ..., ## Step 2 — ...). Include exact ranges, target values, what to check at each stage.
- decision_logic: Markdown, ~120-180 words, explaining the *why* — why this approach over alternatives, key trade-offs, when to deviate.
- tribal_knowledge: Markdown, ~100-150 words, practical cellar-floor wisdom — equipment quirks, supplier preferences, things you only learn by doing.
- quick_steps: Markdown bullet list, 3–5 short cellar-floor action items (start each with an action verb, max 12 words each).

Return ONLY valid JSON. No markdown fences, no commentary.`;

  const userPrompt = `Write the SOP for:

Title: ${sop.title}
Category: ${sop.cat}
WBS code: ${sop.wbs}

Reference passages (use as factual grounding — do NOT mention these source names):
${bibleContext || "(no specific reference — write from general winemaking best practice)"}

Output the JSON object now.`;

  const raw = await callLLM([
    { role: "system", content: systemPrompt },
    { role: "user", content: userPrompt },
  ]);

  // Best-effort JSON parse
  const cleaned = raw.replace(/^```json\s*/, "").replace(/```\s*$/, "").trim();
  const parsed = JSON.parse(cleaned);
  return {
    procedure_text: parsed.procedure_text || "",
    decision_logic: parsed.decision_logic || "",
    tribal_knowledge: parsed.tribal_knowledge || "",
    quick_steps: parsed.quick_steps || "",
  };
}

// ── Main ──────────────────────────────────────────────────────────────────
async function main() {
  const conn = await mysql.createConnection(process.env.DATABASE_URL);
  console.log("Connected to DB.\n");

  // sort order counter per category
  const sortCounter = {};
  let inserted = 0, updated = 0, skipped = 0, failed = 0;

  for (const sop of SOP_CATALOG) {
    sortCounter[sop.cat] = (sortCounter[sop.cat] || 0) + 1;
    const sortByCategory = sortCounter[sop.cat];

    try {
      const bibleContext = await getBibleContext(conn, sop.bibleQuery);
      process.stdout.write(`  ${sop.cat.padEnd(28)} / ${sop.title.padEnd(48)} `);

      const content = await generateSopContent(sop, bibleContext);
      const result = await upsertSop(conn, sop, content, sortByCategory);

      if (result.action === "inserted") { inserted++; console.log("inserted ✓"); }
      else { updated++; console.log("updated ✓"); }
    } catch (err) {
      failed++;
      console.log(`FAILED — ${err.message.slice(0, 100)}`);
    }
  }

  console.log("\n─────────────────────────────────────────────────────────");
  console.log(`Inserted: ${inserted}  Updated: ${updated}  Failed: ${failed}  Skipped: ${skipped}`);

  // verify total
  const [[row]] = await conn.execute("SELECT COUNT(*) AS n FROM sop_library");
  console.log(`Total SOPs in sop_library: ${row.n}`);
  const [cats] = await conn.execute("SELECT category, COUNT(*) AS n FROM sop_library GROUP BY category ORDER BY category");
  console.log(`\nBreakdown by category:`);
  for (const c of cats) console.log(`  ${c.category.padEnd(28)} ${c.n}`);

  await conn.end();
}

main().catch((err) => { console.error("FATAL:", err); process.exit(1); });
