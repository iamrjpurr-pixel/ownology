/**
 * ingest-white-wine-bible.mjs
 * Ingests the MoreFlavor! Guide to White Wine Making into diy_knowledge_chunks.
 * Chapters are mapped to WBS domains. Domain 4 (Fermentation) is published immediately.
 * Run: node scripts/ingest-white-wine-bible.mjs
 */

import fs from "fs";
import path from "path";
import { createConnection } from "mysql2/promise";
import dotenv from "dotenv";

dotenv.config({ path: path.resolve(process.cwd(), ".env") });

const SOURCE_DOC = "white_wine_bible";
const TEXT_FILE = "/tmp/white_wine_bible.txt";

// ── WBS mapping for white wine chapters ──────────────────────────────────────
const CHAPTER_MAP = [
  {
    key: "intro",
    heading: /^(Goal of this Manual|Introduction)/i,
    chapter_ref: "Intro",
    chapter_title: "Introduction to White Winemaking",
    wbs_domain: "D3",
    wbs_process_family: "Harvest & Crush",
    wbs_code: "D3.0",
    topic_tags: "introduction,overview,white wine,home winemaking,goals",
    published: false,
  },
  {
    key: "ch1",
    heading: /^Chapter 1:/i,
    chapter_ref: "Ch1",
    chapter_title: "Preparation & Preplanning",
    wbs_domain: "D3",
    wbs_process_family: "Harvest & Crush",
    wbs_code: "D3.1",
    topic_tags: "preparation,equipment,planning,fruit sourcing,white wine",
    published: false,
  },
  {
    key: "ch2",
    heading: /^Chapter 2:/i,
    chapter_ref: "Ch2",
    chapter_title: "Prepare the Juice for Fermentation",
    wbs_domain: "D3",
    wbs_process_family: "Harvest & Crush",
    wbs_code: "D3.2",
    topic_tags: "pressing,crush,destem,SO2,sulphite,cold settling,settling,fining,juice,pH,TA,Brix,adjustment",
    published: false,
  },
  {
    key: "ch3",
    heading: /^Chapter 3:/i,
    chapter_ref: "Ch3",
    chapter_title: "Add the Yeast and Begin Fermentation",
    wbs_domain: "D4",
    wbs_process_family: "Fermentation",
    wbs_code: "D4.1",
    topic_tags: "yeast,inoculation,GoFerm,rehydration,co-inoculation,pitch,fermentation start",
    published: true,
  },
  {
    key: "ch4",
    heading: /^Chapter 4:/i,
    chapter_ref: "Ch4",
    chapter_title: "Monitor Fermentation",
    wbs_domain: "D4",
    wbs_process_family: "Fermentation",
    wbs_code: "D4.2",
    topic_tags: "fermentation,monitoring,Brix,temperature,nutrients,Fermaid,YAN,stir,stuck fermentation",
    published: true,
  },
  {
    key: "ch5",
    heading: /^Chapter 5:/i,
    chapter_ref: "Ch5",
    chapter_title: "Malolactic Fermentation (MLF)",
    wbs_domain: "D5",
    wbs_process_family: "Post-Fermentation",
    wbs_code: "D5.1",
    topic_tags: "MLF,malolactic fermentation,lactic acid,malic acid,bacteria,chromatography,Oenococcus",
    published: false,
  },
  {
    key: "ch6",
    heading: /^Chapter 6:/i,
    chapter_ref: "Ch6",
    chapter_title: "Ageing, Storage & Lees Management",
    wbs_domain: "D5",
    wbs_process_family: "Post-Fermentation",
    wbs_code: "D5.2",
    topic_tags: "ageing,lees,sur-lie,racking,transfer,SO2,storage,oak,tasting,adjustment",
    published: false,
  },
  {
    key: "ch7",
    heading: /^Chapter 7:/i,
    chapter_ref: "Ch7",
    chapter_title: "End of Ageing — Fining, Filtration & Stabilisation",
    wbs_domain: "D6",
    wbs_process_family: "Stabilisation",
    wbs_code: "D6.1",
    topic_tags: "fining,filtration,stabilisation,clarity,bentonite,cold stability,tartrate,protein stability",
    published: false,
  },
  {
    key: "ch8",
    heading: /^Chapter 8:/i,
    chapter_ref: "Ch8",
    chapter_title: "Bottling",
    wbs_domain: "D7",
    wbs_process_family: "Packaging",
    wbs_code: "D7.1",
    topic_tags: "bottling,cork,bottle,packaging,SO2,inert gas,bottle shock",
    published: false,
  },
  {
    key: "ch9_1",
    heading: /^9\.1\)/i,
    chapter_ref: "Ch9.1",
    chapter_title: "Expanded: Must Adjustments",
    wbs_domain: "D3",
    wbs_process_family: "Harvest & Crush",
    wbs_code: "D3.3",
    topic_tags: "must adjustment,Brix,sugar,chaptalization,dilution,juice correction",
    published: false,
  },
  {
    key: "ch9_2",
    heading: /^9\.2\)/i,
    chapter_ref: "Ch9.2",
    chapter_title: "Expanded: Acidity and Adding Acid",
    wbs_domain: "D3",
    wbs_process_family: "Harvest & Crush",
    wbs_code: "D3.4",
    topic_tags: "acidity,TA,pH,tartaric acid,acid adjustment,calcium carbonate,malic acid",
    published: false,
  },
  {
    key: "ch9_3",
    heading: /^9\.3\)/i,
    chapter_ref: "Ch9.3",
    chapter_title: "Expanded: Complete Must Adjustment Example",
    wbs_domain: "D3",
    wbs_process_family: "Harvest & Crush",
    wbs_code: "D3.5",
    topic_tags: "must adjustment,Brix,pH,TA,example,calculation,correction",
    published: false,
  },
  {
    key: "ch9_4",
    heading: /^9\.4\)/i,
    chapter_ref: "Ch9.4",
    chapter_title: "Expanded: Testing SO2",
    wbs_domain: "D6",
    wbs_process_family: "Stabilisation",
    wbs_code: "D6.2",
    topic_tags: "SO2,sulphite,free SO2,molecular SO2,testing,Ripper,aeration oxidation,campden",
    published: false,
  },
  {
    key: "ch9_5",
    heading: /^9\.5\)/i,
    chapter_ref: "Ch9.5",
    chapter_title: "Expanded: Inert Gas and Winemaking",
    wbs_domain: "D6",
    wbs_process_family: "Stabilisation",
    wbs_code: "D6.3",
    topic_tags: "inert gas,argon,nitrogen,CO2,reductive,oxidation protection,headspace,white wine",
    published: false,
  },
  {
    key: "ch9_6",
    heading: /^9\.6\)/i,
    chapter_ref: "Ch9.6",
    chapter_title: "Expanded: Transferring and Racking",
    wbs_domain: "D5",
    wbs_process_family: "Post-Fermentation",
    wbs_code: "D5.3",
    topic_tags: "racking,transfer,siphon,lees,sediment,oxidation,inert gas",
    published: false,
  },
  {
    key: "ch9_7",
    heading: /^9\.7\)/i,
    chapter_ref: "Ch9.7",
    chapter_title: "Expanded: Bench Trials",
    wbs_domain: "D6",
    wbs_process_family: "Stabilisation",
    wbs_code: "D6.4",
    topic_tags: "bench trial,fining,tannin,bentonite,gelatin,trial,adjustment,tasting",
    published: false,
  },
  {
    key: "ch9_8",
    heading: /^9\.8\)/i,
    chapter_ref: "Ch9.8",
    chapter_title: "Expanded: Yeast Hydration and Nutrients",
    wbs_domain: "D4",
    wbs_process_family: "Fermentation",
    wbs_code: "D4.3",
    topic_tags: "yeast,GoFerm,Fermaid-O,Fermaid-K,DAP,YAN,nutrient,rehydration,stuck fermentation",
    published: true,
  },
  {
    key: "ch9_9",
    heading: /^9\.9\)/i,
    chapter_ref: "Ch9.9",
    chapter_title: "Expanded: Oak",
    wbs_domain: "D5",
    wbs_process_family: "Post-Fermentation",
    wbs_code: "D5.4",
    topic_tags: "oak,chips,cubes,barrel,tannin,flavor,toasting,ageing",
    published: false,
  },
  {
    key: "ch9_10",
    heading: /^9\.10\)/i,
    chapter_ref: "Ch9.10",
    chapter_title: "Expanded: Malolactic Fermentation",
    wbs_domain: "D5",
    wbs_process_family: "Post-Fermentation",
    wbs_code: "D5.5",
    topic_tags: "MLF,malolactic fermentation,lactic acid,malic acid,bacteria,Oenococcus,chromatography,SO2",
    published: false,
  },
];

// ── Chunk text into ~500-word passages ───────────────────────────────────────
function chunkText(text, maxWords = 500) {
  const paragraphs = text.split(/\n{2,}/);
  const chunks = [];
  let current = [];
  let wordCount = 0;

  for (const para of paragraphs) {
    const words = para.trim().split(/\s+/).length;
    if (wordCount + words > maxWords && current.length > 0) {
      chunks.push(current.join("\n\n").trim());
      current = [];
      wordCount = 0;
    }
    current.push(para.trim());
    wordCount += words;
  }
  if (current.length > 0) chunks.push(current.join("\n\n").trim());
  return chunks.filter((c) => c.length > 80);
}

// ── Main ─────────────────────────────────────────────────────────────────────
async function main() {
  const raw = fs.readFileSync(TEXT_FILE, "utf8");
  const lines = raw.split("\n");

  // Split into chapter sections
  const sections = [];
  let currentChapter = null;
  let currentLines = [];

  for (const line of lines) {
    let matched = false;
    for (const ch of CHAPTER_MAP) {
      if (ch.heading.test(line.trim())) {
        if (currentChapter && currentLines.length > 0) {
          sections.push({ chapter: currentChapter, text: currentLines.join("\n") });
        }
        currentChapter = ch;
        currentLines = [line];
        matched = true;
        break;
      }
    }
    if (!matched && currentChapter) {
      currentLines.push(line);
    }
  }
  if (currentChapter && currentLines.length > 0) {
    sections.push({ chapter: currentChapter, text: currentLines.join("\n") });
  }

  console.log(`Found ${sections.length} sections`);

  const db = await createConnection(process.env.DATABASE_URL);

  // Remove existing white wine bible chunks
  const [del] = await db.execute(
    "DELETE FROM diy_knowledge_chunks WHERE source_doc = ?",
    [SOURCE_DOC]
  );
  console.log(`Deleted ${del.affectedRows} existing white_wine_bible chunks`);

  let totalInserted = 0;
  let publishedCount = 0;

  for (const { chapter, text } of sections) {
    const chunks = chunkText(text);
    for (let i = 0; i < chunks.length; i++) {
      const now = Date.now();
      await db.execute(
        `INSERT INTO diy_knowledge_chunks
          (source_doc, wine_type, chapter_ref, chapter_title, topic_tags, content,
           chunk_index, wbs_domain, wbs_process_family, wbs_code, published, published_at, created_at)
         VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
        [
          SOURCE_DOC,
          "white",
          chapter.chapter_ref,
          chapter.chapter_title,
          chapter.topic_tags,
          chunks[i],
          i,
          chapter.wbs_domain,
          chapter.wbs_process_family,
          chapter.wbs_code,
          chapter.published ? 1 : 0,
          chapter.published ? now : null,
          now,
        ]
      );
      totalInserted++;
      if (chapter.published) publishedCount++;
    }
    console.log(
      `  ${chapter.chapter_ref} "${chapter.chapter_title}" → ${chunks.length} chunks [${chapter.published ? "PUBLISHED" : "unpublished"}]`
    );
  }

  console.log(`\nDone. Inserted ${totalInserted} chunks (${publishedCount} published, ${totalInserted - publishedCount} unpublished)`);
  await db.end();
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
