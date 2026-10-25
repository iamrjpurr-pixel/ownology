import { useState } from "react";
import { toast } from "sonner";
import { Pencil } from "lucide-react";
import { trpc } from "@/lib/trpc";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";

export const looksAutoNamed = (name: string) => /'s Winery$/i.test(name.trim());

export function BrandNameEditor({ wineryId, name, prompt }: { wineryId: number; name: string; prompt?: boolean }) {
  const utils = trpc.useUtils();
  const rename = trpc.brandPortal.renameBrand.useMutation();
  const [editing, setEditing] = useState(false);
  const [buf, setBuf] = useState(name);

  const save = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      await rename.mutateAsync({ wineryId, name: buf.trim() });
      await utils.brandPortal.myBrands.invalidate();
      utils.brandPortal.activity.invalidate({ wineryId });
      setEditing(false);
      toast.success("Winery name updated");
    } catch (err) {
      toast.error((err as Error).message);
    }
  };

  if (editing) {
    return (
      <form onSubmit={save} className="flex flex-wrap items-center gap-2" data-testid="brand-name-form">
        <Input autoFocus required minLength={2} maxLength={120} value={buf} onChange={(e) => setBuf(e.target.value)}
          className="w-64" placeholder="e.g. Patina Wines" data-testid="brand-name-input" />
        <Button type="submit" size="sm" disabled={rename.isPending} data-testid="brand-name-save">{rename.isPending ? "Saving…" : "Save"}</Button>
        <Button type="button" size="sm" variant="ghost" onClick={() => setEditing(false)} data-testid="brand-name-cancel">Cancel</Button>
      </form>
    );
  }

  const open = () => { setBuf(looksAutoNamed(name) ? "" : name); setEditing(true); };

  if (prompt) {
    return (
      <div className="flex flex-wrap items-center justify-between gap-3 rounded-md border border-[var(--ow-amber)] bg-[color-mix(in_oklch,var(--ow-amber)_8%,transparent)] px-4 py-3 text-sm text-[var(--ow-text-mid)]" data-testid="brand-name-prompt">
        <span>Your winery is called <strong className="text-[var(--ow-text-hi)]">{name}</strong> for now. Set your real winery name; contractors see it on invites and every spec.</span>
        <Button size="sm" onClick={open} data-testid="brand-name-prompt-button">Set winery name</Button>
      </div>
    );
  }

  return (
    <Button size="sm" variant="ghost" className="gap-1.5" onClick={open} data-testid="brand-name-edit-button">
      <Pencil className="h-3.5 w-3.5" /> Rename
    </Button>
  );
}
