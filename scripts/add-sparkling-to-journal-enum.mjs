/**
 * Extends cellar_journal.wine_type ENUM to include 'sparkling'. Idempotent —
 * only alters if 'sparkling' isn't already in the enum definition.
 *
 * Run: node scripts/add-sparkling-to-journal-enum.mjs
 */
import "dotenv/config";
import mysql from "mysql2/promise";

const c = await mysql.createConnection(process.env.DATABASE_URL);
const [rows] = await c.execute(
  `SELECT COLUMN_TYPE FROM INFORMATION_SCHEMA.COLUMNS
   WHERE TABLE_SCHEMA = DATABASE()
     AND TABLE_NAME = 'cellar_journal'
     AND COLUMN_NAME = 'wine_type'`
);
const currentType = rows[0]?.COLUMN_TYPE ?? "";
if (currentType.includes("sparkling")) {
  console.log("· wine_type ENUM already contains 'sparkling'");
} else {
  await c.execute(
    `ALTER TABLE cellar_journal MODIFY COLUMN wine_type
       ENUM('red','white','both','unknown','sparkling') DEFAULT 'unknown'`
  );
  console.log("✓ Extended cellar_journal.wine_type ENUM with 'sparkling'");
}
await c.end();
