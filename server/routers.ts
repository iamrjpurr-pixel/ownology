import { COOKIE_NAME } from "@shared/const";
import { getSessionCookieOptions } from "./_core/cookies";
import { systemRouter } from "./_core/systemRouter";
import { publicProcedure, router } from "./_core/trpc";
import { notifyOwner } from "./_core/notification";
import { getDb } from "./db";
import { demoRequests } from "../drizzle/schema";
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
          // Notify owner of new waitlist signup
          await notifyOwner({
            title: "New Waitlist Signup 🍷",
            content: `A new winemaker joined the Ownology waitlist: **${input.email}**`,
          }).catch(() => {}); // non-blocking
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

  demo: router({
    request: publicProcedure
      .input(z.object({
        name: z.string().min(1).max(128),
        email: z.string().email(),
        winery: z.string().min(1).max(256),
        region: z.string().max(128).optional(),
        cases: z.string().max(64).optional(),
        message: z.string().max(2000).optional(),
      }))
      .mutation(async ({ input }) => {
        // Save to database
        const db = await getDb();
        if (db) await db.insert(demoRequests).values({
          name: input.name,
          email: input.email,
          winery: input.winery,
          region: input.region ?? null,
          cases: input.cases ?? null,
          message: input.message ?? null,
        });

        // Notify owner
        await notifyOwner({
          title: "New Demo Request 🎉",
          content: `**${input.name}** from **${input.winery}** (${input.region ?? "region not specified"}) has requested a demo.\n\nEmail: ${input.email}\nProduction: ${input.cases ?? "not specified"}\n\n${input.message ? `Message: ${input.message}` : ""}`,
        }).catch(() => {}); // non-blocking

        return { success: true };
      }),
  }),
});

export type AppRouter = typeof appRouter;
