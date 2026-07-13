/**
 * Backfill outreach_contacts.region — Round 2 (winery-name lookup).
 *
 * Uses the static wineryRegions table (server/wineryRegions.ts) which
 * already covers 250+ AU wineries mapped to their canonical region. Only
 * touches rows where region IS NULL and winery is present.
 *
 * Idempotent. Safe to re-run after Round 1 (painPoint regex).
 * (Rich, Feb 2026)
 */
import "dotenv/config";
import mysql from "mysql2/promise";
import { regionForWinery } from "../server/wineryRegions.js";

const c = await mysql.createConnection(process.env.DATABASE_URL);

const [rows] = await c.query(
  "SELECT slug, winery FROM outreach_contacts WHERE region IS NULL AND winery IS NOT NULL"
);

console.log(`Scanning ${rows.length} null-region contacts by winery name...`);
let matched = 0;
let stillNull = 0;
const byRegion: Record<string, number> = {};

for (const row of rows) {
  const region = regionForWinery(row.winery);
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

if (stillNull > 0) {
  const [samp] = await c.query(
    "SELECT winery FROM outreach_contacts WHERE region IS NULL AND winery IS NOT NULL LIMIT 15"
  );
  console.log("");
  console.log(`Sample of ${stillNull} un-matched (not in wineryRegions table):`);
  samp.forEach((r) => console.log(`  · ${r.winery}`));
}

// Also print grand total across all contacts now
const [total] = await c.query("SELECT COUNT(*) AS n FROM outreach_contacts WHERE region IS NULL");
console.log("");
console.log(`Grand total contacts with region still NULL: ${total[0].n}`);

await c.end();
