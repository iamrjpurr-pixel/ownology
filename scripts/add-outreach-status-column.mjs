import "dotenv/config";
import mysql from "mysql2/promise";

const c = await mysql.createConnection(process.env.DATABASE_URL);
try {
  await c.execute(
    "ALTER TABLE outreach_contacts ADD COLUMN status VARCHAR(16) NOT NULL DEFAULT 'cold' AFTER notes"
  );
  console.log("✓ added status column");
} catch (e) {
  if (String(e.message).includes("Duplicate")) console.log("· status column already exists");
  else throw e;
}
try {
  await c.execute("CREATE INDEX oc_status_idx ON outreach_contacts(status)");
  console.log("✓ added index");
} catch (e) {
  if (String(e.message).includes("Duplicate")) console.log("· index already exists");
  else console.log("? ", e.message);
}
const [r] = await c.execute(
  "SELECT status, COUNT(*) c FROM outreach_contacts GROUP BY status"
);
console.log("status distribution:", r);
await c.end();
