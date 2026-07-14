/**
 * Ingest AWRI Fact Sheets into diy_knowledge_chunks.
 *
 * Source: /app/references/awri-fact-sheets/*.pdf — 9 fact sheets from the
 * Australian Wine Research Institute (publicly available industry technical
 * reference material). Each PDF becomes 1–4 chunks (~600–1200 words each)
 * so semantic retrieval can pull tightly-scoped passages.
 *
 * Feb 2026, Phase A of the Reference Ingest task.
 *
 * Usage: node scripts/ingest-awri-fact-sheets.mjs
 */
import mysql from "mysql2/promise";
import * as dotenv from "dotenv";
import { readFileSync, readdirSync } from "fs";
import { basename, extname, join } from "path";
import * as pdfjsLib from "pdfjs-dist/legacy/build/pdf.mjs";

dotenv.config();

const REFS_DIR = "/app/references/awri-fact-sheets";
const MAX_CHUNK_WORDS = 700;   // Target words per chunk
const MIN_CHUNK_WORDS = 200;   // Below this, merge into next chunk

// Per-file metadata: canonical title + WBS mapping + topic tags.
// Titles land in Owen's citations verbatim, so keep them AWRI-branded.
const FACT_SHEETS = {
  "avoiding-lab-spoilage.pdf": {
    canonicalTitle: "AWRI Fact Sheet — Avoiding Wine Spoilage in the Laboratory",
    wineType: "general",
    wbsDomain: "D6",
    wbsProcessFamily: "Laboratory & Quality",
    wbsCode: "D6.1",
    topicTags: "laboratory,sample,spoilage,contamination,brett,vinegar,bacteria,hygiene,glassware,cross-contamination",
  },
  "controlling-brett.pdf": {
    canonicalTitle: "AWRI Fact Sheet — Controlling Brettanomyces",
    wineType: "red",
    wbsDomain: "D5",
    wbsProcessFamily: "Post-Fermentation",
    wbsCode: "D5.4",
    topicTags: "brett,brettanomyces,4-ethylphenol,4-EP,spoilage,SO2,molecular SO2,filtration,DMDC,velcorin,barrel hygiene",
  },
  "managing-botrytis.pdf": {
    canonicalTitle: "AWRI Fact Sheet — Managing Botrytis",
    wineType: "general",
    wbsDomain: "D3",
    wbsProcessFamily: "Harvest & Crush",
    wbsCode: "D3.2",
    topicTags: "botrytis,noble rot,bunch rot,grey mould,harvest,laccase,PVPP,gluconic acid,SO2 binding,tainted juice",
  },
  "mlf-achieving-successful.pdf": {
    canonicalTitle: "AWRI Fact Sheet — Achieving Successful Malolactic Fermentation",
    wineType: "general",
    wbsDomain: "D4",
    wbsProcessFamily: "Fermentation",
    wbsCode: "D4.3",
    topicTags: "malolactic,MLF,oenococcus,lactic acid bacteria,inoculation,co-inoculation,nutrients,pH,SO2,temperature,malic acid",
  },
  "mlf-red-wine.pdf": {
    canonicalTitle: "AWRI Fact Sheet — Malolactic Fermentation in Red Wine",
    wineType: "red",
    wbsDomain: "D4",
    wbsProcessFamily: "Fermentation",
    wbsCode: "D4.3",
    topicTags: "malolactic,MLF,red wine,inoculation timing,co-inoculation,sequential,oak barrel MLF,stuck MLF,diacetyl",
  },
  "protein-stability.pdf": {
    canonicalTitle: "AWRI Fact Sheet — Protein Stability in White Wines",
    wineType: "white",
    wbsDomain: "D5",
    wbsProcessFamily: "Post-Fermentation",
    wbsCode: "D5.2",
    topicTags: "protein,haze,heat test,bentonite,fining,thaumatin,chitinase,white wine,stability,thermal stability",
  },
  "reducing-ethanol.pdf": {
    canonicalTitle: "AWRI Fact Sheet — Reducing Ethanol in Wine",
    wineType: "general",
    wbsDomain: "D4",
    wbsProcessFamily: "Fermentation",
    wbsCode: "D4.4",
    topicTags: "ethanol,alcohol reduction,reverse osmosis,spinning cone,dealcoholisation,low alcohol,brix,yeast selection,dilution",
  },
  "small-lot-fermentation.pdf": {
    canonicalTitle: "AWRI Fact Sheet — Small-Lot Fermentation",
    wineType: "general",
    wbsDomain: "D4",
    wbsProcessFamily: "Fermentation",
    wbsCode: "D4.1",
    topicTags: "small lot,micro vinification,trial fermentation,replicate,batch size,scale,experimental,vessel selection",
  },
  "stuck-fermentation.pdf": {
    canonicalTitle: "AWRI Fact Sheet — Stuck & Sluggish Fermentation",
    wineType: "general",
    wbsDomain: "D4",
    wbsProcessFamily: "Fermentation",
    wbsCode: "D4.2",
    topicTags: "stuck fermentation,sluggish,YAN,nutrient deficiency,temperature stress,restart,rehydration,yeast selection,killer factor",
  },
};

// Extract full text from a PDF using pdfjs-dist. Concatenates every page.
async function extractPdfText(path) {
  const data = new Uint8Array(readFileSync(path));
  const doc = await pdfjsLib.getDocument({ data, standardFontDataUrl: null, verbosity: 0 }).promise;
  const pages = [];
  for (let i = 1; i <= doc.numPages; i++) {
    const p = await doc.getPage(i);
    const tc = await p.getTextContent();
    const pageText = tc.items.map((item) => (item.str || "").trim()).filter(Boolean).join(" ");
    pages.push(pageText);
  }
  return pages.join("\n\n").replace(/\s+/g, " ").trim();
}

// Chunk a long string into 500–800-word passages, preferring paragraph
// breaks (double newline or sentence boundary near the target size).
function chunkText(text, targetWords = MAX_CHUNK_WORDS, minWords = MIN_CHUNK_WORDS) {
  const words = text.split(/\s+/);
  const chunks = [];
  let cursor = 0;
  while (cursor < words.length) {
    const end = Math.min(cursor + targetWords, words.length);
    // Extend to next sentence-ish boundary if we haven't hit the end.
    let cut = end;
    if (end < words.length) {
      for (let j = end; j < Math.min(end + 60, words.length); j++) {
        if (/[.!?]$/.test(words[j])) { cut = j + 1; break; }
      }
    }
    const slice = words.slice(cursor, cut).join(" ").trim();
    if (slice.split(/\s+/).length < minWords && chunks.length > 0) {
      // Merge tiny tail into the last chunk.
      chunks[chunks.length - 1] = `${chunks[chunks.length - 1]} ${slice}`.trim();
    } else if (slice.length > 0) {
      chunks.push(slice);
    }
    cursor = cut;
  }
  return chunks;
}

async function main() {
  const dbUrl = process.env.DATABASE_URL;
  if (!dbUrl) {
    console.error("DATABASE_URL not set");
    process.exit(1);
  }
  const conn = await mysql.createConnection(dbUrl);

  const files = readdirSync(REFS_DIR).filter((f) => extname(f) === ".pdf");
  console.log(`[Ingest] Found ${files.length} PDFs in ${REFS_DIR}`);

  // Wipe any prior AWRI ingest so re-runs are idempotent.
  const [del] = await conn.execute(
    "DELETE FROM diy_knowledge_chunks WHERE source_doc LIKE 'awri_%'"
  );
  console.log(`[Ingest] Cleared ${del.affectedRows} existing AWRI chunks`);

  let totalChunks = 0;

  for (const filename of files) {
    const meta = FACT_SHEETS[filename];
    if (!meta) {
      console.warn(`[Ingest] Skipping ${filename} — no metadata mapping`);
      continue;
    }

    const sourceDoc = `awri_${basename(filename, ".pdf").replace(/-/g, "_")}`;
    const path = join(REFS_DIR, filename);
    console.log(`\n[Ingest] Reading ${filename} …`);
    try {
      const stat = readFileSync(path);
      if (stat.length === 0) {
        console.warn(`[Ingest]   ⚠ 0-byte placeholder — skipping`);
        continue;
      }
    } catch (e) {
      console.warn(`[Ingest]   ⚠ cannot read: ${e.message} — skipping`);
      continue;
    }
    let fullText;
    try {
      fullText = await extractPdfText(path);
    } catch (e) {
      console.warn(`[Ingest]   ⚠ PDF parse failed: ${e.message} — skipping`);
      continue;
    }
    if (!fullText || fullText.length < 200) {
      console.warn(`[Ingest]   ⚠ empty/tiny extraction (${fullText.length} chars) — skipping`);
      continue;
    }
    const chunks = chunkText(fullText);
    console.log(`[Ingest]   → ${fullText.length} chars → ${chunks.length} chunk(s)`);

    for (let i = 0; i < chunks.length; i++) {
      const chunkTitle = chunks.length === 1
        ? meta.canonicalTitle
        : `${meta.canonicalTitle} — Part ${i + 1}/${chunks.length}`;
      await conn.execute(
        `INSERT INTO diy_knowledge_chunks
          (source_doc, wine_type, chapter_ref, chapter_title, topic_tags, content, chunk_index,
           wbs_domain, wbs_process_family, wbs_code, published, published_at, created_at)
         VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, 1, ?, ?)`,
        [
          sourceDoc,
          meta.wineType,
          String(i + 1),
          chunkTitle,
          meta.topicTags,
          chunks[i],
          i,
          meta.wbsDomain,
          meta.wbsProcessFamily,
          meta.wbsCode,
          Date.now(),
          Date.now(),
        ]
      );
      totalChunks++;
    }
    console.log(`[Ingest]   ✓ inserted ${chunks.length} chunks as ${sourceDoc}`);
  }

  console.log(`\n[Ingest] Complete — ${totalChunks} AWRI chunks loaded across ${files.length} fact sheets (all published)`);
  await conn.end();
}

main().catch((e) => { console.error(e); process.exit(1); });
