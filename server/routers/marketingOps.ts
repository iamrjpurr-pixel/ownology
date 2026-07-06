/**
 * marketingOps — daily + weekly marketing rituals for the operator.
 *
 * Concept: winemakers live by the calendar. Their year has fixed rhythms
 * (vintage → dormant → pruning → budburst → harvest), their week has fixed
 * patterns (Tue-Thu working days), their day has fixed windows (5-9am cellar,
 * 4-6pm end-of-day admin). Marketing that ignores these rhythms gets
 * ghosted. This dashboard tells the operator EXACTLY what to do TODAY
 * given season + day + time + current funnel state.
 *
 * See /admin/marketing-ops for the UI.
 */
import { z } from "zod";
import { and, desc, eq, gte, sql } from "drizzle-orm";
import { router, ownerProcedure } from "../trpc.js";
import { db } from "../db.js";
import * as schema from "../../drizzle/schema.js";
import { chatCompletion, MODELS } from "../_core/llm.js";

// ── Timezone helpers ──────────────────────────────────────────────────────
// Australia/Sydney is the reference tz — matches Ownology HQ. NZ ops in
// future would be a config option, not a hard-code.
const TZ = "Australia/Sydney";

function localDateStr(d: Date = new Date()): string {
  // "YYYY-MM-DD" in Sydney
  return new Intl.DateTimeFormat("en-CA", { timeZone: TZ, year: "numeric", month: "2-digit", day: "2-digit" }).format(d);
}

function localHour(d: Date = new Date()): number {
  return Number(new Intl.DateTimeFormat("en-AU", { timeZone: TZ, hour: "2-digit", hourCycle: "h23" }).format(d));
}

function localDayOfWeek(d: Date = new Date()): number {
  // 0 = Monday .. 6 = Sunday (ISO)
  const dayShort = new Intl.DateTimeFormat("en-US", { timeZone: TZ, weekday: "short" }).format(d);
  const map: Record<string, number> = { Mon: 0, Tue: 1, Wed: 2, Thu: 3, Fri: 4, Sat: 5, Sun: 6 };
  return map[dayShort] ?? 0;
}

function isoWeekStr(d: Date = new Date()): string {
  // ISO week — "YYYY-Www"
  const local = new Date(d.toLocaleString("en-US", { timeZone: TZ }));
  const t = new Date(Date.UTC(local.getFullYear(), local.getMonth(), local.getDate()));
  const dow = t.getUTCDay() || 7;
  t.setUTCDate(t.getUTCDate() + 4 - dow);
  const yearStart = new Date(Date.UTC(t.getUTCFullYear(), 0, 1));
  const weekNo = Math.ceil((((t.getTime() - yearStart.getTime()) / 86400000) + 1) / 7);
  return `${t.getUTCFullYear()}-W${String(weekNo).padStart(2, "0")}`;
}

// ── Season model — Southern Hemisphere ────────────────────────────────────
type Season =
  | "vintage"          // Feb-Apr — pause cold outreach
  | "dormant"          // May-Jul — peak pitching window
  | "pruning_spring"   // Aug-Oct — balanced
  | "pre_summer"       // Nov-early Dec — winding down cold
  | "holiday";         // Late Dec - mid Jan — pause everything

function currentSeason(d: Date = new Date()): { season: Season; label: string; coldGate: "peak" | "ok" | "avoid" | "pause" } {
  const month = Number(new Intl.DateTimeFormat("en-AU", { timeZone: TZ, month: "numeric" }).format(d));
  const day = Number(new Intl.DateTimeFormat("en-AU", { timeZone: TZ, day: "numeric" }).format(d));
  // Holiday window: 20 Dec → 15 Jan
  if ((month === 12 && day >= 20) || (month === 1 && day <= 15)) {
    return { season: "holiday", label: "Holiday", coldGate: "pause" };
  }
  if (month >= 2 && month <= 4) return { season: "vintage", label: "Vintage", coldGate: "pause" };
  if (month >= 5 && month <= 7) return { season: "dormant", label: "Dormant · peak pitching window", coldGate: "peak" };
  if (month >= 8 && month <= 10) return { season: "pruning_spring", label: "Pruning + spring", coldGate: "ok" };
  return { season: "pre_summer", label: "Pre-summer", coldGate: "avoid" };
}

// ── Task definitions ──────────────────────────────────────────────────────
// Kept in code (not DB) because they're product logic, not user data.
type TaskDef = {
  slug: string;
  cadence: "daily" | "weekly";
  title: string;
  why: string;
  estimateMin: number;
  quickLink?: string;
  dayOfWeek?: number; // 0-6 (Mon-Sun) for weekly tasks
  timeHint?: string;
  seasonGate?: (s: Season) => "show" | "block" | "hide";
  category: "warm_reach" | "pipeline" | "cold_reach" | "content" | "review" | "product";
};

const TASKS: TaskDef[] = [
  // ── Daily ──
  {
    slug: "check_overnight_views",
    cadence: "daily",
    title: "Check overnight views",
    why: "See who opened their /hi/<slug> link since yesterday — priority is people who viewed twice or spent >30s.",
    estimateMin: 3,
    quickLink: "/admin/contacts",
    timeHint: "7-9am — with your coffee",
    category: "pipeline",
  },
  {
    slug: "reply_unanswered_views",
    cadence: "daily",
    title: "Reply to any warm view without a response",
    why: "Prospects reply 4× more if you respond within 30 min of their opening the link. Warmest window in outbound.",
    estimateMin: 10,
    quickLink: "/admin/contacts",
    timeHint: "4-6pm — they're at a desk",
    category: "warm_reach",
  },
  {
    slug: "mark_replies_received",
    cadence: "daily",
    title: "Mark any SMS/DM replies received today",
    why: "Tap 💬 Mark replied on the row. Reply-rate KPI updates immediately — feeds the coach line for tomorrow.",
    estimateMin: 2,
    quickLink: "/admin/contacts",
    category: "pipeline",
  },
  {
    slug: "review_quiz_leads",
    cadence: "daily",
    title: "Review new quiz leads",
    why: "Anyone who dropped their email post-quiz yesterday. Send a personal note the same week or the interest cools.",
    estimateMin: 4,
    quickLink: "/admin/quiz-picks",
    category: "warm_reach",
  },
  {
    slug: "content_snap",
    cadence: "daily",
    title: "Log 1 winery note or photo for content",
    why: "Ownology's own Instagram/LinkedIn stays alive on daily posts. Photograph a tank, jot a tasting note, save for later use.",
    estimateMin: 3,
    category: "content",
  },
  // ── Weekly ──
  {
    slug: "tuesday_cold_blast",
    cadence: "weekly",
    dayOfWeek: 1, // Tuesday
    title: "Send 5-10 cold-warm SMS via the bulk-activate strip",
    why: "Tue 7-9am is the highest-reply window of the week. Copy from /admin/contacts → paste into Messages → send from your phone → Mark all sent.",
    estimateMin: 15,
    quickLink: "/admin/contacts",
    timeHint: "Tue 7-9am",
    seasonGate: (s) => (s === "vintage" || s === "holiday" ? "block" : "show"),
    category: "cold_reach",
  },
  {
    slug: "wednesday_follow_up",
    cadence: "weekly",
    dayOfWeek: 2,
    title: "Follow up unopened Tuesday sends",
    why: "Anyone who didn't open by Wed 4pm gets a light nudge — no pitch, just 'saw your recent Halliday rating, meant to send this'.",
    estimateMin: 10,
    quickLink: "/admin/contacts",
    seasonGate: (s) => (s === "holiday" ? "block" : "show"),
    category: "warm_reach",
  },
  {
    slug: "thursday_quiz_emails",
    cadence: "weekly",
    dayOfWeek: 3,
    title: "Hand-write 3 quiz-lead emails",
    why: "Personal, one-off note referencing their quiz pick + 3 boutique producers they'd love. No template. No drip.",
    estimateMin: 25,
    quickLink: "/admin/quiz-picks",
    seasonGate: (s) => (s === "holiday" ? "block" : "show"),
    category: "warm_reach",
  },
  {
    slug: "friday_metrics_review",
    cadence: "weekly",
    dayOfWeek: 4,
    title: "15-min metrics review",
    why: "Reply rate, view rate, quiz completions, top-picked wines. Note what's working, what isn't. Adjust next week.",
    estimateMin: 15,
    quickLink: "/admin/contacts",
    timeHint: "Fri afternoon",
    category: "review",
  },
  {
    slug: "sunday_content_prep",
    cadence: "weekly",
    dayOfWeek: 6,
    title: "30-min content prep for next week",
    why: "Draft 3 short posts (LinkedIn / Instagram / X) using the week's tasting notes + photos from `content_snap`. Schedule them.",
    estimateMin: 30,
    category: "content",
  },
  {
    slug: "weekly_referral_ask",
    cadence: "weekly",
    title: "Ask 1 happy prospect for an intro",
    why: "Every warm-connected winemaker knows 3-5 others. Ask directly: 'Is there anyone in your region you'd want me to talk to?'",
    estimateMin: 5,
    quickLink: "/admin/contacts",
    seasonGate: (s) => (s === "vintage" || s === "holiday" ? "block" : "show"),
    category: "warm_reach",
  },
];

/**
 * Generate (or serve cached) coach line for today. Exported so the scheduled
 * 7am email can reuse the exact same logic + cache as the /admin page.
 */
export async function getOrCreateCoachLine(now: Date = new Date()): Promise<{ line: string; cached: boolean; localDate: string }> {
  const today = localDateStr(now);
  const cached = await db
    .select()
    .from(schema.marketingCoachLines)
    .where(eq(schema.marketingCoachLines.localDate, today))
    .orderBy(desc(schema.marketingCoachLines.generatedAt))
    .limit(1);
  if (cached.length > 0) return { line: cached[0].line, cached: true, localDate: today };

  const seasonInfo = currentSeason(now);
  const dow = localDayOfWeek(now);
  const hour = localHour(now);
  const dayNames = ["Monday", "Tuesday", "Wednesday", "Thursday", "Friday", "Saturday", "Sunday"];

  const contactRows = await db.select().from(schema.outreachContacts);
  const sent = contactRows.filter((c) => c.smsSentAt).length;
  const replied = contactRows.filter((c) => c.repliedAt).length;
  const openedNoReply = contactRows.filter(
    (c) => c.smsSentAt && (c.viewCount ?? 0) > 0 && !c.repliedAt
  ).length;
  const unsent = contactRows.filter((c) => !c.smsSentAt && c.mobileAu).length;

  const context = `
Today is ${dayNames[dow]}, ${today}, ${hour}:00 in Sydney.
Season: ${seasonInfo.label} (cold outreach: ${seasonInfo.coldGate}).
Funnel snapshot:
- ${sent} contacts SMS-sent, ${replied} replied (${sent > 0 ? Math.round((replied / sent) * 100) : 0}% reply rate)
- ${openedNoReply} prospects OPENED their link but haven't replied yet — priority follow-ups
- ${unsent} contacts still unsent with a mobile number (bulk-activate lever)`.trim();

  const system = `You are the marketing coach for Rich, a boutique wine-tech founder growing a customer base of AU + NZ winemakers. Your job: read the day/season/funnel state and write ONE sentence (40 words max) telling Rich exactly what to focus on TODAY.

Rules:
- One sentence. No preamble. No "Hi Rich".
- Reference the specific season + day + a specific funnel number.
- Be direct: "Skip the cold blast today — you're in vintage, they'll hate it. Reply to the 3 warm views instead."
- Australian English.
- Never invent numbers not in the funnel snapshot.`;

  let line = "";
  try {
    line = (
      await chatCompletion(
        [
          { role: "system", content: system },
          { role: "user", content: context },
        ],
        { model: MODELS.PREMIUM, maxTokens: 120, temperature: 0.5, source: "marketingOps.coach" }
      )
    ).trim();
  } catch {
    if (seasonInfo.coldGate === "pause") {
      line = `It's ${seasonInfo.label} — pause cold outreach. Reply to any warm views (${openedNoReply} waiting) and mark any SMS replies you've received.`;
    } else if (dow === 1) {
      line = `Tuesday morning — the peak send window. Fire off the bulk-activate strip (${unsent} un-SMS'd) before 9am while they're on their first coffee.`;
    } else {
      line = `${openedNoReply} prospects opened their link but haven't replied. Reply to those before you do anything else.`;
    }
  }

  await db.insert(schema.marketingCoachLines).values({
    localDate: today,
    line,
    season: seasonInfo.season,
    generatedAt: Date.now(),
  });
  return { line, cached: false, localDate: today };
}

/**
 * Snapshot of today's focus for downstream renderers (email, briefings).
 * Returns the same shape as the tRPC `today` procedure minus the streak
 * back-scan (which the email doesn't need).
 */
export async function getTodayFocusSnapshot(now: Date = new Date()): Promise<{
  today: string;
  dow: number;
  hour: number;
  season: ReturnType<typeof currentSeason>;
  tasks: Array<{ slug: string; title: string; why: string; estimateMin: number; timeHint?: string; quickLink?: string; category: TaskDef["category"]; cadence: TaskDef["cadence"]; blocked: boolean }>;
}> {
  const today = localDateStr(now);
  const week = isoWeekStr(now);
  const dow = localDayOfWeek(now);
  const hour = localHour(now);
  const seasonInfo = currentSeason(now);
  const [todayRows, weekRows] = await Promise.all([
    db.select().from(schema.marketingTaskCompletions).where(eq(schema.marketingTaskCompletions.localDate, today)),
    db.select().from(schema.marketingTaskCompletions).where(eq(schema.marketingTaskCompletions.isoWeek, week)),
  ]);
  const doneToday = new Set(todayRows.map((r) => r.taskSlug));
  const doneWeek = new Set(weekRows.map((r) => r.taskSlug));
  const relevant = TASKS.filter((t) => {
    if (t.cadence === "daily") return true;
    if (t.dayOfWeek === undefined) return true;
    return t.dayOfWeek === dow;
  });
  const tasks = relevant
    .filter((t) => {
      const done = t.cadence === "daily" ? doneToday.has(t.slug) : doneWeek.has(t.slug);
      return !done; // email lists remaining focus only
    })
    .map((t) => ({
      slug: t.slug,
      title: t.title,
      why: t.why,
      estimateMin: t.estimateMin,
      timeHint: t.timeHint,
      quickLink: t.quickLink,
      category: t.category,
      cadence: t.cadence,
      blocked: t.seasonGate ? t.seasonGate(seasonInfo.season) === "block" : false,
    }));
  return { today, dow, hour, season: seasonInfo, tasks };
}

// ── Router ────────────────────────────────────────────────────────────────
export const marketingOpsRouter = router({
  /** OWNER — today's context: season, day, time, tasks (with done flag),
   *  weekly board, and completion streak. */
  today: ownerProcedure.query(async () => {
    const now = new Date();
    const today = localDateStr(now);
    const week = isoWeekStr(now);
    const dow = localDayOfWeek(now);
    const hour = localHour(now);
    const seasonInfo = currentSeason(now);

    // Fetch today's completions + this week's completions.
    const [todayRows, weekRows] = await Promise.all([
      db
        .select()
        .from(schema.marketingTaskCompletions)
        .where(eq(schema.marketingTaskCompletions.localDate, today)),
      db
        .select()
        .from(schema.marketingTaskCompletions)
        .where(eq(schema.marketingTaskCompletions.isoWeek, week)),
    ]);
    const doneToday = new Set(todayRows.map((r) => r.taskSlug));
    const doneWeek = new Set(weekRows.map((r) => r.taskSlug));

    // Which tasks to show today: all daily + weekly tasks where dayOfWeek
    // matches today OR (undefined dayOfWeek means "any day this week").
    const relevant = TASKS.filter((t) => {
      if (t.cadence === "daily") return true;
      if (t.dayOfWeek === undefined) return true;
      return t.dayOfWeek === dow;
    });

    const tasks = relevant.map((t) => {
      const gate = t.seasonGate ? t.seasonGate(seasonInfo.season) : "show";
      const done = t.cadence === "daily" ? doneToday.has(t.slug) : doneWeek.has(t.slug);
      return {
        slug: t.slug,
        cadence: t.cadence,
        title: t.title,
        why: t.why,
        estimateMin: t.estimateMin,
        quickLink: t.quickLink,
        timeHint: t.timeHint,
        category: t.category,
        blocked: gate === "block",
        done,
      };
    }).filter((t) => t.blocked !== true || t.done); // hide blocked-and-not-done? no — show them so operator sees WHY nothing to do

    // Weekly board: 7 days with done/undone tasks per day
    const weeklyBoard: { day: string; dow: number; tasks: { slug: string; title: string; done: boolean; blocked: boolean }[] }[] = [];
    const dayNames = ["Mon", "Tue", "Wed", "Thu", "Fri", "Sat", "Sun"];
    for (let d = 0; d < 7; d += 1) {
      const dayTasks = TASKS.filter((t) => t.cadence === "weekly" && t.dayOfWeek === d).map((t) => ({
        slug: t.slug,
        title: t.title,
        done: doneWeek.has(t.slug),
        blocked: t.seasonGate ? t.seasonGate(seasonInfo.season) === "block" : false,
      }));
      weeklyBoard.push({ day: dayNames[d], dow: d, tasks: dayTasks });
    }

    // Streak: how many consecutive days back had ≥1 daily completion.
    // Cheap query: last 60 days of daily completions.
    const cutoff = Date.now() - 60 * 24 * 60 * 60 * 1000;
    const recent = await db
      .select({ localDate: schema.marketingTaskCompletions.localDate })
      .from(schema.marketingTaskCompletions)
      .where(gte(schema.marketingTaskCompletions.completedAt, cutoff));
    const dates = new Set(recent.map((r) => r.localDate));
    let streak = 0;
    for (let i = 0; i < 60; i += 1) {
      const day = new Date(now);
      day.setDate(day.getDate() - i);
      if (dates.has(localDateStr(day))) streak += 1;
      else if (i > 0) break;
    }

    return {
      today,
      dow,
      hour,
      season: seasonInfo,
      tasks,
      weeklyBoard,
      streak,
      doneTodayCount: [...doneToday].length,
      totalTodayCount: tasks.length,
    };
  }),

  /** OWNER — tick a task done. Idempotent per (slug, localDate/week). */
  complete: ownerProcedure
    .input(z.object({ slug: z.string().max(64), notes: z.string().max(500).optional() }))
    .mutation(async ({ input }) => {
      const def = TASKS.find((t) => t.slug === input.slug);
      if (!def) throw new Error(`Unknown task: ${input.slug}`);
      const now = new Date();
      const today = localDateStr(now);
      const week = isoWeekStr(now);
      // Check if already done in the reset window
      const rows = await db
        .select({ id: schema.marketingTaskCompletions.id })
        .from(schema.marketingTaskCompletions)
        .where(
          def.cadence === "daily"
            ? and(
                eq(schema.marketingTaskCompletions.taskSlug, input.slug),
                eq(schema.marketingTaskCompletions.localDate, today)
              )
            : and(
                eq(schema.marketingTaskCompletions.taskSlug, input.slug),
                eq(schema.marketingTaskCompletions.isoWeek, week)
              )
        )
        .limit(1);
      if (rows.length > 0) return { ok: true, alreadyDone: true };
      await db.insert(schema.marketingTaskCompletions).values({
        taskSlug: input.slug,
        completedAt: now.getTime(),
        localDate: today,
        isoWeek: week,
        notes: input.notes ?? null,
      });
      return { ok: true, alreadyDone: false };
    }),

  /** OWNER — undo (delete today/this-week's completion). */
  uncomplete: ownerProcedure
    .input(z.object({ slug: z.string().max(64) }))
    .mutation(async ({ input }) => {
      const def = TASKS.find((t) => t.slug === input.slug);
      if (!def) throw new Error(`Unknown task: ${input.slug}`);
      const now = new Date();
      const today = localDateStr(now);
      const week = isoWeekStr(now);
      const where =
        def.cadence === "daily"
          ? and(
              eq(schema.marketingTaskCompletions.taskSlug, input.slug),
              eq(schema.marketingTaskCompletions.localDate, today)
            )
          : and(
              eq(schema.marketingTaskCompletions.taskSlug, input.slug),
              eq(schema.marketingTaskCompletions.isoWeek, week)
            );
      await db.delete(schema.marketingTaskCompletions).where(where);
      return { ok: true };
    }),

  /** OWNER — the AI coach one-liner. One call per local calendar day,
   *  cached in marketing_coach_lines. Falls back to a rule-based sentence
   *  if the LLM fails. */
  coachLine: ownerProcedure.query(async () => {
    const result = await getOrCreateCoachLine();
    return { line: result.line, cached: result.cached };
  }),

  /** OWNER — yesterday's wins + rolling 7d KPIs. */
  wins: ownerProcedure.query(async () => {
    const now = new Date();
    const yesterday = new Date(now);
    yesterday.setDate(yesterday.getDate() - 1);
    const yStr = localDateStr(yesterday);

    const yesterdayCompletions = await db
      .select()
      .from(schema.marketingTaskCompletions)
      .where(eq(schema.marketingTaskCompletions.localDate, yStr));

    // Rolling 7d KPI: replied count
    const sevenDaysAgo = now.getTime() - 7 * 24 * 60 * 60 * 1000;
    const recentContacts = await db.select().from(schema.outreachContacts);
    const sent7d = recentContacts.filter((c) => (c.smsSentAt ?? 0) >= sevenDaysAgo).length;
    const replied7d = recentContacts.filter((c) => (c.repliedAt ?? 0) >= sevenDaysAgo).length;
    const booked7d = recentContacts.filter((c) => (c.demoBookedAt ?? 0) >= sevenDaysAgo).length;
    const replyRatePct = sent7d > 0 ? Math.round((replied7d / sent7d) * 100) : 0;

    return {
      yesterdayDone: yesterdayCompletions.length,
      sevenDay: { sent: sent7d, replied: replied7d, booked: booked7d, replyRatePct },
    };
  }),

  /** OWNER — return raw TASKS metadata (for admin debugging). */
  listDefs: ownerProcedure.query(async () => {
    return { tasks: TASKS.map((t) => ({ slug: t.slug, cadence: t.cadence, title: t.title, category: t.category })) };
  }),
});
