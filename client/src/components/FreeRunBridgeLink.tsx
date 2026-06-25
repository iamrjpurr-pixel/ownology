/**
 * FreeRunBridgeLink — S8-D (Know→Learn bridge)
 *
 * Inline link shown at the bottom of an SOP detail view that points the
 * reader to the related curiosity topic on Free Run. Navigating away is
 * acceptable here because the user is in a reading context, not a form.
 */
import { Link } from "wouter";
import { GraduationCap } from "lucide-react";

interface FreeRunBridgeLinkProps {
  /** Human-friendly topic label, e.g. "Fermentation Chemistry" */
  topic: string;
  /** Optional seed question to prefill Free Run */
  seedQuestion?: string;
  onClick?: () => void;
}

export default function FreeRunBridgeLink({
  topic,
  seedQuestion,
  onClick,
}: FreeRunBridgeLinkProps) {
  const href = seedQuestion
    ? `/free-run?q=${encodeURIComponent(seedQuestion)}`
    : "/free-run";

  return (
    <Link
      href={href}
      onClick={onClick}
      style={{
        display: "inline-flex",
        alignItems: "center",
        gap: "0.45rem",
        color: "#B0741A",
        fontFamily: "'Lato', sans-serif",
        fontSize: "0.9rem",
        fontWeight: 600,
        textDecoration: "none",
      }}
    >
      <GraduationCap size={16} />
      Learn more: {topic} on Free Run
    </Link>
  );
}
