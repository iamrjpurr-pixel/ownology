/**
 * OWNOLOGY — Competitive Advantage Page
 * Translates the May 2026 competitive intelligence report into a public-facing
 * page that clearly articulates Ownology's unique market position.
 * Design: matches the dark artisan system — Fraunces display, Lato body, amber gold.
 */
import { useEffect, useRef, useState } from "react";
import OwnologyLogo from "@/components/OwnologyLogo";

import { Link } from "wouter";

// ─── Design tokens ────────────────────────────────────────────────────────────
const BG_BASE   = "var(--ow-bg-base)";
const BG_RAISED = "var(--ow-bg-raised)";
const BG_CARD   = "var(--ow-bg-card)";
const BG_INSET  = "var(--ow-bg-inset)";
const AMBER     = "var(--ow-amber)";
const TEXT_HI   = "var(--ow-text-hi)";
const TEXT_MID  = "var(--ow-text-mid)";
const TEXT_LO   = "var(--ow-text-lo)";
const BORDER    = "var(--ow-border)";
const BORDER_MD = "var(--ow-border-md)";
const SERIF     = "'Fraunces', serif";
const SANS      = "'Lato', sans-serif";
const MONO      = "'Fira Code', monospace";

// ─── Intersection observer hook ───────────────────────────────────────────────
function useInView(threshold = 0.12) {
  const ref = useRef<HTMLDivElement>(null);
  const [inView, setInView] = useState(false);
  useEffect(() => {
    const el = ref.current;
    if (!el) return;
    const obs = new IntersectionObserver(
      ([e]) => { if (e.isIntersecting) { setInView(true); obs.disconnect(); } },
      { threshold }
    );
    obs.observe(el);
    return () => obs.disconnect();
  }, [threshold]);
  return { ref, inView };
}

// ─── Nav ──────────────────────────────────────────────────────────────────────
function Nav() {
  const [scrolled, setScrolled] = useState(false);
  useEffect(() => {
    const onScroll = () => setScrolled(window.scrollY > 40);
    window.addEventListener("scroll", onScroll);
    return () => window.removeEventListener("scroll", onScroll);
  }, []);
  return (
    <nav
      className={`fixed top-0 left-0 right-0 z-50 transition-all duration-300 ${scrolled ? "backdrop-blur-md border-b" : ""}`}
      style={scrolled ? { background: "var(--ow-nav-bg)", borderColor: BORDER } : {}}
    >
      <div className="container flex items-center justify-between py-5">
        <Link href="/"><OwnologyLogo size={32} /></Link>
        <div className="flex items-center gap-6">
          <Link href="/" style={{ fontFamily: SANS, fontWeight: 300, fontSize: "0.875rem", color: TEXT_LO }}>
            ← Back to Home
          </Link>
          <Link href="/pricing">
            <span className="btn-amber" style={{ fontSize: "0.8125rem", padding: "0.5rem 1.25rem" }}>
              Start Free Trial
            </span>
          </Link>
        </div>
      </div>
    </nav>
  );
}

// ─── Hero ─────────────────────────────────────────────────────────────────────
function Hero() {
  return (
    <section className="pt-36 pb-20" style={{ background: BG_BASE }}>
      <div className="container max-w-4xl">
        <p style={{ fontFamily: SANS, fontWeight: 700, fontSize: "0.7rem", letterSpacing: "0.18em", textTransform: "uppercase", color: AMBER, marginBottom: "1.25rem" }}>
          Competitive Landscape · May 2026
        </p>
        <h1 style={{ fontFamily: SERIF, fontWeight: 700, fontSize: "clamp(2.25rem, 5vw, 3.75rem)", lineHeight: 1.08, color: TEXT_HI, letterSpacing: "-0.02em", marginBottom: "1.5rem" }}>
          The intelligence layer that nobody else is building.
        </h1>
        <p style={{ fontFamily: SANS, fontWeight: 300, fontSize: "1.125rem", lineHeight: 1.75, color: TEXT_MID, maxWidth: "640px", marginBottom: "2rem" }}>
          We researched every winemaking and viticulture app on the market in 2026. The finding is unambiguous: no product answers winemakers' questions, knows their regulatory obligations, or reasons over their own documents. That gap is where Ownology lives — and it is unoccupied.
        </p>
        <div className="flex flex-wrap gap-4 items-center">
          <div className="px-4 py-2 rounded-full text-sm font-medium" style={{ background: "oklch(0.72 0.12 75 / 12%)", border: "1px solid oklch(0.72 0.12 75 / 30%)", color: AMBER, fontFamily: SANS }}>
            7 products researched
          </div>
          <div className="px-4 py-2 rounded-full text-sm font-medium" style={{ background: "oklch(0.72 0.12 75 / 12%)", border: "1px solid oklch(0.72 0.12 75 / 30%)", color: AMBER, fontFamily: SANS }}>
            0 direct competitors found
          </div>
          <div className="px-4 py-2 rounded-full text-sm font-medium" style={{ background: "oklch(0.72 0.12 75 / 12%)", border: "1px solid oklch(0.72 0.12 75 / 30%)", color: AMBER, fontFamily: SANS }}>
            1 market to watch
          </div>
        </div>
      </div>
    </section>
  );
}

// ─── The Gap section ──────────────────────────────────────────────────────────
function TheGap() {
  const { ref, inView } = useInView();
  const capabilities = [
    { label: "Answers natural language questions", sub: "grounded in your own documents and house style" },
    { label: "Australian state-by-state compliance", sub: "SA · VIC · NSW · WA · QLD · TAS in one place" },
    { label: "Cellar log + AI reasoning layer", sub: "structured data capture that the AI can reason over" },
    { label: "Mobile-first, cellar-floor design", sub: "built for use on a phone during harvest, not at a desk" },
  ];
  return (
    <section style={{ background: BG_RAISED, borderTop: `1px solid ${BORDER}`, borderBottom: `1px solid ${BORDER}` }} className="py-20">
      <div className="container max-w-4xl">
        <div ref={ref} className={`transition-all duration-700 ${inView ? "opacity-100 translate-y-0" : "opacity-0 translate-y-6"}`}>
          <p style={{ fontFamily: SANS, fontWeight: 700, fontSize: "0.7rem", letterSpacing: "0.18em", textTransform: "uppercase", color: AMBER, marginBottom: "1rem" }}>
            The Unoccupied Market
          </p>
          <h2 style={{ fontFamily: SERIF, fontWeight: 700, fontSize: "clamp(1.75rem, 4vw, 2.75rem)", lineHeight: 1.12, color: TEXT_HI, letterSpacing: "-0.02em", marginBottom: "1.25rem" }}>
            No product in this landscape does any of this.
          </h2>
          <p style={{ fontFamily: SANS, fontWeight: 300, fontSize: "1.0625rem", lineHeight: 1.75, color: TEXT_MID, maxWidth: "600px", marginBottom: "3rem" }}>
            After reviewing every commercially available winemaking and viticulture app — official websites, app store listings, Capterra reviews, academic publications — not one product provides the following capabilities.
          </p>
          <div className="grid sm:grid-cols-2 gap-4">
            {capabilities.map((c, i) => (
              <div key={i} className="flex gap-4 p-5 rounded-lg" style={{ background: BG_CARD, border: `1px solid ${BORDER}` }}>
                <div className="flex-shrink-0 w-8 h-8 rounded-full flex items-center justify-center mt-0.5" style={{ background: "oklch(0.72 0.12 75 / 15%)", border: "1px solid oklch(0.72 0.12 75 / 35%)" }}>
                  <svg width="14" height="14" viewBox="0 0 14 14" fill="none">
                    <path d="M2.5 7.5l3 3 6-6" stroke="oklch(0.72 0.12 75)" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round"/>
                  </svg>
                </div>
                <div>
                  <p style={{ fontFamily: SANS, fontWeight: 600, fontSize: "0.9375rem", color: TEXT_HI, marginBottom: "0.25rem" }}>{c.label}</p>
                  <p style={{ fontFamily: SANS, fontWeight: 300, fontSize: "0.8125rem", color: TEXT_LO, lineHeight: 1.5 }}>{c.sub}</p>
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>
    </section>
  );
}

// ─── Competitor grid ──────────────────────────────────────────────────────────
type ThreatLevel = "None" | "Low" | "Moderate";

interface Competitor {
  name: string;
  category: string;
  description: string;
  aiFeatures: string;
  compliance: string;
  threat: ThreatLevel;
  status: "Active" | "Abandoned" | "Uncertain";
  verdict: string;
}

const COMPETITORS: Competitor[] = [
  {
    name: "InnoVint",
    category: "Winery Management SaaS",
    description: "The most credible product on the list. Founded 2013, 4.6/5 on Capterra. Covers production management, inventory, batch tracking, and TTB compliance for US wineries.",
    aiFeatures: "None detected",
    compliance: "US TTB form-filling only",
    threat: "Moderate",
    status: "Active",
    verdict: "A record-keeping system, not an intelligence layer. It stores what you did. It cannot tell you what to do. No AI, no document-grounded Q&A, no Australian compliance. Ownology is complementary — not a replacement.",
  },
  {
    name: "PlantVoice",
    category: "Viticulture IoT Sensor Platform",
    description: "Italian hardware company (Bolzano). Physical sensors attach to vines and measure sap flow in real time. Cloud AI classifies water stress and pathogen risk. Enterprise pricing.",
    aiFeatures: "Sensor data classifier (ML)",
    compliance: "ESG sustainability reports only",
    threat: "None",
    status: "Active",
    verdict: "Operates in the vineyard before harvest at the plant physiology level. No cellar log, no winemaking knowledge, no Australian regulatory awareness. The AI is a sensor classifier — not a language model.",
  },
  {
    name: "Winemaker Manager",
    category: "Android Cellar Operations App",
    description: "Free ad-supported Android app by independent developer Radek Mezuláník. Cellar management, vineyard management, and static encyclopedias of pests and wine defects.",
    aiFeatures: "None — static encyclopedias",
    compliance: "None detected",
    threat: "Low",
    status: "Active",
    verdict: "The encyclopedia features are conceptually adjacent to Ownology's knowledge layer — but they are static reference books, not an AI that can answer your specific question about your specific tank.",
  },
  {
    name: "iWineMaker",
    category: "Calculator App (iOS)",
    description: "$4.99 iOS app by VinoEnology (Sebastopol, CA). Launched 2009. Calculators for fermentation, SO₂ addition, acidification, chaptalization, fining, blending, and more.",
    aiFeatures: "None",
    compliance: "None detected",
    threat: "Low",
    status: "Abandoned",
    verdict: "A calculator does arithmetic. It does not store data, understand your house style, or reason over anything. Ownology's planned Calculations tab supersedes this with context.",
  },
  {
    name: "EnoFile",
    category: "Hobbyist Tracker (iOS)",
    description: "Free iOS app by Brew Ventures (Walnut, CA) for home winemakers. Logs batches, ingredients, readings, and observations. Tagline: 'Better than paper!'",
    aiFeatures: "None",
    compliance: "None detected",
    threat: "None",
    status: "Uncertain",
    verdict: "Entirely different market. A boutique winery producing 5,000+ cases is not in the same consideration set as a hobbyist making 20 litres of Shiraz at home.",
  },
  {
    name: "VitisFlower",
    category: "Academic Research Tool",
    description: "Android app by University of La Rioja (Spain), 2015. Uses computer vision to count flowers per inflorescence for yield estimation. Published as a companion to a PLOS ONE paper.",
    aiFeatures: "Computer vision (OpenCV)",
    compliance: "None",
    threat: "None",
    status: "Abandoned",
    verdict: "A research prototype last updated in December 2015. No longer available on Google Play. No commercial distribution, no cellar features, no winemaking knowledge.",
  },
  {
    name: "Vineyard Growth Manager",
    category: "Android Task Manager",
    description: "Free Android app by Computer Aide Limited. Documents vineyard operations, grape growth, and harvest data. No user reviews. No longer available on Google Play Store.",
    aiFeatures: "None",
    compliance: "None",
    threat: "None",
    status: "Abandoned",
    verdict: "Effectively delisted. Even when active, it was a basic task management tool with no AI, no compliance features, and no knowledge base.",
  },
];

const THREAT_STYLES: Record<ThreatLevel, { bg: string; text: string; label: string }> = {
  None:     { bg: "oklch(0.20 0.010 60)", text: "oklch(0.55 0.010 75)", label: "No Threat" },
  Low:      { bg: "oklch(0.22 0.04 145 / 40%)", text: "oklch(0.68 0.10 145)", label: "Low" },
  Moderate: { bg: "oklch(0.22 0.08 75 / 40%)", text: "oklch(0.72 0.12 75)", label: "Monitor" },
};

const STATUS_STYLES: Record<string, { color: string }> = {
  Active:    { color: "oklch(0.68 0.10 145)" },
  Abandoned: { color: "oklch(0.55 0.010 75)" },
  Uncertain: { color: "oklch(0.65 0.08 55)" },
};

function CompetitorGrid() {
  const { ref, inView } = useInView();
  return (
    <section style={{ background: BG_BASE }} className="py-20">
      <div className="container max-w-5xl">
        <div ref={ref} className={`transition-all duration-700 ${inView ? "opacity-100 translate-y-0" : "opacity-0 translate-y-6"}`}>
          <p style={{ fontFamily: SANS, fontWeight: 700, fontSize: "0.7rem", letterSpacing: "0.18em", textTransform: "uppercase", color: AMBER, marginBottom: "1rem" }}>
            Product-by-Product Analysis
          </p>
          <h2 style={{ fontFamily: SERIF, fontWeight: 700, fontSize: "clamp(1.75rem, 4vw, 2.75rem)", lineHeight: 1.12, color: TEXT_HI, letterSpacing: "-0.02em", marginBottom: "1rem" }}>
            Seven products. Zero direct competitors.
          </h2>
          <p style={{ fontFamily: SANS, fontWeight: 300, fontSize: "1.0625rem", lineHeight: 1.75, color: TEXT_MID, maxWidth: "600px", marginBottom: "3rem" }}>
            Each product was evaluated against Ownology's core capabilities: AI-powered Q&A, document grounding, Australian compliance intelligence, structured cellar logging, and mobile-first design.
          </p>
          <div className="flex flex-col gap-4">
            {COMPETITORS.map((c, i) => {
              const threat = THREAT_STYLES[c.threat];
              const status = STATUS_STYLES[c.status];
              return (
                <div key={i} className="rounded-xl overflow-hidden" style={{ background: BG_CARD, border: `1px solid ${BORDER}` }}>
                  {/* Header row */}
                  <div className="flex flex-wrap items-start justify-between gap-3 p-5 pb-4" style={{ borderBottom: `1px solid ${BORDER}` }}>
                    <div>
                      <div className="flex items-center gap-3 flex-wrap">
                        <h3 style={{ fontFamily: SERIF, fontWeight: 600, fontSize: "1.125rem", color: TEXT_HI }}>{c.name}</h3>
                        <span style={{ fontFamily: SANS, fontSize: "0.75rem", color: TEXT_LO, fontWeight: 300 }}>{c.category}</span>
                      </div>
                    </div>
                    <div className="flex items-center gap-2 flex-wrap">
                      {/* Status badge */}
                      <span className="flex items-center gap-1.5 px-3 py-1 rounded-full text-xs" style={{ background: BG_INSET, color: status.color, fontFamily: SANS }}>
                        <span className="w-1.5 h-1.5 rounded-full inline-block" style={{ background: status.color }} />
                        {c.status}
                      </span>
                      {/* Threat badge */}
                      <span className="px-3 py-1 rounded-full text-xs font-semibold" style={{ background: threat.bg, color: threat.text, fontFamily: SANS }}>
                        {threat.label}
                      </span>
                    </div>
                  </div>
                  {/* Body */}
                  <div className="p-5 grid md:grid-cols-3 gap-5">
                    <div className="md:col-span-2">
                      <p style={{ fontFamily: SANS, fontWeight: 300, fontSize: "0.875rem", lineHeight: 1.65, color: TEXT_MID, marginBottom: "1rem" }}>{c.description}</p>
                      <div className="flex flex-wrap gap-4 text-xs" style={{ fontFamily: MONO }}>
                        <span style={{ color: TEXT_LO }}>AI: <span style={{ color: c.aiFeatures === "None" || c.aiFeatures === "None detected" ? TEXT_LO : AMBER }}>{c.aiFeatures}</span></span>
                        <span style={{ color: TEXT_LO }}>Compliance: <span style={{ color: c.compliance === "None detected" || c.compliance === "None" ? TEXT_LO : AMBER }}>{c.compliance}</span></span>
                      </div>
                    </div>
                    <div className="rounded-lg p-4" style={{ background: BG_INSET, border: `1px solid ${BORDER}` }}>
                      <p style={{ fontFamily: SANS, fontWeight: 700, fontSize: "0.65rem", letterSpacing: "0.12em", textTransform: "uppercase", color: AMBER, marginBottom: "0.625rem" }}>Verdict</p>
                      <p style={{ fontFamily: SANS, fontWeight: 300, fontSize: "0.8125rem", lineHeight: 1.6, color: TEXT_MID }}>{c.verdict}</p>
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      </div>
    </section>
  );
}

// ─── Feature matrix ───────────────────────────────────────────────────────────
function FeatureMatrix() {
  const { ref, inView } = useInView();

  const features = [
    "AI-powered Q&A",
    "Document grounding",
    "Australian compliance",
    "Cellar log",
    "Mobile-first",
    "Active development",
  ];

  type ProductRow = { name: string; values: (boolean | "partial" | "sensor")[]; note?: string };
  const products: ProductRow[] = [
    { name: "Ownology",              values: [true, true, true, true, true, true], note: "Only product with all six" },
    { name: "InnoVint",              values: [false, false, false, true, "partial", true] },
    { name: "PlantVoice",            values: ["sensor", false, false, false, true, true] },
    { name: "Winemaker Manager",     values: [false, false, false, true, true, true] },
    { name: "iWineMaker",            values: [false, false, false, false, true, false] },
    { name: "EnoFile",               values: [false, false, false, true, true, false] },
    { name: "VitisFlower",           values: [false, false, false, false, true, false] },
    { name: "Vineyard Growth Mgr",   values: [false, false, false, false, true, false] },
  ];

  const renderCell = (v: boolean | "partial" | "sensor") => {
    if (v === true) return (
      <span className="flex items-center justify-center">
        <svg width="16" height="16" viewBox="0 0 16 16" fill="none">
          <circle cx="8" cy="8" r="7" fill="oklch(0.72 0.12 75 / 20%)" stroke="oklch(0.72 0.12 75 / 50%)"/>
          <path d="M4.5 8.5l2.5 2.5 4.5-5" stroke="oklch(0.72 0.12 75)" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"/>
        </svg>
      </span>
    );
    if (v === "partial") return <span style={{ color: "oklch(0.65 0.08 55)", fontFamily: MONO, fontSize: "0.75rem" }}>partial</span>;
    if (v === "sensor") return <span style={{ color: TEXT_LO, fontFamily: MONO, fontSize: "0.75rem" }}>sensor</span>;
    return (
      <span className="flex items-center justify-center">
        <svg width="14" height="14" viewBox="0 0 14 14" fill="none">
          <path d="M3 3l8 8M11 3l-8 8" stroke="oklch(0.40 0.010 75)" strokeWidth="1.5" strokeLinecap="round"/>
        </svg>
      </span>
    );
  };

  return (
    <section style={{ background: BG_RAISED, borderTop: `1px solid ${BORDER}`, borderBottom: `1px solid ${BORDER}` }} className="py-20">
      <div className="container max-w-5xl">
        <div ref={ref} className={`transition-all duration-700 ${inView ? "opacity-100 translate-y-0" : "opacity-0 translate-y-6"}`}>
          <p style={{ fontFamily: SANS, fontWeight: 700, fontSize: "0.7rem", letterSpacing: "0.18em", textTransform: "uppercase", color: AMBER, marginBottom: "1rem" }}>
            Feature Matrix
          </p>
          <h2 style={{ fontFamily: SERIF, fontWeight: 700, fontSize: "clamp(1.75rem, 4vw, 2.75rem)", lineHeight: 1.12, color: TEXT_HI, letterSpacing: "-0.02em", marginBottom: "2.5rem" }}>
            Side by side, the picture is clear.
          </h2>
          <div className="overflow-x-auto rounded-xl" style={{ border: `1px solid ${BORDER_MD}` }}>
            <table className="w-full min-w-[640px]" style={{ borderCollapse: "collapse" }}>
              <thead>
                <tr style={{ background: BG_INSET }}>
                  <th className="text-left px-5 py-3.5" style={{ fontFamily: SANS, fontWeight: 600, fontSize: "0.8125rem", color: TEXT_LO, borderBottom: `1px solid ${BORDER_MD}` }}>
                    Product
                  </th>
                  {features.map(f => (
                    <th key={f} className="text-center px-3 py-3.5" style={{ fontFamily: SANS, fontWeight: 600, fontSize: "0.75rem", color: TEXT_LO, borderBottom: `1px solid ${BORDER_MD}`, whiteSpace: "nowrap" }}>
                      {f}
                    </th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {products.map((p, i) => {
                  const isOwnology = p.name === "Ownology";
                  return (
                    <tr
                      key={i}
                      style={{
                        background: isOwnology ? "oklch(0.72 0.12 75 / 8%)" : i % 2 === 0 ? BG_CARD : BG_BASE,
                        borderBottom: `1px solid ${BORDER}`,
                      }}
                    >
                      <td className="px-5 py-3.5">
                        <div className="flex items-center gap-2">
                          <span style={{ fontFamily: SANS, fontWeight: isOwnology ? 700 : 400, fontSize: "0.875rem", color: isOwnology ? AMBER : TEXT_MID }}>
                            {p.name}
                          </span>
                          {p.note && (
                            <span className="px-2 py-0.5 rounded text-xs" style={{ background: "oklch(0.72 0.12 75 / 15%)", color: AMBER, fontFamily: SANS, fontWeight: 600 }}>
                              {p.note}
                            </span>
                          )}
                        </div>
                      </td>
                      {p.values.map((v, j) => (
                        <td key={j} className="text-center px-3 py-3.5">
                          {renderCell(v)}
                        </td>
                      ))}
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
          <p style={{ fontFamily: SANS, fontWeight: 300, fontSize: "0.8125rem", color: TEXT_LO, marginTop: "1rem" }}>
            Research conducted May 2026. "partial" = iOS only. "sensor" = ML applied to hardware sensor data, not language understanding.
          </p>
        </div>
      </div>
    </section>
  );
}

// ─── The intelligence layer explainer ─────────────────────────────────────────
function IntelligenceLayer() {
  const { ref, inView } = useInView();
  return (
    <section style={{ background: BG_BASE }} className="py-20">
      <div className="container max-w-4xl">
        <div ref={ref} className={`transition-all duration-700 ${inView ? "opacity-100 translate-y-0" : "opacity-0 translate-y-6"}`}>
          <p style={{ fontFamily: SANS, fontWeight: 700, fontSize: "0.7rem", letterSpacing: "0.18em", textTransform: "uppercase", color: AMBER, marginBottom: "1rem" }}>
            Ownology's Position
          </p>
          <h2 style={{ fontFamily: SERIF, fontWeight: 700, fontSize: "clamp(1.75rem, 4vw, 2.75rem)", lineHeight: 1.12, color: TEXT_HI, letterSpacing: "-0.02em", marginBottom: "1.5rem" }}>
            The difference between a library and a librarian.
          </h2>
          <p style={{ fontFamily: SANS, fontWeight: 300, fontSize: "1.0625rem", lineHeight: 1.75, color: TEXT_MID, maxWidth: "640px", marginBottom: "3rem" }}>
            Every other product on this list is a library — it stores information, records data, or runs calculations. Ownology is the librarian who has read everything in it and can answer your specific question about your specific tank, your specific vintage, your specific regulatory obligation, right now, from your phone.
          </p>

          {/* Three-column distinction */}
          <div className="grid md:grid-cols-3 gap-5 mb-12">
            {[
              {
                icon: "📋",
                title: "Record-keeping systems",
                examples: "InnoVint, Winemaker Manager, EnoFile",
                desc: "Store what you did. Cannot tell you what to do next. No reasoning, no questions answered.",
                ownology: false,
              },
              {
                icon: "🔢",
                title: "Calculator apps",
                examples: "iWineMaker",
                desc: "Do arithmetic on numbers you provide. No context, no house style, no regulatory awareness.",
                ownology: false,
              },
              {
                icon: "🧠",
                title: "Intelligence layer",
                examples: "Ownology",
                desc: "Answers questions. Reasons over your documents. Knows your regulatory obligations. Learns your house style.",
                ownology: true,
              },
            ].map((col, i) => (
              <div key={i} className="p-5 rounded-xl" style={{
                background: col.ownology ? "oklch(0.72 0.12 75 / 10%)" : BG_CARD,
                border: col.ownology ? "1px solid oklch(0.72 0.12 75 / 35%)" : `1px solid ${BORDER}`,
              }}>
                <div className="text-2xl mb-3">{col.icon}</div>
                <p style={{ fontFamily: SERIF, fontWeight: 600, fontSize: "1rem", color: col.ownology ? AMBER : TEXT_HI, marginBottom: "0.375rem" }}>{col.title}</p>
                <p style={{ fontFamily: MONO, fontSize: "0.7rem", color: TEXT_LO, marginBottom: "0.75rem" }}>{col.examples}</p>
                <p style={{ fontFamily: SANS, fontWeight: 300, fontSize: "0.875rem", lineHeight: 1.6, color: TEXT_MID }}>{col.desc}</p>
              </div>
            ))}
          </div>

          {/* InnoVint partnership framing */}
          <div className="rounded-xl p-6" style={{ background: BG_CARD, border: `1px solid ${BORDER_MD}` }}>
            <div className="flex gap-4 items-start">
              <div className="flex-shrink-0 w-10 h-10 rounded-lg flex items-center justify-center" style={{ background: "oklch(0.65 0.10 230 / 15%)", border: "1px solid oklch(0.65 0.10 230 / 30%)" }}>
                <svg width="16" height="16" viewBox="0 0 16 16" fill="none">
                  <path d="M8 2v12M2 8h12" stroke="oklch(0.65 0.10 230)" strokeWidth="1.8" strokeLinecap="round"/>
                </svg>
              </div>
              <div>
                <p style={{ fontFamily: SANS, fontWeight: 700, fontSize: "0.875rem", color: TEXT_HI, marginBottom: "0.5rem" }}>
                  Already using InnoVint or Vintrace?
                </p>
                <p style={{ fontFamily: SANS, fontWeight: 300, fontSize: "0.9375rem", lineHeight: 1.7, color: TEXT_MID }}>
                  Ownology is not a replacement — it is the intelligence layer that sits on top of whatever system you already use. The pitch is not "switch." The pitch is "your current system records what you did. Ownology tells you what to do next."
                </p>
              </div>
            </div>
          </div>
        </div>
      </div>
    </section>
  );
}

// ─── Moat section ─────────────────────────────────────────────────────────────
function AustralianMoat() {
  const { ref, inView } = useInView();
  const states = [
    { code: "SA", name: "South Australia", items: ["Liquor licensing (LBSA)", "EPA environmental authority", "SafeWork SA WHS"] },
    { code: "VIC", name: "Victoria", items: ["VCGLR licensing", "EPA Victoria", "WorkSafe Victoria"] },
    { code: "NSW", name: "New South Wales", items: ["LGNSW licensing", "EPA NSW", "SafeWork NSW"] },
    { code: "WA", name: "Western Australia", items: ["DLGSC liquor", "DWER environmental", "WorkSafe WA"] },
    { code: "QLD", name: "Queensland", items: ["OLGR licensing", "DESI environmental", "WorkSafe QLD"] },
    { code: "TAS", name: "Tasmania", items: ["CBOS licensing", "EPA Tasmania", "WorkSafe Tasmania"] },
  ];
  return (
    <section style={{ background: BG_RAISED, borderTop: `1px solid ${BORDER}`, borderBottom: `1px solid ${BORDER}` }} className="py-20">
      <div className="container max-w-5xl">
        <div ref={ref} className={`transition-all duration-700 ${inView ? "opacity-100 translate-y-0" : "opacity-0 translate-y-6"}`}>
          <p style={{ fontFamily: SANS, fontWeight: 700, fontSize: "0.7rem", letterSpacing: "0.18em", textTransform: "uppercase", color: AMBER, marginBottom: "1rem" }}>
            The Australian Compliance Moat
          </p>
          <h2 style={{ fontFamily: SERIF, fontWeight: 700, fontSize: "clamp(1.75rem, 4vw, 2.75rem)", lineHeight: 1.12, color: TEXT_HI, letterSpacing: "-0.02em", marginBottom: "1.25rem" }}>
            No competitor has this. Not one.
          </h2>
          <p style={{ fontFamily: SANS, fontWeight: 300, fontSize: "1.0625rem", lineHeight: 1.75, color: TEXT_MID, maxWidth: "600px", marginBottom: "3rem" }}>
            InnoVint automates US TTB form-filling. Every other product on the list has zero compliance features. Ownology is the only tool with deep, state-by-state Australian regulatory intelligence — covering liquor licensing, environmental authority obligations, and WHS requirements across all six major wine states.
          </p>
          <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-4">
            {states.map((s) => (
              <div key={s.code} className="p-4 rounded-lg" style={{ background: BG_CARD, border: `1px solid ${BORDER}` }}>
                <div className="flex items-center gap-3 mb-3">
                  <div className="w-9 h-9 rounded-md flex items-center justify-center flex-shrink-0" style={{ background: "oklch(0.72 0.12 75 / 12%)", border: "1px solid oklch(0.72 0.12 75 / 25%)" }}>
                    <span style={{ fontFamily: MONO, fontWeight: 700, fontSize: "0.75rem", color: AMBER }}>{s.code}</span>
                  </div>
                  <span style={{ fontFamily: SANS, fontWeight: 600, fontSize: "0.875rem", color: TEXT_HI }}>{s.name}</span>
                </div>
                <ul className="space-y-1">
                  {s.items.map((item, j) => (
                    <li key={j} className="flex items-center gap-2">
                      <span className="w-1 h-1 rounded-full flex-shrink-0" style={{ background: AMBER }} />
                      <span style={{ fontFamily: SANS, fontWeight: 300, fontSize: "0.8rem", color: TEXT_MID }}>{item}</span>
                    </li>
                  ))}
                </ul>
              </div>
            ))}
          </div>
        </div>
      </div>
    </section>
  );
}

// ─── Investment thesis section ─────────────────────────────────────────────────
function InvestmentThesis() {
  const { ref, inView } = useInView();
  return (
    <section style={{ background: BG_BASE }} className="py-20">
      <div className="container max-w-4xl">
        <div ref={ref} className={`transition-all duration-700 ${inView ? "opacity-100 translate-y-0" : "opacity-0 translate-y-6"}`}>
          <p style={{ fontFamily: SANS, fontWeight: 700, fontSize: "0.7rem", letterSpacing: "0.18em", textTransform: "uppercase", color: AMBER, marginBottom: "1rem" }}>
            The Investment Thesis
          </p>
          <h2 style={{ fontFamily: SERIF, fontWeight: 700, fontSize: "clamp(1.75rem, 4vw, 2.75rem)", lineHeight: 1.12, color: TEXT_HI, letterSpacing: "-0.02em", marginBottom: "1.5rem" }}>
            The risk is not competition. The risk is speed.
          </h2>
          <p style={{ fontFamily: SANS, fontWeight: 300, fontSize: "1.0625rem", lineHeight: 1.75, color: TEXT_MID, maxWidth: "640px", marginBottom: "2.5rem" }}>
            The market for AI-powered winemaking intelligence is, as of 2026, effectively unoccupied. The question is not "will someone beat us to this?" — it is "how do we get in front of the right winemakers fast enough to build the distribution moat before a well-funded competitor enters?"
          </p>
          <div className="grid sm:grid-cols-3 gap-5">
            {[
              { stat: "0", label: "Direct competitors", sub: "No product occupies the same market position" },
              { stat: "6", label: "Australian states covered", sub: "SA · VIC · NSW · WA · QLD · TAS" },
              { stat: "1", label: "Product to watch", sub: "InnoVint — no AI yet, but the distribution exists" },
            ].map((s, i) => (
              <div key={i} className="text-center p-6 rounded-xl" style={{ background: BG_CARD, border: `1px solid ${BORDER}` }}>
                <p style={{ fontFamily: SERIF, fontWeight: 700, fontSize: "3rem", color: AMBER, lineHeight: 1, marginBottom: "0.5rem" }}>{s.stat}</p>
                <p style={{ fontFamily: SANS, fontWeight: 600, fontSize: "0.9375rem", color: TEXT_HI, marginBottom: "0.375rem" }}>{s.label}</p>
                <p style={{ fontFamily: SANS, fontWeight: 300, fontSize: "0.8125rem", color: TEXT_LO, lineHeight: 1.5 }}>{s.sub}</p>
              </div>
            ))}
          </div>
        </div>
      </div>
    </section>
  );
}

// ─── CTA ──────────────────────────────────────────────────────────────────────
function CTA() {
  const { ref, inView } = useInView();
  const [email, setEmail] = useState("");
  const [status, setStatus] = useState<"idle" | "loading" | "success" | "error">("idle");
  const [errorMsg, setErrorMsg] = useState("");

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!email.trim() || status === "loading") return;
    setStatus("loading");
    setErrorMsg("");
    try {
      const res = await fetch("https://api.buttondown.email/v1/subscribers", {
        method: "POST",
        headers: { "Content-Type": "application/json", Authorization: `Token ${import.meta.env.VITE_BUTTONDOWN_API_KEY ?? ""}` },
        body: JSON.stringify({ email_address: email, tags: ["waitlist", "competitive-advantage"] }),
      });
      if (res.status === 201 || res.status === 200 || res.status === 422) {
        setStatus("success");
        setEmail("");
      } else {
        throw new Error("Signup failed");
      }
    } catch {
      setStatus("error");
      setErrorMsg("Something went wrong. Please try again or email hello@ownology.ai");
    }
  };

  return (
    <section style={{ background: BG_RAISED, borderTop: `1px solid ${BORDER}` }} className="py-20">
      <div className="container max-w-2xl text-center">
        <div ref={ref} className={`transition-all duration-700 ${inView ? "opacity-100 translate-y-0" : "opacity-0 translate-y-6"}`}>
          <h2 style={{ fontFamily: SERIF, fontWeight: 700, fontSize: "clamp(1.75rem, 4vw, 2.5rem)", lineHeight: 1.12, color: TEXT_HI, letterSpacing: "-0.02em", marginBottom: "1.25rem" }}>
            Be first in an unoccupied market.
          </h2>
          <p style={{ fontFamily: SANS, fontWeight: 300, fontSize: "1.0625rem", lineHeight: 1.75, color: TEXT_MID, marginBottom: "2.5rem" }}>
            Join the founding member waitlist and get early access before the intelligence layer becomes table stakes for every boutique winery in Australia.
          </p>
          {status === "success" ? (
            <div className="py-6 px-8 rounded-sm inline-block" style={{ background: "oklch(0.72 0.12 75 / 10%)", border: "1px solid oklch(0.72 0.12 75 / 30%)" }}>
              <p style={{ fontFamily: SERIF, fontWeight: 500, fontSize: "1.125rem", color: TEXT_HI }}>You're on the list. We'll be in touch.</p>
              <p style={{ fontFamily: SANS, fontWeight: 300, fontSize: "0.875rem", color: TEXT_MID, marginTop: "0.5rem" }}>In the meantime, explore the full site at <a href="/" style={{ color: AMBER }}>ownology.ai</a></p>
            </div>
          ) : (
            <form onSubmit={handleSubmit} className="flex flex-col sm:flex-row gap-3 max-w-md mx-auto mb-6">
              <input
                type="email"
                required
                value={email}
                onChange={e => setEmail(e.target.value)}
                placeholder="your@winery.com"
                disabled={status === "loading"}
                style={{ flex: 1, background: BG_BASE, border: "1px solid var(--ow-border-md)", borderRadius: "2px", padding: "0.75rem 1rem", fontFamily: SANS, fontSize: "0.9375rem", color: TEXT_HI, outline: "none" }}
                onFocus={e => (e.currentTarget.style.borderColor = AMBER)}
                onBlur={e => (e.currentTarget.style.borderColor = "var(--ow-border-md)")}
              />
              <button type="submit" disabled={status === "loading"} className="btn-amber flex-shrink-0" style={{ opacity: status === "loading" ? 0.7 : 1 }}>
                {status === "loading" ? "Joining..." : "Join Waitlist"}
              </button>
            </form>
          )}
          {status === "error" && (
            <p style={{ fontFamily: SANS, fontSize: "0.875rem", color: "oklch(0.65 0.15 30)", marginBottom: "1rem" }}>{errorMsg}</p>
          )}
          <p style={{ fontFamily: SANS, fontWeight: 300, fontSize: "0.8125rem", color: TEXT_LO, marginTop: "1.5rem" }}>
            Or{" "}
            <Link href="/why-ownology" style={{ color: AMBER, textDecoration: "underline" }}>
              read how Ownology compares to InnoVint and Vintrace
            </Link>
            {" "}in detail.
          </p>
        </div>
      </div>
    </section>
  );
}

// ─── Footer ───────────────────────────────────────────────────────────────────
function Footer() {
  return (
    <footer style={{ background: BG_BASE, borderTop: `1px solid ${BORDER}` }} className="py-10">
      <div className="container flex flex-col sm:flex-row items-center justify-between gap-4">
        <OwnologyLogo size={24} />
        <p style={{ fontFamily: SANS, fontWeight: 300, fontSize: "0.8125rem", color: TEXT_LO }}>
          Competitive research conducted May 2026. Landscape changes — reviewed every 6 months.
        </p>
        <Link href="/" style={{ fontFamily: SANS, fontWeight: 300, fontSize: "0.8125rem", color: TEXT_LO }}>
          ← Back to Home
        </Link>
      </div>
    </footer>
  );
}

// ─── Page ─────────────────────────────────────────────────────────────────────
export default function CompetitiveAdvantage() {
  useEffect(() => {
    document.title = "Competitive Advantage — Ownology";
  }, []);

  return (
    <div style={{ background: BG_BASE, minHeight: "100vh" }}>
      <Nav />
      <Hero />
      <TheGap />
      <CompetitorGrid />
      <FeatureMatrix />
      <IntelligenceLayer />
      <AustralianMoat />
      <InvestmentThesis />
      <CTA />
      <Footer />
    </div>
  );
}
