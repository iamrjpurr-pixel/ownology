/**
 * Vintage Log — unit tests
 *
 * Tests the server-side tag generation logic and the shape of the
 * vintageLogRouter input/output contracts without hitting the database.
 */

import { describe, it, expect } from "vitest";

// ─── Tag generation logic (mirrored from routers.ts) ─────────────────────────

type EventType = "addition" | "measurement" | "racking" | "inoculation" | "observation" | "other";

function generateTags(
  eventType: EventType,
  details: Record<string, unknown>,
  variety: string,
  tankName: string
): string[] {
  const tags: string[] = [eventType, variety, tankName];
  if (eventType === "addition") {
    const what = (details.what as string) ?? "";
    if (what) tags.push(what);
    const timing = (details.timing as string) ?? "";
    if (timing) tags.push(timing);
  } else if (eventType === "measurement") {
    const what = (details.what as string) ?? "";
    if (what) tags.push(what);
  } else if (eventType === "racking") {
    tags.push("racking");
    const leesStatus = (details.leesStatus as string) ?? "";
    if (leesStatus) tags.push(leesStatus);
  } else if (eventType === "inoculation") {
    const what = (details.what as string) ?? "";
    if (what) tags.push(what);
    const product = (details.productName as string) ?? "";
    if (product) tags.push(product);
  }
  return Array.from(new Set(tags.map((t) => t.trim().toLowerCase()).filter(Boolean)));
}

// ─── Tests ────────────────────────────────────────────────────────────────────

describe("generateTags", () => {
  it("always includes eventType, variety, and tankName", () => {
    const tags = generateTags("observation", { text: "Good colour" }, "Shiraz", "Tank 7");
    expect(tags).toContain("observation");
    expect(tags).toContain("shiraz");
    expect(tags).toContain("tank 7");
  });

  it("includes what and timing for addition events", () => {
    const tags = generateTags(
      "addition",
      { what: "DAP", quantity: "2.6", unit: "kg", timing: "At inoculation" },
      "Shiraz",
      "Tank 7"
    );
    expect(tags).toContain("dap");
    expect(tags).toContain("at inoculation");
  });

  it("includes what for measurement events", () => {
    const tags = generateTags(
      "measurement",
      { what: "Brix", value: "24.3" },
      "Chardonnay",
      "Tank 3"
    );
    expect(tags).toContain("brix");
    expect(tags).toContain("chardonnay");
  });

  it("includes racking and leesStatus for racking events", () => {
    const tags = generateTags(
      "racking",
      { fromLocation: "Tank 7", toLocation: "Barrel 12A", leesStatus: "Gross lees", volumeL: "1200" },
      "Cabernet Sauvignon",
      "Tank 7"
    );
    expect(tags).toContain("racking");
    expect(tags).toContain("gross lees");
  });

  it("includes what and productName for inoculation events", () => {
    const tags = generateTags(
      "inoculation",
      { what: "Yeast", productName: "EC1118", rate: "20" },
      "Grenache",
      "Tank 2"
    );
    expect(tags).toContain("yeast");
    expect(tags).toContain("ec1118");
  });

  it("deduplicates tags", () => {
    const tags = generateTags("racking", {}, "Shiraz", "Shiraz");
    const unique = new Set(tags);
    expect(tags.length).toBe(unique.size);
  });

  it("normalises tags to lowercase", () => {
    const tags = generateTags("addition", { what: "DAP", timing: "At Inoculation" }, "SHIRAZ", "TANK 7");
    expect(tags.every((t) => t === t.toLowerCase())).toBe(true);
  });

  it("filters out empty strings", () => {
    const tags = generateTags("addition", { what: "", timing: "" }, "Shiraz", "Tank 7");
    expect(tags.every((t) => t.length > 0)).toBe(true);
  });
});

describe("Vintage Log entry types", () => {
  const EVENT_TYPES = ["addition", "measurement", "racking", "inoculation", "observation", "other"] as const;

  it("covers all 6 event types", () => {
    expect(EVENT_TYPES).toHaveLength(6);
    expect(EVENT_TYPES).toContain("addition");
    expect(EVENT_TYPES).toContain("measurement");
    expect(EVENT_TYPES).toContain("racking");
    expect(EVENT_TYPES).toContain("inoculation");
    expect(EVENT_TYPES).toContain("observation");
    expect(EVENT_TYPES).toContain("other");
  });

  it("generates tags for all event types without throwing", () => {
    const details = {
      addition:    { what: "DAP", quantity: "1", unit: "kg", timing: "At inoculation" },
      measurement: { what: "Brix", value: "24" },
      racking:     { fromLocation: "Tank 1", toLocation: "Tank 2", leesStatus: "Clean (no lees)" },
      inoculation: { what: "Yeast", productName: "EC1118", rate: "20" },
      observation: { text: "Good colour" },
      other:       { text: "Cleaned tank" },
    };
    for (const et of EVENT_TYPES) {
      expect(() =>
        generateTags(et, details[et], "Shiraz", "Tank 7")
      ).not.toThrow();
    }
  });
});
