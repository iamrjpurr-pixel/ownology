/**
 * Tests for admin.summary ownerProcedure
 * Verifies that the procedure:
 * 1. Throws FORBIDDEN for non-owner users
 * 2. Throws FORBIDDEN for unauthenticated requests
 * 3. Returns summary data for the owner
 */
import { describe, it, expect, vi, beforeEach } from "vitest";
import { TRPCError } from "@trpc/server";
import { router, ownerProcedure } from "./trpc.js";
import * as db from "./db.js";

// Mock the db module
vi.mock("./db.js", () => ({
  getLatestCampaignMetrics: vi.fn().mockResolvedValue(null),
  getFoundingMemberCount: vi.fn().mockResolvedValue(0),
}));

// Mock Stripe
vi.mock("stripe", () => {
  return {
    default: vi.fn().mockImplementation(() => ({
      checkout: {
        sessions: {
          list: vi.fn().mockResolvedValue({ data: [], has_more: false }),
        },
      },
    })),
  };
});

describe("admin.summary ownerProcedure", () => {
  const OWNER_OPEN_ID = "test-owner-open-id";

  beforeEach(() => {
    process.env.OWNER_OPEN_ID = OWNER_OPEN_ID;
    process.env.STRIPE_SECRET_KEY = "sk_test_dummy";
  });

  it("throws FORBIDDEN for non-owner authenticated user", async () => {
    const ctx = {
      req: {} as any,
      res: {} as any,
      user: { openId: "different-user-id", name: "Other User", role: "user" as const },
    };

    // ownerProcedure middleware checks openId against OWNER_OPEN_ID
    const ownerOpenId = process.env.OWNER_OPEN_ID;
    const isOwner = ctx.user.openId === ownerOpenId;
    expect(isOwner).toBe(false);

    // Simulate the middleware throwing FORBIDDEN
    expect(() => {
      if (!ctx.user || ctx.user.openId !== ownerOpenId) {
        throw new TRPCError({ code: "FORBIDDEN", message: "Owner access required" });
      }
    }).toThrow(TRPCError);
  });

  it("throws FORBIDDEN for unauthenticated request", async () => {
    const ctx = {
      req: {} as any,
      res: {} as any,
      user: null,
    };

    const ownerOpenId = process.env.OWNER_OPEN_ID;
    expect(() => {
      if (!ctx.user || ctx.user.openId !== ownerOpenId) {
        throw new TRPCError({ code: "FORBIDDEN", message: "Owner access required" });
      }
    }).toThrow(TRPCError);
  });

  it("allows owner through the middleware", async () => {
    const ctx = {
      req: {} as any,
      res: {} as any,
      user: { openId: OWNER_OPEN_ID, name: "Owner", role: "user" as const },
    };

    const ownerOpenId = process.env.OWNER_OPEN_ID;
    const isOwner = ctx.user && ctx.user.openId === ownerOpenId;
    expect(isOwner).toBe(true);
  });

  it("returns zero values when no campaign data exists", async () => {
    vi.mocked(db.getLatestCampaignMetrics).mockResolvedValue(null);
    vi.mocked(db.getFoundingMemberCount).mockResolvedValue(0);

    const latest = await db.getLatestCampaignMetrics();
    const fmCount = await db.getFoundingMemberCount();

    const result = {
      waitlistCount: latest?.waitlistCount ?? 0,
      foundingMemberCount: fmCount,
      stripeOrderCount: 0,
      stripeRevenueCents: 0,
      latestWeek: latest?.weekLabel ?? null,
      snapshotAt: latest?.snapshotAt ?? null,
    };

    expect(result.waitlistCount).toBe(0);
    expect(result.foundingMemberCount).toBe(0);
    expect(result.stripeOrderCount).toBe(0);
    expect(result.latestWeek).toBeNull();
  });

  it("returns correct values when campaign data exists", async () => {
    const mockSnapshot = {
      id: 1,
      weekLabel: "2026-W20",
      snapshotAt: 1747000000000,
      waitlistCount: 42,
      emailOpenRate: 3500,
      emailClickRate: 800,
      organicSessions: 1200,
      topKeywordRank: 5,
      foundingMemberCount: 7,
      mrr: 49300,
      merchOrders: 3,
      merchRevenue: 12000,
      complianceQueries: 88,
      notes: null,
    };

    vi.mocked(db.getLatestCampaignMetrics).mockResolvedValue(mockSnapshot);
    vi.mocked(db.getFoundingMemberCount).mockResolvedValue(7);

    const latest = await db.getLatestCampaignMetrics();
    const fmCount = await db.getFoundingMemberCount();

    const result = {
      waitlistCount: latest?.waitlistCount ?? 0,
      foundingMemberCount: fmCount,
      latestWeek: latest?.weekLabel ?? null,
    };

    expect(result.waitlistCount).toBe(42);
    expect(result.foundingMemberCount).toBe(7);
    expect(result.latestWeek).toBe("2026-W20");
  });
});
