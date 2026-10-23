import { Lock } from "lucide-react";
import { REGIME_LABELS, TARGET_LABELS, type Role, type Wine } from "./types";

const label = "text-[0.68rem] font-semibold uppercase tracking-[0.14em] text-[var(--ow-text-lo)]";

export function ConfidentialBanner({ brandName, viewer }: { brandName: string; viewer: string }) {
  return (
    <div
      data-testid="confidential-banner"
      className="flex items-start gap-3 rounded-md border border-[var(--ow-amber)] bg-[color-mix(in_oklch,var(--ow-amber)_8%,transparent)] px-4 py-3 text-sm text-[var(--ow-text-mid)]"
    >
      <Lock className="mt-0.5 h-4 w-4 shrink-0 text-[var(--ow-amber)]" />
      <p>
        <strong className="text-[var(--ow-text-hi)]">Confidential. These specs belong to {brandName}.</strong>{" "}
        You're viewing as {viewer}. Editing, copying and exporting are switched off, and every view is recorded.
      </p>
    </div>
  );
}

function BlendBars({ wine }: { wine: Wine }) {
  if (!wine.blend.length) return null;
  return (
    <div data-testid="wine-blend">
      <div className={label}>Blend</div>
      <div className="mt-3 space-y-2.5">
        {wine.blend.map((b, i) => (
          <div key={i} className="text-sm">
            <div className="flex justify-between gap-4 text-[var(--ow-text-hi)]">
              <span>{b.variety}{b.source && <span className="text-[var(--ow-text-lo)]"> · {b.source}</span>}</span>
              <span className="font-mono">{b.pct}%</span>
            </div>
            <div className="mt-1 h-1.5 rounded-full bg-[var(--ow-bg-inset)]">
              <div className="h-1.5 rounded-full bg-[var(--ow-amber)] transition-[width] duration-500" style={{ width: `${Math.min(100, b.pct)}%` }} />
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}

function KeyValueGrid({ title, data, labels, testid }: { title: string; data: Record<string, string | undefined>; labels: Record<string, string>; testid: string }) {
  const entries = Object.keys(labels).filter((k) => data[k]);
  if (!entries.length) return null;
  return (
    <div data-testid={testid}>
      <div className={label}>{title}</div>
      <dl className="mt-3 grid grid-cols-2 gap-x-6 gap-y-3 sm:grid-cols-3">
        {entries.map((k) => (
          <div key={k}>
            <dt className="text-xs text-[var(--ow-text-lo)]">{labels[k]}</dt>
            <dd className="mt-0.5 text-sm text-[var(--ow-text-hi)]">{data[k]}</dd>
          </div>
        ))}
      </dl>
    </div>
  );
}

function Prose({ title, text, testid }: { title: string; text: string; testid: string }) {
  if (!text) return null;
  return (
    <div data-testid={testid}>
      <div className={label}>{title}</div>
      <p className="mt-2 whitespace-pre-wrap text-sm leading-relaxed text-[var(--ow-text-mid)]">{text}</p>
    </div>
  );
}

export function WineSpecView({ wine, role, actions }: { wine: Wine; role: Role; actions?: React.ReactNode }) {
  const locked = role === "contractor";
  return (
    <article
      data-testid="wine-spec"
      className={`space-y-7 ${locked ? "select-none" : ""}`}
      onCopy={locked ? (e) => e.preventDefault() : undefined}
      onContextMenu={locked ? (e) => e.preventDefault() : undefined}
    >
      <header className="flex flex-wrap items-start justify-between gap-4">
        <div>
          <h2 className="font-['Fraunces',serif] text-2xl text-[var(--ow-text-hi)] md:text-3xl" data-testid="wine-spec-name">
            {wine.name} {wine.vintage && <span className="text-[var(--ow-text-lo)]">{wine.vintage}</span>}
          </h2>
          {wine.style && <p className="mt-1 text-sm text-[var(--ow-text-mid)]">{wine.style}</p>}
        </div>
        {actions}
      </header>
      <BlendBars wine={wine} />
      <KeyValueGrid title="Analytical targets" data={wine.targets} labels={TARGET_LABELS} testid="wine-targets" />
      <KeyValueGrid title="Winemaking regime" data={wine.regime} labels={REGIME_LABELS} testid="wine-regime" />
      <Prose title="Protocol & instructions to the contractor" text={wine.protocol} testid="wine-protocol" />
      <Prose title="Style & tasting intent" text={wine.tastingNotes} testid="wine-tasting" />
    </article>
  );
}
