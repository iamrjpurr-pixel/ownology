import "dotenv/config";
import mysql from "mysql2/promise";

const c = await mysql.createConnection(process.env.DATABASE_URL);
try {
  await c.execute(`
    CREATE TABLE IF NOT EXISTS theme_picks (
      id INT AUTO_INCREMENT PRIMARY KEY,
      theme_id VARCHAR(32) NOT NULL,
      session_id VARCHAR(64) NOT NULL,
      is_first_pick TINYINT(1) NOT NULL DEFAULT 0,
      picked_at BIGINT NOT NULL,
      INDEX tp_theme_idx (theme_id),
      INDEX tp_picked_at_idx (picked_at)
    )
  `);
  console.log("✓ theme_picks table ready");
} catch (e) {
  console.log("? ", e.message);
}
const [r] = await c.execute("SELECT COUNT(*) AS n FROM theme_picks");
console.log("rows:", r);
await c.end();
