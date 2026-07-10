/**
 * Onboarding router — thin surface for /guide progressive-reveal telemetry.
 * Feb 2026, Rich: /guide has ~6 reveal cards + a getting-started checklist.
 * Client-side state persists in localStorage so returning visitors see
 * where they left off — but that gave admin ZERO visibility of who's
 * actually progressing. This closes that loop.
 *
 * The client fires one `logStep` per reveal-click and per checklist-tick.
 * Server writes to `member_activity` (kind = "onboarding_step") tagged
 * with the specific step id, so /admin/members can compute a per-user
 * progress score from the same table that already surfaces logins etc.
 *
 * `stepId` is a free-form string (e.g. "workflow-map", "role-paths",
 * "checklist:add-first-batch") so we can add new milestones without a
 * schema change. Kept short + slugged, capped at 80 chars.
 */
import { z } from "zod";
import { router, publicProcedure, protectedProcedure } from "../trpc.js";
import { logMemberActivity } from "../memberActivity.js";
import { getUserByOpenId, listVintageLogEntries, listWineBatches, getUsedTankNames } from "../db.js";

/**
 * Onboarding router — thin surface for /guide progressive-reveal telemetry
 * AND the /roadmap conditional-flow gates.
 *
 * `roadmapStatus` returns booleans + counts for each prerequisite gate so
 * the client can reveal downstream detail (e.g. The Press deep view) only
 * once the operator has entered enough real data for that detail to be
 * meaningful. See /roadmap for the visualisation and per-gate CTAs.
 */
export const onboardingRouter = router({
  /**
   * logStep — record one progression event on the current gate invite.
   * publicProcedure because /guide is available to any authed visitor
   * regardless of tier. Server derives inviteId from cookie automatically.
   */
  logStep: publicProcedure
    .input(
      z.object({
        stepId: z.string().min(1).max(80),
        // "reveal" = user opened a collapsed section; "checklist" = user
        // ticked a getting-started item; "complete" = all checklist done.
        kind: z.enum(["reveal", "checklist", "complete"]).default("reveal"),
      })
    )
    .mutation(async ({ ctx, input }) => {
      await logMemberActivity({
        req: ctx.req,
        kind: input.kind === "complete" ? "onboarding_complete" : "onboarding_step",
        details: { stepId: input.stepId, source: input.kind },
      });
      return { ok: true };
    }),

  /**
   * roadmapStatus — computes prerequisite gate booleans from the user's
   * live vintage_log data. Used by /roadmap to reveal downstream detail
   * only when the operator has entered qualifying data.
   *
   * Gates (spine):
   *   1. registered       — user account exists (always true if authed)
   *   2. hasTanks         — at least one tank name observed in the log
   *   3. hasBatch         — at least one wine_batch row (variety + tank)
   *   4. hasMeasurement   — at least one measurement event (Brix/temp/pH)
   *   5. hasFermentation  — at least one inoculation OR post-inoculation
   *                          measurement showing Brix drop (proxy: >=3 measurements)
   *   6. hasRacking       — at least one racking event (ferment finished)
   *   7. hasBottling      — at least one bottling_run event
   *
   * Later gates gate The Press detail reveal: architecture card visible
   * always; per-batch debrief detail hidden until hasRacking OR hasBottling.
   */
  roadmapStatus: protectedProcedure.query(async ({ ctx }) => {
    const dbUser = await getUserByOpenId(ctx.user.openId);
    if (!dbUser) {
      return {
        registered: false,
        hasTanks: false,
        hasBatch: false,
        hasMeasurement: false,
        hasFermentation: false,
        hasRacking: false,
        hasBottling: false,
        counts: { tanks: 0, batches: 0, entries: 0, measurements: 0, rackings: 0, bottlings: 0 },
      };
    }
    const wineryId = dbUser.wineryId ?? null;
    const [tanks, batches, entries] = await Promise.all([
      getUsedTankNames(dbUser.id, wineryId),
      listWineBatches(dbUser.id, wineryId),
      listVintageLogEntries(dbUser.id, 800, wineryId),
    ]);

    const measurements = entries.filter((e) => e.eventType === "measurement");
    const inoculations = entries.filter((e) => e.eventType === "inoculation");
    const rackings = entries.filter((e) => e.eventType === "racking");
    const bottlings = entries.filter((e) => e.eventType === "bottling_run");

    return {
      registered: true,
      hasTanks: tanks.length > 0,
      hasBatch: batches.length > 0,
      hasMeasurement: measurements.length > 0,
      // Fermentation proxy: any inoculation event OR >=3 measurements
      // (a live ferment usually accumulates Brix readings quickly).
      hasFermentation: inoculations.length > 0 || measurements.length >= 3,
      hasRacking: rackings.length > 0,
      hasBottling: bottlings.length > 0,
      counts: {
        tanks: tanks.length,
        batches: batches.length,
        entries: entries.length,
        measurements: measurements.length,
        rackings: rackings.length,
        bottlings: bottlings.length,
      },
    };
  }),
});
