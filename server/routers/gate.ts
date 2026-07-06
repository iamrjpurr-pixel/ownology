/**
 * gate router — admin management of magic-link invites (Feb 2026).
 *
 * Rich creates one invite row per beta tester at /admin/gate-invites. The
 * generated URL /i/<token> replaces sharing the OWNOLOGY_GATE_PASSWORD
 * directly — with three advantages:
 *   1. Individual revoke (kill one tester's access without rotating the
 *      shared password for everyone else).
 *   2. Usage visibility (see first_used_at + last_used_at + use_count
 *      per tester).
 *   3. Optional expiry (auto-invalidate after N days).
 *
 * Under the hood the invite still sets an `ow_gate` cookie — but the JWT
 * payload is `{ gate: "invite", id: <inviteId> }` instead of the old
 * `{ gate: "ok" }`. verifyGateCookie in server/gate.ts checks the DB row
 * on every request for revocation state.
 */
import { z } from "zod";
import { router, ownerProcedure } from "../trpc.js";
import { db } from "../db.js";
import * as schema from "../../drizzle/schema.js";
import { eq, desc } from "drizzle-orm";
import { randomBytes } from "crypto";

// URL-safe random token, base64url (no /, +, =). 32 bytes = 43 chars
// after base64url encoding — plenty of entropy, well under our 48-char
// column limit. Length also serves as a rate-limit signal (bogus /i/xxx
// requests get 400'd before touching the DB).
function generateToken(): string {
  return randomBytes(32).toString("base64url");
}

export const gateRouter = router({
  /** OWNER — list all invites (active + revoked), newest first. */
  list: ownerProcedure.query(async () => {
    const rows = await db
      .select()
      .from(schema.gateInvites)
      .orderBy(desc(schema.gateInvites.createdAt));
    return rows;
  }),

  /** OWNER — create a new invite. Returns the fully-formed /i/<token> URL
   *  ready to paste into an SMS/email. Default: never expires (Rich revokes
   *  manually when the tester's done). */
  create: ownerProcedure
    .input(
      z.object({
        label: z.string().trim().min(1).max(120),
        expiresInDays: z.number().int().positive().max(365).nullable().optional(),
      })
    )
    .mutation(async ({ input }) => {
      const token = generateToken();
      const now = Date.now();
      const expiresAt = input.expiresInDays
        ? now + input.expiresInDays * 24 * 60 * 60 * 1000
        : null;
      const [result] = await db.insert(schema.gateInvites).values({
        token,
        label: input.label,
        createdAt: now,
        expiresAt,
        useCount: 0,
      });
      const id = (result as { insertId: number }).insertId;
      return { id, token, label: input.label, expiresAt };
    }),

  /** OWNER — revoke an invite (soft-delete via revoked_at timestamp).
   *  Effect is immediate: verifyGateCookie sees revoked_at != null on the
   *  next request and returns false. */
  revoke: ownerProcedure
    .input(z.object({ id: z.number().int() }))
    .mutation(async ({ input }) => {
      await db
        .update(schema.gateInvites)
        .set({ revokedAt: Date.now() })
        .where(eq(schema.gateInvites.id, input.id));
      return { ok: true };
    }),

  /** OWNER — un-revoke (in case of accidental click). */
  unrevoke: ownerProcedure
    .input(z.object({ id: z.number().int() }))
    .mutation(async ({ input }) => {
      await db
        .update(schema.gateInvites)
        .set({ revokedAt: null })
        .where(eq(schema.gateInvites.id, input.id));
      return { ok: true };
    }),
});
