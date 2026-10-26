import { useEffect, useMemo, useState } from "react";
import { Link } from "wouter";
import { toast } from "sonner";
import { Archive, Download, Pencil, Plus, Wine as WineIcon } from "lucide-react";
import { trpc } from "@/lib/trpc";
import { Button } from "@/components/ui/button";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { WineSpecView, ConfidentialBanner } from "@/components/brand/WineSpecView";
import { WineLogs } from "@/components/brand/WineLogs";
import { ContractorsPanel, ActivityFeed } from "@/components/brand/AccessPanels";
import { WineEditorDialog } from "@/components/brand/WineEditorDialog";
import { BrandNameEditor, looksAutoNamed } from "@/components/brand/BrandNameEditor";
import type { LogKind, Role, Wine, WineInput } from "@/components/brand/types";

const BRAND_KEY = "ow_brand_vault";

function WineList({ wines, selected, onSelect }: { wines: Wine[]; selected: number | null; onSelect: (id: number) => void }) {
  return (
    <ul className="space-y-1" data-testid="wine-list">
      {wines.map((w) => (
        <li key={w.id}>
          <button type="button" onClick={() => onSelect(w.id)} data-testid={`wine-list-item-${w.id}`}
            className={`w-full rounded-md px-3 py-2.5 text-left transition-colors duration-150 ${selected === w.id ? "bg-[color-mix(in_oklch,var(--ow-amber)_12%,transparent)] text-[var(--ow-text-hi)]" : "text-[var(--ow-text-mid)] hover:bg-[var(--ow-bg-inset)]"}`}>
            <div className="text-sm font-semibold">{w.name}</div>
            <div className="text-xs text-[var(--ow-text-lo)]">{[w.vintage, w.style].filter(Boolean).join(" · ")}</div>
          </button>
        </li>
      ))}
    </ul>
  );
}

function WineDetail({ wineryId, wineId, role, brandName, viewer, onEdit }: { wineryId: number; wineId: number; role: Role; brandName: string; viewer: string; onEdit: (w: Wine) => void }) {
  const utils = trpc.useUtils();
  const q = trpc.brandPortal.getWine.useQuery({ wineryId, wineId });
  const addLog = trpc.brandPortal.addLog.useMutation();
  const archive = trpc.brandPortal.archiveWine.useMutation();
  if (q.isLoading) return <p className="text-sm text-[var(--ow-text-lo)]">Loading spec…</p>;
  if (q.error || !q.data) return <p className="text-sm text-red-600">{q.error?.message ?? "Not found"}</p>;
  const { wine, logs } = q.data;
  const onAdd = async (kind: LogKind, note: string, readings: Record<string, string>) => {
    try {
      await addLog.mutateAsync({ wineryId, wineId, kind, note, readings });
      utils.brandPortal.getWine.invalidate({ wineryId, wineId });
      toast.success("Added to the record");
    } catch (e) { toast.error((e as Error).message); throw e; }
  };
  const onArchive = async () => {
    if (!confirm(`Archive ${wine.name}? Contractors will no longer see it.`)) return;
    await archive.mutateAsync({ wineryId, wineId });
    utils.brandPortal.listWines.invalidate({ wineryId });
  };
  const ownerActions = role === "owner" && (
    <div className="flex gap-2">
      <Button size="sm" variant="outline" className="gap-1.5" onClick={() => onEdit(wine)} data-testid="wine-edit-button"><Pencil className="h-3.5 w-3.5" /> Edit</Button>
      <Button size="sm" variant="ghost" className="gap-1.5" onClick={onArchive} data-testid="wine-archive-button"><Archive className="h-3.5 w-3.5" /> Archive</Button>
    </div>
  );
  return (
    <div className="space-y-8">
      {role === "contractor" && <ConfidentialBanner brandName={brandName} viewer={viewer} />}
      <WineSpecView wine={wine} role={role} actions={ownerActions || undefined} />
      <WineLogs logs={logs} onAdd={onAdd} pending={addLog.isPending} />
    </div>
  );
}

function WinesTab({ wineryId, role, brandName, viewer }: { wineryId: number; role: Role; brandName: string; viewer: string }) {
  const utils = trpc.useUtils();
  const list = trpc.brandPortal.listWines.useQuery({ wineryId });
  const save = trpc.brandPortal.saveWine.useMutation();
  const exportVault = trpc.brandPortal.exportVault.useMutation();
  const [selected, setSelected] = useState<number | null>(null);
  const [editing, setEditing] = useState<{ open: boolean; wine: Wine | null }>({ open: false, wine: null });
  const wines = list.data?.wines ?? [];
  useEffect(() => { if (wines.length && !wines.some((w) => w.id === selected)) setSelected(wines[0].id); }, [wines, selected]);

  const onSave = async (w: WineInput) => {
    try {
      const r = await save.mutateAsync({ wineryId, wineId: editing.wine?.id, wine: { ...w, targets: w.targets as Record<string, string>, regime: w.regime as Record<string, string> } });
      setEditing({ open: false, wine: null });
      await utils.brandPortal.listWines.invalidate({ wineryId });
      utils.brandPortal.getWine.invalidate({ wineryId, wineId: r.id });
      setSelected(r.id);
      toast.success("Spec saved");
    } catch (e) { toast.error((e as Error).message); }
  };
  const onExport = async () => {
    const data = await exportVault.mutateAsync({ wineryId });
    const url = URL.createObjectURL(new Blob([JSON.stringify(data, null, 2)], { type: "application/json" }));
    const a = Object.assign(document.createElement("a"), { href: url, download: `${brandName.replace(/\W+/g, "-").toLowerCase()}-vault.json` });
    a.click();
    URL.revokeObjectURL(url);
  };

  return (
    <div className="grid gap-8 lg:grid-cols-[280px_1fr]">
      <aside className="space-y-4">
        {role === "owner" && (
          <div className="flex gap-2">
            <Button size="sm" className="flex-1 gap-1.5" onClick={() => setEditing({ open: true, wine: null })} data-testid="new-wine-button"><Plus className="h-4 w-4" /> New wine</Button>
            <Button size="sm" variant="outline" className="gap-1.5" onClick={onExport} disabled={exportVault.isPending} data-testid="export-vault-button"><Download className="h-4 w-4" /> Export</Button>
          </div>
        )}
        {list.isLoading ? <p className="text-sm text-[var(--ow-text-lo)]">Loading…</p> : wines.length ? (
          <WineList wines={wines} selected={selected} onSelect={setSelected} />
        ) : (
          <p className="text-sm text-[var(--ow-text-lo)]" data-testid="wine-list-empty">
            {role === "owner" ? "No wine specs yet. Start with your flagship." : "The owner hasn't shared any wine specs yet."}
          </p>
        )}
      </aside>
      <main className="min-w-0 rounded-lg border border-[var(--ow-border)] bg-[var(--ow-bg-card)] p-5 md:p-8">
        {selected ? (
          <WineDetail wineryId={wineryId} wineId={selected} role={role} brandName={brandName} viewer={viewer} onEdit={(w) => setEditing({ open: true, wine: w })} />
        ) : (
          <div className="flex flex-col items-center py-16 text-center text-[var(--ow-text-lo)]"><WineIcon className="mb-3 h-8 w-8" /><p className="text-sm">Pick a wine to see its spec and cellar record.</p></div>
        )}
      </main>
      <WineEditorDialog open={editing.open} onOpenChange={(o) => setEditing((s) => ({ ...s, open: o }))} initial={editing.wine} onSave={onSave} pending={save.isPending} />
    </div>
  );
}

function useOwnerPanels(wineryId: number) {
  const utils = trpc.useUtils();
  const members = trpc.brandPortal.members.useQuery({ wineryId });
  const activity = trpc.brandPortal.activity.useQuery({ wineryId });
  const invite = trpc.brandPortal.invite.useMutation();
  const revoke = trpc.brandPortal.revoke.useMutation();
  const refresh = () => { utils.brandPortal.members.invalidate({ wineryId }); utils.brandPortal.activity.invalidate({ wineryId }); };
  return {
    contractors: (
      <ContractorsPanel members={members.data ?? []} pending={invite.isPending}
        onInvite={async (email) => {
          try { await invite.mutateAsync({ wineryId, email }); toast.success(`Invite sent to ${email}`); refresh(); }
          catch (e) { toast.error((e as Error).message); throw e; }
        }}
        onRevoke={async (id) => {
          if (!confirm("Remove this contractor's access now?")) return;
          await revoke.mutateAsync({ wineryId, memberId: id });
          toast.success("Access removed");
          refresh();
        }} />
    ),
    activity: <ActivityFeed items={activity.data ?? []} />,
  };
}

function OwnerSections({ wineryId, wines }: { wineryId: number; wines: React.ReactNode }) {
  const t = useOwnerPanels(wineryId);
  return (
    <Tabs defaultValue="wines">
      <TabsList data-testid="vault-tabs">
        <TabsTrigger value="wines" data-testid="tab-wines">Wine specs</TabsTrigger>
        <TabsTrigger value="contractors" data-testid="tab-contractors">Contractors</TabsTrigger>
        <TabsTrigger value="activity" data-testid="tab-activity">Activity history</TabsTrigger>
      </TabsList>
      <TabsContent value="wines" className="mt-6">{wines}</TabsContent>
      <TabsContent value="contractors" className="mt-6 max-w-2xl">{t.contractors}</TabsContent>
      <TabsContent value="activity" className="mt-6 max-w-2xl">{t.activity}</TabsContent>
    </Tabs>
  );
}

export default function BrandPortal() {
  const my = trpc.brandPortal.myBrands.useQuery();
  const brands = my.data?.brands ?? [];
  const [brandId, setBrandId] = useState<number | null>(() => Number(localStorage.getItem(BRAND_KEY)) || null);
  const current = useMemo(() => brands.find((b) => b.wineryId === brandId) ?? brands[0], [brands, brandId]);
  useEffect(() => { if (current) localStorage.setItem(BRAND_KEY, String(current.wineryId)); }, [current]);

  if (my.error) {
    return (
      <div className="mx-auto max-w-lg px-6 py-24 text-center" data-testid="vault-signin-required">
        <h1 className="font-['Fraunces',serif] text-3xl text-[var(--ow-text-hi)]">Sign in to open your Brand Vault</h1>
        <Link href="/login?next=/brand"><Button className="mt-6" data-testid="vault-signin-button">Sign in</Button></Link>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-[var(--ow-bg-base)]" data-testid="brand-portal-page">
      <header className="border-b border-[var(--ow-border)] bg-[var(--ow-bg-card)]">
        <div className="mx-auto flex max-w-6xl flex-wrap items-center justify-between gap-4 px-6 py-5">
          <div>
            <Link href="/" className="text-xs font-semibold uppercase tracking-[0.16em] text-[var(--ow-amber)]">Ownology</Link>
            <h1 className="font-['Fraunces',serif] text-2xl text-[var(--ow-text-hi)] md:text-3xl">Brand Vault</h1>
            {current && (
              <div className="mt-1 flex flex-wrap items-center gap-2 text-sm text-[var(--ow-text-mid)]">
                <span data-testid="vault-brand-name">{current.name}</span>
                {current.role === "owner" && <BrandNameEditor wineryId={current.wineryId} name={current.name} />}
              </div>
            )}
          </div>
          {brands.length > 0 && current && (
            <div className="flex items-center gap-3">
              <span className={`rounded px-2 py-1 text-[0.65rem] font-bold uppercase tracking-wider ${current.role === "owner" ? "bg-[var(--ow-amber)] text-white" : "border border-[var(--ow-border-md)] text-[var(--ow-text-mid)]"}`} data-testid="vault-role-badge">
                {current.role === "owner" ? "Owner" : "Contract winemaker"}
              </span>
              <Select value={String(current.wineryId)} onValueChange={(v) => setBrandId(Number(v))}>
                <SelectTrigger className="w-auto min-w-[220px] max-w-[340px]" data-testid="brand-switcher"><SelectValue /></SelectTrigger>
                <SelectContent>
                  {brands.map((b) => (
                    <SelectItem key={b.wineryId} value={String(b.wineryId)} data-testid={`brand-option-${b.wineryId}`}>{b.name}{b.role === "contractor" ? " · contract" : ""}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          )}
        </div>
      </header>
      <div className="mx-auto max-w-6xl px-6 py-10">
        {my.isLoading ? <p className="text-sm text-[var(--ow-text-lo)]">Loading your brands…</p> : !current ? (
          <p className="text-sm text-[var(--ow-text-mid)]" data-testid="vault-no-brands">No brands linked to {my.data?.email} yet. If a brand owner invited you, sign in with the email address they used.</p>
        ) : current.role === "owner" ? (
          <>
            {looksAutoNamed(current.name) && (
              <div className="mb-8"><BrandNameEditor key={`p-${current.wineryId}`} wineryId={current.wineryId} name={current.name} prompt /></div>
            )}
            <OwnerSections key={current.wineryId} wineryId={current.wineryId}
              wines={<WinesTab wineryId={current.wineryId} role="owner" brandName={current.name} viewer={my.data!.email} />} />
          </>
        ) : (
          <WinesTab key={current.wineryId} wineryId={current.wineryId} role="contractor" brandName={current.name} viewer={my.data!.email} />
        )}
      </div>
    </div>
  );
}
