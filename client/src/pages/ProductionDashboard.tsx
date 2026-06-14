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
          style={{ color: accent ?? "oklch(0.72 0.12 75)" }}
        />
        <span
          className="text-xs tracking-widest uppercase"
          style={{ fontFamily: "'Lato',sans-serif", color: "oklch(0.55 0.012 75)" }}
        >
          {label}
        </span>
      </div>
      <div>
        <p
          className="text-3xl font-bold leading-none"
          style={{ fontFamily: "'Fraunces',serif", color: "oklch(0.92 0.018 75)" }}
        >
          {value}
        </p>
        {sub && (
          <p
            className="mt-1 text-xs"
            style={{ fontFamily: "'Lato',sans-serif", color: "oklch(0.55 0.012 75)" }}
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
        style={{ background: "oklch(0.11 0.008 60)" }}
      >
        <div className="w-6 h-6 rounded-full border-2 border-t-transparent animate-spin" style={{ borderColor: "oklch(0.72 0.12 75)" }} />
      </div>
    );
  }

  if (!stats) {
    return (
      <div
        className="min-h-screen flex flex-col items-center justify-center gap-3"
        style={{ background: "oklch(0.11 0.008 60)" }}
      >
        <p style={{ color: "oklch(0.65 0.015 75)", fontFamily: "'Lato',sans-serif", fontSize: "0.9rem" }}>
          No production data yet — log your first vintage entry in{" "}
          <a href="/the-press" style={{ color: "oklch(0.72 0.12 75)" }}>The Press</a>.
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
  } = stats;

  return (
    <div
      className="min-h-screen"
      style={{ background: "oklch(0.11 0.008 60)", fontFamily: "'Lato',sans-serif" }}
    >
      {/* ── Header ── */}
      <div
        className="border-b"
        style={{ borderColor: "oklch(1 0 0 / 6%)", background: "oklch(0.12 0.008 60)" }}
      >
        <div className="container py-6 flex items-center justify-between">
          <div>
            <h1
              className="text-2xl font-bold"
              style={{ fontFamily: "'Fraunces',serif", color: "oklch(0.92 0.018 75)" }}
            >
              Production Dashboard
            </h1>
            <p className="text-sm mt-0.5" style={{ color: "oklch(0.55 0.012 75)" }}>
              Live cellar overview · refreshes every minute
            </p>
          </div>
          <Link
            href="/the-press"
            className="flex items-center gap-2 px-4 py-2 rounded text-sm"
            style={{
              background: "oklch(0.72 0.12 75 / 15%)",
              color: "oklch(0.72 0.12 75)",
              border: "1px solid oklch(0.72 0.12 75 / 30%)",
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
            accent="oklch(0.72 0.12 75)"
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
            <Layers className="w-4 h-4" style={{ color: "oklch(0.72 0.12 75)" }} />
            <h2
              className="text-sm tracking-widest uppercase"
              style={{ color: "oklch(0.55 0.012 75)" }}
            >
              Tank Status
            </h2>
          </div>

          {tankSummaries.length === 0 ? (
            <div
              className="rounded-xl border p-10 text-center"
              style={{ borderColor: "oklch(1 0 0 / 8%)", background: "oklch(0.14 0.008 60)" }}
            >
              <FlaskConical className="w-10 h-10 mx-auto mb-3 opacity-30" style={{ color: "oklch(0.72 0.12 75)" }} />
              <p style={{ color: "oklch(0.55 0.012 75)" }}>
                No tanks logged yet.{" "}
                <Link href="/the-press" style={{ color: "oklch(0.72 0.12 75)" }}>
                  Open The Press
                </Link>{" "}
                to add your first entry.
              </p>
            </div>
          ) : (
            <div className="rounded-xl border overflow-hidden" style={{ borderColor: "oklch(1 0 0 / 8%)" }}>
              {/* Table header */}
              <div
                className="grid grid-cols-6 gap-4 px-5 py-3 text-xs tracking-widest uppercase"
                style={{
                  background: "oklch(0.13 0.008 60)",
                  color: "oklch(0.45 0.010 75)",
                  borderBottom: "1px solid oklch(1 0 0 / 6%)",
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
                    background: i % 2 === 0 ? "oklch(0.14 0.008 60)" : "oklch(0.13 0.008 60)",
                    borderBottom: i < tankSummaries.length - 1 ? "1px solid oklch(1 0 0 / 5%)" : "none",
                  }}
                >
                  {/* Tank name + variety */}
                  <div className="col-span-2 flex flex-col gap-0.5">
                    <span
                      className="font-medium text-sm"
                      style={{ color: "oklch(0.88 0.015 75)" }}
                    >
                      {tank.tankName}
                    </span>
                    <span
                      className="text-xs"
                      style={{ color: "oklch(0.55 0.012 75)" }}
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
                      style={{ color: "oklch(0.65 0.012 75)" }}
                    >
                      {statusLabel(tank)}
                    </span>
                  </div>

                  {/* Days since inoculation */}
                  <span
                    className="text-sm"
                    style={{
                      color: tank.isActiveFerment
                        ? "oklch(0.72 0.12 75)"
                        : "oklch(0.60 0.012 75)",
                    }}
                  >
                    {tank.daysSinceInoculation !== null ? `${tank.daysSinceInoculation}d` : "—"}
                  </span>

                  {/* Last event */}
                  <div className="flex flex-col gap-0.5">
                    <span className="text-xs" style={{ color: "oklch(0.65 0.012 75)" }}>
                      {eventTypeLabel(tank.lastEventType)}
                    </span>
                    <span className="text-xs" style={{ color: "oklch(0.45 0.010 75)" }}>
                      {relativeTime(tank.lastEventAt)}
                    </span>
                  </div>

                  {/* Volume */}
                  <span className="text-sm" style={{ color: "oklch(0.65 0.012 75)" }}>
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
            <BarChart3 className="w-4 h-4" style={{ color: "oklch(0.72 0.12 75)" }} />
            <h2
              className="text-sm tracking-widest uppercase"
              style={{ color: "oklch(0.55 0.012 75)" }}
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
                  borderColor: "oklch(1 0 0 / 8%)",
                  background: "oklch(0.14 0.008 60)",
                }}
              >
                <Icon className="w-5 h-5" style={{ color: "oklch(0.72 0.12 75)" }} />
                <div>
                  <p className="text-sm font-medium" style={{ color: "oklch(0.88 0.015 75)" }}>
                    {label}
                  </p>
                  <p className="text-xs mt-0.5" style={{ color: "oklch(0.50 0.010 75)" }}>
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
              <TrendingUp className="w-4 h-4" style={{ color: "oklch(0.72 0.12 75)" }} />
              <h2
                className="text-sm tracking-widest uppercase"
                style={{ color: "oklch(0.55 0.012 75)" }}
              >
                Vintage Summary
              </h2>
            </div>
            <div
              className="rounded-xl border p-5 flex items-center gap-8"
              style={{ borderColor: "oklch(1 0 0 / 8%)", background: "oklch(0.14 0.008 60)" }}
            >
              <div className="flex flex-col gap-1">
                <span className="text-xs uppercase tracking-widest" style={{ color: "oklch(0.45 0.010 75)" }}>
                  Batches
                </span>
                <span className="text-2xl font-bold" style={{ fontFamily: "'Fraunces',serif", color: "oklch(0.92 0.018 75)" }}>
                  {totalBatches}
                </span>
              </div>
              <div className="w-px h-10 bg-white/8" />
              <div className="flex flex-col gap-1">
                <span className="text-xs uppercase tracking-widest" style={{ color: "oklch(0.45 0.010 75)" }}>
                  Total Entries
                </span>
                <span className="text-2xl font-bold" style={{ fontFamily: "'Fraunces',serif", color: "oklch(0.92 0.018 75)" }}>
                  {totalLogEntries}
                </span>
              </div>
              <div className="w-px h-10 bg-white/8" />
              <div className="flex flex-col gap-1">
                <span className="text-xs uppercase tracking-widest" style={{ color: "oklch(0.45 0.010 75)" }}>
                  Active Ferment
                </span>
                <span className="text-2xl font-bold" style={{ fontFamily: "'Fraunces',serif", color: "oklch(0.72 0.12 75)" }}>
                  {activeFermentCount}
                </span>
              </div>
              {totalActiveFermentLitres > 0 && (
                <>
                  <div className="w-px h-10 bg-white/8" />
                  <div className="flex flex-col gap-1">
                    <span className="text-xs uppercase tracking-widest" style={{ color: "oklch(0.45 0.010 75)" }}>
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
                    background: "oklch(0.72 0.12 75 / 15%)",
                    color: "oklch(0.72 0.12 75)",
                    border: "1px solid oklch(0.72 0.12 75 / 30%)",
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
            <CalendarDays className="w-4 h-4" style={{ color: "oklch(0.72 0.12 75)" }} />
            <h2 className="text-sm tracking-widest uppercase" style={{ color: "oklch(0.55 0.012 75)" }}>
              Production Planning
            </h2>
          </div>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            {/* Approaching bottling */}
            <div className="rounded-xl border p-5" style={{ borderColor: "oklch(1 0 0 / 8%)", background: "oklch(0.14 0.008 60)" }}>
              <div className="flex items-center gap-2 mb-3">
                <Package className="w-4 h-4" style={{ color: "oklch(0.65 0.15 160)" }} />
                <span className="text-xs uppercase tracking-widest" style={{ color: "oklch(0.50 0.010 75)" }}>Bottling Queue</span>
              </div>
              <p className="text-3xl font-bold" style={{ fontFamily: "'Fraunces',serif", color: "oklch(0.92 0.018 75)" }}>
                {approachingBottlingCount}
              </p>
              <p className="text-xs mt-1" style={{ color: "oklch(0.50 0.010 75)" }}>tanks 60–120 days post-inoculation</p>
              <Link href="/the-press" className="mt-3 block text-xs" style={{ color: "oklch(0.72 0.12 75)" }}>Schedule bottling runs →</Link>
            </div>
            {/* Active ferments */}
            <div className="rounded-xl border p-5" style={{ borderColor: "oklch(1 0 0 / 8%)", background: "oklch(0.14 0.008 60)" }}>
              <div className="flex items-center gap-2 mb-3">
                <Activity className="w-4 h-4" style={{ color: "oklch(0.72 0.12 75)" }} />
                <span className="text-xs uppercase tracking-widest" style={{ color: "oklch(0.50 0.010 75)" }}>Active Ferments</span>
              </div>
              <p className="text-3xl font-bold" style={{ fontFamily: "'Fraunces',serif", color: "oklch(0.92 0.018 75)" }}>
                {activeFermentCount}
              </p>
              <p className="text-xs mt-1" style={{ color: "oklch(0.50 0.010 75)" }}>tanks ≤14 days since inoculation</p>
              <Link href="/the-press" className="mt-3 block text-xs" style={{ color: "oklch(0.72 0.12 75)" }}>View fermentation log →</Link>
            </div>
            {/* Cellar tasks */}
            <div className="rounded-xl border p-5" style={{ borderColor: "oklch(1 0 0 / 8%)", background: "oklch(0.14 0.008 60)" }}>
              <div className="flex items-center gap-2 mb-3">
                <CheckCircle2 className="w-4 h-4" style={{ color: "oklch(0.65 0.12 250)" }} />
                <span className="text-xs uppercase tracking-widest" style={{ color: "oklch(0.50 0.010 75)" }}>Task Planner</span>
              </div>
              <p className="text-3xl font-bold" style={{ fontFamily: "'Fraunces',serif", color: "oklch(0.92 0.018 75)" }}>AI</p>
              <p className="text-xs mt-1" style={{ color: "oklch(0.50 0.010 75)" }}>Generate cellar tasks from your log</p>
              <Link href="/cellar-tasks" className="mt-3 block text-xs" style={{ color: "oklch(0.72 0.12 75)" }}>Open Cellar Tasks →</Link>
            </div>
          </div>
        </div>

        {/* ── DR-17: Cellar Value ── */}
        {totalActiveFermentLitres > 0 && (
          <div>
            <div className="flex items-center gap-2 mb-4">
              <DollarSign className="w-4 h-4" style={{ color: "oklch(0.72 0.12 75)" }} />
              <h2 className="text-sm tracking-widest uppercase" style={{ color: "oklch(0.55 0.012 75)" }}>
                Cellar Value Estimate
              </h2>
            </div>
            <div className="rounded-xl border p-5" style={{ borderColor: "oklch(1 0 0 / 8%)", background: "oklch(0.14 0.008 60)" }}>
              <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                <div className="flex flex-col gap-1">
                  <span className="text-xs uppercase tracking-widest" style={{ color: "oklch(0.45 0.010 75)" }}>Volume in Cellar</span>
                  <span className="text-2xl font-bold" style={{ fontFamily: "'Fraunces',serif", color: "oklch(0.65 0.15 160)" }}>
                    {totalActiveFermentLitres.toLocaleString()} L
                  </span>
                  <span className="text-xs" style={{ color: "oklch(0.45 0.010 75)" }}>active ferment only</span>
                </div>
                <div className="flex flex-col gap-1">
                  <span className="text-xs uppercase tracking-widest" style={{ color: "oklch(0.45 0.010 75)" }}>Est. Bottles (750mL)</span>
                  <span className="text-2xl font-bold" style={{ fontFamily: "'Fraunces',serif", color: "oklch(0.92 0.018 75)" }}>
                    {Math.round(totalActiveFermentLitres / 0.75 * 0.85).toLocaleString()}
                  </span>
                  <span className="text-xs" style={{ color: "oklch(0.45 0.010 75)" }}>at 85% fill efficiency</span>
                </div>
                <div className="flex flex-col gap-1">
                  <span className="text-xs uppercase tracking-widest" style={{ color: "oklch(0.45 0.010 75)" }}>Tied Capital Range</span>
                  <span className="text-2xl font-bold" style={{ fontFamily: "'Fraunces',serif", color: "oklch(0.72 0.12 75)" }}>
                    ${Math.round(totalActiveFermentLitres * 8).toLocaleString()}–${Math.round(totalActiveFermentLitres * 25).toLocaleString()}
                  </span>
                  <span className="text-xs" style={{ color: "oklch(0.45 0.010 75)" }}>est. at $8–$25/L bulk value · update in Batch Book</span>
                </div>
              </div>
              <p className="text-xs mt-4 pt-4" style={{ color: "oklch(0.38 0.008 75)", borderTop: "1px solid oklch(1 0 0 / 6%)" }}>
                Cellar value is an indicative estimate based on volume and industry bulk wine price ranges. Enter actual cost-per-litre in the Batch Book for precise figures.
              </p>
            </div>
          </div>
        )}

        {/* ── Footer note ── */}
        <p className="text-xs text-center pb-4" style={{ color: "oklch(0.38 0.008 75)" }}>
          Data sourced from The Press vintage log · DR-19 Production Dashboard · Ownology v1.0
        </p>
      </div>
    </div>
  );
}
