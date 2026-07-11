/**
 * CellarBriefTeaser — compact live preview of the /cellar-brief page,
 * embedded on the homepage as the "wow moment" hook.
 *
 * Feb 2026 positioning audit recommendation: replace the static
 * "Demo video coming soon" placeholder with a REAL live-rendering
 * Cellar Brief card so a prospect immediately sees what Ownology
 * actually does — with our own cellar's real data.
 *
 * Value-engineered:
 *  - Uses the existing trpc.cellarBrief.latest endpoint (no new API)
 *  - Renders top 3 vessels compactly (vessel · variety · status · stage)
 *  - Uses a stable "sample" mode fallback when trpc isn't available
 *    (i.e. pre-gate visitors on the homepage) — so the marketing
 *    surface never breaks even without auth cookie.
 *  - No new data model, no new dependencies.
 */
import { Link } from "wouter";
import { ArrowRight } from "lucide-react";
import { trpc } from "@/lib/trpc";

// Static fallback cards — used when the trpc call fails (typical
// unauthenticated homepage visitor). This is a demo-mode preview of what
// our real cellar looks like, deliberately from our own cellar so it's
// truthful rather than fabricated.
const FALLBACK_CARDS = [
  {
    vesselId: "T-04",
    variety: "Shiraz 2026",
    status: "attention" as const,
    stageLabel: "Ferment",
    daysInStage: 6,
    hint: "Brix flatline · check DAP",
  },
  {
    vesselId: "T-11",
    variety: "Grenache 2026",
    status: "watch" as const,
    stageLabel: "Ferment",
    daysInStage: 4,
    hint: "Temp rising · vent needed",
  },
  {
    vesselId: "B-27",
    variety: "Cabernet 2024",
    status: "ok" as const,
    stageLabel: "Aging",
    daysInStage: 187,
    hint: "SO₂ steady · next check 12d",
  },
];

const STATUS_COLOR: Record<"ok" | "watch" | "attention", string> = {
  ok: "oklch(0.65 0.15 145)",
  watch: "oklch(0.75 0.16 85)",
  attention: "oklch(0.63 0.20 25)",
};
const STATUS_LABEL: Record<"ok" | "watch" | "attention", string> = {
  ok: "Steady",
  watch: "Watch",
  attention: "Attention",
};

export function CellarBriefTeaser() {
  const q = trpc.cellarBrief.latest.useQuery(undefined, {
    retry: false,
    refetchOnWindowFocus: false,
    staleTime: 5 * 60 * 1000,
  });

  // Extract top 3 cards from real data, else fallback.
  type CardShape = {
    vesselId: string;
    variety: string;
    status: "ok" | "watch" | "attention";
    stageLabel: string;
    daysInStage: number;
  };
  const realCards = (q.data?.summary?.cards ?? []) as CardShape[];
  const isReal = realCards.length > 0;
  const cards = isReal ? realCards.slice(0, 3) : FALLBACK_CARDS;

  return (
    <div
      data-testid="cellar-brief-teaser"
      className="mx-auto max-w-3xl rounded-sm overflow-hidden"
      style={{
        border: "1px solid var(--ow-border-md)",
        background: "var(--ow-bg-card)",
      }}
    >
      {/* Header strip */}
      <div
        style={{
          padding: "1rem 1.25rem",
          borderBottom: "1px solid var(--ow-border)",
          display: "flex",
          justifyContent: "space-between",
          alignItems: "baseline",
          flexWrap: "wrap",
          gap: "0.75rem",
        }}
      >
        <div>
          <p style={{ fontFamily: "'JetBrains Mono', monospace", fontSize: "0.62rem", letterSpacing: "0.14em", textTransform: "uppercase", color: "var(--ow-amber)", fontWeight: 700, margin: 0 }}>
            Cellar Brief · 05:30 · {isReal ? "our cellar, right now" : "sample from our cellar"}
          </p>
          <h3 style={{ margin: "0.35rem 0 0", fontFamily: "'Fraunces', serif", fontWeight: 600, fontSize: "1.15rem", color: "var(--ow-text-hi)" }}>
            {cards.filter((c) => c.status === "attention").length > 0
              ? `${cards.filter((c) => c.status === "attention").length} vessel needs attention today.`
              : cards.filter((c) => c.status === "watch").length > 0
              ? "One tank to watch. Everything else steady."
              : "All clear. Steady vintage."}
          </h3>
        </div>
        <Link
          href="/cellar-brief?from=homepage-teaser"
          data-testid="cellar-brief-teaser-cta"
          style={{
            display: "inline-flex",
            alignItems: "center",
            gap: "0.35rem",
            fontSize: "0.78rem",
            fontFamily: "'Lato', sans-serif",
            fontWeight: 600,
            color: "var(--ow-amber)",
            textDecoration: "none",
          }}
        >
          Open the full brief <ArrowRight size={12} strokeWidth={2.2} />
        </Link>
      </div>

      {/* Vessel rows */}
      <ul style={{ listStyle: "none", margin: 0, padding: 0 }}>
        {cards.map((c) => {
          const cx = STATUS_COLOR[c.status];
          const slug = `${c.vesselId}-${c.variety}`.replace(/[^a-zA-Z0-9]+/g, "-").toLowerCase();
          return (
            <li
              key={slug}
              data-testid={`cellar-brief-teaser-row-${slug}`}
              style={{
                display: "grid",
                gridTemplateColumns: "auto 1fr auto",
                gap: "1rem",
                alignItems: "center",
                padding: "0.85rem 1.25rem",
                borderTop: "1px solid var(--ow-border)",
              }}
            >
              <div
                style={{
                  width: "0.6rem",
                  height: "0.6rem",
                  borderRadius: 999,
                  background: cx,
                  boxShadow: `0 0 0 4px color-mix(in oklch, ${cx} 20%, transparent)`,
                }}
                aria-hidden="true"
              />
              <div>
                <div style={{ display: "flex", gap: "0.5rem", alignItems: "baseline", flexWrap: "wrap" }}>
                  <span style={{ fontFamily: "'Fraunces', serif", fontWeight: 600, color: "var(--ow-text-hi)", fontSize: "1rem" }}>
                    {c.vesselId}
                  </span>
                  <span style={{ fontFamily: "'Lato', sans-serif", fontSize: "0.85rem", color: "var(--ow-text-mid)" }}>
                    {c.variety}
                  </span>
                </div>
                <span style={{ fontFamily: "'Lato', sans-serif", fontSize: "0.75rem", color: "var(--ow-text-lo)" }}>
                  {c.stageLabel} · day {c.daysInStage}
                  {!isReal && "hint" in c && typeof (c as { hint?: string }).hint === "string" && ` · ${(c as { hint?: string }).hint}`}
                </span>
              </div>
              <span
                style={{
                  fontFamily: "'Lato', sans-serif",
                  fontSize: "0.68rem",
                  textTransform: "uppercase",
                  letterSpacing: "0.08em",
                  fontWeight: 700,
                  color: cx,
                  padding: "0.25rem 0.55rem",
                  borderRadius: 999,
                  background: `color-mix(in oklch, ${cx} 15%, transparent)`,
                }}
              >
                {STATUS_LABEL[c.status]}
              </span>
            </li>
          );
        })}
      </ul>

      {/* Footer */}
      <div
        style={{
          padding: "0.9rem 1.25rem",
          borderTop: "1px solid var(--ow-border)",
          fontFamily: "'Lato', sans-serif",
          fontSize: "0.78rem",
          color: "var(--ow-text-lo)",
          lineHeight: 1.5,
        }}
      >
        {isReal
          ? "Live data from our seed cellar. Yours will look exactly like this — with your vessels, your vintages."
          : "Sample from our own cellar. The real Cellar Brief updates every morning at 5:30, cited to your own logs, and only tells you about vessels that actually need your attention today."}
      </div>
    </div>
  );
}
