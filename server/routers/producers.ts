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

  /**
   * OWNER — enrich a single producer row with winemaker / GM name + role
   * via Perplexity Sonar Pro. Idempotent: only touches contactName /
   * contactRole when currently NULL, so manual admin edits win.
   *
   * Prompt is intentionally narrow (name + role only, not full contact
   * research) so it's fast (~5-12s) and cheap. For fuller enrichment
   * (phone, IG, painPoint) use outreach.deepResearch.
   *
   * The frontend calls this in a serial loop for batch enrichment —
   * that gives real-time progress + tolerates individual failures.
   */
  enrichContact: ownerProcedure
    .input(z.object({ id: z.number().int() }))
    .mutation(async ({ input }) => {
      const key = process.env.PERPLEXITY_API_KEY;
      if (!key) throw new Error("PERPLEXITY_API_KEY not configured");

      const rows = await db
        .select()
        .from(schema.wineProducers)
        .where(eq(schema.wineProducers.id, input.id))
        .limit(1);
      const producer = rows[0];
      if (!producer) throw new Error("producer not found");
      if (producer.contactName) {
        return { ok: true, skipped: true, reason: "already has contactName" };
      }

      const contactSchema = {
        type: "object",
        properties: {
          firstName: { type: ["string", "null"] },
          lastName: { type: ["string", "null"] },
          role: { type: ["string", "null"] },
          confidence: { type: "string", enum: ["high", "medium", "low"] },
        },
        required: ["confidence"],
        additionalProperties: false,
      };

      const websiteHint = producer.website ? `\nWebsite: ${producer.website}` : "";
      const regionHint = producer.region ? `\nRegion: ${producer.region}` : "";
      const countryHint = producer.country === "NZ" ? "New Zealand" : "Australia";

      const controller = new AbortController();
      const timeoutId = setTimeout(() => controller.abort(), 45_000);
      let resp: Response;
      try {
        resp = await fetch("https://api.perplexity.ai/chat/completions", {
          method: "POST",
          signal: controller.signal,
          headers: {
            Authorization: `Bearer ${key}`,
            "Content-Type": "application/json",
          },
          body: JSON.stringify({
            model: "sonar-pro",
            max_tokens: 500,
            messages: [
              {
                role: "system",
                content: `You are a wine-industry sales-research assistant. Given a winery, find the CURRENT primary point-of-contact.

Priority order for "role":
1. Winemaker (or Chief Winemaker / Head Winemaker)
2. Founder / Owner / Proprietor
3. General Manager
4. Cellar Door Manager
Skip marketing, admin, and sommelier staff.

Role format: return the CLEANEST 1-3 word title. Examples of good roles: "Winemaker", "Chief Winemaker", "Founder", "GM", "Cellar Door Manager". Do NOT append parentheticals, qualifiers, or explanatory phrases like "(primary point-of-contact)" or "– NZ" — those are noise.

Sources: official winery website, verified LinkedIn profiles, Halliday, WBM, Real Review, Winetitles, NZ Wine Grower, industry press releases.

Return ONLY the requested JSON — no prose. Use null for any field you can't verify from a reputable source. Do NOT invent names — null is always correct over hallucination.

Confidence:
- "high" = named person + role confirmed on official winery website or LinkedIn
- "medium" = named person from trade press or older source
- "low" = you're guessing or only inferring from the winery name`,
              },
              {
                role: "user",
                content: `Winery: ${producer.name} (${countryHint})${regionHint}${websiteHint}\n\nWho is the primary point-of-contact (winemaker → founder → GM → cellar door manager)? Return firstName, lastName, role, confidence as JSON.`,
              },
            ],
            response_format: {
              type: "json_schema",
              json_schema: { schema: contactSchema },
            },
          }),
        });
        clearTimeout(timeoutId);
      } catch (err) {
        clearTimeout(timeoutId);
        const msg = err instanceof Error ? err.message : String(err);
        if (msg.includes("aborted")) throw new Error("Perplexity took too long (>45s).");
        throw new Error(`Perplexity request failed: ${msg}`);
      }

      if (!resp.ok) {
        const errText = await resp.text().catch(() => "");
        if (resp.status === 401) throw new Error("Perplexity key invalid.");
        if (resp.status === 402) throw new Error("Perplexity credit exhausted.");
        if (resp.status === 429) throw new Error("Perplexity rate-limited — wait a minute.");
        throw new Error(`Perplexity ${resp.status}: ${errText.slice(0, 200)}`);
      }

      const data = (await resp.json()) as {
        choices?: Array<{ message?: { content?: string } }>;
      };
      const content = data.choices?.[0]?.message?.content ?? "";
      let parsed: {
        firstName?: string | null;
        lastName?: string | null;
        role?: string | null;
        confidence?: string;
      } | null = null;
      try {
        const cleaned = content
          .replace(/^```json\s*/i, "")
          .replace(/^```\s*/i, "")
          .replace(/```\s*$/i, "")
          .trim();
        parsed = JSON.parse(cleaned);
      } catch {
        // Sonar Pro sometimes wraps the JSON in reasoning prose. Grab the
        // first {...} object in the content and try that.
        const braceMatch = content.match(/\{[\s\S]*\}/);
        if (braceMatch) {
          try {
            parsed = JSON.parse(braceMatch[0]);
          } catch {
            /* still bad — parse_failed will be returned */
          }
        }
      }
      if (!parsed) {
        console.log(`[producers.enrich] parse_failed for id=${input.id} · content: ${content.slice(0, 300)}`);
        return { ok: false, skipped: false, error: "parse_failed" };
      }

      const firstName = typeof parsed.firstName === "string" ? parsed.firstName.trim() : "";
      const lastName = typeof parsed.lastName === "string" ? parsed.lastName.trim() : "";
      const fullName = [firstName, lastName].filter(Boolean).join(" ").slice(0, 120) || null;
      let role: string | null = typeof parsed.role === "string" ? parsed.role.trim() : null;
      // Belt-and-braces: strip trailing parentheticals, em-dash qualifiers,
      // and "primary point-of-contact" style noise even if the LLM ignored
      // the prompt. Occasionally Sonar Pro leaks reasoning into the role
      // field (comma-separated alternatives + explanatory prose) — in that
      // case fall back to the first token only.
      if (role) {
        role = role
          .replace(/\s*\([^)]*\)\s*/g, "") // any (…) segment
          .replace(/\s*[–—-]\s+.*$/g, "") // trailing – NZ / — primary winemaker
          .replace(/\s+/g, " ")
          .trim();
        // If still noisy (commas, apostrophes, LLM prose "but priority says…"),
        // keep just the first clean role token from a short whitelist.
        if (/[,;']|but priority|actually|should be/i.test(role)) {
          const ROLE_CANDIDATES = [
            "Chief Winemaker",
            "Head Winemaker",
            "Consulting Winemaker",
            "Winemaker",
            "Founder",
            "Co-Founder",
            "Owner-Operator",
            "Owner",
            "Proprietor",
            "General Manager",
            "GM",
            "Cellar Door Manager",
          ];
          const found = ROLE_CANDIDATES.find((c) => new RegExp(`\\b${c}\\b`, "i").test(role!));
          role = found ?? role.split(/[,;]/)[0].trim();
        }
        role = role.slice(0, 120);
        if (role.length === 0) role = null;
      }
      const confidence = parsed.confidence ?? "low";

      // Only write if we have SOMETHING to write. Low confidence still saved
      // so the operator sees the guess — but we prefix the role with "?"
      // so it's visually distinct from high-confidence data.
      if (!fullName && !role) {
        return { ok: false, skipped: true, reason: "no name found", confidence };
      }
      const displayRole = confidence === "low" && role ? `? ${role}` : role;

      await db
        .update(schema.wineProducers)
        .set({
          contactName: fullName ?? sql`contact_name`,
          contactRole: displayRole ?? sql`contact_role`,
        })
        .where(eq(schema.wineProducers.id, input.id));

      return {
        ok: true,
        skipped: false,
        contactName: fullName,
        contactRole: displayRole,
        confidence,
      };
    }),

  /**
   * OWNER — list producers that are candidates for enrichment
   * (contactName IS NULL). Used by the batch UI so the client knows the
   * queue up front and can show a live progress bar.
   */
  needsEnrichment: ownerProcedure.query(async () => {
    const rows = await db
      .select({ id: schema.wineProducers.id, name: schema.wineProducers.name })
      .from(schema.wineProducers)
      .where(sql`contact_name IS NULL`)
      .orderBy(schema.wineProducers.name);
    return rows;
  }),
});
