/**
 * cronSecret — shared guard for /api/scheduled/* endpoints.
 *
 * Jul 2026 audit (SEC-002) surfaced that empty CRON_SECRET was silently
 * treated as "no secret required" — which meant any anonymous internet
 * visitor could POST any scheduled endpoint and trigger real Resend
 * emails / Perplexity spend / DB writes. This module hardens the contract:
 *
 *   • CRON_SECRET unset  → live sends REFUSED. Dry-run only. Logs a
 *                           loud warning so the operator sees it.
 *   • CRON_SECRET set    → header/query must match. Otherwise dry-run.
 *   • dryRun=1 query     → always dry-run, regardless of secret.
 *
 * Returns `{ dryRun, secretConfigured, secretOk, reason }` so each cron
 * handler can decide its own dry-run behaviour (some skip external
 * side-effects entirely; some run the compute + log the results).
 */

import type { Request } from "express";

export type CronSecretResult = {
  /** True when the handler should skip live side-effects. */
  dryRun: boolean;
  /** True when CRON_SECRET env is set to a non-empty value. */
  secretConfigured: boolean;
  /** True when the caller supplied a matching secret. */
  secretOk: boolean;
  /** Human-readable reason. Safe to log. */
  reason: "explicit_dryrun" | "secret_missing" | "secret_mismatch" | "ok" | "no_api_key";
};

/**
 * Evaluate whether a scheduled endpoint should perform live side-effects.
 *
 * @param req         Express request.
 * @param handlerName Prefix for log lines (e.g. "weekly-cellar-digest").
 * @param opts.hasApiKey  If false, forces dry-run regardless (e.g. Resend
 *                        key not set → nothing to send anyway).
 */
export function evaluateCronSecret(
  req: Request,
  handlerName: string,
  opts: { hasApiKey?: boolean } = {},
): CronSecretResult {
  const cronSecret = process.env.CRON_SECRET?.trim() || null;
  const providedSecret = (req.headers["x-cron-secret"] as string | undefined)?.trim()
    ?? (req.query.cronSecret as string | undefined)?.trim()
    ?? null;

  const dryRunRequested = req.query.dryRun === "1";
  const noApiKey = opts.hasApiKey === false;
  const secretConfigured = cronSecret !== null;
  const secretOk = secretConfigured && providedSecret === cronSecret;

  if (dryRunRequested) {
    return { dryRun: true, secretConfigured, secretOk, reason: "explicit_dryrun" };
  }
  if (noApiKey) {
    return { dryRun: true, secretConfigured, secretOk, reason: "no_api_key" };
  }
  if (!secretConfigured) {
    console.warn(`[${handlerName}] CRON_SECRET is not set in the environment — refusing live send. Configure CRON_SECRET and pass \`x-cron-secret\` header to enable live sends.`);
    return { dryRun: true, secretConfigured, secretOk, reason: "secret_missing" };
  }
  if (!secretOk) {
    console.warn(`[${handlerName}] CRON_SECRET mismatch — downgrading to dry-run.`);
    return { dryRun: true, secretConfigured, secretOk, reason: "secret_mismatch" };
  }
  return { dryRun: false, secretConfigured, secretOk, reason: "ok" };
}
