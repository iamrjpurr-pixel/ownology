/**
 * Unit tests for Lead CRM logic
 * Tests the CSV export helper, source badge colour mapping, and
 * the filtering/search logic used in AdminLeads.tsx.
 */
import { describe, it, expect } from "vitest";

// ─── Helpers mirrored from AdminLeads.tsx ────────────────────────────────────

const SOURCE_COLOURS: Record<string, string> = {
  preview: "oklch(0.72 0.12 75 / 20%)",
  pricing: "oklch(0.55 0.18 250 / 20%)",
  event: "oklch(0.55 0.18 150 / 20%)",
  blog: "oklch(0.55 0.18 320 / 20%)",
  manual: "oklch(0.55 0.02 75 / 20%)",
  unknown: "oklch(0.4 0.01 75 / 20%)",
};

function sourceBg(source: string) {
  return SOURCE_COLOURS[source] ?? SOURCE_COLOURS.unknown;
}

interface Lead {
  id: number;
  email: string;
  source: string;
  tags: string[];
  name: string | null;
  wineryName: string | null;
  notes: string | null;
  createdAt: number;
  updatedAt: number;
}

function exportCsvRows(leads: Lead[]): string[][] {
  const header = ["ID", "Email", "Source", "Tags", "Name", "Winery", "Notes", "Date"];
  const rows = leads.map((l) => [
    String(l.id),
    l.email,
    l.source,
    l.tags.join("|"),
    l.name ?? "",
    l.wineryName ?? "",
    (l.notes ?? "").replace(/\n/g, " "),
    new Date(l.createdAt).toISOString(),
  ]);
  return [header, ...rows];
}

function filterLeads(leads: Lead[], search: string, sourceFilter: string): Lead[] {
  const q = search.toLowerCase();
  return leads.filter((l) => {
    const matchesSearch =
      !q ||
      l.email.toLowerCase().includes(q) ||
      (l.name ?? "").toLowerCase().includes(q) ||
      (l.wineryName ?? "").toLowerCase().includes(q);
    const matchesSource = !sourceFilter || l.source === sourceFilter;
    return matchesSearch && matchesSource;
  });
}

// ─── Sample fixtures ──────────────────────────────────────────────────────────

const LEADS: Lead[] = [
  { id: 1, email: "alice@cellar.com", source: "preview", tags: ["preview", "event-handout"], name: "Alice", wineryName: "Cellar Estate", notes: "Met at Wine Australia", createdAt: 1748800000000, updatedAt: 1748800000000 },
  { id: 2, email: "bob@winery.com", source: "pricing", tags: ["waitlist", "pricing"], name: null, wineryName: "Bob's Winery", notes: null, createdAt: 1748810000000, updatedAt: 1748810000000 },
  { id: 3, email: "carol@blog.com", source: "blog", tags: ["waitlist", "blog"], name: "Carol", wineryName: null, notes: null, createdAt: 1748820000000, updatedAt: 1748820000000 },
];

// ─── Tests ────────────────────────────────────────────────────────────────────

describe("Lead CRM — source badge colours", () => {
  it("returns known colour for 'preview'", () => {
    expect(sourceBg("preview")).toBe("oklch(0.72 0.12 75 / 20%)");
  });

  it("returns known colour for 'pricing'", () => {
    expect(sourceBg("pricing")).toBe("oklch(0.55 0.18 250 / 20%)");
  });

  it("falls back to unknown colour for unrecognised source", () => {
    expect(sourceBg("some-new-page")).toBe("oklch(0.4 0.01 75 / 20%)");
  });
});

describe("Lead CRM — CSV export", () => {
  it("produces a header row as the first row", () => {
    const rows = exportCsvRows(LEADS);
    expect(rows[0]).toEqual(["ID", "Email", "Source", "Tags", "Name", "Winery", "Notes", "Date"]);
  });

  it("produces one data row per lead", () => {
    const rows = exportCsvRows(LEADS);
    expect(rows.length).toBe(LEADS.length + 1); // header + data
  });

  it("joins tags with pipe separator", () => {
    const rows = exportCsvRows(LEADS);
    expect(rows[1][3]).toBe("preview|event-handout");
  });

  it("uses empty string for null name", () => {
    const rows = exportCsvRows(LEADS);
    expect(rows[2][4]).toBe(""); // bob has no name
  });

  it("replaces newlines in notes with spaces", () => {
    const lead: Lead = { ...LEADS[0], notes: "Line one\nLine two" };
    const rows = exportCsvRows([lead]);
    expect(rows[1][6]).toBe("Line one Line two");
  });
});

describe("Lead CRM — filtering", () => {
  it("returns all leads when no filter is applied", () => {
    expect(filterLeads(LEADS, "", "")).toHaveLength(3);
  });

  it("filters by email substring (case-insensitive)", () => {
    const result = filterLeads(LEADS, "alice", "");
    expect(result).toHaveLength(1);
    expect(result[0].email).toBe("alice@cellar.com");
  });

  it("filters by winery name", () => {
    const result = filterLeads(LEADS, "bob's winery", "");
    expect(result).toHaveLength(1);
    expect(result[0].id).toBe(2);
  });

  it("filters by source", () => {
    const result = filterLeads(LEADS, "", "blog");
    expect(result).toHaveLength(1);
    expect(result[0].source).toBe("blog");
  });

  it("combines search and source filter", () => {
    const result = filterLeads(LEADS, "carol", "blog");
    expect(result).toHaveLength(1);
    expect(result[0].email).toBe("carol@blog.com");
  });

  it("returns empty when no leads match", () => {
    const result = filterLeads(LEADS, "zzz-no-match", "");
    expect(result).toHaveLength(0);
  });
});
