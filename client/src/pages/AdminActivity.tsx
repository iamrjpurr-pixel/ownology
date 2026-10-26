import { useMemo } from "react";
import { Link, useSearch } from "wouter";
import { ArrowLeft, MousePointerClick, Eye, FileText, MessageCircle, Footprints } from "lucide-react";
import { trpc } from "@/lib/trpc";

const fmt = (ms: number) => new Date(ms).toLocaleString(undefined, { day: "numeric", month: "short", hour: "2-digit", minute: "2-digit" });
const ICON: Record<string, typeof Eye> = { page_view: FileText, click: MousePointerClick, section_view: Eye, guide_step: Footprints, custom: MessageCircle };
const LABEL: Record<string, string> = { page_view: "Opened", click: "Clicked", section_view: "Scrolled to", guide_step: "Tour step", custom: "" };
const card = "rounded-lg border border-[var(--ow-border)] bg-[var(--ow-bg-card)] p-5";

function PeopleList() {
  const q = trpc.events.people.useQuery();
  if (q.isLoading) return <p className="text-sm text-[var(--ow-text-lo)]">Loading…</p>;
  if (q.error) return <p className="text-sm text-red-600">{q.error.message}</p>;
  const d = q.data!;
  return (
    <div className="grid gap-6 lg:grid-cols-2">
      <section className={card} data-testid="activity-invited">
        <h2 className="font-['Fraunces',serif] text-xl text-[var(--ow-text-hi)]">Invited prospects</h2>
        <p className="mb-3 text-xs text-[var(--ow-text-lo)]">People who opened a personal link (?for=…)</p>
        {d.invited.length === 0 && <p className="text-sm text-[var(--ow-text-lo)]">No one yet.</p>}
        <ul className="divide-y divide-[var(--ow-border)]">
          {d.invited.map((p) => (
            <li key={p.slug}>
              <Link href={`/admin/activity?slug=${encodeURIComponent(p.slug)}`} className="flex justify-between gap-3 py-2.5 text-sm hover:opacity-80" data-testid={`activity-person-${p.slug}`}>
                <span className="text-[var(--ow-text-hi)]">{p.name}{p.winery && <span className="text-[var(--ow-text-lo)]"> · {p.winery}</span>}</span>
                <span className="shrink-0 text-xs text-[var(--ow-text-lo)]">{p.sessions} visit{p.sessions === 1 ? "" : "s"} · {p.events} events · {fmt(p.lastAt)}</span>
              </Link>
            </li>
          ))}
        </ul>
      </section>
      <section className={card} data-testid="activity-members">
        <h2 className="font-['Fraunces',serif] text-xl text-[var(--ow-text-hi)]">Signed-in members (30 days)</h2>
        <p className="mb-3 text-xs text-[var(--ow-text-lo)]">Plus {d.anonymous.sessions} anonymous visits ({d.anonymous.events} events)</p>
        {d.members.length === 0 && <p className="text-sm text-[var(--ow-text-lo)]">No one yet.</p>}
        <ul className="divide-y divide-[var(--ow-border)]">
          {d.members.map((m) => (
            <li key={m.userId}>
              <Link href={`/admin/activity?user=${m.userId}`} className="flex justify-between gap-3 py-2.5 text-sm hover:opacity-80" data-testid={`activity-member-${m.userId}`}>
                <span className="min-w-0 truncate text-[var(--ow-text-hi)]">{m.name || m.email}</span>
                <span className="shrink-0 text-xs text-[var(--ow-text-lo)]">{m.sessions} visit{m.sessions === 1 ? "" : "s"} · {m.events} events · {fmt(m.lastAt)}</span>
              </Link>
            </li>
          ))}
        </ul>
      </section>
    </div>
  );
}

function PersonView({ slug, userId }: { slug?: string; userId?: number }) {
  const q = trpc.events.person.useQuery({ slug, userId }, { refetchInterval: 15000 });
  const sessions = useMemo(() => {
    const m = new Map<string, NonNullable<typeof q.data>["events"]>();
    for (const e of q.data?.events ?? []) m.set(e.sessionId, [...(m.get(e.sessionId) ?? []), e]);
    return [...m.entries()];
  }, [q.data]);
  if (q.isLoading) return <p className="text-sm text-[var(--ow-text-lo)]">Loading…</p>;
  if (q.error) return <p className="text-sm text-red-600">{q.error.message}</p>;
  const d = q.data!;
  return (
    <div className="space-y-6">
      <div>
        <h2 className="font-['Fraunces',serif] text-2xl text-[var(--ow-text-hi)]" data-testid="activity-person-label">{d.label}</h2>
        <p className="text-sm text-[var(--ow-text-mid)]">{d.email ?? "No email on file"} · {d.events.length} events · refreshes every 15s</p>
      </div>
      <section className={card} data-testid="activity-vault-summary">
        <h3 className="text-sm font-semibold uppercase tracking-wider text-[var(--ow-text-lo)]">Brand Vault</h3>
        {d.vault ? (
          <>
            <p className="mt-2 text-sm text-[var(--ow-text-hi)]">Signed up {fmt(d.vault.signedUpAt)} · <strong>{d.vault.winery}</strong> · {d.vault.wines} wines · {d.vault.logs} cellar logs · {d.vault.contractors} winemakers invited</p>
            <ul className="mt-3 space-y-1 text-xs text-[var(--ow-text-mid)]">
              {d.vault.recent.map((r, i) => <li key={i}>{fmt(r.at)} · {r.action} {r.target}</li>)}
            </ul>
          </>
        ) : <p className="mt-2 text-sm text-[var(--ow-text-mid)]">Hasn't signed up yet.</p>}
      </section>
      {sessions.length === 0 && <p className="text-sm text-[var(--ow-text-lo)]">No clicks recorded yet.</p>}
      {sessions.map(([sid, evs]) => (
        <section key={sid} className={card} data-testid={`activity-session-${sid.slice(0, 8)}`}>
          <h3 className="mb-3 text-sm font-semibold text-[var(--ow-text-hi)]">Visit · {fmt(evs[evs.length - 1].at)} → {fmt(evs[0].at)} · {evs.length} events</h3>
          <ol className="space-y-1.5">
            {[...evs].reverse().map((e) => {
              const Icon = ICON[e.event] ?? Eye;
              return (
                <li key={e.id} className="flex items-start gap-2.5 text-sm">
                  <Icon className="mt-0.5 h-3.5 w-3.5 shrink-0 text-[var(--ow-amber)]" />
                  <span className="font-mono text-xs text-[var(--ow-text-lo)]">{new Date(e.at).toLocaleTimeString()}</span>
                  <span className="min-w-0 break-words text-[var(--ow-text-mid)]">
                    {LABEL[e.event]} <span className="text-[var(--ow-text-hi)]">{e.event === "page_view" ? e.path + (e.detail || "") : e.detail}</span>
                    {e.event !== "page_view" && <span className="text-[var(--ow-text-lo)]"> on {e.path}</span>}
                  </span>
                </li>
              );
            })}
          </ol>
        </section>
      ))}
    </div>
  );
}

export default function AdminActivity() {
  const params = new URLSearchParams(useSearch());
  const slug = params.get("slug") ?? undefined;
  const user = params.get("user");
  const detail = slug || user;
  return (
    <div className="min-h-screen bg-[var(--ow-bg-base)]" data-testid="admin-activity-page">
      <div className="mx-auto max-w-5xl px-6 py-10">
        <Link href={detail ? "/admin/activity" : "/admin/contacts"} className="mb-4 inline-flex items-center gap-1.5 text-sm text-[var(--ow-amber)]" data-testid="activity-back">
          <ArrowLeft className="h-4 w-4" /> {detail ? "All activity" : "Contacts"}
        </Link>
        <h1 className="mb-8 font-['Fraunces',serif] text-3xl text-[var(--ow-text-hi)]">Activity</h1>
        {detail ? <PersonView slug={slug} userId={user ? Number(user) : undefined} /> : <PeopleList />}
      </div>
    </div>
  );
}
