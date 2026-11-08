import { useState } from "react";
import { trpc } from "@/lib/trpc";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";

const ROLES = [
  { value: "team", label: "I work in a winery" },
  { value: "owner", label: "I own a winery" },
  { value: "new", label: "I'm new to winemaking" },
  { value: "other", label: "Something else" },
] as const;

export function Level1Unlock({ compact = false }: { compact?: boolean }) {
  const utils = trpc.useUtils();
  const [email, setEmail] = useState("");
  const [name, setName] = useState("");
  const [role, setRole] = useState<(typeof ROLES)[number]["value"]>("team");
  const unlock = trpc.curriculum.unlockLevel1.useMutation({
    onSuccess: () => { toast.success("Level 1 unlocked. Enjoy!"); utils.curriculum.invalidate(); },
    onError: () => toast.error("That didn't work. Check your email and try again."),
  });
  return (
    <form
      onSubmit={(e) => { e.preventDefault(); unlock.mutate({ email, name: name || undefined, role }); }}
      className={`rounded-xl border border-amber-300 bg-amber-50 ${compact ? "p-4" : "p-6"} space-y-3`}
      data-testid="level1-unlock-form"
    >
      <p className="font-serif text-xl text-stone-900">Read Level 1 free</p>
      <p className="text-sm text-stone-700">Six short lessons on the basics every winemaker shares. Just tell us where to send the odd update.</p>
      <div className="grid gap-2 sm:grid-cols-2">
        <Input value={name} onChange={(e) => setName(e.target.value)} placeholder="First name (optional)" className="bg-white" data-testid="level1-name-input" />
        <Input type="email" required value={email} onChange={(e) => setEmail(e.target.value)} placeholder="you@winery.com.au" className="bg-white" data-testid="level1-email-input" />
      </div>
      <div className="flex flex-wrap gap-2" role="radiogroup" aria-label="Which best describes you?">
        {ROLES.map((r) => (
          <button key={r.value} type="button" role="radio" aria-checked={role === r.value} onClick={() => setRole(r.value)}
            className={`rounded-full border px-3 py-1.5 text-sm transition-colors ${role === r.value ? "border-stone-900 bg-stone-900 text-white" : "border-stone-300 bg-white text-stone-700 hover:border-stone-500"}`}
            data-testid={`level1-role-${r.value}`}>{r.label}</button>
        ))}
      </div>
      <Button type="submit" disabled={unlock.isPending} className="bg-stone-900 text-white hover:bg-stone-700" data-testid="level1-unlock-submit">
        {unlock.isPending ? "Unlocking…" : "Unlock Level 1"}
      </Button>
      <p className="text-xs text-stone-600">No spam, no card. Unsubscribe any time.</p>
    </form>
  );
}
