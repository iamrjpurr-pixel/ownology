import { ArrowLeft, ArrowRight, X } from "lucide-react";
import { Button } from "@/components/ui/button";
import type { Role } from "./types";

export const GUIDE_STEPS: { title: string; body: string; role: Role; target: string }[] = [
  { title: "Your wine spec", body: "This is how Kate records a wine: blend, targets, regime and the protocol her contractor must follow. Only she can edit it.", role: "owner", target: "demo-vault" },
  { title: "What your contract winemaker sees", body: "Dan sees the same spec, read-only. He can't edit, copy or export it, but he logs his cellar work and readings against it.", role: "contractor", target: "demo-vault" },
  { title: "You stay in control", body: "Kate sees everything Dan viewed or logged, and removes his access in one click when the contract ends.", role: "owner", target: "demo-owner-section" },
];

export function DemoGuide({ step, onStep, onClose }: { step: number; onStep: (s: number) => void; onClose: () => void }) {
  const s = GUIDE_STEPS[step];
  const last = step === GUIDE_STEPS.length - 1;
  return (
    <div className="fixed inset-x-0 top-0 z-50 border-b border-[var(--ow-amber)] bg-[var(--ow-bg-card)]/95 shadow-[0_10px_30px_-18px_rgba(0,0,0,0.5)] backdrop-blur-md" data-testid="demo-guide">
      <div className="mx-auto flex max-w-6xl flex-col gap-3 px-6 py-4 md:flex-row md:items-center md:gap-6">
        <div className="flex items-center gap-2" aria-label={`Step ${step + 1} of ${GUIDE_STEPS.length}`}>
          {GUIDE_STEPS.map((_, i) => (
            <span key={i} className={`h-1.5 rounded-full transition-[width,background-color] duration-300 ${i === step ? "w-8 bg-[var(--ow-amber)]" : i < step ? "w-4 bg-[var(--ow-amber)] opacity-50" : "w-4 bg-[var(--ow-border-md)]"}`} />
          ))}
          <span className="ml-2 font-mono text-xs text-[var(--ow-text-lo)]" data-testid="demo-guide-progress">Step {step + 1} of {GUIDE_STEPS.length}</span>
        </div>
        <div className="min-w-0 flex-1">
          <div className="text-sm font-semibold text-[var(--ow-text-hi)]" data-testid="demo-guide-title">{s.title}</div>
          <p className="text-sm text-[var(--ow-text-mid)]">{s.body}</p>
        </div>
        <div className="flex shrink-0 items-center gap-2">
          {step > 0 && (
            <Button size="sm" variant="ghost" className="gap-1" onClick={() => onStep(step - 1)} data-testid="demo-guide-back"><ArrowLeft className="h-3.5 w-3.5" /> Back</Button>
          )}
          <Button size="sm" className="gap-1" onClick={() => (last ? onClose() : onStep(step + 1))} data-testid="demo-guide-next">
            {last ? "Finish" : "Next"} <ArrowRight className="h-3.5 w-3.5" />
          </Button>
          <Button size="icon" variant="ghost" onClick={onClose} aria-label="Close guide" data-testid="demo-guide-close"><X className="h-4 w-4" /></Button>
        </div>
      </div>
    </div>
  );
}
