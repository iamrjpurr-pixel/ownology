import { useState } from "react";
import { Link } from "wouter";
import { ArrowLeft, ArrowRight, Search, Send, Bell, Ban, Mail, Phone, MousePointerClick, ChevronRight, Instagram, Copy, Check } from "lucide-react";
import { toast } from "sonner";
import { trpc } from "@/lib/trpc";
import { Input } from "@/components/ui/input";
import { Sheet, SheetContent, SheetHeader, SheetTitle, SheetDescription } from "@/components/ui/sheet";
import type { CrmRow } from "../../../server/routers/crmHome";

type Stage = "not_contacted" | "contacted" | "opened" | "replied" | "signed_up" | "paying";
type Pick = { contactId: number | null; userId: number | null };

const STAGE_LABEL: Record<Stage, string> = {
  not_contacted: "Not contacted", contacted: "Contacted", opened: "Opened", replied: "Replied", signed_up: "Signed up", paying: "Paying",
};
const OLD_TOOLS: [string, string][] = [
  ["People (everyone, every record)", "/admin/people"], ["Outreach contacts", "/admin/contacts"], ["Outbound queue", "/admin/contacts/outbound-queue"],
  ["Replies & follow-ups", "/admin/contacts/engagement"], ["Activity (click trails)", "/admin/activity"], ["Access & invite links", "/admin/access"],
];
const card = "rounded-2xl border border-[var(--ow-border)] bg-[var(--ow-bg-card)]";

function Funnel({ funnel, stage, onPick }: { funnel: { id: Stage; count: number }[]; stage: Stage | null; onPick: (s: Stage) => void }) {
  return (
    <div className="-mx-4 flex gap-2 overflow-x-auto px-4 pb-2 sm:mx-0 sm:grid sm:grid-cols-6 sm:px-0" data-testid="crm-funnel">
      {funnel.map((f, i) => (
        <button key={f.id} type="button" onClick={() => onPick(f.id)} data-testid={`crm-stage-${f.id}`}
          className={`relative min-w-[7.5rem] shrink-0 rounded-2xl border px-3 py-4 sm:min-w-0 text-left transition-colors ${stage === f.id ? "border-[var(--ow-amber)] bg-[var(--ow-accent-live-soft)]" : "border-[var(--ow-border)] bg-[var(--ow-bg-card)] hover:border-[var(--ow-amber)]"}`}>
          <span className="block font-['Fraunces',serif] text-4xl text-[var(--ow-text-hi)] sm:text-3xl">{f.count}</span>
          <span className="mt-1 block text-sm text-[var(--ow-text-mid)]">{STAGE_LABEL[f.id]}</span>
          {i < funnel.length - 1 && <ArrowRight className="absolute right-2 top-2 h-4 w-4 text-[var(--ow-text-lo)]" />}
        </button>
      ))}
    </div>
  );
}

function PersonRow({ r, onOpen, testid }: { r: CrmRow; onOpen: (p: Pick) => void; testid: string }) {
  return (
    <li>
      <button type="button" onClick={() => onOpen({ contactId: r.contactId, userId: r.userId })} data-testid={testid}
        className={`${card} flex w-full items-center gap-4 px-5 py-5 text-left transition-colors hover:border-[var(--ow-amber)]`}>
        <span className="min-w-0 flex-1">
          <span className="block text-lg text-[var(--ow-text-hi)]">{r.name}{r.winery && <span className="text-[var(--ow-text-mid)]"> · {r.winery}</span>}</span>
          {r.reason && <span className="mt-1 block text-base font-medium text-[var(--ow-amber)]">{r.reason}</span>}
          <span className="mt-1 block text-sm text-[var(--ow-text-mid)]">{r.line}</span>
        </span>
        <ChevronRight className="h-5 w-5 shrink-0 text-[var(--ow-text-lo)]" />
      </button>
    </li>
  );
}

function PeopleList({ rows, empty, prefix, onOpen }: { rows: CrmRow[]; empty: string; prefix: string; onOpen: (p: Pick) => void }) {
  if (!rows.length) return <p className={`${card} px-5 py-6 text-base text-[var(--ow-text-mid)]`} data-testid={`${prefix}-empty`}>{empty}</p>;
  return <ul className="space-y-3" data-testid={`${prefix}-list`}>{rows.map((r) => <PersonRow key={r.key} r={r} onOpen={onOpen} testid={`${prefix}-row-${r.key}`} />)}</ul>;
}

function ActionButton({ icon: Icon, label, onClick, disabled, testid }: { icon: typeof Send; label: string; onClick: () => void; disabled?: boolean; testid: string }) {
  return (
    <button type="button" onClick={onClick} disabled={disabled} data-testid={testid}
      className="flex w-full items-center gap-3 rounded-xl border border-[var(--ow-border-md)] px-4 py-3.5 text-left text-base text-[var(--ow-text-hi)] transition-colors hover:border-[var(--ow-amber)] disabled:cursor-not-allowed disabled:opacity-50">
      <Icon className="h-5 w-5 text-[var(--ow-amber)]" /> {label}
    </button>
  );
}

function PersonActions({ p }: { p: { contactId: number | null; userId: number | null; watching: boolean; notFit: boolean; canCard: boolean } }) {
  const utils = trpc.useUtils();
  const refresh = () => { utils.crmHome.invalidate(); };
  const onError = (e: { message: string }) => toast.error(e.message);
  const send = trpc.crmHome.sendToTelegram.useMutation({ onSuccess: () => { toast.success("Sent to your Telegram"); refresh(); }, onError });
  const watch = trpc.crmHome.watch.useMutation({ onSuccess: () => { toast.success("You'll get a Telegram ping when they're back"); refresh(); }, onError });
  const unfit = trpc.crmHome.notFit.useMutation({ onSuccess: () => { toast.success("Marked not a fit"); refresh(); }, onError });
  return (
    <div className="space-y-2" data-testid="crm-person-actions">
      {p.contactId && <ActionButton icon={Send} label={send.isPending ? "Writing the message…" : p.userId ? "Already signed up, no outreach message needed" : "Send a message card to my Telegram"} disabled={!p.canCard || send.isPending} onClick={() => send.mutate({ contactId: p.contactId! })} testid="crm-action-telegram" />}
      <ActionButton icon={Bell} label={p.watching ? "Watching: you'll hear when they're back" : "Tell me when they're back"} disabled={p.watching || watch.isPending} onClick={() => watch.mutate({ contactId: p.contactId ?? undefined, userId: p.userId ?? undefined })} testid="crm-action-watch" />
      {p.contactId && <ActionButton icon={Ban} label={p.notFit ? "Marked not a fit" : "Not a fit, stop contacting"} disabled={p.notFit || unfit.isPending} onClick={() => unfit.mutate({ contactId: p.contactId! })} testid="crm-action-notfit" />}
    </div>
  );
}

type PendingCard = { id: number; channel: string; kind: string; subject: string | null; body: string };

function PendingCards({ cards }: { cards: PendingCard[] }) {
  const utils = trpc.useUtils();
  const act = trpc.crmHome.cardAction.useMutation({
    onSuccess: (r) => { toast.success(r.note); utils.crmHome.invalidate(); },
    onError: (e) => toast.error(e.message),
  });
  if (!cards.length) return null;
  return (
    <div className="space-y-3" data-testid="crm-pending-cards">
      <h3 className="text-xs font-semibold uppercase tracking-[0.18em] text-[var(--ow-text-lo)]">Message waiting for you</h3>
      {cards.map((k) => (
        <div key={k.id} className={`${card} space-y-3 px-4 py-4`} data-testid={`crm-pending-${k.id}`}>
          {k.subject && <p className="text-sm font-semibold text-[var(--ow-text-hi)]">{k.subject}</p>}
          <p className="whitespace-pre-wrap text-sm text-[var(--ow-text-mid)]">{k.body}</p>
          <div className="flex flex-wrap gap-2">
            {k.channel === "email" && (
              <button type="button" disabled={act.isPending} onClick={() => act.mutate({ cardId: k.id, action: "send" })} data-testid={`crm-pending-send-${k.id}`}
                className="inline-flex items-center gap-2 rounded-xl bg-[var(--ow-amber)] px-4 py-2.5 text-base font-semibold text-[var(--ow-bg-base)] disabled:opacity-60">
                <Mail className="h-4 w-4" /> {act.isPending ? "Sending…" : "Send this email"}
              </button>
            )}
            <button type="button" disabled={act.isPending} onClick={() => act.mutate({ cardId: k.id, action: "skip" })} data-testid={`crm-pending-skip-${k.id}`}
              className="rounded-xl border border-[var(--ow-border-md)] px-4 py-2.5 text-base text-[var(--ow-text-hi)] disabled:opacity-60">Skip</button>
          </div>
        </div>
      ))}
    </div>
  );
}

function InstaDm({ contactId, handle, dm, sentAt }: { contactId: number; handle: string; dm: string; sentAt: number | null }) {
  const utils = trpc.useUtils();
  const mark = trpc.crmHome.markInstaSent.useMutation({ onSuccess: () => { toast.success("Marked as messaged on Instagram"); utils.crmHome.invalidate(); }, onError: (e) => toast.error(e.message) });
  const copy = () => navigator.clipboard.writeText(dm).then(() => toast.success("DM copied. Paste it into Instagram"), () => toast.error("Couldn't copy, select the text instead"));
  const btn = "inline-flex items-center gap-2 rounded-xl px-4 py-2.5 text-base disabled:opacity-60";
  return (
    <div className={`${card} space-y-3 px-4 py-4`} data-testid="crm-insta-dm">
      <h3 className="text-xs font-semibold uppercase tracking-[0.18em] text-[var(--ow-text-lo)]">Instagram DM, from your own account</h3>
      <p className="select-all whitespace-pre-wrap text-sm text-[var(--ow-text-mid)]" data-testid="crm-insta-dm-text">{dm}</p>
      <div className="flex flex-wrap gap-2">
        <button type="button" onClick={copy} className={`${btn} bg-[var(--ow-amber)] font-semibold text-[var(--ow-bg-base)]`} data-testid="crm-insta-copy"><Copy className="h-4 w-4" /> Copy DM</button>
        <a href={`https://ig.me/m/${handle}`} target="_blank" rel="noreferrer" className={`${btn} border border-[var(--ow-border-md)] text-[var(--ow-text-hi)]`} data-testid="crm-insta-open"><Instagram className="h-4 w-4" /> Open @{handle}</a>
        <button type="button" disabled={!!sentAt || mark.isPending} onClick={() => mark.mutate({ contactId })} className={`${btn} border border-[var(--ow-border-md)] text-[var(--ow-text-hi)]`} data-testid="crm-insta-mark-sent">
          <Check className="h-4 w-4" /> {sentAt ? "Messaged on Instagram" : "I sent it"}
        </button>
      </div>
    </div>
  );
}

function PersonSheet({ pick, onClose }: { pick: Pick | null; onClose: () => void }) {
  const q = trpc.crmHome.person.useQuery({ contactId: pick?.contactId ?? undefined, userId: pick?.userId ?? undefined }, { enabled: !!pick });
  const p = q.data;
  const clicks = p?.slug ? `/admin/activity?slug=${encodeURIComponent(p.slug)}` : p?.userId ? `/admin/activity?user=${p.userId}` : null;
  return (
    <Sheet open={!!pick} onOpenChange={(o) => !o && onClose()}>
      <SheetContent side="right" className="z-[200] w-full overflow-y-auto bg-[var(--ow-bg-base)] sm:max-w-lg" data-testid="crm-person-sheet">
        <SheetHeader className="text-left">
          <SheetTitle className="font-['Fraunces',serif] text-3xl text-[var(--ow-text-hi)]" data-testid="crm-person-name">{p?.name ?? "Loading…"}</SheetTitle>
          <SheetDescription className="text-base text-[var(--ow-text-mid)]">{p?.winery}</SheetDescription>
        </SheetHeader>
        {p && (
          <div className="mt-6 space-y-8 px-4 pb-10">
            <p className="text-base text-[var(--ow-text-hi)]" data-testid="crm-person-summary">{p.summary}</p>
            <div className="flex flex-wrap gap-4 text-sm text-[var(--ow-text-mid)]">
              {p.email && <a href={`mailto:${p.email}`} className="inline-flex items-center gap-1.5 hover:text-[var(--ow-amber)]" data-testid="crm-person-email"><Mail className="h-4 w-4" />{p.email}</a>}
              {p.mobile && <a href={`tel:${p.mobile}`} className="inline-flex items-center gap-1.5 hover:text-[var(--ow-amber)]" data-testid="crm-person-mobile"><Phone className="h-4 w-4" />{p.mobile}</a>}
              {p.instagram && <a href={`https://instagram.com/${p.instagram}`} target="_blank" rel="noreferrer" className="inline-flex items-center gap-1.5 hover:text-[var(--ow-amber)]" data-testid="crm-person-instagram"><Instagram className="h-4 w-4" />@{p.instagram}</a>}
              {clicks && <Link href={clicks} className="inline-flex items-center gap-1.5 hover:text-[var(--ow-amber)]" data-testid="crm-person-clicks"><MousePointerClick className="h-4 w-4" />See their clicks</Link>}
            </div>
            <PendingCards cards={p.pendingCards} />
            {p.contactId && p.instagram && p.instaDm && <InstaDm contactId={p.contactId} handle={p.instagram} dm={p.instaDm} sentAt={p.instaSentAt} />}
            <PersonActions p={p} />
            <div>
              <h3 className="mb-3 text-xs font-semibold uppercase tracking-[0.18em] text-[var(--ow-text-lo)]">Their story</h3>
              <ol className="space-y-3 border-l border-[var(--ow-border-md)] pl-5" data-testid="crm-person-story">
                {p.story.map((s, i) => (
                  <li key={i} className="relative">
                    <span className="absolute -left-[1.6rem] top-2 h-2 w-2 rounded-full bg-[var(--ow-amber)]" />
                    <span className="block text-xs text-[var(--ow-text-lo)]">{s.day}</span>
                    <span className="block text-base text-[var(--ow-text-hi)]">{s.text}</span>
                  </li>
                ))}
              </ol>
            </div>
          </div>
        )}
      </SheetContent>
    </Sheet>
  );
}

function OldTools() {
  return (
    <details className="mt-16 text-sm text-[var(--ow-text-mid)]" data-testid="crm-old-tools">
      <summary className="cursor-pointer select-none text-[var(--ow-text-lo)] hover:text-[var(--ow-amber)]">Old tools</summary>
      <ul className="mt-3 space-y-2">
        {OLD_TOOLS.map(([label, href]) => <li key={href}><Link href={href} className="hover:text-[var(--ow-amber)]" data-testid={`crm-old-${href.split("/").pop()}`}>{label}</Link></li>)}
      </ul>
    </details>
  );
}

function SectionTitle({ children }: { children: string }) {
  return <h2 className="mb-4 mt-12 text-base font-semibold text-[var(--ow-text-hi)] md:text-lg">{children}</h2>;
}

export default function AdminCrm() {
  const home = trpc.crmHome.home.useQuery();
  const [stage, setStage] = useState<Stage | null>(null);
  const [search, setSearch] = useState("");
  const [pick, setPick] = useState<Pick | null>(null);
  const stageQ = trpc.crmHome.stage.useQuery({ stage: stage! }, { enabled: !!stage });
  const term = search.trim();
  const searchQ = trpc.crmHome.search.useQuery({ q: term }, { enabled: term.length >= 2 });

  return (
    <div className="min-h-screen bg-[var(--ow-bg-base)]" data-testid="admin-crm-page">
      <div className="mx-auto max-w-3xl px-4 py-10 sm:px-6">
        <Link href="/admin" className="mb-6 inline-flex items-center gap-1.5 text-sm text-[var(--ow-amber)]" data-testid="crm-back"><ArrowLeft className="h-4 w-4" /> Admin</Link>
        <h1 className="font-['Fraunces',serif] text-4xl text-[var(--ow-text-hi)] sm:text-5xl">Your CRM</h1>
        <p className="mt-3 text-base text-[var(--ow-text-mid)]">Telegram does the daily sending and follow-ups. This page shows who needs you.</p>

        <div className="relative mt-8">
          <Search className="pointer-events-none absolute left-4 top-1/2 h-5 w-5 -translate-y-1/2 text-[var(--ow-text-lo)]" />
          <Input value={search} onChange={(e) => setSearch(e.target.value)} placeholder="Find anyone: name, winery or email" className="h-14 rounded-2xl pl-12 text-base" data-testid="crm-search" />
        </div>
        {term.length >= 2 && (
          <div className="mt-4" data-testid="crm-search-results">
            {searchQ.isLoading ? <p className="text-base text-[var(--ow-text-mid)]">Searching…</p> : <PeopleList rows={searchQ.data ?? []} empty="Nobody matches that." prefix="crm-search" onOpen={setPick} />}
          </div>
        )}

        <SectionTitle>Needs you today</SectionTitle>
        {home.isLoading && <p className="text-base text-[var(--ow-text-mid)]">Loading…</p>}
        {home.error && <p className="text-base text-red-500" data-testid="crm-error">{home.error.message}</p>}
        {home.data && <PeopleList rows={home.data.needsYou} empty="Nothing needs you right now. Telegram will ping you when someone comes back." prefix="crm-needs" onOpen={setPick} />}

        {home.data && home.data.instaQueue.length > 0 && (
          <>
            <SectionTitle>{`Instagram only: message these yourself (${home.data.instaQueue.length})`}</SectionTitle>
            <p className="-mt-2 mb-4 text-sm text-[var(--ow-text-mid)]">No email or mobile for these, so the daily sending skips them. Open one, copy the DM, send it from your Instagram, then tap "I sent it".</p>
            <PeopleList rows={home.data.instaQueue} empty="" prefix="crm-insta" onOpen={setPick} />
          </>
        )}

        <SectionTitle>Your funnel</SectionTitle>
        {home.data && <Funnel funnel={home.data.funnel as { id: Stage; count: number }[]} stage={stage} onPick={(s) => setStage(stage === s ? null : s)} />}
        {stage && (
          <div className="mt-4" data-testid="crm-stage-results">
            <p className="mb-3 text-sm text-[var(--ow-text-mid)]">{STAGE_LABEL[stage]}{stageQ.data ? ` · ${stageQ.data.length}` : ""}</p>
            {stageQ.isLoading ? <p className="text-base text-[var(--ow-text-mid)]">Loading…</p> : <PeopleList rows={stageQ.data ?? []} empty="Nobody here yet." prefix="crm-stage" onOpen={setPick} />}
          </div>
        )}

        <OldTools />
      </div>
      <PersonSheet pick={pick} onClose={() => setPick(null)} />
    </div>
  );
}
