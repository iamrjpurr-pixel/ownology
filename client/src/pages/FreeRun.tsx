/**
 * FREE RUN — AI Winemaking Tutor
 * Scoped RAG: retrieves relevant SOPs from the knowledge base and answers from them.
 * Replaces the placeholder lesson-card shell with a live question→answer interface.
 */

import { useCallback, useEffect, useRef, useState } from "react";
import { Link, useSearch } from "wouter";
import { Send, BookOpen, ExternalLink, GraduationCap } from "lucide-react";
import { trpc } from "@/lib/trpc";

// ─── Types ────────────────────────────────────────────────────────────────────
interface QAPair {
  question: string;
  answer: string;
  sopTitles: string[];
  disclaimer: string;
}

// ─── Example prompt chips ─────────────────────────────────────────────────────
const EXAMPLE_PROMPTS = [
  { label: "Stuck ferment", q: "My fermentation has stalled at 1.020 SG — what should I do?" },
  { label: "YAN addition", q: "My Shiraz is at 24.3 Brix and YAN is 120ppm. What DAP addition do I need?" },
  { label: "SO₂ management", q: "How do I calculate my free SO₂ addition after racking?" },
  { label: "MLF timing", q: "When should I inoculate for malolactic fermentation?" },
  { label: "Racking decision", q: "How do I know when my wine is ready to rack for the first time?" },
  { label: "Fining agents", q: "What fining agents should I use to improve clarity in my white wine?" },
];

// ─── Industry Curriculum Backbone (AOC Advanced Certificate of Viticulture, Winemaking & Oenology) ─
interface AocModule {
  unit: string;
  name: string;
  phase: "Foundation" | "Process" | "Advanced";
  keyTopics: string[];
  ownologyLink: string;
  ownologyLabel: string;
}

const AOC_MODULES: AocModule[] = [
  {
    unit: "Oenology 1",
    name: "Scope and Nature of Oenology",
    phase: "Foundation",
    keyTopics: [
      "Introduction to global wine production",
      "Global wine consumption patterns",
      "What is involved in winemaking",
      "Wine making terminology",
      "Testing, tasting and monitoring",
      "Alcohol and health considerations",
    ],
    ownologyLink: "/knowledge",
    ownologyLabel: "Knowledge Platform →",
  },
  {
    unit: "Oenology 2",
    name: "Fermentation Science",
    phase: "Foundation",
    keyTopics: [
      "Fermentation fundamentals and carbohydrate metabolism",
      "Microbiology: yeasts, bacteria, and spoilage organisms",
      "Enzyme activity and quality control",
      "Malolactic fermentation (MLF)",
      "Secondary fermentation management",
    ],
    ownologyLink: "/knowledge/category/Crushing%20%26%20Fermentation",
    ownologyLabel: "Fermentation SOPs →",
  },
  {
    unit: "Oenology 3",
    name: "The Winemaking Process",
    phase: "Process",
    keyTopics: [
      "Outline of the winemaking process end-to-end",
      "Clarification and stabilisation techniques",
      "Preservation: SO₂ management and additions",
      "Methods to determine sugar and sulphur dioxide levels",
    ],
    ownologyLink: "/knowledge/category/Tank%20Cleaning%20%26%20Sanitation",
    ownologyLabel: "Cellar Operations SOPs →",
  },
  {
    unit: "Oenology 4",
    name: "Factors Affecting Grape Characteristics",
    phase: "Process",
    keyTopics: [
      "Fruit characteristics affecting wine style",
      "Fermentation preparation and additions",
      "Effects of yeasts in winemaking",
      "Managing yeasts: nutrition, temperature, YAN",
      "Alcohol content, chemical and microbial stability",
      "Inoculum of yeast: timing and selection",
    ],
    ownologyLink: "/knowledge/category/Crushing%20%26%20Fermentation",
    ownologyLabel: "Fermentation SOPs →",
  },
  {
    unit: "Oenology 5",
    name: "Wine Classification",
    phase: "Foundation",
    keyTopics: [
      "Types of wines and production methods",
      "Selecting wine grapes by variety and region",
      "Varietal characteristics and style outcomes",
    ],
    ownologyLink: "/knowledge",
    ownologyLabel: "Knowledge Platform →",
  },
  {
    unit: "Oenology 6",
    name: "Sensory Science and Evaluation",
    phase: "Advanced",
    keyTopics: [
      "Wine sensory science fundamentals",
      "Determining consumer preference",
      "Types of senses and sensory thresholds",
      "Wine evaluation methodology",
      "Wine and food interaction principles",
    ],
    ownologyLink: "/knowledge/category/Laboratory%20Testing",
    ownologyLabel: "Lab & QC SOPs →",
  },
  {
    unit: "Oenology 7",
    name: "White Wine and Sparkling Production",
    phase: "Process",
    keyTopics: [
      "Harvesting grapes for white wine",
      "Crushing and must management",
      "Managing the must: cold settling, juice clarification",
      "Sparkling wines: Méthode Champenoise, tank method",
      "The Champenois method in detail",
    ],
    ownologyLink: "/knowledge/category/Crushing%20%26%20Fermentation",
    ownologyLabel: "Fermentation SOPs →",
  },
  {
    unit: "Oenology 8",
    name: "Red Wine and Rosé Production",
    phase: "Process",
    keyTopics: [
      "Harvesting and crushing for reds",
      "Fermentation on skins: cap management, extraction",
      "Extracting colour: pumpovers, plunging, délestage",
      "Thermovinification for colour extraction",
      "Getting a wood flavour: barrel selection and use",
    ],
    ownologyLink: "/knowledge/category/Crushing%20%26%20Fermentation",
    ownologyLabel: "Fermentation SOPs →",
  },
  {
    unit: "Oenology 9",
    name: "Production of Spirits",
    phase: "Advanced",
    keyTopics: [
      "Distillation principles and methods",
      "Fortified wine production: Port, Muscat, Sherry styles",
      "Spirit quality and maturation",
    ],
    ownologyLink: "/knowledge",
    ownologyLabel: "Knowledge Platform →",
  },
];

const AOC_PHASE_COLORS: Record<"Foundation" | "Process" | "Advanced", string> = {
  Foundation: "var(--ow-amber)",
  Process: "oklch(0.65 0.10 230)",
  Advanced: "oklch(0.62 0.10 45)",
};

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

// ─── CSU Subject Card ─────────────────────────────────────────────────────────
function AocModuleCard({ module: mod }: { module: AocModule }) {
  const phaseColor = AOC_PHASE_COLORS[mod.phase];
  const [expanded, setExpanded] = useState(false);
  return (
    <div className="cellar-card p-5 flex flex-col gap-3" style={{ border: "1px solid var(--ow-border)" }}>
      <div className="flex items-start justify-between gap-2">
        <div className="flex flex-col gap-1">
          <div className="flex items-center gap-2">
            <span style={{ fontFamily: "'Fira Code',monospace", fontSize: "0.7rem", color: "var(--ow-amber)", letterSpacing: "0.08em" }}>
              {mod.unit}
            </span>
            <span
              className="text-xs px-2 py-0.5 rounded-sm"
              style={{
                fontFamily: "'Fira Code',monospace",
                fontSize: "0.65rem",
                color: phaseColor,
                background: `color-mix(in oklch, ${phaseColor} 12%, transparent)`,
                border: `1px solid color-mix(in oklch, ${phaseColor} 25%, transparent)`,
              }}
            >
              {mod.phase}
            </span>
          </div>
          <h3 style={{ fontFamily: "'Fraunces',serif", fontWeight: 600, fontSize: "1rem", lineHeight: 1.25, color: "var(--ow-text-hi)" }}>
            {mod.name}
          </h3>
        </div>
        <div
          className="flex-shrink-0 w-8 h-8 rounded-sm flex items-center justify-center"
          style={{ background: "color-mix(in oklch, var(--ow-amber) 10%, transparent)", border: "1px solid color-mix(in oklch, var(--ow-amber) 20%, transparent)" }}
        >
          <GraduationCap size={14} style={{ color: "var(--ow-amber)" }} />
        </div>
      </div>

      <button
        onClick={() => setExpanded(e => !e)}
        className="flex items-center gap-2 text-xs transition-colors"
        style={{ fontFamily: "'Lato',sans-serif", color: expanded ? "var(--ow-amber)" : "var(--ow-text-lo)", background: "none", border: "none", cursor: "pointer", padding: 0, textAlign: "left" }}
      >
        <svg width="10" height="10" viewBox="0 0 10 10" fill="none" style={{ transform: expanded ? "rotate(90deg)" : "none", transition: "transform 0.2s" }}>
          <path d="M3 2l4 3-4 3" stroke="currentColor" strokeWidth="1.3" strokeLinecap="round" strokeLinejoin="round" />
        </svg>
        {expanded ? "Hide topics" : "Show key topics"}
      </button>

      {expanded && (
        <ul className="flex flex-col gap-1.5 pl-3" style={{ borderLeft: "2px solid color-mix(in oklch, var(--ow-amber) 25%, transparent)" }}>
          {mod.keyTopics.map((t: string) => (
            <li key={t} style={{ fontFamily: "'Lato',sans-serif", fontWeight: 300, fontSize: "0.8rem", color: "var(--ow-text-mid)", lineHeight: 1.5 }}>
              {t}
            </li>
          ))}
        </ul>
      )}

      <div className="flex items-center gap-3 mt-auto pt-3" style={{ borderTop: "1px solid var(--ow-border)" }}>
        <Link
          href={mod.ownologyLink}
          className="text-xs"
          style={{ fontFamily: "'Lato',sans-serif", color: "var(--ow-amber)", textDecoration: "none" }}
        >
          {mod.ownologyLabel}
        </Link>
        <a
          href="https://australianonlinecourses.com.au/courses/advanced-certificate-of-viticulture-winemaking-oenology/"
          target="_blank"
          rel="noopener noreferrer"
          className="ml-auto flex items-center gap-1 text-xs"
          style={{ fontFamily: "'Fira Code',monospace", fontSize: "0.65rem", color: "var(--ow-text-lo)", textDecoration: "none", letterSpacing: "0.05em" }}
        >
          AOC Course <ExternalLink size={10} />
        </a>
      </div>
    </div>
  );
}

// ─── Main component ───────────────────────────────────────────────────────────
export default function FreeRun() {
  const search = useSearch();
  const [question, setQuestion] = useState("");
  const [history, setHistory] = useState<QAPair[]>([]);
  const [isAsking, setIsAsking] = useState(false);
  const autoSubmittedRef = useRef(false);
  const inputRef = useRef<HTMLTextAreaElement>(null);
  const bottomRef = useRef<HTMLDivElement>(null);

  const headerRef = useInView(0.1);
  const csuRef = useInView(0.05);

  const askMutation = trpc.tutor.ask.useMutation();

  // Voice input
  const [listening, setListening] = useState(false);
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const srRef = useRef<any>(null);
  const startVoice = useCallback(() => {
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const w = window as any;
    const SR = w.SpeechRecognition ?? w.webkitSpeechRecognition;
    if (!SR) { alert("Voice input is not supported in this browser. Try Chrome on Android or desktop."); return; }
    if (listening) { srRef.current?.stop(); setListening(false); return; }
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const rec = new SR() as any;
    rec.lang = "en-AU"; rec.interimResults = false; rec.maxAlternatives = 1;
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    rec.onresult = (e: any) => {
      const transcript = e.results[0][0].transcript as string;
      setQuestion(prev => prev ? `${prev} ${transcript}` : transcript);
      setListening(false);
    };
    rec.onerror = () => setListening(false);
    rec.onend = () => setListening(false);
    srRef.current = rec; rec.start(); setListening(true);
  }, [listening]);

  // Load thread from localStorage
  useEffect(() => {
    try {
      const saved = localStorage.getItem("ow_tutor_thread");
      if (saved) {
        const parsed = JSON.parse(saved);
        if (Array.isArray(parsed)) setHistory(parsed);
      }
    } catch { /* ignore */ }
  }, []);

  // Persist thread to localStorage
  useEffect(() => {
    if (history.length > 0) {
      localStorage.setItem("ow_tutor_thread", JSON.stringify(history.slice(-5)));
    }
  }, [history]);

  // Handle ?q= param — pre-fill and auto-submit once
  useEffect(() => {
    const params = new URLSearchParams(search);
    const q = params.get("q");
    if (q && !autoSubmittedRef.current) {
      autoSubmittedRef.current = true;
      setQuestion(q);
      // Auto-submit after a short delay to let state settle
      setTimeout(() => {
        handleAsk(q);
      }, 300);
    }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [search]);

  // Scroll to bottom after new answer
  useEffect(() => {
    if (history.length > 0) {
      bottomRef.current?.scrollIntoView({ behavior: "smooth", block: "end" });
    }
  }, [history]);

  async function handleAsk(overrideQ?: string) {
    const q = (overrideQ ?? question).trim();
    if (!q || isAsking) return;
    setIsAsking(true);
    setQuestion("");
    try {
      const result = await askMutation.mutateAsync({
        question: q,
        mode: "winemaking",
        history: history.slice(-4).map((h) => [
          { role: "user" as const, content: h.question },
          { role: "assistant" as const, content: h.answer },
        ]).flat(),
      });
      setHistory((prev) => [
        ...prev,
        {
          question: q,
          answer: result.answer,
          sopTitles: result.sopTitles,
          disclaimer: result.disclaimer,
        },
      ]);
    } catch (err) {
      setHistory((prev) => [
        ...prev,
        {
          question: q,
          answer: "Something went wrong. Please try again.",
          sopTitles: [],
          disclaimer: "",
        },
      ]);
    } finally {
      setIsAsking(false);
    }
  }

  function handleKeyDown(e: React.KeyboardEvent<HTMLTextAreaElement>) {
    if (e.key === "Enter" && !e.shiftKey) {
      e.preventDefault();
      handleAsk();
    }
  }

  function clearThread() {
    setHistory([]);
    localStorage.removeItem("ow_tutor_thread");
  }

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
            <div className="h-px flex-1" style={{ background: "linear-gradient(to right, color-mix(in oklch, var(--ow-amber) 20%, transparent), transparent)" }} />
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

          <p className="section-label mb-4" style={{ fontFamily: "'Lato',sans-serif", fontSize: "0.7rem", letterSpacing: "0.12em" }}>
            AI Winemaking Tutor
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
            Ask any winemaking question. Answers are drawn directly from Ownology's SOP knowledge base — the same library your cellar team uses.
          </p>
        </div>

        {/* ── Example prompt chips ── */}
        {history.length === 0 && !isAsking && (
          <div className="mb-8">
            <p style={{ fontFamily: "'Lato',sans-serif", fontSize: "0.7rem", color: "var(--ow-text-lo)", letterSpacing: "0.1em", textTransform: "uppercase", marginBottom: "0.75rem" }}>
              Try asking
            </p>
            <div className="flex flex-wrap gap-2">
              {EXAMPLE_PROMPTS.map(({ label, q }) => (
                <button
                  key={label}
                  onClick={() => { setQuestion(q); inputRef.current?.focus(); }}
                  className="px-3 py-1.5 rounded-sm text-xs transition-all"
                  style={{
                    fontFamily: "'Lato',sans-serif",
                    color: "var(--ow-amber)",
                    background: "color-mix(in oklch, var(--ow-amber) 8%, transparent)",
                    border: "1px solid color-mix(in oklch, var(--ow-amber) 25%, transparent)",
                    cursor: "pointer",
                  }}
                >
                  {label}
                </button>
              ))}
            </div>
          </div>
        )}

        {/* ── Conversation thread ── */}
        {history.length > 0 && (
          <div className="mb-8 flex flex-col gap-6">
            {history.map((pair, i) => (
              <div key={i} className="flex flex-col gap-3">
                {/* Question bubble */}
                <div className="flex justify-end">
                  <div
                    className="px-4 py-3 rounded-sm max-w-lg"
                    style={{
                      background: "var(--ow-bg-inset)",
                      border: "1px solid var(--ow-border)",
                      fontFamily: "'Lato',sans-serif",
                      fontWeight: 300,
                      fontSize: "0.9rem",
                      color: "var(--ow-text-hi)",
                      lineHeight: 1.6,
                    }}
                  >
                    {pair.question}
                  </div>
                </div>

                {/* Answer */}
                <div
                  className="cellar-card p-5"
                  style={{ border: "1px solid color-mix(in oklch, var(--ow-amber) 20%, transparent)" }}
                >
                  {/* SOP source badges */}
                  {pair.sopTitles.length > 0 && (
                    <div className="flex flex-wrap gap-1.5 mb-3">
                      {pair.sopTitles.map((t) => (
                        <span
                          key={t}
                          className="px-2 py-0.5 rounded-sm text-xs flex items-center gap-1"
                          style={{
                            fontFamily: "'Fira Code',monospace",
                            fontSize: "0.65rem",
                            color: "var(--ow-amber)",
                            background: "color-mix(in oklch, var(--ow-amber) 10%, transparent)",
                            border: "1px solid color-mix(in oklch, var(--ow-amber) 20%, transparent)",
                          }}
                        >
                          <BookOpen size={9} />
                          {t}
                        </span>
                      ))}
                    </div>
                  )}

                  {/* Answer text */}
                  <div
                    style={{
                      fontFamily: "'Lato',sans-serif",
                      fontWeight: 300,
                      fontSize: "0.9375rem",
                      color: "var(--ow-text-hi)",
                      lineHeight: 1.75,
                      whiteSpace: "pre-wrap",
                    }}
                  >
                    {pair.answer}
                  </div>

                  {/* Disclaimer */}
                  {pair.disclaimer && (
                    <p
                      className="mt-4 pt-3"
                      style={{
                        fontFamily: "'Lato',sans-serif",
                        fontWeight: 300,
                        fontSize: "0.75rem",
                        color: "var(--ow-text-lo)",
                        fontStyle: "italic",
                        borderTop: "1px solid var(--ow-border)",
                      }}
                    >
                      {pair.disclaimer}
                    </p>
                  )}
                  {/* Learn→Do bridge: Try it in The Press */}
                  <div className="mt-4 pt-3 flex items-center gap-3" style={{ borderTop: "1px solid var(--ow-border)" }}>
                    <Link
                      href="/the-press"
                      className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-sm"
                      style={{
                        background: "color-mix(in oklch, var(--ow-amber) 10%, transparent)",
                        border: "1px solid color-mix(in oklch, var(--ow-amber) 30%, transparent)",
                        color: "var(--ow-amber)",
                        fontFamily: "'Lato', sans-serif",
                        fontSize: "0.75rem",
                        fontWeight: 500,
                        textDecoration: "none",
                      }}
                    >
                      <svg width="10" height="10" viewBox="0 0 10 10" fill="none">
                        <path d="M1 5h8M5 1l4 4-4 4" stroke="currentColor" strokeWidth="1.2" strokeLinecap="round" strokeLinejoin="round" />
                      </svg>
                      Log it in The Press
                    </Link>
                    <span style={{ fontFamily: "'Lato', sans-serif", fontSize: "0.7rem", color: "var(--ow-text-lo)" }}>
                      Ready to record this in your vintage log?
                    </span>
                  </div>
                </div>
              </div>
            ))}

            {/* Loading state */}
            {isAsking && (
              <div className="flex justify-start">
                <div
                  className="cellar-card px-5 py-4 flex items-center gap-3"
                  style={{ border: "1px solid color-mix(in oklch, var(--ow-amber) 20%, transparent)" }}
                >
                  <div className="flex gap-1">
                    {[0, 1, 2].map((i) => (
                      <div
                        key={i}
                        className="w-1.5 h-1.5 rounded-full"
                        style={{
                          background: "var(--ow-amber)",
                          animation: `pulse 1.2s ease-in-out ${i * 0.2}s infinite`,
                        }}
                      />
                    ))}
                  </div>
                  <span style={{ fontFamily: "'Lato',sans-serif", fontSize: "0.8rem", color: "var(--ow-text-lo)" }}>
                    Searching SOPs…
                  </span>
                </div>
              </div>
            )}

            <div ref={bottomRef} />

            {/* Thread controls */}
            <div className="flex items-center justify-between pt-2">
              <button
                onClick={clearThread}
                className="text-xs"
                style={{ fontFamily: "'Lato',sans-serif", color: "var(--ow-text-lo)", background: "none", border: "none", cursor: "pointer", padding: 0 }}
              >
                Clear conversation
              </button>
              <div className="flex flex-wrap gap-2">
                {EXAMPLE_PROMPTS.slice(0, 3).map(({ label, q }) => (
                  <button
                    key={label}
                    onClick={() => { setQuestion(q); inputRef.current?.focus(); }}
                    className="px-2.5 py-1 rounded-sm text-xs"
                    style={{
                      fontFamily: "'Lato',sans-serif",
                      color: "var(--ow-text-lo)",
                      background: "var(--ow-bg-inset)",
                      border: "1px solid var(--ow-border)",
                      cursor: "pointer",
                    }}
                  >
                    {label}
                  </button>
                ))}
              </div>
            </div>
          </div>
        )}

        {/* Loading state when no history yet */}
        {isAsking && history.length === 0 && (
          <div className="mb-8 flex justify-start">
            <div
              className="cellar-card px-5 py-4 flex items-center gap-3"
              style={{ border: "1px solid color-mix(in oklch, var(--ow-amber) 20%, transparent)" }}
            >
              <div className="flex gap-1">
                {[0, 1, 2].map((i) => (
                  <div
                    key={i}
                    className="w-1.5 h-1.5 rounded-full"
                    style={{
                      background: "var(--ow-amber)",
                      animation: `pulse 1.2s ease-in-out ${i * 0.2}s infinite`,
                    }}
                  />
                ))}
              </div>
              <span style={{ fontFamily: "'Lato',sans-serif", fontSize: "0.8rem", color: "var(--ow-text-lo)" }}>
                Searching SOPs…
              </span>
            </div>
          </div>
        )}

        {/* ── Input box ── */}
        <div
          className="cellar-card p-4"
          style={{ border: "1px solid color-mix(in oklch, var(--ow-amber) 30%, transparent)" }}
        >
          <textarea
            ref={inputRef}
            value={question}
            onChange={(e) => setQuestion(e.target.value)}
            onKeyDown={handleKeyDown}
            placeholder="Ask a winemaking question — stuck ferment, YAN addition, SO₂ management, MLF timing…"
            rows={3}
            disabled={isAsking}
            style={{
              width: "100%",
              background: "transparent",
              border: "none",
              outline: "none",
              resize: "none",
              fontFamily: "'Lato',sans-serif",
              fontWeight: 300,
              fontSize: "0.9375rem",
              color: "var(--ow-text-hi)",
              lineHeight: 1.6,
            }}
          />
          <div className="flex items-center justify-between pt-3" style={{ borderTop: "1px solid var(--ow-border)" }}>
            <p style={{ fontFamily: "'Fira Code',monospace", fontSize: "0.65rem", color: "var(--ow-text-lo)" }}>
              Enter to send · Shift+Enter for new line
            </p>
            <div className="flex items-center gap-2">
            {/* Microphone button */}
            <button
              onClick={startVoice}
              disabled={isAsking}
              title={listening ? "Stop listening" : "Ask by voice"}
              className="flex items-center justify-center rounded-sm transition-all"
              style={{
                width: 34, height: 34,
                background: listening ? "color-mix(in oklch, var(--ow-amber) 18%, transparent)" : "var(--ow-bg-inset)",
                border: `1px solid ${listening ? "var(--ow-amber)" : "var(--ow-border)"}`,
                color: listening ? "var(--ow-amber)" : "var(--ow-text-lo)",
                cursor: isAsking ? "not-allowed" : "pointer",
                fontSize: "1rem",
              }}
            >
              {listening ? "🎙" : "🎤"}
            </button>
            <button
              onClick={() => handleAsk()}
              disabled={!question.trim() || isAsking}
              className="flex items-center gap-2 px-4 py-2 rounded-sm text-sm transition-all"
              style={{
                fontFamily: "'Lato',sans-serif",
                fontWeight: 700,
                fontSize: "0.8125rem",
                background: question.trim() && !isAsking ? "var(--ow-amber)" : "var(--ow-bg-inset)",
                color: question.trim() && !isAsking ? "var(--ow-bg-base)" : "var(--ow-text-lo)",
                border: "none",
                cursor: question.trim() && !isAsking ? "pointer" : "not-allowed",
                letterSpacing: "0.04em",
              }}
            >
              <Send size={13} />
              Ask
            </button>
            </div>
          </div>
        </div>

        {/* ── Compliance redirect notice ── */}
        <div
          className="mt-4 px-4 py-3 rounded-sm flex items-start gap-3"
          style={{ background: "var(--ow-bg-card)", border: "1px solid var(--ow-border)" }}
        >
          <svg width="14" height="14" viewBox="0 0 14 14" fill="none" className="mt-0.5 flex-shrink-0">
            <circle cx="7" cy="7" r="6" stroke="var(--ow-text-lo)" strokeWidth="1.2" />
            <path d="M7 5v4M7 10.5v.5" stroke="var(--ow-text-lo)" strokeWidth="1.2" strokeLinecap="round" />
          </svg>
          <p style={{ fontFamily: "'Lato',sans-serif", fontWeight: 300, fontSize: "0.8rem", color: "var(--ow-text-lo)", lineHeight: 1.6 }}>
            Free Run answers winemaking questions from the SOP knowledge base.{" "}
            For <strong style={{ color: "var(--ow-text-mid)" }}>regulatory and compliance questions</strong>{" "}
            (licensing, FSANZ, WET, EPA obligations),{" "}
            <Link href="/compliance" style={{ color: "var(--ow-amber)", textDecoration: "none" }}>
              use the Compliance AI →
            </Link>
          </p>
        </div>

        {/* ── Industry Curriculum ── */}
        <div ref={csuRef.ref} className={`mt-16 ${csuRef.inView ? "fade-up" : "opacity-0"}`}>
          <div className="flex items-center gap-3 mb-6">
            <div className="h-px flex-1" style={{ background: "var(--ow-border)" }} />
            <p style={{ fontFamily: "'Lato',sans-serif", fontSize: "0.7rem", color: "var(--ow-text-lo)", letterSpacing: "0.1em", textTransform: "uppercase", whiteSpace: "nowrap" }}>
              Further Study — Industry Curriculum
            </p>
            <div className="h-px flex-1" style={{ background: "var(--ow-border)" }} />
          </div>
          <p
            className="mb-6"
            style={{
              fontFamily: "'Lato',sans-serif",
              fontWeight: 300,
              fontSize: "0.875rem",
              color: "var(--ow-text-lo)",
              lineHeight: 1.7,
              maxWidth: "560px",
            }}
          >
            Free Run's AI is grounded in the Ownology Winemaking Bibles — original authored content aligned with industry-standard references including “Winemaking: From Grape Growing to Marketplace” (Vine, Harkness, Browning & Wagner, Chapman & Hall Enology Library). The modules below are drawn from the Australian Online Courses Advanced Certificate of Viticulture, Winemaking & Oenology — a practical, vocational-level curriculum for winemakers at every stage.
          </p>
          <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-4">
            {AOC_MODULES.map((mod) => (
              <AocModuleCard key={mod.unit} module={mod} />
            ))}
          </div>
        </div>

      </div>
    </div>
  );
}
