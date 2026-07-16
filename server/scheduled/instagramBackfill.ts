/**
 * Instagram backfill cron — /api/scheduled/instagram-backfill
 *
 * Fires nightly (configure via Railway cron — recommended 2am AEST when
 * Perplexity is idle and the winemaker isn't looking). Runs the same
 * `runInstagramBackfill()` core the manual admin button uses, capped at
 * 20 contacts per run to keep the nightly spend well under $0.10.
 *
 * Why nightly (not hourly)?
 *   - Perplexity Sonar isn't cheap enough to burn on unbounded polling.
 *   - The backlog of IG-less contacts only refills when new leads land,
 *     which averages a handful per day.
 *   - Once the queue is drained the cron becomes a no-op — it just
 *     checks and moves on.
 *
 * Env vars:
 *   CRON_SECRET  — optional. If set, live runs require either header
 *                  `x-cron-secret: <value>` or `?cronSecret=<value>`.
 *                  Missing/wrong secret downgrades to a candidate-count
 *                  dry-run.
 *
 * Query params:
 *   dryRun=1     — force dry-run even with a valid secret. Useful for
 *                  the operator to peek at the backlog without spending.
 *   limit=<N>    — override the default limit (20). Capped server-side
 *                  at 200 so a rogue query can't blow the budget.
 *
 * Return: JSON `{ ok, dryRun, limit, checked, found, notFound, errors,
 *   updates? }` — updates only present on live runs.
 */
import type { Request, Response } from "express";
import { runInstagramBackfill } from "../instagramBackfillCore.js";
import { db } from "../db.js";
import * as schema from "../../drizzle/schema.js";
import { desc, sql } from "drizzle-orm";

const DEFAULT_LIMIT = 20;
const MAX_LIMIT = 200;

export async function instagramBackfillHandler(req: Request, res: Response): Promise<void> {
  const cronSecret = process.env.CRON_SECRET?.trim() || null;
  const providedSecret = (req.headers["x-cron-secret"] as string | undefined)?.trim()
    ?? (req.query.cronSecret as string | undefined)?.trim()
    ?? null;
  const secretRequired = cronSecret !== null;
  const secretOk = !secretRequired || providedSecret === cronSecret;
  const dryRunRequested = req.query.dryRun === "1";

  const rawLimit = Number(req.query.limit ?? DEFAULT_LIMIT);
  const limit = Number.isFinite(rawLimit) && rawLimit > 0
    ? Math.min(Math.floor(rawLimit), MAX_LIMIT)
    : DEFAULT_LIMIT;

  const dryRun = dryRunRequested || !secretOk;
  if (!secretOk && !dryRunRequested) {
    console.warn("[ig-backfill-cron] CRON_SECRET mismatch — downgrading to dry-run.");
  }

  if (dryRun) {
    // Same candidate filter as the live path — no Perplexity calls, no
    // DB writes, just a headline count so the operator can see the
    // backlog size.
    const candidates = await db
      .select({
        slug: schema.outreachContacts.slug,
        winery: schema.outreachContacts.winery,
      })
      .from(schema.outreachContacts)
      .where(sql`
        winery IS NOT NULL
        AND LENGTH(TRIM(winery)) > 0
        AND (
          notes IS NULL OR (
            notes NOT LIKE '%IG:%'
            AND notes NOT LIKE '%Instagram:%'
            AND notes NOT LIKE '%instagram.com/%'
            AND notes NOT LIKE '%Insta:%'
          )
        )
      `)
      .orderBy(desc(schema.outreachContacts.createdAt))
      .limit(limit);

    console.log(`[ig-backfill-cron] DRY-RUN — ${candidates.length} candidates would be processed`);
    res.status(200).json({
      ok: true,
      dryRun: true,
      limit,
      checked: candidates.length,
      found: 0,
      notFound: 0,
      errors: 0,
      candidates: candidates.map((c) => ({ slug: c.slug, winery: c.winery })),
    });
    return;
  }

  try {
    const result = await runInstagramBackfill(limit);
    console.log(`[ig-backfill-cron] complete — checked=${result.checked} found=${result.found} notFound=${result.notFound} errors=${result.errors}`);
    res.status(200).json({
      ok: true,
      dryRun: false,
      limit,
      checked: result.checked,
      found: result.found,
      notFound: result.notFound,
      errors: result.errors,
      updates: result.updates,
    });
  } catch (err) {
    const msg = err instanceof Error ? err.message : String(err);
    console.error("[ig-backfill-cron] failed:", msg);
    res.status(500).json({ ok: false, error: msg });
  }
}
