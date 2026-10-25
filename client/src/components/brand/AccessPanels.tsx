import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { ShieldCheck, UserMinus, Eye, PenLine, Ban, Download, Send } from "lucide-react";
import { fmtDate, type Activity, type Member } from "./types";

const STATUS_STYLE: Record<string, string> = {
  active: "bg-emerald-600/10 text-emerald-700",
  invited: "bg-[color-mix(in_oklch,var(--ow-amber)_15%,transparent)] text-[var(--ow-amber)]",
  revoked: "bg-[var(--ow-bg-inset)] text-[var(--ow-text-lo)] line-through",
};

export function ContractorsPanel({ members, onInvite, onRevoke, pending }: {
  members: Member[];
  onInvite: (email: string) => Promise<unknown> | void;
  onRevoke: (id: number) => Promise<unknown> | void;
  pending?: boolean;
}) {
  const [email, setEmail] = useState("");
  const submit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!email.trim()) return;
    await onInvite(email.trim());
    setEmail("");
  };
  return (
    <section className="space-y-5" data-testid="contractors-panel">
      <div>
        <h3 className="font-['Fraunces',serif] text-xl text-[var(--ow-text-hi)]">Contract winemakers</h3>
        <p className="mt-1 text-sm text-[var(--ow-text-mid)]">
          They can view your specs and log cellar work and readings. Editing and exporting stay with you, and you can change access any time.
        </p>
      </div>
      <form onSubmit={submit} className="flex flex-col gap-2 sm:flex-row">
        <Input type="email" required placeholder="contractor@theirwinery.com" value={email} onChange={(e) => setEmail(e.target.value)} data-testid="invite-email-input" />
        <Button type="submit" disabled={pending} data-testid="invite-submit-button" className="gap-2">
          <Send className="h-4 w-4" /> {pending ? "Sending…" : "Invite contractor"}
        </Button>
      </form>
      {members.length === 0 && <p className="text-sm text-[var(--ow-text-lo)]" data-testid="contractors-empty">No contractors yet.</p>}
      <ul className="divide-y divide-[var(--ow-border)]">
        {members.map((m) => (
          <li key={m.id} className="flex items-center justify-between gap-3 py-3" data-testid={`contractor-row-${m.id}`}>
            <div className="min-w-0">
              <div className="truncate text-sm text-[var(--ow-text-hi)]">{m.email}</div>
              <div className="text-xs text-[var(--ow-text-lo)]">Invited {fmtDate(m.invitedAt)}</div>
            </div>
            <div className="flex shrink-0 items-center gap-2">
              <span className={`rounded px-2 py-0.5 text-[0.65rem] font-bold uppercase tracking-wider ${STATUS_STYLE[m.status] ?? ""}`} data-testid={`contractor-status-${m.id}`}>{m.status}</span>
              {m.status !== "revoked" && (
                <Button size="sm" variant="outline" onClick={() => onRevoke(m.id)} data-testid={`contractor-revoke-${m.id}`} className="gap-1.5">
                  <UserMinus className="h-3.5 w-3.5" /> Remove access
                </Button>
              )}
            </div>
          </li>
        ))}
      </ul>
    </section>
  );
}

const ACTION_ICON: Record<string, typeof Eye> = { viewed: Eye, blocked: Ban, exported: Download, revoked: UserMinus, invited: Send };

export function ActivityFeed({ items }: { items: Activity[] }) {
  return (
    <section className="space-y-4" data-testid="activity-feed">
      <div>
        <h3 className="font-['Fraunces',serif] text-xl text-[var(--ow-text-hi)]">Activity history</h3>
        <p className="mt-1 text-sm text-[var(--ow-text-mid)]">A shared timeline of what's been viewed, logged and changed.</p>
      </div>
      {items.length === 0 && <p className="text-sm text-[var(--ow-text-lo)]">No activity yet.</p>}
      <ol className="space-y-2.5">
        {items.map((a) => {
          const Icon = ACTION_ICON[a.action] ?? (a.action.startsWith("logged") ? PenLine : ShieldCheck);
          return (
            <li key={a.id} className="flex min-w-0 items-start gap-3 break-words text-sm" data-testid={`activity-${a.id}`}>
              <Icon className={`mt-0.5 h-4 w-4 shrink-0 ${a.action === "blocked" ? "text-red-600" : "text-[var(--ow-amber)]"}`} />
              <div className="min-w-0">
                <span className="break-all text-[var(--ow-text-hi)]">{a.actorEmail}</span>
                <span className="text-[var(--ow-text-lo)]"> ({a.actorRole}) </span>
                <span className="text-[var(--ow-text-mid)]">{a.action} {a.target}</span>
                <div className="text-xs text-[var(--ow-text-lo)]">{fmtDate(a.createdAt)}</div>
              </div>
            </li>
          );
        })}
      </ol>
    </section>
  );
}
