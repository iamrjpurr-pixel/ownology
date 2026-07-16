// Inspect Fiona's stored SMS draft override + count all rows containing banned terms.
import mysql from "mysql2/promise";

const conn = await mysql.createConnection(process.env.DATABASE_URL);

const [fionaRows] = await conn.execute(
  "SELECT slug, first_name, winery, LENGTH(sms_draft_override) AS len, sms_draft_override FROM outreach_contacts WHERE slug=?",
  ["fiona-donald-seppeltsfield"],
);
console.log("FIONA ROW:", JSON.stringify(fionaRows, null, 2));

const bannedRe = "cellar AI|second brain|winemaker.s second|AI apprentice|building a cellar|building Ownology|cellar-intelligence AI";
const [countRows] = await conn.execute(
  `SELECT COUNT(*) AS n FROM outreach_contacts WHERE sms_draft_override REGEXP ?`,
  [bannedRe],
);
console.log("BANNED MATCHES:", JSON.stringify(countRows));

const [sampleRows] = await conn.execute(
  `SELECT slug, LEFT(sms_draft_override, 200) AS snippet FROM outreach_contacts WHERE sms_draft_override REGEXP ? LIMIT 10`,
  [bannedRe],
);
console.log("SAMPLE STALE:", JSON.stringify(sampleRows, null, 2));

await conn.end();
