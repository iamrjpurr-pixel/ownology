/**
 * smsOpeners — CRUD + render for the first-contact SMS opener variants.
 *
 * Data lives in `sms_opener_variants`. See drizzle/schema.ts and the
 * bootstrap seed in server/index.ts for the initial 4 lenses (continuity,
 * vintage-fog, craft, audit).
 *
 * Render contract
 * ───────────────
 * `render({ slug })` picks an active variant deterministically per slug
 * (djb2 hash → active list length). Same prospect always sees the same
 * opener across devices/reloads so A/B measurement isn't polluted by
 * refresh randomness. If no active variant exists, falls back to a
 * hardcoded honest template (defence-in-depth so Rich can never end up
 * with a blank SMS field on a fresh contact).
 *
 * Interpolation tokens supported in a template string:
 *   ${firstName}   — contact.firstName, defaults to "there"
 *   ${winery}      — raw winery name, empty string if unknown
 *   ${wineryOr}    — " at <winery>" or empty (natural-language variant)
 *   ${url}         — https://ownology.ai/hi/<slug> (env-configurable base)
 */

import { z } from "zod";
import { and, eq, asc, sql } from "drizzle-orm";
import { router, ownerProcedure, publicProcedure } from "../trpc.js";
import { db } from "../db.js";
import * as schema from "../../drizzle/schema.js";

function previewBase(): string {
  return (
    process.env.PUBLIC_APP_URL?.trim() ||
    process.env.CANONICAL_HOST?.trim() ||
    "https://ownology.ai"
  ).replace(/\/$/, "");
}

/** djb2-lite string hash. Deterministic, positive, cheap. */
function stableHash(s: string): number {
  let h = 5381;
  for (let i = 0; i < s.length; i++) h = ((h << 5) + h + s.charCodeAt(i)) | 0;
  return Math.abs(h);
}

/** Substitute ${firstName} / ${winery} / ${wineryOr} / ${url} into a template. */
function interpolate(template: string, ctx: { firstName: string; winery: string; url: string }): string {
  const wineryOr = ctx.winery ? ` at ${ctx.winery}` : "";
  return template
    .replaceAll("${firstName}", ctx.firstName)
    .replaceAll("${winery}", ctx.winery)
    .replaceAll("${wineryOr}", wineryOr)
    .replaceAll("${url}", ctx.url);
}

/** Hardcoded fallback when no active variants exist. Trinity-first,
 *  Continuity lens, matches the Jul 2026 seed's tone. Never touches AI
 *  language or "second brain" — those are banned from the SMS layer. */
function fallbackOpener(ctx: { firstName: string; winery: string; url: string }): string {
  const wineryOr = ctx.winery ? ` at ${ctx.winery}` : "";
  return `Hi ${ctx.firstName}${wineryOr} — I've built a cellar record that pins quality panels, vintage-log reasoning, and asset trail into one thread, so a decade of craft doesn't walk out the door with the next handover. ${ctx.url} · 90 seconds if it resonates. — Rich P · 0408 105 067`;
}

export const smsOpenersRouter = router({
  /** Admin — full variant list (active + inactive), sort_index then name. */
  list: ownerProcedure.query(async () => {
    const rows = await db
      .select()
      .from(schema.smsOpenerVariants)
      .orderBy(asc(schema.smsOpenerVariants.sortIndex), asc(schema.smsOpenerVariants.name));
    return { variants: rows };
  }),

  /** Admin — flip active on/off for a variant. */
  setActive: ownerProcedure
    .input(z.object({ id: z.number().int().positive(), active: z.boolean() }))
    .mutation(async ({ input }) => {
      const now = Date.now();
      await db
        .update(schema.smsOpenerVariants)
        .set({ active: input.active ? 1 : 0, updatedAt: now })
        .where(eq(schema.smsOpenerVariants.id, input.id));
      return { ok: true, id: input.id, active: input.active };
    }),

  /** Admin — create a new variant. */
  create: ownerProcedure
    .input(
      z.object({
        key: z.string().min(2).max(64).regex(/^[a-z0-9-]+$/i),
        name: z.string().min(1).max(128),
        lens: z.string().min(1).max(32),
        template: z.string().min(30).max(1000),
        active: z.boolean().default(false),
        sortIndex: z.number().int().default(100),
        notes: z.string().max(2000).optional(),
      }),
    )
    .mutation(async ({ input }) => {
      const now = Date.now();
      await db.insert(schema.smsOpenerVariants).values({
        key: input.key,
        name: input.name,
        lens: input.lens,
        template: input.template,
        active: input.active ? 1 : 0,
        sortIndex: input.sortIndex,
        notes: input.notes ?? null,
        createdAt: now,
        updatedAt: now,
      });
      return { ok: true };
    }),

  /** Admin — update copy / name / lens / sort of an existing variant. */
  update: ownerProcedure
    .input(
      z.object({
        id: z.number().int().positive(),
        name: z.string().min(1).max(128).optional(),
        lens: z.string().min(1).max(32).optional(),
        template: z.string().min(30).max(1000).optional(),
        sortIndex: z.number().int().optional(),
        notes: z.string().max(2000).optional(),
      }),
    )
    .mutation(async ({ input }) => {
      const patch: Record<string, unknown> = { updatedAt: Date.now() };
      if (input.name !== undefined) patch.name = input.name;
      if (input.lens !== undefined) patch.lens = input.lens;
      if (input.template !== undefined) patch.template = input.template;
      if (input.sortIndex !== undefined) patch.sortIndex = input.sortIndex;
      if (input.notes !== undefined) patch.notes = input.notes;
      await db
        .update(schema.smsOpenerVariants)
        .set(patch)
        .where(eq(schema.smsOpenerVariants.id, input.id));
      return { ok: true };
    }),

  /** Admin — permanently delete a variant. */
  remove: ownerProcedure
    .input(z.object({ id: z.number().int().positive() }))
    .mutation(async ({ input }) => {
      await db.delete(schema.smsOpenerVariants).where(eq(schema.smsOpenerVariants.id, input.id));
      return { ok: true };
    }),

  /** Admin — preview a template with a specific contact's data, without
   *  saving. Used by the /admin/sms-openers preview panel. */
  preview: ownerProcedure
    .input(z.object({ template: z.string().min(1).max(1000), slug: z.string().min(1).max(80).optional() }))
    .query(async ({ input }) => {
      let firstName = "Fiona";
      let winery = "Seppeltsfield";
      let slug = input.slug ?? "fiona-donald-seppeltsfield";
      if (input.slug) {
        const rows = await db
          .select({
            firstName: schema.outreachContacts.firstName,
            winery: schema.outreachContacts.winery,
            slug: schema.outreachContacts.slug,
          })
          .from(schema.outreachContacts)
          .where(eq(schema.outreachContacts.slug, input.slug))
          .limit(1);
        if (rows[0]) {
          firstName = rows[0].firstName ?? firstName;
          winery = rows[0].winery ?? winery;
          slug = rows[0].slug;
        }
      }
      const rendered = interpolate(input.template, {
        firstName,
        winery,
        url: `${previewBase()}/hi/${slug}`,
      });
      return { rendered, charCount: rendered.length };
    }),

  /** PUBLIC — render the active opener for a slug. Used by the queue
   *  server-side; exposed as public so the /hi/:slug page can lazy-render
   *  its own SMS deep-link if needed. */
  render: publicProcedure
    .input(z.object({ slug: z.string().min(1).max(80) }))
    .query(async ({ input }) => {
      const [contact] = await db
        .select({
          slug: schema.outreachContacts.slug,
          firstName: schema.outreachContacts.firstName,
          winery: schema.outreachContacts.winery,
        })
        .from(schema.outreachContacts)
        .where(eq(schema.outreachContacts.slug, input.slug))
        .limit(1);
      if (!contact) return { sms: null, variantKey: null };

      const ctx = {
        firstName: contact.firstName ?? "there",
        winery: contact.winery ?? "",
        url: `${previewBase()}/hi/${contact.slug}`,
      };

      const actives = await db
        .select()
        .from(schema.smsOpenerVariants)
        .where(eq(schema.smsOpenerVariants.active, 1))
        .orderBy(asc(schema.smsOpenerVariants.sortIndex));

      if (actives.length === 0) {
        return { sms: fallbackOpener(ctx), variantKey: "fallback" };
      }
      const idx = stableHash(contact.slug) % actives.length;
      const pick = actives[idx];
      return { sms: interpolate(pick.template, ctx), variantKey: pick.key };
    }),

  /** OWNER — flush stale sms_draft_override rows that contain banned
   *  language from the pre-Jul-2026 opener rework ("second brain",
   *  "cellar AI", "winemaker's second..."). Clearing the override forces
   *  those contacts to fall back to the active variant on next queue
   *  reload — which is Trinity-first Continuity by default.
   *
   *  Returns the count cleared so the UI can toast a summary. Idempotent. */
  clearStaleDrafts: ownerProcedure
    .input(z.object({ dryRun: z.boolean().default(false) }).optional())
    .mutation(async ({ input }) => {
      const [countResult] = await db.execute(sql`
        SELECT COUNT(*) as n FROM outreach_contacts
        WHERE sms_draft_override REGEXP 'second brain|cellar AI|winemaker.s second|AI apprentice'
      `);
      const rows = Array.isArray(countResult) && Array.isArray(countResult[0])
        ? (countResult[0][0] as { n: number } | undefined)
        : undefined;
      const matched = Number(rows?.n ?? 0);
      if (input?.dryRun) return { cleared: 0, matched, dryRun: true as const };
      if (matched > 0) {
        await db.execute(sql`
          UPDATE outreach_contacts
          SET sms_draft_override = NULL
          WHERE sms_draft_override REGEXP 'second brain|cellar AI|winemaker.s second|AI apprentice'
        `);
      }
      return { cleared: matched, matched, dryRun: false as const };
    }),
});
