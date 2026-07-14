import fs from 'fs';
import mysql from 'mysql2/promise';
const env = fs.readFileSync('/app/.env', 'utf8');
const url = env.match(/^DATABASE_URL=(.+)$/m)[1].trim();
const conn = await mysql.createConnection(url);
const [rows] = await conn.query(
  `SELECT * FROM outreach_contacts
   WHERE (LOWER(first_name)='tim' AND LOWER(last_name)='stock')
      OR (LOWER(first_name)='sarah' AND LOWER(last_name)='feehan')
      OR LOWER(last_name) LIKE '%feehan%'
      OR LOWER(last_name) LIKE '%stock%'
   ORDER BY last_name`
);
console.log(JSON.stringify(rows, null, 2));
await conn.end();
