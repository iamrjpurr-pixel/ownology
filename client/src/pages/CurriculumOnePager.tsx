/**
 * /curriculum/one-page — Peer-to-peer 1-page brief for the Curriculum.
 *
 * Purpose: a share-this-to-a-legend document. Intended for warm outreach to
 * senior industry figures (winery owners, technical directors, academics)
 * who need to judge the substance in under 60 seconds. Different visual
 * register from /curriculum/about: less marketing, more artefact. Reads
 * like a two-page brief, not a scrolling brochure.
 *
 * Structure:
 *  - Header strip:      Ownology mark + brief label + version tag
 *  - Hero:              One-sentence definition + trust anchor
 *  - 2-col grid:
 *      LEFT — The method    (how it was built, with real numbers)
 *      RIGHT — The artefact (a live excerpt of a lesson section)
 *  - Who it's for:      Three short lines
 *  - Below the fold:    Structure, FAQ-lite, footer CTA
 *
 * All copy is peer-voice. No "unlock", no "learn winemaking", no course
 * jargon. Written for someone who has already read every book we cite.
 *
 * Feb 2026, Rich.
 */

import { Link } from "wouter";
import { ArrowRight, GraduationCap, ScrollText } from "lucide-react";

export default function CurriculumOnePager() {
  return (
    <div className="min-h-screen bg-[#f8f5f0]" data-testid="curriculum-one-pager">
      {/* HEADER STRIP */}
      <header className="border-b border-stone-300/70 bg-[#f8f5f0]">
        <div className="max-w-[1180px] mx-auto px-8 py-4 flex items-center justify-between text-[11px] font-mono uppercase tracking-[0.14em] text-stone-500">
          <div className="flex items-center gap-3">
            <Link href="/" className="font-serif not-italic normal-case text-lg text-stone-900 tracking-tight">
              Ownology
            </Link>
            <span className="opacity-50">·</span>
            <span>Curriculum — one-page brief</span>
          </div>
          <div className="flex items-center gap-3 opacity-70">
            <span>v1 · Feb 2026</span>
          </div>
        </div>
      </header>

      {/* HERO — deliberately compact, no giant type */}
      <section className="border-b border-stone-300/70 bg-white">
        <div className="max-w-[1180px] mx-auto px-8 py-12 md:py-14">
          <div className="flex items-center gap-2 text-[11px] font-mono uppercase tracking-[0.14em] text-stone-500 mb-4">
            <ScrollText className="h-3.5 w-3.5" />
            <span>For working winemakers, cellar hands, and their teams</span>
          </div>
          <h1
            className="font-serif text-[2.15rem] md:text-[2.65rem] leading-[1.1] text-stone-900 max-w-4xl tracking-tight"
            data-testid="one-pager-hero"
          >
            Thirty lessons. The applied core of a wine-science degree, written
            for the person mid-vintage — not the student mid-semester.
          </h1>
          <p className="mt-5 text-stone-700 text-lg leading-relaxed max-w-3xl">
            Not a course. A working reference — twelve winemaking bibles, four
            university syllabi, thirty structured lessons in one voice — that
            unfolds beside every batch you run.
          </p>
        </div>
      </section>

      {/* 2-COL: METHOD × ARTEFACT — the substance */}
      <section className="border-b border-stone-300/70">
        <div className="max-w-[1180px] mx-auto px-8 py-12 grid md:grid-cols-2 gap-10 md:gap-14">
          {/* LEFT — The method */}
          <div>
            <div className="text-[11px] font-mono uppercase tracking-[0.14em] text-stone-500 mb-3">
              I · The method
            </div>
            <h2 className="font-serif text-2xl text-stone-900 mb-5 leading-tight">
              How it was built.
            </h2>
            <ol className="space-y-4 text-stone-700 text-[0.95rem] leading-relaxed">
              <MethodRow
                n="01"
                label="Scouted every degree unit"
                body="We audited the two accredited Australian degrees — Adelaide's Bachelor of Viticulture and Oenology (CRICOS 068885G), CSU's Bachelor of Wine Science (4410WS01) — and Lincoln University's Wine, Food & Molecular Bioscience programme in NZ. 27 core units, 145 stated learning outcomes, 301 key concepts."
              />
              <MethodRow
                n="02"
                label="Read the reference stack"
                body="The synthesis is grounded in the bibles winemakers already own: Boulton, Iland, Ronald Jackson, Rankine, Zoecklein, Moreno-Arribas, Ribéreau-Gayon, plus every AWRI factsheet on the risk-critical topics. Twelve books plus factsheets, held privately as grounding — not redistributed."
              />
              <MethodRow
                n="03"
                label="Distilled, not paraphrased"
                body="Every lesson is written from scratch in one voice. No verbatim reproduction — an automated guardrail flags any 8-word run that overlaps a source and forces a rewrite. Numbers, ranges and thresholds are reproduced; prose is ours."
              />
              <MethodRow
                n="04"
                label="Fixed lesson skeleton"
                body="Every lesson has an Aim, an 'In your cellar' box, 3–5 sections each with a keyConcept + a common trap, a worked example from a boutique AU/NZ cellar, a decision tree, and 10 questions."
              />
              <MethodRow
                n="05"
                label="Cited, not black-boxed"
                body="Each section names its inspirations by book, chapter, and section. What you're reading is our own writing; what informed it is on the page."
              />
            </ol>
          </div>

          {/* RIGHT — The artefact (real lesson excerpt) */}
          <div>
            <div className="text-[11px] font-mono uppercase tracking-[0.14em] text-stone-500 mb-3">
              II · The artefact
            </div>
            <h2 className="font-serif text-2xl text-stone-900 mb-5 leading-tight">
              What a lesson looks like.
            </h2>
            <article
              data-testid="one-pager-sample-lesson"
              className="rounded-sm border border-stone-300 bg-white p-6 shadow-[0_1px_0_rgba(0,0,0,0.03)]"
            >
              <div className="text-[10px] font-mono uppercase tracking-[0.16em] text-amber-700 mb-2">
                L2.1 · Grape to Ferment · Excerpt · Section 1 of 4
              </div>
              <h3 className="font-serif text-xl text-stone-900 leading-tight mb-3">
                Variety is a promise, not a guarantee.
              </h3>

              <p className="text-stone-700 text-[0.9rem] leading-relaxed">
                Every variety carries a genetic blueprint — acid retention, tannin
                structure, aromatic profile — but that blueprint only expresses cleanly
                when climate, soil, and management align. Shiraz on a cool Heathcote
                ironstone site delivers something fundamentally different from Shiraz
                on a warm Riverland flat, even from the same clone. The variety is the
                same; the wine is not.
              </p>

              <div className="mt-4 rounded-sm border-l-2 border-amber-700/60 bg-amber-50/60 px-4 py-3">
                <div className="text-[10px] font-mono uppercase tracking-[0.14em] text-amber-800 mb-1">
                  Key concept
                </div>
                <p className="text-stone-800 text-[0.88rem] leading-relaxed">
                  Define the target wine style before selecting variety — variety choice
                  is irreversible for 25–40 years.
                </p>
              </div>

              <div className="mt-3 rounded-sm border-l-2 border-red-700/60 bg-red-50/40 px-4 py-3">
                <div className="text-[10px] font-mono uppercase tracking-[0.14em] text-red-800 mb-1">
                  Common trap
                </div>
                <p className="text-stone-800 text-[0.88rem] leading-relaxed">
                  Choosing variety based on current market price rather than site
                  suitability locks you into permanent agronomic compromise.
                </p>
              </div>

              <div className="mt-4 text-[11px] font-mono text-stone-500 leading-relaxed">
                Continues: <em>Heat accumulation is the non-negotiable filter</em>
                {" · "}<em>Clone × site × wine style</em>
                {" · "}<em>Emerging alternatives in AU/NZ</em>
                {" · "}worked example: Tas cool-climate Pinot block
                {" · "}decision tree · 10 check-questions.
              </div>

              <div className="mt-5 pt-4 border-t border-stone-200 text-[10px] font-mono text-stone-500 leading-relaxed">
                Informed by: Iland (2020) §4.2 · Jackson, <em>Wine Science</em> 4e ch. 3 ·
                AWRI Vintage & Site Selection factsheet · Lincoln WMBM 202.
              </div>
            </article>

            <div className="mt-3 text-[11px] font-mono uppercase tracking-[0.14em] text-stone-500">
              <Link
                href="/curriculum/l2-1-variety-site-and-wine-style"
                className="hover:text-amber-700 transition-colors"
                data-testid="one-pager-read-full"
              >
                → Read the full lesson
              </Link>
            </div>
          </div>
        </div>
      </section>

      {/* WHO IT'S FOR — three tight lines */}
      <section className="border-b border-stone-300/70 bg-white">
        <div className="max-w-[1180px] mx-auto px-8 py-10">
          <div className="text-[11px] font-mono uppercase tracking-[0.14em] text-stone-500 mb-4">
            III · Who it&apos;s for
          </div>
          <div className="grid md:grid-cols-3 gap-6 text-[0.95rem] text-stone-700 leading-relaxed">
            <div>
              <div className="font-serif text-lg text-stone-900 mb-1">The winery owner.</div>
              <p>The one thing your new cellar hand can read on their commute and be up to speed by the next racking.</p>
            </div>
            <div>
              <div className="font-serif text-lg text-stone-900 mb-1">The cellar hand.</div>
              <p>The gap between what you learned on the crush pad and what the science actually says. Closed.</p>
            </div>
            <div>
              <div className="font-serif text-lg text-stone-900 mb-1">The industry veteran.</div>
              <p>Not for you — for your team. One shared reference in one voice, aligned to how your winery already thinks.</p>
            </div>
          </div>
        </div>
      </section>

      {/* THE STRUCTURE — four-level map */}
      <section className="border-b border-stone-300/70">
        <div className="max-w-[1180px] mx-auto px-8 py-12">
          <div className="text-[11px] font-mono uppercase tracking-[0.14em] text-stone-500 mb-4">
            IV · The structure — four levels, thirty lessons
          </div>
          <div className="grid md:grid-cols-4 gap-4">
            <LevelCard
              n="L1"
              title="Foundations"
              tag="The language you need to share."
              lessons={[
                "What fermentation is really doing",
                "Acid, pH, and the buffer",
                "Sulphur dioxide — free, bound, molecular",
                "Oxygen — enemy and tool",
                "Reading a wine analysis",
                "The eight faults you must recognise",
              ]}
            />
            <LevelCard
              n="L2"
              title="Grape to Ferment"
              tag="Season-by-season decisions."
              lessons={[
                "Variety, site & wine style",
                "Ripeness — beyond Baumé",
                "Picking window",
                "Sorting, crushing, pressing",
                "Cold soak and pre-ferment decisions",
                "Yeast selection & pitching",
                "Ferment management",
              ]}
            />
            <LevelCard
              n="L3"
              title="Cellar Craft"
              tag="The critical calls."
              lessons={[
                "MLF timing & risk",
                "Racking, lees & bâtonnage",
                "Barrel selection & régime",
                "Blending trials",
                "Fining, stability, filtration",
                "SO₂ management through élevage",
                "Diagnosing brett, VA, mercaptans",
                "Cold stability and bottling prep",
              ]}
            />
            <LevelCard
              n="L4"
              title="Finishing & Reflection"
              tag="Out the door, into next year."
              lessons={[
                "Bottling day protocol",
                "Post-bottling QA",
                "Cellaring & bottle-age tracking",
                "Vintage debrief methodology",
                "Compliance & records — WBS, LIP",
                "Team handover — what to write down",
                "The year-on-year winemaker's journal",
                "What to change next season",
                "Reading your own back-catalogue",
              ]}
            />
          </div>
        </div>
      </section>

      {/* THREE OBJECTIONS — the questions a critical reader is thinking */}
      <section className="border-b border-stone-300/70 bg-white">
        <div className="max-w-[1180px] mx-auto px-8 py-12">
          <div className="text-[11px] font-mono uppercase tracking-[0.14em] text-stone-500 mb-6">
            V · The three questions you&apos;re about to ask
          </div>
          <div className="grid md:grid-cols-3 gap-8">
            <Objection
              q="Is this generated by an LLM?"
              a="Yes — synthesised by Claude Sonnet from private grounding on twelve bibles and four university syllabi, then edited. Every lesson has a copyright guardrail preventing verbatim reproduction. The synthesis is disclosed. The writing is ours."
            />
            <Objection
              q="What's the value versus reading the books?"
              a="Speed and shape. The books remain the authority — we cite them per section. What this curriculum gives you is thirty consistent lessons in one voice, structured for the cellar hand who won't read seven textbooks. If your team reads the books, you're already sorted."
            />
            <Objection
              q="How is this different from a course?"
              a="No cohorts, no schedule, no video. You keep it forever, read it in three modes (Deep, Skim, Flash), and it lives inside the same tool your team already logs the batch on. The stuck-ferment lesson is right there the moment they record a stalled ferment."
            />
          </div>
        </div>
      </section>

      {/* FOOTER — single clear ask */}
      <section className="bg-stone-900 text-stone-100">
        <div className="max-w-[1180px] mx-auto px-8 py-12">
          <div className="grid md:grid-cols-[1fr_auto] gap-8 items-end">
            <div>
              <div className="text-[11px] font-mono uppercase tracking-[0.14em] text-amber-500/80 mb-3">
                <GraduationCap className="h-3.5 w-3.5 inline mr-1 -mt-0.5" />
                One clear ask
              </div>
              <h2 className="font-serif text-3xl md:text-4xl leading-tight text-white mb-3 tracking-tight">
                Open the index. Read one lesson.
              </h2>
              <p className="text-stone-300 leading-relaxed max-w-2xl">
                Judge the substance yourself. If it clears the bar, the whole thirty is on the same shelf. If it doesn&apos;t — tell me what it&apos;s missing.
              </p>
            </div>
            <div className="flex flex-col gap-3">
              <Link
                href="/curriculum"
                data-testid="one-pager-primary-cta"
                className="inline-flex items-center justify-center gap-2 bg-amber-500 text-stone-900 font-semibold px-6 py-3 rounded-sm hover:bg-amber-400 transition-colors"
              >
                See the thirty lessons <ArrowRight className="h-4 w-4" />
              </Link>
              <Link
                href="/curriculum/about"
                data-testid="one-pager-secondary-cta"
                className="inline-flex items-center justify-center gap-2 text-stone-300 hover:text-white text-sm transition-colors border-b border-stone-700 hover:border-stone-500 pb-1"
              >
                Longer version →
              </Link>
            </div>
          </div>

          <div className="mt-10 pt-6 border-t border-stone-800 flex flex-wrap items-center justify-between gap-3 text-[11px] font-mono text-stone-500 uppercase tracking-[0.12em]">
            <div>Ownology · Built by a working winemaker · Feb 2026</div>
            <div className="flex items-center gap-3">
              <span>ownology.ai/curriculum/one-page</span>
              <span className="opacity-40">·</span>
              <Link href="/pricing" className="hover:text-stone-300 transition-colors">Vigneron tier</Link>
              <span className="opacity-40">·</span>
              <Link href="/curriculum/about" className="hover:text-stone-300 transition-colors">Long-form</Link>
            </div>
          </div>
        </div>
      </section>
    </div>
  );
}

// ─── Sub-components ─────────────────────────────────────────────────────────

function MethodRow({ n, label, body }: { n: string; label: string; body: string }) {
  return (
    <li className="flex gap-4">
      <span className="font-mono text-[11px] text-amber-700 pt-1 shrink-0">{n}</span>
      <div>
        <div className="font-serif text-[1.02rem] text-stone-900 leading-snug mb-1">
          {label}
        </div>
        <p className="text-stone-700 leading-relaxed">{body}</p>
      </div>
    </li>
  );
}

function LevelCard({
  n, title, tag, lessons,
}: {
  n: string; title: string; tag: string; lessons: string[];
}) {
  return (
    <div className="rounded-sm border border-stone-300 bg-white p-4">
      <div className="flex items-baseline gap-2 mb-1">
        <span className="font-mono text-[11px] text-amber-700 font-semibold">{n}</span>
        <div className="font-serif text-base text-stone-900">{title}</div>
      </div>
      <p className="font-serif italic text-[0.82rem] text-stone-500 mb-3 leading-snug">{tag}</p>
      <ul className="space-y-1 text-[0.82rem] text-stone-700 leading-snug">
        {lessons.map((l, i) => (
          <li key={i} className="flex gap-1.5">
            <span className="text-stone-400 shrink-0">·</span>
            <span>{l}</span>
          </li>
        ))}
      </ul>
    </div>
  );
}

function Objection({ q, a }: { q: string; a: string }) {
  return (
    <div>
      <div className="font-serif text-lg text-stone-900 mb-2 leading-snug">{q}</div>
      <p className="text-stone-700 text-[0.9rem] leading-relaxed">{a}</p>
    </div>
  );
}
