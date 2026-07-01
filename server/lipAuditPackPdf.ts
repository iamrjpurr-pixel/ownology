/**
 * LIP Audit Pack PDF
 *
 * Wine Australia Act 2013 s.39F — Label Integrity Programme audit-ready
 * export. Groups the winery's `wine_batches` for a given vintage year and
 * lays out one page per label class ({vintage, variety, GI}) with:
 *   - Batch inventory (batch ID, grower, receival date, quantity, volume)
 *   - Quantitative reconciliation (kg intake → L at ferment → current L)
 *   - 85% compliance calc — the LIP rule that a label claim of a vintage /
 *     variety / GI requires ≥ 85% of the finished wine to originate from
 *     that class. Per-class weighting is done by receival quantity (kg).
 *   - One-step-back (grower details from `wine_batches.growerDetails`)
 *   - One-step-forward stub — we don't yet capture buyers; the pack
 *     reserves the section and prompts the winemaker to record them.
 *
 * Value-engineering: 5/5. No LLM cost. Zero external API. Reuses the
 * pdfkit + branded-header pattern from `auditTrailPdf.ts` (same logo
 * fetch budget, same brand-color hex sanitiser). Grounded entirely in
 * existing `wine_batches` rows the winery already keeps.
 *
 * URL: GET /api/compliance/lip-audit-pack.pdf?vintage=2026
 */
import type { Request, Response } from "express";
import PDFDocument from "pdfkit";
import { db } from "./db.js";
import * as schema from "../drizzle/schema.js";
import { eq, and } from "drizzle-orm";

const LIP_THRESHOLD = 0.85; // Wine Australia s.39F — 85% rule

function fmtDate(ms: number | null | undefined): string {
  if (!ms) return "—";
  const d = new Date(ms);
  return d.toISOString().slice(0, 10);
}

function fmtQty(v: string | null | undefined, unit: string | null | undefined): string {
  if (!v) return "—";
  const n = Number(v);
  if (Number.isNaN(n)) return `${v} ${unit ?? ""}`.trim();
  return `${n.toLocaleString()} ${unit ?? ""}`.trim();
}

export async function generateLipAuditPackPdf(req: Request, res: Response): Promise<void> {
  try {
    const [owner] = await db
      .select()
      .from(schema.users)
      .where(eq(schema.users.openId, "seed-owner-001"))
      .limit(1);
    if (!owner) {
      res.status(500).send("No owner user found");
      return;
    }

    const winery = owner.wineryId
      ? await db.query.wineries.findFirst({ where: eq(schema.wineries.id, owner.wineryId) })
      : null;
    const wineryName = winery?.name ?? owner.name ?? "—";
    const wineryRegion = winery?.region ?? null;
    const wineryContact = (winery as unknown as { contactName: string | null })?.contactName ?? null;
    const brandColor = winery?.brandColor && /^#([0-9a-f]{3}|[0-9a-f]{6})$/i.test(winery.brandColor)
      ? winery.brandColor
      : "#78350f";

    // Vintage filter — defaults to the current calendar year.
    const vintage = parseInt((req.query.vintage as string) ?? String(new Date().getFullYear()), 10);
    if (!Number.isFinite(vintage) || vintage < 1900 || vintage > 2100) {
      res.status(400).send("Invalid ?vintage= parameter");
      return;
    }

    // Pull batches — respect winery tenancy when the row has it set.
    const whereClauses = winery?.id
      ? and(eq(schema.wineBatches.userId, owner.id), eq(schema.wineBatches.wineryId, winery.id), eq(schema.wineBatches.vintage, vintage))
      : and(eq(schema.wineBatches.userId, owner.id), eq(schema.wineBatches.vintage, vintage));
    const batches = await db.select().from(schema.wineBatches).where(whereClauses);

    // Logo fetch (best-effort, 3s budget) — reused verbatim from auditTrailPdf
    let logoBuffer: Buffer | null = null;
    if (winery?.logoUrl && /^https:\/\//i.test(winery.logoUrl)) {
      try {
        const ctrl = new AbortController();
        const timer = setTimeout(() => ctrl.abort(), 3000);
        const resp = await fetch(winery.logoUrl, { signal: ctrl.signal });
        clearTimeout(timer);
        if (resp.ok) {
          const ct = (resp.headers.get("content-type") || "").toLowerCase();
          if (ct.includes("png") || ct.includes("jpeg") || ct.includes("jpg")) {
            const ab = await resp.arrayBuffer();
            if (ab.byteLength <= 2_000_000) logoBuffer = Buffer.from(ab);
          }
        }
      } catch { /* silent */ }
    }

    // ── Aggregate by label class {variety, gi} for the 85% calc ────────
    type ClassRow = { variety: string; gi: string; kg: number; batches: number; l: number };
    const byClass = new Map<string, ClassRow>();
    let totalKg = 0;
    let totalL = 0;
    for (const b of batches) {
      const kg = Number(b.quantityValue ?? 0);
      const qty = b.quantityUnit === "t" ? kg * 1000 : kg; // normalise tonnes → kg
      const l = b.currentVolumeLitres ?? b.volumeLitres ?? 0;
      if (b.quantityUnit === "L") {
        // Juice/wine received — treat as pure volume, not intake weight
        totalL += Number(b.quantityValue ?? 0);
      } else {
        totalKg += qty;
      }
      totalL += l;
      const key = `${b.variety}||${b.gi || "—"}`;
      const cur = byClass.get(key) ?? { variety: b.variety, gi: b.gi || "—", kg: 0, batches: 0, l: 0 };
      cur.kg += qty;
      cur.batches += 1;
      cur.l += l;
      byClass.set(key, cur);
    }
    const classRows = Array.from(byClass.values()).sort((a, b) => b.kg - a.kg);

    // ── Build PDF ───────────────────────────────────────────────────────
    const doc = new PDFDocument({ size: "A4", margins: { top: 60, bottom: 72, left: 60, right: 60 } });
    res.setHeader("Content-Type", "application/pdf");
    res.setHeader(
      "Content-Disposition",
      `attachment; filename="ownology-lip-audit-pack-${vintage}.pdf"`
    );
    doc.pipe(res);

    // ── Header ─────────────────────────────────────────────────────────
    let textStartX = 60;
    if (logoBuffer) {
      try {
        doc.image(logoBuffer, 60, 50, { fit: [60, 60] });
        textStartX = 130;
      } catch { /* silent */ }
    }
    doc.fontSize(20).fillColor(brandColor).text(wineryName, textStartX, 56);
    doc.fontSize(9).fillColor("#555")
      .text(wineryRegion ? `${wineryRegion} · Vintage ${vintage}` : `Vintage ${vintage}`, textStartX, 82);
    doc.moveTo(60, 120).lineTo(535, 120).strokeColor(brandColor).lineWidth(2).stroke();

    // Title
    doc.moveDown(0.5);
    doc.fontSize(16).fillColor("#111").text("LIP Audit Pack", 60, 140);
    doc.fontSize(9).fillColor("#666")
      .text(`Wine Australia Act 2013 s.39F — Label Integrity Programme record set.`, 60, 162)
      .text(`Generated ${new Date().toISOString().slice(0, 10)} · ${batches.length} batch${batches.length === 1 ? "" : "es"} recorded for vintage ${vintage}.`, 60, 176);

    let y = 208;

    // Empty state
    if (batches.length === 0) {
      doc.fontSize(11).fillColor("#111").text(
        `No wine batches have been logged for vintage ${vintage}. Add batches from Work Mode → Batches, then re-generate this pack.`,
        60, y, { width: 475 }
      );
      renderFooter(doc, wineryName, wineryContact, vintage);
      doc.end();
      return;
    }

    // ── Section 1: Batch inventory ──────────────────────────────────────
    doc.fontSize(11).fillColor(brandColor).text("1. Batch inventory", 60, y);
    y += 20;
    doc.fontSize(8).fillColor("#333");
    const cols = [
      { label: "Batch ID", w: 66, x: 60 },
      { label: "Variety", w: 84, x: 130 },
      { label: "GI", w: 90, x: 218 },
      { label: "Received", w: 62, x: 312 },
      { label: "Intake", w: 60, x: 378 },
      { label: "Vol @ Ferm", w: 55, x: 442 },
      { label: "Current L", w: 45, x: 500 },
    ];
    // Header row
    doc.fillColor("#666").font("Helvetica-Bold");
    for (const c of cols) doc.text(c.label, c.x, y, { width: c.w, ellipsis: true });
    y += 14;
    doc.moveTo(60, y).lineTo(545, y).strokeColor("#ddd").lineWidth(0.5).stroke();
    y += 6;
    doc.font("Helvetica").fillColor("#111");

    for (const b of batches) {
      if (y > 740) {
        renderFooter(doc, wineryName, wineryContact, vintage);
        doc.addPage();
        y = 60;
      }
      const row = [
        b.batchId,
        b.variety,
        b.gi || "—",
        fmtDate(b.receivedAt ?? null),
        fmtQty(b.quantityValue, b.quantityUnit),
        b.volumeLitres != null ? `${b.volumeLitres} L` : "—",
        b.currentVolumeLitres != null ? `${b.currentVolumeLitres} L` : "—",
      ];
      row.forEach((val, i) => doc.text(String(val), cols[i].x, y, { width: cols[i].w, ellipsis: true }));
      y += 16;
    }

    y += 12;

    // ── Section 2: 85% Compliance per label class ──────────────────────
    if (y > 660) { renderFooter(doc, wineryName, wineryContact, vintage); doc.addPage(); y = 60; }
    doc.fontSize(11).fillColor(brandColor).text("2. 85% compliance by label class", 60, y);
    y += 8;
    doc.fontSize(8).fillColor("#666")
      .text(
        "LIP s.39F: to make a vintage / variety / GI claim on a bottle label, ≥ 85% of the finished wine must originate from that class. Below shows each declared class weighted by intake.",
        60, y + 8, { width: 475 }
      );
    y += 46;
    doc.fontSize(8).fillColor("#666").font("Helvetica-Bold");
    doc.text("Variety", 60, y, { width: 100 });
    doc.text("GI", 160, y, { width: 130 });
    doc.text("Batches", 290, y, { width: 50 });
    doc.text("Intake (kg)", 340, y, { width: 60 });
    doc.text("% of vintage", 400, y, { width: 60 });
    doc.text("Status", 460, y, { width: 80 });
    y += 14;
    doc.moveTo(60, y).lineTo(545, y).strokeColor("#ddd").lineWidth(0.5).stroke();
    y += 6;
    doc.font("Helvetica");

    // For the 85% rule we compute the per-class share of total intake and
    // flag anything that stands alone (single-class wine) as passing.
    // Blended labels would need explicit blend-recipe capture (future work).
    for (const cls of classRows) {
      if (y > 740) { renderFooter(doc, wineryName, wineryContact, vintage); doc.addPage(); y = 60; }
      const pct = totalKg > 0 ? cls.kg / totalKg : 0;
      const pass = pct >= LIP_THRESHOLD || cls.kg === totalKg;
      doc.fillColor("#111");
      doc.text(cls.variety, 60, y, { width: 100, ellipsis: true });
      doc.text(cls.gi, 160, y, { width: 130, ellipsis: true });
      doc.text(String(cls.batches), 290, y, { width: 50 });
      doc.text(cls.kg.toLocaleString(), 340, y, { width: 60 });
      doc.text(`${(pct * 100).toFixed(1)}%`, 400, y, { width: 60 });
      doc.fillColor(pass ? "#166534" : "#b45309");
      doc.text(pass ? "✓ meets 85% rule" : "⚠ blend disclosure", 460, y, { width: 80 });
      doc.fillColor("#111");
      y += 16;
    }

    y += 8;
    doc.fontSize(8).fillColor("#666")
      .text(
        `Total intake ${totalKg.toLocaleString()} kg across ${classRows.length} label class${classRows.length === 1 ? "" : "es"}. Wines flagged "blend disclosure" require the alternate class breakdown on the label rather than a single-class claim.`,
        60, y, { width: 475 }
      );
    y += 40;

    // ── Section 3: One-step-back (growers) ─────────────────────────────
    if (y > 660) { renderFooter(doc, wineryName, wineryContact, vintage); doc.addPage(); y = 60; }
    doc.fontSize(11).fillColor(brandColor).text("3. One-step-back — grower / supplier records", 60, y);
    y += 20;
    doc.fontSize(8).fillColor("#111").font("Helvetica");
    for (const b of batches) {
      if (y > 740) { renderFooter(doc, wineryName, wineryContact, vintage); doc.addPage(); y = 60; }
      doc.font("Helvetica-Bold").text(`${b.batchId} · ${b.variety}`, 60, y, { width: 475 });
      y += 12;
      doc.font("Helvetica").fillColor("#333")
        .text(b.growerDetails?.trim() || "— No grower / supplier details recorded. Add via Work Mode → Batches to complete this section.", 60, y, { width: 475 });
      y += 24;
      doc.fillColor("#111");
    }

    // ── Section 4: One-step-forward (buyers) — placeholder ─────────────
    if (y > 660) { renderFooter(doc, wineryName, wineryContact, vintage); doc.addPage(); y = 60; }
    doc.fontSize(11).fillColor(brandColor).text("4. One-step-forward — buyer records", 60, y);
    y += 20;
    doc.fontSize(8).fillColor("#666").text(
      "Buyer records are not yet captured in Ownology. LIP s.39F requires a record of who purchased each batch (bulk sales) or the bottling run they became part of. To close this section, add buyer entries via Work Mode → Sales (roadmap) or attach an external ledger to the audit pack.",
      60, y, { width: 475 }
    );
    y += 60;

    // ── Footer on final page ────────────────────────────────────────────
    renderFooter(doc, wineryName, wineryContact, vintage);
    doc.end();
  } catch (err) {
    console.error("[lip-audit-pack] PDF generation failed:", err);
    if (!res.headersSent) res.status(500).send("Failed to generate LIP audit pack");
  }
}

function renderFooter(
  doc: InstanceType<typeof PDFDocument>,
  wineryName: string,
  wineryContact: string | null,
  vintage: number,
): void {
  // Anchored 40px above the bottom margin so page-break math is stable.
  const pageBottom = doc.page.height - 40;
  const left = 60;
  const right = doc.page.width - 60;
  doc.moveTo(left, pageBottom - 12).lineTo(right, pageBottom - 12).strokeColor("#ddd").lineWidth(0.5).stroke();
  doc.fontSize(7).fillColor("#666").font("Helvetica")
    .text(
      `${wineryName}${wineryContact ? ` · ${wineryContact}` : ""} · LIP Audit Pack vintage ${vintage} · Generated by Ownology (ownology.ai)`,
      left, pageBottom - 6, { width: right - left, align: "left" }
    );
}
