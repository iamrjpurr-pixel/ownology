/**
 * Weekly BD Digest — /api/scheduled/weekly-bd-digest
 *
 * Fires Monday 05:30 Australia/Sydney via Railway cron. Sends ONE
 * summary email to the operator (Rich) summarising the previous 7
 * days of outreach activity from `outreach_contacts`:
 *   - Sends this week (SMS + Email, grouped)
 *   - Opens (contacts newly viewed) + total view events
 *   - CTA clicks
 *   - Replies with sentiment breakdown (interested / objection / not-now / cold)
 *   - Hot alerts fired
 *   - Demos booked
 *   - Top 3 hottest un-booked prospects (highest view count)
 *
 * Value-engineered: reads directly from `outreach_contacts` — no new
 * table, no extra LLM calls, no dependency on Perplexity/Claude at
 * digest time. Same env-var + secret + dry-run contract as
 * daily-alert-email and weekly-cellar-digest.
 *
 * Env vars consumed:
 *   RESEND_API_KEY           — required to actually send. If missing → dry-run.
 *   ALERT_FROM_EMAIL         — sender (default "owen@ownology.ai").
 *   ALERT_FROM_NAME          — display name (default "Ownology BD Desk").
 *   ALERT_REPLY_TO           — reply-to header (default "support@ownology.ai").
 *   OPERATOR_ALERT_EMAIL     — primary recipient (falls back to OWNER_EMAIL).
 *   OWNER_EMAIL              — fallback recipient. If neither set → dry-run.
 *   ALERT_TEST_TO            — override → all mail redirected here.
 *   CRON_SECRET              — optional. Live send requires header/query match.
 *
 * Manual trigger:
 *   GET /api/scheduled/weekly-bd-digest?dryRun=1   (safe, always dry-run)
 *   POST /api/scheduled/weekly-bd-digest           (live, requires secret if set)
 */

import type { Request, Response } from "express";
import { Resend } from "resend";
import { db } from "../db.js";
import * as schema from "../../drizzle/schema.js";

type Sentiment = "interested" | "objection" | "not-now" | "cold" | "unclassified";

const SENTIMENT_COLOR: Record<Sentiment, string> = {
  interested: "#4a7c47",
  objection: "#b45309",
  "not-now": "#6b7280",
  cold: "#374151",
  unclassified: "#8a7565",
};

const SENTIMENT_LABEL: Record<Sentiment, string> = {
  interested: "Interested",
  objection: "Objection",
  "not-now": "Not now",
  cold: "Cold",
  unclassified: "Unclassified",
};

type DigestData = {
  weekStart: number;
  weekEnd: number;
  sends: { sms: number; email: number; total: number };
  opens: { newContacts: number; totalViewEvents: number };
  clicks: number;
  hotAlerts: number;
  booked: number;
  replies: {
    total: number;
    bySentiment: Record<Sentiment, number>;
    samples: Array<{ name: string; winery: string; sentiment: Sentiment; excerpt: string }>;
  };
  hottest: Array<{ name: string; winery: string; slug: string; viewCount: number; lastViewed: number | null }>;
};

function escapeHtml(s: string): string {
  return s.replace(/[&<>"']/g, (c) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" }[c]!));
}

function classifySentiment(raw: string | null): Sentiment {
  if (!raw) return "unclassified";
  const v = raw.trim().toLowerCase();
  if (v === "interested" || v === "objection" || v === "cold") return v;
  if (v === "not-now" || v === "not_now" || v === "notnow") return "not-now";
  return "unclassified";
}

async function computeDigest(): Promise<DigestData> {
  const now = Date.now();
  const weekMs = 7 * 24 * 60 * 60 * 1000;
  const weekStart = now - weekMs;

  const rows = await db
    .select({
      slug: schema.outreachContacts.slug,
      firstName: schema.outreachContacts.firstName,
      lastName: schema.outreachContacts.lastName,
      winery: schema.outreachContacts.winery,
      status: schema.outreachContacts.status,
      smsSentAt: schema.outreachContacts.smsSentAt,
      emailSentAt: schema.outreachContacts.emailSentAt,
      firstViewedAt: schema.outreachContacts.firstViewedAt,
      viewCount: schema.outreachContacts.viewCount,
      ctaClickedAt: schema.outreachContacts.ctaClickedAt,
      repliedAt: schema.outreachContacts.repliedAt,
      replyText: schema.outreachContacts.replyText,
      replySentiment: schema.outreachContacts.replySentiment,
      demoBookedAt: schema.outreachContacts.demoBookedAt,
      hotAlertSentAt: schema.outreachContacts.hotAlertSentAt,
    })
    .from(schema.outreachContacts);

  // Skip vendor/skip rows — funnel accuracy.
  const active = rows.filter((r) => r.status !== "sales" && r.status !== "skip");

  const sms = active.filter((r) => r.smsSentAt && r.smsSentAt >= weekStart).length;
  const email = active.filter((r) => r.emailSentAt && r.emailSentAt >= weekStart).length;

  // Opens: new firstViewedAt in window + total view events across active
  // (viewCount is cumulative; for a "this week" total we approximate by
  // counting contacts that had ANY view this week — firstViewedAt window
  // — since we don't store per-visit timestamps).
  const newContacts = active.filter((r) => r.firstViewedAt && r.firstViewedAt >= weekStart).length;
  const totalViewEvents = active
    .filter((r) => r.firstViewedAt && r.firstViewedAt >= weekStart)
    .reduce((sum, r) => sum + (r.viewCount ?? 0), 0);

  const clicks = active.filter((r) => r.ctaClickedAt && r.ctaClickedAt >= weekStart).length;
  const hotAlerts = active.filter((r) => r.hotAlertSentAt && r.hotAlertSentAt >= weekStart).length;
  const booked = active.filter((r) => r.demoBookedAt && r.demoBookedAt >= weekStart).length;

  // Replies bucket
  const repliesThisWeek = active.filter((r) => r.repliedAt && r.repliedAt >= weekStart);
  const bySentiment: Record<Sentiment, number> = {
    interested: 0,
    objection: 0,
    "not-now": 0,
    cold: 0,
    unclassified: 0,
  };
  const samples: DigestData["replies"]["samples"] = [];
  for (const r of repliesThisWeek) {
    const s = classifySentiment(r.replySentiment);
    bySentiment[s]++;
    if (samples.length < 5 && r.replyText) {
      samples.push({
        name: [r.firstName, r.lastName].filter(Boolean).join(" ").trim() || "Unknown",
        winery: r.winery ?? "",
        sentiment: s,
        excerpt: r.replyText.slice(0, 140) + (r.replyText.length > 140 ? "…" : ""),
      });
    }
  }

  // Top 3 hottest un-booked prospects: highest viewCount, no booking yet,
  // must have been touched (SMS or email).
  const hottest = active
    .filter(
      (r) =>
        (r.smsSentAt || r.emailSentAt) &&
        !r.demoBookedAt &&
        (r.viewCount ?? 0) > 0
    )
    .sort((a, b) => (b.viewCount ?? 0) - (a.viewCount ?? 0))
    .slice(0, 3)
    .map((r) => ({
      name: [r.firstName, r.lastName].filter(Boolean).join(" ").trim() || "Unknown",
      winery: r.winery ?? "",
      slug: r.slug,
      viewCount: r.viewCount ?? 0,
      lastViewed: r.firstViewedAt ?? null,
    }));

  return {
    weekStart,
    weekEnd: now,
    sends: { sms, email, total: sms + email },
    opens: { newContacts, totalViewEvents },
    clicks,
    hotAlerts,
    booked,
    replies: {
      total: repliesThisWeek.length,
      bySentiment,
      samples,
    },
    hottest,
  };
}

function fmtDate(ms: number): string {
  return new Date(ms).toLocaleDateString("en-AU", { day: "2-digit", month: "short" });
}

function renderText(d: DigestData): string {
  const range = `${fmtDate(d.weekStart)} → ${fmtDate(d.weekEnd)}`;
  const L: string[] = [];
  L.push(`BD Desk — Weekly Digest (${range})`);
  L.push("");
  L.push(`Sends:      ${d.sends.total}  (SMS ${d.sends.sms} · Email ${d.sends.email})`);
  L.push(`Opens:      ${d.opens.newContacts} new contacts opened  (${d.opens.totalViewEvents} total views)`);
  L.push(`Clicks:     ${d.clicks} CTA taps`);
  L.push(`Hot alerts: ${d.hotAlerts} fired`);
  L.push(`Booked:     ${d.booked} demos`);
  L.push("");
  L.push(`Replies:    ${d.replies.total} this week`);
  for (const s of ["interested", "objection", "not-now", "cold", "unclassified"] as Sentiment[]) {
    if (d.replies.bySentiment[s] > 0) {
      L.push(`  ${SENTIMENT_LABEL[s].padEnd(14)} ${d.replies.bySentiment[s]}`);
    }
  }
  if (d.replies.samples.length > 0) {
    L.push("");
    L.push("Reply samples:");
    for (const s of d.replies.samples) {
      L.push(`  [${SENTIMENT_LABEL[s.sentiment]}] ${s.name} · ${s.winery}`);
      L.push(`    "${s.excerpt}"`);
    }
  }
  if (d.hottest.length > 0) {
    L.push("");
    L.push("Hottest un-booked:");
    for (const h of d.hottest) {
      L.push(`  ${h.name} · ${h.winery} — ${h.viewCount} views  https://ownology.app/hi/${h.slug}`);
    }
  }
  L.push("");
  L.push("Full engagement view: https://ownology.app/admin/contacts/engagement");
  L.push("");
  L.push("— Owen · BD Desk");
  L.push("Weekly at Monday 05:30 AEST. Reply STOP to pause.");
  return L.join("\n");
}

function renderHtml(d: DigestData): string {
  const range = `${fmtDate(d.weekStart)} → ${fmtDate(d.weekEnd)}`;
  const chip = (label: string, value: number, hint: string, color = "#B0741A") => `
    <td style="padding:14px;width:20%;text-align:center;border-right:1px solid #eee5d3;vertical-align:top;">
      <div style="font-family:Georgia,serif;font-size:26px;font-weight:600;color:${color};line-height:1;">${value}</div>
      <div style="font-family:Arial,sans-serif;font-size:10px;letter-spacing:0.08em;text-transform:uppercase;color:#6b5c50;margin-top:6px;font-weight:700;">${escapeHtml(label)}</div>
      <div style="font-family:Arial,sans-serif;font-size:11px;color:#8a7565;margin-top:3px;">${escapeHtml(hint)}</div>
    </td>`;

  const sentimentRows = (["interested", "objection", "not-now", "cold", "unclassified"] as Sentiment[])
    .filter((s) => d.replies.bySentiment[s] > 0)
    .map((s) => `
      <tr>
        <td style="padding:6px 0;font-family:Arial,sans-serif;font-size:12px;color:${SENTIMENT_COLOR[s]};font-weight:600;width:120px;">${escapeHtml(SENTIMENT_LABEL[s])}</td>
        <td style="padding:6px 0;font-family:Arial,sans-serif;font-size:12px;color:#1a1210;font-weight:600;">${d.replies.bySentiment[s]}</td>
      </tr>`)
    .join("");

  const sampleBlocks = d.replies.samples
    .map((s) => `
      <div style="border-left:3px solid ${SENTIMENT_COLOR[s.sentiment]};padding:8px 12px;margin:8px 0;background:#fbf7ef;">
        <div style="font-family:Arial,sans-serif;font-size:11px;color:${SENTIMENT_COLOR[s.sentiment]};font-weight:700;text-transform:uppercase;letter-spacing:0.06em;">${escapeHtml(SENTIMENT_LABEL[s.sentiment])}</div>
        <div style="font-family:Georgia,serif;font-size:13px;color:#1a1210;font-weight:600;margin-top:2px;">${escapeHtml(s.name)}${s.winery ? ` <span style="font-weight:400;color:#6b5c50;">· ${escapeHtml(s.winery)}</span>` : ""}</div>
        <div style="font-family:Arial,sans-serif;font-size:12px;color:#4a3d35;margin-top:4px;font-style:italic;">"${escapeHtml(s.excerpt)}"</div>
      </div>`)
    .join("");

  const hottestBlocks = d.hottest
    .map((h) => `
      <tr>
        <td style="padding:10px 0;border-top:1px solid #eee5d3;">
          <div style="font-family:Georgia,serif;font-size:14px;color:#1a1210;font-weight:600;">
            ${escapeHtml(h.name)}
            ${h.winery ? `<span style="font-weight:400;color:#6b5c50;font-size:12px;margin-left:6px;">${escapeHtml(h.winery)}</span>` : ""}
          </div>
          <div style="font-family:Arial,sans-serif;font-size:11px;color:#8a7565;margin-top:2px;">
            <a href="https://ownology.app/hi/${escapeHtml(h.slug)}" style="color:#B0741A;text-decoration:none;">/hi/${escapeHtml(h.slug)}</a>
          </div>
        </td>
        <td style="padding:10px 0;border-top:1px solid #eee5d3;text-align:right;vertical-align:middle;">
          <div style="font-family:Georgia,serif;font-size:20px;font-weight:600;color:#B0741A;">${h.viewCount}</div>
          <div style="font-family:Arial,sans-serif;font-size:10px;color:#8a7565;text-transform:uppercase;letter-spacing:0.06em;">views</div>
        </td>
      </tr>`)
    .join("");

  return `<!DOCTYPE html>
<html><body style="margin:0;padding:0;background:#f6f1ea;font-family:Arial,Helvetica,sans-serif;color:#1a1210;">
  <table role="presentation" width="100%" cellspacing="0" cellpadding="0" border="0" style="background:#f6f1ea;padding:24px 12px;">
    <tr><td align="center">
      <table role="presentation" width="620" cellspacing="0" cellpadding="0" border="0" style="max-width:620px;background:#fff;border:1px solid #eee5d3;border-radius:6px;overflow:hidden;">

        <!-- Header -->
        <tr><td style="padding:22px 26px 18px;border-bottom:1px solid #eee5d3;">
          <div style="font-family:Georgia,serif;font-size:11px;letter-spacing:0.14em;text-transform:uppercase;color:#B0741A;font-weight:700;">
            BD Desk · Monday
          </div>
          <div style="font-family:Georgia,serif;font-size:20px;font-weight:600;color:#1a1210;margin-top:6px;line-height:1.25;">
            ${d.sends.total} sends · ${d.opens.newContacts} opens · ${d.replies.total} replies
          </div>
          <div style="font-family:Arial,sans-serif;font-size:12px;color:#6b5c50;margin-top:6px;">
            ${escapeHtml(range)}
          </div>
        </td></tr>

        <!-- Funnel chips -->
        <tr><td>
          <table role="presentation" width="100%" cellspacing="0" cellpadding="0" border="0">
            <tr>
              ${chip("Sends", d.sends.total, `${d.sends.sms} SMS · ${d.sends.email} email`)}
              ${chip("Opens", d.opens.newContacts, `${d.opens.totalViewEvents} view events`)}
              ${chip("Clicks", d.clicks, "CTA taps")}
              ${chip("Hot alerts", d.hotAlerts, "3+ views fired", "#b91c1c")}
              ${chip("Booked", d.booked, "demos this week", "#4a7c47")}
            </tr>
          </table>
        </td></tr>

        <!-- Reply breakdown -->
        ${d.replies.total > 0 ? `
        <tr><td style="padding:20px 26px 8px;border-top:1px solid #eee5d3;">
          <div style="font-family:Georgia,serif;font-size:14px;font-weight:600;color:#1a1210;margin-bottom:10px;">
            Replies by sentiment
          </div>
          <table role="presentation" cellspacing="0" cellpadding="0" border="0">
            ${sentimentRows}
          </table>
        </td></tr>
        ${d.replies.samples.length > 0 ? `
        <tr><td style="padding:8px 26px 18px;">
          <div style="font-family:Georgia,serif;font-size:13px;font-weight:600;color:#1a1210;margin:8px 0;">Reply samples</div>
          ${sampleBlocks}
        </td></tr>` : ""}
        ` : ""}

        <!-- Hottest un-booked -->
        ${d.hottest.length > 0 ? `
        <tr><td style="padding:18px 26px;border-top:1px solid #eee5d3;">
          <div style="font-family:Georgia,serif;font-size:14px;font-weight:600;color:#1a1210;margin-bottom:6px;">
            Hottest un-booked
          </div>
          <div style="font-family:Arial,sans-serif;font-size:11px;color:#8a7565;margin-bottom:8px;">
            Highest view counts, still no demo booked. Tap to open their landing.
          </div>
          <table role="presentation" width="100%" cellspacing="0" cellpadding="0" border="0">
            ${hottestBlocks}
          </table>
        </td></tr>` : ""}

        <!-- CTA -->
        <tr><td style="padding:18px 26px 22px;border-top:1px solid #eee5d3;background:#fbf3e4;">
          <a href="https://ownology.app/admin/contacts/engagement?from=weekly-bd-digest"
            style="display:inline-block;padding:10px 18px;background:#B0741A;color:#2A1E0A;text-decoration:none;font-family:Arial,sans-serif;font-size:14px;font-weight:600;border-radius:999px;">
            Open the full engagement board →
          </a>
        </td></tr>

        <tr><td style="padding:14px 26px 22px;font-family:Arial,sans-serif;font-size:11px;color:#8a7565;line-height:1.55;">
          — Owen · BD Desk. Weekly at Monday 05:30 AEST. Reply STOP to pause.
        </td></tr>
      </table>
    </td></tr>
  </table>
</body></html>`;
}

export async function weeklyBdDigestHandler(req: Request, res: Response): Promise<void> {
  const apiKey = process.env.RESEND_API_KEY;
  const fromEmail = process.env.ALERT_FROM_EMAIL ?? "owen@ownology.ai";
  const fromName = process.env.ALERT_FROM_NAME ?? "Owen · Ownology BD Desk";
  const replyTo = process.env.ALERT_REPLY_TO?.trim() || "support@ownology.ai";
  const testTo = process.env.ALERT_TEST_TO?.trim() || null;
  const recipient =
    testTo ||
    process.env.OPERATOR_ALERT_EMAIL?.trim() ||
    process.env.OWNER_EMAIL?.trim() ||
    null;
  // SEC-002 hardening (Jul 2026 audit) — live send requires configured
  // CRON_SECRET. Empty secret → forced dry-run.
  const { evaluateCronSecret } = await import("./_cronSecret.js");
  const guard = evaluateCronSecret(req, "weekly-bd-digest", { hasApiKey: !!apiKey && !!recipient });
  const secretOk = guard.secretOk;
  const dryRun = guard.dryRun;

  let digest: DigestData;
  try {
    digest = await computeDigest();
  } catch (err) {
    const msg = err instanceof Error ? err.message : String(err);
    console.error("[weekly-bd-digest] compute failed:", msg);
    res.status(500).json({ ok: false, error: `compute_failed: ${msg}` });
    return;
  }

  const subject =
    digest.replies.total > 0
      ? `BD Desk — ${digest.sends.total} sends, ${digest.replies.total} replies (week to ${fmtDate(digest.weekEnd)})`
      : `BD Desk — ${digest.sends.total} sends this week (${fmtDate(digest.weekEnd)})`;

  const html = renderHtml(digest);
  const text = renderText(digest);

  if (dryRun) {
    const reason = !apiKey ? "no_resend_key" : !recipient ? "no_recipient" : !secretOk ? "cron_secret_mismatch" : "dry_run_flag";
    console.log(`[weekly-bd-digest] DRY-RUN (${reason}) — would send to ${recipient ?? "<no-recipient>"}: ${subject}`);
    res.json({
      ok: true,
      dryRun: true,
      reason,
      recipient,
      subject,
      digest,
    });
    return;
  }

  try {
    const resend = new Resend(apiKey!);
    const send = await resend.emails.send({
      from: `${fromName} <${fromEmail}>`,
      to: [recipient!],
      ...(replyTo ? { replyTo } : {}),
      subject,
      html,
      text,
    });
    if (send.error) throw new Error(send.error.message ?? "Resend send failed");
    console.log(`[weekly-bd-digest] sent to ${recipient} (id=${send.data?.id})`);
    res.json({
      ok: true,
      dryRun: false,
      recipient,
      subject,
      resendId: send.data?.id,
      digest,
    });
  } catch (err) {
    const msg = err instanceof Error ? err.message : String(err);
    console.error(`[weekly-bd-digest] send failed for ${recipient}:`, msg);
    res.status(500).json({ ok: false, error: msg, recipient, subject, digest });
  }
}
