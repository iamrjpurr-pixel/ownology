/**
 * FREE RUN — The Learning Board
 * "In the cellar, free run juice flows without force — the purest expression of the fruit.
 *  Your Free Run board works the same way."
 *
 * UI shell with placeholder lesson cards, domain filters, and vocabulary section.
 * Content will be populated in the 4-week education build.
 */

import { useEffect, useRef, useState } from "react";
import { Link } from "wouter";

// ─── Types ────────────────────────────────────────────────────────────────────
type Domain = "All" | "Chemistry" | "Microbiology" | "Sensory" | "Viticulture" | "Operations" | "Regulatory" | "Business";
type Level = "Foundation" | "Intermediate" | "Advanced";

interface LessonCard {
  id: string;
  title: string;
  domain: Domain;
  level: Level;
  duration: string;
  tagline: string;
  locked: boolean;
  completed: boolean;
}

// ─── Placeholder lesson data (UI shell — content populated in education build) ─
const LESSONS: LessonCard[] = [
  // Foundation — free preview
  { id: "chem-foundations", title: "The Chemistry of Wine", domain: "Chemistry", level: "Foundation", duration: "8 min", tagline: "Why pH matters more than you think at 2am during vintage", locked: false, completed: false },
  { id: "fermentation-basics", title: "How Fermentation Actually Works", domain: "Chemistry", level: "Foundation", duration: "10 min", tagline: "Sugar to alcohol — the process your wine depends on", locked: false, completed: false },
  { id: "wine-microbiology-intro", title: "The Invisible Workforce", domain: "Microbiology", level: "Foundation", duration: "9 min", tagline: "Yeast, bacteria, and the organisms running your cellar", locked: false, completed: false },
  // Intermediate — locked (The Press tier)
  { id: "yan-management", title: "YAN and Yeast Nutrition", domain: "Chemistry", level: "Intermediate", duration: "12 min", tagline: "Feed your yeast right or pay for it at 3am", locked: true, completed: false },
  { id: "so2-chemistry", title: "SO₂ — Free, Bound, and Molecular", domain: "Chemistry", level: "Intermediate", duration: "11 min", tagline: "The most important number in your cellar explained simply", locked: true, completed: false },
  { id: "mlf-management", title: "Malolactic Fermentation", domain: "Microbiology", level: "Intermediate", duration: "10 min", tagline: "When to encourage it, when to stop it, and how to know the difference", locked: true, completed: false },
  { id: "sensory-evaluation", title: "Building a Professional Palate", domain: "Sensory", level: "Intermediate", duration: "14 min", tagline: "How to taste wine like a winemaker, not a consumer", locked: true, completed: false },
  { id: "fining-agents", title: "Fining Agents and Wine Clarity", domain: "Operations", level: "Intermediate", duration: "9 min", tagline: "Bentonite, egg white, PVPP — what they do and when to use them", locked: true, completed: false },
  { id: "vintage-scheduling", title: "Running a Vintage", domain: "Operations", level: "Intermediate", duration: "13 min", tagline: "Tank allocation, pump-over regimes, and keeping your head above water", locked: true, completed: false },
  { id: "viticultural-science", title: "Vine Physiology for Winemakers", domain: "Viticulture", level: "Intermediate", duration: "11 min", tagline: "What happens in the vineyard that you can't fix in the cellar", locked: true, completed: false },
  { id: "sensory-faults", title: "Identifying Wine Faults", domain: "Sensory", level: "Intermediate", duration: "12 min", tagline: "Brett, VA, reduction, oxidation — find them before your customer does", locked: true, completed: false },
  { id: "liquor-licensing", title: "Liquor Licensing for Winemakers", domain: "Regulatory", level: "Intermediate", duration: "10 min", tagline: "What you legally need to produce and sell wine in Australia", locked: true, completed: false },
  // Advanced — locked (The Press tier)
  { id: "fermentation-technology", title: "Advanced Fermentation Technology", domain: "Chemistry", level: "Advanced", duration: "16 min", tagline: "Stuck ferments, heat spikes, and the science of rescue", locked: true, completed: false },
  { id: "stabilisation-clarification", title: "Stabilisation and Clarification", domain: "Operations", level: "Advanced", duration: "14 min", tagline: "Cold stabilisation, heat stability, and protein haze prevention", locked: true, completed: false },
  { id: "sparkling-fortified", title: "Sparkling and Fortified Winemaking", domain: "Operations", level: "Advanced", duration: "15 min", tagline: "Traditional method, tank method, and the art of fortification", locked: true, completed: false },
  { id: "wine-chemistry-advanced", title: "Wine Chemistry in Depth", domain: "Chemistry", level: "Advanced", duration: "18 min", tagline: "Phenolics, esters, and the molecular basis of wine quality", locked: true, completed: false },
  { id: "winery-engineering", title: "Understanding Winery Equipment", domain: "Operations", level: "Advanced", duration: "13 min", tagline: "Pumps, heat exchangers, and the machines your wine depends on", locked: true, completed: false },
  { id: "waste-management", title: "Winery Waste and EPA Compliance", domain: "Regulatory", level: "Advanced", duration: "11 min", tagline: "Marc, lees, wastewater — your legal obligations and best practice", locked: true, completed: false },
  { id: "winery-business", title: "The Economics of a Boutique Winery", domain: "Business", level: "Advanced", duration: "15 min", tagline: "Cost of production, pricing, cash flow — the numbers behind the wine", locked: true, completed: false },
];

const DOMAINS: Domain[] = ["All", "Chemistry", "Microbiology", "Sensory", "Viticulture", "Operations", "Regulatory", "Business"];

const DOMAIN_ICONS: Record<Domain, string> = {
  All: "◈",
  Chemistry: "⚗",
  Microbiology: "🔬",
  Sensory: "👁",
  Viticulture: "🍇",
  Operations: "⚙",
  Regulatory: "📋",
  Business: "📊",
};

const LEVEL_COLORS: Record<Level, string> = {
  Foundation: "oklch(0.72 0.12 75)",   // amber
  Intermediate: "oklch(0.65 0.10 230)", // blue
  Advanced: "oklch(0.62 0.10 45)",      // terracotta
};

// ─── Vocabulary (wine wank layer) ─────────────────────────────────────────────
const VOCABULARY = [
  { word: "Free Run", meaning: "Juice that flows from the grape under its own weight, before pressing — the easiest, most natural first flow of knowledge." },
  { word: "The Press", meaning: "The machine that extracts remaining juice under pressure. Deeper learning requires pressure — that is not a bad thing." },
  { word: "Must", meaning: "Freshly crushed grape juice before fermentation begins. Every learner starts as must — raw, full of potential, not yet wine." },
  { word: "The Barrel", meaning: "The oak vessel where wine matures and develops complexity. Mastery is not instant — it requires time in the barrel." },
  { word: "Cahier", meaning: "French: exercise book, student's notebook. Your Free Run board is your cahier." },
  { word: "Carnet de Cave", meaning: "French: cellar book, the winemaker's operational record. Your Press board is your Carnet de Cave." },
  { word: "Terroir", meaning: "French: the complete natural environment of a vineyard. Your learning environment shapes your knowledge — your terroir." },
  { word: "En Primeur", meaning: "French: wine sold before it is fully matured. You are en primeur — the learning is still in barrel." },
  { word: "Lees", meaning: "Spent yeast and solids that settle after fermentation. Knowledge that has settled — the foundation everything else is racked off." },
  { word: "Racking", meaning: "Moving clear wine off the lees into a clean vessel. Applying what you have learned — moving forward with clarity." },
  { word: "Brix", meaning: "A measure of sugar concentration in grape juice. Where you start — the raw material of learning." },
  { word: "YAN", meaning: "Yeast Assimilable Nitrogen — the nutrient yeast needs to ferment cleanly. What you feed your mind to keep it running." },
];

// ─── Intersection observer hook ───────────────────────────────────────────────
function useInView(threshold = 0.12) {
  const ref = useRef<HTMLDivElement>(null);
  const [inView, setInView] = useState(false);
  useEffect(() => {
    const el = ref.current;
    if (!el) return;
    const obs = new IntersectionObserver(([e]) => {
      if (e.isIntersecting) { setInView(true); obs.disconnect(); }
    }, { threshold });
    obs.observe(el);
    return () => obs.disconnect();
  }, [threshold]);
  return { ref, inView };
}

// ─── Lesson Card ──────────────────────────────────────────────────────────────
function LessonCardItem({ lesson }: { lesson: LessonCard }) {
  return (
    <div
      className="cellar-card relative flex flex-col gap-3 p-5 cursor-pointer group"
      style={{
        opacity: lesson.locked ? 0.65 : 1,
        border: lesson.completed
          ? "1px solid color-mix(in oklch, var(--ow-amber) 40%, transparent)"
          : "1px solid var(--ow-border)",
      }}
    >
      {/* Lock overlay */}
      {lesson.locked && (
        <div
          className="absolute top-3 right-3 w-6 h-6 rounded-sm flex items-center justify-center"
          style={{ background: "var(--ow-bg-inset)", border: "1px solid var(--ow-border)" }}
        >
          <svg width="10" height="12" viewBox="0 0 10 12" fill="none">
            <rect x="1" y="5" width="8" height="7" rx="1" stroke="var(--ow-text-lo)" strokeWidth="1.2" />
            <path d="M3 5V3.5a2 2 0 0 1 4 0V5" stroke="var(--ow-text-lo)" strokeWidth="1.2" strokeLinecap="round" />
          </svg>
        </div>
      )}

      {/* Completed tick */}
      {lesson.completed && (
        <div
          className="absolute top-3 right-3 w-6 h-6 rounded-sm flex items-center justify-center"
          style={{ background: "color-mix(in oklch, var(--ow-amber) 15%, transparent)", border: "1px solid var(--ow-amber)" }}
        >
          <svg width="10" height="8" viewBox="0 0 10 8" fill="none">
            <path d="M1 4l3 3 5-6" stroke="var(--ow-amber)" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" />
          </svg>
        </div>
      )}

      {/* Domain + Level */}
      <div className="flex items-center gap-2">
        <span style={{ fontSize: "0.9rem" }}>{DOMAIN_ICONS[lesson.domain]}</span>
        <span
          className="text-xs tracking-wider uppercase"
          style={{ fontFamily: "'Lato',sans-serif", color: "var(--ow-text-lo)", letterSpacing: "0.08em" }}
        >
          {lesson.domain}
        </span>
        <span
          className="ml-auto text-xs px-2 py-0.5 rounded-sm"
          style={{
            fontFamily: "'Fira Code',monospace",
            fontSize: "0.65rem",
            color: LEVEL_COLORS[lesson.level],
            background: `color-mix(in oklch, ${LEVEL_COLORS[lesson.level]} 12%, transparent)`,
            border: `1px solid color-mix(in oklch, ${LEVEL_COLORS[lesson.level]} 25%, transparent)`,
          }}
        >
          {lesson.level}
        </span>
      </div>

      {/* Title */}
      <h3
        style={{
          fontFamily: "'Fraunces',serif",
          fontWeight: 600,
          fontSize: "1.0625rem",
          lineHeight: 1.25,
          color: "var(--ow-text-hi)",
        }}
      >
        {lesson.title}
      </h3>

      {/* Tagline */}
      <p
        style={{
          fontFamily: "'Lato',sans-serif",
          fontWeight: 300,
          fontSize: "0.875rem",
          lineHeight: 1.6,
          color: "var(--ow-text-mid)",
          fontStyle: "italic",
        }}
      >
        {lesson.tagline}
      </p>

      {/* Footer */}
      <div className="flex items-center justify-between mt-auto pt-3" style={{ borderTop: "1px solid var(--ow-border)" }}>
        <span
          style={{ fontFamily: "'Fira Code',monospace", fontSize: "0.7rem", color: "var(--ow-text-lo)" }}
        >
          {lesson.duration} read
        </span>
        {lesson.locked ? (
          <span
            className="text-xs px-3 py-1 rounded-sm"
            style={{
              fontFamily: "'Lato',sans-serif",
              color: "var(--ow-amber)",
              background: "color-mix(in oklch, var(--ow-amber) 10%, transparent)",
              border: "1px solid color-mix(in oklch, var(--ow-amber) 25%, transparent)",
            }}
          >
            The Press →
          </span>
        ) : (
          <span
            className="text-xs px-3 py-1 rounded-sm transition-all group-hover:bg-[color-mix(in_oklch,var(--ow-amber)_15%,transparent)]"
            style={{
              fontFamily: "'Lato',sans-serif",
              color: "var(--ow-amber)",
              border: "1px solid color-mix(in oklch, var(--ow-amber) 30%, transparent)",
            }}
          >
            Begin →
          </span>
        )}
      </div>
    </div>
  );
}

// ─── Main component ───────────────────────────────────────────────────────────
export default function FreeRun() {
  const [domain, setDomain] = useState<Domain>("All");
  const [vocabOpen, setVocabOpen] = useState(false);
  const headerRef = useInView(0.1);
  const gridRef = useInView(0.05);
  const vocabRef = useInView(0.1);

  const filtered = domain === "All" ? LESSONS : LESSONS.filter(l => l.domain === domain);
  const freeCount = LESSONS.filter(l => !l.locked).length;
  const totalCount = LESSONS.length;

  return (
    <div style={{ background: "var(--ow-bg-base)", minHeight: "100vh" }}>
      {/* Back nav */}
      <div className="container pt-6 pb-0" style={{ maxWidth: "900px", margin: "0 auto" }}>
        <Link href="/" className="inline-flex items-center gap-2 text-xs" style={{ color: "var(--ow-text-lo)", fontFamily: "'Lato',sans-serif", textDecoration: "none" }}>
          <svg width="14" height="14" viewBox="0 0 14 14" fill="none">
            <path d="M9 2L4 7l5 5" stroke="currentColor" strokeWidth="1.4" strokeLinecap="round" strokeLinejoin="round" />
          </svg>
          Back to Ownology
        </Link>
      </div>

      <div className="container pt-10 pb-24" style={{ maxWidth: "900px", margin: "0 auto" }}>

        {/* ── Header ── */}
        <div ref={headerRef.ref} className={`mb-10 ${headerRef.inView ? "fade-up" : "opacity-0"}`}>
          {/* Board identity */}
          <div className="flex items-center gap-3 mb-6">
            <div
              className="px-3 py-1.5 rounded-sm text-xs flex items-center gap-2"
              style={{
                background: "color-mix(in oklch, var(--ow-amber) 10%, transparent)",
                border: "1px solid color-mix(in oklch, var(--ow-amber) 30%, transparent)",
                fontFamily: "'Fira Code',monospace",
                color: "var(--ow-amber)",
                letterSpacing: "0.06em",
              }}
            >
              <span style={{ fontSize: "0.8rem" }}>◈</span>
              FREE RUN
            </div>
            <div
              className="h-px flex-1"
              style={{ background: "linear-gradient(to right, color-mix(in oklch, var(--ow-amber) 20%, transparent), transparent)" }}
            />
            <Link
              href="/the-press"
              className="px-3 py-1.5 rounded-sm text-xs flex items-center gap-2 transition-all"
              style={{
                background: "var(--ow-bg-card)",
                border: "1px solid var(--ow-border)",
                fontFamily: "'Fira Code',monospace",
                color: "var(--ow-text-lo)",
                letterSpacing: "0.06em",
                textDecoration: "none",
              }}
            >
              <span style={{ fontSize: "0.8rem" }}>⊞</span>
              THE PRESS →
            </Link>
          </div>

          <p
            className="section-label mb-4"
            style={{ fontFamily: "'Lato',sans-serif", fontSize: "0.7rem", letterSpacing: "0.12em" }}
          >
            Your Learning Board
          </p>
          <h1
            style={{
              fontFamily: "'Fraunces',serif",
              fontWeight: 700,
              fontSize: "clamp(2rem,4.5vw,3.25rem)",
              lineHeight: 1.08,
              letterSpacing: "-0.02em",
              color: "var(--ow-text-hi)",
            }}
          >
            Free <em style={{ color: "var(--ow-amber)", fontStyle: "italic" }}>Run</em>
          </h1>
          <p
            className="mt-4"
            style={{
              fontFamily: "'Lato',sans-serif",
              fontWeight: 300,
              fontSize: "1.0625rem",
              lineHeight: 1.75,
              color: "var(--ow-text-mid)",
              maxWidth: "560px",
            }}
          >
            In the cellar, free run juice flows without force — the purest expression of the fruit. Your Free Run board works the same way. Write it, test it, wipe it, learn it.
          </p>
          <p
            className="mt-2"
            style={{
              fontFamily: "'Lato',sans-serif",
              fontWeight: 300,
              fontSize: "0.875rem",
              lineHeight: 1.7,
              color: "var(--ow-text-lo)",
              maxWidth: "520px",
              fontStyle: "italic",
            }}
          >
            The equivalent of a Bachelor of Oenology — rewritten for the cellar floor, not the lecture hall.
          </p>

          {/* Progress bar */}
          <div className="mt-8 flex items-center gap-4">
            <div className="flex-1 h-1.5 rounded-full overflow-hidden" style={{ background: "var(--ow-bg-inset)" }}>
              <div
                className="h-full rounded-full transition-all duration-700"
                style={{
                  width: "0%",
                  background: "linear-gradient(to right, var(--ow-amber), color-mix(in oklch, var(--ow-amber) 60%, oklch(0.62 0.10 45)))",
                }}
              />
            </div>
            <span style={{ fontFamily: "'Fira Code',monospace", fontSize: "0.75rem", color: "var(--ow-text-lo)", whiteSpace: "nowrap" }}>
              0 / {totalCount} marks
            </span>
          </div>

          {/* Free tier callout */}
          <div
            className="mt-6 inline-flex items-start gap-3 px-4 py-3 rounded-sm"
            style={{
              background: "var(--ow-bg-card)",
              border: "1px solid var(--ow-border)",
              maxWidth: "480px",
            }}
          >
            <svg width="14" height="14" viewBox="0 0 14 14" fill="none" className="mt-0.5 flex-shrink-0">
              <circle cx="7" cy="7" r="6" stroke="var(--ow-amber)" strokeWidth="1.2" />
              <path d="M7 5v4M7 10.5v.5" stroke="var(--ow-amber)" strokeWidth="1.2" strokeLinecap="round" />
            </svg>
            <p style={{ fontFamily: "'Lato',sans-serif", fontSize: "0.8125rem", lineHeight: 1.6, color: "var(--ow-text-mid)" }}>
              <strong style={{ color: "var(--ow-text-hi)" }}>{freeCount} lessons are free.</strong> The remaining {totalCount - freeCount} require{" "}
              <Link href="/the-press" style={{ color: "var(--ow-amber)", textDecoration: "none" }}>The Press</Link>
              {" "}— your working board and full cellar science library.
            </p>
          </div>
        </div>

        {/* ── Domain filter ── */}
        <div className="mb-8">
          <p
            className="mb-3 text-xs tracking-wider uppercase"
            style={{ color: "var(--ow-text-lo)", fontFamily: "'Lato',sans-serif", letterSpacing: "0.1em" }}
          >
            Domain
          </p>
          <div className="flex flex-wrap gap-2">
            {DOMAINS.map(d => (
              <button
                key={d}
                onClick={() => setDomain(d)}
                className="px-3 py-1.5 rounded-sm text-xs transition-all flex items-center gap-1.5"
                style={{
                  fontFamily: "'Lato',sans-serif",
                  letterSpacing: "0.05em",
                  fontWeight: domain === d ? 600 : 300,
                  background: domain === d
                    ? "color-mix(in oklch, var(--ow-amber) 15%, transparent)"
                    : "var(--ow-bg-card)",
                  border: domain === d
                    ? "1px solid var(--ow-amber)"
                    : "1px solid var(--ow-border)",
                  color: domain === d ? "var(--ow-amber)" : "var(--ow-text-lo)",
                  cursor: "pointer",
                }}
              >
                <span>{DOMAIN_ICONS[d]}</span>
                {d}
              </button>
            ))}
          </div>
        </div>

        {/* ── Lesson grid ── */}
        <div
          ref={gridRef.ref}
          className={`grid gap-4 ${gridRef.inView ? "fade-up" : "opacity-0"}`}
          style={{ gridTemplateColumns: "repeat(auto-fill, minmax(260px, 1fr))" }}
        >
          {filtered.map(lesson => (
            <LessonCardItem key={lesson.id} lesson={lesson} />
          ))}
        </div>

        {filtered.length === 0 && (
          <div className="text-center py-16">
            <p style={{ fontFamily: "'Lato',sans-serif", color: "var(--ow-text-lo)", fontStyle: "italic" }}>
              No lessons in this domain yet — coming in the education build.
            </p>
          </div>
        )}

        {/* ── Upgrade CTA ── */}
        <div
          className="mt-16 p-8 rounded-sm relative overflow-hidden"
          style={{
            background: "var(--ow-bg-card)",
            border: "1px solid color-mix(in oklch, var(--ow-amber) 20%, transparent)",
          }}
        >
          <div
            className="absolute inset-0 pointer-events-none"
            style={{
              background: "radial-gradient(ellipse at top left, color-mix(in oklch, var(--ow-amber) 6%, transparent) 0%, transparent 60%)",
            }}
          />
          <div className="relative z-10 flex flex-col md:flex-row md:items-center gap-6">
            <div className="flex-1">
              <p
                className="section-label mb-2"
                style={{ fontFamily: "'Lato',sans-serif", fontSize: "0.65rem", letterSpacing: "0.14em" }}
              >
                Ready to go deeper?
              </p>
              <h2
                style={{
                  fontFamily: "'Fraunces',serif",
                  fontWeight: 700,
                  fontSize: "clamp(1.4rem,3vw,2rem)",
                  lineHeight: 1.15,
                  color: "var(--ow-text-hi)",
                }}
              >
                Step into{" "}
                <em style={{ color: "var(--ow-amber)", fontStyle: "italic" }}>The Press</em>
              </h2>
              <p
                className="mt-2"
                style={{
                  fontFamily: "'Lato',sans-serif",
                  fontWeight: 300,
                  fontSize: "0.9375rem",
                  lineHeight: 1.7,
                  color: "var(--ow-text-mid)",
                  maxWidth: "440px",
                }}
              >
                The press extracts what free run cannot reach. The full cellar science library. Your working board for the vintage. Every calculation saved.
              </p>
              <p
                className="mt-2"
                style={{
                  fontFamily: "'Lato',sans-serif",
                  fontWeight: 300,
                  fontSize: "0.8125rem",
                  fontStyle: "italic",
                  color: "var(--ow-text-lo)",
                }}
              >
                *Le pressoir extrait ce que le jus de goutte ne peut atteindre.*
              </p>
            </div>
            <div className="flex flex-col gap-3">
              <Link href="/the-press" className="btn-amber text-sm text-center" style={{ textDecoration: "none", whiteSpace: "nowrap" }}>
                Open The Press →
              </Link>
              <a href="#pricing" className="btn-ghost text-sm text-center" style={{ textDecoration: "none", whiteSpace: "nowrap" }}>
                View Pricing
              </a>
            </div>
          </div>
        </div>

        {/* ── Vocabulary section ── */}
        <div ref={vocabRef.ref} className={`mt-16 ${vocabRef.inView ? "fade-up" : "opacity-0"}`}>
          <button
            onClick={() => setVocabOpen(v => !v)}
            className="w-full flex items-center justify-between py-4 transition-colors"
            style={{ borderTop: "1px solid var(--ow-border)", borderBottom: vocabOpen ? "none" : "1px solid var(--ow-border)", background: "transparent", cursor: "pointer" }}
          >
            <div className="flex items-center gap-3">
              <span style={{ fontFamily: "'Fira Code',monospace", fontSize: "0.7rem", color: "var(--ow-amber)", letterSpacing: "0.1em" }}>◈</span>
              <span
                style={{
                  fontFamily: "'Fraunces',serif",
                  fontWeight: 600,
                  fontSize: "1.0625rem",
                  color: "var(--ow-text-hi)",
                }}
              >
                The Winemaker's Vocabulary
              </span>
              <span
                style={{
                  fontFamily: "'Lato',sans-serif",
                  fontSize: "0.75rem",
                  color: "var(--ow-text-lo)",
                  fontStyle: "italic",
                }}
              >
                — wine wank, explained plainly
              </span>
            </div>
            <svg
              width="16" height="16" viewBox="0 0 16 16" fill="none"
              style={{ transform: vocabOpen ? "rotate(180deg)" : "rotate(0deg)", transition: "transform 0.2s", color: "var(--ow-text-lo)", flexShrink: 0 }}
            >
              <path d="M4 6l4 4 4-4" stroke="currentColor" strokeWidth="1.4" strokeLinecap="round" strokeLinejoin="round" />
            </svg>
          </button>

          {vocabOpen && (
            <div
              className="py-6"
              style={{ borderBottom: "1px solid var(--ow-border)" }}
            >
              <p
                className="mb-6"
                style={{
                  fontFamily: "'Lato',sans-serif",
                  fontWeight: 300,
                  fontSize: "0.875rem",
                  lineHeight: 1.7,
                  color: "var(--ow-text-lo)",
                  fontStyle: "italic",
                  maxWidth: "560px",
                }}
              >
                Every craft has its language. Winemaking has more than most — French, Latin, and technical terms layered over centuries of tradition. Here is what they actually mean.
              </p>
              <div className="grid gap-4" style={{ gridTemplateColumns: "repeat(auto-fill, minmax(280px, 1fr))" }}>
                {VOCABULARY.map(v => (
                  <div
                    key={v.word}
                    className="p-4 rounded-sm"
                    style={{ background: "var(--ow-bg-card)", border: "1px solid var(--ow-border)" }}
                  >
                    <p
                      style={{
                        fontFamily: "'Fraunces',serif",
                        fontWeight: 600,
                        fontSize: "0.9375rem",
                        color: "var(--ow-amber)",
                        marginBottom: "0.5rem",
                      }}
                    >
                      {v.word}
                    </p>
                    <p
                      style={{
                        fontFamily: "'Lato',sans-serif",
                        fontWeight: 300,
                        fontSize: "0.8125rem",
                        lineHeight: 1.65,
                        color: "var(--ow-text-mid)",
                      }}
                    >
                      {v.meaning}
                    </p>
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>

        {/* ── Footer quote ── */}
        <div className="mt-16 text-center">
          <p
            style={{
              fontFamily: "'Fraunces',serif",
              fontWeight: 400,
              fontSize: "1.125rem",
              fontStyle: "italic",
              lineHeight: 1.6,
              color: "var(--ow-text-lo)",
            }}
          >
            "You are the must. Ownology is the ferment."
          </p>
          <p
            className="mt-2"
            style={{
              fontFamily: "'Lato',sans-serif",
              fontSize: "0.75rem",
              color: "oklch(0.38 0.008 60)",
              letterSpacing: "0.08em",
            }}
          >
            — The Chalkboard
          </p>
        </div>

      </div>
    </div>
  );
}
