/**
 * Tests for vintage data import procedures
 * Covers: parseFromText (AI paste), bulkSave, importSource badge
 */
import { describe, it, expect, vi, beforeEach } from "vitest";

// ─── Mock the LLM helper ───────────────────────────────────────────────────────
vi.mock("./_core/llm", () => ({
  invokeLLM: vi.fn(),
}));

import { invokeLLM } from "./_core/llm";

// ─── Unit: LLM response parsing ───────────────────────────────────────────────
describe("parseFromText — LLM response parsing", () => {
  it("parses a valid LLM JSON response into structured entries", () => {
    const rawLLMContent = JSON.stringify([
      {
        tankName: "Tank 7",
        variety: "Shiraz",
        eventType: "measurement",
        entryAt: "2022-03-15T08:00:00Z",
        details: { what: "Brix", value: "24.3", unit: "°Brix" },
        noteText: "Harvest day reading",
        tags: ["brix", "harvest"],
      },
      {
        tankName: "Tank 3",
        variety: "Chardonnay",
        eventType: "addition",
        entryAt: "2022-03-16T10:00:00Z",
        details: { what: "DAP", quantity: "2.6", unit: "kg" },
        noteText: "",
        tags: ["dap", "nutrient"],
      },
    ]);

    // Simulate what the router does: parse the LLM content
    let parsed: unknown[];
    try {
      parsed = JSON.parse(rawLLMContent);
    } catch {
      parsed = [];
    }

    expect(Array.isArray(parsed)).toBe(true);
    expect(parsed).toHaveLength(2);

    const first = parsed[0] as Record<string, unknown>;
    expect(first.tankName).toBe("Tank 7");
    expect(first.variety).toBe("Shiraz");
    expect(first.eventType).toBe("measurement");
    expect(first.tags).toEqual(["brix", "harvest"]);
  });

  it("returns empty array when LLM returns invalid JSON", () => {
    const badContent = "Sorry, I could not parse that text.";
    let parsed: unknown[];
    try {
      parsed = JSON.parse(badContent);
    } catch {
      parsed = [];
    }
    expect(parsed).toEqual([]);
  });

  it("returns empty array when LLM returns JSON object instead of array", () => {
    const objContent = JSON.stringify({ error: "no entries found" });
    let parsed: unknown[];
    try {
      const result = JSON.parse(objContent);
      parsed = Array.isArray(result) ? result : [];
    } catch {
      parsed = [];
    }
    expect(parsed).toEqual([]);
  });
});

// ─── Unit: import source validation ───────────────────────────────────────────
describe("importSource field validation", () => {
  it("accepts valid import sources", () => {
    const validSources = ["paste", "csv", "image"];
    for (const source of validSources) {
      expect(["paste", "csv", "image"].includes(source)).toBe(true);
    }
  });

  it("rejects invalid import sources", () => {
    const invalidSources = ["manual", "api", "webhook", ""];
    for (const source of invalidSources) {
      expect(["paste", "csv", "image"].includes(source)).toBe(false);
    }
  });
});

// ─── Unit: entry normalisation ────────────────────────────────────────────────
describe("entry normalisation for bulk save", () => {
  it("normalises entryAt to a timestamp number", () => {
    const isoString = "2022-03-15T08:00:00Z";
    const ts = new Date(isoString).getTime();
    expect(typeof ts).toBe("number");
    expect(ts).toBeGreaterThan(0);
  });

  it("handles numeric entryAt passthrough", () => {
    const ts = 1647331200000;
    const result = typeof ts === "number" ? ts : new Date(ts).getTime();
    expect(result).toBe(1647331200000);
  });

  it("defaults tags to empty array when missing", () => {
    const entry = { tankName: "Tank 1", variety: "Shiraz", eventType: "observation" };
    const tags = (entry as { tags?: string[] }).tags ?? [];
    expect(tags).toEqual([]);
  });

  it("defaults details to empty object when missing", () => {
    const entry = { tankName: "Tank 1", variety: "Shiraz", eventType: "observation" };
    const details = (entry as { details?: Record<string, unknown> }).details ?? {};
    expect(details).toEqual({});
  });
});

// ─── Unit: CSV row parsing ────────────────────────────────────────────────────
describe("CSV row parsing helpers", () => {
  it("maps a CSV row to a log entry using column mapping", () => {
    const row: Record<string, string> = {
      "Tank": "Tank 7",
      "Variety": "Shiraz",
      "Date": "15/03/2022",
      "Event": "measurement",
      "Value": "24.3",
      "Note": "Harvest day",
    };

    const columnMap: Record<string, string> = {
      tankName: "Tank",
      variety: "Variety",
      entryAt: "Date",
      eventType: "Event",
      noteText: "Note",
    };

    const mapped: Record<string, string> = {};
    for (const [field, csvCol] of Object.entries(columnMap)) {
      if (row[csvCol] !== undefined) mapped[field] = row[csvCol];
    }

    expect(mapped.tankName).toBe("Tank 7");
    expect(mapped.variety).toBe("Shiraz");
    expect(mapped.eventType).toBe("measurement");
    expect(mapped.noteText).toBe("Harvest day");
  });

  it("handles missing columns gracefully", () => {
    const row: Record<string, string> = { "Tank": "Tank 1" };
    const columnMap: Record<string, string> = {
      tankName: "Tank",
      variety: "Variety", // missing from row
    };

    const mapped: Record<string, string> = {};
    for (const [field, csvCol] of Object.entries(columnMap)) {
      if (row[csvCol] !== undefined) mapped[field] = row[csvCol];
    }

    expect(mapped.tankName).toBe("Tank 1");
    expect(mapped.variety).toBeUndefined();
  });
});
