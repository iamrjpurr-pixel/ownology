import "dotenv/config";
import mysql from "mysql2/promise";

const c = await mysql.createConnection(process.env.DATABASE_URL);
try {
  // VARCHAR(500) matches the existing `notes` column. SMS is typically
  // ≤300 chars so 500 leaves headroom without committing to TEXT.
  await c.execute(
    "ALTER TABLE outreach_contacts ADD COLUMN sms_draft_override VARCHAR(500) NULL AFTER notes"
  );
  console.log("✓ added sms_draft_override column");
} catch (e) {
  if (String(e.message).includes("Duplicate")) console.log("· already exists");
  else throw e;
}
const [r] = await c.execute(
  "SELECT COUNT(*) as n, SUM(CASE WHEN sms_draft_override IS NOT NULL THEN 1 ELSE 0 END) as overridden FROM outreach_contacts"
);
console.log("rows:", r);
await c.end();
