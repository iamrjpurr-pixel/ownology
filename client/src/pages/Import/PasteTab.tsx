/**
 * Paste Tab — desktop-first. Paste any text OR a screenshot from the clipboard.
 * Images run through OCR + spell-check before extraction. Side-by-side layout
 * keeps the source image visible while the operator reviews the cleaned text
 * (Feb 2026 · Rich).
 */

import { useState } from "react";
import { trpc } from "@/lib/trpc";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import {
  ClipboardPaste,
  Loader2,
  AlertCircle,
} from "lucide-react";
import { assignIds, type ParsedEntry } from "./shared";

export function PasteTab({
  onEntries,
}: {
  onEntries: (entries: ParsedEntry[], source: "paste") => void;
}) {
  const [text, setText] = useState("");
  const [parsing, setParsing] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const parseFromText = trpc.vintageLog.parseFromText.useMutation();
  const ocrImage = trpc.vintageLog.ocrImageToCleanText.useMutation();

  // Image-paste OCR state
  const [ocrRunning, setOcrRunning] = useState(false);
  const [ocrResult, setOcrResult] = useState<{
    rawOcrText: string;
    cleanedText: string;
    totalWords: number;
    recognisedWords: number;
    confidencePct: number;
    corrections: Array<{ original: string; corrected: string; reason: string }>;
  } | null>(null);
  const [showRaw, setShowRaw] = useState(false);
  const [imagePreview, setImagePreview] = useState<string | null>(null);

  async function handleImageBlob(blob: Blob) {
    setError(null);
    setOcrResult(null);
    setOcrRunning(true);
    try {
      const dataUrl = await new Promise<string>((resolve, reject) => {
        const reader = new FileReader();
        reader.onload = () => resolve(String(reader.result));
        reader.onerror = () => reject(reader.error);
        reader.readAsDataURL(blob);
      });
      setImagePreview(dataUrl);
      const base64 = dataUrl.split(",", 2)[1] ?? "";
      const mimeType = blob.type || "image/png";
      const result = await ocrImage.mutateAsync({ imageBase64: base64, mimeType });
      setOcrResult(result);
      // Auto-populate the textarea with the CLEANED text so Extract Entries just works
      setText(result.cleanedText);
    } catch {
      setError("OCR failed on the pasted image. Try re-copying or paste as text instead.");
    } finally {
      setOcrRunning(false);
    }
  }

  function onPaste(e: React.ClipboardEvent<HTMLTextAreaElement>) {
    const items = e.clipboardData?.items;
    if (!items) return;
    for (const item of Array.from(items)) {
      if (item.kind === "file" && item.type.startsWith("image/")) {
        const blob = item.getAsFile();
        if (blob) {
          e.preventDefault(); // don't paste raw base64 into the textarea
          void handleImageBlob(blob);
          return;
        }
      }
    }
    // No image → default paste behaviour (text lands in the textarea)
  }

  function resetOcr() {
    setOcrResult(null);
    setImagePreview(null);
    setShowRaw(false);
    setText("");
  }

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
    <div className="space-y-4" data-testid="paste-tab">
      <div>
        <p className="text-sm mb-3" style={{ color: "var(--ow-text-mid)" }}>
          Paste anything — Excel cells, typed notes, emails, lab results, OR{" "}
          <strong style={{ color: "var(--ow-amber)" }}>a screenshot / photo from your clipboard</strong>.
          Images run through OCR + spell-check before extraction.
        </p>

        {/* OCR image preview + score card */}
        {ocrRunning && (
          <div
            data-testid="paste-ocr-running"
            className="flex items-center gap-3 p-3 rounded-lg mb-3"
            style={{ background: "color-mix(in oklch, var(--ow-amber) 8%, transparent)", border: "1px solid color-mix(in oklch, var(--ow-amber) 30%, transparent)" }}
          >
            <Loader2 size={18} className="animate-spin" style={{ color: "var(--ow-amber)" }} />
            <p className="text-sm" style={{ color: "var(--ow-text-hi)" }}>
              Reading image · spell-checking · scoring word quality…
            </p>
          </div>
        )}

        {ocrResult && !ocrRunning && (
          <div
            data-testid="paste-ocr-result"
            className="rounded-lg mb-3 overflow-hidden"
            style={{ border: "1px solid color-mix(in oklch, var(--ow-amber) 40%, transparent)" }}
          >
            {/* Score header */}
            <div
              className="flex items-center justify-between p-3"
              style={{ background: "color-mix(in oklch, var(--ow-amber) 12%, transparent)" }}
            >
              <div>
                <p className="text-xs uppercase tracking-wider font-semibold" style={{ color: "var(--ow-amber)" }}>
                  OCR quality
                </p>
                <p className="text-lg font-bold" style={{ fontFamily: "'Fraunces',serif", color: "var(--ow-text-hi)" }} data-testid="paste-ocr-score">
                  {ocrResult.recognisedWords} / {ocrResult.totalWords} words recognised
                  <span
                    style={{
                      marginLeft: 10,
                      fontSize: "0.85rem",
                      fontFamily: "'Fira Code',monospace",
                      color: ocrResult.confidencePct >= 85
                        ? "oklch(0.65 0.15 145)"
                        : ocrResult.confidencePct >= 60
                          ? "var(--ow-amber)"
                          : "oklch(0.65 0.18 25)",
                    }}
                    data-testid="paste-ocr-confidence"
                  >
                    {ocrResult.confidencePct}%
                  </span>
                </p>
              </div>
              <div className="flex gap-2">
                <button
                  type="button"
                  data-testid="paste-ocr-toggle-raw"
                  onClick={() => setShowRaw((s) => !s)}
                  disabled={ocrResult.corrections.length === 0 && ocrResult.rawOcrText === ocrResult.cleanedText}
                  className="text-xs px-2.5 py-1 rounded"
                  style={{
                    background: "transparent",
                    border: "1px solid var(--ow-border-md)",
                    color: "var(--ow-text-mid)",
                    cursor: (ocrResult.corrections.length === 0 && ocrResult.rawOcrText === ocrResult.cleanedText) ? "not-allowed" : "pointer",
                    opacity: (ocrResult.corrections.length === 0 && ocrResult.rawOcrText === ocrResult.cleanedText) ? 0.5 : 1,
                  }}
                  title={
                    ocrResult.corrections.length === 0 && ocrResult.rawOcrText === ocrResult.cleanedText
                      ? "No corrections were needed — raw and cleaned are identical"
                      : "Toggle between raw OCR and spell-checked text"
                  }
                >
                  {showRaw ? "Show cleaned" : "Show raw"}
                </button>
                <button
                  type="button"
                  data-testid="paste-ocr-reset"
                  onClick={resetOcr}
                  className="text-xs px-2.5 py-1 rounded"
                  style={{ background: "transparent", border: "1px solid var(--ow-border-md)", color: "var(--ow-text-lo)", cursor: "pointer" }}
                >
                  Discard
                </button>
              </div>
            </div>

            {/* Corrections list */}
            {ocrResult.corrections.length > 0 && (
              <div className="p-3" style={{ background: "var(--ow-bg-base)", borderBottom: "1px solid var(--ow-border-md)" }}>
                <p className="text-xs mb-1.5" style={{ color: "var(--ow-text-lo)", fontFamily: "'Lato',sans-serif" }}>
                  {ocrResult.corrections.length} correction{ocrResult.corrections.length === 1 ? "" : "s"} applied:
                </p>
                <ul
                  data-testid="paste-ocr-corrections"
                  style={{ listStyle: "none", padding: 0, margin: 0, fontFamily: "'Fira Code',monospace", fontSize: "0.72rem", color: "var(--ow-text-mid)", maxHeight: 120, overflowY: "auto" }}
                >
                  {ocrResult.corrections.slice(0, 8).map((c, i) => (
                    <li key={i} style={{ marginBottom: 2 }}>
                      <span style={{ color: "oklch(0.65 0.18 25)", textDecoration: "line-through" }}>{c.original}</span>
                      {" → "}
                      <span style={{ color: "oklch(0.65 0.15 145)" }}>{c.corrected}</span>
                      {c.reason && (
                        <span style={{ color: "var(--ow-text-lo)", fontStyle: "italic" }}> — {c.reason}</span>
                      )}
                    </li>
                  ))}
                  {ocrResult.corrections.length > 8 && (
                    <li style={{ color: "var(--ow-text-lo)", fontStyle: "italic" }}>+ {ocrResult.corrections.length - 8} more…</li>
                  )}
                </ul>
              </div>
            )}

            {/* Image + text — side-by-side reference layout (Feb 2026 · Rich).
                 The original stays visible while the operator hand-edits the
                 OCR text below, so any words the AI missed can be caught by
                 eyeballing the source. On mobile these stack vertically. */}
            <div
              style={{
                display: "grid",
                gridTemplateColumns: imagePreview ? "minmax(0, 1fr) minmax(0, 1.4fr)" : "1fr",
                gap: "0.75rem",
                padding: "0.85rem 0.85rem",
                background: "var(--ow-bg-base)",
              }}
              className="paste-ocr-split"
              data-testid="paste-ocr-split"
            >
              {imagePreview && (
                <div>
                  <p style={{ fontFamily: "'Lato',sans-serif", fontSize: "0.66rem", letterSpacing: "0.12em", textTransform: "uppercase", color: "var(--ow-text-lo)", fontWeight: 600, marginBottom: 4 }}>
                    Original — for reference
                  </p>
                  <a
                    href={imagePreview}
                    target="_blank"
                    rel="noreferrer"
                    data-testid="paste-ocr-preview-link"
                    style={{ display: "block", background: "oklch(0.14 0.010 60)", borderRadius: 4, padding: 4, border: "1px solid var(--ow-border-md)" }}
                    title="Open original in a new tab (zoom for detail)"
                  >
                    <img
                      src={imagePreview}
                      alt="Pasted source"
                      data-testid="paste-ocr-preview"
                      style={{ width: "100%", maxHeight: 340, objectFit: "contain", display: "block", borderRadius: 3 }}
                    />
                  </a>
                  <p style={{ fontFamily: "'Lato',sans-serif", fontSize: "0.66rem", fontStyle: "italic", color: "var(--ow-text-lo)", marginTop: 4, textAlign: "center" }}>
                    Click to enlarge · use this to spot what the OCR missed
                  </p>
                </div>
              )}
              <div>
                <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: 4 }}>
                  <p style={{ fontFamily: "'Lato',sans-serif", fontSize: "0.66rem", letterSpacing: "0.12em", textTransform: "uppercase", color: "var(--ow-text-lo)", fontWeight: 600, margin: 0 }}>
                    {showRaw ? "Raw OCR (verbatim)" : "Cleaned text — used for extraction"}
                  </p>
                  <p style={{ fontFamily: "'Lato',sans-serif", fontSize: "0.66rem", color: "var(--ow-amber)", fontStyle: "italic", margin: 0 }}>
                    Editable ↓ in the textarea below
                  </p>
                </div>
                <pre
                  data-testid="paste-ocr-text"
                  style={{
                    whiteSpace: "pre-wrap",
                    fontFamily: "'Fira Code',monospace",
                    fontSize: "0.78rem",
                    color: "var(--ow-text-hi)",
                    margin: 0,
                    padding: "0.55rem 0.7rem",
                    background: "oklch(0.14 0.010 60)",
                    borderRadius: 4,
                    border: "1px solid var(--ow-border-md)",
                    maxHeight: 340,
                    overflowY: "auto",
                    wordBreak: "break-word",
                  }}
                >
                  {showRaw ? ocrResult.rawOcrText : ocrResult.cleanedText}
                </pre>
              </div>
            </div>
          </div>
        )}

        <Textarea
          value={text}
          onChange={(e) => setText(e.target.value)}
          onPaste={onPaste}
          data-testid="paste-textarea"
          placeholder={`Paste text OR a screenshot from your clipboard.\n\nExample:\nTank 7 Shiraz — 15 March 2024\nAdded 2.6kg DAP at 1/3 sugar depletion\nBrix: 14.2, TA: 6.1, pH: 3.42\n\nBarrel 12A Chardonnay — racked off gross lees 20 March`}
          rows={10}
          className="font-mono text-sm resize-y"
          style={{
            background: "var(--ow-bg-base)",
            borderColor: "oklch(0.25 0.010 60)",
            color: "var(--ow-text-hi)",
          }}
        />
        <p className="text-xs mt-1.5" style={{ color: "oklch(0.45 0.010 60)" }}>
          {text.length.toLocaleString()} characters · max 50,000{" "}
          {ocrResult && (
            <span style={{ color: "var(--ow-amber)" }}>· auto-filled from OCR (edit before extracting)</span>
          )}
        </p>
      </div>

      <Button
        className="w-full font-semibold h-12"
        onClick={handleParse}
        disabled={parsing || !text.trim() || ocrRunning}
        data-testid="paste-extract-btn"
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
