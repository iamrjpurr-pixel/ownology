/**
 * Add reply_sentiment VARCHAR(20) to outreach_contacts.
 * Enables Claude's classification of pasted replies into one of:
 *   interested | objection | not-now | cold
 * Rich, Feb 2026 — pairs with saveReply auto-classify + card colour-coding.
 */
import "dotenv/config";
import mysql from "mysql2/promise";
const c = await mysql.createConnection(process.env.DATABASE_URL);
try {
  await c.execute("ALTER TABLE outreach_contacts ADD COLUMN reply_sentiment VARCHAR(20) NULL");
  console.log("added reply_sentiment");
} catch (e) {
  if (String(e.message).includes("Duplicate")) console.log("reply_sentiment already exists");
  else throw e;
}
const [cols] = await c.query("SHOW COLUMNS FROM outreach_contacts LIKE 'reply_sentiment'");
console.log(cols);
await c.end();
