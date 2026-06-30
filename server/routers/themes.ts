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

const KNOWN_THEME_IDS = ["soft-cellar", "parchment", "cellar", "auto", "red-crush", "white-crush"] as const;
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

  /** PUBLIC — record a theme-suggestion banner event (acceptance telemetry).
   *  Used by ThemeSuggestion. No PII. Stored in `theme_suggestions` table
   *  (auto-created on boot via CREATE TABLE IF NOT EXISTS). */
  logSuggestion: publicProcedure
    .input(
      z.object({
        suggestedThemeId: z.enum(KNOWN_THEME_IDS),
        sessionId: z.string().min(6).max(64),
        hourLocal: z.number().int().min(0).max(23),
        isHarvestMonth: z.boolean(),
        action: z.enum(["accepted", "dismissed", "opted_out"]),
      })
    )
    .mutation(async ({ input }) => {
      await db.insert(schema.themeSuggestions).values({
        suggestedThemeId: input.suggestedThemeId,
        sessionId: input.sessionId,
        hourLocal: input.hourLocal,
        isHarvestMonth: input.isHarvestMonth,
        action: input.action,
        loggedAt: Date.now(),
      });
      return { ok: true };
    }),

  /** OWNER — acceptance-rate matrix by hour-of-day. */
  suggestionStats: ownerProcedure
    .input(z.object({ days: z.number().int().min(1).max(365).default(30) }).optional())
    .query(async ({ input }) => {
      const days = input?.days ?? 30;
      const sinceMs = Date.now() - days * 24 * 60 * 60 * 1000;
      const rows = await db
        .select({
          hourLocal: schema.themeSuggestions.hourLocal,
          action: schema.themeSuggestions.action,
          suggestedThemeId: schema.themeSuggestions.suggestedThemeId,
          count: sql<number>`COUNT(*)`,
        })
        .from(schema.themeSuggestions)
        .where(gte(schema.themeSuggestions.loggedAt, sinceMs))
        .groupBy(
          schema.themeSuggestions.hourLocal,
          schema.themeSuggestions.action,
          schema.themeSuggestions.suggestedThemeId,
        );

      type HourBucket = {
        hour: number;
        accepted: number;
        dismissed: number;
        opted_out: number;
        total: number;
        acceptRate: number;
        byTheme: Record<string, { accepted: number; total: number }>;
      };
      const grid: HourBucket[] = Array.from({ length: 24 }, (_, h) => ({
        hour: h, accepted: 0, dismissed: 0, opted_out: 0, total: 0, acceptRate: 0, byTheme: {},
      }));
      for (const r of rows) {
        const bucket = grid[r.hourLocal];
        const c = Number(r.count);
        bucket[r.action] += c;
        bucket.total += c;
        const t = bucket.byTheme[r.suggestedThemeId] ?? { accepted: 0, total: 0 };
        if (r.action === "accepted") t.accepted += c;
        t.total += c;
        bucket.byTheme[r.suggestedThemeId] = t;
      }
      for (const b of grid) {
        b.acceptRate = b.total > 0 ? Number(((b.accepted / b.total) * 100).toFixed(1)) : 0;
      }
      const totals = grid.reduce(
        (acc, b) => ({
          accepted: acc.accepted + b.accepted,
          dismissed: acc.dismissed + b.dismissed,
          opted_out: acc.opted_out + b.opted_out,
          total: acc.total + b.total,
        }),
        { accepted: 0, dismissed: 0, opted_out: 0, total: 0 }
      );
      return {
        windowDays: days,
        sinceIso: new Date(sinceMs).toISOString(),
        totals,
        overallAcceptRate:
          totals.total > 0 ? Number(((totals.accepted / totals.total) * 100).toFixed(1)) : 0,
        hours: grid,
      };
    }),
});
