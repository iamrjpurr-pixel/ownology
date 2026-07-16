import mysql from "mysql2/promise";
const conn = await mysql.createConnection(process.env.DATABASE_URL);
const [row] = await conn.execute(
  "SHOW COLUMNS FROM outreach_contacts",
);
console.log("COLUMNS:", JSON.stringify(row.map(r=>r.Field), null, 2));
const [row2] = await conn.execute(
  "SELECT * FROM outreach_contacts WHERE slug=?",
  ["fiona-donald-seppeltsfield"],
);
console.log(JSON.stringify(row2, null, 2));
await conn.end();
