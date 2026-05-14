/**
 * THE PRESS — The Working Board
 * "The press extracts what free run cannot reach. Depth. Complexity. The full picture."
 *
 * UI shell for the vintage log, calculation history, notes, and cellar scenarios.
 * Full functionality wired in the 4-week education build.
 */

import { useEffect, useRef, useState } from "react";
import { Link } from "wouter";
import { trpc } from "@/lib/trpc";
import { getLoginUrl } from "@/const";
import VintageEntrySheet from "@/components/VintageEntrySheet";

// ─── Types ────────────────────────────────────────────────────────────────────
interface VintageEntry {
  id: string;
  date: string;
  tank: string;
  variety: string;
  note: string;
  tags: string[];
}

interface CalcEntry {
  id: string;
  type: string;
  inputs: string;
  result: string;
  date: string;
}

// ─── Placeholder data ─────────────────────────────────────────────────────────
const SAMPLE_VINTAGE_ENTRIES: VintageEntry[] = [
  {
    id: "1",
    date: "14 Feb",
    tank: "Tank 7",
    variety: "Shiraz",
    note: "Brix 24.3, YAN 120ppm. Added 2.6kg DAP at inoculation. Ferment tracking well.",
    tags: ["DAP addition", "YAN", "inoculation"],
  },
  {
    id: "2",
    date: "16 Feb",
    tank: "Tank 3",
    variety: "Cabernet Sauvignon",
    note: "MLF inoculated with VP41. Free SO₂ at 12ppm. Racked off gross lees.",
    tags: ["MLF", "SO₂", "racking"],
  },
  {
    id: "3",
    date: "18 Feb",
    tank: "Tank 12",
    variety: "Chardonnay",
    note: "Cold stabilisation started. Temp set to -4°C. Tartrate crystals forming well.",
    tags: ["cold stab", "tartrate", "white"],
  },
];

const SAMPLE_CALC_ENTRIES: CalcEntry[] = [
  { id: "1", type: "DAP Addition", inputs: "YAN: 120ppm → target 200ppm, volume: 5,000L", result: "2.6 kg DAP", date: "14 Feb" },
  { id: "2", type: "SO₂ Correction", inputs: "Free SO₂: 12ppm → target 30ppm, pH: 3.45, volume: 8,000L", result: "Add 18g SO₂", date: "16 Feb" },
  { id: "3", type: "Acid Addition", inputs: "TA: 5.8 g/L → target 6.5 g/L, volume: 3,200L", result: "Add 2.24 kg tartaric acid", date: "17 Feb" },
];

const CELLAR_SCENARIOS = [
  {
    title: "Stuck Fermentation",
    description: "Tank 7 Shiraz has stalled at 4.2 Brix. Temperature is 18°C, YAN was 120ppm at inoculation. What do you do?",
    urgency: "high",
    domain: "Fermentation",
  },
  {
    title: "Brett Contamination Suspected",
    description: "Your Cabernet has a faint barnyard note at racking. Describe your investigation and intervention protocol.",
    urgency: "high",
    domain: "Microbiology",
  },
  {
    title: "Volatile Acidity Spike",
    description: "VA has risen to 0.9 g/L in your Grenache. MLF is still in progress. What are your options?",
    urgency: "medium",
    domain: "Chemistry",
  },
  {
    title: "Harvest Scheduling Conflict",
    description: "You have three varieties ready to pick on the same day and only two tanks available. How do you prioritise?",
    urgency: "medium",
    domain: "Operations",
  },
];

const URGENCY_COLORS: Record<string, string> = {
  high: "oklch(0.62 0.10 45)",   // terracotta
  medium: "oklch(0.72 0.12 75)", // amber
  low: "oklch(0.65 0.10 230)",   // blue
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

// ─── Section header ───────────────────────────────────────────────────────────
function SectionHeader({ label, title, subtitle }: { label: string; title: string; subtitle?: string }) {
  return (
    <div className="mb-6">
      <p className="section-label mb-2" style={{ fontFamily: "'Lato',sans-serif", fontSize: "0.65rem", letterSpacing: "0.14em" }}>
        {label}
      </p>
      <h2 style={{ fontFamily: "'Fraunces',serif", fontWeight: 700, fontSize: "clamp(1.25rem,2.5vw,1.75rem)", lineHeight: 1.15, color: "var(--ow-text-hi)" }}>
        {title}
      </h2>
      {subtitle && (
        <p className="mt-1" style={{ fontFamily: "'Lato',sans-serif", fontWeight: 300, fontSize: "0.875rem", lineHeight: 1.65, color: "var(--ow-text-lo)", fontStyle: "italic" }}>
          {subtitle}
        </p>
      )}
    </div>
  );
}

// ─── Main component ───────────────────────────────────────────────────────────
export default function ThePress() {
  const [activeTab, setActiveTab] = useState<"log" | "calcs" | "scenarios" | "notes">("log");
  const [noteText, setNoteText] = useState("");
  const [entrySheetOpen, setEntrySheetOpen] = useState(false);
  const [quickEntryTank, setQuickEntryTank] = useState<string | undefined>(undefined);
  // Filter state
  const [filterTank, setFilterTank] = useState("");
  const [filterVariety, setFilterVariety] = useState("");
  const [filterEventType, setFilterEventType] = useState("");
  const [filterText, setFilterText] = useState("");
  const [filterTag, setFilterTag] = useState("");
  const headerRef = useInView(0.1);
  const contentRef = useInView(0.05);

  // Live vintage log data (requires auth — errors are handled gracefully)
  const { data: logEntries, refetch: refetchLog } = trpc.vintageLog.list.useQuery(
    { limit: 100 },
    { retry: false }
  );
  const isLoggedIn = logEntries !== undefined || false;
  const hasEntries = logEntries && logEntries.length > 0;

  // Derived filter options from live data
  const allTanks = logEntries ? Array.from(new Set(logEntries.map((e) => e.tankName))) : [];
  const allVarieties = logEntries ? Array.from(new Set(logEntries.map((e) => e.variety))) : [];
  const allTags = logEntries
    ? Array.from(new Set(logEntries.flatMap((e) => e.tags))).sort()
    : [];

  // Filtered entries
  const filteredEntries = (logEntries ?? []).filter((entry) => {
    if (filterTank && entry.tankName !== filterTank) return false;
    if (filterVariety && entry.variety !== filterVariety) return false;
    if (filterEventType && entry.eventType !== filterEventType) return false;
    if (filterTag && !entry.tags.includes(filterTag)) return false;
    if (filterText) {
      const needle = filterText.toLowerCase();
      const haystack = [
        entry.tankName, entry.variety, entry.eventType, entry.noteText ?? "",
        ...entry.tags,
        ...Object.values(entry.details as Record<string, string>),
      ].join(" ").toLowerCase();
      if (!haystack.includes(needle)) return false;
    }
    return true;
  });
  const isFiltered = filterTank || filterVariety || filterEventType || filterTag || filterText;

  const tabs = [
    { id: "log" as const, label: "Vintage Log", icon: "📋" },
    { id: "calcs" as const, label: "Calculations", icon: "⚗" },
    { id: "scenarios" as const, label: "Cellar Scenarios", icon: "🔬" },
    { id: "notes" as const, label: "Notes", icon: "✏" },
  ];

  return (
    <div style={{ background: "var(--ow-bg-base)", minHeight: "100vh" }}>
      {/* Back nav */}
      <div className="container pt-6 pb-0" style={{ maxWidth: "960px", margin: "0 auto" }}>
        <Link href="/" className="inline-flex items-center gap-2 text-xs" style={{ color: "var(--ow-text-lo)", fontFamily: "'Lato',sans-serif", textDecoration: "none" }}>
          <svg width="14" height="14" viewBox="0 0 14 14" fill="none">
            <path d="M9 2L4 7l5 5" stroke="currentColor" strokeWidth="1.4" strokeLinecap="round" strokeLinejoin="round" />
          </svg>
          Back to Ownology
        </Link>
      </div>

      <div className="container pt-10 pb-24" style={{ maxWidth: "960px", margin: "0 auto" }}>

        {/* ── Header ── */}
        <div ref={headerRef.ref} className={`mb-10 ${headerRef.inView ? "fade-up" : "opacity-0"}`}>
          {/* Board identity */}
          <div className="flex items-center gap-3 mb-6">
            <Link
              href="/free-run"
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
              <span style={{ fontSize: "0.8rem" }}>◈</span>
              ← FREE RUN
            </Link>
            <div
              className="h-px flex-1"
              style={{ background: "linear-gradient(to right, transparent, color-mix(in oklch, var(--ow-amber) 20%, transparent))" }}
            />
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
              <span style={{ fontSize: "0.8rem" }}>⊞</span>
              THE PRESS
            </div>
          </div>

          <p className="section-label mb-4" style={{ fontFamily: "'Lato',sans-serif", fontSize: "0.7rem", letterSpacing: "0.12em" }}>
            Your Working Board
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
            The <em style={{ color: "var(--ow-amber)", fontStyle: "italic" }}>Press</em>
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
            The press extracts what free run cannot reach. Depth. Complexity. The full picture. This is where the vintage is recorded and run — every decision, every calculation, every lesson applied under pressure.
          </p>
          <p
            className="mt-2"
            style={{
              fontFamily: "'Lato',sans-serif",
              fontWeight: 300,
              fontSize: "0.875rem",
              lineHeight: 1.7,
              color: "var(--ow-text-lo)",
              fontStyle: "italic",
            }}
          >
            *Le pressoir extrait ce que le jus de goutte ne peut atteindre.*
          </p>

          {/* Vintage season indicator */}
          <div className="mt-6 flex items-center gap-4 flex-wrap">
            <div
              className="inline-flex items-center gap-2 px-4 py-2 rounded-sm"
              style={{
                background: "var(--ow-bg-card)",
                border: "1px solid var(--ow-border)",
              }}
            >
              <div className="w-2 h-2 rounded-full" style={{ background: "var(--ow-amber)", boxShadow: "0 0 6px var(--ow-amber)" }} />
              <span style={{ fontFamily: "'Fira Code',monospace", fontSize: "0.75rem", color: "var(--ow-text-mid)", letterSpacing: "0.06em" }}>
                VINTAGE 2026 — IN PROGRESS
              </span>
            </div>
            <div
              className="inline-flex items-center gap-2 px-4 py-2 rounded-sm"
              style={{ background: "var(--ow-bg-card)", border: "1px solid var(--ow-border)" }}
            >
              <span style={{ fontFamily: "'Fira Code',monospace", fontSize: "0.75rem", color: "var(--ow-text-lo)", letterSpacing: "0.06em" }}>
                {SAMPLE_VINTAGE_ENTRIES.length} LOG ENTRIES · {SAMPLE_CALC_ENTRIES.length} CALCULATIONS
              </span>
            </div>
          </div>
        </div>

        {/* ── Tab navigation ── */}
        <div
          className="flex gap-1 mb-8 p-1 rounded-sm"
          style={{ background: "var(--ow-bg-card)", border: "1px solid var(--ow-border)", width: "fit-content" }}
        >
          {tabs.map(tab => (
            <button
              key={tab.id}
              onClick={() => setActiveTab(tab.id)}
              className="px-4 py-2 rounded-sm text-xs transition-all flex items-center gap-2"
              style={{
                fontFamily: "'Lato',sans-serif",
                letterSpacing: "0.05em",
                fontWeight: activeTab === tab.id ? 600 : 300,
                background: activeTab === tab.id
                  ? "color-mix(in oklch, var(--ow-amber) 15%, transparent)"
                  : "transparent",
                border: activeTab === tab.id
                  ? "1px solid color-mix(in oklch, var(--ow-amber) 40%, transparent)"
                  : "1px solid transparent",
                color: activeTab === tab.id ? "var(--ow-amber)" : "var(--ow-text-lo)",
                cursor: "pointer",
              }}
            >
              <span>{tab.icon}</span>
              {tab.label}
            </button>
          ))}
        </div>

        {/* ── Tab content ── */}
        <div ref={contentRef.ref} className={contentRef.inView ? "fade-up" : "opacity-0"}>

          {/* Vintage Log */}
          {activeTab === "log" && (
            <div>
              <div className="flex items-start justify-between gap-4 mb-6">
                <SectionHeader
                  label="Carnet de Cave"
                  title="Vintage Log"
                  subtitle="Every decision, every tank, every vintage — your permanent cellar record."
                />
                {/* Add Entry button — shown when authenticated */}
                {logEntries !== undefined && (
                  <button
                    type="button"
                    onClick={() => { setQuickEntryTank(undefined); setEntrySheetOpen(true); }}
                    className="flex-shrink-0 flex items-center gap-2 px-4 py-2.5 rounded-sm text-sm font-semibold transition-all mt-1"
                    style={{
                      background: "var(--ow-amber)",
                      color: "oklch(0.11 0.008 60)",
                      border: "none",
                      fontFamily: "'Lato',sans-serif",
                      cursor: "pointer",
                    }}
                  >
                    <svg width="14" height="14" viewBox="0 0 14 14" fill="none">
                      <circle cx="7" cy="7" r="6" stroke="currentColor" strokeWidth="1.3" />
                      <path d="M7 4v6M4 7h6" stroke="currentColor" strokeWidth="1.3" strokeLinecap="round" />
                    </svg>
                    Add Entry
                  </button>
                )}
              </div>

              {/* Not logged in — prompt to sign in */}
              {logEntries === undefined && (
                <div
                  className="mb-6 p-5 rounded-sm flex items-center justify-between gap-4"
                  style={{ background: "var(--ow-bg-card)", border: "1px solid var(--ow-border)" }}
                >
                  <div>
                    <p style={{ fontFamily: "'Lato',sans-serif", fontSize: "0.9rem", fontWeight: 600, color: "var(--ow-text-hi)" }}>
                      Sign in to start your Vintage Log
                    </p>
                    <p style={{ fontFamily: "'Lato',sans-serif", fontSize: "0.8125rem", color: "var(--ow-text-lo)", marginTop: "0.25rem" }}>
                      Your log is private to your account and persists across sessions.
                    </p>
                  </div>
                  <a
                    href={getLoginUrl()}
                    className="flex-shrink-0 px-4 py-2.5 rounded-sm text-sm font-semibold"
                    style={{
                      background: "var(--ow-amber)",
                      color: "oklch(0.11 0.008 60)",
                      fontFamily: "'Lato',sans-serif",
                      textDecoration: "none",
                    }}
                  >
                    Sign in
                  </a>
                </div>
              )}

              {/* Empty state — logged in but no entries yet */}
              {logEntries !== undefined && !hasEntries && (
                <button
                  type="button"
                  onClick={() => { setQuickEntryTank(undefined); setEntrySheetOpen(true); }}
                  className="w-full mb-6 p-6 rounded-sm flex flex-col items-center gap-3 transition-all"
                  style={{
                    background: "var(--ow-bg-card)",
                    border: "1px dashed var(--ow-border-md)",
                    cursor: "pointer",
                  }}
                  onMouseEnter={(e) => (e.currentTarget.style.borderColor = "var(--ow-amber)")}
                  onMouseLeave={(e) => (e.currentTarget.style.borderColor = "var(--ow-border-md)")}
                >
                  <svg width="32" height="32" viewBox="0 0 32 32" fill="none">
                    <circle cx="16" cy="16" r="14" stroke="var(--ow-border-md)" strokeWidth="1.5" />
                    <path d="M16 10v12M10 16h12" stroke="var(--ow-amber)" strokeWidth="1.5" strokeLinecap="round" />
                  </svg>
                  <div className="text-center">
                    <p style={{ fontFamily: "'Lato',sans-serif", fontSize: "0.9rem", fontWeight: 600, color: "var(--ow-text-hi)" }}>
                      Log your first entry
                    </p>
                    <p style={{ fontFamily: "'Lato',sans-serif", fontSize: "0.8125rem", color: "var(--ow-text-lo)", marginTop: "0.25rem" }}>
                      Tap to open the guided entry sheet
                    </p>
                  </div>
                </button>
              )}

              {/* Filter bar — only shown when there are entries */}
              {hasEntries && (
                <div className="mb-5 flex flex-wrap gap-2 items-center">
                  {/* Text search */}
                  <div className="relative flex-1 min-w-[160px]">
                    <svg className="absolute left-3 top-1/2 -translate-y-1/2" width="12" height="12" viewBox="0 0 12 12" fill="none">
                      <circle cx="5" cy="5" r="4" stroke="var(--ow-text-lo)" strokeWidth="1.2"/>
                      <path d="M8.5 8.5l2 2" stroke="var(--ow-text-lo)" strokeWidth="1.2" strokeLinecap="round"/>
                    </svg>
                    <input
                      type="text"
                      placeholder="Search entries…"
                      value={filterText}
                      onChange={(e) => setFilterText(e.target.value)}
                      className="w-full pl-8 pr-3 py-2 rounded-sm text-xs"
                      style={{
                        background: "var(--ow-bg-inset)",
                        border: "1px solid var(--ow-border)",
                        color: "var(--ow-text-hi)",
                        fontFamily: "'Lato',sans-serif",
                        outline: "none",
                      }}
                    />
                  </div>
                  {/* Tank filter */}
                  {allTanks.length > 1 && (
                    <select
                      value={filterTank}
                      onChange={(e) => setFilterTank(e.target.value)}
                      className="px-3 py-2 rounded-sm text-xs"
                      style={{
                        background: filterTank ? "color-mix(in oklch, var(--ow-amber) 12%, var(--ow-bg-inset))" : "var(--ow-bg-inset)",
                        border: filterTank ? "1px solid color-mix(in oklch, var(--ow-amber) 40%, transparent)" : "1px solid var(--ow-border)",
                        color: filterTank ? "var(--ow-amber)" : "var(--ow-text-lo)",
                        fontFamily: "'Fira Code',monospace",
                        cursor: "pointer",
                      }}
                    >
                      <option value="">All tanks</option>
                      {allTanks.map((t) => <option key={t} value={t}>{t}</option>)}
                    </select>
                  )}
                  {/* Variety filter */}
                  {allVarieties.length > 1 && (
                    <select
                      value={filterVariety}
                      onChange={(e) => setFilterVariety(e.target.value)}
                      className="px-3 py-2 rounded-sm text-xs"
                      style={{
                        background: filterVariety ? "color-mix(in oklch, var(--ow-amber) 12%, var(--ow-bg-inset))" : "var(--ow-bg-inset)",
                        border: filterVariety ? "1px solid color-mix(in oklch, var(--ow-amber) 40%, transparent)" : "1px solid var(--ow-border)",
                        color: filterVariety ? "var(--ow-amber)" : "var(--ow-text-lo)",
                        fontFamily: "'Lato',sans-serif",
                        cursor: "pointer",
                      }}
                    >
                      <option value="">All varieties</option>
                      {allVarieties.map((v) => <option key={v} value={v}>{v}</option>)}
                    </select>
                  )}
                  {/* Event type filter */}
                  <select
                    value={filterEventType}
                    onChange={(e) => setFilterEventType(e.target.value)}
                    className="px-3 py-2 rounded-sm text-xs"
                    style={{
                      background: filterEventType ? "color-mix(in oklch, var(--ow-amber) 12%, var(--ow-bg-inset))" : "var(--ow-bg-inset)",
                      border: filterEventType ? "1px solid color-mix(in oklch, var(--ow-amber) 40%, transparent)" : "1px solid var(--ow-border)",
                      color: filterEventType ? "var(--ow-amber)" : "var(--ow-text-lo)",
                      fontFamily: "'Fira Code',monospace",
                      cursor: "pointer",
                    }}
                  >
                    <option value="">All events</option>
                    {["addition","measurement","racking","inoculation","observation","other"].map((et) => (
                      <option key={et} value={et}>{et}</option>
                    ))}
                  </select>
                  {/* Tag filter */}
                  {allTags.length > 0 && (
                    <select
                      value={filterTag}
                      onChange={(e) => setFilterTag(e.target.value)}
                      className="px-3 py-2 rounded-sm text-xs"
                      style={{
                        background: filterTag ? "color-mix(in oklch, var(--ow-amber) 12%, var(--ow-bg-inset))" : "var(--ow-bg-inset)",
                        border: filterTag ? "1px solid color-mix(in oklch, var(--ow-amber) 40%, transparent)" : "1px solid var(--ow-border)",
                        color: filterTag ? "var(--ow-amber)" : "var(--ow-text-lo)",
                        fontFamily: "'Fira Code',monospace",
                        cursor: "pointer",
                      }}
                    >
                      <option value="">All tags</option>
                      {allTags.map((tag) => <option key={tag} value={tag}>{tag}</option>)}
                    </select>
                  )}
                  {/* Clear filters */}
                  {isFiltered && (
                    <button
                      type="button"
                      onClick={() => { setFilterTank(""); setFilterVariety(""); setFilterEventType(""); setFilterTag(""); setFilterText(""); }}
                      className="px-3 py-2 rounded-sm text-xs transition-colors"
                      style={{
                        background: "transparent",
                        border: "1px solid var(--ow-border)",
                        color: "var(--ow-text-lo)",
                        fontFamily: "'Lato',sans-serif",
                        cursor: "pointer",
                      }}
                    >
                      Clear
                    </button>
                  )}
                </div>
              )}

              {/* Live entries */}
              {hasEntries && (
                <div className="flex flex-col gap-4">
                  {filteredEntries.length === 0 && isFiltered && (
                    <p className="text-center py-8" style={{ fontFamily: "'Lato',sans-serif", fontSize: "0.875rem", color: "var(--ow-text-lo)", fontStyle: "italic" }}>
                      No entries match your filters.
                    </p>
                  )}
                  {filteredEntries.map((entry) => {
                    const EVENT_ICONS: Record<string, string> = {
                      addition: "⊕", measurement: "◎", racking: "⇄",
                      inoculation: "✦", observation: "◉", other: "◈",
                    };
                    const icon = EVENT_ICONS[entry.eventType] ?? "◈";
                    const dateStr = new Date(entry.entryAt).toLocaleDateString("en-AU", { day: "numeric", month: "short" });

                    // Build a human-readable summary line from details
                    let summaryLine = "";
                    const d = entry.details as Record<string, string>;
                    if (entry.eventType === "addition" && d.what) {
                      summaryLine = `${d.what}${d.quantity ? " · " + d.quantity + (d.unit ?? "") : ""}${d.timing ? " · " + d.timing : ""}`;
                    } else if (entry.eventType === "measurement" && d.what) {
                      summaryLine = `${d.what}: ${d.value ?? ""}`;
                    } else if (entry.eventType === "racking") {
                      summaryLine = `${d.fromLocation ?? ""} → ${d.toLocation ?? ""}${d.volumeL ? " · " + d.volumeL + "L" : ""}`;
                    } else if (entry.eventType === "inoculation" && d.what) {
                      summaryLine = `${d.what} · ${d.productName ?? ""}${d.rate ? " · " + d.rate + " g/hL" : ""}`;
                    } else if ((entry.eventType === "observation" || entry.eventType === "other") && d.text) {
                      summaryLine = d.text.slice(0, 120);
                    }

                    return (
                      <div
                        key={entry.id}
                        className="cellar-card p-5"
                        style={{ border: "1px solid var(--ow-border)" }}
                      >
                        <div className="flex items-start justify-between gap-4 mb-2">
                          <div className="flex items-center gap-3 flex-wrap">
                            <span style={{ fontFamily: "'Fira Code',monospace", fontSize: "0.7rem", color: "var(--ow-text-lo)", letterSpacing: "0.06em", whiteSpace: "nowrap" }}>
                              {dateStr}
                            </span>
                            <span
                              className="px-2 py-0.5 rounded-sm"
                              style={{
                                fontFamily: "'Fira Code',monospace", fontSize: "0.7rem",
                                color: "var(--ow-amber)",
                                background: "color-mix(in oklch, var(--ow-amber) 10%, transparent)",
                                border: "1px solid color-mix(in oklch, var(--ow-amber) 25%, transparent)",
                              }}
                            >
                              {entry.tankName}
                            </span>
                            <span style={{ fontFamily: "'Lato',sans-serif", fontSize: "0.8125rem", fontWeight: 600, color: "var(--ow-text-hi)" }}>
                              {entry.variety}
                            </span>
                          </div>
                          <div className="flex items-center gap-2 flex-shrink-0">
                            <span
                              className="px-2 py-0.5 rounded-sm text-xs flex items-center gap-1"
                              style={{
                                fontFamily: "'Fira Code',monospace", fontSize: "0.65rem",
                                color: "var(--ow-text-mid)",
                                background: "var(--ow-bg-inset)",
                                border: "1px solid var(--ow-border)",
                              }}
                            >
                              <span>{icon}</span>
                              {entry.eventType}
                            </span>
                            {/* Quick-entry button: add another entry for same tank */}
                            <button
                              type="button"
                              onClick={() => { setQuickEntryTank(entry.tankName); setEntrySheetOpen(true); }}
                              title={`Add entry for ${entry.tankName}`}
                              className="w-6 h-6 rounded-sm flex items-center justify-center transition-colors"
                              style={{ background: "var(--ow-bg-inset)", border: "1px solid var(--ow-border)", color: "var(--ow-text-lo)", cursor: "pointer" }}
                            >
                              <svg width="10" height="10" viewBox="0 0 10 10" fill="none">
                                <path d="M5 2v6M2 5h6" stroke="currentColor" strokeWidth="1.3" strokeLinecap="round" />
                              </svg>
                            </button>
                          </div>
                        </div>

                        {summaryLine && (
                          <p style={{ fontFamily: "'Lato',sans-serif", fontWeight: 400, fontSize: "0.875rem", lineHeight: 1.65, color: "var(--ow-text-mid)", marginBottom: "0.5rem" }}>
                            {summaryLine}
                          </p>
                        )}

                        {entry.noteText && (
                          <p style={{ fontFamily: "'Lato',sans-serif", fontWeight: 300, fontSize: "0.8125rem", lineHeight: 1.65, color: "var(--ow-text-lo)", fontStyle: "italic" }}>
                            {entry.noteText}
                          </p>
                        )}

                        {entry.tags.length > 0 && (
                          <div className="flex flex-wrap gap-2 mt-3">
                            {entry.tags.map((tag) => (
                              <span
                                key={tag}
                                className="px-2 py-0.5 rounded-sm"
                                style={{
                                  fontFamily: "'Fira Code',monospace", fontSize: "0.65rem",
                                  color: "var(--ow-text-lo)",
                                  background: "var(--ow-bg-inset)",
                                  border: "1px solid var(--ow-border)",
                                  letterSpacing: "0.04em",
                                }}
                              >
                                {tag}
                              </span>
                            ))}
                          </div>
                        )}
                      </div>
                    );
                  })}
                </div>
              )}

              {/* Guided entry sheet */}
              <VintageEntrySheet
                open={entrySheetOpen}
                onClose={() => setEntrySheetOpen(false)}
                onSaved={() => { setEntrySheetOpen(false); refetchLog(); }}
                prefillTank={quickEntryTank}
              />
            </div>
          )}

          {/* Calculations */}
          {activeTab === "calcs" && (
            <div>
              <SectionHeader
                label="The Numbers"
                title="Calculation History"
                subtitle="Every DAP addition, SO₂ correction, and acid adjustment — saved and searchable."
              />

              <div
                className="mb-6 p-4 rounded-sm flex items-center gap-3"
                style={{ background: "var(--ow-bg-card)", border: "1px dashed var(--ow-border)", cursor: "not-allowed", opacity: 0.7 }}
              >
                <svg width="16" height="16" viewBox="0 0 16 16" fill="none">
                  <circle cx="8" cy="8" r="7" stroke="var(--ow-text-lo)" strokeWidth="1.2" />
                  <path d="M8 5v6M5 8h6" stroke="var(--ow-text-lo)" strokeWidth="1.2" strokeLinecap="round" />
                </svg>
                <span style={{ fontFamily: "'Lato',sans-serif", fontSize: "0.875rem", color: "var(--ow-text-lo)", fontStyle: "italic" }}>
                  Run a calculation via the Compliance agent — it saves here automatically
                </span>
              </div>

              <div className="flex flex-col gap-3">
                {SAMPLE_CALC_ENTRIES.map(calc => (
                  <div
                    key={calc.id}
                    className="cellar-card p-5 flex items-start gap-5"
                    style={{ border: "1px solid var(--ow-border)" }}
                  >
                    <div
                      className="w-10 h-10 rounded-sm flex items-center justify-center flex-shrink-0"
                      style={{ background: "color-mix(in oklch, var(--ow-amber) 10%, transparent)", border: "1px solid color-mix(in oklch, var(--ow-amber) 25%, transparent)" }}
                    >
                      <span style={{ fontSize: "1.1rem" }}>⚗</span>
                    </div>
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-3 mb-1">
                        <span style={{ fontFamily: "'Fraunces',serif", fontWeight: 600, fontSize: "0.9375rem", color: "var(--ow-text-hi)" }}>
                          {calc.type}
                        </span>
                        <span style={{ fontFamily: "'Fira Code',monospace", fontSize: "0.65rem", color: "var(--ow-text-lo)", letterSpacing: "0.06em" }}>
                          {calc.date}
                        </span>
                      </div>
                      <p style={{ fontFamily: "'Lato',sans-serif", fontSize: "0.8125rem", color: "var(--ow-text-lo)", marginBottom: "0.5rem" }}>
                        {calc.inputs}
                      </p>
                      <p
                        style={{
                          fontFamily: "'Fira Code',monospace",
                          fontSize: "0.875rem",
                          color: "var(--ow-amber)",
                          background: "color-mix(in oklch, var(--ow-amber) 8%, transparent)",
                          border: "1px solid color-mix(in oklch, var(--ow-amber) 20%, transparent)",
                          padding: "0.375rem 0.75rem",
                          borderRadius: "0.25rem",
                          display: "inline-block",
                        }}
                      >
                        → {calc.result}
                      </p>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Cellar Scenarios */}
          {activeTab === "scenarios" && (
            <div>
              <SectionHeader
                label="Apply the Knowledge"
                title="Cellar Scenarios"
                subtitle="Real winery situations that require applying what you have learned. Work through them with Ownology."
              />

              <div className="grid gap-4" style={{ gridTemplateColumns: "repeat(auto-fill, minmax(280px, 1fr))" }}>
                {CELLAR_SCENARIOS.map((scenario, i) => (
                  <div
                    key={i}
                    className="cellar-card p-5 flex flex-col gap-3"
                    style={{ border: "1px solid var(--ow-border)" }}
                  >
                    <div className="flex items-center gap-2">
                      <span
                        className="px-2 py-0.5 rounded-sm text-xs"
                        style={{
                          fontFamily: "'Fira Code',monospace",
                          fontSize: "0.65rem",
                          color: URGENCY_COLORS[scenario.urgency],
                          background: `color-mix(in oklch, ${URGENCY_COLORS[scenario.urgency]} 12%, transparent)`,
                          border: `1px solid color-mix(in oklch, ${URGENCY_COLORS[scenario.urgency]} 25%, transparent)`,
                          letterSpacing: "0.06em",
                        }}
                      >
                        {scenario.urgency === "high" ? "⚠ URGENT" : "◈ SCENARIO"}
                      </span>
                      <span
                        className="text-xs"
                        style={{ fontFamily: "'Lato',sans-serif", color: "var(--ow-text-lo)", letterSpacing: "0.06em" }}
                      >
                        {scenario.domain}
                      </span>
                    </div>
                    <h3
                      style={{
                        fontFamily: "'Fraunces',serif",
                        fontWeight: 600,
                        fontSize: "1rem",
                        lineHeight: 1.25,
                        color: "var(--ow-text-hi)",
                      }}
                    >
                      {scenario.title}
                    </h3>
                    <p
                      style={{
                        fontFamily: "'Lato',sans-serif",
                        fontWeight: 300,
                        fontSize: "0.8125rem",
                        lineHeight: 1.65,
                        color: "var(--ow-text-mid)",
                      }}
                    >
                      {scenario.description}
                    </p>
                    <div className="mt-auto pt-3" style={{ borderTop: "1px solid var(--ow-border)" }}>
                      <Link
                        href="/compliance"
                        className="text-xs flex items-center gap-1.5 transition-colors"
                        style={{
                          fontFamily: "'Lato',sans-serif",
                          color: "var(--ow-amber)",
                          textDecoration: "none",
                        }}
                      >
                        Work through this with Ownology →
                      </Link>
                    </div>
                  </div>
                ))}
              </div>

              <div
                className="mt-8 p-5 rounded-sm"
                style={{ background: "var(--ow-bg-card)", border: "1px dashed var(--ow-border)" }}
              >
                <p style={{ fontFamily: "'Lato',sans-serif", fontSize: "0.875rem", color: "var(--ow-text-lo)", fontStyle: "italic", textAlign: "center" }}>
                  Adaptive scenarios personalised to your winery type and current vintage phase — available in the education build.
                </p>
              </div>
            </div>
          )}

          {/* Notes */}
          {activeTab === "notes" && (
            <div>
              <SectionHeader
                label="The Chalk"
                title="Your Notes"
                subtitle="Write it, test it, wipe it, learn it. Nothing here is permanent."
              />

              <div
                className="rounded-sm overflow-hidden"
                style={{ border: "1px solid var(--ow-border)" }}
              >
                {/* Notes toolbar */}
                <div
                  className="flex items-center gap-2 px-4 py-2.5"
                  style={{ background: "var(--ow-bg-card)", borderBottom: "1px solid var(--ow-border)" }}
                >
                  {["B", "I", "—", "•", "⚗"].map(tool => (
                    <button
                      key={tool}
                      className="w-7 h-7 rounded-sm flex items-center justify-center text-xs transition-colors"
                      style={{
                        fontFamily: tool === "⚗" ? "inherit" : "'Fira Code',monospace",
                        color: "var(--ow-text-lo)",
                        background: "transparent",
                        border: "1px solid transparent",
                        cursor: "pointer",
                      }}
                      onMouseEnter={e => {
                        (e.currentTarget as HTMLButtonElement).style.background = "var(--ow-bg-inset)";
                        (e.currentTarget as HTMLButtonElement).style.borderColor = "var(--ow-border)";
                      }}
                      onMouseLeave={e => {
                        (e.currentTarget as HTMLButtonElement).style.background = "transparent";
                        (e.currentTarget as HTMLButtonElement).style.borderColor = "transparent";
                      }}
                    >
                      {tool}
                    </button>
                  ))}
                  <div className="ml-auto flex items-center gap-2">
                    <span style={{ fontFamily: "'Fira Code',monospace", fontSize: "0.65rem", color: "var(--ow-text-lo)" }}>
                      {noteText.length} chars
                    </span>
                  </div>
                </div>

                {/* Notes textarea */}
                <textarea
                  value={noteText}
                  onChange={e => setNoteText(e.target.value)}
                  placeholder={"Write it here. Test it. Wipe it. Learn it.\n\nYour notes are your chalk — tentative, erasable, forgiving.\nWhen understanding is earned, it moves to the vintage log.\n\n— Start with a question you cannot answer yet."}
                  className="w-full resize-none outline-none"
                  rows={14}
                  style={{
                    fontFamily: "'Lato',sans-serif",
                    fontWeight: 300,
                    fontSize: "0.9375rem",
                    lineHeight: 1.75,
                    color: "var(--ow-text-mid)",
                    background: "var(--ow-bg-base)",
                    padding: "1.25rem 1.5rem",
                    border: "none",
                  }}
                />

                {/* Notes footer */}
                <div
                  className="flex items-center justify-between px-4 py-2.5"
                  style={{ background: "var(--ow-bg-card)", borderTop: "1px solid var(--ow-border)" }}
                >
                  <span style={{ fontFamily: "'Lato',sans-serif", fontSize: "0.75rem", color: "var(--ow-text-lo)", fontStyle: "italic" }}>
                    Notes persist locally — cloud sync available in the education build
                  </span>
                  <button
                    className="px-3 py-1.5 rounded-sm text-xs transition-all"
                    style={{
                      fontFamily: "'Lato',sans-serif",
                      color: "var(--ow-amber)",
                      background: "color-mix(in oklch, var(--ow-amber) 10%, transparent)",
                      border: "1px solid color-mix(in oklch, var(--ow-amber) 25%, transparent)",
                      cursor: "pointer",
                    }}
                    onClick={() => setNoteText("")}
                  >
                    Clear
                  </button>
                </div>
              </div>

              {/* Ask Ownology about your notes */}
              <div
                className="mt-6 p-5 rounded-sm flex items-start gap-4"
                style={{ background: "var(--ow-bg-card)", border: "1px solid color-mix(in oklch, var(--ow-amber) 20%, transparent)" }}
              >
                <div
                  className="w-8 h-8 rounded-sm flex items-center justify-center flex-shrink-0"
                  style={{ background: "color-mix(in oklch, var(--ow-amber) 10%, transparent)", border: "1px solid color-mix(in oklch, var(--ow-amber) 25%, transparent)" }}
                >
                  <span style={{ fontSize: "1rem" }}>◈</span>
                </div>
                <div>
                  <p style={{ fontFamily: "'Fraunces',serif", fontWeight: 600, fontSize: "0.9375rem", color: "var(--ow-text-hi)", marginBottom: "0.375rem" }}>
                    Ask Ownology about your notes
                  </p>
                  <p style={{ fontFamily: "'Lato',sans-serif", fontWeight: 300, fontSize: "0.8125rem", lineHeight: 1.65, color: "var(--ow-text-mid)", marginBottom: "0.75rem" }}>
                    Paste a question from your notes into the Compliance agent and get a grounded answer from the knowledge base.
                  </p>
                  <Link
                    href="/compliance"
                    className="text-xs"
                    style={{ fontFamily: "'Lato',sans-serif", color: "var(--ow-amber)", textDecoration: "none" }}
                  >
                    Open Compliance Agent →
                  </Link>
                </div>
              </div>
            </div>
          )}
        </div>

        {/* ── Footer quote ── */}
        <div className="mt-20 text-center">
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
            "The Board does not forget. It records every decision, every calculation, every lesson applied under pressure."
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
