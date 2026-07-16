/**
 * Weekly Cellar Digest — /api/scheduled/weekly-cellar-digest
 *
 * Fires once per week (Monday 05:30 Australia/Sydney via Railway cron).
 * For every user with a winery, sends a Monday-morning digest email built
 * from `generateCellarBrief(wineryId, "weekly")` — the SAME data shape
 * that renders on the homepage CellarBriefTeaser and the /cellar-brief page.
 *
 * Why weekly: retention during the empty-cellar off-season. When a user
 * hasn't opened Ownology for six days, this pulls them back into the app
 * with a single "here's what your cellar looks like this Monday" email,
 * cited to their own logs. No fabrication.
 *
 * Value-engineered: reuses `generateCellarBrief` (no new engine), reuses
 * `RESEND_API_KEY`+`ALERT_FROM_EMAIL` (no new env vars), reuses the same
 * cron-secret + dry-run + test-to-override pattern as dailyAlertEmail
 * (no new operational contract).
 *
 * Env vars consumed:
 *   RESEND_API_KEY     — required to actually send. If missing → dry-run.
 *   ALERT_FROM_EMAIL   — sender ("owen@ownology.ai" by default).
 *   ALERT_FROM_NAME    — sender display name.
 *   ALERT_REPLY_TO     — reply-to header.
 *   ALERT_TEST_TO      — optional override → all emails redirected here.
 *   CRON_SECRET        — optional. Live sends require matching header/query.
 *
 * Owner-triggerable at any time via GET /api/scheduled/weekly-cellar-digest?dryRun=1
 * (public dry-run) or GET/POST /api/scheduled/weekly-cellar-digest with
 * x-cron-secret header for a live send.
 */

import type { Request, Response } from "express";
import { Resend } from "resend";
import { db } from "../db.js";
import * as schema from "../../drizzle/schema.js";
import { generateCellarBrief, type CellarBriefCard } from "../cellarBriefEngine.js";
import {
  computeWeeklyDigestEnrichments,
  type WeeklyDigestEnrichments,
} from "../weeklyDigestEnrichments.js";

type EmailResult = {
  userId: number;
  email: string;
  wineryId: number | null;
  cardCount: number;
  status: "sent" | "skipped_no_winery" | "skipped_no_email" | "skipped_empty_cellar" | "dry_run" | "error";
  resendId?: string;
  error?: string;
};

const STATUS_COLOR: Record<"ok" | "watch" | "attention", string> = {
  ok: "#4a7c47",
  watch: "#b57e14",
  attention: "#b91c1c",
};
const STATUS_LABEL: Record<"ok" | "watch" | "attention", string> = {
  ok: "Steady",
  watch: "Watch",
  attention: "Attention",
};

function escapeHtml(s: string): string {
  return s.replace(/[&<>"']/g, (c) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" }[c]!));
}

function renderText(userName: string, wineryName: string | null, cards: CellarBriefCard[], counts: { attention: number; watch: number; ok: number }, enrichments: WeeklyDigestEnrichments): string {
  const lines: string[] = [];
  const wineryLabel = wineryName ? ` at ${wineryName}` : "";
  lines.push(`Monday morning, ${userName}${wineryLabel}.`);
  lines.push("");
  if (counts.attention > 0) {
    lines.push(`${counts.attention} vessel${counts.attention === 1 ? "" : "s"} need${counts.attention === 1 ? "s" : ""} attention this week.`);
  } else if (counts.watch > 0) {
    lines.push(`${counts.watch} on watch, ${counts.ok} steady.`);
  } else {
    lines.push(`All ${cards.length} vessels steady. A gentle week ahead.`);
  }
  lines.push("");
  for (const c of cards.slice(0, 6)) {
    const status = STATUS_LABEL[c.status];
    const stage = c.stageLabel ?? c.stage;
    lines.push(`[${status}] ${c.vesselId} · ${c.variety} — ${stage}${c.daysInStage != null ? ` · day ${c.daysInStage}` : ""}`);
  }
  if (cards.length > 6) {
    lines.push(`… and ${cards.length - 6} more.`);
  }

  // ── Enrichment sections ───────────────────────────────────────────
  const t = enrichments.tasks;
  if (t.completedThisWeek + t.newThisWeek + t.overdue + t.dueNextWeek > 0) {
    lines.push("");
    lines.push("CELLAR TASKS THIS WEEK");
    lines.push(`  ${t.completedThisWeek} completed · ${t.newThisWeek} new · ${t.overdue} overdue · ${t.dueNextWeek} due next 7 days`);
    for (const c of t.recentCompletions.slice(0, 3)) {
      lines.push(`  ✓ ${c.title} — ${c.equipmentName}${c.completedBy ? ` (by ${c.completedBy})` : ""}`);
    }
  }
  if (enrichments.tempOutliers.length > 0) {
    lines.push("");
    lines.push("TEMPERATURE / HUMIDITY OUTLIERS");
    for (const o of enrichments.tempOutliers) lines.push(`  • ${o.label}`);
  }
  const p = enrichments.pipeline;
  if (p.newContacts + p.firstViews + p.replies + p.demosBooked > 0) {
    lines.push("");
    lines.push("PIPELINE MOVES");
    lines.push(`  ${p.newContacts} new · ${p.firstViews} first opens · ${p.replies} replies · ${p.demosBooked} demo${p.demosBooked === 1 ? "" : "s"} booked`);
    for (const e of p.topEngaged) lines.push(`  ⋯ ${e.name}${e.winery ? ` · ${e.winery}` : ""} (${e.viewCount} views)`);
  }

  lines.push("");
  lines.push("Open your full brief: https://ownology.ai/cellar-brief");
  lines.push("");
  lines.push("— Owen");
  lines.push("Ownology's AI apprentice, in your inbox once a week. Reply STOP to pause.");
  return lines.join("\n");
}

function renderHtml(userName: string, wineryName: string | null, cards: CellarBriefCard[], counts: { attention: number; watch: number; ok: number }, enrichments: WeeklyDigestEnrichments): string {
  const wineryLabel = wineryName ? ` at <em>${escapeHtml(wineryName)}</em>` : "";
  const headline =
    counts.attention > 0
      ? `${counts.attention} vessel${counts.attention === 1 ? "" : "s"} need${counts.attention === 1 ? "s" : ""} attention this week.`
      : counts.watch > 0
      ? `${counts.watch} on watch, ${counts.ok} steady.`
      : `All ${cards.length} vessels steady. A gentle week ahead.`;

  const rows = cards
    .slice(0, 6)
    .map((c) => {
      const color = STATUS_COLOR[c.status];
      const status = STATUS_LABEL[c.status];
      const stage = escapeHtml(c.stageLabel ?? c.stage);
      const days = c.daysInStage != null ? ` · day ${c.daysInStage}` : "";
      return `
      <tr>
        <td style="padding:12px 14px;border-top:1px solid #eee5d3;vertical-align:top;width:14px;">
          <div style="width:10px;height:10px;border-radius:999px;background:${color};margin-top:4px;"></div>
        </td>
        <td style="padding:12px 14px;border-top:1px solid #eee5d3;">
          <div style="font-family:Georgia,serif;font-weight:600;color:#1a1210;font-size:15px;">
            ${escapeHtml(c.vesselId)}
            <span style="font-family:Arial,sans-serif;font-weight:400;color:#6b5c50;font-size:13px;margin-left:6px;">${escapeHtml(c.variety)}</span>
          </div>
          <div style="font-family:Arial,sans-serif;font-size:12px;color:#8a7565;margin-top:2px;">${stage}${days}</div>
        </td>
        <td style="padding:12px 14px;border-top:1px solid #eee5d3;text-align:right;vertical-align:top;">
          <span style="font-family:Arial,sans-serif;font-size:11px;font-weight:700;letter-spacing:0.08em;text-transform:uppercase;color:${color};">${status}</span>
        </td>
      </tr>`;
    })
    .join("");

  const moreLine =
    cards.length > 6
      ? `<tr><td colspan="3" style="padding:10px 14px;font-family:Arial,sans-serif;font-size:12px;color:#8a7565;text-align:center;border-top:1px solid #eee5d3;font-style:italic;">… and ${cards.length - 6} more in your full brief.</td></tr>`
      : "";

  // ── Enrichment blocks ─────────────────────────────────────────────
  // Each block is a self-contained <tr> so they can be re-ordered without
  // reflowing surrounding markup. Emails skip a section entirely when it
  // has no data — a quiet week shouldn't fake activity.

  const t = enrichments.tasks;
  const tasksTotal = t.completedThisWeek + t.newThisWeek + t.overdue + t.dueNextWeek;
  const tasksBlock = tasksTotal === 0 ? "" : `
    <tr><td style="padding:20px 24px 4px;border-top:1px solid #eee5d3;">
      <div style="font-family:Georgia,serif;font-size:11px;letter-spacing:0.14em;text-transform:uppercase;color:#B0741A;font-weight:700;margin-bottom:8px;">Cellar tasks · this week</div>
      <div style="font-family:Arial,sans-serif;font-size:13px;color:#3a2e26;line-height:1.6;">
        <strong style="color:#4a7c47;">${t.completedThisWeek}</strong> completed
        · <strong>${t.newThisWeek}</strong> new
        ${t.overdue > 0 ? `· <strong style="color:#b91c1c;">${t.overdue}</strong> overdue` : ""}
        ${t.dueNextWeek > 0 ? `· <strong style="color:#b57e14;">${t.dueNextWeek}</strong> due next 7 days` : ""}
      </div>
      ${t.recentCompletions.length > 0 ? `
      <div style="font-family:Arial,sans-serif;font-size:12px;color:#6b5c50;margin-top:8px;line-height:1.55;">
        ${t.recentCompletions.slice(0, 3).map((c) =>
          `<div>✓ <strong>${escapeHtml(c.title)}</strong> — ${escapeHtml(c.equipmentName)}${c.completedBy ? ` <span style="color:#8a7565;">(${escapeHtml(c.completedBy)})</span>` : ""}</div>`
        ).join("")}
      </div>` : ""}
    </td></tr>
  `;

  const outliersBlock = enrichments.tempOutliers.length === 0 ? "" : `
    <tr><td style="padding:20px 24px 4px;border-top:1px solid #eee5d3;">
      <div style="font-family:Georgia,serif;font-size:11px;letter-spacing:0.14em;text-transform:uppercase;color:#B0741A;font-weight:700;margin-bottom:8px;">Temperature &amp; humidity outliers</div>
      <div style="font-family:Arial,sans-serif;font-size:13px;color:#3a2e26;line-height:1.7;">
        ${enrichments.tempOutliers.map((o) => {
          const isHigh = o.kind === "humidity_high" || o.kind === "temp_high";
          const color = isHigh ? "#b91c1c" : "#1b6a99";
          return `<div>• <span style="color:${color};font-weight:600;">${escapeHtml(o.label)}</span></div>`;
        }).join("")}
      </div>
      <div style="font-family:Arial,sans-serif;font-size:11px;color:#8a7565;margin-top:6px;">
        Thresholds set on <a href="https://ownology.ai/admin/environment" style="color:#B0741A;">/admin/environment</a>.
      </div>
    </td></tr>
  `;

  const p = enrichments.pipeline;
  const pipelineTotal = p.newContacts + p.firstViews + p.replies + p.demosBooked;
  const pipelineBlock = pipelineTotal === 0 ? "" : `
    <tr><td style="padding:20px 24px 4px;border-top:1px solid #eee5d3;">
      <div style="font-family:Georgia,serif;font-size:11px;letter-spacing:0.14em;text-transform:uppercase;color:#B0741A;font-weight:700;margin-bottom:8px;">Pipeline moves · outreach</div>
      <div style="font-family:Arial,sans-serif;font-size:13px;color:#3a2e26;line-height:1.6;">
        <strong>${p.newContacts}</strong> new
        · <strong style="color:#4a7c47;">${p.firstViews}</strong> first opens
        · <strong style="color:#B0741A;">${p.replies}</strong> replies
        ${p.demosBooked > 0 ? `· <strong style="color:#4a7c47;">${p.demosBooked}</strong> demo${p.demosBooked === 1 ? "" : "s"} booked` : ""}
      </div>
      ${p.topEngaged.length > 0 ? `
      <div style="font-family:Arial,sans-serif;font-size:12px;color:#6b5c50;margin-top:8px;line-height:1.55;">
        Most engaged this week:
        ${p.topEngaged.map((e) =>
          `<div>⋯ <a href="https://ownology.ai/admin/contacts" style="color:#3a2e26;text-decoration:none;font-weight:600;">${escapeHtml(e.name)}</a>${e.winery ? ` · ${escapeHtml(e.winery)}` : ""} <span style="color:#8a7565;">(${e.viewCount} views)</span></div>`
        ).join("")}
      </div>` : ""}
    </td></tr>
  `;

  return `<!DOCTYPE html>
<html><body style="margin:0;padding:0;background:#f6f1ea;font-family:Arial,Helvetica,sans-serif;color:#1a1210;">
  <table role="presentation" width="100%" cellspacing="0" cellpadding="0" border="0" style="background:#f6f1ea;padding:24px 12px;">
    <tr><td align="center">
      <table role="presentation" width="580" cellspacing="0" cellpadding="0" border="0" style="max-width:580px;background:#fff;border:1px solid #eee5d3;border-radius:6px;overflow:hidden;">
        <tr><td style="padding:22px 26px 18px;border-bottom:1px solid #eee5d3;">
          <div style="font-family:Georgia,serif;font-size:11px;letter-spacing:0.14em;text-transform:uppercase;color:#B0741A;font-weight:700;">
            Cellar Brief · Monday
          </div>
          <div style="font-family:Georgia,serif;font-size:20px;font-weight:600;color:#1a1210;margin-top:6px;line-height:1.25;">
            ${headline}
          </div>
          <div style="font-family:Arial,sans-serif;font-size:13px;color:#6b5c50;margin-top:6px;">
            Morning ${escapeHtml(userName)}${wineryLabel}.
          </div>
        </td></tr>

        <tr><td>
          <table role="presentation" width="100%" cellspacing="0" cellpadding="0" border="0">
            ${rows}
            ${moreLine}
          </table>
        </td></tr>
        ${tasksBlock}
        ${outliersBlock}
        ${pipelineBlock}

        <tr><td style="padding:18px 26px 22px;border-top:1px solid #eee5d3;background:#fbf3e4;">
          <a href="https://ownology.ai/cellar-brief?from=weekly-digest"
            style="display:inline-block;padding:10px 18px;background:#B0741A;color:#2A1E0A;text-decoration:none;font-family:Arial,sans-serif;font-size:14px;font-weight:600;border-radius:999px;">
            Open the full brief →
          </a>
        </td></tr>

        <tr><td style="padding:14px 26px 22px;font-family:Arial,sans-serif;font-size:11px;color:#8a7565;line-height:1.55;">
          — Owen. Ownology's AI apprentice, in your inbox every Monday. All numbers above are cited to your own log entries. Reply anytime — Rich P (0408 105 067) and Gel read every response. Reply STOP to pause.
        </td></tr>
      </table>
    </td></tr>
  </table>
</body></html>`;
}

// Expose the renderers so the /admin/weekly-digest preview UI (via the
// weeklyDigest tRPC router) can reuse the exact same HTML/text output
// the cron would email out. Prefixed with `__` to signal "internal, not
// a public API — could change without notice".
export const __renderHtmlForPreview = renderHtml;
export const __renderTextForPreview = renderText;


export async function weeklyCellarDigestHandler(req: Request, res: Response): Promise<void> {
  const apiKey = process.env.RESEND_API_KEY;
  const fromEmail = process.env.ALERT_FROM_EMAIL ?? "owen@ownology.ai";
  const fromName = process.env.ALERT_FROM_NAME ?? "Owen · Ownology Cellars";
  const replyTo = process.env.ALERT_REPLY_TO?.trim() || "support@ownology.ai";
  const testTo = process.env.ALERT_TEST_TO?.trim() || null;
  const cronSecret = process.env.CRON_SECRET?.trim() || null;
  const providedSecret = (req.headers["x-cron-secret"] as string | undefined)?.trim()
    ?? (req.query.cronSecret as string | undefined)?.trim()
    ?? null;

  const dryRunRequested = req.query.dryRun === "1" || !apiKey;
  const secretRequired = cronSecret !== null;
  const secretOk = !secretRequired || providedSecret === cronSecret;
  const dryRun = dryRunRequested || !secretOk;

  if (!secretOk && !dryRunRequested) {
    console.warn("[weekly-cellar-digest] CRON_SECRET mismatch — downgrading to dry-run.");
  }

  const resend = apiKey ? new Resend(apiKey) : null;
  const results: EmailResult[] = [];

  const users = await db.select().from(schema.users);
  const wineries = await db.select().from(schema.wineries);
  const wineryNameById = new Map<number, string>();
  for (const w of wineries) wineryNameById.set(w.id, w.name);
  console.log(`[weekly-cellar-digest] starting — ${users.length} user(s), dryRun=${dryRun}`);

  for (const u of users) {
    if (!u.email) {
      results.push({ userId: u.id, email: "", wineryId: u.wineryId ?? null, cardCount: 0, status: "skipped_no_email" });
      continue;
    }
    if (!u.wineryId) {
      results.push({ userId: u.id, email: u.email, wineryId: null, cardCount: 0, status: "skipped_no_winery" });
      continue;
    }

    let cards: CellarBriefCard[] = [];
    let counts = { attention: 0, watch: 0, ok: 0 };
    try {
      const brief = await generateCellarBrief(u.wineryId, "weekly");
      cards = brief.summary.cards ?? [];
      for (const c of cards) {
        if (c.status === "attention") counts.attention++;
        else if (c.status === "watch") counts.watch++;
        else counts.ok++;
      }
    } catch (err) {
      const msg = err instanceof Error ? err.message : String(err);
      results.push({ userId: u.id, email: u.email, wineryId: u.wineryId, cardCount: 0, status: "error", error: `brief_gen: ${msg}` });
      continue;
    }

    if (cards.length === 0) {
      results.push({ userId: u.id, email: u.email, wineryId: u.wineryId, cardCount: 0, status: "skipped_empty_cellar" });
      continue;
    }

    // Enrichments (tasks / temp outliers / pipeline moves). Compute
    // failures return empty sections so the digest still ships.
    const enrichments = await computeWeeklyDigestEnrichments(u.id, u.wineryId);

    const userName = u.name ?? "winemaker";
    const wineryName = wineryNameById.get(u.wineryId) ?? null;
    const recipient = testTo ?? u.email;
    const subject = counts.attention > 0
      ? `Cellar brief — ${counts.attention} vessel${counts.attention === 1 ? "" : "s"} need your eye this week`
      : `Cellar brief — Monday, ${cards.length} vessels tracked`;
    const html = renderHtml(userName, wineryName, cards, counts, enrichments);
    const text = renderText(userName, wineryName, cards, counts, enrichments);
    const senderDisplay = wineryName ? `Owen · ${wineryName}` : fromName;

    if (dryRun || !resend) {
      console.log(`[weekly-cellar-digest] DRY-RUN would send to ${recipient} as "${senderDisplay}": ${subject} (${cards.length} cards)`);
      results.push({ userId: u.id, email: recipient, wineryId: u.wineryId, cardCount: cards.length, status: "dry_run" });
      continue;
    }

    try {
      const send = await resend.emails.send({
        from: `${senderDisplay} <${fromEmail}>`,
        to: [recipient],
        ...(replyTo ? { replyTo } : {}),
        subject,
        html,
        text,
      });
      if (send.error) throw new Error(send.error.message ?? "Resend send failed");
      results.push({
        userId: u.id,
        email: recipient,
        wineryId: u.wineryId,
        cardCount: cards.length,
        status: "sent",
        resendId: send.data?.id,
      });
      console.log(`[weekly-cellar-digest] sent to ${recipient} (id=${send.data?.id}, cards=${cards.length})`);
    } catch (err) {
      const msg = err instanceof Error ? err.message : String(err);
      results.push({ userId: u.id, email: recipient, wineryId: u.wineryId, cardCount: cards.length, status: "error", error: msg });
      console.error(`[weekly-cellar-digest] FAILED for ${recipient}: ${msg}`);
    }
  }

  const summary = {
    ranAt: new Date().toISOString(),
    dryRun,
    fromEmail,
    testToOverride: testTo,
    totals: {
      users: users.length,
      sent: results.filter((r) => r.status === "sent").length,
      dryRun: results.filter((r) => r.status === "dry_run").length,
      skippedNoWinery: results.filter((r) => r.status === "skipped_no_winery").length,
      skippedNoEmail: results.filter((r) => r.status === "skipped_no_email").length,
      skippedEmptyCellar: results.filter((r) => r.status === "skipped_empty_cellar").length,
      errors: results.filter((r) => r.status === "error").length,
    },
    results,
  };
  res.json(summary);
}
