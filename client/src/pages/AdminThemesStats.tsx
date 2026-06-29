/**
 * /admin/themes-stats — telemetry dashboard for theme picks.
 *
 * Powered by themes.stats tRPC procedure. Shows for the rolling N-day window:
 *   - Total sessions in window + total picks
 *   - Per-theme: First-picks (new users) / Switched-to (existing) / Total
 *     / Currently using (last pick per session) / % currently using
 *
 * Used to decide which themes to keep enabled in VITE_ENABLED_THEMES env.
 */
import { useState } from "react";
import { Link } from "wouter";
import { trpc } from "@/lib/trpc";

const THEME_LABELS: Record<string, string> = {
  "soft-cellar": "Soft Cellar",
  "parchment":   "Parchment",
  "auto":        "Auto",
  "cellar":      "Cellar Night",
};

const THEME_COLORS: Record<string, string> = {
  "soft-cellar": "#b45309",
  "parchment":   "#ca8a04",
  "auto":        "#7c3aed",
  "cellar":      "#6b7280",
};

export default function AdminThemesStats() {
  const [days, setDays] = useState<number>(30);
  const { data, isLoading } = trpc.themes.stats.useQuery({ days });

  return (
    <div data-testid="admin-themes-stats-page" className="container py-8" style={{ maxWidth: 1100 }}>
      <Link
        href="/admin"
        style={{ fontFamily: "'Lato',sans-serif", fontSize: "0.78rem", color: "var(--ow-text-lo)", letterSpacing: "0.05em" }}
      >
        ← Back to admin
      </Link>
      <p className="text-xs uppercase tracking-widest mt-3" style={{ color: "var(--ow-amber)" }}>
        Telemetry
      </p>
      <h1 className="text-3xl font-semibold mt-1" style={{ color: "var(--ow-text-hi)", fontFamily: "'Fraunces',serif" }}>
        Theme picks
      </h1>
      <p className="mt-2 text-sm" style={{ color: "var(--ow-text-mid)", maxWidth: 720 }}>
        Anonymous tally of which themes operators are picking. Use this to decide which themes to keep
        enabled via <code>VITE_ENABLED_THEMES</code>. If one theme dominates, the polarising old default
        can be retired with confidence.
      </p>

      {/* Window selector */}
      <div style={{ marginTop: 18, display: "flex", gap: 6, flexWrap: "wrap" }}>
        {[7, 30, 90, 365].map((d) => (
          <button
            key={d}
            type="button"
            data-testid={`themes-stats-window-${d}`}
            onClick={() => setDays(d)}
            style={{
              padding: "6px 12px",
              borderRadius: 16,
              border: `1px solid ${days === d ? "var(--ow-amber)" : "var(--ow-border)"}`,
              background: days === d ? "var(--ow-amber)" : "transparent",
              color: days === d ? "oklch(0.10 0.008 60)" : "var(--ow-text-mid)",
              fontFamily: "'Lato',sans-serif",
              fontSize: "0.78rem",
              fontWeight: days === d ? 700 : 500,
              cursor: "pointer",
            }}
          >
            Last {d} days
          </button>
        ))}
      </div>

      {isLoading && <p style={{ marginTop: 24, color: "var(--ow-text-mid)" }}>Loading…</p>}

      {data && (
        <>
          {/* Headline KPIs */}
          <div className="grid grid-cols-2 md:grid-cols-3 gap-3 mt-6">
            <Kpi label="Unique sessions" value={data.totalSessions} testid="themes-kpi-sessions" />
            <Kpi label="Total picks" value={data.totalPicks} testid="themes-kpi-picks" />
            <Kpi label="Avg picks / session" value={data.totalSessions === 0 ? "—" : (data.totalPicks / data.totalSessions).toFixed(1)} testid="themes-kpi-avg" />
          </div>

          {/* Table */}
          <div
            className="rounded overflow-hidden mt-6"
            style={{ background: "var(--ow-bg-card)", border: "1px solid var(--ow-border)" }}
          >
            <table data-testid="themes-stats-table" className="w-full" style={{ borderCollapse: "collapse" }}>
              <thead>
                <tr style={{ background: "color-mix(in oklch, var(--ow-amber) 6%, transparent)", borderBottom: "1px solid var(--ow-border)" }}>
                  <th style={th}>Theme</th>
                  <th style={{ ...th, textAlign: "right" }}>First picks</th>
                  <th style={{ ...th, textAlign: "right" }}>Switched to</th>
                  <th style={{ ...th, textAlign: "right" }}>Total picks</th>
                  <th style={{ ...th, textAlign: "right" }}>Currently using</th>
                  <th style={{ ...th, textAlign: "right" }}>Share</th>
                </tr>
              </thead>
              <tbody>
                {data.themes.length === 0 && (
                  <tr><td colSpan={6} style={{ padding: "2rem", textAlign: "center", color: "var(--ow-text-lo)" }}>No picks recorded in this window yet.</td></tr>
                )}
                {data.themes.map((t) => {
                  const winning = t.currentSharePct >= 40;
                  return (
                    <tr key={t.themeId} data-testid={`themes-stats-row-${t.themeId}`} style={{ borderBottom: "1px solid var(--ow-border)" }}>
                      <td style={td}>
                        <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
                          <span style={{ width: 8, height: 8, borderRadius: "50%", background: THEME_COLORS[t.themeId] ?? "#6b7280", flexShrink: 0 }} />
                          <div>
                            <div style={{ fontFamily: "'Lato',sans-serif", fontSize: "0.85rem", color: "var(--ow-text-hi)", fontWeight: 600 }}>
                              {THEME_LABELS[t.themeId] ?? t.themeId}
                            </div>
                            <div style={{ fontFamily: "'Fira Code',monospace", fontSize: "0.7rem", color: "var(--ow-text-lo)" }}>
                              {t.themeId}
                            </div>
                          </div>
                        </div>
                      </td>
                      <td style={{ ...td, textAlign: "right", fontFamily: "'Fira Code',monospace", color: "var(--ow-text-hi)" }}>{t.firstPicks}</td>
                      <td style={{ ...td, textAlign: "right", fontFamily: "'Fira Code',monospace", color: "var(--ow-text-mid)" }}>{t.switchedTo}</td>
                      <td style={{ ...td, textAlign: "right", fontFamily: "'Fira Code',monospace", color: "var(--ow-text-hi)", fontWeight: 600 }}>{t.totalPicks}</td>
                      <td style={{ ...td, textAlign: "right", fontFamily: "'Fira Code',monospace", color: "var(--ow-text-hi)" }}>{t.currentlyUsing}</td>
                      <td style={{ ...td, textAlign: "right", fontFamily: "'Fira Code',monospace", color: winning ? "#10b981" : "var(--ow-text-mid)", fontWeight: winning ? 700 : 400 }}>{t.currentSharePct}%</td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>

          <p className="mt-4" style={{ fontFamily: "'Lato',sans-serif", fontSize: "0.75rem", color: "var(--ow-text-lo)" }}>
            Tip: a theme with <strong>Share ≥ 40%</strong> (highlighted green) is your dominant default candidate. A theme with
            high <strong>First picks</strong> but low <strong>Currently using</strong> means new users pick it then switch away — its description may be misleading.
          </p>
        </>
      )}
    </div>
  );
}

function Kpi({ label, value, testid }: { label: string; value: number | string; testid: string }) {
  return (
    <div data-testid={testid} className="rounded p-3" style={{ background: "var(--ow-bg-card)", border: "1px solid var(--ow-border)" }}>
      <p style={{ fontFamily: "'Lato',sans-serif", fontSize: "0.68rem", textTransform: "uppercase", letterSpacing: "0.1em", color: "var(--ow-text-lo)", margin: 0 }}>
        {label}
      </p>
      <p style={{ fontFamily: "'Fraunces',serif", fontSize: "1.5rem", fontWeight: 700, color: "var(--ow-text-hi)", margin: "4px 0 0" }}>
        {value}
      </p>
    </div>
  );
}

const th: React.CSSProperties = {
  padding: "12px 16px",
  fontFamily: "'Lato',sans-serif",
  fontSize: "0.7rem",
  textTransform: "uppercase",
  letterSpacing: "0.08em",
  color: "var(--ow-text-lo)",
  fontWeight: 700,
  textAlign: "left",
};

const td: React.CSSProperties = {
  padding: "14px 16px",
  fontFamily: "'Lato',sans-serif",
  fontSize: "0.85rem",
  color: "var(--ow-text-mid)",
  verticalAlign: "top",
};
