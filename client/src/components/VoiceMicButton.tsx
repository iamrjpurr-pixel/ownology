/**
 * VoiceMicButton — Sprint 9 S9-B
 *
 * A small, theme-agnostic mic button that drives the reusable
 * useSpeechRecognition hook. Used on Free Run and the Compliance AI for an
 * identical hands-free experience.
 *
 *  - Renders idle / listening / processing states with distinct visuals.
 *  - Hides itself entirely when the Web Speech API is unsupported (graceful
 *    fallback — text input stays the primary path, no error shown).
 *  - Calls `onTranscript` with the final transcript so the parent can prefill
 *    its input and (optionally) auto-submit.
 *  - Accent colour is configurable so it can blend into either theme.
 */
import { useSpeechRecognition } from "@/hooks/useSpeechRecognition";

interface VoiceMicButtonProps {
  /** Receives the final transcript once recognition completes. */
  onTranscript: (text: string) => void;
  /** Disable the button (e.g. while a request is in flight). */
  disabled?: boolean;
  /** Accent colour used for the active/listening state. */
  accent?: string;
  /** Idle background colour. */
  idleBg?: string;
  /** Idle border colour. */
  idleBorder?: string;
  /** Idle icon colour. */
  idleColor?: string;
  /** Square size in px. Defaults to 44 (touch-target friendly). */
  size?: number;
}

export default function VoiceMicButton({
  onTranscript,
  disabled = false,
  accent = "#2563EB",
  idleBg = "#FFFFFF",
  idleBorder = "#E8EAED",
  idleColor = "#666666",
  size = 44,
}: VoiceMicButtonProps) {
  const { isSupported, state, listening, start } = useSpeechRecognition({
    lang: "en-AU",
    silenceMs: 2000,
    onResult: onTranscript,
  });

  // Graceful fallback: nothing renders on unsupported browsers.
  if (!isSupported) return null;

  const processing = state === "processing";
  const active = listening || processing;

  const title = listening
    ? "Listening… (stops after a short pause)"
    : processing
    ? "Processing…"
    : "Ask by voice";

  return (
    <button
      type="button"
      onClick={start}
      disabled={disabled || processing}
      title={title}
      aria-label={title}
      aria-pressed={listening}
      style={{
        width: size,
        height: size,
        flexShrink: 0,
        borderRadius: "50%",
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
        background: active ? `color-mix(in srgb, ${accent} 16%, transparent)` : idleBg,
        border: `1px solid ${active ? accent : idleBorder}`,
        color: active ? accent : idleColor,
        cursor: disabled || processing ? "not-allowed" : "pointer",
        fontSize: "1.15rem",
        transition: "background 0.2s, border-color 0.2s, color 0.2s",
        position: "relative",
      }}
    >
      {/* Pulsing ring while listening */}
      {listening && (
        <span
          aria-hidden
          style={{
            position: "absolute",
            inset: -3,
            borderRadius: "50%",
            border: `2px solid ${accent}`,
            opacity: 0.6,
            animation: "ow-mic-pulse 1.4s ease-out infinite",
          }}
        />
      )}
      <span aria-hidden>{processing ? "⏳" : listening ? "🎙" : "🎤"}</span>
      <style>{`
        @keyframes ow-mic-pulse {
          0% { transform: scale(1); opacity: 0.6; }
          100% { transform: scale(1.5); opacity: 0; }
        }
      `}</style>
    </button>
  );
}
