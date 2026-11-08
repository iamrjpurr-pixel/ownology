// /curriculum: 30 lessons in 4 levels. Level 1 is free with an email; the rest come with a plan.

import { Link } from "wouter";
import { trpc } from "@/lib/trpc";
import { Badge } from "@/components/ui/badge";
import { ArrowRight, Clock, GraduationCap, Lock } from "lucide-react";
import { Level1Unlock } from "@/components/curriculum/Level1Unlock";

const LEVEL_META: Record<number, { label: string; tagline: string; accent: string }> = {
  1: { label: "Level 1 · Foundations", tagline: "The basics every winemaker shares, in plain English", accent: "bg-amber-500/10 text-amber-900 border-amber-300" },
  2: { label: "Level 2 · Grape to Ferment", tagline: "The calls you make from the vineyard to the fermenter", accent: "bg-rose-500/10 text-rose-900 border-rose-300" },
  3: { label: "Level 3 · Cellar Craft", tagline: "Looking after wine between ferment and blend", accent: "bg-purple-500/10 text-purple-900 border-purple-300" },
  4: { label: "Level 4 · Finishing & Reflection", tagline: "Getting wine into bottle, and learning from each vintage", accent: "bg-emerald-500/10 text-emerald-900 border-emerald-300" },
};

export default function Curriculum() {
  const { data, isLoading } = trpc.curriculum.list.useQuery();
  const lessons = data?.lessons;
  const fullAccess = !!data && data.tier !== "free";
  const level1Open = fullAccess || !!data?.level1Unlocked;

  const byLevel = new Map<number, typeof lessons>();
  if (lessons) {
    for (const l of lessons) {
      const arr = byLevel.get(l.level) ?? [];
      arr.push(l);
      byLevel.set(l.level, arr);
    }
  }

  return (
    <div className="force-light min-h-screen bg-stone-50" data-testid="curriculum-index">
      {/* Hero */}
      <div className="border-b border-stone-200 bg-white">
        <div className="max-w-6xl mx-auto px-6 py-10">
          <div className="flex items-center gap-2 text-sm text-stone-600 mb-4">
            <GraduationCap className="h-4 w-4" />
            <span>The Ownology Curriculum</span>
          </div>
          <h1 className="font-serif text-4xl md:text-5xl text-stone-900 tracking-tight" data-testid="curriculum-title">
            Learn winemaking the way your cellar actually works
          </h1>
          <p className="mt-4 max-w-3xl text-lg text-stone-700 leading-relaxed">
            Short, practical lessons for small winery teams and anyone starting out. Get new staff up to speed
            before vintage, or build your own know-how one 5-minute read at a time.
          </p>
          <div className="mt-6 flex flex-wrap gap-3 text-sm">
            <Badge variant="outline" className="bg-white" data-testid="stat-lessons">{lessons?.length ?? 30} lessons</Badge>
            <Badge variant="outline" className="bg-white" data-testid="stat-levels">4 levels, beginner to advanced</Badge>
            <Badge variant="outline" className="bg-white" data-testid="stat-minutes">3–6 minutes each</Badge>
            <Badge variant="outline" className="bg-white" data-testid="stat-free">Level 1 free</Badge>
          </div>
          {data && !level1Open && <div className="mt-8 max-w-2xl"><Level1Unlock /></div>}
          {data && level1Open && !fullAccess && (
            <p className="mt-6 text-sm text-stone-700" data-testid="level1-unlocked-note">
              Level 1 is unlocked for you. <Link href={`/curriculum/${lessons?.find((l) => l.level === 1)?.slug ?? ""}`} className="underline">Start lesson 1</Link>
            </p>
          )}
        </div>
      </div>

      <div className="max-w-6xl mx-auto px-6 py-10 space-y-14">
        {isLoading && (
          <p className="text-stone-600" data-testid="curriculum-loading">Loading curriculum…</p>
        )}

        {[1, 2, 3, 4].map((lvl) => {
          const meta = LEVEL_META[lvl];
          const items = byLevel.get(lvl) ?? [];
          if (items.length === 0 && !isLoading) return null;
          return (
            <section key={lvl} data-testid={`level-${lvl}`}>
              <div className="mb-6">
                <div className={`inline-flex items-center gap-1.5 rounded-full border px-3 py-1 text-xs font-medium ${meta.accent}`}>
                  {meta.label}
                  {!fullAccess && (lvl === 1 ? <span className="rounded-full bg-amber-500 px-1.5 text-white">Free</span> : <Lock className="h-3 w-3" aria-label="Needs a plan" />)}
                </div>
                <p className="mt-2 text-lg text-stone-700 font-serif italic">{meta.tagline}</p>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                {items.map((l) => (
                  <Link
                    key={l.id}
                    href={`/curriculum/${l.slug}`}
                    className="group block rounded-lg border border-stone-200 bg-white hover:border-stone-400 hover:shadow-md transition-all p-5"
                    data-testid={`lesson-card-${l.id}`}
                  >
                    <div className="flex items-start justify-between gap-3 mb-2">
                      <div className="text-xs text-stone-600">Lesson {l.id.replace(/^L/, "")}</div>
                      <div className="flex items-center gap-1 text-xs text-stone-600 whitespace-nowrap">
                        <Clock className="h-3 w-3" />
                        {l.reading_min} min
                      </div>
                    </div>

                    <h3 className="font-serif text-xl text-stone-900 leading-snug mb-2 group-hover:text-stone-700">
                      {l.title}
                    </h3>
                    <p className="text-sm text-stone-600 line-clamp-2 leading-relaxed">{l.aim?.replace(/ (\S+)$/, "\u00a0$1")}</p>

                    <div className="mt-3 flex items-center text-sm text-stone-600 group-hover:text-stone-800">
                      {fullAccess || (lvl === 1 && level1Open) ? "Read lesson" : lvl === 1 ? "Preview, free with email" : "Preview"}
                      <ArrowRight className="h-4 w-4 ml-1 group-hover:translate-x-0.5 transition-transform" />
                    </div>
                  </Link>
                ))}

                {/* Placeholder for lessons still synthesising */}
                {items.length === 0 && (
                  <div className="col-span-2 rounded-lg border border-dashed border-stone-300 p-6 text-center text-stone-600 text-sm">
                    Lessons synthesising — check back in a few minutes
                  </div>
                )}
              </div>
            </section>
          );
        })}
      </div>
    </div>
  );
}
