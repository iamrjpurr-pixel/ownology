/**
 * /curriculum/:slug — Individual Lesson Card view.
 *
 * Shows: title, level, WBS domains, reading time, aim, application,
 * body markdown, and the Cited In strip.
 */

import { Link, useRoute } from "wouter";
import { trpc } from "@/lib/trpc";
import ReactMarkdown from "react-markdown";
import remarkGfm from "remark-gfm";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { ArrowLeft, Clock, ExternalLink, BookOpen, Globe, GraduationCap, Lock } from "lucide-react";

const LEVEL_META: Record<number, { label: string; accent: string }> = {
  1: { label: "Level 1 · Foundations", accent: "bg-amber-500/10 text-amber-900 border-amber-300" },
  2: { label: "Level 2 · Grape to Ferment", accent: "bg-rose-500/10 text-rose-900 border-rose-300" },
  3: { label: "Level 3 · Cellar Craft", accent: "bg-purple-500/10 text-purple-900 border-purple-300" },
  4: { label: "Level 4 · Finishing & Reflection", accent: "bg-emerald-500/10 text-emerald-900 border-emerald-300" },
};

const CITED_META: Record<string, { icon: typeof BookOpen; label: string; tint: string }> = {
  buy: { icon: BookOpen, label: "Further reading (buy)", tint: "border-stone-300 bg-stone-50 text-stone-800" },
  free: { icon: Globe, label: "Free industry reference", tint: "border-emerald-300 bg-emerald-50 text-emerald-900" },
  curriculum: { icon: GraduationCap, label: "University curriculum", tint: "border-indigo-300 bg-indigo-50 text-indigo-900" },
  private: { icon: Lock, label: "Also in your library", tint: "border-amber-300 bg-amber-50 text-amber-900" },
};

export default function CurriculumLesson() {
  const [, params] = useRoute("/curriculum/:slug");
  const slug = params?.slug ?? "";
  const { data: lesson, isLoading } = trpc.curriculum.bySlug.useQuery({ slug }, { enabled: !!slug });

  if (isLoading) {
    return <div className="max-w-3xl mx-auto p-12 text-stone-500" data-testid="lesson-loading">Loading lesson…</div>;
  }
  if (!lesson) {
    return (
      <div className="max-w-3xl mx-auto p-12" data-testid="lesson-notfound">
        <p className="text-stone-600 mb-4">Lesson not found.</p>
        <Link href="/curriculum">
          <Button variant="outline" data-testid="back-to-index-btn">Back to curriculum</Button>
        </Link>
      </div>
    );
  }

  const levelMeta = LEVEL_META[lesson.level] ?? LEVEL_META[1];

  // Group citations by kind for the Cited In strip
  const groupedCitations: Record<string, typeof lesson.cited_in> = {};
  for (const c of lesson.cited_in ?? []) {
    (groupedCitations[c.kind] ??= []).push(c);
  }
  const citationOrder = ["buy", "free", "curriculum", "private"];

  return (
    <div className="min-h-screen bg-stone-50" data-testid="lesson-page">
      {/* Header strip */}
      <div className="border-b border-stone-200 bg-white">
        <div className="max-w-3xl mx-auto px-6 py-4">
          <Link href="/curriculum">
            <button className="flex items-center gap-1.5 text-sm text-stone-500 hover:text-stone-800" data-testid="back-btn">
              <ArrowLeft className="h-4 w-4" /> All lessons
            </button>
          </Link>
        </div>
      </div>

      {/* Hero */}
      <div className="max-w-3xl mx-auto px-6 pt-10 pb-8">
        <div className="flex flex-wrap items-center gap-3 mb-4">
          <span className={`inline-flex items-center rounded-full border px-3 py-1 text-xs font-medium ${levelMeta.accent}`} data-testid="lesson-level">
            {levelMeta.label}
          </span>
          <span className="text-xs text-stone-500 font-mono" data-testid="lesson-id">{lesson.id}</span>
          {lesson.wbs.map((d) => (
            <span key={d} className="text-xs bg-stone-100 border border-stone-200 rounded px-2 py-0.5 font-mono text-stone-700">
              {d}
            </span>
          ))}
          <span className="flex items-center gap-1 text-xs text-stone-500">
            <Clock className="h-3 w-3" /> {lesson.reading_min} min read
          </span>
        </div>

        <h1 className="font-serif text-4xl md:text-5xl text-stone-900 tracking-tight leading-tight" data-testid="lesson-title">
          {lesson.title}
        </h1>

        {/* Aim */}
        <p className="mt-6 text-lg text-stone-700 leading-relaxed font-serif italic" data-testid="lesson-aim">
          {lesson.aim}
        </p>

        {/* Application block */}
        {lesson.application && (
          <div className="mt-6 rounded-lg border-l-4 border-rose-500 bg-white pl-5 pr-5 py-4 shadow-sm" data-testid="lesson-application">
            <div className="text-xs font-semibold text-rose-700 uppercase tracking-wider mb-1">In your cellar</div>
            <p className="text-stone-800 leading-relaxed">{lesson.application}</p>
          </div>
        )}
      </div>

      {/* Body */}
      {lesson.body_md ? (
        <div className="max-w-3xl mx-auto px-6 pb-10">
          <article
            className="prose prose-stone max-w-none prose-headings:font-serif prose-h3:text-2xl prose-h3:mt-8 prose-h3:mb-3 prose-p:text-stone-800 prose-p:leading-relaxed prose-strong:text-stone-900 prose-ul:my-3 prose-li:my-1"
            data-testid="lesson-body"
          >
            <ReactMarkdown remarkPlugins={[remarkGfm]}>{lesson.body_md}</ReactMarkdown>
          </article>
        </div>
      ) : (
        <div className="max-w-3xl mx-auto px-6 pb-10">
          <div className="rounded-lg border border-dashed border-stone-300 p-6 text-center text-stone-500 text-sm" data-testid="lesson-pending">
            This lesson body is still being synthesised. Check back shortly.
          </div>
        </div>
      )}

      {/* Cited In strip */}
      {lesson.cited_in && lesson.cited_in.length > 0 && (
        <div className="max-w-3xl mx-auto px-6 pb-14">
          <div className="border-t border-stone-300 pt-6">
            <h2 className="font-serif text-2xl text-stone-900 mb-4">Cited in this lesson</h2>
            <div className="space-y-4">
              {citationOrder.map((kind) => {
                const items = groupedCitations[kind];
                if (!items || items.length === 0) return null;
                const meta = CITED_META[kind];
                const Icon = meta.icon;
                return (
                  <div key={kind} data-testid={`citation-group-${kind}`}>
                    <div className="text-xs font-semibold text-stone-600 uppercase tracking-wider mb-2 flex items-center gap-1.5">
                      <Icon className="h-3 w-3" /> {meta.label}
                    </div>
                    <ul className="space-y-2">
                      {items.map((c, i) => (
                        <li key={i} className={`rounded border ${meta.tint} px-3 py-2 text-sm flex items-start justify-between gap-3`}>
                          <div className="flex-1">
                            <div className="font-medium">{c.label}</div>
                            {c.note && <div className="text-xs opacity-75 mt-0.5">{c.note}</div>}
                          </div>
                          {c.url && (
                            <a
                              href={c.url}
                              target="_blank"
                              rel="noopener noreferrer"
                              className="text-xs underline decoration-dotted whitespace-nowrap flex items-center gap-1"
                              data-testid={`citation-link-${kind}-${i}`}
                            >
                              open <ExternalLink className="h-3 w-3" />
                            </a>
                          )}
                        </li>
                      ))}
                    </ul>
                  </div>
                );
              })}
            </div>

            {/* Copyright disclosure */}
            <p className="mt-6 text-xs text-stone-500 leading-relaxed" data-testid="copyright-disclosure">
              This lesson is Ownology-original writing. Referenced textbooks are cited for further reading —
              their contents are not reproduced here. Purchase them from the publisher for the full source.
            </p>
          </div>
        </div>
      )}
    </div>
  );
}
