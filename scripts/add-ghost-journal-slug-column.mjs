/**
 * Adds `journal_slug VARCHAR(200)` to ghost_questions so each row can deep-link
 * to its public /cellar-journal/<slug> page. Populated by
 * scripts/migrate-ghost-questions-to-journal.mjs.
 *
 * Run: node scripts/add-ghost-journal-slug-column.mjs
 */
import "dotenv/config";
import mysql from "mysql2/promise";

const c = await mysql.createConnection(process.env.DATABASE_URL);

const [rows] = await c.execute(
  `SELECT COLUMN_NAME FROM INFORMATION_SCHEMA.COLUMNS
   WHERE TABLE_SCHEMA = DATABASE()
     AND TABLE_NAME = 'ghost_questions'
     AND COLUMN_NAME = 'journal_slug'`
);
if (rows.length === 0) {
  await c.execute(`ALTER TABLE ghost_questions ADD COLUMN journal_slug VARCHAR(200) NULL AFTER answer`);
  await c.execute(`CREATE INDEX gq_journal_slug_idx ON ghost_questions (journal_slug)`);
  console.log("✓ Added ghost_questions.journal_slug column + index");
} else {
  console.log("· ghost_questions.journal_slug already exists");
}
await c.end();
