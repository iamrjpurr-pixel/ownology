/**
 * Bulk Tab — the "bring your history" feature promised on /join Card 03.
 * Accepts a folder drop (webkitdirectory), multi-file select, or drag-and-drop.
 * Client-side classifies each file → routes to the right LLM endpoint:
 *   - images (jpg/png/webp)   → parseFromImage (Claude Sonnet vision)
 *   - text (csv/txt/md)       → parseFromText  (Claude Sonnet text)
 *   - PDFs (text layer)       → parseFromText  after pdfjs extraction
 *   - XLSX / XLS / ODS        → parseFromText  after SheetJS flattening
 *   - WhatsApp exports (.txt) → parseFromText  after noise cleaning
 *   - audio (.m4a/.mp3/...)   → parseFromVoice (Whisper transcription)
 * Runs 3 files in parallel to keep the LLM proxy happy. Per-file status
 * surface builds trust: users see exactly what was read vs skipped.
 */

import { useCallback, useEffect, useRef, useState } from "react";
import { trpc } from "@/lib/trpc";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import {
  AlertCircle,
  FileText,
  FolderUp,
  Loader2,
  ShieldCheck,
  Trash2,
  Upload,
  X,
} from "lucide-react";
import { assignIds, type ParsedEntry } from "./shared";

const BULK_MAX_FILES = 50;
const BULK_MAX_IMAGE_BYTES = 8 * 1024 * 1024;   // 8MB per image
const BULK_MAX_TEXT_BYTES = 200 * 1024;         // 200KB per text file
const BULK_MAX_PDF_BYTES = 15 * 1024 * 1024;    // 15MB per PDF
const BULK_MAX_XLSX_BYTES = 10 * 1024 * 1024;   // 10MB per spreadsheet
const BULK_MAX_AUDIO_BYTES = 18 * 1024 * 1024;  // ~18MB raw = safely under 25MB Whisper cap after base64
const BULK_CONCURRENCY = 3;

type BulkFileStatus = "queued" | "processing" | "done" | "error" | "skipped";
type BulkFileKind = "image" | "text" | "pdf" | "xlsx" | "whatsapp" | "audio" | "unsupported" | "toolarge";
type BulkConfidence = "green" | "amber" | "red" | null;

interface BulkFile {
  id: string;
  name: string;
  path: string;         // relative folder path when webkitdirectory is used
  size: number;
  kind: BulkFileKind;
  status: BulkFileStatus;
  entryCount: number;
  amberCount: number;   // subset of entryCount that came back thin/underspecified
  confidence: BulkConfidence;
  message: string;      // human-readable status detail
  file: File;
  entries?: Omit<ParsedEntry, "id">[]; // held here until user commits
}

// ─── Quality scoring ──────────────────────────────────────────────────────────
// Scores each extracted entry 0-5 based on field completeness. This is a
// heuristic — the LLM sometimes returns entries with `eventType: "other"` and
// an unstructured note when it can't classify. We treat those as amber.
function scoreEntry(e: Omit<ParsedEntry, "id">): number {
  let s = 0;
  const bad = (v: unknown) => {
    if (typeof v !== "string") return true;
    const t = v.trim().toLowerCase();
    return !t || t === "unknown" || t === "n/a" || t === "na" || t === "?";
  };
  if (!bad(e.tankName)) s++;
  if (!bad(e.variety)) s++;
  if (e.entryDate) s++;
  if (e.eventType && e.eventType !== "other") s++;
  const detailKeys = e.details ? Object.keys(e.details).filter((k) => e.details[k] !== null && e.details[k] !== "") : [];
  if (detailKeys.length > 0) s++;
  return s;
}

function classifyEntryQuality(e: Omit<ParsedEntry, "id">): "green" | "amber" {
  // 4+ out of 5 = green. Below that we surface for review.
  return scoreEntry(e) >= 4 ? "green" : "amber";
}

function fileConfidence(entries: Omit<ParsedEntry, "id">[]): { confidence: BulkConfidence; amberCount: number } {
  if (entries.length === 0) return { confidence: "red", amberCount: 0 };
  let green = 0;
  let amber = 0;
  for (const e of entries) {
    if (classifyEntryQuality(e) === "green") green++;
    else amber++;
  }
  const greenRatio = green / entries.length;
  let confidence: BulkConfidence = "amber";
  if (greenRatio >= 0.75) confidence = "green";
  else if (greenRatio < 0.25 && entries.length < 3) confidence = "red";
  return { confidence, amberCount: amber };
}

function ragColor(c: BulkConfidence): string {
  if (c === "green") return "oklch(0.65 0.15 145)";
  if (c === "amber") return "oklch(0.72 0.15 75)";
  if (c === "red") return "oklch(0.65 0.18 25)";
  return "var(--ow-text-lo)";
}

function ragLabel(c: BulkConfidence): string {
  if (c === "green") return "Clean";
  if (c === "amber") return "Review";
  if (c === "red") return "Discarded";
  return "";
}

function classifyFile(file: File): BulkFileKind {
  const name = file.name.toLowerCase();
  const lastDot = name.lastIndexOf(".");
  const ext = lastDot >= 0 ? name.slice(lastDot) : "";
  const IMG_EXT = [".jpg", ".jpeg", ".png", ".webp", ".gif", ".bmp"];
  const TXT_EXT = [".csv", ".txt", ".md", ".tsv"];
  const XLSX_EXT = [".xlsx", ".xls", ".ods"];
  const AUDIO_EXT = [".m4a", ".mp3", ".mp4", ".wav", ".ogg", ".webm", ".mpga", ".mpeg"];
  const PHASE2_EXT = [".docx", ".doc", ".pptx", ".rtf", ".key", ".pages", ".numbers", ".zip"];

  // WhatsApp exports come as either "WhatsApp Chat - ....txt" (unzipped),
  // or "_chat.txt" (raw). Treat those as a distinct kind so we can strip
  // timestamp scaffolding before sending to the text LLM.
  const isWhatsAppTxt =
    ext === ".txt" &&
    (name.includes("whatsapp") || name.includes("_chat") || name.startsWith("chat "));

  if (IMG_EXT.includes(ext)) {
    if (file.size > BULK_MAX_IMAGE_BYTES) return "toolarge";
    return "image";
  }
  if (isWhatsAppTxt) {
    if (file.size > BULK_MAX_TEXT_BYTES * 4) return "toolarge"; // WhatsApp exports can be chunky
    return "whatsapp";
  }
  if (TXT_EXT.includes(ext)) {
    if (file.size > BULK_MAX_TEXT_BYTES) return "toolarge";
    return "text";
  }
  if (ext === ".pdf") {
    if (file.size > BULK_MAX_PDF_BYTES) return "toolarge";
    return "pdf";
  }
  if (XLSX_EXT.includes(ext)) {
    if (file.size > BULK_MAX_XLSX_BYTES) return "toolarge";
    return "xlsx";
  }
  if (AUDIO_EXT.includes(ext)) {
    if (file.size > BULK_MAX_AUDIO_BYTES) return "toolarge";
    return "audio";
  }
  if (PHASE2_EXT.includes(ext)) return "unsupported";
  return "unsupported";
}

function readFileAsBase64(file: File): Promise<string> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onerror = () => reject(new Error("Failed to read file"));
    reader.onload = () => {
      const result = reader.result as string;
      // strip the "data:image/...;base64," prefix
      const commaIdx = result.indexOf(",");
      resolve(commaIdx >= 0 ? result.slice(commaIdx + 1) : result);
    };
    reader.readAsDataURL(file);
  });
}

function readFileAsText(file: File): Promise<string> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onerror = () => reject(new Error("Failed to read file"));
    reader.onload = () => resolve((reader.result as string) ?? "");
    reader.readAsText(file);
  });
}

function readFileAsArrayBuffer(file: File): Promise<ArrayBuffer> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onerror = () => reject(new Error("Failed to read file"));
    reader.onload = () => resolve(reader.result as ArrayBuffer);
    reader.readAsArrayBuffer(file);
  });
}

// PDF text extraction via pdfjs-dist. Only reads the *text layer* — image-only
// scans come back empty and are surfaced as red/discarded to the user (we
// don't silently fake OCR on scans).
async function readPdfAsText(file: File): Promise<string> {
  const buf = await readFileAsArrayBuffer(file);
  // Dynamic import keeps ~2MB of pdf.js out of the main bundle until needed.
  const pdfjs = await import("pdfjs-dist");
  // Disable the worker — the small perf hit is worth avoiding CORS / worker
  // config complexity on the Emergent preview edge.
  const { GlobalWorkerOptions } = pdfjs as unknown as { GlobalWorkerOptions: { workerSrc: string } };
  try { GlobalWorkerOptions.workerSrc = ""; } catch { /* older builds */ }

  const loadingTask = pdfjs.getDocument({ data: buf, disableWorker: true } as unknown as Parameters<typeof pdfjs.getDocument>[0]);
  const pdf = await loadingTask.promise;
  const pageTexts: string[] = [];
  const pageCount = Math.min(pdf.numPages, 30); // don't blow the LLM context
  for (let i = 1; i <= pageCount; i++) {
    const page = await pdf.getPage(i);
    const content = await page.getTextContent();
    const text = (content.items as Array<{ str?: string }>).map((it) => it.str ?? "").join(" ");
    if (text.trim()) pageTexts.push(text);
  }
  return pageTexts.join("\n\n").slice(0, 50000);
}

// XLSX / XLS / ODS → flatten each sheet to CSV-ish text.
// SheetJS's `sheet_to_csv` gives us the LLM a familiar structured shape.
async function readXlsxAsText(file: File): Promise<string> {
  const buf = await readFileAsArrayBuffer(file);
  const XLSX = await import("xlsx");
  const wb = XLSX.read(buf, { type: "array" });
  const sections: string[] = [];
  for (const sheetName of wb.SheetNames) {
    const sheet = wb.Sheets[sheetName];
    if (!sheet) continue;
    const csv = XLSX.utils.sheet_to_csv(sheet, { blankrows: false });
    if (csv.trim()) sections.push(`### Sheet: ${sheetName}\n${csv}`);
  }
  return sections.join("\n\n").slice(0, 50000);
}

// WhatsApp exports look like: "12/03/2024, 07:14 - Rich: added 30g DAP to T7"
// or (iOS) "[12/03/2024, 07:14:22] Rich: added 30g DAP to T7"
// Strip system noise ("Messages and calls are end-to-end encrypted", media
// omitted placeholders, join/leave events) so the LLM sees clean turns.
function cleanWhatsAppText(raw: string): string {
  const lines = raw.split(/\r?\n/);
  const keep: string[] = [];
  const NOISE_HINTS = [
    "end-to-end encrypted",
    "messages and calls are",
    "<Media omitted>",
    "image omitted",
    "video omitted",
    "audio omitted",
    "sticker omitted",
    "GIF omitted",
    "document omitted",
    "You deleted this message",
    "This message was deleted",
    "created group",
    "added you",
    "changed the subject",
    "changed this group's icon",
    "left",
    "joined using this group",
  ];
  for (const line of lines) {
    if (!line.trim()) continue;
    if (NOISE_HINTS.some((n) => line.includes(n))) continue;
    keep.push(line);
  }
  return keep.join("\n").slice(0, 50000);
}

async function runPool<T>(items: T[], concurrency: number, worker: (item: T) => Promise<void>): Promise<void> {
  const queue = [...items];
  const runners: Promise<void>[] = [];
  for (let i = 0; i < Math.min(concurrency, queue.length); i++) {
    runners.push((async function loop() {
      while (queue.length > 0) {
        const next = queue.shift();
        if (!next) return;
        await worker(next);
      }
    })());
  }
  await Promise.all(runners);
}

// Recursively walk a dropped FileSystemEntry tree. Used by the drop handler
// so users can literally drag a whole vintage folder in.
async function walkEntry(entry: FileSystemEntry, out: File[], prefix = ""): Promise<void> {
  if (entry.isFile) {
    return new Promise((resolve) => {
      (entry as FileSystemFileEntry).file((file) => {
        try {
          Object.defineProperty(file, "webkitRelativePath", { value: prefix ? `${prefix}/${file.name}` : file.name });
        } catch { /* readonly on some browsers */ }
        out.push(file);
        resolve();
      }, () => resolve());
    });
  }
  if (entry.isDirectory) {
    const dir = entry as FileSystemDirectoryEntry;
    const reader = dir.createReader();
    const readAll = (): Promise<FileSystemEntry[]> =>
      new Promise((resolve) => {
        const entries: FileSystemEntry[] = [];
        const readBatch = () => {
          reader.readEntries((batch) => {
            if (batch.length === 0) resolve(entries);
            else { entries.push(...batch); readBatch(); }
          }, () => resolve(entries));
        };
        readBatch();
      });
    const children = await readAll();
    const nextPrefix = prefix ? `${prefix}/${entry.name}` : entry.name;
    await Promise.all(children.map((c) => walkEntry(c, out, nextPrefix)));
  }
}

export function BulkTab({
  onEntries,
}: {
  onEntries: (entries: ParsedEntry[], source: "bulk") => void;
}) {
  const [files, setFiles] = useState<BulkFile[]>([]);
  const [isDragging, setIsDragging] = useState(false);
  const [processing, setProcessing] = useState(false);
  const [processed, setProcessed] = useState(false);
  const [includeAmber, setIncludeAmber] = useState(true);
  const [showPrivacy, setShowPrivacy] = useState(true);
  const folderInputRef = useRef<HTMLInputElement>(null);
  const filesInputRef = useRef<HTMLInputElement>(null);
  const parseFromText = trpc.vintageLog.parseFromText.useMutation();
  const parseFromImage = trpc.vintageLog.parseFromImage.useMutation();
  const parseFromVoice = trpc.vintageLog.parseFromVoice.useMutation();

  const addFiles = useCallback((incoming: File[]) => {
    if (incoming.length === 0) return;
    setFiles((prev) => {
      const remaining = BULK_MAX_FILES - prev.length;
      if (remaining <= 0) {
        toast.error(`Max ${BULK_MAX_FILES} files at once.`);
        return prev;
      }
      const slice = incoming.slice(0, remaining);
      if (incoming.length > remaining) {
        toast.warning(`Only added the first ${remaining} of ${incoming.length} files (batch cap ${BULK_MAX_FILES}).`);
      }
      const newRows: BulkFile[] = slice.map((f, i) => {
        const kind = classifyFile(f);
        let status: BulkFileStatus = "queued";
        let message = "Queued";
        if (kind === "unsupported") { status = "skipped"; message = "Phase 2: PDF/DOCX/XLSX support coming soon"; }
        if (kind === "toolarge") { status = "skipped"; message = "Too large for this batch — split it up"; }
        // `webkitRelativePath` is set when a folder is picked
        const path = (f as unknown as { webkitRelativePath?: string }).webkitRelativePath || f.name;
        return {
          id: `bf-${Date.now()}-${i}-${Math.random().toString(36).slice(2, 6)}`,
          name: f.name,
          path,
          size: f.size,
          kind,
          status,
          entryCount: 0,
          amberCount: 0,
          confidence: null,
          message,
          file: f,
        };
      });
      return [...prev, ...newRows];
    });
  }, []);

  const handleFolderPick = (list: FileList | null) => {
    if (!list) return;
    addFiles(Array.from(list));
  };

  const handleDrop = (e: React.DragEvent<HTMLDivElement>) => {
    e.preventDefault();
    setIsDragging(false);
    const dt = e.dataTransfer;
    if (!dt) return;
    // Prefer webkit entries so we can recursively walk dropped folders.
    const items = dt.items;
    if (items && items.length > 0 && typeof items[0].webkitGetAsEntry === "function") {
      const collected: File[] = [];
      const promises: Promise<void>[] = [];
      for (let i = 0; i < items.length; i++) {
        const entry = items[i].webkitGetAsEntry?.();
        if (entry) promises.push(walkEntry(entry, collected));
      }
      Promise.all(promises).then(() => addFiles(collected));
      return;
    }
    addFiles(Array.from(dt.files));
  };

  const removeFile = (id: string) => setFiles((prev) => prev.filter((f) => f.id !== id));
  const clearAll = () => { setFiles([]); setProcessed(false); onEntries([], "bulk"); };

  const updateFile = (id: string, patch: Partial<BulkFile>) =>
    setFiles((prev) => prev.map((f) => (f.id === id ? { ...f, ...patch } : f)));

  const startProcessing = async () => {
    const queued = files.filter((f) => f.status === "queued");
    if (queued.length === 0) {
      toast.info("Nothing to process. Add supported files first.");
      return;
    }
    setProcessing(true);
    setProcessed(false);

    await runPool(queued, BULK_CONCURRENCY, async (bf) => {
      updateFile(bf.id, { status: "processing", message: "Reading…" });
      try {
        let entries: Omit<ParsedEntry, "id">[] = [];
        if (bf.kind === "image") {
          const b64 = await readFileAsBase64(bf.file);
          const mime = bf.file.type || "image/jpeg";
          const res = await parseFromImage.mutateAsync({ imageBase64: b64, mimeType: mime });
          entries = (res.entries as Omit<ParsedEntry, "id">[]) ?? [];
        } else if (bf.kind === "text") {
          const raw = await readFileAsText(bf.file);
          if (!raw.trim()) {
            updateFile(bf.id, { status: "skipped", message: "Empty file — nothing to read" });
            return;
          }
          const res = await parseFromText.mutateAsync({ rawText: raw.slice(0, 50000) });
          entries = (res.entries as Omit<ParsedEntry, "id">[]) ?? [];
        } else if (bf.kind === "pdf") {
          updateFile(bf.id, { message: "Extracting PDF text…" });
          const raw = await readPdfAsText(bf.file);
          if (!raw.trim()) {
            // Text layer empty → almost certainly a scan. Mark red + honest.
            updateFile(bf.id, {
              status: "done",
              entryCount: 0,
              confidence: "red",
              message: "Scanned PDF — no text layer. Export pages as images and drop them here instead.",
              entries: [],
            });
            return;
          }
          const res = await parseFromText.mutateAsync({ rawText: raw });
          entries = (res.entries as Omit<ParsedEntry, "id">[]) ?? [];
        } else if (bf.kind === "xlsx") {
          updateFile(bf.id, { message: "Flattening spreadsheet…" });
          const raw = await readXlsxAsText(bf.file);
          if (!raw.trim()) {
            updateFile(bf.id, { status: "skipped", message: "Spreadsheet had no readable data" });
            return;
          }
          const res = await parseFromText.mutateAsync({ rawText: raw });
          entries = (res.entries as Omit<ParsedEntry, "id">[]) ?? [];
        } else if (bf.kind === "whatsapp") {
          updateFile(bf.id, { message: "Cleaning WhatsApp export…" });
          const rawTxt = await readFileAsText(bf.file);
          const cleaned = cleanWhatsAppText(rawTxt);
          if (!cleaned.trim()) {
            updateFile(bf.id, { status: "skipped", message: "WhatsApp export had no readable turns" });
            return;
          }
          const res = await parseFromText.mutateAsync({ rawText: cleaned });
          entries = (res.entries as Omit<ParsedEntry, "id">[]) ?? [];
        } else if (bf.kind === "audio") {
          updateFile(bf.id, { message: "Transcribing audio…" });
          const b64 = await readFileAsBase64(bf.file);
          const mime = bf.file.type || "audio/mpeg";
          const res = await parseFromVoice.mutateAsync({ audioBase64: b64, mimeType: mime, language: "en" });
          entries = (res.entries as Omit<ParsedEntry, "id">[]) ?? [];
        }
        const { confidence, amberCount } = fileConfidence(entries);
        const greenCount = entries.length - amberCount;
        let message: string;
        if (entries.length === 0) {
          message = "AI couldn't read this — file discarded";
        } else if (confidence === "green") {
          message = `${entries.length} ${entries.length === 1 ? "entry" : "entries"} · clean extraction`;
        } else if (confidence === "amber") {
          message = `${entries.length} ${entries.length === 1 ? "entry" : "entries"} · ${amberCount} need review`;
        } else {
          message = `${entries.length} thin ${entries.length === 1 ? "entry" : "entries"} · low confidence`;
        }
        updateFile(bf.id, {
          status: "done",
          entryCount: entries.length,
          amberCount,
          confidence,
          message: greenCount === entries.length && entries.length > 0 ? message : message,
          entries,
        });
      } catch (err) {
        const msg = err instanceof Error ? err.message : "Extraction failed";
        updateFile(bf.id, { status: "error", message: msg, confidence: "red" });
      }
    });

    setProcessing(false);
    setProcessed(true);
  };

  // Recompute the preview whenever the file set changes OR the amber-filter
  // toggles. Keeps `PreviewTable` (in the parent) as the single source of
  // truth for user review before save.
  useEffect(() => {
    if (!processed) return;
    const collected: Omit<ParsedEntry, "id">[] = [];
    for (const f of files) {
      if (f.status !== "done" || !f.entries) continue;
      for (const e of f.entries) {
        const q = classifyEntryQuality(e);
        if (q === "amber" && !includeAmber) continue;
        collected.push(e);
      }
    }
    onEntries(assignIds(collected), "bulk");
    if (collected.length > 0) {
      toast.success(`${collected.length} ${collected.length === 1 ? "entry" : "entries"} ready to review.`);
    }
  }, [processed, includeAmber, files]);

  const supportedCount = files.filter((f) => f.status === "queued" || f.status === "processing" || f.status === "done").length;
  const skippedCount = files.filter((f) => f.status === "skipped").length;
  const greenFiles = files.filter((f) => f.confidence === "green").length;
  const amberFiles = files.filter((f) => f.confidence === "amber").length;
  const redFiles = files.filter((f) => f.confidence === "red" || (f.status === "error")).length;
  const totalEntries = files.reduce((sum, f) => sum + (f.entryCount || 0), 0);
  const totalAmber = files.reduce((sum, f) => sum + (f.amberCount || 0), 0);

  return (
    <div className="space-y-4" data-testid="bulk-tab">
      {/* ── Privacy / how-this-works panel ───────────────────────────────── */}
      {/* Collapsible, default-open so new users see the promises up-front.  */}
      <div
        className="rounded-xl overflow-hidden"
        style={{ border: "1px solid var(--ow-bg-inset)", background: "oklch(0.16 0.04 65 / 60%)" }}
        data-testid="bulk-privacy-panel"
      >
        <button
          type="button"
          onClick={() => setShowPrivacy((v) => !v)}
          className="w-full flex items-center gap-3 px-4 py-3 text-left"
          data-testid="bulk-privacy-toggle"
        >
          <ShieldCheck size={16} style={{ color: "var(--ow-amber)" }} />
          <span className="text-xs font-semibold" style={{ color: "var(--ow-text-hi)" }}>
            How Ownology reads your files
          </span>
          <span className="ml-auto text-xs" style={{ color: "var(--ow-text-lo)" }}>
            {showPrivacy ? "Hide" : "Show"}
          </span>
        </button>
        {showPrivacy && (
          <ul
            className="px-4 pb-3 pt-1 space-y-1.5 text-xs"
            style={{ color: "var(--ow-text-mid)" }}
          >
            <li>
              <strong style={{ color: "var(--ow-text-hi)" }}>Local first.</strong>{" "}
              Files stay in this browser until you press <em>Extract</em>. Nothing is uploaded before then.
            </li>
            <li>
              <strong style={{ color: "var(--ow-text-hi)" }}>Read once, kept never.</strong>{" "}
              Each file is sent to our AI reader over an encrypted connection, structured entries come back, and the original bytes are discarded. We don&apos;t archive your notebooks or spreadsheets.
            </li>
            <li>
              <strong style={{ color: "var(--ow-text-hi)" }}>Quality-graded.</strong>{" "}
              Every file gets a badge:{" "}
              <span style={{ color: ragColor("green"), fontWeight: 600 }}>Green</span> = clean,{" "}
              <span style={{ color: ragColor("amber"), fontWeight: 600 }}>Amber</span> = review needed (missing fields, ambiguous OCR),{" "}
              <span style={{ color: ragColor("red"), fontWeight: 600 }}>Red</span> = illegible or empty — we don&apos;t guess.
            </li>
            <li>
              <strong style={{ color: "var(--ow-text-hi)" }}>You approve everything.</strong>{" "}
              Only entries you review and save land in your vintage log. Nothing autopopulates tanks, assets, or anywhere else — and you can delete any entry at any time.
            </li>
          </ul>
        )}
      </div>

      {/* Drop zone */}
      <div
        onDragOver={(e) => { e.preventDefault(); setIsDragging(true); }}
        onDragLeave={() => setIsDragging(false)}
        onDrop={handleDrop}
        data-testid="bulk-dropzone"
        className="rounded-xl p-6 text-center transition-all"
        style={{
          border: `2px dashed ${isDragging ? "var(--ow-amber)" : "var(--ow-bg-inset)"}`,
          background: isDragging ? "oklch(0.20 0.08 65 / 30%)" : "var(--ow-bg-base)",
        }}
      >
        <FolderUp size={36} style={{ color: "var(--ow-amber)", margin: "0 auto 0.75rem" }} />
        <p className="text-sm font-semibold" style={{ color: "var(--ow-text-hi)" }}>
          Drop a folder or files here
        </p>
        <p className="text-xs mt-1" style={{ color: "var(--ow-text-lo)" }}>
          Notebook photos · spreadsheets (CSV/XLSX) · plain-text notes · text-layer PDFs · WhatsApp chat exports · voice notes (.m4a/.mp3). Up to {BULK_MAX_FILES} files.
        </p>

        <div className="flex flex-wrap gap-2 justify-center mt-4">
          <Button
            type="button"
            variant="outline"
            size="sm"
            onClick={() => folderInputRef.current?.click()}
            disabled={processing}
            data-testid="bulk-pick-folder"
          >
            <FolderUp size={14} className="mr-2" /> Pick folder
          </Button>
          <Button
            type="button"
            variant="outline"
            size="sm"
            onClick={() => filesInputRef.current?.click()}
            disabled={processing}
            data-testid="bulk-pick-files"
          >
            <FileText size={14} className="mr-2" /> Pick files
          </Button>
          {files.length > 0 && (
            <Button
              type="button"
              variant="ghost"
              size="sm"
              onClick={clearAll}
              disabled={processing}
              data-testid="bulk-clear"
            >
              <Trash2 size={14} className="mr-2" /> Clear
            </Button>
          )}
        </div>

        {/* Hidden pickers */}
        <input
          ref={folderInputRef}
          type="file"
          className="hidden"
          // The `webkitdirectory` attribute lets users pick a whole folder in
          // Chromium/Safari/Firefox. TS doesn't know about it, so cast.
          {...({ webkitdirectory: "", directory: "" } as unknown as Record<string, string>)}
          multiple
          onChange={(e) => handleFolderPick(e.target.files)}
          data-testid="bulk-folder-input"
        />
        <input
          ref={filesInputRef}
          type="file"
          className="hidden"
          multiple
          accept=".csv,.txt,.md,.tsv,.jpg,.jpeg,.png,.webp,.gif,.bmp,.pdf,.xlsx,.xls,.ods,.m4a,.mp3,.mp4,.wav,.ogg,.webm,.mpga"
          onChange={(e) => handleFolderPick(e.target.files)}
          data-testid="bulk-files-input"
        />
      </div>

      {/* File list */}
      {files.length > 0 && (
        <div className="space-y-2" data-testid="bulk-file-list">
          <div className="flex items-center justify-between text-xs" style={{ color: "var(--ow-text-lo)" }}>
            <span>{files.length} {files.length === 1 ? "file" : "files"} · {supportedCount} supported · {skippedCount} skipped</span>
          </div>
          <div
            className="rounded-lg overflow-hidden"
            style={{ background: "var(--ow-bg-base)", border: "1px solid var(--ow-bg-inset)" }}
          >
            {files.map((f) => (
              <div
                key={f.id}
                className="flex items-center gap-3 px-3 py-2 text-xs border-b last:border-b-0"
                style={{ borderColor: "var(--ow-bg-inset)" }}
                data-testid={`bulk-file-row-${f.status}`}
              >
                <div className="flex-shrink-0 flex items-center gap-2">
                  {f.status === "queued" && <FileText size={14} style={{ color: "var(--ow-text-lo)" }} />}
                  {f.status === "processing" && <Loader2 size={14} className="animate-spin" style={{ color: "var(--ow-amber)" }} />}
                  {f.status === "done" && (
                    <span
                      title={ragLabel(f.confidence)}
                      style={{
                        width: 10, height: 10, borderRadius: 10,
                        background: ragColor(f.confidence),
                        display: "inline-block",
                        boxShadow: `0 0 0 2px oklch(0.20 0.02 60)`,
                      }}
                      data-testid={`bulk-rag-${f.confidence}`}
                    />
                  )}
                  {f.status === "error" && <AlertCircle size={14} style={{ color: ragColor("red") }} />}
                  {f.status === "skipped" && <AlertCircle size={14} style={{ color: "var(--ow-text-lo)" }} />}
                </div>
                <div className="flex-1 min-w-0">
                  <div className="truncate font-medium" style={{ color: "var(--ow-text-hi)" }}>{f.path}</div>
                  <div className="truncate mt-0.5" style={{ color: f.confidence === "red" || f.status === "error" ? ragColor("red") : "var(--ow-text-lo)" }}>
                    {f.status === "done" && f.confidence && (
                      <span className="mr-1.5" style={{ color: ragColor(f.confidence), fontWeight: 600, textTransform: "uppercase", letterSpacing: "0.03em" }}>
                        {ragLabel(f.confidence)} ·
                      </span>
                    )}
                    {f.message}
                  </div>
                </div>
                {!processing && f.status !== "processing" && (
                  <button
                    type="button"
                    onClick={() => removeFile(f.id)}
                    className="p-1 rounded hover:bg-white/5"
                    aria-label={`Remove ${f.name}`}
                    data-testid={`bulk-remove-${f.id}`}
                  >
                    <X size={12} style={{ color: "var(--ow-text-lo)" }} />
                  </button>
                )}
              </div>
            ))}
          </div>

          <Button
            className="w-full h-12"
            onClick={startProcessing}
            disabled={processing || files.every((f) => f.status !== "queued")}
            style={{ background: "var(--ow-amber)", color: "oklch(0.10 0.008 60)" }}
            data-testid="bulk-process-btn"
          >
            {processing ? (
              <><Loader2 size={16} className="mr-2 animate-spin" /> Reading folder…</>
            ) : (
              <><Upload size={16} className="mr-2" /> Extract {files.filter((f) => f.status === "queued").length} {files.filter((f) => f.status === "queued").length === 1 ? "file" : "files"}</>
            )}
          </Button>

          {/* ── Batch summary + amber toggle ─────────────────────────────── */}
          {/* Only appears after we've finished a run. Explains what landed  */}
          {/* in the preview vs what got binned, and lets the user opt out  */}
          {/* of low-confidence entries before saving.                       */}
          {processed && !processing && (
            <div
              className="rounded-lg p-3 space-y-2"
              style={{ background: "var(--ow-bg-base)", border: "1px solid var(--ow-bg-inset)" }}
              data-testid="bulk-summary"
            >
              <div className="flex items-center gap-3 text-xs" style={{ color: "var(--ow-text-mid)" }}>
                <span className="inline-flex items-center gap-1.5">
                  <span style={{ width: 8, height: 8, borderRadius: 8, background: ragColor("green"), display: "inline-block" }} />
                  <strong style={{ color: "var(--ow-text-hi)" }}>{greenFiles}</strong> clean
                </span>
                <span className="inline-flex items-center gap-1.5">
                  <span style={{ width: 8, height: 8, borderRadius: 8, background: ragColor("amber"), display: "inline-block" }} />
                  <strong style={{ color: "var(--ow-text-hi)" }}>{amberFiles}</strong> review
                </span>
                <span className="inline-flex items-center gap-1.5">
                  <span style={{ width: 8, height: 8, borderRadius: 8, background: ragColor("red"), display: "inline-block" }} />
                  <strong style={{ color: "var(--ow-text-hi)" }}>{redFiles}</strong> discarded
                </span>
                <span className="ml-auto" style={{ color: "var(--ow-text-lo)" }}>
                  {totalEntries} {totalEntries === 1 ? "entry" : "entries"} · {totalAmber} amber
                </span>
              </div>
              <label
                className="flex items-center gap-2 cursor-pointer select-none"
                data-testid="bulk-amber-toggle"
              >
                <input
                  type="checkbox"
                  checked={includeAmber}
                  onChange={(e) => setIncludeAmber(e.target.checked)}
                  className="accent-amber-600"
                />
                <span className="text-xs" style={{ color: "var(--ow-text-mid)" }}>
                  Include amber entries in preview{" "}
                  <span style={{ color: "var(--ow-text-lo)" }}>
                    (thin or ambiguous — recommended for a first pass, uncheck for cleaner history)
                  </span>
                </span>
              </label>
              <p className="text-xs pt-1" style={{ color: "var(--ow-text-lo)", borderTop: "1px solid var(--ow-bg-inset)" }}>
                Entries land in your vintage log only. Nothing touches tanks, asset lists, or dashboards until you review + save below.
              </p>
            </div>
          )}
        </div>
      )}
    </div>
  );
}
