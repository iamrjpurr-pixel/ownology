import "dotenv/config"; import mysql from "mysql2/promise";
const c = await mysql.createConnection(process.env.DATABASE_URL);
// Winery plan/trial columns
const [cols] = await c.execute("SHOW COLUMNS FROM wineries");
console.log("wineries cols:", cols.map(r => `${r.Field}:${r.Type}`).slice(0,25).join('\n  '));
// Existing plans
const [plans] = await c.execute("SELECT plan, COUNT(*) n FROM wineries GROUP BY plan");
console.log("\nplans:", plans);
// Any referral table?
const [tables] = await c.execute("SHOW TABLES LIKE '%referral%'");
console.log("\nreferral tables:", tables);
// stripe stub?
const [str] = await c.execute("SELECT COUNT(*) n FROM wineries WHERE stripe_customer_id IS NOT NULL");
console.log("wineries w/ stripe id:", str[0].n);
await c.end();
