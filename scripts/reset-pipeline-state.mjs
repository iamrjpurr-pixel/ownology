/**
 * Reset all outreach pipeline state — SMS sent / opened / clicked / replied
 * / booked / hot-alert stamps. Keeps contact rows + research + AI drafts.
 *
 * Rich (Feb 2026): no real SMSes have been sent yet. The "SMS Sent: 2"
 * and "Opened Link: 14" counters are dev-test noise. Cleaning them out
 * so the funnel telemetry starts honest on day-one of real BD.
 */
import "dotenv/config";
import mysql from "mysql2/promise";

const c = await mysql.createConnection(process.env.DATABASE_URL);

const [before] = await c.query(`
  SELECT
    COUNT(*) AS total,
    SUM(CASE WHEN sms_sent_at IS NOT NULL THEN 1 ELSE 0 END) AS sent,
    SUM(CASE WHEN first_viewed_at IS NOT NULL THEN 1 ELSE 0 END) AS viewed,
    SUM(CASE WHEN cta_clicked_at IS NOT NULL THEN 1 ELSE 0 END) AS clicked,
    SUM(CASE WHEN replied_at IS NOT NULL THEN 1 ELSE 0 END) AS replied,
    SUM(CASE WHEN demo_booked_at IS NOT NULL THEN 1 ELSE 0 END) AS booked,
    SUM(CASE WHEN hot_alert_sent_at IS NOT NULL THEN 1 ELSE 0 END) AS hot_alerted,
    SUM(view_count) AS total_views
  FROM outreach_contacts
`);
console.log("BEFORE reset:", before[0]);

const [result] = await c.execute(`
  UPDATE outreach_contacts
  SET
    sms_sent_at = NULL,
    first_viewed_at = NULL,
    view_count = 0,
    cta_clicked_at = NULL,
    replied_at = NULL,
    demo_booked_at = NULL,
    hot_alert_sent_at = NULL
`);
console.log("Rows updated:", result.affectedRows);

const [after] = await c.query(`
  SELECT
    COUNT(*) AS total,
    SUM(CASE WHEN sms_sent_at IS NOT NULL THEN 1 ELSE 0 END) AS sent,
    SUM(CASE WHEN first_viewed_at IS NOT NULL THEN 1 ELSE 0 END) AS viewed,
    SUM(CASE WHEN cta_clicked_at IS NOT NULL THEN 1 ELSE 0 END) AS clicked,
    SUM(CASE WHEN replied_at IS NOT NULL THEN 1 ELSE 0 END) AS replied,
    SUM(CASE WHEN demo_booked_at IS NOT NULL THEN 1 ELSE 0 END) AS booked,
    SUM(CASE WHEN hot_alert_sent_at IS NOT NULL THEN 1 ELSE 0 END) AS hot_alerted,
    SUM(view_count) AS total_views
  FROM outreach_contacts
`);
console.log("AFTER reset:", after[0]);

// Sanity: research + AI drafts preserved
const [research] = await c.query(`
  SELECT
    COUNT(*) AS total,
    SUM(CASE WHEN region IS NOT NULL THEN 1 ELSE 0 END) AS has_region,
    SUM(CASE WHEN pain_point IS NOT NULL THEN 1 ELSE 0 END) AS has_painpoint,
    SUM(CASE WHEN hook_text IS NOT NULL THEN 1 ELSE 0 END) AS has_hook,
    SUM(CASE WHEN sms_draft_override IS NOT NULL THEN 1 ELSE 0 END) AS has_ai_draft
  FROM outreach_contacts
`);
console.log("Research preserved:", research[0]);

await c.end();
