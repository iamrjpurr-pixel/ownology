/**
 * industryNews — WBM Online scraper + admin flows.
 *
 * Product intent (Feb 2026, Rich): invert the outreach workflow. Instead
 * of "look at each contact → hunt for a signal", the operator opens the
 * industry-news screen once a day, sees ~10 fresh items with the
 * matching contacts pre-attached, and one-clicks a Claude-drafted opener
 * that weaves the news into the SMS. Human-factors win: 10 items × auto-
 * matched contacts scales far better than 2000 contacts × manual search.
 *
 * Data lives in `industry_news_items`. See drizzle/schema.ts and the
 * bootstrap CREATE TABLE in server/index.ts.
 *
 * Endpoints:
 *   list             — recent items with matched-contact counts
 *   refresh          — scrape WBM /news/, upsert into DB
 *   itemContacts     — for a given item, return region-matched contacts
 *   generateOpener   — item + contact → Claude → sms_draft_override
 *   archive          — soft-dismiss an item so it drops out of the list
 */

import { z } from "zod";
import { and, desc, eq, gte, sql } from "drizzle-orm";
import { router, ownerProcedure } from "../trpc.js";
import { db } from "../db.js";
import * as schema from "../../drizzle/schema.js";
import { scrapeWbmNews } from "../services/wbmScraper.js";
import { claudeRewriteOne } from "./outreach-ai-helpers.js";

function previewBase(): string {
  return (
    process.env.PUBLIC_APP_URL?.trim() ||
    process.env.CANONICAL_HOST?.trim() ||
    "https://ownology.ai"
  ).replace(/\/$/, "");
}

/** Serialise a categories array to the DB storage format (newline-joined). */
function serialiseCategories(cats: string[]): string {
  return cats.join("\n").slice(0, 500);
}
function parseCategories(raw: string | null): string[] {
  if (!raw) return [];
  return raw.split("\n").map((c) => c.trim()).filter(Boolean);
}

export const industryNewsRouter = router({
  /**
   * list — recent (non-archived) items, newest first. Attaches
   * `matchedContactCount` per item so Rich can eyeball where the
   * highest-leverage news is before drilling in.
   */
  list: ownerProcedure
    .input(
      z
        .object({
          limit: z.number().int().min(1).max(200).default(50),
          maxAgeDays: z.number().int().min(1).max(180).default(45),
          region: z.string().max(64).optional(),
        })
        .optional(),
    )
    .query(async ({ input }) => {
      const limit = input?.limit ?? 50;
      const cutoff = Date.now() - (input?.maxAgeDays ?? 45) * 24 * 60 * 60 * 1000;
      const whereClauses = [
        eq(schema.industryNewsItems.archived, 0),
        gte(schema.industryNewsItems.publishedAt, cutoff),
      ];
      if (input?.region) whereClauses.push(eq(schema.industryNewsItems.region, input.region));

      const rows = await db
        .select()
        .from(schema.industryNewsItems)
        .where(and(...whereClauses))
        .orderBy(desc(schema.industryNewsItems.publishedAt))
        .limit(limit);

      // Fan-out one small count query per unique region. Cheap for the
      // typical page (10-30 items, ≤15 unique regions), avoids a JOIN
      // that would double the payload.
      const uniqueRegions = Array.from(
        new Set(rows.map((r) => r.region).filter((r): r is string => Boolean(r))),
      );
      const counts: Record<string, number> = {};
      for (const r of uniqueRegions) {
        const [res] = await db.execute(sql`
          SELECT COUNT(*) AS n FROM outreach_contacts
          WHERE region = ${r}
            AND (status IS NULL OR status IN ('cold','lukewarm','warm'))
        `);
        const rowsRes = res as unknown as { n: number | string }[];
        counts[r] = Number(rowsRes?.[0]?.n ?? 0);
      }

      return {
        items: rows.map((r) => ({
          id: r.id,
          source: r.source,
          url: r.url,
          headline: r.headline,
          dek: r.dek,
          imageUrl: r.imageUrl,
          region: r.region,
          categories: parseCategories(r.categories),
          author: r.author,
          publishedAt: r.publishedAt,
          fetchedAt: r.fetchedAt,
          matchedContactCount: r.region ? counts[r.region] ?? 0 : 0,
        })),
        // Newest `fetched_at` across ALL items (not just the filtered set)
        // so the admin UI can decide whether to silently auto-refresh on
        // page load. Feb 2026 — replaces the "should we cron this?"
        // question with a simpler stale-check on open.
        lastFetchedAt: rows.length > 0 ? Math.max(...rows.map((r) => r.fetchedAt)) : null,
      };
    }),

  /**
   * refresh — hit WBM, upsert the current top ~10 articles. Existing
   * URLs are updated in place (headlines occasionally get amended); new
   * ones inserted. Returns per-source counters.
   */
  refresh: ownerProcedure.mutation(async () => {
    const scraped = await scrapeWbmNews();
    const now = Date.now();
    let inserted = 0;
    let updated = 0;
    for (const item of scraped) {
      const existing = await db
        .select({ id: schema.industryNewsItems.id })
        .from(schema.industryNewsItems)
        .where(eq(schema.industryNewsItems.url, item.url))
        .limit(1);
      if (existing.length > 0) {
        await db
          .update(schema.industryNewsItems)
          .set({
            headline: item.headline,
            dek: item.dek,
            imageUrl: item.imageUrl,
            region: item.region,
            categories: serialiseCategories(item.categories),
            author: item.author,
            publishedAt: item.publishedAtMs,
            fetchedAt: now,
          })
          .where(eq(schema.industryNewsItems.id, existing[0].id));
        updated += 1;
      } else {
        await db.insert(schema.industryNewsItems).values({
          source: item.source,
          url: item.url,
          headline: item.headline,
          dek: item.dek,
          imageUrl: item.imageUrl,
          region: item.region,
          categories: serialiseCategories(item.categories),
          author: item.author,
          publishedAt: item.publishedAtMs,
          fetchedAt: now,
          archived: 0,
        });
        inserted += 1;
      }
    }
    return {
      ok: true,
      wbm: { scraped: scraped.length, inserted, updated },
      totalInserted: inserted,
      totalUpdated: updated,
    };
  }),

  /**
   * itemContacts — for a given news item, return outreach_contacts whose
   * region matches, ordered by "most SMS-ready first" (mobile present,
   * cold/lukewarm status, no recent SMS sent). Same prioritisation
   * philosophy as the outbound queue so Rich draws the highest-leverage
   * targets first.
   */
  itemContacts: ownerProcedure
    .input(z.object({ itemId: z.number().int().positive() }))
    .query(async ({ input }) => {
      const [item] = await db
        .select()
        .from(schema.industryNewsItems)
        .where(eq(schema.industryNewsItems.id, input.itemId))
        .limit(1);
      if (!item) return { item: null, contacts: [] };
      if (!item.region) return { item, contacts: [] };

      const contacts = await db
        .select({
          slug: schema.outreachContacts.slug,
          firstName: schema.outreachContacts.firstName,
          lastName: schema.outreachContacts.lastName,
          winery: schema.outreachContacts.winery,
          region: schema.outreachContacts.region,
          mobileAu: schema.outreachContacts.mobileAu,
          status: schema.outreachContacts.status,
          smsSentAt: schema.outreachContacts.smsSentAt,
          smsDraftOverride: schema.outreachContacts.smsDraftOverride,
          hookText: schema.outreachContacts.hookText,
        })
        .from(schema.outreachContacts)
        .where(eq(schema.outreachContacts.region, item.region))
        .limit(200);

      // Client-side sort: mobile-ready + cold/no-SMS first.
      const scored = contacts
        .map((c) => {
          let score = 0;
          if (c.mobileAu && /^\+614\d{8}$/.test(c.mobileAu)) score += 100;
          if (!c.smsSentAt) score += 40;
          if ((c.status ?? "cold") === "cold") score += 20;
          if ((c.status ?? "cold") === "lukewarm") score += 15;
          if ((c.status ?? "cold") === "warm") score += 10;
          if (c.smsDraftOverride && c.smsDraftOverride.trim().length > 0) score -= 5;
          return { ...c, score };
        })
        .sort((a, b) => b.score - a.score);

      return {
        item: {
          id: item.id,
          headline: item.headline,
          dek: item.dek,
          url: item.url,
          region: item.region,
          categories: parseCategories(item.categories),
          publishedAt: item.publishedAt,
        },
        contacts: scored,
      };
    }),

  /**
   * generateOpener — call Claude with the news item + contact profile,
   * store the resulting SMS as `sms_draft_override` on the contact.
   * Returns the SMS so the UI can preview before Rich confirms.
   */
  generateOpener: ownerProcedure
    .input(
      z.object({
        itemId: z.number().int().positive(),
        contactSlug: z.string().min(1).max(200),
        tone: z.enum(["warm", "brief", "regional"]).default("regional"),
      }),
    )
    .mutation(async ({ input }) => {
      const forgeUrl = process.env.BUILT_IN_FORGE_API_URL;
      const forgeKey = process.env.BUILT_IN_FORGE_API_KEY;
      if (!forgeUrl || !forgeKey) {
        throw new Error("Forge / LLM env vars not configured");
      }

      const [item] = await db
        .select()
        .from(schema.industryNewsItems)
        .where(eq(schema.industryNewsItems.id, input.itemId))
        .limit(1);
      if (!item) throw new Error("News item not found");

      const [c] = await db
        .select()
        .from(schema.outreachContacts)
        .where(eq(schema.outreachContacts.slug, input.contactSlug))
        .limit(1);
      if (!c) throw new Error("Contact not found");

      const publishedIso = new Date(item.publishedAt).toISOString().slice(0, 10);
      const { sms, signalsAcknowledged } = await claudeRewriteOne({
        forgeUrl,
        forgeKey,
        previewBase: previewBase(),
        tone: input.tone,
        industrySignal: {
          headline: item.headline,
          dek: item.dek ?? null,
          source: item.source === "wbm" ? "WBM" : item.source,
          sourceUrl: item.url,
          publishedAtIso: publishedIso,
          region: item.region,
        },
        contact: {
          slug: c.slug,
          firstName: c.firstName,
          lastName: c.lastName,
          winery: c.winery,
          region: c.region,
          event: c.event,
          painPoint: c.painPoint,
          hookText: c.hookText,
          hookTier: c.hookTier,
          notes: c.notes,
          persona: c.persona,
        },
      });

      // Persist to sms_draft_override so Copy SMS / mailto: flows use
      // the news-anchored version. Also stamp hook_source_url so the
      // /hi/:slug landing can (eventually) show the source article to
      // the prospect as a trust signal.
      await db
        .update(schema.outreachContacts)
        .set({
          smsDraftOverride: sms,
          hookSourceUrl: item.url,
          hookTier: "industry_signal",
        })
        .where(eq(schema.outreachContacts.slug, c.slug));

      return {
        ok: true,
        sms,
        signalsAcknowledged,
        articleUrl: item.url,
      };
    }),

  /**
   * archive — soft-dismiss an item (Rich processed it, or it's not
   * useful). Falls out of the default list; still reachable via a
   * "show archived" toggle if we add one.
   */
  archive: ownerProcedure
    .input(z.object({ itemId: z.number().int().positive() }))
    .mutation(async ({ input }) => {
      await db
        .update(schema.industryNewsItems)
        .set({ archived: 1 })
        .where(eq(schema.industryNewsItems.id, input.itemId));
      return { ok: true };
    }),
});
