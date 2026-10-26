import { ArrowRight, FlaskConical, Globe, Plus, UserPlus } from "lucide-react";
import { Button } from "@/components/ui/button";
import type { WineInput } from "./types";

export const SAMPLE_WINE: WineInput = {
  name: "Sample · Barossa Shiraz",
  vintage: new Date().getFullYear() - 1,
  style: "Dry red",
  blend: [
    { variety: "Shiraz", pct: 92, source: "Barossa Valley · Block 3" },
    { variety: "Viognier", pct: 8, source: "Eden Valley" },
  ],
  targets: { alcohol: "14.2%", ph: "3.55", ta: "6.2 g/L", rs: "< 2 g/L", so2: "30 mg/L at bottling", va: "< 0.6 g/L" },
  regime: {
    yeast: "Inoculate at 25 g/hL",
    fermentTemp: "26–28 °C, plunge twice daily",
    mlf: "Natural, in barrel",
    oak: "French oak, 30% new, 14 months",
    additions: "Tartaric to pH 3.55 at crush",
    finishing: "Light fining, coarse filter",
    bottling: "Screwcap",
  },
  protocol: "This is a sample so you can see how a spec looks. Archive it any time.",
  tastingNotes: "Dark plum, pepper and a fine, dry finish.",
};

// Survey question ids (see components/survey/surveyData.ts) → the step that answers them.
const GAP_COPY: Record<string, string> = {
  recipe: "You weren't sure you could make your best vintage again. A spec fixes that.",
  next: "You weren't sure what you'd change next vintage. Specs and logs side by side show it.",
  labels: "You weren't sure your label records would stand up. Blend % and vineyard sources live here.",
  access: "You weren't sure who has seen or changed your specs. Every view and edit is logged.",
  history: "You weren't sure your history stays with your brand. Here it does, whoever makes the wine.",
  tanks: "You weren't sure what's in the tanks without calling. Contractors log it here.",
};

function surveyGaps(): string[] {
  try {
    const a = JSON.parse(localStorage.getItem("ow_know_answers") || "{}") as Record<string, string>;
    return Object.keys(GAP_COPY).filter((k) => a[k] && a[k] !== "yes").slice(0, 2).map((k) => GAP_COPY[k]);
  } catch { return []; }
}

type Props = { onSample: () => void; onNew: () => void; onInvite: () => void; onImport: () => void; siteHost: string | null; pending: boolean };

export function GettingStarted({ onSample, onNew, onInvite, onImport, siteHost, pending }: Props) {
  const gaps = surveyGaps();
  const step = "flex items-start gap-4 rounded-lg border border-[var(--ow-border)] bg-[var(--ow-bg-base)] p-4";
  return (
    <div className="py-2" data-testid="vault-getting-started">
      <h2 className="font-['Fraunces',serif] text-2xl text-[var(--ow-text-hi)]">Welcome to your Brand Vault</h2>
      <p className="mt-2 text-sm text-[var(--ow-text-mid)]">Your wine specs live here, owned by you. Contract winemakers log their work against them, and every view and edit is recorded.</p>
      {gaps.length > 0 && (
        <ul className="mt-4 space-y-1.5 text-sm text-[var(--ow-text-mid)]" data-testid="vault-survey-gaps">
          {gaps.map((g) => <li key={g} className="border-l-2 border-[var(--ow-amber)] pl-3">{g}</li>)}
        </ul>
      )}
      <ol className="mt-6 space-y-3">
        <li className={`${step} border-[var(--ow-amber)]`}>
          <Globe className="mt-0.5 h-5 w-5 shrink-0 text-[var(--ow-amber)]" />
          <div className="min-w-0 flex-1">
            <p className="text-sm font-semibold text-[var(--ow-text-hi)]">Shortcut: bring in your wines from your website</p>
            <p className="mt-1 text-xs text-[var(--ow-text-lo)]">{siteHost ? `We'll read the wine list on ${siteHost} and draft a spec for each.` : "Paste your website and we'll draft a spec for each wine you sell."} You choose what to keep.</p>
          </div>
          <Button size="sm" onClick={onImport} data-testid="vault-import-website">Import</Button>
        </li>
        <li className={step}>
          <FlaskConical className="mt-0.5 h-5 w-5 shrink-0 text-[var(--ow-amber)]" />
          <div className="min-w-0 flex-1">
            <p className="text-sm font-semibold text-[var(--ow-text-hi)]">1. Look around with a sample wine</p>
            <p className="mt-1 text-xs text-[var(--ow-text-lo)]">A filled-in Shiraz spec you can explore, log against, then archive.</p>
          </div>
          <Button size="sm" variant="outline" onClick={onSample} disabled={pending} data-testid="vault-add-sample">{pending ? "Adding…" : "Add sample"}</Button>
        </li>
        <li className={step}>
          <Plus className="mt-0.5 h-5 w-5 shrink-0 text-[var(--ow-amber)]" />
          <div className="min-w-0 flex-1">
            <p className="text-sm font-semibold text-[var(--ow-text-hi)]">2. Add your flagship wine</p>
            <p className="mt-1 text-xs text-[var(--ow-text-lo)]">Blend %, vineyard sources and targets. Five minutes, and it's yours for good.</p>
          </div>
          <Button size="sm" variant="outline" onClick={onNew} data-testid="vault-add-flagship">Add wine</Button>
        </li>
        <li className={step}>
          <UserPlus className="mt-0.5 h-5 w-5 shrink-0 text-[var(--ow-amber)]" />
          <div className="min-w-0 flex-1">
            <p className="text-sm font-semibold text-[var(--ow-text-hi)]">3. Invite your contract winemaker</p>
            <p className="mt-1 text-xs text-[var(--ow-text-lo)]">They see only what you share and log the work. You keep the IP.</p>
          </div>
          <Button size="sm" variant="outline" onClick={onInvite} data-testid="vault-go-invite">Invite</Button>
        </li>
      </ol>
      <a href="/demo/tour" className="mt-6 inline-flex items-center gap-1.5 text-sm font-semibold text-[var(--ow-amber)] underline underline-offset-4" data-testid="vault-tour-link">
        Or take the 3-minute tour first <ArrowRight className="h-3.5 w-3.5" />
      </a>
    </div>
  );
}
