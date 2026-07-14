/**
 * Cellar Book PDF (Batch Equipment Traceability)
 *
 * FSANZ 3.2.2 audit-defensible: a single deliverable that lists every
 * vessel a batch touched, in chronological order, with a sanitation
 * snapshot captured at the moment of use. This is the sheet a FSANZ
 * or Wine Australia auditor asks for during a site visit.
 *
 * Source of truth: `batch_equipment_uses` (event log — never edited)
 * joined loosely with `wine_batches` for the header and `cellar_equipment`
 * for the type/material. Sanitation status was snapshotted server-side
 * when the use was logged (sanitiseOkAtUse + sanitiseAgeHours), so the
 * PDF prints exactly what was true at the time.
 *
 * Value-engineering: 5/5. No LLM cost, no external API, reuses the
 * pdfkit + branded-header pattern from lipAuditPackPdf.ts.
 *
 * URL: GET /api/compliance/cellar-book.pdf?batchId=<int>
 */
import type { Request, Response } from "express";
import PDFDocument from "pdfkit";
import { db } from "./db.js";
import * as schema from "../drizzle/schema.js";
import { eq, and, asc } from "drizzle-orm";

function fmtDateTime(ms: number | null | undefined): string {
  if (!ms) return "—";
  return new Date(ms).toLocaleString("en-AU", { dateStyle: "medium", timeStyle: "short" });
}

function fmtDate(ms: number | null | undefined): string {
  if (!ms) return "—";
  return new Date(ms).toLocaleDateString("en-AU", { day: "2-digit", month: "short", year: "numeric" });
}

const PHASE_LABEL: Record<string, string> = {
  receival: "1. Receival",
  crushing: "2. Crushing",
  fermentation: "3. Fermentation",
  pressing_transfer: "4. Pressing & Transfer",
  storage_ageing: "5. Storage & Ageing",
  bottling: "6. Bottling",
  other: "Other",
};

const DIRECTION_LABEL: Record<string, string> = {
  in: "In",
  out: "Out",
  pass: "Pass-through",
  note: "Note",
};

export async function generateCellarBookPdf(
  req: Request,
  res: Response,
  opts?: { forceOwnerUserId?: number; forceBatchId?: number }
): Promise<void> {
  try {
    const batchIdRaw = req.query.batchId as string | undefined;
    const batchIdNum = opts?.forceBatchId ?? (batchIdRaw ? parseInt(batchIdRaw, 10) : NaN);
    if (!Number.isFinite(batchIdNum) || batchIdNum <= 0) {
      res.status(400).send("Missing or invalid ?batchId= parameter");
      return;
    }

    // Token flow: opts.forceOwnerUserId is set by the token-checking wrapper.
    // Cookie/gate flow: fall back to seed-owner-001 (matches audit-trail + LIP
    // audit pack). When per-user auth lands, swap to req.user.id.
    let ownerRow: { id: number; wineryId: number | null; name: string | null } | null = null;
    if (opts?.forceOwnerUserId) {
      const [u] = await db
        .select({ id: schema.users.id, wineryId: schema.users.wineryId, name: schema.users.name })
        .from(schema.users)
        .where(eq(schema.users.id, opts.forceOwnerUserId))
        .limit(1);
      ownerRow = u ?? null;
    } else {
      const [u] = await db
        .select({ id: schema.users.id, wineryId: schema.users.wineryId, name: schema.users.name })
        .from(schema.users)
        .where(eq(schema.users.openId, "seed-owner-001"))
        .limit(1);
      ownerRow = u ?? null;
    }
    if (!ownerRow) {
      res.status(500).send("No owner user found");
      return;
    }
    const owner = ownerRow;

    const winery = owner.wineryId
      ? await db.query.wineries.findFirst({ where: eq(schema.wineries.id, owner.wineryId) })
      : null;
    const wineryName = winery?.name ?? owner.name ?? "—";
    const wineryRegion = winery?.region ?? null;
    const brandColor = winery?.brandColor && /^#([0-9a-f]{3}|[0-9a-f]{6})$/i.test(winery.brandColor)
      ? winery.brandColor
      : "#78350f";

    // Batch header — scoped to owner so cross-tenant reads are impossible.
    const batch = await db.query.wineBatches.findFirst({
      where: and(
        eq(schema.wineBatches.id, batchIdNum),
        eq(schema.wineBatches.userId, owner.id)
      ),
    });
    if (!batch) {
      res.status(404).send("Batch not found");
      return;
    }

    // Chronological (ascending) touchpoints — auditor reads front-to-back.
    const uses = await db.query.batchEquipmentUses.findMany({
      where: and(
        eq(schema.batchEquipmentUses.batchId, batchIdNum),
        eq(schema.batchEquipmentUses.userId, owner.id)
      ),
      orderBy: [asc(schema.batchEquipmentUses.usedAt)],
    });

    // Pull the equipment rows referenced so we can annotate type/material.
    const equipmentIds = Array.from(new Set(uses.map((u) => u.equipmentId)));
    const equipmentRows = equipmentIds.length > 0
      ? await db.query.cellarEquipment.findMany({
          where: and(
            eq(schema.cellarEquipment.userId, owner.id),
          ),
        })
      : [];
    const equipmentById = new Map<number, typeof equipmentRows[number]>();
    for (const e of equipmentRows) equipmentById.set(e.id, e);

    // Best-effort logo fetch (3s budget) — verbatim from auditTrailPdf.
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

    // Aggregate sanitation stats for the summary block.
    const totalUses = uses.length;
    const sanitisedAtUseCount = uses.filter((u) => u.sanitiseOkAtUse === 1).length;
    const breachCount = uses.filter((u) =>
      u.sanitiseOkAtUse === 0 && (u.direction === "in" || u.direction === "pass")
    ).length;
    const uniqueVessels = new Set(uses.map((u) => u.equipmentId)).size;

    // ── Build PDF ───────────────────────────────────────────────────────
    const doc = new PDFDocument({ size: "A4", margins: { top: 60, bottom: 72, left: 60, right: 60 } });
    res.setHeader("Content-Type", "application/pdf");
    res.setHeader(
      "Content-Disposition",
      `attachment; filename="ownology-cellar-book-${batch.batchId}.pdf"`
    );
    doc.pipe(res);

    // ── Header (branded) ────────────────────────────────────────────────
    let textStartX = 60;
    if (logoBuffer) {
      try {
        doc.image(logoBuffer, 60, 50, { fit: [60, 60] });
        textStartX = 130;
      } catch { /* silent */ }
    }
    doc.fontSize(20).fillColor(brandColor).text(wineryName, textStartX, 56);
    doc.fontSize(10).fillColor("#555").text("Cellar Book — Batch Equipment Traceability", textStartX, 82);
    doc.moveTo(60, 120).lineTo(535, 120).strokeColor(brandColor).lineWidth(2).stroke();
    doc.y = 132;

    // ── Batch identity block ────────────────────────────────────────────
    doc.fontSize(13).fillColor("#000").text(
      `Batch ${batch.batchId}  ·  ${batch.vintage} ${batch.variety}${batch.gi ? `  ·  ${batch.gi}` : ""}`
    );
    doc.moveDown(0.4);
    doc.fontSize(9).fillColor("#555");
    if (wineryRegion) doc.text(`Winery region: ${wineryRegion}`);
    if (batch.growerDetails) doc.text(`Grower: ${batch.growerDetails}`);
    if (batch.tankName) doc.text(`Primary tank: ${batch.tankName}`);
    const qty = batch.quantityValue ? `${batch.quantityValue}${batch.quantityUnit ? ` ${batch.quantityUnit}` : ""}` : null;
    if (qty) doc.text(`Quantity received: ${qty}`);
    if (batch.volumeLitres) doc.text(`Volume at ferment: ${batch.volumeLitres.toLocaleString()} L`);
    if (batch.receivedAt) doc.text(`Received: ${fmtDate(batch.receivedAt)}`);
    doc.text(`Report generated: ${new Date().toLocaleString("en-AU")}`);
    doc.moveDown(0.8);

    // ── Sanitation summary ──────────────────────────────────────────────
    doc.fontSize(11).fillColor("#000").text("Sanitation summary");
    doc.moveDown(0.2);
    doc.fontSize(9).fillColor("#333");
    doc.text(`• Total equipment events logged: ${totalUses}`);
    doc.text(`• Unique vessels touched: ${uniqueVessels}`);
    doc.text(`• Events with sanitation-ok at use: ${sanitisedAtUseCount} of ${totalUses}`);
    if (breachCount > 0) {
      doc.fillColor("#7f1d1d").text(`• Sanitation breaches on wine contact: ${breachCount} — see flagged rows below.`);
    } else if (totalUses > 0) {
      doc.fillColor("#2f5230").text(`• Sanitation breaches on wine contact: 0`);
    }
    doc.fillColor("#333");
    doc.moveDown(0.6);

    doc.fontSize(9).fillColor("#777").text(
      "This document is a chronological record of every piece of cellar equipment this batch touched. " +
      "Each row is derived from the underlying event log (batch_equipment_uses) — the sanitation flag is a snapshot " +
      "captured at the moment of use, never edited afterwards. Rows flagged BREACH indicate the vessel had not been " +
      "sanitised within the freshness window at the point of wine contact."
    );
    doc.moveDown(0.8);

    // ── Chronological table ─────────────────────────────────────────────
    doc.fontSize(11).fillColor("#000").text("Chronological equipment log");
    doc.moveDown(0.3);

    if (uses.length === 0) {
      doc.fontSize(10).fillColor("#555").text(
        "No equipment uses have been logged for this batch yet. Log fill / rack / pass events on the Cellar Board or the batch's phase logger to populate this record."
      );
    } else {
      // Column header
      doc.fontSize(8).fillColor("#555");
      doc.text("DATE / TIME", 60, doc.y, { continued: true, width: 110 });
      doc.text("PHASE", { continued: true, width: 90 });
      doc.text("VESSEL", { continued: true, width: 130 });
      doc.text("DIR", { continued: true, width: 50 });
      doc.text("SANITATION", { width: 100 });
      doc.moveTo(60, doc.y + 2).lineTo(535, doc.y + 2).strokeColor("#ccc").lineWidth(0.5).stroke();
      doc.moveDown(0.4);

      for (const u of uses) {
        // Page-break guard — reserve room for a two-line row plus notes.
        if (doc.y > 720) doc.addPage();

        const eq = equipmentById.get(u.equipmentId);
        const vesselDesc = eq
          ? `${u.equipmentName} · ${eq.equipmentType.replace(/_/g, " ")}${eq.material ? ` · ${eq.material}` : ""}`
          : u.equipmentName;

        const sanitiseCell = (() => {
          if (u.sanitiseOkAtUse === 1) {
            const age = u.sanitiseAgeHours != null ? ` (${u.sanitiseAgeHours}h)` : "";
            return { text: `OK${age}`, color: "#2f5230" };
          }
          if (u.direction === "in" || u.direction === "pass") {
            const age = u.sanitiseAgeHours != null ? ` (age ${u.sanitiseAgeHours}h)` : " (no record)";
            return { text: `BREACH${age}`, color: "#7f1d1d" };
          }
          return { text: "—", color: "#555" };
        })();

        const rowY = doc.y;
        doc.fontSize(9).fillColor("#000");
        doc.text(fmtDateTime(u.usedAt), 60, rowY, { width: 110 });
        doc.fillColor("#333").text(PHASE_LABEL[u.phase] ?? u.phase, 170, rowY, { width: 90 });
        doc.fillColor("#000").text(vesselDesc, 260, rowY, { width: 130 });
        doc.fillColor("#333").text(DIRECTION_LABEL[u.direction] ?? u.direction, 390, rowY, { width: 50 });
        doc.fillColor(sanitiseCell.color).text(sanitiseCell.text, 440, rowY, { width: 95 });

        // Notes on their own indented line so they're clearly annotations.
        if (u.notes) {
          doc.fillColor("#444").fontSize(8).text(`Note: ${u.notes}`, 60, doc.y + 2, { width: 475, indent: 12 });
        }
        doc.moveDown(0.3);
      }
    }

    // ── Footer: signature block + provenance ───────────────────────────
    doc.moveDown(1.2);
    // Fresh page if the sig block would collide with the bottom margin.
    if (doc.y > 700) doc.addPage();

    doc.fontSize(10).fillColor("#000").text("Attestation");
    doc.moveDown(0.2);
    doc.fontSize(9).fillColor("#333").text(
      "I attest that the equipment uses recorded above are a true and complete record of every vessel this batch touched, and that sanitation status was captured at the moment of each use."
    );
    doc.moveDown(1.2);

    const sigY = doc.y;
    doc.fontSize(9).fillColor("#333");
    doc.moveTo(60, sigY + 22).lineTo(260, sigY + 22).strokeColor("#888").lineWidth(0.8).stroke();
    doc.text("Winemaker — signature & date", 60, sigY + 26);
    doc.moveTo(295, sigY + 22).lineTo(495, sigY + 22).strokeColor("#888").lineWidth(0.8).stroke();
    doc.text("Auditor — signature & date", 295, sigY + 26);
    doc.moveDown(3);

    doc.fontSize(8).fillColor("#888").text(
      `${wineryName} — Cellar Book generated by Ownology Cellar Intelligence Platform. ` +
      `FSANZ 3.2.2 audit-defensible: state computed from event log, never edited by hand.`,
      { align: "center" }
    );

    doc.end();
  } catch (err) {
    console.error("[cellar-book] PDF generation failed:", err);
    if (!res.headersSent) res.status(500).send("Failed to generate cellar book PDF.");
  }
}
