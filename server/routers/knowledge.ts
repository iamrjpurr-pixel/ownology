import { z } from "zod";
import { router, publicProcedure, protectedProcedure } from "../trpc.js";
import { eq, or, like, and, desc } from "drizzle-orm";
import { db } from "../db.js";
import * as schema from "../../drizzle/schema.js";

// ─── Knowledge Platform Router (Sprint 7) ────────────────────────────────────

const knowledgeRouter = router({
  // ── SOP Library ─────────────────────────────────────────────────────────────

  // Public: list SOPs, optionally filtered by category and/or audience ('commercial' | 'diy')
  listSops: publicProcedure
    .input(z.object({
      category: z.string().optional(),
      audience: z.enum(["commercial", "diy"]).optional(),
    }).optional())
    .query(async ({ input }) => {
      const { eq, and: andOp, asc } = await import("drizzle-orm");
      let q = db.select().from(schema.sopLibrary).$dynamic();
      const conditions: any[] = [];
      if (input?.category) conditions.push(eq(schema.sopLibrary.category, input.category));
      if (input?.audience) conditions.push(eq(schema.sopLibrary.audience, input.audience));
      if (conditions.length === 1) q = q.where(conditions[0]);
      else if (conditions.length > 1) q = q.where(andOp(...conditions));
      return q.orderBy(asc(schema.sopLibrary.category), asc(schema.sopLibrary.sortOrder));
    }),

  // Public: get a single SOP by id (with vintage notes, training records,
  // and hydrated Wine Bible chapter references).
  getSop: publicProcedure
    .input(z.object({ id: z.number().int() }))
    .query(async ({ input }) => {
      const { eq, desc, and: andOp, inArray } = await import("drizzle-orm");
      const [sop] = await db
        .select()
        .from(schema.sopLibrary)
        .where(eq(schema.sopLibrary.id, input.id))
        .limit(1);
      if (!sop) return null;
      const vintageNotes = await db
        .select()
        .from(schema.sopVintageNotes)
        .where(eq(schema.sopVintageNotes.sopId, input.id))
        .orderBy(desc(schema.sopVintageNotes.vintageYear));
      const trainingRecords = await db
        .select()
        .from(schema.sopTrainingRecords)
        .where(eq(schema.sopTrainingRecords.sopId, input.id))
        .orderBy(desc(schema.sopTrainingRecords.trainedAt));

      // Hydrate bible chapter titles. `bibleChapters` is a comma-separated
      // list of "source_doc:chapter_ref" tokens (see seed-sop-bible-chapters.mjs).
      // Single batched query keyed on the indexed (source_doc, chapter_ref).
      type BibleRef = { sourceDoc: string; chapterRef: string; chapterTitle: string; label: string };
      let bibleRefs: BibleRef[] = [];
      if (sop.bibleChapters && sop.bibleChapters.length > 0) {
        const tokens = sop.bibleChapters.split(",").map((t) => t.trim()).filter(Boolean);
        const parsed = tokens.map((t) => {
          const [src, ref] = t.split(":");
          return { src, ref };
        }).filter((x) => x.src && x.ref);
        if (parsed.length > 0) {
          const sources = Array.from(new Set(parsed.map((p) => p.src)));
          const refs = Array.from(new Set(parsed.map((p) => p.ref)));
          const chunks = await db
            .selectDistinct({
              sourceDoc: schema.diyKnowledgeChunks.sourceDoc,
              chapterRef: schema.diyKnowledgeChunks.chapterRef,
              chapterTitle: schema.diyKnowledgeChunks.chapterTitle,
            })
            .from(schema.diyKnowledgeChunks)
            .where(andOp(
              inArray(schema.diyKnowledgeChunks.sourceDoc, sources),
              inArray(schema.diyKnowledgeChunks.chapterRef, refs),
            ));
          // Map back to the original token order so the UI honours the curator's sequence.
          const lookup = new Map(chunks.map((c) => [`${c.sourceDoc}:${c.chapterRef}`, c]));
          // Human-friendly labels: "Red Wine Bible — Ch. 2", "White Wine Bible — Ch. 9.4".
          const SOURCE_LABELS: Record<string, string> = {
            red_wine_bible: "Red Wine Bible",
            white_wine_bible: "White Wine Bible",
            morew_red_outline: "Red Wine Outline",
            morew_white_outline: "White Wine Outline",
          };
          bibleRefs = parsed.flatMap(({ src, ref }) => {
            const hit = lookup.get(`${src}:${ref}`);
            if (!hit) return [];
            const refTrim = String(ref).replace(/^Ch/i, "").trim();
            const refDisplay = /^\d/.test(refTrim) ? `Ch. ${refTrim}` : (refTrim || ref);
            const sourceLabel = SOURCE_LABELS[src] ?? src;
            return [{
              sourceDoc: src,
              chapterRef: String(ref),
              chapterTitle: hit.chapterTitle ?? "",
              label: `${sourceLabel} — ${refDisplay}`,
            }];
          });
        }
      }

      return { ...sop, vintageNotes, trainingRecords, bibleRefs };
    }),

  // Protected: update decision logic on an SOP
  updateDecisionLogic: protectedProcedure
    .input(z.object({ id: z.number().int(), decisionLogic: z.string().max(10000) }))
    .mutation(async ({ input }) => {
      const { eq } = await import("drizzle-orm");
      await db
        .update(schema.sopLibrary)
        .set({ decisionLogic: input.decisionLogic, updatedAt: Date.now() })
        .where(eq(schema.sopLibrary.id, input.id));
      return { ok: true };
    }),

  // Public during build/test phase — lock to protectedProcedure before launch
  updateTribalKnowledge: publicProcedure
    .input(z.object({ id: z.number().int(), tribalKnowledge: z.string().max(10000) }))
    .mutation(async ({ input }) => {
      const { eq } = await import("drizzle-orm");
      await db
        .update(schema.sopLibrary)
        .set({ tribalKnowledge: input.tribalKnowledge, updatedAt: Date.now() })
        .where(eq(schema.sopLibrary.id, input.id));
      return { ok: true };
    }),

  // Public during build/test phase — lock to protectedProcedure before launch
  updateProcedureText: publicProcedure
    .input(z.object({ id: z.number().int(), procedureText: z.string().max(50000) }))
    .mutation(async ({ input }) => {
      const { eq } = await import("drizzle-orm");
      await db
        .update(schema.sopLibrary)
        .set({ procedureText: input.procedureText, isTemplate: false, updatedAt: Date.now() })
        .where(eq(schema.sopLibrary.id, input.id));
      return { ok: true };
    }),

  // ── Vintage Notes ────────────────────────────────────────────────────────────

  // Public during build/test phase — lock to protectedProcedure before launch
  addVintageNote: publicProcedure
    .input(
      z.object({
        sopId: z.number().int(),
        vintageYear: z.number().int().min(2000).max(2100),
        whatWorked: z.string().max(5000).optional(),
        whatFailed: z.string().max(5000).optional(),
        whatToChange: z.string().max(5000).optional(),
        linkedBatchId: z.number().int().optional(),
        createdBy: z.string().max(255).optional(),
      })
    )
    .mutation(async ({ ctx, input }) => {
      const now = Date.now();
      await db.insert(schema.sopVintageNotes).values({
        sopId: input.sopId,
        vintageYear: input.vintageYear,
        whatWorked: input.whatWorked ?? null,
        whatFailed: input.whatFailed ?? null,
        whatToChange: input.whatToChange ?? null,
        linkedBatchId: input.linkedBatchId ?? null,
        createdBy: input.createdBy ?? (ctx as { user?: { name?: string } }).user?.name ?? "Winemaker",
        createdAt: now,
        updatedAt: now,
      });
      return { ok: true };
    }),

  // Public: get all vintage notes for a given vintage year (for debrief view)
  getVintageDebrief: publicProcedure
    .input(z.object({ vintageYear: z.number().int() }))
    .query(async ({ input }) => {
      const { eq, desc } = await import("drizzle-orm");
      const notes = await db
        .select({
          id: schema.sopVintageNotes.id,
          sopId: schema.sopVintageNotes.sopId,
          vintageYear: schema.sopVintageNotes.vintageYear,
          whatWorked: schema.sopVintageNotes.whatWorked,
          whatFailed: schema.sopVintageNotes.whatFailed,
          whatToChange: schema.sopVintageNotes.whatToChange,
          linkedBatchId: schema.sopVintageNotes.linkedBatchId,
          createdBy: schema.sopVintageNotes.createdBy,
          createdAt: schema.sopVintageNotes.createdAt,
          sopTitle: schema.sopLibrary.title,
          sopCategory: schema.sopLibrary.category,
        })
        .from(schema.sopVintageNotes)
        .innerJoin(schema.sopLibrary, eq(schema.sopVintageNotes.sopId, schema.sopLibrary.id))
        .where(eq(schema.sopVintageNotes.vintageYear, input.vintageYear))
        .orderBy(desc(schema.sopVintageNotes.createdAt));
      return notes;
    }),

  // Protected: delete a vintage note
  deleteVintageNote: protectedProcedure
    .input(z.object({ id: z.number().int() }))
    .mutation(async ({ input }) => {
      const { eq } = await import("drizzle-orm");
      await db.delete(schema.sopVintageNotes).where(eq(schema.sopVintageNotes.id, input.id));
      return { ok: true };
    }),

  // ── Training Records ─────────────────────────────────────────────────────────

  // Protected: add a training record
  addTrainingRecord: protectedProcedure
    .input(
      z.object({
        sopId: z.number().int(),
        trainedAt: z.number().int(),
        trainerName: z.string().max(255),
        traineeName: z.string().max(255),
        traineeRole: z.string().max(100).optional(),
        status: z.enum(["completed", "in_progress", "not_started"]).default("completed"),
        notes: z.string().max(5000).optional(),
      })
    )
    .mutation(async ({ input }) => {
      await db.insert(schema.sopTrainingRecords).values({
        sopId: input.sopId,
        trainedAt: input.trainedAt,
        trainerName: input.trainerName,
        traineeName: input.traineeName,
        traineeRole: input.traineeRole ?? null,
        status: input.status,
        notes: input.notes ?? null,
        createdAt: Date.now(),
      });
      return { ok: true };
    }),

  // Public: list training records for an SOP or a trainee name
  listTrainingRecords: publicProcedure
    .input(
      z.object({
        sopId: z.number().int().optional(),
        traineeName: z.string().optional(),
      }).optional()
    )
    .query(async ({ input }) => {
      const { eq, and, desc, like } = await import("drizzle-orm");
      let q = db
        .select({
          id: schema.sopTrainingRecords.id,
          sopId: schema.sopTrainingRecords.sopId,
          trainedAt: schema.sopTrainingRecords.trainedAt,
          trainerName: schema.sopTrainingRecords.trainerName,
          traineeName: schema.sopTrainingRecords.traineeName,
          traineeRole: schema.sopTrainingRecords.traineeRole,
          status: schema.sopTrainingRecords.status,
          notes: schema.sopTrainingRecords.notes,
          sopTitle: schema.sopLibrary.title,
          sopCategory: schema.sopLibrary.category,
        })
        .from(schema.sopTrainingRecords)
        .innerJoin(schema.sopLibrary, eq(schema.sopTrainingRecords.sopId, schema.sopLibrary.id))
        .$dynamic();
      const conditions = [];
      if (input?.sopId) conditions.push(eq(schema.sopTrainingRecords.sopId, input.sopId));
      if (input?.traineeName) conditions.push(like(schema.sopTrainingRecords.traineeName, `%${input.traineeName}%`));
      if (conditions.length > 0) q = q.where(and(...conditions));
      return q.orderBy(desc(schema.sopTrainingRecords.trainedAt));
    }),

  // Protected: delete a training record
  deleteTrainingRecord: protectedProcedure
    .input(z.object({ id: z.number().int() }))
    .mutation(async ({ input }) => {
      const { eq } = await import("drizzle-orm");
      await db.delete(schema.sopTrainingRecords).where(eq(schema.sopTrainingRecords.id, input.id));
      return { ok: true };
    }),
});

export { knowledgeRouter };
