/**
 * AcronymTooltip — inline hover/tap trigger for winemaking acronyms.
 *
 * Wraps a bare acronym string in a dotted-underline span. On desktop:
 * hover reveals the popover. On mobile: tap toggles.
 *
 * Both cases use shadcn Popover under the hood (Radix) — Popover works
 * with tap AND focus AND click, so it degrades gracefully across
 * touch devices where CSS-only tooltips don't. Adds `data-acronym` for
 * analytics / QA.
 *
 * Usage:
 *   <AcronymTooltip term="WBS" />                        → renders "WBS"
 *   <AcronymTooltip term="WBS">WBS-mapped</AcronymTooltip> → renders "WBS-mapped"
 *   with a tooltip anchored to the acronym.
 *
 * If the term isn't in the glossary, the component renders the raw string
 * (or children) with NO underline — no broken UI, no error.
 */
import { ReactNode, useState } from "react";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { lookupAcronym } from "@/lib/acronym-glossary";

interface AcronymTooltipProps {
  term: string;
  children?: ReactNode;
  /** Optional data-testid override for tests. */
  testid?: string;
}

export function AcronymTooltip({ term, children, testid }: AcronymTooltipProps) {
  const [open, setOpen] = useState(false);
  const entry = lookupAcronym(term);

  // Unknown acronym → render plain string, no popover, no visual affordance.
  // Prevents accidental "??" affordances on strings we haven't glossed yet.
  if (!entry) return <>{children ?? term}</>;

  return (
    <Popover open={open} onOpenChange={setOpen}>
      <PopoverTrigger asChild>
        <button
          type="button"
          data-testid={testid ?? `acronym-${entry.term.toLowerCase()}`}
          data-acronym={entry.term}
          onMouseEnter={() => setOpen(true)}
          onMouseLeave={() => setOpen(false)}
          onFocus={() => setOpen(true)}
          onBlur={() => setOpen(false)}
          aria-label={`${entry.term} — ${entry.expansion}`}
          style={{
            all: "unset",
            cursor: "help",
            borderBottom: "1px dotted color-mix(in oklch, var(--ow-amber) 65%, transparent)",
            paddingBottom: "1px",
            color: "inherit",
            fontFamily: "inherit",
            fontSize: "inherit",
            fontWeight: "inherit",
            lineHeight: "inherit",
            display: "inline",
          }}
        >
          {children ?? entry.term}
        </button>
      </PopoverTrigger>
      <PopoverContent
        side="top"
        align="center"
        sideOffset={6}
        collisionPadding={12}
        onMouseEnter={() => setOpen(true)}
        onMouseLeave={() => setOpen(false)}
        style={{
          maxWidth: 280,
          padding: "0.75rem 0.9rem",
          background: "var(--ow-bg-raised)",
          border: "1px solid var(--ow-border)",
          borderRadius: 6,
          fontFamily: "'Lato', sans-serif",
          zIndex: 60,
        }}
      >
        <p
          style={{
            fontFamily: "'Lato', sans-serif",
            fontSize: "0.72rem",
            letterSpacing: "0.12em",
            textTransform: "uppercase",
            color: "var(--ow-amber)",
            fontWeight: 700,
            margin: 0,
          }}
        >
          {entry.term} · {entry.expansion}
        </p>
        <p
          style={{
            marginTop: "0.5rem",
            fontFamily: "'Lato', sans-serif",
            fontSize: "0.85rem",
            lineHeight: 1.45,
            color: "var(--ow-text-mid)",
            margin: "0.5rem 0 0",
          }}
        >
          {entry.definition}
        </p>
        {entry.href && (
          <a
            href={entry.href}
            style={{
              display: "inline-block",
              marginTop: "0.55rem",
              fontFamily: "'Lato', sans-serif",
              fontSize: "0.75rem",
              color: "var(--ow-amber)",
              fontWeight: 600,
              textDecoration: "none",
            }}
          >
            Deep-dive →
          </a>
        )}
      </PopoverContent>
    </Popover>
  );
}
