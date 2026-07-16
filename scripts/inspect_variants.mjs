import mysql from "mysql2/promise";
const conn = await mysql.createConnection(process.env.DATABASE_URL);
const [row] = await conn.execute("SELECT * FROM sms_opener_variants ORDER BY sort_index");
console.log(JSON.stringify(row, null, 2));
await conn.end();
