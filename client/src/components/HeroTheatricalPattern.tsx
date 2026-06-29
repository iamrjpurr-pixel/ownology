/**
 * HeroTheatricalPattern — persistent ambient overlay for marketing heroes.
 *
 * Compounds the wow-factor of the CrushCascade one-shot animation by giving
 * marketing heroes a quiet, always-on "juice trail" pattern: 6 vertical
 * stripes of translucent amber (or pink/green when a crush theme is active)
 * drift slowly down the hero at different speeds, like fermenting must
 * running down a tank wall. Pure CSS — no JS animation loop, no perf hit.
 *
 * Usage:
 *   <section className="relative …">
 *     <HeroTheatricalPattern />     // mount above background image, below copy
 *     … your hero copy …
 *   </section>
 *
 * Respects prefers-reduced-motion (stripes go static at low opacity).
 * Theme-aware: reads `--ow-accent-live` so red-crush → wine-rose stripes,
 * white-crush → grape-green stripes, otherwise → amber.
 */
import { useId } from "react";

interface HeroTheatricalPatternProps {
  /** Higher = more visible. Default 0.18 keeps it ambient. */
  intensity?: number;
  /** Animation slowdown factor. Default 1 (~22s base). */
  speed?: number;
  /** Layer order. Default 1 — sits above the bg image, below the content. */
  zIndex?: number;
}

const STRIPES = [
  { x: "6%",  w: 90,  dur: 24, delay: 0,    opacity: 1.0 },
  { x: "18%", w: 70,  dur: 30, delay: -7,   opacity: 0.7 },
  { x: "32%", w: 110, dur: 22, delay: -14,  opacity: 0.9 },
  { x: "48%", w: 60,  dur: 28, delay: -3,   opacity: 0.55 },
  { x: "64%", w: 130, dur: 34, delay: -19,  opacity: 0.85 },
  { x: "82%", w: 80,  dur: 26, delay: -10,  opacity: 0.75 },
  { x: "93%", w: 50,  dur: 20, delay: -5,   opacity: 0.5 },
];

export default function HeroTheatricalPattern({
  intensity = 0.18,
  speed = 1,
  zIndex = 1,
}: HeroTheatricalPatternProps) {
  // Stable per-instance keyframe name so multiple heroes on one page (if any)
  // don't clash on `@keyframes hero-trail-drip`.
  const id = useId().replace(/[:]/g, "");
  const keyframe = `htpDrip_${id}`;

  return (
    <div
      data-testid="hero-theatrical-pattern"
      aria-hidden="true"
      style={{
        position: "absolute",
        inset: 0,
        overflow: "hidden",
        pointerEvents: "none",
        zIndex,
        mixBlendMode: "screen",
      }}
    >
      {STRIPES.map((s, i) => (
        <div
          key={i}
          style={{
            position: "absolute",
            top: 0,
            left: s.x,
            width: s.w,
            height: "100%",
            opacity: intensity * s.opacity,
            background: `linear-gradient(to bottom,
              transparent 0%,
              var(--ow-accent-live, var(--ow-amber)) 22%,
              color-mix(in oklch, var(--ow-accent-live, var(--ow-amber)) 60%, transparent) 55%,
              transparent 100%
            )`,
            filter: "blur(8px)",
            animation: `${keyframe} ${s.dur * speed}s linear ${s.delay * speed}s infinite`,
            willChange: "transform",
          }}
        />
      ))}

      {/* Subtle warm spotlight bias toward top-left so the pattern feels
          centred on the headline copy rather than floating randomly. */}
      <div
        style={{
          position: "absolute",
          inset: 0,
          background:
            "radial-gradient(ellipse 60% 50% at 25% 30%, color-mix(in oklch, var(--ow-accent-live, var(--ow-amber)) 12%, transparent) 0%, transparent 70%)",
          mixBlendMode: "screen",
        }}
      />

      <style>{`
        @keyframes ${keyframe} {
          0%   { transform: translateY(-110%); }
          100% { transform: translateY(110%); }
        }
        @media (prefers-reduced-motion: reduce) {
          [data-testid="hero-theatrical-pattern"] > div {
            animation: none !important;
            opacity: ${intensity * 0.4} !important;
          }
        }
      `}</style>
    </div>
  );
}
