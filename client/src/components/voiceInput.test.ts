/**
 * Sprint 9 — S9-B: Voice input (Web Speech API) source-contract tests.
 *
 * Follows the project's source-string assertion convention (node test env, no
 * jsdom — see bridges.test.ts / Compliance.*.test.ts). These guard the
 * structural contract of the reusable hook, the shared mic button, and the
 * Free Run + Compliance integrations.
 */
import { describe, it, expect } from "vitest";
import { readFileSync } from "fs";
import { resolve } from "path";

const read = (p: string) => readFileSync(resolve(__dirname, p), "utf-8");

const hook = read("../hooks/useSpeechRecognition.ts");
const micBtn = read("./VoiceMicButton.tsx");
const freeRun = read("../pages/FreeRun.tsx");
const compliance = read("../pages/Compliance.tsx");

describe("S9-B — useSpeechRecognition hook", () => {
  it("detects support via SpeechRecognition or webkitSpeechRecognition", () => {
    expect(hook).toContain("w.SpeechRecognition ?? w.webkitSpeechRecognition");
    expect(hook).toContain("isSupported");
  });

  it("models the idle → listening → processing tri-state", () => {
    expect(hook).toContain('export type VoiceState = "idle" | "listening" | "processing"');
    expect(hook).toContain('setState("listening")');
    expect(hook).toContain('setState("processing")');
    expect(hook).toContain('setState("idle")');
  });

  it("auto-stops after a configurable silence window (defaults to 2000ms)", () => {
    expect(hook).toContain("silenceMs = 2000");
    expect(hook).toContain("silenceTimer.current = setTimeout");
  });

  it("uses Australian English and interim results to drive the silence timer", () => {
    expect(hook).toContain('lang = "en-AU"');
    expect(hook).toContain("rec.interimResults = true");
  });

  it("fails gracefully — no alert/throw on unsupported browsers", () => {
    expect(hook).not.toContain("alert(");
    // start() is a no-op when unsupported
    expect(hook).toContain("if (!isSupported) return;");
  });

  it("hands the final transcript back via onResult and cleans up on unmount", () => {
    expect(hook).toContain("onResultRef.current?.(text)");
    expect(hook).toContain("recRef.current?.abort?.()");
  });
});

describe("S9-B — VoiceMicButton component", () => {
  it("consumes the shared hook", () => {
    expect(micBtn).toContain('from "@/hooks/useSpeechRecognition"');
    expect(micBtn).toContain("useSpeechRecognition({");
  });

  it("hides itself when the API is unsupported (graceful fallback)", () => {
    expect(micBtn).toContain("if (!isSupported) return null;");
  });

  it("renders distinct idle / listening / processing visuals + tooltip", () => {
    expect(micBtn).toContain('"⏳"');
    expect(micBtn).toContain('"🎙"');
    expect(micBtn).toContain('"🎤"');
    expect(micBtn).toContain("title={title}");
    expect(micBtn).toContain('aria-pressed={listening}');
  });

  it("exposes an onTranscript callback to the parent", () => {
    expect(micBtn).toContain("onTranscript: (text: string) => void");
    expect(micBtn).toContain("onResult: onTranscript");
  });
});

describe("S9-B — Free Run integration", () => {
  it("mounts the shared mic button", () => {
    expect(freeRun).toContain('import VoiceMicButton from "@/components/VoiceMicButton"');
    expect(freeRun).toContain("<VoiceMicButton");
  });

  it("auto-submits the transcript via the explicit-text send core", () => {
    expect(freeRun).toContain("const submitQuestion = async (question: string)");
    expect(freeRun).toContain("const handleVoiceTranscript = (text: string)");
    expect(freeRun).toContain("submitQuestion(text)");
  });

  it("guards against a double-send while a request is in flight", () => {
    expect(freeRun).toContain("sendingRef");
  });
});

describe("S9-B — Compliance AI integration", () => {
  it("mounts the shared mic button and drops the old bespoke implementation", () => {
    expect(compliance).toContain('import VoiceMicButton from "@/components/VoiceMicButton"');
    expect(compliance).toContain("<VoiceMicButton");
    // the old inline Web Speech wiring + blocking alert must be gone
    expect(compliance).not.toContain("Voice input is not supported in this browser");
    expect(compliance).not.toContain("const startVoice");
  });

  it("auto-submits the transcript through the existing ask() core", () => {
    expect(compliance).toContain("const handleVoiceTranscript = useCallback");
    expect(compliance).toContain("ask(transcript)");
  });
});
