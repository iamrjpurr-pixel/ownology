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
  const [logOpen, setLogOpen] = useState(false);
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
      <div style={{ fontWeight: 600, marginBottom: 4, color: "#374151", display: "flex", justifyContent: "space-between", alignItems: "center" }}>
        <span>Recent uses</span>
        <button
          type="button"
          data-testid={`cellar-board-log-use-${row.id}`}
          onClick={() => setLogOpen(true)}
          style={{
            padding: "4px 10px",
            fontSize: 11,
            fontWeight: 600,
            border: `1px solid ${STATE_META[row.status.state as RagState].color}`,
            background: STATE_META[row.status.state as RagState].bg,
            color: STATE_META[row.status.state as RagState].color,
            borderRadius: 999,
            cursor: "pointer",
          }}
        >
          + Log equipment use
        </button>
      </div>
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
      {logOpen && <LogUseModal row={row} onClose={() => setLogOpen(false)} />}
    </div>
  );
}

// ─── LogUseModal ─────────────────────────────────────────────────────────
// Modal fired from a vessel's "Log equipment use" button. Captures a single
// fill/empty/pass event against a chosen batch and phase, then commits it
// via `cellarBoard.logUse`. Renders a red sanitation warning banner when
// the target vessel is amber/red so operators can't inadvertently pump
// juice into a dirty tank without acknowledgement.
function LogUseModal({ row, onClose }: { row: BoardRow; onClose: () => void }) {
  const utils = trpc.useUtils();
  const batchesQ = trpc.cellarBoard.listBatches.useQuery();
  const [batchId, setBatchId] = useState<number | null>(null);
  const [direction, setDirection] = useState<"in" | "out" | "pass" | "note">("in");
  const [phase, setPhase] = useState<WbsPhase>((row.wbsPhase as WbsPhase) ?? "other");
  const [notes, setNotes] = useState("");
  const [acknowledgedWarning, setAcknowledgedWarning] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const logUse = trpc.cellarBoard.logUse.useMutation({
    onSuccess: () => {
      utils.cellarBoard.board.invalidate();
      utils.cellarBoard.equipmentHistory.invalidate({ equipmentId: row.id, limit: 20 });
      onClose();
    },
    onError: (e) => setError(e.message),
  });

  const isDirty = row.status.state === "amber" || row.status.state === "red";
  const meta = STATE_META[row.status.state as RagState];

  const selectedBatch = batchesQ.data?.find((b) => b.id === batchId);

  const canSubmit = batchId != null && (!isDirty || acknowledgedWarning) && !logUse.isPending;

  const handleSubmit = () => {
    if (!selectedBatch) return;
    setError(null);
    logUse.mutate({
      batchId: selectedBatch.id,
      batchLabel: selectedBatch.batchId,
      equipmentId: row.id,
      equipmentName: row.name,
      phase,
      direction,
      notes: notes.trim() || undefined,
    });
  };

  return (
    <div
      data-testid={`cellar-board-log-modal-${row.id}`}
      onClick={(e) => { if (e.target === e.currentTarget) onClose(); }}
      style={{ position: "fixed", inset: 0, background: "rgba(26,18,16,0.55)", display: "flex", alignItems: "flex-start", justifyContent: "center", padding: "40px 16px", zIndex: 300, overflowY: "auto" }}
    >
      <div style={{ background: "#fff", maxWidth: 520, width: "100%", borderRadius: 10, padding: "22px 22px 18px", boxShadow: "0 20px 60px rgba(0,0,0,0.35)" }}>
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", marginBottom: 4 }}>
          <div>
            <div style={{ fontSize: 11, letterSpacing: "0.12em", textTransform: "uppercase", color: "#8a7565", fontWeight: 700, marginBottom: 4 }}>
              Log equipment use
            </div>
            <h3 style={{ margin: 0, fontSize: 18, fontWeight: 600, color: "#111" }}>{row.name}</h3>
          </div>
          <button type="button" onClick={onClose} aria-label="Close" data-testid={`cellar-board-log-close-${row.id}`}
            style={{ background: "transparent", border: "none", cursor: "pointer", color: "#6b7280", fontSize: 20, lineHeight: 1, padding: 4 }}>×</button>
        </div>

        {/* Sanitation warning — visible whenever vessel is amber/red. Requires
            explicit acknowledgement before submit is enabled. Ties to FSANZ
            3.2.2 Clause 20 evidence requirements — the operator must
            positively confirm they've seen the risk before contact. */}
        {isDirty && (
          <div
            data-testid={`cellar-board-log-warn-${row.id}`}
            style={{ marginTop: 14, padding: "12px 14px", background: "rgba(185,28,28,0.06)", border: "1px solid #b91c1c", borderRadius: 6, color: "#7f1d1d" }}
          >
            <div style={{ fontWeight: 700, fontSize: 13, display: "flex", alignItems: "center", gap: 6 }}>
              <meta.Icon size={14} color="#b91c1c" /> Sanitation check required
            </div>
            <div style={{ fontSize: 12, marginTop: 4, lineHeight: 1.5 }}>
              {row.status.reason}. Logging use now creates an audit event where
              sanitation was not verified within the 72h freshness window.
            </div>
            <label style={{ display: "flex", alignItems: "center", gap: 8, marginTop: 10, fontSize: 12, cursor: "pointer" }}>
              <input
                type="checkbox"
                data-testid={`cellar-board-log-ack-${row.id}`}
                checked={acknowledgedWarning}
                onChange={(e) => setAcknowledgedWarning(e.target.checked)}
                style={{ accentColor: "#b91c1c" }}
              />
              <span>I&apos;ve reviewed the risk — proceed anyway (auditable).</span>
            </label>
          </div>
        )}

        <div style={{ marginTop: 14, display: "grid", gap: 12 }}>
          <label style={{ fontSize: 12, color: "#6b7280", display: "block" }}>
            Batch
            <select
              data-testid={`cellar-board-log-batch-${row.id}`}
              value={batchId ?? ""}
              onChange={(e) => setBatchId(e.target.value ? Number(e.target.value) : null)}
              style={{ width: "100%", marginTop: 4, padding: "8px 10px", fontSize: 14, border: "1px solid #d4d4d8", borderRadius: 6, background: "#fff", color: "#111" }}
            >
              <option value="">— Select a batch —</option>
              {(batchesQ.data ?? []).map((b) => (
                <option key={b.id} value={b.id}>{b.batchId} · {b.variety} ({b.vintage})</option>
              ))}
            </select>
            {batchesQ.data && batchesQ.data.length === 0 && (
              <span style={{ fontSize: 11, color: "#8a7565", marginTop: 4, display: "block" }}>
                No batches yet — register one in Your Vintage first.
              </span>
            )}
          </label>

          <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 12 }}>
            <label style={{ fontSize: 12, color: "#6b7280", display: "block" }}>
              Direction
              <select
                data-testid={`cellar-board-log-direction-${row.id}`}
                value={direction}
                onChange={(e) => setDirection(e.target.value as "in" | "out" | "pass" | "note")}
                style={{ width: "100%", marginTop: 4, padding: "8px 10px", fontSize: 14, border: "1px solid #d4d4d8", borderRadius: 6, background: "#fff", color: "#111" }}
              >
                <option value="in">In (batch fills this vessel)</option>
                <option value="out">Out (batch leaves this vessel)</option>
                <option value="pass">Pass (transfer through)</option>
                <option value="note">Note only (no state change)</option>
              </select>
            </label>
            <label style={{ fontSize: 12, color: "#6b7280", display: "block" }}>
              Phase
              <select
                data-testid={`cellar-board-log-phase-${row.id}`}
                value={phase}
                onChange={(e) => setPhase(e.target.value as WbsPhase)}
                style={{ width: "100%", marginTop: 4, padding: "8px 10px", fontSize: 14, border: "1px solid #d4d4d8", borderRadius: 6, background: "#fff", color: "#111" }}
              >
                <option value="receival">1. Receival</option>
                <option value="crushing">2. Crushing</option>
                <option value="fermentation">3. Fermentation</option>
                <option value="pressing_transfer">4. Pressing & Transfer</option>
                <option value="storage_ageing">5. Storage & Ageing</option>
                <option value="bottling">6. Bottling</option>
                <option value="other">Other</option>
              </select>
            </label>
          </div>

          <label style={{ fontSize: 12, color: "#6b7280", display: "block" }}>
            Notes (optional)
            <textarea
              data-testid={`cellar-board-log-notes-${row.id}`}
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
              placeholder="e.g. 900L transferred, 8°Bé, no anomalies"
              rows={2}
              maxLength={500}
              style={{ width: "100%", marginTop: 4, padding: "8px 10px", fontSize: 14, border: "1px solid #d4d4d8", borderRadius: 6, background: "#fff", color: "#111", resize: "vertical", fontFamily: "system-ui, sans-serif" }}
            />
          </label>

          {error && (
            <div data-testid={`cellar-board-log-error-${row.id}`} style={{ padding: "8px 12px", background: "rgba(185,28,28,0.06)", border: "1px solid #b91c1c", borderRadius: 6, color: "#7f1d1d", fontSize: 12 }}>
              {error}
            </div>
          )}
        </div>

        <div style={{ marginTop: 18, display: "flex", justifyContent: "flex-end", gap: 8 }}>
          <button type="button" onClick={onClose} style={{ padding: "8px 16px", background: "transparent", border: "1px solid #d4d4d8", borderRadius: 999, cursor: "pointer", fontSize: 13, color: "#4a3d35" }}>Cancel</button>
          <button
            type="button"
            data-testid={`cellar-board-log-submit-${row.id}`}
            onClick={handleSubmit}
            disabled={!canSubmit}
            style={{ padding: "8px 20px", background: canSubmit ? "#B0741A" : "#c9b48e", color: "#2A1E0A", border: "none", borderRadius: 999, cursor: canSubmit ? "pointer" : "not-allowed", fontSize: 13, fontWeight: 600 }}
          >
            {logUse.isPending ? "Logging…" : "Log use"}
          </button>
        </div>
      </div>
    </div>
  );
}

