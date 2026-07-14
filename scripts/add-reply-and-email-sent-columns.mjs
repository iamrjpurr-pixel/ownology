/**
 * Add reply_text VARCHAR(2000) + email_sent_at BIGINT to outreach_contacts.
 * Reply Capture + Sent-via-Gmail Log features (Rich, Feb 2026).
 * Idempotent — safe to re-run.
 */
import "dotenv/config";
import mysql from "mysql2/promise";

const c = await mysql.createConnection(process.env.DATABASE_URL);

const ops = [
  { name: "reply_text",    sql: "ALTER TABLE outreach_contacts ADD COLUMN reply_text VARCHAR(2000) NULL" },
  { name: "email_sent_at", sql: "ALTER TABLE outreach_contacts ADD COLUMN email_sent_at BIGINT NULL" },
];

for (const op of ops) {
  try {
    await c.execute(op.sql);
    console.log(`added column: ${op.name}`);
  } catch (e) {
    if (String(e.message).includes("Duplicate")) console.log(`${op.name} already exists`);
    else throw e;
  }
}

const [cols] = await c.query(
  "SHOW COLUMNS FROM outreach_contacts WHERE Field IN ('reply_text', 'email_sent_at')"
);
console.log("column state:", cols);

await c.end();
