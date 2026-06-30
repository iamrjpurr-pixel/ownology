/**
 * CellarBrief — the daily-driver page for cellar hands at 5:30 AM.
 *
 * Mobile-first SWOT-style "what to do today" feed grounded in the user's
 * own cellar history. Backend engine (server/cellarBriefEngine.ts) does
 * the rule-based card synthesis + a single LLM call for the executive
 * summary; this component just renders the structured payload.
 *
 * Design principles (informed by user feedback + Wine Bible priorities):
 *   1. STICKY exec summary banner at top — never out of reach.
 *   2. KPI strip (attention / decisions / vessels) — glance-friendly.
 *   3. Cards sorted: attention → watch → ok (engine pre-sorts).
 *   4. Big tap targets, no tiny icons — gloves-on usable.
 *   5. Refresh button = single tap to regenerate; auto-refetch on focus
 *      so a winemaker who swipes away to QuickEntry and back sees fresh
 *      data without thinking about it.
 *   6. Theme-reactive via CSS vars so the brief reads correctly in every
 *      lighting mode (Soft Cellar, Cellar Night, Parchment, Crush).
 */
import { useState } from "react";
import { Link } from "wouter";
import { trpc } from "../lib/trpc";

const STAGE_EMOJI: Record<string, string> = {
  pre_ferment: "❄",
  primary_active: "●",
  primary_slowing: "▼",
  pressed: "⇩",
  mlf_active: "◐",
  aging_tank: "◯",
  aging_barrel: "◍",
  bottled: "▣",
  unknown: "·",
};

function statusColor(s: "ok" | "watch" | "attention"): string {
  if (s === "attention") return "oklch(0.62 0.20 25)";  // red-rose
  if (s === "watch") return "oklch(0.72 0.16 75)";       // amber
  return "oklch(0.62 0.10 155)";                          // calm green
}

function statusLabel(s: "ok" | "watch" | "attention"): string {
  if (s === "attention") return "ATTENTION";
  if (s === "watch") return "WATCH";
  return "TRACKING";
}

function formatStamp(ms: number): string {
  const d = new Date(ms);
  const today = new Date();
  const sameDay = d.toDateString() === today.toDateString();
  const hh = d.getHours().toString().padStart(2, "0");
  const mm = d.getMinutes().toString().padStart(2, "0");
  if (sameDay) return `today · ${hh}:${mm}`;
  const ago = Math.round((Date.now() - ms) / 3600_000);
  if (ago < 48) return `${ago}h ago`;
  const days = Math.round(ago / 24);
  return `${days}d ago`;
}

export default function CellarBrief() {
  const utils = trpc.useUtils();
  const latest = trpc.cellarBrief.latest.useQuery(undefined, {
    refetchOnWindowFocus: true,
    refetchInterval: 300_000,
    retry: false,
  });
  const generate = trpc.cellarBrief.generateNow.useMutation({
    onSuccess: () => {
      void utils.cellarBrief.latest.invalidate();
      void utils.cellarBrief.history.invalidate();
    },
  });
  const history = trpc.cellarBrief.history.useQuery({ limit: 10 }, {
    refetchOnWindowFocus: false,
    retry: false,
  });

  const [showHistory, setShowHistory] = useState(false);

  const summary = latest.data?.summary;
  const cards = summary?.cards ?? [];
  const generatedAt = latest.data?.generatedAt;

  const isRegenerating = generate.isPending;

  // ── Loading state ───────────────────────────────────────────────────────
  if (latest.isLoading && !summary) {
    return (
      <div data-testid="cellar-brief-loading" className="container py-8 flex flex-col gap-3">
        <p className="text-xs uppercase tracking-widest" style={{ color: "var(--ow-text-lo)" }}>
          Cellar Brief
        </p>
        <p style={{ color: "var(--ow-text-mid)" }}>Reading the cellar…</p>
      </div>
    );
  }

  // ── Error state ─────────────────────────────────────────────────────────
  if (latest.error) {
    return (
      <div data-testid="cellar-brief-error" className="container py-8 flex flex-col gap-3">
        <h1 className="text-xl font-semibold" style={{ color: "var(--ow-text-hi)" }}>Cellar Brief unavailable</h1>
        <p style={{ color: "var(--ow-text-mid)" }}>{latest.error.message}</p>
        <button
          data-testid="cellar-brief-retry"
          onClick={() => void latest.refetch()}
          className="rounded px-4 py-2 text-sm font-semibold w-fit"
          style={{ background: "var(--ow-amber)", color: "oklch(0.10 0.008 60)" }}
        >
          Try again
        </button>
      </div>
    );
  }

  // ── Empty state ─────────────────────────────────────────────────────────
  if (cards.length === 0) {
    return (
      <div data-testid="cellar-brief-empty" className="container py-8 flex flex-col gap-4">
        <div>
          <p className="text-xs uppercase tracking-widest" style={{ color: "var(--ow-text-lo)" }}>Cellar Brief</p>
          <h1 className="text-2xl font-semibold" style={{ color: "var(--ow-text-hi)", fontFamily: "'Fraunces',serif" }}>
            Nothing in the cellar yet
          </h1>
        </div>
        <p style={{ color: "var(--ow-text-mid)" }}>
          Log a tank in <Link href="/quick-entry" className="underline" style={{ color: "var(--ow-amber)" }}>Quick Entry</Link> — the brief writes itself from there.
        </p>
      </div>
    );
  }

  // ── Main render ─────────────────────────────────────────────────────────
  return (
    <div data-testid="cellar-brief-page" className="container py-4 flex flex-col gap-4" style={{ paddingBottom: "6rem" }}>

      {/* Sticky executive summary */}
      <div
        data-testid="cellar-brief-exec"
        className="sticky top-0 z-20 rounded-lg p-4 flex flex-col gap-2"
        style={{
          background: "var(--ow-bg-raised)",
          border: "1px solid var(--ow-border)",
          backdropFilter: "blur(8px)",
          marginTop: "0.25rem",
        }}
      >
        <div className="flex items-center justify-between gap-2">
          <p className="text-xs uppercase tracking-widest" style={{ color: "var(--ow-text-lo)" }}>
            Cellar Brief {generatedAt ? `· ${formatStamp(generatedAt)}` : ""}
          </p>
          <button
            data-testid="cellar-brief-refresh"
            onClick={() => generate.mutate({ trigger: "manual" })}
            disabled={isRegenerating}
            className="text-xs px-3 py-1.5 rounded font-semibold"
            style={{
              background: isRegenerating ? "var(--ow-bg-inset)" : "var(--ow-amber)",
              color: isRegenerating ? "var(--ow-text-mid)" : "oklch(0.10 0.008 60)",
              opacity: isRegenerating ? 0.7 : 1,
            }}
          >
            {isRegenerating ? "Refreshing…" : "↻ Refresh"}
          </button>
        </div>
        <p
          data-testid="cellar-brief-exec-summary"
          className="text-base leading-snug"
          style={{ color: "var(--ow-text-hi)", fontFamily: "'Fraunces',serif", margin: 0 }}
        >
          {summary?.execSummary}
        </p>

        {/* KPI chips */}
        <div className="flex gap-2 mt-1 flex-wrap">
          <span
            data-testid="kpi-attention"
            className="text-xs px-2 py-1 rounded font-semibold"
            style={{
              background: `color-mix(in oklch, ${statusColor("attention")} 18%, transparent)`,
              color: statusColor("attention"),
              border: `1px solid color-mix(in oklch, ${statusColor("attention")} 40%, transparent)`,
            }}
          >
            {summary?.attentionCount ?? 0} attention
          </span>
          <span
            data-testid="kpi-decisions"
            className="text-xs px-2 py-1 rounded font-semibold"
            style={{
              background: `color-mix(in oklch, ${statusColor("watch")} 18%, transparent)`,
              color: statusColor("watch"),
              border: `1px solid color-mix(in oklch, ${statusColor("watch")} 40%, transparent)`,
            }}
          >
            {summary?.decisionsDueCount ?? 0} decisions due
          </span>
          <span
            data-testid="kpi-vessels"
            className="text-xs px-2 py-1 rounded font-semibold"
            style={{
              background: "var(--ow-bg-inset)",
              color: "var(--ow-text-mid)",
              border: "1px solid var(--ow-border)",
            }}
          >
            {summary?.tankCount ?? 0} vessels
          </span>
        </div>
      </div>

      {/* Cards */}
      <div className="flex flex-col gap-3">
        {cards.map((c, idx) => (
          <BriefCard key={`${c.vesselId}-${idx}`} card={c} />
        ))}
      </div>

      {/* History accordion */}
      <div className="mt-4">
        <button
          data-testid="cellar-brief-history-toggle"
          onClick={() => setShowHistory((v) => !v)}
          className="text-xs uppercase tracking-widest underline"
          style={{ color: "var(--ow-text-lo)" }}
        >
          {showHistory ? "Hide" : "Show"} past briefs ({history.data?.length ?? 0})
        </button>
        {showHistory && (
          <div data-testid="cellar-brief-history" className="mt-3 flex flex-col gap-2">
            {(history.data ?? []).map((h) => (
              <div
                key={h.id}
                className="rounded p-3"
                style={{ background: "var(--ow-bg-raised)", border: "1px solid var(--ow-border)" }}
              >
                <div className="flex items-center justify-between text-xs" style={{ color: "var(--ow-text-lo)" }}>
                  <span>{formatStamp(h.generatedAt)} · {h.trigger}</span>
                  <span>
                    {h.attentionCount > 0 && <span style={{ color: statusColor("attention") }}>{h.attentionCount} attn</span>}
                    {h.attentionCount > 0 && h.decisionsDueCount > 0 && " · "}
                    {h.decisionsDueCount > 0 && <span style={{ color: statusColor("watch") }}>{h.decisionsDueCount} dec</span>}
                  </span>
                </div>
                {h.execSummary && (
                  <p className="text-sm mt-1" style={{ color: "var(--ow-text-mid)", margin: 0 }}>
                    {h.execSummary}
                  </p>
                )}
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}

// ─── BriefCard ────────────────────────────────────────────────────────────
type Card = {
  vesselId: string;
  vesselType: "tank" | "barrel";
  variety: string;
  stage: string;
  stageLabel: string;
  daysInStage: number;
  status: "ok" | "watch" | "attention";
  trajectory: string;
  todaysWork: string[];
  decisionDue: string | null;
  grounding: string[];
};

function BriefCard({ card }: { card: Card }) {
  const [expanded, setExpanded] = useState(card.status !== "ok");
  const c = statusColor(card.status);
  const emoji = STAGE_EMOJI[card.stage] ?? "·";
  const slug = `${card.vesselId}-${card.variety}`
    .replace(/[^a-zA-Z0-9]+/g, "-")
    .replace(/^-|-$/g, "")
    .toLowerCase();

  return (
    <div
      data-testid={`brief-card-${slug}`}
      data-status={card.status}
      className="rounded-lg overflow-hidden"
      style={{
        background: "var(--ow-bg-raised)",
        border: `1px solid color-mix(in oklch, ${c} 35%, var(--ow-border))`,
      }}
    >
      {/* Card header — always visible, tappable to expand */}
      <button
        onClick={() => setExpanded((v) => !v)}
        data-testid={`brief-card-toggle-${slug}`}
        className="w-full text-left p-4 flex items-start gap-3"
        style={{ background: "transparent" }}
      >
        <div className="flex-shrink-0 mt-1">
          <div
            className="w-2.5 h-2.5 rounded-full"
            style={{ background: c, boxShadow: `0 0 0 4px color-mix(in oklch, ${c} 20%, transparent)` }}
            aria-hidden="true"
          />
        </div>
        <div className="flex-1 min-w-0">
          <div className="flex items-baseline gap-2 flex-wrap">
            <h2 className="text-lg font-semibold" style={{ color: "var(--ow-text-hi)", fontFamily: "'Fraunces',serif", margin: 0 }}>
              {card.vesselId}
            </h2>
            <span className="text-sm" style={{ color: "var(--ow-text-mid)" }}>{card.variety}</span>
          </div>
          <div className="flex items-center gap-2 mt-1 flex-wrap">
            <span className="text-xs px-2 py-0.5 rounded" style={{ background: "var(--ow-bg-inset)", color: "var(--ow-text-mid)" }}>
              {emoji} {card.stageLabel} · day {card.daysInStage}
            </span>
            <span className="text-xs px-2 py-0.5 rounded font-semibold" style={{ background: `color-mix(in oklch, ${c} 18%, transparent)`, color: c }}>
              {statusLabel(card.status)}
            </span>
          </div>
          <p className="text-sm mt-2" style={{ color: "var(--ow-text-hi)", margin: 0 }}>{card.trajectory}</p>
        </div>
        <div className="flex-shrink-0 text-xs" style={{ color: "var(--ow-text-lo)" }}>
          {expanded ? "▴" : "▾"}
        </div>
      </button>

      {/* Expanded body */}
      {expanded && (
        <div className="px-4 pb-4 flex flex-col gap-3" style={{ borderTop: "1px solid var(--ow-border)", paddingTop: "0.75rem" }}>
          {card.decisionDue && (
            <div
              data-testid={`brief-decision-${slug}`}
              className="rounded p-3"
              style={{
                background: `color-mix(in oklch, ${c} 12%, transparent)`,
                border: `1px solid color-mix(in oklch, ${c} 40%, transparent)`,
              }}
            >
              <p className="text-xs uppercase tracking-widest font-semibold" style={{ color: c, margin: 0 }}>
                Decision due
              </p>
              <p className="text-sm mt-1" style={{ color: "var(--ow-text-hi)", margin: 0 }}>{card.decisionDue}</p>
            </div>
          )}

          <div>
            <p className="text-xs uppercase tracking-widest font-semibold" style={{ color: "var(--ow-text-lo)", margin: 0 }}>
              Today&apos;s work
            </p>
            <ul className="mt-2 flex flex-col gap-1.5" style={{ listStyle: "none", padding: 0 }}>
              {card.todaysWork.map((w, i) => (
                <li
                  key={i}
                  className="flex items-start gap-2 text-sm"
                  style={{ color: "var(--ow-text-hi)" }}
                  data-testid={`brief-work-${slug}-${i}`}
                >
                  <span style={{ color: "var(--ow-amber)", marginTop: "0.1rem" }}>□</span>
                  <span style={{ flex: 1 }}>{w}</span>
                </li>
              ))}
            </ul>
          </div>

          {card.grounding.length > 0 && (
            <div>
              <p className="text-xs uppercase tracking-widest font-semibold" style={{ color: "var(--ow-text-lo)", margin: 0 }}>
                Grounded in
              </p>
              <ul className="mt-2 flex flex-wrap gap-1.5" style={{ listStyle: "none", padding: 0 }}>
                {card.grounding.map((g, i) => (
                  <li key={i}>
                    <span
                      className="text-xs px-2 py-1 rounded"
                      style={{ background: "var(--ow-bg-inset)", color: "var(--ow-text-mid)", border: "1px solid var(--ow-border)" }}
                      data-testid={`brief-grounding-${slug}-${i}`}
                    >
                      {g}
                    </span>
                  </li>
                ))}
              </ul>
            </div>
          )}

          <div className="flex gap-2 mt-1">
            <Link
              href={`/quick-entry?tank=${encodeURIComponent(card.vesselId)}&variety=${encodeURIComponent(card.variety)}`}
              data-testid={`brief-log-${slug}`}
              className="text-xs px-3 py-2 rounded font-semibold"
              style={{ background: "var(--ow-amber)", color: "oklch(0.10 0.008 60)" }}
            >
              + Log on {card.vesselId}
            </Link>
            <Link
              href={`/free-run?from=cellar-brief&tank=${encodeURIComponent(card.vesselId)}`}
              data-testid={`brief-ask-${slug}`}
              className="text-xs px-3 py-2 rounded font-semibold"
              style={{ background: "var(--ow-bg-inset)", color: "var(--ow-text-hi)", border: "1px solid var(--ow-border)" }}
            >
              Ask Ownology
            </Link>
          </div>
        </div>
      )}
    </div>
  );
}
