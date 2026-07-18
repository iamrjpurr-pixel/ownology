/**
 * Curriculum Router — Vigneron Tier Education Layer
 *
 * Reads synthesised Lesson Card JSONs from /app/references/education/synthesis-pilot/
 * and vends them via tRPC.
 *
 * Design decision: for the MVP demo we skip the DB layer entirely and serve
 * the JSON files as-is. This lets us ship the UI in the same session as the
 * synthesis without a schema migration. Once Rich signs off on the shape,
 * a later pass migrates these into a proper `curriculum_lessons` table.
 */

import fs from "node:fs";
import path from "node:path";
import { z } from "zod";
import { router, publicProcedure } from "../trpc.js";

const SYNTH_DIR = "/app/references/education/synthesis-pilot";

type CitedIn = {
  kind: "buy" | "free" | "curriculum" | "private";
  label: string;
  url: string | null;
  note: string | null;
};

type LessonCard = {
  id: string;
  slug: string;
  level: number;
  wbs: string[];
  reading_min: number;
  title: string;
  aim: string;
  application: string;
  body_md: string | null;
  cited_in: CitedIn[];
  overlaps: string[];
};

function readAll(): LessonCard[] {
  if (!fs.existsSync(SYNTH_DIR)) return [];
  const files = fs.readdirSync(SYNTH_DIR).filter((f) => f.endsWith(".json"));
  const cards: LessonCard[] = [];
  for (const f of files) {
    try {
      const raw = JSON.parse(fs.readFileSync(path.join(SYNTH_DIR, f), "utf8"));
      const src = raw.source ?? {};
      const gen = raw.generated ?? {};
      cards.push({
        id: raw.lesson_id ?? src.id ?? f.replace(".json", ""),
        slug: src.slug ?? "",
        level: Number(src.level ?? 0),
        wbs: Array.isArray(src.wbs) ? src.wbs : [],
        reading_min: Number(src.reading_min ?? 0),
        title: src.title ?? "",
        aim: gen.aim ?? src.aim ?? "",
        application: gen.application ?? src.application ?? "",
        body_md: gen.body_md ?? null,
        cited_in: Array.isArray(gen.cited_in) ? gen.cited_in : [],
        overlaps: Array.isArray(raw.overlaps) ? raw.overlaps : [],
      });
    } catch { /* skip malformed */ }
  }
  return cards.sort((a, b) => a.id.localeCompare(b.id));
}

const curriculumRouter = router({
  // Full list — used by the /curriculum index page
  list: publicProcedure.query(async () => {
    const cards = readAll();
    // Return lightweight shape; the body_md is not needed for the index
    return cards.map((c) => ({
      id: c.id,
      slug: c.slug,
      level: c.level,
      wbs: c.wbs,
      reading_min: c.reading_min,
      title: c.title,
      aim: c.aim,
      hasBody: Boolean(c.body_md),
    }));
  }),

  // Single lesson — used by /curriculum/:slug page
  bySlug: publicProcedure
    .input(z.object({ slug: z.string().min(1) }))
    .query(async ({ input }) => {
      const cards = readAll();
      const card = cards.find((c) => c.slug === input.slug);
      return card ?? null;
    }),
});

export { curriculumRouter };
