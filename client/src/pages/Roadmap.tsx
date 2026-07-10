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
import { Link } from "wouter";
import { Helmet } from "react-helmet";
import { CheckCircle2, Lock, Circle, ArrowRight } from "lucide-react";
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
      "The starting point. From here you can already ask Owen anything about winemaking — grounded in the Red & White Wine Bibles and MoreWine manuals — and read the daily Cellar Brief in demo mode.",
  },
  {
    key: "hasTanks",
    n: 2,
    title: "Register tanks / vessels",
    promise: "Log at least one tank name in the Vessel Journal.",
    unlocks: "Tank-tag autofill · vessel-scoped brief cards.",
    cta: { label: "Add a tank via Quick Entry", href: "/quick-entry" },
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
    detail:
      "The batch is finished. Ownology archives the full lineage: harvest → inoculation → ferment → racking → maturation → bottling. Compliance audit-pack PDF becomes exportable. The Insta Copilot has enough raw material to write a real vintage caption.",
  },
];

function Node({
  gate,
  unlocked,
  count,
}: {
  gate: Gate;
  unlocked: boolean;
  count?: number;
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
          {unlocked ? gate.detail : `Unlocks → ${gate.unlocks}`}
        </p>
        {!unlocked && (
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

  const status = data ?? {
    registered: false,
    hasTanks: false,
    hasBatch: false,
    hasMeasurement: false,
    hasFermentation: false,
    hasRacking: false,
    hasBottling: false,
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
        <title>Roadmap · Ownology</title>
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
          Your Ownology Roadmap
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
        />
      ))}

      {/* The Press reveal — only when at least one racking OR bottling exists */}
      <div
        data-testid="roadmap-press-reveal"
        style={{
          marginTop: "2rem",
          padding: "1.5rem 1.5rem",
          borderRadius: "0.9rem",
          background: status.hasRacking || status.hasBottling
            ? "linear-gradient(180deg, #FBF3E4, #F3ECE4)"
            : "rgba(0,0,0,0.03)",
          border: status.hasRacking || status.hasBottling
            ? "1px solid rgba(176,116,26,0.35)"
            : "1px dashed rgba(0,0,0,0.15)",
        }}
      >
        <div style={{ display: "flex", alignItems: "center", gap: "0.5rem", marginBottom: "0.5rem" }}>
          {status.hasRacking || status.hasBottling ? (
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
        </div>
        {status.hasRacking || status.hasBottling ? (
          <>
            <p
              style={{
                margin: "0.3rem 0 0.7rem 0",
                fontSize: "0.88rem",
                color: "#3a2f28",
                fontFamily: "'Lato', sans-serif",
              }}
            >
              You&apos;ve completed a ferment or bottled a batch. The Press can now
              write your real post-vintage story — peak Brix, ferment duration,
              temp swings, additions timeline, tasting notes — with your own
              data cited back to you.
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
                margin: 0,
                fontSize: "0.78rem",
                color: "rgba(0,0,0,0.5)",
                fontFamily: "'Lato', sans-serif",
                fontStyle: "italic",
              }}
              data-testid="roadmap-press-locked-hint"
            >
              Architecture visible from Gate 3 · full debrief from Gate 6.
            </p>
          </>
        )}
      </div>
    </div>
  );
}
