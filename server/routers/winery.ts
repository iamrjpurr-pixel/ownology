/**
 * winery.ts — per-winery settings for the current signed-in user.
 *
 * Multi-tenant Phase 2 (Feb 2026) wired `winery_id` isolation across all
 * customer-domain tables. This router exposes the editable surface for the
 * tenant container itself: rename it (auto-provisioned names like
 * "Sarah's Winery" are not what real wineries want to see), pick a region,
 * set a brand colour for exports.
 *
 * Authorisation: every member of a winery can READ it; only the
 * `owner_user_id` (the auto-provisioning sign-up) can WRITE. When team-
 * member support ships, this is where role-based gating will live.
 */
import { z } from "zod";
import { TRPCError } from "@trpc/server";
import { router, protectedProcedure } from "../trpc.js";
import { db, getUserByOpenId } from "../db.js";
import * as schema from "../../drizzle/schema.js";
import { eq } from "drizzle-orm";

const PLAN_VALUES = ["free", "press", "amphora", "coopers", "founding_member"] as const;

const wineryRouter = router({
  /**
   * Return the current user's winery row, or null if they have not yet been
   * provisioned (shouldn't happen post-Phase 2 bootstrap, but the UI
   * handles the null case gracefully).
   */
  current: protectedProcedure.query(async ({ ctx }) => {
    const dbUser = await getUserByOpenId(ctx.user.openId);
    if (!dbUser?.wineryId) return null;
    const w = await db.query.wineries.findFirst({
      where: eq(schema.wineries.id, dbUser.wineryId),
    });
    if (!w) return null;
    return {
      id: w.id,
      name: w.name,
      slug: w.slug,
      plan: w.plan,
      region: w.region ?? null,
      brandColor: w.brandColor ?? null,
      logoUrl: w.logoUrl ?? null,
      publicAuditEnabled: !!w.publicAuditEnabled,
      isOwner: w.ownerUserId === dbUser.id,
    };
  }),

  /**
   * Update editable fields on the current user's winery. Restricted to the
   * row's `owner_user_id` so non-owner team members (when that ships)
   * cannot rename the winery out from under the owner.
   *
   * Only fields that are explicitly provided are written — undefined fields
   * are left alone. Empty-string region/brandColor clears the field.
   */
  update: protectedProcedure
    .input(z.object({
      name: z.string().trim().min(1).max(255).optional(),
      region: z.string().trim().max(128).nullable().optional(),
      brandColor: z.string().trim().max(16).nullable().optional(),
      logoUrl: z.string().trim().max(512).nullable().optional(),
      publicAuditEnabled: z.boolean().optional(),
    }))
    .mutation(async ({ ctx, input }) => {
      const dbUser = await getUserByOpenId(ctx.user.openId);
      if (!dbUser?.wineryId) {
        throw new TRPCError({ code: "FORBIDDEN", message: "No winery membership" });
      }
      const w = await db.query.wineries.findFirst({
        where: eq(schema.wineries.id, dbUser.wineryId),
      });
      if (!w) throw new TRPCError({ code: "NOT_FOUND", message: "Winery not found" });
      if (w.ownerUserId !== dbUser.id) {
        throw new TRPCError({ code: "FORBIDDEN", message: "Only the winery owner can edit these details" });
      }
      // Sanitise brandColor — accept #RGB / #RRGGBB only. Reject anything
      // else to keep the value safe for inline CSS in exports.
      if (input.brandColor && input.brandColor.length > 0) {
        const hex = input.brandColor.toLowerCase();
        if (!/^#([0-9a-f]{3}|[0-9a-f]{6})$/.test(hex)) {
          throw new TRPCError({
            code: "BAD_REQUEST",
            message: "brandColor must be a hex colour like #b45309 or #c63",
          });
        }
      }
      // Sanitise logoUrl — must be https://… so we never embed http leaks
      // or javascript: URIs into a regulator-bound PDF export. Empty
      // string clears the value (handled below).
      if (input.logoUrl && input.logoUrl.length > 0) {
        if (!/^https:\/\/[^\s]{4,}$/i.test(input.logoUrl)) {
          throw new TRPCError({
            code: "BAD_REQUEST",
            message: "logoUrl must be a fully-qualified https:// URL",
          });
        }
      }
      const patch: Partial<{ name: string; region: string | null; brandColor: string | null; logoUrl: string | null; publicAuditEnabled: boolean }> = {};
      if (input.name !== undefined) patch.name = input.name;
      if (input.region !== undefined) patch.region = input.region === "" ? null : input.region;
      if (input.brandColor !== undefined) patch.brandColor = input.brandColor === "" ? null : input.brandColor;
      if (input.logoUrl !== undefined) patch.logoUrl = input.logoUrl === "" ? null : input.logoUrl;
      if (input.publicAuditEnabled !== undefined) patch.publicAuditEnabled = input.publicAuditEnabled;
      if (Object.keys(patch).length === 0) {
        return { ok: true, unchanged: true };
      }
      await db.update(schema.wineries).set(patch).where(eq(schema.wineries.id, w.id));
      return { ok: true, unchanged: false };
    }),
});

// Keep PLAN_VALUES referenced so future enhancements (paid-tier gating on
// brand colour, etc.) have it as a stable constant rather than a magic list.
void PLAN_VALUES;

export { wineryRouter };
