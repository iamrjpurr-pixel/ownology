/**
 * AdminWeeklyDigest — private preview + send surface for the Monday
 * Cellar Digest. Renders THIS week's compute (tasks / temp outliers /
 * pipeline / vessel cards) exactly as the Monday cron will and lets
 * the admin send a copy to their own inbox before the cron takes over.
 *
 * Jul 2026 — Rich asked for "the Monday-morning email that summarises
 * the week's cellar tasks, temperature outliers and pipeline moves so
 * founding members feel a heartbeat every seven days" and confirmed the
 * preview + Send Now default.
 */

import { useState } from "react";
import { trpc } from "@/lib/trpc";

// Brand tokens re-used from AdminEnvironment.tsx for visual consistency.
const CARD = "var(--ow-bg-card)";
const RAISED = "var(--ow-bg-raised)";
const BORDER = "var(--ow-border-hi)";
const HI = "var(--ow-text-hi)";
const MID = "var(--ow-text-mid)";
const LO = "var(--ow-text-lo)";
const AMBER = "var(--ow-amber)";
const SANS = "'Lato', system-ui, sans-serif";
const SERIF = "'Fraunces', 'Cormorant Garamond', serif";
const MONO = "ui-monospace, 'SF Mono', Menlo, monospace";

const STATUS_COLOR: Record<"ok" | "watch" | "attention", string> = {
  ok: "oklch(0.65 0.14 145)",
  watch: "oklch(0.68 0.14 75)",
  attention: "oklch(0.60 0.20 25)",
};
const STATUS_LABEL: Record<"ok" | "watch" | "attention", string> = {
  ok: "Steady",
  watch: "Watch",
  attention: "Attention",
};

export default function AdminWeeklyDigest() {
  const preview = trpc.weeklyDigest.preview.useQuery();
  const sendNow = trpc.weeklyDigest.sendNow.useMutation();
  const [sendResult, setSendResult] = useState<null | {
    status: string;
    recipient?: string;
    subject?: string;
    resendId?: string | null;
    error?: string;
  }>(null);

  const p = preview.data;

  const doSend = () => {
    setSendResult(null);
    sendNow.mutate(undefined, {
      onSuccess: (r) => setSendResult(r),
      onError: (e) => setSendResult({ status: "error", error: e.message }),
    });
  };

  return (
    <div style={{ minHeight: "100vh", background: "var(--ow-bg-primary)", padding: "2rem 1rem" }}>
      <div style={{ maxWidth: 960, margin: "0 auto" }}>
        <header style={{ marginBottom: "1.5rem" }}>
          <div style={{ fontFamily: SANS, fontSize: "0.7rem", letterSpacing: "0.14em", textTransform: "uppercase", color: AMBER, fontWeight: 700 }}>
            Admin · Cellar heartbeat
          </div>
          <h1 style={{ fontFamily: SERIF, fontSize: "2rem", fontWeight: 600, color: HI, margin: "0.35rem 0 0.4rem", lineHeight: 1.15 }}>
            Weekly Cellar Digest
          </h1>
          <p style={{ fontFamily: SANS, fontSize: "0.9rem", color: MID, margin: 0, lineHeight: 1.55 }}>
            Monday 07:00 Australia/Sydney — Owen emails you (and eventually every founding member) a snapshot of the week&apos;s cellar tasks, temperature outliers, and pipeline moves.
            This page previews THIS week&apos;s send and lets you fire it manually.
          </p>
        </header>

        {preview.isLoading && (
          <div style={cardStyle} data-testid="weekly-digest-loading">
            <p style={{ fontFamily: SANS, fontSize: "0.9rem", color: MID }}>Computing this week&apos;s digest…</p>
          </div>
        )}
        {preview.error && (
          <div style={cardStyle} data-testid="weekly-digest-error">
            <p style={{ fontFamily: SANS, fontSize: "0.9rem", color: "oklch(0.65 0.20 25)" }}>
              Preview failed: {preview.error.message}
            </p>
          </div>
        )}

        {p && (
          <>
            {/* Header card — recipient + subject */}
            <div style={cardStyle} data-testid="weekly-digest-header">
              <div style={{ display: "flex", flexWrap: "wrap", gap: "1.25rem", alignItems: "flex-start", justifyContent: "space-between" }}>
                <div style={{ flex: "1 1 320px" }}>
                  <div style={{ fontFamily: SANS, fontSize: "0.65rem", letterSpacing: "0.14em", textTransform: "uppercase", color: AMBER, fontWeight: 700 }}>
                    Subject line
                  </div>
                  <div style={{ fontFamily: SERIF, fontSize: "1.2rem", color: HI, marginTop: "0.35rem", lineHeight: 1.35 }} data-testid="weekly-digest-subject">
                    {p.subject}
                  </div>
                  <div style={{ fontFamily: SANS, fontSize: "0.82rem", color: MID, marginTop: "0.55rem", lineHeight: 1.5 }}>
                    <span style={{ color: LO }}>To:</span> <strong style={{ color: HI }}>{p.recipient ?? "(no email on your account)"}</strong>
                    {p.wineryName && <> · <span style={{ color: LO }}>from</span> <em>Owen · {p.wineryName}</em></>}
                  </div>
                </div>
                <div style={{ display: "flex", gap: "0.6rem", flexWrap: "wrap" }}>
                  <button
                    data-testid="weekly-digest-send-now"
                    onClick={doSend}
                    disabled={!p.willSend || sendNow.isPending}
                    style={{
                      background: AMBER,
                      color: "oklch(0.12 0.008 60)",
                      border: 0,
                      padding: "0.65rem 1.4rem",
                      borderRadius: 4,
                      fontFamily: SANS,
                      fontWeight: 700,
                      fontSize: "0.9rem",
                      cursor: p.willSend && !sendNow.isPending ? "pointer" : "not-allowed",
                      opacity: p.willSend ? 1 : 0.5,
                    }}
                  >
                    {sendNow.isPending ? "Sending…" : "Send now →"}
                  </button>
                </div>
              </div>
              {sendResult && (
                <div
                  data-testid="weekly-digest-send-result"
                  style={{
                    marginTop: "0.9rem",
                    padding: "0.65rem 0.9rem",
                    borderRadius: 4,
                    fontFamily: SANS,
                    fontSize: "0.85rem",
                    background:
                      sendResult.status === "sent"
                        ? "color-mix(in oklch, oklch(0.65 0.14 145) 12%, transparent)"
                        : sendResult.status === "dry_run"
                        ? "color-mix(in oklch, var(--ow-amber) 12%, transparent)"
                        : "color-mix(in oklch, oklch(0.60 0.20 25) 12%, transparent)",
                    color: HI,
                    border: `1px solid ${
                      sendResult.status === "sent"
                        ? "oklch(0.65 0.14 145)"
                        : sendResult.status === "dry_run"
                        ? AMBER
                        : "oklch(0.60 0.20 25)"
                    }`,
                  }}
                >
                  {sendResult.status === "sent" && (
                    <>
                      Sent to <strong>{sendResult.recipient}</strong>. Resend id{" "}
                      <code style={{ fontFamily: MONO, fontSize: "0.8em" }}>{sendResult.resendId ?? "(none)"}</code>
                    </>
                  )}
                  {sendResult.status === "dry_run" && <>Dry-run — RESEND_API_KEY missing. Would have sent &quot;{sendResult.subject}&quot; to {sendResult.recipient}.</>}
                  {sendResult.status === "empty_cellar" && <>Skipped — no cellar cards for this winery this week.</>}
                  {sendResult.status === "no_recipient" && <>Skipped — your account has no email address on file.</>}
                  {sendResult.status === "error" && <>Send failed: {sendResult.error ?? "(no error message)"}</>}
                </div>
              )}
            </div>

            {/* Stat strip */}
            <div style={statStripStyle} data-testid="weekly-digest-stats">
              <Stat label="Vessels tracked" value={p.cards.length} sub={`${p.counts.attention} attn · ${p.counts.watch} watch · ${p.counts.ok} steady`} />
              <Stat
                label="Tasks this week"
                value={p.enrichments.tasks.completedThisWeek + p.enrichments.tasks.newThisWeek}
                sub={`${p.enrichments.tasks.completedThisWeek} done · ${p.enrichments.tasks.newThisWeek} new · ${p.enrichments.tasks.overdue} overdue`}
              />
              <Stat
                label="Temp outliers · past 7d"
                value={p.enrichments.tempOutliers.length}
                sub={p.enrichments.tempOutliers.length === 0 ? "No breaches" : `Latest ${p.enrichments.tempOutliers[0].dayLabel}`}
              />
              <Stat
                label="Pipeline"
                value={p.enrichments.pipeline.newContacts + p.enrichments.pipeline.firstViews + p.enrichments.pipeline.replies + p.enrichments.pipeline.demosBooked}
                sub={`${p.enrichments.pipeline.newContacts} new · ${p.enrichments.pipeline.firstViews} opens · ${p.enrichments.pipeline.replies} replies`}
              />
            </div>

            {/* Vessel cards */}
            {p.cards.length > 0 && (
              <div style={cardStyle} data-testid="weekly-digest-vessels">
                <SectionTitle>Vessels · Monday snapshot</SectionTitle>
                <div style={{ display: "grid", gap: "0.4rem" }}>
                  {p.cards.slice(0, 8).map((c) => (
                    <div key={c.vesselId} style={{ display: "flex", gap: "0.7rem", alignItems: "center", padding: "0.4rem 0", borderBottom: `1px dashed ${BORDER}` }}>
                      <div style={{ width: 10, height: 10, borderRadius: 999, background: STATUS_COLOR[c.status] }} />
                      <div style={{ flex: 1, fontFamily: SANS, fontSize: "0.9rem", color: HI }}>
                        <strong>{c.vesselId}</strong>{" "}
                        <span style={{ color: LO }}>{c.variety}</span>
                      </div>
                      <div style={{ fontFamily: SANS, fontSize: "0.78rem", color: MID }}>
                        {c.stageLabel ?? c.stage}
                        {c.daysInStage != null && <> · day {c.daysInStage}</>}
                      </div>
                      <div style={{ fontFamily: SANS, fontSize: "0.7rem", fontWeight: 700, textTransform: "uppercase", letterSpacing: "0.08em", color: STATUS_COLOR[c.status], minWidth: 76, textAlign: "right" }}>
                        {STATUS_LABEL[c.status]}
                      </div>
                    </div>
                  ))}
                  {p.cards.length > 8 && (
                    <div style={{ fontFamily: SANS, fontSize: "0.78rem", color: LO, fontStyle: "italic", padding: "0.35rem 0" }}>
                      … and {p.cards.length - 8} more in the full brief.
                    </div>
                  )}
                </div>
              </div>
            )}

            {/* Enrichments */}
            <div style={cardStyle} data-testid="weekly-digest-enrichments">
              <SectionTitle>Cellar tasks · this week</SectionTitle>
              <div style={{ fontFamily: SANS, fontSize: "0.9rem", color: HI, lineHeight: 1.6 }}>
                <strong style={{ color: STATUS_COLOR.ok }}>{p.enrichments.tasks.completedThisWeek}</strong> completed ·{" "}
                <strong>{p.enrichments.tasks.newThisWeek}</strong> new ·{" "}
                {p.enrichments.tasks.overdue > 0 && (
                  <><strong style={{ color: STATUS_COLOR.attention }}>{p.enrichments.tasks.overdue}</strong> overdue · </>
                )}
                <strong style={{ color: STATUS_COLOR.watch }}>{p.enrichments.tasks.dueNextWeek}</strong> due next 7 days
              </div>
              {p.enrichments.tasks.recentCompletions.length > 0 && (
                <ul style={{ margin: "0.6rem 0 0", padding: 0, listStyle: "none" }}>
                  {p.enrichments.tasks.recentCompletions.map((c) => (
                    <li key={c.id} style={{ fontFamily: SANS, fontSize: "0.82rem", color: MID, padding: "0.15rem 0" }}>
                      ✓ <strong style={{ color: HI }}>{c.title}</strong> — {c.equipmentName}
                      {c.completedBy && <span style={{ color: LO }}> (by {c.completedBy})</span>}
                    </li>
                  ))}
                </ul>
              )}

              <SectionTitle style={{ marginTop: "1.5rem" }}>Temperature &amp; humidity outliers</SectionTitle>
              {p.enrichments.tempOutliers.length === 0 ? (
                <p style={{ fontFamily: SANS, fontSize: "0.85rem", color: MID, margin: 0 }}>
                  No threshold breaches in the last 7 days. Thresholds saved on{" "}
                  <a href="/admin/environment" style={{ color: AMBER }}>/admin/environment</a>.
                </p>
              ) : (
                <ul style={{ margin: 0, padding: 0, listStyle: "none" }}>
                  {p.enrichments.tempOutliers.map((o) => {
                    const color = o.kind === "humidity_high" || o.kind === "temp_high" ? STATUS_COLOR.attention : STATUS_COLOR.watch;
                    return (
                      <li key={`${o.date}-${o.kind}`} style={{ fontFamily: SANS, fontSize: "0.85rem", color: HI, padding: "0.25rem 0", borderBottom: `1px dashed ${BORDER}`, lineHeight: 1.55 }}>
                        <span style={{ display: "inline-block", width: 8, height: 8, borderRadius: 999, background: color, marginRight: "0.5rem" }} />
                        {o.label}
                      </li>
                    );
                  })}
                </ul>
              )}

              <SectionTitle style={{ marginTop: "1.5rem" }}>Pipeline moves · outreach</SectionTitle>
              <div style={{ fontFamily: SANS, fontSize: "0.9rem", color: HI, lineHeight: 1.6 }}>
                <strong>{p.enrichments.pipeline.newContacts}</strong> new ·{" "}
                <strong style={{ color: STATUS_COLOR.ok }}>{p.enrichments.pipeline.firstViews}</strong> first opens ·{" "}
                <strong style={{ color: AMBER }}>{p.enrichments.pipeline.replies}</strong> replies
                {p.enrichments.pipeline.demosBooked > 0 && <> · <strong style={{ color: STATUS_COLOR.ok }}>{p.enrichments.pipeline.demosBooked}</strong> demo{p.enrichments.pipeline.demosBooked === 1 ? "" : "s"} booked</>}
              </div>
              {p.enrichments.pipeline.topEngaged.length > 0 && (
                <ul style={{ margin: "0.6rem 0 0", padding: 0, listStyle: "none" }}>
                  {p.enrichments.pipeline.topEngaged.map((e) => (
                    <li key={e.slug} style={{ fontFamily: SANS, fontSize: "0.82rem", color: MID, padding: "0.15rem 0" }}>
                      ⋯ <strong style={{ color: HI }}>{e.name}</strong>
                      {e.winery && <span style={{ color: LO }}> · {e.winery}</span>}
                      <span style={{ color: LO }}> ({e.viewCount} views)</span>
                    </li>
                  ))}
                </ul>
              )}
            </div>

            <p style={{ fontFamily: SANS, fontSize: "0.78rem", color: LO, textAlign: "center", marginTop: "1.25rem", lineHeight: 1.5 }}>
              Cron schedule: <code style={{ fontFamily: MONO }}>POST /api/scheduled/weekly-cellar-digest</code> every Mon 07:00 Australia/Sydney (Railway).
              Live sends require <code style={{ fontFamily: MONO }}>CRON_SECRET</code> or a matching <code style={{ fontFamily: MONO }}>x-cron-secret</code> header.
            </p>
          </>
        )}
      </div>
    </div>
  );
}

// ── Local UI primitives ─────────────────────────────────────────────

const cardStyle: React.CSSProperties = {
  background: CARD,
  border: `1px solid ${BORDER}`,
  borderRadius: 8,
  padding: "1.35rem 1.4rem",
  marginBottom: "1rem",
};

const statStripStyle: React.CSSProperties = {
  display: "grid",
  gridTemplateColumns: "repeat(auto-fit, minmax(200px, 1fr))",
  gap: "0.6rem",
  marginBottom: "1rem",
};

function Stat({ label, value, sub }: { label: string; value: number; sub: string }) {
  return (
    <div style={{ background: RAISED, border: `1px solid ${BORDER}`, borderRadius: 6, padding: "0.75rem 0.9rem" }}>
      <div style={{ fontFamily: SANS, fontSize: "0.65rem", letterSpacing: "0.14em", textTransform: "uppercase", color: LO, fontWeight: 700 }}>{label}</div>
      <div style={{ fontFamily: SERIF, fontSize: "1.85rem", fontWeight: 600, color: HI, lineHeight: 1.1, margin: "0.15rem 0" }}>{value}</div>
      <div style={{ fontFamily: SANS, fontSize: "0.72rem", color: MID }}>{sub}</div>
    </div>
  );
}

function SectionTitle({ children, style }: { children: React.ReactNode; style?: React.CSSProperties }) {
  return (
    <div
      style={{
        fontFamily: SANS,
        fontSize: "0.68rem",
        letterSpacing: "0.14em",
        textTransform: "uppercase",
        color: AMBER,
        fontWeight: 700,
        marginBottom: "0.55rem",
        ...(style ?? {}),
      }}
    >
      {children}
    </div>
  );
}
