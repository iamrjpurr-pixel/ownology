/**
 * scripts/rebuild-cellar-journal-teasers.mjs
 *
 * Reruns buildTeaser() against every cellar_journal entry using the NEW
 * cut-priority logic (Feb 2026 IP-audit fix). Writes updated teaser_answer
 * + diagnosis columns. full_answer is untouched — Google still sees the
 * complete content via JSON-LD hasPart.
 *
 * Modes:
 *   node scripts/rebuild-cellar-journal-teasers.mjs           # dry-run (default)
 *   node scripts/rebuild-cellar-journal-teasers.mjs --commit  # writes
 *   node scripts/rebuild-cellar-journal-teasers.mjs --sample=5  # show N examples
 */
import "dotenv/config";
import mysql from "mysql2/promise";

const commit = process.argv.includes("--commit");
const sampleArg = process.argv.find((a) => a.startsWith("--sample="));
const sampleN = sampleArg ? parseInt(sampleArg.split("=")[1], 10) : 3;

// Inlined copy of buildTeaser (keeps script standalone — no bundler needed).
function buildTeaser(full) {
  const paragraphs = full.split(/\n\s*\n/).filter((p) => p.trim());
  if (paragraphs.length === 0) return { teaser: full, diagnosis: "" };
  const firstPara = paragraphs[0].trim();
  const firstSentence = firstPara.split(/(?<=[.!?])\s+/)[0] || firstPara;
  const diagnosis = firstSentence.slice(0, 500);

  // Priority 1: before first numbered/bulleted procedure step
  const procedureStep = full.search(/(?:^|[\s:])\s*(?:1[.):]|- |• |\* )/m);
  if (procedureStep > 40) {
    const cut = full.slice(0, procedureStep).trim();
    if (cut.length >= 60) return { teaser: cut, diagnosis };
  }

  // Priority 2: before first sentence containing a hard number+unit
  const sentences = full.split(/(?<=[.!?])\s+/);
  const unitRe = /\b(?:SG\s*\d|pH\s*\d|TA\s*\d|\d+\s*(?:g\/L|g\/l|mg\/L|mg\/l|°C|C\b|ppm|hours?|hrs?|days?|min\b|minutes?|L\b|litres?|ml\b|mL)|\d+\.\d+)/i;
  let accBefore = "";
  for (const s of sentences) {
    if (unitRe.test(s)) {
      if (accBefore.trim().length >= 60) return { teaser: accBefore.trim(), diagnosis };
      break;
    }
    accBefore += (accBefore ? " " : "") + s;
  }

  // Priority 3: paragraph-boundary at ~40% (multi-para)
  if (paragraphs.length > 1) {
    const targetLen = Math.floor(full.length * 0.4);
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

  // Priority 4: sentence-boundary at ~40% (single-para)
  const target = Math.max(120, Math.floor(full.length * 0.4));
  let teaser = "";
  for (const s of sentences) {
    if (teaser.length + s.length > target && teaser.length >= 80) break;
    teaser += (teaser ? " " : "") + s;
  }
  return { teaser: teaser.trim() || firstSentence, diagnosis };
}

const c = await mysql.createConnection(process.env.DATABASE_URL);
const [rows] = await c.execute("SELECT id, slug, question, full_answer, teaser_answer FROM cellar_journal WHERE published=1");
console.log(`Processing ${rows.length} entries...\n`);

let changed = 0;
let unchanged = 0;
const samples = [];

for (const r of rows) {
  const { teaser, diagnosis } = buildTeaser(r.full_answer);
  const wasIdentical = r.teaser_answer === r.full_answer;
  const wouldChange = teaser !== r.teaser_answer;
  if (wouldChange) {
    changed++;
    if (samples.length < sampleN) {
      samples.push({
        slug: r.slug,
        question: r.question,
        wasIdentical,
        oldLen: r.teaser_answer.length,
        newLen: teaser.length,
        fullLen: r.full_answer.length,
        oldRatio: Math.round((r.teaser_answer.length / r.full_answer.length) * 100),
        newRatio: Math.round((teaser.length / r.full_answer.length) * 100),
        preview: teaser,
      });
    }
    if (commit) {
      await c.execute(
        "UPDATE cellar_journal SET teaser_answer = ?, diagnosis = ?, updated_at = ? WHERE id = ?",
        [teaser, diagnosis, Date.now(), r.id]
      );
    }
  } else {
    unchanged++;
  }
}

console.log(`Would change: ${changed}`);
console.log(`Unchanged:    ${unchanged}`);
console.log(`Total:        ${rows.length}\n`);

for (const s of samples) {
  console.log("─".repeat(80));
  console.log(`SLUG: ${s.slug}`);
  console.log(`Q:    ${s.question}`);
  console.log(`Ratio: ${s.oldRatio}% → ${s.newRatio}%  (full=${s.fullLen}ch, old teaser=${s.oldLen}ch, new teaser=${s.newLen}ch)`);
  console.log(`\nNEW TEASER (what visitor will see above the seal):\n${s.preview}\n`);
}

if (!commit) {
  console.log("─".repeat(80));
  console.log("DRY RUN — no rows written. Rerun with --commit to persist.");
}
await c.end();
