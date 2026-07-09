/**
 * Shared types, helpers, and the review table used by every /import tab.
 * Extracted from the old monolithic Import.tsx (Feb 2026 refactor · Rich).
 */

import { Trash2 } from "lucide-react";

// ─── Types ────────────────────────────────────────────────────────────────────

export type EventType =
  | "addition"
  | "measurement"
  | "racking"
  | "inoculation"
  | "observation"
  | "pre_harvest_sample"
  | "bottling_run"
  | "weather_event"
  | "sanitation"
  | "other";

export interface ParsedEntry {
  id: string; // client-side only for keying
  tankName: string;
  variety: string;
  eventType: EventType;
  details: Record<string, unknown>;
  entryDate: string | null;
  noteText: string | null;
}

export type Tab = "voice" | "camera" | "paste" | "csv" | "bulk";

export type ImportSource = "paste" | "csv" | "image" | "voice" | "bulk";

// ─── Helpers ──────────────────────────────────────────────────────────────────

export function eventLabel(t: EventType): string {
  const MAP: Record<EventType, string> = {
    addition: "Addition",
    measurement: "Measurement",
    racking: "Racking",
    inoculation: "Inoculation",
    observation: "Observation",
    pre_harvest_sample: "Pre-harvest",
    bottling_run: "Bottling",
    weather_event: "Weather",
    sanitation: "Sanitation",
    other: "Other",
  };
  return MAP[t] ?? t;
}

export function eventColor(t: EventType): string {
  const MAP: Record<EventType, string> = {
    addition: "bg-amber-900/40 text-amber-300 border-amber-700/40",
    measurement: "bg-blue-900/40 text-blue-300 border-blue-700/40",
    racking: "bg-purple-900/40 text-purple-300 border-purple-700/40",
    inoculation: "bg-green-900/40 text-green-300 border-green-700/40",
    observation: "bg-slate-700/40 text-slate-300 border-slate-600/40",
    pre_harvest_sample: "bg-yellow-900/40 text-yellow-300 border-yellow-700/40",
    bottling_run: "bg-rose-900/40 text-rose-300 border-rose-700/40",
    weather_event: "bg-sky-900/40 text-sky-300 border-sky-700/40",
    sanitation: "bg-teal-900/40 text-teal-300 border-teal-700/40",
    other: "bg-slate-700/40 text-slate-300 border-slate-600/40",
  };
  return MAP[t] ?? "bg-slate-700/40 text-slate-300";
}

export function detailSummary(entry: ParsedEntry): string {
  const d = entry.details;
  if (entry.eventType === "addition") return `${d.what ?? ""} ${d.quantity ?? ""} ${d.unit ?? ""}`.trim();
  if (entry.eventType === "measurement") return `${d.what ?? ""}: ${d.value ?? ""} ${d.unit ?? ""}`.trim();
  if (entry.eventType === "racking") return `${d.fromLocation ?? ""} → ${d.toLocation ?? ""}`.trim();
  if (entry.eventType === "inoculation") return `${d.what ?? ""} ${d.productName ?? ""}`.trim();
  if (entry.eventType === "observation") return String(d.text ?? "").slice(0, 60);
  return String(d.text ?? Object.values(d).join(", ")).slice(0, 60);
}

export function assignIds(raw: Omit<ParsedEntry, "id">[]): ParsedEntry[] {
  return raw.map((e, i) => ({ ...e, id: `${Date.now()}-${i}` }));
}

// ─── CSV parser (client-side, no library needed for simple CSVs) ──────────────

export function parseCSVText(text: string): string[][] {
  const lines = text.split(/\r?\n/).filter((l) => l.trim());
  return lines.map((line) => {
    const cols: string[] = [];
    let cur = "";
    let inQuote = false;
    for (let i = 0; i < line.length; i++) {
      const ch = line[i];
      if (ch === '"') { inQuote = !inQuote; continue; }
      if (ch === "," && !inQuote) { cols.push(cur.trim()); cur = ""; continue; }
      cur += ch;
    }
    cols.push(cur.trim());
    return cols;
  });
}

// ─── Preview Table ────────────────────────────────────────────────────────────

export function PreviewTable({
  entries,
  onRemove,
}: {
  entries: ParsedEntry[];
  onRemove: (id: string) => void;
}) {
  if (entries.length === 0) return null;
  return (
    <div className="mt-6 rounded-lg overflow-hidden border border-white/10">
      <div className="bg-white/5 px-4 py-2.5 flex items-center justify-between">
        <span className="text-sm font-medium" style={{ color: "var(--ow-amber)" }}>
          {entries.length} {entries.length === 1 ? "entry" : "entries"} ready to import
        </span>
        <span className="text-xs" style={{ color: "var(--ow-text-lo)" }}>
          Review and remove any incorrect rows before saving
        </span>
      </div>
      <div className="overflow-x-auto">
        <table className="w-full text-sm">
          <thead>
            <tr className="border-b border-white/10">
              {["Tank", "Variety", "Type", "Details", "Date", ""].map((h) => (
                <th
                  key={h}
                  className="px-3 py-2 text-left text-xs font-medium uppercase tracking-wider"
                  style={{ color: "var(--ow-text-lo)" }}
                >
                  {h}
                </th>
              ))}
            </tr>
          </thead>
          <tbody>
            {entries.map((e) => (
              <tr key={e.id} className="border-b border-white/5 hover:bg-white/3 transition-colors">
                <td className="px-3 py-2.5 font-medium" style={{ color: "var(--ow-text-hi)" }}>
                  {e.tankName}
                </td>
                <td className="px-3 py-2.5" style={{ color: "var(--ow-text-mid)" }}>
                  {e.variety}
                </td>
                <td className="px-3 py-2.5">
                  <span className={`inline-flex items-center px-2 py-0.5 rounded text-xs border ${eventColor(e.eventType)}`}>
                    {eventLabel(e.eventType)}
                  </span>
                </td>
                <td className="px-3 py-2.5 max-w-[200px] truncate" style={{ color: "var(--ow-text-mid)" }}>
                  {detailSummary(e)}
                </td>
                <td className="px-3 py-2.5 text-xs" style={{ color: "var(--ow-text-lo)" }}>
                  {e.entryDate ?? "—"}
                </td>
                <td className="px-3 py-2.5">
                  <button
                    onClick={() => onRemove(e.id)}
                    className="p-1 rounded hover:bg-red-900/30 transition-colors"
                    title="Remove this entry"
                  >
                    <Trash2 size={14} style={{ color: "oklch(0.60 0.15 25)" }} />
                  </button>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}
