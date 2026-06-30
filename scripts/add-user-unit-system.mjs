/**
 * Add unit_system column to users table.
 *
 * Default = 'metric' since Ownology's user base is Australia + New Zealand
 * (both metric-native). 'imperial' available for the rare US-trained reader
 * or AU/NZ users who learned home winemaking from US YouTube content.
 *
 * The setting is consumed by:
 *  1. AI grounding prompts (server/routers/tutor.ts) — instructs the LLM
 *     to convert imperial-source content (e.g. morew_red_outline chunks)
 *     into the user's preferred units before answering.
 *  2. SOP detail page — boutique companions render with primary in the
 *     user's preferred units (Phase 2; currently both metric-first by default).
 *
 * Usage: node scripts/add-user-unit-system.mjs
 */
import "dotenv/config";
import mysql from "mysql2/promise";

const c = await mysql.createConnection(process.env.DATABASE_URL);

try {
  await c.execute(`
    ALTER TABLE users
    ADD COLUMN unit_system VARCHAR(16) NOT NULL DEFAULT 'metric'
  `);
  console.log("✓ Added unit_system column (default 'metric')");
} catch (e) {
  if (e.code === "ER_DUP_FIELDNAME") {
    console.log("· unit_system already exists, skipping");
  } else { throw e; }
}

// Backfill any pre-existing nulls (defensive — shouldn't happen with NOT NULL DEFAULT)
const [r] = await c.execute(
  "UPDATE users SET unit_system = 'metric' WHERE unit_system IS NULL OR unit_system = ''"
);
console.log(`Backfilled ${r.affectedRows} existing users to metric default`);

const [counts] = await c.query("SELECT unit_system, COUNT(*) as n FROM users GROUP BY unit_system");
console.log("\nDistribution:");
counts.forEach(x => console.log(`  ${x.unit_system}: ${x.n}`));

await c.end();
