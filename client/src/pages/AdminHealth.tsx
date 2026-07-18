/**
 * AdminHealth — system health at a glance.
 *
 * Companion to the daily `/api/scheduled/health-digest` email and the
 * 15-min `/api/scheduled/health-watch` failure-only push. This page shows
 * live probe status + last-known state from `health_probe_state` so Rich
 * can eyeball system health without waiting for an inbox.
 *
 * Uses the plain REST endpoint `/api/admin/health-status` (gated by
 * adminGate middleware) — not tRPC. Two actions:
 *   - "Refresh" → re-fetch status
 *   - "Run watch now" → trigger the transition detector (dry-run by
 *     default; send=1 mails only on transition, so safe to click)
 */
import { useEffect, useState, useCallback } from "react";
import { Link } from "wouter";
import { ArrowLeft, RefreshCw, Zap, CheckCircle2, AlertTriangle, XCircle, MinusCircle } from "lucide-react";

type ProbeStatus = "ok" | "warn" | "fail" | "skip";
type Probe = { name: string; status: ProbeStatus; detail: string; hint?: string };
type StateRow = {
  probeName: string;
  lastStatus: ProbeStatus;
  lastDetail: string | null;
  lastCheckedAt: number;
  lastTransitionedAt: number;
  lastAlertedAt: number | null;
};
type HealthPayload = {
  generatedAt: string;
  probes: Probe[];
  state: StateRow[];
};
type Transition = {
  probe: string;
  previous: ProbeStatus | null;
  current: ProbeStatus;
  kind: "failure" | "recovery";
  detail: string;
};
type WatchResponse = {
  generatedAt: string;
  checked: number;
  transitions: Transition[];
  emailed: string | boolean;
};

// ─── Copyright Guard stats (Feb 2026) ─────────────────────────────────────
type GuardOutcome = "clean" | "still_leaking" | "regen_failed" | "no_regen";
type GuardTotals = { clean: number; still_leaking: number; regen_failed: number; total: number };
type GuardSource = { primarySource: string | null; count: number; cleanCount: number; stillLeakingCount: number };
type GuardRecent = {
  id: number;
  occurredAt: number;
  questionSnippet: string;
  hits: string[];
  sourceHits: string[];
  outcome: GuardOutcome;
  primarySource: string | null;
  originalAnswerLen: number;
};
type GuardPayload = {
  generatedAt: string;
  totals: { "7d": GuardTotals; "30d": GuardTotals };
  cleanRate30d: number | null;
  topSources: GuardSource[];
  recent: GuardRecent[];
};

const GUARD_OUTCOME_META: Record<GuardOutcome, { color: string; bg: string; label: string }> = {
  clean:          { color: "#4a7c47", bg: "rgba(74,124,71,0.10)",  label: "CLEAN" },
  still_leaking:  { color: "#b91c1c", bg: "rgba(185,28,28,0.10)",  label: "STILL LEAKING" },
  regen_failed:   { color: "#b57e14", bg: "rgba(181,126,20,0.10)", label: "REGEN FAILED" },
  no_regen:       { color: "#6b7280", bg: "rgba(107,114,128,0.10)", label: "NO REGEN" },
};

const STATUS_META: Record<ProbeStatus, { color: string; bg: string; label: string; Icon: typeof CheckCircle2 }> = {
  ok: { color: "#4a7c47", bg: "rgba(74,124,71,0.10)", label: "OK", Icon: CheckCircle2 },
  warn: { color: "#b57e14", bg: "rgba(181,126,20,0.10)", label: "WARN", Icon: AlertTriangle },
  fail: { color: "#b91c1c", bg: "rgba(185,28,28,0.10)", label: "FAIL", Icon: XCircle },
  skip: { color: "#6b7280", bg: "rgba(107,114,128,0.10)", label: "SKIP", Icon: MinusCircle },
};

function humanAgo(ms: number): string {
  const diff = Date.now() - ms;
  if (diff < 0) return "just now";
  const s = Math.floor(diff / 1000);
  if (s < 60) return `${s}s ago`;
  const m = Math.floor(s / 60);
  if (m < 60) return `${m}m ago`;
  const h = Math.floor(m / 60);
  if (h < 24) return `${h}h ago`;
  const d = Math.floor(h / 24);
  return `${d}d ago`;
}

export default function AdminHealth() {
  const [data, setData] = useState<HealthPayload | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [watchResult, setWatchResult] = useState<WatchResponse | null>(null);
  const [watchBusy, setWatchBusy] = useState(false);
  const [guard, setGuard] = useState<GuardPayload | null>(null);
  const [guardLoading, setGuardLoading] = useState(true);
  const [guardError, setGuardError] = useState<string | null>(null);

  const fetchStatus = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const r = await fetch("/api/admin/health-status", { credentials: "same-origin" });
      if (!r.ok) throw new Error(`HTTP ${r.status}`);
      const j = (await r.json()) as HealthPayload;
      setData(j);
    } catch (err) {
      setError(err instanceof Error ? err.message : String(err));
    } finally {
      setLoading(false);
    }
  }, []);

  const fetchGuard = useCallback(async () => {
    setGuardLoading(true);
    setGuardError(null);
    try {
      const r = await fetch("/api/admin/copyright-guard-stats", { credentials: "same-origin" });
      if (!r.ok) throw new Error(`HTTP ${r.status}`);
      const j = (await r.json()) as GuardPayload;
      setGuard(j);
    } catch (err) {
      setGuardError(err instanceof Error ? err.message : String(err));
    } finally {
      setGuardLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchStatus();
    fetchGuard();
  }, [fetchStatus, fetchGuard]);

  const runWatch = async (send: boolean) => {
    setWatchBusy(true);
    setWatchResult(null);
    try {
      const r = await fetch(`/api/scheduled/health-watch${send ? "?send=1" : ""}`, { credentials: "same-origin" });
      const j = (await r.json()) as WatchResponse;
      setWatchResult(j);
      // Reload status so lastCheckedAt / lastAlertedAt reflect the run
      fetchStatus();
    } catch (err) {
      setWatchResult({
        generatedAt: new Date().toISOString(),
        checked: 0,
        transitions: [],
        emailed: `error: ${err instanceof Error ? err.message : String(err)}`,
      });
    } finally {
      setWatchBusy(false);
    }
  };

  const probesByName = new Map<string, Probe>();
  for (const p of data?.probes ?? []) probesByName.set(p.name, p);
  const stateByName = new Map<string, StateRow>();
  for (const s of data?.state ?? []) stateByName.set(s.probeName, s);
  const merged = (data?.probes ?? []).map((p) => ({ probe: p, state: stateByName.get(p.name) ?? null }));

  const fails = (data?.probes ?? []).filter((p) => p.status === "fail").length;
  const warns = (data?.probes ?? []).filter((p) => p.status === "warn").length;
  const oks = (data?.probes ?? []).filter((p) => p.status === "ok").length;

  return (
    <div
      data-testid="admin-health"
      style={{
        maxWidth: 860,
        margin: "0 auto",
        padding: "2rem 1.25rem 4rem",
        color: "var(--ow-text-hi, #1a1210)",
      }}
    >
      <Link
        href="/admin"
        data-testid="admin-health-back"
        style={{
          display: "inline-flex",
          alignItems: "center",
          gap: "0.35rem",
          color: "var(--ow-text-mid, rgba(0,0,0,0.6))",
          textDecoration: "none",
          fontFamily: "'Lato', sans-serif",
          fontSize: "0.8rem",
          marginBottom: "1.5rem",
        }}
      >
        <ArrowLeft size={14} strokeWidth={2.2} /> Admin
      </Link>

      <h1
        style={{
          margin: 0,
          fontFamily: "'Fraunces', Georgia, serif",
          fontSize: "clamp(1.6rem, 4vw, 2rem)",
          fontWeight: 600,
          letterSpacing: "-0.01em",
        }}
      >
        App health
      </h1>
      <p
        style={{
          margin: "0.5rem 0 1.5rem 0",
          fontSize: "0.9rem",
          color: "var(--ow-text-mid, rgba(0,0,0,0.6))",
          fontFamily: "'Lato', sans-serif",
          maxWidth: "62ch",
          lineHeight: 1.55,
        }}
      >
        Live probe status alongside the last-known state persisted for the
        failure-only push detector. Daily digest sends at 07:00 AEST; the
        watcher runs every 15 min and only mails on transition.
      </p>

      {/* Actions */}
      <div
        style={{
          display: "flex",
          gap: "0.6rem",
          flexWrap: "wrap",
          marginBottom: "1.75rem",
        }}
      >
        <button
          type="button"
          onClick={fetchStatus}
          disabled={loading}
          data-testid="admin-health-refresh"
          style={{
            display: "inline-flex",
            alignItems: "center",
            gap: "0.4rem",
            fontFamily: "'Lato', sans-serif",
            fontSize: "0.78rem",
            fontWeight: 600,
            padding: "0.5rem 0.9rem",
            borderRadius: 999,
            border: "1px solid rgba(0,0,0,0.15)",
            background: "#fff",
            cursor: loading ? "wait" : "pointer",
            color: "var(--ow-text-hi, #1a1210)",
          }}
        >
          <RefreshCw size={13} strokeWidth={2.2} /> {loading ? "Refreshing…" : "Refresh"}
        </button>
        <button
          type="button"
          onClick={() => runWatch(false)}
          disabled={watchBusy}
          data-testid="admin-health-run-watch-dry"
          style={{
            display: "inline-flex",
            alignItems: "center",
            gap: "0.4rem",
            fontFamily: "'Lato', sans-serif",
            fontSize: "0.78rem",
            fontWeight: 600,
            padding: "0.5rem 0.9rem",
            borderRadius: 999,
            border: "1px solid rgba(176,116,26,0.55)",
            background: "rgba(176,116,26,0.10)",
            color: "#B0741A",
            cursor: watchBusy ? "wait" : "pointer",
          }}
        >
          <Zap size={13} strokeWidth={2.2} /> {watchBusy ? "Running…" : "Run watch (dry-run)"}
        </button>
        <button
          type="button"
          onClick={() => runWatch(true)}
          disabled={watchBusy}
          data-testid="admin-health-run-watch-send"
          style={{
            display: "inline-flex",
            alignItems: "center",
            gap: "0.4rem",
            fontFamily: "'Lato', sans-serif",
            fontSize: "0.78rem",
            fontWeight: 600,
            padding: "0.5rem 0.9rem",
            borderRadius: 999,
            border: "none",
            background: "#B0741A",
            color: "#2A1E0A",
            cursor: watchBusy ? "wait" : "pointer",
          }}
          title="Fires the transition detector. Only sends an email if a probe just flipped OK↔FAIL."
        >
          <Zap size={13} strokeWidth={2.2} /> Run watch + send
        </button>
      </div>

      {error && (
        <div
          data-testid="admin-health-error"
          style={{
            padding: "0.9rem 1.1rem",
            borderRadius: "0.5rem",
            border: "1px solid rgba(185,28,28,0.35)",
            background: "rgba(185,28,28,0.06)",
            color: "#7f1d1d",
            fontFamily: "'Lato', sans-serif",
            fontSize: "0.85rem",
            marginBottom: "1rem",
          }}
        >
          Failed to load: {error}
        </div>
      )}

      {/* Watch result panel */}
      {watchResult && (
        <div
          data-testid="admin-health-watch-result"
          style={{
            padding: "0.9rem 1.1rem",
            borderRadius: "0.5rem",
            border: "1px solid rgba(0,0,0,0.1)",
            background: "rgba(0,0,0,0.02)",
            fontFamily: "'JetBrains Mono', monospace",
            fontSize: "0.75rem",
            lineHeight: 1.55,
            marginBottom: "1.25rem",
            color: "var(--ow-text-mid, rgba(0,0,0,0.7))",
          }}
        >
          <div style={{ fontWeight: 700, color: "var(--ow-text-hi)", marginBottom: "0.35rem" }}>
            Watch → checked {watchResult.checked} · {watchResult.transitions.length} transition(s) · emailed:{" "}
            <span style={{ color: typeof watchResult.emailed === "string" && watchResult.emailed.startsWith("error") ? "#b91c1c" : "#4a7c47" }}>
              {String(watchResult.emailed)}
            </span>
          </div>
          {watchResult.transitions.length === 0 && (
            <div>No transitions since last observation — everything is stable.</div>
          )}
          {watchResult.transitions.map((t, i) => (
            <div key={i} style={{ marginTop: "0.25rem" }}>
              [{t.kind.toUpperCase()}] {t.probe}: {t.previous ?? "—"} → {t.current}
            </div>
          ))}
        </div>
      )}

      {/* Headline */}
      {data && (
        <div
          data-testid="admin-health-headline"
          style={{
            display: "flex",
            gap: "0.5rem",
            flexWrap: "wrap",
            marginBottom: "1.25rem",
          }}
        >
          <Pill color="#b91c1c" label={`${fails} FAIL`} testid="headline-fail" />
          <Pill color="#b57e14" label={`${warns} WARN`} testid="headline-warn" />
          <Pill color="#4a7c47" label={`${oks} OK`} testid="headline-ok" />
          <span
            style={{
              alignSelf: "center",
              fontSize: "0.72rem",
              color: "var(--ow-text-mid, rgba(0,0,0,0.5))",
              fontFamily: "'Lato', sans-serif",
              marginLeft: "0.35rem",
            }}
          >
            checked {humanAgo(new Date(data.generatedAt).getTime())}
          </span>
        </div>
      )}

      {/* Probe rows */}
      {loading && !data && (
        <p style={{ fontFamily: "'Lato', sans-serif", opacity: 0.6 }}>Running probes…</p>
      )}
      {merged.map(({ probe, state }) => {
        const meta = STATUS_META[probe.status];
        const stateMeta = state ? STATUS_META[state.lastStatus] : null;
        const flipped = state && state.lastStatus !== probe.status;
        return (
          <div
            key={probe.name}
            data-testid={`admin-health-row-${probe.name.toLowerCase().replace(/\s+/g, "-")}`}
            style={{
              padding: "1rem 1.25rem",
              borderRadius: "0.6rem",
              background: flipped ? "rgba(185,28,28,0.04)" : "rgba(0,0,0,0.02)",
              border: flipped ? "1px solid rgba(185,28,28,0.35)" : "1px solid rgba(0,0,0,0.08)",
              marginBottom: "0.6rem",
              display: "grid",
              gridTemplateColumns: "auto 1fr",
              gap: "0.9rem",
              alignItems: "flex-start",
              fontFamily: "'Lato', sans-serif",
            }}
          >
            <div
              style={{
                display: "inline-flex",
                alignItems: "center",
                justifyContent: "center",
                width: 36,
                height: 36,
                borderRadius: 999,
                background: meta.bg,
                color: meta.color,
                flexShrink: 0,
              }}
            >
              <meta.Icon size={18} strokeWidth={2.2} />
            </div>
            <div style={{ minWidth: 0 }}>
              <div style={{ display: "flex", flexWrap: "wrap", gap: "0.5rem", alignItems: "baseline" }}>
                <span style={{ fontFamily: "'Fraunces', serif", fontWeight: 600, fontSize: "1rem" }}>{probe.name}</span>
                <span
                  style={{
                    fontFamily: "'JetBrains Mono', monospace",
                    fontSize: "0.68rem",
                    fontWeight: 700,
                    color: meta.color,
                    background: meta.bg,
                    padding: "0.15rem 0.45rem",
                    borderRadius: "0.25rem",
                    letterSpacing: "0.08em",
                  }}
                >
                  {meta.label}
                </span>
                {flipped && stateMeta && (
                  <span
                    data-testid={`admin-health-flipped-${probe.name.toLowerCase().replace(/\s+/g, "-")}`}
                    style={{
                      fontFamily: "'JetBrains Mono', monospace",
                      fontSize: "0.62rem",
                      color: "#b91c1c",
                      fontWeight: 700,
                      letterSpacing: "0.08em",
                    }}
                    title="Live status differs from last stored state — watcher will alert on next run."
                  >
                    {stateMeta.label} → {meta.label}
                  </span>
                )}
              </div>
              <div style={{ fontSize: "0.85rem", color: "var(--ow-text-mid, rgba(0,0,0,0.65))", marginTop: "0.2rem", wordBreak: "break-word" }}>
                {probe.detail}
              </div>
              {probe.hint && (
                <div
                  style={{
                    fontSize: "0.78rem",
                    color: "var(--ow-text-mid, rgba(0,0,0,0.55))",
                    marginTop: "0.35rem",
                    fontStyle: "italic",
                  }}
                >
                  → {probe.hint}
                </div>
              )}
              {state && (
                <div
                  style={{
                    marginTop: "0.5rem",
                    fontSize: "0.7rem",
                    color: "var(--ow-text-mid, rgba(0,0,0,0.5))",
                    fontFamily: "'JetBrains Mono', monospace",
                  }}
                >
                  stable {humanAgo(state.lastTransitionedAt)} · checked {humanAgo(state.lastCheckedAt)}
                  {state.lastAlertedAt && ` · last alert ${humanAgo(state.lastAlertedAt)}`}
                </div>
              )}
              {!state && (
                <div
                  style={{
                    marginTop: "0.5rem",
                    fontSize: "0.7rem",
                    color: "var(--ow-text-mid, rgba(0,0,0,0.5))",
                    fontStyle: "italic",
                  }}
                >
                  First observation — no baseline yet. The watcher will seed one on next run.
                </div>
              )}
            </div>
          </div>
        );
      })}

      <div
        style={{
          marginTop: "2rem",
          padding: "0.9rem 1.1rem",
          borderRadius: "0.5rem",
          background: "rgba(0,0,0,0.02)",
          fontSize: "0.75rem",
          color: "var(--ow-text-mid, rgba(0,0,0,0.55))",
          fontFamily: "'Lato', sans-serif",
          lineHeight: 1.55,
        }}
      >
        <div style={{ fontWeight: 700, color: "var(--ow-text-hi)", marginBottom: "0.35rem" }}>Endpoints</div>
        <code style={{ fontFamily: "'JetBrains Mono', monospace" }}>/api/scheduled/health-digest?send=1</code> — daily aggregator email · <code style={{ fontFamily: "'JetBrains Mono', monospace" }}>/api/scheduled/health-watch?send=1</code> — failure-only push (15-min cron)
      </div>

      <CopyrightGuardSection
        guard={guard}
        loading={guardLoading}
        error={guardError}
        onRefresh={fetchGuard}
      />
    </div>
  );
}

// ─── Copyright Guard Metrics Section ──────────────────────────────────────
function CopyrightGuardSection({
  guard,
  loading,
  error,
  onRefresh,
}: {
  guard: GuardPayload | null;
  loading: boolean;
  error: string | null;
  onRefresh: () => void;
}) {
  return (
    <section
      data-testid="admin-health-guard-section"
      style={{
        marginTop: "3rem",
        paddingTop: "2rem",
        borderTop: "1px solid rgba(0,0,0,0.08)",
      }}
    >
      <div style={{ display: "flex", alignItems: "baseline", justifyContent: "space-between", gap: "1rem", marginBottom: "1rem", flexWrap: "wrap" }}>
        <div>
          <h2 style={{ fontFamily: "'Fraunces', serif", fontSize: "1.5rem", fontWeight: 600, color: "var(--ow-text-hi)", margin: 0, lineHeight: 1.2 }}>
            Copyright Guard — /ask verbatim-leak monitor
          </h2>
          <p style={{ fontFamily: "'Lato', sans-serif", fontSize: "0.82rem", color: "var(--ow-text-mid)", margin: "0.35rem 0 0", maxWidth: "600px", lineHeight: 1.5 }}>
            Every Owen answer is checked for 8+ word overlaps with the licensed reference chunks (MoreWine, AWRI, Boulton, Iland). Hits trigger a stricter regeneration. This panel shows where Claude is most tempted to lean on source phrasing.
          </p>
        </div>
        <button
          type="button"
          onClick={onRefresh}
          disabled={loading}
          data-testid="admin-health-guard-refresh"
          style={{
            fontFamily: "'Lato', sans-serif", fontSize: "0.75rem", fontWeight: 600,
            padding: "0.4rem 0.85rem", borderRadius: 999,
            border: "1px solid rgba(0,0,0,0.15)", background: "#fff",
            cursor: loading ? "wait" : "pointer", color: "var(--ow-text-hi)",
            display: "inline-flex", alignItems: "center", gap: "0.35rem",
          }}
        >
          <RefreshCw size={12} strokeWidth={2.2} /> {loading ? "…" : "Refresh"}
        </button>
      </div>

      {error && (
        <div
          data-testid="admin-health-guard-error"
          style={{
            padding: "0.75rem 1rem", borderRadius: "0.5rem",
            background: "rgba(185,28,28,0.08)", color: "#b91c1c",
            fontFamily: "'JetBrains Mono', monospace", fontSize: "0.78rem",
            marginBottom: "1rem",
          }}
        >
          Guard stats error: {error}
        </div>
      )}

      {loading && !guard && (
        <div style={{ fontFamily: "'Lato', sans-serif", fontSize: "0.85rem", color: "var(--ow-text-mid)", padding: "1rem 0" }}>
          Loading guard stats…
        </div>
      )}

      {guard && (
        <>
          {/* Big-number rail: 7d hits · 30d hits · Clean rate */}
          <div
            data-testid="admin-health-guard-metrics"
            style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(180px, 1fr))", gap: "0.75rem", marginBottom: "1.25rem" }}
          >
            <MetricCard testid="guard-metric-7d" label="Hits · last 7d" value={String(guard.totals["7d"].total)} accent={guard.totals["7d"].total === 0 ? "#4a7c47" : "#b57e14"} />
            <MetricCard testid="guard-metric-30d" label="Hits · last 30d" value={String(guard.totals["30d"].total)} accent="#6b7280" />
            <MetricCard
              testid="guard-metric-clean-rate"
              label="Regen clean-rate · 30d"
              value={guard.cleanRate30d === null ? "—" : `${guard.cleanRate30d}%`}
              accent={guard.cleanRate30d === null ? "#6b7280" : guard.cleanRate30d >= 90 ? "#4a7c47" : guard.cleanRate30d >= 70 ? "#b57e14" : "#b91c1c"}
            />
            <MetricCard
              testid="guard-metric-still-leaking"
              label="Still leaking · 30d"
              value={String(guard.totals["30d"].still_leaking)}
              accent={guard.totals["30d"].still_leaking === 0 ? "#4a7c47" : "#b91c1c"}
              subtitle={guard.totals["30d"].still_leaking > 0 ? "manual review needed" : "clean"}
            />
          </div>

          {/* Top offending sources */}
          <div
            data-testid="admin-health-guard-top-sources"
            style={{
              padding: "1rem 1.15rem", borderRadius: "0.5rem",
              background: "rgba(0,0,0,0.02)", border: "1px solid rgba(0,0,0,0.05)",
              marginBottom: "1.25rem",
            }}
          >
            <div style={{ fontFamily: "'Lato', sans-serif", fontSize: "0.72rem", fontWeight: 700, letterSpacing: "0.1em", textTransform: "uppercase", color: "var(--ow-text-mid)", marginBottom: "0.85rem" }}>
              Top offending sources · last 30 days
            </div>
            {guard.topSources.length === 0 ? (
              <div style={{ fontFamily: "'Lato', sans-serif", fontSize: "0.85rem", color: "var(--ow-text-mid)", fontStyle: "italic" }}>
                No hits recorded — Layer 1 (system prompt) is holding.
              </div>
            ) : (
              <div style={{ display: "flex", flexDirection: "column", gap: "0.5rem" }}>
                {guard.topSources.map((s) => (
                  <div
                    key={s.primarySource ?? "unknown"}
                    style={{
                      display: "grid",
                      gridTemplateColumns: "1fr auto auto auto",
                      gap: "0.75rem",
                      alignItems: "center",
                      padding: "0.55rem 0.75rem",
                      background: "#fff",
                      borderRadius: 4,
                      border: "1px solid rgba(0,0,0,0.05)",
                      fontFamily: "'Lato', sans-serif",
                      fontSize: "0.82rem",
                    }}
                  >
                    <span style={{ color: "var(--ow-text-hi)", overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }} title={s.primarySource ?? "unknown"}>
                      {s.primarySource ?? "unknown"}
                    </span>
                    <span style={{ fontFamily: "'JetBrains Mono', monospace", fontSize: "0.75rem", color: "#6b7280" }}>
                      {s.count} hits
                    </span>
                    <span style={{ fontFamily: "'JetBrains Mono', monospace", fontSize: "0.75rem", color: "#4a7c47" }} title="Regenerated clean">
                      {s.cleanCount} clean
                    </span>
                    <span
                      style={{
                        fontFamily: "'JetBrains Mono', monospace", fontSize: "0.75rem",
                        color: s.stillLeakingCount > 0 ? "#b91c1c" : "#6b7280",
                        fontWeight: s.stillLeakingCount > 0 ? 700 : 400,
                      }}
                      title="Still leaking after regen"
                    >
                      {s.stillLeakingCount} leak
                    </span>
                  </div>
                ))}
              </div>
            )}
          </div>

          {/* Recent events table */}
          <div
            data-testid="admin-health-guard-recent"
            style={{ padding: "1rem 1.15rem", borderRadius: "0.5rem", background: "rgba(0,0,0,0.02)", border: "1px solid rgba(0,0,0,0.05)" }}
          >
            <div style={{ fontFamily: "'Lato', sans-serif", fontSize: "0.72rem", fontWeight: 700, letterSpacing: "0.1em", textTransform: "uppercase", color: "var(--ow-text-mid)", marginBottom: "0.85rem" }}>
              Recent detections · last 20
            </div>
            {guard.recent.length === 0 ? (
              <div style={{ fontFamily: "'Lato', sans-serif", fontSize: "0.85rem", color: "var(--ow-text-mid)", fontStyle: "italic" }}>
                No events yet — the guard has never fired.
              </div>
            ) : (
              <div style={{ display: "flex", flexDirection: "column", gap: "0.4rem" }}>
                {guard.recent.map((r) => {
                  const meta = GUARD_OUTCOME_META[r.outcome] ?? GUARD_OUTCOME_META.no_regen;
                  return (
                    <div
                      key={r.id}
                      data-testid={`guard-recent-${r.id}`}
                      style={{
                        display: "grid",
                        gridTemplateColumns: "auto 1fr auto",
                        gap: "0.75rem",
                        alignItems: "start",
                        padding: "0.6rem 0.8rem",
                        background: "#fff",
                        borderRadius: 4,
                        border: "1px solid rgba(0,0,0,0.05)",
                      }}
                    >
                      <span
                        style={{
                          fontFamily: "'JetBrains Mono', monospace", fontSize: "0.65rem",
                          fontWeight: 700, letterSpacing: "0.06em",
                          padding: "0.15rem 0.5rem", borderRadius: 3,
                          color: meta.color, background: meta.bg,
                          whiteSpace: "nowrap", marginTop: "0.1rem",
                        }}
                      >
                        {meta.label}
                      </span>
                      <div style={{ minWidth: 0 }}>
                        <div style={{ fontFamily: "'Lato', sans-serif", fontSize: "0.82rem", color: "var(--ow-text-hi)", lineHeight: 1.4, overflow: "hidden", textOverflow: "ellipsis", display: "-webkit-box", WebkitLineClamp: 2, WebkitBoxOrient: "vertical" }}>
                          {r.questionSnippet}
                        </div>
                        <div style={{ fontFamily: "'JetBrains Mono', monospace", fontSize: "0.7rem", color: "var(--ow-text-mid)", marginTop: "0.25rem" }}>
                          {r.primarySource ?? "unknown source"} · {r.hits.length} phrase{r.hits.length === 1 ? "" : "s"} · {r.originalAnswerLen} chars
                        </div>
                        {r.hits.length > 0 && (
                          <div
                            style={{
                              marginTop: "0.4rem",
                              fontFamily: "'JetBrains Mono', monospace", fontSize: "0.72rem",
                              color: "#6b7280", fontStyle: "italic",
                              background: "rgba(0,0,0,0.02)", padding: "0.35rem 0.5rem",
                              borderRadius: 3, borderLeft: "2px solid rgba(185,28,28,0.35)",
                              lineHeight: 1.45,
                            }}
                            title="Verbatim phrase caught"
                          >
                            &ldquo;{r.hits[0]}&rdquo;
                            {r.hits.length > 1 && ` +${r.hits.length - 1} more`}
                          </div>
                        )}
                      </div>
                      <span style={{ fontFamily: "'JetBrains Mono', monospace", fontSize: "0.7rem", color: "var(--ow-text-mid)", whiteSpace: "nowrap", marginTop: "0.15rem" }}>
                        {humanAgo(r.occurredAt)}
                      </span>
                    </div>
                  );
                })}
              </div>
            )}
          </div>

          <div style={{ marginTop: "1rem", fontFamily: "'Lato', sans-serif", fontSize: "0.75rem", color: "var(--ow-text-mid)", lineHeight: 1.5 }}>
            <strong>Reading this:</strong> zero hits over 30 days = the system prompt (Layer 1) is doing all the work.
            Rising counts on one source = time to tighten citation-lane rules or resynth those chunks.
            Any <span style={{ color: "#b91c1c", fontWeight: 700 }}>still-leaking</span> outcome deserves manual eyes — that&apos;s a copyright-risk answer that shipped.
          </div>
        </>
      )}
    </section>
  );
}

function MetricCard({
  testid, label, value, accent, subtitle,
}: {
  testid: string; label: string; value: string; accent: string; subtitle?: string;
}) {
  return (
    <div
      data-testid={`admin-health-${testid}`}
      style={{
        padding: "0.9rem 1.1rem",
        borderRadius: "0.5rem",
        background: "#fff",
        border: "1px solid rgba(0,0,0,0.06)",
        borderLeft: `3px solid ${accent}`,
      }}
    >
      <div style={{ fontFamily: "'Lato', sans-serif", fontSize: "0.68rem", fontWeight: 700, letterSpacing: "0.1em", textTransform: "uppercase", color: "var(--ow-text-mid)", marginBottom: "0.35rem" }}>
        {label}
      </div>
      <div style={{ fontFamily: "'Fraunces', serif", fontSize: "1.75rem", fontWeight: 600, color: accent, lineHeight: 1.1 }}>
        {value}
      </div>
      {subtitle && (
        <div style={{ fontFamily: "'JetBrains Mono', monospace", fontSize: "0.68rem", color: "var(--ow-text-mid)", marginTop: "0.2rem" }}>
          {subtitle}
        </div>
      )}
    </div>
  );
}

function Pill({ color, label, testid }: { color: string; label: string; testid: string }) {
  return (
    <span
      data-testid={`admin-health-${testid}`}
      style={{
        display: "inline-flex",
        alignItems: "center",
        gap: "0.3rem",
        fontFamily: "'JetBrains Mono', monospace",
        fontSize: "0.72rem",
        fontWeight: 700,
        letterSpacing: "0.08em",
        color: "#fff",
        background: color,
        padding: "0.35rem 0.7rem",
        borderRadius: 999,
      }}
    >
      {label}
    </span>
  );
}
