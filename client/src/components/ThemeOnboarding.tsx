/**
 * ThemeOnboarding — first-visit nudge to pick a theme.
 *
 * Shows a subtle bottom-anchored card the first time a visitor lands on
 * the site (no localStorage key set for either the theme picker or the
 * onboarding dismissal). One tap on a theme persists it AND dismisses the
 * onboarding. A close button dismisses without choosing (we still record
 * the dismissal so it doesn't re-prompt next visit).
 *
 * Design intent: deliberate-but-tiny. Not a modal — modals block tasks.
 * Just a card the operator can ignore if they want the default, but can't
 * miss if they want to choose. Wineries swing dark/light depending on
 * where you're standing — operators should choose once, on purpose.
 *
 * Auto-suppressed on /admin/* routes (operator already knows the system),
 * and on /hi/:slug (prospect-facing landing must not feel like a SaaS).
 */
import { useEffect, useState } from "react";
import { useLocation } from "wouter";

import {
  applyThemeToDom,
  getEnabledThemes,
  type ThemeId,
} from "@/lib/themes";

const STORAGE_THEME = "ownology-theme";
const STORAGE_DISMISSED = "ownology-theme-onboarded";

const SUPPRESSED_PREFIXES = ["/admin", "/hi/", "/founding-member/success", "/merch/success"];

export default function ThemeOnboarding() {
  const [location] = useLocation();
  const [show, setShow] = useState(false);
  const [picked, setPicked] = useState<ThemeId | null>(null);

  useEffect(() => {
    if (typeof window === "undefined") return;
    if (SUPPRESSED_PREFIXES.some((p) => location.startsWith(p))) return;
    const storedTheme = window.localStorage.getItem(STORAGE_THEME);
    const dismissed = window.localStorage.getItem(STORAGE_DISMISSED);
    // First time: NO theme + NO dismissal → show
    if (!storedTheme && !dismissed) {
      // Tiny delay so the page paints first
      const t = setTimeout(() => setShow(true), 800);
      return () => clearTimeout(t);
    }
  }, [location]);

  function dismiss() {
    if (typeof window !== "undefined") {
      window.localStorage.setItem(STORAGE_DISMISSED, "1");
    }
    setShow(false);
  }

  function choose(id: ThemeId) {
    if (typeof window !== "undefined") {
      window.localStorage.setItem(STORAGE_THEME, id);
      window.localStorage.setItem(STORAGE_DISMISSED, "1");
    }
    applyThemeToDom(id);
    setPicked(id);
    // Briefly hold the "✓ active" state so the choice feels affirmed
    setTimeout(() => setShow(false), 700);
  }

  if (!show) return null;

  const enabled = getEnabledThemes();

  return (
    <div
      data-testid="theme-onboarding"
      role="dialog"
      aria-label="Choose your working light"
      style={{
        position: "fixed",
        bottom: 16,
        left: "50%",
        transform: "translateX(-50%)",
        zIndex: 90,
        width: "min(560px, calc(100vw - 24px))",
        background: "var(--ow-bg-card)",
        border: "1px solid var(--ow-border-md)",
        borderRadius: 8,
        boxShadow: "0 16px 48px var(--ow-shadow)",
        padding: "14px 16px",
        backdropFilter: "blur(8px)",
      }}
    >
      <div style={{ display: "flex", alignItems: "flex-start", gap: 12 }}>
        <div style={{ flexGrow: 1, minWidth: 0 }}>
          <p
            style={{
              fontFamily: "'Lato',sans-serif",
              fontSize: "0.66rem",
              letterSpacing: "0.12em",
              color: "var(--ow-amber)",
              margin: 0,
              fontWeight: 700,
              textTransform: "uppercase",
            }}
          >
            Choose your working light
          </p>
          <p
            style={{
              fontFamily: "'Lato',sans-serif",
              fontSize: "0.85rem",
              color: "var(--ow-text-mid)",
              margin: "4px 0 10px",
              lineHeight: 1.4,
            }}
          >
            Wineries swing between cellar-dark and harvest-pad bright. Pick the theme that suits your day —
            you can change it any time from the nav.
          </p>
          <div style={{ display: "flex", flexWrap: "wrap", gap: 6 }}>
            {enabled.map((t) => {
              const isPicked = picked === t.id;
              return (
                <button
                  key={t.id}
                  type="button"
                  data-testid={`onboarding-theme-${t.id}`}
                  onClick={() => choose(t.id)}
                  style={{
                    padding: "8px 12px",
                    borderRadius: 4,
                    border: isPicked
                      ? "1px solid var(--ow-amber)"
                      : "1px solid var(--ow-border-md)",
                    background: isPicked
                      ? "var(--ow-amber)"
                      : "color-mix(in oklch, var(--ow-amber) 4%, transparent)",
                    color: isPicked ? "oklch(0.10 0.008 60)" : "var(--ow-text-hi)",
                    fontFamily: "'Lato',sans-serif",
                    fontSize: "0.78rem",
                    fontWeight: 700,
                    letterSpacing: "0.03em",
                    cursor: "pointer",
                  }}
                  title={t.description}
                >
                  {t.label}
                  {isPicked && (
                    <span style={{ marginLeft: 6 }}>✓</span>
                  )}
                </button>
              );
            })}
          </div>
        </div>
        <button
          type="button"
          aria-label="Dismiss"
          data-testid="theme-onboarding-close"
          onClick={dismiss}
          style={{
            background: "transparent",
            border: "none",
            color: "var(--ow-text-lo)",
            cursor: "pointer",
            fontSize: "1.1rem",
            lineHeight: 1,
            padding: "2px 6px",
            flexShrink: 0,
          }}
        >
          ×
        </button>
      </div>
    </div>
  );
}
