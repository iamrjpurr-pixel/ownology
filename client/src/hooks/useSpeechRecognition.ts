/**
 * useSpeechRecognition — Sprint 9 S9-B
 *
 * A small, reusable wrapper around the Web Speech API (SpeechRecognition /
 * webkitSpeechRecognition). It powers the hands-free voice input on Free Run
 * and the Compliance AI.
 *
 * Design goals (from references/sprint-9-scope.md):
 *  - Three states: idle → listening → processing (then back to idle).
 *  - Auto-stop after ~2 seconds of silence so the user never taps "stop".
 *    (We use a result-driven silence timer; on each interim/final result we
 *    reset a 2s timer, and when it fires we stop recognition.)
 *  - Graceful, SILENT fallback: if the browser does not support the API,
 *    `isSupported` is false so callers can simply hide the mic button. There
 *    is no alert/throw on unsupported browsers (e.g. Firefox).
 *  - On error (no mic permission, ambient noise, etc.) we surface a short,
 *    non-blocking message via `error` and return to idle. Text input always
 *    remains the primary path.
 *
 * No server-side transcription is used — recognition runs in the browser.
 */
import { useCallback, useEffect, useRef, useState } from "react";

export type VoiceState = "idle" | "listening" | "processing";

export interface UseSpeechRecognitionResult {
  /** Whether the Web Speech API exists in this browser. */
  isSupported: boolean;
  /** Current voice state. */
  state: VoiceState;
  /** Convenience flag — true while state === "listening". */
  listening: boolean;
  /** Short non-blocking error message, or null. */
  error: string | null;
  /** Begin listening. No-op if unsupported or already listening. */
  start: () => void;
  /** Stop listening immediately (e.g. user taps the mic again). */
  stop: () => void;
}

export interface UseSpeechRecognitionOptions {
  /** BCP-47 language tag. Defaults to Australian English. */
  lang?: string;
  /** Silence (ms) after which recognition auto-stops. Defaults to 2000. */
  silenceMs?: number;
  /**
   * Called once with the final transcript when recognition completes.
   * Callers typically use this to populate an input and auto-submit.
   */
  onResult?: (transcript: string) => void;
}

/** Returns the SpeechRecognition constructor for this browser, or null. */
// eslint-disable-next-line @typescript-eslint/no-explicit-any
function getSpeechRecognition(): (new () => any) | null {
  if (typeof window === "undefined") return null;
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const w = window as any;
  return w.SpeechRecognition ?? w.webkitSpeechRecognition ?? null;
}

export function useSpeechRecognition(
  options: UseSpeechRecognitionOptions = {}
): UseSpeechRecognitionResult {
  const { lang = "en-AU", silenceMs = 2000, onResult } = options;

  // Support is computed once; the constructor never changes at runtime.
  const [isSupported] = useState<boolean>(() => getSpeechRecognition() !== null);
  const [state, setState] = useState<VoiceState>("idle");
  const [error, setError] = useState<string | null>(null);

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const recRef = useRef<any>(null);
  const silenceTimer = useRef<ReturnType<typeof setTimeout> | null>(null);
  const transcriptRef = useRef<string>("");
  // Keep the latest onResult without re-creating start/stop on every render.
  const onResultRef = useRef<UseSpeechRecognitionOptions["onResult"]>(onResult);
  useEffect(() => { onResultRef.current = onResult; }, [onResult]);

  const clearSilenceTimer = useCallback(() => {
    if (silenceTimer.current) {
      clearTimeout(silenceTimer.current);
      silenceTimer.current = null;
    }
  }, []);

  const stop = useCallback(() => {
    clearSilenceTimer();
    try { recRef.current?.stop(); } catch { /* already stopped */ }
  }, [clearSilenceTimer]);

  const start = useCallback(() => {
    if (!isSupported) return;
    // Tapping while already listening acts as a manual stop.
    if (state === "listening") { stop(); return; }

    const SR = getSpeechRecognition();
    if (!SR) return;

    setError(null);
    transcriptRef.current = "";

    const rec = new SR();
    rec.lang = lang;
    rec.continuous = true;       // keep going so the silence timer governs the end
    rec.interimResults = true;   // interim results let us detect "still speaking"
    rec.maxAlternatives = 1;

    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    rec.onresult = (e: any) => {
      let finalText = "";
      let interim = "";
      for (let i = e.resultIndex; i < e.results.length; i++) {
        const res = e.results[i];
        if (res.isFinal) finalText += res[0].transcript;
        else interim += res[0].transcript;
      }
      if (finalText) {
        transcriptRef.current = (transcriptRef.current + " " + finalText).trim();
      }
      // Any speech (final or interim) resets the silence countdown.
      if (finalText || interim) {
        clearSilenceTimer();
        silenceTimer.current = setTimeout(() => {
          // 2s of silence → wrap up.
          try { rec.stop(); } catch { /* ignore */ }
        }, silenceMs);
      }
    };

    rec.onerror = (e: { error?: string }) => {
      clearSilenceTimer();
      setState("idle");
      // "aborted"/"no-speech" are benign; show a gentle hint for the rest.
      if (e?.error && e.error !== "aborted" && e.error !== "no-speech") {
        setError("Couldn't hear that — try typing");
      }
    };

    rec.onend = () => {
      clearSilenceTimer();
      const text = transcriptRef.current.trim();
      if (text) {
        setState("processing");
        // Hand the transcript back; caller decides what to do (e.g. auto-submit).
        onResultRef.current?.(text);
        // Brief processing flash, then back to idle.
        setTimeout(() => setState("idle"), 300);
      } else {
        setState("idle");
      }
    };

    recRef.current = rec;
    try {
      rec.start();
      setState("listening");
    } catch {
      setState("idle");
      setError("Couldn't start the microphone");
    }
  }, [isSupported, state, lang, silenceMs, stop, clearSilenceTimer]);

  // Cleanup on unmount.
  useEffect(() => {
    return () => {
      clearSilenceTimer();
      try { recRef.current?.abort?.(); } catch { /* ignore */ }
    };
  }, [clearSilenceTimer]);

  return {
    isSupported,
    state,
    listening: state === "listening",
    error,
    start,
    stop,
  };
}

export default useSpeechRecognition;
