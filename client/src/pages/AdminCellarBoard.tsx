/**
 * AdminCellarBoard — RAG traceability wall.
 *
 * Answers "which vessels are ready to fill right now?" at a glance.
 * Every equipment item is grouped by WBS phase (Receival → Bottling)
 * and coloured by computed state:
 *   Green   — Sanitised, within freshness window, empty. Ready to fill.
 *   Amber   — Empty but sanitation expired or never done. Clean before use.
 *   Red     — Currently holding wine/must (from batch_equipment_uses).
 *   Grey    — Fault logged, out of service until repair task closes.
 *
 * State is computed server-side from cellar_tasks + batch_equipment_uses,
 * so no drift between "what's logged" and "what the wall shows".
 *
 * Backing tRPC endpoints:
 *   cellarBoard.board          → { equipment, counts } for the grid
 *   cellarBoard.equipmentHistory → reverse lookup (per-vessel drawer)
 *   cellarBoard.logUse         → operator logs fill/empty/pass events
 *   cellarTasks.add            → operator logs sanitise/fault events
 */
import { useMemo, useState } from "react";
import { Link } from "wouter";
import { ArrowLeft, AlertTriangle, CheckCircle2, Circle, XCircle, ChevronDown, ChevronRight } from "lucide-react";
import { trpc } from "@/lib/trpc";

type WbsPhase =
  | "receival"
  | "crushing"
  | "fermentation"
  | "pressing_transfer"
  | "storage_ageing"
  | "bottling"
  | "other";

type RagState = "green" | "amber" | "red" | "grey";

const PHASE_ORDER: WbsPhase[] = [
  "receival",
  "crushing",
  "fermentation",
  "pressing_transfer",
  "storage_ageing",
  "bottling",
  "other",
];

const PHASE_LABEL: Record<WbsPhase, string> = {
  receival: "1. Receival",
  crushing: "2. Crushing",
  fermentation: "3. Fermentation",
  pressing_transfer: "4. Pressing & Transfer",
  storage_ageing: "5. Storage & Ageing",
  bottling: "6. Bottling",
  other: "Other",
};

const STATE_META: Record<RagState, { color: string; bg: string; label: string; hint: string; Icon: typeof CheckCircle2 }> = {
  green: {
    color: "#2f5230",
    bg: "rgba(74,124,71,0.14)",
    label: "Ready",
    hint: "Sanitised, within freshness window, empty. Safe to fill.",
    Icon: CheckCircle2,
  },
  amber: {
    color: "#7c4d0f",
    bg: "rgba(181,126,20,0.14)",
    label: "Needs clean",
    hint: "Empty but sanitation expired or never done. Clean + sanitise before next use.",
    Icon: AlertTriangle,
  },
  red: {
    color: "#7f1d1d",
    bg: "rgba(185,28,28,0.10)",
    label: "In use",
    hint: "Holding wine/must. Log rack-out to release.",
    Icon: XCircle,
  },
  grey: {
    color: "#374151",
    bg: "rgba(107,114,128,0.14)",
    label: "Out of service",
    hint: "Fault logged. Close the repair task to bring back into rotation.",
    Icon: Circle,
  },
};

function humanAgo(ms: number | null | undefined): string {
  if (!ms) return "—";
  const diff = Date.now() - ms;
  const abs = Math.abs(diff);
  const h = Math.floor(abs / 3600000);
  if (h < 1) {
    const m = Math.floor(abs / 60000);
    return diff >= 0 ? `${m}m ago` : `in ${m}m`;
  }
  if (h < 48) return diff >= 0 ? `${h}h ago` : `in ${h}h`;
  const d = Math.floor(h / 24);
  return diff >= 0 ? `${d}d ago` : `in ${d}d`;
}

export default function AdminCellarBoard() {
  const boardQ = trpc.cellarBoard.board.useQuery(undefined, { refetchInterval: 30_000 });
  const [expanded, setExpanded] = useState<Record<number, boolean>>({});
  const [phaseFilter, setPhaseFilter] = useState<WbsPhase | "all">("all");
  const [stateFilter, setStateFilter] = useState<RagState | "all">("all");

  const filtered = useMemo(() => {
    const list = boardQ.data?.equipment ?? [];
    return list.filter(
      (row) =>
        (phaseFilter === "all" || row.wbsPhase === phaseFilter) &&
        (stateFilter === "all" || row.status.state === stateFilter)
    );
  }, [boardQ.data?.equipment, phaseFilter, stateFilter]);

  const grouped = useMemo(() => {
    const map = new Map<WbsPhase, typeof filtered>();
    for (const row of filtered) {
      const phase = (row.wbsPhase as WbsPhase) ?? "other";
      const bucket = map.get(phase) ?? [];
      bucket.push(row);
      map.set(phase, bucket);
    }
    return map;
  }, [filtered]);

  const counts = boardQ.data?.counts ?? { green: 0, amber: 0, red: 0, grey: 0 };

  return (
    <div style={{ maxWidth: 1200, margin: "0 auto", padding: "2rem 1rem 4rem", fontFamily: "system-ui, sans-serif" }}>
      <Link
        href="/admin/dev"
        data-testid="cellar-board-back-link"
        style={{ display: "inline-flex", alignItems: "center", gap: 6, color: "#6b7280", textDecoration: "none", fontSize: 14, marginBottom: 12 }}
      >
        <ArrowLeft size={14} /> Back to Admin / Dev
      </Link>

      <h1 style={{ fontSize: "1.85rem", margin: "0 0 0.35rem", fontWeight: 600 }}>Cellar Board</h1>
      <p style={{ color: "#6b7280", fontSize: 14, marginBottom: 20, maxWidth: 720 }}>
        Every vessel with its Red/Amber/Green/Grey state, computed from cleaning + rack events. Auto-refreshes every 30s. Green = sanitised, empty, within the 72h freshness window. FSANZ 3.2.2 audit-defensible: state is computed from the event log, never edited by hand.
      </p>

      {/* Summary chips */}
      <div style={{ display: "flex", gap: 8, flexWrap: "wrap", marginBottom: 16 }}>
        <SummaryChip label="Ready" count={counts.green} state="green" active={stateFilter === "green"} onClick={() => setStateFilter(stateFilter === "green" ? "all" : "green")} />
        <SummaryChip label="Needs clean" count={counts.amber} state="amber" active={stateFilter === "amber"} onClick={() => setStateFilter(stateFilter === "amber" ? "all" : "amber")} />
        <SummaryChip label="In use" count={counts.red} state="red" active={stateFilter === "red"} onClick={() => setStateFilter(stateFilter === "red" ? "all" : "red")} />
        <SummaryChip label="Out of service" count={counts.grey} state="grey" active={stateFilter === "grey"} onClick={() => setStateFilter(stateFilter === "grey" ? "all" : "grey")} />
      </div>

      {/* Phase filter */}
      <div style={{ display: "flex", gap: 6, flexWrap: "wrap", marginBottom: 20, fontSize: 13 }}>
        <button
          type="button"
          data-testid="cellar-board-phase-all"
          onClick={() => setPhaseFilter("all")}
          style={pillStyle(phaseFilter === "all")}
        >
          All phases
        </button>
        {PHASE_ORDER.map((p) => (
          <button
            key={p}
            type="button"
            data-testid={`cellar-board-phase-${p}`}
            onClick={() => setPhaseFilter(p)}
            style={pillStyle(phaseFilter === p)}
          >
            {PHASE_LABEL[p]}
          </button>
        ))}
      </div>

      {boardQ.isLoading && <div style={{ padding: 24, color: "#6b7280" }}>Loading…</div>}
      {boardQ.error && (
        <div data-testid="cellar-board-error" style={{ padding: 16, background: "rgba(185,28,28,0.06)", border: "1px solid #b91c1c", borderRadius: 8, color: "#7f1d1d" }}>
          Failed to load board: {boardQ.error.message}
        </div>
      )}

      {boardQ.data && filtered.length === 0 && (
        <div data-testid="cellar-board-empty" style={{ padding: 24, textAlign: "center", color: "#6b7280", border: "1px dashed #d4d4d8", borderRadius: 8 }}>
          No equipment matches this filter. {boardQ.data.equipment.length === 0 && "Add your first vessel from Your Vintage → Equipment."}
        </div>
      )}

      {/* Grouped by phase */}
      {PHASE_ORDER.map((phase) => {
        const rows = grouped.get(phase) ?? [];
        if (rows.length === 0) return null;
        return (
          <section key={phase} data-testid={`cellar-board-phase-section-${phase}`} style={{ marginBottom: 28 }}>
            <h2 style={{ fontSize: "1rem", fontWeight: 600, margin: "0 0 10px", color: "#374151", letterSpacing: "0.02em" }}>
              {PHASE_LABEL[phase]} <span style={{ color: "#9ca3af", fontWeight: 400 }}>· {rows.length}</span>
            </h2>
            <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fill, minmax(280px, 1fr))", gap: 10 }}>
              {rows.map((row) => (
                <VesselCard
                  key={row.id}
                  row={row}
                  expanded={!!expanded[row.id]}
                  onToggle={() => setExpanded((e) => ({ ...e, [row.id]: !e[row.id] }))}
                />
              ))}
            </div>
          </section>
        );
      })}
    </div>
  );
}

function pillStyle(active: boolean): React.CSSProperties {
  return {
    padding: "6px 12px",
    borderRadius: 999,
    border: `1px solid ${active ? "#111" : "#d4d4d8"}`,
    background: active ? "#111" : "transparent",
    color: active ? "#fff" : "#374151",
    cursor: "pointer",
    fontSize: 13,
  };
}

function SummaryChip({
  label,
  count,
  state,
  active,
  onClick,
}: {
  label: string;
  count: number;
  state: RagState;
  active: boolean;
  onClick: () => void;
}) {
  const meta = STATE_META[state];
  return (
    <button
      type="button"
      data-testid={`cellar-board-summary-${state}`}
      onClick={onClick}
      style={{
        display: "inline-flex",
        alignItems: "center",
        gap: 8,
        padding: "8px 12px",
        borderRadius: 8,
        border: `1px solid ${active ? meta.color : "transparent"}`,
        background: meta.bg,
        color: meta.color,
        cursor: "pointer",
        fontSize: 13,
        fontWeight: 500,
      }}
    >
      <meta.Icon size={16} />
      <span>{label}</span>
      <span style={{ fontWeight: 700 }}>{count}</span>
    </button>
  );
}

type BoardRow = {
  id: number;
  name: string;
  equipmentType: string;
  wbsPhase: WbsPhase | null;
  material: string;
  capacityL: number | null;
  quantity: number;
  notes: string | null;
  status: {
    equipmentId: number;
    state: RagState;
    reason: string;
    since: number | null;
    sanitisedAt: number | null;
    sanitisedExpiresAt: number | null;
    currentBatchId: number | null;
    currentBatchLabel: string | null;
  };
};

function VesselCard({ row, expanded, onToggle }: { row: BoardRow; expanded: boolean; onToggle: () => void }) {
  const meta = STATE_META[row.status.state as RagState];
  return (
    <div
      data-testid={`cellar-board-vessel-${row.id}`}
      data-state={row.status.state}
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
        data-testid={`cellar-board-vessel-toggle-${row.id}`}
        style={{
          all: "unset",
          display: "flex",
          alignItems: "center",
          gap: 6,
          width: "100%",
          cursor: "pointer",
        }}
      >
        {expanded ? <ChevronDown size={14} color={meta.color} /> : <ChevronRight size={14} color={meta.color} />}
        <meta.Icon size={16} color={meta.color} />
        <span style={{ fontWeight: 600, color: "#111", flex: 1 }}>{row.name}</span>
        <span style={{ fontSize: 11, color: meta.color, textTransform: "uppercase", letterSpacing: "0.06em", fontWeight: 700 }}>
          {meta.label}
        </span>
      </button>
      <div style={{ marginTop: 6, marginLeft: 24, fontSize: 12, color: "#4b5563" }}>
        {row.status.reason}
      </div>
      {expanded && <VesselDetail row={row} />}
    </div>
  );
}

function VesselDetail({ row }: { row: BoardRow }) {
  const historyQ = trpc.cellarBoard.equipmentHistory.useQuery(
    { equipmentId: row.id, limit: 20 },
    { staleTime: 30_000 }
  );
  return (
    <div style={{ marginTop: 10, marginLeft: 24, fontSize: 12, color: "#374151" }}>
      <div style={{ display: "grid", gridTemplateColumns: "auto 1fr", gap: "4px 12px", marginBottom: 10 }}>
        <span style={{ color: "#6b7280" }}>Type</span><span>{row.equipmentType.replace(/_/g, " ")}</span>
        {row.capacityL ? (<><span style={{ color: "#6b7280" }}>Capacity</span><span>{row.capacityL}L</span></>) : null}
        <span style={{ color: "#6b7280" }}>Material</span><span>{row.material}</span>
        <span style={{ color: "#6b7280" }}>Sanitised</span><span>{humanAgo(row.status.sanitisedAt)}</span>
        {row.status.currentBatchLabel ? (<><span style={{ color: "#6b7280" }}>Current batch</span><span>{row.status.currentBatchLabel}</span></>) : null}
      </div>
      <div style={{ fontWeight: 600, marginBottom: 4, color: "#374151" }}>Recent uses</div>
      {historyQ.isLoading && <div style={{ color: "#9ca3af" }}>Loading…</div>}
      {historyQ.data && historyQ.data.length === 0 && (
        <div data-testid={`cellar-board-history-empty-${row.id}`} style={{ color: "#9ca3af" }}>No batch uses logged yet.</div>
      )}
      {historyQ.data && historyQ.data.length > 0 && (
        <ul style={{ margin: 0, padding: 0, listStyle: "none" }}>
          {historyQ.data.map((h) => (
            <li key={h.id} style={{ padding: "4px 0", borderTop: "1px solid rgba(0,0,0,0.06)" }}>
              <div style={{ display: "flex", justifyContent: "space-between", gap: 8 }}>
                <span>
                  <strong>{h.batchLabel}</strong> · {h.direction} · {h.phase.replace(/_/g, " ")}
                </span>
                <span style={{ color: "#6b7280" }}>{humanAgo(h.usedAt)}</span>
              </div>
              {h.sanitiseOkAtUse ? (
                <div style={{ color: "#2f5230", fontSize: 11 }}>✓ Sanitised {h.sanitiseAgeHours}h before use</div>
              ) : (
                <div style={{ color: "#7f1d1d", fontSize: 11 }}>
                  ⚠ Sanitation not verified{h.sanitiseAgeHours != null ? ` (last was ${h.sanitiseAgeHours}h before)` : ""}
                </div>
              )}
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
