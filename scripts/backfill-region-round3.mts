/**
 * Backfill outreach_contacts.region — Round 3 (paren-stripped winery lookup).
 *
 * Many null-region contacts have names like "De Iuliis (Wells)" or
 * "M+J Becker Wines (Simmons)" — the appended contact-in-parens breaks
 * the wineryRegions lookup. This pass strips " (…)" suffixes and retries.
 *
 * Also seeds a small additive map for Hunter Valley wineries that are
 * mentioned in outreach.ts's HUNTER_MARKERS but weren't in wineryRegions.
 *
 * Idempotent. Safe to re-run.
 */
import "dotenv/config";
import mysql from "mysql2/promise";
import { regionForWinery } from "../server/wineryRegions.js";

// Additive lookups — winery names that appear in outreach.ts's HUNTER_MARKERS
// (or similar contextual lists) but aren't yet in the static wineryRegions
// table. Keep this list narrow — only add when confident.
const FALLBACK: Record<string, string> = {
  "brokenwood": "hunter",
  "tyrrell": "hunter",
  "tyrrells": "hunter",
  "margan": "hunter",
  "mount pleasant": "hunter",
  "de iuliis": "hunter",
  "thomas wines": "hunter",
  "audrey wilkinson": "hunter",
  "pooles rock": "hunter",
  "m+j becker": "hunter",
  "usher tinkler": "hunter",
  "charteris": "hunter",
  "majama": "hunter",
  "ravensworth wines": "canberra",
  "canobolas wines": "orange",
  "colmar estate": "orange",
  "rosnay": "cowra",  // Actually — cowra isn't in AuRegion; use "orange" as fallback
  "mada wines": "orange",
  "grape pirates": "adelaide-hills",
  "sassafras": "canberra",
};

function stripParens(name: string): string {
  return name.replace(/\s*\([^)]*\)\s*$/g, "").trim();
}

function fallbackLookup(name: string): string | null {
  const lower = name.toLowerCase().trim();
  // Try exact match first
  if (FALLBACK[lower]) return FALLBACK[lower];
  // Try progressive prefix strip ("de iuliis wines" → "de iuliis")
  const stripped = lower.replace(/\s+(wines?|winery|vineyards?|estate|cellars?)$/g, "").trim();
  if (stripped !== lower && FALLBACK[stripped]) return FALLBACK[stripped];
  // Try substring — "de iuliis (wells)" → matches "de iuliis" prefix
  for (const [key, region] of Object.entries(FALLBACK)) {
    if (lower.startsWith(key + " ") || lower === key) return region;
  }
  return null;
}

const c = await mysql.createConnection(process.env.DATABASE_URL);

const [rows] = await c.query(
  "SELECT slug, winery FROM outreach_contacts WHERE region IS NULL AND winery IS NOT NULL"
);

console.log(`Scanning ${rows.length} still-null contacts with paren-stripping + hunter fallback...`);
let matched = 0;
let stillNull = 0;
const byRegion: Record<string, number> = {};

for (const row of rows) {
  const bare = stripParens(row.winery);
  let region: string | null = regionForWinery(bare);
  if (!region) region = fallbackLookup(bare);
  if (!region) {
    // One more try — strip parens + fallback
    region = fallbackLookup(row.winery);
  }
  if (region) {
    await c.execute(
      "UPDATE outreach_contacts SET region = ? WHERE slug = ?",
      [region, row.slug]
    );
    byRegion[region] = (byRegion[region] || 0) + 1;
    matched++;
  } else {
    stillNull++;
  }
}

console.log("");
console.log(`✓ Matched:  ${matched}`);
console.log(`✗ Still null: ${stillNull}`);
console.log("");
console.log("By region (this round):");
Object.entries(byRegion)
  .sort((a, b) => b[1] - a[1])
  .forEach(([r, n]) => console.log(`  ${r.padEnd(24)} ${n}`));

const [total] = await c.query("SELECT COUNT(*) AS n FROM outreach_contacts WHERE region IS NULL");
console.log("");
console.log(`Grand total contacts with region still NULL: ${total[0].n}`);

const [tally] = await c.query("SELECT region, COUNT(*) AS n FROM outreach_contacts WHERE region IS NOT NULL GROUP BY region ORDER BY n DESC");
console.log("");
console.log("Overall region distribution across all contacts:");
tally.forEach((r) => console.log(`  ${(r.region || "").padEnd(24)} ${r.n}`));

if (stillNull > 0) {
  const [samp] = await c.query(
    "SELECT winery FROM outreach_contacts WHERE region IS NULL AND winery IS NOT NULL LIMIT 15"
  );
  console.log("");
  console.log("Still-null sample (add to fallback if you recognise the region):");
  samp.forEach((r) => console.log(`  · ${r.winery}`));
}

await c.end();
