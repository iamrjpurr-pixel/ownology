/**
 * THE PRESS — The Working Board
 * "The press extracts what free run cannot reach. Depth. Complexity. The full picture."
 *
 * UI shell for the vintage log, calculation history, notes, and cellar scenarios.
 * Full functionality wired in the 4-week education build.
 */

import { useCallback, useEffect, useRef, useState, useMemo } from "react";
import { Link } from "wouter";
import { trpc } from "@/lib/trpc";
import { getLoginUrl } from "@/const";
import VintageEntrySheet from "@/components/VintageEntrySheet";
import TankReminderSheet from "@/components/TankReminderSheet";
import WineBatchSheet from "@/components/WineBatchSheet";

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
  // Batch Book state
  const [batchSheetOpen, setBatchSheetOpen] = useState(false);
  const [selectedBatchId, setSelectedBatchId] = useState<string | null>(null);
  const [expandedPhase, setExpandedPhase] = useState<string | null>("fermentation");
  const [savingPhase, setSavingPhase] = useState<string | null>(null);
  const [localNotes, setLocalNotes] = useState<Record<string, string>>({});
  const saveTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const [entrySheetOpen, setEntrySheetOpen] = useState(false);
  const [quickEntryTank, setQuickEntryTank] = useState<string | undefined>(undefined);
  const [reminderSheetOpen, setReminderSheetOpen] = useState(false);
  const [reminderDefaultTank, setReminderDefaultTank] = useState<string | undefined>(undefined);
  // Filter state
  const [filterTank, setFilterTank] = useState("");
  const [filterVariety, setFilterVariety] = useState("");
  const [filterEventType, setFilterEventType] = useState("");
  const [filterText, setFilterText] = useState("");
  const [filterTag, setFilterTag] = useState("");
  // Sort + pagination
  const [sortBy, setSortBy] = useState<"urgency" | "lastEvent" | "tank" | "additions">(() => {
    try { return (localStorage.getItem("press_sortBy") as "urgency" | "lastEvent" | "tank" | "additions") ?? "urgency"; } catch { return "urgency"; }
  });
  const [displayLimit, setDisplayLimit] = useState(20);
  // Pull-to-refresh
  const [isPulling, setIsPulling] = useState(false);
  const [pullY, setPullY] = useState(0);
  const pullStartY = useRef(0);
  const logListRef = useRef<HTMLDivElement>(null);
  const headerRef = useInView(0.1);
  const contentRef = useInView(0.05);

  // Live vintage log data (requires auth — errors are handled gracefully)
  const { data: logEntries, refetch: refetchLog } = trpc.vintageLog.list.useQuery(
    { limit: 100 },
    { retry: false }
  );

  const isLoggedIn = logEntries !== undefined;

  // Delete mutation
  const utils = trpc.useUtils();
  const deleteEntry = trpc.vintageLog.delete.useMutation({
    onSuccess: () => {
      utils.vintageLog.list.invalidate();
      utils.vintageLog.getUsedTanks.invalidate();
    },
  });

  // Swipe-to-delete state per entry
  const [swipedEntryId, setSwipedEntryId] = useState<number | null>(null);
  const [deletedIds, setDeletedIds] = useState<Set<number>>(new Set());
  const swipeStartX = useRef(0);
  const swipeCurrentX = useRef(0);

  // Wine batch data — always fetch (no auth gate while building)
  const { data: wineBatches, refetch: refetchBatches } = trpc.wineBatch.list.useQuery(
    undefined,
    { retry: false }
  );
  const selectedBatch = wineBatches?.find((b) => b.batchId === selectedBatchId) ?? wineBatches?.[0] ?? null;
  const updateNotesMutation = trpc.wineBatch.updateNotes.useMutation({
    onMutate: () => setSavingPhase("saving"),
    onSettled: () => setSavingPhase(null),
  });

  // Sync local notes when batch changes
  useEffect(() => {
    if (selectedBatch) {
      try {
        const parsed = JSON.parse(selectedBatch.notesJson ?? "{}") as Record<string, string>;
        setLocalNotes(parsed);
      } catch {
        setLocalNotes({});
      }
    } else {
      setLocalNotes({});
    }
  }, [selectedBatch?.batchId]);

  const handleNoteChange = useCallback((phase: string, value: string) => {
    setLocalNotes((prev) => ({ ...prev, [phase]: value }));
    if (saveTimerRef.current) clearTimeout(saveTimerRef.current);
    saveTimerRef.current = setTimeout(() => {
      if (!selectedBatch) return;
      const updated = { ...localNotes, [phase]: value };
      updateNotesMutation.mutate({ id: selectedBatch.id, notesJson: JSON.stringify(updated) });
    }, 900);
  }, [selectedBatch, localNotes, updateNotesMutation]);
  const hasEntries = logEntries && logEntries.length > 0;

  // Sorted tank cards
  const sortedTanks = useMemo(() => {
    if (!logEntries || logEntries.length === 0) return [];
    const tanks = Array.from(new Set(logEntries.map((e) => e.tankName)));
    return tanks.sort((a, b) => {
      const aEntries = logEntries.filter((e) => e.tankName === a);
      const bEntries = logEntries.filter((e) => e.tankName === b);
      if (sortBy === "tank") return a.localeCompare(b);
      if (sortBy === "additions") {
        return bEntries.filter((e) => e.eventType === "addition").length - aEntries.filter((e) => e.eventType === "addition").length;
      }
      const aLast = aEntries.reduce<Date | null>((d, e) => { const t = new Date(e.entryAt); return !d || t > d ? t : d; }, null);
      const bLast = bEntries.reduce<Date | null>((d, e) => { const t = new Date(e.entryAt); return !d || t > d ? t : d; }, null);
      if (sortBy === "lastEvent") {
        if (!aLast && !bLast) return 0;
        if (!aLast) return 1;
        if (!bLast) return -1;
        return bLast.getTime() - aLast.getTime();
      }
      // urgency: sort by days since inoculation DESC (most urgent = most days active)
      const aInoc = aEntries.find((e) => e.eventType === "inoculation");
      const bInoc = bEntries.find((e) => e.eventType === "inoculation");
      const aDays = aInoc ? Math.floor((Date.now() - new Date(aInoc.entryAt).getTime()) / 86400000) : -1;
      const bDays = bInoc ? Math.floor((Date.now() - new Date(bInoc.entryAt).getTime()) / 86400000) : -1;
      return bDays - aDays;
    });
  }, [logEntries, sortBy]);

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
    { id: "notes" as const, label: "Batch Book", icon: "📖" },
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

      <div className="container pt-10 pb-24 md:pb-24" style={{ maxWidth: "960px", margin: "0 auto", paddingBottom: "calc(6rem + env(safe-area-inset-bottom, 0px))" }}>

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
            <Link
              href="/cellar-tasks"
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
              <span style={{ fontSize: "0.8rem" }}>🧹</span>
              CELLAR TASKS
            </Link>
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
          className="flex gap-1 mb-8 p-1 rounded-sm overflow-x-auto"
          style={{
            background: "var(--ow-bg-card)",
            border: "1px solid var(--ow-border)",
            width: "100%",
            WebkitOverflowScrolling: "touch",
            scrollbarWidth: "none",
          }}
        >
          {tabs.map(tab => (
            <button
              key={tab.id}
              onClick={() => setActiveTab(tab.id)}
              className="flex-1 rounded-sm text-xs transition-all flex items-center justify-center gap-1.5"
              style={{
                fontFamily: "'Lato',sans-serif",
                letterSpacing: "0.04em",
                fontWeight: activeTab === tab.id ? 600 : 300,
                background: activeTab === tab.id
                  ? "color-mix(in oklch, var(--ow-amber) 15%, transparent)"
                  : "transparent",
                border: activeTab === tab.id
                  ? "1px solid color-mix(in oklch, var(--ow-amber) 40%, transparent)"
                  : "1px solid transparent",
                color: activeTab === tab.id ? "var(--ow-amber)" : "var(--ow-text-lo)",
                cursor: "pointer",
                minHeight: "44px",
                padding: "0.5rem 0.75rem",
                whiteSpace: "nowrap",
                touchAction: "manipulation",
              }}
            >
              <span>{tab.icon}</span>
              <span className="hidden sm:inline">{tab.label}</span>
              <span className="sm:hidden" style={{ fontSize: "0.65rem", letterSpacing: "0.06em" }}>{tab.label.split(" ")[0]}</span>
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
                {/* Add Entry + Reminders buttons — shown when authenticated */}
                {logEntries !== undefined && (
                  <div className="flex items-center gap-2 mt-1">
                    <Link
                      href="/quick-entry"
                      className="flex-shrink-0 flex items-center gap-1.5 px-3 py-2.5 rounded-sm text-sm transition-all"
                      style={{
                        background: "var(--ow-bg-card)",
                        color: "oklch(0.72 0.12 75)",
                        border: "1px solid var(--ow-border-md)",
                        fontFamily: "'Lato',sans-serif",
                        textDecoration: "none",
                      }}
                    >
                      <span>⚡</span>
                      <span className="hidden sm:inline">Quick Entry</span>
                    </Link>
                    <button
                      type="button"
                      onClick={() => { setReminderDefaultTank(undefined); setReminderSheetOpen(true); }}
                      title="Manage tank reminders"
                      className="flex-shrink-0 flex items-center gap-2 px-3 py-2.5 rounded-sm text-sm transition-all"
                      style={{
                        background: "var(--ow-bg-card)",
                        color: "var(--ow-amber)",
                        border: "1px solid var(--ow-border-md)",
                        fontFamily: "'Lato',sans-serif",
                        cursor: "pointer",
                      }}
                    >
                      <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                        <path d="M18 8A6 6 0 0 0 6 8c0 7-3 9-3 9h18s-3-2-3-9"/>
                        <path d="M13.73 21a2 2 0 0 1-3.46 0"/>
                      </svg>
                      <span className="hidden sm:inline">Reminders</span>
                    </button>
                    <button
                      type="button"
                      onClick={() => { setQuickEntryTank(undefined); setEntrySheetOpen(true); }}
                      className="flex-shrink-0 flex items-center gap-2 px-4 py-2.5 rounded-sm text-sm font-semibold transition-all"
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
                  </div>
                )}
              </div>

              {/* Sign-in gate removed during development */}

              {/* Empty state — no entries yet */}
              {!hasEntries && (
                <div className="mb-6">
                  {/* Welcome banner */}
                  <div
                    className="rounded-sm p-6 mb-4"
                    style={{ background: "var(--ow-bg-card)", border: "1px solid color-mix(in oklch, var(--ow-amber) 20%, transparent)" }}
                  >
                    {/* Press illustration */}
                    <svg width="72" height="56" viewBox="0 0 72 56" fill="none" aria-hidden="true" style={{ marginBottom: "1.25rem", opacity: 0.5 }}>
                      {/* Basket slats */}
                      <rect x="14" y="32" width="44" height="16" rx="1" stroke="var(--ow-amber)" strokeWidth="1.3" />
                      <line x1="22" y1="32" x2="22" y2="48" stroke="var(--ow-amber)" strokeWidth="0.9" strokeDasharray="2.5 2" />
                      <line x1="30" y1="32" x2="30" y2="48" stroke="var(--ow-amber)" strokeWidth="0.9" strokeDasharray="2.5 2" />
                      <line x1="38" y1="32" x2="38" y2="48" stroke="var(--ow-amber)" strokeWidth="0.9" strokeDasharray="2.5 2" />
                      <line x1="46" y1="32" x2="46" y2="48" stroke="var(--ow-amber)" strokeWidth="0.9" strokeDasharray="2.5 2" />
                      {/* Press plate */}
                      <rect x="11" y="25" width="50" height="7" rx="1" stroke="var(--ow-amber)" strokeWidth="1.3" />
                      {/* Screw shaft */}
                      <line x1="36" y1="3" x2="36" y2="25" stroke="var(--ow-amber)" strokeWidth="1.6" strokeLinecap="round" />
                      {/* Cross handle */}
                      <line x1="26" y1="7" x2="46" y2="7" stroke="var(--ow-amber)" strokeWidth="1.3" strokeLinecap="round" />
                      <line x1="36" y1="3" x2="36" y2="11" stroke="var(--ow-amber)" strokeWidth="1.3" strokeLinecap="round" />
                      {/* Drip lines */}
                      <path d="M20 48 Q20 53 18 53" stroke="var(--ow-amber)" strokeWidth="1" strokeLinecap="round" opacity="0.5" />
                      <path d="M52 48 Q52 53 54 53" stroke="var(--ow-amber)" strokeWidth="1" strokeLinecap="round" opacity="0.5" />
                      <path d="M36 48 Q36 54 36 54" stroke="var(--ow-amber)" strokeWidth="1" strokeLinecap="round" opacity="0.35" />
                    </svg>
                    <p style={{ fontFamily: "'Fira Code',monospace", fontSize: "0.65rem", color: "var(--ow-amber)", letterSpacing: "0.1em", marginBottom: "0.5rem" }}>WELCOME TO THE PRESS</p>
                    <p style={{ fontFamily: "'Fraunces',serif", fontWeight: 700, fontSize: "1.25rem", color: "var(--ow-text-hi)", marginBottom: "0.5rem" }}>
                      Your vintage log is ready.
                    </p>
                    <p style={{ fontFamily: "'Lato',sans-serif", fontWeight: 300, fontSize: "0.875rem", lineHeight: 1.7, color: "var(--ow-text-lo)", maxWidth: "520px", marginBottom: "1.25rem" }}>
                      Log every cellar event — additions, measurements, rackings, inoculations — and Ownology builds a permanent, searchable record of your vintage. Start with your first tank below.
                    </p>
                    <button
                      type="button"
                      onClick={() => { setQuickEntryTank(undefined); setEntrySheetOpen(true); }}
                      className="inline-flex items-center gap-2 px-5 py-2.5 rounded-sm text-sm font-semibold"
                      style={{ background: "var(--ow-amber)", color: "oklch(0.11 0.008 60)", fontFamily: "'Lato',sans-serif", cursor: "pointer", border: "none" }}
                    >
                      <svg width="12" height="12" viewBox="0 0 12 12" fill="none">
                        <path d="M6 1v10M1 6h10" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" />
                      </svg>
                      Log First Entry
                    </button>
                  </div>

                  {/* Quick-start guide */}
                  <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                    {[
                      { icon: "✦", label: "Inoculation", hint: "Record yeast strain, rate, YAN, and must temperature at pitch." },
                      { icon: "◎", label: "Measurement", hint: "Log Brix, pH, TA, free SO₂, temperature — any parameter, any time." },
                      { icon: "⊕", label: "Addition", hint: "Record DAP, SO₂, tartaric, bentonite — quantity, rate, and timing." },
                    ].map((item) => (
                      <button
                        key={item.label}
                        type="button"
                        onClick={() => { setQuickEntryTank(undefined); setEntrySheetOpen(true); }}
                        className="text-left p-4 rounded-sm transition-all"
                        style={{ background: "var(--ow-bg-card)", border: "1px solid var(--ow-border)", cursor: "pointer" }}
                        onMouseEnter={(e) => (e.currentTarget.style.borderColor = "color-mix(in oklch, var(--ow-amber) 40%, transparent)")}
                        onMouseLeave={(e) => (e.currentTarget.style.borderColor = "var(--ow-border)")}
                      >
                        <span style={{ fontSize: "1.1rem", color: "var(--ow-amber)", display: "block", marginBottom: "0.5rem" }}>{item.icon}</span>
                        <p style={{ fontFamily: "'Fraunces',serif", fontWeight: 600, fontSize: "0.875rem", color: "var(--ow-text-hi)", marginBottom: "0.25rem" }}>{item.label}</p>
                        <p style={{ fontFamily: "'Lato',sans-serif", fontWeight: 300, fontSize: "0.75rem", lineHeight: 1.6, color: "var(--ow-text-lo)" }}>{item.hint}</p>
                      </button>
                    ))}
                  </div>

                  {/* Batch Book nudge */}
                  <div
                    className="mt-3 px-4 py-3 rounded-sm flex items-center justify-between gap-4"
                    style={{ background: "var(--ow-bg-inset)", border: "1px solid var(--ow-border)" }}
                  >
                    <p style={{ fontFamily: "'Lato',sans-serif", fontWeight: 300, fontSize: "0.8125rem", color: "var(--ow-text-lo)" }}>
                      <strong style={{ color: "var(--ow-text-mid)" }}>Also:</strong> Register a wine batch in the <em>Batch Book</em> tab to create your LIP-compliant Winemaker's Log with vintage, variety, GI, and grower details.
                    </p>
                    <button
                      type="button"
                      onClick={() => setActiveTab("notes")}
                      className="flex-shrink-0 text-xs px-3 py-1.5 rounded-sm"
                      style={{ background: "transparent", border: "1px solid var(--ow-border)", color: "var(--ow-amber)", fontFamily: "'Lato',sans-serif", cursor: "pointer" }}
                    >
                      Open Batch Book
                    </button>
                  </div>
                </div>
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

              {/* Batch summary cards — one per tank */}
              {hasEntries && sortedTanks.length > 0 && (
                <div className="mb-6">
                  {/* Header row: label + sort dropdown */}
                  <div className="flex items-center justify-between gap-3 mb-3">
                    <p className="text-xs tracking-wider uppercase" style={{ color: "var(--ow-text-lo)", fontFamily: "'Lato',sans-serif", letterSpacing: "0.1em" }}>
                      Tank Summary
                    </p>
                    <select
                      value={sortBy}
                      onChange={(e) => {
                        const v = e.target.value as typeof sortBy;
                        setSortBy(v);
                        try { localStorage.setItem("press_sortBy", v); } catch {}
                      }}
                      className="px-3 py-1.5 rounded-sm text-xs"
                      style={{
                        background: "var(--ow-bg-inset)",
                        border: "1px solid var(--ow-border)",
                        color: "var(--ow-text-lo)",
                        fontFamily: "'Fira Code',monospace",
                        cursor: "pointer",
                        minHeight: "36px",
                      }}
                    >
                      <option value="urgency">Sort: Urgency</option>
                      <option value="lastEvent">Sort: Last event</option>
                      <option value="tank">Sort: Tank name</option>
                      <option value="additions">Sort: Additions</option>
                    </select>
                  </div>
                  <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
                    {sortedTanks.map((tank) => {
                      const tankEntries = (logEntries ?? []).filter((e) => e.tankName === tank);
                      const totalAdditions = tankEntries.filter((e) => e.eventType === "addition").length;
                      const lastEntry = tankEntries.reduce<(typeof tankEntries)[0] | null>((latest, e) =>
                        !latest || new Date(e.entryAt) > new Date(latest.entryAt) ? e : latest, null
                      );
                      const inoculationEntry = tankEntries.find((e) => e.eventType === "inoculation");
                      const daysSinceInoculation = inoculationEntry
                        ? Math.floor((Date.now() - new Date(inoculationEntry.entryAt).getTime()) / (1000 * 60 * 60 * 24))
                        : null;
                      const lastEventDate = lastEntry
                        ? new Date(lastEntry.entryAt).toLocaleDateString("en-AU", { day: "numeric", month: "short" })
                        : null;
                      const variety = lastEntry?.variety ?? "";

                      // Status colour ring: amber = active (≤14d), green = stable (>14d), grey = no inoc
                      const statusColor = daysSinceInoculation === null
                        ? "oklch(0.40 0.005 60)"   // grey — no inoculation recorded
                        : daysSinceInoculation <= 14
                        ? "var(--ow-amber)"         // amber — active ferment
                        : "oklch(0.62 0.14 145)";   // green — stable

                      return (
                        <div
                          key={tank}
                          className="rounded-sm overflow-hidden"
                          style={{
                            background: filterTank === tank
                              ? "color-mix(in oklch, var(--ow-amber) 10%, var(--ow-bg-card))"
                              : "var(--ow-bg-card)",
                            border: filterTank === tank
                              ? "1px solid color-mix(in oklch, var(--ow-amber) 50%, transparent)"
                              : "1px solid var(--ow-border)",
                            borderTop: `3px solid ${statusColor}`,
                          }}
                        >
                          {/* Tap-to-filter area */}
                          <button
                            type="button"
                            onClick={() => setFilterTank(filterTank === tank ? "" : tank)}
                            className="text-left p-4 w-full transition-all"
                            style={{ background: "transparent", border: "none", cursor: "pointer" }}
                          >
                          {/* Tank name + variety */}
                          <div className="flex items-center justify-between gap-2 mb-3">
                            <span
                              className="px-2 py-0.5 rounded-sm"
                              style={{
                                fontFamily: "'Fira Code',monospace",
                                fontSize: "0.7rem",
                                color: "var(--ow-amber)",
                                background: "color-mix(in oklch, var(--ow-amber) 10%, transparent)",
                                border: "1px solid color-mix(in oklch, var(--ow-amber) 25%, transparent)",
                                letterSpacing: "0.06em",
                              }}
                            >
                              {tank}
                            </span>
                            {variety && (
                              <span style={{ fontFamily: "'Lato',sans-serif", fontSize: "0.75rem", fontWeight: 600, color: "var(--ow-text-mid)" }}>
                                {variety}
                              </span>
                            )}
                          </div>

                          {/* Stats row */}
                          <div className="flex flex-wrap gap-3">
                            {/* Total additions */}
                            <div>
                              <p style={{ fontFamily: "'Fira Code',monospace", fontSize: "0.6rem", color: "var(--ow-text-lo)", letterSpacing: "0.08em", marginBottom: "0.15rem" }}>ADDITIONS</p>
                              <p style={{ fontFamily: "'Fraunces',serif", fontWeight: 700, fontSize: "1.1rem", color: "var(--ow-text-hi)", lineHeight: 1 }}>{totalAdditions}</p>
                            </div>

                            {/* Last event */}
                            {lastEntry && (
                              <div>
                                <p style={{ fontFamily: "'Fira Code',monospace", fontSize: "0.6rem", color: "var(--ow-text-lo)", letterSpacing: "0.08em", marginBottom: "0.15rem" }}>LAST EVENT</p>
                                <p style={{ fontFamily: "'Lato',sans-serif", fontSize: "0.75rem", color: "var(--ow-text-mid)", lineHeight: 1.2 }}>
                                  <span style={{ textTransform: "capitalize" }}>{lastEntry.eventType}</span>
                                  {lastEventDate && (
                                    <span style={{ color: "var(--ow-text-lo)", marginLeft: "0.35rem" }}>{lastEventDate}</span>
                                  )}
                                </p>
                              </div>
                            )}

                            {/* Days since inoculation */}
                            {daysSinceInoculation !== null && (
                              <div>
                                <p style={{ fontFamily: "'Fira Code',monospace", fontSize: "0.6rem", color: "var(--ow-text-lo)", letterSpacing: "0.08em", marginBottom: "0.15rem" }}>SINCE INOC.</p>
                                <p style={{ fontFamily: "'Fraunces',serif", fontWeight: 700, fontSize: "1.1rem", color: daysSinceInoculation > 21 ? "oklch(0.65 0.10 145)" : "var(--ow-amber)", lineHeight: 1 }}>
                                  {daysSinceInoculation}d
                                </p>
                              </div>
                            )}
                          </div>

                          {/* Entry count */}
                          <p style={{ fontFamily: "'Lato',sans-serif", fontSize: "0.7rem", color: "var(--ow-text-lo)", marginTop: "0.75rem" }}>
                            {tankEntries.length} {tankEntries.length === 1 ? "entry" : "entries"} · tap to filter
                          </p>
                          </button>

                          {/* Quick-add entry button — large touch target */}
                          <button
                            type="button"
                            onClick={(ev) => { ev.stopPropagation(); setQuickEntryTank(tank); setEntrySheetOpen(true); }}
                            className="w-full flex items-center justify-center gap-2 py-2.5 touch-target"
                            style={{
                              background: "color-mix(in oklch, var(--ow-amber) 6%, transparent)",
                              borderTop: "1px solid color-mix(in oklch, var(--ow-amber) 15%, transparent)",
                              borderLeft: "none",
                              borderRight: "none",
                              borderBottom: "none",
                              color: "var(--ow-amber)",
                              fontFamily: "'Lato',sans-serif",
                              fontSize: "0.75rem",
                              cursor: "pointer",
                            }}
                          >
                            <svg width="12" height="12" viewBox="0 0 12 12" fill="none">
                              <path d="M6 1v10M1 6h10" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" />
                            </svg>
                            Add entry
                          </button>
                        </div>
                      );
                    })}
                  </div>
                </div>
              )}

              {/* Live entries with pull-to-refresh */}
              {hasEntries && (
                <div
                  ref={logListRef}
                  onTouchStart={(e) => {
                    const el = logListRef.current;
                    if (!el || el.scrollTop > 0) return;
                    pullStartY.current = e.touches[0].clientY;
                  }}
                  onTouchMove={(e) => {
                    const el = logListRef.current;
                    if (!el || el.scrollTop > 0) return;
                    const dy = e.touches[0].clientY - pullStartY.current;
                    if (dy > 0) setPullY(Math.min(dy, 80));
                  }}
                  onTouchEnd={() => {
                    if (pullY > 50) { setIsPulling(true); refetchLog().finally(() => { setIsPulling(false); setPullY(0); }); }
                    else setPullY(0);
                  }}
                >
                  {/* Pull-to-refresh indicator */}
                  {(pullY > 0 || isPulling) && (
                    <div className="flex items-center justify-center py-3" style={{ height: `${Math.max(pullY, isPulling ? 40 : 0)}px`, overflow: "hidden" }}>
                      <svg width="18" height="18" viewBox="0 0 18 18" fill="none" style={{ animation: isPulling ? "spin 0.8s linear infinite" : "none", color: "var(--ow-amber)" }}>
                        <path d="M9 2v4M9 12v4M2 9h4M12 9h4" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" />
                      </svg>
                      <span className="ml-2" style={{ fontFamily: "'Lato',sans-serif", fontSize: "0.75rem", color: "var(--ow-text-lo)" }}>
                        {isPulling ? "Refreshing…" : "Release to refresh"}
                      </span>
                    </div>
                  )}

                  <div className="flex flex-col gap-4">
                    {filteredEntries.length === 0 && isFiltered && (
                      <p className="text-center py-8" style={{ fontFamily: "'Lato',sans-serif", fontSize: "0.875rem", color: "var(--ow-text-lo)", fontStyle: "italic" }}>
                        No entries match your filters.
                      </p>
                    )}
                    {filteredEntries.slice(0, displayLimit).filter((e) => !deletedIds.has(Number(e.id))).map((entry) => {
                      const EVENT_ICONS: Record<string, string> = {
                        addition: "⊕", measurement: "◎", racking: "⇄",
                        inoculation: "✦", observation: "◉", other: "◈",
                      };
                      const icon = EVENT_ICONS[entry.eventType] ?? "◈";
                      const dateStr = new Date(entry.entryAt).toLocaleDateString("en-AU", { day: "numeric", month: "short" });
                      const isSwiped = swipedEntryId === Number(entry.id);

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
                        <div key={entry.id} className="relative overflow-hidden rounded-sm">
                          {/* Swipe-to-delete: red reveal layer */}
                          <div
                            className="absolute inset-y-0 right-0 flex items-center px-5"
                            style={{
                              background: "oklch(0.45 0.18 25)",
                              width: "80px",
                              opacity: isSwiped ? 1 : 0,
                              transition: "opacity 0.15s",
                            }}
                          >
                            <button
                              type="button"
                              onClick={() => {
                                const id = Number(entry.id);
                                setDeletedIds((prev) => { const s = new Set(prev); s.add(id); return s; });
                                setSwipedEntryId(null);
                                deleteEntry.mutate({ id: entry.id });
                              }}
                              className="flex flex-col items-center gap-1"
                              style={{ background: "none", border: "none", color: "white", cursor: "pointer" }}
                            >
                              <svg width="14" height="14" viewBox="0 0 14 14" fill="none">
                                <path d="M2 4h10M5 4V2.5h4V4M5.5 6.5v4M8.5 6.5v4M3 4l.5 7.5h7L11 4" stroke="currentColor" strokeWidth="1.3" strokeLinecap="round" strokeLinejoin="round" />
                              </svg>
                              <span style={{ fontFamily: "'Lato',sans-serif", fontSize: "0.6rem", letterSpacing: "0.06em" }}>DELETE</span>
                            </button>
                          </div>

                          {/* Entry card — slides left on swipe */}
                          <div
                            className="cellar-card p-5"
                            style={{
                              border: "1px solid var(--ow-border)",
                              transform: isSwiped ? "translateX(-80px)" : "translateX(0)",
                              transition: "transform 0.2s ease",
                              position: "relative",
                            }}
                            onTouchStart={(e) => { swipeStartX.current = e.touches[0].clientX; swipeCurrentX.current = e.touches[0].clientX; }}
                            onTouchMove={(e) => { swipeCurrentX.current = e.touches[0].clientX; }}
                            onTouchEnd={() => {
                              const dx = swipeStartX.current - swipeCurrentX.current;
                              if (dx > 60) setSwipedEntryId(Number(entry.id));
                              else if (dx < -20) setSwipedEntryId(null);
                            }}
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
                                  className="w-7 h-7 rounded-sm flex items-center justify-center transition-colors touch-target"
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
                        </div>
                      );
                    })}

                    {/* Load more button */}
                    {filteredEntries.length > displayLimit && (
                      <button
                        type="button"
                        onClick={() => setDisplayLimit((n) => n + 20)}
                        className="w-full py-3 rounded-sm text-sm"
                        style={{
                          background: "var(--ow-bg-inset)",
                          border: "1px solid var(--ow-border)",
                          color: "var(--ow-text-lo)",
                          fontFamily: "'Lato',sans-serif",
                          cursor: "pointer",
                        }}
                      >
                        Load 20 more · {filteredEntries.length - displayLimit} remaining
                      </button>
                    )}
                  </div>
                </div>
              )}

              {/* Guided entry sheet */}
              <VintageEntrySheet
                open={entrySheetOpen}
                onClose={() => setEntrySheetOpen(false)}
                onSaved={() => { setEntrySheetOpen(false); refetchLog(); }}
                prefillTank={quickEntryTank}
              />

              {/* Sticky FAB — Add Entry (hidden when sheet is open) */}
              {!entrySheetOpen && (
                <button
                  type="button"
                  onClick={() => { setQuickEntryTank(undefined); setEntrySheetOpen(true); }}
                  className="sticky-bottom-safe fixed bottom-6 right-5 z-30 flex items-center gap-2 px-5 py-3.5 rounded-full shadow-lg touch-target"
                  style={{
                    background: "var(--ow-amber)",
                    color: "oklch(0.11 0.008 60)",
                    fontFamily: "'Lato',sans-serif",
                    fontWeight: 700,
                    fontSize: "0.875rem",
                    border: "none",
                    cursor: "pointer",
                    boxShadow: "0 4px 20px oklch(0.72 0.12 75 / 40%)",
                  }}
                >
                  <svg width="14" height="14" viewBox="0 0 14 14" fill="none">
                    <path d="M7 1v12M1 7h12" stroke="currentColor" strokeWidth="2" strokeLinecap="round" />
                  </svg>
                  Add Entry
                </button>
              )}
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

          {/* Notes — The Batch Book */}
          {activeTab === "notes" && (
            <div>
              <div className="flex items-start justify-between mb-6">
                <SectionHeader
                  label="The Batch Book"
                  title="Winemaker's Log"
                  subtitle="Structured, persisted records for every wine batch — LIP-compliant and yours forever."
                />
                <button
                    type="button"
                    onClick={() => setBatchSheetOpen(true)}
                    className="flex-shrink-0 mt-1 flex items-center gap-2 px-4 py-2.5 rounded-sm text-sm font-medium transition-all"
                    style={{
                      background: "color-mix(in oklch, var(--ow-amber) 12%, transparent)",
                      border: "1px solid color-mix(in oklch, var(--ow-amber) 35%, transparent)",
                      color: "var(--ow-amber)",
                      fontFamily: "'Lato',sans-serif",
                      cursor: "pointer",
                    }}
                  >
                    <svg width="12" height="12" viewBox="0 0 12 12" fill="none">
                      <path d="M6 1v10M1 6h10" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" />
                    </svg>
                    New Batch
                  </button>
              </div>

              {/* Sign-in gate removed during development */}

              {/* No batches yet */}
              {(!wineBatches || wineBatches.length === 0) && (
                <div
                  className="rounded-sm p-8 text-center"
                  style={{ border: "1px dashed color-mix(in oklch, var(--ow-amber) 25%, transparent)", background: "color-mix(in oklch, var(--ow-amber) 4%, transparent)" }}
                >
                  <div className="text-3xl mb-4">📖</div>
                  <p style={{ fontFamily: "'Fraunces',serif", fontWeight: 600, fontSize: "1.125rem", color: "var(--ow-text-hi)", marginBottom: "0.5rem" }}>
                    Start your first batch record
                  </p>
                  <p style={{ fontFamily: "'Lato',sans-serif", fontWeight: 300, fontSize: "0.875rem", lineHeight: 1.7, color: "var(--ow-text-lo)", maxWidth: "420px", margin: "0 auto 1.5rem" }}>
                    Register a wine batch with its LIP-required details — vintage, variety, GI, and grower — then write your notes by phase from receival through to bottling.
                  </p>
                  <button
                    type="button"
                    onClick={() => setBatchSheetOpen(true)}
                    className="inline-flex items-center gap-2 px-5 py-2.5 rounded-sm text-sm font-medium"
                    style={{ background: "var(--ow-amber)", color: "oklch(0.11 0.008 60)", fontFamily: "'Lato',sans-serif", cursor: "pointer", border: "none" }}
                  >
                    <svg width="12" height="12" viewBox="0 0 12 12" fill="none">
                      <path d="M6 1v10M1 6h10" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" />
                    </svg>
                    Register First Batch
                  </button>
                </div>
              )}

              {/* Batches exist */}
              {wineBatches && wineBatches.length > 0 && (() => {
                const batch = selectedBatch ?? wineBatches[0];
                const phases = [
                  { id: "receival", label: "Receival & Crush", icon: "⊞", prompt: "Date received, quantity, Brix at crush, temperature, any receival observations…" },
                  { id: "fermentation", label: "Fermentation", icon: "✦", prompt: "Inoculation date, yeast strain, YAN, DAP additions, Brix progression, temperature, observations…" },
                  { id: "racking", label: "Post-Ferment & Racking", icon: "⇄", prompt: "Racking date, destination tank, lees status, volume, free SO₂, any fining additions…" },
                  { id: "stabilising", label: "Stabilising & Clarifying", icon: "◎", prompt: "Cold stab temp, bentonite rate, filtration, pH, TA, free SO₂ at this stage…" },
                  { id: "bottling", label: "Bottling", icon: "◈", prompt: "Bottling date, volume, free SO₂, pH, TA, alcohol, closure type, label batch code…" },
                  { id: "general", label: "General Notes", icon: "✏", prompt: "Any other observations, decisions, or things worth remembering for this batch…" },
                ];
                return (
                  <>
                    {/* Batch selector tabs */}
                    <div className="flex items-center gap-2 mb-5 overflow-x-auto pb-1">
                      {wineBatches.map((b) => (
                        <button
                          key={b.batchId}
                          type="button"
                          onClick={() => setSelectedBatchId(b.batchId)}
                          className="flex-shrink-0 px-3 py-2 rounded-sm text-xs font-medium transition-all"
                          style={{
                            background: (selectedBatchId ?? wineBatches[0].batchId) === b.batchId
                              ? "color-mix(in oklch, var(--ow-amber) 15%, transparent)"
                              : "var(--ow-bg-card)",
                            border: (selectedBatchId ?? wineBatches[0].batchId) === b.batchId
                              ? "1px solid color-mix(in oklch, var(--ow-amber) 40%, transparent)"
                              : "1px solid var(--ow-border)",
                            color: (selectedBatchId ?? wineBatches[0].batchId) === b.batchId
                              ? "var(--ow-amber)"
                              : "var(--ow-text-mid)",
                            fontFamily: "'Fira Code',monospace",
                            letterSpacing: "0.04em",
                            cursor: "pointer",
                          }}
                        >
                          {b.batchId}
                        </button>
                      ))}
                      <button
                        type="button"
                        onClick={() => setBatchSheetOpen(true)}
                        className="flex-shrink-0 w-7 h-7 rounded-sm flex items-center justify-center transition-colors"
                        style={{ background: "var(--ow-bg-inset)", border: "1px solid var(--ow-border)", color: "var(--ow-text-lo)", cursor: "pointer" }}
                        title="Register new batch"
                      >
                        <svg width="10" height="10" viewBox="0 0 10 10" fill="none">
                          <path d="M5 1v8M1 5h8" stroke="currentColor" strokeWidth="1.3" strokeLinecap="round" />
                        </svg>
                      </button>
                    </div>

                    {/* Batch header card */}
                    <div
                      className="rounded-sm p-4 mb-5"
                      style={{ background: "var(--ow-bg-card)", border: "1px solid var(--ow-border)" }}
                    >
                      <div className="flex items-start justify-between gap-4 flex-wrap">
                        <div>
                          <p style={{ fontFamily: "'Fira Code',monospace", fontSize: "0.65rem", color: "var(--ow-text-lo)", letterSpacing: "0.1em", marginBottom: "0.25rem" }}>WINE BATCH ID</p>
                          <p style={{ fontFamily: "'Fraunces',serif", fontWeight: 700, fontSize: "1.25rem", color: "var(--ow-amber)" }}>{batch.batchId}</p>
                        </div>
                        <div className="flex flex-wrap gap-4">
                          <div>
                            <p style={{ fontFamily: "'Fira Code',monospace", fontSize: "0.6rem", color: "var(--ow-text-lo)", letterSpacing: "0.1em", marginBottom: "0.2rem" }}>VINTAGE</p>
                            <p style={{ fontFamily: "'Lato',sans-serif", fontWeight: 600, fontSize: "0.875rem", color: "var(--ow-text-hi)" }}>{batch.vintage}</p>
                          </div>
                          <div>
                            <p style={{ fontFamily: "'Fira Code',monospace", fontSize: "0.6rem", color: "var(--ow-text-lo)", letterSpacing: "0.1em", marginBottom: "0.2rem" }}>VARIETY</p>
                            <p style={{ fontFamily: "'Lato',sans-serif", fontWeight: 600, fontSize: "0.875rem", color: "var(--ow-text-hi)" }}>{batch.variety}</p>
                          </div>
                          {batch.gi && (
                            <div>
                              <p style={{ fontFamily: "'Fira Code',monospace", fontSize: "0.6rem", color: "var(--ow-text-lo)", letterSpacing: "0.1em", marginBottom: "0.2rem" }}>GI</p>
                              <p style={{ fontFamily: "'Lato',sans-serif", fontWeight: 600, fontSize: "0.875rem", color: "var(--ow-text-hi)" }}>{batch.gi}</p>
                            </div>
                          )}
                          {batch.quantityValue && (
                            <div>
                              <p style={{ fontFamily: "'Fira Code',monospace", fontSize: "0.6rem", color: "var(--ow-text-lo)", letterSpacing: "0.1em", marginBottom: "0.2rem" }}>QTY</p>
                              <p style={{ fontFamily: "'Lato',sans-serif", fontWeight: 600, fontSize: "0.875rem", color: "var(--ow-text-hi)" }}>{batch.quantityValue}{batch.quantityUnit}</p>
                            </div>
                          )}
                          {batch.tankName && (
                            <div>
                              <p style={{ fontFamily: "'Fira Code',monospace", fontSize: "0.6rem", color: "var(--ow-text-lo)", letterSpacing: "0.1em", marginBottom: "0.2rem" }}>TANK</p>
                              <p style={{ fontFamily: "'Lato',sans-serif", fontWeight: 600, fontSize: "0.875rem", color: "var(--ow-text-hi)" }}>{batch.tankName}</p>
                            </div>
                          )}
                        </div>
                      </div>
                      {batch.growerDetails && (
                        <div className="mt-3 pt-3" style={{ borderTop: "1px solid var(--ow-border)" }}>
                          <p style={{ fontFamily: "'Fira Code',monospace", fontSize: "0.6rem", color: "var(--ow-text-lo)", letterSpacing: "0.1em", marginBottom: "0.25rem" }}>GROWER / SUPPLIER</p>
                          <p style={{ fontFamily: "'Lato',sans-serif", fontWeight: 300, fontSize: "0.8125rem", color: "var(--ow-text-mid)", lineHeight: 1.6 }}>{batch.growerDetails}</p>
                        </div>
                      )}
                      {/* Auto-save indicator */}
                      {savingPhase === "saving" && (
                        <div className="mt-2 text-right">
                          <span style={{ fontFamily: "'Fira Code',monospace", fontSize: "0.65rem", color: "var(--ow-text-lo)", fontStyle: "italic" }}>saving…</span>
                        </div>
                      )}
                    </div>

                    {/* Phase accordion */}
                    <div className="flex flex-col gap-2">
                      {phases.map((phase) => {
                        const isOpen = expandedPhase === phase.id;
                        const noteVal = localNotes[phase.id] ?? "";
                        // Pull context from Vintage Log for this batch's tank
                        const relatedEntries = batch.tankName
                          ? (logEntries ?? []).filter((e) => e.tankName === batch.tankName).slice(0, 3)
                          : [];
                        return (
                          <div
                            key={phase.id}
                            className="rounded-sm overflow-hidden"
                            style={{ border: "1px solid var(--ow-border)" }}
                          >
                            {/* Phase header */}
                            <button
                              type="button"
                              onClick={() => setExpandedPhase(isOpen ? null : phase.id)}
                              className="w-full flex items-center justify-between px-4 py-3 text-left transition-colors"
                              style={{
                                background: isOpen ? "color-mix(in oklch, var(--ow-amber) 6%, var(--ow-bg-card))" : "var(--ow-bg-card)",
                                cursor: "pointer",
                                border: "none",
                              }}
                            >
                              <div className="flex items-center gap-3">
                                <span style={{ fontSize: "0.9rem", color: isOpen ? "var(--ow-amber)" : "var(--ow-text-lo)" }}>{phase.icon}</span>
                                <span style={{ fontFamily: "'Fraunces',serif", fontWeight: 600, fontSize: "0.9375rem", color: isOpen ? "var(--ow-text-hi)" : "var(--ow-text-mid)" }}>
                                  {phase.label}
                                </span>
                                {noteVal.trim() && (
                                  <span
                                    className="px-1.5 py-0.5 rounded-sm text-xs"
                                    style={{ background: "color-mix(in oklch, var(--ow-amber) 12%, transparent)", color: "var(--ow-amber)", fontFamily: "'Fira Code',monospace", fontSize: "0.6rem" }}
                                  >
                                    ✓
                                  </span>
                                )}
                              </div>
                              <svg
                                width="12" height="12" viewBox="0 0 12 12" fill="none"
                                style={{ transform: isOpen ? "rotate(180deg)" : "rotate(0deg)", transition: "transform 0.2s", color: "var(--ow-text-lo)" }}
                              >
                                <path d="M2 4l4 4 4-4" stroke="currentColor" strokeWidth="1.4" strokeLinecap="round" strokeLinejoin="round" />
                              </svg>
                            </button>

                            {/* Phase content */}
                            {isOpen && (
                              <div style={{ background: "var(--ow-bg-base)", borderTop: "1px solid var(--ow-border)" }}>
                                {/* Related log entries context */}
                                {phase.id === "fermentation" && relatedEntries.length > 0 && (
                                  <div className="px-4 pt-3 pb-1">
                                    <p style={{ fontFamily: "'Fira Code',monospace", fontSize: "0.6rem", color: "var(--ow-text-lo)", letterSpacing: "0.1em", marginBottom: "0.5rem" }}>FROM VINTAGE LOG — {batch.tankName}</p>
                                    <div className="flex flex-col gap-1.5">
                                      {relatedEntries.map((e) => (
                                        <div key={e.id} className="flex items-center gap-2 text-xs" style={{ fontFamily: "'Lato',sans-serif", color: "var(--ow-text-lo)" }}>
                                          <span style={{ fontFamily: "'Fira Code',monospace", fontSize: "0.65rem", color: "var(--ow-text-lo)" }}>
                                            {new Date(e.entryAt).toLocaleDateString("en-AU", { day: "numeric", month: "short" })}
                                          </span>
                                          <span style={{ color: "var(--ow-amber)", fontSize: "0.7rem" }}>{e.eventType}</span>
                                          <span>{e.noteText ?? Object.values(e.details as Record<string, string>).slice(0, 2).join(" · ")}</span>
                                        </div>
                                      ))}
                                    </div>
                                  </div>
                                )}
                                <textarea
                                  value={noteVal}
                                  onChange={(e) => handleNoteChange(phase.id, e.target.value)}
                                  placeholder={phase.prompt}
                                  rows={5}
                                  className="w-full resize-none outline-none"
                                  style={{
                                    fontFamily: "'Lato',sans-serif",
                                    fontWeight: 300,
                                    fontSize: "0.9rem",
                                    lineHeight: 1.75,
                                    color: "var(--ow-text-mid)",
                                    background: "transparent",
                                    padding: "0.875rem 1rem",
                                    border: "none",
                                  }}
                                />
                                <div
                                  className="flex items-center justify-between px-4 py-2"
                                  style={{ borderTop: "1px solid var(--ow-border)" }}
                                >
                                  <span style={{ fontFamily: "'Fira Code',monospace", fontSize: "0.6rem", color: "var(--ow-text-lo)" }}>
                                    {noteVal.length} chars · auto-saved
                                  </span>
                                  <Link
                                    href="/compliance"
                                    className="text-xs"
                                    style={{ fontFamily: "'Lato',sans-serif", color: "var(--ow-amber)", textDecoration: "none", fontSize: "0.75rem" }}
                                  >
                                    Ask Ownology ◈
                                  </Link>
                                </div>
                              </div>
                            )}
                          </div>
                        );
                      })}
                    </div>

                    {/* LIP reminder footer */}
                    <div
                      className="mt-5 px-4 py-3 rounded-sm flex items-start gap-3"
                      style={{ background: "var(--ow-bg-card)", border: "1px solid var(--ow-border)" }}
                    >
                      <span style={{ fontSize: "0.9rem", color: "var(--ow-amber)" }}>⚖</span>
                      <p style={{ fontFamily: "'Lato',sans-serif", fontWeight: 300, fontSize: "0.8rem", lineHeight: 1.65, color: "var(--ow-text-lo)" }}>
                        <strong style={{ color: "var(--ow-text-mid)" }}>LIP reminder:</strong> All batch records must be retained for 7 years under the Wine Australia Act 2013. Ensure vintage, variety, GI, and grower details are complete for every batch.
                      </p>
                    </div>
                  </>
                );
              })()}
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

      {/* Vintage Entry Sheet */}
      <VintageEntrySheet
        open={entrySheetOpen}
        onClose={() => { setEntrySheetOpen(false); setQuickEntryTank(undefined); }}
        prefillTank={quickEntryTank}
        onSaved={() => { refetchLog(); setEntrySheetOpen(false); setQuickEntryTank(undefined); }}
      />

      {/* Tank Reminder Sheet */}
      <TankReminderSheet
        open={reminderSheetOpen}
        onClose={() => { setReminderSheetOpen(false); setReminderDefaultTank(undefined); }}
        defaultTankName={reminderDefaultTank}
        tankNames={allTanks}
      />

      {/* Wine Batch Sheet */}
      <WineBatchSheet
        open={batchSheetOpen}
        onClose={() => setBatchSheetOpen(false)}
        onSaved={(newBatchId) => {
          refetchBatches();
          setBatchSheetOpen(false);
          if (newBatchId) setSelectedBatchId(newBatchId);
        }}
      />

      {/* ── Mobile bottom tab bar (hidden when any sheet is open) ── */}
      {!entrySheetOpen && !reminderSheetOpen && !batchSheetOpen && (
        <nav
          className="md:hidden fixed bottom-0 left-0 right-0 z-20"
          style={{
            background: "var(--ow-bg-card)",
            borderTop: "1px solid var(--ow-border)",
            paddingBottom: "env(safe-area-inset-bottom, 0px)",
          }}
        >
          <div className="flex">
            {[
              { id: "log" as const, label: "Log", icon: (
                <svg width="18" height="18" viewBox="0 0 18 18" fill="none">
                  <rect x="3" y="2" width="12" height="14" rx="1.5" stroke="currentColor" strokeWidth="1.3" />
                  <path d="M6 6h6M6 9h6M6 12h4" stroke="currentColor" strokeWidth="1.2" strokeLinecap="round" />
                </svg>
              )},
              { id: "calcs" as const, label: "Calc", icon: (
                <svg width="18" height="18" viewBox="0 0 18 18" fill="none">
                  <rect x="3" y="2" width="12" height="14" rx="1.5" stroke="currentColor" strokeWidth="1.3" />
                  <path d="M6 6h6M6 9h2M10 9h2M6 12h2M10 12h2" stroke="currentColor" strokeWidth="1.2" strokeLinecap="round" />
                </svg>
              )},
              { id: "notes" as const, label: "Batches", icon: (
                <svg width="18" height="18" viewBox="0 0 18 18" fill="none">
                  <path d="M4 4h10v11a1 1 0 0 1-1 1H5a1 1 0 0 1-1-1V4z" stroke="currentColor" strokeWidth="1.3" />
                  <path d="M7 4V2h4v2" stroke="currentColor" strokeWidth="1.3" strokeLinecap="round" />
                  <path d="M6 8h6M6 11h4" stroke="currentColor" strokeWidth="1.2" strokeLinecap="round" />
                </svg>
              )},
              { id: "scenarios" as const, label: "More", icon: (
                <svg width="18" height="18" viewBox="0 0 18 18" fill="none">
                  <circle cx="5" cy="9" r="1.2" fill="currentColor" />
                  <circle cx="9" cy="9" r="1.2" fill="currentColor" />
                  <circle cx="13" cy="9" r="1.2" fill="currentColor" />
                </svg>
              )},
            ].map((tab) => (
              <button
                key={tab.id}
                type="button"
                onClick={() => setActiveTab(tab.id)}
                className="flex-1 flex flex-col items-center justify-center gap-1 py-2.5 touch-target"
                style={{
                  background: "none",
                  border: "none",
                  cursor: "pointer",
                  color: activeTab === tab.id ? "var(--ow-amber)" : "var(--ow-text-lo)",
                  transition: "color 0.15s",
                }}
              >
                {tab.icon}
                <span style={{
                  fontFamily: "'Lato',sans-serif",
                  fontSize: "0.6rem",
                  letterSpacing: "0.06em",
                  fontWeight: activeTab === tab.id ? 700 : 400,
                  textTransform: "uppercase",
                }}>
                  {tab.label}
                </span>
              </button>
            ))}
          </div>
        </nav>
      )}
    </div>
  );
}
