/**
 * Compliance Audit Trail PDF
 *
 * Server-side PDF generation using pdfkit. Filters vintage_log_entries to
 * compliance-relevant events (SO2, YAN, additions, racking, inoculation)
 * and produces a regulator-ready document with timestamps + reasoning.
 *
 * Value-engineering check: 4/5 — pure data composition. No LLM cost.
 * Trust signal: regulator turns up → tap → done.
 *
 * Exposed via Express handler at GET /api/compliance/audit-trail.pdf
 * (NOT tRPC — needs binary response, easier as raw Express).
 */
import type { Request, Response } from "express";
import PDFDocument from "pdfkit";
import { db } from "./db.js";
import * as schema from "../drizzle/schema.js";
import { eq, desc, gte, and } from "drizzle-orm";

const COMPLIANCE_RELEVANT_EVENT_TYPES = [
  "addition",
  "racking",
  "inoculation",
  "measurement",
];

const COMPLIANCE_KEYWORDS = [
  "so2", "so₂", "sulphite", "sulfite", "sulfur dioxide",
  "yan", "dap", "diammonium",
  "potassium metabisulfite", "kms",
  "alcohol", "abv", "brix",
  "ml", "malolactic",
  "ph", "ta", "titratable",
];

export async function generateAuditTrailPdf(req: Request, res: Response): Promise<void> {
  try {
    // For the auth-bypass world: just pull the seed-owner-001 user's entries.
    // When real auth lands, pull req.user.id instead.
    const [owner] = await db
      .select()
      .from(schema.users)
      .where(eq(schema.users.openId, "seed-owner-001"))
      .limit(1);

    if (!owner) {
      res.status(500).send("No owner user found");
      return;
    }

    // Multi-tenant Phase 2 — pull the owner's winery for branded headers.
    // Falls back gracefully when the user has no membership.
    const winery = owner.wineryId
      ? await db.query.wineries.findFirst({
          where: eq(schema.wineries.id, owner.wineryId),
        })
      : null;
    const wineryName = winery?.name ?? owner.name ?? "—";
    const wineryRegion = winery?.region ?? null;
    const brandColor = winery?.brandColor && /^#([0-9a-f]{3}|[0-9a-f]{6})$/i.test(winery.brandColor)
      ? winery.brandColor
      : "#000000";

    // ── Filter parameters ────────────────────────────────────────────────
    const days = parseInt((req.query.days as string) ?? "365", 10);
    const sinceMs = Date.now() - days * 86400 * 1000;

    const rows = await db
      .select()
      .from(schema.vintageLogEntries)
      .where(
        and(
          eq(schema.vintageLogEntries.userId, owner.id),
          gte(schema.vintageLogEntries.entryAt, sinceMs)
        )
      )
      .orderBy(desc(schema.vintageLogEntries.entryAt));

    // Filter to compliance-relevant entries (by event type OR keyword)
    const relevant = rows.filter((r) => {
      if (COMPLIANCE_RELEVANT_EVENT_TYPES.includes(r.eventType)) return true;
      const blob = `${r.detailsJson ?? ""} ${r.noteText ?? ""}`.toLowerCase();
      return COMPLIANCE_KEYWORDS.some((k) => blob.includes(k));
    });

    // ── Try to fetch the winery logo bytes (best-effort, 3s budget) ─────
    // We embed the PNG/JPG bytes directly so the PDF renders offline. If
    // the URL is missing, malformed, or fails to fetch in 3s, we skip.
    let logoBuffer: Buffer | null = null;
    if (winery?.logoUrl && /^https:\/\//i.test(winery.logoUrl)) {
      try {
        const ctrl = new AbortController();
        const timer = setTimeout(() => ctrl.abort(), 3000);
        const resp = await fetch(winery.logoUrl, { signal: ctrl.signal });
        clearTimeout(timer);
        if (resp.ok) {
          const ct = (resp.headers.get("content-type") || "").toLowerCase();
          // pdfkit only supports PNG and JPEG. SVG / WebP are skipped.
          if (ct.includes("png") || ct.includes("jpeg") || ct.includes("jpg")) {
            const ab = await resp.arrayBuffer();
            if (ab.byteLength <= 2_000_000) {
              logoBuffer = Buffer.from(ab);
            }
          }
        }
      } catch {
        // Network blip / abort / bad URL — silently skip; the export still works.
      }
    }

    // ── Build PDF ────────────────────────────────────────────────────────
    const doc = new PDFDocument({ size: "A4", margins: { top: 60, bottom: 60, left: 60, right: 60 } });
    res.setHeader("Content-Type", "application/pdf");
    res.setHeader(
      "Content-Disposition",
      `attachment; filename="ownology-audit-trail-${new Date().toISOString().slice(0, 10)}.pdf"`
    );
    doc.pipe(res);

    // Header — winery logo + name + brand-coloured rule
    let textStartX = 60;
    if (logoBuffer) {
      try {
        doc.image(logoBuffer, 60, 50, { fit: [60, 60] });
        textStartX = 130;
      } catch {
        // Decode failure — render text-only header.
      }
    }
    doc.fontSize(20).fillColor(brandColor).text(wineryName, textStartX, 56);
    doc.fontSize(10).fillColor("#555").text("Compliance Audit Trail", textStartX, 82);
    // Brand-coloured rule under the header
    doc.moveTo(60, 120).lineTo(535, 120).strokeColor(brandColor).lineWidth(2).stroke();
    doc.y = 132;
    doc.fontSize(10).fillColor("#555");
    if (wineryRegion) doc.text(`Region: ${wineryRegion}`);
    doc.text(`Period: last ${days} days · From ${new Date(sinceMs).toLocaleDateString("en-AU")} to ${new Date().toLocaleDateString("en-AU")}`);
    doc.text(`Total entries: ${rows.length} · Compliance-relevant: ${relevant.length}`);
    doc.text(`Generated: ${new Date().toLocaleString("en-AU")}`);
    doc.moveDown(0.8);

    doc.fontSize(9).fillColor("#777").text(
      "This document is a chronological record of compliance-relevant cellar activity recorded in the Ownology platform. " +
      "Filters applied: event types (addition, racking, inoculation, measurement) AND keyword match on regulated topics " +
      "(SO₂, YAN, DAP, ABV, pH, TA, MLF). Each entry includes the operator's recorded reasoning where captured."
    );
    doc.moveDown(1);

    // Entry list
    doc.fontSize(11).fillColor("#000");
    if (relevant.length === 0) {
      doc.text("No compliance-relevant entries in this period.");
    } else {
      for (const r of relevant) {
        const date = new Date(r.entryAt).toLocaleString("en-AU", {
          dateStyle: "medium",
          timeStyle: "short",
        });
        const details: Record<string, unknown> = (() => {
          try { return JSON.parse(r.detailsJson ?? "{}") as Record<string, unknown>; } catch { return {}; }
        })();
        const reasoning = typeof details.reasoning === "string" ? details.reasoning : "";
        const detailLine = Object.entries(details)
          .filter(([k, v]) => k !== "reasoning" && v !== null && v !== undefined && v !== "")
          .map(([k, v]) => `${k}: ${v}`)
          .join(" · ");

        doc.fillColor("#000").fontSize(10).text(`${date}`, { continued: true });
        doc.fillColor("#555").text(`  ·  ${r.tankName}  ·  ${r.variety}  ·  ${r.eventType}`);

        if (detailLine) {
          doc.fillColor("#333").fontSize(9).text(detailLine, { indent: 12 });
        }
        if (r.noteText) {
          doc.fillColor("#444").fontSize(9).text(`Note: ${r.noteText}`, { indent: 12 });
        }
        if (reasoning) {
          doc.fillColor("#7a4a00").fontSize(9).text(`Reasoning: ${reasoning}`, { indent: 12 });
        }
        doc.moveDown(0.4);
      }
    }

    // Footer
    doc.moveDown(1);
    doc.fontSize(8).fillColor("#888").text(
      `${wineryName} — generated by Ownology Cellar Intelligence Platform. ` +
      `Page-by-page audit trail of compliance-relevant cellar activity.`,
      { align: "center" }
    );

    doc.end();
  } catch (err) {
    console.error("[audit-trail] PDF generation failed:", err);
    res.status(500).send("Failed to generate audit trail PDF.");
  }
}
