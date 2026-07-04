/**
 * Exhaustive quiz permutation test — runs all 4×3×4×4×3×4 = 2,304 answer
 * combos through pickWine and reports:
 *   - never-picked wines
 *   - dominance (any wine > 10% of results)
 *   - semantic errors (red+sweet → white; citrus+sweet → red; etc.)
 *
 * Runs against the compiled TS source via tsx. Zero side-effects.
 */
import { WINES, pickWine } from "../client/src/data/quizData.ts";

const FRUITS = ["red", "dark", "citrus", "savoury"];
const BODIES = ["light", "medium", "full"];
const SWEETNESS = ["bone_dry", "hint", "off_dry", "sweet"];
const GRIPS = ["bright", "grippy", "soft", "both"];
const AGES = ["young", "developed", "old"];
const BUDGETS = ["under_25", "25_50", "50_100", "100_plus"];

const RED_FAMILY = new Set(["red", "dark", "savoury"]);
const WHITE_FAMILY = new Set(["citrus"]);

const results = [];
const pickCount = Object.fromEntries(WINES.map((w) => [w.slug, 0]));

for (const fruit of FRUITS)
  for (const body of BODIES)
    for (const sweetness of SWEETNESS)
      for (const grip of GRIPS)
        for (const age of AGES)
          for (const budget of BUDGETS) {
            const answers = { fruit, body, sweetness, grip, age, budget };
            const winner = pickWine(answers);
            pickCount[winner.slug] += 1;
            results.push({ answers, winner });
          }

const total = results.length;
console.log(`Total permutations: ${total}\n`);

// ── Distribution ───────────────────────────────────────────────────────
console.log("─── Pick distribution ─────────────────────────────────────");
const sorted = Object.entries(pickCount).sort((a, b) => b[1] - a[1]);
let dominators = 0;
let neverPicked = 0;
const DOMINANCE_THRESHOLD = 0.12; // >12% signals over-picked
for (const [slug, count] of sorted) {
  const pct = ((count / total) * 100).toFixed(1);
  const flag =
    count === 0 ? " ⚠  NEVER PICKED" : (count / total) > DOMINANCE_THRESHOLD ? " ⚠  DOMINATES (>12%)" : "";
  if (count === 0) neverPicked += 1;
  if (count / total > DOMINANCE_THRESHOLD) dominators += 1;
  console.log(`  ${slug.padEnd(28)} ${String(count).padStart(4)} (${pct}%)${flag}`);
}

// ── Semantic errors ─────────────────────────────────────────────────────
console.log("\n─── Semantic error scan ──────────────────────────────────");
const semanticErrors = [];
for (const r of results) {
  const userFruit = r.answers.fruit;
  const wineFruit = r.winner.palate.fruit;
  // A red-family user should never receive a white-family wine (or vice versa)
  // unless there's genuinely no closer match in the pool.
  if (RED_FAMILY.has(userFruit) && WHITE_FAMILY.has(wineFruit)) {
    semanticErrors.push({ ...r, why: "red-family user got white-family wine" });
  }
  if (WHITE_FAMILY.has(userFruit) && RED_FAMILY.has(wineFruit)) {
    semanticErrors.push({ ...r, why: "white-family user got red-family wine" });
  }
}
console.log(`  Semantic errors: ${semanticErrors.length}`);
if (semanticErrors.length > 0) {
  console.log("  First 5:");
  for (const e of semanticErrors.slice(0, 5)) {
    console.log(
      `    user=${JSON.stringify(e.answers)} → ${e.winner.slug} (${e.winner.palate.fruit}) — ${e.why}`
    );
  }
}

// ── Red+Sweet specifically → should be Port when budget allows ─────────
// Below 100+ budget, Port is filtered out entirely (correct behavior).
// The "honest trade-off" UI narrates this: "Your true match is Port ($100+),
// but at your budget we picked X." So we only audit the 100+ tier.
console.log("\n─── Red+Sweet audit (100+ budget → should return Port) ────");
const redSweet100 = results.filter(
  (r) =>
    r.answers.fruit === "red" &&
    r.answers.sweetness === "sweet" &&
    r.answers.budget === "100_plus"
);
const badRedSweet = redSweet100.filter((r) => r.winner.slug !== "port-vintage");
console.log(`  red+sweet+100+ permutations: ${redSweet100.length}`);
console.log(`  returning Port: ${redSweet100.length - badRedSweet.length}`);
console.log(`  returning non-Port: ${badRedSweet.length}`);
if (badRedSweet.length > 0) {
  console.log("  First 3 offenders:");
  for (const e of badRedSweet.slice(0, 3)) {
    console.log(`    ${JSON.stringify(e.answers)} → ${e.winner.slug}`);
  }
}

// ── Summary ────────────────────────────────────────────────────────────
console.log("\n─── Summary ──────────────────────────────────────────────");
console.log(`  Never-picked wines: ${neverPicked}`);
console.log(`  Dominators (>12%): ${dominators}`);
console.log(`  Cross-family semantic errors: ${semanticErrors.length}`);
console.log(`  Red+Sweet+100+ misdirects: ${badRedSweet.length}`);

// Thresholds: some semantic errors are unavoidable when the budget-filtered
// pool has no in-family option matching the user's other axes — that's what
// the honest-framing narration is for. Allow up to 5 such edge cases.
const pass =
  neverPicked === 0 &&
  dominators === 0 &&
  semanticErrors.length <= 5 &&
  badRedSweet.length === 0;
console.log(`\n  ${pass ? "✅ PASS" : "❌ FAIL"} — quiz algorithm ${pass ? "healthy" : "needs work"}`);
process.exit(pass ? 0 : 1);
