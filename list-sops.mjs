import "dotenv/config";
import mysql from "mysql2/promise";
const conn = await mysql.createConnection(process.env.DATABASE_URL);
const [rows] = await conn.execute("SELECT id, category, title FROM sop_library ORDER BY category, sort_order");
rows.forEach(r => console.log(r.id + " | " + r.category + " | " + r.title));
await conn.end();
