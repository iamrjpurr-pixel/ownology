/**
 * Backfill outreach_contacts.region for the 148 null-region contacts.
 *
 * Strategy — pure regex against painPoint + notes, no LLM needed:
 *   1. For each region in AuRegion, generate a list of match patterns:
 *      - The kebab form ("mclaren-vale")
 *      - The natural-language form ("McLaren Vale", "Mclaren Vale")
 *      - Common aliases ("Barossa Valley" → barossa, "Hunter Valley" → hunter)
 *   2. Scan painPoint + notes (case-insensitive) for the first match.
 *   3. If found → UPDATE region. If not → leave null (honest — don't guess).
 *
 * Idempotent. Safe to re-run. Only touches rows where region IS NULL.
 * (Rich, Feb 2026)
 */
import "dotenv/config";
import mysql from "mysql2/promise";

// Keyed by AuRegion (kebab-case), value is array of regex-safe substrings
// to match in painPoint / notes text. Order matters — more specific first.
const REGION_PATTERNS: Record<string, string[]> = {
  "mclaren-vale":         ["mclaren vale", "mclaren-vale"],
  "barossa":              ["barossa valley", "barossa"],
  "eden-valley":          ["eden valley", "eden-valley"],
  "adelaide-hills":       ["adelaide hills", "adelaide-hills"],
  "clare":                ["clare valley", "clare-valley", " clare "],
  "coonawarra":           ["coonawarra"],
  "riverland":            ["riverland"],
  "kangaroo-island":      ["kangaroo island"],
  "langhorne-creek":      ["langhorne creek", "langhorne-creek"],
  "yarra-valley":         ["yarra valley", "yarra-valley", "yarra "],
  "mornington-peninsula": ["mornington peninsula", "mornington-peninsula", "mornington"],
  "heathcote":            ["heathcote"],
  "grampians":            ["grampians"],
  "beechworth":           ["beechworth"],
  "king-valley":          ["king valley", "king-valley"],
  "goulburn-valley":      ["goulburn valley", "goulburn-valley", "goulburn"],
  "geelong":              ["geelong"],
  "gippsland":            ["gippsland"],
  "hunter":               ["hunter valley", "pokolbin", "hunter region", " hunter "],
  "orange":               [" orange region", "orange (nsw)", "orange nsw"],
  "mudgee":               ["mudgee"],
  "canberra":             ["canberra district", "canberra region"],
  "shoalhaven":           ["shoalhaven"],
  "riverina":             ["riverina"],
  "margaret-river":       ["margaret river", "margaret-river"],
  "great-southern":       ["great southern", "great-southern"],
  "swan-valley":          ["swan valley", "swan-valley"],
  "geographe":            ["geographe"],
  "pemberton":            ["pemberton"],
  "manjimup":             ["manjimup"],
  "tasmania":             ["tasmania", "tasmanian"],
  "granite-belt":         ["granite belt", "granite-belt"],
  "south-burnett":        ["south burnett", "south-burnett"],
};

function inferRegion(haystack: string): string | null {
  const lower = haystack.toLowerCase();
  // Iterate in the order defined above — more specific first
  for (const [region, patterns] of Object.entries(REGION_PATTERNS)) {
    for (const p of patterns) {
      if (lower.includes(p)) return region;
    }
  }
  return null;
}

const c = await mysql.createConnection(process.env.DATABASE_URL);

const [rows] = await c.query(
  "SELECT slug, first_name, winery, pain_point, notes FROM outreach_contacts WHERE region IS NULL"
);

console.log(`Scanning ${rows.length} null-region contacts...`);
let matched = 0;
let stillNull = 0;
const byRegion: Record<string, number> = {};

for (const row of rows) {
  const hay = `${row.winery || ""}  ${row.pain_point || ""}  ${row.notes || ""}`;
  const region = inferRegion(hay);
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
console.log("By region:");
Object.entries(byRegion)
  .sort((a, b) => b[1] - a[1])
  .forEach(([r, n]) => console.log(`  ${r.padEnd(24)} ${n}`));

// Show a sample of still-nulls so operator can spot check
if (stillNull > 0) {
  const [samp] = await c.query(
    "SELECT winery, pain_point FROM outreach_contacts WHERE region IS NULL LIMIT 10"
  );
  console.log("");
  console.log(`Sample of ${stillNull} un-matched (no region hint in painPoint/notes):`);
  samp.forEach((r) => console.log(`  · ${r.winery} — ${(r.pain_point || "").slice(0, 80)}`));
}

await c.end();
