/**
 * Vintage Data Import — five input modes:
 *  1. Voice          (cellar-floor hands-free — Whisper → structured entries)
 *  2. Camera / Scan  (phone-first — device camera + Claude Sonnet vision)
 *  3. Paste          (desktop-first — any text OR clipboard screenshot + OCR)
 *  4. CSV            (structured upload with column mapping)
 *  5. Bulk           (folder drop — mixed file types processed in parallel)
 *
 * All modes produce a preview table the user can edit/delete before saving.
 * Saved entries are tagged with importSource + importBatchId in The Press.
 *
 * Feb 2026 refactor · Rich — split from the old 2200-line monolith into
 * per-tab modules for maintainability. This file is now just the composer.
 */

import { useCallback, useState } from "react";
import { trpc } from "@/lib/trpc";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import {
  ArrowLeft,
  Camera,
  CheckCircle2,
  ClipboardPaste,
  FileSpreadsheet,
  FolderUp,
  Loader2,
  Mic,
} from "lucide-react";
import { Link } from "wouter";
import {
  PreviewTable,
  type ImportSource,
  type ParsedEntry,
  type Tab,
} from "./shared";
import { VoiceTab } from "./VoiceTab";
import { CameraTab } from "./CameraTab";
import { PasteTab } from "./PasteTab";
import { CsvTab } from "./CsvTab";
import { BulkTab } from "./BulkTab";

export default function Import() {
  const [activeTab, setActiveTab] = useState<Tab>("voice");
  const [entries, setEntries] = useState<ParsedEntry[]>([]);
  const [importSource, setImportSource] = useState<ImportSource>("image");
  const [saving, setSaving] = useState(false);
  const [saved, setSaved] = useState(false);
  const bulkSave = trpc.vintageLog.bulkSave.useMutation();

  const handleEntries = useCallback(
    (newEntries: ParsedEntry[], source: ImportSource) => {
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
    { id: "voice", label: "Voice", icon: <Mic size={18} />, hint: "Hands-free" },
    { id: "camera", label: "Camera", icon: <Camera size={18} />, hint: "Phone" },
    { id: "paste", label: "Paste", icon: <ClipboardPaste size={18} />, hint: "Any text" },
    { id: "csv", label: "CSV", icon: <FileSpreadsheet size={18} />, hint: "Spreadsheet" },
    { id: "bulk", label: "Bulk", icon: <FolderUp size={18} />, hint: "Folder drop" },
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
          className="grid grid-cols-5 rounded-xl p-1 gap-1"
          style={{ background: "var(--ow-bg-raised)" }}
        >
          {TABS.map((tab) => (
            <button
              key={tab.id}
              onClick={() => { setActiveTab(tab.id); setEntries([]); setSaved(false); }}
              data-testid={`import-tab-${tab.id}`}
              aria-selected={activeTab === tab.id}
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
          {activeTab === "voice" && <VoiceTab onEntries={handleEntries} />}
          {activeTab === "camera" && <CameraTab onEntries={handleEntries} />}
          {activeTab === "paste" && <PasteTab onEntries={handleEntries} />}
          {activeTab === "csv" && <CsvTab onEntries={handleEntries} />}
          {activeTab === "bulk" && <BulkTab onEntries={handleEntries} />}
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
            <li>• <strong style={{ color: "var(--ow-text-mid)" }}>Bulk:</strong> Drop a whole folder — notebook photos, spreadsheets, cellar notes. Ownology reads each file in parallel.</li>
          </ul>
        </div>
      </div>
    </div>
  );
}
