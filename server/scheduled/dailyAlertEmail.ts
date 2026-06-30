/**
 * Daily Alert Email — /api/scheduled/daily-alert-email
 *
 * Fires once per day at 7am Australia/Sydney (configure via Railway cron).
 * For every user with active cellar alerts, sends a morning briefing email
 * via Resend ("Good morning — Tank 9 Shiraz needs DAP today, Tank 5 is hot…").
 *
 * Why this is the killer feature: the "AI assistant who actually walks the
 * cellar with you" moment. Drives daily app opens. Pure leverage on data we
 * already collect — zero extra LLM cost, no new schema, no extra polling.
 *
 * Env vars consumed:
 *   RESEND_API_KEY     — required to actually send. If missing, the cron
 *                        logs what it WOULD send and returns 200 (dry-run).
 *   ALERT_FROM_EMAIL   — sender, e.g. "onboarding@resend.dev" (free tier
 *                        default) or "cellar@ownology.ai" once domain verified.
 *   ALERT_FROM_NAME    — sender display name (default: "Ownology Cellar Brief").
 *   ALERT_TEST_TO      — optional override. If set, ALL emails go to this
 *                        address (useful while Resend is in sandbox mode, which
 *                        only delivers to your account email).
 *   CRON_SECRET        — optional. If set, live sends require either header
 *                        `x-cron-secret: <value>` or `?cronSecret=<value>`.
 *                        Dry-runs stay open. Strongly recommended in prod.
 *
 * Value-engineering check: 4/5 — reuses computeAlertsForUser(), no new LLM,
 * no DB writes (we don't persist the email; Resend dashboard has the history).
 */

import type { Request, Response } from "express";
import { Resend } from "resend";
import { db } from "../db.js";
import * as schema from "../../drizzle/schema.js";
import { computeAlertsForUser, type Alert } from "../routers/vintageLog.js";

type EmailResult = {
  userId: number;
  email: string;
  alerts: number;
  status: "sent" | "skipped_no_alerts" | "skipped_no_email" | "dry_run" | "error";
  resendId?: string;
  error?: string;
};

const SEVERITY_COLOR: Record<Alert["severity"], string> = {
  high: "#b91c1c",
  medium: "#b45309",
  low: "#374151",
};

const SEVERITY_LABEL: Record<Alert["severity"], string> = {
  high: "URGENT",
  medium: "ATTENTION",
  low: "FYI",
};

/** Plain-text rendering for the multipart text/plain fallback. */
function renderText(userName: string, alerts: Alert[]): string {
  const lines: string[] = [];
  lines.push(`Good morning, ${userName}.`);
  lines.push("");
  lines.push(`Today's cellar brief — ${alerts.length} alert${alerts.length === 1 ? "" : "s"}:`);
  lines.push("");
  for (const a of alerts) {
    lines.push(`[${SEVERITY_LABEL[a.severity]}] ${a.title}`);
    lines.push(`  ${a.detail}`);
    lines.push(`  → ${a.action}`);
    lines.push("");
  }
  lines.push("Open Ownology: https://ownology.ai/dashboard");
  lines.push("");
  lines.push("— Ownology");
  return lines.join("\n");
}

/** HTML rendering. Inline CSS only — email clients strip <style> blocks. */
function renderHtml(userName: string, alerts: Alert[]): string {
  const rows = alerts
    .map((a) => {
      const color = SEVERITY_COLOR[a.severity];
      const label = SEVERITY_LABEL[a.severity];
      return `
        <tr>
          <td style="padding:14px 16px;border-bottom:1px solid #e5e7eb;vertical-align:top;">
            <div style="font-family:Arial,sans-serif;font-size:11px;letter-spacing:1.5px;color:${color};font-weight:700;text-transform:uppercase;margin-bottom:4px;">
              ${label}
            </div>
            <div style="font-family:Georgia,serif;font-size:18px;color:#111827;font-weight:600;margin-bottom:6px;">
              ${escapeHtml(a.title)}
            </div>
            <div style="font-family:Arial,sans-serif;font-size:14px;color:#374151;line-height:1.5;margin-bottom:8px;">
              ${escapeHtml(a.detail)}
            </div>
            <div style="font-family:Arial,sans-serif;font-size:13px;color:#7c2d12;background:#fef3c7;display:inline-block;padding:6px 10px;border-radius:3px;">
              → ${escapeHtml(a.action)}
            </div>
          </td>
        </tr>`;
    })
    .join("");

  return `<!doctype html>
<html><head><meta charset="utf-8"><title>Cellar Brief</title></head>
<body style="margin:0;padding:0;background:#f9fafb;font-family:Arial,sans-serif;">
  <table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="background:#f9fafb;padding:32px 16px;">
    <tr><td align="center">
      <table role="presentation" width="600" cellpadding="0" cellspacing="0" style="max-width:600px;background:#ffffff;border-radius:6px;overflow:hidden;border:1px solid #e5e7eb;">
        <tr><td style="padding:24px 24px 0;">
          <div style="font-family:Arial,sans-serif;font-size:11px;letter-spacing:2px;color:#b45309;text-transform:uppercase;font-weight:700;margin-bottom:8px;">Cellar Brief · ${new Date().toLocaleDateString("en-AU", { weekday: "long", day: "numeric", month: "long", timeZone: "Australia/Sydney" })}</div>
          <h1 style="font-family:Georgia,serif;font-size:28px;color:#111827;margin:0 0 6px;line-height:1.2;">Good morning, ${escapeHtml(userName)}.</h1>
          <p style="font-family:Arial,sans-serif;font-size:14px;color:#6b7280;margin:0 0 20px;">Here's what needs your attention in the cellar today — ${alerts.length} alert${alerts.length === 1 ? "" : "s"}.</p>
        </td></tr>
        <tr><td style="padding:0 8px;">
          <table role="presentation" width="100%" cellpadding="0" cellspacing="0">
            ${rows}
          </table>
        </td></tr>
        <tr><td style="padding:24px;text-align:center;">
          <a href="https://ownology.ai/dashboard" style="display:inline-block;background:#b45309;color:#ffffff;text-decoration:none;font-family:Arial,sans-serif;font-size:14px;font-weight:600;padding:12px 28px;border-radius:4px;letter-spacing:0.5px;">Open Ownology dashboard →</a>
        </td></tr>
        <tr><td style="padding:0 24px 24px;text-align:center;">
          <p style="font-family:Arial,sans-serif;font-size:12px;color:#9ca3af;margin:0;">You're receiving this because cellar alerts are enabled for your account.<br>Reply STOP to disable.</p>
        </td></tr>
      </table>
    </td></tr>
  </table>
</body></html>`;
}

function escapeHtml(s: string): string {
  return s.replace(/[&<>"']/g, (c) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" }[c]!));
}

export async function dailyAlertEmailHandler(req: Request, res: Response): Promise<void> {
  const apiKey = process.env.RESEND_API_KEY;
  const fromEmail = process.env.ALERT_FROM_EMAIL ?? "onboarding@resend.dev";
  const fromName = process.env.ALERT_FROM_NAME ?? "Ownology Cellar Brief";
  const testTo = process.env.ALERT_TEST_TO?.trim() || null;
  const cronSecret = process.env.CRON_SECRET?.trim() || null;
  const providedSecret = (req.headers["x-cron-secret"] as string | undefined)?.trim()
    ?? (req.query.cronSecret as string | undefined)?.trim()
    ?? null;

  // Live sends require either no CRON_SECRET configured (dev convenience) or
  // a matching header/query. Dry-runs stay open so the cellar team can poll
  // safely without burning Resend quota.
  const dryRunRequested = req.query.dryRun === "1" || !apiKey;
  const secretRequired = cronSecret !== null;
  const secretOk = !secretRequired || providedSecret === cronSecret;
  const dryRun = dryRunRequested || !secretOk;

  if (!secretOk && !dryRunRequested) {
    console.warn("[daily-alert-email] CRON_SECRET mismatch — downgrading to dry-run.");
  }

  const resend = apiKey ? new Resend(apiKey) : null;
  const results: EmailResult[] = [];

  // Pull every user. v1 = single-tenant so this is fine; when multi-tenant,
  // filter to users who have opted in.
  const users = await db.select().from(schema.users);
  console.log(`[daily-alert-email] starting — ${users.length} user(s), dryRun=${dryRun}`);

  for (const u of users) {
    if (!u.email) {
      results.push({ userId: u.id, email: "", alerts: 0, status: "skipped_no_email" });
      continue;
    }
    const alerts = await computeAlertsForUser(u.id, u.wineryId ?? null);
    if (alerts.length === 0) {
      results.push({ userId: u.id, email: u.email, alerts: 0, status: "skipped_no_alerts" });
      continue;
    }

    const userName = u.name ?? "winemaker";
    const recipient = testTo ?? u.email;
    const subject = `Cellar brief — ${alerts.length} alert${alerts.length === 1 ? "" : "s"} this morning`;
    const html = renderHtml(userName, alerts);
    const text = renderText(userName, alerts);

    if (dryRun || !resend) {
      console.log(`[daily-alert-email] DRY-RUN would send to ${recipient}: ${subject}`);
      results.push({ userId: u.id, email: recipient, alerts: alerts.length, status: "dry_run" });
      continue;
    }

    try {
      const send = await resend.emails.send({
        from: `${fromName} <${fromEmail}>`,
        to: [recipient],
        subject,
        html,
        text,
      });
      if (send.error) throw new Error(send.error.message ?? "Resend send failed");
      results.push({
        userId: u.id,
        email: recipient,
        alerts: alerts.length,
        status: "sent",
        resendId: send.data?.id,
      });
      console.log(`[daily-alert-email] sent to ${recipient} (id=${send.data?.id}, alerts=${alerts.length})`);
    } catch (err) {
      const msg = err instanceof Error ? err.message : String(err);
      results.push({ userId: u.id, email: recipient, alerts: alerts.length, status: "error", error: msg });
      console.error(`[daily-alert-email] FAILED for ${recipient}: ${msg}`);
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
      skippedNoAlerts: results.filter((r) => r.status === "skipped_no_alerts").length,
      skippedNoEmail: results.filter((r) => r.status === "skipped_no_email").length,
      errors: results.filter((r) => r.status === "error").length,
    },
    results,
  };
  res.json(summary);
}
