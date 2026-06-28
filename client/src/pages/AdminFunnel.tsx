/**
 * /admin/funnel — Conversion-attribution dashboard.
 *
 * Reads pricing.funnelStats — aggregated /pricing page visits grouped by
 * the `?from=<source>` query param. Lets the operator see which acquisition
 * channel actually drives traffic (and, by inference, conversions) so they
 * can tune DAILY_FREE_BUDGET_USD / homepage copy / Press CTAs accordingly.
 */
import { useState } from "react";
import { Link } from "wouter";
import { trpc } from "@/lib/trpc";

const ACCENT = "var(--ow-amber)";

const SOURCE_LABEL: Record<string, string> = {
  "free-paused": "Free-tier budget hit",
  "free-quota": "Daily 3-question limit hit",
  "homepage-hero": "Homepage hero CTA",
  "homepage-nav": "Homepage nav CTA",
  "homepage-mobile": "Homepage mobile menu",
  homepage: "Homepage (unspecified)",
  press: "The Press article CTA",
  "cellar-journal": "Cellar Journal CTA",
  "competitive-advantage": "Competitive Advantage page",
  preview: "Preview page",
  stats: "Public stats page",
  direct: "Direct / untagged",
};

function labelFor(src: string): string {
  return SOURCE_LABEL[src] ?? src;
}

function fmtAgo(ms: number | null): string {
  if (!ms) return "—";
  const diff = Date.now() - ms;
  if (diff < 60_000) return "just now";
  if (diff < 3_600_000) return `${Math.floor(diff / 60_000)}m ago`;
  if (diff < 86_400_000) return `${Math.floor(diff / 3_600_000)}h ago`;
  return `${Math.floor(diff / 86_400_000)}d ago`;
}

/** Tiny inline SVG sparkline — no chart library to keep bundle lean. */
function Sparkline({ values, height = 36, width = 260 }: { values: number[]; height?: number; width?: number }) {
  if (values.length === 0) return null;
  const max = Math.max(1, ...values);
  const step = width / Math.max(1, values.length - 1);
  const points = values.map((v, i) => `${(i * step).toFixed(1)},${(height - (v / max) * (height - 2) - 1).toFixed(1)}`).join(" ");
  return (
    <svg width={width} height={height} viewBox={`0 0 ${width} ${height}`} aria-hidden="true">
      <polyline points={points} fill="none" stroke="var(--ow-amber)" strokeWidth="1.5" strokeLinejoin="round" />
    </svg>
  );
}

export default function AdminFunnel() {
  const [days, setDays] = useState<7 | 30 | 90>(30);
  const { data, isLoading } = trpc.pricing.funnelStats.useQuery(
    { days },
    { refetchOnWindowFocus: false }
  );

  const dailyCounts = data?.daily.map((d) => d.count) ?? [];

  return (
    <div data-testid="admin-funnel-page" className="container py-8" style={{ maxWidth: 1100 }}>
      <div className="mb-6">
        <Link href="/admin" style={{ fontFamily: "'Lato',sans-serif", fontSize: "0.78rem", color: "var(--ow-text-lo)", letterSpacing: "0.05em" }}>
          ← Back to Admin hub
        </Link>
        <p className="text-xs uppercase tracking-widest mt-3" style={{ color: ACCENT }}>
          Conversion attribution
        </p>
        <h1 className="text-3xl font-semibold mt-1" style={{ color: "var(--ow-text-hi)", fontFamily: "'Fraunces',serif" }}>
          Pricing-page funnel
        </h1>
        <p className="mt-2 text-sm" style={{ color: "var(--ow-text-mid)", maxWidth: 720 }}>
          Where does paid traffic actually come from? Every <code>/pricing</code> visit is tagged with its
          <code> ?from=&lt;source&gt;</code> query param and logged here. Use this to tune <code>DAILY_FREE_BUDGET_USD</code> and rework underperforming CTAs.
        </p>
      </div>

      {/* Window selector */}
      <div className="mb-6 flex gap-2">
        {([7, 30, 90] as const).map((d) => (
          <button
            key={d}
            data-testid={`admin-funnel-window-${d}`}
            onClick={() => setDays(d)}
            className="px-3 py-1.5 rounded text-xs"
            style={{
              background: days === d ? "var(--ow-amber)" : "var(--ow-bg-card)",
              color: days === d ? "oklch(0.10 0.008 60)" : "var(--ow-text-mid)",
              border: `1px solid ${days === d ? "var(--ow-amber)" : "var(--ow-border)"}`,
              fontFamily: "'Lato',sans-serif",
              fontWeight: days === d ? 700 : 400,
              cursor: "pointer",
            }}
          >
            Last {d} days
          </button>
        ))}
      </div>

      {isLoading && <p style={{ color: "var(--ow-text-mid)" }}>Loading…</p>}

      {data && (
        <>
          {/* Headline KPIs + sparkline */}
          <div
            className="rounded p-4 mb-6"
            style={{ background: "var(--ow-bg-card)", border: "1px solid var(--ow-border)" }}
            data-testid="admin-funnel-headline"
          >
            <div className="flex items-baseline justify-between mb-3 flex-wrap gap-4">
              <div>
                <p className="text-xs uppercase tracking-widest" style={{ color: "var(--ow-text-lo)" }}>
                  Total /pricing visits · last {data.windowDays} days
                </p>
                <p style={{ fontFamily: "'Fraunces',serif", fontSize: "2.25rem", fontWeight: 700, color: "var(--ow-text-hi)", margin: 0 }}>
                  {data.totals.views.toLocaleString()}
                </p>
                <p style={{ fontFamily: "'Lato',sans-serif", fontSize: "0.78rem", color: "var(--ow-text-lo)" }}>
                  across {data.totals.sources} source{data.totals.sources === 1 ? "" : "s"}
                </p>
              </div>
              <div>
                <p className="text-xs uppercase tracking-widest" style={{ color: "var(--ow-text-lo)" }}>
                  Conversions
                </p>
                <p
                  data-testid="admin-funnel-total-conversions"
                  style={{ fontFamily: "'Fraunces',serif", fontSize: "2.25rem", fontWeight: 700, color: "var(--ow-amber)", margin: 0 }}
                >
                  {(data.totals.conversions ?? 0).toLocaleString()}
                </p>
                <p style={{ fontFamily: "'Lato',sans-serif", fontSize: "0.78rem", color: "var(--ow-text-lo)" }}>
                  {data.totals.conversionPct ?? 0}% overall
                </p>
              </div>
              <Sparkline values={dailyCounts} />
            </div>
          </div>

          {/* By-source table */}
          <div
            className="rounded overflow-hidden"
            style={{ background: "var(--ow-bg-card)", border: "1px solid var(--ow-border)" }}
          >
            <table data-testid="admin-funnel-table" className="w-full" style={{ borderCollapse: "collapse" }}>
              <thead>
                <tr style={{ background: "color-mix(in oklch, var(--ow-amber) 6%, transparent)", borderBottom: "1px solid var(--ow-border)" }}>
                  <th style={th}>Source</th>
                  <th style={{ ...th, textAlign: "right" }}>Visits</th>
                  <th style={{ ...th, textAlign: "right" }}>Converted</th>
                  <th style={{ ...th, textAlign: "right" }}>Conv %</th>
                  <th style={{ ...th, textAlign: "right" }}>Share</th>
                  <th style={{ ...th, textAlign: "right" }}>Last visit</th>
                </tr>
              </thead>
              <tbody>
                {data.bySource.length === 0 && (
                  <tr>
                    <td colSpan={6} style={{ padding: "2rem", textAlign: "center", color: "var(--ow-text-lo)", fontFamily: "'Lato',sans-serif", fontSize: "0.85rem" }}>
                      No /pricing visits in this window yet. Once visitors land on /pricing tagged with <code>?from=&lt;source&gt;</code>, rows will appear here.
                    </td>
                  </tr>
                )}
                {data.bySource.map((row) => {
                  const conv = (row as { conversions?: number }).conversions ?? 0;
                  const convPct = (row as { conversionPct?: number }).conversionPct ?? 0;
                  const winning = conv > 0 && convPct >= 5;
                  return (
                    <tr
                      key={row.source}
                      data-testid={`admin-funnel-row-${row.source}`}
                      style={{ borderBottom: "1px solid var(--ow-border)" }}
                    >
                      <td style={td}>
                        <div style={{ fontFamily: "'Lato',sans-serif", fontSize: "0.85rem", color: "var(--ow-text-hi)", fontWeight: 600 }}>
                          {labelFor(row.source)}
                        </div>
                        <div style={{ fontFamily: "'Fira Code',monospace", fontSize: "0.7rem", color: "var(--ow-text-lo)" }}>
                          {row.source}
                        </div>
                      </td>
                      <td style={{ ...td, textAlign: "right", fontFamily: "'Fira Code',monospace", color: "var(--ow-text-hi)" }}>
                        {row.count.toLocaleString()}
                      </td>
                      <td
                        data-testid={`admin-funnel-conv-${row.source}`}
                        style={{ ...td, textAlign: "right", fontFamily: "'Fira Code',monospace", color: conv > 0 ? "var(--ow-amber)" : "var(--ow-text-lo)", fontWeight: conv > 0 ? 700 : 400 }}
                      >
                        {conv.toLocaleString()}
                      </td>
                      <td
                        style={{ ...td, textAlign: "right", fontFamily: "'Fira Code',monospace", color: winning ? "#10b981" : "var(--ow-text-mid)", fontWeight: winning ? 700 : 400 }}
                      >
                        {convPct}%
                      </td>
                      <td style={{ ...td, textAlign: "right", fontFamily: "'Fira Code',monospace", color: "var(--ow-text-mid)" }}>
                        {row.sharePct}%
                      </td>
                      <td style={{ ...td, textAlign: "right", fontFamily: "'Fira Code',monospace", fontSize: "0.75rem", color: "var(--ow-text-lo)" }}>
                        {fmtAgo(row.lastAt)}
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>

          <p className="mt-4" style={{ fontFamily: "'Lato',sans-serif", fontSize: "0.75rem", color: "var(--ow-text-lo)" }}>
            Tip: <code>free-paused</code> and any source with <strong>Conv %</strong> ≥5% (highlighted green) is your strongest channel —
            invest more in that CTA. Sources with high <strong>Visits</strong> but 0% conversion are leaking traffic; rework the pricing copy or the upstream promise.
          </p>
        </>
      )}
    </div>
  );
}

const th: React.CSSProperties = {
  padding: "0.75rem 1rem",
  fontFamily: "'Lato',sans-serif",
  fontSize: "0.72rem",
  letterSpacing: "0.1em",
  textTransform: "uppercase",
  color: "var(--ow-text-lo)",
  fontWeight: 600,
  textAlign: "left",
};

const td: React.CSSProperties = {
  padding: "0.85rem 1rem",
  fontFamily: "'Lato',sans-serif",
  fontSize: "0.85rem",
  color: "var(--ow-text-mid)",
  verticalAlign: "top",
};
