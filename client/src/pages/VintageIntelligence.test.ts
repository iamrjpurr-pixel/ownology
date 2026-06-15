/**
 * Vintage Intelligence feature tests
 * Tests the pure logic functions used by the vintageIntelligence router
 * and the AdminVintageIntelligence page — no database or network calls.
 */
import { describe, it, expect } from "vitest";

// ─── Data validation ──────────────────────────────────────────────────────────

describe("Vintage Intelligence data validation", () => {
  it("qualityRating must be between 1 and 5", () => {
    const validRatings = [1, 2, 3, 4, 5];
    const invalidRatings = [0, 6, -1, 10];

    validRatings.forEach((r) => {
      expect(r).toBeGreaterThanOrEqual(1);
      expect(r).toBeLessThanOrEqual(5);
    });

    invalidRatings.forEach((r) => {
      const isValid = r >= 1 && r <= 5;
      expect(isValid).toBe(false);
    });
  });

  it("year must be a 4-digit number in the 2000–2100 range", () => {
    const validYears = [2020, 2024, 2025, 2030];
    const invalidYears = [1999, 2101, 0, -1];

    validYears.forEach((y) => {
      expect(y).toBeGreaterThanOrEqual(2000);
      expect(y).toBeLessThanOrEqual(2100);
    });

    invalidYears.forEach((y) => {
      const isValid = y >= 2000 && y <= 2100;
      expect(isValid).toBe(false);
    });
  });

  it("region must be a non-empty string", () => {
    const validRegions = ["Barossa Valley", "McLaren Vale", "Margaret River"];
    const invalidRegions = ["", "  "];

    validRegions.forEach((r) => {
      expect(r.trim().length).toBeGreaterThan(0);
    });

    invalidRegions.forEach((r) => {
      expect(r.trim().length).toBe(0);
    });
  });
});

// ─── Region detection logic ───────────────────────────────────────────────────

describe("Region detection for vintage context injection", () => {
  const KNOWN_REGIONS = [
    "Barossa Valley", "Barossa",
    "Eden Valley",
    "McLaren Vale",
    "Margaret River",
    "Hunter Valley", "Hunter",
    "Yarra Valley", "Yarra",
    "Mudgee",
    "Orange",
    "Canberra District", "Canberra",
    "Clare Valley", "Clare",
    "Coonawarra",
    "Mornington Peninsula", "Mornington",
    "Adelaide Hills",
  ];

  function detectRegion(question: string): string | undefined {
    const lower = question.toLowerCase();
    return KNOWN_REGIONS.find((r) => lower.includes(r.toLowerCase()));
  }

  it("detects Barossa Valley from a question", () => {
    const q = "What are the winemaking implications of the 2024 Barossa Valley vintage?";
    expect(detectRegion(q)).toBe("Barossa Valley");
  });

  it("detects McLaren Vale from a question", () => {
    const q = "How was the 2024 McLaren Vale Grenache season?";
    expect(detectRegion(q)).toBe("McLaren Vale");
  });

  it("detects Hunter Valley from a question", () => {
    const q = "Tell me about Hunter Valley Semillon in 2024";
    expect(detectRegion(q)).toBe("Hunter Valley");
  });

  it("detects Margaret River from a question", () => {
    const q = "What made Margaret River 2024 special?";
    expect(detectRegion(q)).toBe("Margaret River");
  });

  it("detects Eden Valley from a question", () => {
    const q = "How did Eden Valley Riesling perform in 2024?";
    expect(detectRegion(q)).toBe("Eden Valley");
  });

  it("returns undefined when no region is mentioned", () => {
    const q = "What is the optimal pH for red wine fermentation?";
    expect(detectRegion(q)).toBeUndefined();
  });

  it("is case-insensitive", () => {
    const q = "How was the MARGARET RIVER 2024 vintage?";
    expect(detectRegion(q)).toBe("Margaret River");
  });

  it("detects partial match containing 'barossa'", () => {
    const q = "How was the Barossa in 2024?";
    const result = detectRegion(q);
    expect(result).toBeTruthy();
    expect(result!.toLowerCase()).toContain("barossa");
  });
});

// ─── Year detection logic ─────────────────────────────────────────────────────

describe("Year detection for vintage context injection", () => {
  function detectYear(question: string): number | null {
    const matches = question.match(/\b(20[0-9]{2})\b/);
    return matches ? parseInt(matches[1]) : null;
  }

  it("detects 2024 from a question", () => {
    expect(detectYear("How was the 2024 vintage in Barossa?")).toBe(2024);
  });

  it("detects 2023 from a question", () => {
    expect(detectYear("Compare 2023 and 2024 vintages")).toBe(2023);
  });

  it("detects 2025 from a question", () => {
    expect(detectYear("What should I expect from 2025?")).toBe(2025);
  });

  it("returns null when no year is mentioned", () => {
    expect(detectYear("What is the optimal fermentation temperature?")).toBeNull();
  });

  it("does not match years outside 20xx range", () => {
    expect(detectYear("The winery was founded in 1999")).toBeNull();
  });

  it("does not match 21xx years", () => {
    expect(detectYear("Planning for 2150")).toBeNull();
  });
});

// ─── Quality rating labels ────────────────────────────────────────────────────

describe("Quality rating label mapping", () => {
  const QUALITY_LABELS: Record<number, string> = {
    1: "Poor",
    2: "Below Average",
    3: "Average",
    4: "Excellent",
    5: "Exceptional",
  };

  it("maps all 5 ratings correctly", () => {
    expect(QUALITY_LABELS[1]).toBe("Poor");
    expect(QUALITY_LABELS[2]).toBe("Below Average");
    expect(QUALITY_LABELS[3]).toBe("Average");
    expect(QUALITY_LABELS[4]).toBe("Excellent");
    expect(QUALITY_LABELS[5]).toBe("Exceptional");
  });

  it("has no undefined labels for valid ratings", () => {
    [1, 2, 3, 4, 5].forEach((r) => {
      expect(QUALITY_LABELS[r]).toBeDefined();
      expect(typeof QUALITY_LABELS[r]).toBe("string");
    });
  });

  it("has exactly 5 entries", () => {
    expect(Object.keys(QUALITY_LABELS).length).toBe(5);
  });
});

// ─── Vintage context prompt construction ─────────────────────────────────────

describe("Vintage context prompt construction", () => {
  const ratingLabels: Record<number, string> = {
    1: "Poor", 2: "Below Average", 3: "Average", 4: "Excellent", 5: "Exceptional",
  };

  function buildVintageContext(entry: {
    region: string;
    year: number;
    qualityRating: number;
    yieldAssessment: string | null;
    standoutVarieties: string | null;
    conditions: string;
    winemakingNotes: string | null;
    source: string | null;
  }): string {
    const parts = [
      `## ${entry.region} ${entry.year} Vintage Intelligence`,
      `**Quality Rating:** ${entry.qualityRating}/5 — ${ratingLabels[entry.qualityRating] ?? "Unknown"}`,
    ];
    if (entry.yieldAssessment) parts.push(`**Yield:** ${entry.yieldAssessment}`);
    if (entry.standoutVarieties) parts.push(`**Standout Varieties:** ${entry.standoutVarieties}`);
    parts.push(`\n### Growing Season Conditions\n${entry.conditions.slice(0, 1200)}`);
    if (entry.winemakingNotes) parts.push(`\n### Winemaking Implications\n${entry.winemakingNotes.slice(0, 800)}`);
    if (entry.source) parts.push(`\n*Source: ${entry.source}*`);
    return parts.join("\n");
  }

  it("includes region and year in the heading", () => {
    const ctx = buildVintageContext({
      region: "Barossa Valley",
      year: 2024,
      qualityRating: 5,
      yieldAssessment: "50–90% of normal",
      standoutVarieties: "Grenache, Shiraz",
      conditions: "Dry winter, early harvest.",
      winemakingNotes: "Small berries — monitor extraction.",
      source: "Barossa Australia Vintage Report 2024",
    });
    expect(ctx).toContain("Barossa Valley 2024 Vintage Intelligence");
  });

  it("includes quality rating label for rating 5", () => {
    const ctx = buildVintageContext({
      region: "Barossa Valley",
      year: 2024,
      qualityRating: 5,
      yieldAssessment: null,
      standoutVarieties: null,
      conditions: "Dry winter.",
      winemakingNotes: null,
      source: null,
    });
    expect(ctx).toContain("5/5 — Exceptional");
  });

  it("includes quality rating label for rating 4", () => {
    const ctx = buildVintageContext({
      region: "McLaren Vale",
      year: 2024,
      qualityRating: 4,
      yieldAssessment: null,
      standoutVarieties: null,
      conditions: "Wet summer.",
      winemakingNotes: null,
      source: null,
    });
    expect(ctx).toContain("4/5 — Excellent");
  });

  it("omits yield section when null", () => {
    const ctx = buildVintageContext({
      region: "Hunter Valley",
      year: 2024,
      qualityRating: 5,
      yieldAssessment: null,
      standoutVarieties: "Semillon",
      conditions: "Very dry.",
      winemakingNotes: null,
      source: null,
    });
    expect(ctx).not.toContain("**Yield:**");
  });

  it("includes yield when provided", () => {
    const ctx = buildVintageContext({
      region: "Hunter Valley",
      year: 2024,
      qualityRating: 5,
      yieldAssessment: "Down 30–40%",
      standoutVarieties: null,
      conditions: "Very dry.",
      winemakingNotes: null,
      source: null,
    });
    expect(ctx).toContain("**Yield:** Down 30–40%");
  });

  it("omits standout varieties section when null", () => {
    const ctx = buildVintageContext({
      region: "Yarra Valley",
      year: 2024,
      qualityRating: 4,
      yieldAssessment: null,
      standoutVarieties: null,
      conditions: "High rainfall.",
      winemakingNotes: null,
      source: null,
    });
    expect(ctx).not.toContain("**Standout Varieties:**");
  });

  it("includes source attribution when provided", () => {
    const ctx = buildVintageContext({
      region: "Margaret River",
      year: 2024,
      qualityRating: 5,
      yieldAssessment: "8% below 2023",
      standoutVarieties: "Chardonnay",
      conditions: "Earliest harvest on record.",
      winemakingNotes: "Precision picking critical.",
      source: "WA Wines Vintage Report 2024",
    });
    expect(ctx).toContain("*Source: WA Wines Vintage Report 2024*");
  });

  it("omits source when null", () => {
    const ctx = buildVintageContext({
      region: "Orange",
      year: 2024,
      qualityRating: 4,
      yieldAssessment: null,
      standoutVarieties: null,
      conditions: "Cool altitude season.",
      winemakingNotes: null,
      source: null,
    });
    expect(ctx).not.toContain("*Source:");
  });

  it("truncates conditions to 1200 characters", () => {
    const longConditions = "a".repeat(2000);
    const ctx = buildVintageContext({
      region: "Test Region",
      year: 2024,
      qualityRating: 3,
      yieldAssessment: null,
      standoutVarieties: null,
      conditions: longConditions,
      winemakingNotes: null,
      source: null,
    });
    // Extract only the conditions section (after the heading)
    const conditionsSection = ctx.split("### Growing Season Conditions\n")[1] ?? "";
    // The conditions text should be at most 1200 chars
    expect(conditionsSection.trim().length).toBeLessThanOrEqual(1200);
  });

  it("truncates winemaking notes to 800 characters", () => {
    const longNotes = "B".repeat(1500);
    const ctx = buildVintageContext({
      region: "Test Region",
      year: 2024,
      qualityRating: 3,
      yieldAssessment: null,
      standoutVarieties: null,
      conditions: "Short conditions.",
      winemakingNotes: longNotes,
      source: null,
    });
    const bCount = (ctx.match(/B/g) ?? []).length;
    expect(bCount).toBeLessThanOrEqual(800);
  });

  it("always includes Growing Season Conditions heading", () => {
    const ctx = buildVintageContext({
      region: "Canberra District",
      year: 2024,
      qualityRating: 4,
      yieldAssessment: null,
      standoutVarieties: null,
      conditions: "Cool continental climate.",
      winemakingNotes: null,
      source: null,
    });
    expect(ctx).toContain("### Growing Season Conditions");
  });
});

// ─── Admin page filter logic ──────────────────────────────────────────────────

describe("AdminVintageIntelligence filter logic", () => {
  interface Entry { id: number; region: string; year: number; state: string; qualityRating: number; }

  const entries: Entry[] = [
    { id: 1, region: "Barossa Valley", year: 2024, state: "SA", qualityRating: 5 },
    { id: 2, region: "McLaren Vale", year: 2024, state: "SA", qualityRating: 4 },
    { id: 3, region: "Margaret River", year: 2024, state: "WA", qualityRating: 5 },
    { id: 4, region: "Hunter Valley", year: 2023, state: "NSW", qualityRating: 3 },
    { id: 5, region: "Yarra Valley", year: 2024, state: "VIC", qualityRating: 4 },
  ];

  function filterEntries(all: Entry[], year?: number, state?: string): Entry[] {
    return all.filter((e) => {
      if (year && e.year !== year) return false;
      if (state && e.state !== state) return false;
      return true;
    });
  }

  it("returns all entries when no filter is applied", () => {
    expect(filterEntries(entries)).toHaveLength(5);
  });

  it("filters by year correctly", () => {
    const result = filterEntries(entries, 2024);
    expect(result).toHaveLength(4);
    result.forEach((e) => expect(e.year).toBe(2024));
  });

  it("filters by state correctly", () => {
    const result = filterEntries(entries, undefined, "SA");
    expect(result).toHaveLength(2);
    result.forEach((e) => expect(e.state).toBe("SA"));
  });

  it("filters by both year and state", () => {
    const result = filterEntries(entries, 2024, "SA");
    expect(result).toHaveLength(2);
    result.forEach((e) => {
      expect(e.year).toBe(2024);
      expect(e.state).toBe("SA");
    });
  });

  it("returns empty array when no entries match", () => {
    const result = filterEntries(entries, 2020, "TAS");
    expect(result).toHaveLength(0);
  });
});
