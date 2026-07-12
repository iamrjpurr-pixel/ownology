/**
 * Resend Health Check — /api/scheduled/resend-health
 *
 * Answers three questions in one JSON response:
 *   1. What's the current Resend env config on THIS environment?
 *   2. Is the API key valid + which domains are verified?
 *   3. If ?to=<email> is provided, attempt a real test send.
 *
 * Prevents the silent-failure trap: users flag "the weekly digest didn't
 * arrive" days after the fact and nobody knows whether the send even left
 * the building. This endpoint gives a one-URL verdict.
 *
 * Owner-triggerable via query param cronSecret or matching CRON_SECRET
 * header — same convention as the other scheduled endpoints.
 */
import type { Request, Response } from "express";
import { Resend } from "resend";

export async function resendHealthHandler(req: Request, res: Response): Promise<void> {
  const apiKey = process.env.RESEND_API_KEY?.trim() || null;
  const fromEmail = process.env.ALERT_FROM_EMAIL?.trim() || null;
  const fromName = process.env.ALERT_FROM_NAME?.trim() || "Ownology";
  const replyTo = process.env.ALERT_REPLY_TO?.trim() || null;
  const testTo = process.env.ALERT_TEST_TO?.trim() || null;
  const cronSecret = process.env.CRON_SECRET?.trim() || null;
  const providedSecret =
    (req.headers["x-cron-secret"] as string | undefined)?.trim() ??
    (req.query.cronSecret as string | undefined)?.trim() ??
    null;

  // Cheap public dry-report OR authenticated live-probe. If no CRON_SECRET
  // is set anywhere, allow the probe (dev convenience). If it IS set,
  // require the matching header/query for the domain-list + send phases.
  const secretRequired = cronSecret !== null;
  const secretOk = !secretRequired || providedSecret === cronSecret;

  // ── Phase 1 · Env-config report (always safe to expose) ──────────
  const envReport = {
    RESEND_API_KEY: apiKey ? `${apiKey.slice(0, 7)}…${apiKey.slice(-4)} (${apiKey.length} chars)` : "MISSING",
    ALERT_FROM_EMAIL: fromEmail ?? "MISSING",
    ALERT_FROM_NAME: fromName,
    ALERT_REPLY_TO: replyTo ?? "(not set)",
    ALERT_TEST_TO: testTo ? `${testTo} · ⚠️ overrides every recipient to this address` : "(not set — production-safe)",
    CRON_SECRET: cronSecret ? `set (${cronSecret.length} chars)` : "(not set)",
    isSandboxSender: fromEmail === "onboarding@resend.dev" || fromEmail?.endsWith("@resend.dev"),
  };

  const warnings: string[] = [];
  if (!apiKey) warnings.push("RESEND_API_KEY is missing — no emails will send.");
  if (!fromEmail) warnings.push("ALERT_FROM_EMAIL is missing — sender defaults to a stub, likely fails.");
  if (envReport.isSandboxSender) {
    warnings.push(
      "Sender is Resend's sandbox (onboarding@resend.dev). In sandbox mode Resend only delivers to email addresses you've verified in the Resend dashboard. Real subscribers will silently NOT receive email until you verify your own domain and switch this to (e.g.) owen@ownology.ai.",
    );
  }
  if (testTo) {
    warnings.push(
      `ALERT_TEST_TO="${testTo}" is set — every scheduled email will be redirected to this address regardless of the intended recipient. Unset this variable on production before enabling any cron.`,
    );
  }

  if (!apiKey) {
    res.json({ ok: false, phase: "env", env: envReport, warnings, domains: null, sendAttempt: null });
    return;
  }

  // ── Phase 2 · Domain verification list (needs valid API key) ──────
  const resend = new Resend(apiKey);
  let domains: unknown = null;
  let domainsError: string | null = null;

  if (secretOk) {
    try {
      const domainList = await resend.domains.list();
      if (domainList.error) throw new Error(domainList.error.message ?? "domains.list failed");
      domains = (domainList.data as unknown as { data?: unknown[] })?.data ?? domainList.data ?? [];
    } catch (err) {
      domainsError = err instanceof Error ? err.message : String(err);
      warnings.push(`domains.list failed: ${domainsError}. Your API key may be revoked or wrong environment.`);
    }
  } else {
    warnings.push("cronSecret not provided or mismatched — skipping domain list and send test.");
  }

  // ── Phase 3 · Optional live send (only when ?to=<email> given) ────
  const testRecipient = (req.query.to as string | undefined)?.trim() ?? null;
  let sendAttempt: unknown = null;

  if (testRecipient && secretOk && fromEmail) {
    try {
      const send = await resend.emails.send({
        from: `${fromName} <${fromEmail}>`,
        to: [testRecipient],
        ...(replyTo ? { replyTo } : {}),
        subject: "Ownology · Resend health check",
        text: `This is a test email from /api/scheduled/resend-health. If you see this, Resend is delivering. Sent ${new Date().toISOString()}.`,
        html: `<p style="font-family:Arial,sans-serif;">This is a test email from <code>/api/scheduled/resend-health</code>.</p><p>If you see this, Resend is delivering.</p><p style="color:#666;font-size:12px;">Sent ${new Date().toISOString()}.</p>`,
      });
      if (send.error) throw new Error(send.error.message ?? "send failed");
      sendAttempt = {
        status: "sent",
        to: testRecipient,
        from: `${fromName} <${fromEmail}>`,
        resendId: send.data?.id,
        note: envReport.isSandboxSender
          ? "Sent via sandbox sender — recipient will only receive if their email is verified in Resend dashboard."
          : "Sent via verified domain — should arrive within seconds.",
      };
    } catch (err) {
      const msg = err instanceof Error ? err.message : String(err);
      sendAttempt = { status: "error", to: testRecipient, error: msg };
    }
  } else if (testRecipient && !secretOk) {
    sendAttempt = { status: "skipped", reason: "cronSecret required to trigger a live send" };
  } else if (testRecipient && !fromEmail) {
    sendAttempt = { status: "skipped", reason: "ALERT_FROM_EMAIL not configured" };
  }

  res.json({
    ok: warnings.length === 0,
    phase: "complete",
    env: envReport,
    warnings,
    domains: domainsError ? { error: domainsError } : domains,
    sendAttempt,
    tips: [
      "Add ?to=you@example.com to trigger a real test send.",
      "If a CRON_SECRET is set, add &cronSecret=<value> or header x-cron-secret to enable domain+send phases.",
      "Warnings above are ordered by severity. Fix them top-down before enabling scheduled crons.",
    ],
  });
}
