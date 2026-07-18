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

const SYNTH_V1_DIR = "/app/references/education/synthesis-pilot";
const SYNTH_V2_DIR = "/app/references/education/synthesis-v2";

type CitedIn = {
  kind: "buy" | "free" | "curriculum" | "private";
  label: string;
  url: string | null;
  note: string | null;
};

type Section = {
  heading: string;
  iconHint: string;
  body_md: string;
  keyConcept: string;
  trap: string;
};

type WorkedExample = {
  title: string;
  starting_conditions: string[];
  timeline: Array<{ when: string; observation: string; decision: string; reasoning: string; outcome: string }>;
  counterfactual: string;
};

type DecisionTree = {
  title: string;
  rows: Array<{ symptom: string; first_check: string; action: string }>;
};

type Mcq = { q: string; choices: string[]; answer: string; rationale: string };
type Flashcard = { front: string; back: string };

type LessonCard = {
  id: string;
  slug: string;
  level: number;
  wbs: string[];
  reading_min: number;
  title: string;
  aim: string;
  application: string;
  // v2 structured
  tldr: string[] | null;
  sections: Section[] | null;
  worked_example: WorkedExample | null;
  decision_tree: DecisionTree | null;
  mcqs: Mcq[] | null;
  flashcards: Flashcard[] | null;
  // v1 fallback
  body_md: string | null;
  // Common
  cited_in: CitedIn[];
  version: "v1" | "v2";
};

function loadFrom(dir: string, mapper: (file: string, raw: any) => LessonCard | null): LessonCard[] {
  if (!fs.existsSync(dir)) return [];
  const files = fs.readdirSync(dir).filter((f) => f.endsWith(".json"));
  const out: LessonCard[] = [];
  for (const f of files) {
    try {
      const raw = JSON.parse(fs.readFileSync(path.join(dir, f), "utf8"));
      const card = mapper(f, raw);
      if (card) out.push(card);
    } catch { /* skip malformed */ }
  }
  return out;
}

function readAll(): LessonCard[] {
  // Prefer v2 (structured) over v1 for each lesson id
  const v2 = loadFrom(SYNTH_V2_DIR, (f, raw) => {
    const src = raw.source ?? {};
    const gen = raw.generated ?? {};
    return {
      id: raw.lesson_id ?? src.id ?? f.replace(".json", ""),
      slug: src.slug ?? "",
      level: Number(src.level ?? 0),
      wbs: Array.isArray(src.wbs) ? src.wbs : [],
      reading_min: Number(src.reading_min ?? 0),
      title: src.title ?? "",
      aim: gen.aim ?? src.aim ?? "",
      application: gen.application ?? src.application ?? "",
      tldr: gen.tldr ?? null,
      sections: gen.sections ?? null,
      worked_example: gen.worked_example ?? null,
      decision_tree: gen.decision_tree ?? null,
      mcqs: gen.mcqs ?? null,
      flashcards: gen.flashcards ?? null,
      body_md: null,
      cited_in: gen.cited_in ?? [],
      version: "v2",
    };
  });

  const v2Ids = new Set(v2.map((c) => c.id));

  const v1 = loadFrom(SYNTH_V1_DIR, (f, raw) => {
    const id = raw.lesson_id ?? raw.source?.id ?? f.replace(".json", "");
    if (v2Ids.has(id)) return null;
    const src = raw.source ?? {};
    const gen = raw.generated ?? {};
    return {
      id,
      slug: src.slug ?? "",
      level: Number(src.level ?? 0),
      wbs: Array.isArray(src.wbs) ? src.wbs : [],
      reading_min: Number(src.reading_min ?? 0),
      title: src.title ?? "",
      aim: gen.aim ?? src.aim ?? "",
      application: gen.application ?? src.application ?? "",
      tldr: null,
      sections: null,
      worked_example: null,
      decision_tree: null,
      mcqs: null,
      flashcards: null,
      body_md: gen.body_md ?? null,
      cited_in: gen.cited_in ?? [],
      version: "v1",
    };
  });

  return [...v2, ...v1].sort((a, b) => a.id.localeCompare(b.id));
}

const curriculumRouter = router({
  list: publicProcedure.query(async () => {
    const cards = readAll();
    return cards.map((c) => ({
      id: c.id,
      slug: c.slug,
      level: c.level,
      wbs: c.wbs,
      reading_min: c.reading_min,
      title: c.title,
      aim: c.aim,
      version: c.version,
      hasBody: Boolean(c.body_md || c.sections),
    }));
  }),

  bySlug: publicProcedure
    .input(z.object({ slug: z.string().min(1) }))
    .query(async ({ input }) => {
      const cards = readAll();
      const card = cards.find((c) => c.slug === input.slug);
      return card ?? null;
    }),
});

export { curriculumRouter };
