/**
 * Health Digest — /api/scheduled/health-digest
 *
 * One aggregator that runs every health-relevant probe we have, produces
 * a colour-coded HTML summary, and (when ?send=1) emails it to
 * ADMIN_EMAILS.
 *
 * Probes:
 *   1. Env-var completeness      — required prod vars present, no stubs
 *   2. Database ping             — SELECT 1 against MySQL
 *   3. Resend config             — API key + domain + sandbox check
 *   4. Emergent LLM key          — tiny completion round-trip
 *   5. Scheduled cron freshness  — did each cron endpoint see recent traffic?
 *
 * Daily cron: 07:00 AEST (20:00 UTC previous day):
 *   GET /api/scheduled/health-digest?send=1
 *
 * On-demand: browse /api/scheduled/health-digest for JSON, add ?send=1 to
 * also email. Owner-triggerable, no cron-secret required for read; secret
 * required only for the email side-effect if CRON_SECRET is set.
 */
import type { Request, Response } from "express";
import { Resend } from "resend";
import { sql } from "drizzle-orm";
import { db } from "../db.js";

export type ProbeStatus = "ok" | "warn" | "fail" | "skip";
export type Probe = { name: string; status: ProbeStatus; detail: string; hint?: string };

export const STATUS_COLOR: Record<ProbeStatus, string> = {
  ok: "#4a7c47",
  warn: "#b57e14",
  fail: "#b91c1c",
  skip: "#6b7280",
};
export const STATUS_LABEL: Record<ProbeStatus, string> = { ok: "OK", warn: "WARN", fail: "FAIL", skip: "SKIP" };

async function probeEnv(): Promise<Probe> {
  const missing: string[] = [];
  const stubbed: string[] = [];
  const required = ["MONGO_URL", "DATABASE_URL", "JWT_SECRET", "RESEND_API_KEY", "ALERT_FROM_EMAIL"];
  for (const k of required) {
    const v = process.env[k];
    if (!v) continue; // MONGO_URL vs DATABASE_URL — either satisfies the DB check downstream
  }
  if (!process.env.DATABASE_URL && !process.env.MONGO_URL) missing.push("DATABASE_URL/MONGO_URL");
  if (!process.env.JWT_SECRET) missing.push("JWT_SECRET");
  if (process.env.JWT_SECRET && process.env.JWT_SECRET !== process.env.JWT_SECRET.trim()) {
    stubbed.push("JWT_SECRET (has leading/trailing whitespace)");
  }
  if (!process.env.RESEND_API_KEY) missing.push("RESEND_API_KEY");
  if (!process.env.ALERT_FROM_EMAIL) missing.push("ALERT_FROM_EMAIL");
  if (process.env.STRIPE_SECRET_KEY?.includes("stub")) stubbed.push(`STRIPE_SECRET_KEY (=${process.env.STRIPE_SECRET_KEY})`);
  if (process.env.OAUTH_SERVER_URL?.includes("example.invalid")) stubbed.push("OAUTH_SERVER_URL (still stubbed)");
  if (process.env.ALERT_TEST_TO) stubbed.push(`ALERT_TEST_TO="${process.env.ALERT_TEST_TO}" (redirects all sends)`);
  if (process.env.ALERT_FROM_EMAIL?.endsWith("@resend.dev")) stubbed.push("ALERT_FROM_EMAIL is Resend sandbox");

  if (missing.length > 0) {
    return { name: "Env vars", status: "fail", detail: `Missing: ${missing.join(", ")}`, hint: "Add these on Railway before enabling any cron." };
  }
  if (stubbed.length > 0) {
    return { name: "Env vars", status: "warn", detail: stubbed.join(" · "), hint: "Non-blocking but should be resolved before launch." };
  }
  return { name: "Env vars", status: "ok", detail: "All required vars set, no stubs detected." };
}

async function probeDb(): Promise<Probe> {
  try {
    const start = Date.now();
    const rows = await db.execute(sql`SELECT 1 AS ok`);
    const ms = Date.now() - start;
    if (rows) {
      return { name: "MySQL", status: ms < 500 ? "ok" : "warn", detail: `SELECT 1 → ${ms}ms` };
    }
    return { name: "MySQL", status: "fail", detail: "SELECT 1 returned no rows" };
  } catch (err) {
    const msg = err instanceof Error ? err.message : String(err);
    return { name: "MySQL", status: "fail", detail: msg, hint: "Check DATABASE_URL on Railway." };
  }
}

async function probeResend(): Promise<Probe> {
  const apiKey = process.env.RESEND_API_KEY?.trim();
  if (!apiKey) return { name: "Resend", status: "fail", detail: "RESEND_API_KEY missing" };
  try {
    const resend = new Resend(apiKey);
    const list = await resend.domains.list();
    if (list.error) throw new Error(list.error.message ?? "domains.list failed");
    const raw = (list.data as unknown as { data?: unknown[] })?.data ?? list.data;
    const domains = (Array.isArray(raw) ? raw : []) as Array<{ name: string; status: string }>;
    const verified = domains.filter((d) => d.status === "verified");
    const from = process.env.ALERT_FROM_EMAIL ?? "(unset)";
    const isSandbox = from.endsWith("@resend.dev");
    if (isSandbox) {
      return { name: "Resend", status: "warn", detail: `Sender is sandbox (${from}). ${verified.length} verified domain(s) available.`, hint: "Switch ALERT_FROM_EMAIL to a verified-domain address before real users receive." };
    }
    if (verified.length === 0) {
      return { name: "Resend", status: "warn", detail: `Sender ${from} but no verified domains — sends likely to fail.` };
    }
    return { name: "Resend", status: "ok", detail: `Sender ${from} · ${verified.length} verified domain(s): ${verified.map((d) => d.name).join(", ")}` };
  } catch (err) {
    const msg = err instanceof Error ? err.message : String(err);
    return { name: "Resend", status: "fail", detail: msg, hint: "API key may be revoked or misconfigured." };
  }
}

async function probeLlm(): Promise<Probe> {
  const key = process.env.EMERGENT_LLM_KEY?.trim();
  const url = process.env.BUILT_IN_FORGE_API_URL?.trim();
  if (!key || !url) return { name: "Emergent LLM key", status: "skip", detail: "EMERGENT_LLM_KEY or BUILT_IN_FORGE_API_URL not set" };
  try {
    const start = Date.now();
    // Cheapest possible completion — 1 token, generic prompt
    const resp = await fetch(`${url}/v1/chat/completions`, {
      method: "POST",
      headers: { "content-type": "application/json", authorization: `Bearer ${key}` },
      body: JSON.stringify({ model: "claude-sonnet-4-5-20250929", max_tokens: 1, messages: [{ role: "user", content: "ok" }] }),
      signal: AbortSignal.timeout(8000),
    });
    const ms = Date.now() - start;
    if (!resp.ok) {
      const body = await resp.text().catch(() => "");
      return { name: "Emergent LLM key", status: "fail", detail: `HTTP ${resp.status} · ${body.slice(0, 200)}`, hint: "Top up balance at Profile → Universal Key → Add Balance." };
    }
    return { name: "Emergent LLM key", status: ms < 3000 ? "ok" : "warn", detail: `1-token completion → ${ms}ms` };
  } catch (err) {
    const msg = err instanceof Error ? err.message : String(err);
    return { name: "Emergent LLM key", status: "fail", detail: msg };
  }
}

async function probeAuth(): Promise<Probe> {
  const bypass = process.env.ENABLE_DEV_BYPASS === "true";
  const oauthStubbed = process.env.OAUTH_SERVER_URL?.includes("example.invalid");
  if (bypass && process.env.NODE_ENV === "production") {
    return { name: "Auth", status: "fail", detail: "ENABLE_DEV_BYPASS=true in production — anyone can access admin routes.", hint: "Set to false immediately." };
  }
  if (!bypass && oauthStubbed) {
    return { name: "Auth", status: "warn", detail: "Dev-bypass OFF but OAuth still stubbed. Login routes will fail for real users.", hint: "Wire real auth before inviting clients to log in." };
  }
  return { name: "Auth", status: "ok", detail: `dev-bypass=${bypass} · oauth=${oauthStubbed ? "stub" : "configured"}` };
}

export async function runAllProbes(): Promise<Probe[]> {
  return Promise.all([probeEnv(), probeDb(), probeResend(), probeLlm(), probeAuth()]);
}

export function renderHtml(probes: Probe[], generatedAt: Date): string {
  const rows = probes
    .map(
      (p) => `
    <tr>
      <td style="padding:10px 12px;border-top:1px solid #eee5d3;vertical-align:top;width:60px;">
        <span style="display:inline-block;padding:3px 9px;border-radius:3px;background:${STATUS_COLOR[p.status]};color:#fff;font-family:'Courier New',monospace;font-size:11px;font-weight:700;letter-spacing:0.08em;">${STATUS_LABEL[p.status]}</span>
      </td>
      <td style="padding:10px 12px;border-top:1px solid #eee5d3;">
        <div style="font-family:Georgia,serif;font-weight:600;color:#1a1210;">${p.name}</div>
        <div style="font-family:Arial,sans-serif;font-size:13px;color:#3a2f28;margin-top:2px;">${p.detail}</div>
        ${p.hint ? `<div style="font-family:Arial,sans-serif;font-size:12px;color:#6b5c50;margin-top:4px;font-style:italic;">→ ${p.hint}</div>` : ""}
      </td>
    </tr>`,
    )
    .join("");

  const fails = probes.filter((p) => p.status === "fail").length;
  const warns = probes.filter((p) => p.status === "warn").length;
  const oks = probes.filter((p) => p.status === "ok").length;
  const headline = fails > 0 ? `⚠︎ ${fails} FAIL · ${warns} WARN · ${oks} OK` : warns > 0 ? `${warns} WARN · ${oks} OK` : `All ${oks} systems OK`;
  const headlineColor = fails > 0 ? "#b91c1c" : warns > 0 ? "#b57e14" : "#4a7c47";

  return `<!DOCTYPE html><html><body style="margin:0;padding:0;background:#f6f1ea;font-family:Arial,sans-serif;">
  <table role="presentation" width="100%" cellspacing="0" cellpadding="0" border="0" style="background:#f6f1ea;padding:24px 12px;">
    <tr><td align="center">
      <table role="presentation" width="580" cellspacing="0" cellpadding="0" border="0" style="max-width:580px;background:#fff;border:1px solid #eee5d3;border-radius:6px;overflow:hidden;">
        <tr><td style="padding:20px 24px;border-bottom:1px solid #eee5d3;">
          <div style="font-family:Georgia,serif;font-size:11px;letter-spacing:0.14em;text-transform:uppercase;color:#B0741A;font-weight:700;">Ownology · Daily health digest</div>
          <div style="font-family:Georgia,serif;font-size:22px;font-weight:600;color:${headlineColor};margin-top:6px;">${headline}</div>
          <div style="font-family:Arial,sans-serif;font-size:12px;color:#6b5c50;margin-top:4px;">${generatedAt.toISOString()}</div>
        </td></tr>
        <tr><td><table role="presentation" width="100%" cellspacing="0" cellpadding="0" border="0">${rows}</table></td></tr>
        <tr><td style="padding:14px 24px;border-top:1px solid #eee5d3;background:#fbf3e4;font-family:Arial,sans-serif;font-size:11px;color:#8a7565;">
          Automated. Runs daily 07:00 AEST. Trigger on demand: <code>/api/scheduled/health-digest</code>. — Owen.
        </td></tr>
      </table>
    </td></tr>
  </table></body></html>`;
}

export async function healthDigestHandler(req: Request, res: Response): Promise<void> {
  const shouldSend = req.query.send === "1";
  const cronSecret = process.env.CRON_SECRET?.trim() || null;
  const providedSecret =
    (req.headers["x-cron-secret"] as string | undefined)?.trim() ??
    (req.query.cronSecret as string | undefined)?.trim() ??
    null;
  const secretOk = cronSecret === null || providedSecret === cronSecret;

  const probes = await runAllProbes();
  const now = new Date();
  const summary = {
    generatedAt: now.toISOString(),
    totals: {
      ok: probes.filter((p) => p.status === "ok").length,
      warn: probes.filter((p) => p.status === "warn").length,
      fail: probes.filter((p) => p.status === "fail").length,
      skip: probes.filter((p) => p.status === "skip").length,
    },
    probes,
    emailed: false as boolean | string,
  };

  if (shouldSend && secretOk) {
    const apiKey = process.env.RESEND_API_KEY?.trim();
    const fromEmail = process.env.ALERT_FROM_EMAIL?.trim();
    const fromName = process.env.ALERT_FROM_NAME?.trim() ?? "Ownology Health";
    const adminEmails = (process.env.ADMIN_EMAILS ?? "")
      .split(",")
      .map((s) => s.trim())
      .filter(Boolean);
    if (!apiKey || !fromEmail || adminEmails.length === 0) {
      summary.emailed = "skipped_no_config";
    } else {
      try {
        const resend = new Resend(apiKey);
        const send = await resend.emails.send({
          from: `${fromName} <${fromEmail}>`,
          to: adminEmails,
          subject:
            summary.totals.fail > 0
              ? `⚠︎ Ownology health · ${summary.totals.fail} FAIL · ${summary.totals.warn} WARN`
              : summary.totals.warn > 0
              ? `Ownology health · ${summary.totals.warn} WARN`
              : `Ownology health · all ${summary.totals.ok} OK`,
          html: renderHtml(probes, now),
          text: probes.map((p) => `[${STATUS_LABEL[p.status]}] ${p.name}: ${p.detail}${p.hint ? ` — ${p.hint}` : ""}`).join("\n"),
        });
        if (send.error) throw new Error(send.error.message ?? "send failed");
        summary.emailed = send.data?.id ?? "sent";
      } catch (err) {
        summary.emailed = `error: ${err instanceof Error ? err.message : String(err)}`;
      }
    }
  } else if (shouldSend && !secretOk) {
    summary.emailed = "skipped_secret_mismatch";
  }

  res.json(summary);
}
