import { describe, expect, it } from "vitest";
import { appRouter } from "./routers";
import type { TrpcContext } from "./_core/context";

function createPublicContext(): TrpcContext {
  return {
    user: null,
    req: {
      protocol: "https",
      headers: {},
    } as TrpcContext["req"],
    res: {
      clearCookie: () => {},
    } as TrpcContext["res"],
  };
}

describe("waitlist.subscribe", () => {
  it("rejects an invalid email address", async () => {
    const ctx = createPublicContext();
    const caller = appRouter.createCaller(ctx);

    await expect(
      caller.waitlist.subscribe({ email: "not-an-email" })
    ).rejects.toThrow();
  });

  it("successfully subscribes a valid email to Buttondown (or handles already-subscribed gracefully)", async () => {
    const ctx = createPublicContext();
    const caller = appRouter.createCaller(ctx);

    // hello@ownology.ai was subscribed in the initial test run.
    // The router treats 201, 400/subscriber_already_exists, and 400/subscriber_blocked as success.
    const result = await caller.waitlist.subscribe({
      email: "hello@ownology.ai",
    });

    expect(result.success).toBe(true);
    expect(typeof result.message).toBe("string");
    expect(result.message.length).toBeGreaterThan(0);
  }, 15000); // Allow 15s for real API call
});
