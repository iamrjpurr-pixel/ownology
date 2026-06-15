import { trpc } from "@/lib/trpc";
import { getLoginUrl } from "@/const";
import { Link } from "wouter";
import {
  FlaskConical,
  Droplets,
  Package,
  ClipboardList,
  TrendingUp,
  AlertCircle,
  CheckCircle2,
  Clock,
  Activity,
  BarChart3,
  Layers,
  CalendarDays,
  DollarSign,
  Boxes,
} from "lucide-react";

// ─── Helpers ──────────────────────────────────────────────────────────────────

function daysSinceLabel(days: number | null): string {
  if (days === null) return "No inoculation";
  if (days === 0) return "Inoculated today";
  if (days === 1) return "1 day since inoculation";
  return `${days} days since inoculation`;
}

function statusColor(tank: {
  isActiveFerment: boolean;
  daysSinceInoculation: number | null;
  lastEventAt: number | null;
}): string {
  if (tank.isActiveFerment) return "bg-amber-500";
  if (tank.daysSinceInoculation !== null) return "bg-emerald-500";
  return "bg-zinc-600";
}

function statusLabel(tank: {
  isActiveFerment: boolean;
  daysSinceInoculation: number | null;
}): string {
  if (tank.isActiveFerment) return "Active ferment";
  if (tank.daysSinceInoculation !== null) return "Post-ferment";
  return "No inoculation";
}

function eventTypeLabel(et: string | null): string {
  if (!et) return "—";
  const map: Record<string, string> = {
    addition: "Addition",
    measurement: "Measurement",
    racking: "Racking",
    inoculation: "Inoculation",
    observation: "Observation",
    other: "Other",
  };
  return map[et] ?? et;
}

function relativeTime(ts: number | null): string {
  if (!ts) return "—";
  const diff = Date.now() - ts;
  const mins = Math.floor(diff / 60000);
  if (mins < 60) return `${mins}m ago`;
  const hrs = Math.floor(mins / 60);
  if (hrs < 24) return `${hrs}h ago`;
  const days = Math.floor(hrs / 24);
  return `${days}d ago`;
}

// ─── Stat Card ────────────────────────────────────────────────────────────────

function StatCard({
  icon: Icon,
  label,
  value,
  sub,
  accent,
}: {
  icon: React.ElementType;
  label: string;
  value: string | number;
  sub?: string;
  accent?: string;
}) {
  return (
    <div className="rounded-xl border border-white/8 bg-[oklch(0.14_0.008_60)] p-5 flex flex-col gap-3">
      <div className="flex items-center gap-2">
        <Icon
          className="w-4 h-4 flex-shrink-0"
          style={{ color: accent ?? "var(--ow-amber)" }}
        />
        <span
          className="text-xs tracking-widest uppercase"
          style={{ fontFamily: "'Lato',sans-serif", color: "var(--ow-text-lo)" }}
        >
          {label}
        </span>
      </div>
      <div>
        <p
          className="text-3xl font-bold leading-none"
          style={{ fontFamily: "'Fraunces',serif", color: "var(--ow-text-hi)" }}
        >
          {value}
        </p>
        {sub && (
          <p
            className="mt-1 text-xs"
            style={{ fontFamily: "'Lato',sans-serif", color: "var(--ow-text-lo)" }}
          >
            {sub}
          </p>
        )}
      </div>
    </div>
  );
}

// ─── Main Component ───────────────────────────────────────────────────────────

export default function ProductionDashboard() {
  const { data: stats, isLoading, error } = trpc.dashboard.getStats.useQuery(undefined, {
    refetchInterval: 60_000, // refresh every minute
    retry: false,
  });

  // Build phase: show loading spinner while fetching, empty state if no data (no login wall)
  if (isLoading) {
    return (
      <div
        className="min-h-screen flex items-center justify-center"
        style={{ background: "var(--ow-bg-base)" }}
      >
        <div className="w-6 h-6 rounded-full border-2 border-t-transparent animate-spin" style={{ borderColor: "var(--ow-amber)" }} />
      </div>
    );
  }

  if (!stats) {
    return (
      <div
        className="min-h-screen flex flex-col items-center justify-center gap-3"
        style={{ background: "var(--ow-bg-base)" }}
      >
        <p style={{ color: "var(--ow-text-mid)", fontFamily: "'Lato',sans-serif", fontSize: "0.9rem" }}>
          No production data yet — log your first vintage entry in{" "}
          <a href="/the-press" style={{ color: "var(--ow-amber)" }}>The Press</a>.
        </p>
      </div>
    );
  }

  const {
    totalTanks,
    activeFermentCount,
    totalActiveFermentLitres,
    approachingBottlingCount,
    totalLogEntries,
    totalBatches,
    recentAdditions,
    tankSummaries,
    vintageComparison,
  } = stats;

  return (
    <div
      className="min-h-screen"
      style={{ background: "var(--ow-bg-base)", fontFamily: "'Lato',sans-serif" }}
    >
      {/* ── Header ── */}
      <div
        className="border-b"
        style={{ borderColor: "var(--ow-border)", background: "var(--ow-bg-base)" }}
      >
        <div className="container py-6 flex items-center justify-between">
          <div>
            <h1
              className="text-2xl font-bold"
              style={{ fontFamily: "'Fraunces',serif", color: "var(--ow-text-hi)" }}
            >
              Production Dashboard
            </h1>
            <p className="text-sm mt-0.5" style={{ color: "var(--ow-text-lo)" }}>
              Live cellar overview · refreshes every minute
            </p>
          </div>
          <Link
            href="/the-press"
            className="flex items-center gap-2 px-4 py-2 rounded text-sm"
            style={{
              background: "color-mix(in oklch, var(--ow-amber) 15%, transparent)",
              color: "var(--ow-amber)",
              border: "1px solid color-mix(in oklch, var(--ow-amber) 30%, transparent)",
            }}
          >
            <Activity className="w-4 h-4" />
            Open The Press
          </Link>
        </div>
      </div>

      <div className="container py-8 flex flex-col gap-8">

        {/* ── KPI Grid ── */}
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
          <StatCard
            icon={FlaskConical}
            label="Active Tanks"
            value={totalTanks}
            sub={`${totalBatches} batch${totalBatches !== 1 ? "es" : ""} registered`}
          />
          <StatCard
            icon={Activity}
            label="In Ferment"
            value={activeFermentCount}
            sub={
              totalActiveFermentLitres > 0
                ? `${totalActiveFermentLitres.toLocaleString()} L active`
                : "≤14 days since inoculation"
            }
            accent="var(--ow-amber)"
          />
          <StatCard
            icon={Package}
            label="Approaching Bottling"
            value={approachingBottlingCount}
            sub="60–120 days post-inoculation"
            accent="oklch(0.65 0.15 160)"
          />
          <StatCard
            icon={ClipboardList}
            label="Log Entries"
            value={totalLogEntries}
            sub={`${recentAdditions} addition${recentAdditions !== 1 ? "s" : ""} this week`}
            accent="oklch(0.65 0.12 250)"
          />
        </div>

        {/* ── Tank Status Grid ── */}
        <div>
          <div className="flex items-center gap-2 mb-4">
            <Layers className="w-4 h-4" style={{ color: "var(--ow-amber)" }} />
            <h2
              className="text-sm tracking-widest uppercase"
              style={{ color: "var(--ow-text-lo)" }}
            >
              Tank Status
            </h2>
          </div>

          {tankSummaries.length === 0 ? (
            <div
              className="rounded-xl border p-10 text-center"
              style={{ borderColor: "var(--ow-border)", background: "var(--ow-bg-raised)" }}
            >
              <FlaskConical className="w-10 h-10 mx-auto mb-3 opacity-30" style={{ color: "var(--ow-amber)" }} />
              <p style={{ color: "var(--ow-text-lo)" }}>
                No tanks logged yet.{" "}
                <Link href="/the-press" style={{ color: "var(--ow-amber)" }}>
                  Open The Press
                </Link>{" "}
                to add your first entry.
              </p>
            </div>
          ) : (
            <div className="rounded-xl border overflow-hidden" style={{ borderColor: "var(--ow-border)" }}>
              {/* Table header */}
              <div
                className="grid grid-cols-6 gap-4 px-5 py-3 text-xs tracking-widest uppercase"
                style={{
                  background: "var(--ow-bg-base)",
                  color: "var(--ow-text-lo)",
                  borderBottom: "1px solid var(--ow-border)",
                }}
              >
                <span className="col-span-2">Tank</span>
                <span>Status</span>
                <span>Days</span>
                <span>Last Event</span>
                <span>Volume</span>
              </div>

              {/* Tank rows */}
              {tankSummaries.map((tank, i) => (
                <div
                  key={tank.tankName}
                  className="grid grid-cols-6 gap-4 px-5 py-4 items-center"
                  style={{
                    background: i % 2 === 0 ? "var(--ow-bg-raised)" : "var(--ow-bg-base)",
                    borderBottom: i < tankSummaries.length - 1 ? "1px solid var(--ow-border)" : "none",
                  }}
                >
                  {/* Tank name + variety */}
                  <div className="col-span-2 flex flex-col gap-0.5">
                    <span
                      className="font-medium text-sm"
                      style={{ color: "var(--ow-text-hi)" }}
                    >
                      {tank.tankName}
                    </span>
                    <span
                      className="text-xs"
                      style={{ color: "var(--ow-text-lo)" }}
                    >
                      {tank.variety}
                    </span>
                  </div>

                  {/* Status badge */}
                  <div className="flex items-center gap-2">
                    <span
                      className={`w-2 h-2 rounded-full flex-shrink-0 ${statusColor(tank)}`}
                    />
                    <span
                      className="text-xs"
                      style={{ color: "var(--ow-text-lo)" }}
                    >
                      {statusLabel(tank)}
                    </span>
                  </div>

                  {/* Days since inoculation */}
                  <span
                    className="text-sm"
                    style={{
                      color: tank.isActiveFerment
                        ? "var(--ow-amber)"
                        : "oklch(0.60 0.012 75)",
                    }}
                  >
                    {tank.daysSinceInoculation !== null ? `${tank.daysSinceInoculation}d` : "—"}
                  </span>

                  {/* Last event */}
                  <div className="flex flex-col gap-0.5">
                    <span className="text-xs" style={{ color: "var(--ow-text-lo)" }}>
                      {eventTypeLabel(tank.lastEventType)}
                    </span>
                    <span className="text-xs" style={{ color: "var(--ow-text-lo)" }}>
                      {relativeTime(tank.lastEventAt)}
                    </span>
                  </div>

                  {/* Volume */}
                  <span className="text-sm" style={{ color: "var(--ow-text-lo)" }}>
                    {tank.volumeLitres ? `${tank.volumeLitres.toLocaleString()} L` : "—"}
                  </span>
                </div>
              ))}
            </div>
          )}
        </div>

        {/* ── Quick Links ── */}
        <div>
          <div className="flex items-center gap-2 mb-4">
            <BarChart3 className="w-4 h-4" style={{ color: "var(--ow-amber)" }} />
            <h2
              className="text-sm tracking-widest uppercase"
              style={{ color: "var(--ow-text-lo)" }}
            >
              Quick Access
            </h2>
          </div>
          <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
            {[
              { href: "/the-press", label: "The Press", sub: "Log entries & batches", icon: Activity },
              { href: "/cellar-tasks", label: "Cellar Tasks", sub: "Cleaning & maintenance", icon: CheckCircle2 },
              { href: "/compliance", label: "Compliance AI", sub: "Regulatory guidance", icon: AlertCircle },
              { href: "/batch-book", label: "Batch Book", sub: "LIP records", icon: ClipboardList },
            ].map(({ href, label, sub, icon: Icon }) => (
              <Link
                key={href}
                href={href}
                className="rounded-xl border p-4 flex flex-col gap-2 transition-colors"
                style={{
                  borderColor: "var(--ow-border)",
                  background: "var(--ow-bg-raised)",
                }}
              >
                <Icon className="w-5 h-5" style={{ color: "var(--ow-amber)" }} />
                <div>
                  <p className="text-sm font-medium" style={{ color: "var(--ow-text-hi)" }}>
                    {label}
                  </p>
                  <p className="text-xs mt-0.5" style={{ color: "var(--ow-text-lo)" }}>
                    {sub}
                  </p>
                </div>
              </Link>
            ))}
          </div>
        </div>

        {/* ── Vintage Summary ── */}
        {totalBatches > 0 && (
          <div>
            <div className="flex items-center gap-2 mb-4">
              <TrendingUp className="w-4 h-4" style={{ color: "var(--ow-amber)" }} />
              <h2
                className="text-sm tracking-widest uppercase"
                style={{ color: "var(--ow-text-lo)" }}
              >
                Vintage Summary
              </h2>
            </div>
            <div
              className="rounded-xl border p-5 flex items-center gap-8"
              style={{ borderColor: "var(--ow-border)", background: "var(--ow-bg-raised)" }}
            >
              <div className="flex flex-col gap-1">
                <span className="text-xs uppercase tracking-widest" style={{ color: "var(--ow-text-lo)" }}>
                  Batches
                </span>
                <span className="text-2xl font-bold" style={{ fontFamily: "'Fraunces',serif", color: "var(--ow-text-hi)" }}>
                  {totalBatches}
                </span>
              </div>
              <div className="w-px h-10 bg-white/8" />
              <div className="flex flex-col gap-1">
                <span className="text-xs uppercase tracking-widest" style={{ color: "var(--ow-text-lo)" }}>
                  Total Entries
                </span>
                <span className="text-2xl font-bold" style={{ fontFamily: "'Fraunces',serif", color: "var(--ow-text-hi)" }}>
                  {totalLogEntries}
                </span>
              </div>
              <div className="w-px h-10 bg-white/8" />
              <div className="flex flex-col gap-1">
                <span className="text-xs uppercase tracking-widest" style={{ color: "var(--ow-text-lo)" }}>
                  Active Ferment
                </span>
                <span className="text-2xl font-bold" style={{ fontFamily: "'Fraunces',serif", color: "var(--ow-amber)" }}>
                  {activeFermentCount}
                </span>
              </div>
              {totalActiveFermentLitres > 0 && (
                <>
                  <div className="w-px h-10 bg-white/8" />
                  <div className="flex flex-col gap-1">
                    <span className="text-xs uppercase tracking-widest" style={{ color: "var(--ow-text-lo)" }}>
                      Litres Fermenting
                    </span>
                    <span className="text-2xl font-bold" style={{ fontFamily: "'Fraunces',serif", color: "oklch(0.65 0.15 160)" }}>
                      {totalActiveFermentLitres.toLocaleString()} L
                    </span>
                  </div>
                </>
              )}
              <div className="ml-auto">
                <Link
                  href="/batch-book"
                  className="text-sm px-4 py-2 rounded"
                  style={{
                    background: "color-mix(in oklch, var(--ow-amber) 15%, transparent)",
                    color: "var(--ow-amber)",
                    border: "1px solid color-mix(in oklch, var(--ow-amber) 30%, transparent)",
                  }}
                >
                  View Batch Book →
                </Link>
              </div>
            </div>
          </div>
        )}

        {/* ── DR-15: Production Planning ── */}
        <div>
          <div className="flex items-center gap-2 mb-4">
            <CalendarDays className="w-4 h-4" style={{ color: "var(--ow-amber)" }} />
            <h2 className="text-sm tracking-widest uppercase" style={{ color: "var(--ow-text-lo)" }}>
              Production Planning
            </h2>
          </div>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            {/* Approaching bottling */}
            <div className="rounded-xl border p-5" style={{ borderColor: "var(--ow-border)", background: "var(--ow-bg-raised)" }}>
              <div className="flex items-center gap-2 mb-3">
                <Package className="w-4 h-4" style={{ color: "oklch(0.65 0.15 160)" }} />
                <span className="text-xs uppercase tracking-widest" style={{ color: "var(--ow-text-lo)" }}>Bottling Queue</span>
              </div>
              <p className="text-3xl font-bold" style={{ fontFamily: "'Fraunces',serif", color: "var(--ow-text-hi)" }}>
                {approachingBottlingCount}
              </p>
              <p className="text-xs mt-1" style={{ color: "var(--ow-text-lo)" }}>tanks 60–120 days post-inoculation</p>
              <Link href="/the-press" className="mt-3 block text-xs" style={{ color: "var(--ow-amber)" }}>Schedule bottling runs →</Link>
            </div>
            {/* Active ferments */}
            <div className="rounded-xl border p-5" style={{ borderColor: "var(--ow-border)", background: "var(--ow-bg-raised)" }}>
              <div className="flex items-center gap-2 mb-3">
                <Activity className="w-4 h-4" style={{ color: "var(--ow-amber)" }} />
                <span className="text-xs uppercase tracking-widest" style={{ color: "var(--ow-text-lo)" }}>Active Ferments</span>
              </div>
              <p className="text-3xl font-bold" style={{ fontFamily: "'Fraunces',serif", color: "var(--ow-text-hi)" }}>
                {activeFermentCount}
              </p>
              <p className="text-xs mt-1" style={{ color: "var(--ow-text-lo)" }}>tanks ≤14 days since inoculation</p>
              <Link href="/the-press" className="mt-3 block text-xs" style={{ color: "var(--ow-amber)" }}>View fermentation log →</Link>
            </div>
            {/* Cellar tasks */}
            <div className="rounded-xl border p-5" style={{ borderColor: "var(--ow-border)", background: "var(--ow-bg-raised)" }}>
              <div className="flex items-center gap-2 mb-3">
                <CheckCircle2 className="w-4 h-4" style={{ color: "oklch(0.65 0.12 250)" }} />
                <span className="text-xs uppercase tracking-widest" style={{ color: "var(--ow-text-lo)" }}>Task Planner</span>
              </div>
              <p className="text-3xl font-bold" style={{ fontFamily: "'Fraunces',serif", color: "var(--ow-text-hi)" }}>AI</p>
              <p className="text-xs mt-1" style={{ color: "var(--ow-text-lo)" }}>Generate cellar tasks from your log</p>
              <Link href="/cellar-tasks" className="mt-3 block text-xs" style={{ color: "var(--ow-amber)" }}>Open Cellar Tasks →</Link>
            </div>
          </div>
        </div>

        {/* ── DR-15: Multi-Vintage Comparison Table ── */}
        {vintageComparison && vintageComparison.length > 0 && (
          <div>
            <div className="flex items-center gap-2 mb-4">
              <Layers className="w-4 h-4" style={{ color: "var(--ow-amber)" }} />
              <h2 className="text-sm tracking-widest uppercase" style={{ color: "var(--ow-text-lo)" }}>
                Multi-Vintage Comparison
              </h2>
            </div>
            <div className="rounded-xl border overflow-hidden" style={{ borderColor: "var(--ow-border)", background: "var(--ow-bg-raised)" }}>
              {/* Table header */}
              <div
                className="grid gap-0 text-xs uppercase tracking-widest px-4 py-3"
                style={{
                  gridTemplateColumns: "80px 1fr 1fr 90px 110px 100px",
                  background: "var(--ow-bg-base)",
                  color: "var(--ow-text-lo)",
                  borderBottom: "1px solid var(--ow-border)",
                  fontFamily: "'Fira Code', monospace",
                  letterSpacing: "0.08em",
                }}
              >
                <span>Vintage</span>
                <span>Batch / Variety</span>
                <span>Tank</span>
                <span>Volume</span>
                <span>Inoculation</span>
                <span>Status</span>
              </div>
              {/* Table rows */}
              {vintageComparison.flatMap((vc) =>
                vc.batches.map((b, i) => {
                  const statusColors: Record<string, { bg: string; text: string }> = {
                    "Fermenting":        { bg: "oklch(0.22 0.06 75)",  text: "var(--ow-amber)" },
                    "Maturing":          { bg: "oklch(0.22 0.06 250)", text: "oklch(0.70 0.12 250)" },
                    "Post-Ferment":      { bg: "oklch(0.22 0.06 250)", text: "oklch(0.70 0.12 250)" },
                    "Awaiting Bottling": { bg: "oklch(0.22 0.06 30)",  text: "oklch(0.70 0.12 30)" },
                    "Bottled":           { bg: "oklch(0.22 0.06 145)", text: "oklch(0.75 0.15 145)" },
                    "Registered":        { bg: "oklch(0.18 0.005 60)", text: "oklch(0.50 0.010 75)" },
                  };
                  const sc = statusColors[b.status] ?? statusColors["Registered"];
                  return (
                    <div
                      key={b.batchId}
                      className="grid gap-0 px-4 py-3 items-center"
                      style={{
                        gridTemplateColumns: "80px 1fr 1fr 90px 110px 100px",
                        borderBottom: "1px solid var(--ow-border)",
                        background: i % 2 === 0 ? "transparent" : "oklch(0.13 0.008 60 / 40%)",
                      }}
                    >
                      {/* Vintage — only show on first row of each vintage group */}
                      <span style={{ fontFamily: "'Fraunces', serif", fontWeight: 700, fontSize: "1rem", color: i === 0 ? "var(--ow-amber)" : "transparent" }}>
                        {vc.vintage}
                      </span>
                      {/* Batch / Variety */}
                      <div>
                        <p style={{ fontFamily: "'Fira Code', monospace", fontSize: "0.7rem", color: "var(--ow-amber)", letterSpacing: "0.06em" }}>{b.batchId}</p>
                        <p style={{ fontFamily: "'Lato', sans-serif", fontSize: "0.8125rem", color: "var(--ow-text-hi)" }}>{b.variety}</p>
                      </div>
                      {/* Tank */}
                      <span style={{ fontFamily: "'Lato', sans-serif", fontSize: "0.8125rem", color: "var(--ow-text-mid)" }}>
                        {b.tankName ?? "—"}
                      </span>
                      {/* Volume */}
                      <span style={{ fontFamily: "'Fira Code', monospace", fontSize: "0.8rem", color: b.volumeLitres ? "oklch(0.65 0.15 160)" : "oklch(0.40 0.008 75)" }}>
                        {b.volumeLitres ? `${b.volumeLitres.toLocaleString()} L` : "—"}
                      </span>
                      {/* Inoculation date */}
                      <span style={{ fontFamily: "'Fira Code', monospace", fontSize: "0.75rem", color: "var(--ow-text-lo)" }}>
                        {b.inoculationDate
                          ? new Date(b.inoculationDate).toLocaleDateString("en-AU", { day: "numeric", month: "short", year: "2-digit" })
                          : "—"}
                      </span>
                      {/* Status badge */}
                      <span
                        className="inline-block px-2 py-0.5 rounded-sm text-xs"
                        style={{ background: sc.bg, color: sc.text, fontFamily: "'Fira Code', monospace", fontSize: "0.65rem", letterSpacing: "0.06em" }}
                      >
                        {b.status.toUpperCase()}
                      </span>
                    </div>
                  );
                })
              )}
              {/* Totals footer */}
              <div
                className="px-4 py-3 flex items-center justify-between"
                style={{ background: "var(--ow-bg-base)", borderTop: "1px solid var(--ow-border)" }}
              >
                <span style={{ fontFamily: "'Fira Code', monospace", fontSize: "0.7rem", color: "var(--ow-text-lo)", letterSpacing: "0.08em" }}>
                  {vintageComparison.length} VINTAGE{vintageComparison.length !== 1 ? "S" : ""} · {vintageComparison.reduce((s, v) => s + v.batches.length, 0)} BATCH{vintageComparison.reduce((s, v) => s + v.batches.length, 0) !== 1 ? "ES" : ""}
                </span>
                <span style={{ fontFamily: "'Fira Code', monospace", fontSize: "0.7rem", color: "oklch(0.65 0.15 160)", letterSpacing: "0.08em" }}>
                  {vintageComparison.reduce((s, v) => s + v.totalVolume, 0).toLocaleString()} L TOTAL
                </span>
              </div>
            </div>
          </div>
        )}

        {/* ── DR-17: Cellar Value ── */}
        {totalActiveFermentLitres > 0 && (() => {
          // Calculate weighted average cost per litre from tanks that have it set
          const tanksWithCost = tankSummaries.filter((t) => t.isActiveFerment && t.volumeLitres && t.costPerLitre);
          const tanksWithoutCost = tankSummaries.filter((t) => t.isActiveFerment && t.volumeLitres && !t.costPerLitre);
          const hasUserCost = tanksWithCost.length > 0;
          const weightedCostTotal = tanksWithCost.reduce((sum, t) => sum + (t.volumeLitres! * t.costPerLitre!), 0);
          const weightedCostVolume = tanksWithCost.reduce((sum, t) => sum + t.volumeLitres!, 0);
          const avgCostPerLitre = weightedCostVolume > 0 ? weightedCostTotal / weightedCostVolume : null;
          const preciseTiedCapital = avgCostPerLitre ? Math.round(totalActiveFermentLitres * avgCostPerLitre) : null;
          return (
            <div>
              <div className="flex items-center gap-2 mb-4">
                <DollarSign className="w-4 h-4" style={{ color: "var(--ow-amber)" }} />
                <h2 className="text-sm tracking-widest uppercase" style={{ color: "var(--ow-text-lo)" }}>
                  Cellar Value Estimate
                </h2>
                {hasUserCost && (
                  <span className="text-xs px-2 py-0.5 rounded" style={{ background: "oklch(0.22 0.06 145)", color: "oklch(0.75 0.15 145)", fontFamily: "'Fira Code', monospace", letterSpacing: "0.05em" }}>ACTUAL</span>
                )}
              </div>
              <div className="rounded-xl border p-5" style={{ borderColor: "var(--ow-border)", background: "var(--ow-bg-raised)" }}>
                <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                  <div className="flex flex-col gap-1">
                    <span className="text-xs uppercase tracking-widest" style={{ color: "var(--ow-text-lo)" }}>Volume in Cellar</span>
                    <span className="text-2xl font-bold" style={{ fontFamily: "'Fraunces',serif", color: "oklch(0.65 0.15 160)" }}>
                      {totalActiveFermentLitres.toLocaleString()} L
                    </span>
                    <span className="text-xs" style={{ color: "var(--ow-text-lo)" }}>active ferment only</span>
                  </div>
                  <div className="flex flex-col gap-1">
                    <span className="text-xs uppercase tracking-widest" style={{ color: "var(--ow-text-lo)" }}>Est. Bottles (750mL)</span>
                    <span className="text-2xl font-bold" style={{ fontFamily: "'Fraunces',serif", color: "var(--ow-text-hi)" }}>
                      {Math.round(totalActiveFermentLitres / 0.75 * 0.85).toLocaleString()}
                    </span>
                    <span className="text-xs" style={{ color: "var(--ow-text-lo)" }}>at 85% fill efficiency</span>
                  </div>
                  <div className="flex flex-col gap-1">
                    <span className="text-xs uppercase tracking-widest" style={{ color: "var(--ow-text-lo)" }}>Tied Capital</span>
                    {preciseTiedCapital !== null ? (
                      <>
                        <span className="text-2xl font-bold" style={{ fontFamily: "'Fraunces',serif", color: "var(--ow-amber)" }}>
                          ${preciseTiedCapital.toLocaleString()}
                        </span>
                        <span className="text-xs" style={{ color: "var(--ow-text-lo)" }}>
                          at ${avgCostPerLitre!.toFixed(0)}/L (your cost)
                          {tanksWithoutCost.length > 0 && ` · ${tanksWithoutCost.length} tank${tanksWithoutCost.length > 1 ? 's' : ''} using estimate`}
                        </span>
                      </>
                    ) : (
                      <>
                        <span className="text-2xl font-bold" style={{ fontFamily: "'Fraunces',serif", color: "var(--ow-amber)" }}>
                          ${Math.round(totalActiveFermentLitres * 8).toLocaleString()}–${Math.round(totalActiveFermentLitres * 25).toLocaleString()}
                        </span>
                        <span className="text-xs" style={{ color: "var(--ow-text-lo)" }}>est. at $8–$25/L · set cost in Batch Book</span>
                      </>
                    )}
                  </div>
                </div>
                <p className="text-xs mt-4 pt-4" style={{ color: "oklch(0.38 0.008 75)", borderTop: "1px solid var(--ow-border)" }}>
                  {hasUserCost
                    ? `Tied capital calculated from your cost-per-litre entries in the Batch Book. ${tanksWithoutCost.length > 0 ? `${tanksWithoutCost.length} tank${tanksWithoutCost.length > 1 ? 's' : ''} without a cost entry use the $8–$25/L industry range.` : 'All active tanks have cost-per-litre set.'}`
                    : 'Indicative estimate based on industry bulk wine price ranges. Set a cost-per-litre in the Batch Book for precise figures.'}
                </p>
              </div>
            </div>
          );
        })()}

        {/* ── Footer note ── */}
        <p className="text-xs text-center pb-4" style={{ color: "oklch(0.38 0.008 75)" }}>
          Data sourced from The Press vintage log · DR-19 Production Dashboard · Ownology v1.0
        </p>
      </div>
    </div>
  );
}
