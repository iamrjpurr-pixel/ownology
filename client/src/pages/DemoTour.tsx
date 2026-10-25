import { useState } from "react";
import { Link } from "wouter";
import { Helmet } from "react-helmet";
import { toast } from "sonner";
import { trpc } from "@/lib/trpc";
import { DemoGuide, GUIDE_STEPS } from "@/components/brand/DemoGuide";
import { AlertTriangle, ArrowRight, CheckCircle2, Eye, Lock, ShieldCheck } from "lucide-react";
import { Button } from "@/components/ui/button";
import { WineSpecView, ConfidentialBanner } from "@/components/brand/WineSpecView";
import { WineLogs } from "@/components/brand/WineLogs";
import { ContractorsPanel, ActivityFeed } from "@/components/brand/AccessPanels";
import { DemoAskOwen } from "@/components/brand/DemoAskOwen";
import { DEMO_ACTIVITY, DEMO_BRAND, DEMO_CONTRACTOR, DEMO_LOGS, DEMO_MEMBERS, DEMO_OWNER, DEMO_TANKS, DEMO_WINES } from "@/components/brand/demoData";
import type { Activity, LogKind, Member, Role, WineLog } from "@/components/brand/types";

const eyebrow = "text-xs font-semibold uppercase tracking-[0.16em] text-[var(--ow-amber)]";
const STATUS = {
  ok: { label: "On track", cls: "text-emerald-700 bg-emerald-600/10", Icon: CheckCircle2 },
  watch: { label: "Watch", cls: "text-[var(--ow-amber)] bg-[color-mix(in_oklch,var(--ow-amber)_12%,transparent)]", Icon: Eye },
  alert: { label: "Action", cls: "text-red-700 bg-red-600/10", Icon: AlertTriangle },
};

function RoleToggle({ role, setRole }: { role: Role; setRole: (r: Role) => void }) {
  const opts = [
    { id: "owner" as Role, who: DEMO_OWNER },
    { id: "contractor" as Role, who: DEMO_CONTRACTOR },
  ];
  return (
    <div className="grid gap-3 sm:grid-cols-2" data-testid="demo-role-toggle">
      {opts.map((o) => (
        <button key={o.id} type="button" onClick={() => setRole(o.id)} data-testid={`demo-role-${o.id}`}
          className={`rounded-lg border p-4 text-left transition-[border-color,transform,box-shadow] duration-200 hover:-translate-y-0.5 ${role === o.id ? "border-[var(--ow-amber)] shadow-[0_8px_28px_-14px_var(--ow-amber)]" : "border-[var(--ow-border)]"} bg-[var(--ow-bg-card)]`}>
          <div className="text-[0.65rem] font-bold uppercase tracking-[0.14em] text-[var(--ow-text-lo)]">See it as</div>
          <div className="mt-1 font-['Fraunces',serif] text-lg text-[var(--ow-text-hi)]">{o.who.name}</div>
          <div className="text-xs text-[var(--ow-text-mid)]">{o.who.title}</div>
        </button>
      ))}
    </div>
  );
}

function TankSnapshot() {
  return (
    <section className="space-y-5" data-testid="demo-tank-snapshot">
      <div>
        <div className={eyebrow}>01 · This morning's brief</div>
        <h2 className="mt-2 font-['Fraunces',serif] text-2xl text-[var(--ow-text-hi)] md:text-3xl">Every vessel, one glance.</h2>
      </div>
      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        {DEMO_TANKS.map((t) => {
          const s = STATUS[t.status];
          return (
            <div key={t.id} className="rounded-lg border border-[var(--ow-border)] bg-[var(--ow-bg-card)] p-5" data-testid={`demo-tank-${t.id.replace(/[^A-Za-z0-9]+/g, "-")}`}>
              <div className="flex items-center justify-between">
                <span className="font-mono text-sm font-bold text-[var(--ow-text-hi)]">{t.id}</span>
                <span className={`inline-flex items-center gap-1 rounded px-2 py-0.5 text-[0.65rem] font-bold uppercase tracking-wider ${s.cls}`}><s.Icon className="h-3 w-3" />{s.label}</span>
              </div>
              <div className="mt-3 text-sm font-semibold text-[var(--ow-text-hi)]">{t.wine}</div>
              <div className="text-xs text-[var(--ow-text-lo)]">{t.stage}</div>
              <div className="mt-3 font-mono text-sm text-[var(--ow-text-mid)]">{t.reading}</div>
              <p className="mt-2 text-xs leading-relaxed text-[var(--ow-text-mid)]">{t.note}</p>
            </div>
          );
        })}
      </div>
    </section>
  );
}

function VaultDemo({ role }: { role: Role }) {
  const [wineId, setWineId] = useState(DEMO_WINES[0].id);
  const [logs, setLogs] = useState<Record<number, WineLog[]>>(DEMO_LOGS);
  const wine = DEMO_WINES.find((w) => w.id === wineId)!;
  const me = role === "owner" ? DEMO_OWNER : DEMO_CONTRACTOR;
  const onAdd = (kind: LogKind, note: string, readings: Record<string, string>) => {
    const entry: WineLog = { id: Date.now(), authorEmail: me.email, authorRole: role, kind, note, readings: Object.fromEntries(Object.entries(readings).filter(([, v]) => v)), createdAt: Date.now() };
    setLogs((l) => ({ ...l, [wineId]: [entry, ...(l[wineId] ?? [])] }));
    toast.success("Added to the demo record", { description: "Demo only: nothing is saved, and it disappears when you refresh." });
  };
  return (
    <section className="space-y-5" data-testid="demo-vault">
      <div>
        <div className={eyebrow}>02 · The Brand Vault</div>
        <h2 className="mt-2 font-['Fraunces',serif] text-2xl text-[var(--ow-text-hi)] md:text-3xl">One shared record. Your specs, safely yours.</h2>
        <p className="mt-2 max-w-3xl text-sm text-[var(--ow-text-mid)]">
          Kate holds the oenology degree and writes the spec. Dan, an old friend, makes the wine at his crush facility. He works to her spec and logs every pump-over and reading alongside it, so they always see the same picture. Kate's specs stay protected in her vault, and she decides how much control to switch on.
        </p>
      </div>
      <div className="flex flex-wrap gap-2">
        {DEMO_WINES.map((w) => (
          <button key={w.id} type="button" onClick={() => setWineId(w.id)} data-testid={`demo-wine-${w.id}`}
            className={`rounded-full border px-4 py-1.5 text-sm transition-colors duration-150 ${wineId === w.id ? "border-[var(--ow-amber)] bg-[var(--ow-amber)] text-white" : "border-[var(--ow-border-md)] text-[var(--ow-text-mid)] hover:border-[var(--ow-amber)]"}`}>
            {w.vintage} {w.name}
          </button>
        ))}
      </div>
      <div className="space-y-8 rounded-lg border border-[var(--ow-border)] bg-[var(--ow-bg-card)] p-5 md:p-8">
        {role === "contractor" && <ConfidentialBanner brandName={DEMO_BRAND} viewer={DEMO_CONTRACTOR.email} />}
        <WineSpecView wine={wine} role={role} actions={role === "owner" ? <span className="rounded border border-[var(--ow-border-md)] px-2 py-1 text-xs text-[var(--ow-text-lo)]">Owner can edit</span> : undefined} />
        <p className="text-xs text-[var(--ow-text-lo)]" data-testid="demo-log-note">Try logging something below as {me.name}. It's a demo, so nothing is saved.</p>
        <WineLogs logs={logs[wineId] ?? []} onAdd={onAdd} />
      </div>
    </section>
  );
}

function OwnerControls({ role }: { role: Role }) {
  const [members, setMembers] = useState<Member[]>(DEMO_MEMBERS);
  const [activity, setActivity] = useState<Activity[]>(DEMO_ACTIVITY);
  const record = (action: string, target: string) =>
    setActivity((a) => [{ id: Date.now(), actorEmail: DEMO_OWNER.email, actorRole: "owner", action, target, createdAt: Date.now() }, ...a]);
  if (role === "contractor") {
    return (
      <section className="flex items-start gap-4 rounded-lg border border-dashed border-[var(--ow-border-md)] p-6" data-testid="demo-owner-locked">
        <Lock className="mt-1 h-5 w-5 text-[var(--ow-text-lo)]" />
        <div>
          <h3 className="font-['Fraunces',serif] text-xl text-[var(--ow-text-hi)]">Access settings sit with the owner</h3>
          <p className="mt-1 text-sm text-[var(--ow-text-mid)]">Who has access, the shared history and exports are looked after by Kate. Switch to Kate to see them.</p>
        </div>
      </section>
    );
  }
  return (
    <section className="space-y-5" data-testid="demo-owner-controls">
      <div>
        <div className={eyebrow}>03 · Kate's controls</div>
        <h2 className="mt-2 font-['Fraunces',serif] text-2xl text-[var(--ow-text-hi)] md:text-3xl">Controls, if and when you need them.</h2>
      </div>
      <div className="grid gap-6 lg:grid-cols-2">
        <div className="min-w-0 rounded-lg border border-[var(--ow-border)] bg-[var(--ow-bg-card)] p-6">
          <ContractorsPanel members={members}
            onInvite={(email) => { setMembers((m) => [{ id: Date.now(), email, invitedAt: Date.now(), status: "invited" }, ...m]); record("invited", email); }}
            onRevoke={(id) => { const m = members.find((x) => x.id === id); setMembers((all) => all.map((x) => (x.id === id ? { ...x, status: "revoked" } : x))); if (m) record("revoked", m.email); }} />
        </div>
        <div className="min-w-0 rounded-lg border border-[var(--ow-border)] bg-[var(--ow-bg-card)] p-6"><ActivityFeed items={activity} /></div>
      </div>
    </section>
  );
}

export default function DemoTour() {
  const [role, setRole] = useState<Role>("owner");
  const [step, setStep] = useState<number | null>(null);
  const [guideDone, setGuideDone] = useState(false);
  const invite = typeof window !== "undefined" ? new URLSearchParams(window.location.search).get("for") ?? undefined : undefined;
  const who = trpc.demo.personalise.useQuery({ invite: invite ?? "" }, { enabled: !!invite });
  const guest = who.data;

  const goStep = (s: number) => {
    setStep(s);
    setRole(GUIDE_STEPS[s].role);
    setTimeout(() => document.getElementById(GUIDE_STEPS[s].target)?.scrollIntoView({ behavior: "smooth", block: "start" }), 60);
  };
  const closeGuide = () => {
    setStep(null);
    setGuideDone(true);
    setTimeout(() => document.getElementById("demo-ask-section")?.scrollIntoView({ behavior: "smooth", block: "start" }), 60);
  };

  return (
    <div className="min-h-screen bg-[var(--ow-bg-base)]" data-testid="demo-tour-page">
      {step !== null && <DemoGuide step={step} onStep={goStep} onClose={closeGuide} />}
      <Helmet>
        <title>Free demo · Ownology</title>
        <meta name="description" content="Try Ownology with a made-up winery: the morning brief, a Brand Vault that keeps your wine IP safe while you share it with your winemaker, and three free questions to Owen." />
      </Helmet>
      <header className="border-b border-[var(--ow-border)]">
        <div className="mx-auto flex max-w-6xl items-center justify-between px-6 py-4">
          <Link href="/" className="font-['Fraunces',serif] text-xl font-bold text-[var(--ow-amber)]" data-testid="demo-home-link">Ownology</Link>
          <div className="flex items-center gap-4 text-sm">
            <Link href="/pricing?from=demo-tour" className="text-[var(--ow-text-mid)] hover:text-[var(--ow-text-hi)]" data-testid="demo-nav-pricing">Pricing</Link>
            <Link href="/login?next=/brand" className="text-[var(--ow-text-mid)] hover:text-[var(--ow-text-hi)]" data-testid="demo-nav-login">Log in</Link>
          </div>
        </div>
      </header>

      <section className="mx-auto max-w-6xl px-6 pb-12 pt-14 md:pt-20">
        <div className={eyebrow} data-testid="demo-eyebrow">
          {guest ? `Prepared for ${guest.firstName}${guest.winery ? ` · ${guest.winery}` : ""}` : "Free demo · no sign-up · sample data"}
        </div>
        <h1 className="mt-4 max-w-4xl font-['Fraunces',serif] text-4xl leading-[1.05] tracking-tight text-[var(--ow-text-hi)] sm:text-5xl lg:text-6xl">
          {guest ? `${guest.firstName}, meet ${DEMO_BRAND}.` : `Meet ${DEMO_BRAND}. A made-up winery you can poke at.`}
        </h1>
        <p className="mt-6 max-w-2xl text-base text-[var(--ow-text-mid)] md:text-lg">
          Kate owns the brand and holds an oenology degree. Dan, a long-time friend, makes her wine at his crush facility. See how Ownology gives them one shared record of every wine, while keeping Kate's wine IP safely hers.
        </p>
        <div className="mt-10 flex flex-wrap items-center gap-4">
          <Button size="lg" className="gap-2" onClick={() => goStep(0)} data-testid="demo-guide-start">
            {guideDone ? "Replay the 3-step tour" : "Start the 3-step tour"} <ArrowRight className="h-4 w-4" />
          </Button>
          <span className="text-sm text-[var(--ow-text-lo)]">About 3 minutes. Or explore on your own below.</span>
        </div>
        <div className="mt-8 max-w-3xl"><RoleToggle role={role} setRole={setRole} /></div>
        <p className="mt-3 flex items-center gap-2 text-xs text-[var(--ow-text-lo)]"><ShieldCheck className="h-3.5 w-3.5" /> Nothing you do here is saved. It's all sample data.</p>
      </section>

      <div className="mx-auto max-w-6xl space-y-20 px-6 pb-20">
        <TankSnapshot />
        <div id="demo-vault" className="scroll-mt-56 md:scroll-mt-28"><VaultDemo role={role} /></div>
        <div id="demo-owner-section" className="scroll-mt-56 md:scroll-mt-28"><OwnerControls role={role} /></div>
        <section id="demo-ask-section" className="scroll-mt-8 space-y-5">
          <div className={eyebrow}>04 · Ask Owen</div>
          <DemoAskOwen invite={guest?.hasEmail ? invite : undefined} />
        </section>
        <section className="rounded-lg bg-[var(--ow-text-hi)] p-8 text-[var(--ow-bg-base)] md:p-12" data-testid="demo-final-cta">
          <h2 className="max-w-2xl font-['Fraunces',serif] text-3xl leading-tight md:text-4xl">Ready to put your own wines in a vault?</h2>
          <p className="mt-3 max-w-xl text-sm opacity-80">Sign in, write your first spec, and invite the winemaker you work with. Your specs stay yours, and you set the level of access.</p>
          <div className="mt-8 flex flex-wrap gap-3">
            <Link href="/login?next=/brand"><Button size="lg" className="gap-2 bg-[var(--ow-amber)] text-white hover:opacity-90" data-testid="demo-cta-open-vault">Open my Brand Vault <ArrowRight className="h-4 w-4" /></Button></Link>
            <Link href="/pricing?from=demo-tour"><Button size="lg" variant="outline" className="border-current bg-transparent text-inherit hover:bg-white/10" data-testid="demo-cta-pricing">See pricing</Button></Link>
          </div>
        </section>
      </div>
    </div>
  );
}
