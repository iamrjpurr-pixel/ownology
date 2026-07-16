/**
 * weeklyDigestEnrichments — supplementary data feeds for the Monday
 * Cellar Digest. Adds three sections on top of the existing vessel
 * summary from `generateCellarBrief`:
 *
 *  1. tasks       — cellar_tasks rollup: completed / new / overdue /
 *                   due-next-week for the last 7 days.
 *  2. tempOutliers — dates when Open-Meteo readings breached the
 *                   winery's weather_thresholds_json thresholds.
 *  3. pipeline    — outreach movement: contacts created / first-viewed /
 *                   replied / demo-booked in the last 7 days, plus the
 *                   3 most-engaged (by view count).
 *
 * All windows are Australia/Sydney-aligned to match the winemaker's day.
 * Failures in any single section return an empty section (never throw)
 * so the digest still renders when one data source is offline.
 *
 * Jul 2026 — Rich asked for "cellar tasks, temperature outliers, pipeline
 * moves so founding members feel a heartbeat every seven days".
 */

import { and, desc, eq, gte, isNotNull, isNull, lte, sql } from "drizzle-orm";
import { db } from "./db.js";
import * as schema from "../drizzle/schema.js";

export type TaskRollup = {
  completedThisWeek: number;
  newThisWeek: number;
  overdue: number;
  dueNextWeek: number;
  /** Up to 5 most-recent completions, newest first. */
  recentCompletions: Array<{
    id: number;
    title: string;
    equipmentName: string;
    completedAt: number;
    completedBy: string | null;
  }>;
};

export type TempOutlier = {
  /** ISO date (YYYY-MM-DD) in Australia/Sydney. */
  date: string;
  /** Human day label (Mon 08 Jul). */
  dayLabel: string;
  kind: "humidity_high" | "humidity_low" | "temp_high" | "temp_low";
  actual: number;
  threshold: number;
  /** Short one-liner ready for email display. */
  label: string;
};

export type PipelineRollup = {
  newContacts: number;
  firstViews: number;
  replies: number;
  demosBooked: number;
  /** Up to 3 most-engaged this week, by view count. */
  topEngaged: Array<{
    slug: string;
    name: string;
    winery: string | null;
    viewCount: number;
  }>;
};

export type WeeklyDigestEnrichments = {
  weekStartIso: string;
  weekEndIso: string;
  tasks: TaskRollup;
  tempOutliers: TempOutlier[];
  pipeline: PipelineRollup;
};

const WEEK_MS = 7 * 24 * 60 * 60 * 1000;
const DAY_MS = 24 * 60 * 60 * 1000;

/** Sydney midnight for "N days ago" — used to align all rollups to the
 *  winemaker's working day, not UTC. */
function sydneyDayStart(offsetDays: number): number {
  // Get "now" in Sydney by rendering it, then read back the local date.
  const nowSydney = new Date(new Date().toLocaleString("en-US", { timeZone: "Australia/Sydney" }));
  nowSydney.setHours(0, 0, 0, 0);
  return nowSydney.getTime() + offsetDays * DAY_MS;
}

function formatDayLabel(iso: string): string {
  // iso is "YYYY-MM-DD"; parse as UTC noon to avoid TZ drift, then render short label.
  const d = new Date(`${iso}T12:00:00Z`);
  return d.toLocaleDateString("en-AU", {
    weekday: "short",
    day: "2-digit",
    month: "short",
    timeZone: "Australia/Sydney",
  });
}

// ── Task rollup ─────────────────────────────────────────────────────

async function computeTaskRollup(userId: number, wineryId: number | null): Promise<TaskRollup> {
  const empty: TaskRollup = { completedThisWeek: 0, newThisWeek: 0, overdue: 0, dueNextWeek: 0, recentCompletions: [] };
  try {
    const now = Date.now();
    const weekAgo = now - WEEK_MS;
    const nextWeek = now + WEEK_MS;

    // Scope by wineryId when set (multi-tenant safe); fall back to userId.
    const scope = wineryId
      ? eq(schema.cellarTasks.wineryId, wineryId)
      : eq(schema.cellarTasks.userId, userId);

    const [completedRows, newRows, overdueRows, dueRows, recent] = await Promise.all([
      db.select({ id: schema.cellarTasks.id })
        .from(schema.cellarTasks)
        .where(and(scope, isNotNull(schema.cellarTasks.completedAt), gte(schema.cellarTasks.completedAt, weekAgo))),
      db.select({ id: schema.cellarTasks.id })
        .from(schema.cellarTasks)
        .where(and(scope, gte(schema.cellarTasks.createdAt, weekAgo))),
      db.select({ id: schema.cellarTasks.id })
        .from(schema.cellarTasks)
        .where(and(scope, isNull(schema.cellarTasks.completedAt), isNotNull(schema.cellarTasks.dueAt), lte(schema.cellarTasks.dueAt, now))),
      db.select({ id: schema.cellarTasks.id })
        .from(schema.cellarTasks)
        .where(and(scope, isNull(schema.cellarTasks.completedAt), isNotNull(schema.cellarTasks.dueAt), gte(schema.cellarTasks.dueAt, now), lte(schema.cellarTasks.dueAt, nextWeek))),
      db.select({
        id: schema.cellarTasks.id,
        title: schema.cellarTasks.title,
        equipmentName: schema.cellarTasks.equipmentName,
        completedAt: schema.cellarTasks.completedAt,
        completedBy: schema.cellarTasks.completedBy,
      })
        .from(schema.cellarTasks)
        .where(and(scope, isNotNull(schema.cellarTasks.completedAt), gte(schema.cellarTasks.completedAt, weekAgo)))
        .orderBy(desc(schema.cellarTasks.completedAt))
        .limit(5),
    ]);

    return {
      completedThisWeek: completedRows.length,
      newThisWeek: newRows.length,
      overdue: overdueRows.length,
      dueNextWeek: dueRows.length,
      recentCompletions: recent
        .filter((r) => r.completedAt != null)
        .map((r) => ({
          id: r.id,
          title: r.title,
          equipmentName: r.equipmentName,
          completedAt: r.completedAt as number,
          completedBy: r.completedBy ?? null,
        })),
    };
  } catch (err) {
    console.error("[weeklyDigest] task rollup failed:", err instanceof Error ? err.message : String(err));
    return empty;
  }
}

// ── Temperature outliers (Open-Meteo past 7 days) ───────────────────

type DailyReading = {
  time: string;                 // YYYY-MM-DD
  temperature_2m_max: number;
  temperature_2m_min: number;
  relative_humidity_2m_max: number;
  relative_humidity_2m_min: number;
};

async function computeTempOutliers(wineryId: number | null): Promise<TempOutlier[]> {
  if (!wineryId) return [];
  try {
    // Load coords + thresholds off the winery row.
    const rows = await db.execute(sql`
      SELECT location_lat, location_lng, weather_thresholds_json
      FROM wineries WHERE id = ${wineryId} LIMIT 1
    `);
    const row = Array.isArray(rows) && Array.isArray(rows[0])
      ? (rows[0][0] as {
          location_lat: number | null;
          location_lng: number | null;
          weather_thresholds_json: string | null;
        } | undefined)
      : undefined;
    if (!row?.location_lat || !row?.location_lng) return [];

    const t = {
      humidity_high_pct: 75,
      humidity_low_pct: 55,
      temp_high_c: 18,
      temp_low_c: 10,
    };
    if (row.weather_thresholds_json) {
      try {
        Object.assign(t, JSON.parse(row.weather_thresholds_json));
      } catch { /* corrupt — fall back to defaults */ }
    }

    // Ask Open-Meteo for the PAST 7 days of daily max/min.
    const url = new URL("https://api.open-meteo.com/v1/forecast");
    url.searchParams.set("latitude", String(row.location_lat));
    url.searchParams.set("longitude", String(row.location_lng));
    url.searchParams.set("daily",
      "temperature_2m_max,temperature_2m_min,relative_humidity_2m_max,relative_humidity_2m_min");
    url.searchParams.set("timezone", "Australia/Sydney");
    url.searchParams.set("past_days", "7");
    url.searchParams.set("forecast_days", "1");

    const resp = await fetch(url.toString(), {
      signal: AbortSignal.timeout(10_000),
      headers: { accept: "application/json", "user-agent": "Ownology/1.0" },
    });
    if (!resp.ok) throw new Error(`Open-Meteo ${resp.status}`);
    const data = (await resp.json()) as { daily?: {
      time: string[];
      temperature_2m_max: number[];
      temperature_2m_min: number[];
      relative_humidity_2m_max: number[];
      relative_humidity_2m_min: number[];
    } };
    if (!data.daily?.time) return [];

    const outliers: TempOutlier[] = [];
    // Iterate the 7 past days (index 0..6). Skip today (idx 7 == forecast).
    for (let i = 0; i < Math.min(7, data.daily.time.length); i++) {
      const reading: DailyReading = {
        time: data.daily.time[i],
        temperature_2m_max: data.daily.temperature_2m_max[i],
        temperature_2m_min: data.daily.temperature_2m_min[i],
        relative_humidity_2m_max: data.daily.relative_humidity_2m_max[i],
        relative_humidity_2m_min: data.daily.relative_humidity_2m_min[i],
      };
      const dayLabel = formatDayLabel(reading.time);
      // Emit at most ONE outlier per day — the sharpest one — so long
      // outlier runs don't drown the email.
      const candidates: TempOutlier[] = [];
      if (reading.relative_humidity_2m_max > t.humidity_high_pct) {
        candidates.push({
          date: reading.time, dayLabel,
          kind: "humidity_high",
          actual: reading.relative_humidity_2m_max,
          threshold: t.humidity_high_pct,
          label: `${dayLabel} — humidity peaked ${Math.round(reading.relative_humidity_2m_max)}% (threshold ${t.humidity_high_pct}%)`,
        });
      }
      if (reading.relative_humidity_2m_min < t.humidity_low_pct) {
        candidates.push({
          date: reading.time, dayLabel,
          kind: "humidity_low",
          actual: reading.relative_humidity_2m_min,
          threshold: t.humidity_low_pct,
          label: `${dayLabel} — humidity dipped to ${Math.round(reading.relative_humidity_2m_min)}% (threshold ${t.humidity_low_pct}%)`,
        });
      }
      if (reading.temperature_2m_max > t.temp_high_c) {
        candidates.push({
          date: reading.time, dayLabel,
          kind: "temp_high",
          actual: reading.temperature_2m_max,
          threshold: t.temp_high_c,
          label: `${dayLabel} — cellar-ambient peaked ${reading.temperature_2m_max.toFixed(1)}°C (threshold ${t.temp_high_c}°C)`,
        });
      }
      if (reading.temperature_2m_min < t.temp_low_c) {
        candidates.push({
          date: reading.time, dayLabel,
          kind: "temp_low",
          actual: reading.temperature_2m_min,
          threshold: t.temp_low_c,
          label: `${dayLabel} — cellar-ambient dropped to ${reading.temperature_2m_min.toFixed(1)}°C (threshold ${t.temp_low_c}°C)`,
        });
      }
      if (candidates.length === 0) continue;
      // Sharpest = largest signed distance from threshold, weighted by kind.
      // Use percentile of breach: (actual - threshold) / threshold.
      candidates.sort((a, b) =>
        Math.abs((b.actual - b.threshold) / (b.threshold || 1)) -
        Math.abs((a.actual - a.threshold) / (a.threshold || 1))
      );
      outliers.push(candidates[0]);
    }
    return outliers.slice(0, 6);
  } catch (err) {
    console.error("[weeklyDigest] temp outliers failed:", err instanceof Error ? err.message : String(err));
    return [];
  }
}

// ── Pipeline rollup ─────────────────────────────────────────────────

async function computePipelineRollup(): Promise<PipelineRollup> {
  const empty: PipelineRollup = { newContacts: 0, firstViews: 0, replies: 0, demosBooked: 0, topEngaged: [] };
  try {
    const weekAgo = Date.now() - WEEK_MS;

    const [created, viewed, replied, booked, top] = await Promise.all([
      db.select({ id: schema.outreachContacts.id })
        .from(schema.outreachContacts)
        .where(gte(schema.outreachContacts.createdAt, weekAgo)),
      db.select({ id: schema.outreachContacts.id })
        .from(schema.outreachContacts)
        .where(and(isNotNull(schema.outreachContacts.firstViewedAt), gte(schema.outreachContacts.firstViewedAt, weekAgo))),
      db.select({ id: schema.outreachContacts.id })
        .from(schema.outreachContacts)
        .where(and(isNotNull(schema.outreachContacts.repliedAt), gte(schema.outreachContacts.repliedAt, weekAgo))),
      db.select({ id: schema.outreachContacts.id })
        .from(schema.outreachContacts)
        .where(and(isNotNull(schema.outreachContacts.demoBookedAt), gte(schema.outreachContacts.demoBookedAt, weekAgo))),
      db.select({
        slug: schema.outreachContacts.slug,
        firstName: schema.outreachContacts.firstName,
        lastName: schema.outreachContacts.lastName,
        winery: schema.outreachContacts.winery,
        viewCount: schema.outreachContacts.viewCount,
      })
        .from(schema.outreachContacts)
        .where(and(isNotNull(schema.outreachContacts.firstViewedAt), gte(schema.outreachContacts.firstViewedAt, weekAgo)))
        .orderBy(desc(schema.outreachContacts.viewCount))
        .limit(3),
    ]);

    return {
      newContacts: created.length,
      firstViews: viewed.length,
      replies: replied.length,
      demosBooked: booked.length,
      topEngaged: top.map((r) => ({
        slug: r.slug,
        name: [r.firstName, r.lastName].filter(Boolean).join(" ").trim() || r.slug,
        winery: r.winery,
        viewCount: r.viewCount ?? 0,
      })),
    };
  } catch (err) {
    console.error("[weeklyDigest] pipeline rollup failed:", err instanceof Error ? err.message : String(err));
    return empty;
  }
}

// ── Orchestrator ────────────────────────────────────────────────────

export async function computeWeeklyDigestEnrichments(
  userId: number,
  wineryId: number | null,
): Promise<WeeklyDigestEnrichments> {
  const weekStart = sydneyDayStart(-6);
  const weekEnd = sydneyDayStart(1) - 1;
  const [tasks, tempOutliers, pipeline] = await Promise.all([
    computeTaskRollup(userId, wineryId),
    computeTempOutliers(wineryId),
    computePipelineRollup(),
  ]);
  return {
    weekStartIso: new Date(weekStart).toISOString(),
    weekEndIso: new Date(weekEnd).toISOString(),
    tasks,
    tempOutliers,
    pipeline,
  };
}
