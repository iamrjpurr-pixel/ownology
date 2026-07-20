/**
 * /curriculum — Vigneron Tier Education Layer index page.
 * Shows 30 Ownology-original Lesson Cards, grouped by Level 1-4.
 */

import { Link } from "wouter";
import { trpc } from "@/lib/trpc";
import { Badge } from "@/components/ui/badge";
import { ArrowRight, Clock, GraduationCap, Sparkles } from "lucide-react";

const LEVEL_META: Record<number, { label: string; tagline: string; accent: string }> = {
  1: { label: "Level 1 · Foundations", tagline: "The science and language every serious winemaker shares", accent: "bg-amber-500/10 text-amber-900 border-amber-300" },
  2: { label: "Level 2 · Grape to Ferment", tagline: "Season-by-season decisions from vineyard to must", accent: "bg-rose-500/10 text-rose-900 border-rose-300" },
  3: { label: "Level 3 · Cellar Craft", tagline: "The critical calls between ferment and blend", accent: "bg-purple-500/10 text-purple-900 border-purple-300" },
  4: { label: "Level 4 · Finishing & Reflection", tagline: "How wine leaves the cellar — and how you learn from it", accent: "bg-emerald-500/10 text-emerald-900 border-emerald-300" },
};

const WBS_LABEL: Record<string, string> = {
  D1: "Vineyard",
  D2: "Harvest",
  D3: "Crushing & Ferment",
  D4: "Fermentation",
  D5: "Post-Ferment",
  D6: "Stabilisation",
  D7: "Packaging",
  D8: "Sensory",
  D9: "Maintenance",
  D10: "Compliance",
};

export default function Curriculum() {
  const { data, isLoading } = trpc.curriculum.list.useQuery();
  const lessons = data?.lessons;

  const byLevel = new Map<number, typeof lessons>();
  if (lessons) {
    for (const l of lessons) {
      const arr = byLevel.get(l.level) ?? [];
      arr.push(l);
      byLevel.set(l.level, arr);
    }
  }

  return (
    <div className="min-h-screen bg-stone-50" data-testid="curriculum-index">
      {/* Hero */}
      <div className="border-b border-stone-200 bg-white">
        <div className="max-w-6xl mx-auto px-6 py-10">
          <div className="flex items-center gap-2 text-sm text-stone-500 mb-4">
            <GraduationCap className="h-4 w-4" />
            <span>Vigneron Tier · Curriculum</span>
          </div>
          <h1 className="font-serif text-4xl md:text-5xl text-stone-900 tracking-tight" data-testid="curriculum-title">
            The Ownology Curriculum
          </h1>
          <p className="mt-4 max-w-3xl text-lg text-stone-700 leading-relaxed">
            Thirty lessons. Four levels. Original writing, benchmarked to Adelaide 068885G and CSU 4410WS01,
            grounded in MoreWine, AWRI and our reference library — and pinned to the decisions Owen makes
            with you every vintage.
          </p>
          <div className="mt-6 flex flex-wrap gap-3 text-sm">
            <Badge variant="outline" className="bg-white" data-testid="stat-lessons">
              <Sparkles className="h-3 w-3 mr-1.5" /> {lessons?.length ?? 30} lessons
            </Badge>
            <Badge variant="outline" className="bg-white" data-testid="stat-levels">4 levels</Badge>
            <Badge variant="outline" className="bg-white" data-testid="stat-wbs">All 10 WBS domains</Badge>
            <Badge variant="outline" className="bg-white" data-testid="stat-original">Ownology-original</Badge>
          </div>
        </div>
      </div>

      <div className="max-w-6xl mx-auto px-6 py-10 space-y-14">
        {isLoading && (
          <p className="text-stone-500" data-testid="curriculum-loading">Loading curriculum…</p>
        )}

        {[1, 2, 3, 4].map((lvl) => {
          const meta = LEVEL_META[lvl];
          const items = byLevel.get(lvl) ?? [];
          if (items.length === 0 && !isLoading) return null;
          return (
            <section key={lvl} data-testid={`level-${lvl}`}>
              <div className="mb-6">
                <div className={`inline-flex items-center rounded-full border px-3 py-1 text-xs font-medium ${meta.accent}`}>
                  {meta.label}
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
                      <div className="flex items-center gap-2 text-xs text-stone-500 font-mono">
                        <span>{l.id}</span>
                        {l.wbs.map((d) => (
                          <span key={d} className="rounded bg-stone-100 px-1.5 py-0.5" title={WBS_LABEL[d] ?? d}>
                            {d}
                          </span>
                        ))}
                      </div>
                      <div className="flex items-center gap-1 text-xs text-stone-500 whitespace-nowrap">
                        <Clock className="h-3 w-3" />
                        {l.reading_min} min
                      </div>
                    </div>

                    <h3 className="font-serif text-xl text-stone-900 leading-snug mb-2 group-hover:text-stone-700">
                      {l.title}
                    </h3>
                    <p className="text-sm text-stone-600 line-clamp-2 leading-relaxed">{l.aim}</p>

                    <div className="mt-3 flex items-center text-sm text-stone-500 group-hover:text-stone-800">
                      Read lesson
                      <ArrowRight className="h-4 w-4 ml-1 group-hover:translate-x-0.5 transition-transform" />
                    </div>
                  </Link>
                ))}

                {/* Placeholder for lessons still synthesising */}
                {items.length === 0 && (
                  <div className="col-span-2 rounded-lg border border-dashed border-stone-300 p-6 text-center text-stone-500 text-sm">
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
