/**
 * CrushCascade — theatrical theme-switch animation.
 *
 * When the operator switches into Red Crush or White Crush, a translucent
 * "juice wave" cascades down the screen — deep wine-rose for red, apple-
 * green for white — carrying a one-line story caption ("pink of Pinot
 * juice on the press"). Drains off the bottom in ~1200ms leaving the new
 * theme applied. Tells the story of the colour choice without ever
 * leaving the page.
 *
 * Triggered by `window.dispatchEvent(new CustomEvent('ownology:crush',
 * { detail: { themeId } }))` — fired from ThemeToggle and
 * ThemeOnboarding when select succeeds. Pure CSS animation, no JS in
 * the hot path. Respects prefers-reduced-motion (skipped entirely).
 */
import { useEffect, useState } from "react";
import type { ThemeId } from "@/lib/themes";

type CrushVariant = {
  themeId: ThemeId;
  title: string;
  story: string;
  emoji: string;
  /** CSS color string used directly in the gradient */
  juiceColor: string;
  juiceColorSoft: string;
};

const CRUSH_VARIANTS: Record<string, CrushVariant> = {
  "red-crush": {
    themeId: "red-crush",
    title: "Red Crush",
    story: "Pink of Pinot juice on the press",
    emoji: "🍇",
    juiceColor: "oklch(0.42 0.22 12)",   // deep wine rose
    juiceColorSoft: "oklch(0.58 0.24 5)",
  },
  "white-crush": {
    themeId: "white-crush",
    title: "White Crush",
    story: "Apple-green of Chardonnay fresh off the picker",
    emoji: "🍏",
    juiceColor: "oklch(0.46 0.18 138)",  // deep grape-green
    juiceColorSoft: "oklch(0.66 0.18 140)",
  },
};

const DURATION_MS = 1300;

export default function CrushCascade() {
  const [variant, setVariant] = useState<CrushVariant | null>(null);

  useEffect(() => {
    if (typeof window === "undefined") return;
    function onCrush(e: Event) {
      const detail = (e as CustomEvent<{ themeId?: string }>).detail;
      const v = detail?.themeId ? CRUSH_VARIANTS[detail.themeId] : undefined;
      if (!v) return;
      // Respect reduced-motion users
      if (window.matchMedia("(prefers-reduced-motion: reduce)").matches) return;
      setVariant(v);
      window.setTimeout(() => setVariant(null), DURATION_MS);
    }
    window.addEventListener("ownology:crush", onCrush as EventListener);
    return () => window.removeEventListener("ownology:crush", onCrush as EventListener);
  }, []);

  if (!variant) return null;

  return (
    <div
      data-testid={`crush-cascade-${variant.themeId}`}
      aria-hidden="true"
      style={{
        position: "fixed",
        inset: 0,
        pointerEvents: "none",
        zIndex: 9999,
        overflow: "hidden",
      }}
    >
      {/* The juice wave — deep colour fading to translucent at the trailing edge,
          cascades from above into view then drains off the bottom. */}
      <div
        style={{
          position: "absolute",
          inset: 0,
          background: `linear-gradient(180deg,
            ${variant.juiceColor} 0%,
            ${variant.juiceColor} 35%,
            ${variant.juiceColorSoft} 60%,
            transparent 95%
          )`,
          animation: `crushFlow ${DURATION_MS}ms cubic-bezier(0.55, 0.085, 0.68, 0.53) forwards`,
        }}
      />
      {/* Story caption — appears with the leading edge of the juice */}
      <div
        style={{
          position: "absolute",
          top: "38%",
          left: "50%",
          transform: "translate(-50%, -50%)",
          color: "white",
          textAlign: "center",
          fontFamily: "'Fraunces',serif",
          textShadow: "0 1px 12px rgba(0,0,0,0.4)",
          animation: `crushCaption ${DURATION_MS}ms ease-out forwards`,
        }}
      >
        <div style={{ fontSize: "3.5rem", lineHeight: 1, marginBottom: 6 }}>
          {variant.emoji}
        </div>
        <div style={{ fontSize: "1.8rem", fontWeight: 700, letterSpacing: "0.01em" }}>
          {variant.title}
        </div>
        <div
          style={{
            marginTop: 4,
            fontFamily: "'Lato',sans-serif",
            fontSize: "0.95rem",
            fontWeight: 400,
            fontStyle: "italic",
            opacity: 0.92,
          }}
        >
          {variant.story}
        </div>
      </div>

      {/* Inline keyframes (scoped to this component, no global CSS churn) */}
      <style>{`
        @keyframes crushFlow {
          0%   { transform: translateY(-100%); }
          22%  { transform: translateY(0%); }
          100% { transform: translateY(100%); }
        }
        @keyframes crushCaption {
          0%, 8%   { opacity: 0; transform: translate(-50%, -38%); }
          22%, 60% { opacity: 1; transform: translate(-50%, -50%); }
          100%     { opacity: 0; transform: translate(-50%, -62%); }
        }
      `}</style>
    </div>
  );
}
