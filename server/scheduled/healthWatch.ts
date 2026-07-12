/**
 * Health Watch — /api/scheduled/health-watch
 *
 * Near-real-time companion to the daily health-digest. Runs the same probe
 * set every ~15 min (Railway cron), diffs against the last-known state
 * persisted in `health_probe_state`, and fires an IMMEDIATE Resend email
 * whenever any probe transitions OK/WARN/SKIP → FAIL (or FAIL → OK for
 * recovery notifications).
 *
 * Design notes:
 *   - State is DB-persisted (not in-memory) so pod restarts / redeploys
 *     don't cause spurious "just failed" alerts.
 *   - Alerts fire only on TRANSITION. A probe that stays FAIL across
 *     runs sends exactly one email (until it recovers or another
 *     probe changes).
 *   - `lastAlertedAt` prevents duplicate alerts if the watcher runs
 *     twice inside a suppression window (default 30 min) while state
 *     hasn't yet settled.
 *   - Recovery emails (FAIL → OK/WARN) are sent so Rich knows when a
 *     system self-heals — no need to check the daily digest.
 *   - Recipient list = ADMIN_EMAILS (same as daily digest).
 *   - Same CRON_SECRET header contract as other scheduled endpoints.
 *
 * Query params:
 *   ?send=1            — actually send email (default: dry-run JSON only)
 *   ?force=1           — force alert even if lastAlertedAt is recent
 *
 * Suggested Railway cron: `*​/15 * * * *` (every 15 min, UTC).
 */
import type { Request, Response } from "express";
import { Resend } from "resend";
import { eq } from "drizzle-orm";
import { db } from "../db.js";
import { healthProbeState } from "../../drizzle/schema.js";
import {
  runAllProbes,
  STATUS_LABEL,
  type Probe,
  type ProbeStatus,
} from "./healthDigest.js";

const SUPPRESSION_WINDOW_MS = 30 * 60 * 1000; // 30 min — no re-alerts inside this window

type Transition = {
  probe: Probe;
  previous: ProbeStatus | null;
  current: ProbeStatus;
  kind: "failure" | "recovery";
};

function isFailure(s: ProbeStatus): boolean {
  return s === "fail";
}
function isHealthy(s: ProbeStatus): boolean {
  return s === "ok" || s === "warn" || s === "skip";
}

function renderAlertHtml(transitions: Transition[], generatedAt: Date): string {
  const rows = transitions
    .map((t) => {
      const badge =
        t.kind === "failure"
          ? '<span style="display:inline-block;padding:3px 9px;border-radius:3px;background:#b91c1c;color:#fff;font-family:\'Courier New\',monospace;font-size:11px;font-weight:700;letter-spacing:0.08em;">JUST FAILED</span>'
          : '<span style="display:inline-block;padding:3px 9px;border-radius:3px;background:#4a7c47;color:#fff;font-family:\'Courier New\',monospace;font-size:11px;font-weight:700;letter-spacing:0.08em;">RECOVERED</span>';
      const arrow = `${t.previous ? STATUS_LABEL[t.previous] : "—"} → ${STATUS_LABEL[t.current]}`;
      return `
    <tr>
      <td style="padding:12px 14px;border-top:1px solid #eee5d3;vertical-align:top;">
        ${badge}
        <div style="font-family:Georgia,serif;font-weight:600;color:#1a1210;margin-top:8px;font-size:16px;">${t.probe.name}</div>
        <div style="font-family:'Courier New',monospace;font-size:12px;color:#6b5c50;margin-top:2px;">${arrow}</div>
        <div style="font-family:Arial,sans-serif;font-size:13px;color:#3a2f28;margin-top:8px;">${t.probe.detail}</div>
        ${t.probe.hint ? `<div style="font-family:Arial,sans-serif;font-size:12px;color:#6b5c50;margin-top:6px;font-style:italic;">→ ${t.probe.hint}</div>` : ""}
      </td>
    </tr>`;
    })
    .join("");

  const failures = transitions.filter((t) => t.kind === "failure").length;
  const recoveries = transitions.filter((t) => t.kind === "recovery").length;
  const headline =
    failures > 0
      ? failures === 1
        ? "1 probe just FAILED"
        : `${failures} probes just FAILED`
      : `${recoveries} probe${recoveries === 1 ? "" : "s"} RECOVERED`;
  const headlineColor = failures > 0 ? "#b91c1c" : "#4a7c47";

  return `<!DOCTYPE html><html><body style="margin:0;padding:0;background:#f6f1ea;font-family:Arial,sans-serif;">
  <table role="presentation" width="100%" cellspacing="0" cellpadding="0" border="0" style="background:#f6f1ea;padding:24px 12px;">
    <tr><td align="center">
      <table role="presentation" width="580" cellspacing="0" cellpadding="0" border="0" style="max-width:580px;background:#fff;border:1px solid #eee5d3;border-radius:6px;overflow:hidden;">
        <tr><td style="padding:20px 24px;border-bottom:1px solid #eee5d3;">
          <div style="font-family:Georgia,serif;font-size:11px;letter-spacing:0.14em;text-transform:uppercase;color:#B0741A;font-weight:700;">Ownology · Health Alert</div>
          <div style="font-family:Georgia,serif;font-size:22px;font-weight:600;color:${headlineColor};margin-top:6px;">${headline}</div>
          <div style="font-family:Arial,sans-serif;font-size:12px;color:#6b5c50;margin-top:4px;">${generatedAt.toISOString()}</div>
        </td></tr>
        <tr><td><table role="presentation" width="100%" cellspacing="0" cellpadding="0" border="0">${rows}</table></td></tr>
        <tr><td style="padding:14px 24px;border-top:1px solid #eee5d3;background:#fbf3e4;font-family:Arial,sans-serif;font-size:11px;color:#8a7565;">
          Fires on any probe status transition. Runs every 15 min. Full daily digest: <code>/api/scheduled/health-digest</code>. — Owen.
        </td></tr>
      </table>
    </td></tr>
  </table></body></html>`;
}

export async function healthWatchHandler(req: Request, res: Response): Promise<void> {
  const shouldSend = req.query.send === "1";
  const force = req.query.force === "1";
  const cronSecret = process.env.CRON_SECRET?.trim() || null;
  const providedSecret =
    (req.headers["x-cron-secret"] as string | undefined)?.trim() ??
    (req.query.cronSecret as string | undefined)?.trim() ??
    null;
  const secretOk = cronSecret === null || providedSecret === cronSecret;

  const now = new Date();
  const nowMs = now.getTime();
  const probes = await runAllProbes();

  // Load previous state
  const previousRows = await db.select().from(healthProbeState);
  const previousByName = new Map<string, typeof previousRows[number]>();
  for (const row of previousRows) previousByName.set(row.probeName, row);

  const transitions: Transition[] = [];
  const stateWrites: Array<Promise<unknown>> = [];

  for (const probe of probes) {
    const prev = previousByName.get(probe.name);
    const prevStatus = prev?.lastStatus ?? null;
    const curStatus = probe.status;

    const isTransition = prevStatus !== null && prevStatus !== curStatus;
    const isFirstSeen = prevStatus === null;
    const transitionAt = isTransition || isFirstSeen ? nowMs : (prev?.lastTransitionedAt ?? nowMs);

    // Detect alertable transitions:
    //   - failure: current is fail AND previous was healthy (or first-seen fail)
    //   - recovery: current is healthy AND previous was fail
    let alertKind: "failure" | "recovery" | null = null;
    if (isFailure(curStatus) && (prevStatus === null || isHealthy(prevStatus))) alertKind = "failure";
    if (isHealthy(curStatus) && prevStatus !== null && isFailure(prevStatus)) alertKind = "recovery";

    // Suppression: skip if we already alerted for this probe inside the window
    // and status hasn't moved again. `force=1` bypasses.
    const withinSuppression =
      !force && prev?.lastAlertedAt && nowMs - prev.lastAlertedAt < SUPPRESSION_WINDOW_MS && !isTransition;

    if (alertKind && !withinSuppression) {
      transitions.push({ probe, previous: prevStatus, current: curStatus, kind: alertKind });
    }

    // Persist current observation. Update `lastAlertedAt` only when we
    // actually push a transition into the list (email may still be
    // skipped in dry-run mode — that's fine, the intent is captured).
    const willAlert = Boolean(alertKind && !withinSuppression);
    if (prev) {
      stateWrites.push(
        db
          .update(healthProbeState)
          .set({
            lastStatus: curStatus,
            lastDetail: probe.detail,
            lastCheckedAt: nowMs,
            lastTransitionedAt: transitionAt,
            lastAlertedAt: willAlert && shouldSend ? nowMs : prev.lastAlertedAt,
          })
          .where(eq(healthProbeState.probeName, probe.name)),
      );
    } else {
      stateWrites.push(
        db.insert(healthProbeState).values({
          probeName: probe.name,
          lastStatus: curStatus,
          lastDetail: probe.detail,
          lastCheckedAt: nowMs,
          lastTransitionedAt: nowMs,
          lastAlertedAt: willAlert && shouldSend ? nowMs : null,
        }),
      );
    }
  }
  await Promise.all(stateWrites);

  const summary = {
    generatedAt: now.toISOString(),
    checked: probes.length,
    transitions: transitions.map((t) => ({
      probe: t.probe.name,
      previous: t.previous,
      current: t.current,
      kind: t.kind,
      detail: t.probe.detail,
    })),
    emailed: false as boolean | string,
  };

  if (transitions.length === 0) {
    summary.emailed = "no_transitions";
    res.json(summary);
    return;
  }

  if (!shouldSend) {
    summary.emailed = "dry_run";
    res.json(summary);
    return;
  }

  if (!secretOk) {
    summary.emailed = "skipped_secret_mismatch";
    res.json(summary);
    return;
  }

  const apiKey = process.env.RESEND_API_KEY?.trim();
  const fromEmail = process.env.ALERT_FROM_EMAIL?.trim();
  const fromName = process.env.ALERT_FROM_NAME?.trim() ?? "Ownology Health";
  const adminEmails = (process.env.ADMIN_EMAILS ?? "")
    .split(",")
    .map((s) => s.trim())
    .filter(Boolean);

  if (!apiKey || !fromEmail || adminEmails.length === 0) {
    summary.emailed = "skipped_no_config";
    res.json(summary);
    return;
  }

  const failures = transitions.filter((t) => t.kind === "failure");
  const recoveries = transitions.filter((t) => t.kind === "recovery");
  const subject =
    failures.length > 0
      ? failures.length === 1
        ? `[Ownology ALERT] ${failures[0].probe.name} just failed`
        : `[Ownology ALERT] ${failures.length} probes just failed`
      : `[Ownology] ${recoveries.length} probe${recoveries.length === 1 ? "" : "s"} recovered`;

  try {
    const resend = new Resend(apiKey);
    const send = await resend.emails.send({
      from: `${fromName} <${fromEmail}>`,
      to: adminEmails,
      subject,
      html: renderAlertHtml(transitions, now),
      text: transitions
        .map(
          (t) =>
            `[${t.kind.toUpperCase()}] ${t.probe.name}: ${t.previous ?? "—"} → ${t.current} · ${t.probe.detail}${
              t.probe.hint ? ` — ${t.probe.hint}` : ""
            }`,
        )
        .join("\n"),
    });
    if (send.error) throw new Error(send.error.message ?? "send failed");
    summary.emailed = send.data?.id ?? "sent";
  } catch (err) {
    summary.emailed = `error: ${err instanceof Error ? err.message : String(err)}`;
  }

  res.json(summary);
}
