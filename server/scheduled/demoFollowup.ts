// demoFollowup.ts — one email the day after someone tries /demo/tour, nudging them to start a trial.
import type { Request, Response } from "express";
import { Resend } from "resend";
import { sql } from "drizzle-orm";
import { db } from "../db.js";
import { evaluateCronSecret } from "./_cronSecret.js";
import { isTestEmail } from "../../shared/testEmails.js";

const DAY = 24 * 60 * 60 * 1000;
const MIN_AGE_MS = 20 * 60 * 60 * 1000;
const MAX_AGE_MS = 7 * DAY;
const SITE = process.env.PUBLIC_SITE_URL ?? "https://ownology.ai";
const SKIP_DOMAINS = /@(example\.(com|org|net)|test\.com|ownology\.ai)$/i;

function esc(s: string): string {
  return s.replace(/[&<>"']/g, (c) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" }[c]!));
}

export function renderDemoFollowup(asks: number): { subject: string; html: string; text: string } {
  const trialUrl = `${SITE}/pricing?from=demo-followup`;
  const demoUrl = `${SITE}/demo/tour?from=demo-followup`;
  const askLine = asks > 0
    ? `You asked Owen ${asks} question${asks === 1 ? "" : "s"} yesterday.`
    : `You took a look around the Ownology demo yesterday.`;
  const subject = "Your Brand Vault is one step away";
  const html = `<!doctype html><html><body style="font-family: -apple-system, Segoe UI, Roboto, sans-serif; max-width: 560px; margin: 0 auto; padding: 24px; color: #111827; line-height: 1.55;">
  <p style="font-size: 12px; letter-spacing: 0.12em; text-transform: uppercase; color: #b45309; margin: 0 0 8px;">Following up on your demo</p>
  <h1 style="font-family: Georgia, serif; font-size: 22px; margin: 0 0 16px; line-height: 1.3;">Thanks for trying Ownology.</h1>
  <p>${esc(askLine)} The demo only shows sample wines — with a trial, Owen works from <strong>your</strong> wines, blends and cellar notes.</p>
  <ul style="padding-left: 20px;">
    <li><strong>Brand Vault</strong> — keep every wine's specs, blend and protocol in one place, and choose what your contract winemaker sees.</li>
    <li><strong>Ask Owen</strong> — answers grounded in industry-standard oenology references.</li>
    <li><strong>Curriculum</strong> — short lessons for you and your cellar team.</li>
  </ul>
  <p style="margin: 24px 0;">
    <a href="${trialUrl}" style="display: inline-block; background: #b45309; color: #ffffff; padding: 12px 20px; text-decoration: none; border-radius: 6px; font-weight: 700;">Start my trial &rarr;</a>
  </p>
  <p style="font-size: 14px; color: #4b5563;">Not ready yet? <a href="${demoUrl}" style="color: #78350f;">Go back to the demo</a>, or just reply to this email with a question.</p>
  <p style="font-family: Georgia, serif; font-size: 13px; color: #8A5A2C; font-style: italic; margin: 28px 0 0;">You are the must. Ownology is the ferment.</p>
  <p style="font-size: 12px; color: #6b7280; margin-top: 32px; padding-top: 16px; border-top: 1px solid #e5e7eb;">You got this because you entered your email on the Ownology demo. This is the only follow-up we send.</p>
</body></html>`;
  const text = [
    "Thanks for trying Ownology.",
    "",
    `${askLine} The demo only shows sample wines — with a trial, Owen works from your wines, blends and cellar notes.`,
    "",
    " • Brand Vault — every wine's specs, blend and protocol in one place.",
    " • Ask Owen — answers grounded in industry-standard oenology references.",
    " • Curriculum — short lessons for you and your cellar team.",
    "",
    `Start my trial: ${trialUrl}`,
    `Back to the demo: ${demoUrl}`,
    "",
    "— You got this because you entered your email on the Ownology demo. This is the only follow-up we send.",
  ].join("\n");
  return { subject, html, text };
}

type Candidate = { email: string; first_at: number; asks: number };

export async function demoFollowupHandler(req: Request, res: Response): Promise<void> {
  const apiKey = process.env.RESEND_API_KEY;
  const { dryRun, reason } = evaluateCronSecret(req, "demo-followup", { hasApiKey: !!apiKey });
  const fromEmail = process.env.ALERT_FROM_EMAIL ?? "onboarding@resend.dev";
  const fromName = process.env.ALERT_FROM_NAME ?? "Ownology";
  const replyTo = process.env.ALERT_REPLY_TO ?? fromEmail;
  const testTo = process.env.ALERT_TEST_TO?.trim() || null;
  const now = Date.now();

  const [rows] = await db.execute(sql`
    SELECT c.email AS email, MIN(c.at) AS first_at, MAX(c.asks) AS asks FROM (
      SELECT LOWER(TRIM(email)) AS email, created_at AS at, asks FROM demo_ask_usage
      UNION ALL
      SELECT LOWER(TRIM(email)), created_at, 0 FROM demo_submissions WHERE email IS NOT NULL AND email <> ''
    ) c
    WHERE c.email NOT IN (SELECT LOWER(email) FROM users WHERE email IS NOT NULL)
      AND c.email NOT IN (SELECT email FROM demo_followups)
      AND c.email NOT IN (SELECT LOWER(email) FROM founding_members WHERE email IS NOT NULL)
      AND c.email NOT IN (
        SELECT LOWER(oc.email) FROM outreach_contacts oc JOIN user_events ue ON ue.slug = oc.slug
        WHERE oc.email IS NOT NULL AND ue.user_id IS NOT NULL)
    GROUP BY c.email
    HAVING first_at <= ${now - MIN_AGE_MS} AND first_at >= ${now - MAX_AGE_MS}
    LIMIT 200`);
  const eligible = (rows as unknown as Candidate[]).filter((r) => r.email.includes("@") && !SKIP_DOMAINS.test(r.email) && !isTestEmail(r.email));

  const resend = apiKey ? new Resend(apiKey) : null;
  const results: { email: string; status: "sent" | "dry_run" | "error"; error?: string }[] = [];
  for (const c of eligible) {
    const { subject, html, text } = renderDemoFollowup(Number(c.asks) || 0);
    const to = testTo ?? c.email;
    if (dryRun || !resend) {
      results.push({ email: c.email, status: "dry_run" });
      continue;
    }
    try {
      const send = await resend.emails.send({ from: `${fromName} <${fromEmail}>`, to: [to], subject, html, text, replyTo });
      if (send.error) throw new Error(send.error.message ?? "Resend send failed");
      await db.execute(sql`INSERT IGNORE INTO demo_followups (email, sent_at, resend_id) VALUES (${c.email}, ${Date.now()}, ${send.data?.id ?? null})`);
      results.push({ email: c.email, status: "sent" });
    } catch (err) {
      results.push({ email: c.email, status: "error", error: err instanceof Error ? err.message : String(err) });
    }
  }
  console.log(`[demo-followup] eligible=${eligible.length} dryRun=${dryRun} (${reason}) sent=${results.filter((r) => r.status === "sent").length}`);
  res.json({ ok: true, dryRun, reason, eligible: eligible.length, sent: results.filter((r) => r.status === "sent").length, errors: results.filter((r) => r.status === "error").length, results });
}
