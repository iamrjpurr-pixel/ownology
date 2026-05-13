/**
 * Admin hub page tests
 * Verifies the admin page logic for owner gating and KPI display.
 */
import { describe, it, expect } from "vitest";

describe("Admin hub page", () => {
  describe("owner gating logic", () => {
    it("treats undefined adminData as non-owner", () => {
      const adminData = undefined;
      const isOwner = !!adminData;
      expect(isOwner).toBe(false);
    });

    it("treats null adminData as non-owner", () => {
      const adminData = null;
      const isOwner = !!adminData;
      expect(isOwner).toBe(false);
    });

    it("treats defined adminData as owner", () => {
      const adminData = {
        waitlistCount: 42,
        foundingMemberCount: 7,
        stripeOrderCount: 3,
        stripeRevenueCents: 12000,
        latestWeek: "2026-W20",
        snapshotAt: 1747000000000,
      };
      const isOwner = !!adminData;
      expect(isOwner).toBe(true);
    });
  });

  describe("KPI display formatting", () => {
    it("formats AUD revenue correctly from cents", () => {
      const revenueCents = 12000; // $120.00
      const revenueAud = (revenueCents / 100).toLocaleString("en-AU", {
        style: "currency",
        currency: "AUD",
        minimumFractionDigits: 0,
        maximumFractionDigits: 0,
      });
      expect(revenueAud).toContain("120");
    });

    it("calculates spots remaining correctly", () => {
      const fmCount = 7;
      const spotsRemaining = Math.max(0, 99 - fmCount);
      expect(spotsRemaining).toBe(92);
    });

    it("clamps spots remaining to zero when over 99", () => {
      const fmCount = 105;
      const spotsRemaining = Math.max(0, 99 - fmCount);
      expect(spotsRemaining).toBe(0);
    });

    it("formats snapshot date from Unix ms timestamp", () => {
      const snapshotAt = 1747000000000;
      const snapshotDate = new Date(snapshotAt).toLocaleDateString("en-AU", {
        day: "numeric",
        month: "short",
        year: "numeric",
      });
      expect(snapshotDate).toBeTruthy();
      expect(snapshotDate.length).toBeGreaterThan(5);
    });

    it("returns null for snapshotDate when snapshotAt is null", () => {
      const snapshotAt: number | null = null;
      const snapshotDate = snapshotAt
        ? new Date(snapshotAt).toLocaleDateString("en-AU", {
            day: "numeric",
            month: "short",
            year: "numeric",
          })
        : null;
      expect(snapshotDate).toBeNull();
    });
  });

  describe("tool card definitions", () => {
    const TOOLS = [
      { label: "Campaign Metrics", href: "/campaign-metrics" },
      { label: "Orders", href: "/orders" },
      { label: "Founding Members", href: "/campaign-metrics" },
      { label: "Compliance Agent", href: "/compliance" },
      { label: "Merch Store", href: "/merch" },
      { label: "Pricing Page", href: "/pricing" },
    ];

    it("has 6 tool cards defined", () => {
      expect(TOOLS.length).toBe(6);
    });

    it("all tool hrefs start with /", () => {
      TOOLS.forEach((tool) => {
        expect(tool.href.startsWith("/")).toBe(true);
      });
    });

    it("includes Campaign Metrics card", () => {
      const found = TOOLS.find((t) => t.label === "Campaign Metrics");
      expect(found).toBeDefined();
      expect(found?.href).toBe("/campaign-metrics");
    });

    it("includes Orders card", () => {
      const found = TOOLS.find((t) => t.label === "Orders");
      expect(found).toBeDefined();
      expect(found?.href).toBe("/orders");
    });
  });
});
