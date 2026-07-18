/**
 * /curriculum/:slug — Structured Lesson Card v2
 *
 * Reads the structured JSON from the curriculum API and renders it as
 * a scannable, non-textbook UX with 3 reading modes:
 *   • Deep — all sections, worked example, decision tree, quiz
 *   • Skim — TL;DR + section keyConcepts + traps only
 *   • Flash — Q/A card stack, swipeable
 *
 * Falls back to plain markdown body if the lesson is v1.
 */

import { useState, useMemo } from "react";
import { Link, useRoute } from "wouter";
import { trpc } from "@/lib/trpc";
import { useVigneronAccess } from "@/lib/useVigneronAccess";
import ReactMarkdown from "react-markdown";
import remarkGfm from "remark-gfm";
import { Button } from "@/components/ui/button";
import {
  ArrowLeft, ArrowRight, BookOpen, Clock, ExternalLink, GraduationCap, Lock,
  Zap, Layers, Sparkles, Thermometer, Wind, Activity, Gauge, Clock as ClockIcon,
  FlaskConical, Droplets, Target, AlertTriangle, Lightbulb,
  Globe, RotateCcw
} from "lucide-react";

const LEVEL_META: Record<number, { label: string; accent: string; ring: string }> = {
  1: { label: "Level 1 · Foundations", accent: "bg-amber-100 text-amber-900 border-amber-300", ring: "ring-amber-200" },
  2: { label: "Level 2 · Grape to Ferment", accent: "bg-rose-100 text-rose-900 border-rose-300", ring: "ring-rose-200" },
  3: { label: "Level 3 · Cellar Craft", accent: "bg-purple-100 text-purple-900 border-purple-300", ring: "ring-purple-200" },
  4: { label: "Level 4 · Finishing & Reflection", accent: "bg-emerald-100 text-emerald-900 border-emerald-300", ring: "ring-emerald-200" },
};

// Icon resolver — maps iconHint strings from the synthesis to lucide components
const ICON_MAP: Record<string, typeof Thermometer> = {
  thermometer: Thermometer, wind: Wind, activity: Activity, gauge: Gauge,
  clock: ClockIcon, "flask-conical": FlaskConical, flask: FlaskConical,
  droplets: Droplets, target: Target,
};
function SectionIcon({ hint }: { hint: string }) {
  const Cmp = ICON_MAP[hint?.toLowerCase()] ?? Sparkles;
  return <Cmp className="h-5 w-5 text-stone-700" />;
}

// Reading mode toggle
type Mode = "deep" | "skim" | "flash";

export default function CurriculumLesson() {
  const [, params] = useRoute("/curriculum/:slug");
  const slug = params?.slug ?? "";
  const { data: lesson, isLoading } = trpc.curriculum.bySlug.useQuery({ slug }, { enabled: !!slug });
  const [mode, setMode] = useState<Mode>("deep");
  const [flashIdx, setFlashIdx] = useState(0);
  const [flashFlipped, setFlashFlipped] = useState(false);
  const [quizAnswers, setQuizAnswers] = useState<Record<number, string>>({});
  const [quizReveal, setQuizReveal] = useState<Record<number, boolean>>({});

  // NOTE: All hooks MUST run before any early return. Rules of Hooks.
  const groupedCitations = useMemo(() => {
    const g: Record<string, any[]> = {};
    for (const c of lesson?.cited_in ?? []) (g[c.kind] ??= []).push(c);
    return g;
  }, [lesson?.cited_in]);

  if (isLoading) return <div className="max-w-3xl mx-auto p-12 text-stone-500" data-testid="lesson-loading">Loading lesson…</div>;
  if (!lesson) return (
    <div className="max-w-3xl mx-auto p-12" data-testid="lesson-notfound">
      <p className="text-stone-600 mb-4">Lesson not found.</p>
      <Link href="/curriculum"><Button variant="outline" data-testid="back-to-index-btn">Back to curriculum</Button></Link>
    </div>
  );

  const levelMeta = LEVEL_META[lesson.level] ?? LEVEL_META[1];
  const isV2 = lesson.version === "v2";

  const readingMinutes = isV2 && lesson.sections
    ? Math.max(lesson.reading_min, 5 + lesson.sections.length * 2 + (lesson.mcqs?.length ?? 0))
    : lesson.reading_min;

  return (
    <div className="min-h-screen bg-stone-50" data-testid="lesson-page">
      {/* Sticky header strip */}
      <div className="sticky top-0 z-10 border-b border-stone-200 bg-white/95 backdrop-blur">
        <div className="max-w-4xl mx-auto px-6 py-3 flex items-center justify-between gap-4">
          <Link href="/curriculum">
            <button className="flex items-center gap-1.5 text-sm text-stone-500 hover:text-stone-900" data-testid="back-btn">
              <ArrowLeft className="h-4 w-4" /> All lessons
            </button>
          </Link>

          {isV2 && (
            <div className="flex items-center gap-1 bg-stone-100 rounded-full p-1" data-testid="mode-toggle">
              <ModeBtn active={mode === "deep"} onClick={() => setMode("deep")} icon={BookOpen} label="Deep" testid="mode-deep" />
              <ModeBtn active={mode === "skim"} onClick={() => setMode("skim")} icon={Zap} label="Skim" testid="mode-skim" />
              <ModeBtn active={mode === "flash"} onClick={() => { setMode("flash"); setFlashIdx(0); setFlashFlipped(false); }} icon={Layers} label="Flash" testid="mode-flash" />
            </div>
          )}
        </div>
      </div>

      {/* Hero */}
      <div className="max-w-4xl mx-auto px-6 pt-10 pb-6">
        <div className="flex flex-wrap items-center gap-2 mb-4">
          <span className={`inline-flex items-center rounded-full border px-3 py-1 text-xs font-medium ${levelMeta.accent}`} data-testid="lesson-level">
            {levelMeta.label}
          </span>
          <span className="text-xs text-stone-500 font-mono" data-testid="lesson-id">{lesson.id}</span>
          {lesson.wbs.map((d) => (
            <span key={d} className="text-xs bg-stone-100 border border-stone-200 rounded px-2 py-0.5 font-mono text-stone-700">{d}</span>
          ))}
          <span className="flex items-center gap-1 text-xs text-stone-500">
            <Clock className="h-3 w-3" /> ~{readingMinutes} min
          </span>
        </div>

        <h1 className="font-serif text-4xl md:text-5xl text-stone-900 tracking-tight leading-tight" data-testid="lesson-title">
          {lesson.title}
        </h1>

        {lesson.aim && (
          <p className="mt-5 text-lg text-stone-700 leading-relaxed font-serif italic" data-testid="lesson-aim">{lesson.aim}</p>
        )}

        {/* Application box */}
        {lesson.application && (
          <div className="mt-6 rounded-lg border-l-4 border-rose-500 bg-white pl-5 pr-5 py-4 shadow-sm" data-testid="lesson-application">
            <div className="text-xs font-semibold text-rose-700 uppercase tracking-wider mb-1 flex items-center gap-1.5">
              <Target className="h-3 w-3" /> In your cellar
            </div>
            <p className="text-stone-800 leading-relaxed">{lesson.application}</p>
          </div>
        )}
      </div>

      {/* TL;DR — only v2 */}
      {isV2 && lesson.tldr && lesson.tldr.length > 0 && (
        <div className="max-w-4xl mx-auto px-6 pb-6">
          <div className={`rounded-xl bg-white border border-stone-200 ring-4 ${levelMeta.ring} p-6`} data-testid="lesson-tldr">
            <div className="text-xs font-semibold text-stone-500 uppercase tracking-wider mb-3 flex items-center gap-1.5">
              <Zap className="h-3 w-3" /> TL;DR
            </div>
            <ul className="space-y-2.5">
              {lesson.tldr.map((t, i) => (
                <li key={i} className="flex items-start gap-3 text-stone-800 leading-relaxed">
                  <span className="mt-1.5 w-1.5 h-1.5 rounded-full bg-stone-800 flex-shrink-0" />
                  <span>{t}</span>
                </li>
              ))}
            </ul>
          </div>
        </div>
      )}

      {/* Body by mode — GATED for Vigneron tier */}
      {!access.unlocked ? (
        <PaywallBoundary lessonTitle={lesson.title} isAuthenticated={access.isAuthenticated} />
      ) : (
        <>
          {isV2 && lesson.sections && mode === "deep" && (
            <DeepModeContent lesson={lesson} quizAnswers={quizAnswers} setQuizAnswers={setQuizAnswers} quizReveal={quizReveal} setQuizReveal={setQuizReveal} />
          )}

          {isV2 && lesson.sections && mode === "skim" && (
            <SkimModeContent lesson={lesson} />
          )}

          {isV2 && lesson.flashcards && mode === "flash" && (
            <FlashModeContent
              cards={lesson.flashcards}
              idx={flashIdx}
              flipped={flashFlipped}
              onNext={() => { setFlashIdx((flashIdx + 1) % lesson.flashcards!.length); setFlashFlipped(false); }}
              onPrev={() => { setFlashIdx((flashIdx - 1 + lesson.flashcards!.length) % lesson.flashcards!.length); setFlashFlipped(false); }}
              onFlip={() => setFlashFlipped((f) => !f)}
            />
          )}

          {/* v1 fallback — plain body */}
          {!isV2 && lesson.body_md && (
            <div className="max-w-4xl mx-auto px-6 pb-10">
              <article className="prose prose-stone max-w-none prose-headings:font-serif prose-h3:text-2xl prose-h3:mt-8 prose-h3:mb-3" data-testid="lesson-body">
                <ReactMarkdown remarkPlugins={[remarkGfm]}>{lesson.body_md}</ReactMarkdown>
              </article>
            </div>
          )}
        </>
      )}

      {/* Citations — visible only if unlocked */}
      {access.unlocked && lesson.cited_in && lesson.cited_in.length > 0 && (mode !== "flash") && (
        <CitedIn grouped={groupedCitations} />
      )}
    </div>
  );
}

/* ============ SUB-COMPONENTS ============ */

function ModeBtn({ active, onClick, icon: Icon, label, testid }: { active: boolean; onClick: () => void; icon: typeof Zap; label: string; testid: string }) {
  return (
    <button
      onClick={onClick}
      className={`flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-medium transition-all ${active ? "bg-white shadow-sm text-stone-900" : "text-stone-600 hover:text-stone-900"}`}
      data-testid={testid}
    >
      <Icon className="h-3.5 w-3.5" /> {label}
    </button>
  );
}

function DeepModeContent({ lesson, quizAnswers, setQuizAnswers, quizReveal, setQuizReveal }: any) {
  return (
    <>
      {/* Sections */}
      <div className="max-w-4xl mx-auto px-6 space-y-10 pb-10">
        {lesson.sections.map((s: any, i: number) => (
          <section key={i} className="relative" data-testid={`section-${i}`}>
            <div className="flex items-center gap-3 mb-4">
              <div className="w-10 h-10 rounded-full bg-stone-100 flex items-center justify-center">
                <SectionIcon hint={s.iconHint} />
              </div>
              <div className="text-xs text-stone-500 font-mono">Section {i + 1}</div>
            </div>
            <h2 className="font-serif text-2xl md:text-3xl text-stone-900 leading-snug mb-4" data-testid={`section-heading-${i}`}>
              {s.heading}
            </h2>
            <div className="prose prose-stone max-w-none prose-p:text-stone-800 prose-p:leading-relaxed prose-p:mb-4">
              <ReactMarkdown remarkPlugins={[remarkGfm]}>{s.body_md}</ReactMarkdown>
            </div>

            {/* Key concept callout */}
            {s.keyConcept && (
              <div className="mt-4 flex gap-3 rounded-lg bg-emerald-50 border border-emerald-200 p-4" data-testid={`section-key-${i}`}>
                <Lightbulb className="h-5 w-5 text-emerald-700 flex-shrink-0 mt-0.5" />
                <div>
                  <div className="text-xs font-semibold text-emerald-900 uppercase tracking-wider mb-1">The number that matters</div>
                  <p className="text-stone-800 leading-relaxed">{s.keyConcept}</p>
                </div>
              </div>
            )}

            {/* Trap callout */}
            {s.trap && (
              <div className="mt-3 flex gap-3 rounded-lg bg-amber-50 border border-amber-200 p-4" data-testid={`section-trap-${i}`}>
                <AlertTriangle className="h-5 w-5 text-amber-700 flex-shrink-0 mt-0.5" />
                <div>
                  <div className="text-xs font-semibold text-amber-900 uppercase tracking-wider mb-1">The trap</div>
                  <p className="text-stone-800 leading-relaxed">{s.trap}</p>
                </div>
              </div>
            )}
          </section>
        ))}
      </div>

      {/* Worked example */}
      {lesson.worked_example && (
        <div className="max-w-4xl mx-auto px-6 pb-10">
          <div className="rounded-xl bg-stone-900 text-stone-100 p-8" data-testid="worked-example">
            <div className="text-xs font-semibold text-stone-400 uppercase tracking-wider mb-2 flex items-center gap-1.5">
              <FlaskConical className="h-3.5 w-3.5" /> Worked example
            </div>
            <h3 className="font-serif text-2xl md:text-3xl text-white mb-5">{lesson.worked_example.title}</h3>

            {lesson.worked_example.starting_conditions?.length > 0 && (
              <div className="mb-6">
                <div className="text-xs text-stone-400 uppercase tracking-wider mb-2">Starting conditions</div>
                <ul className="space-y-1.5">
                  {lesson.worked_example.starting_conditions.map((c: string, j: number) => (
                    <li key={j} className="text-stone-200 text-sm">• {c}</li>
                  ))}
                </ul>
              </div>
            )}

            <div className="space-y-4">
              {lesson.worked_example.timeline?.map((t: any, j: number) => (
                <div key={j} className="grid grid-cols-1 md:grid-cols-[100px_1fr] gap-3 md:gap-6 border-l-2 border-rose-500 pl-4 pb-2">
                  <div className="text-rose-300 font-mono text-sm font-semibold">{t.when}</div>
                  <div className="space-y-1 text-sm">
                    <div className="text-stone-300"><span className="text-stone-500">Observed:</span> {t.observation}</div>
                    <div className="text-white"><span className="text-stone-500">Decision:</span> <strong>{t.decision}</strong></div>
                    <div className="text-stone-300"><span className="text-stone-500">Why:</span> {t.reasoning}</div>
                    <div className="text-stone-300"><span className="text-stone-500">Outcome:</span> {t.outcome}</div>
                  </div>
                </div>
              ))}
            </div>

            {lesson.worked_example.counterfactual && (
              <div className="mt-6 pt-5 border-t border-stone-700">
                <div className="text-xs text-stone-400 uppercase tracking-wider mb-1">Counterfactual</div>
                <p className="text-stone-200 italic">{lesson.worked_example.counterfactual}</p>
              </div>
            )}
          </div>
        </div>
      )}

      {/* Decision tree */}
      {lesson.decision_tree?.rows?.length > 0 && (
        <div className="max-w-4xl mx-auto px-6 pb-10">
          <div className="rounded-xl bg-white border border-stone-200 overflow-hidden" data-testid="decision-tree">
            <div className="px-6 py-4 border-b border-stone-200 bg-stone-50">
              <div className="text-xs font-semibold text-stone-500 uppercase tracking-wider mb-1">Decision tree</div>
              <h3 className="font-serif text-2xl text-stone-900">{lesson.decision_tree.title}</h3>
            </div>
            <div className="divide-y divide-stone-200">
              {lesson.decision_tree.rows.map((r: any, j: number) => (
                <div key={j} className="grid grid-cols-1 md:grid-cols-[1fr_1fr_1fr] gap-4 p-5 hover:bg-stone-50">
                  <div>
                    <div className="text-xs text-stone-500 uppercase tracking-wider mb-1">Symptom</div>
                    <div className="text-stone-900 font-medium">{r.symptom}</div>
                  </div>
                  <div>
                    <div className="text-xs text-stone-500 uppercase tracking-wider mb-1">First check</div>
                    <div className="text-stone-700">{r.first_check}</div>
                  </div>
                  <div>
                    <div className="text-xs text-stone-500 uppercase tracking-wider mb-1">Action</div>
                    <div className="text-emerald-900 font-medium">{r.action}</div>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>
      )}

      {/* MCQs */}
      {lesson.mcqs?.length > 0 && (
        <div className="max-w-4xl mx-auto px-6 pb-14">
          <div className="mb-6">
            <div className="text-xs font-semibold text-stone-500 uppercase tracking-wider mb-1">Check your understanding</div>
            <h3 className="font-serif text-2xl text-stone-900">{lesson.mcqs.length} questions to close the loop</h3>
          </div>
          <div className="space-y-4">
            {lesson.mcqs.map((m: any, j: number) => (
              <div key={j} className="rounded-lg border border-stone-200 bg-white p-5" data-testid={`mcq-${j}`}>
                <p className="font-medium text-stone-900 mb-3"><span className="text-stone-500 font-mono mr-1">Q{j + 1}.</span> {m.q}</p>
                <div className="space-y-2 mb-3">
                  {m.choices.map((c: string) => {
                    const letter = c.charAt(0);
                    const selected = quizAnswers[j] === letter;
                    const revealed = quizReveal[j];
                    const isCorrect = letter === m.answer;
                    const cls = revealed
                      ? (isCorrect ? "border-emerald-400 bg-emerald-50" : selected ? "border-rose-400 bg-rose-50" : "border-stone-200")
                      : (selected ? "border-stone-500 bg-stone-50" : "border-stone-200 hover:border-stone-400");
                    return (
                      <button
                        key={letter}
                        onClick={() => setQuizAnswers({ ...quizAnswers, [j]: letter })}
                        disabled={revealed}
                        className={`w-full text-left px-4 py-2.5 rounded-lg border transition-all text-sm ${cls}`}
                        data-testid={`mcq-${j}-choice-${letter}`}
                      >
                        {c}
                      </button>
                    );
                  })}
                </div>
                {!quizReveal[j] ? (
                  <button
                    onClick={() => setQuizReveal({ ...quizReveal, [j]: true })}
                    disabled={!quizAnswers[j]}
                    className="text-sm text-stone-600 hover:text-stone-900 disabled:opacity-40 disabled:cursor-not-allowed"
                    data-testid={`mcq-${j}-reveal-btn`}
                  >Check answer →</button>
                ) : (
                  <div className="mt-3 text-sm text-stone-700 leading-relaxed bg-stone-50 rounded p-3 border border-stone-200" data-testid={`mcq-${j}-rationale`}>
                    <span className="font-semibold">{m.answer}</span> — {m.rationale}
                  </div>
                )}
              </div>
            ))}
          </div>
        </div>
      )}
    </>
  );
}

function SkimModeContent({ lesson }: any) {
  return (
    <div className="max-w-4xl mx-auto px-6 pb-14 space-y-4" data-testid="skim-mode">
      {lesson.sections.map((s: any, i: number) => (
        <div key={i} className="rounded-lg border border-stone-200 bg-white p-5">
          <div className="flex items-center gap-3 mb-3">
            <SectionIcon hint={s.iconHint} />
            <h3 className="font-serif text-xl text-stone-900">{s.heading}</h3>
          </div>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
            <div className="rounded-md bg-emerald-50 border border-emerald-200 p-3">
              <div className="text-xs font-semibold text-emerald-900 uppercase tracking-wider mb-1">Remember</div>
              <p className="text-sm text-stone-800 leading-relaxed">{s.keyConcept}</p>
            </div>
            <div className="rounded-md bg-amber-50 border border-amber-200 p-3">
              <div className="text-xs font-semibold text-amber-900 uppercase tracking-wider mb-1">Avoid</div>
              <p className="text-sm text-stone-800 leading-relaxed">{s.trap}</p>
            </div>
          </div>
        </div>
      ))}
    </div>
  );
}

function FlashModeContent({ cards, idx, flipped, onNext, onPrev, onFlip }: any) {
  const card = cards[idx];
  return (
    <div className="max-w-3xl mx-auto px-6 pb-14 mt-8" data-testid="flash-mode">
      <div className="text-center text-sm text-stone-500 mb-6">Card {idx + 1} of {cards.length}</div>
      <button
        onClick={onFlip}
        className={`w-full min-h-[280px] rounded-2xl border-2 border-stone-200 bg-white p-8 md:p-12 flex flex-col items-center justify-center text-center transition-all hover:border-stone-400 shadow-sm ${flipped ? "bg-stone-50" : "bg-white"}`}
        data-testid={`flash-card-${idx}`}
      >
        <div className="text-xs font-semibold text-stone-500 uppercase tracking-wider mb-4">
          {flipped ? "Back" : "Front — tap to reveal"}
        </div>
        <p className="font-serif text-2xl md:text-3xl text-stone-900 leading-snug">
          {flipped ? card.back : card.front}
        </p>
      </button>
      <div className="mt-6 flex items-center justify-between">
        <Button variant="outline" onClick={onPrev} data-testid="flash-prev-btn"><ArrowLeft className="h-4 w-4 mr-1" /> Prev</Button>
        <Button variant="outline" onClick={onFlip} data-testid="flash-flip-btn"><RotateCcw className="h-4 w-4 mr-1" /> Flip</Button>
        <Button variant="outline" onClick={onNext} data-testid="flash-next-btn">Next <ArrowRight className="h-4 w-4 ml-1" /></Button>
      </div>
    </div>
  );
}

function CitedIn({ grouped }: { grouped: Record<string, any[]> }) {
  const order = ["buy", "free", "curriculum", "private"];
  const meta: Record<string, { icon: typeof BookOpen; label: string; tint: string }> = {
    buy: { icon: BookOpen, label: "Further reading (buy)", tint: "border-stone-300 bg-stone-50 text-stone-800" },
    free: { icon: Globe, label: "Free industry reference", tint: "border-emerald-300 bg-emerald-50 text-emerald-900" },
    curriculum: { icon: GraduationCap, label: "University curriculum", tint: "border-indigo-300 bg-indigo-50 text-indigo-900" },
    private: { icon: Lock, label: "Also in your library", tint: "border-amber-300 bg-amber-50 text-amber-900" },
  };
  return (
    <div className="max-w-4xl mx-auto px-6 pb-14">
      <div className="border-t border-stone-300 pt-6">
        <h2 className="font-serif text-2xl text-stone-900 mb-4">Cited in this lesson</h2>
        <div className="space-y-4">
          {order.map((kind) => {
            const items = grouped[kind];
            if (!items || items.length === 0) return null;
            const m = meta[kind];
            const Icon = m.icon;
            return (
              <div key={kind} data-testid={`citation-group-${kind}`}>
                <div className="text-xs font-semibold text-stone-600 uppercase tracking-wider mb-2 flex items-center gap-1.5">
                  <Icon className="h-3 w-3" /> {m.label}
                </div>
                <ul className="space-y-2">
                  {items.map((c: any, i: number) => (
                    <li key={i} className={`rounded border ${m.tint} px-3 py-2 text-sm flex items-start justify-between gap-3`}>
                      <div className="flex-1">
                        <div className="font-medium">{c.label}</div>
                        {c.note && <div className="text-xs opacity-75 mt-0.5">{c.note}</div>}
                      </div>
                      {c.url && (
                        <a href={c.url} target="_blank" rel="noopener noreferrer" className="text-xs underline decoration-dotted whitespace-nowrap flex items-center gap-1">
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
        <p className="mt-6 text-xs text-stone-500 leading-relaxed">
          This lesson is Ownology-original writing. Referenced textbooks are cited for further reading — their contents are not reproduced here.
          Purchase from the publisher for the full source.
        </p>
      </div>
    </div>
  );
}

function PaywallBoundary({ lessonTitle, isAuthenticated }: { lessonTitle: string; isAuthenticated: boolean }) {
  return (
    <div className="max-w-4xl mx-auto px-6 py-14" data-testid="paywall-boundary">
      <div className="rounded-2xl border-2 border-amber-300 bg-gradient-to-br from-amber-50 to-white p-8 md:p-12 shadow-sm">
        <div className="flex items-center gap-3 text-amber-900 font-semibold text-sm uppercase tracking-wider mb-4">
          <Lock className="h-4 w-4" /> Vigneron members only
        </div>
        <h2 className="font-serif text-3xl md:text-4xl text-stone-900 leading-tight mb-4">
          Ready to open the full lesson?
        </h2>
        <p className="text-stone-700 leading-relaxed text-lg mb-6 max-w-2xl">
          The rest of <em>{lessonTitle}</em> — five sections, a Tank-4-style worked example, decision tree, ten questions and eight flashcards —
          is unlocked with a Vigneron membership. Free-Run visitors read the aim; members do the work.
        </p>
        <div className="flex flex-wrap gap-3">
          <Link href="/pricing?from=curriculum-paywall">
            <Button size="lg" className="bg-stone-900 hover:bg-stone-800" data-testid="paywall-cta-pricing">
              See Vigneron pricing <ArrowRight className="h-4 w-4 ml-2" />
            </Button>
          </Link>
          <Link href="/curriculum/about">
            <Button variant="outline" size="lg" data-testid="paywall-cta-learn">
              What's inside the curriculum
            </Button>
          </Link>
          {!isAuthenticated && (
            <Link href="/login?next=/curriculum">
              <Button variant="ghost" size="lg" data-testid="paywall-cta-signin">
                Already a member? Sign in
              </Button>
            </Link>
          )}
        </div>
        <p className="mt-6 text-xs text-stone-500">
          14-day free trial available. Cancel anytime. Founding member pricing locks for life.
        </p>
      </div>
    </div>
  );
}
