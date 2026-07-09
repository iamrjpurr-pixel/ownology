/**
 * WhyOwnologyBoxes — the 3-box "Why Ownology" section that sits directly
 * below the HeroCarousel v4 (Feb 2026, Rich).
 *
 * These are the rational-proof boxes that make the case *after* the
 * carousel has done its emotional work. Copy is Rich's own — do not
 * rewrite without permission.
 *
 * Layout: 3 columns on desktop, single column stack on mobile. Amber
 * accent line up-top of each card; icon glyph provides a scannable
 * anchor without turning the box into an ad.
 */

import { Notebook, Smartphone, Lock } from "lucide-react";

interface Box {
  id: string;
  icon: React.ReactNode;
  title: string;
  body: string;
}

const BOXES: Box[] = [
  {
    id: "problem",
    icon: <Notebook size={22} strokeWidth={1.6} />,
    title: "The problem we're solving",
    body:
      "Boutique winery teams lose institutional knowledge every vintage. SOPs live in binders. Decisions aren't documented. New staff ask the same questions every harvest. Ownology fixes that.",
  },
  {
    id: "mobile",
    icon: <Smartphone size={22} strokeWidth={1.6} />,
    title: "Built for mobile, during harvest",
    body:
      "Designed to be used one-handed, in a cold cellar, with wet gloves. Every answer is grounded in your own documents — not generic internet content.",
  },
  {
    id: "data",
    icon: <Lock size={22} strokeWidth={1.6} />,
    title: "Your data stays yours",
    body:
      "Your SOPs, vintage records, and tribal knowledge are never used to train AI models. They stay in your account, searchable only by your team.",
  },
];

export default function WhyOwnologyBoxes() {
  return (
    <section
      data-testid="why-ownology-boxes"
      style={{
        padding: "4.5rem 1.5rem",
        background: "var(--ow-bg-base)",
      }}
    >
      <div style={{ maxWidth: 1100, margin: "0 auto" }}>
        {/* Header */}
        <div style={{ textAlign: "center", marginBottom: "3rem" }}>
          <p
            data-testid="why-ownology-eyebrow"
            style={{
              fontFamily: "'Fira Code',monospace",
              fontSize: "0.7rem",
              letterSpacing: "0.24em",
              color: "var(--ow-amber)",
              textTransform: "uppercase",
              marginBottom: "1rem",
            }}
          >
            Why Ownology
          </p>
          <h2
            data-testid="why-ownology-headline"
            style={{
              fontFamily: "'Fraunces',serif",
              fontWeight: 700,
              fontSize: "clamp(1.75rem, 4vw, 2.75rem)",
              lineHeight: 1.15,
              letterSpacing: "-0.015em",
              color: "var(--ow-text-hi)",
              margin: 0,
              textWrap: "balance" as "balance",
            }}
          >
            Built by winemakers,{" "}
            <span style={{ color: "var(--ow-amber)" }}>for winemakers.</span>
          </h2>
        </div>

        {/* Box grid */}
        <div
          style={{
            display: "grid",
            gridTemplateColumns: "repeat(auto-fit, minmax(280px, 1fr))",
            gap: "1.25rem",
          }}
        >
          {BOXES.map((b) => (
            <div
              key={b.id}
              data-testid={`why-ownology-box-${b.id}`}
              style={{
                position: "relative",
                padding: "1.75rem 1.5rem 1.6rem",
                background: "var(--ow-bg-raised)",
                border: "1px solid var(--ow-bg-inset)",
                borderRadius: 10,
                overflow: "hidden",
              }}
            >
              {/* Amber accent bar top */}
              <div
                aria-hidden
                style={{
                  position: "absolute",
                  top: 0,
                  left: 0,
                  right: 0,
                  height: 2,
                  background:
                    "linear-gradient(90deg, var(--ow-amber), color-mix(in oklch, var(--ow-amber) 25%, transparent))",
                }}
              />
              <div
                aria-hidden
                style={{
                  width: 44,
                  height: 44,
                  borderRadius: 10,
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "center",
                  background: "color-mix(in oklch, var(--ow-amber) 12%, transparent)",
                  border: "1px solid color-mix(in oklch, var(--ow-amber) 30%, transparent)",
                  color: "var(--ow-amber)",
                  marginBottom: "1rem",
                }}
              >
                {b.icon}
              </div>
              <h3
                style={{
                  fontFamily: "'Fraunces',serif",
                  fontWeight: 600,
                  fontSize: "1.15rem",
                  lineHeight: 1.3,
                  color: "var(--ow-text-hi)",
                  margin: "0 0 0.75rem",
                  letterSpacing: "-0.01em",
                }}
              >
                {b.title}
              </h3>
              <p
                style={{
                  fontFamily: "'Lato',sans-serif",
                  fontWeight: 300,
                  fontSize: "0.95rem",
                  lineHeight: 1.65,
                  color: "var(--ow-text-mid)",
                  margin: 0,
                }}
              >
                {b.body}
              </p>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}
