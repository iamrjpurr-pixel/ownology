/**
 * /admin/marketing-ops — daily + weekly marketing ritual dashboard.
 *
 * Reads current season + day-of-week + funnel state, then tells the operator
 * exactly what to do today. Five zones (top → bottom):
 *   1. Season strip — season label + cold-outreach gate colour
 *   2. AI Coach — one sentence, cached daily, refreshable
 *   3. Today's focus — daily + today's weekly tasks, tick / undo
 *   4. Weekly rhythm — 7-column board for the whole ISO week
 *   5. Wins — streak, done-today, rolling 7d sent/replied/booked/reply-rate
 *
 * Backend: server/routers/marketingOps.ts (Australia/Adelaide timezone).
 */
import { useMemo } from "react";
import { Link } from "wouter";
import { trpc } from "@/lib/trpc";

const SERIF = "'Fraunces',serif";
const SANS = "'Lato',sans-serif";

// ── Colour tokens ─────────────────────────────────────────────────────────
const HI = "var(--ow-text-hi)";
const MID = "var(--ow-text-mid)";
const LO = "var(--ow-text-lo)";
const CARD = "var(--ow-bg-card)";
const BORDER = "var(--ow-border)";
const AMBER = "var(--ow-amber)";

const COLD_GATE_COLOR: Record<string, { fg: string; bg: string; label: string }> = {
  peak: { fg: "#052e16", bg: "#bbf7d0", label: "Peak send window" },
  ok: { fg: "#78350f", bg: "#fde68a", label: "OK to send" },
  avoid: { fg: "#7c2d12", bg: "#fed7aa", label: "Avoid cold" },
  pause: { fg: "#7f1d1d", bg: "#fecaca", label: "Pause cold outreach" },
};

const CATEGORY_META: Record<string, { label: string; color: string }> = {
  warm_reach: { label: "Warm reach", color: "#a16207" },
  pipeline: { label: "Pipeline", color: "#0369a1" },
  cold_reach: { label: "Cold reach", color: "#9333ea" },
  content: { label: "Content", color: "#0d9488" },
  review: { label: "Review", color: "#4b5563" },
  product: { label: "Product", color: "#059669" },
};

const DAY_NAMES = ["Mon", "Tue", "Wed", "Thu", "Fri", "Sat", "Sun"];

// ── Small presentational bits ─────────────────────────────────────────────
function Chip({
  children,
  bg,
  fg,
  testid,
}: {
  children: React.ReactNode;
  bg?: string;
  fg?: string;
  testid?: string;
}) {
  return (
    <span
      data-testid={testid}
      style={{
        fontFamily: SANS,
        fontSize: "0.66rem",
        letterSpacing: "0.06em",
        textTransform: "uppercase",
        padding: "3px 8px",
        borderRadius: 999,
        background: bg ?? "transparent",
        color: fg ?? MID,
        border: bg ? "none" : `1px solid ${BORDER}`,
      }}
    >
      {children}
    </span>
  );
}

function Kpi({ label, value, sub }: { label: string; value: string | number; sub?: string }) {
  return (
    <div
      style={{
        background: CARD,
        border: `1px solid ${BORDER}`,
        borderRadius: 10,
        padding: "14px 16px",
        minWidth: 120,
      }}
    >
      <div style={{ fontFamily: SANS, fontSize: "0.68rem", color: LO, letterSpacing: "0.08em", textTransform: "uppercase" }}>
        {label}
      </div>
      <div style={{ fontFamily: SERIF, fontSize: "1.8rem", color: HI, marginTop: 4, lineHeight: 1 }}>{value}</div>
      {sub ? (
        <div style={{ fontFamily: SANS, fontSize: "0.72rem", color: MID, marginTop: 4 }}>{sub}</div>
      ) : null}
    </div>
  );
}

// ── Page ──────────────────────────────────────────────────────────────────
export default function AdminMarketingOps() {
  const utils = trpc.useUtils();
  const todayQ = trpc.marketingOps.today.useQuery(undefined, { refetchOnWindowFocus: true });
  const coachQ = trpc.marketingOps.coachLine.useQuery(undefined, { refetchOnWindowFocus: false });
  const winsQ = trpc.marketingOps.wins.useQuery(undefined, { refetchOnWindowFocus: true });

  const completeMut = trpc.marketingOps.complete.useMutation({
    onSuccess: () => {
      utils.marketingOps.today.invalidate();
      utils.marketingOps.wins.invalidate();
    },
  });
  const uncompleteMut = trpc.marketingOps.uncomplete.useMutation({
    onSuccess: () => {
      utils.marketingOps.today.invalidate();
      utils.marketingOps.wins.invalidate();
    },
  });

  const isLoading = todayQ.isLoading;
  const today = todayQ.data;
  const coach = coachQ.data;
  const wins = winsQ.data;

  const seasonColor = today ? COLD_GATE_COLOR[today.season.coldGate] : COLD_GATE_COLOR.ok;
  const dayLabel = useMemo(() => {
    if (!today) return "";
    return DAY_NAMES[today.dow] ?? "";
  }, [today]);

  return (
    <div data-testid="admin-marketing-ops-page" className="container py-8" style={{ maxWidth: 1200 }}>
      <Link
        href="/admin"
        style={{ fontFamily: SANS, fontSize: "0.78rem", color: LO, letterSpacing: "0.05em" }}
        data-testid="marketing-ops-back-link"
      >
        ← Back to admin
      </Link>
      <p className="text-xs uppercase tracking-widest mt-3" style={{ color: AMBER, fontFamily: SANS }}>
        Ownology · Marketing Ops
      </p>
      <h1 style={{ fontFamily: SERIF, fontSize: "2.1rem", color: HI, margin: "8px 0 6px" }}>
        Today&apos;s marketing ritual
      </h1>
      <p style={{ fontFamily: SANS, color: MID, fontSize: "0.92rem", maxWidth: 720 }}>
        A daily coach that reads the season, the day of the week, and your current pipeline —
        then tells you exactly what to focus on. Tick tasks as you go; the AI Coach line is
        cached daily so you&apos;re not burning tokens on every refresh.
      </p>

      {isLoading ? (
        <p style={{ marginTop: 32, color: LO, fontFamily: SANS }} data-testid="marketing-ops-loading">
          Loading today&apos;s ritual…
        </p>
      ) : !today ? (
        <p style={{ marginTop: 32, color: "#b91c1c", fontFamily: SANS }} data-testid="marketing-ops-error">
          Couldn&apos;t load today&apos;s tasks. Check the backend is up.
        </p>
      ) : (
        <>
          {/* Zone 1 — Season strip */}
          <section
            data-testid="marketing-ops-season-strip"
            style={{
              marginTop: 24,
              padding: "16px 20px",
              borderRadius: 12,
              background: seasonColor.bg,
              color: seasonColor.fg,
              display: "flex",
              flexWrap: "wrap",
              alignItems: "center",
              gap: 16,
            }}
          >
            <div style={{ fontFamily: SERIF, fontSize: "1.25rem", fontWeight: 600 }}>
              {today.season.label}
            </div>
            <Chip bg="rgba(0,0,0,0.12)" fg={seasonColor.fg} testid="marketing-ops-cold-gate">
              {seasonColor.label}
            </Chip>
            <div style={{ fontFamily: SANS, fontSize: "0.85rem", marginLeft: "auto" }}>
              {dayLabel} · {String(today.hour).padStart(2, "0")}:00 Adelaide · {today.today}
            </div>
          </section>

          {/* Zone 2 — AI Coach */}
          <section
            data-testid="marketing-ops-coach"
            style={{
              marginTop: 20,
              padding: "18px 20px",
              borderRadius: 12,
              background: CARD,
              border: `1px solid ${BORDER}`,
              display: "flex",
              alignItems: "flex-start",
              gap: 16,
            }}
          >
            <div style={{ fontSize: "1.4rem", lineHeight: 1 }} aria-hidden>
              🎙
            </div>
            <div style={{ flex: 1 }}>
              <div style={{ fontFamily: SANS, fontSize: "0.68rem", letterSpacing: "0.08em", textTransform: "uppercase", color: LO }}>
                AI Coach — one line, today
              </div>
              <p
                data-testid="marketing-ops-coach-line"
                style={{ fontFamily: SERIF, fontSize: "1.15rem", color: HI, marginTop: 6, lineHeight: 1.4 }}
              >
                {coachQ.isLoading ? "Thinking…" : coach?.line ?? "No coach line yet."}
              </p>
              <div style={{ marginTop: 8, display: "flex", gap: 8, alignItems: "center" }}>
                {coach?.cached ? (
                  <Chip fg={LO} testid="coach-cached-chip">Cached · once per day</Chip>
                ) : coach ? (
                  <Chip bg="#fef3c7" fg="#78350f" testid="coach-fresh-chip">Fresh</Chip>
                ) : null}
                <button
                  type="button"
                  data-testid="marketing-ops-coach-refresh"
                  onClick={() => coachQ.refetch()}
                  disabled={coachQ.isFetching}
                  style={{
                    fontFamily: SANS,
                    fontSize: "0.75rem",
                    color: MID,
                    background: "transparent",
                    border: `1px solid ${BORDER}`,
                    borderRadius: 999,
                    padding: "3px 10px",
                    cursor: coachQ.isFetching ? "wait" : "pointer",
                  }}
                >
                  {coachQ.isFetching ? "Refreshing…" : "↻ Refresh"}
                </button>
              </div>
            </div>
          </section>

          {/* Zone 5 (top-of-fold) — Wins strip */}
          <section
            data-testid="marketing-ops-wins"
            style={{
              marginTop: 20,
              display: "grid",
              gridTemplateColumns: "repeat(auto-fit, minmax(140px, 1fr))",
              gap: 12,
            }}
          >
            <Kpi
              label="Streak"
              value={`${today.streak} ${today.streak === 1 ? "day" : "days"}`}
              sub="Consecutive days ≥1 task done"
            />
            <Kpi label="Done today" value={`${today.doneTodayCount} / ${today.totalTodayCount}`} sub={dayLabel} />
            <Kpi
              label="7d sent"
              value={wins?.sevenDay?.sent ?? 0}
              sub={`${wins?.sevenDay?.replied ?? 0} replied`}
            />
            <Kpi
              label="Reply rate"
              value={wins ? `${wins.sevenDay.replyRatePct}%` : "—"}
              sub="Rolling 7 days"
            />
            <Kpi label="Booked (7d)" value={wins?.sevenDay?.booked ?? 0} sub="Demos" />
          </section>

          {/* Zone 3 — Today's focus */}
          <section style={{ marginTop: 28 }} data-testid="marketing-ops-today-focus">
            <h2 style={{ fontFamily: SERIF, fontSize: "1.3rem", color: HI, margin: "0 0 12px" }}>
              Today&apos;s focus
            </h2>
            {today.tasks.length === 0 ? (
              <p style={{ fontFamily: SANS, color: MID }}>Nothing scheduled for today — enjoy the quiet.</p>
            ) : (
              <ul style={{ listStyle: "none", padding: 0, margin: 0, display: "flex", flexDirection: "column", gap: 10 }}>
                {today.tasks.map((t) => {
                  const cat = CATEGORY_META[t.category] ?? { label: t.category, color: MID };
                  const blocked = t.blocked;
                  const done = t.done;
                  return (
                    <li
                      key={t.slug}
                      data-testid={`task-row-${t.slug}`}
                      style={{
                        display: "flex",
                        alignItems: "flex-start",
                        gap: 12,
                        padding: "12px 14px",
                        borderRadius: 10,
                        background: CARD,
                        border: `1px solid ${done ? "#a7f3d0" : BORDER}`,
                        opacity: blocked && !done ? 0.55 : 1,
                      }}
                    >
                      <button
                        type="button"
                        data-testid={`task-toggle-${t.slug}`}
                        disabled={blocked && !done ? true : completeMut.isPending || uncompleteMut.isPending}
                        onClick={() =>
                          done
                            ? uncompleteMut.mutate({ slug: t.slug })
                            : completeMut.mutate({ slug: t.slug })
                        }
                        style={{
                          flex: "0 0 auto",
                          width: 22,
                          height: 22,
                          borderRadius: 6,
                          border: `1.5px solid ${done ? "#059669" : BORDER}`,
                          background: done ? "#059669" : "transparent",
                          color: "#fff",
                          fontSize: "0.9rem",
                          cursor: blocked && !done ? "not-allowed" : "pointer",
                          lineHeight: 1,
                          marginTop: 2,
                        }}
                        aria-label={done ? "Mark undone" : "Mark done"}
                      >
                        {done ? "✓" : ""}
                      </button>
                      <div style={{ flex: 1, minWidth: 0 }}>
                        <div style={{ display: "flex", alignItems: "center", gap: 8, flexWrap: "wrap" }}>
                          <span
                            style={{
                              fontFamily: SERIF,
                              fontSize: "1rem",
                              color: HI,
                              textDecoration: done ? "line-through" : "none",
                            }}
                          >
                            {t.title}
                          </span>
                          <Chip bg="#f3f4f6" fg={cat.color}>{cat.label}</Chip>
                          <Chip fg={LO}>{t.cadence === "daily" ? "Daily" : "Weekly"}</Chip>
                          <Chip fg={LO}>⏱ {t.estimateMin} min</Chip>
                          {t.timeHint ? <Chip fg={LO}>🕒 {t.timeHint}</Chip> : null}
                          {blocked ? (
                            <Chip bg="#fee2e2" fg="#7f1d1d">Blocked — off-season</Chip>
                          ) : null}
                        </div>
                        <p style={{ fontFamily: SANS, fontSize: "0.85rem", color: MID, margin: "6px 0 0" }}>
                          {t.why}
                        </p>
                        {t.quickLink ? (
                          <Link
                            href={t.quickLink}
                            data-testid={`task-quicklink-${t.slug}`}
                            style={{
                              fontFamily: SANS,
                              fontSize: "0.78rem",
                              color: AMBER,
                              marginTop: 6,
                              display: "inline-block",
                            }}
                          >
                            {t.quickLink} →
                          </Link>
                        ) : null}
                      </div>
                    </li>
                  );
                })}
              </ul>
            )}
          </section>

          {/* Zone 4 — Weekly rhythm board */}
          <section style={{ marginTop: 32 }} data-testid="marketing-ops-weekly-board">
            <h2 style={{ fontFamily: SERIF, fontSize: "1.3rem", color: HI, margin: "0 0 12px" }}>
              This week&apos;s rhythm
            </h2>
            <div
              style={{
                display: "grid",
                gridTemplateColumns: "repeat(7, minmax(0, 1fr))",
                gap: 8,
              }}
            >
              {today.weeklyBoard.map((col) => {
                const isToday = col.dow === today.dow;
                return (
                  <div
                    key={col.dow}
                    data-testid={`weekly-col-${col.day.toLowerCase()}`}
                    style={{
                      background: CARD,
                      border: `1px solid ${isToday ? AMBER : BORDER}`,
                      borderRadius: 10,
                      padding: "10px 10px 12px",
                      minHeight: 120,
                    }}
                  >
                    <div
                      style={{
                        fontFamily: SANS,
                        fontSize: "0.68rem",
                        letterSpacing: "0.08em",
                        textTransform: "uppercase",
                        color: isToday ? AMBER : LO,
                        marginBottom: 6,
                        fontWeight: isToday ? 700 : 500,
                      }}
                    >
                      {col.day}
                      {isToday ? " · today" : ""}
                    </div>
                    {col.tasks.length === 0 ? (
                      <div style={{ fontFamily: SANS, fontSize: "0.7rem", color: LO, fontStyle: "italic" }}>—</div>
                    ) : (
                      <ul style={{ listStyle: "none", padding: 0, margin: 0, display: "flex", flexDirection: "column", gap: 6 }}>
                        {col.tasks.map((t) => (
                          <li
                            key={t.slug}
                            style={{
                              fontFamily: SANS,
                              fontSize: "0.75rem",
                              color: t.done ? "#059669" : t.blocked ? LO : MID,
                              display: "flex",
                              gap: 4,
                              alignItems: "flex-start",
                              lineHeight: 1.3,
                              opacity: t.blocked && !t.done ? 0.6 : 1,
                            }}
                          >
                            <span aria-hidden style={{ flex: "0 0 auto" }}>
                              {t.done ? "✓" : t.blocked ? "⊘" : "·"}
                            </span>
                            <span style={{ textDecoration: t.done ? "line-through" : "none" }}>{t.title}</span>
                          </li>
                        ))}
                      </ul>
                    )}
                  </div>
                );
              })}
            </div>
            <p style={{ fontFamily: SANS, fontSize: "0.75rem", color: LO, marginTop: 10 }}>
              Weekly tasks reset each ISO week. Off-season tasks show as ⊘ blocked with an amber banner in the season strip.
            </p>
          </section>

          {/* Footer tip */}
          <p style={{ marginTop: 28, fontFamily: SANS, fontSize: "0.75rem", color: LO }}>
            Yesterday you completed {wins?.yesterdayDone ?? 0}{" "}
            {wins?.yesterdayDone === 1 ? "task" : "tasks"}. Coach line is Claude Sonnet via the Emergent LLM Key, cached once per Adelaide calendar day.
          </p>
        </>
      )}
    </div>
  );
}
