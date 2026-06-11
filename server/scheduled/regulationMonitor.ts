/**
 * Heartbeat handler: /api/scheduled/regulation-monitor
 *
 * Fires weekly (cron: "0 0 9 * * 1" — every Monday 09:00 UTC).
 * Checks two free official feeds for new regulation publications:
 *   1. FSANZ Notification Circulars (foodstandards.gov.au)
 *   2. Wine Australia News (wineaustralia.com)
 *
 * When a new publication is found that hasn't been seen before, it:
 *   - Inserts a row into regulation_monitor_seen
 *   - Sends an owner notification via the Manus notification API
 *
 * This handler is registered in server/index.ts BEFORE express.json().
 *
 * SOURCE DOCTRINE:
 * The full authoritative source map (official URLs, monitoring channels,
 * update frequencies) lives in server/complianceKnowledgeBase.ts → SOURCE_DOCTRINE.
 * This handler checks the two highest-frequency feeds; manual checks for
 * state legislation portals are documented in SOURCE_DOCTRINE.monitorChannel.
 */

import type { Request, Response } from "express";
import { db } from "../db.js";
import { regulationMonitorSeen } from "../../drizzle/schema.js";
import { eq } from "drizzle-orm";
import { ENV } from "../_core/env.js";

// ─── Feed scrapers ────────────────────────────────────────────────────────────

type Publication = {
  title: string;
  url: string;
  source: string;
};

/**
 * Fetches the FSANZ Notification Circulars page and extracts the most recent
 * circular links. Returns up to 10 recent publications.
 */
async function fetchFsanzCirculars(): Promise<Publication[]> {
  try {
    const resp = await fetch(
      "https://www.foodstandards.gov.au/food-standards-code/circulars",
      {
        headers: {
          "User-Agent":
            "Ownology-RegulationMonitor/1.0 (compliance@ownology.com.au)",
        },
        signal: AbortSignal.timeout(20_000),
      }
    );
    if (!resp.ok) {
      console.warn(`[RegMonitor] FSANZ fetch failed: ${resp.status}`);
      return [];
    }
    const html = await resp.text();

    // Extract circular links — pattern: /food-standards-code/circulars/notification-circular-NNN-YY
    const pattern =
      /href="(\/food-standards-code\/circulars\/notification-circular-[^"]+)"/gi;
    const seen = new Set<string>();
    const results: Publication[] = [];

    let match: RegExpExecArray | null;
    while ((match = pattern.exec(html)) !== null && results.length < 10) {
      const path = match[1];
      const url = `https://www.foodstandards.gov.au${path}`;
      if (seen.has(url)) continue;
      seen.add(url);

      // Extract a title from the path slug
      const slug = path.split("/").pop() ?? path;
      const title = slug
        .replace(/-/g, " ")
        .replace(/\b\w/g, (c) => c.toUpperCase());

      results.push({ title: `FSANZ ${title}`, url, source: "FSANZ" });
    }

    console.log(`[RegMonitor] FSANZ: found ${results.length} circulars`);
    return results;
  } catch (err) {
    console.error("[RegMonitor] FSANZ fetch error:", err);
    return [];
  }
}

/**
 * Fetches the Wine Australia news page and extracts the most recent article links.
 * Returns up to 10 recent publications.
 */
async function fetchWineAustraliaNews(): Promise<Publication[]> {
  try {
    const resp = await fetch("https://www.wineaustralia.com/news", {
      headers: {
        "User-Agent":
          "Ownology-RegulationMonitor/1.0 (compliance@ownology.com.au)",
      },
      signal: AbortSignal.timeout(20_000),
    });
    if (!resp.ok) {
      console.warn(`[RegMonitor] WineAustralia fetch failed: ${resp.status}`);
      return [];
    }
    const html = await resp.text();

    // Extract article links — Wine Australia uses /news/ paths
    const pattern = /href="(\/news\/[^"?#]+)"/gi;
    const seen = new Set<string>();
    const results: Publication[] = [];

    let match: RegExpExecArray | null;
    while ((match = pattern.exec(html)) !== null && results.length < 10) {
      const path = match[1];
      if (path === "/news/" || path === "/news") continue;
      const url = `https://www.wineaustralia.com${path}`;
      if (seen.has(url)) continue;
      seen.add(url);

      const slug = path.split("/").filter(Boolean).pop() ?? path;
      const title = slug
        .replace(/-/g, " ")
        .replace(/\b\w/g, (c) => c.toUpperCase());

      results.push({ title: `Wine Australia: ${title}`, url, source: "WineAustralia" });
    }

    console.log(`[RegMonitor] WineAustralia: found ${results.length} articles`);
    return results;
  } catch (err) {
    console.error("[RegMonitor] WineAustralia fetch error:", err);
    return [];
  }
}

// ─── Notification helper ──────────────────────────────────────────────────────

async function sendOwnerNotification(title: string, content: string) {
  const forgeUrl = ENV.forgeApiUrl?.replace(/\/+$/, "");
  const forgeKey = ENV.forgeApiKey;
  const appId = process.env.VITE_APP_ID;
  const ownerOpenId = ENV.ownerOpenId;

  if (!forgeUrl || !forgeKey || !appId || !ownerOpenId) {
    console.warn("[RegMonitor] Notification env vars missing — skipping push.");
    return false;
  }

  try {
    const resp = await fetch(`${forgeUrl}/v1/notification/send`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${forgeKey}`,
      },
      body: JSON.stringify({ app_id: appId, open_id: ownerOpenId, title, content }),
    });
    return resp.ok;
  } catch (err) {
    console.error("[RegMonitor] Notification send failed:", err);
    return false;
  }
}

// ─── Main handler ─────────────────────────────────────────────────────────────

export async function regulationMonitorHandler(req: Request, res: Response) {
  try {
    console.log("[RegMonitor] Starting weekly regulation check...");

    // Fetch all feeds in parallel
    const [fsanzPubs, waPubs] = await Promise.all([
      fetchFsanzCirculars(),
      fetchWineAustraliaNews(),
    ]);

    const allPubs = [...fsanzPubs, ...waPubs];
    console.log(`[RegMonitor] Total publications found: ${allPubs.length}`);

    const newPubs: Publication[] = [];
    const now = Date.now();

    for (const pub of allPubs) {
      // Check if we've already seen this URL
      const existing = await db
        .select({ id: regulationMonitorSeen.id })
        .from(regulationMonitorSeen)
        .where(eq(regulationMonitorSeen.publicationUrl, pub.url))
        .limit(1);

      if (existing.length > 0) continue;

      // New publication — insert and queue for notification
      await db.insert(regulationMonitorSeen).values({
        publicationUrl: pub.url,
        title: pub.title,
        source: pub.source,
        firstSeenAt: now,
        notified: 0,
      });

      newPubs.push(pub);
    }

    console.log(`[RegMonitor] New publications this run: ${newPubs.length}`);

    if (newPubs.length > 0) {
      // Group by source for a clean notification
      const bySource: Record<string, Publication[]> = {};
      for (const p of newPubs) {
        (bySource[p.source] ??= []).push(p);
      }

      const lines: string[] = [];
      for (const [source, pubs] of Object.entries(bySource)) {
        lines.push(`\n${source} (${pubs.length} new):`);
        for (const p of pubs) {
          lines.push(`  • ${p.title}\n    ${p.url}`);
        }
      }

      const notified = await sendOwnerNotification(
        `📋 ${newPubs.length} new regulation update${newPubs.length > 1 ? "s" : ""} detected`,
        `The weekly Ownology regulation monitor found new publications that may require a knowledge base update:\n${lines.join("\n")}\n\nReview each link and update server/complianceKnowledgeBase.ts if the content affects winery compliance requirements.`
      );

      if (notified) {
        // Mark all new pubs as notified
        for (const pub of newPubs) {
          await db
            .update(regulationMonitorSeen)
            .set({ notified: 1 })
            .where(eq(regulationMonitorSeen.publicationUrl, pub.url));
        }
      }
    }

    res.json({
      ok: true,
      checked: allPubs.length,
      newFound: newPubs.length,
      newTitles: newPubs.map((p) => p.title),
    });
  } catch (err) {
    console.error("[RegMonitor] Handler error:", err);
    res.status(500).json({
      error: String(err),
      context: { url: req.url },
      timestamp: new Date().toISOString(),
    });
  }
}
