import mysql from "mysql2/promise";
import * as dotenv from "dotenv";
dotenv.config();
const db = await mysql.createConnection(process.env.DATABASE_URL);
const [rows] = await db.execute("SELECT source_doc, wine_type, COUNT(*) as total, SUM(published) as published FROM diy_knowledge_chunks GROUP BY source_doc, wine_type ORDER BY wine_type, source_doc");
console.table(rows);
await db.end();
