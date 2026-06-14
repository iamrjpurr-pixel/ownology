/**
 * MilestoneCalendar
 * ─────────────────
 * Displays a per-tank projected milestone timeline derived from the inoculation
 * date stored in the vintage log. Milestones are variety-aware: skin-contact reds
 * (Shiraz, Cabernet, Merlot, etc.) have longer fermentation and pressing windows
 * than whites or rosés.
 *
 * Milestone offsets (days from inoculation):
 *
 * RED varieties (Shiraz, Cabernet Sauvignon, Merlot, Grenache, Pinot Noir,
 *               Tempranillo, Sangiovese, Nebbiolo, Malbec, Petit Verdot):
 *   Pressing:          +7  to +14 days  (end of primary fermentation)
 *   First racking:     +14 to +21 days  (post-press, off gross lees)
 *   MLF complete:      +60 to +90 days  (malolactic fermentation)
 *   Second racking:    +90 to +120 days (off fine lees)
 *   Bottling window:   +180 to +365 days (style-dependent)
 *
 * WHITE varieties (Chardonnay, Sauvignon Blanc, Riesling, Pinot Gris,
 *                 Viognier, Gewürztraminer, Semillon, Verdelho, Pinot Blanc):
 *   Pressing:          already done before fermentation (N/A in log)
 *   First racking:     +14 to +21 days  (off gross lees)
 *   Stabilisation:     +30 to +60 days  (cold stab, fining)
 *   Second racking:    +60 to +90 days  (off fine lees)
 *   Bottling window:   +90 to +180 days (fresh style) or +180+ (barrel-fermented)
 *
 * ROSÉ:
 *   Pressing:          +0 to +2 days    (saignée or direct press)
 *   First racking:     +14 to +21 days
 *   Bottling window:   +60 to +120 days
 *
 * Sources: Iland et al. "Techniques for Chemical Analysis and Quality Monitoring
 * During Winemaking" (2004); Zoecklein et al. "Wine Analysis and Production" (1999);
 * Ownology Field to Glass knowledge base.
 */

import { useMemo } from "react";

// ─── Types ────────────────────────────────────────────────────────────────────

export interface LogEntry {
  id: string | number;
  tankName: string;
  variety: string;
  eventType: string;
  entryAt: number; // UTC ms
  noteText?: string | null;
  tags: string[];
  details: Record<string, unknown>;
}

interface Milestone {
  id: string;
  label: string;
  shortLabel: string;
  /** Earliest projected date (UTC ms) */
  earliest: number;
  /** Latest projected date (UTC ms) */
  latest: number;
  /** Whether this milestone has already been logged in the vintage log */
  completed: boolean;
  /** The event type that marks this milestone as complete */
  completedByEvent?: string;
  color: string; // CSS color string
}

interface TankMilestones {
  tankName: string;
  variety: string;
  inoculationDate: number; // UTC ms
  style: "red" | "white" | "rosé" | "unknown";
  milestones: Milestone[];
  /** Days since inoculation */
  daysSinceInoculation: number;
}

// ─── Variety classification ───────────────────────────────────────────────────

const RED_VARIETIES = new Set([
  "shiraz", "syrah", "cabernet sauvignon", "cabernet", "merlot", "grenache",
  "pinot noir", "tempranillo", "sangiovese", "nebbiolo", "malbec",
  "petit verdot", "mourvedre", "mataro", "durif", "petite sirah",
  "zinfandel", "barbera", "dolcetto", "nero d'avola", "montepulciano",
  "primitivo", "touriga nacional", "carignan", "cinsault",
]);

const WHITE_VARIETIES = new Set([
  "chardonnay", "sauvignon blanc", "riesling", "pinot gris", "pinot grigio",
  "viognier", "gewürztraminer", "gewurztraminer", "semillon", "verdelho",
  "pinot blanc", "marsanne", "roussanne", "chenin blanc", "muscat",
  "muscat blanc", "fiano", "vermentino", "arneis", "garganega",
  "grüner veltliner", "gruner veltliner", "albarino", "albariño",
  "torrontés", "torrontes", "colombard", "trebbiano", "palomino",
]);

const ROSÉ_VARIETIES = new Set([
  "rosé", "rose", "rosato", "rosado",
]);

function classifyVariety(variety: string): "red" | "white" | "rosé" | "unknown" {
  const v = variety.toLowerCase().trim();
  if (ROSÉ_VARIETIES.has(v) || v.includes("rosé") || v.includes("rose")) return "rosé";
  if (RED_VARIETIES.has(v)) return "red";
  if (WHITE_VARIETIES.has(v)) return "white";
  // Heuristic: if the variety contains "blanc", "white", "gris" → white
  if (v.includes("blanc") || v.includes("white") || v.includes("gris")) return "white";
  if (v.includes("noir") || v.includes("red") || v.includes("black")) return "red";
  return "unknown";
}

// ─── Milestone calculation ────────────────────────────────────────────────────

const DAY = 86_400_000; // ms

function addDays(base: number, days: number): number {
  return base + days * DAY;
}

function buildMilestones(
  style: "red" | "white" | "rosé" | "unknown",
  inoculationDate: number,
  entries: LogEntry[],
): Milestone[] {
  const hasEvent = (type: string) => entries.some((e) => e.eventType === type);
  const hasTag = (tag: string) => entries.some((e) => e.tags.some((t) => t.toLowerCase().includes(tag.toLowerCase())));

  if (style === "red") {
    return [
      {
        id: "pressing",
        label: "Pressing",
        shortLabel: "Press",
        earliest: addDays(inoculationDate, 7),
        latest: addDays(inoculationDate, 14),
        completed: hasTag("pressing") || hasTag("press"),
        completedByEvent: "racking",
        color: "oklch(0.72 0.12 75)", // amber
      },
      {
        id: "first-racking",
        label: "First Racking (gross lees)",
        shortLabel: "Rack 1",
        earliest: addDays(inoculationDate, 14),
        latest: addDays(inoculationDate, 21),
        completed: hasEvent("racking"),
        completedByEvent: "racking",
        color: "oklch(0.65 0.15 200)", // teal
      },
      {
        id: "mlf-complete",
        label: "MLF Complete",
        shortLabel: "MLF",
        earliest: addDays(inoculationDate, 60),
        latest: addDays(inoculationDate, 90),
        completed: hasTag("mlf") || hasTag("malolactic"),
        completedByEvent: "measurement",
        color: "oklch(0.60 0.18 280)", // purple
      },
      {
        id: "second-racking",
        label: "Second Racking (fine lees)",
        shortLabel: "Rack 2",
        earliest: addDays(inoculationDate, 90),
        latest: addDays(inoculationDate, 120),
        completed: entries.filter((e) => e.eventType === "racking").length >= 2,
        completedByEvent: "racking",
        color: "oklch(0.65 0.15 200)",
      },
      {
        id: "bottling",
        label: "Bottling Window",
        shortLabel: "Bottle",
        earliest: addDays(inoculationDate, 180),
        latest: addDays(inoculationDate, 365),
        completed: hasTag("bottling") || hasTag("bottle"),
        completedByEvent: "other",
        color: "oklch(0.55 0.20 150)", // green
      },
    ];
  }

  if (style === "white") {
    return [
      {
        id: "first-racking",
        label: "First Racking (gross lees)",
        shortLabel: "Rack 1",
        earliest: addDays(inoculationDate, 14),
        latest: addDays(inoculationDate, 21),
        completed: hasEvent("racking"),
        completedByEvent: "racking",
        color: "oklch(0.65 0.15 200)",
      },
      {
        id: "stabilisation",
        label: "Cold Stabilisation",
        shortLabel: "Cold Stab",
        earliest: addDays(inoculationDate, 30),
        latest: addDays(inoculationDate, 60),
        completed: hasTag("cold stab") || hasTag("stabilisation") || hasTag("cold stabilisation"),
        completedByEvent: "addition",
        color: "oklch(0.60 0.18 220)", // blue
      },
      {
        id: "second-racking",
        label: "Second Racking (fine lees)",
        shortLabel: "Rack 2",
        earliest: addDays(inoculationDate, 60),
        latest: addDays(inoculationDate, 90),
        completed: entries.filter((e) => e.eventType === "racking").length >= 2,
        completedByEvent: "racking",
        color: "oklch(0.65 0.15 200)",
      },
      {
        id: "bottling",
        label: "Bottling Window",
        shortLabel: "Bottle",
        earliest: addDays(inoculationDate, 90),
        latest: addDays(inoculationDate, 180),
        completed: hasTag("bottling") || hasTag("bottle"),
        completedByEvent: "other",
        color: "oklch(0.55 0.20 150)",
      },
    ];
  }

  if (style === "rosé") {
    return [
      {
        id: "pressing",
        label: "Pressing / Saignée",
        shortLabel: "Press",
        earliest: addDays(inoculationDate, 0),
        latest: addDays(inoculationDate, 2),
        completed: hasTag("pressing") || hasTag("saignée") || hasTag("saignee"),
        completedByEvent: "racking",
        color: "oklch(0.72 0.12 75)",
      },
      {
        id: "first-racking",
        label: "First Racking",
        shortLabel: "Rack 1",
        earliest: addDays(inoculationDate, 14),
        latest: addDays(inoculationDate, 21),
        completed: hasEvent("racking"),
        completedByEvent: "racking",
        color: "oklch(0.65 0.15 200)",
      },
      {
        id: "bottling",
        label: "Bottling Window",
        shortLabel: "Bottle",
        earliest: addDays(inoculationDate, 60),
        latest: addDays(inoculationDate, 120),
        completed: hasTag("bottling") || hasTag("bottle"),
        completedByEvent: "other",
        color: "oklch(0.55 0.20 150)",
      },
    ];
  }

  // Unknown variety — use red defaults with wider windows
  return [
    {
      id: "first-racking",
      label: "First Racking (estimated)",
      shortLabel: "Rack 1",
      earliest: addDays(inoculationDate, 10),
      latest: addDays(inoculationDate, 21),
      completed: hasEvent("racking"),
      completedByEvent: "racking",
      color: "oklch(0.65 0.15 200)",
    },
    {
      id: "bottling",
      label: "Bottling Window (estimated)",
      shortLabel: "Bottle",
      earliest: addDays(inoculationDate, 90),
      latest: addDays(inoculationDate, 365),
      completed: hasTag("bottling") || hasTag("bottle"),
      completedByEvent: "other",
      color: "oklch(0.55 0.20 150)",
    },
  ];
}

// ─── Date formatting ──────────────────────────────────────────────────────────

function fmtDate(ts: number): string {
  return new Date(ts).toLocaleDateString("en-AU", { day: "numeric", month: "short" });
}

function fmtDateFull(ts: number): string {
  return new Date(ts).toLocaleDateString("en-AU", { weekday: "short", day: "numeric", month: "short", year: "numeric" });
}

// ─── Timeline bar helper ──────────────────────────────────────────────────────

/**
 * Given the overall calendar span [calStart, calEnd] and a milestone window
 * [earliest, latest], returns { left%, width% } for the bar.
 */
function barPosition(calStart: number, calEnd: number, earliest: number, latest: number) {
  const span = calEnd - calStart;
  if (span <= 0) return { left: 0, width: 100 };
  const left = Math.max(0, Math.min(100, ((earliest - calStart) / span) * 100));
  const right = Math.max(0, Math.min(100, ((latest - calStart) / span) * 100));
  return { left, width: Math.max(2, right - left) };
}

// ─── Component ────────────────────────────────────────────────────────────────

interface Props {
  logEntries: LogEntry[];
  onAddEntry?: (tankName: string) => void;
}

export default function MilestoneCalendar({ logEntries, onAddEntry }: Props) {
  const tankMilestones = useMemo<TankMilestones[]>(() => {
    // Group entries by tank
    const byTank = new Map<string, LogEntry[]>();
    for (const entry of logEntries) {
      if (!byTank.has(entry.tankName)) byTank.set(entry.tankName, []);
      byTank.get(entry.tankName)!.push(entry);
    }

    const result: TankMilestones[] = [];

    for (const [tankName, entries] of Array.from(byTank.entries())) {
      // Find the most recent inoculation event for this tank
      const inocEntries = entries
        .filter((e: LogEntry) => e.eventType === "inoculation")
        .sort((a: LogEntry, b: LogEntry) => b.entryAt - a.entryAt);

      if (inocEntries.length === 0) continue; // skip tanks with no inoculation logged

      const inoculationDate = inocEntries[0].entryAt;
      const variety = inocEntries[0].variety || entries[0].variety || "Unknown";
      const style = classifyVariety(variety);
      const daysSinceInoculation = Math.floor((Date.now() - inoculationDate) / DAY);
      const milestones = buildMilestones(style, inoculationDate, entries);

      result.push({ tankName, variety, inoculationDate, style, milestones, daysSinceInoculation });
    }

    // Sort by days since inoculation descending (most active first)
    return result.sort((a, b) => b.daysSinceInoculation - a.daysSinceInoculation);
  }, [logEntries]);

  // Overall calendar span: from earliest inoculation to latest bottling
  const calStart = useMemo(() => {
    if (tankMilestones.length === 0) return Date.now();
    return Math.min(...tankMilestones.map((t) => t.inoculationDate));
  }, [tankMilestones]);

  const calEnd = useMemo(() => {
    if (tankMilestones.length === 0) return Date.now() + 365 * DAY;
    const allLatest = tankMilestones.flatMap((t) =>
      t.milestones.map((m) => m.latest)
    );
    return Math.max(...allLatest, Date.now() + 30 * DAY);
  }, [tankMilestones]);

  const todayPct = useMemo(() => {
    const span = calEnd - calStart;
    if (span <= 0) return 0;
    return Math.max(0, Math.min(100, ((Date.now() - calStart) / span) * 100));
  }, [calStart, calEnd]);

  if (tankMilestones.length === 0) {
    return (
      <div
        className="flex flex-col items-center justify-center py-16 text-center"
        style={{ color: "var(--ow-text-lo)", fontFamily: "'Lato',sans-serif" }}
      >
        <div style={{ fontSize: "2.5rem", marginBottom: "1rem" }}>📅</div>
        <p style={{ fontSize: "1rem", fontWeight: 300, color: "var(--ow-text-mid)", marginBottom: "0.5rem" }}>
          No inoculation events logged yet
        </p>
        <p style={{ fontSize: "0.875rem", color: "var(--ow-text-lo)", maxWidth: "360px", lineHeight: 1.6 }}>
          Log an <strong style={{ color: "var(--ow-amber)" }}>Inoculation</strong> event for a tank to see its projected milestone calendar here.
        </p>
      </div>
    );
  }

  const styleLabel: Record<string, string> = {
    red: "Red",
    white: "White",
    "rosé": "Rosé",
    unknown: "Unknown",
  };

  const styleColor: Record<string, string> = {
    red: "oklch(0.55 0.20 25)",
    white: "oklch(0.75 0.12 95)",
    "rosé": "oklch(0.70 0.18 350)",
    unknown: "var(--ow-text-lo)",
  };

  return (
    <div style={{ fontFamily: "'Lato',sans-serif" }}>
      {/* Legend */}
      <div className="flex flex-wrap gap-4 mb-6 pb-4" style={{ borderBottom: "1px solid var(--ow-border)" }}>
        <span style={{ fontSize: "0.7rem", color: "var(--ow-text-lo)", letterSpacing: "0.08em", textTransform: "uppercase", alignSelf: "center" }}>
          Legend:
        </span>
        {[
          { color: "oklch(0.72 0.12 75)", label: "Pressing" },
          { color: "oklch(0.65 0.15 200)", label: "Racking" },
          { color: "oklch(0.60 0.18 280)", label: "MLF" },
          { color: "oklch(0.60 0.18 220)", label: "Cold Stab" },
          { color: "oklch(0.55 0.20 150)", label: "Bottling" },
        ].map((item) => (
          <div key={item.label} className="flex items-center gap-1.5">
            <div className="w-3 h-3 rounded-sm" style={{ background: item.color, opacity: 0.85 }} />
            <span style={{ fontSize: "0.7rem", color: "var(--ow-text-lo)" }}>{item.label}</span>
          </div>
        ))}
        <div className="flex items-center gap-1.5 ml-auto">
          <div className="w-px h-4" style={{ background: "oklch(0.72 0.12 75)", opacity: 0.8 }} />
          <span style={{ fontSize: "0.7rem", color: "var(--ow-text-lo)" }}>Today</span>
        </div>
      </div>

      {/* Per-tank timeline cards */}
      <div className="flex flex-col gap-5">
        {tankMilestones.map((tank) => {
          const nextMilestone = tank.milestones.find((m) => !m.completed && Date.now() < m.latest);
          const allComplete = tank.milestones.every((m) => m.completed);

          return (
            <div
              key={tank.tankName}
              className="rounded-sm p-4"
              style={{
                background: "var(--ow-bg-card)",
                border: "1px solid var(--ow-border)",
              }}
            >
              {/* Card header */}
              <div className="flex items-start justify-between gap-3 mb-4">
                <div>
                  <div className="flex items-center gap-2 flex-wrap">
                    <span style={{ fontFamily: "'Fraunces',serif", fontWeight: 700, fontSize: "1.0625rem", color: "var(--ow-text-hi)" }}>
                      {tank.tankName}
                    </span>
                    <span
                      className="px-2 py-0.5 rounded-sm text-xs"
                      style={{
                        background: "var(--ow-bg-base)",
                        border: "1px solid var(--ow-border)",
                        color: styleColor[tank.style],
                        fontFamily: "'Fira Code',monospace",
                        fontSize: "0.65rem",
                        letterSpacing: "0.06em",
                      }}
                    >
                      {styleLabel[tank.style]} · {tank.variety}
                    </span>
                    {allComplete && (
                      <span
                        className="px-2 py-0.5 rounded-sm text-xs"
                        style={{
                          background: "oklch(0.55 0.20 150 / 15%)",
                          border: "1px solid oklch(0.55 0.20 150 / 40%)",
                          color: "oklch(0.55 0.20 150)",
                          fontFamily: "'Fira Code',monospace",
                          fontSize: "0.65rem",
                          letterSpacing: "0.06em",
                        }}
                      >
                        ALL MILESTONES LOGGED
                      </span>
                    )}
                  </div>
                  <div className="flex items-center gap-3 mt-1 flex-wrap">
                    <span style={{ fontSize: "0.75rem", color: "var(--ow-text-lo)" }}>
                      Inoculated {fmtDateFull(tank.inoculationDate)}
                    </span>
                    <span style={{ fontSize: "0.75rem", color: "var(--ow-text-lo)" }}>
                      · Day {tank.daysSinceInoculation}
                    </span>
                    {nextMilestone && !allComplete && (
                      <span style={{ fontSize: "0.75rem", color: "var(--ow-amber)" }}>
                        · Next: {nextMilestone.label} ({fmtDate(nextMilestone.earliest)}–{fmtDate(nextMilestone.latest)})
                      </span>
                    )}
                  </div>
                </div>
                {onAddEntry && (
                  <button
                    type="button"
                    onClick={() => onAddEntry(tank.tankName)}
                    className="flex-shrink-0 flex items-center gap-1.5 px-3 py-1.5 rounded-sm text-xs transition-all touch-target"
                    style={{
                      background: "color-mix(in oklch, var(--ow-amber) 10%, transparent)",
                      border: "1px solid color-mix(in oklch, var(--ow-amber) 30%, transparent)",
                      color: "var(--ow-amber)",
                      fontFamily: "'Fira Code',monospace",
                      letterSpacing: "0.04em",
                      cursor: "pointer",
                      whiteSpace: "nowrap",
                    }}
                  >
                    <svg width="12" height="12" viewBox="0 0 12 12" fill="none">
                      <path d="M6 2v8M2 6h8" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" />
                    </svg>
                    Log Entry
                  </button>
                )}
              </div>

              {/* Timeline bar */}
              <div className="relative" style={{ height: "8px", marginBottom: "1.5rem" }}>
                {/* Background track */}
                <div
                  className="absolute inset-0 rounded-full"
                  style={{ background: "var(--ow-bg-base)", border: "1px solid var(--ow-border)" }}
                />
                {/* Milestone bars */}
                {tank.milestones.map((m) => {
                  const { left, width } = barPosition(calStart, calEnd, m.earliest, m.latest);
                  return (
                    <div
                      key={m.id}
                      className="absolute top-0 h-full rounded-sm"
                      title={`${m.label}: ${fmtDate(m.earliest)} – ${fmtDate(m.latest)}${m.completed ? " ✓" : ""}`}
                      style={{
                        left: `${left}%`,
                        width: `${width}%`,
                        background: m.color,
                        opacity: m.completed ? 0.35 : 0.85,
                        transition: "opacity 0.2s",
                      }}
                    />
                  );
                })}
                {/* Today marker */}
                <div
                  className="absolute top-0 h-full w-px"
                  style={{
                    left: `${todayPct}%`,
                    background: "oklch(0.72 0.12 75)",
                    boxShadow: "0 0 4px oklch(0.72 0.12 75 / 60%)",
                  }}
                />
              </div>

              {/* Milestone rows */}
              <div className="flex flex-col gap-2">
                {tank.milestones.map((m) => {
                  const isUpcoming = !m.completed && Date.now() < m.earliest;
                  const isWindow = !m.completed && Date.now() >= m.earliest && Date.now() <= m.latest;
                  const isOverdue = !m.completed && Date.now() > m.latest;

                  return (
                    <div
                      key={m.id}
                      className="flex items-center gap-3"
                      style={{ minHeight: "28px" }}
                    >
                      {/* Status dot */}
                      <div
                        className="flex-shrink-0 w-4 h-4 rounded-full flex items-center justify-center"
                        style={{
                          background: m.completed
                            ? "oklch(0.55 0.20 150 / 20%)"
                            : isWindow
                            ? `${m.color}22`
                            : isOverdue
                            ? "oklch(0.55 0.20 25 / 15%)"
                            : "var(--ow-bg-base)",
                          border: `1.5px solid ${
                            m.completed
                              ? "oklch(0.55 0.20 150)"
                              : isWindow
                              ? m.color
                              : isOverdue
                              ? "oklch(0.55 0.20 25)"
                              : "var(--ow-border)"
                          }`,
                        }}
                      >
                        {m.completed && (
                          <svg width="8" height="8" viewBox="0 0 8 8" fill="none">
                            <path d="M1.5 4l2 2 3-3" stroke="oklch(0.55 0.20 150)" strokeWidth="1.2" strokeLinecap="round" strokeLinejoin="round" />
                          </svg>
                        )}
                        {isWindow && !m.completed && (
                          <div className="w-1.5 h-1.5 rounded-full" style={{ background: m.color }} />
                        )}
                        {isOverdue && !m.completed && (
                          <svg width="8" height="8" viewBox="0 0 8 8" fill="none">
                            <path d="M4 2v3M4 6.5v.5" stroke="oklch(0.55 0.20 25)" strokeWidth="1.2" strokeLinecap="round" />
                          </svg>
                        )}
                      </div>

                      {/* Label */}
                      <span
                        style={{
                          fontSize: "0.8125rem",
                          fontWeight: isWindow ? 600 : 400,
                          color: m.completed
                            ? "var(--ow-text-lo)"
                            : isWindow
                            ? "var(--ow-text-hi)"
                            : isOverdue
                            ? "oklch(0.65 0.18 25)"
                            : "var(--ow-text-mid)",
                          textDecoration: m.completed ? "line-through" : "none",
                          opacity: m.completed ? 0.6 : 1,
                        }}
                      >
                        {m.label}
                      </span>

                      {/* Date range */}
                      <span
                        className="ml-auto text-right flex-shrink-0"
                        style={{
                          fontSize: "0.7rem",
                          fontFamily: "'Fira Code',monospace",
                          color: isWindow
                            ? m.color
                            : isOverdue
                            ? "oklch(0.65 0.18 25)"
                            : "var(--ow-text-lo)",
                          letterSpacing: "0.02em",
                        }}
                      >
                        {m.completed ? "✓ logged" : `${fmtDate(m.earliest)} – ${fmtDate(m.latest)}`}
                      </span>

                      {/* Status badge */}
                      {!m.completed && (
                        <span
                          className="flex-shrink-0 px-1.5 py-0.5 rounded-sm"
                          style={{
                            fontSize: "0.6rem",
                            fontFamily: "'Fira Code',monospace",
                            letterSpacing: "0.06em",
                            background: isWindow
                              ? `${m.color}22`
                              : isOverdue
                              ? "oklch(0.55 0.20 25 / 15%)"
                              : "transparent",
                            color: isWindow
                              ? m.color
                              : isOverdue
                              ? "oklch(0.65 0.18 25)"
                              : "var(--ow-text-lo)",
                            border: `1px solid ${
                              isWindow
                                ? `${m.color}44`
                                : isOverdue
                                ? "oklch(0.55 0.20 25 / 30%)"
                                : "transparent"
                            }`,
                          }}
                        >
                          {isWindow ? "NOW" : isOverdue ? "OVERDUE" : isUpcoming ? "UPCOMING" : ""}
                        </span>
                      )}
                    </div>
                  );
                })}
              </div>
            </div>
          );
        })}
      </div>

      {/* Footer note */}
      <p
        className="mt-6 text-center"
        style={{
          fontSize: "0.7rem",
          color: "var(--ow-text-lo)",
          fontStyle: "italic",
          lineHeight: 1.6,
        }}
      >
        Projected dates are estimates based on variety and inoculation date. Actual timing depends on temperature, YAN, and winemaker style decisions.
        <br />
        Sources: Iland et al. (2004); Zoecklein et al. (1999); Ownology Field to Glass KB.
      </p>
    </div>
  );
}
