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
import { router, publicProcedure } from "../trpc.js";
import { logMemberActivity } from "../memberActivity.js";

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
});
