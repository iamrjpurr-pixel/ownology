/**
 * Sprint 8 — Triangulation bridge components source-contract tests.
 *
 * These follow the project's existing source-string assertion convention
 * (see Compliance.*.test.ts). They guard the structural contracts of the
 * three cross-pillar bridges so future refactors don't silently break the
 * Do→Know / Know→Learn / Learn→Do connections.
 */
import { describe, it, expect } from "vitest";
import { readFileSync } from "fs";
import { resolve } from "path";

const read = (p: string) =>
  readFileSync(resolve(__dirname, p), "utf-8");

const sopSidePanel = read("./SopSidePanel.tsx");
const freeRunBridge = read("./FreeRunBridgeLink.tsx");
const pressCta = read("./ThePressCtaCard.tsx");
const thePress = read("../pages/ThePress.tsx");
const knowledge = read("../pages/Knowledge.tsx");
const freeRun = read("../pages/FreeRun.tsx");

describe("S8-C — Do→Know bridge (SopSidePanel / SopBridgeChip)", () => {
  it("exports both SopSidePanel (default) and SopBridgeChip (named)", () => {
    expect(sopSidePanel).toContain("export default function SopSidePanel");
    expect(sopSidePanel).toContain("export function SopBridgeChip");
  });

  it("loads SOPs by category for the commercial audience", () => {
    expect(sopSidePanel).toContain("trpc.knowledge.listSops.useQuery");
    expect(sopSidePanel).toContain('audience: "commercial"');
  });

  it("renders quick steps and full procedure text", () => {
    expect(sopSidePanel).toContain("parseQuickSteps");
    expect(sopSidePanel).toContain("sop.procedureText");
  });

  it("is mounted in The Press with a real category map and analytics", () => {
    expect(thePress).toContain("SopBridgeChip");
    expect(thePress).toContain("EVENT_SOP_CATEGORY");
    expect(thePress).toContain('"Pressing & Juice Handling"');
    expect(thePress).toContain('trackEvent("sop_chip_opened"');
  });
});

describe("S8-D — Know→Learn bridge (FreeRunBridgeLink)", () => {
  it("deep-links to /free-run with a seed question param", () => {
    expect(freeRunBridge).toContain("/free-run?q=");
    expect(freeRunBridge).toContain("encodeURIComponent");
  });

  it("is mounted at the bottom of the SOP Procedure tab with a topic map", () => {
    expect(knowledge).toContain("FreeRunBridgeLink");
    expect(knowledge).toContain("CATEGORY_FREE_RUN_TOPIC");
    expect(knowledge).toContain('"Fermentation Management": "Fermentation Chemistry"');
  });

  it("Free Run reads the ?q= param and prefills without auto-sending", () => {
    expect(freeRun).toContain("URLSearchParams");
    expect(freeRun).toContain('.get("q")');
    expect(freeRun).toContain("free_run_seeded_from_sop");
    // prefill only — must NOT auto-call the send handler from the q effect
    expect(freeRun).toContain("setInput(q)");
  });
});

describe("S8-E — Learn→Do bridge (ThePressCtaCard)", () => {
  it("uses the curiosity-first headline reconciled with the Free Run redesign", () => {
    expect(pressCta).toContain("Ready to make it, not just drink it?");
    expect(pressCta).toContain('href="/the-press"');
  });

  it("is mounted after the Free Run answer thread with analytics", () => {
    expect(freeRun).toContain("ThePressCtaCard");
    expect(freeRun).toContain("press_cta_clicked");
    expect(freeRun).toContain("messages.length > 0");
  });
});

describe("Sprint 8 launch hygiene (nav)", () => {
  it("Build Index is no longer linked from Home nav", () => {
    // The /build-index route may still exist, but it must not be a nav label.
    expect(/label:\s*["']Build Index["']/.test(read("../pages/Home.tsx"))).toBe(false);
  });
});
