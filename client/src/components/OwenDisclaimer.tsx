/**
 * OwenDisclaimer — the DESIGN_RULES.md Rule 3 footer that MUST appear
 * under every surface where Owen produces an answer.
 *
 * Design law (from /app/memory/DESIGN_RULES.md):
 *   > Owen is Ownology's AI — grounded, but not perfect.
 *   > For medical or business decisions, verify with a human expert.
 *
 * Three reasons this line exists:
 *   1. Legal / regulator safety — protects against liability if someone
 *      acts on bad advice.
 *   2. Trust — winemakers respect a product that admits its limits.
 *   3. Differentiation — every AI competitor over-claims; under-claiming
 *      reads as radically honest.
 *
 * Usage: drop <OwenDisclaimer /> under any Owen answer, panel, or page.
 * Uses design tokens so it inherits from the current theme (parchment,
 * cellar-night, soft-cellar).
 */
export function OwenDisclaimer({
  compact = false,
  testid = "owen-disclaimer",
}: {
  /** Compact = single-line, for tight surfaces like inline chat replies. */
  compact?: boolean;
  testid?: string;
}) {
  if (compact) {
    return (
      <p
        data-testid={testid}
        style={{
          margin: "0.5rem 0 0",
          fontSize: "0.7rem",
          color: "var(--ow-text-lo)",
          fontFamily: "'Lato', sans-serif",
          fontStyle: "italic",
          lineHeight: 1.4,
        }}
      >
        Owen is Ownology&apos;s AI — grounded, but not perfect. Verify decisions with a human expert.
      </p>
    );
  }
  return (
    <div
      data-testid={testid}
      style={{
        marginTop: "1rem",
        padding: "0.65rem 0.85rem",
        borderTop: "1px dashed var(--ow-border)",
        fontSize: "0.72rem",
        color: "var(--ow-text-lo)",
        fontFamily: "'Lato', sans-serif",
        fontStyle: "italic",
        lineHeight: 1.5,
      }}
    >
      Owen is Ownology&apos;s AI — grounded, but not perfect.
      <br />
      For medical or business decisions, verify with a human expert.
    </div>
  );
}
