/**
 * themes router — anonymous telemetry for theme selections.
 *
 * Public `logPick` — called by the frontend when a visitor picks/changes
 * their theme. No PII, no auth — just (theme_id, session_id, is_first_pick).
 *
 * Admin `stats` — total picks per theme + first-time vs. switched split,
 * with last-N-days windowing. Powers /admin/themes-stats.
 */
import { z } from "zod";
import { sql, gte } from "drizzle-orm";
import { router, publicProcedure, ownerProcedure } from "../trpc.js";
import { db } from "../db.js";
import * as schema from "../../drizzle/schema.js";

const KNOWN_THEME_IDS = ["soft-cellar", "parchment", "cellar", "auto", "concrete-tank"] as const;
type KnownThemeId = (typeof KNOWN_THEME_IDS)[number];

export const themesRouter = router({
  /** PUBLIC — log a theme pick. Called from ThemeOnboarding + ThemeToggle. */
  logPick: publicProcedure
    .input(
      z.object({
        themeId: z.enum(KNOWN_THEME_IDS),
        sessionId: z.string().min(6).max(64),
        isFirstPick: z.boolean(),
      })
    )
    .mutation(async ({ input }) => {
      await db.insert(schema.themePicks).values({
        themeId: input.themeId,
        sessionId: input.sessionId,
        isFirstPick: input.isFirstPick ? 1 : 0,
        pickedAt: Date.now(),
      });
      return { ok: true };
    }),

  /** OWNER — count picks per theme over the last N days, split by
   *  first-pick (new user) vs. switch (already had a theme). */
  stats: ownerProcedure
    .input(z.object({ days: z.number().int().min(1).max(365).default(30) }).optional())
    .query(async ({ input }) => {
      const days = input?.days ?? 30;
      const sinceMs = Date.now() - days * 24 * 60 * 60 * 1000;
      const rows = await db
        .select({
          themeId: schema.themePicks.themeId,
          isFirstPick: schema.themePicks.isFirstPick,
          count: sql<number>`COUNT(*)`,
        })
        .from(schema.themePicks)
        .where(gte(schema.themePicks.pickedAt, sinceMs))
        .groupBy(schema.themePicks.themeId, schema.themePicks.isFirstPick);

      // Pivot into one row per theme with first / switch / total
      const map = new Map<string, { first: number; switched: number }>();
      for (const r of rows) {
        const entry = map.get(r.themeId) ?? { first: 0, switched: 0 };
        if (r.isFirstPick) entry.first += Number(r.count);
        else entry.switched += Number(r.count);
        map.set(r.themeId, entry);
      }
      // Total uniqueSessions for "% of users currently on each theme" — use the
      // LAST pick per session (latest wins). Done in a separate query so the
      // grouping logic above stays clean.
      const latest = await db
        .select({
          themeId: schema.themePicks.themeId,
          sessionId: schema.themePicks.sessionId,
          pickedAt: schema.themePicks.pickedAt,
        })
        .from(schema.themePicks)
        .where(gte(schema.themePicks.pickedAt, sinceMs));
      const latestBySession = new Map<string, { themeId: string; pickedAt: number }>();
      for (const r of latest) {
        const cur = latestBySession.get(r.sessionId);
        if (!cur || Number(r.pickedAt) > cur.pickedAt) {
          latestBySession.set(r.sessionId, { themeId: r.themeId, pickedAt: Number(r.pickedAt) });
        }
      }
      const currentByTheme = new Map<string, number>();
      for (const v of latestBySession.values()) {
        currentByTheme.set(v.themeId, (currentByTheme.get(v.themeId) ?? 0) + 1);
      }
      const totalSessions = latestBySession.size;

      const result = KNOWN_THEME_IDS.map((id) => {
        const m = map.get(id) ?? { first: 0, switched: 0 };
        const current = currentByTheme.get(id) ?? 0;
        return {
          themeId: id,
          firstPicks: m.first,
          switchedTo: m.switched,
          totalPicks: m.first + m.switched,
          currentlyUsing: current,
          currentSharePct:
            totalSessions > 0
              ? Number(((current / totalSessions) * 100).toFixed(1))
              : 0,
        };
      });
      return {
        windowDays: days,
        sinceIso: new Date(sinceMs).toISOString(),
        totalSessions,
        totalPicks: result.reduce((s, r) => s + r.totalPicks, 0),
        themes: result,
      };
    }),
});
