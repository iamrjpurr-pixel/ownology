/**
 * Export all 38 SOPs from sop_library → Markdown + PDF.
 *
 * Usage:
 *   node scripts/export-sops.mjs
 *
 * Outputs:
 *   /app/exports/sops-library-YYYY-MM-DD.md
 *   /app/exports/sops-library-YYYY-MM-DD.pdf
 */

import mysql from "mysql2/promise";
import fs from "fs/promises";
import { createWriteStream } from "fs";
import path from "path";
import { fileURLToPath } from "url";
import PDFDocument from "pdfkit";
import "dotenv/config";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const EXPORT_DIR = path.resolve(__dirname, "..", "exports");

const today = new Date().toISOString().slice(0, 10);
const mdPath = path.join(EXPORT_DIR, `sops-library-${today}.md`);
const pdfPath = path.join(EXPORT_DIR, `sops-library-${today}.pdf`);

async function main() {
  await fs.mkdir(EXPORT_DIR, { recursive: true });

  const conn = await mysql.createConnection(process.env.DATABASE_URL);
  const [rows] = await conn.query(`
    SELECT id, category, sort_order, title, procedure_text,
           decision_logic, tribal_knowledge, csu_subject_ref, quick_steps
    FROM sop_library
    ORDER BY category, sort_order
  `);
  await conn.end();

  // ── Render Markdown ──────────────────────────────────────────────────────
  const md = [];
  md.push(`# Ownology — SOP Library`);
  md.push(``);
  md.push(`> Standard Operating Procedures library — ${rows.length} SOPs across ${new Set(rows.map(r => r.category)).size} categories.`);
  md.push(`> Generated ${new Date().toISOString().slice(0, 10)} from the Ownology production database.`);
  md.push(``);
  md.push(`## Table of Contents`);
  md.push(``);
  const cats = {};
  for (const r of rows) (cats[r.category] ??= []).push(r);
  for (const cat of Object.keys(cats).sort()) {
    md.push(`- **${cat}** (${cats[cat].length})`);
    for (const r of cats[cat]) md.push(`  - ${r.title}`);
  }
  md.push(``);
  md.push(`---`);
  md.push(``);

  for (const cat of Object.keys(cats).sort()) {
    md.push(`# ${cat}`);
    md.push(``);
    for (const r of cats[cat]) {
      md.push(`## ${r.title}`);
      if (r.csu_subject_ref) md.push(`**CSU Reference:** ${r.csu_subject_ref}  `);
      md.push(``);
      if (r.quick_steps) {
        md.push(`### Cellar-ready quick steps`);
        md.push(r.quick_steps.trim());
        md.push(``);
      }
      if (r.procedure_text) {
        md.push(`### Full procedure`);
        md.push(r.procedure_text.trim());
        md.push(``);
      }
      if (r.decision_logic) {
        md.push(`### Decision logic — why this approach`);
        md.push(r.decision_logic.trim());
        md.push(``);
      }
      if (r.tribal_knowledge) {
        md.push(`### Tribal knowledge — equipment, supplier, site notes`);
        md.push(r.tribal_knowledge.trim());
        md.push(``);
      }
      md.push(`---`);
      md.push(``);
    }
  }

  const markdown = md.join("\n");
  await fs.writeFile(mdPath, markdown, "utf8");
  console.log(`✓ Markdown written: ${mdPath} (${(markdown.length / 1024).toFixed(1)} KB)`);

  // ── Render PDF ───────────────────────────────────────────────────────────
  await new Promise((resolve, reject) => {
    const doc = new PDFDocument({
      size: "A4",
      margin: 56,
      info: {
        Title: "Ownology — SOP Library",
        Author: "Ownology",
        Subject: "Standard Operating Procedures for boutique winemaking",
        CreationDate: new Date(),
      },
    });
    const stream = doc.pipe(createWriteStream(pdfPath));

    // Cover
    doc.fontSize(28).text("Ownology", { align: "left" });
    doc.fontSize(20).fillColor("#b45309").text("SOP Library", { align: "left" });
    doc.moveDown(0.5);
    doc.fontSize(11).fillColor("#374151").text(
      `Standard Operating Procedures library — ${rows.length} SOPs across ${Object.keys(cats).length} categories. Generated ${new Date().toISOString().slice(0, 10)}.`,
      { align: "left", lineGap: 2 }
    );
    doc.moveDown(1);
    doc.fontSize(9).fillColor("#6b7280").text(
      "Confidential — Ownology IP. Use within your winery operation only. Do not redistribute.",
      { align: "left" }
    );

    // Table of contents
    doc.addPage();
    doc.fontSize(18).fillColor("#111827").text("Table of Contents");
    doc.moveDown(0.5);
    for (const cat of Object.keys(cats).sort()) {
      doc.fontSize(12).fillColor("#b45309").text(cat);
      for (const r of cats[cat]) {
        doc.fontSize(10).fillColor("#374151").text(`    · ${r.title}`, { lineGap: 1 });
      }
      doc.moveDown(0.3);
    }

    // Per-SOP pages
    for (const cat of Object.keys(cats).sort()) {
      doc.addPage();
      doc.fontSize(22).fillColor("#b45309").text(cat);
      doc.moveDown(0.5);

      for (const r of cats[cat]) {
        // Page break if running low
        if (doc.y > 700) doc.addPage();
        doc.fontSize(15).fillColor("#111827").text(r.title);
        if (r.csu_subject_ref) {
          doc.fontSize(9).fillColor("#6b7280").text(`CSU Reference: ${r.csu_subject_ref}`);
        }
        doc.moveDown(0.3);

        const section = (label, text) => {
          if (!text) return;
          doc.fontSize(10).fillColor("#b45309").text(label.toUpperCase(), { characterSpacing: 1 });
          doc.fontSize(10).fillColor("#1f2937").text(text.trim(), { lineGap: 2 });
          doc.moveDown(0.4);
        };

        section("Cellar-ready quick steps", r.quick_steps);
        section("Full procedure", r.procedure_text);
        section("Decision logic — why this approach", r.decision_logic);
        section("Tribal knowledge", r.tribal_knowledge);
        doc.moveDown(0.5);
        doc
          .strokeColor("#e5e7eb")
          .moveTo(56, doc.y)
          .lineTo(539, doc.y)
          .stroke();
        doc.moveDown(0.5);
      }
    }

    doc.end();
    stream.on("finish", resolve);
    stream.on("error", reject);
  });
  console.log(`✓ PDF written: ${pdfPath}`);
  console.log(``);
  console.log(`Open in browser/Finder/Explorer:`);
  console.log(`  ${mdPath}`);
  console.log(`  ${pdfPath}`);
}

main().catch((e) => {
  console.error("Export failed:", e);
  process.exit(1);
});
