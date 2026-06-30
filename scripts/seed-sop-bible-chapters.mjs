/**
 * Seed: map each of the 38 SOPs in `sop_library` to the relevant
 * Red Wine Bible / White Wine Bible chapter(s) in `diy_knowledge_chunks`.
 *
 * Format stored in `sop_library.bible_chapters` (varchar 255):
 *   comma-separated tokens of `<source_doc>:<chapter_ref>` — e.g.
 *   "red_wine_bible:2,white_wine_bible:Ch1,red_wine_bible:10.7"
 *
 * The SOP detail page will tokenise this, look up the chapter_title
 * from diy_knowledge_chunks (single indexed query keyed on source_doc +
 * chapter_ref), and render a "Deepen your understanding" sidebar.
 *
 * Run: node scripts/seed-sop-bible-chapters.mjs
 *
 * Idempotent: re-running overwrites with the same mapping.
 */
import "dotenv/config";
import mysql from "mysql2/promise";

// SOP title → bible chapter mapping. Each value is an array of
// "source_doc:chapter_ref" tokens that exist in diy_knowledge_chunks.
const TITLE_TO_BIBLE = {
  "Bottling & Packaging":                            ["red_wine_bible:9", "white_wine_bible:Ch8"],
  "Harvest Decision & Sampling":                     ["red_wine_bible:1"],
  "Fruit Reception & Sorting":                       ["red_wine_bible:2"],
  "Cold Soak & Pre-Fermentation Hold":               ["red_wine_bible:2", "red_wine_bible:3"],
  "Red Wine Fermentation":                           ["red_wine_bible:3", "red_wine_bible:intro"],
  "Pump-Over Protocol":                              ["red_wine_bible:3"],
  "White Wine Fermentation Temperature Control":     ["white_wine_bible:Ch3", "white_wine_bible:Ch4"],
  "Cap Management & Extraction Strategy":            ["red_wine_bible:3"],
  "Yeast Rehydration & Inoculation":                 ["red_wine_bible:10.4", "white_wine_bible:Ch9.8"],
  "Yeast Strain Selection":                          ["red_wine_bible:10.4", "white_wine_bible:Ch9.8"],
  "Yeast Nutrition & DAP Additions":                 ["red_wine_bible:10.4", "white_wine_bible:Ch9.8"],
  "SO₂ at the Crush":                                ["red_wine_bible:2", "red_wine_bible:10.7"],
  "Post-MLF SO₂ Adjustment":                         ["red_wine_bible:7", "red_wine_bible:10.7"],
  "Free vs Molecular SO₂ Calculation":               ["red_wine_bible:10.7", "white_wine_bible:Ch9.4"],
  "Malolactic Fermentation Management":              ["red_wine_bible:6", "red_wine_bible:10.5", "white_wine_bible:Ch5"],
  "MLF Inoculation & Co-Inoculation":                ["red_wine_bible:6", "white_wine_bible:Ch5"],
  "Wine Press Operation & Pressing":                 ["red_wine_bible:4", "white_wine_bible:Ch2"],
  "Free-Run vs Press-Run Separation":                ["red_wine_bible:4"],
  "Whole-Bunch & Whole-Cluster Pressing":            ["red_wine_bible:4", "white_wine_bible:Ch2"],
  "Racking off Gross Lees":                          ["red_wine_bible:5", "red_wine_bible:10.9", "white_wine_bible:Ch9.6"],
  "Fine Lees Stirring (Bâtonnage)":                  ["white_wine_bible:Ch6"],
  "Cold Stabilisation":                              ["white_wine_bible:Ch7"],
  "Protein Stability & Bentonite Fining":            ["white_wine_bible:Ch7"],
  "Acid Adjustment — Tartaric Addition":             ["red_wine_bible:10.2", "white_wine_bible:Ch9.2"],
  "Sugar Adjustment & Chaptalisation":               ["red_wine_bible:10.1"],
  "Tannin Additions":                                ["red_wine_bible:3"],
  "Oak Programme — Barrel & Adjunct Selection":      ["red_wine_bible:8", "red_wine_bible:10.6", "white_wine_bible:Ch6", "white_wine_bible:Ch9.9"],
  "Pre-Bottling Filtration":                         ["red_wine_bible:9", "white_wine_bible:Ch7"],
  "Closure Selection (Screwcap / Cork)":             ["red_wine_bible:9", "white_wine_bible:Ch8"],
  "Tank Cleaning & Sanitisation":                    [], // sanitation — no direct bible chapter
  "Barrel Preparation & Topping Schedule":           ["red_wine_bible:8", "red_wine_bible:10.6"],
  "Hose, Pump & Transfer-Line Hygiene":              [], // sanitation — no direct bible chapter
  "Stuck Fermentation — Diagnosis & Restart":        ["red_wine_bible:3", "white_wine_bible:Ch4"],
  "Brettanomyces — Detection & Control":             ["red_wine_bible:8"],
  "Volatile Acidity (VA) & Reductive Faults":        ["red_wine_bible:8"],
  "Brix / Specific Gravity Monitoring":              ["red_wine_bible:3", "white_wine_bible:Ch4"],
  "pH & Titratable Acidity (TA) Testing":            ["red_wine_bible:10.2", "white_wine_bible:Ch9.2"],
  "Bench Trials — Fining & Acid Adjustment":         ["red_wine_bible:10.8", "white_wine_bible:Ch9.7"],
};

const conn = await mysql.createConnection(process.env.DATABASE_URL);
const now = Date.now();

// 1. Sanity check — verify every cited (source_doc, chapter_ref) exists in
//    diy_knowledge_chunks. Bail loudly if a reference is dead.
const allRefs = new Set();
for (const refs of Object.values(TITLE_TO_BIBLE)) {
  for (const r of refs) allRefs.add(r);
}
const placeholders = Array.from(allRefs).map(() => "(?, ?)").join(",");
const flatParams = [];
for (const ref of allRefs) {
  const [src, ch] = ref.split(":");
  flatParams.push(src, ch);
}
const [existing] = await conn.execute(
  `SELECT DISTINCT source_doc, chapter_ref FROM diy_knowledge_chunks WHERE (source_doc, chapter_ref) IN (${placeholders})`,
  flatParams
);
const existingSet = new Set(existing.map((r) => `${r.source_doc}:${r.chapter_ref}`));
const missing = [...allRefs].filter((r) => !existingSet.has(r));
if (missing.length) {
  console.error(`❌ ${missing.length} bible references do not exist in diy_knowledge_chunks:`);
  for (const m of missing) console.error("   ", m);
  process.exit(1);
}
console.log(`✓ All ${allRefs.size} bible references validated against diy_knowledge_chunks`);

// 2. Apply the mapping to sop_library by title.
let updated = 0;
let titleMisses = 0;
for (const [title, refs] of Object.entries(TITLE_TO_BIBLE)) {
  const tokenString = refs.join(",");
  const [r] = await conn.execute(
    "UPDATE sop_library SET bible_chapters = ?, updated_at = ? WHERE title = ?",
    [tokenString, now, title]
  );
  if (r.affectedRows === 0) {
    console.warn(`⚠️  No SOP found with title: ${title}`);
    titleMisses++;
  } else {
    updated += r.affectedRows;
  }
}

// 3. Verify final coverage.
const [[cov]] = await conn.execute(
  "SELECT SUM(IF(bible_chapters IS NULL OR bible_chapters = '', 0, 1)) AS withBible, COUNT(*) AS total FROM sop_library"
);
console.log(`\n✅ Mapped ${updated} SOPs to Wine Bible chapters (${cov.withBible}/${cov.total} have bible_chapters).`);
console.log(`   ${titleMisses} title misses (likely renamed SOPs).`);
console.log(`   ${Object.values(TITLE_TO_BIBLE).filter((a) => a.length === 0).length} SOPs intentionally left without bible refs (sanitation procedures).`);

await conn.end();
