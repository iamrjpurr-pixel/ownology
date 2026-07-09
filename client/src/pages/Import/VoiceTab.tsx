/**
 * Voice Tab — cellar-floor hands-free logging. Winemaker taps record, speaks a
 * memo, we transcribe via Whisper and structure into cellar entries.
 *
 * Design notes:
 *  - MediaRecorder API — supported on all modern browsers incl. iOS 14.5+.
 *  - We pick the first supported audio/webm mimetype; iOS falls back to
 *    audio/mp4 which Whisper also accepts.
 *  - Timer counts up during recording so the user has proprioceptive feedback.
 *  - Live audio meter (RMS from AnalyserNode) so recording is visibly "on".
 *  - Transcription is echoed back BEFORE the structured entries so the user
 *    trusts what we heard — critical for a first-time voice user in a noisy
 *    winery environment.
 */

import { useRef, useState, useCallback, useEffect } from "react";
import { trpc } from "@/lib/trpc";
import { Button } from "@/components/ui/button";
import {
  Loader2,
  AlertCircle,
  ScanLine,
  Mic,
  MicOff,
  Square,
} from "lucide-react";
import { assignIds, type ParsedEntry } from "./shared";

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

export function VoiceTab({
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
