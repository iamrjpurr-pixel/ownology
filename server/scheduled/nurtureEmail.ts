/**
 * nurtureEmail.ts — scheduled Resend job for warm referral leads.
 *
 * Runs periodically (recommended: daily via Railway cron POST). Finds every
 * `referrals` row where:
 *   - status = 'pending'          (they clicked but haven't signed up yet)
 *   - referred_email IS NOT NULL  (they gave us their email on /join)
 *   - created_at    <= now - 3d   (we've waited 3 days so we're not spammy)
 *   - nurtured_at   IS NULL       (we haven't emailed them yet)
 *
 * For each match, sends one Resend email:
 *   From:  Ownology on behalf of the referrer's winery
 *   Subject: "{contactName ?? wineryName} thought Ownology might help"
 *   Body:  Personal intro + link back to /join?ref=CODE + one-line
 *          "browse the 236-Q&A journal instead" fallback.
 *
 * Then marks `nurtured_at = now` so we never send twice. If a referrer has
 * neither contactName nor wineryName (shouldn't happen post-migration),
 * the row is skipped, not deleted, so ops can inspect it later.
 *
 * Guarded by CRON_SECRET the same way as dailyAlertEmail. Dry-run allowed
 * (?dryRun=1) so ops can preview the batch without burning Resend quota.
 */
import type { Request, Response } from "express";
import { Resend } from "resend";
import { db } from "../db.js";
import * as schema from "../../drizzle/schema.js";
import { and, eq, isNull, isNotNull, lte } from "drizzle-orm";

const NURTURE_DELAY_MS = 3 * 24 * 60 * 60 * 1000; // 3 days
const PUBLIC_SITE_URL = process.env.PUBLIC_SITE_URL ?? "https://ownology.ai";

type NurtureResult = {
  referralId: number;
  email: string;
  code: string;
  status: "sent" | "dry_run" | "skipped_no_referrer" | "error";
  resendId?: string;
  error?: string;
};

function escapeHtml(s: string): string {
  return s.replace(/[&<>"']/g, (c) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" }[c]!));
}

function renderHtml(opts: { contactName: string | null; wineryName: string; code: string }): string {
  const attribution = opts.contactName ? `${escapeHtml(opts.contactName)} at ${escapeHtml(opts.wineryName)}` : escapeHtml(opts.wineryName);
  const joinUrl = `${PUBLIC_SITE_URL}/join?ref=${encodeURIComponent(opts.code)}`;
  const journalUrl = `${PUBLIC_SITE_URL}/cellar-journal?from=nurture`;
  return `<!doctype html><html><body style="font-family: -apple-system, Segoe UI, Roboto, sans-serif; max-width: 560px; margin: 0 auto; padding: 24px; color: #111827; line-height: 1.55;">
  <p style="font-size: 12px; letter-spacing: 0.12em; text-transform: uppercase; color: #b45309; margin: 0 0 8px;">A quick nudge from a fellow winemaker</p>
  <h1 style="font-family: Georgia, serif; font-size: 22px; margin: 0 0 16px; line-height: 1.3;">${attribution} thought this would help.</h1>
  <p>You clicked ${attribution}'s Ownology invite a few days back but didn't sign up. Totally fine — most winemakers we talk to are heads-down through harvest.</p>
  <p>Here's the short version of what ${opts.contactName ? escapeHtml(opts.contactName) : escapeHtml(opts.wineryName)} finds useful:</p>
  <ul style="padding-left: 20px;">
    <li>A daily <strong>Cellar Brief</strong> at 5:30am — every tank's vintage-log summary + what needs action today.</li>
    <li><strong>Ask Ownology</strong> — 236 winemaker Q&amp;As grounded in real MoreWine and Scott Labs technical manuals.</li>
    <li>One-tap <strong>compliance exports</strong> for Wine Australia LIP audits (or your local regulator).</li>
  </ul>
  <p style="margin: 24px 0;">
    <a href="${joinUrl}" style="display: inline-block; background: #b45309; color: white; padding: 12px 20px; text-decoration: none; border-radius: 6px; font-weight: 700;">Claim your 44-day trial →</a>
  </p>
  <p style="font-size: 14px; color: #4b5563;">
    Not ready? <a href="${journalUrl}" style="color: #78350f;">Just browse the 236-Q&amp;A cellar journal</a> — no signup, no email prompt, forever free.
  </p>
  <p style="font-size: 12px; color: #9ca3af; margin-top: 32px; padding-top: 16px; border-top: 1px solid #e5e7eb;">
    You got this because ${attribution} shared their Ownology invite with you and you left your email on the landing page. We only send one nurture email per referral — no follow-ups after this.
  </p>
</body></html>`;
}

function renderText(opts: { contactName: string | null; wineryName: string; code: string }): string {
  const attribution = opts.contactName ? `${opts.contactName} at ${opts.wineryName}` : opts.wineryName;
  const joinUrl = `${PUBLIC_SITE_URL}/join?ref=${opts.code}`;
  return [
    `${attribution} thought this would help.`,
    ``,
    `You clicked ${attribution}'s Ownology invite a few days back but didn't sign up. Totally fine.`,
    ``,
    `What ${opts.contactName ?? opts.wineryName} finds useful:`,
    ` • A daily Cellar Brief at 5:30am — every tank's summary + what needs action today.`,
    ` • Ask Ownology — 236 Q&As grounded in real MoreWine and Scott Labs manuals.`,
    ` • One-tap compliance exports for LIP audits.`,
    ``,
    `Claim your 44-day trial: ${joinUrl}`,
    ``,
    `Not ready? Browse the free journal: ${PUBLIC_SITE_URL}/cellar-journal`,
    ``,
    `— You got this because ${attribution} shared their Ownology invite and you left your email on the landing page. We only send one nurture email per referral.`,
  ].join("\n");
}

export async function nurtureEmailHandler(req: Request, res: Response): Promise<void> {
  const apiKey = process.env.RESEND_API_KEY;
  const fromEmail = process.env.ALERT_FROM_EMAIL ?? "onboarding@resend.dev";
  const fromName = process.env.ALERT_FROM_NAME ?? "Ownology";
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
    console.warn("[nurture-email] CRON_SECRET mismatch — downgrading to dry-run.");
  }

  const resend = apiKey ? new Resend(apiKey) : null;
  const cutoff = Date.now() - NURTURE_DELAY_MS;

  // Pull every eligible referral. Small volume — no pagination needed.
  const eligible = await db.select().from(schema.referrals).where(
    and(
      eq(schema.referrals.status, "pending"),
      isNotNull(schema.referrals.referredEmail),
      isNull(schema.referrals.nurturedAt),
      lte(schema.referrals.createdAt, cutoff),
    )
  ).limit(200);

  console.log(`[nurture-email] starting — ${eligible.length} eligible referral(s), dryRun=${dryRun}`);

  const results: NurtureResult[] = [];
  for (const r of eligible) {
    // Fetch referrer for contactName + wineryName. One query per row is fine
    // at this volume; batch later if it grows.
    const referrer = await db.query.wineries.findFirst({
      where: eq(schema.wineries.id, r.referrerWineryId),
    });
    if (!referrer) {
      results.push({ referralId: r.id, email: r.referredEmail!, code: r.referralCode, status: "skipped_no_referrer" });
      continue;
    }
    const contactName = (referrer as unknown as { contactName: string | null }).contactName ?? null;
    const wineryName = referrer.name;
    const recipient = testTo ?? r.referredEmail!;
    const attribution = contactName ? `${contactName} at ${wineryName}` : wineryName;
    const subject = `${attribution} thought Ownology might help`;
    const html = renderHtml({ contactName, wineryName, code: r.referralCode });
    const text = renderText({ contactName, wineryName, code: r.referralCode });

    if (dryRun || !resend) {
      console.log(`[nurture-email] DRY-RUN would send to ${recipient}: ${subject}`);
      results.push({ referralId: r.id, email: recipient, code: r.referralCode, status: "dry_run" });
      continue;
    }
    try {
      const send = await resend.emails.send({
        from: `${fromName} <${fromEmail}>`,
        to: [recipient],
        subject,
        html,
        text,
        replyTo: fromEmail,
      });
      if (send.error) throw new Error(send.error.message ?? "Resend send failed");
      // Mark nurtured so we never send twice.
      await db.update(schema.referrals)
        .set({ nurturedAt: Date.now() })
        .where(eq(schema.referrals.id, r.id));
      results.push({ referralId: r.id, email: recipient, code: r.referralCode, status: "sent", resendId: send.data?.id });
      console.log(`[nurture-email] sent to ${recipient} (id=${send.data?.id})`);
    } catch (err) {
      const msg = err instanceof Error ? err.message : String(err);
      results.push({ referralId: r.id, email: recipient, code: r.referralCode, status: "error", error: msg });
      console.error(`[nurture-email] FAILED for ${recipient}: ${msg}`);
    }
  }

  res.json({
    ok: true,
    dryRun,
    eligible: eligible.length,
    sent: results.filter((r) => r.status === "sent").length,
    dryRunCount: results.filter((r) => r.status === "dry_run").length,
    errors: results.filter((r) => r.status === "error").length,
    results,
  });
}
