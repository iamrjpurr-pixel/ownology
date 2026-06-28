/**
 * ingest-knowledge-folder.mjs
 *
 * Generic markdown ingestion for /app/references/{regulations,equipment,education}.
 * Chunks files into ~600-word passages and inserts into diy_knowledge_chunks.
 *
 * All chunks ingested by this script are PUBLISHED by default (knowledge for tutor).
 *
 * Usage:
 *   node scripts/ingest-knowledge-folder.mjs --folder regulations --source-prefix au_regulations --wine-type general
 *   node scripts/ingest-knowledge-folder.mjs --folder equipment --source-prefix au_equipment --wine-type general
 *   node scripts/ingest-knowledge-folder.mjs --folder education --source-prefix oenology_education --wine-type general
 */
import "dotenv/config";
import mysql from "mysql2/promise";
import { readFileSync, readdirSync, statSync } from "fs";
import path from "path";

const args = process.argv.slice(2);
const argval = (k) => {
  const i = args.indexOf(k);
  return i >= 0 ? args[i + 1] : null;
};

const FOLDER = argval("--folder");
const SOURCE_PREFIX = argval("--source-prefix") || FOLDER;
const WINE_TYPE = argval("--wine-type") || "general";

if (!FOLDER) {
  console.error("Usage: --folder <name> [--source-prefix <prefix>] [--wine-type general|red|white]");
  process.exit(1);
}

const FOLDER_TO_WBS = {
  regulations: { domain: "D8", processFamily: "Compliance & Regulations", code: "D8.1", tags: "compliance,regulations,licensing,WET,labelling,tax,liquor" },
  equipment: { domain: "D2", processFamily: "Equipment & Setup", code: "D2.1", tags: "equipment,tools,setup,boutique,suppliers,cost" },
  education: { domain: "D0", processFamily: "Oenology Education", code: "D0.1", tags: "oenology,curriculum,education,microbiology,science,theory" },
};

const wbsMeta = FOLDER_TO_WBS[FOLDER] || {
  domain: null,
  processFamily: null,
  code: null,
  tags: "winemaking,knowledge",
};

const folderPath = path.join("references", FOLDER);

function chunkText(text, targetWords = 600) {
  const paragraphs = text.split(/\n\n+/).filter((p) => p.trim().length > 30);
  const chunks = [];
  let current = [];
  let wordCount = 0;
  for (const para of paragraphs) {
    const words = para.trim().split(/\s+/).length;
    if (wordCount + words > targetWords && current.length > 0) {
      chunks.push(current.join("\n\n").trim());
      current = [para.trim()];
      wordCount = words;
    } else {
      current.push(para.trim());
      wordCount += words;
    }
  }
  if (current.length > 0) chunks.push(current.join("\n\n").trim());
  return chunks;
}

function titleFromFilename(filename) {
  return filename
    .replace(/\.md$/, "")
    .replace(/[-_]/g, " ")
    .replace(/\s+/g, " ")
    .replace(/\b\w/g, (c) => c.toUpperCase())
    .slice(0, 250);
}

async function main() {
  const conn = await mysql.createConnection(process.env.DATABASE_URL);
  console.log(`Connected. Ingesting folder: ${folderPath}`);
  console.log(`Source prefix: ${SOURCE_PREFIX}, WBS: ${wbsMeta.code}`);

  // Clear previously-ingested chunks for this source prefix (idempotent re-runs)
  const [del] = await conn.execute(
    "DELETE FROM diy_knowledge_chunks WHERE source_doc LIKE ?",
    [`${SOURCE_PREFIX}__%`]
  );
  console.log(`Cleared ${del.affectedRows} existing chunks for prefix ${SOURCE_PREFIX}__*`);

  const files = readdirSync(folderPath).filter((f) => f.endsWith(".md"));
  console.log(`Found ${files.length} markdown files`);

  const now = Date.now();
  let totalChunks = 0;

  for (const filename of files) {
    const fullPath = path.join(folderPath, filename);
    if (!statSync(fullPath).isFile()) continue;
    const text = readFileSync(fullPath, "utf8");
    if (text.trim().length < 200) {
      console.log(`  SKIP ${filename} (too short)`);
      continue;
    }
    const sourceDoc = `${SOURCE_PREFIX}__${filename.replace(/\.md$/, "").slice(0, 50)}`;
    const title = titleFromFilename(filename);
    const chunks = chunkText(text);

    for (let i = 0; i < chunks.length; i++) {
      const chunk = chunks[i];
      if (chunk.trim().length < 100) continue;
      await conn.execute(
        `INSERT INTO diy_knowledge_chunks
         (source_doc, wine_type, chapter_ref, chapter_title, topic_tags,
          wbs_domain, wbs_process_family, wbs_code,
          published, published_at,
          content, chunk_index, created_at)
         VALUES (?, ?, ?, ?, ?, ?, ?, ?, 1, ?, ?, ?, ?)`,
        [
          sourceDoc.slice(0, 64),
          WINE_TYPE,
          String(i + 1).slice(0, 32),
          title,
          wbsMeta.tags.slice(0, 512),
          wbsMeta.domain,
          wbsMeta.processFamily,
          wbsMeta.code,
          now,
          chunk,
          totalChunks,
          now,
        ]
      );
      totalChunks++;
    }
    console.log(`  ✓ ${filename}: ${chunks.length} chunks (${title})`);
  }

  console.log(`\nDone — ${totalChunks} total chunks ingested from ${folderPath} (all PUBLISHED).`);
  await conn.end();
}

main().catch((err) => {
  console.error("Ingestion failed:", err);
  process.exit(1);
});
