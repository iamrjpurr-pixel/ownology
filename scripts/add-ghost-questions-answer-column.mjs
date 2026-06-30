/**
 * Adds an `answer` TEXT column to ghost_questions so each Q has a short
 * teaching answer surfaced under the Cellar Brief card.
 *
 * Idempotent: checks INFORMATION_SCHEMA before altering.
 *
 * Run: node scripts/add-ghost-questions-answer-column.mjs
 */
import "dotenv/config";
import mysql from "mysql2/promise";

const c = await mysql.createConnection(process.env.DATABASE_URL);

const [rows] = await c.execute(
  `SELECT COLUMN_NAME FROM INFORMATION_SCHEMA.COLUMNS
   WHERE TABLE_SCHEMA = DATABASE()
     AND TABLE_NAME = 'ghost_questions'
     AND COLUMN_NAME = 'answer'`
);
if (rows.length === 0) {
  await c.execute(`ALTER TABLE ghost_questions ADD COLUMN answer TEXT NULL AFTER question`);
  console.log("✓ Added ghost_questions.answer column");
} else {
  console.log("· ghost_questions.answer already exists");
}

await c.end();
