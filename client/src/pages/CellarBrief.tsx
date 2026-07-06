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
  const [showHistory, setShowHistory] = useState(false);
  const history = trpc.cellarBrief.history.useQuery({ limit: 10 }, {
    refetchOnWindowFocus: false,
    retry: false,
    enabled: showHistory,
  });

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

      {/* LIP compliance badge — Wine Australia s.39F 85%-rule snapshot */}
      {summary?.lipCompliance && summary.lipCompliance.status !== "empty" && (
        <LipComplianceBadge snapshot={summary.lipCompliance} />
      )}

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
type GhostQ = {
  id: number;
  question: string;
  answer: string | null;
  category: string | null;
  difficulty: string;
  journalSlug: string | null;
};
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
  ghostQuestion: GhostQ | null;
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
            <span
              data-testid={`quant-info-${slug}`}
              title={
                "Quantitative risk (Tier 1) — this status fired from lab readings, no operator prompt. Ownology watches 7 quantitative risks:\n" +
                "• SO₂ decay in aging vessels\n" +
                "• Stuck / sluggish ferment (Brix flatline)\n" +
                "• Ferment temp excursion\n" +
                "• MLF drift / stall\n" +
                "• Silent barrel / tank (>30 days no check)\n" +
                "• LIP / compliance drift\n" +
                "• Days-since-check drift on aging vessels\n\n" +
                "Green = pass, amber = watch (near-miss), red = attention required. Full staff briefing at /risk-briefing."
              }
              style={{
                display: "inline-flex",
                alignItems: "center",
                justifyContent: "center",
                width: 14,
                height: 14,
                borderRadius: "50%",
                border: "1px solid var(--ow-border)",
                color: "var(--ow-text-mid)",
                fontSize: "0.55rem",
                fontWeight: 700,
                cursor: "help",
                userSelect: "none",
                lineHeight: 1,
              }}
              aria-label="Quantitative risk info"
            >
              i
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

          {card.ghostQuestion && (
            <GhostQuestionBlock slug={slug} q={card.ghostQuestion} />
          )}

          <QualFlagsBlock slug={slug} vesselId={card.vesselId} />

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

/**
 * QualFlagsBlock — qualitative risk capture on the vessel card.
 * Displays active (unresolved) flags as amber chips + a "flag" button
 * that opens a small picker (brett / TCA / oxidation / H₂S / sanitation /
 * other) with an optional note. Resolution captures a note too, so audit
 * trail survives collapse.
 *
 * Doctrine: /risk-management (public) explains the framework.
 */
type QualFlagType = "brett" | "tca" | "oxidation" | "h2s" | "sanitation" | "other";
const FLAG_LABELS: Record<QualFlagType, string> = {
  brett: "Brett",
  tca: "TCA / cork taint",
  oxidation: "Oxidation",
  h2s: "H₂S / reduction",
  sanitation: "Sanitation",
  other: "Other",
};

/**
 * Tribal-knowledge tooltips for each qualitative risk. Rendered on hover
 * over each pick button in the picker AND on the "Qualitative risk" heading
 * itself (as an inline info dot). Deliberately concise — cellar staff need
 * "what to sniff for" not a research paper. Full doctrine at /risk-briefing.
 */
const FLAG_TOOLTIPS: Record<QualFlagType, { look: string; then: string }> = {
  brett: {
    look: "Barnyard, band-aid, sweaty leather, horse-stable. Volatile phenols (4-EP, 4-EG). Often masks fruit character. Barrel-aged reds are most at risk.",
    then: "Confirm on the palate (mouse ferment?). Isolate the vessel, tighten SO₂, taste weekly. Escalate to blend/bottling call within 2 weeks.",
  },
  tca: {
    look: "Musty basement, wet cardboard, damp cellar. Even at 2-3 ng/L it flattens the wine's fruit and finish. Corked bottles are the classic case, but cellar contamination is possible.",
    then: "Never one-off — check adjacent barrels, corks, and hoses. Escalate to a sensory bench with two other tasters; TCA below your threshold still costs finesse.",
  },
  oxidation: {
    look: "Colour drift (browning in whites, brick in reds), aroma flattening, sherry / bruised-apple notes, faded fruit. Metallic edge on the palate.",
    then: "Check ullage, headspace, and last SO₂ addition. Top-up, dose SO₂ against the current pH/molecular target, reduce racking exposure.",
  },
  h2s: {
    look: "Rotten egg, struck match, burnt rubber, drain. Often mid to late ferment. Untreated turns into mercaptan (skunky) then disulfide (garlic) — much harder to fix.",
    then: "Splash-rack for aeration immediately, add DAP if pre-inoc, add Cu (5-10 mg/L) if post-inoc & persistent. Retaste in 24h — escalate to fining if unresolved.",
  },
  sanitation: {
    look: "Visible mould, biofilm on hose interior, chalky residue on tank walls, off-clean smell, sticky fittings. Any vessel returning to service without a full clean cycle.",
    then: "Re-clean full cycle: caustic → rinse → citric → rinse → sanitiser → rinse. Log the observation so it's traceable if a downstream batch shows issues.",
  },
  other: {
    look: "Anything the winemaker's nose or eye caught that doesn't fit the five above. Freeform capture — write what you saw.",
    then: "Note vessel + observation. Follow up within 48h with a targeted lab test or blind bench-taste if warranted.",
  },
};

// Small reusable info-dot for hover tooltips (uses browser <title> so no
// portal/z-index headaches; readable by screen readers).
function InfoDot({ tip, testId }: { tip: string; testId?: string }) {
  return (
    <span
      data-testid={testId}
      title={tip}
      style={{
        display: "inline-flex",
        alignItems: "center",
        justifyContent: "center",
        width: 14,
        height: 14,
        borderRadius: "50%",
        border: "1px solid var(--ow-border)",
        color: "var(--ow-text-mid)",
        fontSize: "0.55rem",
        fontWeight: 700,
        marginLeft: "0.35rem",
        cursor: "help",
        userSelect: "none",
        lineHeight: 1,
      }}
      aria-label="More info"
    >
      i
    </span>
  );
}

function QualFlagsBlock({ slug, vesselId }: { slug: string; vesselId: string }) {
  const utils = trpc.useUtils();
  const activeQ = trpc.qualFlags.listActive.useQuery();
  const flagMut = trpc.qualFlags.flag.useMutation({
    onSuccess: () => utils.qualFlags.listActive.invalidate(),
  });
  const resolveMut = trpc.qualFlags.resolve.useMutation({
    onSuccess: () => utils.qualFlags.listActive.invalidate(),
  });

  const [picking, setPicking] = useState<QualFlagType | null>(null);
  const [note, setNote] = useState("");
  const [showPicker, setShowPicker] = useState(false);

  const myFlags = (activeQ.data ?? []).filter((f) => f.vesselId === vesselId);

  async function submitFlag() {
    if (!picking) return;
    await flagMut.mutateAsync({ vesselId, flagType: picking, note: note.trim() || undefined });
    setPicking(null);
    setNote("");
    setShowPicker(false);
  }

  async function resolve(id: number) {
    const resolvedNote = prompt("Resolution note (optional):") ?? undefined;
    await resolveMut.mutateAsync({ id, resolvedNote: resolvedNote?.trim() || undefined });
  }

  return (
    <div data-testid={`qual-flags-${slug}`}>
      <p className="text-xs uppercase tracking-widest font-semibold flex items-center" style={{ color: "var(--ow-text-lo)", margin: 0 }}>
        Qualitative risk
        <InfoDot
          testId={`qual-info-${slug}`}
          tip={
            "Winemaker-observation risks (taste, smell, sight). 6 flag types:\n" +
            "• Brett — barnyard / band-aid volatile phenols\n" +
            "• TCA — musty / wet-cardboard cork taint\n" +
            "• Oxidation — browning + sherry notes + faded fruit\n" +
            "• H₂S — rotten-egg / struck-match reduction (mid-late ferment)\n" +
            "• Sanitation — visible mould, biofilm, off-clean vessel\n" +
            "• Other — anything else the nose caught\n\n" +
            "Full staff briefing at /risk-briefing."
          }
        />
      </p>
      {myFlags.length === 0 && !showPicker && (
        <div className="mt-2 flex items-center gap-2">
          <span className="text-xs" style={{ color: "var(--ow-text-lo)" }}>None flagged</span>
          <button
            type="button"
            data-testid={`qual-flag-open-${slug}`}
            onClick={() => setShowPicker(true)}
            className="text-xs underline"
            style={{ color: "var(--ow-amber)", background: "transparent", border: "none", padding: 0, cursor: "pointer" }}
          >
            🚩 flag one
          </button>
        </div>
      )}
      {myFlags.length > 0 && (
        <ul className="mt-2 flex flex-wrap gap-1.5" style={{ listStyle: "none", padding: 0 }}>
          {myFlags.map((f) => (
            <li key={f.id} data-testid={`qual-flag-chip-${f.id}`}>
              <span
                className="text-xs px-2 py-1 rounded inline-flex items-center gap-2"
                style={{ background: "color-mix(in oklch, gold 15%, transparent)", color: "#b45309", border: "1px solid color-mix(in oklch, gold 40%, transparent)" }}
              >
                🚩 {FLAG_LABELS[f.flagType as QualFlagType] ?? f.flagType}
                {f.note ? <span style={{ color: "var(--ow-text-mid)", fontStyle: "italic" }}>· {f.note}</span> : null}
                <button
                  type="button"
                  data-testid={`qual-flag-resolve-${f.id}`}
                  onClick={() => resolve(f.id)}
                  className="ml-1 text-xs underline"
                  style={{ color: "#059669", background: "transparent", border: "none", padding: 0, cursor: "pointer" }}
                >
                  resolve
                </button>
              </span>
            </li>
          ))}
          {!showPicker && (
            <li>
              <button
                type="button"
                data-testid={`qual-flag-open-more-${slug}`}
                onClick={() => setShowPicker(true)}
                className="text-xs underline"
                style={{ color: "var(--ow-amber)", background: "transparent", border: "none", padding: "2px 0", cursor: "pointer" }}
              >
                + another
              </button>
            </li>
          )}
        </ul>
      )}
      {showPicker && (
        <div
          className="mt-2 p-3 rounded"
          data-testid={`qual-flag-picker-${slug}`}
          style={{ background: "var(--ow-bg-inset)", border: "1px solid var(--ow-border)" }}
        >
          <div className="flex flex-wrap gap-1.5">
            {(Object.keys(FLAG_LABELS) as QualFlagType[]).map((k) => (
              <button
                key={k}
                type="button"
                data-testid={`qual-flag-pick-${slug}-${k}`}
                onClick={() => setPicking(k)}
                title={`LOOK FOR: ${FLAG_TOOLTIPS[k].look}\n\nTHEN: ${FLAG_TOOLTIPS[k].then}`}
                className="text-xs px-3 py-1 rounded"
                style={{
                  background: picking === k ? "color-mix(in oklch, gold 20%, transparent)" : "transparent",
                  color: picking === k ? "var(--ow-text-hi)" : "var(--ow-text-mid)",
                  border: `1px solid ${picking === k ? "var(--ow-amber)" : "var(--ow-border)"}`,
                  fontWeight: picking === k ? 600 : 500,
                  cursor: "pointer",
                }}
              >
                {FLAG_LABELS[k]}
              </button>
            ))}
          </div>
          {picking && (
            <div
              data-testid={`qual-flag-education-${slug}`}
              className="mt-2 p-2.5 rounded text-xs"
              style={{
                background: "color-mix(in oklch, var(--ow-amber) 6%, transparent)",
                borderLeft: "2px solid var(--ow-amber)",
                lineHeight: 1.55,
              }}
            >
              <p style={{ margin: 0, color: "var(--ow-text-hi)" }}>
                <strong style={{ color: "var(--ow-amber)" }}>Look for:</strong> {FLAG_TOOLTIPS[picking].look}
              </p>
              <p style={{ margin: "0.35rem 0 0", color: "var(--ow-text-mid)" }}>
                <strong style={{ color: "var(--ow-amber)" }}>Then:</strong> {FLAG_TOOLTIPS[picking].then}
              </p>
            </div>
          )}
          <input
            type="text"
            data-testid={`qual-flag-note-${slug}`}
            placeholder="Optional note (e.g. 'band-aid on nose during pump-over')"
            value={note}
            onChange={(e) => setNote(e.target.value)}
            className="mt-2 w-full text-sm px-2 py-1 rounded"
            style={{ background: "var(--ow-bg-card)", border: "1px solid var(--ow-border)", color: "var(--ow-text-hi)" }}
            maxLength={500}
          />
          <div className="mt-2 flex gap-2">
            <button
              type="button"
              data-testid={`qual-flag-submit-${slug}`}
              onClick={submitFlag}
              disabled={!picking || flagMut.isPending}
              className="text-xs px-3 py-1.5 rounded font-semibold"
              style={{ background: "var(--ow-amber)", color: "oklch(0.10 0.008 60)", opacity: !picking ? 0.5 : 1, cursor: !picking ? "not-allowed" : "pointer", border: "none" }}
            >
              {flagMut.isPending ? "Flagging…" : "🚩 Flag"}
            </button>
            <button
              type="button"
              data-testid={`qual-flag-cancel-${slug}`}
              onClick={() => { setShowPicker(false); setPicking(null); setNote(""); }}
              className="text-xs px-3 py-1.5 rounded"
              style={{ background: "transparent", color: "var(--ow-text-mid)", border: "1px solid var(--ow-border)", cursor: "pointer" }}
            >
              Cancel
            </button>
          </div>
        </div>
      )}
    </div>
  );
}

/**
 * "Worth knowing" teaching block — surfaces 1 ghost question per card.
 * Collapsed by default (the answer is educational, not urgent) so it
 * doesn't compete with the decision-due / today's work content for
 * a 5:30 AM cellar hand's attention. Tap the question to expand.
 */
function GhostQuestionBlock({ slug, q }: { slug: string; q: GhostQ }) {
  const [open, setOpen] = useState(false);
  return (
    <div
      data-testid={`brief-ghost-${slug}`}
      className="rounded p-3"
      style={{
        background: "var(--ow-bg-inset)",
        border: "1px solid var(--ow-border)",
      }}
    >
      <button
        data-testid={`brief-ghost-toggle-${slug}`}
        onClick={() => setOpen((v) => !v)}
        className="w-full text-left flex items-start gap-2"
        style={{ background: "transparent", padding: 0 }}
      >
        <span aria-hidden="true" style={{ color: "var(--ow-amber)", flexShrink: 0, marginTop: 1 }}>✦</span>
        <div className="flex-1 min-w-0">
          <p
            className="text-xs uppercase tracking-widest font-semibold"
            style={{ color: "var(--ow-text-lo)", margin: 0 }}
          >
            Worth knowing
          </p>
          <p
            className="text-sm mt-1"
            data-testid={`brief-ghost-q-${slug}`}
            style={{ color: "var(--ow-text-hi)", margin: 0, lineHeight: 1.35 }}
          >
            {q.question}
          </p>
        </div>
        <span style={{ color: "var(--ow-text-lo)", fontSize: "0.7rem", flexShrink: 0 }}>
          {open ? "▴" : "▾"}
        </span>
      </button>
      {open && q.answer && (
        <div style={{ paddingLeft: "1.25rem", marginTop: "0.5rem" }}>
          <p
            data-testid={`brief-ghost-a-${slug}`}
            className="text-sm"
            style={{ color: "var(--ow-text-mid)", margin: 0, lineHeight: 1.5 }}
          >
            {q.answer}
          </p>
          {q.journalSlug && (
            <Link
              href={`/cellar-journal/${q.journalSlug}?from=cellar-brief`}
              data-testid={`brief-ghost-readmore-${slug}`}
              className="inline-block mt-2 text-xs font-semibold"
              style={{ color: "var(--ow-amber)", textDecoration: "none" }}
            >
              Read full answer + citations →
            </Link>
          )}
        </div>
      )}
    </div>
  );
}



// ─── LIP compliance badge ─────────────────────────────────────────────────
// Ambient label-compliance signal. Same 85% math as the annual LIP Audit
// Pack PDF (see /app/server/lipCompliance.ts). Three visual states:
//   pass       — green tick, calm tone, "all classes qualify"
//   watch      — amber, near-miss, actionable ("340kg short of…")
//   attention  — copper, designed-blend disclosure required
// Free-plan users see a locked variant nudging them to upgrade — the badge
// stays visible so the value is always in-frame.

type LipComplianceSnapshot = {
  vintage: number;
  status: "pass" | "watch" | "attention" | "empty";
  batchCount: number;
  classCount: number;
  passingClasses: number;
  failingClasses: number;
  worstClass: { variety: string; gi: string; share: number } | null;
  nudge: string;
};

function LipComplianceBadge({ snapshot }: { snapshot: LipComplianceSnapshot }) {
  const palette = {
    pass:      { bg: "color-mix(in oklch, #166534 8%, transparent)", border: "#16653455", text: "#166534", label: "✓" },
    watch:     { bg: "color-mix(in oklch, #b45309 10%, transparent)", border: "#b4530955", text: "#b45309", label: "~" },
    attention: { bg: "color-mix(in oklch, #b45309 14%, transparent)", border: "#b4530999", text: "#b45309", label: "⚠" },
    empty:     { bg: "transparent", border: "var(--ow-border)", text: "var(--ow-text-lo)", label: "·" },
  }[snapshot.status];

  const label = snapshot.status === "pass"
    ? "Single-class label ready"
    : snapshot.status === "watch"
      ? "Near single-class threshold"
      : "Multi-class vintage";

  return (
    <Link
      href={`/compliance?vintage=${snapshot.vintage}`}
      data-testid="cellar-brief-lip-badge"
      style={{
        display: "flex",
        alignItems: "center",
        gap: "0.75rem",
        padding: "0.75rem 1rem",
        background: palette.bg,
        border: `1px solid ${palette.border}`,
        borderRadius: "6px",
        textDecoration: "none",
        fontFamily: "'Lato', sans-serif",
      }}
    >
      <span
        aria-hidden="true"
        style={{
          display: "inline-flex",
          alignItems: "center",
          justifyContent: "center",
          width: 28,
          height: 28,
          borderRadius: "50%",
          background: palette.text,
          color: "white",
          fontWeight: 700,
          fontSize: "0.85rem",
          flexShrink: 0,
        }}
      >
        {palette.label}
      </span>
      <div style={{ flex: 1, minWidth: 0 }}>
        <p
          data-testid="cellar-brief-lip-badge-label"
          style={{
            margin: 0,
            fontSize: "0.72rem",
            textTransform: "uppercase",
            letterSpacing: "0.1em",
            fontWeight: 700,
            color: palette.text,
          }}
        >
          Vintage {snapshot.vintage} · {label}
        </p>
        <p
          data-testid="cellar-brief-lip-badge-nudge"
          style={{
            margin: "0.25rem 0 0",
            fontSize: "0.85rem",
            color: "var(--ow-text-mid)",
            lineHeight: 1.4,
          }}
        >
          {snapshot.nudge}
        </p>
      </div>
      <span
        style={{
          fontSize: "0.75rem",
          fontWeight: 600,
          color: palette.text,
          flexShrink: 0,
        }}
      >
        Details →
      </span>
    </Link>
  );
}
