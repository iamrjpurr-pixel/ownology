import "dotenv/config";
import mysql from "mysql2/promise";
const c = await mysql.createConnection(process.env.DATABASE_URL);
// Reset today's curiosity quota for the bypass user
const [r] = await c.execute(
  "DELETE FROM free_run_daily_usage WHERE user_id = (SELECT id FROM users WHERE open_id = ?)",
  ["seed-owner-001"]
);
console.log(`Cleared free_run_daily_usage rows for bypass user: ${r.affectedRows}`);
await c.end();
