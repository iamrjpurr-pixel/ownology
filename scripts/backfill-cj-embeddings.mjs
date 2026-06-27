/**
 * Backfill embeddings for all cellar_journal entries that don't have one yet.
 * Run once after adding the embedding column. Idempotent.
 *
 *   node scripts/backfill-cj-embeddings.mjs
 */
import "dotenv/config";
import mysql from "mysql2/promise";

const EMBED_URL =
  "https://integrations.emergentagent.com/llm/openai/v1/embeddings";
const KEY = process.env.EMERGENT_LLM_KEY;
const MODEL = "text-embedding-3-small";

async function embed(text) {
  const resp = await fetch(EMBED_URL, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      Authorization: `Bearer ${KEY}`,
    },
    body: JSON.stringify({ model: MODEL, input: text }),
  });
  if (!resp.ok) throw new Error(`embed ${resp.status}: ${await resp.text()}`);
  const data = await resp.json();
  return data.data[0].embedding;
}

async function main() {
  const conn = await mysql.createConnection(process.env.DATABASE_URL);
  const [rows] = await conn.execute(
    "SELECT id, question FROM cellar_journal WHERE embedding IS NULL"
  );
  console.log(`Backfilling embeddings for ${rows.length} entries...`);
  let done = 0;
  for (const r of rows) {
    try {
      const vec = await embed(r.question);
      await conn.execute(
        "UPDATE cellar_journal SET embedding = ? WHERE id = ?",
        [JSON.stringify(vec), r.id]
      );
      done++;
      process.stdout.write(`  ✓ ${r.id} · ${r.question.slice(0, 60)}\n`);
    } catch (e) {
      console.warn(`  ✗ ${r.id}: ${e.message}`);
    }
  }
  console.log(`\nDone — ${done}/${rows.length} embedded.`);
  await conn.end();
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
