/**
 * Heartbeat handler: /api/scheduled/trinity-newsletter
 *
 * Two modes (same endpoint, driven by ?mode=):
 *  - mode=monthly (default): compose this month's issue from the top featured
 *    Trinity pieces, create a Buttondown DRAFT, persist a local "preview" row,
 *    and notify the owner. The issue is NOT sent yet — it sits in a 24h
 *    owner-preview window.
 *  - mode=finalize: auto-send any draft whose 24h preview window has elapsed and
 *    that the owner neither approved nor skipped. Intended to run daily.
 *
 * Recommended schedule:
 *  - monthly  : 1st of each month, 09:00 AEST (23:00 UTC prev day)
 *  - finalize : daily, 10:00 AEST (00:00 UTC)
 *
 * Registered in server/index.ts BEFORE express.json().
 */

import type { Request, Response } from "express";
import { ENV } from "../_core/env.js";
import {
  runMonthlyNewsletter,
  finalizeExpiredNewsletters,
} from "../trinityPipeline.js";

async function sendOwnerNotification(title: string, content: string) {
  const forgeUrl = ENV.forgeApiUrl?.replace(/\/+$/, "");
  const forgeKey = ENV.forgeApiKey;
  const appId = process.env.VITE_APP_ID;
  const ownerOpenId = ENV.ownerOpenId;
  if (!forgeUrl || !forgeKey || !appId || !ownerOpenId) {
    console.warn("[TrinityNewsletter] Notification env vars missing — skipping push.");
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
    console.error("[TrinityNewsletter] Notification send failed:", err);
    return false;
  }
}

export async function trinityNewsletterHandler(req: Request, res: Response) {
  const mode = String(req.query.mode ?? "monthly");
  try {
    if (mode === "finalize") {
      const result = await finalizeExpiredNewsletters();
      console.log(
        `[TrinityNewsletter] finalize sent=${result.sent} failed=${result.failed}`
      );
      if (result.sent > 0) {
        await sendOwnerNotification(
          `Monthly newsletter sent`,
          `${result.sent} Ownology Cellar Notes issue${result.sent > 1 ? "s" : ""} ` +
            `auto-sent after the 24h preview window.`
        );
      }
      res.json({ ok: true, mode, ...result });
      return;
    }

    // Default: compose this month's issue.
    const result = await runMonthlyNewsletter();
    console.log(
      `[TrinityNewsletter] monthly created=${result.created} period=${result.period} ` +
        `reason=${result.reason ?? "ok"} pieces=${result.pieceCount}`
    );

    if (result.created) {
      await sendOwnerNotification(
        `Newsletter ready for review — ${result.period}`,
        `This month's "${result.subject}" is drafted from your ${result.pieceCount} ` +
          `top featured Trinity pieces and is waiting in a 24-hour preview window.\n\n` +
          `Open Trinity Review → Newsletter to approve it now or skip this issue. ` +
          `If you do nothing, it sends automatically after 24 hours.`
      );
    }

    res.json({ ok: true, mode, ...result });
  } catch (err) {
    console.error("[TrinityNewsletter] Handler error:", err);
    res.status(500).json({
      error: String(err),
      context: { url: req.url, mode },
      timestamp: new Date().toISOString(),
    });
  }
}
