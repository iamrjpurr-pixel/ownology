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

        {/* ── "The window" — inline product proof (Feb 2026, Rich).
             Rich's original ask was for a "window" in this section — a visual
             proof that Ownology's answers are science-backed, not internet
             content. This is a rendered mock (not an image) so it stays
             pixel-crisp on any display and updates with the site's typography.
             The example question is deliberately technical — MLF diagnostic
             at cellar-realistic pH + temperature — so a passing winemaker
             recognises it as a real cellar problem, not marketing filler. */}
        <div
          data-testid="why-ownology-window"
          style={{
            maxWidth: 720,
            margin: "0 auto 3rem",
            border: "1px solid var(--ow-bg-inset)",
            borderRadius: 8,
            overflow: "hidden",
            background: "var(--ow-bg-raised)",
            boxShadow: "0 24px 60px oklch(0 0 0 / 0.35)",
          }}
        >
          {/* Browser chrome — three-dot pattern, subtle URL bar. Signals
               "this is a screenshot of the actual product" without needing
               a real image file. */}
          <div
            style={{
              display: "flex",
              alignItems: "center",
              gap: "0.75rem",
              padding: "0.55rem 0.85rem",
              background: "oklch(0.14 0.008 60)",
              borderBottom: "1px solid var(--ow-bg-inset)",
            }}
          >
            <div style={{ display: "flex", gap: 6 }}>
              {["oklch(0.55 0.15 25)", "oklch(0.72 0.15 75)", "oklch(0.65 0.15 145)"].map((c, i) => (
                <span key={i} style={{ width: 10, height: 10, borderRadius: 999, background: c }} />
              ))}
            </div>
            <div
              style={{
                flex: 1,
                background: "oklch(0.18 0.008 60)",
                borderRadius: 4,
                padding: "0.28rem 0.65rem",
                fontFamily: "'Fira Code',monospace",
                fontSize: "0.68rem",
                color: "var(--ow-text-lo)",
              }}
            >
              ownology.com/ask
            </div>
          </div>

          {/* Chat body */}
          <div style={{ padding: "1.5rem 1.5rem 1.25rem" }}>
            {/* User question */}
            <div
              data-testid="why-ownology-window-question"
              style={{
                display: "flex",
                justifyContent: "flex-end",
                marginBottom: "1.25rem",
              }}
            >
              <div
                style={{
                  maxWidth: "75%",
                  padding: "0.7rem 1rem",
                  background: "color-mix(in oklch, var(--ow-amber) 18%, transparent)",
                  border: "1px solid color-mix(in oklch, var(--ow-amber) 30%, transparent)",
                  borderRadius: "12px 12px 2px 12px",
                }}
              >
                <p
                  style={{
                    fontFamily: "'Lato',sans-serif",
                    fontSize: "0.92rem",
                    lineHeight: 1.55,
                    color: "var(--ow-text-hi)",
                    margin: 0,
                  }}
                >
                  MLF stuck at pH 3.42, temp dropped to 14°C. Restart or wait?
                </p>
              </div>
            </div>

            {/* Owen's answer */}
            <div data-testid="why-ownology-window-answer" style={{ display: "flex", gap: "0.85rem" }}>
              <div
                aria-hidden
                style={{
                  width: 36,
                  height: 36,
                  borderRadius: 999,
                  flexShrink: 0,
                  background: "color-mix(in oklch, var(--ow-amber) 14%, transparent)",
                  border: "1px solid color-mix(in oklch, var(--ow-amber) 45%, transparent)",
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "center",
                }}
              >
                <span
                  style={{
                    fontFamily: "'Fraunces',serif",
                    fontStyle: "italic",
                    fontWeight: 700,
                    fontSize: "1.15rem",
                    color: "var(--ow-amber)",
                    lineHeight: 1,
                  }}
                >
                  O
                </span>
              </div>
              <div style={{ flex: 1, minWidth: 0 }}>
                <p
                  style={{
                    fontFamily: "'Lato',sans-serif",
                    fontSize: "0.92rem",
                    lineHeight: 1.65,
                    color: "var(--ow-text-hi)",
                    margin: 0,
                  }}
                >
                  Wait &mdash; and warm first. At <strong style={{ color: "var(--ow-amber)" }}>14°C</strong>, most{" "}
                  <em>Oenococcus oeni</em> strains sit near the lower activity threshold. Warm the tank to{" "}
                  <strong style={{ color: "var(--ow-amber)" }}>18–20°C</strong> and re-check nutrient status
                  before considering a re-inoculation. pH 3.42 is on the workable side; the temp drop is the
                  more likely stall driver.
                </p>
                {/* Cited source pill — the "backed IN SCIENCE" proof point,
                     tied visually to the con·science wordplay from the hero. */}
                <div
                  style={{
                    marginTop: "0.85rem",
                    display: "flex",
                    flexWrap: "wrap",
                    gap: "0.4rem",
                  }}
                >
                  <span
                    data-testid="why-ownology-window-citation"
                    style={{
                      fontFamily: "'Fira Code',monospace",
                      fontSize: "0.66rem",
                      letterSpacing: "0.06em",
                      padding: "0.2rem 0.55rem",
                      borderRadius: 999,
                      background: "color-mix(in oklch, var(--ow-amber) 10%, transparent)",
                      border: "1px solid color-mix(in oklch, var(--ow-amber) 30%, transparent)",
                      color: "var(--ow-amber)",
                      display: "inline-flex",
                      alignItems: "center",
                      gap: "0.3rem",
                    }}
                  >
                    <span style={{ opacity: 0.7 }}>cited:</span> Zoecklein · Wine Analysis & Production, ch. 8
                  </span>
                  <span
                    style={{
                      fontFamily: "'Fira Code',monospace",
                      fontSize: "0.66rem",
                      letterSpacing: "0.06em",
                      padding: "0.2rem 0.55rem",
                      borderRadius: 999,
                      background: "color-mix(in oklch, var(--ow-amber) 10%, transparent)",
                      border: "1px solid color-mix(in oklch, var(--ow-amber) 30%, transparent)",
                      color: "var(--ow-amber)",
                      display: "inline-flex",
                      alignItems: "center",
                      gap: "0.3rem",
                    }}
                  >
                    <span style={{ opacity: 0.7 }}>cited:</span> AWRI · MLF technical bulletin
                  </span>
                </div>
              </div>
            </div>
          </div>

          {/* Footer explainer — ties the mock to the con·science wordplay */}
          <div
            style={{
              padding: "0.7rem 1.25rem",
              background: "oklch(0.14 0.008 60)",
              borderTop: "1px solid var(--ow-bg-inset)",
              textAlign: "center",
            }}
          >
            <p
              style={{
                fontFamily: "'Fira Code',monospace",
                fontSize: "0.66rem",
                letterSpacing: "0.14em",
                color: "var(--ow-text-lo)",
                textTransform: "uppercase",
                margin: 0,
              }}
            >
              Every answer cited &middot; not internet{" "}
              <span style={{ opacity: 0.45, textDecoration: "line-through" }}>CON</span> · backed IN{" "}
              <span style={{ color: "var(--ow-amber)", fontWeight: 700 }}>SCIENCE</span>
            </p>
          </div>
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
