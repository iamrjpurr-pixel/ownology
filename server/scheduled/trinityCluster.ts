/**
 * Heartbeat handler: /api/scheduled/trinity-cluster
 *
 * Fires nightly (recommended 02:30 AEST = 16:30 UTC previous day).
 * 1. Clusters unprocessed Free Run "Go Deeper" reveals by semantic similarity
 *    (LLM grouping — no /v1/embeddings endpoint available, see trinityPipeline).
 * 2. For each cluster of 3+ similar questions, selects the highest-rated reveal,
 *    runs an editorial polish + private bible accuracy pass, dedupes against
 *    already-published pieces, and inserts a "pending" community Trinity piece.
 * 3. Regenerates the auto-FAQ from the top clusters.
 * 4. Notifies the project owner with a digest of new pieces + accuracy flags.
 *
 * Registered in server/index.ts BEFORE express.json().
 */

import type { Request, Response } from "express";
import { ENV } from "../_core/env.js";
import { getTrinityStatusCounts } from "../db.js";
import { runTrinityClustering, generateFaqFromClusters } from "../trinityPipeline.js";

async function sendOwnerNotification(title: string, content: string) {
  const forgeUrl = ENV.forgeApiUrl?.replace(/\/+$/, "");
  const forgeKey = ENV.forgeApiKey;
  const appId = process.env.VITE_APP_ID;
  const ownerOpenId = ENV.ownerOpenId;
  if (!forgeUrl || !forgeKey || !appId || !ownerOpenId) {
    console.warn("[TrinityCluster] Notification env vars missing — skipping push.");
    return false;
  }
  try {
    const resp = await fetch(`${forgeUrl}/v1/notification/send`, {
      method: "POST",
      headers: { "Content-Type": "application/json", Authorization: `Bearer ${forgeKey}` },
      body: JSON.stringify({ app_id: appId, open_id: ownerOpenId, title, content }),
    });
    return resp.ok;
  } catch (err) {
    console.error("[TrinityCluster] Notification send failed:", err);
    return false;
  }
}

export async function trinityClusterHandler(req: Request, res: Response) {
  try {
    const summary = await runTrinityClustering();
    let faqCount = 0;
    try {
      faqCount = await generateFaqFromClusters();
    } catch (err) {
      console.error("[TrinityCluster] FAQ generation failed (non-fatal):", err);
    }

    console.log(
      `[TrinityCluster] scanned=${summary.scanned} clusters=${summary.clusters} ` +
        `published=${summary.published} flagged=${summary.flagged} ` +
        `dupes=${summary.suppressedDuplicates} faq=${faqCount}`
    );

    // Owner digest — only notify when something actually published.
    if (summary.published > 0) {
      const counts = await getTrinityStatusCounts();
      const strongCandidates = summary.pieces.filter((p) => !p.flagged && p.clusterSize >= 4).length;
      const lines = summary.pieces
        .slice(0, 10)
        .map(
          (p) =>
            `• ${p.question}  (${p.clusterSize} asks${p.flagged ? ", ⚠ accuracy review" : ""})`
        );
      const flaggedNote =
        summary.flagged > 0
          ? `\n\n${summary.flagged} piece${summary.flagged > 1 ? "s" : ""} flagged for accuracy review.`
          : "";
      await sendOwnerNotification(
        `${summary.published} new community piece${summary.published > 1 ? "s" : ""} ready — ${strongCandidates} strong candidate${strongCandidates === 1 ? "" : "s"}`,
        `The nightly Trinity pipeline produced ${summary.published} new community draft${summary.published > 1 ? "s" : ""}:\n\n` +
          `${lines.join("\n")}${flaggedNote}\n\n` +
          `${counts.pending} pending, ${counts.featured} featured. ` +
          `Open Trinity Review to promote the best pieces to Featured.`
      );
    }

    res.json({ ok: true, ...summary, faqCount });
  } catch (err) {
    console.error("[TrinityCluster] Handler error:", err);
    res.status(500).json({
      error: String(err),
      context: { url: req.url },
      timestamp: new Date().toISOString(),
    });
  }
}
