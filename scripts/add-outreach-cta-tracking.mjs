/**
 * Add cta_clicked_at column to outreach_contacts for A/B-test conversion tracking.
 *
 * The variant each prospect sees (book-demo vs reply-red) is computed
 * deterministically from their slug on the server (stable, no storage
 * needed). We only need to track WHEN they tapped the CTA so we can
 * compute conversion-by-variant on the funnel page.
 */
import "dotenv/config";
import mysql from "mysql2/promise";

const c = await mysql.createConnection(process.env.DATABASE_URL);
try {
  // Column for the click timestamp (nullable — unset until they tap)
  await c.execute(`
    ALTER TABLE outreach_contacts
    ADD COLUMN cta_clicked_at BIGINT NULL
  `);
  console.log("✓ Added cta_clicked_at column");
} catch (e) {
  if (e.code === "ER_DUP_FIELDNAME") {
    console.log("· cta_clicked_at already exists, skipping");
  } else {
    console.error("Error:", e.message);
    process.exit(1);
  }
}

const [count] = await c.execute("SELECT COUNT(*) AS n FROM outreach_contacts WHERE cta_clicked_at IS NOT NULL");
console.log(`rows with cta_clicked_at set: ${count[0].n}`);
await c.end();
