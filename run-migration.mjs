import { createConnection } from "mysql2/promise";
import { readFileSync } from "fs";
import { config } from "dotenv";

config();

const sql = readFileSync("./drizzle/migrations/0000_glorious_switch.sql", "utf-8");

const conn = await createConnection(process.env.DATABASE_URL);

// Split on --> statement-breakpoint and run each statement
const statements = sql.split("--> statement-breakpoint").map(s => s.trim()).filter(Boolean);

for (const stmt of statements) {
  try {
    await conn.execute(stmt);
    console.log("✓", stmt.slice(0, 60).replace(/\n/g, " "));
  } catch (err) {
    if (err.code === "ER_TABLE_EXISTS_ERROR" || err.message?.includes("already exists")) {
      console.log("⚠ already exists, skipping:", stmt.slice(0, 60).replace(/\n/g, " "));
    } else {
      console.error("✗ ERROR:", err.message);
      console.error("  Statement:", stmt.slice(0, 120));
    }
  }
}

await conn.end();
console.log("Migration complete.");
