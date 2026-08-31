/**
 * /curriculum/about — The Vigneron Curriculum sell page.
 *
 * Anti-hype-marketing voice: what we built, what it is, what it isn't,
 * why it works. The kicker for Vigneron membership sign-up.
 */

import { Link } from "wouter";
import { Button } from "@/components/ui/button";
import { ArrowRight, BookOpen, GraduationCap, Sparkles, Target, Layers, Zap, Shield, ExternalLink, Check, X, Users, ClipboardCheck } from "lucide-react";

export default function CurriculumAbout() {
  return (
    <div className="min-h-screen bg-stone-50" data-testid="curriculum-about-page">
      {/* HERO */}
      <section className="border-b border-stone-200 bg-white">
        <div className="max-w-4xl mx-auto px-6 py-16 md:py-20">
          <div className="flex items-center gap-2 text-sm text-stone-500 mb-6">
            <GraduationCap className="h-4 w-4" /> Vigneron Tier · Curriculum
          </div>
          <h1 className="font-serif text-5xl md:text-6xl text-stone-900 tracking-tight leading-[1.05]" data-testid="hero-title">
            The wine education a working winemaker actually needs.
          </h1>
          <p className="mt-6 text-xl text-stone-700 leading-relaxed max-w-3xl">
            Thirty structured lessons. Four levels. The <em>applied</em> core of a university wine-science degree,
            distilled into an operator's manual you can read between racking and dinner.
          </p>
          <div className="mt-8 flex flex-wrap items-center gap-3">
            <Link href="/curriculum">
              <Button size="lg" className="bg-stone-900 hover:bg-stone-800" data-testid="cta-view-curriculum">
                See the 30 lessons <ArrowRight className="h-4 w-4 ml-2" />
              </Button>
            </Link>
            <Link href="/pricing">
              <Button variant="outline" size="lg" data-testid="cta-vigneron">
                Vigneron membership
              </Button>
            </Link>
          </div>

          {/* Trust strip */}
          <div className="mt-10 grid grid-cols-2 md:grid-cols-4 gap-4 pt-8 border-t border-stone-200">
            <TrustStat n="30" label="Lessons synthesised" testid="stat-lessons" />
            <TrustStat n="4" label="Levels · Foundations → Reflection" testid="stat-levels" />
            <TrustStat n="27" label="University units benchmarked" testid="stat-benchmark" />
            <TrustStat n="100%" label="Ownology-original writing" testid="stat-original" />
          </div>
        </div>
      </section>

      {/* WHAT WE BUILT */}
      <section className="border-b border-stone-200">
        <div className="max-w-4xl mx-auto px-6 py-14">
          <div className="text-xs font-semibold text-stone-500 uppercase tracking-wider mb-2">What we built</div>
          <h2 className="font-serif text-3xl md:text-4xl text-stone-900 mb-6 leading-tight">
            Every lesson is written for one person: the winemaker in the middle of vintage.
          </h2>
          <div className="prose prose-stone max-w-none prose-p:text-stone-700 prose-p:leading-relaxed">
            <p>
              We started with the two accredited Australian degrees — Adelaide's Bachelor of Viticulture and Oenology
              (CRICOS 068885G) and CSU's Bachelor of Wine Science (4410WS01) — plus Lincoln University in NZ. We scouted
              every core subject: 27 units, 145 learning outcomes, 301 key concepts, the prescribed reading lists.
            </p>
            <p>
              Then we distilled. Not the textbooks — those are still on the publisher's shelves, and we cite them.
              What we distilled was <em>what a working winemaker still uses</em> from that education, ten years after
              graduation. The bits that end up written in Sharpie on the tank. The number you remember at 3am. The trap
              your first winemaker warned you about.
            </p>
            <p>
              Every lesson has an <strong>Aim</strong> (the concept), an <strong>In your cellar</strong> box (how it lands on
              your tank this week), <strong>three to five sections</strong> each with a key number and a common trap, a
              <strong> worked example</strong> from a boutique-scale Australian or NZ cellar, a <strong>decision tree</strong>
              for when things go sideways, and <strong>ten questions</strong> to check you actually got it.
            </p>
          </div>
        </div>
      </section>

      {/* THE STRUCTURE */}
      <section className="border-b border-stone-200 bg-stone-100">
        <div className="max-w-4xl mx-auto px-6 py-14">
          <div className="text-xs font-semibold text-stone-500 uppercase tracking-wider mb-2">The structure</div>
          <h2 className="font-serif text-3xl md:text-4xl text-stone-900 mb-8 leading-tight" style={{ textWrap: "balance" }}>
            Four levels. Taught in the order a good degree teaches them.
          </h2>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <LevelCard n="1" title="Foundations" tag="The language you need to share." bullets={["Global viticulture context", "Vine biology essentials", "Climate, soils, terroir", "The four numbers that run everything", "Fermentation fundamentals", "Winemaker's toolkit"]} accent="border-amber-400 bg-amber-50" />
            <LevelCard n="2" title="Grape to Ferment" tag="Season-by-season decisions." bullets={["Variety selection", "Vineyard establishment", "Canopy + yield", "Ripeness + harvest", "Crushing + must", "Yeast selection", "Fermentation management", "Malolactic"]} accent="border-rose-400 bg-rose-50" />
            <LevelCard n="3" title="Cellar Craft" tag="The critical calls." bullets={["Red production", "White production", "Sparkling + fortified", "SO₂ management", "Fining", "Stabilisation", "Barrel program", "Blending"]} accent="border-purple-400 bg-purple-50" />
            <LevelCard n="4" title="Finishing & Reflection" tag="Out the door, into next year." bullets={["Sensory evaluation", "Fault identification", "Filtration + bottling", "Packaging + labelling", "Storage + ageing", "Compliance (LIP, WET, GI)", "Sustainability", "Vintage debrief"]} accent="border-emerald-400 bg-emerald-50" />
          </div>
        </div>
      </section>

      {/* LEARNING MODES */}
      <section className="border-b border-stone-200 bg-white">
        <div className="max-w-4xl mx-auto px-6 py-14">
          <div className="text-xs font-semibold text-stone-500 uppercase tracking-wider mb-2">How you read it</div>
          <h2 className="font-serif text-3xl md:text-4xl text-stone-900 mb-8 leading-tight">
            One lesson. Three modes. Because winemakers don't all read the same way.
          </h2>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-5">
            <ModeCard icon={BookOpen} title="Deep" caption="~15 min · full text, worked example, decision tree, quiz" desc="For the long weekend or the quiet week before crush. Full lesson with case studies and self-assessment." />
            <ModeCard icon={Zap} title="Skim" caption="~2 min · just the numbers and the traps" desc="For between meetings or waiting on a lab result. Every section reduced to what to remember and what to avoid." />
            <ModeCard icon={Layers} title="Flash" caption="~5 min · retrieval-practice cards" desc="For the drive home or the day before vintage. Q → tap → A, cycle the whole lesson in 8 cards." />
          </div>
        </div>
      </section>

      {/* HONEST CALIBRATION */}
      <section className="border-b border-stone-200">
        <div className="max-w-4xl mx-auto px-6 py-14">
          <div className="text-xs font-semibold text-stone-500 uppercase tracking-wider mb-2">The honest calibration</div>
          <h2 className="font-serif text-3xl md:text-4xl text-stone-900 mb-4 leading-tight">
            What this is. What it isn't.
          </h2>
          <p className="text-stone-600 leading-relaxed mb-8 max-w-3xl">
            We think the wine industry has enough people overselling. So let's just tell you what you're getting.
          </p>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <div className="rounded-xl bg-emerald-50 border border-emerald-200 p-6" data-testid="what-it-is">
              <div className="flex items-center gap-2 text-emerald-900 font-semibold mb-3">
                <Check className="h-4 w-4" /> What this IS
              </div>
              <ul className="space-y-2 text-stone-800 leading-relaxed">
                <li>• A ~30-hour operator's curriculum, self-paced</li>
                <li>• The applied core of a 3-4 year degree, distilled</li>
                <li>• Structured to WSET Level 3 / industry short-course depth</li>
                <li>• Ownology-original writing, cross-referenced to Adelaide, CSU, Lincoln, Otago</li>
                <li>• Cited to Boulton, Iland, Ribéreau-Gayon, Jackson — buy the textbooks for the full science</li>
                <li>• Recognition of attainment at each level (Ownology-branded, non-portable)</li>
                <li>• The training your best senior would give you, without the cost of their time</li>
              </ul>
            </div>
            <div className="rounded-xl bg-rose-50 border border-rose-200 p-6" data-testid="what-it-isnt">
              <div className="flex items-center gap-2 text-rose-900 font-semibold mb-3">
                <X className="h-4 w-4" /> What this IS NOT
              </div>
              <ul className="space-y-2 text-stone-800 leading-relaxed">
                <li>• An AQF-accredited qualification</li>
                <li>• Equivalent to a Bachelor of Wine Science</li>
                <li>• A substitute for vintage experience</li>
                <li>• A vehicle to move to a new employer with a portable ticket</li>
                <li>• Textbook content in disguise — every word is ours, cited where it comes from</li>
                <li>• Marketing dressed up as education</li>
              </ul>
            </div>
          </div>
        </div>
      </section>

      {/* WHO IT'S FOR */}
      <section className="border-b border-stone-200 bg-stone-900 text-stone-100">
        <div className="max-w-4xl mx-auto px-6 py-14">
          <div className="text-xs font-semibold text-stone-400 uppercase tracking-wider mb-2">Who it's for</div>
          <h2 className="font-serif text-3xl md:text-4xl text-white mb-8 leading-tight">
            Written for the working end of the industry.
          </h2>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            <PersonaCard icon={Target} title="The vigneron" desc="Making 500-5000 L, no formal wine science background, ambitious. Uses the curriculum alongside Owen to shore up the decisions you're already making." />
            <PersonaCard icon={ClipboardCheck} title="The cellar hand" desc="One or two vintages in, wants to move up. Gets the structured education the small winery can't stop to give in person, plus Ownology attainment recognition your boss can see." />
            <PersonaCard icon={Users} title="The small-winery owner" desc="Team of 3-8, permanent turnover pain. Signs your crew up, tracks progress, gives real recognition without training them into a competitor's job offer." />
          </div>
        </div>
      </section>

      {/* THE BUSINESS ANGLE */}
      <section className="border-b border-stone-200 bg-white">
        <div className="max-w-4xl mx-auto px-6 py-14">
          <div className="text-xs font-semibold text-stone-500 uppercase tracking-wider mb-2">For the boss</div>
          <h2 className="font-serif text-3xl md:text-4xl text-stone-900 mb-6 leading-tight">
            The retention play. Say it plainly.
          </h2>
          <div className="prose prose-stone max-w-none prose-p:text-stone-700 prose-p:leading-relaxed prose-strong:text-stone-900">
            <p>
              Every AU/NZ boutique winery in the country deals with the same math: pay for a portable qualification and
              you subsidise your competitor's next hire. Skip the training and you're the reason your best cellar hand
              still can't run a bench trial on their own.
            </p>
            <p>
              <strong>Ownology sits in the middle.</strong> The material is rigorous and current — benchmarked to two
              accredited AU degrees. The attainment is real — Ownology-branded, structured, tested. And the qualification
              stays with you, not with the CV that walks out the door.
            </p>
            <p>
              A five-person cellar pays less than one AWRI short course per year, per person. Progress reports come to
              you, not to a third-party institution. Your staff grow. Your operation improves. And when someone does
              eventually leave, they leave with a portfolio of what they did — not a portable ticket to the next job.
            </p>
          </div>
          <div className="mt-8">
            <Link href="/pricing">
              <Button variant="outline" size="lg" data-testid="cta-business-tier">
                See business pricing <ArrowRight className="h-4 w-4 ml-2" />
              </Button>
            </Link>
          </div>
        </div>
      </section>

      {/* HOW WE WROTE IT */}
      <section className="border-b border-stone-200 bg-stone-100">
        <div className="max-w-4xl mx-auto px-6 py-14">
          <div className="text-xs font-semibold text-stone-500 uppercase tracking-wider mb-2">How we wrote it</div>
          <h2 className="font-serif text-3xl md:text-4xl text-stone-900 mb-6 leading-tight">
            Original writing, grounded in the reference library. Never republished.
          </h2>
          <div className="prose prose-stone max-w-none prose-p:text-stone-700 prose-p:leading-relaxed">
            <p>
              We're careful with copyright. Every lesson body on Ownology is our own writing. When we consult the wider
              reference library — MoreWine bibles, AOC modules, AWRI fact sheets, textbook chapters — we read them
              privately, distil the substance into our own words, and cite the source so you can go deeper.
            </p>
            <p>
              We built a copyright guard into the synthesis: an automated check that flags any 8-consecutive-word
              overlap with a private source. Across all 30 lessons, that check reports <strong>zero overlaps</strong>.
              We keep the raw check log with every lesson.
            </p>
            <p>
              Textbook citations point you at the publisher. AWRI links go to AWRI. University unit codes link to the
              official handbook page. When we say "cited in this lesson", we mean a genuine reference, not a
              reproduction.
            </p>
          </div>
        </div>
      </section>

      {/* FINAL CTA */}
      <section className="bg-white">
        <div className="max-w-4xl mx-auto px-6 py-16 md:py-20 text-center">
          <div className="inline-flex items-center gap-2 rounded-full bg-stone-100 border border-stone-200 px-3 py-1 text-xs text-stone-600 mb-6">
            <Sparkles className="h-3 w-3" /> Vigneron tier · everything above, unlocked
          </div>
          <h2 className="font-serif text-4xl md:text-5xl text-stone-900 tracking-tight mb-6 leading-tight">
            Come and see.
          </h2>
          <p className="text-lg text-stone-700 leading-relaxed max-w-2xl mx-auto mb-8">
            Every lesson is open to browse. Sign up when you want a home for it —
            your progress, your notes, your recognition, and Owen alongside you every vintage.
          </p>
          <div className="flex flex-wrap items-center justify-center gap-3">
            <Link href="/curriculum">
              <Button size="lg" className="bg-stone-900 hover:bg-stone-800" data-testid="cta-final-view">
                Open the curriculum <ArrowRight className="h-4 w-4 ml-2" />
              </Button>
            </Link>
            <Link href="/pricing">
              <Button variant="outline" size="lg" data-testid="cta-final-pricing">
                Become a Vigneron
              </Button>
            </Link>
          </div>
        </div>
      </section>
    </div>
  );
}

function TrustStat({ n, label, testid }: { n: string; label: string; testid: string }) {
  return (
    <div data-testid={testid}>
      <div className="font-serif text-3xl md:text-4xl text-stone-900">{n}</div>
      <div className="text-xs text-stone-500 leading-tight mt-1">{label}</div>
    </div>
  );
}

function LevelCard({ n, title, tag, bullets, accent }: { n: string; title: string; tag: string; bullets: string[]; accent: string }) {
  return (
    <div className={`rounded-xl border-2 ${accent} p-5 bg-white`}>
      <div className="text-xs font-mono text-stone-500 mb-1">Level {n}</div>
      <h3 className="font-serif text-2xl text-stone-900 mb-1">{title}</h3>
      <p className="text-sm text-stone-600 italic mb-3">{tag}</p>
      <ul className="text-sm text-stone-700 space-y-1">
        {bullets.map((b, i) => (<li key={i}>· {b}</li>))}
      </ul>
    </div>
  );
}

function ModeCard({ icon: Icon, title, caption, desc }: any) {
  return (
    <div className="rounded-xl border border-stone-200 bg-white p-5">
      <Icon className="h-6 w-6 text-stone-700 mb-3" />
      <h3 className="font-serif text-xl text-stone-900 mb-1">{title} mode</h3>
      <div className="text-xs text-stone-500 font-mono mb-2">{caption}</div>
      <p className="text-sm text-stone-700 leading-relaxed">{desc}</p>
    </div>
  );
}

function PersonaCard({ icon: Icon, title, desc }: any) {
  return (
    <div className="rounded-xl border border-stone-700 bg-stone-800/50 p-5">
      <Icon className="h-6 w-6 text-rose-400 mb-3" />
      <h3 className="font-serif text-xl text-white mb-2">{title}</h3>
      <p className="text-sm text-stone-300 leading-relaxed">{desc}</p>
    </div>
  );
}
