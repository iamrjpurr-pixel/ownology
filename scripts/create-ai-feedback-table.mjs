import "dotenv/config";
import mysql from "mysql2/promise";
const c = await mysql.createConnection(process.env.DATABASE_URL);
await c.execute(`
  CREATE TABLE IF NOT EXISTS ai_answer_feedback (
    id INT AUTO_INCREMENT PRIMARY KEY,
    user_id INT,
    proc_name VARCHAR(64) NOT NULL,
    question TEXT NOT NULL,
    answer_hash VARCHAR(32) NOT NULL,
    score INT NOT NULL,
    note VARCHAR(500),
    created_at BIGINT NOT NULL,
    INDEX aaf_proc_idx (proc_name, created_at),
    INDEX aaf_score_idx (score)
  )
`);
console.log("✓ ai_answer_feedback table ready");
await c.end();
