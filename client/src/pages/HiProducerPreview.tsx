/**
 * /hi/producers/:id — cold-prospect preview of Ownology Cellar Brief.
 *
 * This is what a winemaker sees when they click the personalized link from
 * a cold email. It shows a plausible-looking Cellar Brief scoped to their
 * region + current season, addressed to them by name. The intent is not to
 * pretend we have their real data (we don't) but to concretely demonstrate
 * "this is what your Monday morning could look like — no data entry
 * needed" and drive a demo booking.
 *
 * Everything is client-side rendered from a small region template. Zero
 * LLM cost per view — so this can be linked from a cold email without any
 * cost ceiling.
 *
 * The template deliberately mirrors the real /cellar-brief page visually
 * (sticky exec summary, KPI chips, status-coloured vessel cards) so when
 * the prospect books a demo, the "real" view feels familiar.
 */
import { useRoute, Link } from "wouter";
import { trpc } from "@/lib/trpc";

const SERIF = "'Fraunces',serif";
const SANS = "'Lato',sans-serif";
const HI = "var(--ow-text-hi)";
const MID = "var(--ow-text-mid)";
const LO = "var(--ow-text-lo)";
const CARD = "var(--ow-bg-card)";
const RAISED = "var(--ow-bg-raised)";
const BORDER = "var(--ow-border)";
const AMBER = "var(--ow-amber)";

// ── Region → seasonal template ────────────────────────────────────────────
// Feb 2026 = late summer in Southern Hemisphere = **vintage crush period**
// for most AU/NZ winemakers. Cards below reflect what a small-to-mid
// boutique would plausibly be juggling right now: 1-2 ferments running,
// 1 vessel pressed & waiting on MLF, 1 tank aging from an earlier vintage.
type Card = {
  vesselId: string;
  variety: string;
  stage: "primary_active" | "primary_slowing" | "pressed" | "mlf_active" | "aging_tank";
  stageLabel: string;
  status: "ok" | "watch" | "attention";
  headline: string;
  detail: string;
  action: string;
};

type Template = {
  cards: Card[];
  attention: number;
  decisions: number;
  vessels: number;
};

const CENTRAL_OTAGO: Template = {
  attention: 1, decisions: 2, vessels: 4,
  cards: [
    { vesselId: "T3", variety: "Pinot Noir 2026 · Bannockburn block",
      stage: "primary_active", stageLabel: "Primary · active",
      status: "attention",
      headline: "Brix dropping fast — 22.1° → 15.4° in 36 hrs",
      detail: "Cap temp 28.6°C, ambient 21°C. Pump-over cadence still 2x/day — worth a third punch-down before evening.",
      action: "Log a punch-down after tonight's rack",
    },
    { vesselId: "T5", variety: "Pinot Noir 2026 · Felton block",
      stage: "primary_slowing", stageLabel: "Primary · slowing",
      status: "watch",
      headline: "Brix flatlined at 4.2° for 12 hrs",
      detail: "Yeast health nutrients due (last DAP 4 days ago). If Brix doesn't move by tomorrow noon consider co-inoc.",
      action: "MLF decision due by 2pm tomorrow",
    },
    { vesselId: "T2", variety: "Pinot Noir 2025 · Reserve",
      stage: "aging_tank", stageLabel: "Aging · tank",
      status: "ok",
      headline: "SO₂ at 32 ppm free · 118 ppm total",
      detail: "18 days in tank post-MLF. Next SO₂ check due in 10 days.",
      action: "No action — tracking",
    },
    { vesselId: "B4", variety: "Chardonnay 2025 · Bendigo",
      stage: "mlf_active", stageLabel: "MLF · active",
      status: "ok",
      headline: "Malic dropping — 2.1 → 0.7 g/L over 3 weeks",
      detail: "Barrel-ferment MLF running clean, natural inoc. Expect finish in 8-14 days at current rate.",
      action: "No action — tracking",
    },
  ],
};

const MARLBOROUGH: Template = {
  attention: 1, decisions: 1, vessels: 5,
  cards: [
    { vesselId: "T7", variety: "Sauvignon Blanc 2026 · Rapaura",
      stage: "primary_active", stageLabel: "Primary · active",
      status: "attention",
      headline: "Ferment temp climbed 17.2° → 19.4°C in 4 hrs",
      detail: "Approaching aromatic-preservation ceiling of 18°C. Cooling jacket set to 15°C on the last check — verify glycol flow.",
      action: "Verify glycol flow · re-check in 30 min",
    },
    { vesselId: "T4", variety: "Sauvignon Blanc 2026 · Awatere",
      stage: "primary_active", stageLabel: "Primary · active",
      status: "watch",
      headline: "Brix 12.8° · thiol-preservation window narrowing",
      detail: "Ferment at hour 62 · MOX picked up trace H₂S at 09:15. Copper dose or Fermaid-K within the next shift.",
      action: "Log Cu/Fermaid decision by 3pm",
    },
    { vesselId: "T1", variety: "Chardonnay 2026 · Wither Hills",
      stage: "pressed", stageLabel: "Pressed · MLF pending",
      status: "ok",
      headline: "Racked off gross lees 6hr ago · settling",
      detail: "Target: 24hr settle → light rack → yeast inoc tomorrow AM. Barrel-in decision Thursday.",
      action: "No action — waiting on settle",
    },
    { vesselId: "T2", variety: "Pinot Gris 2025",
      stage: "aging_tank", stageLabel: "Aging · tank",
      status: "ok",
      headline: "Ready for pre-bottling fine + filter",
      detail: "Free SO₂ 28 ppm · pH 3.31 · TA 6.4 g/L. Bentonite trial due before scheduled bottling in 12 days.",
      action: "Bentonite trial this week",
    },
    { vesselId: "T9", variety: "Rosé 2026 · Renwick",
      stage: "primary_slowing", stageLabel: "Primary · slowing",
      status: "ok",
      headline: "Brix 3.1° · finishing on schedule",
      detail: "Steady 15°C ferment · residual sugar target 4-6 g/L. Rack + protect within 48hrs of dryness.",
      action: "No action — tracking",
    },
  ],
};

const HAWKES_BAY: Template = {
  attention: 1, decisions: 1, vessels: 4,
  cards: [
    { vesselId: "T6", variety: "Syrah 2026 · Bridge Pa Triangle",
      stage: "primary_active", stageLabel: "Primary · active",
      status: "attention",
      headline: "Cap temp 32.1°C · overshooting target 30°C",
      detail: "Ferment aggressive after this morning's punch-down. Extended cap contact risks green tannin extraction — cool + shorten cap contact this shift.",
      action: "Cool + shorten cap contact",
    },
    { vesselId: "B2", variety: "Chardonnay 2026 · Gimblett Gravels",
      stage: "mlf_active", stageLabel: "MLF · active barrel",
      status: "watch",
      headline: "Malic 1.2 g/L · sluggish start after inoc",
      detail: "New-oak Burgundy barrel · MLF inoc'd 9 days ago, expected 4-6 wk finish. Verify temp not <18°C in cellar.",
      action: "Log cellar temp reading",
    },
    { vesselId: "T3", variety: "Merlot 2025 · Reserve",
      stage: "aging_tank", stageLabel: "Aging · tank",
      status: "ok",
      headline: "SO₂ free 30 ppm · scheduled top-up next week",
      detail: "8 months in tank pre-blend. Free SO₂ trending stable, next scheduled reading in 6 days.",
      action: "No action — tracking",
    },
    { vesselId: "T8", variety: "Sauvignon Blanc 2026",
      stage: "pressed", stageLabel: "Pressed · settled",
      status: "ok",
      headline: "Ready for yeast inoc tomorrow AM",
      detail: "Cold-settled 24hrs · racked clean · Fermaid-K + rehydrated yeast prep tonight.",
      action: "Prep yeast tonight",
    },
  ],
};

const AUCKLAND: Template = {
  attention: 0, decisions: 1, vessels: 3,
  cards: [
    { vesselId: "T1", variety: "Chardonnay 2026 · Kumeu",
      stage: "primary_active", stageLabel: "Primary · active",
      status: "watch",
      headline: "Brix 14.6° · steady on the yeast",
      detail: "Ferment day 5 · cap temp 17.4°C, nutrient at 2/3 addition. Barrel-in decision at Brix 1-2° dryness.",
      action: "Barrel-in decision at 1-2° Brix",
    },
    { vesselId: "B3", variety: "Syrah 2025 · Waiheke",
      stage: "aging_tank", stageLabel: "Aging · tank",
      status: "ok",
      headline: "6 months post-MLF · pre-blend trial next week",
      detail: "SO₂ maintained · brix stable · scheduled 3-way component blend trial due.",
      action: "Blend trial next week",
    },
    { vesselId: "T4", variety: "Pinot Gris 2026",
      stage: "pressed", stageLabel: "Pressed · settling",
      status: "ok",
      headline: "Cold-settled 18hrs · clean juice",
      detail: "Racked off gross lees, ready for warm start tomorrow. Slurry yeast, nutrient full-load.",
      action: "Warm start tomorrow",
    },
  ],
};

const GENERIC: Template = {
  attention: 1, decisions: 1, vessels: 4,
  cards: [
    { vesselId: "T2", variety: "Shiraz 2026",
      stage: "primary_active", stageLabel: "Primary · active",
      status: "attention",
      headline: "Ferment temp 30.4°C — over-target",
      detail: "Cap temp climbing after morning pump-over. Cool by 2°C or shorten cap contact this shift.",
      action: "Cool by 2°C this shift",
    },
    { vesselId: "T5", variety: "Chardonnay 2026",
      stage: "primary_slowing", stageLabel: "Primary · slowing",
      status: "watch",
      headline: "Brix 3.8° · MLF decision imminent",
      detail: "Approaching dryness · co-inoc vs. sequential MLF decision due within the next 24 hrs.",
      action: "MLF strategy call · today",
    },
    { vesselId: "T1", variety: "Cabernet Sauvignon 2025",
      stage: "aging_tank", stageLabel: "Aging · tank",
      status: "ok",
      headline: "SO₂ free 34 ppm · stable pre-bottling",
      detail: "4 months post-MLF · next reading in 8 days.",
      action: "No action — tracking",
    },
    { vesselId: "B7", variety: "Chardonnay 2025 · Reserve",
      stage: "mlf_active", stageLabel: "MLF · active barrel",
      status: "ok",
      headline: "Malic 0.9 g/L · nearing completion",
      detail: "Barrel-ferment MLF finishing clean. Rack + sulphur decision within 10-14 days.",
      action: "Rack decision in 2 weeks",
    },
  ],
};

function templateForRegion(region: string | null): Template {
  if (!region) return GENERIC;
  const r = region.toLowerCase();
  if (r.includes("central otago")) return CENTRAL_OTAGO;
  if (r.includes("marlborough")) return MARLBOROUGH;
  if (r.includes("hawke") || r.includes("gimblett")) return HAWKES_BAY;
  if (r.includes("auckland") || r.includes("waiheke") || r.includes("kumeu") || r.includes("northland")) return AUCKLAND;
  return GENERIC;
}

const STAGE_EMOJI: Record<Card["stage"], string> = {
  primary_active: "●",
  primary_slowing: "▼",
  pressed: "⇩",
  mlf_active: "◐",
  aging_tank: "◯",
};

function statusColor(s: Card["status"]): string {
  if (s === "attention") return "oklch(0.62 0.20 25)";
  if (s === "watch") return "oklch(0.72 0.16 75)";
  return "oklch(0.62 0.10 155)";
}

function statusLabel(s: Card["status"]): string {
  if (s === "attention") return "ATTENTION";
  if (s === "watch") return "WATCH";
  return "TRACKING";
}

function todayLabel(): string {
  return new Date().toLocaleDateString("en-AU", {
    weekday: "long",
    day: "numeric",
    month: "long",
    timeZone: "Australia/Sydney",
  });
}

const CALENDLY_URL = "https://calendly.com/ownology/20min";

export default function HiProducerPreview() {
  const [, params] = useRoute("/hi/producers/:id");
  const id = params?.id ? Number(params.id) : NaN;
  const validId = Number.isFinite(id) && id > 0;
  const { data: prospect, isLoading } = trpc.producers.publicPreview.useQuery(
    { id },
    { enabled: validId, retry: false }
  );

  if (!validId) {
    return (
      <div data-testid="hi-producer-not-found" style={{ padding: 32, textAlign: "center", fontFamily: SANS, color: MID }}>
        Not a valid preview link.
      </div>
    );
  }
  if (isLoading) {
    return (
      <div data-testid="hi-producer-loading" style={{ padding: 32, textAlign: "center", fontFamily: SANS, color: MID }}>
        Loading your preview…
      </div>
    );
  }
  if (!prospect) {
    return (
      <div data-testid="hi-producer-notfound" style={{ padding: 32, textAlign: "center", fontFamily: SANS, color: MID }}>
        <p>This preview link has expired.</p>
        <Link href="/" style={{ color: AMBER, marginTop: 12, display: "inline-block" }}>Take me to Ownology →</Link>
      </div>
    );
  }

  const template = templateForRegion(prospect.region);
  const greetingName = prospect.firstName ?? "there";
  const regionLabel = prospect.region ?? (prospect.country === "NZ" ? "New Zealand" : "Australia");

  return (
    <div data-testid="hi-producer-preview" className="container py-6" style={{ maxWidth: 900, paddingBottom: "6rem" }}>
      {/* Intro */}
      <p className="text-xs uppercase tracking-widest" style={{ color: AMBER, fontFamily: SANS }}>
        Ownology · Preview for {prospect.name}
      </p>
      <h1
        data-testid="hi-producer-greeting"
        style={{ fontFamily: SERIF, fontSize: "2.2rem", color: HI, margin: "8px 0 6px", lineHeight: 1.15 }}
      >
        G&apos;day {greetingName} — this is what your Cellar Brief could look like today.
      </h1>
      <p style={{ fontFamily: SANS, color: MID, fontSize: "0.95rem", maxWidth: 720, lineHeight: 1.5 }}>
        This is a demo for a boutique {regionLabel} operation at your scale during vintage. No data entry —
        Ownology reads your existing lab logs and tank sheets, then synthesizes a &quot;what to do today&quot; brief every morning.
        <strong style={{ color: HI }}> Your real cellar would replace this template with your actual vessels.</strong>
      </p>

      {/* Sticky exec summary */}
      <div
        data-testid="hi-preview-exec"
        style={{
          background: RAISED,
          border: `1px solid ${BORDER}`,
          borderRadius: 12,
          padding: "16px 18px",
          marginTop: 20,
          display: "flex",
          flexDirection: "column",
          gap: 10,
        }}
      >
        <div className="flex items-center justify-between">
          <p style={{ fontFamily: SANS, fontSize: "0.68rem", letterSpacing: "0.12em", color: LO, textTransform: "uppercase", margin: 0 }}>
            Cellar Brief · {todayLabel()}
          </p>
          <span style={{ fontFamily: SANS, fontSize: "0.7rem", color: LO }}>Demo preview</span>
        </div>
        <p
          data-testid="hi-preview-summary"
          style={{ fontFamily: SERIF, fontSize: "1.05rem", color: HI, margin: 0, lineHeight: 1.4 }}
        >
          {template.attention} tank needs attention this shift, {template.decisions} decision{template.decisions === 1 ? "" : "s"} due today, and {template.vessels - template.attention - template.decisions} vessels tracking clean. Focus first on the amber/red cards below.
        </p>
        <div style={{ display: "flex", gap: 8, flexWrap: "wrap" }}>
          <KpiChip label={`${template.attention} attention`} color={statusColor("attention")} />
          <KpiChip label={`${template.decisions} decisions due`} color={statusColor("watch")} />
          <KpiChip label={`${template.vessels} vessels`} color={LO} muted />
        </div>
      </div>

      {/* Cards */}
      <div style={{ marginTop: 20, display: "flex", flexDirection: "column", gap: 12 }}>
        {template.cards.map((c) => (
          <article
            key={c.vesselId}
            data-testid={`hi-preview-card-${c.vesselId}`}
            style={{
              background: CARD,
              border: `1px solid ${BORDER}`,
              borderLeft: `4px solid ${statusColor(c.status)}`,
              borderRadius: 10,
              padding: "14px 16px",
            }}
          >
            <header style={{ display: "flex", justifyContent: "space-between", gap: 12, alignItems: "flex-start" }}>
              <div style={{ flex: 1, minWidth: 0 }}>
                <div style={{ display: "flex", gap: 8, alignItems: "baseline", flexWrap: "wrap" }}>
                  <span style={{ fontFamily: SERIF, fontSize: "1.05rem", color: HI, fontWeight: 600 }}>
                    {c.vesselId}
                  </span>
                  <span style={{ fontFamily: SANS, fontSize: "0.82rem", color: MID }}>{c.variety}</span>
                </div>
                <p style={{ fontFamily: SANS, fontSize: "0.72rem", color: LO, margin: "3px 0 0", letterSpacing: "0.04em" }}>
                  {STAGE_EMOJI[c.stage]} {c.stageLabel}
                </p>
              </div>
              <span
                style={{
                  fontFamily: SANS,
                  fontSize: "0.62rem",
                  letterSpacing: "0.1em",
                  padding: "3px 8px",
                  borderRadius: 4,
                  background: `color-mix(in oklch, ${statusColor(c.status)} 18%, transparent)`,
                  color: statusColor(c.status),
                  fontWeight: 700,
                  whiteSpace: "nowrap",
                }}
              >
                {statusLabel(c.status)}
              </span>
            </header>
            <p style={{ fontFamily: SERIF, fontSize: "1.0rem", color: HI, margin: "10px 0 4px", lineHeight: 1.35 }}>
              {c.headline}
            </p>
            <p style={{ fontFamily: SANS, fontSize: "0.85rem", color: MID, margin: 0, lineHeight: 1.5 }}>
              {c.detail}
            </p>
            <p style={{ fontFamily: SANS, fontSize: "0.75rem", color: AMBER, margin: "8px 0 0", letterSpacing: "0.02em" }}>
              → {c.action}
            </p>
          </article>
        ))}
      </div>

      {/* CTA */}
      <section
        data-testid="hi-preview-cta"
        style={{
          marginTop: 32,
          background: RAISED,
          border: `1px solid ${AMBER}`,
          borderRadius: 12,
          padding: "22px 24px",
          textAlign: "center",
        }}
      >
        <h2 style={{ fontFamily: SERIF, fontSize: "1.5rem", color: HI, margin: "0 0 8px" }}>
          Want this on your real cellar?
        </h2>
        <p style={{ fontFamily: SANS, color: MID, fontSize: "0.9rem", margin: "0 0 16px", maxWidth: 560, marginLeft: "auto", marginRight: "auto" }}>
          20-min demo, no slides — we&apos;ll load a sample dataset from your last vintage during the call and you&apos;ll see the real thing before we hang up.
        </p>
        <a
          data-testid="hi-preview-book-demo"
          href={CALENDLY_URL}
          target="_blank"
          rel="noopener noreferrer"
          style={{
            display: "inline-block",
            padding: "12px 28px",
            background: AMBER,
            color: "oklch(0.10 0.008 60)",
            fontFamily: SANS,
            fontWeight: 700,
            fontSize: "0.95rem",
            borderRadius: 4,
            textDecoration: "none",
            letterSpacing: "0.03em",
          }}
        >
          Book a 20-min demo →
        </a>
        <div style={{ marginTop: 14, fontFamily: SANS, fontSize: "0.75rem", color: LO }}>
          Or just reply to the email · we read every one.
        </div>
      </section>

      <p style={{ marginTop: 24, fontFamily: SANS, fontSize: "0.72rem", color: LO, textAlign: "center" }}>
        Preview data is a plausible template for {regionLabel} in vintage — not your real cellar. Ownology never sees your data unless you connect it.
      </p>
    </div>
  );
}

function KpiChip({ label, color, muted }: { label: string; color: string; muted?: boolean }) {
  return (
    <span
      style={{
        fontFamily: SANS,
        fontSize: "0.7rem",
        padding: "3px 8px",
        borderRadius: 4,
        background: muted ? "transparent" : `color-mix(in oklch, ${color} 18%, transparent)`,
        color,
        border: muted ? `1px solid ${BORDER}` : `1px solid color-mix(in oklch, ${color} 40%, transparent)`,
        fontWeight: 600,
        letterSpacing: "0.02em",
      }}
    >
      {label}
    </span>
  );
}
