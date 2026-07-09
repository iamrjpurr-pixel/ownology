/**
 * HeroCarousel v4 — "The Apprentice Arc" (Feb 2026, Rich).
 *
 * Doctrine: identity → category → pain → invite. Four scenes rotate on a
 * ~5s cadence; pauses on hover; dots for manual advance. Below-fold static
 * content (WhyOwnologyBoxes + rational proof) picks up the story once the
 * carousel has done its emotional work.
 *
 * Scene order (deliberate — see CHANGELOG entry for the v3→v4 rationale):
 *   1. Meet Owen    — persona / identity anchor        (5s)
 *   2. The Gap      — category anchor (InnoVint/Vintrace) (6s)
 *   3. 3:47am       — pain / loss-aversion peak        (5s)
 *   4. Get Started  — invite close with dual CTA       (6s)
 *
 * Total loop = 22s. Autoplay resumes 4s after any pause.
 */
import { useEffect, useRef, useState } from "react";
import { Link } from "wouter";

type Scene = "owen" | "gap" | "panic" | "start";
const ORDER: Scene[] = ["owen", "gap", "panic", "start"];
const DURATIONS: Record<Scene, number> = {
  owen: 5000,
  gap: 6000,
  panic: 5000,
  start: 6000,
};

export default function HeroCarousel({ onSkip }: { onSkip?: () => void }) {
  const [active, setActive] = useState<Scene>("owen");
  const [paused, setPaused] = useState(false);
  const [progressKey, setProgressKey] = useState(0);
  const timerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  useEffect(() => {
    if (paused) {
      if (timerRef.current) clearTimeout(timerRef.current);
      return;
    }
    const idx = ORDER.indexOf(active);
    const next = ORDER[(idx + 1) % ORDER.length];
    timerRef.current = setTimeout(() => {
      setActive(next);
      setProgressKey((k) => k + 1);
    }, DURATIONS[active]);
    return () => { if (timerRef.current) clearTimeout(timerRef.current); };
  }, [active, paused]);

  function jumpTo(s: Scene) {
    setActive(s);
    setProgressKey((k) => k + 1);
    setPaused(true);
    setTimeout(() => setPaused(false), 4000);
  }

  return (
    <section
      data-testid="hero-carousel"
      onMouseEnter={() => setPaused(true)}
      onMouseLeave={() => setPaused(false)}
      style={{
        position: "relative",
        minHeight: "88vh",
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
        overflow: "hidden",
        background: "oklch(0.10 0.008 60)",
        color: "oklch(0.95 0.010 75)",
      }}
    >
      {/* Scene 1 — Meet Owen (persona / identity anchor).
             Opens on the friendly, category-defining hook. Typography-forward;
             the amber apprentice mark provides a branded anchor without turning
             the scene into a mascot ad. */}
      <SceneWrap active={active === "owen"} testId="hero-scene-owen">
        <div
          aria-hidden
          data-testid="hero-scene-owen-mark"
          style={{
            width: 84,
            height: 84,
            borderRadius: 999,
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            margin: "0 auto 1.5rem",
            background: "color-mix(in oklch, var(--ow-amber) 14%, transparent)",
            border: "1px solid color-mix(in oklch, var(--ow-amber) 45%, transparent)",
            boxShadow: "0 0 60px color-mix(in oklch, var(--ow-amber) 22%, transparent)",
          }}
        >
          <span
            style={{
              fontFamily: "'Fraunces',serif",
              fontStyle: "italic",
              fontWeight: 700,
              fontSize: "2.4rem",
              color: "var(--ow-amber)",
              lineHeight: 1,
              transform: "translateY(-2px)",
            }}
          >
            O
          </span>
        </div>
        <p style={eyebrow}>Meet Owen</p>
        <h1 style={h1}>
          The apprentice who
          <br />
          <span style={{ color: "var(--ow-amber)" }}>never leaves the cellar.</span>
        </h1>
      </SceneWrap>

      {/* Scene 2 — recognition-anchor framing (Angle D, data-picked in v3).
             Lower cognitive load than a 4-card comparison matrix; uses
             competitor names as CATEGORY anchors, not attack targets;
             mirrors how winemakers themselves sell — story + recognition
             rather than spec sheets. */}
      <SceneWrap active={active === "gap"} testId="hero-scene-gap">
        <p style={eyebrow}>The gap · where you sit</p>
        <h2 style={{ ...h1, fontSize: "clamp(1.6rem, 3.8vw, 2.75rem)", marginBottom: "2rem" }}>
          You already know InnoVint &amp; Vintrace.
          <br />
          <span style={{ color: "var(--ow-amber)" }}>You&rsquo;ve probably priced them.</span>
        </h2>

        {/* Category chip row — three peers, Ownology amber-lit */}
        <div
          data-testid="hero-scene-gap-chips"
          style={{
            display: "flex",
            flexWrap: "wrap",
            justifyContent: "center",
            gap: "0.6rem",
            marginBottom: "1.75rem",
          }}
        >
          {[
            { name: "InnoVint", muted: true },
            { name: "Vintrace", muted: true },
            { name: "Ownology", muted: false },
          ].map((c) => (
            <span
              key={c.name}
              style={{
                fontFamily: "'Lato',sans-serif",
                fontSize: "0.85rem",
                fontWeight: c.muted ? 400 : 700,
                letterSpacing: "0.04em",
                padding: "0.4rem 1rem",
                borderRadius: 999,
                border: `1px solid color-mix(in oklch, var(--ow-amber) ${c.muted ? 25 : 55}%, transparent)`,
                background: c.muted
                  ? "transparent"
                  : "color-mix(in oklch, var(--ow-amber) 18%, transparent)",
                color: c.muted ? "oklch(0.68 0.015 75)" : "var(--ow-amber)",
              }}
            >
              {c.name}
            </span>
          ))}
        </div>

        <p
          style={{
            fontFamily: "'Lato',sans-serif",
            fontWeight: 300,
            fontSize: "clamp(0.95rem, 1.4vw, 1.1rem)",
            lineHeight: 1.65,
            color: "oklch(0.82 0.010 75)",
            maxWidth: 640,
            margin: "0 auto",
            textWrap: "balance" as "balance",
          }}
        >
          Ownology is the same category &mdash; <span style={{ color: "var(--ow-amber)", fontWeight: 500 }}>cellar intelligence</span> &mdash;
          priced and paced for boutique winemakers. Every answer cited, every SOP editable, APCO built in.
        </p>

        <p
          style={{
            fontFamily: "'Fraunces',serif",
            fontStyle: "italic",
            fontSize: "0.9rem",
            color: "oklch(0.62 0.015 75)",
            marginTop: "1.5rem",
          }}
        >
          Before you spend another year on the wrong tool.
        </p>
      </SceneWrap>

      {/* Scene 3 — 3:47am ferment panic (loss-aversion peak). Sits deliberately
             AFTER the category anchor so the visitor already knows Ownology
             plays in the same league before we show the moment competitors
             don't answer at. */}
      <SceneWrap active={active === "panic"} testId="hero-scene-panic">
        <p style={eyebrow}>3:47am · vintage 2026</p>
        <h2 style={h1}>
          Your Shiraz is stuck at 8.4 Brix.
          <br />
          <span style={{ color: "var(--ow-amber)" }}>What do you do?</span>
        </h2>
      </SceneWrap>

      {/* Scene 4 — Get Started (invite close). Body copy pulled from the old
             Owen-CTA scene; the primary CTA is unchanged so bookmarked
             analytics events (`hero-carousel-cta-*`) don't break. */}
      <SceneWrap active={active === "start"} testId="hero-scene-start">
        <p style={eyebrow}>Get Started</p>
        <h2 style={h1}>
          Your winery&rsquo;s most
          <br />
          <span style={{ color: "var(--ow-amber)" }}>knowledgeable apprentice</span> is ready.
        </h2>
        <p style={{ fontFamily: "'Lato',sans-serif", fontWeight: 300, fontSize: "1rem", lineHeight: 1.7, color: "oklch(0.75 0.015 75)", maxWidth: 520, margin: "1.5rem auto 2rem" }}>
          Cellar-grade AI grounded in industry-standard oenology references.
          Cited answers, compliance drafting, and a 250+ Q&amp;A library.
          Free to ask.
        </p>
        <div style={{ display: "flex", flexWrap: "wrap", justifyContent: "center", gap: "0.75rem" }}>
          <Link
            href="/ask?from=hero-carousel-curious"
            data-testid="hero-carousel-cta-curious"
            style={ctaSecondary}
          >
            🍷 Ask Owen — free →
          </Link>
          <Link
            href="/pricing?from=hero-carousel-pro"
            data-testid="hero-carousel-cta-pro"
            style={ctaPrimary}
          >
            🍇 Start 14-day trial →
          </Link>
        </div>
      </SceneWrap>

      {/* Progress bar */}
      <div
        key={progressKey}
        style={{
          position: "absolute",
          top: 0,
          left: 0,
          right: 0,
          height: 2,
          background: "color-mix(in oklch, var(--ow-amber) 15%, transparent)",
        }}
      >
        <div
          style={{
            height: "100%",
            background: "var(--ow-amber)",
            width: paused ? "100%" : "0%",
            animation: paused ? "none" : `progress-fill ${DURATIONS[active]}ms linear forwards`,
          }}
        />
      </div>

      {/* Dot nav */}
      <div
        data-testid="hero-carousel-dots"
        style={{
          position: "absolute",
          bottom: "2rem",
          left: "50%",
          transform: "translateX(-50%)",
          display: "flex",
          gap: "0.75rem",
          zIndex: 3,
        }}
      >
        {ORDER.map((s, i) => (
          <button
            key={s}
            type="button"
            data-testid={`hero-carousel-dot-${s}`}
            onClick={() => jumpTo(s)}
            aria-label={`Go to scene ${i + 1}`}
            style={{
              width: active === s ? 28 : 10,
              height: 10,
              borderRadius: 999,
              background: active === s ? "var(--ow-amber)" : "color-mix(in oklch, var(--ow-amber) 25%, transparent)",
              border: "none",
              cursor: "pointer",
              transition: "width 200ms ease, background 200ms ease",
            }}
          />
        ))}
      </div>

      {/* Skip intro */}
      {onSkip && (
        <button
          type="button"
          data-testid="hero-carousel-skip"
          onClick={onSkip}
          style={{
            position: "absolute",
            top: "1.5rem",
            right: "1.5rem",
            padding: "0.4rem 0.85rem",
            background: "transparent",
            border: "1px solid color-mix(in oklch, var(--ow-amber) 40%, transparent)",
            borderRadius: 999,
            color: "oklch(0.75 0.015 75)",
            fontFamily: "'Lato',sans-serif",
            fontSize: "0.72rem",
            letterSpacing: "0.06em",
            textTransform: "uppercase",
            cursor: "pointer",
            zIndex: 3,
          }}
        >
          Skip intro ↓
        </button>
      )}

      <style>{`
        @keyframes progress-fill { from { width: 0%; } to { width: 100%; } }
      `}</style>
    </section>
  );
}

// ── Sub-scene wrapper with fade-in / fade-out ────────────────────────────────
function SceneWrap({ active, testId, children }: { active: boolean; testId: string; children: React.ReactNode }) {
  return (
    <div
      data-testid={testId}
      aria-hidden={!active}
      style={{
        position: "absolute",
        inset: 0,
        display: "flex",
        flexDirection: "column",
        alignItems: "center",
        justifyContent: "center",
        padding: "3rem 1.5rem",
        textAlign: "center",
        opacity: active ? 1 : 0,
        transition: "opacity 700ms ease",
        pointerEvents: active ? "auto" : "none",
      }}
    >
      <div style={{ maxWidth: 900, width: "100%" }}>{children}</div>
    </div>
  );
}

// ── Shared styles ────────────────────────────────────────────────────────────
const eyebrow: React.CSSProperties = {
  fontFamily: "'Fira Code',monospace",
  fontSize: "0.7rem",
  letterSpacing: "0.24em",
  color: "var(--ow-amber)",
  textTransform: "uppercase",
  marginBottom: "1.75rem",
};

const h1: React.CSSProperties = {
  fontFamily: "'Fraunces',serif",
  fontWeight: 700,
  fontSize: "clamp(2rem, 5vw, 3.75rem)",
  lineHeight: 1.1,
  letterSpacing: "-0.02em",
  margin: 0,
  textWrap: "balance" as "balance",
};

const ctaPrimary: React.CSSProperties = {
  padding: "1rem 1.75rem",
  background: "var(--ow-amber)",
  color: "oklch(0.10 0.008 60)",
  borderRadius: 6,
  fontFamily: "'Lato',sans-serif",
  fontWeight: 700,
  fontSize: "1rem",
  textDecoration: "none",
  letterSpacing: "0.01em",
};

const ctaSecondary: React.CSSProperties = {
  padding: "1rem 1.75rem",
  background: "transparent",
  color: "oklch(0.95 0.010 75)",
  border: "1.5px solid oklch(0.35 0.010 60)",
  borderRadius: 6,
  fontFamily: "'Lato',sans-serif",
  fontWeight: 500,
  fontSize: "1rem",
  textDecoration: "none",
};
