/**
 * CrushCascade — theatrical theme-switch animation.
 *
 * When the operator switches into Red Crush or White Crush, a cinematic
 * "juice cascade" fills the screen — deep wine-rose for red, apple-green
 * for white — pauses on a centred caption so the operator REGISTERS the
 * moment, then drains off the bottom. Total ~4 seconds:
 *   - 0–22%   (0–880ms)   — wave washes in from top
 *   - 22–72%  (880–2880ms) — full solid-colour wash held with caption visible
 *   - 72–100% (2880–4000ms) — drain off bottom
 *
 * Triggered TWO ways (belt-and-braces for robustness across builds):
 *   1. Explicit event: `window.dispatchEvent(new CustomEvent('ownology:crush',
 *      { detail: { themeId } }))` — fired from ThemeToggle and ThemeOnboarding.
 *   2. MutationObserver on `<html>.classList` — fires whenever a
 *      `theme-red-crush` or `theme-white-crush` class is ADDED (i.e. a
 *      transition INTO that theme). Does NOT fire on page load.
 *
 * De-duped via a 600ms cooldown so the event + observer don't double-trigger.
 * Pure CSS animation, no JS in the hot path. Respects prefers-reduced-motion.
 */
import { useEffect, useRef, useState } from "react";
import type { ThemeId } from "@/lib/themes";

type CrushVariant = {
  themeId: ThemeId;
  title: string;
  story: string;
  emoji: string;
  /** Deep solid colour for the main wash */
  juiceColor: string;
  /** Softer accent for the trailing edge */
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

const DURATION_MS = 4000;
const COOLDOWN_MS = 600;

const CRUSH_CLASS_TO_ID: Record<string, string> = {
  "theme-red-crush": "red-crush",
  "theme-white-crush": "white-crush",
};

export default function CrushCascade() {
  const [variant, setVariant] = useState<CrushVariant | null>(null);
  const lastFiredAt = useRef<number>(0);
  const lastFiredId = useRef<string | null>(null);

  useEffect(() => {
    if (typeof window === "undefined") return;

    function reducedMotion(): boolean {
      return window.matchMedia("(prefers-reduced-motion: reduce)").matches;
    }

    function trigger(themeId: string | undefined) {
      if (!themeId) return;
      const v = CRUSH_VARIANTS[themeId];
      if (!v) return;
      if (reducedMotion()) return;
      // De-dup: ignore the same theme firing within COOLDOWN_MS (event + observer
      // race protection). Different themes always fire fresh.
      const now = Date.now();
      if (lastFiredId.current === themeId && now - lastFiredAt.current < COOLDOWN_MS) return;
      lastFiredAt.current = now;
      lastFiredId.current = themeId;
      setVariant(v);
      window.setTimeout(() => {
        setVariant((current) => (current && current.themeId === v.themeId ? null : current));
      }, DURATION_MS);
    }

    // (1) Explicit event listener
    function onCrush(e: Event) {
      const detail = (e as CustomEvent<{ themeId?: string }>).detail;
      trigger(detail?.themeId);
    }
    window.addEventListener("ownology:crush", onCrush as EventListener);

    // (2) MutationObserver fallback — watches <html>.classList for the crush
    //     theme classes being ADDED (not present at observer-start). Catches
    //     any path that applies the theme without dispatching the event.
    const html = document.documentElement;
    const initialClasses = new Set(Array.from(html.classList));
    // Pre-populate with the theme stored in localStorage so the initial
    // `applyThemeToDom` (which runs in a useEffect AFTER CrushCascade mounts)
    // doesn't false-trigger the cascade on page load.
    try {
      const stored = window.localStorage.getItem("ownology-theme");
      if (stored === "red-crush") initialClasses.add("theme-red-crush");
      if (stored === "white-crush") initialClasses.add("theme-white-crush");
    } catch {
      // localStorage may be unavailable (privacy mode) — observer-only baseline is fine
    }
    const observer = new MutationObserver((mutations) => {
      for (const m of mutations) {
        if (m.type !== "attributes" || m.attributeName !== "class") continue;
        const nowClasses = Array.from(html.classList);
        for (const cls of nowClasses) {
          const id = CRUSH_CLASS_TO_ID[cls];
          if (!id) continue;
          // Only fire if this class wasn't present at observer-start AND
          // wasn't present in the previous mutation snapshot (i.e. just added).
          if (!initialClasses.has(cls)) {
            trigger(id);
            initialClasses.add(cls); // prevent re-fire from the same observation
          }
        }
        // Reset baseline when a crush class is removed so re-applying later still fires
        for (const cls of Object.keys(CRUSH_CLASS_TO_ID)) {
          if (!nowClasses.includes(cls)) initialClasses.delete(cls);
        }
      }
    });
    observer.observe(html, { attributes: true, attributeFilter: ["class"] });

    return () => {
      window.removeEventListener("ownology:crush", onCrush as EventListener);
      observer.disconnect();
    };
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
        zIndex: 99999,
        overflow: "hidden",
      }}
    >
      {/*
        The juice wave. Element is 200vh tall: the top 78% is SOLID deep colour
        and the bottom 22% fades to transparent. Translating from -100% (entirely
        off-screen above) → 0% (top aligned with viewport top, so the entire
        viewport sees the solid section) → 100% (entirely off-screen below)
        produces a wash that genuinely fills the screen at peak.
      */}
      <div
        style={{
          position: "absolute",
          top: 0,
          left: 0,
          width: "100%",
          height: "200vh",
          background: `linear-gradient(180deg,
            ${variant.juiceColor} 0%,
            ${variant.juiceColor} 78%,
            ${variant.juiceColorSoft} 92%,
            transparent 100%
          )`,
          animation: `crushFlow ${DURATION_MS}ms cubic-bezier(0.45, 0.05, 0.55, 0.95) forwards`,
          willChange: "transform",
        }}
      />
      {/* Story caption — scales up gently during the hold phase */}
      <div
        style={{
          position: "absolute",
          top: "50%",
          left: "50%",
          color: "white",
          textAlign: "center",
          fontFamily: "'Fraunces',serif",
          textShadow: "0 2px 18px rgba(0,0,0,0.45)",
          animation: `crushCaption ${DURATION_MS}ms cubic-bezier(0.25, 0.46, 0.45, 0.94) forwards`,
          willChange: "transform, opacity",
          padding: "0 1.5rem",
        }}
      >
        <div style={{ fontSize: "5rem", lineHeight: 1, marginBottom: 10 }}>
          {variant.emoji}
        </div>
        <div
          style={{
            fontSize: "2.6rem",
            fontWeight: 700,
            letterSpacing: "-0.01em",
            lineHeight: 1.1,
          }}
        >
          {variant.title}
        </div>
        <div
          style={{
            marginTop: 10,
            fontFamily: "'Lato',sans-serif",
            fontSize: "1.05rem",
            fontWeight: 400,
            fontStyle: "italic",
            opacity: 0.95,
            letterSpacing: "0.005em",
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
          72%  { transform: translateY(0%); }
          100% { transform: translateY(100%); }
        }
        @keyframes crushCaption {
          0%, 12%  { opacity: 0; transform: translate(-50%, -38%) scale(0.92); }
          24%      { opacity: 1; transform: translate(-50%, -50%) scale(1.00); }
          70%      { opacity: 1; transform: translate(-50%, -50%) scale(1.03); }
          100%     { opacity: 0; transform: translate(-50%, -58%) scale(1.05); }
        }
      `}</style>
    </div>
  );
}
