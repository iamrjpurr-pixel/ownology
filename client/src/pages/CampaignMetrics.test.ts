/**
 * Campaign Metrics — unit tests
 *
 * Tests cover:
 * 1. weekLabel formatting (ISO week format validation)
 * 2. MRR baseline calculation used by the Heartbeat handler
 * 3. tRPC upsert input schema validation (zod)
 * 4. KPI card rendering helpers (trend direction, formatting)
 * 5. Dashboard data transformation (recharts-ready shape)
 */
import { describe, it, expect } from "vitest";
import { z } from "zod";

// ─── 1. ISO week label format ─────────────────────────────────────────────────

const WEEK_LABEL_RE = /^\d{4}-W\d{2}$/;

function buildWeekLabel(date: Date): string {
  // Replicate the handler logic
  const jan1 = new Date(date.getFullYear(), 0, 1);
  const dayOfYear = Math.floor((date.getTime() - jan1.getTime()) / 86400000) + 1;
  const week = Math.ceil(dayOfYear / 7);
  const year = date.getFullYear();
  return `${year}-W${String(week).padStart(2, "0")}`;
}

describe("weekLabel formatting", () => {
  it("produces ISO week format for a known Monday", () => {
    const monday = new Date("2026-05-11"); // Monday of W20
    const label = buildWeekLabel(monday);
    expect(WEEK_LABEL_RE.test(label)).toBe(true);
  });

  it("zero-pads single-digit week numbers", () => {
    const earlyJan = new Date("2026-01-05");
    const label = buildWeekLabel(earlyJan);
    expect(label).toMatch(/W0\d$/);
  });

  it("rejects invalid week label format", () => {
    expect(WEEK_LABEL_RE.test("2026-20")).toBe(false);
    expect(WEEK_LABEL_RE.test("W20-2026")).toBe(false);
    expect(WEEK_LABEL_RE.test("2026-W2")).toBe(false);
  });
});

// ─── 2. MRR baseline calculation ─────────────────────────────────────────────

const CELLAR_TIER_CENTS = 2900; // AUD $29/mo

function calculateBaselineMrr(foundingMemberCount: number): number {
  return foundingMemberCount * CELLAR_TIER_CENTS;
}

describe("MRR baseline calculation", () => {
  it("returns 0 for 0 founding members", () => {
    expect(calculateBaselineMrr(0)).toBe(0);
  });

  it("returns correct AUD cents for 10 founding members", () => {
    expect(calculateBaselineMrr(10)).toBe(29000);
  });

  it("returns correct AUD cents for 99 founding members (full cohort)", () => {
    expect(calculateBaselineMrr(99)).toBe(287100);
  });

  it("formats MRR as AUD dollars correctly", () => {
    const cents = calculateBaselineMrr(10);
    const dollars = (cents / 100).toFixed(2);
    expect(dollars).toBe("290.00");
  });
});

// ─── 3. tRPC upsert input schema validation ───────────────────────────────────

const upsertInputSchema = z.object({
  weekLabel: z.string().regex(/^\d{4}-W\d{2}$/, "Must be ISO week format e.g. 2026-W20"),
  snapshotAt: z.number().optional(),
  waitlistCount: z.number().min(0).optional(),
  emailOpenRate: z.number().min(0).max(10000).optional(), // basis points
  emailClickRate: z.number().min(0).max(10000).optional(),
  organicSessions: z.number().min(0).optional(),
  topKeywordRank: z.number().min(0).optional(),
  foundingMemberCount: z.number().min(0).optional(),
  mrr: z.number().min(0).optional(),
  merchOrders: z.number().min(0).optional(),
  merchRevenue: z.number().min(0).optional(),
  complianceQueries: z.number().min(0).optional(),
  notes: z.string().max(1000).optional(),
});

describe("upsert input schema", () => {
  it("accepts a valid minimal payload", () => {
    const result = upsertInputSchema.safeParse({ weekLabel: "2026-W20" });
    expect(result.success).toBe(true);
  });

  it("accepts a full payload", () => {
    const result = upsertInputSchema.safeParse({
      weekLabel: "2026-W20",
      snapshotAt: Date.now(),
      waitlistCount: 47,
      emailOpenRate: 3200,
      emailClickRate: 850,
      organicSessions: 312,
      topKeywordRank: 8,
      foundingMemberCount: 12,
      mrr: 34800,
      merchOrders: 3,
      merchRevenue: 8700,
      complianceQueries: 89,
      notes: "First week of paid tier launch",
    });
    expect(result.success).toBe(true);
  });

  it("rejects invalid weekLabel format", () => {
    const result = upsertInputSchema.safeParse({ weekLabel: "2026-20" });
    expect(result.success).toBe(false);
  });

  it("rejects negative waitlistCount", () => {
    const result = upsertInputSchema.safeParse({ weekLabel: "2026-W20", waitlistCount: -1 });
    expect(result.success).toBe(false);
  });

  it("rejects emailOpenRate above 10000 basis points", () => {
    const result = upsertInputSchema.safeParse({ weekLabel: "2026-W20", emailOpenRate: 10001 });
    expect(result.success).toBe(false);
  });

  it("rejects notes longer than 1000 characters", () => {
    const result = upsertInputSchema.safeParse({ weekLabel: "2026-W20", notes: "x".repeat(1001) });
    expect(result.success).toBe(false);
  });
});

// ─── 4. KPI card helpers ──────────────────────────────────────────────────────

function trendDirection(current: number, previous: number): "up" | "down" | "flat" {
  if (current > previous) return "up";
  if (current < previous) return "down";
  return "flat";
}

function formatAudCents(cents: number): string {
  return `$${(cents / 100).toLocaleString("en-AU", { minimumFractionDigits: 0, maximumFractionDigits: 0 })}`;
}

function formatBasisPoints(bp: number): string {
  return `${(bp / 100).toFixed(1)}%`;
}

describe("KPI card helpers", () => {
  it("trendDirection returns up when current > previous", () => {
    expect(trendDirection(10, 8)).toBe("up");
  });

  it("trendDirection returns down when current < previous", () => {
    expect(trendDirection(5, 8)).toBe("down");
  });

  it("trendDirection returns flat when equal", () => {
    expect(trendDirection(8, 8)).toBe("flat");
  });

  it("formatAudCents converts cents to AUD string", () => {
    expect(formatAudCents(29000)).toBe("$290");
  });

  it("formatBasisPoints converts basis points to percentage string", () => {
    expect(formatBasisPoints(3200)).toBe("32.0%");
  });
});

// ─── 5. Dashboard data transformation ────────────────────────────────────────

type RawSnapshot = {
  weekLabel: string;
  foundingMemberCount: number;
  mrr: number;
  waitlistCount: number;
  complianceQueries: number;
};

function toChartData(snapshots: RawSnapshot[]) {
  return snapshots.map((s) => ({
    week: s.weekLabel.replace(/^\d{4}-/, ""), // "W20"
    members: s.foundingMemberCount,
    mrr: s.mrr / 100, // AUD dollars
    waitlist: s.waitlistCount,
    queries: s.complianceQueries,
  }));
}

describe("dashboard data transformation", () => {
  const mockSnapshots: RawSnapshot[] = [
    { weekLabel: "2026-W20", foundingMemberCount: 5, mrr: 14500, waitlistCount: 23, complianceQueries: 41 },
    { weekLabel: "2026-W21", foundingMemberCount: 9, mrr: 26100, waitlistCount: 31, complianceQueries: 67 },
    { weekLabel: "2026-W22", foundingMemberCount: 12, mrr: 34800, waitlistCount: 38, complianceQueries: 89 },
  ];

  it("produces the correct number of chart data points", () => {
    const chart = toChartData(mockSnapshots);
    expect(chart).toHaveLength(3);
  });

  it("strips year prefix from week label for chart x-axis", () => {
    const chart = toChartData(mockSnapshots);
    expect(chart[0].week).toBe("W20");
  });

  it("converts MRR from cents to dollars", () => {
    const chart = toChartData(mockSnapshots);
    expect(chart[0].mrr).toBe(145);
    expect(chart[2].mrr).toBe(348);
  });

  it("preserves founding member count", () => {
    const chart = toChartData(mockSnapshots);
    expect(chart[1].members).toBe(9);
  });

  it("shows upward trend in members across all weeks", () => {
    const chart = toChartData(mockSnapshots);
    for (let i = 1; i < chart.length; i++) {
      expect(chart[i].members).toBeGreaterThan(chart[i - 1].members);
    }
  });
});
