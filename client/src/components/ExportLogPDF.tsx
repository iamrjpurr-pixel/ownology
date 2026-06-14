/**
 * ExportLogPDF — DR-20 / DR-11
 * Generates a LIP-compliant Winemaker's Log PDF from the current log entries.
 * Uses browser-native print/save-as-PDF via a hidden print-optimised HTML page.
 * No server round-trip required — all data is already in the client.
 */
import { useState } from "react";
import { FileDown, Loader2 } from "lucide-react";

export interface LogEntryForExport {
  id: string | number;
  entryAt: number;
  tankName: string;
  variety: string;
  eventType: string;
  details: Record<string, unknown>;
  noteText?: string | null;
  tags: string[];
}

interface Props {
  entries: LogEntryForExport[];
  wineryName?: string;
  /** Optional: filter to a single tank */
  tankFilter?: string;
}

function formatDetails(eventType: string, d: Record<string, unknown>): string {
  if (eventType === "addition" && d.what) {
    return `${d.what}${d.quantity ? " — " + d.quantity + (d.unit ?? "") : ""}${d.timing ? " (" + d.timing + ")" : ""}`;
  }
  if (eventType === "measurement" && d.what) {
    return `${d.what}: ${d.value ?? ""}${d.unit ? " " + d.unit : ""}`;
  }
  if (eventType === "racking") {
    return `${d.fromLocation ?? "?"} → ${d.toLocation ?? "?"}${d.volumeL ? " · " + d.volumeL + " L" : ""}${d.leesStatus ? " · " + d.leesStatus : ""}`;
  }
  if (eventType === "inoculation" && d.what) {
    return `${d.what} · ${d.productName ?? ""}${d.rate ? " · " + d.rate + " g/hL" : ""}`;
  }
  if ((eventType === "observation" || eventType === "other") && d.text) {
    return String(d.text).slice(0, 300);
  }
  return Object.entries(d)
    .map(([k, v]) => `${k}: ${v}`)
    .join("; ");
}

function buildPrintHTML(
  entries: LogEntryForExport[],
  wineryName: string,
  tankFilter?: string
): string {
  const filtered = tankFilter
    ? entries.filter((e) => e.tankName === tankFilter)
    : entries;

  const sorted = [...filtered].sort((a, b) => a.entryAt - b.entryAt);

  // Group by tank
  const byTank: Record<string, LogEntryForExport[]> = {};
  for (const e of sorted) {
    if (!byTank[e.tankName]) byTank[e.tankName] = [];
    byTank[e.tankName].push(e);
  }

  const today = new Date().toLocaleDateString("en-AU", {
    day: "numeric",
    month: "long",
    year: "numeric",
  });

  const eventTypeLabel: Record<string, string> = {
    addition: "Addition",
    measurement: "Measurement",
    racking: "Racking",
    inoculation: "Inoculation",
    observation: "Observation",
    other: "Other",
  };

  const rows = Object.entries(byTank)
    .map(([tankName, tankEntries]) => {
      const variety = tankEntries[0]?.variety ?? "";
      const tableRows = tankEntries
        .map((e) => {
          const date = new Date(e.entryAt).toLocaleDateString("en-AU", {
            day: "2-digit",
            month: "2-digit",
            year: "numeric",
          });
          const detailText = formatDetails(e.eventType, e.details);
          const note = e.noteText ? `<em style="color:#555">${e.noteText}</em>` : "";
          return `<tr>
            <td style="white-space:nowrap;padding:5px 8px;border-bottom:1px solid #e8e0d4">${date}</td>
            <td style="padding:5px 8px;border-bottom:1px solid #e8e0d4;font-weight:600;color:#6b4c1e">${eventTypeLabel[e.eventType] ?? e.eventType}</td>
            <td style="padding:5px 8px;border-bottom:1px solid #e8e0d4">${detailText}</td>
            <td style="padding:5px 8px;border-bottom:1px solid #e8e0d4">${note}</td>
          </tr>`;
        })
        .join("");

      return `
        <div style="margin-bottom:32px;page-break-inside:avoid">
          <div style="background:#f7f2ec;border-left:4px solid #b87333;padding:8px 12px;margin-bottom:0">
            <span style="font-size:13px;font-weight:700;color:#3a2010;letter-spacing:0.04em">${tankName}</span>
            <span style="font-size:11px;color:#7a5c3a;margin-left:12px">${variety}</span>
            <span style="font-size:10px;color:#9a7a5a;margin-left:12px">${tankEntries.length} entr${tankEntries.length === 1 ? "y" : "ies"}</span>
          </div>
          <table style="width:100%;border-collapse:collapse;font-size:11px;font-family:Georgia,serif">
            <thead>
              <tr style="background:#ede6da">
                <th style="text-align:left;padding:6px 8px;font-size:10px;letter-spacing:0.06em;color:#6b4c1e;text-transform:uppercase;white-space:nowrap">Date</th>
                <th style="text-align:left;padding:6px 8px;font-size:10px;letter-spacing:0.06em;color:#6b4c1e;text-transform:uppercase">Type</th>
                <th style="text-align:left;padding:6px 8px;font-size:10px;letter-spacing:0.06em;color:#6b4c1e;text-transform:uppercase">Detail</th>
                <th style="text-align:left;padding:6px 8px;font-size:10px;letter-spacing:0.06em;color:#6b4c1e;text-transform:uppercase">Note</th>
              </tr>
            </thead>
            <tbody>${tableRows}</tbody>
          </table>
        </div>`;
    })
    .join("");

  return `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8"/>
  <title>Winemaker's Log — ${wineryName}</title>
  <style>
    @page { margin: 20mm 18mm; size: A4 portrait; }
    body { font-family: Georgia, 'Times New Roman', serif; font-size: 11px; color: #1a1008; margin: 0; padding: 0; }
    h1 { font-size: 22px; font-weight: 700; color: #3a2010; margin: 0 0 2px 0; letter-spacing: -0.01em; }
    .subtitle { font-size: 11px; color: #7a5c3a; margin-bottom: 4px; }
    .lip-notice { font-size: 9px; color: #9a7a5a; font-style: italic; margin-bottom: 16px; }
    .header-rule { border: none; border-top: 2px solid #b87333; margin: 10px 0 18px 0; }
    .footer { font-size: 9px; color: #9a7a5a; text-align: center; margin-top: 24px; border-top: 1px solid #e8e0d4; padding-top: 8px; }
    @media print { body { -webkit-print-color-adjust: exact; print-color-adjust: exact; } }
  </style>
</head>
<body>
  <h1>${wineryName}</h1>
  <div class="subtitle">Winemaker's Log — Cellar Record${tankFilter ? " · Tank: " + tankFilter : ""}</div>
  <div class="lip-notice">Liquor Industry Program (LIP) compliant cellar record · Printed ${today} · ${sorted.length} total entr${sorted.length === 1 ? "y" : "ies"} · Generated by Ownology</div>
  <hr class="header-rule"/>
  ${rows || '<p style="color:#9a7a5a;font-style:italic">No entries to display.</p>'}
  <div class="footer">
    This document constitutes a cellar record for LIP compliance purposes. Retain for a minimum of 7 years. · Ownology — AI Knowledge Assistant for Winemakers
  </div>
</body>
</html>`;
}

export default function ExportLogPDF({ entries, wineryName = "My Winery", tankFilter }: Props) {
  const [generating, setGenerating] = useState(false);

  const handleExport = () => {
    setGenerating(true);
    try {
      const html = buildPrintHTML(entries, wineryName, tankFilter);
      const win = window.open("", "_blank", "width=900,height=700");
      if (!win) {
        alert("Please allow pop-ups to export the log as PDF.");
        setGenerating(false);
        return;
      }
      win.document.write(html);
      win.document.close();
      // Give the browser a moment to render, then trigger print
      setTimeout(() => {
        win.focus();
        win.print();
        setGenerating(false);
      }, 400);
    } catch {
      setGenerating(false);
    }
  };

  return (
    <button
      type="button"
      onClick={handleExport}
      disabled={generating || entries.length === 0}
      className="flex items-center gap-2 px-4 py-2 rounded text-sm transition-colors"
      style={{
        background: "oklch(0.72 0.12 75 / 12%)",
        color: "oklch(0.72 0.12 75)",
        border: "1px solid oklch(0.72 0.12 75 / 28%)",
        cursor: generating || entries.length === 0 ? "not-allowed" : "pointer",
        opacity: entries.length === 0 ? 0.5 : 1,
        fontFamily: "'Lato', sans-serif",
      }}
      title={entries.length === 0 ? "No entries to export" : "Export as LIP-compliant PDF"}
    >
      {generating ? (
        <Loader2 className="w-4 h-4 animate-spin" />
      ) : (
        <FileDown className="w-4 h-4" />
      )}
      {generating ? "Preparing…" : "Export Log PDF"}
    </button>
  );
}
