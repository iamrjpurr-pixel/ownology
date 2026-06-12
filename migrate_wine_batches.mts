import mysql from "mysql2/promise";

const pool = mysql.createPool({
  uri: process.env.DATABASE_URL!,
  waitForConnections: true,
  connectionLimit: 2,
});

const conn = await pool.getConnection();
try {
  await conn.execute(`CREATE TABLE IF NOT EXISTS wine_batches (
    id int AUTO_INCREMENT NOT NULL,
    user_id int NOT NULL,
    batch_id varchar(32) NOT NULL,
    vintage int NOT NULL,
    variety varchar(128) NOT NULL,
    gi varchar(128) NOT NULL DEFAULT '',
    grower_details text,
    received_at bigint,
    quantity_value varchar(32),
    quantity_unit enum('kg','t','L') DEFAULT 'kg',
    tank_name varchar(128),
    notes_json text NOT NULL,
    created_at bigint NOT NULL,
    updated_at bigint NOT NULL,
    PRIMARY KEY (id)
  )`);
  console.log("wine_batches table created successfully");
} catch (e: any) {
  if (e.code === 'ER_TABLE_EXISTS_ERROR') {
    console.log("Table already exists — OK");
  } else {
    console.error("Error:", e.message, e.code);
    process.exit(1);
  }
} finally {
  conn.release();
  await pool.end();
}
