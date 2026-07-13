import "dotenv/config";
import mysql from "mysql2/promise";
// Adds hot_alert_sent_at bigint to outreach_contacts for the 3+ view
// hot-alert Resend email (Feb 2026, Rich). Idempotent — safe to re-run.
const c = await mysql.createConnection(process.env.DATABASE_URL);
try {
  await c.execute("ALTER TABLE outreach_contacts ADD COLUMN hot_alert_sent_at BIGINT NULL");
  console.log("added hot_alert_sent_at");
} catch (e) {
  if (String(e.message).includes("Duplicate")) console.log("hot_alert_sent_at already exists");
  else throw e;
}
const [rows] = await c.query("SHOW COLUMNS FROM outreach_contacts LIKE 'hot_alert_sent_at'");
console.log("column state:", rows);
await c.end();
