/**
 * memberActivity — server-side event writer (Feb 2026, M1).
 *
 * Central point for logging user-visible actions to `member_activity`. All
 * callers pass an Express request (or tRPC ctx.req) so we can capture the
 * IP + user-agent + gate-invite id from the cookie in one place.
 *
 * Deliberately fire-and-forget: writes are non-blocking (we don't `await`
 * from the caller's happy path in most cases) so a DB blip never breaks
 * the primary flow. The write itself is `try/catch` internally so failures
 * only warn to the log.
 */
import type express from "express";
import { db } from "./db.js";
import * as schema from "../drizzle/schema.js";
import { eq } from "drizzle-orm";
import { verifyGateCookieDetailed } from "./gate.js";
import { clientIpOf } from "./gate.js";

/** Coarse taxonomy — matches the progress-meter pillars + operational
 *  events. Add new kinds as we instrument new surfaces. */
export type ActivityKind =
  | "onboarding_step"
  | "onboarding_complete"
  | "vintage_log_entry"
  | "ask_owen_question"
  | "cellar_brief_open"
  | "bulk_import_run"
  | "import_run"
  | "tier_change"
  | "magic_link_redeem"
  | "magic_link_reissue"
  | "admin_impersonate_start"
  | "admin_impersonate_end";

interface LogActivityParams {
  req?: express.Request;
  kind: ActivityKind;
  userId?: number | null;
  gateInviteId?: number | null;
  details?: Record<string, unknown>;
}

/** Best-effort activity log. Never throws. Callers should NOT await unless
 *  they specifically need ordering guarantees with a follow-up query. */
export async function logMemberActivity(params: LogActivityParams): Promise<void> {
  try {
    let inviteId: number | null = params.gateInviteId ?? null;
    let ip: string | null = null;
    let userAgent: string | null = null;
    if (params.req) {
      ip = clientIpOf(params.req);
      const ua = params.req.headers["user-agent"];
      userAgent = typeof ua === "string" ? ua.slice(0, 300) : null;
      // Only derive inviteId from cookie if caller didn't set it explicitly.
      if (inviteId === null) {
        const detail = await verifyGateCookieDetailed(params.req);
        inviteId = detail?.inviteId ?? null;
      }
    }
    const now = Date.now();
    await db.insert(schema.memberActivity).values({
      gateInviteId: inviteId,
      userId: params.userId ?? null,
      kind: params.kind,
      details: params.details ? JSON.stringify(params.details) : null,
      deviceFp: null,
      ip,
      userAgent,
      occurredAt: now,
    });
    // Also refresh the invite's lastUsedAt so the command-center table
    // reflects the freshest signal without needing a join in the fast path.
    if (inviteId !== null) {
      try {
        await db.update(schema.gateInvites)
          .set({ lastUsedAt: now })
          .where(eq(schema.gateInvites.id, inviteId));
      } catch { /* non-critical */ }
    }
  } catch (err) {
    console.warn("[memberActivity] log failed:", (err as Error).message);
  }
}
