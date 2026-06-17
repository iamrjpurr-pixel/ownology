/**
 * ThePressCtaCard — S8-E (Learn→Do bridge)
 *
 * A contextual, visually distinct action prompt shown at the end of a Free Run
 * answer thread. Because Free Run is the curiosity pillar (wine lovers, not only
 * winemakers), the default copy is the redesign-aligned "Ready to make it, not
 * just drink it?" — an invitation into the Do pillar (The Press) rather than a
 * winemaker-only "Log a Measurement" prompt.
 *
 * An optional `eventType` tailors the CTA for winemaking contexts.
 */
import { Link } from "wouter";
import { FlaskConical, ArrowRight } from "lucide-react";

interface ThePressCtaCardProps {
  /** Optional winemaking event type; when set, copy becomes "Log a {eventType}". */
  eventType?: string;
  onClick?: () => void;
}

export default function ThePressCtaCard({
  eventType,
  onClick,
}: ThePressCtaCardProps) {
  const headline = eventType
    ? "Ready to apply this?"
    : "Ready to make it, not just drink it?";
  const buttonLabel = eventType
    ? `Log a ${eventType} in The Press`
    : "Start a vintage in The Press";

  return (
    <div
      style={{
        borderLeft: "3px solid #C9A24B",
        background: "#FBF6EF",
        borderRadius: "10px",
        padding: "1rem 1.1rem",
        display: "flex",
        alignItems: "center",
        justifyContent: "space-between",
        gap: "1rem",
        marginTop: "1rem",
      }}
    >
      <div style={{ display: "flex", alignItems: "center", gap: "0.65rem" }}>
        <FlaskConical size={20} style={{ color: "#C9A24B", flexShrink: 0 }} />
        <div>
          <div
            style={{
              fontFamily: "'Lato', sans-serif",
              fontWeight: 700,
              fontSize: "0.95rem",
              color: "#1A1A1A",
            }}
          >
            {headline}
          </div>
          <div
            style={{
              fontFamily: "'Lato', sans-serif",
              fontSize: "0.82rem",
              color: "#6B7280",
            }}
          >
            Take what you just learned into the cellar.
          </div>
        </div>
      </div>
      <Link
        href="/the-press"
        onClick={onClick}
        style={{
          display: "inline-flex",
          alignItems: "center",
          gap: "0.4rem",
          background: "#7A1F2B",
          color: "#FFFFFF",
          borderRadius: "8px",
          padding: "0.6rem 0.95rem",
          fontFamily: "'Lato', sans-serif",
          fontSize: "0.85rem",
          fontWeight: 600,
          textDecoration: "none",
          whiteSpace: "nowrap",
          flexShrink: 0,
        }}
      >
        {buttonLabel} <ArrowRight size={15} />
      </Link>
    </div>
  );
}
