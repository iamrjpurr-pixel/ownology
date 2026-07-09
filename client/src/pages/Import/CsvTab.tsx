/**
 * CSV Tab — structured spreadsheet import with column mapping.
 * For XLSX use the Bulk tab (which uses SheetJS under the hood).
 */

import { useRef, useState } from "react";
import { Button } from "@/components/ui/button";
import {
  FileSpreadsheet,
  Upload,
  AlertCircle,
} from "lucide-react";
import {
  parseCSVText,
  type EventType,
  type ParsedEntry,
} from "./shared";

const EVENT_TYPE_OPTIONS: EventType[] = [
  "addition", "measurement", "racking", "inoculation", "observation",
  "pre_harvest_sample", "bottling_run", "weather_event", "sanitation", "other",
];

export function CsvTab({
  onEntries,
}: {
  onEntries: (entries: ParsedEntry[], source: "csv") => void;
}) {
  const [headers, setHeaders] = useState<string[]>([]);
  const [rows, setRows] = useState<string[][]>([]);
  const [mapping, setMapping] = useState<Record<string, string>>({});
  const [error, setError] = useState<string | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const REQUIRED_FIELDS = ["tankName", "variety", "eventType"];
  const OPTIONAL_FIELDS = ["entryDate", "noteText", "details_what", "details_value", "details_unit", "details_quantity"];
  const ALL_FIELDS = [...REQUIRED_FIELDS, ...OPTIONAL_FIELDS, "(ignore)"];

  const handleFile = async (file: File) => {
    setError(null);
    try {
      let text = "";
      if (file.name.endsWith(".csv")) {
        text = await file.text();
      } else if (file.name.endsWith(".xlsx") || file.name.endsWith(".xls")) {
        setError("For Excel files, please open in Excel/Google Sheets and copy-paste the data into the Paste tab, or save as CSV first.");
        return;
      } else {
        text = await file.text();
      }
      const parsed = parseCSVText(text);
      if (parsed.length < 2) { setError("File appears empty or has only one row."); return; }
      const hdrs = parsed[0];
      const dataRows = parsed.slice(1).filter((r) => r.some((c) => c.trim()));
      setHeaders(hdrs);
      setRows(dataRows);
      // Auto-map common column names
      const autoMap: Record<string, string> = {};
      hdrs.forEach((h, i) => {
        const lower = h.toLowerCase().replace(/[^a-z0-9]/g, "");
        if (lower.includes("tank")) autoMap[String(i)] = "tankName";
        else if (lower.includes("variety") || lower.includes("grape")) autoMap[String(i)] = "variety";
        else if (lower.includes("event") || lower.includes("type")) autoMap[String(i)] = "eventType";
        else if (lower.includes("date")) autoMap[String(i)] = "entryDate";
        else if (lower.includes("note")) autoMap[String(i)] = "noteText";
        else if (lower.includes("what") || lower.includes("addition") || lower.includes("chemical")) autoMap[String(i)] = "details_what";
        else if (lower.includes("value") || lower.includes("brix") || lower.includes("ph") || lower.includes("ta")) autoMap[String(i)] = "details_value";
        else if (lower.includes("unit")) autoMap[String(i)] = "details_unit";
        else if (lower.includes("qty") || lower.includes("quantity") || lower.includes("amount")) autoMap[String(i)] = "details_quantity";
        else autoMap[String(i)] = "(ignore)";
      });
      setMapping(autoMap);
    } catch {
      setError("Failed to read file. Please check the format.");
    }
  };

  const handleImport = () => {
    // Validate required fields are mapped
    const mappedFields = Object.values(mapping);
    const missing = REQUIRED_FIELDS.filter((f) => !mappedFields.includes(f));
    if (missing.length > 0) {
      setError(`Please map the following required columns: ${missing.join(", ")}`);
      return;
    }

    // Build entries
    const entries: ParsedEntry[] = [];
    for (const row of rows) {
      const get = (field: string): string => {
        const colIdx = Object.entries(mapping).find(([, v]) => v === field)?.[0];
        return colIdx !== undefined ? (row[Number(colIdx)] ?? "").trim() : "";
      };

      const tankName = get("tankName");
      const variety = get("variety");
      const rawEventType = get("eventType").toLowerCase().replace(/[^a-z_]/g, "");
      const eventType: EventType = EVENT_TYPE_OPTIONS.includes(rawEventType as EventType)
        ? (rawEventType as EventType)
        : "other";

      if (!tankName || !variety) continue;

      const details: Record<string, unknown> = {};
      const what = get("details_what");
      const value = get("details_value");
      const unit = get("details_unit");
      const qty = get("details_quantity");
      if (what) details.what = what;
      if (value) details.value = value;
      if (unit) details.unit = unit;
      if (qty) details.quantity = qty;
      if (Object.keys(details).length === 0) details.text = row.join(", ");

      entries.push({
        id: `csv-${entries.length}`,
        tankName,
        variety,
        eventType,
        details,
        entryDate: get("entryDate") || null,
        noteText: get("noteText") || null,
      });
    }

    if (entries.length === 0) {
      setError("No valid entries found. Check that tankName and variety columns are mapped correctly.");
      return;
    }
    onEntries(entries, "csv");
  };

  if (headers.length === 0) {
    return (
      <div className="space-y-4">
        <p className="text-sm" style={{ color: "var(--ow-text-mid)" }}>
          Upload a CSV file. For Excel (.xlsx) files, save as CSV first or use the Paste tab.
        </p>
        <div
          className="rounded-xl border-2 border-dashed flex flex-col items-center justify-center cursor-pointer py-12 px-6 text-center transition-colors"
          style={{ borderColor: "oklch(0.30 0.010 60)", background: "var(--ow-bg-base)" }}
          onClick={() => fileInputRef.current?.click()}
        >
          <div
            className="w-16 h-16 rounded-2xl flex items-center justify-center mb-4"
            style={{ background: "color-mix(in oklch, var(--ow-amber) 15%, transparent)", border: "1px solid color-mix(in oklch, var(--ow-amber) 30%, transparent)" }}
          >
            <FileSpreadsheet size={32} style={{ color: "var(--ow-amber)" }} />
          </div>
          <p className="font-semibold" style={{ color: "var(--ow-text-hi)" }}>Upload CSV File</p>
          <p className="text-sm mt-1" style={{ color: "var(--ow-text-lo)" }}>Tap to browse or drag and drop</p>
          <input ref={fileInputRef} type="file" accept=".csv,.txt" className="hidden" onChange={(e) => { const f = e.target.files?.[0]; if (f) handleFile(f); }} />
        </div>
        {error && (
          <div className="flex items-start gap-3 p-3 rounded-lg" style={{ background: "oklch(0.18 0.05 25 / 40%)", border: "1px solid oklch(0.40 0.10 25 / 40%)" }}>
            <AlertCircle size={16} className="mt-0.5 flex-shrink-0" style={{ color: "oklch(0.65 0.15 25)" }} />
            <p className="text-sm" style={{ color: "oklch(0.75 0.05 25)" }}>{error}</p>
          </div>
        )}
      </div>
    );
  }

  return (
    <div className="space-y-5">
      <div className="flex items-center justify-between">
        <p className="text-sm font-medium" style={{ color: "var(--ow-amber)" }}>
          {rows.length} data rows · {headers.length} columns
        </p>
        <button
          className="text-xs underline"
          style={{ color: "var(--ow-text-lo)" }}
          onClick={() => { setHeaders([]); setRows([]); setMapping({}); setError(null); }}
        >
          Upload different file
        </button>
      </div>

      <div className="space-y-2">
        <p className="text-sm font-medium" style={{ color: "var(--ow-text-mid)" }}>Map columns to fields</p>
        <div className="grid gap-2">
          {headers.map((h, i) => (
            <div key={i} className="flex items-center gap-3">
              <span
                className="text-sm flex-1 truncate"
                style={{ color: "var(--ow-text-mid)", minWidth: 0 }}
                title={h}
              >
                {h || `Column ${i + 1}`}
              </span>
              <select
                value={mapping[String(i)] ?? "(ignore)"}
                onChange={(e) => setMapping((m) => ({ ...m, [String(i)]: e.target.value }))}
                className="text-sm rounded px-2 py-1.5 border"
                style={{
                  background: "var(--ow-bg-raised)",
                  borderColor: "oklch(0.25 0.010 60)",
                  color: "var(--ow-text-hi)",
                  minWidth: "160px",
                }}
              >
                {ALL_FIELDS.map((f) => (
                  <option key={f} value={f}>{f}</option>
                ))}
              </select>
            </div>
          ))}
        </div>
      </div>

      {error && (
        <div className="flex items-start gap-3 p-3 rounded-lg" style={{ background: "oklch(0.18 0.05 25 / 40%)", border: "1px solid oklch(0.40 0.10 25 / 40%)" }}>
          <AlertCircle size={16} className="mt-0.5 flex-shrink-0" style={{ color: "oklch(0.65 0.15 25)" }} />
          <p className="text-sm" style={{ color: "oklch(0.75 0.05 25)" }}>{error}</p>
        </div>
      )}

      <Button
        className="w-full font-semibold h-12"
        onClick={handleImport}
        style={{ background: "var(--ow-amber)", color: "oklch(0.10 0.008 60)" }}
      >
        <Upload size={16} className="mr-2" /> Preview Import
      </Button>
    </div>
  );
}
