/**
 * /admin/members — Command Center (Feb 2026 progressive-exposure).
 *
 * Unified operator view of every gated identity — trial, member, or legacy
 * gate — with progress meter, health signals, and one-click intervention
 * actions (extend, pause, resume, revoke, reissue link, advance tier,
 * private notes). See /app/server/routers/members.ts for the backing API.
 *
 * Data shape drives layout:
 *   - Top strip:   4 summary tiles (trials · members · silent · 30d conv)
 *   - Filter row:  tier (all/trial/member) + health (attention/healthy)
 *   - Table:       one row per invite with tier badge, name, progress
 *                  dots, health signal, last activity, actions dropdown
 *   - Issue drawer: side panel for minting new invites at a chosen tier
 *   - Detail drawer: click a row to see activity timeline + audit log
 */
import { useMemo, useState } from "react";
import { Link } from "wouter";
import { trpc } from "@/lib/trpc";
import { Button } from "../components/ui/button";
import {
  ChevronRight, RefreshCw, Copy, Check, X, Plus, Users, ShieldCheck,
  Circle, CircleDot, AlertTriangle, Pause, Play, Zap, Clock, User,
  ArrowUp, StickyNote,
} from "lucide-react";

const SERIF = "'Fraunces',serif";
const HI = "var(--ow-text-hi)";
const MID = "var(--ow-text-mid)";
const LO = "var(--ow-text-lo)";
const AMBER = "var(--ow-amber)";
const BORDER = "var(--ow-border)";
const CARD = "var(--ow-bg-card)";
const RAISED = "var(--ow-bg-raised)";

const HEALTH_COLOR: Record<string, string> = {
  healthy: "oklch(0.65 0.15 145)",
  silent_warn: "oklch(0.72 0.15 75)",
  silent_alert: "oklch(0.65 0.18 25)",
  expiring_soon: "oklch(0.72 0.15 75)",
  expired: "oklch(0.55 0.05 30)",
  revoked: "#78350f",
  paused: "oklch(0.55 0.05 240)",
};

const HEALTH_LABEL: Record<string, string> = {
  healthy: "Healthy",
  silent_warn: "Silent 3d+",
  silent_alert: "Silent 7d+",
  expiring_soon: "Expiring <48h",
  expired: "Expired",
  revoked: "Revoked",
  paused: "Paused",
};

const TIER_LABEL: Record<string, string> = {
  gate: "GATE",
  trial: "TRIAL",
  member: "MEMBER",
};

const TIER_COLOR: Record<string, string> = {
  gate: LO,
  trial: "oklch(0.72 0.15 75)",
  member: AMBER,
};

function timeAgo(ms: number | null | undefined): string {
  if (!ms) return "never";
  const diff = Date.now() - ms;
  if (diff < 60_000) return "just now";
  if (diff < 3_600_000) return `${Math.floor(diff / 60_000)}m ago`;
  if (diff < 86_400_000) return `${Math.floor(diff / 3_600_000)}h ago`;
  const days = Math.floor(diff / 86_400_000);
  if (days < 30) return `${days}d ago`;
  return new Date(ms).toLocaleDateString("en-AU", { day: "numeric", month: "short" });
}

type MemberRow = {
  id: number;
  label: string;
  tier: string;
  memberName: string | null;
  wineryName: string | null;
  privateNote: string | null;
  createdAt: number;
  expiresAt: number | null;
  firstUsedAt: number | null;
  lastUsedAt: number | null;
  useCount: number;
  revokedAt: number | null;
  pausedAt: number | null;
  lastActivityAt: number | null;
  progress: Record<string, boolean>;
  progressCount: number;
  health: string;
};

// ─── Progress meter (5 dots) ──────────────────────────────────────────────
const PILLARS = [
  { id: "onboarded", label: "Onboarded" },
  { id: "first_entry", label: "First entry" },
  { id: "first_question", label: "First Ask" },
  { id: "first_brief", label: "First brief" },
  { id: "bulk_import", label: "Bulk import" },
];

function ProgressMeter({ progress }: { progress: Record<string, boolean> }) {
  return (
    <div style={{ display: "flex", gap: "0.35rem" }} data-testid="member-progress-meter">
      {PILLARS.map((p) => (
        <span
          key={p.id}
          title={`${p.label}: ${progress[p.id] ? "done" : "pending"}`}
          style={{
            width: 10, height: 10, borderRadius: 10, display: "inline-block",
            background: progress[p.id] ? "oklch(0.65 0.15 145)" : "transparent",
            border: `1.5px solid ${progress[p.id] ? "oklch(0.65 0.15 145)" : LO}`,
          }}
          data-testid={`pillar-${p.id}-${progress[p.id] ? "done" : "pending"}`}
        />
      ))}
    </div>
  );
}

// ─── Summary tiles ────────────────────────────────────────────────────────
function SummaryTile({ label, value, testid }: { label: string; value: number | string; testid: string }) {
  return (
    <div
      style={{
        flex: 1, minWidth: 120, padding: "1rem 1.1rem",
        background: CARD, border: `1px solid ${BORDER}`, borderRadius: 8,
      }}
      data-testid={testid}
    >
      <p style={{ margin: 0, fontSize: "0.72rem", color: LO, textTransform: "uppercase", letterSpacing: "0.05em" }}>
        {label}
      </p>
      <p style={{ margin: "0.35rem 0 0", fontSize: "1.5rem", fontFamily: SERIF, fontWeight: 600, color: HI }}>
        {value}
      </p>
    </div>
  );
}

// ─── Detail drawer ────────────────────────────────────────────────────────
function DetailDrawer({ id, onClose }: { id: number; onClose: () => void }) {
  const utils = trpc.useUtils();
  const detailQ = trpc.members.detail.useQuery({ id });
  const [noteDraft, setNoteDraft] = useState<string | null>(null);
  const [extendDays, setExtendDays] = useState(7);
  const updateNote = trpc.members.updateNote.useMutation({
    onSuccess: () => { utils.members.detail.invalidate({ id }); utils.members.list.invalidate(); setNoteDraft(null); },
  });
  const extendTrial = trpc.members.extendTrial.useMutation({
    onSuccess: () => { utils.members.detail.invalidate({ id }); utils.members.list.invalidate(); },
  });
  const advance = trpc.members.advanceTier.useMutation({
    onSuccess: () => { utils.members.detail.invalidate({ id }); utils.members.list.invalidate(); },
  });
  const pause = trpc.members.pause.useMutation({
    onSuccess: () => { utils.members.detail.invalidate({ id }); utils.members.list.invalidate(); },
  });
  const resume = trpc.members.resume.useMutation({
    onSuccess: () => { utils.members.detail.invalidate({ id }); utils.members.list.invalidate(); },
  });
  const revoke = trpc.members.revoke.useMutation({
    onSuccess: () => { utils.members.detail.invalidate({ id }); utils.members.list.invalidate(); },
  });
  const reissue = trpc.members.reissueLink.useMutation({
    onSuccess: () => { utils.members.detail.invalidate({ id }); utils.members.list.invalidate(); },
  });

  const [copiedToken, setCopiedToken] = useState<string | null>(null);
  const copy = async (token: string) => {
    try {
      const url = `${window.location.origin}/i/${token}`;
      await navigator.clipboard.writeText(url);
      setCopiedToken(token);
      setTimeout(() => setCopiedToken(null), 1500);
    } catch { /* clipboard blocked */ }
  };

  return (
    <div
      role="dialog"
      aria-label="Member detail"
      style={{
        position: "fixed", top: 0, right: 0, bottom: 0, width: "min(560px, 95vw)",
        background: RAISED, borderLeft: `1px solid ${BORDER}`,
        overflowY: "auto", zIndex: 60, padding: "1.5rem 1.25rem",
        boxShadow: "-8px 0 32px oklch(0 0 0 / 40%)",
      }}
      data-testid="member-detail-drawer"
    >
      <div style={{ display: "flex", alignItems: "center", gap: "0.75rem", marginBottom: "1rem" }}>
        <h2 style={{ margin: 0, fontFamily: SERIF, fontSize: "1.25rem", color: HI, flex: 1 }}>
          {detailQ.data?.invite.memberName || detailQ.data?.invite.label || "Member"}
        </h2>
        <button
          onClick={onClose}
          data-testid="drawer-close"
          style={{ background: "transparent", border: "none", color: LO, cursor: "pointer" }}
        >
          <X size={20} />
        </button>
      </div>

      {detailQ.isLoading && <p style={{ color: LO }}>Loading…</p>}
      {detailQ.data && (
        <>
          <div style={{ padding: "0.75rem", background: CARD, border: `1px solid ${BORDER}`, borderRadius: 6, marginBottom: "1rem" }}>
            <p style={{ margin: 0, fontSize: "0.75rem", color: LO }}>
              <strong style={{ color: TIER_COLOR[detailQ.data.invite.tier] || HI }}>{TIER_LABEL[detailQ.data.invite.tier] || detailQ.data.invite.tier}</strong>
              {" · "}{detailQ.data.invite.wineryName || "—"}
              {" · "}created {timeAgo(detailQ.data.invite.createdAt)}
              {detailQ.data.invite.expiresAt && (<>{" · "}expires {timeAgo(detailQ.data.invite.expiresAt)}</>)}
            </p>
            <p style={{ margin: "0.3rem 0 0", fontSize: "0.72rem", color: LO }}>
              Last active {timeAgo(detailQ.data.invite.lastUsedAt)} · {detailQ.data.invite.useCount} sign-in{detailQ.data.invite.useCount === 1 ? "" : "s"}
            </p>
          </div>

          {/* Action row */}
          <div style={{ display: "flex", flexWrap: "wrap", gap: "0.5rem", marginBottom: "1rem" }} data-testid="drawer-actions">
            {detailQ.data.invite.tier === "trial" && (
              <>
                <input
                  type="number"
                  min={1}
                  max={90}
                  value={extendDays}
                  onChange={(e) => setExtendDays(parseInt(e.target.value || "0", 10) || 7)}
                  style={{ width: 50, padding: "0.35rem", background: CARD, color: HI, border: `1px solid ${BORDER}`, borderRadius: 4, fontSize: "0.75rem" }}
                  data-testid="extend-days-input"
                />
                <Button size="sm" variant="outline" onClick={() => extendTrial.mutate({ id, days: extendDays })} data-testid="btn-extend">
                  <Clock size={12} className="mr-1" /> Extend
                </Button>
                <Button size="sm" variant="outline" onClick={() => advance.mutate({ id, tier: "member" })} data-testid="btn-advance-member">
                  <ArrowUp size={12} className="mr-1" /> Promote → Member
                </Button>
              </>
            )}
            {detailQ.data.invite.pausedAt ? (
              <Button size="sm" variant="outline" onClick={() => resume.mutate({ id })} data-testid="btn-resume">
                <Play size={12} className="mr-1" /> Resume
              </Button>
            ) : (
              <Button size="sm" variant="outline" onClick={() => pause.mutate({ id, reason: "operator paused" })} data-testid="btn-pause">
                <Pause size={12} className="mr-1" /> Pause
              </Button>
            )}
            <Button size="sm" variant="outline" onClick={() => reissue.mutate({ id })} data-testid="btn-reissue">
              <RefreshCw size={12} className="mr-1" /> Re-issue link
            </Button>
            {!detailQ.data.invite.revokedAt && (
              <Button size="sm" variant="outline" onClick={() => {
                if (window.confirm("Revoke this member's access? They'll need a new magic link to return.")) {
                  revoke.mutate({ id, reason: "operator revoked" });
                }
              }} data-testid="btn-revoke">
                <X size={12} className="mr-1" /> Revoke
              </Button>
            )}
          </div>

          {/* Latest re-issued link (if any) */}
          {reissue.data?.token && (
            <div style={{ padding: "0.6rem", background: "oklch(0.20 0.05 145 / 30%)", border: "1px solid oklch(0.55 0.15 145 / 60%)", borderRadius: 4, marginBottom: "1rem", fontSize: "0.75rem" }} data-testid="reissued-link">
              <p style={{ margin: 0, color: HI }}>
                New link:{" "}
                <code style={{ color: AMBER, wordBreak: "break-all" }}>
                  {window.location.origin}/i/{reissue.data.token}
                </code>{" "}
                <button onClick={() => copy(reissue.data!.token)} style={{ background: "transparent", border: "none", color: LO, cursor: "pointer" }} aria-label="Copy link">
                  {copiedToken === reissue.data.token ? <Check size={12} /> : <Copy size={12} />}
                </button>
              </p>
            </div>
          )}

          {/* Progress meter */}
          <div style={{ marginBottom: "1.25rem" }}>
            <p style={{ margin: "0 0 0.4rem", fontSize: "0.75rem", color: MID, textTransform: "uppercase", letterSpacing: "0.05em" }}>Progress</p>
            <div style={{ display: "grid", gap: "0.3rem" }}>
              {PILLARS.map((p) => {
                const done = detailQ.data.activity.some(a => {
                  if (p.id === "onboarded") return a.kind === "onboarding_complete";
                  if (p.id === "first_entry") return a.kind === "vintage_log_entry";
                  if (p.id === "first_question") return a.kind === "ask_owen_question";
                  if (p.id === "first_brief") return a.kind === "cellar_brief_open";
                  if (p.id === "bulk_import") return a.kind === "bulk_import_run";
                  return false;
                });
                return (
                  <div key={p.id} style={{ display: "flex", alignItems: "center", gap: "0.5rem", fontSize: "0.8rem", color: done ? HI : LO }}>
                    {done ? <CircleDot size={12} style={{ color: "oklch(0.65 0.15 145)" }} /> : <Circle size={12} style={{ color: LO }} />}
                    <span>{p.label}</span>
                  </div>
                );
              })}
            </div>
          </div>

          {/* Private note */}
          <div style={{ marginBottom: "1.25rem" }}>
            <p style={{ margin: "0 0 0.4rem", fontSize: "0.75rem", color: MID, textTransform: "uppercase", letterSpacing: "0.05em" }}>
              <StickyNote size={11} style={{ display: "inline", marginRight: 4 }} /> Private note (never shown to member)
            </p>
            <textarea
              value={noteDraft ?? detailQ.data.invite.privateNote ?? ""}
              onChange={(e) => setNoteDraft(e.target.value)}
              placeholder="Prefers pinot, calls before 8am, hates spreadsheets…"
              style={{
                width: "100%", minHeight: 80, padding: "0.5rem",
                background: CARD, color: HI, border: `1px solid ${BORDER}`, borderRadius: 4,
                fontFamily: "inherit", fontSize: "0.8rem", resize: "vertical",
              }}
              data-testid="note-textarea"
            />
            {noteDraft !== null && (
              <div style={{ marginTop: "0.4rem", display: "flex", gap: "0.35rem" }}>
                <Button size="sm" onClick={() => updateNote.mutate({ id, note: noteDraft })} data-testid="note-save">Save</Button>
                <Button size="sm" variant="ghost" onClick={() => setNoteDraft(null)}>Cancel</Button>
              </div>
            )}
          </div>

          {/* Activity timeline */}
          <div style={{ marginBottom: "1.25rem" }}>
            <p style={{ margin: "0 0 0.4rem", fontSize: "0.75rem", color: MID, textTransform: "uppercase", letterSpacing: "0.05em" }}>Activity ({detailQ.data.activity.length})</p>
            {detailQ.data.activity.length === 0 && (
              <p style={{ margin: 0, color: LO, fontSize: "0.8rem" }}>No activity yet.</p>
            )}
            <div style={{ display: "grid", gap: "0.25rem" }} data-testid="activity-list">
              {detailQ.data.activity.slice(0, 20).map((a) => (
                <div key={a.id} style={{ display: "flex", gap: "0.5rem", fontSize: "0.75rem", padding: "0.35rem 0", borderTop: `1px dashed ${BORDER}` }}>
                  <span style={{ color: LO, minWidth: 80 }}>{timeAgo(a.occurredAt)}</span>
                  <span style={{ color: MID, flex: 1 }}>{a.kind}</span>
                </div>
              ))}
            </div>
          </div>

          {/* Audit log */}
          <div>
            <p style={{ margin: "0 0 0.4rem", fontSize: "0.75rem", color: MID, textTransform: "uppercase", letterSpacing: "0.05em" }}>Operator actions ({detailQ.data.audit.length})</p>
            {detailQ.data.audit.length === 0 && (
              <p style={{ margin: 0, color: LO, fontSize: "0.8rem" }}>No overrides yet.</p>
            )}
            <div style={{ display: "grid", gap: "0.25rem" }} data-testid="audit-list">
              {detailQ.data.audit.slice(0, 10).map((a) => (
                <div key={a.id} style={{ fontSize: "0.75rem", padding: "0.35rem 0", borderTop: `1px dashed ${BORDER}` }}>
                  <span style={{ color: LO }}>{timeAgo(a.occurredAt)}</span>
                  <span style={{ color: MID, margin: "0 0.4rem" }}>·</span>
                  <span style={{ color: HI }}>{a.action}</span>
                  <span style={{ color: LO, margin: "0 0.4rem" }}>·</span>
                  <span style={{ color: LO }}>{a.actorEmail}</span>
                </div>
              ))}
            </div>
          </div>
        </>
      )}
    </div>
  );
}

// ─── Issue drawer ─────────────────────────────────────────────────────────
function IssueDrawer({ onClose }: { onClose: () => void }) {
  const utils = trpc.useUtils();
  const [tier, setTier] = useState<"trial" | "member" | "gate">("trial");
  const [label, setLabel] = useState("");
  const [memberName, setMemberName] = useState("");
  const [wineryName, setWineryName] = useState("");
  const [privateNote, setPrivateNote] = useState("");
  const [expiresInDays, setExpiresInDays] = useState<number | "">("");
  const [issued, setIssued] = useState<{ token: string; tier: string } | null>(null);
  const [copied, setCopied] = useState(false);

  const issue = trpc.members.issue.useMutation({
    onSuccess: (data) => {
      utils.members.list.invalidate();
      utils.members.summary.invalidate();
      setIssued({ token: data.token, tier: data.tier });
    },
  });

  const submit = () => {
    if (!label.trim()) return;
    issue.mutate({
      tier,
      label: label.trim(),
      memberName: memberName.trim() || undefined,
      wineryName: wineryName.trim() || undefined,
      privateNote: privateNote.trim() || undefined,
      expiresInDays: expiresInDays === "" ? null : Number(expiresInDays),
    });
  };

  const copyLink = async () => {
    if (!issued) return;
    try {
      await navigator.clipboard.writeText(`${window.location.origin}/i/${issued.token}`);
      setCopied(true);
      setTimeout(() => setCopied(false), 1500);
    } catch { /* clipboard blocked */ }
  };

  return (
    <div
      role="dialog"
      aria-label="Issue new invite"
      style={{
        position: "fixed", top: 0, right: 0, bottom: 0, width: "min(480px, 95vw)",
        background: RAISED, borderLeft: `1px solid ${BORDER}`,
        overflowY: "auto", zIndex: 60, padding: "1.5rem 1.25rem",
        boxShadow: "-8px 0 32px oklch(0 0 0 / 40%)",
      }}
      data-testid="issue-drawer"
    >
      <div style={{ display: "flex", alignItems: "center", gap: "0.75rem", marginBottom: "1rem" }}>
        <h2 style={{ margin: 0, fontFamily: SERIF, fontSize: "1.25rem", color: HI, flex: 1 }}>
          Issue new invite
        </h2>
        <button onClick={onClose} data-testid="issue-close" style={{ background: "transparent", border: "none", color: LO, cursor: "pointer" }}>
          <X size={20} />
        </button>
      </div>

      {!issued && (
        <div style={{ display: "grid", gap: "0.75rem" }}>
          <div>
            <label style={{ display: "block", fontSize: "0.72rem", color: MID, textTransform: "uppercase", letterSpacing: "0.05em", marginBottom: 4 }}>Tier</label>
            <div style={{ display: "flex", gap: "0.4rem" }} data-testid="tier-picker">
              {(["trial", "member", "gate"] as const).map((t) => (
                <button
                  key={t}
                  type="button"
                  onClick={() => setTier(t)}
                  data-testid={`tier-${t}`}
                  style={{
                    flex: 1, padding: "0.5rem",
                    background: tier === t ? "color-mix(in oklch, var(--ow-amber) 15%, transparent)" : CARD,
                    border: `1px solid ${tier === t ? AMBER : BORDER}`,
                    color: tier === t ? HI : MID,
                    borderRadius: 4, fontSize: "0.8rem", fontWeight: 600, cursor: "pointer",
                  }}
                >
                  {TIER_LABEL[t]}
                </button>
              ))}
            </div>
            <p style={{ margin: "0.35rem 0 0", fontSize: "0.72rem", color: LO }}>
              {tier === "trial" && "14-day trial. Access limited to /onboarding, /the-press, /cellar-brief, /import, /ask."}
              {tier === "member" && "Full site (paying)."}
              {tier === "gate" && "Legacy shared-password style — full public + member surface, no auto-expiry."}
            </p>
          </div>

          <input
            placeholder="Label (e.g. Sarah @ Brokenwood)"
            value={label}
            onChange={(e) => setLabel(e.target.value)}
            data-testid="label-input"
            style={{ padding: "0.6rem", background: CARD, color: HI, border: `1px solid ${BORDER}`, borderRadius: 4, fontSize: "0.85rem" }}
          />
          <input
            placeholder="Contact name (optional)"
            value={memberName}
            onChange={(e) => setMemberName(e.target.value)}
            data-testid="membername-input"
            style={{ padding: "0.6rem", background: CARD, color: HI, border: `1px solid ${BORDER}`, borderRadius: 4, fontSize: "0.85rem" }}
          />
          <input
            placeholder="Winery (optional)"
            value={wineryName}
            onChange={(e) => setWineryName(e.target.value)}
            data-testid="wineryname-input"
            style={{ padding: "0.6rem", background: CARD, color: HI, border: `1px solid ${BORDER}`, borderRadius: 4, fontSize: "0.85rem" }}
          />
          <input
            type="number"
            min={1}
            max={365}
            placeholder={tier === "trial" ? "Expires in days (default 14)" : "Expires in days (blank = never)"}
            value={expiresInDays}
            onChange={(e) => setExpiresInDays(e.target.value ? Number(e.target.value) : "")}
            data-testid="expiry-input"
            style={{ padding: "0.6rem", background: CARD, color: HI, border: `1px solid ${BORDER}`, borderRadius: 4, fontSize: "0.85rem" }}
          />
          <textarea
            placeholder="Private note (never shown to member)"
            value={privateNote}
            onChange={(e) => setPrivateNote(e.target.value)}
            data-testid="privatenote-input"
            style={{ padding: "0.6rem", background: CARD, color: HI, border: `1px solid ${BORDER}`, borderRadius: 4, fontFamily: "inherit", fontSize: "0.85rem", minHeight: 70, resize: "vertical" }}
          />

          <Button
            onClick={submit}
            disabled={!label.trim() || issue.isPending}
            data-testid="issue-submit"
            style={{ marginTop: "0.5rem" }}
          >
            {issue.isPending ? "Issuing…" : "Issue invite"}
          </Button>
          {issue.error && <p style={{ color: "oklch(0.65 0.18 25)", fontSize: "0.8rem" }}>{issue.error.message}</p>}
        </div>
      )}

      {issued && (
        <div data-testid="issue-result">
          <p style={{ color: "oklch(0.75 0.15 145)", fontSize: "0.9rem", margin: "0 0 0.5rem" }}>
            <Check size={16} style={{ display: "inline", marginRight: 4 }} /> {TIER_LABEL[issued.tier]} invite created.
          </p>
          <div style={{ padding: "0.6rem", background: CARD, border: `1px solid ${BORDER}`, borderRadius: 4, fontSize: "0.75rem" }}>
            <p style={{ margin: 0, color: LO }}>Share this URL by SMS or email:</p>
            <code style={{ display: "block", marginTop: "0.4rem", color: AMBER, wordBreak: "break-all" }}>
              {window.location.origin}/i/{issued.token}
            </code>
            <Button
              size="sm"
              onClick={copyLink}
              data-testid="issue-copy"
              style={{ marginTop: "0.5rem" }}
            >
              {copied ? <><Check size={12} className="mr-1" /> Copied</> : <><Copy size={12} className="mr-1" /> Copy link</>}
            </Button>
          </div>
          <Button
            variant="outline"
            size="sm"
            onClick={() => { setIssued(null); setLabel(""); setMemberName(""); setWineryName(""); setPrivateNote(""); }}
            style={{ marginTop: "0.75rem" }}
            data-testid="issue-again"
          >
            Issue another
          </Button>
        </div>
      )}
    </div>
  );
}

// ─── Main page ────────────────────────────────────────────────────────────
export default function AdminMembers() {
  const [tierFilter, setTierFilter] = useState<"all" | "gate" | "trial" | "member">("all");
  const [healthFilter, setHealthFilter] = useState<"all" | "attention" | "healthy">("all");
  const [selectedId, setSelectedId] = useState<number | null>(null);
  const [issuing, setIssuing] = useState(false);

  const summaryQ = trpc.members.summary.useQuery();
  const listQ = trpc.members.list.useQuery({ tier: tierFilter, health: healthFilter });

  const members: MemberRow[] = useMemo(() => (listQ.data?.members as MemberRow[]) || [], [listQ.data]);

  return (
    <div style={{ minHeight: "100vh", background: "var(--ow-bg-base)", color: HI, padding: "2rem 1.5rem" }}>
      <div style={{ maxWidth: 1400, margin: "0 auto" }}>
        <div style={{ display: "flex", alignItems: "center", gap: "0.75rem", marginBottom: "0.5rem" }}>
          <Link href="/admin" style={{ color: LO, fontSize: "0.85rem", textDecoration: "none" }}>← Admin</Link>
        </div>
        <div style={{ display: "flex", alignItems: "flex-end", gap: "1rem", marginBottom: "1.5rem", flexWrap: "wrap" }}>
          <h1 style={{ margin: 0, fontFamily: SERIF, fontSize: "2rem", color: HI, flex: 1 }} data-testid="page-heading">
            Members · Command Center
          </h1>
          <Button
            onClick={() => setIssuing(true)}
            data-testid="btn-issue-new"
            style={{ background: AMBER, color: "oklch(0.10 0.008 60)" }}
          >
            <Plus size={14} className="mr-1" /> Issue invite
          </Button>
        </div>

        {/* Summary tiles */}
        <div style={{ display: "flex", gap: "0.6rem", marginBottom: "1.25rem", flexWrap: "wrap" }} data-testid="summary-tiles">
          <SummaryTile label="Trials" value={summaryQ.data?.trials ?? "…"} testid="tile-trials" />
          <SummaryTile label="Members" value={summaryQ.data?.members ?? "…"} testid="tile-members" />
          <SummaryTile label="Silent trials >3d" value={summaryQ.data?.silentTrials ?? "…"} testid="tile-silent" />
          <SummaryTile label="30d conversions" value={summaryQ.data?.conversions30d ?? "…"} testid="tile-conversions" />
        </div>

        {/* Filters */}
        <div style={{ display: "flex", gap: "1rem", marginBottom: "1rem", flexWrap: "wrap", alignItems: "center" }}>
          <div style={{ display: "flex", gap: "0.35rem", alignItems: "center" }} data-testid="filter-tier">
            <span style={{ fontSize: "0.72rem", color: LO, textTransform: "uppercase", letterSpacing: "0.05em" }}>Tier:</span>
            {(["all", "trial", "member", "gate"] as const).map((t) => (
              <button
                key={t}
                onClick={() => setTierFilter(t)}
                data-testid={`filter-tier-${t}`}
                style={{
                  padding: "0.3rem 0.6rem", fontSize: "0.72rem",
                  background: tierFilter === t ? "color-mix(in oklch, var(--ow-amber) 15%, transparent)" : "transparent",
                  color: tierFilter === t ? HI : MID,
                  border: `1px solid ${tierFilter === t ? AMBER : BORDER}`,
                  borderRadius: 4, cursor: "pointer",
                }}
              >
                {t}
              </button>
            ))}
          </div>
          <div style={{ display: "flex", gap: "0.35rem", alignItems: "center" }} data-testid="filter-health">
            <span style={{ fontSize: "0.72rem", color: LO, textTransform: "uppercase", letterSpacing: "0.05em" }}>Health:</span>
            {(["all", "attention", "healthy"] as const).map((h) => (
              <button
                key={h}
                onClick={() => setHealthFilter(h)}
                data-testid={`filter-health-${h}`}
                style={{
                  padding: "0.3rem 0.6rem", fontSize: "0.72rem",
                  background: healthFilter === h ? "color-mix(in oklch, var(--ow-amber) 15%, transparent)" : "transparent",
                  color: healthFilter === h ? HI : MID,
                  border: `1px solid ${healthFilter === h ? AMBER : BORDER}`,
                  borderRadius: 4, cursor: "pointer",
                }}
              >
                {h}
              </button>
            ))}
          </div>
        </div>

        {/* Table */}
        <div style={{ background: CARD, border: `1px solid ${BORDER}`, borderRadius: 8, overflow: "hidden" }} data-testid="members-table">
          {listQ.isLoading && <p style={{ padding: "1rem", color: LO }}>Loading…</p>}
          {!listQ.isLoading && members.length === 0 && (
            <p style={{ padding: "1.5rem", color: LO, textAlign: "center" }} data-testid="empty-state">
              <Users size={20} style={{ display: "block", margin: "0 auto 0.5rem", color: LO }} />
              No members match the current filters.
            </p>
          )}
          {members.map((m) => (
            <button
              key={m.id}
              onClick={() => setSelectedId(m.id)}
              data-testid={`member-row-${m.id}`}
              style={{
                width: "100%", textAlign: "left", cursor: "pointer",
                display: "flex", alignItems: "center", gap: "0.75rem",
                padding: "0.75rem 1rem", background: "transparent",
                border: "none", borderBottom: `1px solid ${BORDER}`,
                color: "inherit", fontFamily: "inherit",
              }}
            >
              {/* Tier badge */}
              <span
                style={{
                  minWidth: 62, padding: "0.15rem 0.4rem", textAlign: "center",
                  fontSize: "0.62rem", fontWeight: 700, letterSpacing: "0.05em",
                  color: TIER_COLOR[m.tier] || LO,
                  border: `1px solid ${TIER_COLOR[m.tier] || LO}`,
                  borderRadius: 3,
                }}
                data-testid={`tier-badge-${m.tier}`}
              >
                {TIER_LABEL[m.tier] || m.tier.toUpperCase()}
              </span>

              {/* Identity */}
              <div style={{ flex: 1, minWidth: 160 }}>
                <p style={{ margin: 0, color: HI, fontWeight: 600, fontSize: "0.85rem" }}>
                  {m.memberName || m.label}
                </p>
                <p style={{ margin: "0.1rem 0 0", color: LO, fontSize: "0.72rem" }}>
                  {m.wineryName || m.label}
                </p>
              </div>

              {/* Progress meter */}
              <ProgressMeter progress={m.progress} />

              {/* Health */}
              <span
                style={{
                  minWidth: 96, textAlign: "right", fontSize: "0.72rem",
                  color: HEALTH_COLOR[m.health] || LO, fontWeight: 600,
                }}
                data-testid={`health-${m.health}`}
              >
                {m.health === "silent_alert" && <AlertTriangle size={11} style={{ display: "inline", marginRight: 3 }} />}
                {HEALTH_LABEL[m.health] || m.health}
              </span>

              {/* Last activity */}
              <span style={{ minWidth: 80, textAlign: "right", fontSize: "0.72rem", color: LO }}>
                {timeAgo(m.lastActivityAt || m.lastUsedAt)}
              </span>

              <ChevronRight size={14} style={{ color: LO }} />
            </button>
          ))}
        </div>

        <p style={{ margin: "1rem 0 0", fontSize: "0.72rem", color: LO }}>
          {listQ.data?.total ?? 0} member{(listQ.data?.total ?? 0) === 1 ? "" : "s"} shown ·{" "}
          <Link href="/admin/gate-invites" style={{ color: LO }}>Legacy invite table →</Link>
        </p>
      </div>

      {selectedId !== null && (
        <DetailDrawer id={selectedId} onClose={() => setSelectedId(null)} />
      )}
      {issuing && <IssueDrawer onClose={() => setIssuing(false)} />}
    </div>
  );
}

// Kept for tree-shaking friendliness — icons referenced dynamically above.
void ShieldCheck; void Zap; void User;
