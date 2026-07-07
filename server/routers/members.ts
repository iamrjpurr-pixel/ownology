/**
 * members router — /admin/members command center (Feb 2026).
 *
 * Backs the operator dashboard that unifies gate_invites + activity signals
 * into a single "who's in what stage, and where are they stuck" view. Every
 * mutating endpoint here also writes to admin_actions for a forensic audit
 * trail (see M3 in the progressive-exposure plan).
 *
 * Design notes:
 *   - We treat `gate_invites` as the source of truth for identity, because
 *     trial-tier users don't necessarily have a `users` row yet (they get
 *     one after Google OAuth, which is Stage 3+).
 *   - Progress meter is derived server-side from member_activity rather
 *     than stored — cheap to compute for a small (10s-100s) member base
 *     and always in sync.
 *   - Health signal ("silent 3+ days") is computed from lastUsedAt/last
 *     activity. Trial tier gets a tighter watchdog than member tier.
 */
import { z } from "zod";
import { router, ownerProcedure, publicProcedure } from "../trpc.js";
import { db } from "../db.js";
import * as schema from "../../drizzle/schema.js";
import { eq, desc, sql } from "drizzle-orm";
import { randomBytes } from "crypto";
import { logMemberActivity } from "../memberActivity.js";

// ─── Progress meter pillars ─────────────────────────────────────────────
// One binary per pillar. Ordered so the returned array can be zipped
// directly onto the UI 5-dot visual.
const PROGRESS_PILLARS = [
  "onboarded",       // finished /onboarding wizard
  "first_entry",     // ≥1 vintage_log_entry
  "first_question",  // ≥1 ask_owen_question
  "first_brief",     // ≥1 cellar_brief_open
  "bulk_import",     // ≥1 bulk_import_run
] as const;
type ProgressPillar = typeof PROGRESS_PILLARS[number];

/** Silence thresholds keyed by tier. Trial is tighter because a silent
 *  trial is more valuable to intervene on than a silent member. */
const SILENCE_THRESHOLD_MS: Record<string, number> = {
  trial: 3 * 24 * 60 * 60 * 1000,   // 3 days
  member: 14 * 24 * 60 * 60 * 1000, // 14 days
  gate: 30 * 24 * 60 * 60 * 1000,   // 30 days
};

type HealthSignal = "healthy" | "silent_warn" | "silent_alert" | "expiring_soon" | "expired" | "revoked" | "paused";

interface InviteRow {
  id: number;
  label: string;
  tier: string;
  memberName: string | null;
  wineryName: string | null;
  privateNote: string | null;
  pausedAt: number | null;
  createdAt: number;
  expiresAt: number | null;
  firstUsedAt: number | null;
  lastUsedAt: number | null;
  useCount: number;
  revokedAt: number | null;
  token: string;
}

function healthFor(row: InviteRow, lastActivityAt: number | null): HealthSignal {
  if (row.revokedAt) return "revoked";
  if (row.pausedAt) return "paused";
  const now = Date.now();
  if (row.expiresAt && row.expiresAt < now) return "expired";
  if (row.expiresAt && row.expiresAt - now < 48 * 60 * 60 * 1000) return "expiring_soon";
  const referenceTs = lastActivityAt || row.lastUsedAt || row.createdAt;
  const idleFor = now - referenceTs;
  const threshold = SILENCE_THRESHOLD_MS[row.tier] || SILENCE_THRESHOLD_MS.member;
  if (idleFor > threshold * 2) return "silent_alert";
  if (idleFor > threshold) return "silent_warn";
  return "healthy";
}

/** URL-safe random token for magic-link re-issue. Matches the format used
 *  by the gate router (32 bytes → 43 chars base64url). */
function generateToken(): string {
  return randomBytes(32).toString("base64url");
}

/** Log an operator action to the audit table. Non-throwing — every mutation
 *  wraps its own logic in a Promise.all with this. Never blocks the primary
 *  mutation if the audit insert somehow fails. */
async function logAction(params: {
  actorEmail: string;
  targetInviteId: number | null;
  targetLabel: string | null;
  action: string;
  payload?: Record<string, unknown>;
}): Promise<void> {
  try {
    await db.insert(schema.adminActions).values({
      actorEmail: params.actorEmail,
      targetGateInviteId: params.targetInviteId,
      targetLabel: params.targetLabel,
      action: params.action,
      payload: params.payload ? JSON.stringify(params.payload) : null,
      occurredAt: Date.now(),
    });
  } catch (err) {
    console.warn("[members] audit log insert failed", (err as Error).message);
  }
}

export const membersRouter = router({
  /** LIST — the command center table.
   *  Returns one row per invite with tier, health signal, progress meter,
   *  last-activity timestamp, and attribution. Sorted by health (attention
   *  first) then created_at descending. */
  list: ownerProcedure
    .input(
      z.object({
        tier: z.enum(["all", "gate", "trial", "member"]).default("all"),
        health: z.enum(["all", "attention", "healthy"]).default("all"),
      }).optional()
    )
    .query(async ({ input }) => {
      const invites = await db
        .select()
        .from(schema.gateInvites)
        .orderBy(desc(schema.gateInvites.createdAt))
        .limit(500);

      // Fetch aggregated activity per invite in one round-trip. Uses raw
      // GROUP BY because Drizzle's aggregate helpers are still finicky
      // with the mode:"number" bigint columns.
      const activityRows = await db.execute<{
        gate_invite_id: number;
        last_activity: number;
        onboarded: number;
        first_entry: number;
        first_question: number;
        first_brief: number;
        bulk_import: number;
      }>(sql`
        SELECT
          gate_invite_id,
          MAX(occurred_at) AS last_activity,
          MAX(CASE WHEN kind = 'onboarding_complete' THEN 1 ELSE 0 END) AS onboarded,
          MAX(CASE WHEN kind = 'vintage_log_entry' THEN 1 ELSE 0 END) AS first_entry,
          MAX(CASE WHEN kind = 'ask_owen_question' THEN 1 ELSE 0 END) AS first_question,
          MAX(CASE WHEN kind = 'cellar_brief_open' THEN 1 ELSE 0 END) AS first_brief,
          MAX(CASE WHEN kind = 'bulk_import_run' THEN 1 ELSE 0 END) AS bulk_import
        FROM member_activity
        WHERE gate_invite_id IS NOT NULL
        GROUP BY gate_invite_id
      `);
      const agg = new Map<number, Record<string, number>>();
      const rows = (activityRows as unknown as [Array<Record<string, number>>])[0] || [];
      for (const r of rows) {
        agg.set(r.gate_invite_id, r);
      }

      const decorated = invites.map((inv) => {
        const a = agg.get(inv.id);
        const lastActivityAt = a?.last_activity ?? null;
        const progress: Record<ProgressPillar, boolean> = {
          onboarded: (a?.onboarded ?? 0) > 0,
          first_entry: (a?.first_entry ?? 0) > 0,
          first_question: (a?.first_question ?? 0) > 0,
          first_brief: (a?.first_brief ?? 0) > 0,
          bulk_import: (a?.bulk_import ?? 0) > 0,
        };
        const progressCount = Object.values(progress).filter(Boolean).length;
        const health = healthFor(inv as InviteRow, lastActivityAt);
        return {
          id: inv.id,
          label: inv.label,
          tier: inv.tier,
          memberName: inv.memberName,
          wineryName: inv.wineryName,
          privateNote: inv.privateNote,
          createdAt: inv.createdAt,
          expiresAt: inv.expiresAt,
          firstUsedAt: inv.firstUsedAt,
          lastUsedAt: inv.lastUsedAt,
          useCount: inv.useCount,
          revokedAt: inv.revokedAt,
          pausedAt: inv.pausedAt,
          lastActivityAt,
          progress,
          progressCount,
          health,
        };
      });

      // Filter
      let filtered = decorated;
      if (input?.tier && input.tier !== "all") {
        filtered = filtered.filter((r) => r.tier === input.tier);
      }
      if (input?.health && input.health !== "all") {
        const attn = new Set(["silent_warn", "silent_alert", "expiring_soon", "expired", "paused"]);
        filtered = filtered.filter((r) =>
          input.health === "attention" ? attn.has(r.health) : r.health === "healthy"
        );
      }
      // Sort — attention-worthy first (silent > expiring > paused), then created desc
      const attentionRank: Record<HealthSignal, number> = {
        silent_alert: 0, silent_warn: 1, expiring_soon: 2, paused: 3,
        expired: 4, revoked: 5, healthy: 6,
      };
      filtered.sort((a, b) => {
        const rDelta = attentionRank[a.health] - attentionRank[b.health];
        return rDelta !== 0 ? rDelta : b.createdAt - a.createdAt;
      });

      return { members: filtered, total: filtered.length };
    }),

  /** DETAIL — full row + activity timeline for one invite. */
  detail: ownerProcedure
    .input(z.object({ id: z.number().int() }))
    .query(async ({ input }) => {
      const [invite] = await db
        .select()
        .from(schema.gateInvites)
        .where(eq(schema.gateInvites.id, input.id))
        .limit(1);
      if (!invite) throw new Error("Member not found");

      const activity = await db
        .select()
        .from(schema.memberActivity)
        .where(eq(schema.memberActivity.gateInviteId, input.id))
        .orderBy(desc(schema.memberActivity.occurredAt))
        .limit(200);

      const audit = await db
        .select()
        .from(schema.adminActions)
        .where(eq(schema.adminActions.targetGateInviteId, input.id))
        .orderBy(desc(schema.adminActions.occurredAt))
        .limit(50);

      return { invite, activity, audit };
    }),

  /** ISSUE — create a new invite at a specific tier. Replaces the raw
   *  gate.create endpoint for tier-aware minting. */
  issue: ownerProcedure
    .input(z.object({
      tier: z.enum(["gate", "trial", "member"]),
      label: z.string().trim().min(1).max(120),
      memberName: z.string().trim().max(120).optional(),
      wineryName: z.string().trim().max(120).optional(),
      expiresInDays: z.number().int().positive().max(365).nullable().optional(),
      privateNote: z.string().max(2000).optional(),
    }))
    .mutation(async ({ ctx, input }) => {
      const token = generateToken();
      const now = Date.now();
      // Default expiry by tier if not specified: trial=14d, member=null, gate=null.
      const defaultExpiryDays = input.expiresInDays ?? (input.tier === "trial" ? 14 : null);
      const expiresAt = defaultExpiryDays ? now + defaultExpiryDays * 24 * 60 * 60 * 1000 : null;

      const [result] = await db.insert(schema.gateInvites).values({
        token,
        label: input.label,
        tier: input.tier,
        memberName: input.memberName || null,
        wineryName: input.wineryName || null,
        privateNote: input.privateNote || null,
        createdAt: now,
        expiresAt,
        useCount: 0,
      });
      const id = (result as { insertId: number }).insertId;

      await logAction({
        actorEmail: ctx.user.email || ctx.user.openId,
        targetInviteId: id,
        targetLabel: input.label,
        action: "issue",
        payload: { tier: input.tier, expiresInDays: defaultExpiryDays },
      });

      return { id, token, tier: input.tier, expiresAt };
    }),

  /** RE-ISSUE MAGIC LINK — mint a new token, keeping tier + metadata.
   *  The old token is immediately invalidated (its DB row is soft-revoked;
   *  a fresh row is created). This is the "email lost / expired" flow. */
  reissueLink: ownerProcedure
    .input(z.object({ id: z.number().int() }))
    .mutation(async ({ ctx, input }) => {
      const [old] = await db
        .select().from(schema.gateInvites)
        .where(eq(schema.gateInvites.id, input.id)).limit(1);
      if (!old) throw new Error("Member not found");

      const token = generateToken();
      const now = Date.now();
      const [result] = await db.insert(schema.gateInvites).values({
        token,
        label: old.label,
        tier: old.tier,
        memberName: old.memberName,
        wineryName: old.wineryName,
        privateNote: old.privateNote,
        createdAt: now,
        expiresAt: old.expiresAt,   // preserve original expiry, not extended
        useCount: 0,
      });
      const newId = (result as { insertId: number }).insertId;

      // Revoke the old row so any lingering cookies stop working.
      await db.update(schema.gateInvites)
        .set({ revokedAt: now })
        .where(eq(schema.gateInvites.id, input.id));

      await logAction({
        actorEmail: ctx.user.email || ctx.user.openId,
        targetInviteId: newId,
        targetLabel: old.label,
        action: "reissue_link",
        payload: { previousInviteId: input.id, previousToken: old.token.slice(0, 6) + "…" },
      });
      return { id: newId, token };
    }),

  /** EXTEND TRIAL — bump expires_at forward by N days. Idempotent: if the
   *  invite has no expiry, this becomes a first-set. */
  extendTrial: ownerProcedure
    .input(z.object({ id: z.number().int(), days: z.number().int().min(1).max(90) }))
    .mutation(async ({ ctx, input }) => {
      const [inv] = await db.select().from(schema.gateInvites)
        .where(eq(schema.gateInvites.id, input.id)).limit(1);
      if (!inv) throw new Error("Member not found");
      const now = Date.now();
      const currentExpiry = inv.expiresAt && inv.expiresAt > now ? inv.expiresAt : now;
      const newExpiry = currentExpiry + input.days * 24 * 60 * 60 * 1000;
      await db.update(schema.gateInvites)
        .set({ expiresAt: newExpiry })
        .where(eq(schema.gateInvites.id, input.id));
      await logAction({
        actorEmail: ctx.user.email || ctx.user.openId,
        targetInviteId: input.id,
        targetLabel: inv.label,
        action: "extend_trial",
        payload: { days: input.days, from: inv.expiresAt, to: newExpiry },
      });
      return { ok: true, expiresAt: newExpiry };
    }),

  /** ADVANCE TIER — operator override to promote/demote. Common uses:
   *   - VIP prospect: skip trial, jump straight to member
   *   - Comp'd member: promote a trial without payment (log the reason)
   *   - Demoted: kick a churned member back to trial before revoke */
  advanceTier: ownerProcedure
    .input(z.object({
      id: z.number().int(),
      tier: z.enum(["gate", "trial", "member"]),
      reason: z.string().max(500).optional(),
    }))
    .mutation(async ({ ctx, input }) => {
      const [inv] = await db.select().from(schema.gateInvites)
        .where(eq(schema.gateInvites.id, input.id)).limit(1);
      if (!inv) throw new Error("Member not found");
      const from = inv.tier;
      await db.update(schema.gateInvites)
        .set({ tier: input.tier })
        .where(eq(schema.gateInvites.id, input.id));
      // If we're promoting from trial → member, clear the expiry.
      if (input.tier === "member" && from === "trial") {
        await db.update(schema.gateInvites)
          .set({ expiresAt: null })
          .where(eq(schema.gateInvites.id, input.id));
      }
      await logAction({
        actorEmail: ctx.user.email || ctx.user.openId,
        targetInviteId: input.id,
        targetLabel: inv.label,
        action: "advance_tier",
        payload: { from, to: input.tier, reason: input.reason },
      });
      return { ok: true, tier: input.tier };
    }),

  /** PAUSE / RESUME — soft-freeze without deleting. */
  pause: ownerProcedure
    .input(z.object({ id: z.number().int(), reason: z.string().max(500).optional() }))
    .mutation(async ({ ctx, input }) => {
      const [inv] = await db.select().from(schema.gateInvites)
        .where(eq(schema.gateInvites.id, input.id)).limit(1);
      if (!inv) throw new Error("Member not found");
      await db.update(schema.gateInvites)
        .set({ pausedAt: Date.now() })
        .where(eq(schema.gateInvites.id, input.id));
      await logAction({
        actorEmail: ctx.user.email || ctx.user.openId,
        targetInviteId: input.id, targetLabel: inv.label,
        action: "pause",
        payload: { reason: input.reason },
      });
      return { ok: true };
    }),
  resume: ownerProcedure
    .input(z.object({ id: z.number().int() }))
    .mutation(async ({ ctx, input }) => {
      const [inv] = await db.select().from(schema.gateInvites)
        .where(eq(schema.gateInvites.id, input.id)).limit(1);
      if (!inv) throw new Error("Member not found");
      await db.update(schema.gateInvites)
        .set({ pausedAt: null })
        .where(eq(schema.gateInvites.id, input.id));
      await logAction({
        actorEmail: ctx.user.email || ctx.user.openId,
        targetInviteId: input.id, targetLabel: inv.label,
        action: "resume",
      });
      return { ok: true };
    }),

  /** REVOKE — kill the cookie. Reversible via gate.unrevoke, though the
   *  member will need a fresh magic link.  */
  revoke: ownerProcedure
    .input(z.object({ id: z.number().int(), reason: z.string().max(500).optional() }))
    .mutation(async ({ ctx, input }) => {
      const [inv] = await db.select().from(schema.gateInvites)
        .where(eq(schema.gateInvites.id, input.id)).limit(1);
      if (!inv) throw new Error("Member not found");
      await db.update(schema.gateInvites)
        .set({ revokedAt: Date.now() })
        .where(eq(schema.gateInvites.id, input.id));
      await logAction({
        actorEmail: ctx.user.email || ctx.user.openId,
        targetInviteId: input.id, targetLabel: inv.label,
        action: "revoke",
        payload: { reason: input.reason },
      });
      return { ok: true };
    }),

  /** UPDATE NOTE — Rich's private cellar-notes on the winemaker. */
  updateNote: ownerProcedure
    .input(z.object({ id: z.number().int(), note: z.string().max(2000) }))
    .mutation(async ({ ctx, input }) => {
      const [inv] = await db.select().from(schema.gateInvites)
        .where(eq(schema.gateInvites.id, input.id)).limit(1);
      if (!inv) throw new Error("Member not found");
      await db.update(schema.gateInvites)
        .set({ privateNote: input.note || null })
        .where(eq(schema.gateInvites.id, input.id));
      await logAction({
        actorEmail: ctx.user.email || ctx.user.openId,
        targetInviteId: input.id, targetLabel: inv.label,
        action: "update_note",
      });
      return { ok: true };
    }),

  /** SUMMARY TILES — top-of-page counters + recent transitions.
   *  Cheap enough to compute inline; if this grows we cache 60s. */
  summary: ownerProcedure.query(async () => {
    const now = Date.now();
    const invites = await db.select().from(schema.gateInvites);
    const trials = invites.filter((i) => i.tier === "trial" && !i.revokedAt && !i.pausedAt).length;
    const members = invites.filter((i) => i.tier === "member" && !i.revokedAt && !i.pausedAt).length;
    // Silent-3d trials — count using invite lastUsedAt only (activity join
    // would be nicer but we're keeping the endpoint fast).
    const silentTrials = invites.filter((i) => {
      if (i.tier !== "trial" || i.revokedAt || i.pausedAt) return false;
      const ref = i.lastUsedAt || i.createdAt;
      return now - ref > SILENCE_THRESHOLD_MS.trial;
    }).length;

    // 30-day conversion count: invites that flipped trial→member in the
    // last 30 days per admin_actions log.
    const cutoff = now - 30 * 24 * 60 * 60 * 1000;
    const conversionRows = await db.execute<{ n: number }>(sql`
      SELECT COUNT(*) AS n FROM admin_actions
      WHERE action = 'advance_tier'
        AND occurred_at >= ${cutoff}
        AND payload LIKE '%"to":"member"%'
    `);
    const rows = (conversionRows as unknown as [Array<{ n: number }>])[0] || [];
    const conversions30d = rows[0]?.n || 0;

    return { trials, members, silentTrials, conversions30d };
  }),

  // ─── Public signal beacons (client-side calls) ──────────────────────
  // These write activity rows for events the server doesn't see directly.
  // Deliberately publicProcedure — trial-tier users often don't have a
  // Google session yet, but they DO carry the gate cookie which the
  // logMemberActivity helper reads via verifyGateCookieDetailed().

  /** Client signal: user finished the /onboarding wizard. */
  signalOnboardingComplete: publicProcedure
    .input(z.object({
      useCases: z.array(z.string()).max(10).optional(),
      wineryName: z.string().max(200).optional(),
    }))
    .mutation(async ({ input, ctx }) => {
      await logMemberActivity({
        req: ctx.req,
        kind: "onboarding_complete",
        details: {
          useCases: input.useCases ?? [],
          wineryName: input.wineryName,
        },
      });
      return { ok: true };
    }),

  /** Client signal: user opened their Cellar Brief. Fires on mount, not
   *  scroll — a rendered brief is the meaningful action. */
  signalCellarBriefOpen: publicProcedure
    .input(z.object({ briefDate: z.string().max(20).optional() }))
    .mutation(async ({ input, ctx }) => {
      await logMemberActivity({
        req: ctx.req,
        kind: "cellar_brief_open",
        details: { briefDate: input.briefDate },
      });
      return { ok: true };
    }),
});
