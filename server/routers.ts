import { COOKIE_NAME } from "@shared/const";
import { getSessionCookieOptions } from "./_core/cookies";
import { systemRouter } from "./_core/systemRouter";
import { publicProcedure, router } from "./_core/trpc";
import { z } from "zod";

export const appRouter = router({
  system: systemRouter,
  auth: router({
    me: publicProcedure.query(opts => opts.ctx.user),
    logout: publicProcedure.mutation(({ ctx }) => {
      const cookieOptions = getSessionCookieOptions(ctx.req);
      ctx.res.clearCookie(COOKIE_NAME, { ...cookieOptions, maxAge: -1 });
      return {
        success: true,
      } as const;
    }),
  }),

  waitlist: router({
    subscribe: publicProcedure
      .input(z.object({ email: z.string().email() }))
      .mutation(async ({ input }) => {
        const apiKey = process.env.BUTTONDOWN_API_KEY;
        if (!apiKey) {
          throw new Error("Waitlist service not configured.");
        }

        const response = await fetch("https://api.buttondown.email/v1/subscribers", {
          method: "POST",
          headers: {
            Authorization: `Token ${apiKey}`,
            "Content-Type": "application/json",
          },
          body: JSON.stringify({
            email_address: input.email,
            tags: ["ownology-waitlist"],
          }),
        });

        // 201 = created successfully
        if (response.status === 201) {
          return { success: true, message: "You're on the list." };
        }

        const body = await response.json().catch(() => ({})) as Record<string, unknown>;

        // 400 with known non-fatal codes — treat as success from user's perspective
        if (response.status === 400) {
          const code = body.code as string | undefined;
          if (
            code === "subscriber_already_exists" ||
            code === "email_already_exists"
          ) {
            return { success: true, message: "You're already on the list." };
          }
          // subscriber_blocked — Buttondown still records the attempt; show success to user
          if (code === "subscriber_blocked") {
            return { success: true, message: "You're on the list." };
          }
        }

        // 409 = conflict / already subscribed
        if (response.status === 409) {
          return { success: true, message: "You're already on the list." };
        }

        console.error("[Buttondown] Subscription failed:", response.status, body);
        throw new Error("Could not add you to the waitlist. Please try again.");
      }),
  }),
});

export type AppRouter = typeof appRouter;
