/**
 * add-nurture-fields.mjs — additive migration for the nurture-email loop.
 *
 * Idempotent. Safe to re-run.
 *
 *   wineries.contact_name  VARCHAR(128) NULL   — the person's first name
 *                                                (e.g. "Sarah") used in the
 *                                                "Sarah at Redstone Ridge
 *                                                invited you" headline and
 *                                                the nurture-email opener.
 *   referrals.nurtured_at  BIGINT NULL         — ms timestamp when the
 *                                                Resend nurture email was
 *                                                sent. Null means eligible.
 */
import mysql from "mysql2/promise";

const url = process.env.DATABASE_URL;
if (!url) {
  console.error("DATABASE_URL not set");
  process.exit(1);
}
const c = await mysql.createConnection(url + "?multipleStatements=true");

async function colExists(table, col) {
  const [rows] = await c.execute(
    `SELECT COUNT(*) as n FROM information_schema.columns WHERE table_schema=DATABASE() AND table_name=? AND column_name=?`,
    [table, col]
  );
  return rows[0].n > 0;
}

// wineries.contact_name ─────────────────────────────────────────────────
if (!(await colExists("wineries", "contact_name"))) {
  await c.execute(`ALTER TABLE wineries ADD COLUMN contact_name VARCHAR(128) NULL AFTER name`);
  console.log("✓ Added wineries.contact_name");
} else {
  console.log("· wineries.contact_name exists");
}

// referrals.nurtured_at ────────────────────────────────────────────────
if (!(await colExists("referrals", "nurtured_at"))) {
  await c.execute(`ALTER TABLE referrals ADD COLUMN nurtured_at BIGINT NULL AFTER converted_at`);
  console.log("✓ Added referrals.nurtured_at");
} else {
  console.log("· referrals.nurtured_at exists");
}

await c.end();
console.log("Done.");
