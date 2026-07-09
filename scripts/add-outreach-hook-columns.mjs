import "dotenv/config";
import mysql from "mysql2/promise";

// Adds the "hook waterfall" columns to outreach_contacts.
//
// Perplexity deepResearch now returns a tiered, cited opening line
// (recent_signal → quoted_voice → peer_signal → vintage_pain). We
// persist the tier + text + source URL so we can:
//   1. Feed hookText into the SMS draft template (replaces the
//      generic painPoint-based intro).
//   2. Show the source URL on /hi/:slug so prospects can verify.
//   3. A/B which tier converts best (view→reply rates per tier).
//
// Safe to re-run — swallows "Duplicate column" errors.
const c = await mysql.createConnection(process.env.DATABASE_URL);

const columns = [
  {
    name: "hook_tier",
    ddl:
      "ALTER TABLE outreach_contacts ADD COLUMN hook_tier VARCHAR(32) NULL AFTER pain_point",
  },
  {
    name: "hook_text",
    ddl:
      "ALTER TABLE outreach_contacts ADD COLUMN hook_text VARCHAR(400) NULL AFTER hook_tier",
  },
  {
    name: "hook_source_url",
    ddl:
      "ALTER TABLE outreach_contacts ADD COLUMN hook_source_url VARCHAR(500) NULL AFTER hook_text",
  },
];

for (const col of columns) {
  try {
    await c.execute(col.ddl);
    console.log(`✓ added ${col.name}`);
  } catch (e) {
    if (String(e.message).includes("Duplicate")) console.log(`· ${col.name} already exists`);
    else throw e;
  }
}

const [r] = await c.execute(
  "SELECT COUNT(*) as n, SUM(CASE WHEN hook_text IS NOT NULL THEN 1 ELSE 0 END) as with_hook FROM outreach_contacts"
);
console.log("rows:", r);
await c.end();
