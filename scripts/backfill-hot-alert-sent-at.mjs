import "dotenv/config";
import mysql from "mysql2/promise";
// Backfill: any contact already at 3+ views before the hot-alert feature
// existed should NOT re-fire an alert on their next visit. Stamp
// hot_alert_sent_at with the first_viewed_at value so the shouldFireHotAlert
// check in outreach.markViewed returns false for them.
//
// Idempotent — only touches rows where hot_alert_sent_at IS NULL AND
// view_count >= 3.
const c = await mysql.createConnection(process.env.DATABASE_URL);
const [before] = await c.query(
  "SELECT COUNT(*) AS n FROM outreach_contacts WHERE view_count >= 3 AND hot_alert_sent_at IS NULL"
);
console.log("candidates for backfill:", before[0].n);
const [result] = await c.execute(
  "UPDATE outreach_contacts SET hot_alert_sent_at = first_viewed_at WHERE view_count >= 3 AND hot_alert_sent_at IS NULL AND first_viewed_at IS NOT NULL"
);
console.log("backfilled rows:", result.affectedRows);
const [after] = await c.query(
  "SELECT slug, first_name, winery, view_count, hot_alert_sent_at FROM outreach_contacts WHERE hot_alert_sent_at IS NOT NULL"
);
console.log("hot-alert stamped rows:");
for (const row of after) {
  console.log(`  ${row.slug} · ${row.first_name} · ${row.winery} · ${row.view_count} views · alerted_at=${row.hot_alert_sent_at}`);
}
await c.end();
