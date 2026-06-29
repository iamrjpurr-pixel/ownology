/**
 * Baseline __drizzle_migrations.
 *
 * Inserts a row per migration file under /app/drizzle/migrations matching
 * Drizzle's own migrator format:
 *   - hash        = SHA-256 of the raw .sql file content
 *   - created_at  = the `when` (epoch ms) value from _journal.json
 *
 * Idempotent — skips entries whose hash is already in the table.
 *
 * Why: the live Railway DB has all 34 tables (created by the original `drizzle-kit push`
 * from Manus + subsequent raw-SQL scripts), but `__drizzle_migrations` is empty.
 * Without this baseline, a future `drizzle-kit migrate` would attempt to re-CREATE
 * every table and fail on `ER_TABLE_EXISTS_ERROR`.
 *
 * Run via:   node scripts/baseline-drizzle-migrations.mjs
 */
import "dotenv/config";
import crypto from "node:crypto";
import fs from "node:fs";
import path from "node:path";
import mysql from "mysql2/promise";

const MIGRATIONS_DIR = "/app/drizzle/migrations";
const JOURNAL = JSON.parse(
  fs.readFileSync(path.join(MIGRATIONS_DIR, "meta/_journal.json"), "utf8")
);

const conn = await mysql.createConnection(process.env.DATABASE_URL);

// Ensure the table exists with Drizzle's expected schema (it does; recreate-if-missing is safe).
await conn.execute(`
  CREATE TABLE IF NOT EXISTS \`__drizzle_migrations\` (
    \`id\` serial primary key,
    \`hash\` text not null,
    \`created_at\` bigint
  )
`);

// Read existing hashes (if any)
const [existingRows] = await conn.query("SELECT hash FROM __drizzle_migrations");
const existingHashes = new Set(existingRows.map((r) => r.hash));
console.log(`Existing migration records: ${existingHashes.size}`);

let inserted = 0;
let skipped = 0;
for (const entry of JOURNAL.entries) {
  const sqlPath = path.join(MIGRATIONS_DIR, `${entry.tag}.sql`);
  if (!fs.existsSync(sqlPath)) {
    console.warn(`!! Missing SQL file for ${entry.tag} — skipping`);
    continue;
  }
  const sqlContent = fs.readFileSync(sqlPath, "utf8");
  const hash = crypto.createHash("sha256").update(sqlContent).digest("hex");

  if (existingHashes.has(hash)) {
    skipped++;
    continue;
  }
  await conn.execute(
    "INSERT INTO `__drizzle_migrations` (`hash`, `created_at`) VALUES (?, ?)",
    [hash, entry.when]
  );
  inserted++;
  console.log(`  + idx=${entry.idx} tag=${entry.tag} when=${entry.when}`);
}

console.log(`\nDone. Inserted ${inserted}, skipped ${skipped} (already present).`);

// Verify
const [final] = await conn.query(
  "SELECT COUNT(*) AS n, MIN(created_at) AS oldest, MAX(created_at) AS newest FROM __drizzle_migrations"
);
console.log(
  `__drizzle_migrations now has ${final[0].n} rows (oldest=${final[0].oldest}, newest=${final[0].newest})`
);

await conn.end();
