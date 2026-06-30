/**
 * AdminAnalyticsThemes — acceptance-rate dashboard for the once-a-day
 * theme suggestion banner. Answers: "do our customers' working hours
 * actually match our assumed schedule?"
 *
 * Data source: trpc.themes.suggestionStats (owner-only).
 * Buckets: 24 hours of local-time-of-suggestion, with accepted /
 * dismissed / opted_out counts.
 *
 * Visualisation: lightweight CSS bar chart — no chart library. Each hour
 * is a vertical bar showing total volume + an inner amber fill showing
 * the accepted share. Hovering shows the raw counts.
 */
import { useState } from "react";
import { Link } from "wouter";
import { trpc } from "@/lib/trpc";

const HOUR_LABELS = ["12a","1a","2a","3a","4a","5a","6a","7a","8a","9a","10a","11a","12p","1p","2p","3p","4p","5p","6p","7p","8p","9p","10p","11p"];

const SUGGESTED_BY_HOUR: Record<number, string> = {
  0: "Cellar Night", 1: "Cellar Night", 2: "Cellar Night", 3: "Cellar Night",
  4: "Soft Cellar", 5: "Soft Cellar", 6: "Soft Cellar", 7: "Soft Cellar",
  8: "Parchment / Crush", 9: "Parchment / Crush", 10: "Parchment / Crush",
  11: "Parchment / Crush", 12: "Parchment / Crush", 13: "Parchment / Crush",
  14: "Parchment / Crush", 15: "Parchment / Crush",
  16: "Soft Cellar", 17: "Soft Cellar", 18: "Soft Cellar",
  19: "Cellar Night", 20: "Cellar Night", 21: "Cellar Night",
  22: "Cellar Night", 23: "Cellar Night",
};

export default function AdminAnalyticsThemes() {
  const [days, setDays] = useState(30);
  const { data, isLoading, error } = trpc.themes.suggestionStats.useQuery({ days });

  const maxTotal = data ? Math.max(...data.hours.map((h) => h.total), 1) : 1;

  return (
    <div
      style={{
        minHeight: "100vh",
        background: "var(--ow-bg-base)",
        color: "var(--ow-text-hi)",
        padding: "2rem 1.5rem 4rem",
        fontFamily: "'Lato',sans-serif",
      }}
      data-testid="admin-analytics-themes"
    >
      <div style={{ maxWidth: 1100, margin: "0 auto" }}>
        <Link to="/admin/dev" style={{ fontSize: "0.74rem", color: "var(--ow-text-lo)", textDecoration: "none", letterSpacing: "0.06em", textTransform: "uppercase", fontWeight: 700 }}>
          ← Dev Tools
        </Link>
        <h1
          style={{
            fontFamily: "'Fraunces',serif",
            fontSize: "2rem",
            fontWeight: 700,
            margin: "0.5rem 0 0.4rem",
            letterSpacing: "-0.01em",
          }}
        >
          Theme suggestion acceptance
        </h1>
        <p style={{ fontSize: "0.94rem", color: "var(--ow-text-mid)", maxWidth: 720, lineHeight: 1.5 }}>
          Each bar is one hour of the day (visitor's local time) when the suggestion
          banner fired. <strong style={{ color: "var(--ow-amber)" }}>Amber fill = accepted.</strong>{" "}
          Outline = dismissed. Tells you whether our assumed boutique-winery rhythm
          actually matches what real users do.
        </p>

        {/* Window selector */}
        <div style={{ display: "flex", gap: 8, alignItems: "center", margin: "1.4rem 0 1rem" }}>
          <span style={{ fontSize: "0.74rem", color: "var(--ow-text-lo)", letterSpacing: "0.08em", textTransform: "uppercase" }}>Window</span>
          {[7, 30, 90].map((d) => (
            <button
              key={d}
              type="button"
              data-testid={`window-${d}`}
              onClick={() => setDays(d)}
              style={{
                padding: "4px 10px",
                background: days === d ? "var(--ow-amber)" : "transparent",
                color: days === d ? "white" : "var(--ow-text-mid)",
                border: days === d ? "1px solid var(--ow-amber)" : "1px solid var(--ow-border-md)",
                borderRadius: 4,
                cursor: "pointer",
                fontSize: "0.74rem",
                fontWeight: 700,
                letterSpacing: "0.04em",
              }}
            >
              {d}d
            </button>
          ))}
        </div>

        {isLoading && <p style={{ color: "var(--ow-text-lo)" }}>Loading…</p>}
        {error && (
          <p data-testid="analytics-error" style={{ color: "var(--ow-accent-live)" }}>
            Could not load stats: {error.message}
          </p>
        )}

        {data && (
          <>
            {/* Headline stats */}
            <div
              style={{
                display: "grid",
                gridTemplateColumns: "repeat(auto-fit, minmax(160px, 1fr))",
                gap: 12,
                marginBottom: "1.6rem",
              }}
              data-testid="analytics-headline"
            >
              {[
                { label: "Suggestions shown", value: String(data.totals.total) },
                { label: "Accepted", value: String(data.totals.accepted) },
                { label: "Dismissed", value: String(data.totals.dismissed) },
                { label: "Opt-outs", value: String(data.totals.opted_out) },
                { label: "Overall accept rate", value: `${data.overallAcceptRate}%`, accent: true },
              ].map((s) => (
                <div
                  key={s.label}
                  style={{
                    background: "var(--ow-bg-card)",
                    border: "1px solid var(--ow-border-md)",
                    borderRadius: 6,
                    padding: "0.8rem 0.9rem",
                  }}
                >
                  <div style={{ fontSize: "0.66rem", letterSpacing: "0.12em", textTransform: "uppercase", color: "var(--ow-text-lo)", marginBottom: 4 }}>
                    {s.label}
                  </div>
                  <div
                    style={{
                      fontFamily: "'Fraunces',serif",
                      fontSize: "1.5rem",
                      fontWeight: 700,
                      color: s.accent ? "var(--ow-amber)" : "var(--ow-text-hi)",
                    }}
                  >
                    {s.value}
                  </div>
                </div>
              ))}
            </div>

            {/* Hour-of-day bar chart */}
            <div
              style={{
                background: "var(--ow-bg-card)",
                border: "1px solid var(--ow-border-md)",
                borderRadius: 6,
                padding: "1.2rem 1rem 0.8rem",
              }}
              data-testid="analytics-chart"
            >
              <div
                style={{
                  display: "grid",
                  gridTemplateColumns: "repeat(24, 1fr)",
                  gap: 4,
                  alignItems: "end",
                  height: 220,
                  marginBottom: 8,
                }}
              >
                {data.hours.map((h) => {
                  const heightPct = (h.total / maxTotal) * 100;
                  const acceptedPct = h.total > 0 ? (h.accepted / h.total) * 100 : 0;
                  const tooltip = `${HOUR_LABELS[h.hour]}: ${h.total} shown · ${h.accepted} accepted (${h.acceptRate}%) · ${h.dismissed} dismissed · ${h.opted_out} opt-outs · suggested: ${SUGGESTED_BY_HOUR[h.hour]}`;
                  return (
                    <div
                      key={h.hour}
                      title={tooltip}
                      data-testid={`hour-${h.hour}`}
                      style={{
                        height: `${Math.max(heightPct, h.total > 0 ? 4 : 0)}%`,
                        minHeight: h.total > 0 ? 4 : 0,
                        background: "color-mix(in oklch, var(--ow-amber) 12%, transparent)",
                        border: "1px solid color-mix(in oklch, var(--ow-amber) 30%, transparent)",
                        borderRadius: 2,
                        position: "relative",
                        cursor: "default",
                      }}
                    >
                      <div
                        style={{
                          position: "absolute",
                          left: 0,
                          right: 0,
                          bottom: 0,
                          height: `${acceptedPct}%`,
                          background: "var(--ow-amber)",
                          borderRadius: "1px 1px 0 0",
                        }}
                      />
                    </div>
                  );
                })}
              </div>
              <div
                style={{
                  display: "grid",
                  gridTemplateColumns: "repeat(24, 1fr)",
                  gap: 4,
                  fontSize: "0.6rem",
                  color: "var(--ow-text-lo)",
                  textAlign: "center",
                }}
              >
                {HOUR_LABELS.map((label, i) => (
                  <div key={i} style={{ opacity: i % 3 === 0 ? 1 : 0.4 }}>
                    {i % 3 === 0 ? label : ""}
                  </div>
                ))}
              </div>
              <div style={{ marginTop: 14, display: "flex", gap: 16, fontSize: "0.7rem", color: "var(--ow-text-lo)" }}>
                <span><span style={{ display: "inline-block", width: 10, height: 10, background: "var(--ow-amber)", borderRadius: 2, verticalAlign: "middle", marginRight: 5 }} />Accepted</span>
                <span><span style={{ display: "inline-block", width: 10, height: 10, background: "color-mix(in oklch, var(--ow-amber) 12%, transparent)", border: "1px solid color-mix(in oklch, var(--ow-amber) 30%, transparent)", borderRadius: 2, verticalAlign: "middle", marginRight: 5 }} />Dismissed / opted out</span>
                <span style={{ marginLeft: "auto" }}>Window: {data.windowDays} days · {data.totals.total} events</span>
              </div>
            </div>

            {/* Empty-state hint */}
            {data.totals.total === 0 && (
              <p
                data-testid="analytics-empty"
                style={{
                  marginTop: "1.4rem",
                  fontSize: "0.86rem",
                  color: "var(--ow-text-lo)",
                  fontStyle: "italic",
                }}
              >
                No suggestion events yet. The banner fires once per visitor per local
                calendar day. Numbers populate as real users sign in.
              </p>
            )}
          </>
        )}
      </div>
    </div>
  );
}
