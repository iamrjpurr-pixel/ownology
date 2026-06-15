/**
 * DIY Bible Ingestion Script — WBS-Aware
 * =========================================
 * Chunks home winemaking reference documents into ~400-word passages and
 * inserts them into diy_knowledge_chunks with full WBS mapping.
 *
 * WBS Mapping (from the agreed 10-domain structure):
 *   Domain 2: Harvest & Intake
 *   Domain 3: Crush & Pre-Fermentation
 *   Domain 4: Fermentation & Winemaking  ← LAUNCH PRIORITY (published = true)
 *   Domain 5: Cellar Operations & Ageing
 *   Domain 6: Stabilisation & Filtration
 *   Domain 7: Packaging & Dispatch
 *   Domain 8: Quality, Lab & Compliance
 *
 * Usage:
 *   node scripts/ingest-diy-bible.mjs                         # Red Wine Bible (default)
 *   node scripts/ingest-diy-bible.mjs --doc white_wine_bible  # White Wine Bible
 *   node scripts/ingest-diy-bible.mjs --file /path/to/file.txt --doc white_wine_bible
 */
import { readFileSync } from "fs";
import { createConnection } from "mysql2/promise";
import * as dotenv from "dotenv";
import { fileURLToPath } from "url";
import { dirname } from "path";

dotenv.config();
const __dirname = dirname(fileURLToPath(import.meta.url));

// CLI args
const args = process.argv.slice(2);
const docArgIdx = args.indexOf("--doc");
const fileArgIdx = args.indexOf("--file");
const SOURCE_DOC = docArgIdx >= 0 ? args[docArgIdx + 1] : "red_wine_bible";
const WINE_TYPE = SOURCE_DOC.includes("white") ? "white" : "red";

// WBS mapping for Red Wine Bible chapters
// Domain 4 (Fermentation) is published at launch. All others are unpublished.
const CHAPTER_MAP = [
  {
    ref: "intro",
    title: "Introduction — Guide to Red Winemaking",
    tags: "introduction,overview,winemaking,home winemaking",
    wbsDomain: "4",
    wbsProcessFamily: "4.1",
    wbsCode: "4.1",
    published: true,
  },
  {
    ref: "1",
    title: "Preparation — Equipment and Fruit Sourcing",
    tags: "preparation,equipment,grapes,sourcing,quality",
    wbsDomain: "2",
    wbsProcessFamily: "2.4",
    wbsCode: "2.4",
    published: false,
  },
  {
    ref: "2",
    title: "The Crush — Destemming, SO2, Sugar and Acid Adjustment",
    tags: "crush,destem,SO2,sulfite,sugar,acid,yeast,additives,must",
    wbsDomain: "3",
    wbsProcessFamily: "3.1",
    wbsCode: "3.1",
    published: false,
  },
  {
    ref: "3",
    title: "Primary Fermentation — Cap Management, Nutrition, Temperature",
    tags: "fermentation,punching cap,yeast nutrition,temperature,brix,monitoring,primary",
    wbsDomain: "4",
    wbsProcessFamily: "4.1",
    wbsCode: "4.1",
    published: true,
  },
  {
    ref: "4",
    title: "The Press — Completing Fermentation and Pressing",
    tags: "press,sugar,fermentation complete,gross lees,transfer,pressing",
    wbsDomain: "4",
    wbsProcessFamily: "4.1",
    wbsCode: "4.1",
    published: true,
  },
  {
    ref: "5",
    title: "First Transfer — Racking off Gross Lees",
    tags: "racking,transfer,gross lees,MLF preparation,siphon",
    wbsDomain: "5",
    wbsProcessFamily: "5.3",
    wbsCode: "5.3",
    published: false,
  },
  {
    ref: "6",
    title: "Malolactic Fermentation — Secondary Fermentation",
    tags: "MLF,malolactic,secondary fermentation,bacteria,chromatography,lactic acid",
    wbsDomain: "4",
    wbsProcessFamily: "4.8",
    wbsCode: "4.8",
    published: true,
  },
  {
    ref: "7",
    title: "Second Transfer — Post MLF, SO2 and Acid Adjustment",
    tags: "SO2,acid,pH,transfer,ageing,storage,post-MLF",
    wbsDomain: "5",
    wbsProcessFamily: "5.3",
    wbsCode: "5.3",
    published: false,
  },
  {
    ref: "8",
    title: "Ageing and Storage",
    tags: "ageing,storage,SO2 management,tasting,oxygen,racking,barrel",
    wbsDomain: "5",
    wbsProcessFamily: "5.1",
    wbsCode: "5.1",
    published: false,
  },
  {
    ref: "9",
    title: "Clarifying and Bottling",
    tags: "fining,filtering,bottling,final testing,clarity,packaging",
    wbsDomain: "7",
    wbsProcessFamily: "7.1",
    wbsCode: "7.1",
    published: false,
  },
  {
    ref: "10.1",
    title: "Expanded: Dilution and Chapitalization of Musts",
    tags: "brix,sugar,chapitalization,dilution,must adjustment,calculation",
    wbsDomain: "3",
    wbsProcessFamily: "3.2",
    wbsCode: "3.2",
    published: false,
  },
  {
    ref: "10.2",
    title: "Expanded: Adding Acid to Must/Wine",
    tags: "acid,tartaric,pH,TA,acid addition,must",
    wbsDomain: "3",
    wbsProcessFamily: "3.2",
    wbsCode: "3.2",
    published: false,
  },
  {
    ref: "10.3",
    title: "Expanded: Complete Must Adjustment Example",
    tags: "brix,pH,TA,must adjustment,calculation,example",
    wbsDomain: "3",
    wbsProcessFamily: "3.2",
    wbsCode: "3.2",
    published: false,
  },
  {
    ref: "10.4",
    title: "Expanded: Yeast Hydration and Nutrition",
    tags: "yeast,hydration,nutrition,DAP,YAN,rehydration,inoculation",
    wbsDomain: "4",
    wbsProcessFamily: "4.3",
    wbsCode: "4.3",
    published: true,
  },
  {
    ref: "10.5",
    title: "Expanded: Malolactic Fermentation",
    tags: "MLF,malolactic,bacteria,management,completion,lactic acid",
    wbsDomain: "4",
    wbsProcessFamily: "4.8",
    wbsCode: "4.8",
    published: true,
  },
  {
    ref: "10.6",
    title: "Expanded: Oak",
    tags: "oak,barrel,chips,staves,tannin,flavour,ageing",
    wbsDomain: "5",
    wbsProcessFamily: "5.1",
    wbsCode: "5.1",
    published: false,
  },
  {
    ref: "10.7",
    title: "Expanded: SO2 Management",
    tags: "SO2,sulfite,free SO2,molecular SO2,addition,testing,protection",
    wbsDomain: "8",
    wbsProcessFamily: "8.2",
    wbsCode: "8.2",
    published: false,
  },
  {
    ref: "10.8",
    title: "Expanded: Bench Trials",
    tags: "bench trial,fining,testing,adjustment,trial,clarification",
    wbsDomain: "8",
    wbsProcessFamily: "8.1",
    wbsCode: "8.1",
    published: false,
  },
  {
    ref: "10.9",
    title: "Expanded: Transferring and Racking",
    tags: "racking,transfer,siphon,pump,oxygen,lees,cellar",
    wbsDomain: "5",
    wbsProcessFamily: "5.3",
    wbsCode: "5.3",
    published: false,
  },
  {
    ref: "10.10",
    title: "Expanded: Inert Gas and Winemaking",
    tags: "inert gas,CO2,nitrogen,argon,oxygen,protection,oxidation",
    wbsDomain: "5",
    wbsProcessFamily: "5.5",
    wbsCode: "5.5",
    published: false,
  },
];

function detectChapter(text) {
  if (/^chapter\s+1\b/i.test(text) && /preparation/i.test(text)) return "1";
  if (/^chapter\s+2\b/i.test(text) && /crush/i.test(text)) return "2";
  if (/^chapter\s+3\b/i.test(text) && /fermentation/i.test(text)) return "3";
  if (/^chapter\s+4\b/i.test(text) && /press/i.test(text)) return "4";
  if (/^chapter\s+5\b/i.test(text) && /transfer|gross lees/i.test(text)) return "5";
  if (/^chapter\s+6\b/i.test(text) && /malolactic/i.test(text)) return "6";
  if (/^chapter\s+7\b/i.test(text) && /transfer|post.?mlf/i.test(text)) return "7";
  if (/^chapter\s+8\b/i.test(text) && /ageing|storage/i.test(text)) return "8";
  if (/^chapter\s+9\b/i.test(text) && /clarif|bottling/i.test(text)) return "9";
  if (/10\.1\b/i.test(text) && /dilution|chapitali/i.test(text)) return "10.1";
  if (/10\.2\b/i.test(text) && /adding acid/i.test(text)) return "10.2";
  if (/10\.3\b/i.test(text) && /complete must/i.test(text)) return "10.3";
  if (/10\.4\b/i.test(text) && /yeast hydration|yeast nutrition/i.test(text)) return "10.4";
  if (/10\.5\b/i.test(text) && /malolactic/i.test(text)) return "10.5";
  if (/10\.6\b/i.test(text) && /oak/i.test(text)) return "10.6";
  if (/10\.7\b/i.test(text) && /so2 management/i.test(text)) return "10.7";
  if (/10\.8\b/i.test(text) && /bench trial/i.test(text)) return "10.8";
  if (/10\.9\b/i.test(text) && /transferring.*racking/i.test(text)) return "10.9";
  if (/10\.10\b/i.test(text) && /inert gas/i.test(text)) return "10.10";
  return null;
}

function chunkText(text, targetWords = 400) {
  const paragraphs = text.split(/\n\n+/).filter(p => p.trim().length > 20);
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

async function main() {
  let textPath;
  if (fileArgIdx >= 0) {
    textPath = args[fileArgIdx + 1];
  } else if (SOURCE_DOC === "red_wine_bible") {
    textPath = "/tmp/red_wine_bible.txt";
  } else if (SOURCE_DOC === "white_wine_bible") {
    textPath = "/tmp/white_wine_bible.txt";
  } else {
    textPath = `/tmp/${SOURCE_DOC}.txt`;
  }

  console.log(`\nIngesting: ${SOURCE_DOC} (${WINE_TYPE})`);
  console.log(`Source file: ${textPath}`);

  let rawText;
  try {
    rawText = readFileSync(textPath, "utf8");
  } catch (err) {
    console.error(`Could not read file: ${textPath}`);
    console.error(err.message);
    process.exit(1);
  }

  const conn = await createConnection(process.env.DATABASE_URL);
  console.log("Connected to database");

  const [deleteResult] = await conn.execute(
    "DELETE FROM diy_knowledge_chunks WHERE source_doc = ?",
    [SOURCE_DOC]
  );
  console.log(`Cleared ${deleteResult.affectedRows} existing ${SOURCE_DOC} chunks`);

  const lines = rawText.split("\n");
  const sections = [];
  let currentChapterRef = "intro";
  let currentLines = [];

  for (const line of lines) {
    const detected = detectChapter(line);
    if (detected && detected !== currentChapterRef) {
      if (currentLines.length > 0) {
        sections.push({ ref: currentChapterRef, text: currentLines.join("\n") });
      }
      currentChapterRef = detected;
      currentLines = [line];
    } else {
      currentLines.push(line);
    }
  }
  if (currentLines.length > 0) {
    sections.push({ ref: currentChapterRef, text: currentLines.join("\n") });
  }

  console.log(`Found ${sections.length} sections`);

  let totalChunks = 0;
  let publishedChunks = 0;
  const now = Date.now();

  for (const section of sections) {
    const chapterMeta = CHAPTER_MAP.find(c => c.ref === section.ref) || {
      ref: section.ref,
      title: `Section ${section.ref}`,
      tags: "winemaking,home winemaking",
      wbsDomain: null,
      wbsProcessFamily: null,
      wbsCode: null,
      published: false,
    };

    const chunks = chunkText(section.text);
    const publishedLabel = chapterMeta.published ? "PUBLISHED" : "unpublished";
    console.log(
      `  [${publishedLabel}] Section ${section.ref} "${chapterMeta.title}" (WBS ${chapterMeta.wbsCode || "none"}): ${chunks.length} chunks`
    );

    for (let i = 0; i < chunks.length; i++) {
      const chunk = chunks[i];
      if (chunk.trim().length < 50) continue;

      const publishedAt = chapterMeta.published ? now : null;

      await conn.execute(
        `INSERT INTO diy_knowledge_chunks 
         (source_doc, wine_type, chapter_ref, chapter_title, topic_tags,
          wbs_domain, wbs_process_family, wbs_code,
          published, published_at,
          content, chunk_index, created_at)
         VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
        [
          SOURCE_DOC,
          WINE_TYPE,
          chapterMeta.ref,
          chapterMeta.title,
          chapterMeta.tags,
          chapterMeta.wbsDomain,
          chapterMeta.wbsProcessFamily,
          chapterMeta.wbsCode,
          chapterMeta.published ? 1 : 0,
          publishedAt,
          chunk,
          totalChunks,
          now,
        ]
      );
      totalChunks++;
      if (chapterMeta.published) publishedChunks++;
    }
  }

  console.log(`\nIngestion complete`);
  console.log(`  Total chunks: ${totalChunks}`);
  console.log(`  Published (Domain 4 + intro): ${publishedChunks}`);
  console.log(`  Unpublished (awaiting release): ${totalChunks - publishedChunks}`);

  await conn.end();
}

main().catch(err => {
  console.error("Ingestion failed:", err);
  process.exit(1);
});
