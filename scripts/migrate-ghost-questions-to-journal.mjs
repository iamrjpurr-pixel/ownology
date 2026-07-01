/**
 * migrate-ghost-questions-to-journal.mjs — Feb 2026.
 *
 * Publishes all 225 active ghost_questions into the public cellar_journal so
 * the SEO flywheel (sitemap.xml, rss.xml, /cellar-journal index) picks them
 * up. Each ghost question becomes a fully-fledged journal entry with:
 *   - slug:         derived from topic + question (sane URL)
 *   - question:     ghost.question verbatim
 *   - topicTag:     category → human label
 *   - fullAnswer:   ghost.answer
 *   - teaserAnswer: first ~50% of answer
 *   - diagnosis:    first sentence of answer
 *   - source:       'ghost.seed'
 *   - audience:     'curious'
 *   - wineType:     red/white/both (general → both)
 *   - citations:    JSON array of {label, source_doc, chapter} resolved
 *                    via WBS → sop_library + diy_knowledge_chunks
 *   - published:    true
 *
 * After insert, writes the cellar_journal.slug back into
 * ghost_questions.journal_slug so the Cellar Brief engine can deep-link
 * each "Worth knowing" block to /cellar-journal/<slug>.
 *
 * Idempotent: source='ghost.seed' rows are removed and re-inserted on each
 * run. Real user questions (source='tutor.ask' / 'freeRun.curiosityAsk')
 * are never touched.
 *
 * Run: node scripts/migrate-ghost-questions-to-journal.mjs
 */
import "dotenv/config";
import mysql from "mysql2/promise";

const c = await mysql.createConnection(process.env.DATABASE_URL);

// Map ghost category → cellar_journal topic tag (matches inferTopic output)
const CATEGORY_TO_TOPIC = {
  fermentation: "Fermentation",
  nutrition: "Yeast & Nutrients",
  so2: "SO₂ & Sulphites",
  mlf: "Malolactic Fermentation",
  pressing: "Pressing & Free-Run",
  racking: "Racking & Lees",
  additions: "Yeast & Nutrients",
  bottling: "Bottling & Closures",
  sanitation: "Sanitation",
  lab: "Acid & pH",
  barrel: "Tannin & Oak",
  stabilisation: "Cold Stabilisation",
  faults: "Faults & Off-Flavours",
  "stuck-ferment": "Stuck Fermentation",
  sparkling: "Sparkling & Bubbles",
};

function slugify(q, topic) {
  const base = `${topic}-${q}`
    .toLowerCase()
    .replace(/['`""]/g, "")
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "")
    .slice(0, 180);
  return base || `journal-${Date.now()}`;
}

function buildTeaserAndDiagnosis(full) {
  const paragraphs = full.split(/\n\s*\n/).filter((p) => p.trim());
  if (paragraphs.length === 0) return { teaser: full, diagnosis: full.slice(0, 250) };
  const firstPara = paragraphs[0].trim();
  const firstSentence = firstPara.split(/(?<=[.!?])\s+/)[0] || firstPara;
  const diagnosis = firstSentence.slice(0, 500);
  // ~50% — at least the first paragraph
  const targetLen = Math.floor(full.length * 0.5);
  let acc = 0;
  const kept = [];
  for (const p of paragraphs) {
    kept.push(p);
    acc += p.length + 2;
    if (acc >= targetLen) break;
  }
  if (kept.length === 0) kept.push(firstPara);
  return { teaser: kept.join("\n\n"), diagnosis };
}

function mapWineType(gt) {
  if (gt === "red") return "red";
  if (gt === "white") return "white";
  if (gt === "sparkling") return "sparkling";
  return "both";
}

function mapAudience(gt, difficulty) {
  // Most ghost Qs target the "curious" home-winemaker audience;
  // 'advanced' difficulty maps to commercial since that's the small-vs-big
  // discussion that tends to surface there.
  if (difficulty === "advanced") return "commercial";
  return "curious";
}

// Pre-load WBS → citations (SOPs + Wine Bible chapters), mirroring the engine
async function loadWbsCitations() {
  const [sops] = await c.execute(
    "SELECT id, title, wbs_code FROM sop_library WHERE published = 1 AND wbs_code IS NOT NULL"
  );
  const sopsByWbs = new Map();
  for (const r of sops) {
    if (!sopsByWbs.has(r.wbs_code)) sopsByWbs.set(r.wbs_code, []);
    sopsByWbs.get(r.wbs_code).push({ label: `SOP ${r.id}: ${r.title}`, source_doc: "sop_library" });
  }
  const [chunks] = await c.execute(
    `SELECT DISTINCT source_doc, chapter_ref, chapter_title, wbs_code
     FROM diy_knowledge_chunks
     WHERE chapter_ref IS NOT NULL AND wbs_code IS NOT NULL`
  );
  const chunksByWbs = new Map();
  for (const r of chunks) {
    if (!chunksByWbs.has(r.wbs_code)) chunksByWbs.set(r.wbs_code, []);
    chunksByWbs.get(r.wbs_code).push({
      label: `${r.source_doc.replace(/_/g, " ")} ${r.chapter_ref} — ${r.chapter_title || ""}`.trim(),
      source_doc: r.source_doc,
      chapter: r.chapter_ref,
    });
  }
  return { sopsByWbs, chunksByWbs };
}

function resolveCitations(wbsCode, wineType, cache) {
  const treatAsWhite = wineType === "white";
  // White Wine Bible uses D-prefixed WBS codes — probe both for whites
  const codes = treatAsWhite ? [wbsCode, `D${wbsCode}`] : [wbsCode];
  const out = [];
  const seen = new Set();
  for (const code of codes) {
    for (const sop of cache.sopsByWbs.get(code) ?? []) {
      const k = `sop:${sop.label}`;
      if (seen.has(k)) continue;
      seen.add(k);
      out.push(sop);
      if (out.filter((c) => c.source_doc === "sop_library").length >= 2) break;
    }
  }
  const preferred = treatAsWhite
    ? new Set(["white_wine_bible", "morew_white_outline"])
    : new Set(["red_wine_bible", "morew_red_outline"]);
  for (const code of codes) {
    for (const ch of cache.chunksByWbs.get(code) ?? []) {
      if (!preferred.has(ch.source_doc)) continue;
      const k = `bible:${ch.source_doc}:${ch.chapter}`;
      if (seen.has(k)) continue;
      seen.add(k);
      out.push(ch);
      if (out.filter((c) => c.source_doc !== "sop_library").length >= 2) break;
    }
  }
  return out.slice(0, 4);
}

// ── Main ────────────────────────────────────────────────────────────────────
console.log("Loading WBS citation cache…");
const wbsCache = await loadWbsCitations();
console.log(`  ${wbsCache.sopsByWbs.size} WBS codes have SOPs, ${wbsCache.chunksByWbs.size} have bible chapters`);

// Wipe prior ghost.seed entries (idempotent re-run)
const [delRes] = await c.execute(
  "DELETE FROM cellar_journal WHERE source = 'ghost.seed'"
);
console.log(`Removed ${delRes.affectedRows} prior ghost.seed journal entries`);

const [ghosts] = await c.execute(
  "SELECT id, wbs_code, wine_type, question, answer, category, difficulty FROM ghost_questions WHERE active = 1 AND answer IS NOT NULL ORDER BY id"
);
console.log(`Found ${ghosts.length} active ghost questions to publish\n`);

const now = Date.now();
let inserted = 0, skipped = 0, slugCollisions = 0;
const slugSeen = new Set();

for (const g of ghosts) {
  const topic = CATEGORY_TO_TOPIC[g.category] || "Winemaking";
  let slug = slugify(g.question, topic);
  // Local collision check (within this batch)
  if (slugSeen.has(slug)) {
    slug = `${slug}-${g.id}`;
    slugCollisions++;
  }
  slugSeen.add(slug);
  const { teaser, diagnosis } = buildTeaserAndDiagnosis(g.answer);
  const wineType = mapWineType(g.wine_type);
  const audience = mapAudience(g.wine_type, g.difficulty);
  const citations = JSON.stringify(resolveCitations(g.wbs_code, g.wine_type, wbsCache));

  try {
    await c.execute(
      `INSERT INTO cellar_journal
         (slug, question, topic_tag, full_answer, teaser_answer, diagnosis,
          source, audience, citations, wine_type, view_count, asked_count,
          featured, published, first_asked_at, last_asked_at, created_at, updated_at)
       VALUES (?, ?, ?, ?, ?, ?, 'ghost.seed', ?, ?, ?, 0, 1, 0, 1, ?, ?, ?, ?)`,
      [
        slug, g.question, topic, g.answer, teaser, diagnosis,
        audience, citations, wineType,
        now, now, now, now,
      ]
    );
    await c.execute(
      "UPDATE ghost_questions SET journal_slug = ? WHERE id = ?",
      [slug, g.id]
    );
    inserted++;
  } catch (e) {
    console.log(`  ✗ ghost ${g.id}: ${e.message.slice(0, 100)}`);
    skipped++;
  }
}

console.log(`\n──────────────────────────────────────────`);
console.log(`Published: ${inserted}   Skipped: ${skipped}   Slug collisions: ${slugCollisions}`);
const [total] = await c.execute("SELECT COUNT(*) n FROM cellar_journal WHERE published = 1");
console.log(`Total published journal entries now: ${total[0].n}`);
const [bySource] = await c.execute("SELECT source, COUNT(*) n FROM cellar_journal WHERE published = 1 GROUP BY source");
console.log(`By source:`, bySource);

await c.end();
