/**
 * Sprint 9 — S9-A: Quick Entry "Blind Calculator" harvest-floor redesign.
 *
 * Follows the project's source-string assertion convention (the test runner
 * uses the default Vitest node environment with no jsdom, so we assert on the
 * source contract rather than rendering React — see Compliance.*.test.ts and
 * bridges.test.ts).
 *
 * These guard the structural contract of the four-screen, tap-only flow, the
 * custom number pad, the context-dependent detail screen, the 30-minute
 * localStorage draft save, and the production-auth posture.
 */
import { describe, it, expect } from "vitest";
import { readFileSync } from "fs";
import { resolve } from "path";

const source = readFileSync(resolve(__dirname, "QuickEntry.tsx"), "utf-8");

describe("S9-A — four-screen Blind Calculator flow", () => {
  it("defines the four screen states (event → tank → detail → confirm) plus success", () => {
    expect(source).toContain('type Screen =');
    for (const s of ['"event"', '"tank"', '"detail"', '"confirm"', '"success"']) {
      expect(source).toContain(s);
    }
  });

  it("Screen 1 presents the six harvest event tiles", () => {
    for (const id of ['"addition"', '"measurement"', '"racking"', '"inoculation"', '"observation"', '"other"']) {
      expect(source).toContain(id);
    }
    // The event tiles are large targets (80px tall) on Screen 1.
    expect(source).toContain("EVENT_TILES");
    expect(source).toContain("height: 80");
  });

  it("Screen 1 keeps a de-emphasised Full Entry escape link", () => {
    expect(source).toContain("Full Entry");
    expect(source).toContain('href="/the-press"');
  });

  it("Screen 2 builds tank tiles from batches + log history with variety", () => {
    expect(source).toContain("trpc.wineBatch.list.useQuery");
    expect(source).toContain("trpc.vintageLog.getUsedTanks.useQuery");
    expect(source).toContain("allTanks");
  });

  it("Screen 4 confirms via a single LOG IT button and flashes a success screen", () => {
    expect(source).toContain("LOG IT");
    expect(source).toContain('setScreen("success")');
    // success auto-resets back to the event screen after a short delay
    expect(source).toContain("setTimeout");
    expect(source).toContain('setScreen("event")');
  });
});

describe("S9-A — custom number pad (no system keyboard)", () => {
  it("ships a bespoke NumberPad component with a backspace key", () => {
    expect(source).toContain("function NumberPad");
    expect(source).toContain('"⌫"');
    // calculator-style digit grid
    expect(source).toContain('"7","8","9"');
  });

  it("guards against multiple decimal points and caps the length", () => {
    expect(source).toContain('value.includes(".")');
    expect(source).toContain(".slice(0, 8)");
  });

  it("number-pad keys meet the 64px+ touch target requirement", () => {
    // each key button is 72px tall
    expect(source).toContain("height: 72");
  });
});

describe("S9-A — context-dependent detail screen", () => {
  it("measurement uses the unit list + number pad", () => {
    expect(source).toContain("MEASURES");
    expect(source).toContain('label: "Brix"');
    expect(source).toContain('label: "Free SO₂"');
  });

  it("addition uses type tiles then a quantity pad with a unit selector", () => {
    expect(source).toContain("ADD_TYPES");
    expect(source).toContain("ADD_UNITS");
    expect(source).toContain('aStep === "qty"');
  });

  it("racking offers a From/To tank selection", () => {
    expect(source).toContain("rackTo");
    expect(source).toContain("Racking to");
  });

  it("inoculation uses type tiles then a rate pad", () => {
    expect(source).toContain("INO_TYPES");
    expect(source).toContain('iStep === "rate"');
  });

  it("observation/other are the only screens with free-text + dictate", () => {
    expect(source).toContain("startDictation");
    expect(source).toContain("<textarea");
  });
});

describe("S9-A — 30-minute localStorage draft save", () => {
  it("defines a draft key and a 30-minute TTL", () => {
    expect(source).toContain("ownology_quick_entry_draft");
    expect(source).toContain("30 * 60 * 1000");
  });

  it("expires stale drafts older than the TTL on load", () => {
    expect(source).toContain("function loadDraft");
    expect(source).toContain("Date.now() - draft.ts > DRAFT_TTL_MS");
  });

  it("restores an in-progress entry on mount and saves on change", () => {
    expect(source).toContain("const d = loadDraft();");
    expect(source).toContain("localStorage.setItem(DRAFT_KEY");
  });

  it("clears the draft once the entry is logged and on cancel", () => {
    expect(source).toContain("function clearDraft");
    expect(source).toContain("clearDraft(); // entry logged");
    expect(source).toContain('clearDraft(); setScreen("event");');
  });
});

describe("S9-A — authentication posture", () => {
  it("does not re-introduce a client-side isLoggedIn bypass", () => {
    expect(/isLoggedIn\s*=\s*true/.test(source)).toBe(false);
  });

  it("relies on protected vintageLog procedures (auth enforced server-side)", () => {
    expect(source).toContain("trpc.vintageLog.add.useMutation");
  });
});
