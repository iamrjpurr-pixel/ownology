/**
 * Vintage Data Import — three input modes:
 *  1. Camera / Scan  (phone-first — uses device camera + LLM vision)
 *  2. AI Paste       (desktop-first — paste any text, LLM extracts entries)
 *  3. CSV / Excel    (structured upload with column mapping)
 *
 * All modes produce a preview table the user can edit/delete before saving.
 * Saved entries are tagged with importSource + importBatchId in The Press.
 */

import { useRef, useState, useCallback } from "react";
import { trpc } from "@/lib/trpc";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import {
  Camera,
  ClipboardPaste,
  FileSpreadsheet,
  Trash2,
  CheckCircle2,
  Loader2,
  Upload,
  AlertCircle,
  ArrowLeft,
  ScanLine,
} from "lucide-react";
import { Link } from "wouter";

// ─── Types ────────────────────────────────────────────────────────────────────

type EventType =
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

interface ParsedEntry {
  id: string; // client-side only for keying
  tankName: string;
  variety: string;
  eventType: EventType;
  details: Record<string, unknown>;
  entryDate: string | null;
  noteText: string | null;
}

type Tab = "camera" | "paste" | "csv";

// ─── Helpers ──────────────────────────────────────────────────────────────────

function eventLabel(t: EventType): string {
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

function eventColor(t: EventType): string {
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

function detailSummary(entry: ParsedEntry): string {
  const d = entry.details;
  if (entry.eventType === "addition") return `${d.what ?? ""} ${d.quantity ?? ""} ${d.unit ?? ""}`.trim();
  if (entry.eventType === "measurement") return `${d.what ?? ""}: ${d.value ?? ""} ${d.unit ?? ""}`.trim();
  if (entry.eventType === "racking") return `${d.fromLocation ?? ""} → ${d.toLocation ?? ""}`.trim();
  if (entry.eventType === "inoculation") return `${d.what ?? ""} ${d.productName ?? ""}`.trim();
  if (entry.eventType === "observation") return String(d.text ?? "").slice(0, 60);
  return String(d.text ?? Object.values(d).join(", ")).slice(0, 60);
}

function assignIds(raw: Omit<ParsedEntry, "id">[]): ParsedEntry[] {
  return raw.map((e, i) => ({ ...e, id: `${Date.now()}-${i}` }));
}

// ─── CSV parser (client-side, no library needed for simple CSVs) ──────────────

function parseCSVText(text: string): string[][] {
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

function PreviewTable({
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

// ─── Camera Tab ───────────────────────────────────────────────────────────────

function CameraTab({
  onEntries,
}: {
  onEntries: (entries: ParsedEntry[], source: "image") => void;
}) {
  const [capturedImage, setCapturedImage] = useState<string | null>(null); // base64
  const [mimeType, setMimeType] = useState("image/jpeg");
  const [parsing, setParsing] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const parseFromImage = trpc.vintageLog.parseFromImage.useMutation();

  const handleCapture = useCallback((file: File) => {
    setError(null);
    const reader = new FileReader();
    reader.onload = (e) => {
      const dataUrl = e.target?.result as string;
      // Strip the data URL prefix to get pure base64
      const base64 = dataUrl.split(",")[1];
      setCapturedImage(base64);
      setMimeType(file.type || "image/jpeg");
    };
    reader.readAsDataURL(file);
  }, []);

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) handleCapture(file);
  };

  const handleParse = async () => {
    if (!capturedImage) return;
    setParsing(true);
    setError(null);
    try {
      const result = await parseFromImage.mutateAsync({
        imageBase64: capturedImage,
        mimeType,
      });
      if (result.entries.length === 0) {
        setError("No cellar entries could be identified in this image. Try a clearer photo or use the Paste tab.");
      } else {
        onEntries(assignIds(result.entries as Omit<ParsedEntry, "id">[]), "image");
      }
    } catch {
      setError("Failed to analyse image. Please try again.");
    } finally {
      setParsing(false);
    }
  };

  return (
    <div className="space-y-5">
      {/* Phone-first: big camera button */}
      <div
        className="relative rounded-xl border-2 border-dashed flex flex-col items-center justify-center cursor-pointer transition-colors"
        style={{
          borderColor: capturedImage ? "color-mix(in oklch, var(--ow-amber) 60%, transparent)" : "oklch(0.35 0.010 60)",
          background: capturedImage ? "var(--ow-bg-raised)" : "var(--ow-bg-base)",
          minHeight: "220px",
        }}
        onClick={() => fileInputRef.current?.click()}
      >
        {capturedImage ? (
          <img
            src={`data:${mimeType};base64,${capturedImage}`}
            alt="Captured"
            className="max-h-64 rounded-lg object-contain"
          />
        ) : (
          <div className="flex flex-col items-center gap-4 py-10 px-6 text-center">
            <div
              className="w-20 h-20 rounded-2xl flex items-center justify-center"
              style={{ background: "color-mix(in oklch, var(--ow-amber) 15%, transparent)", border: "1px solid color-mix(in oklch, var(--ow-amber) 30%, transparent)" }}
            >
              <Camera size={40} style={{ color: "var(--ow-amber)" }} />
            </div>
            <div>
              <p className="text-lg font-semibold" style={{ color: "var(--ow-text-hi)" }}>
                Take a Photo or Scan
              </p>
              <p className="text-sm mt-1" style={{ color: "oklch(0.60 0.012 75)" }}>
                Photograph a notebook, whiteboard, or lab report
              </p>
            </div>
            <div className="flex items-center gap-2 mt-2">
              <ScanLine size={16} style={{ color: "var(--ow-text-lo)" }} />
              <span className="text-xs" style={{ color: "var(--ow-text-lo)" }}>
                Tap to open camera or choose a file
              </span>
            </div>
          </div>
        )}
        <input
          ref={fileInputRef}
          type="file"
          accept="image/*"
          capture="environment"
          className="hidden"
          onChange={handleFileChange}
        />
      </div>

      {capturedImage && (
        <div className="flex gap-3">
          <Button
            variant="outline"
            className="flex-1"
            onClick={() => { setCapturedImage(null); setError(null); }}
            style={{ borderColor: "oklch(0.30 0.010 60)", color: "var(--ow-text-mid)" }}
          >
            Retake
          </Button>
          <Button
            className="flex-1 font-semibold"
            onClick={handleParse}
            disabled={parsing}
            style={{ background: "var(--ow-amber)", color: "oklch(0.10 0.008 60)" }}
          >
            {parsing ? (
              <><Loader2 size={16} className="mr-2 animate-spin" /> Analysing…</>
            ) : (
              <><ScanLine size={16} className="mr-2" /> Extract Entries</>
            )}
          </Button>
        </div>
      )}

      {error && (
        <div className="flex items-start gap-3 p-3 rounded-lg" style={{ background: "oklch(0.18 0.05 25 / 40%)", border: "1px solid oklch(0.40 0.10 25 / 40%)" }}>
          <AlertCircle size={16} className="mt-0.5 flex-shrink-0" style={{ color: "oklch(0.65 0.15 25)" }} />
          <p className="text-sm" style={{ color: "oklch(0.75 0.05 25)" }}>{error}</p>
        </div>
      )}
    </div>
  );
}

// ─── Paste Tab ────────────────────────────────────────────────────────────────

function PasteTab({
  onEntries,
}: {
  onEntries: (entries: ParsedEntry[], source: "paste") => void;
}) {
  const [text, setText] = useState("");
  const [parsing, setParsing] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const parseFromText = trpc.vintageLog.parseFromText.useMutation();

  const handleParse = async () => {
    if (!text.trim()) return;
    setParsing(true);
    setError(null);
    try {
      const result = await parseFromText.mutateAsync({ rawText: text });
      if (result.entries.length === 0) {
        setError("No cellar entries could be identified. Make sure your text includes tank names, varieties, and event details.");
      } else {
        onEntries(assignIds(result.entries as Omit<ParsedEntry, "id">[]), "paste");
      }
    } catch {
      setError("Failed to parse text. Please try again.");
    } finally {
      setParsing(false);
    }
  };

  return (
    <div className="space-y-4">
      <div>
        <p className="text-sm mb-3" style={{ color: "var(--ow-text-mid)" }}>
          Paste anything — copied Excel cells, typed notes, emails, or lab results. The AI will extract structured entries.
        </p>
        <Textarea
          value={text}
          onChange={(e) => setText(e.target.value)}
          placeholder={`Example:\nTank 7 Shiraz — 15 March 2024\nAdded 2.6kg DAP at 1/3 sugar depletion\nBrix: 14.2, TA: 6.1, pH: 3.42\n\nBarrel 12A Chardonnay — racked off gross lees 20 March`}
          rows={10}
          className="font-mono text-sm resize-y"
          style={{
            background: "var(--ow-bg-base)",
            borderColor: "oklch(0.25 0.010 60)",
            color: "var(--ow-text-hi)",
          }}
        />
        <p className="text-xs mt-1.5" style={{ color: "oklch(0.45 0.010 60)" }}>
          {text.length.toLocaleString()} characters · max 50,000
        </p>
      </div>

      <Button
        className="w-full font-semibold h-12"
        onClick={handleParse}
        disabled={parsing || !text.trim()}
        style={{ background: "var(--ow-amber)", color: "oklch(0.10 0.008 60)" }}
      >
        {parsing ? (
          <><Loader2 size={16} className="mr-2 animate-spin" /> Extracting entries…</>
        ) : (
          <><ClipboardPaste size={16} className="mr-2" /> Extract Entries</>
        )}
      </Button>

      {error && (
        <div className="flex items-start gap-3 p-3 rounded-lg" style={{ background: "oklch(0.18 0.05 25 / 40%)", border: "1px solid oklch(0.40 0.10 25 / 40%)" }}>
          <AlertCircle size={16} className="mt-0.5 flex-shrink-0" style={{ color: "oklch(0.65 0.15 25)" }} />
          <p className="text-sm" style={{ color: "oklch(0.75 0.05 25)" }}>{error}</p>
        </div>
      )}
    </div>
  );
}

// ─── CSV Tab ──────────────────────────────────────────────────────────────────

const EVENT_TYPE_OPTIONS: EventType[] = [
  "addition", "measurement", "racking", "inoculation", "observation",
  "pre_harvest_sample", "bottling_run", "weather_event", "sanitation", "other",
];

function CSVTab({
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

// ─── Main Page ────────────────────────────────────────────────────────────────

export default function Import() {
  const [activeTab, setActiveTab] = useState<Tab>("camera");
  const [entries, setEntries] = useState<ParsedEntry[]>([]);
  const [importSource, setImportSource] = useState<"paste" | "csv" | "image">("image");
  const [saving, setSaving] = useState(false);
  const [saved, setSaved] = useState(false);
  const bulkSave = trpc.vintageLog.bulkSave.useMutation();

  const handleEntries = useCallback(
    (newEntries: ParsedEntry[], source: "paste" | "csv" | "image") => {
      setEntries(newEntries);
      setImportSource(source);
      setSaved(false);
    },
    []
  );

  const handleRemove = useCallback((id: string) => {
    setEntries((prev) => prev.filter((e) => e.id !== id));
  }, []);

  const handleSave = async () => {
    if (entries.length === 0) return;
    setSaving(true);
    try {
      const result = await bulkSave.mutateAsync({
        entries: entries.map(({ id: _id, ...e }) => e),
        importSource,
      });
      setSaved(true);
      setEntries([]);
      toast.success(`${result.saved} ${result.saved === 1 ? "entry" : "entries"} imported — visible in The Press.`);
    } catch {
      toast.error("Import failed. Please try again.");
    } finally {
      setSaving(false);
    }
  };

  const TABS: { id: Tab; label: string; icon: React.ReactNode; hint: string }[] = [
    { id: "camera", label: "Camera", icon: <Camera size={18} />, hint: "Phone" },
    { id: "paste", label: "Paste", icon: <ClipboardPaste size={18} />, hint: "Any text" },
    { id: "csv", label: "CSV", icon: <FileSpreadsheet size={18} />, hint: "Spreadsheet" },
  ];

  return (
    <div
      className="min-h-screen"
      style={{ background: "var(--ow-bg-base)", color: "var(--ow-text-hi)" }}
    >
      {/* Header */}
      <div
        className="sticky top-0 z-10 border-b"
        style={{ background: "var(--ow-nav-bg)", borderColor: "var(--ow-bg-inset)" }}
      >
        <div className="container max-w-2xl flex items-center gap-4 py-4">
          <Link href="/the-press">
            <button
              className="p-2 rounded-lg transition-colors"
              style={{ color: "var(--ow-text-mid)" }}
            >
              <ArrowLeft size={20} />
            </button>
          </Link>
          <div>
            <h1 className="text-lg font-bold" style={{ fontFamily: "'Fraunces', serif", color: "var(--ow-amber)" }}>
              Import Vintage Data
            </h1>
            <p className="text-xs" style={{ color: "var(--ow-text-lo)" }}>
              Bring in historical records from any source
            </p>
          </div>
        </div>
      </div>

      <div className="container max-w-2xl py-6 space-y-6">
        {/* Success state */}
        {saved && (
          <div
            className="flex items-center gap-3 p-4 rounded-xl"
            style={{ background: "oklch(0.18 0.08 145 / 30%)", border: "1px solid oklch(0.40 0.12 145 / 40%)" }}
          >
            <CheckCircle2 size={20} style={{ color: "oklch(0.65 0.15 145)" }} />
            <div>
              <p className="font-medium text-sm" style={{ color: "oklch(0.75 0.10 145)" }}>
                Import complete!
              </p>
              <p className="text-xs mt-0.5" style={{ color: "oklch(0.60 0.08 145)" }}>
                Your entries are now in The Press, tagged as imported.{" "}
                <Link href="/the-press">
                  <span className="underline cursor-pointer">View them →</span>
                </Link>
              </p>
            </div>
          </div>
        )}

        {/* Tab selector */}
        <div
          className="grid grid-cols-3 rounded-xl p-1 gap-1"
          style={{ background: "var(--ow-bg-raised)" }}
        >
          {TABS.map((tab) => (
            <button
              key={tab.id}
              onClick={() => { setActiveTab(tab.id); setEntries([]); setSaved(false); }}
              className="flex flex-col items-center gap-1.5 py-3 px-2 rounded-lg transition-all"
              style={{
                background: activeTab === tab.id ? "var(--ow-amber)" : "transparent",
                color: activeTab === tab.id ? "oklch(0.10 0.008 60)" : "var(--ow-text-lo)",
              }}
            >
              {tab.icon}
              <span className="text-xs font-semibold">{tab.label}</span>
              <span className="text-xs opacity-70">{tab.hint}</span>
            </button>
          ))}
        </div>

        {/* Tab content */}
        <div
          className="rounded-xl p-5"
          style={{ background: "var(--ow-bg-raised)", border: "1px solid var(--ow-bg-inset)" }}
        >
          {activeTab === "camera" && <CameraTab onEntries={handleEntries} />}
          {activeTab === "paste" && <PasteTab onEntries={handleEntries} />}
          {activeTab === "csv" && <CSVTab onEntries={handleEntries} />}
        </div>

        {/* Preview + Save */}
        {entries.length > 0 && (
          <>
            <PreviewTable entries={entries} onRemove={handleRemove} />
            <Button
              className="w-full h-14 text-base font-bold"
              onClick={handleSave}
              disabled={saving || entries.length === 0}
              style={{ background: "var(--ow-amber)", color: "oklch(0.10 0.008 60)" }}
            >
              {saving ? (
                <><Loader2 size={18} className="mr-2 animate-spin" /> Saving…</>
              ) : (
                <><CheckCircle2 size={18} className="mr-2" /> Save {entries.length} {entries.length === 1 ? "Entry" : "Entries"} to The Press</>
              )}
            </Button>
          </>
        )}

        {/* Help text */}
        <div
          className="rounded-lg p-4 text-sm space-y-2"
          style={{ background: "var(--ow-bg-base)", border: "1px solid var(--ow-bg-inset)" }}
        >
          <p className="font-medium" style={{ color: "var(--ow-amber)" }}>Tips for best results</p>
          <ul className="space-y-1" style={{ color: "oklch(0.60 0.012 75)" }}>
            <li>• <strong style={{ color: "var(--ow-text-mid)" }}>Camera:</strong> Hold steady, ensure good lighting, include tank names and dates in frame</li>
            <li>• <strong style={{ color: "var(--ow-text-mid)" }}>Paste:</strong> Include tank name, variety, and date on each line for best extraction</li>
            <li>• <strong style={{ color: "var(--ow-text-mid)" }}>CSV:</strong> One row per event, with columns for tank, variety, event type, and details</li>
          </ul>
        </div>
      </div>
    </div>
  );
}
