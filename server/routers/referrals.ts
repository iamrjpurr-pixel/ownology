/**
 * referrals.ts — invite-a-winemaker loop.
 *
 * Every winery gets a unique referral_code at signup (backfilled in the
 * migration). Sharing `/hi/<slug>?ref=<code>` (or the plain `/join?ref=<code>`
 * landing) tags the click; when the referee signs up + converts to paid,
 * the referrer earns 30 days of trial credit (adds to trial_credits_days
 * which extends trial_ends_at for anyone still on the free tier).
 *
 * This router exposes:
 *   - myCode: get the current winery's code + shareable link
 *   - myList: see referrals I've sent (status = pending/signed_up/converted)
 *   - trackClick: PUBLIC procedure — someone hit /join?ref=CODE, log intent
 *   - applyToCurrent: mutation invoked post-signup when the new user's
 *     browser has a stored ref cookie/param — links their new winery to
 *     the referrer.
 */
import { z } from "zod";
import { router, protectedProcedure, publicProcedure } from "../trpc.js";
import { db, getUserByOpenId } from "../db.js";
import * as schema from "../../drizzle/schema.js";
import { eq, and, desc } from "drizzle-orm";

const REWARD_DAYS_ON_CONVERT = 30;

export const referralsRouter = router({
  /**
   * Return the current winery's code + the shareable public link.
   * If somehow the code is missing (older row) we generate one on-the-fly.
   */
  myCode: protectedProcedure.query(async ({ ctx }) => {
    const dbUser = await getUserByOpenId(ctx.user.openId);
    if (!dbUser?.wineryId) return null;
    const w = await db.query.wineries.findFirst({
      where: eq(schema.wineries.id, dbUser.wineryId),
    });
    if (!w) return null;
    let code = (w as unknown as { referralCode: string | null }).referralCode;
    if (!code) {
      // Lazy backfill for edge-case rows the migration missed.
      const suffix = Math.random().toString(36).slice(2, 8).toUpperCase();
      const prefix = (w.slug || "OWN").toUpperCase().replace(/[^A-Z0-9]/g, "").slice(0, 6);
      code = `${prefix}-${suffix}`;
      await db.update(schema.wineries).set({ referralCode: code }).where(eq(schema.wineries.id, w.id));
    }
    return {
      code,
      // Absolute URL is built client-side using window.location.origin — this
      // just returns the path so the frontend can prefix appropriately.
      sharePath: `/join?ref=${encodeURIComponent(code)}`,
      rewardDaysPerConvert: REWARD_DAYS_ON_CONVERT,
    };
  }),

  /**
   * List referrals I've sent. Useful for the /invite page dashboard
   * ("3 pending · 1 signed up · 0 converted").
   */
  myList: protectedProcedure.query(async ({ ctx }) => {
    const dbUser = await getUserByOpenId(ctx.user.openId);
    if (!dbUser?.wineryId) return [];
    const rows = await db.select({
      id: schema.referrals.id,
      referralCode: schema.referrals.referralCode,
      referredEmail: schema.referrals.referredEmail,
      status: schema.referrals.status,
      rewardDaysGranted: schema.referrals.rewardDaysGranted,
      createdAt: schema.referrals.createdAt,
      signedUpAt: schema.referrals.signedUpAt,
      convertedAt: schema.referrals.convertedAt,
    })
      .from(schema.referrals)
      .where(eq(schema.referrals.referrerWineryId, dbUser.wineryId))
      .orderBy(desc(schema.referrals.createdAt))
      .limit(50);
    return rows;
  }),

  /**
   * PUBLIC — someone clicked a referral link. We log the click so the
   * referrer sees "3 clicks pending". No PII required; email is optional
   * and can be captured later via a nudge form on /join.
   */
  trackClick: publicProcedure
    .input(z.object({
      code: z.string().trim().max(16),
      email: z.string().trim().email().optional(),
    }))
    .mutation(async ({ input }) => {
      const referrer = await db.query.wineries.findFirst({
        where: eq(schema.wineries.referralCode, input.code),
      });
      if (!referrer) return { ok: false, reason: "unknown-code" as const };
      const contactName = (referrer as unknown as { contactName: string | null }).contactName ?? null;
      // Dedupe: don't record duplicate pending rows for the same code+email
      // (or same code with null email) within a 5-minute window. When an
      // email arrives later for a previously-anonymous click from this
      // session, we UPDATE the existing null-email row instead of inserting.
      const recentCutoff = Date.now() - 5 * 60_000;
      const existing = await db.select().from(schema.referrals).where(
        and(
          eq(schema.referrals.referralCode, input.code),
          eq(schema.referrals.status, "pending"),
        )
      ).limit(20);

      // If we have an email and there's a recent anonymous row for this code,
      // enrich it rather than creating a duplicate lead.
      if (input.email) {
        const anon = existing.find((r) => r.referredEmail === null && r.createdAt >= recentCutoff);
        if (anon) {
          await db.update(schema.referrals)
            .set({ referredEmail: input.email })
            .where(eq(schema.referrals.id, anon.id));
          return { ok: true as const, referrerName: referrer.name, referrerContact: contactName, enriched: true };
        }
      }

      const dup = existing.find((r) =>
        (r.referredEmail ?? null) === (input.email ?? null) &&
        r.createdAt >= recentCutoff
      );
      if (dup) return { ok: true as const, referrerName: referrer.name, referrerContact: contactName, dedupe: true };
      await db.insert(schema.referrals).values({
        referrerWineryId: referrer.id,
        referralCode: input.code,
        referredEmail: input.email ?? null,
        status: "pending",
        rewardDaysGranted: 0,
        createdAt: Date.now(),
      });
      return { ok: true as const, referrerName: referrer.name, referrerContact: contactName };
    }),

  /**
   * applyToCurrent — post-signup back-attribution. The onboarding wizard
   * reads the ref code from localStorage (set on the visitor's earlier
   * /join?ref=CODE hit), calls this mutation, and it closes the loop:
   *   1. Marks the most recent matching `pending` referral as `converted`
   *   2. Grants +30 trial_credits_days to the referrer (extends their trial
   *      if they're still on it; ignored if they're paid)
   *   3. Returns the referrer's attribution ("Sarah at Redstone Ridge") so
   *      the wizard can render "Great — Sarah just earned 30 free days"
   * Idempotent — a user who already has referred_user_id set is skipped.
   */
  applyToCurrent: protectedProcedure
    .input(z.object({ code: z.string().trim().min(1).max(32) }))
    .mutation(async ({ ctx, input }) => {
      const currentUser = await getUserByOpenId(ctx.user.openId);
      if (!currentUser?.wineryId) return { ok: false as const, reason: "no-current-winery" };

      const referrer = await db.query.wineries.findFirst({
        where: eq(schema.wineries.referralCode, input.code),
      });
      if (!referrer) return { ok: false as const, reason: "unknown-code" };
      if (referrer.id === currentUser.wineryId) return { ok: false as const, reason: "self-referral" };

      const existing = await db.select().from(schema.referrals).where(
        and(
          eq(schema.referrals.referralCode, input.code),
          eq(schema.referrals.status, "pending"),
        )
      ).limit(20);
      // Idempotency — if any row already links to us, bail out.
      if (existing.some((r) => r.referredWineryId === currentUser.wineryId)) {
        return { ok: true as const, alreadyApplied: true };
      }
      // Pick the freshest pending row (best-effort attribution).
      const target = existing.sort((a, b) => b.createdAt - a.createdAt)[0] ?? null;

      const now = Date.now();
      if (target) {
        await db.update(schema.referrals).set({
          status: "converted",
          referredUserId: currentUser.id,
          referredWineryId: currentUser.wineryId,
          convertedAt: now,
          rewardDaysGranted: REWARD_DAYS_ON_CONVERT,
        }).where(eq(schema.referrals.id, target.id));
      } else {
        // No pending click on record (they typed the URL directly) —
        // still count it, just without an anon-lead audit trail.
        await db.insert(schema.referrals).values({
          referrerWineryId: referrer.id,
          referredUserId: currentUser.id,
          referredWineryId: currentUser.wineryId,
          referralCode: input.code,
          status: "converted",
          rewardDaysGranted: REWARD_DAYS_ON_CONVERT,
          createdAt: now,
          convertedAt: now,
        });
      }

      // Grant +30 trial days to the referrer. We top up trial_credits_days
      // and push trial_ends_at forward if they're still on it (no-op if
      // they're already on paid).
      const currentTrialCredits = (referrer as unknown as { trialCreditsDays: number | null }).trialCreditsDays ?? 0;
      const currentTrialEnds = (referrer as unknown as { trialEndsAt: number | null }).trialEndsAt ?? 0;
      const bump = REWARD_DAYS_ON_CONVERT * 24 * 60 * 60 * 1000;
      await db.update(schema.wineries).set({
        trialCreditsDays: currentTrialCredits + REWARD_DAYS_ON_CONVERT,
        // Only bump if trial hasn't already ended — protects paid customers
        trialEndsAt: currentTrialEnds > now ? currentTrialEnds + bump : currentTrialEnds,
      }).where(eq(schema.wineries.id, referrer.id));

      const contactName = (referrer as unknown as { contactName: string | null }).contactName ?? null;
      return {
        ok: true as const,
        referrerName: referrer.name,
        referrerContact: contactName,
        rewardDaysGranted: REWARD_DAYS_ON_CONVERT,
      };
    }),
});
