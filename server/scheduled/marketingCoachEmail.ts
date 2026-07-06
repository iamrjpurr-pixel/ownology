/**
 * Marketing Coach Email — /api/scheduled/marketing-coach-email
 *
 * Fires once per day at 7am Australia/Sydney (configure via Railway cron).
 * Sends Rich a morning briefing containing:
 *   - The AI Coach one-liner (Claude Sonnet, cached once per Sydney day)
 *   - Season + cold-outreach gate label
 *   - Remaining tasks for today (daily + this weekday's weekly tasks)
 *
 * Why this exists: the /admin/marketing-ops dashboard is a PULL surface; this
 * pushes the same signal to Rich's inbox with morning coffee. Same shared
 * `getOrCreateCoachLine()` helper as the tRPC endpoint — cost-neutral (one
 * LLM call per Sydney calendar day regardless of how many surfaces read it).
 *
 * Env vars consumed:
 *   RESEND_API_KEY               — required to actually send. If missing, dry-run.
 *   MARKETING_COACH_TO_EMAIL     — recipient (defaults to ALERT_TEST_TO, then
 *                                  onboarding-email fallback ALERT_TEST_TO).
 *   ALERT_FROM_EMAIL             — sender (default onboarding@resend.dev).
 *   MARKETING_COACH_FROM_NAME    — display name (default "Ownology Marketing Coach").
 *   ALERT_REPLY_TO               — optional Reply-To.
 *   CRON_SECRET                  — optional shared secret required for live sends.
 *   APP_BASE_URL                 — dashboard link base (default https://ownology.ai).
 */

import type { Request, Response } from "express";
import { Resend } from "resend";
import { getOrCreateCoachLine, getTodayFocusSnapshot } from "../routers/marketingOps.js";

const CATEGORY_LABEL: Record<string, string> = {
  warm_reach: "Warm reach",
  pipeline: "Pipeline",
  cold_reach: "Cold reach",
  content: "Content",
  review: "Review",
  product: "Product",
};

const COLD_GATE_LABEL: Record<string, string> = {
  peak: "Peak send window",
  ok: "OK to send",
  avoid: "Avoid cold",
  pause: "Pause cold outreach",
};

const COLD_GATE_COLOR: Record<string, string> = {
  peak: "#059669",
  ok: "#b45309",
  avoid: "#c2410c",
  pause: "#b91c1c",
};

function escapeHtml(s: string): string {
  return s.replace(/[&<>"']/g, (c) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" }[c]!));
}

function renderText(coachLine: string, snapshot: Awaited<ReturnType<typeof getTodayFocusSnapshot>>): string {
  const lines: string[] = [];
  lines.push("Good morning, Rich.");
  lines.push("");
  lines.push(`${snapshot.season.label} · ${COLD_GATE_LABEL[snapshot.season.coldGate]}`);
  lines.push("");
  lines.push("COACH LINE:");
  lines.push(coachLine);
  lines.push("");
  if (snapshot.tasks.length === 0) {
    lines.push("All of today's tasks are already ticked. Enjoy the quiet.");
  } else {
    lines.push(`TODAY'S FOCUS (${snapshot.tasks.length} open):`);
    lines.push("");
    for (const t of snapshot.tasks) {
      const flags: string[] = [`${t.estimateMin} min`];
      if (t.timeHint) flags.push(t.timeHint);
      if (t.blocked) flags.push("BLOCKED — off-season");
      lines.push(`• ${t.title}  (${flags.join(" · ")})`);
      lines.push(`  ${t.why}`);
      if (t.quickLink) lines.push(`  → ${t.quickLink}`);
      lines.push("");
    }
  }
  lines.push("Open Marketing Ops: " + (process.env.APP_BASE_URL ?? "https://ownology.ai") + "/admin/marketing-ops");
  lines.push("");
  lines.push("— Ownology Marketing Coach");
  return lines.join("\n");
}

function renderHtml(coachLine: string, snapshot: Awaited<ReturnType<typeof getTodayFocusSnapshot>>): string {
  const base = process.env.APP_BASE_URL ?? "https://ownology.ai";
  const gateColor = COLD_GATE_COLOR[snapshot.season.coldGate] ?? "#374151";

  const taskRows = snapshot.tasks
    .map((t) => {
      const flags = [`${t.estimateMin} min`];
      if (t.timeHint) flags.push(escapeHtml(t.timeHint));
      if (t.blocked) flags.push('<span style="color:#b91c1c;font-weight:600;">BLOCKED — off-season</span>');
      const cat = CATEGORY_LABEL[t.category] ?? t.category;
      const link = t.quickLink
        ? `<div style="margin-top:6px;"><a href="${base}${t.quickLink}" style="font-family:Arial,sans-serif;font-size:12px;color:#b45309;text-decoration:none;">${escapeHtml(t.quickLink)} →</a></div>`
        : "";
      return `
        <tr>
          <td style="padding:14px 16px;border-bottom:1px solid #e5e7eb;vertical-align:top;">
            <div style="font-family:Arial,sans-serif;font-size:11px;letter-spacing:1.5px;color:#6b7280;font-weight:700;text-transform:uppercase;margin-bottom:4px;">
              ${escapeHtml(cat)} · ${flags.join(" · ")}
            </div>
            <div style="font-family:Georgia,serif;font-size:17px;color:#111827;font-weight:600;margin-bottom:4px;">
              ${escapeHtml(t.title)}
            </div>
            <div style="font-family:Arial,sans-serif;font-size:13px;color:#4b5563;line-height:1.5;">
              ${escapeHtml(t.why)}
            </div>
            ${link}
          </td>
        </tr>`;
    })
    .join("");

  const emptyRow = `
    <tr><td style="padding:20px 16px;font-family:Arial,sans-serif;font-size:14px;color:#6b7280;text-align:center;">
      All of today&apos;s tasks are already ticked. Enjoy the quiet.
    </td></tr>`;

  const todayLabel = new Date().toLocaleDateString("en-AU", {
    weekday: "long",
    day: "numeric",
    month: "long",
    timeZone: "Australia/Sydney",
  });

  return `<!doctype html>
<html><head><meta charset="utf-8"><title>Marketing Coach</title></head>
<body style="margin:0;padding:0;background:#f9fafb;font-family:Arial,sans-serif;">
  <table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="background:#f9fafb;padding:32px 16px;">
    <tr><td align="center">
      <table role="presentation" width="600" cellpadding="0" cellspacing="0" style="max-width:600px;background:#ffffff;border-radius:6px;overflow:hidden;border:1px solid #e5e7eb;">
        <tr><td style="padding:24px 24px 0;">
          <div style="font-family:Arial,sans-serif;font-size:11px;letter-spacing:2px;color:#b45309;text-transform:uppercase;font-weight:700;margin-bottom:8px;">Marketing Coach · ${todayLabel}</div>
          <h1 style="font-family:Georgia,serif;font-size:26px;color:#111827;margin:0 0 8px;line-height:1.2;">Good morning, Rich.</h1>
          <div style="font-family:Arial,sans-serif;font-size:13px;color:${gateColor};font-weight:600;margin-bottom:20px;">
            ${escapeHtml(snapshot.season.label)} · ${escapeHtml(COLD_GATE_LABEL[snapshot.season.coldGate] ?? "")}
          </div>
        </td></tr>
        <tr><td style="padding:0 24px 20px;">
          <div style="background:#fef3c7;border-left:3px solid #b45309;padding:14px 16px;border-radius:3px;">
            <div style="font-family:Arial,sans-serif;font-size:10px;letter-spacing:1.5px;color:#78350f;font-weight:700;text-transform:uppercase;margin-bottom:6px;">AI Coach — one line, today</div>
            <div style="font-family:Georgia,serif;font-size:17px;color:#1f2937;line-height:1.4;">
              ${escapeHtml(coachLine)}
            </div>
          </div>
        </td></tr>
        <tr><td style="padding:0 24px 8px;">
          <div style="font-family:Arial,sans-serif;font-size:11px;letter-spacing:1.5px;color:#6b7280;font-weight:700;text-transform:uppercase;">Today&apos;s focus (${snapshot.tasks.length})</div>
        </td></tr>
        <tr><td style="padding:0 8px;">
          <table role="presentation" width="100%" cellpadding="0" cellspacing="0">
            ${snapshot.tasks.length === 0 ? emptyRow : taskRows}
          </table>
        </td></tr>
        <tr><td style="padding:24px;text-align:center;">
          <a href="${base}/admin/marketing-ops" style="display:inline-block;background:#b45309;color:#ffffff;text-decoration:none;font-family:Arial,sans-serif;font-size:14px;font-weight:600;padding:12px 28px;border-radius:4px;letter-spacing:0.5px;">Open Marketing Ops →</a>
        </td></tr>
        <tr><td style="padding:0 24px 24px;text-align:center;">
          <p style="font-family:Arial,sans-serif;font-size:12px;color:#9ca3af;margin:0;">Same coach line, same cache — pushed to your inbox at 07:00 Sydney.<br>Reply STOP to disable.</p>
        </td></tr>
      </table>
    </td></tr>
  </table>
</body></html>`;
}

export async function marketingCoachEmailHandler(req: Request, res: Response): Promise<void> {
  const apiKey = process.env.RESEND_API_KEY;
  const fromEmail = process.env.ALERT_FROM_EMAIL ?? "onboarding@resend.dev";
  const fromName = process.env.MARKETING_COACH_FROM_NAME ?? "Ownology Marketing Coach";
  const replyTo = process.env.ALERT_REPLY_TO?.trim() || null;
  const toEmail =
    process.env.MARKETING_COACH_TO_EMAIL?.trim() ||
    process.env.ALERT_TEST_TO?.trim() ||
    null;
  const cronSecret = process.env.CRON_SECRET?.trim() || null;
  const providedSecret =
    (req.headers["x-cron-secret"] as string | undefined)?.trim() ??
    (req.query.cronSecret as string | undefined)?.trim() ??
    null;

  const dryRunRequested = req.query.dryRun === "1" || !apiKey || !toEmail;
  const secretRequired = cronSecret !== null;
  const secretOk = !secretRequired || providedSecret === cronSecret;
  const dryRun = dryRunRequested || !secretOk;

  if (!secretOk && !dryRunRequested) {
    console.warn("[marketing-coach-email] CRON_SECRET mismatch — downgrading to dry-run.");
  }

  const now = new Date();
  const [coach, snapshot] = await Promise.all([getOrCreateCoachLine(now), getTodayFocusSnapshot(now)]);
  const subject = `Marketing Coach — ${snapshot.season.label} · ${snapshot.tasks.length} focus item${snapshot.tasks.length === 1 ? "" : "s"}`;
  const html = renderHtml(coach.line, snapshot);
  const text = renderText(coach.line, snapshot);

  if (dryRun) {
    console.log(`[marketing-coach-email] DRY-RUN (to=${toEmail ?? "unset"}, coachCached=${coach.cached}, tasks=${snapshot.tasks.length})`);
    res.json({
      ranAt: now.toISOString(),
      dryRun: true,
      reason: !apiKey ? "no RESEND_API_KEY" : !toEmail ? "no MARKETING_COACH_TO_EMAIL / ALERT_TEST_TO" : !secretOk ? "CRON_SECRET mismatch" : "dryRun=1",
      preview: { subject, coachLine: coach.line, coachCached: coach.cached, tasks: snapshot.tasks.length, textPreview: text.split("\n").slice(0, 20).join("\n") },
    });
    return;
  }

  try {
    const resend = new Resend(apiKey!);
    const send = await resend.emails.send({
      from: `${fromName} <${fromEmail}>`,
      to: [toEmail!],
      ...(replyTo ? { replyTo } : {}),
      subject,
      html,
      text,
    });
    if (send.error) throw new Error(send.error.message ?? "Resend send failed");
    console.log(`[marketing-coach-email] sent to ${toEmail} (id=${send.data?.id}, tasks=${snapshot.tasks.length}, cached=${coach.cached})`);
    res.json({
      ranAt: now.toISOString(),
      dryRun: false,
      sent: true,
      to: toEmail,
      subject,
      coachLine: coach.line,
      coachCached: coach.cached,
      tasks: snapshot.tasks.length,
      resendId: send.data?.id,
    });
  } catch (err) {
    const msg = err instanceof Error ? err.message : String(err);
    console.error(`[marketing-coach-email] FAILED: ${msg}`);
    res.status(500).json({ ranAt: now.toISOString(), sent: false, error: msg });
  }
}
