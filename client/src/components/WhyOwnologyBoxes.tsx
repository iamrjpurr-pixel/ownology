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

import { useEffect, useMemo, useState } from "react";
import { Notebook, Smartphone, Lock } from "lucide-react";

interface Box {
  id: string;
  icon: React.ReactNode;
  title: string;
  body: string;
}

// ── Rotating cellar-diagnostic Q&As for the product "window" ──────────────
// Each entry is a realistic mid-vintage question a boutique winemaker would
// actually ask — MLF, SO2 dosing, stuck ferment restart — plus a technically
// correct answer with two citations from mainstream oenology references.
// Kept intentionally short (readable in 8s) and spans the harvest timeline
// so a returning visitor sees fresh proof every time.
interface WindowScene {
  id: string;
  question: string;
  answerJsx: React.ReactNode;
  citations: string[];
}

const WINDOW_SCENES: WindowScene[] = [
  {
    id: "mlf",
    question: "MLF stuck at pH 3.42, temp dropped to 14°C. Restart or wait?",
    answerJsx: (
      <>
        Wait &mdash; and warm first. At <strong style={{ color: "var(--ow-amber)" }}>14°C</strong>, most{" "}
        <em>Oenococcus oeni</em> strains sit near the lower activity threshold. Warm the tank to{" "}
        <strong style={{ color: "var(--ow-amber)" }}>18&ndash;20°C</strong> and re-check nutrient status
        before considering a re-inoculation. pH 3.42 is on the workable side; the temp drop is the more
        likely stall driver.
      </>
    ),
    citations: ["Zoecklein · Wine Analysis & Production, ch. 8", "AWRI · MLF technical bulletin"],
  },
  {
    id: "so2",
    question: "Chardonnay finished MLF, pH 3.40. Molecular SO₂ target before bottling?",
    answerJsx: (
      <>
        Aim for <strong style={{ color: "var(--ow-amber)" }}>0.8 mg/L molecular SO₂</strong> for white
        wines destined for medium-term ageing. At pH 3.40 that lands you at roughly{" "}
        <strong style={{ color: "var(--ow-amber)" }}>26&ndash;28 mg/L free SO₂</strong>. Re-measure 48h
        after addition &mdash; MLF-completed wines often show higher binding capacity, so a follow-up
        adjustment is normal.
      </>
    ),
    citations: ["Boulton et al · Principles & Practices of Winemaking, ch. 12", "AWRI · SO₂ calculator"],
  },
  {
    id: "stuck-ferment",
    question: "Shiraz stuck at 8.4 Brix, day 12, temp 22°C. Restart approach?",
    answerJsx: (
      <>
        First: <strong style={{ color: "var(--ow-amber)" }}>test residual YAN</strong>. Below 140 mg/L is
        the most common driver at your stage. If nutrient-limited, rehydrate a restart yeast (Uvaferm 43
        or equivalent) with GoFerm and step-feed into a 1:10 acclimation. Warm the ferment gently to{" "}
        <strong style={{ color: "var(--ow-amber)" }}>24°C</strong> before pitching to reduce osmotic shock.
      </>
    ),
    citations: ["Fugelsang & Edwards · Wine Microbiology, ch. 5", "Lallemand · Stuck ferment restart protocol"],
  },
];

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
  // Rotate window scenes on an 8s cadence. Pause on hover so a visitor
  // reading the answer isn't yanked to the next one mid-sentence.
  const [sceneIdx, setSceneIdx] = useState(0);
  const [paused, setPaused] = useState(false);
  useEffect(() => {
    if (paused) return;
    const t = setInterval(() => setSceneIdx((i) => (i + 1) % WINDOW_SCENES.length), 8000);
    return () => clearInterval(t);
  }, [paused]);
  const scene = useMemo(() => WINDOW_SCENES[sceneIdx], [sceneIdx]);

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
          onMouseEnter={() => setPaused(true)}
          onMouseLeave={() => setPaused(false)}
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

          {/* Chat body — keyed by scene id so the fade replays each swap */}
          <div key={scene.id} data-testid={`why-ownology-window-scene-${scene.id}`} style={{ padding: "1.5rem 1.5rem 1.25rem", animation: "why-fade 500ms ease" }}>
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
                  {scene.question}
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
                  {scene.answerJsx}
                </p>
                {/* Citation pills — one per source */}
                <div style={{ marginTop: "0.85rem", display: "flex", flexWrap: "wrap", gap: "0.4rem" }}>
                  {scene.citations.map((cite, i) => (
                    <span
                      key={cite}
                      data-testid={i === 0 ? "why-ownology-window-citation" : `why-ownology-window-citation-${i}`}
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
                      <span style={{ opacity: 0.7 }}>cited:</span> {cite}
                    </span>
                  ))}
                </div>
              </div>
            </div>
          </div>

          {/* Dot nav for rotating questions — small, quiet */}
          <div
            data-testid="why-ownology-window-dots"
            style={{
              display: "flex",
              justifyContent: "center",
              gap: "0.5rem",
              padding: "0.25rem 0 0.7rem",
              background: "var(--ow-bg-raised)",
            }}
          >
            {WINDOW_SCENES.map((s, i) => (
              <button
                key={s.id}
                type="button"
                onClick={() => { setSceneIdx(i); setPaused(true); setTimeout(() => setPaused(false), 5000); }}
                data-testid={`why-ownology-window-dot-${s.id}`}
                aria-label={`Show question ${i + 1}`}
                style={{
                  width: sceneIdx === i ? 22 : 7,
                  height: 7,
                  borderRadius: 999,
                  border: "none",
                  cursor: "pointer",
                  background: sceneIdx === i ? "var(--ow-amber)" : "color-mix(in oklch, var(--ow-amber) 22%, transparent)",
                  transition: "width 200ms ease, background 200ms ease",
                  padding: 0,
                }}
              />
            ))}
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
      <style>{`
        @keyframes why-fade {
          from { opacity: 0.15; transform: translateY(4px); }
          to   { opacity: 1;    transform: translateY(0); }
        }
      `}</style>
    </section>
  );
}
