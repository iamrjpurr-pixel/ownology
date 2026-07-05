/**
 * producers router — CRUD + bulk-import for the AU+NZ winery directory
 * that powers the future 3-touch cold-email engine (A3 backlog).
 *
 * Design decisions:
 * - `bulkImport` accepts a raw array so any source (CSV, JSON, scraper
 *   output) drops in unchanged. Dedupes by (name + country) inside a
 *   single call — you can re-run the import safely without duplicates.
 * - `list` supports country + status filters so the admin UI can slice
 *   the pipeline (untouched Vic wineries, touch_1_sent NZ producers, …).
 * - `updateStatus` is the state-machine entry point: touch_1_sent →
 *   touch_2_sent → touch_3_sent → replied/booked/opted_out. Called by
 *   the future Resend cron job (A3) or manually by the operator.
 * - `seedSample` lets the operator populate 10 real wineries with one
 *   click so the pipeline is testable even before a real CSV lands.
 */
import { z } from "zod";
import { and, desc, eq, sql } from "drizzle-orm";
import { router, ownerProcedure } from "../trpc.js";
import { db } from "../db.js";
import * as schema from "../../drizzle/schema.js";

const COUNTRY = z.enum(["AU", "NZ"]);
const OUTREACH_STATUS = z.enum([
  "untouched",
  "touch_1_sent",
  "touch_2_sent",
  "touch_3_sent",
  "replied",
  "booked",
  "opted_out",
]);

// Ten hand-picked real AU + NZ wineries so the pipeline is testable
// before a full CSV import lands. Deliberately mixes boutique + mid so
// we can validate the size_bracket UI. All from public sources.
const SAMPLE_PRODUCERS: Array<{
  name: string;
  country: "AU" | "NZ";
  region: string;
  website: string;
  sizeBracket: "boutique" | "mid";
}> = [
  { name: "Yalumba", country: "AU", region: "Barossa Valley", website: "https://www.yalumba.com", sizeBracket: "mid" },
  { name: "Henschke", country: "AU", region: "Eden Valley", website: "https://www.henschke.com.au", sizeBracket: "mid" },
  { name: "Wynns Coonawarra Estate", country: "AU", region: "Coonawarra", website: "https://www.wynns.com.au", sizeBracket: "mid" },
  { name: "Vasse Felix", country: "AU", region: "Margaret River", website: "https://vassefelix.com.au", sizeBracket: "mid" },
  { name: "Mount Mary", country: "AU", region: "Yarra Valley", website: "https://www.mountmary.com.au", sizeBracket: "boutique" },
  { name: "Ten Minutes by Tractor", country: "AU", region: "Mornington Peninsula", website: "https://www.tenminutesbytractor.com.au", sizeBracket: "boutique" },
  { name: "Cloudy Bay", country: "NZ", region: "Marlborough", website: "https://www.cloudybay.co.nz", sizeBracket: "mid" },
  { name: "Felton Road", country: "NZ", region: "Central Otago", website: "https://www.feltonroad.com", sizeBracket: "boutique" },
  { name: "Craggy Range", country: "NZ", region: "Hawke's Bay", website: "https://www.craggyrange.com", sizeBracket: "mid" },
  { name: "Kumeu River", country: "NZ", region: "Auckland", website: "https://kumeuriver.co.nz", sizeBracket: "boutique" },
];

export const producersRouter = router({
  /** OWNER — list producers, optional country + status filter. */
  list: ownerProcedure
    .input(
      z
        .object({
          country: COUNTRY.optional(),
          status: OUTREACH_STATUS.optional(),
          limit: z.number().int().min(1).max(5000).default(500),
        })
        .optional()
    )
    .query(async ({ input }) => {
      const country = input?.country;
      const status = input?.status;
      const limit = input?.limit ?? 500;
      const conditions = [];
      if (country) conditions.push(eq(schema.wineProducers.country, country));
      if (status) conditions.push(eq(schema.wineProducers.outreachStatus, status));
      const where = conditions.length > 0 ? and(...conditions) : undefined;
      const q = db.select().from(schema.wineProducers);
      const rows = where
        ? await q.where(where).orderBy(desc(schema.wineProducers.createdAt)).limit(limit)
        : await q.orderBy(desc(schema.wineProducers.createdAt)).limit(limit);
      return { producers: rows };
    }),

  /** OWNER — aggregate stats for the pipeline dashboard. */
  stats: ownerProcedure.query(async () => {
    const byCountry = await db
      .select({
        country: schema.wineProducers.country,
        count: sql<number>`COUNT(*)`,
      })
      .from(schema.wineProducers)
      .groupBy(schema.wineProducers.country);
    const byStatus = await db
      .select({
        status: schema.wineProducers.outreachStatus,
        count: sql<number>`COUNT(*)`,
      })
      .from(schema.wineProducers)
      .groupBy(schema.wineProducers.outreachStatus);
    const total = await db
      .select({ n: sql<number>`COUNT(*)` })
      .from(schema.wineProducers);
    return {
      total: Number(total[0]?.n ?? 0),
      byCountry: byCountry.map((r) => ({ country: r.country, count: Number(r.count) })),
      byStatus: byStatus.map((r) => ({ status: r.status, count: Number(r.count) })),
    };
  }),

  /** OWNER — bulk insert. Dedupes by (name + country) inside the call
   *  so importing the same CSV twice is safe. Returns counts of inserted
   *  vs. skipped rows so the operator sees exactly what happened. */
  bulkImport: ownerProcedure
    .input(
      z.object({
        source: z.string().max(60).default("manual"),
        producers: z
          .array(
            z.object({
              name: z.string().min(1).max(200),
              country: COUNTRY,
              region: z.string().max(120).optional(),
              website: z.string().max(300).optional(),
              email: z.string().email().max(200).optional().or(z.literal("")),
              contactName: z.string().max(120).optional(),
              contactRole: z.string().max(120).optional(),
              sizeBracket: z.enum(["boutique", "mid", "large"]).optional(),
            })
          )
          .min(1)
          .max(5000),
      })
    )
    .mutation(async ({ input }) => {
      // Fetch existing (name + country) pairs to dedupe against.
      const existing = await db
        .select({
          name: schema.wineProducers.name,
          country: schema.wineProducers.country,
        })
        .from(schema.wineProducers);
      const seen = new Set(existing.map((e) => `${e.country}::${e.name.toLowerCase()}`));

      let inserted = 0;
      let skipped = 0;
      const now = Date.now();
      const toInsert: (typeof schema.wineProducers.$inferInsert)[] = [];
      for (const p of input.producers) {
        const key = `${p.country}::${p.name.toLowerCase()}`;
        if (seen.has(key)) {
          skipped += 1;
          continue;
        }
        seen.add(key);
        toInsert.push({
          name: p.name.trim(),
          country: p.country,
          region: p.region?.trim() || null,
          website: p.website?.trim() || null,
          email: p.email && p.email.trim() ? p.email.trim().toLowerCase() : null,
          contactName: p.contactName?.trim() || null,
          contactRole: p.contactRole?.trim() || null,
          sizeBracket: p.sizeBracket ?? null,
          phase1Source: input.source,
          outreachStatus: "untouched",
          touchCount: 0,
          createdAt: now,
        });
        inserted += 1;
      }
      if (toInsert.length > 0) {
        // Chunk inserts to keep the SQL under the driver's limit.
        for (let i = 0; i < toInsert.length; i += 200) {
          await db.insert(schema.wineProducers).values(toInsert.slice(i, i + 200));
        }
      }
      return { ok: true, inserted, skipped };
    }),

  /** OWNER — seed 10 real AU+NZ wineries for pipeline testing. */
  seedSample: ownerProcedure.mutation(async () => {
    const existing = await db
      .select({
        name: schema.wineProducers.name,
        country: schema.wineProducers.country,
      })
      .from(schema.wineProducers);
    const seen = new Set(existing.map((e) => `${e.country}::${e.name.toLowerCase()}`));
    const now = Date.now();
    const rows = SAMPLE_PRODUCERS.filter(
      (p) => !seen.has(`${p.country}::${p.name.toLowerCase()}`)
    ).map((p) => ({
      name: p.name,
      country: p.country,
      region: p.region,
      website: p.website,
      sizeBracket: p.sizeBracket,
      phase1Source: "hand_curated_sample",
      outreachStatus: "untouched" as const,
      touchCount: 0,
      createdAt: now,
    }));
    if (rows.length > 0) {
      await db.insert(schema.wineProducers).values(rows);
    }
    return { ok: true, inserted: rows.length };
  }),

  /** OWNER — advance a producer's outreach status (state machine). */
  updateStatus: ownerProcedure
    .input(
      z.object({
        id: z.number().int(),
        status: OUTREACH_STATUS,
      })
    )
    .mutation(async ({ input }) => {
      await db
        .update(schema.wineProducers)
        .set({
          outreachStatus: input.status,
          lastTouchedAt: Date.now(),
          // Only bump touch count when moving through touch_N_sent states.
          touchCount:
            input.status === "touch_1_sent"
              ? 1
              : input.status === "touch_2_sent"
              ? 2
              : input.status === "touch_3_sent"
              ? 3
              : sql`touch_count`,
        })
        .where(eq(schema.wineProducers.id, input.id));
      return { ok: true };
    }),

  /** OWNER — remove a producer (opt-out or wrong data). */
  remove: ownerProcedure
    .input(z.object({ id: z.number().int() }))
    .mutation(async ({ input }) => {
      await db
        .delete(schema.wineProducers)
        .where(eq(schema.wineProducers.id, input.id));
      return { ok: true };
    }),
});
