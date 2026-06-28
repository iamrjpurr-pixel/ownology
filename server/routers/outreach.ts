/**
 * Outreach contacts — personalised SMS landing pages for winemakers met
 * in person at wine events. Each contact gets /hi/:slug. Tracks SMS sent /
 * first opened / demo booked timestamps.
 */
import { z } from "zod";
import { eq, sql, desc } from "drizzle-orm";
import { router, publicProcedure, ownerProcedure } from "../trpc.js";
import { db } from "../db.js";
import * as schema from "../../drizzle/schema.js";

function slugify(...parts: string[]): string {
  return parts
    .filter(Boolean)
    .join(" ")
    .toLowerCase()
    .trim()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "")
    .slice(0, 80) || `c-${Date.now().toString(36)}`;
}

function normaliseMobile(raw: string | undefined | null): string | null {
  if (!raw) return null;
  const digits = raw.replace(/\D/g, "");
  if (!digits) return null;
  if (digits.startsWith("61")) return `+${digits}`;
  if (digits.startsWith("04") && digits.length === 10) return `+61${digits.slice(1)}`;
  if (digits.startsWith("4") && digits.length === 9) return `+61${digits}`;
  return `+${digits}`;
}

export const outreachRouter = router({
  /** PUBLIC — fetch a single contact by slug for the /hi/:slug page. */
  bySlug: publicProcedure
    .input(z.object({ slug: z.string().min(1).max(80) }))
    .query(async ({ input }) => {
      const rows = await db
        .select({
          slug: schema.outreachContacts.slug,
          firstName: schema.outreachContacts.firstName,
          winery: schema.outreachContacts.winery,
          event: schema.outreachContacts.event,
          painPoint: schema.outreachContacts.painPoint,
          calendlyOverride: schema.outreachContacts.calendlyOverride,
        })
        .from(schema.outreachContacts)
        .where(eq(schema.outreachContacts.slug, input.slug))
        .limit(1);
      return rows[0] ?? null;
    }),

  /** PUBLIC — mark a slug as viewed (called once on landing-page mount). */
  markViewed: publicProcedure
    .input(z.object({ slug: z.string().min(1).max(80) }))
    .mutation(async ({ input }) => {
      const now = Date.now();
      // Bump view_count and set first_viewed_at if null.
      await db
        .update(schema.outreachContacts)
        .set({
          viewCount: sql`view_count + 1`,
          firstViewedAt: sql`COALESCE(first_viewed_at, ${now})`,
        })
        .where(eq(schema.outreachContacts.slug, input.slug));
      return { ok: true };
    }),

  /** OWNER — list all contacts with their engagement state. */
  list: ownerProcedure.query(async () => {
    const rows = await db
      .select()
      .from(schema.outreachContacts)
      .orderBy(desc(schema.outreachContacts.createdAt));
    return { contacts: rows };
  }),

  /** OWNER — create a new contact. Slug auto-generated unless overridden. */
  create: ownerProcedure
    .input(
      z.object({
        firstName: z.string().min(1).max(80),
        lastName: z.string().max(80).optional(),
        mobileAu: z.string().max(20).optional(),
        winery: z.string().max(120).optional(),
        event: z.string().max(120).optional(),
        painPoint: z.string().max(300).optional(),
        calendlyOverride: z.string().max(300).optional(),
        notes: z.string().max(500).optional(),
        slug: z.string().max(80).optional(),
        status: z.enum(["warm", "lukewarm", "cold", "sales", "skip"]).optional(),
      })
    )
    .mutation(async ({ input }) => {
      const slug = (input.slug && slugify(input.slug)) || slugify(input.firstName, input.winery ?? input.lastName ?? "");
      const mobile = normaliseMobile(input.mobileAu);
      try {
        await db.insert(schema.outreachContacts).values({
          slug,
          firstName: input.firstName.trim(),
          lastName: input.lastName?.trim() || null,
          mobileAu: mobile,
          winery: input.winery?.trim() || null,
          event: input.event?.trim() || null,
          painPoint: input.painPoint?.trim() || null,
          calendlyOverride: input.calendlyOverride?.trim() || null,
          notes: input.notes?.trim() || null,
          status: input.status ?? "cold",
          viewCount: 0,
          createdAt: Date.now(),
        });
      } catch (err) {
        const msg = err instanceof Error ? err.message : String(err);
        if (msg.includes("Duplicate") || msg.includes("UNIQUE")) {
          throw new Error(`Slug "${slug}" already exists. Pick a different first name + winery, or supply a custom slug.`);
        }
        throw err;
      }
      return { ok: true, slug };
    }),

  /** OWNER — update triage status (warm/lukewarm/cold/sales/skip). */
  setStatus: ownerProcedure
    .input(
      z.object({
        slug: z.string(),
        status: z.enum(["warm", "lukewarm", "cold", "sales", "skip"]),
      })
    )
    .mutation(async ({ input }) => {
      await db
        .update(schema.outreachContacts)
        .set({ status: input.status })
        .where(eq(schema.outreachContacts.slug, input.slug));
      return { ok: true };
    }),

  /** OWNER — record SMS sent (operator marks it after they hit send). */
  markSmsSent: ownerProcedure
    .input(z.object({ slug: z.string() }))
    .mutation(async ({ input }) => {
      await db
        .update(schema.outreachContacts)
        .set({ smsSentAt: Date.now() })
        .where(eq(schema.outreachContacts.slug, input.slug));
      return { ok: true };
    }),

  /** OWNER — record demo booked (operator marks it manually for now). */
  markBooked: ownerProcedure
    .input(z.object({ slug: z.string() }))
    .mutation(async ({ input }) => {
      await db
        .update(schema.outreachContacts)
        .set({ demoBookedAt: Date.now() })
        .where(eq(schema.outreachContacts.slug, input.slug));
      return { ok: true };
    }),

  /** OWNER — remove a contact. */
  remove: ownerProcedure
    .input(z.object({ slug: z.string() }))
    .mutation(async ({ input }) => {
      await db
        .delete(schema.outreachContacts)
        .where(eq(schema.outreachContacts.slug, input.slug));
      return { ok: true };
    }),
});
