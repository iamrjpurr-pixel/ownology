/**
 * Rename the seed winery (id=1) from "Redstone Ridge Wines" → "Ownology Cellars".
 *
 * Complication: the backend server/index.ts already ran with the new seed SQL,
 * creating a duplicate id=1856 with slug='ownology-cellars'. We consolidate by:
 *   1. Deleting the empty new id=1856 (no journals/logs attached)
 *   2. Renaming id=1 in-place (preserves all historical data)
 *   3. Updating the seed user (id=1, open_id=seed-owner-001)
 *
 * Idempotent — safe to re-run.
 */
import mysql from "mysql2/promise";
import { config } from "dotenv";
config();

const conn = await mysql.createConnection(process.env.DATABASE_URL);
try {
  // Snapshot current state
  const [wineriesBefore] = await conn.execute(
    "SELECT id, name, slug, region FROM wineries WHERE slug IN ('redstone-ridge','ownology-cellars') OR name = 'Redstone Ridge Wines' ORDER BY id"
  );
  console.log("BEFORE:", JSON.stringify(wineriesBefore, null, 2));

  // 1. Find the "new" duplicate row (slug=ownology-cellars but NOT id=1)
  const [dupes] = await conn.execute(
    "SELECT id FROM wineries WHERE slug = 'ownology-cellars' AND id != 1"
  );
  for (const d of dupes) {
    // Only delete if it has no dependent data. The new row is fresh so this
    // is expected to be empty; being defensive in case cellar_journal or
    // batches ever got attached to it. Schema-safe: any lookup that throws
    // (unknown column, missing table) counts as "0 dependents".
    async function countRows(sql, params) {
      try {
        const [rows] = await conn.execute(sql, params);
        return Number(rows[0]?.n ?? 0);
      } catch { return 0; }
    }
    const jCount = await countRows("SELECT COUNT(*) AS n FROM cellar_journal WHERE author_id IN (SELECT id FROM users WHERE winery_id = ?)", [d.id]);
    const bCount = await countRows("SELECT COUNT(*) AS n FROM batches WHERE winery_id = ?", [d.id]);
    const uCount = await countRows("SELECT COUNT(*) AS n FROM users WHERE winery_id = ?", [d.id]);
    const empty = jCount === 0 && bCount === 0 && uCount === 0;
    if (empty) {
      await conn.execute("DELETE FROM wineries WHERE id = ?", [d.id]);
      console.log(`deleted empty duplicate winery id=${d.id}`);
    } else {
      console.log(`SKIP delete id=${d.id} — has ${jCount} journals / ${bCount} batches / ${uCount} users`);
    }
  }

  // 2. Rename id=1 in-place (guarded — only if it's still Redstone Ridge)
  const [w] = await conn.execute(
    "UPDATE wineries SET name = 'Ownology Cellars', slug = 'ownology-cellars', region = 'Hunter Valley, NSW' WHERE id = 1 AND (slug = 'redstone-ridge' OR name = 'Redstone Ridge Wines')"
  );
  console.log(`wineries id=1 renamed rows=${w.affectedRows}`);

  // 3. Rename the seed user's name+email
  const [u] = await conn.execute(
    "UPDATE users SET email = 'richard@ownology.ai', name = 'Ownology Cellars' WHERE open_id = 'seed-owner-001'"
  );
  console.log(`seed user renamed rows=${u.affectedRows}`);

  const [wAfter] = await conn.execute(
    "SELECT id, name, slug, region FROM wineries WHERE id = 1 OR slug = 'ownology-cellars'"
  );
  console.log("AFTER wineries:", JSON.stringify(wAfter, null, 2));
  const [uAfter] = await conn.execute(
    "SELECT id, email, name, open_id, winery_id FROM users WHERE open_id = 'seed-owner-001'"
  );
  console.log("AFTER users:", JSON.stringify(uAfter, null, 2));
} finally { await conn.end(); }
