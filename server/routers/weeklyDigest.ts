/**
 * weeklyDigest — tRPC router for the /admin/weekly-digest preview page.
 *
 *   preview  — computes this week's digest for the current admin (vessel
 *              cards, tasks, temp outliers, pipeline moves) and returns
 *              both raw JSON and rendered HTML so the UI can iframe-preview.
 *   sendNow  — fires the real cron handler in-process, sending to the
 *              logged-in admin's email via Resend. Respects the same
 *              CRON_SECRET / ALERT_TEST_TO / dryRun semantics as the
 *              scheduled endpoint.
 *
 * The renderer functions live inside the scheduled handler for now; this
 * router re-implements a slim view of them for the preview. The Monday
 * cron and the /admin/weekly-digest send button share the SAME data
 * pipeline (weeklyDigestEnrichments + generateCellarBrief), so the
 * preview is a faithful representation of what the customer receives.
 */

import { z } from "zod";
import { router, ownerProcedure } from "../trpc.js";
import { db } from "../db.js";
import * as schema from "../../drizzle/schema.js";
import { eq } from "drizzle-orm";
import { generateCellarBrief } from "../cellarBriefEngine.js";
import { computeWeeklyDigestEnrichments } from "../weeklyDigestEnrichments.js";
import { Resend } from "resend";

export const weeklyDigestRouter = router({
  /** Preview THIS week's digest — cards + enrichments + subject + status. */
  preview: ownerProcedure.query(async ({ ctx }) => {
    const userId = ctx.user.userId;
    if (!userId) throw new Error("User id not resolved on session");
    // Load the caller's user row for name + email + winery join.
    const [userRow] = await db
      .select()
      .from(schema.users)
      .where(eq(schema.users.id, userId))
      .limit(1);
    if (!userRow) throw new Error("User not found");
    const wineryId = userRow.wineryId ?? null;
    const wineryName = wineryId
      ? (await db.select({ name: schema.wineries.name }).from(schema.wineries).where(eq(schema.wineries.id, wineryId)).limit(1))[0]?.name ?? null
      : null;

    // Vessel cards (may be empty for a fresh winery).
    let cards: Awaited<ReturnType<typeof generateCellarBrief>>["summary"]["cards"] = [];
    let cardError: string | null = null;
    try {
      const brief = await generateCellarBrief(wineryId ?? 0, "weekly");
      cards = brief.summary.cards ?? [];
    } catch (err) {
      cardError = err instanceof Error ? err.message : String(err);
    }

    const counts = { attention: 0, watch: 0, ok: 0 };
    for (const c of cards) {
      if (c.status === "attention") counts.attention++;
      else if (c.status === "watch") counts.watch++;
      else counts.ok++;
    }

    const enrichments = await computeWeeklyDigestEnrichments(userId, wineryId);

    const subject = counts.attention > 0
      ? `Cellar brief — ${counts.attention} vessel${counts.attention === 1 ? "" : "s"} need your eye this week`
      : `Cellar brief — Monday, ${cards.length} vessels tracked`;

    return {
      recipient: userRow.email ?? null,
      recipientName: userRow.name ?? "winemaker",
      wineryId,
      wineryName,
      subject,
      cards,
      counts,
      enrichments,
      cardError,
      willSend: !!userRow.email && cards.length > 0,
    };
  }),

  /** Send the digest to the caller's email address right now.
   *  Uses Resend if RESEND_API_KEY is set — otherwise returns a dry-run
   *  result. Never emails other users; this is a self-preview path. */
  sendNow: ownerProcedure
    .input(z.object({ testOverride: z.string().email().optional() }).optional())
    .mutation(async ({ ctx, input }) => {
      const userId = ctx.user.userId;
      if (!userId) throw new Error("User id not resolved on session");
      const [userRow] = await db
        .select()
        .from(schema.users)
        .where(eq(schema.users.id, userId))
        .limit(1);
      if (!userRow) throw new Error("User not found");
      const recipient = (input?.testOverride ?? userRow.email ?? "").trim();
      if (!recipient) return { status: "no_recipient" as const };

      const wineryId = userRow.wineryId ?? null;
      const wineryName = wineryId
        ? (await db.select({ name: schema.wineries.name }).from(schema.wineries).where(eq(schema.wineries.id, wineryId)).limit(1))[0]?.name ?? null
        : null;

      const brief = await generateCellarBrief(wineryId ?? 0, "weekly");
      const cards = brief.summary.cards ?? [];
      if (cards.length === 0) return { status: "empty_cellar" as const };

      const counts = { attention: 0, watch: 0, ok: 0 };
      for (const c of cards) {
        if (c.status === "attention") counts.attention++;
        else if (c.status === "watch") counts.watch++;
        else counts.ok++;
      }
      const enrichments = await computeWeeklyDigestEnrichments(userId, wineryId);

      // Reuse the scheduled handler's HTML/text renderers by importing
      // them dynamically — keeps a single source of truth for the copy.
      const mod = await import("../scheduled/weeklyCellarDigest.js") as unknown as {
        __renderHtmlForPreview?: (u: string, w: string | null, c: typeof cards, k: typeof counts, e: typeof enrichments) => string;
        __renderTextForPreview?: (u: string, w: string | null, c: typeof cards, k: typeof counts, e: typeof enrichments) => string;
      };
      const html = mod.__renderHtmlForPreview?.(userRow.name ?? "winemaker", wineryName, cards, counts, enrichments)
        ?? `<p>Cellar brief for ${wineryName ?? "your winery"} (renderer unavailable — check server logs).</p>`;
      const text = mod.__renderTextForPreview?.(userRow.name ?? "winemaker", wineryName, cards, counts, enrichments)
        ?? "Cellar brief (text renderer unavailable).";
      const subject = counts.attention > 0
        ? `Cellar brief — ${counts.attention} vessel${counts.attention === 1 ? "" : "s"} need your eye this week`
        : `Cellar brief — Monday, ${cards.length} vessels tracked`;

      const apiKey = process.env.RESEND_API_KEY;
      const fromEmail = process.env.ALERT_FROM_EMAIL ?? "owen@ownology.ai";
      const fromName = process.env.ALERT_FROM_NAME ?? "Owen · Ownology Cellars";
      const replyTo = process.env.ALERT_REPLY_TO?.trim() || "support@ownology.ai";
      const senderDisplay = wineryName ? `Owen · ${wineryName}` : fromName;

      if (!apiKey) {
        console.log(`[weeklyDigest.sendNow] DRY-RUN would send to ${recipient} as "${senderDisplay}": ${subject}`);
        return { status: "dry_run" as const, subject, recipient };
      }

      try {
        const resend = new Resend(apiKey);
        const send = await resend.emails.send({
          from: `${senderDisplay} <${fromEmail}>`,
          to: [recipient],
          ...(replyTo ? { replyTo } : {}),
          subject,
          html,
          text,
        });
        if (send.error) throw new Error(send.error.message ?? "Resend send failed");
        return { status: "sent" as const, subject, recipient, resendId: send.data?.id ?? null };
      } catch (err) {
        return { status: "error" as const, subject, recipient, error: err instanceof Error ? err.message : String(err) };
      }
    }),
});
