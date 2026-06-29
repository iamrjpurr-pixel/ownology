import "dotenv/config";
import mysql from "mysql2/promise";

const c = await mysql.createConnection(process.env.DATABASE_URL);
try {
  await c.execute(
    "ALTER TABLE outreach_contacts ADD COLUMN replied_at BIGINT NULL AFTER demo_booked_at"
  );
  console.log("✓ added replied_at column");
} catch (e) {
  if (String(e.message).includes("Duplicate")) console.log("· replied_at already exists");
  else throw e;
}
const [r] = await c.execute(
  "SELECT COUNT(*) as n, SUM(CASE WHEN replied_at IS NOT NULL THEN 1 ELSE 0 END) as replied FROM outreach_contacts"
);
console.log("rows:", r);
await c.end();
