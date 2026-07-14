/**
 * Add reply_followup_draft VARCHAR(500) to outreach_contacts.
 * Holds the AI-generated follow-up SMS drafted from the pasted reply,
 * separate from smsDraftOverride (which is the first-touch draft).
 * Rich, Feb 2026 — bulkReplyFollowupAI target column.
 */
import "dotenv/config";
import mysql from "mysql2/promise";
const c = await mysql.createConnection(process.env.DATABASE_URL);
try {
  await c.execute("ALTER TABLE outreach_contacts ADD COLUMN reply_followup_draft VARCHAR(500) NULL");
  console.log("added reply_followup_draft");
} catch (e) {
  if (String(e.message).includes("Duplicate")) console.log("already exists");
  else throw e;
}
const [cols] = await c.query("SHOW COLUMNS FROM outreach_contacts LIKE 'reply_followup_draft'");
console.log(cols);
await c.end();
