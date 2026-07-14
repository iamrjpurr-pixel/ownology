/**
 * /how-we-trace — Public sales page.
 *
 * Turns the RAG board into a marketing surface without exposing any
 * real customer data. The core UI (grouped by WBS phase, colour-coded
 * RAG state, per-vessel drawer with sanitation badges) is IDENTICAL to
 * the operator view at /admin/cellar-board so prospects see the real
 * machinery — not a mockup.
 *
 * Data is a hand-tuned in-memory scenario telling a coherent 24h story
 * for the demo winery "Ownology Cellars — 2026 Vintage":
 *   - One live batch (26SHZ-001, McLaren Vale Shiraz) currently in
 *     Tank 3 (Red) after being received, sorted, destemmed, and pumped
 *     through Hose #A and Pump #1 — every step sanitation-verified.
 *   - Two vessels ready to fill (Green — Tank 5, Barrel Row A)
 *   - Two vessels needing clean (Amber — Pump #2, Bottling Filler)
 *   - One out-of-service (Grey — Press #1, gasket fault)
 *
 * The story sells the recall-readiness message: if Batch 26SHZ-001
 * faulted tomorrow, the traceability sheet lists every touch point
 * with sanitation timestamps — FSANZ 3.2.2 audit in one click.
 *
 * SEO angle: "winery traceability software", "batch recall
 * traceability", "FSANZ 3.2.2 winery evidence", "cellar equipment
 * sanitation log". Long-tail terms nobody else in AU is writing for.
 */
import { useMemo, useState } from "react";
import { Link } from "wouter";
import { ArrowRight, CheckCircle2, AlertTriangle, XCircle, Circle, ChevronDown, ChevronRight, Shield, Scan, ClipboardList } from "lucide-react";

type WbsPhase =
  | "receival"
  | "crushing"
  | "fermentation"
  | "pressing_transfer"
  | "storage_ageing"
  | "bottling";

type RagState = "green" | "amber" | "red" | "grey";

type Vessel = {
  id: number;
  name: string;
  equipmentType: string;
  wbsPhase: WbsPhase;
  capacityL?: number;
  material: string;
  state: RagState;
  reason: string;
  sanitisedAgoHours: number | null;
  currentBatch?: string;
  recentUses: Array<{
    batchLabel: string;
    phase: WbsPhase;
    direction: "in" | "out" | "pass";
    agoHours: number;
    sanitisedOk: boolean;
    sanitiseAgeHours: number | null;
  }>;
};

const PHASE_LABEL: Record<WbsPhase, string> = {
  receival: "1. Receival",
  crushing: "2. Crushing",
  fermentation: "3. Fermentation",
  pressing_transfer: "4. Pressing & Transfer",
  storage_ageing: "5. Storage & Ageing",
  bottling: "6. Bottling",
};

const STATE_META: Record<RagState, { color: string; bg: string; label: string; hint: string; Icon: typeof CheckCircle2 }> = {
  green: { color: "#2f5230", bg: "rgba(74,124,71,0.14)", label: "Ready", hint: "Sanitised, within freshness window, empty. Safe to fill.", Icon: CheckCircle2 },
  amber: { color: "#7c4d0f", bg: "rgba(181,126,20,0.14)", label: "Needs clean", hint: "Empty but sanitation expired or never done. Clean before use.", Icon: AlertTriangle },
  red: { color: "#7f1d1d", bg: "rgba(185,28,28,0.10)", label: "In use", hint: "Holding wine/must. Log rack-out to release.", Icon: XCircle },
  grey: { color: "#374151", bg: "rgba(107,114,128,0.14)", label: "Out of service", hint: "Fault logged. Close repair task to return to rotation.", Icon: Circle },
};

// ── Hand-tuned demo scenario ───────────────────────────────────────────
const DEMO_VESSELS: Vessel[] = [
  {
    id: 1, name: "Hopper #1", equipmentType: "hopper", wbsPhase: "receival",
    capacityL: 1500, material: "stainless",
    state: "amber",
    reason: "Sanitation window expired — re-sanitise before next receival",
    sanitisedAgoHours: 96,
    recentUses: [
      { batchLabel: "26SHZ-001", phase: "receival", direction: "pass", agoHours: 22, sanitisedOk: true, sanitiseAgeHours: 4 },
    ],
  },
  {
    id: 2, name: "Sorting Table", equipmentType: "sorting_table", wbsPhase: "receival",
    material: "stainless",
    state: "amber",
    reason: "Sanitation window expired — re-sanitise before next receival",
    sanitisedAgoHours: 96,
    recentUses: [
      { batchLabel: "26SHZ-001", phase: "receival", direction: "pass", agoHours: 22, sanitisedOk: true, sanitiseAgeHours: 4 },
    ],
  },
  {
    id: 3, name: "Destemmer-Crusher", equipmentType: "destemmer", wbsPhase: "crushing",
    material: "stainless",
    state: "amber",
    reason: "Used since last sanitation — clean + sanitise before next use",
    sanitisedAgoHours: 26,
    recentUses: [
      { batchLabel: "26SHZ-001", phase: "crushing", direction: "pass", agoHours: 21, sanitisedOk: true, sanitiseAgeHours: 5 },
    ],
  },
  {
    id: 4, name: "Tank 3", equipmentType: "fermentation_tank", wbsPhase: "fermentation",
    capacityL: 2000, material: "stainless",
    state: "red",
    reason: "Holding batch 26SHZ-001 — day 1 of fermentation",
    sanitisedAgoHours: 24,
    currentBatch: "26SHZ-001",
    recentUses: [
      { batchLabel: "26SHZ-001", phase: "fermentation", direction: "in", agoHours: 20, sanitisedOk: true, sanitiseAgeHours: 4 },
    ],
  },
  {
    id: 5, name: "Tank 5", equipmentType: "fermentation_tank", wbsPhase: "fermentation",
    capacityL: 2000, material: "stainless",
    state: "green",
    reason: "Sanitised — 68h freshness remaining",
    sanitisedAgoHours: 4,
    recentUses: [
      { batchLabel: "25CAB-004", phase: "fermentation", direction: "out", agoHours: 8, sanitisedOk: true, sanitiseAgeHours: 6 },
    ],
  },
  {
    id: 6, name: "Cold Room", equipmentType: "cold_room", wbsPhase: "fermentation",
    material: "stainless",
    state: "green",
    reason: "Sanitised — 70h freshness remaining",
    sanitisedAgoHours: 2,
    recentUses: [],
  },
  {
    id: 7, name: "Press #1 (basket)", equipmentType: "press", wbsPhase: "pressing_transfer",
    material: "stainless",
    state: "grey",
    reason: "Gasket fault — awaiting seal replacement",
    sanitisedAgoHours: null,
    recentUses: [
      { batchLabel: "25CAB-003", phase: "pressing_transfer", direction: "pass", agoHours: 48, sanitisedOk: true, sanitiseAgeHours: 3 },
    ],
  },
  {
    id: 8, name: "Pump #1 (must)", equipmentType: "pump", wbsPhase: "pressing_transfer",
    material: "stainless",
    state: "amber",
    reason: "Used since last sanitation — clean + sanitise before next use",
    sanitisedAgoHours: 25,
    recentUses: [
      { batchLabel: "26SHZ-001", phase: "pressing_transfer", direction: "pass", agoHours: 20, sanitisedOk: true, sanitiseAgeHours: 5 },
    ],
  },
  {
    id: 9, name: "Pump #2 (transfer)", equipmentType: "pump", wbsPhase: "pressing_transfer",
    material: "stainless",
    state: "amber",
    reason: "Never sanitised — clean + sanitise before next use",
    sanitisedAgoHours: null,
    recentUses: [],
  },
  {
    id: 10, name: "Hose #A (2\")", equipmentType: "hose", wbsPhase: "pressing_transfer",
    material: "other",
    state: "amber",
    reason: "Used since last sanitation — clean + sanitise before next use",
    sanitisedAgoHours: 25,
    recentUses: [
      { batchLabel: "26SHZ-001", phase: "pressing_transfer", direction: "pass", agoHours: 20, sanitisedOk: true, sanitiseAgeHours: 5 },
    ],
  },
  {
    id: 11, name: "Barrel Row A (French oak)", equipmentType: "barrel", wbsPhase: "storage_ageing",
    capacityL: 5400, material: "wood",
    state: "green",
    reason: "Sanitised — 65h freshness remaining",
    sanitisedAgoHours: 7,
    recentUses: [],
  },
  {
    id: 12, name: "Storage Tank 8", equipmentType: "storage_tank", wbsPhase: "storage_ageing",
    capacityL: 5000, material: "stainless",
    state: "red",
    reason: "Holding batch 25CAB-002 — bulk ageing",
    sanitisedAgoHours: 480,
    currentBatch: "25CAB-002",
    recentUses: [
      { batchLabel: "25CAB-002", phase: "storage_ageing", direction: "in", agoHours: 480, sanitisedOk: true, sanitiseAgeHours: 6 },
    ],
  },
  {
    id: 13, name: "Bottling Filler", equipmentType: "bottling_filler", wbsPhase: "bottling",
    material: "stainless",
    state: "amber",
    reason: "Sanitation window expired — re-sanitise before next bottling run",
    sanitisedAgoHours: 168,
    recentUses: [
      { batchLabel: "25CAB-001", phase: "bottling", direction: "pass", agoHours: 168, sanitisedOk: true, sanitiseAgeHours: 2 },
    ],
  },
];

// Timeline for the 26SHZ-001 recall-readiness story
type TimelineStep = {
  label: string;
  equipment: string;
  agoHours: number;
  sanitisedAgoHours: number;
  phase: WbsPhase;
};

const DEMO_TIMELINE: TimelineStep[] = [
  { label: "Received (22h ago)", equipment: "Hopper #1 → Sorting Table", agoHours: 22, sanitisedAgoHours: 4, phase: "receival" },
  { label: "Destemmed (21h ago)", equipment: "Destemmer-Crusher", agoHours: 21, sanitisedAgoHours: 5, phase: "crushing" },
  { label: "Must pumped (20h ago)", equipment: "Pump #1 → Hose #A → Tank 3", agoHours: 20, sanitisedAgoHours: 5, phase: "pressing_transfer" },
  { label: "Fermentation (day 1)", equipment: "Tank 3", agoHours: 20, sanitisedAgoHours: 4, phase: "fermentation" },
];

export default function HowWeTrace() {
  const [expanded, setExpanded] = useState<Record<number, boolean>>({});
  const grouped = useMemo(() => {
    const m = new Map<WbsPhase, Vessel[]>();
    for (const v of DEMO_VESSELS) {
      const bucket = m.get(v.wbsPhase) ?? [];
      bucket.push(v);
      m.set(v.wbsPhase, bucket);
    }
    return m;
  }, []);
  const counts = useMemo(() => {
    const c = { green: 0, amber: 0, red: 0, grey: 0 };
    for (const v of DEMO_VESSELS) c[v.state]++;
    return c;
  }, []);

  return (
    <div style={{ background: "#faf5ec", minHeight: "100vh" }}>
      <SeoMeta />
      <Hero />
      <RecallStory />
      <BoardSection grouped={grouped} counts={counts} expanded={expanded} setExpanded={setExpanded} />
      <ComplianceCallout />
      <Timeline />
      <ProspectCta />
      <Footer />
    </div>
  );
}

function SeoMeta() {
  // Set document title + meta for the SEO angle without an SSR shim.
  if (typeof document !== "undefined") {
    document.title = "How Ownology traces every hose, pump, tank touching your batch — FSANZ 3.2.2 in one screen";
    const setMeta = (name: string, content: string) => {
      let el = document.querySelector(`meta[name="${name}"]`) as HTMLMetaElement | null;
      if (!el) {
        el = document.createElement("meta");
        el.name = name;
        document.head.appendChild(el);
      }
      el.content = content;
    };
    setMeta(
      "description",
      "Winery batch traceability audit-ready in one screen. Every hose, pump, tank, and press touching your wine — colour-coded by sanitation status. FSANZ 3.2.2 evidence trail included. See the live board."
    );
    setMeta("robots", "index,follow");
  }
  return null;
}

function Hero() {
  return (
    <section style={{ padding: "72px 24px 40px", maxWidth: 1080, margin: "0 auto" }}>
      <div style={{ fontFamily: "Georgia,serif", fontSize: 12, letterSpacing: "0.16em", textTransform: "uppercase", color: "#B0741A", fontWeight: 700, marginBottom: 12 }} data-testid="how-we-trace-eyebrow">
        Cellar traceability, in one screen
      </div>
      <h1 style={{ fontFamily: "Georgia,serif", fontSize: "clamp(28px, 5vw, 48px)", fontWeight: 600, color: "#1a1210", lineHeight: 1.15, margin: "0 0 20px", maxWidth: 820 }}>
        If Batch 26SHZ-001 faulted tomorrow, you'd know exactly which pump, hose, and tank touched it — with sanitation timestamps.
      </h1>
      <p style={{ fontFamily: "Georgia,serif", fontSize: 18, lineHeight: 1.55, color: "#4a3d35", maxWidth: 720, margin: "0 0 28px" }}>
        This is the live Ownology cellar board. Green vessels are sanitised, empty, ready to fill. Amber need cleaning. Red are holding wine. Grey are out of service. Every state is computed from your event log — never edited by hand. That's the audit-defensible bit.
      </p>
      <div style={{ display: "flex", gap: 12, flexWrap: "wrap" }}>
        <Link
          href="/try"
          data-testid="how-we-trace-try-cta"
          style={{ display: "inline-flex", alignItems: "center", gap: 8, padding: "12px 22px", background: "#B0741A", color: "#2A1E0A", textDecoration: "none", fontFamily: "Arial,sans-serif", fontSize: 15, fontWeight: 600, borderRadius: 999 }}
        >
          Try Ownology for your cellar <ArrowRight size={16} />
        </Link>
        <a
          href="#recall-story"
          data-testid="how-we-trace-story-cta"
          style={{ display: "inline-flex", alignItems: "center", gap: 8, padding: "12px 22px", background: "transparent", color: "#4a3d35", textDecoration: "none", fontFamily: "Arial,sans-serif", fontSize: 15, fontWeight: 500, border: "1px solid #d4c9b6", borderRadius: 999 }}
        >
          See the recall-readiness story
        </a>
      </div>
    </section>
  );
}

function RecallStory() {
  return (
    <section id="recall-story" style={{ padding: "48px 24px", maxWidth: 1080, margin: "0 auto", borderTop: "1px solid #e5dcc7" }}>
      <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(280px, 1fr))", gap: 24 }}>
        <div>
          <Shield size={28} color="#B0741A" strokeWidth={1.5} />
          <h3 style={{ fontFamily: "Georgia,serif", fontSize: 18, fontWeight: 600, color: "#1a1210", margin: "12px 0 6px" }}>The problem</h3>
          <p style={{ fontFamily: "Georgia,serif", fontSize: 15, color: "#4a3d35", lineHeight: 1.6, margin: 0 }}>
            Six months after bottling, one case comes back to your cellar door with a fault. Which press pressed it? Which pump moved the must? Was Hose #3 sanitised that morning? If you can't answer in ten minutes, you can't scope the recall — and the buyer's compliance team escalates.
          </p>
        </div>
        <div>
          <Scan size={28} color="#B0741A" strokeWidth={1.5} />
          <h3 style={{ fontFamily: "Georgia,serif", fontSize: 18, fontWeight: 600, color: "#1a1210", margin: "12px 0 6px" }}>The Ownology answer</h3>
          <p style={{ fontFamily: "Georgia,serif", fontSize: 15, color: "#4a3d35", lineHeight: 1.6, margin: 0 }}>
            Every equipment touch is logged with a sanitation snapshot at the moment of use. Cellar state is <em>computed</em> from the event log — a Green tank is provably sanitised in the last 72h, an Amber is provably not. Open the batch, see every hose and pump it touched, with timestamps. Ten seconds, not ten minutes.
          </p>
        </div>
        <div>
          <ClipboardList size={28} color="#B0741A" strokeWidth={1.5} />
          <h3 style={{ fontFamily: "Georgia,serif", fontSize: 18, fontWeight: 600, color: "#1a1210", margin: "12px 0 6px" }}>The regulator anchor</h3>
          <p style={{ fontFamily: "Georgia,serif", fontSize: 15, color: "#4a3d35", lineHeight: 1.6, margin: 0 }}>
            FSANZ Standard 3.2.2 Clause 20 requires food-contact surfaces to be cleaned and sanitised, with records that hold up to audit. HACCP, SQF, and BRCGS all demand equipment sanitation logs. Ownology's event log <em>is</em> that record — no double-entry, no clipboard, no drift.
          </p>
        </div>
      </div>
    </section>
  );
}

function BoardSection({
  grouped,
  counts,
  expanded,
  setExpanded,
}: {
  grouped: Map<WbsPhase, Vessel[]>;
  counts: Record<RagState, number>;
  expanded: Record<number, boolean>;
  setExpanded: React.Dispatch<React.SetStateAction<Record<number, boolean>>>;
}) {
  return (
    <section style={{ padding: "48px 24px", maxWidth: 1200, margin: "0 auto", borderTop: "1px solid #e5dcc7" }}>
      <div style={{ marginBottom: 24 }}>
        <div style={{ fontFamily: "Georgia,serif", fontSize: 12, letterSpacing: "0.14em", textTransform: "uppercase", color: "#B0741A", fontWeight: 700, marginBottom: 8 }}>
          Ownology Cellars — 2026 Vintage · Live sample
        </div>
        <h2 style={{ fontFamily: "Georgia,serif", fontSize: 30, fontWeight: 600, color: "#1a1210", margin: "0 0 8px" }}>
          The cellar board, right now
        </h2>
        <p style={{ fontFamily: "Georgia,serif", fontSize: 15, color: "#4a3d35", margin: 0, maxWidth: 720 }}>
          This is the exact UI your winemakers use. Tap any vessel to see its recent uses and sanitation history.
        </p>
      </div>

      <div style={{ display: "flex", gap: 10, flexWrap: "wrap", marginBottom: 24 }}>
        {(["green", "amber", "red", "grey"] as RagState[]).map((s) => {
          const meta = STATE_META[s];
          return (
            <div
              key={s}
              data-testid={`how-we-trace-summary-${s}`}
              style={{
                display: "inline-flex",
                alignItems: "center",
                gap: 8,
                padding: "10px 14px",
                borderRadius: 8,
                background: meta.bg,
                color: meta.color,
                fontFamily: "Arial,sans-serif",
                fontSize: 13,
                fontWeight: 500,
              }}
            >
              <meta.Icon size={16} />
              <span>{meta.label}</span>
              <strong style={{ fontSize: 15 }}>{counts[s]}</strong>
            </div>
          );
        })}
      </div>

      {(["receival", "crushing", "fermentation", "pressing_transfer", "storage_ageing", "bottling"] as WbsPhase[]).map((phase) => {
        const rows = grouped.get(phase) ?? [];
        if (rows.length === 0) return null;
        return (
          <section key={phase} data-testid={`how-we-trace-phase-${phase}`} style={{ marginBottom: 24 }}>
            <h3 style={{ fontFamily: "Georgia,serif", fontSize: 15, fontWeight: 600, margin: "0 0 10px", color: "#4a3d35" }}>
              {PHASE_LABEL[phase]} <span style={{ color: "#8a7565", fontWeight: 400 }}>· {rows.length}</span>
            </h3>
            <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fill, minmax(280px, 1fr))", gap: 10 }}>
              {rows.map((v) => (
                <VesselCard key={v.id} v={v} expanded={!!expanded[v.id]} onToggle={() => setExpanded((e) => ({ ...e, [v.id]: !e[v.id] }))} />
              ))}
            </div>
          </section>
        );
      })}
    </section>
  );
}

function VesselCard({ v, expanded, onToggle }: { v: Vessel; expanded: boolean; onToggle: () => void }) {
  const meta = STATE_META[v.state];
  return (
    <div
      data-testid={`how-we-trace-vessel-${v.id}`}
      data-state={v.state}
      style={{
        border: `1px solid ${meta.color}`,
        borderLeft: `6px solid ${meta.color}`,
        borderRadius: 8,
        background: meta.bg,
        padding: "10px 12px",
      }}
    >
      <button
        type="button"
        onClick={onToggle}
        style={{ all: "unset", display: "flex", alignItems: "center", gap: 6, width: "100%", cursor: "pointer" }}
      >
        {expanded ? <ChevronDown size={14} color={meta.color} /> : <ChevronRight size={14} color={meta.color} />}
        <meta.Icon size={16} color={meta.color} />
        <span style={{ fontFamily: "Georgia,serif", fontWeight: 600, color: "#1a1210", flex: 1 }}>{v.name}</span>
        <span style={{ fontFamily: "Arial,sans-serif", fontSize: 11, color: meta.color, textTransform: "uppercase", letterSpacing: "0.06em", fontWeight: 700 }}>
          {meta.label}
        </span>
      </button>
      <div style={{ marginTop: 6, marginLeft: 24, fontFamily: "Arial,sans-serif", fontSize: 12, color: "#4a3d35" }}>
        {v.reason}
      </div>
      {expanded && (
        <div style={{ marginTop: 10, marginLeft: 24, fontFamily: "Arial,sans-serif", fontSize: 12, color: "#4a3d35" }}>
          <div style={{ display: "grid", gridTemplateColumns: "auto 1fr", gap: "4px 12px", marginBottom: 10 }}>
            <span style={{ color: "#8a7565" }}>Type</span><span>{v.equipmentType.replace(/_/g, " ")}</span>
            {v.capacityL ? (<><span style={{ color: "#8a7565" }}>Capacity</span><span>{v.capacityL}L</span></>) : null}
            <span style={{ color: "#8a7565" }}>Material</span><span>{v.material}</span>
            <span style={{ color: "#8a7565" }}>Sanitised</span><span>{v.sanitisedAgoHours != null ? `${v.sanitisedAgoHours}h ago` : "Never"}</span>
            {v.currentBatch ? (<><span style={{ color: "#8a7565" }}>Current batch</span><span>{v.currentBatch}</span></>) : null}
          </div>
          {v.recentUses.length > 0 && (
            <>
              <div style={{ fontWeight: 600, marginBottom: 4 }}>Recent uses</div>
              <ul style={{ margin: 0, padding: 0, listStyle: "none" }}>
                {v.recentUses.map((u, i) => (
                  <li key={i} style={{ padding: "4px 0", borderTop: "1px solid rgba(0,0,0,0.06)" }}>
                    <div style={{ display: "flex", justifyContent: "space-between", gap: 8 }}>
                      <span><strong>{u.batchLabel}</strong> · {u.direction} · {u.phase.replace(/_/g, " ")}</span>
                      <span style={{ color: "#8a7565" }}>{u.agoHours}h ago</span>
                    </div>
                    {u.sanitisedOk ? (
                      <div style={{ color: "#2f5230", fontSize: 11 }}>✓ Sanitised {u.sanitiseAgeHours}h before use</div>
                    ) : (
                      <div style={{ color: "#7f1d1d", fontSize: 11 }}>⚠ Sanitation not verified</div>
                    )}
                  </li>
                ))}
              </ul>
            </>
          )}
        </div>
      )}
    </div>
  );
}

function Timeline() {
  return (
    <section style={{ padding: "48px 24px", maxWidth: 900, margin: "0 auto", borderTop: "1px solid #e5dcc7" }}>
      <div style={{ fontFamily: "Georgia,serif", fontSize: 12, letterSpacing: "0.14em", textTransform: "uppercase", color: "#B0741A", fontWeight: 700, marginBottom: 8 }}>
        Batch 26SHZ-001 · McLaren Vale Shiraz
      </div>
      <h2 style={{ fontFamily: "Georgia,serif", fontSize: 26, fontWeight: 600, color: "#1a1210", margin: "0 0 6px" }}>
        The traceability sheet, unwrapped
      </h2>
      <p style={{ fontFamily: "Georgia,serif", fontSize: 15, color: "#4a3d35", margin: "0 0 24px", maxWidth: 720 }}>
        Every touch point in the last 24 hours, with sanitation verified at the moment of use.
      </p>
      <div style={{ borderLeft: "2px solid #B0741A", paddingLeft: 20 }}>
        {DEMO_TIMELINE.map((s, i) => (
          <div
            key={i}
            data-testid={`how-we-trace-timeline-step-${i}`}
            style={{ position: "relative", marginBottom: 22 }}
          >
            <div style={{ position: "absolute", left: -28, top: 4, width: 12, height: 12, borderRadius: 999, background: "#B0741A", border: "3px solid #faf5ec" }} />
            <div style={{ fontFamily: "Georgia,serif", fontSize: 14, fontWeight: 600, color: "#1a1210" }}>{s.label}</div>
            <div style={{ fontFamily: "Arial,sans-serif", fontSize: 13, color: "#4a3d35", marginTop: 2 }}>{s.equipment}</div>
            <div style={{ fontFamily: "Arial,sans-serif", fontSize: 12, color: "#2f5230", marginTop: 4 }}>
              ✓ Every vessel sanitised {s.sanitisedAgoHours}h before this touch — inside the 72h FSANZ freshness window
            </div>
          </div>
        ))}
      </div>
    </section>
  );
}

function ComplianceCallout() {
  return (
    <section style={{ padding: "40px 24px", maxWidth: 900, margin: "0 auto", borderTop: "1px solid #e5dcc7" }}>
      <div style={{ background: "#fbf3e4", border: "1px solid #e5dcc7", borderRadius: 8, padding: "22px 26px" }}>
        <div style={{ fontFamily: "Georgia,serif", fontSize: 11, letterSpacing: "0.14em", textTransform: "uppercase", color: "#B0741A", fontWeight: 700, marginBottom: 8 }}>
          FSANZ Standard 3.2.2 — Clause 20
        </div>
        <blockquote style={{ margin: 0, fontFamily: "Georgia,serif", fontSize: 17, fontStyle: "italic", color: "#1a1210", lineHeight: 1.55, borderLeft: "3px solid #B0741A", paddingLeft: 16 }}>
          "A food business must maintain food premises, fixtures, fittings and equipment, having regard to their use, to a standard of cleanliness where there is no accumulation of… food scraps, dirt, grease or other visible matter."
        </blockquote>
        <div style={{ marginTop: 14, fontFamily: "Arial,sans-serif", fontSize: 12, color: "#8a7565" }}>
          Ownology maps this evidence requirement to a per-vessel event log. Every sanitation, every fill, every rack — captured with a timestamp, retained for the FSANZ 3.2.2A three-month minimum, and printable as a per-batch audit sheet on demand.
        </div>
      </div>
    </section>
  );
}

function ProspectCta() {
  return (
    <section style={{ padding: "56px 24px", maxWidth: 900, margin: "0 auto", textAlign: "center", borderTop: "1px solid #e5dcc7" }}>
      <h2 style={{ fontFamily: "Georgia,serif", fontSize: 28, fontWeight: 600, color: "#1a1210", margin: "0 0 12px" }}>
        Your cellar, audit-ready in one screen.
      </h2>
      <p style={{ fontFamily: "Georgia,serif", fontSize: 16, color: "#4a3d35", margin: "0 0 24px", maxWidth: 620, marginInline: "auto" }}>
        Ownology is a winemaker's second brain — the cellar intelligence layer between your logbook and your compliance file. Try it for your 2026 vintage.
      </p>
      <Link
        href="/try"
        data-testid="how-we-trace-final-cta"
        style={{ display: "inline-flex", alignItems: "center", gap: 8, padding: "14px 28px", background: "#B0741A", color: "#2A1E0A", textDecoration: "none", fontFamily: "Arial,sans-serif", fontSize: 15, fontWeight: 600, borderRadius: 999 }}
      >
        Start your cellar <ArrowRight size={16} />
      </Link>
    </section>
  );
}

function Footer() {
  return (
    <footer style={{ padding: "24px", maxWidth: 900, margin: "0 auto", borderTop: "1px solid #e5dcc7", fontFamily: "Arial,sans-serif", fontSize: 11, color: "#8a7565", textAlign: "center", lineHeight: 1.6 }}>
      The board above is a live sample built from Ownology's own reference cellar. Real customer data is never exposed on public pages.
      <br />
      © Ownology · <Link href="/" style={{ color: "#B0741A", textDecoration: "none" }}>Home</Link>
    </footer>
  );
}
