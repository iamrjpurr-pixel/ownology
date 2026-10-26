import { useEffect, useState } from "react";
import { toast } from "sonner";
import { Globe, Loader2 } from "lucide-react";
import { trpc } from "@/lib/trpc";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Checkbox } from "@/components/ui/checkbox";
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";

type Props = { wineryId: number; open: boolean; onOpenChange: (o: boolean) => void; initialUrl?: string | null; autoRun?: boolean; onImported: () => void };

const blendLine = (b: { variety: string; pct: number }[]) => b.map((x) => (x.pct ? `${x.pct}% ${x.variety}` : x.variety)).join(" · ");

export function ImportWebsiteDialog({ wineryId, open, onOpenChange, initialUrl, autoRun, onImported }: Props) {
  const [url, setUrl] = useState(initialUrl ?? "");
  const [picked, setPicked] = useState<Set<number>>(new Set());
  const preview = trpc.brandPortal.websitePreview.useMutation({
    onSuccess: (d) => setPicked(new Set(d.wines.map((_, i) => i))),
    onError: (e) => toast.error(e.message),
  });
  const save = trpc.brandPortal.importWines.useMutation({
    onSuccess: (r) => { toast.success(`${r.added} wines added to your vault`); onImported(); onOpenChange(false); preview.reset(); },
    onError: (e) => toast.error(e.message),
  });

  useEffect(() => { if (open && initialUrl) setUrl((u) => u || initialUrl); }, [open, initialUrl]);
  useEffect(() => {
    if (open && autoRun && initialUrl && !preview.data && !preview.isPending) preview.mutate({ wineryId, url: initialUrl });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [open, autoRun, initialUrl]);

  const data = preview.data;
  const toggle = (i: number) => setPicked((s) => { const n = new Set(s); n.has(i) ? n.delete(i) : n.add(i); return n; });

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-h-[90vh] overflow-y-auto sm:max-w-2xl" data-testid="import-website-dialog">
        <DialogHeader>
          <DialogTitle className="font-['Fraunces',serif] text-2xl">Bring in your wines from your website</DialogTitle>
          <DialogDescription>We read the wine list on your own site and draft a spec for each one. Nothing is saved until you choose.</DialogDescription>
        </DialogHeader>

        <form className="flex flex-col gap-2 sm:flex-row" onSubmit={(e) => { e.preventDefault(); preview.mutate({ wineryId, url }); }}>
          <Input value={url} onChange={(e) => setUrl(e.target.value)} placeholder="yourwinery.com.au" data-testid="import-website-url" />
          <Button type="submit" disabled={preview.isPending || url.trim().length < 4} className="gap-1.5" data-testid="import-website-read">
            {preview.isPending ? <Loader2 className="h-4 w-4 animate-spin" /> : <Globe className="h-4 w-4" />} Read my wines
          </Button>
        </form>

        {preview.isPending && <p className="text-sm text-[var(--ow-text-mid)]" data-testid="import-website-reading">Reading your website. This takes about 30 seconds…</p>}
        {data && data.wines.length === 0 && <p className="text-sm text-[var(--ow-text-mid)]" data-testid="import-website-none">We couldn't find a wine list on {data.host}. Try the page that lists your wines, or add them by hand.</p>}

        {data && data.wines.length > 0 && (
          <div data-testid="import-website-results">
            <p className="mb-3 text-xs text-[var(--ow-text-lo)]">Found {data.wines.length} wines on {data.host}. Untick any you don't want.</p>
            <ul className="space-y-2">
              {data.wines.map((w, i) => (
                <li key={i}>
                  <label className="flex cursor-pointer items-start gap-3 rounded-md border border-[var(--ow-border)] p-3 hover:border-[var(--ow-amber)]" data-testid={`import-wine-${i}`}>
                    <Checkbox checked={picked.has(i)} onCheckedChange={() => toggle(i)} className="mt-0.5" />
                    <span className="min-w-0">
                      <span className="block text-sm font-semibold text-[var(--ow-text-hi)]">{w.vintage ? `${w.vintage} ` : ""}{w.name}</span>
                      <span className="block text-xs text-[var(--ow-text-lo)]">{[w.style, blendLine(w.blend), w.targets.alcohol].filter(Boolean).join(" · ")}</span>
                    </span>
                  </label>
                </li>
              ))}
            </ul>
          </div>
        )}

        {data && data.wines.length > 0 && (
          <DialogFooter>
            <Button variant="ghost" onClick={() => onOpenChange(false)} data-testid="import-website-cancel">Not now</Button>
            <Button disabled={!picked.size || save.isPending} onClick={() => save.mutate({ wineryId, host: data.host, wines: data.wines.filter((_, i) => picked.has(i)) })} data-testid="import-website-save">
              {save.isPending ? "Adding…" : `Add ${picked.size} wine${picked.size === 1 ? "" : "s"}`}
            </Button>
          </DialogFooter>
        )}
      </DialogContent>
    </Dialog>
  );
}
