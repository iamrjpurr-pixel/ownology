/**
 * FlashCardDeck — reusable "idiot's guide" flash-card deck component.
 *
 * Used by /admin/operator-guide to present verb-first, step-by-step
 * workflows in a mobile-friendly horizontal snap-scroll strip with
 * deck-filter pill tabs above. Each domain (CRM, Pipeline, Compliance)
 * imports this and passes its own card data.
 *
 * Design contract (any deck):
 *   - Cards have a sticky number, a serif title, an italic outcome line,
 *     numbered steps, an optional gotcha box, and an optional jump link.
 *   - Deck IDs are free-form strings; the component doesn't care what
 *     the domain calls them.
 *   - The container is deep-linkable via `anchorId` prop, so a lost
 *     operator can be sent to a specific deck with a single URL.
 */
import { useEffect, useMemo, useRef, useState } from "react";
import { Link } from "wouter";

/**
 * Auto-linkify internal paths inside step text. Turns any occurrence of
 *   /admin/…  /hi/…  /apprentice  /import  /sample-vintage-log  etc.
 * into a clickable <Link> that resolves against the CURRENT origin (so
 * it works in dev preview AND in prod without any env-var plumbing).
 *
 * Excludes placeholder paths that contain "<" (e.g. "/hi/<slug>") — those
 * are meant to be read as templates, not clicked.
 */
function linkifyPaths(text: string): React.ReactNode {
  // Match a root-relative path: "/" + lowercase-word + optional /segments
  // Stops at whitespace, punctuation (except - _ /), or angle brackets.
  const pathRe = /\/[a-z][a-z0-9-]*(?:\/[a-z0-9-]+)*/g;
  const parts: React.ReactNode[] = [];
  let lastIdx = 0;
  let match: RegExpExecArray | null;
  while ((match = pathRe.exec(text)) !== null) {
    const path = match[0];
    const start = match.index;
    // Skip if the character immediately after is "<" (placeholder like /hi/<slug>)
    const nextChar = text[start + path.length];
    if (nextChar === "<") continue;
    // Push preceding plain text
    if (start > lastIdx) parts.push(text.slice(lastIdx, start));
    parts.push(
      <Link
        key={`${start}-${path}`}
        href={path}
        style={{
          color: "var(--ow-amber)",
          textDecoration: "underline",
          textDecorationThickness: "1px",
          textUnderlineOffset: "2px",
          fontFamily: "'Fira Code',monospace",
          fontSize: "0.78rem",
        }}
      >
        {path}
      </Link>
    );
    lastIdx = start + path.length;
  }
  if (lastIdx < text.length) parts.push(text.slice(lastIdx));
  return parts.length > 0 ? parts : text;
}

export interface FlashCard {
  n: string;           // sticky card number ("01" … "20")
  deck: string;        // deck id (free-form)
  title: string;
  outcome: string;
  steps: string[];
  gotcha?: string;
  jumpTo?: string;
  jumpLabel?: string;
}

export interface FlashDeckMeta {
  id: string;
  label: string;       // full pill label e.g. "① Get them in"
  hint: string;        // hover tooltip / description
}

interface Props {
  anchorId: string;
  eyebrow: string;      // small uppercase kicker e.g. "IDIOT'S GUIDE · CRM WORKFLOW"
  title: string;        // serif h2
  intro: string;        // one-para description
  decks: FlashDeckMeta[];
  cards: FlashCard[];
  testIdPrefix: string; // e.g. "crm-flash", "pipeline-flash", "compliance-flash"
  footerNote?: React.ReactNode;
}

export function FlashCardDeck({
  anchorId,
  eyebrow,
  title,
  intro,
  decks,
  cards,
  testIdPrefix,
  footerNote,
}: Props) {
  const [activeDeck, setActiveDeck] = useState<string>("all");
  const scrollRef = useRef<HTMLDivElement>(null);
  // hasMoreRight = there's still off-screen content to the right of the
  // strip. Drives the visible "swipe →" chip so users understand the deck
  // scrolls horizontally rather than being clipped.
  const [hasMoreRight, setHasMoreRight] = useState(true);
  useEffect(() => {
    const el = scrollRef.current;
    if (!el) return;
    const check = () => {
      // 4px slack so the chip disappears cleanly at the very end.
      setHasMoreRight(el.scrollLeft + el.clientWidth < el.scrollWidth - 4);
    };
    check();
    el.addEventListener("scroll", check, { passive: true });
    window.addEventListener("resize", check);
    return () => {
      el.removeEventListener("scroll", check);
      window.removeEventListener("resize", check);
    };
  }, [activeDeck]); // re-check when filter changes deck-content width

  const filtered = useMemo(
    () => (activeDeck === "all" ? cards : cards.filter((c) => c.deck === activeDeck)),
    [activeDeck, cards],
  );

  function switchDeck(d: string) {
    setActiveDeck(d);
    requestAnimationFrame(() => {
      scrollRef.current?.scrollTo({ left: 0, behavior: "smooth" });
    });
  }

  return (
    <section
      id={anchorId}
      data-testid={testIdPrefix}
      className="scroll-mt-24"
      style={{
        background: "color-mix(in oklch, var(--ow-amber) 6%, var(--ow-bg-card))",
        border: "1px solid color-mix(in oklch, var(--ow-amber) 35%, transparent)",
        borderRadius: 12,
        padding: "1.5rem 1.25rem 1.25rem",
      }}
    >
      {/* Header */}
      <div className="mb-4">
        <p
          className="text-xs uppercase tracking-widest font-semibold mb-1.5"
          style={{ color: "var(--ow-amber)" }}
        >
          {eyebrow}
        </p>
        <h2
          className="text-xl font-bold"
          style={{ fontFamily: "'Fraunces',serif", color: "var(--ow-text-hi)" }}
        >
          {title}
        </h2>
        <p
          className="text-sm mt-1.5"
          style={{ color: "var(--ow-text-mid)", maxWidth: "56ch", lineHeight: 1.6 }}
        >
          {intro}
        </p>
      </div>

      {/* Deck pill tabs */}
      <div
        className="flex flex-wrap gap-1.5 mb-4"
        data-testid={`${testIdPrefix}-decks`}
        role="tablist"
      >
        <button
          type="button"
          role="tab"
          aria-selected={activeDeck === "all"}
          data-testid={`${testIdPrefix}-deck-all`}
          onClick={() => switchDeck("all")}
          style={pillStyle(activeDeck === "all")}
        >
          All {cards.length} cards
        </button>
        {decks.map((d) => (
          <button
            key={d.id}
            type="button"
            role="tab"
            aria-selected={activeDeck === d.id}
            data-testid={`${testIdPrefix}-deck-${d.id}`}
            onClick={() => switchDeck(d.id)}
            title={d.hint}
            style={pillStyle(activeDeck === d.id)}
          >
            {d.label}
          </button>
        ))}
      </div>

      {/* Card strip wrapper — adds edge fade masks so the horizontal-scroll
          affordance reads as "there's more to see", not "the card is clipped".
          Left mask only appears once you've scrolled off the start. */}
      <div style={{ position: "relative" }}>
        <div
          ref={scrollRef}
          data-testid={`${testIdPrefix}-strip`}
          style={{
            display: "grid",
            gridAutoFlow: "column",
            gridAutoColumns: "min(90vw, 340px)",
            gap: "0.85rem",
            overflowX: "auto",
            scrollSnapType: "x mandatory",
            padding: "0.5rem 1rem 1.25rem",
            margin: "0 -1rem",
            WebkitOverflowScrolling: "touch",
            // Fade mask on the trailing edge so the peek-at-next-card reads
            // as an affordance ("swipe → for more") rather than a bug.
            // Uses the same base bg color as the surrounding page so the
            // fade blends invisibly into the site chrome.
            maskImage:
              "linear-gradient(to right, black 0, black calc(100% - 44px), transparent 100%)",
            WebkitMaskImage:
              "linear-gradient(to right, black 0, black calc(100% - 44px), transparent 100%)",
          }}
        >
        {filtered.map((card) => (
          <FlashCardTile
            key={card.n}
            card={card}
            deckMeta={decks.find((d) => d.id === card.deck)}
            testIdPrefix={testIdPrefix}
          />
        ))}
        </div>
        {/* Right-edge scroll affordance chip — only shows when the strip has
            more content off-screen. Positioned over the fade so users see
            a clear "swipe → for more" cue instead of guessing at the crop. */}
        {hasMoreRight && (
          <div
            aria-hidden="true"
            style={{
              position: "absolute",
              right: 4,
              top: "50%",
              transform: "translateY(-50%)",
              padding: "4px 8px",
              borderRadius: 999,
              fontSize: "0.65rem",
              letterSpacing: "0.08em",
              textTransform: "uppercase",
              fontWeight: 600,
              color: "var(--ow-text-hi)",
              background: "color-mix(in oklch, var(--ow-bg-base) 92%, transparent)",
              border: "1px solid color-mix(in oklch, var(--ow-amber) 30%, transparent)",
              pointerEvents: "none",
              whiteSpace: "nowrap",
              boxShadow: "0 2px 8px rgba(0,0,0,0.15)",
            }}
          >
            swipe →
          </div>
        )}
      </div>

      {/* Footer */}
      {footerNote && (
        <p
          className="text-xs italic mt-2 pt-3 border-t"
          style={{
            color: "var(--ow-text-lo)",
            borderColor: "color-mix(in oklch, var(--ow-amber) 20%, transparent)",
          }}
        >
          {footerNote}
        </p>
      )}
    </section>
  );
}

// ── FlashCardTile ────────────────────────────────────────────────────────────
function FlashCardTile({
  card,
  deckMeta,
  testIdPrefix,
}: {
  card: FlashCard;
  deckMeta?: FlashDeckMeta;
  testIdPrefix: string;
}) {
  return (
    <article
      data-testid={`${testIdPrefix}-card-${card.n}`}
      style={{
        scrollSnapAlign: "start",
        background: "var(--ow-bg-base)",
        border: "1px solid var(--ow-bg-inset)",
        borderRadius: 10,
        padding: "1rem 1.15rem 1.15rem",
        display: "flex",
        flexDirection: "column",
        minHeight: 380,
        // Grid children default to min-width: auto — that lets long
        // unbreakable text (paths, urls) overflow the tile. Reset to 0
        // and add word-break so linkified paths wrap cleanly.
        minWidth: 0,
        overflowWrap: "anywhere",
        wordBreak: "break-word",
      }}
    >
      <div className="flex items-baseline justify-between mb-2">
        <span
          style={{
            fontFamily: "'Fira Code',monospace",
            fontSize: "1.6rem",
            fontWeight: 700,
            color: "var(--ow-amber)",
            lineHeight: 1,
          }}
        >
          {card.n}
        </span>
        <span
          style={{
            fontFamily: "'Lato',sans-serif",
            fontSize: "0.62rem",
            letterSpacing: "0.14em",
            textTransform: "uppercase",
            color: "var(--ow-text-lo)",
            fontWeight: 600,
          }}
        >
          {deckMeta?.label.replace(/^[①-⑦]\s*/, "") ?? card.deck}
        </span>
      </div>

      <h3
        style={{
          fontFamily: "'Fraunces',serif",
          fontWeight: 700,
          fontSize: "1.05rem",
          color: "var(--ow-text-hi)",
          lineHeight: 1.25,
          margin: "0 0 0.4rem",
        }}
      >
        {card.title}
      </h3>

      <p
        style={{
          fontFamily: "'Lato',sans-serif",
          fontSize: "0.82rem",
          fontStyle: "italic",
          color: "var(--ow-text-mid)",
          lineHeight: 1.55,
          margin: "0 0 0.85rem",
        }}
      >
        → {linkifyPaths(card.outcome)}
      </p>

      <ol
        style={{
          margin: 0,
          padding: 0,
          listStyle: "none",
          fontFamily: "'Lato',sans-serif",
          fontSize: "0.82rem",
          lineHeight: 1.6,
          color: "var(--ow-text-hi)",
          display: "flex",
          flexDirection: "column",
          gap: "0.35rem",
          flex: 1,
        }}
      >
        {card.steps.map((s, i) => (
          <li key={i} style={{ display: "flex", gap: "0.55rem", alignItems: "flex-start", minWidth: 0 }}>
            <span
              style={{
                flexShrink: 0,
                width: 16,
                height: 16,
                borderRadius: "50%",
                background: "color-mix(in oklch, var(--ow-amber) 22%, transparent)",
                color: "var(--ow-amber)",
                fontFamily: "'Fira Code',monospace",
                fontSize: "0.62rem",
                fontWeight: 700,
                display: "inline-flex",
                alignItems: "center",
                justifyContent: "center",
                marginTop: 2,
              }}
            >
              {i + 1}
            </span>
            <span style={{ minWidth: 0, flex: 1, overflowWrap: "anywhere" }}>{linkifyPaths(s)}</span>
          </li>
        ))}
      </ol>

      {card.gotcha && (
        <div
          style={{
            marginTop: "0.9rem",
            padding: "0.55rem 0.7rem",
            background: "color-mix(in oklch, var(--ow-amber) 10%, transparent)",
            border: "1px dashed color-mix(in oklch, var(--ow-amber) 40%, transparent)",
            borderRadius: 6,
          }}
        >
          <p
            style={{
              fontFamily: "'Lato',sans-serif",
              fontSize: "0.72rem",
              lineHeight: 1.5,
              margin: 0,
              color: "var(--ow-text-mid)",
            }}
          >
            <strong
              style={{
                color: "var(--ow-amber)",
                letterSpacing: "0.06em",
                textTransform: "uppercase",
                fontSize: "0.62rem",
              }}
            >
              Gotcha ·{" "}
            </strong>
            {linkifyPaths(card.gotcha)}
          </p>
        </div>
      )}

      {card.jumpTo && card.jumpLabel && (
        <Link
          href={card.jumpTo}
          data-testid={`${testIdPrefix}-card-${card.n}-jump`}
          style={{
            marginTop: "0.75rem",
            fontFamily: "'Lato',sans-serif",
            fontSize: "0.78rem",
            fontWeight: 700,
            color: "var(--ow-amber)",
            textDecoration: "none",
            letterSpacing: "0.02em",
          }}
        >
          {card.jumpLabel} →
        </Link>
      )}
    </article>
  );
}

// ── Shared pill style ────────────────────────────────────────────────────────
function pillStyle(active: boolean): React.CSSProperties {
  return {
    padding: "0.35rem 0.85rem",
    borderRadius: 999,
    border: active
      ? "1.5px solid var(--ow-amber)"
      : "1px solid var(--ow-bg-inset)",
    background: active
      ? "color-mix(in oklch, var(--ow-amber) 18%, transparent)"
      : "transparent",
    color: active ? "var(--ow-amber)" : "var(--ow-text-mid)",
    fontFamily: "'Lato',sans-serif",
    fontSize: "0.75rem",
    fontWeight: 600,
    letterSpacing: "0.02em",
    cursor: "pointer",
    whiteSpace: "nowrap",
  };
}
