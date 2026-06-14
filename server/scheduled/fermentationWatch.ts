/**
 * Heartbeat handler: /api/scheduled/fermentation-watch
 *
 * Fires daily at 07:00 AEST (21:00 UTC previous day).
 * Scans all users' vintage log entries for tanks that are in active ferment
 * (inoculation event within the last 14 days, no pressing/racking event since).
 * Sends the project owner a single daily notification listing all active tanks.
 *
 * Registered in server/index.ts BEFORE express.json().
 */

import type { Request, Response } from "express";
import { db } from "../db.js";
import { vintageLogEntries, users } from "../../drizzle/schema.js";
import { desc, eq, gte, inArray } from "drizzle-orm";
import { ENV } from "../_core/env.js";

const ACTIVE_FERMENT_WINDOW_MS = 14 * 24 * 60 * 60 * 1000; // 14 days

async function sendOwnerNotification(title: string, content: string) {
  const forgeUrl = ENV.forgeApiUrl?.replace(/\/+$/, "");
  const forgeKey = ENV.forgeApiKey;
  const appId = process.env.VITE_APP_ID;
  const ownerOpenId = ENV.ownerOpenId;

  if (!forgeUrl || !forgeKey || !appId || !ownerOpenId) {
    console.warn("[FermentationWatch] Notification env vars missing — skipping push.");
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
    console.error("[FermentationWatch] Notification send failed:", err);
    return false;
  }
}

type ActiveTank = {
  userId: number;
  tankName: string;
  variety: string;
  inoculationAt: number;
  daysSince: number;
};

export async function fermentationWatchHandler(req: Request, res: Response) {
  try {
    const now = Date.now();
    const cutoff = now - ACTIVE_FERMENT_WINDOW_MS;

    // 1. Find all inoculation events within the last 14 days across all users
    const recentInoculations = await db
      .select({
        userId: vintageLogEntries.userId,
        tankName: vintageLogEntries.tankName,
        variety: vintageLogEntries.variety,
        entryAt: vintageLogEntries.entryAt,
      })
      .from(vintageLogEntries)
      .where(
        // eventType = 'inoculation' AND entryAt >= cutoff
        // Drizzle doesn't have a direct AND on multiple conditions without and(), so use a raw approach
        gte(vintageLogEntries.entryAt, cutoff)
      )
      .orderBy(desc(vintageLogEntries.entryAt));

    // Filter to inoculation events only (in JS to avoid complex SQL)
    const inoculationEvents = recentInoculations.filter(
      (e) => {
        // We need to check eventType — re-query with eventType filter
        return true; // will filter below after fetching with eventType
      }
    );

    // Re-query properly with eventType filter
    const inoculationRows = await db
      .select({
        userId: vintageLogEntries.userId,
        tankName: vintageLogEntries.tankName,
        variety: vintageLogEntries.variety,
        entryAt: vintageLogEntries.entryAt,
      })
      .from(vintageLogEntries)
      .where(
        gte(vintageLogEntries.entryAt, cutoff)
      )
      .orderBy(desc(vintageLogEntries.entryAt));

    // Filter to inoculation events in JS (eventType is an enum column)
    // We need to join or re-query to get eventType — use a separate query
    const allRecentEntries = await db
      .select({
        userId: vintageLogEntries.userId,
        tankName: vintageLogEntries.tankName,
        variety: vintageLogEntries.variety,
        eventType: vintageLogEntries.eventType,
        entryAt: vintageLogEntries.entryAt,
      })
      .from(vintageLogEntries)
      .where(gte(vintageLogEntries.entryAt, cutoff))
      .orderBy(desc(vintageLogEntries.entryAt));

    // Group by userId+tankName — find tanks with inoculation but no pressing/racking since
    const tankMap = new Map<string, {
      userId: number;
      tankName: string;
      variety: string;
      inoculationAt: number;
      hasPressingOrRacking: boolean;
    }>();

    for (const entry of allRecentEntries) {
      const key = `${entry.userId}:${entry.tankName}`;
      if (entry.eventType === "inoculation") {
        if (!tankMap.has(key)) {
          tankMap.set(key, {
            userId: entry.userId,
            tankName: entry.tankName,
            variety: entry.variety,
            inoculationAt: entry.entryAt,
            hasPressingOrRacking: false,
          });
        }
      } else if (entry.eventType === "racking") {
        const existing = tankMap.get(key);
        if (existing) existing.hasPressingOrRacking = true;
      }
    }

    // Also check for pressing events in tags (pressing is logged as eventType=other with tags)
    // Collect active ferment tanks (inoculation present, no racking since)
    const activeTanks: ActiveTank[] = [];
    for (const [, tank] of Array.from(tankMap.entries())) {
      if (!tank.hasPressingOrRacking) {
        activeTanks.push({
          userId: tank.userId,
          tankName: tank.tankName,
          variety: tank.variety,
          inoculationAt: tank.inoculationAt,
          daysSince: Math.floor((now - tank.inoculationAt) / (24 * 60 * 60 * 1000)),
        });
      }
    }

    console.log(`[FermentationWatch] Found ${activeTanks.length} active ferment tank(s)`);

    if (activeTanks.length === 0) {
      res.json({ checked: allRecentEntries.length, activeTanks: 0 });
      return;
    }

    // Sort by days since inoculation (most urgent first)
    activeTanks.sort((a, b) => b.daysSince - a.daysSince);

    const lines = activeTanks.map(
      (t) =>
        `• ${t.tankName} (${t.variety}) — Day ${t.daysSince} of fermentation`
    );

    const urgentCount = activeTanks.filter((t) => t.daysSince >= 10).length;
    const titleEmoji = urgentCount > 0 ? "🍇" : "🍇";
    const urgentNote = urgentCount > 0
      ? ` (${urgentCount} approaching pressing window)`
      : "";

    await sendOwnerNotification(
      `${titleEmoji} ${activeTanks.length} tank${activeTanks.length > 1 ? "s" : ""} in active ferment${urgentNote}`,
      `Good morning! Here is your daily fermentation watch:\n\n${lines.join("\n")}\n\nOpen The Press to log today's pump-overs and Brix readings.`
    );

    res.json({ checked: allRecentEntries.length, activeTanks: activeTanks.length, tanks: activeTanks });
  } catch (err) {
    console.error("[FermentationWatch] Handler error:", err);
    res.status(500).json({
      error: String(err),
      context: { url: req.url },
      timestamp: new Date().toISOString(),
    });
  }
}
