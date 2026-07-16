import mysql from "mysql2/promise";
const conn = await mysql.createConnection(process.env.DATABASE_URL);
// content_edits table override check
try {
  const [rows] = await conn.execute(
    "SELECT content_key, value FROM site_content WHERE content_key LIKE 'home.hero.%' OR content_key LIKE 'home.%'",
  );
  console.log("SITE_CONTENT overrides:", JSON.stringify(rows, null, 2));
} catch (e) {
  console.log("site_content table check failed:", e.message);
  // Try alternate table name
  try {
    const [rows] = await conn.execute(
      "SELECT content_key, value FROM content_edits WHERE content_key LIKE 'home.%'",
    );
    console.log("CONTENT_EDITS overrides:", JSON.stringify(rows, null, 2));
  } catch (e2) {
    console.log("content_edits also failed:", e2.message);
  }
}
await conn.end();
