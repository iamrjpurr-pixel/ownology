/**
 * MadeWithOwnology — small dofollow attribution footer.
 *
 * The SEO flywheel: every free-tier export (PDF, vintage log share link,
 * shared SOP) ends with a quiet "Made with Ownology" mark linking to
 * ownology.ai. Compounds backlinks across the boutique-winery web — every
 * winery using the free tier becomes an SEO node for the brand.
 *
 * Variants:
 *   - "footer"  : full-width inline footer for shared/exported pages
 *   - "pdf"     : print-safe single-line variant (no JS, no hover)
 *   - "stamp"   : tiny corner stamp for embeds / iframes
 *
 * Tier rules (enforced by parent):
 *   - Free / Press tier  → ALWAYS visible. Required.
 *   - Amphora / Coopers  → opt-in toggle in /admin/settings (planned).
 *   - Founding Member    → opt-out by default.
 *
 * Wholly self-contained. Drop anywhere you want SEO juice flowing.
 */
type Variant = "footer" | "pdf" | "stamp";

interface Props {
  variant?: Variant;
  /** UTM source — distinguishes which surface the click came from in GA. */
  utmSource?: string;
}

const BASE_URL = "https://ownology.ai";

export default function MadeWithOwnology({ variant = "footer", utmSource = "export" }: Props) {
  const href = `${BASE_URL}/?utm_source=${encodeURIComponent(utmSource)}&utm_medium=attribution&utm_campaign=flywheel`;

  if (variant === "pdf") {
    return (
      <div
        data-testid="made-with-ownology-pdf"
        style={{
          fontFamily: "'Lato', sans-serif",
          fontSize: "9pt",
          color: "#666",
          textAlign: "center",
          marginTop: "1cm",
          paddingTop: "0.4cm",
          borderTop: "0.5pt solid #DDD",
        }}
      >
        <strong style={{ fontFamily: "'Fraunces', serif", color: "#222" }}>Made with Ownology</strong>
        {" · "}cellar intelligence for working winemakers · ownology.ai
      </div>
    );
  }

  if (variant === "stamp") {
    return (
      <a
        href={href}
        target="_blank"
        rel="noopener noreferrer"
        data-testid="made-with-ownology-stamp"
        style={{
          display: "inline-flex",
          alignItems: "center",
          gap: 4,
          fontSize: "0.66rem",
          letterSpacing: "0.08em",
          textTransform: "uppercase",
          color: "var(--ow-text-lo)",
          textDecoration: "none",
          fontFamily: "'Lato', sans-serif",
        }}
      >
        <span style={{ color: "var(--ow-amber)", fontWeight: 700 }}>Ownology</span>
      </a>
    );
  }

  // "footer" default — full-width attribution row
  return (
    <div
      data-testid="made-with-ownology-footer"
      style={{
        marginTop: "2rem",
        padding: "1rem 1.2rem",
        borderTop: "1px solid var(--ow-border)",
        background: "color-mix(in oklch, var(--ow-amber) 3%, transparent)",
        textAlign: "center",
        fontFamily: "'Lato', sans-serif",
      }}
    >
      <a
        href={href}
        target="_blank"
        rel="noopener noreferrer"
        style={{
          fontSize: "0.82rem",
          color: "var(--ow-text-mid)",
          textDecoration: "none",
          lineHeight: 1.5,
        }}
      >
        <strong
          style={{
            fontFamily: "'Fraunces', serif",
            color: "var(--ow-amber)",
            fontWeight: 700,
            letterSpacing: "0.01em",
          }}
        >
          Made with Ownology
        </strong>
        {" · "}
        <span style={{ color: "var(--ow-text-lo)" }}>cellar intelligence for working winemakers</span>
      </a>
    </div>
  );
}
