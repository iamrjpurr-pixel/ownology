import { useEffect, useState } from "react";
import { Plus, X } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { REGIME_LABELS, TARGET_LABELS, emptyWine, type WineInput } from "./types";

const lbl = "mb-1 block text-xs font-semibold text-[var(--ow-text-mid)]";

export function WineEditorDialog({ open, onOpenChange, initial, onSave, pending }: {
  open: boolean;
  onOpenChange: (o: boolean) => void;
  initial: WineInput | null;
  onSave: (w: WineInput) => Promise<unknown> | void;
  pending?: boolean;
}) {
  const [w, setW] = useState<WineInput>(emptyWine());
  useEffect(() => { if (open) setW(initial ?? emptyWine()); }, [open, initial]);
  const set = <K extends keyof WineInput>(k: K, v: WineInput[K]) => setW((p) => ({ ...p, [k]: v }));
  const setBlend = (i: number, patch: Partial<WineInput["blend"][number]>) =>
    set("blend", w.blend.map((b, j) => (j === i ? { ...b, ...patch } : b)));
  const total = w.blend.reduce((s, b) => s + (Number(b.pct) || 0), 0);

  const submit = (e: React.FormEvent) => {
    e.preventDefault();
    onSave({ ...w, blend: w.blend.filter((b) => b.variety.trim()) });
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-h-[90vh] overflow-y-auto sm:max-w-2xl" data-testid="wine-editor-dialog">
        <DialogHeader><DialogTitle className="font-['Fraunces',serif] text-2xl">{initial ? "Edit wine spec" : "New wine spec"}</DialogTitle></DialogHeader>
        <form onSubmit={submit} className="space-y-6">
          <div className="grid gap-3 sm:grid-cols-[1fr_110px]">
            <div><label className={lbl}>Wine name</label><Input required maxLength={160} value={w.name} onChange={(e) => set("name", e.target.value)} data-testid="wine-name-input" /></div>
            <div><label className={lbl}>Vintage</label><Input type="number" min={1900} max={2100} value={w.vintage ?? ""} onChange={(e) => set("vintage", e.target.value ? Number(e.target.value) : null)} data-testid="wine-vintage-input" /></div>
          </div>
          <div><label className={lbl}>Style</label><Input maxLength={160} placeholder="e.g. Cool-climate Shiraz, whole-bunch, medium-bodied" value={w.style} onChange={(e) => set("style", e.target.value)} data-testid="wine-style-input" /></div>

          <fieldset className="space-y-2">
            <legend className={lbl}>Blend <span className={total === 100 ? "text-emerald-700" : "text-[var(--ow-amber)]"}>({total}%)</span></legend>
            {w.blend.map((b, i) => (
              <div key={i} className="grid grid-cols-[1fr_70px_1fr_32px] gap-2">
                <Input placeholder="Variety" value={b.variety} onChange={(e) => setBlend(i, { variety: e.target.value })} data-testid={`blend-variety-${i}`} />
                <Input type="number" min={0} max={100} value={b.pct} onChange={(e) => setBlend(i, { pct: Number(e.target.value) })} data-testid={`blend-pct-${i}`} />
                <Input placeholder="Block / grower" value={b.source} onChange={(e) => setBlend(i, { source: e.target.value })} data-testid={`blend-source-${i}`} />
                <Button type="button" size="icon" variant="ghost" onClick={() => set("blend", w.blend.filter((_, j) => j !== i))} aria-label="Remove component" data-testid={`blend-remove-${i}`}><X className="h-4 w-4" /></Button>
              </div>
            ))}
            {w.blend.length < 12 && (
              <Button type="button" size="sm" variant="outline" className="gap-1" onClick={() => set("blend", [...w.blend, { variety: "", pct: 0, source: "" }])} data-testid="blend-add-button"><Plus className="h-3.5 w-3.5" /> Add component</Button>
            )}
          </fieldset>

          <fieldset>
            <legend className={lbl}>Analytical targets</legend>
            <div className="grid grid-cols-3 gap-2 sm:grid-cols-6">
              {Object.entries(TARGET_LABELS).map(([k, l]) => (
                <Input key={k} placeholder={l} maxLength={24} value={w.targets[k] ?? ""} onChange={(e) => set("targets", { ...w.targets, [k]: e.target.value })} data-testid={`target-${k}-input`} />
              ))}
            </div>
          </fieldset>

          <fieldset className="grid gap-3 sm:grid-cols-2">
            <legend className={`${lbl} sm:col-span-2`}>Winemaking regime</legend>
            {Object.entries(REGIME_LABELS).map(([k, l]) => (
              <div key={k}><label className="mb-1 block text-xs text-[var(--ow-text-lo)]">{l}</label>
                <Input maxLength={600} value={w.regime[k] ?? ""} onChange={(e) => set("regime", { ...w.regime, [k]: e.target.value })} data-testid={`regime-${k}-input`} /></div>
            ))}
          </fieldset>

          <div><label className={lbl}>Protocol & instructions to the contractor</label><Textarea rows={5} maxLength={8000} value={w.protocol} onChange={(e) => set("protocol", e.target.value)} data-testid="wine-protocol-input" /></div>
          <div><label className={lbl}>Style & tasting intent</label><Textarea rows={3} maxLength={4000} value={w.tastingNotes} onChange={(e) => set("tastingNotes", e.target.value)} data-testid="wine-tasting-input" /></div>

          <div className="flex justify-end gap-2">
            <Button type="button" variant="ghost" onClick={() => onOpenChange(false)} data-testid="wine-editor-cancel">Cancel</Button>
            <Button type="submit" disabled={pending} data-testid="wine-editor-save">{pending ? "Saving…" : "Save spec"}</Button>
          </div>
        </form>
      </DialogContent>
    </Dialog>
  );
}
