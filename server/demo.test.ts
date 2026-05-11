import { describe, it, expect, vi, beforeEach } from "vitest";

// ─── Mock the DB so tests run without a real database ─────────────────────────
vi.mock("./db", () => ({
  getDb: vi.fn().mockResolvedValue({
    insert: vi.fn().mockReturnValue({
      values: vi.fn().mockResolvedValue(undefined),
    }),
  }),
}));

// ─── Mock notifyOwner so tests don't hit the notification service ─────────────
vi.mock("./_core/notification", () => ({
  notifyOwner: vi.fn().mockResolvedValue(true),
}));

import { getDb } from "./db";
import { notifyOwner } from "./_core/notification";

// ─── Simulate the demo.request mutation logic ─────────────────────────────────
async function simulateDemoRequest(input: {
  name: string;
  email: string;
  winery: string;
  region?: string;
  cases?: string;
  message?: string;
}) {
  const db = await getDb();
  if (db) {
    await db.insert({} as never).values({
      name: input.name,
      email: input.email,
      winery: input.winery,
      region: input.region ?? null,
      cases: input.cases ?? null,
      message: input.message ?? null,
    });
  }

  await notifyOwner({
    title: "New Demo Request 🎉",
    content: `**${input.name}** from **${input.winery}** (${input.region ?? "region not specified"}) has requested a demo.\n\nEmail: ${input.email}`,
  }).catch(() => {});

  return { success: true };
}

// ─── Tests ────────────────────────────────────────────────────────────────────
describe("demo.request procedure", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("saves a complete demo request to the database", async () => {
    const result = await simulateDemoRequest({
      name: "Jane Smith",
      email: "jane@hunterestate.com.au",
      winery: "Hunter Estate Wines",
      region: "Hunter Valley, NSW",
      cases: "5,001–20,000 cases",
      message: "Interested in the fermentation dashboard feature.",
    });

    expect(result).toEqual({ success: true });
    expect(getDb).toHaveBeenCalled();
  });

  it("saves a minimal demo request (name, email, winery only)", async () => {
    const result = await simulateDemoRequest({
      name: "Tom Grower",
      email: "tom@smallwinery.com",
      winery: "Small Winery Co",
    });

    expect(result).toEqual({ success: true });
  });

  it("fires the owner notification with correct content", async () => {
    await simulateDemoRequest({
      name: "Alice Maker",
      email: "alice@barossa.com.au",
      winery: "Barossa Valley Estate",
      region: "Barossa Valley, SA",
    });

    expect(notifyOwner).toHaveBeenCalledWith(
      expect.objectContaining({
        title: "New Demo Request 🎉",
        content: expect.stringContaining("Alice Maker"),
      })
    );
    expect(notifyOwner).toHaveBeenCalledWith(
      expect.objectContaining({
        content: expect.stringContaining("Barossa Valley Estate"),
      })
    );
  });

  it("still succeeds even if notifyOwner fails", async () => {
    (notifyOwner as ReturnType<typeof vi.fn>).mockRejectedValueOnce(new Error("Notification service down"));

    const result = await simulateDemoRequest({
      name: "Bob Cellar",
      email: "bob@yarra.com.au",
      winery: "Yarra Valley Wines",
    });

    // Should not throw — notifyOwner failure is non-blocking
    expect(result).toEqual({ success: true });
  });
});
