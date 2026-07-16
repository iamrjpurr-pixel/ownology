/**
 * adminUsers.ts — tRPC router for owner/admin user-management on
 * `/admin/users`. Small surface: list + search + resend-magic-link.
 * Deliberately no role-toggle (managed via ADMIN_EMAILS env instead
 * to avoid two sources of truth). No user-delete (data preservation).
 *
 * Jul 2026: introduced alongside open magic-link signup so Rich has a
 * way to see who's signed up and unblock stuck sign-ins without opening
 * the DB console.
 */
import { z } from "zod";
import { desc, eq, or, like, sql } from "drizzle-orm";
import { router, ownerProcedure } from "../trpc.js";
import { db } from "../db.js";
import * as schema from "../../drizzle/schema.js";
import { issueMagicLink } from "../authRouter.js";

export const adminUsersRouter = router({
  /** List users with optional search — most recently created first.
   *  Joins Winery so the admin can see which winery each user owns.
   *  Capped at 200 rows so the page stays snappy. */
  list: ownerProcedure
    .input(z.object({ search: z.string().max(120).optional() }).default({}))
    .query(async ({ input }) => {
      const search = input.search?.trim();
      const rows = await db
        .select({
          id: schema.users.id,
          email: schema.users.email,
          name: schema.users.name,
          role: schema.users.role,
          openId: schema.users.openId,
          wineryId: schema.users.wineryId,
          createdAt: schema.users.createdAt,
          wineryName: schema.wineries.name,
          winerySlug: schema.wineries.slug,
        })
        .from(schema.users)
        .leftJoin(schema.wineries, eq(schema.wineries.id, schema.users.wineryId))
        .where(search
          ? or(
              like(schema.users.email, `%${search}%`),
              like(schema.users.name, `%${search}%`),
              like(schema.wineries.name, `%${search}%`),
            )
          : undefined)
        .orderBy(desc(schema.users.createdAt))
        .limit(200);
      return { rows };
    }),

  /** Recent magic-link tokens for a single user — lets the admin see
   *  whether a "link didn't arrive" complaint is because we never sent
   *  one, or because they expired / consumed / not-clicked. Last 10. */
  recentLoginTokens: ownerProcedure
    .input(z.object({ email: z.string().email() }))
    .query(async ({ input }) => {
      const email = input.email.trim().toLowerCase();
      const now = Date.now();
      const tokens = await db
        .select({
          id: schema.magicLoginTokens.id,
          createdAt: schema.magicLoginTokens.createdAt,
          expiresAt: schema.magicLoginTokens.expiresAt,
          consumedAt: schema.magicLoginTokens.consumedAt,
          requestIp: schema.magicLoginTokens.requestIp,
        })
        .from(schema.magicLoginTokens)
        .where(eq(schema.magicLoginTokens.email, email))
        .orderBy(desc(schema.magicLoginTokens.createdAt))
        .limit(10);
      // Enrich each with a derived status flag.
      const enriched = tokens.map((t) => ({
        ...t,
        status: t.consumedAt
          ? "consumed" as const
          : t.expiresAt < now
            ? "expired" as const
            : "pending" as const,
      }));
      return { tokens: enriched };
    }),

  /** Owner-only: resend a fresh magic-link to a stuck user, bypassing
   *  the public rate-limit. Uses the same issueMagicLink helper as the
   *  public POST /api/auth/magic-link/request endpoint so behaviour +
   *  email template stay identical. Optional custom subject / intro
   *  copy for account-recovery vs welcome flavours. */
  sendFreshMagicLink: ownerProcedure
    .input(z.object({
      email: z.string().email(),
      subject: z.string().max(120).optional(),
      introHtml: z.string().max(2000).optional(),
    }))
    .mutation(async ({ input }) => {
      const email = input.email.trim().toLowerCase();
      const user = await db.query.users.findFirst({
        where: eq(schema.users.email, email),
      });
      if (!user) throw new Error("No user with that email — sign them up first.");
      const siteUrl = process.env.PUBLIC_SITE_URL || "https://www.ownology.ai";
      const result = await issueMagicLink({
        user: { id: user.id, email: user.email, name: user.name },
        siteUrl,
        requestIp: "admin-resend",
        subject: input.subject,
        introHtml: input.introHtml,
      });
      return { ok: true, sent: result.sent, at: Date.now() };
    }),

  /** Summary strip for the /admin/users header — total users + counts
   *  by role + last 30-day signups. Cheap enough to run on every page
   *  load. */
  stats: ownerProcedure.query(async () => {
    const thirtyDaysAgo = Date.now() - 30 * 24 * 60 * 60 * 1000;
    const [total, admins, recent] = await Promise.all([
      db.select({ n: sql<number>`count(*)` }).from(schema.users),
      db.select({ n: sql<number>`count(*)` }).from(schema.users).where(eq(schema.users.role, "admin")),
      db.select({ n: sql<number>`count(*)` }).from(schema.users).where(sql`created_at >= ${thirtyDaysAgo}`),
    ]);
    return {
      total: Number(total[0]?.n ?? 0),
      admins: Number(admins[0]?.n ?? 0),
      last30d: Number(recent[0]?.n ?? 0),
    };
  }),
});
