/**
 * Migration — Trial + Referral system.
 *
 * Adds:
 *   wineries.trial_ends_at BIGINT (14 days from creation by default)
 *   wineries.trial_credits_days INT DEFAULT 0 (extended days from referrals)
 *   wineries.referral_code VARCHAR(16) UNIQUE
 *   NEW referrals table (referrer → referee tracking)
 *
 * Also prunes the ~40 low-value oenology curriculum chunks — course
 * descriptions rarely surface on relevant queries and dilute retrieval.
 *
 * Idempotent: checks INFORMATION_SCHEMA before altering.
 *
 * Run: node scripts/add-trial-referral-and-prune.mjs
 */
import "dotenv/config";
import mysql from "mysql2/promise";
import crypto from "crypto";

const c = await mysql.createConnection(process.env.DATABASE_URL);

async function colExists(table, col) {
  const [r] = await c.execute(
    `SELECT 1 FROM INFORMATION_SCHEMA.COLUMNS
     WHERE TABLE_SCHEMA = DATABASE() AND TABLE_NAME = ? AND COLUMN_NAME = ?`,
    [table, col]
  );
  return r.length > 0;
}
async function tableExists(table) {
  const [r] = await c.execute(
    `SELECT 1 FROM INFORMATION_SCHEMA.TABLES
     WHERE TABLE_SCHEMA = DATABASE() AND TABLE_NAME = ?`,
    [table]
  );
  return r.length > 0;
}

// ── 1. wineries.trial_ends_at ────────────────────────────────────────────
if (!(await colExists("wineries", "trial_ends_at"))) {
  await c.execute(`ALTER TABLE wineries ADD COLUMN trial_ends_at BIGINT NULL AFTER public_audit_enabled`);
  // Backfill: created_at + 14 days
  await c.execute(`UPDATE wineries SET trial_ends_at = created_at + (14 * 86400000) WHERE trial_ends_at IS NULL`);
  console.log("✓ Added wineries.trial_ends_at + backfilled (14-day trial from creation)");
} else {
  console.log("· wineries.trial_ends_at exists");
}

// ── 2. wineries.trial_credits_days ───────────────────────────────────────
if (!(await colExists("wineries", "trial_credits_days"))) {
  await c.execute(`ALTER TABLE wineries ADD COLUMN trial_credits_days INT NOT NULL DEFAULT 0 AFTER trial_ends_at`);
  console.log("✓ Added wineries.trial_credits_days (extended days from referrals)");
} else {
  console.log("· wineries.trial_credits_days exists");
}

// ── 3. wineries.referral_code ────────────────────────────────────────────
if (!(await colExists("wineries", "referral_code"))) {
  await c.execute(`ALTER TABLE wineries ADD COLUMN referral_code VARCHAR(16) NULL AFTER trial_credits_days`);
  // Backfill unique codes for existing wineries
  const [rows] = await c.execute("SELECT id, slug FROM wineries WHERE referral_code IS NULL");
  for (const r of rows) {
    let code;
    for (let attempt = 0; attempt < 5; attempt++) {
      const suffix = crypto.randomBytes(3).toString("hex").toUpperCase();
      code = `${(r.slug || "OWN").toUpperCase().replace(/[^A-Z0-9]/g, "").slice(0, 6)}-${suffix}`;
      const [dup] = await c.execute("SELECT 1 FROM wineries WHERE referral_code = ?", [code]);
      if (dup.length === 0) break;
    }
    await c.execute("UPDATE wineries SET referral_code = ? WHERE id = ?", [code, r.id]);
  }
  await c.execute(`CREATE UNIQUE INDEX wineries_referral_code_uniq ON wineries (referral_code)`);
  console.log(`✓ Added wineries.referral_code + backfilled ${rows.length} unique codes`);
} else {
  console.log("· wineries.referral_code exists");
}

// ── 4. NEW referrals table ───────────────────────────────────────────────
if (!(await tableExists("referrals"))) {
  await c.execute(`
    CREATE TABLE referrals (
      id INT PRIMARY KEY AUTO_INCREMENT,
      referrer_winery_id INT NOT NULL,
      referral_code VARCHAR(16) NOT NULL,
      referred_email VARCHAR(255) NULL,
      referred_winery_id INT NULL,
      status ENUM('pending','signed_up','converted') NOT NULL DEFAULT 'pending',
      reward_days_granted INT NOT NULL DEFAULT 0,
      created_at BIGINT NOT NULL,
      signed_up_at BIGINT NULL,
      converted_at BIGINT NULL,
      INDEX ref_referrer_idx (referrer_winery_id),
      INDEX ref_code_idx (referral_code),
      INDEX ref_referred_idx (referred_winery_id)
    )`);
  console.log("✓ Created referrals table");
} else {
  console.log("· referrals table exists");
}

// ── 5. Prune low-value oenology curricula chunks ─────────────────────────
const [before] = await c.execute("SELECT COUNT(*) n FROM diy_knowledge_chunks WHERE source_doc LIKE 'oenology_education__%'");
if (before[0].n > 0) {
  const [del] = await c.execute("DELETE FROM diy_knowledge_chunks WHERE source_doc LIKE 'oenology_education__%'");
  console.log(`✓ Pruned ${del.affectedRows} low-value oenology_education chunks (were course descriptions, low retrieval signal)`);
} else {
  console.log("· No oenology_education chunks to prune");
}

// ── Summary ──────────────────────────────────────────────────────────────
const [wineries] = await c.execute(
  "SELECT id, name, slug, plan, referral_code, trial_ends_at, trial_credits_days FROM wineries"
);
console.log("\nWineries state after migration:");
for (const w of wineries) {
  const daysLeft = w.trial_ends_at ? Math.ceil((w.trial_ends_at - Date.now()) / 86400000) : "n/a";
  console.log(`  #${w.id} ${w.name} [${w.plan}] code=${w.referral_code} trial=${daysLeft}d credits=${w.trial_credits_days}`);
}
const [total] = await c.execute("SELECT COUNT(*) n FROM diy_knowledge_chunks WHERE published = 1");
console.log(`\nCorpus now: ${total[0].n} published chunks (was 283, pruned ~40 oenology).`);
await c.end();
