import "dotenv/config";
import mysql from "mysql2/promise";

const c = await mysql.createConnection(process.env.DATABASE_URL);
const [count] = await c.execute("SELECT COUNT(*) as n FROM outreach_contacts");
console.log("count:", count[0].n);
const [rows] = await c.execute("SELECT slug, first_name, winery, event FROM outreach_contacts LIMIT 5");
console.log("rows:", rows);
await c.end();
