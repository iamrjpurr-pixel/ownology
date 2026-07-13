/**
 * Roadmap — conditional-flow "gate graph" showing the winemaker's
 * journey through Ownology. Each gate reveals downstream detail only
 * once the operator has entered qualifying data.
 *
 * Rich (Feb 2026): *"we must be careful not to go too deep into the
 * press too soon; can reveal press architecture but don't reveal detail
 * until detail has been entered or calculated by app."*
 *
 * How it works:
 *  - Server: `trpc.onboarding.roadmapStatus` returns booleans + counts
 *    from the live vintage_log (tanks used, batches registered,
 *    measurements taken, ferments started, rackings, bottlings).
 *  - Client: renders a 7-node spine. Locked nodes render greyed-out
 *    with a one-line "what to do to unlock" CTA + tap-through to the
 *    prerequisite action.
 *  - The Press: architecture card visible from Gate 3 (hasBatch);
 *    per-batch debrief detail hidden until Gate 6 (hasRacking) OR
 *    Gate 7 (hasBottling).
 *
 * Design intent: honest progressive disclosure. Prospects and members
 * can see the SHAPE of what Ownology does end-to-end without being
 * shown fake data or empty screens.
 */
import { useState, useEffect } from "react";
import { Link } from "wouter";
import { Helmet } from "react-helmet";
import { CheckCircle2, Lock, Circle, ArrowRight, Eye, EyeOff } from "lucide-react";
import { trpc } from "@/lib/trpc";

type GateKey =
  | "registered"
  | "hasTanks"
  | "hasBatch"
  | "hasMeasurement"
  | "hasFermentation"
  | "hasRacking"
  | "hasBottling";

type Gate = {
  key: GateKey;
  n: number;
  title: string;
  promise: string;
  unlocks: string;
  cta: { label: string; href: string };
  // Optional "why does this matter?" secondary CTA — softens locked-gate
  // reactance risk by giving skimmers a route to context instead of
  // always funnelling them to `/quick-entry`.
  learnCta?: { label: string; href: string };
  detail: string;
};

const GATES: Gate[] = [
  {
    key: "registered",
    n: 1,
    title: "Register",
    promise: "You have an Ownology account.",
    unlocks: "Cellar Brief · Ask Owen · Roadmap visibility.",
    cta: { label: "Guide", href: "/guide" },
    detail:
      "The starting point. From here you can already ask Owen anything about winemaking — grounded in the finest wine-science texts and AWRI&rsquo;s technical library — and read the daily Cellar Brief in demo mode.",
  },
  {
    key: "hasTanks",
    n: 2,
    title: "Register tanks / vessels",
    promise: "Log at least one tank name in the Vessel Journal.",
    unlocks: "Tank-tag autofill · vessel-scoped brief cards.",
    cta: { label: "Add a tank via Quick Entry", href: "/quick-entry" },
    learnCta: { label: "Why vessels first?", href: "/guide#pillar-journal" },
    detail:
      "Even a single tank unlocks vessel-scoped intelligence. You'll see it in the Brief, in Ask Owen citations, and on the Roadmap dashboard. No block/vineyard data required at this stage.",
  },
  {
    key: "hasBatch",
    n: 3,
    title: "Register a batch",
    promise: "Log a variety + vintage against a tank.",
    unlocks: "The Press architecture · Cellar Brief per-batch cards · SOP suggestions.",
    cta: { label: "Add a batch via Quick Entry", href: "/quick-entry" },
    learnCta: { label: "See a sample batch write-up", href: "/cellar-journal" },
    detail:
      "A batch = a variety + a tank + a vintage year. This is when The Press becomes visible in the shell (architecture only — the deep post-vintage debrief still needs measurements + a completed ferment).",
  },
  {
    key: "hasMeasurement",
    n: 4,
    title: "First measurement",
    promise: "Log a Brix, pH, or temperature reading.",
    unlocks: "Alerts engine · trend lines · sensory inference.",
    cta: { label: "Log a measurement", href: "/quick-entry" },
    learnCta: { label: "How the alerts engine works", href: "/guide#pillar-copilot" },
    detail:
      "One reading turns Ownology on. Two readings starts the trend. The alerts engine (stuck ferment / temp excursion / SO₂ decay) needs at least one measurement per vessel to have a baseline.",
  },
  {
    key: "hasFermentation",
    n: 5,
    title: "Ferment in progress",
    promise: "Inoculation logged OR 3+ measurements on one vessel.",
    unlocks: "Live ferment card on the brief · MLF prompts · tasting flywheel.",
    cta: { label: "Log an inoculation", href: "/quick-entry" },
    learnCta: { label: "Ask Owen about ferment chemistry", href: "/ask" },
    detail:
      "A ferment moves the vessel from 'setup' to 'active'. Ownology starts nudging you on DAP, temp, SO₂ addition points. You can also start logging tastings at this point (they feed the Sensory Snapshot on the Brief).",
  },
  {
    key: "hasRacking",
    n: 6,
    title: "Post-ferment (racking)",
    promise: "Log a racking event — ferment considered finished.",
    unlocks: "The Press · per-batch debrief detail · vintage comparison.",
    cta: { label: "Log a racking event", href: "/quick-entry" },
    learnCta: { label: "Preview The Press", href: "/the-press" },
    detail:
      "Once you've racked, Ownology can honestly write the post-ferment story for that batch: peak Brix, ferment duration, temp swing, additions timeline. This is when The Press earns its keep.",
  },
  {
    key: "hasBottling",
    n: 7,
    title: "Bottling",
    promise: "Log a bottling run against the batch.",
    unlocks: "Vintage-year archive · compliance PDF export · Insta Copilot.",
    cta: { label: "Log a bottling run", href: "/quick-entry" },
    learnCta: { label: "See compliance export", href: "/regulations" },
    detail:
      "The batch is finished. Ownology archives the full lineage: harvest → inoculation → ferment → racking → maturation → bottling. Compliance audit-pack PDF becomes exportable. The Insta Copilot has enough raw material to write a real vintage caption.",
  },
];

function Node({
  gate,
  unlocked,
  count,
  skim,
}: {
  gate: Gate;
  unlocked: boolean;
  count?: number;
  skim: boolean;
}) {
  const testId = `roadmap-gate-${gate.key}`;
  return (
    <div
      data-testid={testId}
      style={{
        display: "grid",
        gridTemplateColumns: "3rem 1fr",
        gap: "1rem",
        alignItems: "flex-start",
        padding: "1.25rem",
        borderRadius: "0.75rem",
        border: unlocked
          ? "1px solid rgba(176,116,26,0.35)"
          : "1px solid rgba(0,0,0,0.12)",
        background: unlocked
          ? "linear-gradient(180deg, rgba(251,243,228,0.9), rgba(243,236,228,0.6))"
          : "rgba(255,255,255,0.55)",
        color: "#1a1210",
        opacity: unlocked ? 1 : 0.72,
        marginBottom: "0.9rem",
      }}
    >
      <div
        style={{
          width: "3rem",
          height: "3rem",
          borderRadius: 999,
          background: unlocked ? "#B0741A" : "rgba(0,0,0,0.06)",
          color: unlocked ? "#2A1E0A" : "rgba(0,0,0,0.45)",
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
          fontFamily: "'Fraunces', Georgia, serif",
          fontWeight: 600,
          fontSize: "1.1rem",
        }}
      >
        {unlocked ? <CheckCircle2 size={20} strokeWidth={2.2} /> : gate.n}
      </div>
      <div>
        <div style={{ display: "flex", alignItems: "center", gap: "0.5rem", flexWrap: "wrap" }}>
          <h3
            style={{
              margin: 0,
              fontFamily: "'Fraunces', Georgia, serif",
              fontSize: "1.15rem",
              fontWeight: 600,
              letterSpacing: "-0.01em",
              color: unlocked ? "#1a1210" : "rgba(0,0,0,0.55)",
            }}
          >
            {gate.n.toString().padStart(2, "0")} · {gate.title}
          </h3>
          {unlocked ? (
            <span
              style={{
                fontSize: "0.65rem",
                textTransform: "uppercase",
                letterSpacing: "0.08em",
                color: "#B0741A",
                fontWeight: 700,
              }}
              data-testid={`${testId}-status`}
            >
              Unlocked{typeof count === "number" && count > 0 ? ` · ${count}` : ""}
            </span>
          ) : (
            <span
              style={{
                display: "inline-flex",
                alignItems: "center",
                gap: "0.25rem",
                fontSize: "0.65rem",
                textTransform: "uppercase",
                letterSpacing: "0.08em",
                color: "rgba(0,0,0,0.4)",
                fontWeight: 600,
              }}
              data-testid={`${testId}-status`}
            >
              <Lock size={11} strokeWidth={2.2} /> Locked
            </span>
          )}
        </div>
        <p
          style={{
            margin: "0.35rem 0 0.5rem 0",
            fontSize: "0.9rem",
            color: unlocked ? "#3a2f28" : "rgba(0,0,0,0.55)",
            fontFamily: "'Lato', sans-serif",
          }}
        >
          {gate.promise}
        </p>
        <p
          style={{
            margin: "0.35rem 0",
            fontSize: "0.82rem",
            color: "rgba(0,0,0,0.55)",
            fontFamily: "'Lato', sans-serif",
          }}
        >
          {unlocked ? gate.detail : skim ? gate.detail : `Unlocks → ${gate.unlocks}`}
        </p>
        {!unlocked && skim && (
          <p
            style={{
              margin: "0.35rem 0",
              fontSize: "0.72rem",
              color: "rgba(0,0,0,0.5)",
              fontFamily: "'Lato', sans-serif",
              fontStyle: "italic",
            }}
            data-testid={`${testId}-skim-unlock-hint`}
          >
            Unlocks → {gate.unlocks}
          </p>
        )}
        {!unlocked && (
          <div style={{ display: "flex", flexWrap: "wrap", gap: "0.4rem", alignItems: "center" }}>
            <Link
              href={gate.cta.href}
              data-testid={`${testId}-cta`}
              style={{
                display: "inline-flex",
                alignItems: "center",
                gap: "0.35rem",
                fontSize: "0.8rem",
                fontFamily: "'Lato', sans-serif",
                fontWeight: 600,
                color: "#B0741A",
                textDecoration: "none",
                padding: "0.4rem 0.8rem",
                borderRadius: 999,
                border: "1px solid rgba(176,116,26,0.4)",
                background: "rgba(251,243,228,0.5)",
                marginTop: "0.3rem",
              }}
            >
              {gate.cta.label} <ArrowRight size={12} strokeWidth={2.2} />
            </Link>
            {gate.learnCta && (
              <Link
                href={gate.learnCta.href}
                data-testid={`${testId}-learn-cta`}
                style={{
                  display: "inline-flex",
                  alignItems: "center",
                  gap: "0.3rem",
                  fontSize: "0.72rem",
                  fontFamily: "'Lato', sans-serif",
                  fontWeight: 500,
                  color: "rgba(0,0,0,0.55)",
                  textDecoration: "none",
                  padding: "0.3rem 0.6rem",
                  borderRadius: 999,
                  marginTop: "0.3rem",
                }}
              >
                {gate.learnCta.label} →
              </Link>
            )}
          </div>
        )}
      </div>
    </div>
  );
}

export default function Roadmap() {
  const { data, isLoading, error } = trpc.onboarding.roadmapStatus.useQuery(undefined, {
    retry: false,
    refetchOnWindowFocus: false,
  });

  // Skim mode — client-side preference for wine-pro evaluators who want
  // the full read of every gate description without earning it. Persists
  // per-browser via localStorage; does NOT grant access to gated features
  // (see requestPressBypass for that). Rich, Feb 2026.
  const [skim, setSkim] = useState<boolean>(() => {
    if (typeof window === "undefined") return false;
    return window.localStorage.getItem("ow_skim_mode") === "1";
  });
  useEffect(() => {
    if (typeof window === "undefined") return;
    window.localStorage.setItem("ow_skim_mode", skim ? "1" : "0");
  }, [skim]);

  // First-invite welcome banner — server redirects new invite tokens to
  // /roadmap?welcome=1 so the induction spine is the user's FIRST surface.
  const isWelcome = typeof window !== "undefined" && new URLSearchParams(window.location.search).get("welcome") === "1";

  const status = data ?? {
    registered: false,
    hasTanks: false,
    hasBatch: false,
    hasMeasurement: false,
    hasFermentation: false,
    hasRacking: false,
    hasBottling: false,
    pressBypassRequested: false,
    pressBypassGranted: false,
    counts: { tanks: 0, batches: 0, entries: 0, measurements: 0, rackings: 0, bottlings: 0 },
  };

  const unlockedCount = GATES.filter((g) => status[g.key]).length;
  const pctUnlocked = Math.round((unlockedCount / GATES.length) * 100);

  const countFor = (key: GateKey): number => {
    if (key === "hasTanks") return status.counts.tanks;
    if (key === "hasBatch") return status.counts.batches;
    if (key === "hasMeasurement") return status.counts.measurements;
    if (key === "hasFermentation") return status.counts.entries;
    if (key === "hasRacking") return status.counts.rackings;
    if (key === "hasBottling") return status.counts.bottlings;
    return 0;
  };

  return (
    <div
      data-testid="roadmap-page"
      style={{
        maxWidth: "780px",
        margin: "0 auto",
        padding: "2.5rem 1.25rem 4rem",
        color: "var(--ow-text-hi, #1a1210)",
      }}
    >
      <Helmet>
        <title>Your Vintage · Ownology</title>
        <meta
          name="description"
          content="Your progression through Ownology — from registering your first tank to a full vintage debrief in The Press."
        />
      </Helmet>

      <div style={{ marginBottom: "2rem" }}>
        <p
          style={{
            margin: 0,
            fontSize: "0.7rem",
            letterSpacing: "0.14em",
            textTransform: "uppercase",
            color: "#B0741A",
            fontFamily: "'Lato', sans-serif",
            fontWeight: 700,
          }}
        >
          Your Ownology Vintage
        </p>
        <h1
          style={{
            margin: "0.35rem 0 0.5rem 0",
            fontFamily: "'Fraunces', Georgia, serif",
            fontSize: "clamp(1.8rem, 5vw, 2.5rem)",
            lineHeight: 1.1,
            fontWeight: 600,
            letterSpacing: "-0.02em",
          }}
        >
          You are the must. Ownology is the ferment.
        </h1>
        <p
          style={{
            margin: "0.6rem 0 0 0",
            fontSize: "0.95rem",
            color: "var(--ow-text-mid, rgba(0,0,0,0.65))",
            fontFamily: "'Lato', sans-serif",
            maxWidth: "58ch",
          }}
        >
          Seven gates from first tank to first bottling. Each gate unlocks the next
          layer of depth — we won&apos;t show you The Press debrief until you&apos;ve earned
          it by racking a batch you actually made. Honest, progressive disclosure.
        </p>
      </div>

      {/* First-invite welcome banner (from ?welcome=1 on /i/<token> redirect) */}
      {isWelcome && (
        <div
          data-testid="roadmap-welcome-banner"
          style={{
            marginBottom: "1.5rem",
            padding: "1rem 1.25rem",
            borderRadius: "0.75rem",
            background: "linear-gradient(180deg, #FBF3E4, #F3ECE4)",
            border: "1px solid rgba(176,116,26,0.35)",
            fontFamily: "'Lato', sans-serif",
            color: "#2A1E0A",
          }}
        >
          <p style={{ margin: 0, fontSize: "0.7rem", letterSpacing: "0.14em", textTransform: "uppercase", color: "#B0741A", fontWeight: 700 }}>
            Welcome to Ownology
          </p>
          <p style={{ margin: "0.3rem 0 0 0", fontSize: "0.9rem", lineHeight: 1.55, maxWidth: "62ch" }}>
            You&apos;re inside. This is your roadmap — seven gates from first
            tank to first bottling. If you&apos;re here to evaluate rather
            than to make wine, toggle <strong>Skim mode</strong> below to
            read every gate&apos;s full description without earning it.
          </p>
        </div>
      )}

      {/* Skim-mode toggle — for wine-pro evaluators who want to read every
          gate's description without earning it. Does NOT grant access to
          gated features (see the Press-bypass card at the bottom). */}
      <div
        data-testid="roadmap-skim-toggle-row"
        style={{
          marginBottom: "1.25rem",
          display: "flex",
          alignItems: "center",
          justifyContent: "space-between",
          gap: "1rem",
          flexWrap: "wrap",
        }}
      >
        <p
          style={{
            margin: 0,
            fontSize: "0.78rem",
            color: "var(--ow-text-mid, rgba(0,0,0,0.6))",
            fontFamily: "'Lato', sans-serif",
            maxWidth: "42ch",
          }}
        >
          {skim
            ? "Skim mode is on. Every gate's full description is visible — but the actual features stay gated until you enter data."
            : "Evaluating for a team or writing about us? Turn on skim mode to read every gate's full description without unlocking."}
        </p>
        <button
          type="button"
          onClick={() => setSkim((s) => !s)}
          data-testid="roadmap-skim-toggle"
          aria-pressed={skim}
          style={{
            display: "inline-flex",
            alignItems: "center",
            gap: "0.4rem",
            padding: "0.4rem 0.85rem",
            borderRadius: 999,
            border: `1px solid ${skim ? "#B0741A" : "rgba(0,0,0,0.25)"}`,
            background: skim ? "#B0741A" : "transparent",
            color: skim ? "#2A1E0A" : "var(--ow-text-hi, #1a1210)",
            fontFamily: "'Lato', sans-serif",
            fontSize: "0.72rem",
            fontWeight: 600,
            letterSpacing: "0.06em",
            textTransform: "uppercase",
            cursor: "pointer",
          }}
        >
          {skim ? <Eye size={13} strokeWidth={2.2} /> : <EyeOff size={13} strokeWidth={2.2} />}
          {skim ? "Skim mode · on" : "Skim mode"}
        </button>
      </div>

      {/* Progress bar */}
      <div
        data-testid="roadmap-progress"
        style={{
          marginBottom: "2rem",
          padding: "1rem 1.25rem",
          borderRadius: "0.75rem",
          background: "var(--ow-bg-card, rgba(251,243,228,0.5))",
          border: "1px solid rgba(176,116,26,0.35)",
        }}
      >
        <div
          style={{
            display: "flex",
            justifyContent: "space-between",
            alignItems: "baseline",
            marginBottom: "0.5rem",
          }}
        >
          <span
            style={{
              fontSize: "0.75rem",
              textTransform: "uppercase",
              letterSpacing: "0.1em",
              fontWeight: 700,
              color: "#B0741A",
              fontFamily: "'Lato', sans-serif",
            }}
          >
            Progress
          </span>
          <span
            style={{
              fontSize: "0.9rem",
              fontFamily: "'Fraunces', Georgia, serif",
              fontWeight: 600,
              color: "var(--ow-text-hi, #1a1210)",
            }}
            data-testid="roadmap-progress-count"
          >
            {unlockedCount} / {GATES.length} · {pctUnlocked}%
          </span>
        </div>
        <div
          style={{
            height: "0.5rem",
            background: "rgba(0,0,0,0.18)",
            borderRadius: 999,
            overflow: "hidden",
          }}
        >
          <div
            style={{
              height: "100%",
              width: `${pctUnlocked}%`,
              background: "#B0741A",
              transition: "width 250ms ease",
            }}
          />
        </div>
      </div>

      {isLoading && (
        <p style={{ fontFamily: "'Lato', sans-serif", opacity: 0.6 }}>
          Loading your roadmap…
        </p>
      )}
      {error && (
        <p
          data-testid="roadmap-error"
          style={{
            fontFamily: "'Lato', sans-serif",
            color: "rgba(0,0,0,0.65)",
            padding: "1rem",
            borderRadius: "0.5rem",
            background: "rgba(0,0,0,0.04)",
            fontSize: "0.9rem",
          }}
        >
          Sign in to see your personal roadmap — the gates below show what a full
          Ownology journey looks like end-to-end.
        </p>
      )}

      {GATES.map((gate) => (
        <Node
          key={gate.key}
          gate={gate}
          unlocked={status[gate.key]}
          count={countFor(gate.key)}
          skim={skim}
        />
      ))}

      {/* The Press reveal — four states: naturally unlocked (hasRacking||hasBottling),
          bypass granted (wine-pro preview), bypass requested (pending), locked */}
      <PressReveal
        naturallyUnlocked={status.hasRacking || status.hasBottling}
        bypassGranted={status.pressBypassGranted}
        bypassRequested={status.pressBypassRequested}
      />
    </div>
  );
}

// ── PressReveal ──────────────────────────────────────────────────────
// The gated "detail vs architecture" bit. Four states, in priority order:
//   1. naturallyUnlocked → full amber card + "Open The Press" CTA
//   2. bypassGranted     → same as (1) but with a "Preview access" ribbon
//   3. bypassRequested   → locked look + "Requested — we'll be in touch"
//   4. default (locked)  → locked look + wine-pro bypass request form
//
// The request form intentionally captures only three fields — role,
// publication/winery, and an optional note. No email required (the gate
// invite already carries an identity for us) — one less friction step.

function PressReveal({
  naturallyUnlocked,
  bypassGranted,
  bypassRequested,
}: {
  naturallyUnlocked: boolean;
  bypassGranted: boolean;
  bypassRequested: boolean;
}) {
  const unlocked = naturallyUnlocked || bypassGranted;
  const [formOpen, setFormOpen] = useState(false);
  const [role, setRole] = useState("");
  const [publication, setPublication] = useState("");
  const [note, setNote] = useState("");
  const [submittedLocal, setSubmittedLocal] = useState(false);
  const requestMut = trpc.onboarding.requestPressBypass.useMutation({
    onSuccess: () => setSubmittedLocal(true),
  });
  const alreadyRequested = bypassRequested || submittedLocal;

  const submit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!role.trim()) return;
    requestMut.mutate({
      role: role.trim(),
      publication: publication.trim() || undefined,
      note: note.trim() || undefined,
    });
  };

  return (
    <div
      data-testid="roadmap-press-reveal"
      style={{
        marginTop: "2rem",
        padding: "1.5rem 1.5rem",
        borderRadius: "0.9rem",
        background: unlocked
          ? "linear-gradient(180deg, #FBF3E4, #F3ECE4)"
          : "rgba(0,0,0,0.03)",
        border: unlocked
          ? "1px solid rgba(176,116,26,0.35)"
          : "1px dashed rgba(0,0,0,0.15)",
      }}
    >
      <div style={{ display: "flex", alignItems: "center", gap: "0.5rem", marginBottom: "0.5rem" }}>
        {unlocked ? (
          <CheckCircle2 size={18} strokeWidth={2.2} color="#B0741A" />
        ) : (
          <Circle size={18} strokeWidth={2.2} color="rgba(0,0,0,0.35)" />
        )}
        <h3
          style={{
            margin: 0,
            fontFamily: "'Fraunces', Georgia, serif",
            fontSize: "1.15rem",
            fontWeight: 600,
          }}
        >
          The Press — vintage debrief
        </h3>
        {bypassGranted && !naturallyUnlocked && (
          <span
            data-testid="roadmap-press-bypass-ribbon"
            style={{
              marginLeft: "0.5rem",
              fontSize: "0.6rem",
              textTransform: "uppercase",
              letterSpacing: "0.1em",
              color: "#B0741A",
              border: "1px solid #B0741A",
              padding: "0.15rem 0.5rem",
              borderRadius: 999,
              fontWeight: 700,
              fontFamily: "'Lato', sans-serif",
            }}
          >
            Preview access
          </span>
        )}
      </div>

      {unlocked ? (
        <>
          <p
            style={{
              margin: "0.3rem 0 0.7rem 0",
              fontSize: "0.88rem",
              color: "#3a2f28",
              fontFamily: "'Lato', sans-serif",
            }}
          >
            {naturallyUnlocked
              ? "You've completed a ferment or bottled a batch. The Press can now write your real post-vintage story — peak Brix, ferment duration, temp swings, additions timeline, tasting notes — with your own data cited back to you."
              : "Preview access granted. The Press below is populated with a curated sample vintage so you can evaluate what your own debrief will look like. Your live debrief unlocks once you rack your first batch."}
          </p>
          <Link
            href="/the-press"
            data-testid="roadmap-press-cta-unlocked"
            style={{
              display: "inline-flex",
              alignItems: "center",
              gap: "0.35rem",
              fontSize: "0.85rem",
              fontFamily: "'Lato', sans-serif",
              fontWeight: 600,
              color: "#2A1E0A",
              textDecoration: "none",
              padding: "0.5rem 1rem",
              borderRadius: 999,
              background: "#B0741A",
            }}
          >
            Open The Press <ArrowRight size={13} strokeWidth={2.2} />
          </Link>
        </>
      ) : (
        <>
          <p
            style={{
              margin: "0.3rem 0 0.7rem 0",
              fontSize: "0.88rem",
              color: "rgba(0,0,0,0.55)",
              fontFamily: "'Lato', sans-serif",
            }}
          >
            The Press is where Ownology writes your post-vintage debrief. We
            deliberately keep the detail locked until you&apos;ve racked a batch —
            a debrief without your own data would be a stock photo. Complete
            gates 2 through 6 above and this section opens up in full.
          </p>
          <p
            style={{
              margin: "0 0 1rem 0",
              fontSize: "0.78rem",
              color: "rgba(0,0,0,0.5)",
              fontFamily: "'Lato', sans-serif",
              fontStyle: "italic",
            }}
            data-testid="roadmap-press-locked-hint"
          >
            Architecture visible from Gate 3 · full debrief from Gate 6.
          </p>

          {/* Wine-pro bypass request path */}
          {alreadyRequested ? (
            <div
              data-testid="roadmap-press-bypass-pending"
              style={{
                padding: "0.75rem 1rem",
                borderRadius: "0.5rem",
                background: "rgba(176,116,26,0.08)",
                border: "1px solid rgba(176,116,26,0.25)",
                fontFamily: "'Lato', sans-serif",
                fontSize: "0.82rem",
                color: "#3a2f28",
              }}
            >
              Preview access requested. We&apos;ll be in touch — usually within a
              working day.
            </div>
          ) : !formOpen ? (
            <button
              type="button"
              onClick={() => setFormOpen(true)}
              data-testid="roadmap-press-bypass-open"
              style={{
                display: "inline-flex",
                alignItems: "center",
                gap: "0.35rem",
                fontSize: "0.78rem",
                fontFamily: "'Lato', sans-serif",
                fontWeight: 600,
                color: "#B0741A",
                background: "transparent",
                border: "1px dashed rgba(176,116,26,0.5)",
                padding: "0.45rem 0.9rem",
                borderRadius: 999,
                cursor: "pointer",
              }}
            >
              I&apos;m a wine professional — request preview access
            </button>
          ) : (
            <form
              onSubmit={submit}
              data-testid="roadmap-press-bypass-form"
              style={{
                marginTop: "0.5rem",
                padding: "1rem",
                borderRadius: "0.6rem",
                background: "rgba(255,255,255,0.6)",
                border: "1px solid rgba(0,0,0,0.08)",
                display: "grid",
                gap: "0.6rem",
                fontFamily: "'Lato', sans-serif",
              }}
            >
              <label style={{ display: "grid", gap: "0.2rem", fontSize: "0.72rem", color: "rgba(0,0,0,0.6)" }}>
                Your role *
                <input
                  type="text"
                  required
                  value={role}
                  onChange={(e) => setRole(e.target.value)}
                  placeholder="e.g. winemaker, wine writer, judge, buyer"
                  data-testid="roadmap-press-bypass-role"
                  style={inputStyle}
                />
              </label>
              <label style={{ display: "grid", gap: "0.2rem", fontSize: "0.72rem", color: "rgba(0,0,0,0.6)" }}>
                Publication or winery
                <input
                  type="text"
                  value={publication}
                  onChange={(e) => setPublication(e.target.value)}
                  placeholder="e.g. Halliday Wine Companion, Chalk Hill"
                  data-testid="roadmap-press-bypass-pub"
                  style={inputStyle}
                />
              </label>
              <label style={{ display: "grid", gap: "0.2rem", fontSize: "0.72rem", color: "rgba(0,0,0,0.6)" }}>
                Note (optional)
                <textarea
                  value={note}
                  onChange={(e) => setNote(e.target.value)}
                  placeholder="What you'd like to look at, review deadline, etc."
                  rows={3}
                  data-testid="roadmap-press-bypass-note"
                  style={{ ...inputStyle, fontFamily: "inherit", resize: "vertical" }}
                />
              </label>
              <div style={{ display: "flex", gap: "0.5rem", alignItems: "center" }}>
                <button
                  type="submit"
                  disabled={requestMut.isPending || !role.trim()}
                  data-testid="roadmap-press-bypass-submit"
                  style={{
                    display: "inline-flex",
                    alignItems: "center",
                    gap: "0.35rem",
                    fontSize: "0.78rem",
                    fontWeight: 600,
                    color: "#2A1E0A",
                    background: "#B0741A",
                    border: "none",
                    padding: "0.5rem 1rem",
                    borderRadius: 999,
                    cursor: requestMut.isPending ? "wait" : "pointer",
                    opacity: !role.trim() ? 0.5 : 1,
                  }}
                >
                  {requestMut.isPending ? "Sending…" : "Send request"}
                </button>
                <button
                  type="button"
                  onClick={() => setFormOpen(false)}
                  style={{
                    fontSize: "0.75rem",
                    color: "rgba(0,0,0,0.5)",
                    background: "transparent",
                    border: "none",
                    cursor: "pointer",
                  }}
                >
                  Cancel
                </button>
              </div>
              {requestMut.error && (
                <p style={{ fontSize: "0.72rem", color: "#a33", margin: 0 }}>
                  {requestMut.error.message || "Couldn't send — try again."}
                </p>
              )}
            </form>
          )}
        </>
      )}
    </div>
  );
}

const inputStyle: React.CSSProperties = {
  padding: "0.5rem 0.7rem",
  borderRadius: "0.4rem",
  border: "1px solid rgba(0,0,0,0.15)",
  fontSize: "0.85rem",
  background: "#fff",
  color: "#1a1210",
  fontFamily: "inherit",
};
