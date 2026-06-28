import { z } from "zod";
import { router, ownerProcedure } from "../trpc.js";
import { eq, and } from "drizzle-orm";
import { db } from "../db.js";
import * as schema from "../../drizzle/schema.js";

// ─── WBS Admin Router ───────────────────────────────────────────────────────
// Owner-only: manage published status of bible knowledge chunks by WBS domain.

const wbsAdminRouter = router({
  // List all unique WBS domains with chunk counts and published status
  listDomains: ownerProcedure.query(async () => {
    // Get summary by wbs_domain: total chunks, published chunks, chapter titles
    const rows = await db
      .select({
        wbsDomain: schema.diyKnowledgeChunks.wbsDomain,
        wbsCode: schema.diyKnowledgeChunks.wbsCode,
        chapterTitle: schema.diyKnowledgeChunks.chapterTitle,
        sourceDoc: schema.diyKnowledgeChunks.sourceDoc,
        published: schema.diyKnowledgeChunks.published,
        id: schema.diyKnowledgeChunks.id,
      })
      .from(schema.diyKnowledgeChunks)
      .orderBy(schema.diyKnowledgeChunks.wbsDomain, schema.diyKnowledgeChunks.chapterRef);

    // Group by wbsDomain + chapterTitle
    const groups: Record<string, {
      wbsDomain: string | null;
      wbsCode: string | null;
      chapterTitle: string | null;
      sourceDoc: string | null;
      totalChunks: number;
      publishedChunks: number;
      chunkIds: number[];
    }> = {};

    for (const row of rows) {
      const key = `${row.wbsDomain ?? "none"}::${row.chapterTitle ?? "unknown"}::${row.sourceDoc ?? ""}`;
      if (!groups[key]) {
        groups[key] = {
          wbsDomain: row.wbsDomain,
          wbsCode: row.wbsCode,
          chapterTitle: row.chapterTitle,
          sourceDoc: row.sourceDoc,
          totalChunks: 0,
          publishedChunks: 0,
          chunkIds: [],
        };
      }
      groups[key].totalChunks++;
      if (row.published) groups[key].publishedChunks++;
      groups[key].chunkIds.push(row.id);
    }

    return Object.values(groups).sort((a, b) => {
      const da = parseFloat(a.wbsDomain ?? "99");
      const db_ = parseFloat(b.wbsDomain ?? "99");
      return da - db_;
    });
  }),

  // Toggle published status for all chunks in a chapter (by chapterTitle + sourceDoc)
  setChapterPublished: ownerProcedure
    .input(
      z.object({
        chapterTitle: z.string(),
        sourceDoc: z.string(),
        published: z.boolean(),
      })
    )
    .mutation(async ({ input }) => {
      const now = Date.now();
      await db
        .update(schema.diyKnowledgeChunks)
        .set({
          published: input.published,
          publishedAt: input.published ? now : null,
        })
        .where(
          and(
            eq(schema.diyKnowledgeChunks.chapterTitle, input.chapterTitle),
            eq(schema.diyKnowledgeChunks.sourceDoc, input.sourceDoc)
          )
        );
      return { success: true, published: input.published, updatedAt: now };
    }),

  // Bulk publish/unpublish all chunks in a WBS domain
  setDomainPublished: ownerProcedure
    .input(
      z.object({
        wbsDomain: z.string(),
        sourceDoc: z.string().optional(),
        published: z.boolean(),
      })
    )
    .mutation(async ({ input }) => {
      const now = Date.now();
      const conditions = [eq(schema.diyKnowledgeChunks.wbsDomain, input.wbsDomain)];
      if (input.sourceDoc) conditions.push(eq(schema.diyKnowledgeChunks.sourceDoc, input.sourceDoc));
      await db
        .update(schema.diyKnowledgeChunks)
        .set({
          published: input.published,
          publishedAt: input.published ? now : null,
        })
        .where(and(...conditions));
      return { success: true, published: input.published, updatedAt: now };
    }),

  // List ghost questions (paginated, filterable by wbs_code)
  listGhostQuestions: ownerProcedure
    .input(
      z.object({
        wbsCode: z.string().optional(),
        wineType: z.string().optional(),
        limit: z.number().min(1).max(200).optional().default(50),
        offset: z.number().min(0).optional().default(0),
      })
    )
    .query(async ({ input }) => {
      const conditions = [eq(schema.ghostQuestions.active, true)];
      if (input.wbsCode) conditions.push(eq(schema.ghostQuestions.wbsCode, input.wbsCode));
      if (input.wineType) conditions.push(eq(schema.ghostQuestions.wineType, input.wineType));
      const questions = await db
        .select({
          id: schema.ghostQuestions.id,
          wbsCode: schema.ghostQuestions.wbsCode,
          wineType: schema.ghostQuestions.wineType,
          question: schema.ghostQuestions.question,
          difficulty: schema.ghostQuestions.difficulty,
          category: schema.ghostQuestions.category,
          createdAt: schema.ghostQuestions.createdAt,
        })
        .from(schema.ghostQuestions)
        .where(and(...conditions))
        .orderBy(schema.ghostQuestions.wbsCode, schema.ghostQuestions.id)
        .limit(input.limit)
        .offset(input.offset);
      // Count total matching
      const allMatching = await db
        .select({ id: schema.ghostQuestions.id })
        .from(schema.ghostQuestions)
        .where(and(...conditions));
      return { questions, total: allMatching.length };
    }),

  // Get ghost questions summary by wbs_code
  ghostQuestionsSummary: ownerProcedure.query(async () => {
    const all = await db
      .select({
        wbsCode: schema.ghostQuestions.wbsCode,
        wineType: schema.ghostQuestions.wineType,
        category: schema.ghostQuestions.category,
        id: schema.ghostQuestions.id,
      })
      .from(schema.ghostQuestions)
      .where(eq(schema.ghostQuestions.active, true));
    // Group by wbsCode + wineType
    const grouped = all.reduce((acc, r) => {
      const key = `${r.wbsCode}|${r.wineType}`;
      if (!acc[key]) acc[key] = { wbsCode: r.wbsCode, wineType: r.wineType, category: r.category ?? "", cnt: 0 };
      acc[key].cnt++;
      return acc;
    }, {} as Record<string, { wbsCode: string; wineType: string; category: string; cnt: number }>);
    return Object.values(grouped).sort((a, b) => a.wbsCode.localeCompare(b.wbsCode));
  }),

  // Get chunk count summary (for dashboard)
  summary: ownerProcedure.query(async () => {
    const all = await db
      .select({
        published: schema.diyKnowledgeChunks.published,
        sourceDoc: schema.diyKnowledgeChunks.sourceDoc,
        id: schema.diyKnowledgeChunks.id,
      })
      .from(schema.diyKnowledgeChunks);

    const total = all.length;
    const published = all.filter((r) => r.published).length;
    const byDoc = all.reduce((acc, r) => {
      const doc = r.sourceDoc ?? "unknown";
      if (!acc[doc]) acc[doc] = { total: 0, published: 0 };
      acc[doc].total++;
      if (r.published) acc[doc].published++;
      return acc;
    }, {} as Record<string, { total: number; published: number }>);

    return { total, published, unpublished: total - published, byDoc };
  }),
});


export { wbsAdminRouter };
