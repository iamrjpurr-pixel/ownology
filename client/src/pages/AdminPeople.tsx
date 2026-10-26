import { useMemo, useState } from "react";
import { Link } from "wouter";
import { ArrowLeft, Search, ChevronDown, ChevronUp, Mail, MousePointerClick, UserRound } from "lucide-react";
import { toast } from "sonner";
import { trpc } from "@/lib/trpc";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import type { CrmKind, CrmPerson } from "../../../server/routers/crmRouter";

const KIND_LABEL: Record<CrmKind, string> = {
  contact: "Outreach", survey: "Survey", lead: "Sign-up", quiz: "Quiz", demo: "Demo",
  reservation: "Reserved", member: "Paying", access: "Access link", referral: "Referred", account: "Account",
};
const KIND_TONE: Partial<Record<CrmKind, string>> = {
  reservation: "bg-[var(--ow-amber)] text-white border-transparent",
  member: "bg-emerald-700 text-white border-transparent",
};

const FILTERS: { id: string; label: string; test: (p: CrmPerson) => boolean }[] = [
  { id: "all", label: "Everyone", test: () => true },
  { id: "ready", label: "Wants to pay", test: (p) => !!p.reservation && ["pending", "contacted"].includes(p.reservation.status) },
  { id: "paying", label: "Paying", test: (p) => p.kinds.includes("member") },
  { id: "outreach", label: "In outreach", test: (p) => p.kinds.includes("contact") },
  { id: "account", label: "Has an account", test: (p) => p.kinds.includes("account") },
  { id: "inbound", label: "Found us themselves", test: (p) => !p.kinds.includes("contact") && p.kinds.some((k) => ["lead", "quiz", "demo", "referral"].includes(k)) },
];

const fmt = (ms: number) => (ms ? new Date(ms).toLocaleDateString("en-AU", { day: "numeric", month: "short", year: "2-digit" }) : "—");
const card = "rounded-lg border border-[var(--ow-border)] bg-[var(--ow-bg-card)]";

function KindChip({ kind }: { kind: CrmKind }) {
  return (
    <span className={`rounded border px-1.5 py-0.5 text-[0.65rem] font-semibold uppercase tracking-wider ${KIND_TONE[kind] ?? "border-[var(--ow-border-md)] text-[var(--ow-text-mid)]"}`}>
      {KIND_LABEL[kind]}
    </span>
  );
}

function ReservationStatus({ id, status }: { id: number; status: string }) {
  const utils = trpc.useUtils();
  const m = trpc.foundingMembers.updateReservationStatus.useMutation({
    onSuccess: () => { toast.success("Reservation updated"); utils.crm.people.invalidate(); },
    onError: (e) => toast.error(e.message),
  });
  return (
    <Select value={status} onValueChange={(v) => m.mutate({ id, status: v as "pending" | "contacted" | "paid" | "cancelled" })}>
      <SelectTrigger className="h-8 w-40" data-testid={`people-reservation-status-${id}`}><SelectValue /></SelectTrigger>
      <SelectContent>
        {["pending", "contacted", "paid", "cancelled"].map((s) => <SelectItem key={s} value={s}>{s[0].toUpperCase() + s.slice(1)}</SelectItem>)}
      </SelectContent>
    </Select>
  );
}

function PersonDetail({ p }: { p: CrmPerson }) {
  const [all, setAll] = useState(false);
  const records = all ? p.records : p.records.slice(0, 12);
  const activity = p.slug ? `/admin/activity?slug=${encodeURIComponent(p.slug)}` : p.userId ? `/admin/activity?user=${p.userId}` : null;
  const btn = "inline-flex items-center gap-1.5 rounded border border-[var(--ow-border-md)] px-2.5 py-1.5 text-xs text-[var(--ow-text-hi)] hover:border-[var(--ow-amber)] transition-colors";
  return (
    <div className="border-t border-[var(--ow-border)] px-4 py-4 sm:px-5" data-testid={`people-detail-${p.key}`}>
      <div className="mb-4 flex flex-wrap items-center gap-2">
        {p.slug && <Link href={`/admin/contacts?slug=${encodeURIComponent(p.slug)}`} className={btn} data-testid="people-open-contact"><UserRound className="h-3.5 w-3.5" /> Open contact card</Link>}
        {activity && <Link href={activity} className={btn} data-testid="people-open-activity"><MousePointerClick className="h-3.5 w-3.5" /> See their clicks</Link>}
        {p.email && <a href={`mailto:${p.email}`} className={btn} data-testid="people-email"><Mail className="h-3.5 w-3.5" /> Email</a>}
        {p.otherEmails.length > 0 && <span className="text-xs text-[var(--ow-text-lo)]" data-testid="people-other-emails">Also signs in as {p.otherEmails.join(", ")}</span>}
        {p.reservation && <span className="flex items-center gap-2 text-xs text-[var(--ow-text-mid)]">Founding slot: <ReservationStatus id={p.reservation.id} status={p.reservation.status} /></span>}
      </div>
      <ol className="space-y-2">
        {records.map((r, i) => (
          <li key={i} className="flex gap-3 text-sm">
            <span className="w-20 shrink-0 font-mono text-xs text-[var(--ow-text-lo)]">{fmt(r.at)}</span>
            <span className="text-[var(--ow-text-mid)]">{r.summary}</span>
          </li>
        ))}
      </ol>
      {p.records.length > records.length && (
        <button type="button" onClick={() => setAll(true)} className="mt-3 text-xs text-[var(--ow-amber)]" data-testid="people-show-all-records">Show all {p.records.length}</button>
      )}
    </div>
  );
}

function PersonRow({ p }: { p: CrmPerson }) {
  const [open, setOpen] = useState(false);
  return (
    <li className={card} data-testid={`people-row-${p.key}`}>
      <button type="button" onClick={() => setOpen((o) => !o)} className="flex w-full items-start justify-between gap-3 px-4 py-3 text-left sm:px-5" data-testid={`people-toggle-${p.key}`}>
        <span className="min-w-0">
          <span className="block truncate text-[var(--ow-text-hi)]">{p.name}{p.winery && <span className="text-[var(--ow-text-lo)]"> · {p.winery}</span>}</span>
          <span className="mt-1.5 flex flex-wrap gap-1.5">{p.kinds.map((k) => <KindChip key={k} kind={k} />)}</span>
        </span>
        <span className="flex shrink-0 items-center gap-2 text-xs text-[var(--ow-text-lo)]">
          <span className="hidden sm:inline">{p.email ?? "no email"}</span> · {fmt(p.lastAt)}
          {open ? <ChevronUp className="h-4 w-4" /> : <ChevronDown className="h-4 w-4" />}
        </span>
      </button>
      {open && <PersonDetail p={p} />}
    </li>
  );
}

export default function AdminPeople() {
  const q = trpc.crm.people.useQuery();
  const [filter, setFilter] = useState(() => new URLSearchParams(window.location.search).get("filter") ?? "all");
  const [search, setSearch] = useState(() => new URLSearchParams(window.location.search).get("q") ?? "");
  const people = q.data ?? [];
  const counts = useMemo(() => Object.fromEntries(FILTERS.map((f) => [f.id, people.filter(f.test).length])), [people]);
  const shown = useMemo(() => {
    const f = FILTERS.find((x) => x.id === filter) ?? FILTERS[0];
    const s = search.trim().toLowerCase();
    return people.filter((p) => f.test(p) && (!s || `${p.name} ${p.winery} ${p.email ?? ""} ${p.otherEmails.join(" ")}`.toLowerCase().includes(s)));
  }, [people, filter, search]);

  return (
    <div className="min-h-screen bg-[var(--ow-bg-base)]" data-testid="admin-people-page">
      <div className="mx-auto max-w-5xl px-4 py-10 sm:px-6">
        <Link href="/admin" className="mb-4 inline-flex items-center gap-1.5 text-sm text-[var(--ow-amber)]" data-testid="people-back"><ArrowLeft className="h-4 w-4" /> Admin</Link>
        <h1 className="font-['Fraunces',serif] text-4xl text-[var(--ow-text-hi)] sm:text-5xl">People</h1>
        <p className="mt-2 max-w-2xl text-sm text-[var(--ow-text-mid)]">Everyone who has touched Ownology, once each: outreach, sign-ups, quiz, demo, survey, founding reservations, paying members, access links and accounts, matched by email.</p>

        <div className="mt-8 flex flex-wrap gap-2" data-testid="people-filters">
          {FILTERS.map((f) => (
            <button key={f.id} type="button" onClick={() => setFilter(f.id)} data-testid={`people-filter-${f.id}`}
              className={`rounded-full border px-3.5 py-1.5 text-sm transition-colors ${filter === f.id ? "border-[var(--ow-amber)] bg-[var(--ow-amber)] text-white" : "border-[var(--ow-border-md)] text-[var(--ow-text-mid)] hover:border-[var(--ow-amber)]"}`}>
              {f.label} <span className="opacity-70">{counts[f.id] ?? 0}</span>
            </button>
          ))}
        </div>
        <div className="relative mt-4">
          <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-[var(--ow-text-lo)]" />
          <Input value={search} onChange={(e) => setSearch(e.target.value)} placeholder="Search name, winery or email" className="pl-9" data-testid="people-search" />
        </div>

        {q.isLoading && <p className="mt-8 text-sm text-[var(--ow-text-lo)]">Loading…</p>}
        {q.error && <p className="mt-8 text-sm text-red-600" data-testid="people-error">{q.error.message}</p>}
        {q.data && shown.length === 0 && <p className="mt-8 text-sm text-[var(--ow-text-lo)]" data-testid="people-empty">No one here yet.</p>}
        <ul className="mt-6 space-y-2" data-testid="people-list">
          {shown.slice(0, 300).map((p) => <PersonRow key={p.key} p={p} />)}
        </ul>
        {shown.length > 300 && <p className="mt-4 text-xs text-[var(--ow-text-lo)]">Showing the 300 most recent. Search to narrow down.</p>}
      </div>
    </div>
  );
}
