/**
 * Heartbeat handler: /api/scheduled/vintage-reminders
 *
 * Fires every hour (cron: "0 * * * * *" — every hour on the minute).
 * For each active tank reminder, checks whether the tank has had a matching
 * vintage log entry within the configured threshold window. If not, sends an
 * owner notification via the Manus notification API.
 *
 * This handler is registered in server/index.ts BEFORE express.json().
 */

import type { Request, Response } from "express";
import {
  getAllActiveReminders,
  getLastEntryForTank,
  getUserByOpenId,
} from "../db.js";
import { ENV } from "../_core/env.js";

const EVENT_LABELS: Record<string, string> = {
  addition: "Addition",
  measurement: "Measurement",
  racking: "Racking",
  inoculation: "Inoculation",
  observation: "Observation",
  any: "any activity",
};

async function sendOwnerNotification(title: string, content: string) {
  const forgeUrl = ENV.forgeApiUrl?.replace(/\/+$/, "");
  const forgeKey = ENV.forgeApiKey;
  const appId = process.env.VITE_APP_ID;
  const ownerOpenId = ENV.ownerOpenId;

  if (!forgeUrl || !forgeKey || !appId || !ownerOpenId) {
    console.warn("[VintageReminders] Notification env vars missing — skipping push.");
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
    console.error("[VintageReminders] Notification send failed:", err);
    return false;
  }
}

export async function vintageRemindersHandler(req: Request, res: Response) {
  try {
    const reminders = await getAllActiveReminders();
    console.log(`[VintageReminders] Checking ${reminders.length} active reminders`);

    const now = Date.now();
    const overdueList: { tankName: string; eventType: string; hoursOverdue: number }[] = [];

    for (const reminder of reminders) {
      const thresholdMs = reminder.thresholdHours * 60 * 60 * 1000;
      const cutoffMs = now - thresholdMs;

      const lastEntry = await getLastEntryForTank(
        reminder.userId,
        reminder.tankName,
        reminder.eventType as "addition" | "measurement" | "racking" | "inoculation" | "observation" | "any"
      );

      const lastEntryAt = lastEntry?.entryAt ?? 0;

      if (lastEntryAt < cutoffMs) {
        const hoursOverdue = Math.floor((now - Math.max(lastEntryAt, cutoffMs - thresholdMs)) / (60 * 60 * 1000));
        overdueList.push({
          tankName: reminder.tankName,
          eventType: reminder.eventType,
          hoursOverdue: Math.floor((now - lastEntryAt) / (60 * 60 * 1000)),
        });
      }
    }

    if (overdueList.length > 0) {
      const lines = overdueList.map(
        (o) =>
          `• ${o.tankName} — ${EVENT_LABELS[o.eventType] ?? o.eventType} overdue by ~${o.hoursOverdue}h`
      );
      await sendOwnerNotification(
        `⚠️ ${overdueList.length} tank${overdueList.length > 1 ? "s" : ""} overdue in Vintage Log`,
        `The following tanks have not had a log entry within their reminder window:\n\n${lines.join("\n")}\n\nLog in to The Press to record entries.`
      );
      console.log(`[VintageReminders] Notified owner of ${overdueList.length} overdue tank(s)`);
    } else {
      console.log("[VintageReminders] All tanks up to date — no notification sent");
    }

    res.json({ checked: reminders.length, overdue: overdueList.length, overdueList });
  } catch (err) {
    console.error("[VintageReminders] Handler error:", err);
    res.status(500).json({ error: "Internal error" });
  }
}
