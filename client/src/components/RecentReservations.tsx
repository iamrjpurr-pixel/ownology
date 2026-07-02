/**
 * RecentReservations — admin widget on /admin/settings that surfaces
 * incoming Founding-Member reservations in real time during launch weekend.
 *
 * Why here: Sarah needs to see reservations arrive AS DMs go out so she can
 * follow up within the 24hr window promised in the reservation confirmation
 * email. This is the launch-weekend admin loop from GO_LIVE_PLAN §6.
 *
 * Data source: foundingMembers.listReservations (ownerProcedure).
 * Actions: "Mark contacted" (stamps contactedAt), "Mark paid" (converts to
 * founding member), "Mark cancelled" (soft cancel; row is retained for
 * pipeline analytics).
 */
import { useMemo, useState } from "react";
import { trpc } from "@/lib/trpc";

const STATUS_COLORS: Record<string, { bg: string; fg: string }> = {
  pending: { bg: "color-mix(in oklch, var(--ow-amber) 18%, transparent)", fg: "var(--ow-amber)" },
  contacted: { bg: "color-mix(in oklch, oklch(0.65 0.15 220) 18%, transparent)", fg: "oklch(0.65 0.15 220)" },
  paid: { bg: "color-mix(in oklch, oklch(0.60 0.15 145) 18%, transparent)", fg: "oklch(0.60 0.15 145)" },
  cancelled: { bg: "color-mix(in oklch, var(--ow-text-lo) 15%, transparent)", fg: "var(--ow-text-lo)" },
};

const TIER_LABEL: Record<string, string> = {
  cellar: "Cellar Hand",
  press: "The Press",
  cellar_master: "Vigneron",
};

function fmtRelative(ts: number): string {
  const ms = Date.now() - ts;
  const mins = Math.round(ms / 60000);
  if (mins < 1) return "just now";
  if (mins < 60) return `${mins}m ago`;
  const hrs = Math.floor(mins / 60);
  if (hrs < 24) return `${hrs}h ago`;
  const days = Math.floor(hrs / 24);
  return `${days}d ago`;
}

function fmtAbsolute(ts: number): string {
  return new Date(ts).toLocaleString(undefined, {
    month: "short",
    day: "numeric",
    hour: "numeric",
    minute: "2-digit",
  });
}

export function RecentReservations() {
  const [filter, setFilter] = useState<"all" | "pending" | "contacted" | "paid" | "cancelled">("all");
  const utils = trpc.useUtils();
  const list = trpc.foundingMembers.listReservations.useQuery(
    { limit: 100 },
    { refetchInterval: 30_000 }
  );
  const count = trpc.foundingMembers.getReservationCount.useQuery(undefined, {
    refetchInterval: 30_000,
  });
  const updateStatus = trpc.foundingMembers.updateReservationStatus.useMutation({
    onSuccess: () => {
      utils.foundingMembers.listReservations.invalidate();
      utils.foundingMembers.getReservationCount.invalidate();
    },
  });

  const rows = useMemo(() => {
    if (!list.data) return [];
    if (filter === "all") return list.data;
    return list.data.filter((r) => r.status === filter);
  }, [list.data, filter]);

  const counts = useMemo(() => {
    if (!list.data) return { all: 0, pending: 0, contacted: 0, paid: 0, cancelled: 0 };
    return list.data.reduce(
      (acc, r) => {
        acc.all += 1;
        acc[r.status as keyof typeof acc] = (acc[r.status as keyof typeof acc] ?? 0) + 1;
        return acc;
      },
      { all: 0, pending: 0, contacted: 0, paid: 0, cancelled: 0 } as Record<string, number>
    );
  }, [list.data]);

  return (
    <section
      data-testid="recent-reservations-widget"
      style={{
        background: "var(--ow-bg-card)",
        border: "1px solid var(--ow-border-md)",
        borderRadius: 8,
        padding: "1.4rem 1.4rem 1.2rem",
        marginBottom: "1.4rem",
      }}
    >
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", gap: 12, flexWrap: "wrap" }}>
        <div>
          <h2 style={{ fontFamily: "'Fraunces',serif", fontSize: "1.1rem", fontWeight: 700, margin: "0 0 0.2rem" }}>
            Recent Founding-Member reservations
          </h2>
          <p style={{ fontSize: "0.86rem", color: "var(--ow-text-mid)", margin: 0, lineHeight: 1.5 }}>
            Live pipeline — auto-refreshes every 30 seconds during launch weekend. Click a name to email; Mark contacted stamps <code>contacted_at</code> so we know follow-up speed.
          </p>
        </div>
        {count.data && (
          <div data-testid="recent-reservations-total" style={{ textAlign: "right", fontFamily: "'Fira Code',monospace", fontSize: "0.86rem", color: "var(--ow-amber)" }}>
            <div style={{ fontSize: "1.6rem", fontWeight: 700, lineHeight: 1 }}>
              {count.data.total}
              <span style={{ color: "var(--ow-text-lo)", fontSize: "0.86rem" }}> / {count.data.cap}</span>
            </div>
            <div style={{ fontSize: "0.66rem", color: "var(--ow-text-lo)", letterSpacing: "0.08em", textTransform: "uppercase", marginTop: 2 }}>
              slots claimed
            </div>
          </div>
        )}
      </div>

      {/* Filter chips */}
      <div style={{ display: "flex", gap: 6, flexWrap: "wrap", marginTop: 14, marginBottom: 10 }}>
        {(["all", "pending", "contacted", "paid", "cancelled"] as const).map((f) => {
          const active = filter === f;
          return (
            <button
              key={f}
              type="button"
              data-testid={`reservation-filter-${f}`}
              onClick={() => setFilter(f)}
              style={{
                background: active ? "color-mix(in oklch, var(--ow-amber) 14%, transparent)" : "transparent",
                border: active ? "1.5px solid var(--ow-amber)" : "1px solid var(--ow-border-md)",
                color: active ? "var(--ow-amber)" : "var(--ow-text-mid)",
                padding: "0.32rem 0.7rem",
                borderRadius: 4,
                fontSize: "0.75rem",
                fontFamily: "'Lato',sans-serif",
                fontWeight: 600,
                textTransform: "uppercase",
                letterSpacing: "0.04em",
                cursor: "pointer",
              }}
            >
              {f} <span style={{ opacity: 0.55, marginLeft: 4 }}>{counts[f] ?? 0}</span>
            </button>
          );
        })}
      </div>

      {list.isLoading && (
        <div style={{ fontSize: "0.86rem", color: "var(--ow-text-lo)", padding: "1rem 0" }}>Loading…</div>
      )}

      {list.data && rows.length === 0 && (
        <div data-testid="recent-reservations-empty" style={{ fontSize: "0.86rem", color: "var(--ow-text-lo)", padding: "1.2rem 0", textAlign: "center" }}>
          {filter === "all"
            ? "No reservations yet. When your first warm-list DM lands, they'll appear here."
            : `No ${filter} reservations.`}
        </div>
      )}

      {rows.length > 0 && (
        <div
          data-testid="recent-reservations-list"
          style={{ display: "flex", flexDirection: "column", gap: 6, marginTop: 8 }}
        >
          {rows.map((r) => {
            const c = STATUS_COLORS[r.status] ?? STATUS_COLORS.pending;
            return (
              <div
                key={r.id}
                data-testid={`reservation-row-${r.id}`}
                style={{
                  display: "grid",
                  gridTemplateColumns: "40px 1.5fr 1fr auto",
                  gap: 10,
                  alignItems: "center",
                  padding: "0.65rem 0.75rem",
                  background: "color-mix(in oklch, var(--ow-bg-base) 60%, transparent)",
                  border: "1px solid var(--ow-border-md)",
                  borderRadius: 6,
                  fontSize: "0.82rem",
                }}
              >
                {/* Slot # */}
                <div
                  style={{
                    fontFamily: "'Fira Code',monospace",
                    fontSize: "0.78rem",
                    color: "var(--ow-amber)",
                    fontWeight: 700,
                    textAlign: "center",
                  }}
                >
                  #{r.id}
                </div>

                {/* Name + winery */}
                <div style={{ minWidth: 0 }}>
                  <div style={{ display: "flex", alignItems: "center", gap: 8, flexWrap: "wrap" }}>
                    <a
                      href={`mailto:${r.email}?subject=Ownology Founding Member`}
                      style={{
                        color: "var(--ow-text-hi)",
                        textDecoration: "none",
                        fontWeight: 600,
                        borderBottom: "1px dashed color-mix(in oklch, var(--ow-amber) 45%, transparent)",
                      }}
                    >
                      {r.name}
                    </a>
                    <span
                      style={{
                        fontSize: "0.66rem",
                        padding: "0.15rem 0.45rem",
                        borderRadius: 3,
                        background: c.bg,
                        color: c.fg,
                        fontWeight: 700,
                        textTransform: "uppercase",
                        letterSpacing: "0.06em",
                      }}
                    >
                      {r.status}
                    </span>
                  </div>
                  <div style={{ fontSize: "0.74rem", color: "var(--ow-text-mid)", marginTop: 2, whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis" }}>
                    {r.wineryName} · {TIER_LABEL[r.tier] ?? r.tier} · {r.cycle}
                    {r.phone ? <span style={{ color: "var(--ow-text-lo)" }}> · <a href={`tel:${r.phone}`} style={{ color: "var(--ow-text-lo)" }}>{r.phone}</a></span> : null}
                  </div>
                </div>

                {/* Reserved timestamp */}
                <div style={{ fontSize: "0.72rem", color: "var(--ow-text-lo)", textAlign: "right" }}>
                  <div title={fmtAbsolute(r.reservedAt)}>{fmtRelative(r.reservedAt)}</div>
                  {r.contactedAt ? (
                    <div style={{ fontSize: "0.66rem", color: "oklch(0.65 0.15 220)", marginTop: 2 }}>
                      contacted {fmtRelative(r.contactedAt)}
                    </div>
                  ) : null}
                </div>

                {/* Actions */}
                <div style={{ display: "flex", gap: 4, flexWrap: "wrap", justifyContent: "flex-end" }}>
                  {r.status === "pending" && (
                    <button
                      data-testid={`reservation-mark-contacted-${r.id}`}
                      type="button"
                      onClick={() => updateStatus.mutate({ id: r.id, status: "contacted" })}
                      disabled={updateStatus.isPending}
                      style={actionBtnStyle("oklch(0.65 0.15 220)")}
                    >
                      Mark contacted
                    </button>
                  )}
                  {(r.status === "pending" || r.status === "contacted") && (
                    <button
                      data-testid={`reservation-mark-paid-${r.id}`}
                      type="button"
                      onClick={() => {
                        if (!confirm(`Mark ${r.name} as PAID? They should be a real founding member now.`)) return;
                        updateStatus.mutate({ id: r.id, status: "paid" });
                      }}
                      disabled={updateStatus.isPending}
                      style={actionBtnStyle("oklch(0.60 0.15 145)")}
                    >
                      Mark paid
                    </button>
                  )}
                  {r.status !== "cancelled" && r.status !== "paid" && (
                    <button
                      data-testid={`reservation-mark-cancelled-${r.id}`}
                      type="button"
                      onClick={() => {
                        if (!confirm(`Cancel ${r.name}'s reservation? Row is retained for pipeline analytics.`)) return;
                        updateStatus.mutate({ id: r.id, status: "cancelled" });
                      }}
                      disabled={updateStatus.isPending}
                      style={actionBtnStyle("var(--ow-text-lo)")}
                    >
                      Cancel
                    </button>
                  )}
                </div>
              </div>
            );
          })}
        </div>
      )}

      {list.data && list.data.length >= 100 && (
        <p style={{ fontSize: "0.72rem", color: "var(--ow-text-lo)", marginTop: 10, textAlign: "center" }}>
          Showing most recent 100. Older reservations live in the DB.
        </p>
      )}
    </section>
  );
}

function actionBtnStyle(color: string): React.CSSProperties {
  return {
    background: "transparent",
    border: `1px solid color-mix(in oklch, ${color} 40%, transparent)`,
    color,
    fontSize: "0.7rem",
    fontFamily: "'Lato',sans-serif",
    fontWeight: 700,
    padding: "0.28rem 0.55rem",
    borderRadius: 3,
    cursor: "pointer",
    letterSpacing: "0.04em",
    textTransform: "uppercase",
    whiteSpace: "nowrap",
  };
}
