import "dotenv/config";
import mysql from "mysql2/promise";
// Adds contact_email column to gate_invites so Member-tier invites capture
// the recipient's email at issue time (Feb 2026 E2E test finding).
// Idempotent — safe to re-run.
const c = await mysql.createConnection(process.env.DATABASE_URL);
try {
  await c.execute("ALTER TABLE gate_invites ADD COLUMN contact_email VARCHAR(200) NULL AFTER winery_name");
  console.log("added contact_email");
} catch (e) {
  if (String(e.message).includes("Duplicate")) console.log("contact_email already exists");
  else throw e;
}
await c.end();
