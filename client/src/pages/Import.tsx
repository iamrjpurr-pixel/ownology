/**
 * Vintage Data Import — three input modes:
 *  1. Camera / Scan  (phone-first — uses device camera + LLM vision)
 *  2. AI Paste       (desktop-first — paste any text, LLM extracts entries)
 *  3. CSV / Excel    (structured upload with column mapping)
 *
 * All modes produce a preview table the user can edit/delete before saving.
 * Saved entries are tagged with importSource + importBatchId in The Press.
 */

import { useRef, useState, useCallback, useEffect } from "react";
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
  Mic,
  MicOff,
  Square,
  FolderUp,
  FileText,
  X,
  Info,
  ShieldCheck,
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

type Tab = "voice" | "camera" | "paste" | "csv" | "bulk";

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

// ─── Voice Tab ────────────────────────────────────────────────────────────────
// Cellar-floor hands-free logging. Winemaker taps record, speaks a memo, we
// transcribe via Whisper and structure into cellar entries.
//
// Design notes:
//  - MediaRecorder API — supported on all modern browsers incl. iOS 14.5+.
//  - We pick the first supported audio/webm mimetype; iOS falls back to
//    audio/mp4 which Whisper also accepts.
//  - Timer counts up during recording so the user has proprioceptive feedback.
//  - Live audio meter (RMS from AnalyserNode) so recording is visibly "on".
//  - Transcription is echoed back BEFORE the structured entries so the user
//    trusts what we heard — critical for a first-time voice user in a noisy
//    winery environment.

function pickAudioMimeType(): string {
  const candidates = [
    "audio/webm;codecs=opus",
    "audio/webm",
    "audio/ogg;codecs=opus",
    "audio/mp4", // iOS Safari
    "audio/mp4;codecs=mp4a.40.2",
    "audio/mpeg",
  ];
  const MR = typeof window !== "undefined" ? window.MediaRecorder : undefined;
  if (!MR) return "audio/webm";
  for (const m of candidates) {
    // isTypeSupported may be missing in test envs
    if (typeof MR.isTypeSupported === "function" && MR.isTypeSupported(m)) return m;
  }
  return "audio/webm";
}

function VoiceTab({
  onEntries,
}: {
  onEntries: (entries: ParsedEntry[], source: "voice") => void;
}) {
  const [recording, setRecording] = useState(false);
  const [elapsed, setElapsed] = useState(0); // seconds
  const [level, setLevel] = useState(0); // 0..1
  const [audioBlob, setAudioBlob] = useState<Blob | null>(null);
  const [audioUrl, setAudioUrl] = useState<string | null>(null);
  const [audioMime, setAudioMime] = useState<string>("audio/webm");
  const [processing, setProcessing] = useState(false);
  const [transcription, setTranscription] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  const mediaRecorderRef = useRef<MediaRecorder | null>(null);
  const streamRef = useRef<MediaStream | null>(null);
  const audioCtxRef = useRef<AudioContext | null>(null);
  const analyserRef = useRef<AnalyserNode | null>(null);
  const rafRef = useRef<number | null>(null);
  const timerRef = useRef<number | null>(null);
  const chunksRef = useRef<Blob[]>([]);

  const parseFromVoice = trpc.vintageLog.parseFromVoice.useMutation();

  const cleanup = useCallback(() => {
    if (rafRef.current !== null) {
      cancelAnimationFrame(rafRef.current);
      rafRef.current = null;
    }
    if (timerRef.current !== null) {
      window.clearInterval(timerRef.current);
      timerRef.current = null;
    }
    if (streamRef.current) {
      streamRef.current.getTracks().forEach((t) => t.stop());
      streamRef.current = null;
    }
    if (audioCtxRef.current && audioCtxRef.current.state !== "closed") {
      audioCtxRef.current.close().catch(() => {});
    }
    audioCtxRef.current = null;
    analyserRef.current = null;
  }, []);

  useEffect(() => {
    return () => {
      cleanup();
      if (audioUrl) URL.revokeObjectURL(audioUrl);
    };
  }, [cleanup, audioUrl]);

  const startRecording = async () => {
    setError(null);
    setTranscription(null);
    if (audioUrl) {
      URL.revokeObjectURL(audioUrl);
      setAudioUrl(null);
    }
    setAudioBlob(null);
    setElapsed(0);
    chunksRef.current = [];

    try {
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      streamRef.current = stream;

      // Meter setup — read RMS from a small buffer for a live level indicator
      try {
        const AudioCtx = window.AudioContext || (window as unknown as { webkitAudioContext: typeof AudioContext }).webkitAudioContext;
        const ctx = new AudioCtx();
        const source = ctx.createMediaStreamSource(stream);
        const analyser = ctx.createAnalyser();
        analyser.fftSize = 512;
        source.connect(analyser);
        audioCtxRef.current = ctx;
        analyserRef.current = analyser;
        const data = new Uint8Array(analyser.frequencyBinCount);
        const tick = () => {
          if (!analyserRef.current) return;
          analyserRef.current.getByteTimeDomainData(data);
          let sum = 0;
          for (let i = 0; i < data.length; i++) {
            const v = (data[i] - 128) / 128;
            sum += v * v;
          }
          const rms = Math.sqrt(sum / data.length);
          setLevel(Math.min(1, rms * 3)); // scale for visual punch
          rafRef.current = requestAnimationFrame(tick);
        };
        rafRef.current = requestAnimationFrame(tick);
      } catch {
        // Meter is optional — recording still works.
      }

      const mimeType = pickAudioMimeType();
      setAudioMime(mimeType);
      const mr = new MediaRecorder(stream, { mimeType });
      mediaRecorderRef.current = mr;

      mr.ondataavailable = (e) => {
        if (e.data && e.data.size > 0) chunksRef.current.push(e.data);
      };
      mr.onstop = () => {
        const blob = new Blob(chunksRef.current, { type: mimeType });
        setAudioBlob(blob);
        setAudioUrl(URL.createObjectURL(blob));
      };

      mr.start(); // no timeslice — we handle chunks on stop
      setRecording(true);
      timerRef.current = window.setInterval(() => {
        setElapsed((s) => {
          const next = s + 1;
          // Auto-stop at 3 minutes — safety cap. Whisper handles up to 25MB
          // but 3 minutes is more than enough for a cellar log memo and
          // keeps upload snappy on rural mobile.
          if (next >= 180) {
            stopRecording();
          }
          return next;
        });
      }, 1000);
    } catch (err) {
      const e = err as { name?: string; message?: string };
      if (e.name === "NotAllowedError" || e.name === "PermissionDeniedError") {
        setError("Microphone permission denied. Grant mic access in your browser settings to record voice memos.");
      } else if (e.name === "NotFoundError") {
        setError("No microphone found on this device.");
      } else {
        setError(`Could not start recording: ${e.message || "unknown error"}`);
      }
      cleanup();
    }
  };

  const stopRecording = () => {
    const mr = mediaRecorderRef.current;
    if (mr && mr.state !== "inactive") {
      mr.stop();
    }
    setRecording(false);
    if (timerRef.current !== null) {
      window.clearInterval(timerRef.current);
      timerRef.current = null;
    }
    if (rafRef.current !== null) {
      cancelAnimationFrame(rafRef.current);
      rafRef.current = null;
    }
    if (streamRef.current) {
      streamRef.current.getTracks().forEach((t) => t.stop());
      streamRef.current = null;
    }
    setLevel(0);
  };

  const discardAndReset = () => {
    if (audioUrl) URL.revokeObjectURL(audioUrl);
    setAudioUrl(null);
    setAudioBlob(null);
    setElapsed(0);
    setTranscription(null);
    setError(null);
  };

  const handleTranscribe = async () => {
    if (!audioBlob) return;
    setProcessing(true);
    setError(null);
    setTranscription(null);
    try {
      // Blob → base64 (strip data URL prefix)
      const base64 = await new Promise<string>((resolve, reject) => {
        const reader = new FileReader();
        reader.onload = () => {
          const s = String(reader.result || "");
          const comma = s.indexOf(",");
          resolve(comma >= 0 ? s.slice(comma + 1) : s);
        };
        reader.onerror = () => reject(new Error("Failed to read audio"));
        reader.readAsDataURL(audioBlob);
      });

      const result = await parseFromVoice.mutateAsync({
        audioBase64: base64,
        mimeType: audioMime,
        language: "en",
      });
      setTranscription(result.transcription || null);
      if (!result.transcription) {
        setError("We couldn't make out any speech. Try recording again in a quieter spot.");
      } else if (result.entries.length === 0) {
        setError("Transcribed successfully, but no cellar events were identified. Mention a tank, variety, and what you did (e.g. \"Tank 7 Shiraz, added 2 kg DAP\").");
      } else {
        onEntries(assignIds(result.entries as Omit<ParsedEntry, "id">[]), "voice");
      }
    } catch (err) {
      const e = err as { message?: string };
      setError(e.message || "Failed to transcribe. Please try again.");
    } finally {
      setProcessing(false);
    }
  };

  const fmt = (s: number) => `${Math.floor(s / 60)}:${String(s % 60).padStart(2, "0")}`;

  return (
    <div className="space-y-5" data-testid="voice-tab">
      <p className="text-sm" style={{ color: "var(--ow-text-mid)" }}>
        Tap record and speak your log line. Example: <em>“Tank 7 Shiraz, added 2 point 6 kilos of DAP, Brix is 14 point 2, pH 3 point 4 2.”</em> We&apos;ll transcribe and structure it — you review before saving.
      </p>

      {/* Recorder surface */}
      <div
        className="rounded-2xl p-6 flex flex-col items-center gap-4"
        style={{
          background: "var(--ow-bg-base)",
          border: recording
            ? "2px solid oklch(0.65 0.20 25)"
            : audioBlob
              ? "2px solid color-mix(in oklch, var(--ow-amber) 60%, transparent)"
              : "2px dashed oklch(0.35 0.010 60)",
          minHeight: "220px",
          transition: "border-color 200ms",
        }}
      >
        {/* Live meter (only while recording) */}
        {recording && (
          <div
            className="w-full h-2 rounded-full overflow-hidden"
            style={{ background: "oklch(0.20 0.010 60)" }}
            data-testid="voice-level-meter"
          >
            <div
              style={{
                width: `${Math.max(4, level * 100)}%`,
                height: "100%",
                background: "linear-gradient(90deg, oklch(0.65 0.20 25), oklch(0.75 0.15 60))",
                transition: "width 80ms linear",
              }}
            />
          </div>
        )}

        <div
          className="w-24 h-24 rounded-full flex items-center justify-center"
          style={{
            background: recording
              ? "oklch(0.55 0.22 25)"
              : "color-mix(in oklch, var(--ow-amber) 20%, transparent)",
            border: recording
              ? "3px solid oklch(0.70 0.22 25)"
              : "1px solid color-mix(in oklch, var(--ow-amber) 40%, transparent)",
            boxShadow: recording ? `0 0 ${20 + level * 40}px oklch(0.60 0.22 25 / 55%)` : "none",
            transition: "box-shadow 80ms linear",
          }}
        >
          {recording ? (
            <Square size={44} style={{ color: "white" }} fill="white" />
          ) : (
            <Mic size={44} style={{ color: "var(--ow-amber)" }} />
          )}
        </div>

        <div className="text-center">
          {recording ? (
            <>
              <p className="text-2xl font-bold tabular-nums" style={{ color: "var(--ow-amber)" }} data-testid="voice-timer">
                {fmt(elapsed)}
              </p>
              <p className="text-xs mt-1" style={{ color: "var(--ow-text-lo)" }}>
                Recording · max 3:00
              </p>
            </>
          ) : audioBlob ? (
            <>
              <p className="text-lg font-semibold" style={{ color: "var(--ow-text-hi)" }}>
                {fmt(elapsed)} captured
              </p>
              <p className="text-xs mt-1" style={{ color: "var(--ow-text-lo)" }}>
                Review below, then extract entries
              </p>
            </>
          ) : (
            <>
              <p className="text-lg font-semibold" style={{ color: "var(--ow-text-hi)" }}>
                Ready when you are
              </p>
              <p className="text-xs mt-1" style={{ color: "var(--ow-text-lo)" }}>
                Tap the mic and speak your log line
              </p>
            </>
          )}
        </div>

        {audioUrl && !recording && (
          <audio
            src={audioUrl}
            controls
            className="w-full max-w-md"
            data-testid="voice-playback"
          />
        )}

        <div className="flex gap-3 w-full">
          {!recording && !audioBlob && (
            <Button
              className="flex-1 h-12 font-semibold"
              onClick={startRecording}
              disabled={processing}
              style={{ background: "var(--ow-amber)", color: "oklch(0.10 0.008 60)" }}
              data-testid="voice-start-btn"
            >
              <Mic size={18} className="mr-2" /> Start recording
            </Button>
          )}
          {recording && (
            <Button
              className="flex-1 h-12 font-semibold"
              onClick={stopRecording}
              style={{ background: "oklch(0.55 0.22 25)", color: "white" }}
              data-testid="voice-stop-btn"
            >
              <Square size={16} className="mr-2" fill="white" /> Stop
            </Button>
          )}
          {!recording && audioBlob && (
            <>
              <Button
                variant="outline"
                className="flex-1 h-12"
                onClick={discardAndReset}
                disabled={processing}
                style={{ borderColor: "oklch(0.30 0.010 60)", color: "var(--ow-text-mid)" }}
                data-testid="voice-discard-btn"
              >
                <MicOff size={16} className="mr-2" /> Re-record
              </Button>
              <Button
                className="flex-1 h-12 font-semibold"
                onClick={handleTranscribe}
                disabled={processing}
                style={{ background: "var(--ow-amber)", color: "oklch(0.10 0.008 60)" }}
                data-testid="voice-transcribe-btn"
              >
                {processing ? (
                  <><Loader2 size={16} className="mr-2 animate-spin" /> Transcribing…</>
                ) : (
                  <><ScanLine size={16} className="mr-2" /> Extract entries</>
                )}
              </Button>
            </>
          )}
        </div>
      </div>

      {/* Transcription echo */}
      {transcription && (
        <div
          className="rounded-lg p-4"
          style={{ background: "var(--ow-bg-raised)", border: "1px solid var(--ow-bg-inset)" }}
          data-testid="voice-transcription-block"
        >
          <p className="text-xs uppercase tracking-wide font-semibold mb-2" style={{ color: "var(--ow-text-lo)" }}>
            We heard
          </p>
          <p className="text-sm italic" style={{ color: "var(--ow-text-hi)" }}>
            “{transcription}”
          </p>
        </div>
      )}

      {error && (
        <div className="flex items-start gap-3 p-3 rounded-lg" style={{ background: "oklch(0.18 0.05 25 / 40%)", border: "1px solid oklch(0.40 0.10 25 / 40%)" }} data-testid="voice-error">
          <AlertCircle size={16} className="mt-0.5 flex-shrink-0" style={{ color: "oklch(0.65 0.15 25)" }} />
          <p className="text-sm" style={{ color: "oklch(0.75 0.05 25)" }}>{error}</p>
        </div>
      )}
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

            {/* Image preview */}
            {imagePreview && (
              <div className="p-3" style={{ background: "var(--ow-bg-base)", borderBottom: "1px solid var(--ow-border-md)" }}>
                <img
                  src={imagePreview}
                  alt="Pasted"
                  data-testid="paste-ocr-preview"
                  style={{ maxHeight: 180, maxWidth: "100%", display: "block", borderRadius: 4, margin: "0 auto" }}
                />
              </div>
            )}

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

            {/* Raw vs cleaned text preview */}
            <div className="p-3" style={{ background: "var(--ow-bg-base)" }}>
              <p className="text-xs mb-1.5" style={{ color: "var(--ow-text-lo)" }}>
                {showRaw ? "Raw OCR (verbatim):" : "Cleaned text (used for extraction):"}
              </p>
              <pre
                data-testid="paste-ocr-text"
                style={{
                  whiteSpace: "pre-wrap",
                  fontFamily: "'Fira Code',monospace",
                  fontSize: "0.78rem",
                  color: "var(--ow-text-hi)",
                  margin: 0,
                  maxHeight: 180,
                  overflowY: "auto",
                }}
              >
                {showRaw ? ocrResult.rawOcrText : ocrResult.cleanedText}
              </pre>
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

// ─── Bulk Tab ─────────────────────────────────────────────────────────────────
//   The "bring your history" feature promised on /join Card 03.
//   Accepts a folder drop (webkitdirectory), multi-file select, or drag-and-drop.
//   Client-side classifies each file → routes to the right LLM endpoint:
//     - images (jpg/png/webp)   → parseFromImage (Claude Sonnet vision)
//     - text (csv/txt/md)       → parseFromText  (Claude Sonnet text)
//     - PDFs / docx / xlsx      → marked as Phase 2 (transparent to user)
//   Runs 3 files in parallel to keep the LLM proxy happy. Per-file status
//   surface builds trust: users see exactly what was read vs skipped.

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

function BulkTab({
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

// ─── Main Page ────────────────────────────────────────────────────────────────

export default function Import() {
  const [activeTab, setActiveTab] = useState<Tab>("voice");
  const [entries, setEntries] = useState<ParsedEntry[]>([]);
  const [importSource, setImportSource] = useState<"paste" | "csv" | "image" | "voice" | "bulk">("image");
  const [saving, setSaving] = useState(false);
  const [saved, setSaved] = useState(false);
  const bulkSave = trpc.vintageLog.bulkSave.useMutation();

  const handleEntries = useCallback(
    (newEntries: ParsedEntry[], source: "paste" | "csv" | "image" | "voice" | "bulk") => {
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
          {activeTab === "csv" && <CSVTab onEntries={handleEntries} />}
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
