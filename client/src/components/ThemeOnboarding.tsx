/**
 * ThemeOnboarding — theme picker, available on demand.
 *
 * Originally a one-shot first-visit nudge; refactored to be re-openable any
 * time via a global `ownology:open-theme-picker` event. Behaviour:
 *
 *   1. First visit (no theme + no dismissal): auto-opens after 800ms.
 *   2. After dismissal: stays closed unless something dispatches
 *      `ownology:open-theme-picker` (e.g. the ThemeToggle dropdown's
 *      "Compare themes" link).
 *   3. While open: clicking a theme applies it as a live preview (theme
 *      changes on the page in real time) but DOES NOT close the card.
 *      Users can click through several themes to compare. They confirm
 *      via "Done — keep this", or close via × (last preview is kept).
 *
 * Auto-open is still suppressed on /admin/* and /hi/:slug routes. Manual
 * re-open (via event) works everywhere — operators sometimes want to flip
 * theme from the admin shell.
 */
import { useEffect, useState } from "react";
import { useLocation } from "wouter";

import {
  applyThemeToDom,
  getEnabledThemes,
  type ThemeId,
} from "@/lib/themes";
import { useThemeTelemetry } from "@/hooks/useThemeTelemetry";

const STORAGE_THEME = "ownology-theme";
const STORAGE_DISMISSED = "ownology-theme-onboarded";

const SUPPRESSED_PREFIXES = ["/admin", "/hi/", "/founding-member/success", "/merch/success", "/cellar-brief"];

export default function ThemeOnboarding() {
  const [location] = useLocation();
  const [show, setShow] = useState(false);
  const [picked, setPicked] = useState<ThemeId | null>(null);
  const telemetry = useThemeTelemetry();

  // First-visit auto-open (suppressed on admin / prospect-facing routes).
  useEffect(() => {
    if (typeof window === "undefined") return;
    if (SUPPRESSED_PREFIXES.some((p) => location.startsWith(p))) return;
    const storedTheme = window.localStorage.getItem(STORAGE_THEME);
    const dismissed = window.localStorage.getItem(STORAGE_DISMISSED);
    if (!storedTheme && !dismissed) {
      const t = setTimeout(() => setShow(true), 800);
      return () => clearTimeout(t);
    }
  }, [location]);

  // Manual re-open hook — any component can fire this event to show the
  // picker. Wired to the ThemeToggle dropdown's "Compare themes" link.
  useEffect(() => {
    function handler() {
      // Seed the ✓ marker with the currently-active theme so the user knows
      // where they're starting from.
      if (typeof window !== "undefined") {
        const current = window.localStorage.getItem(STORAGE_THEME) as ThemeId | null;
        setPicked(current);
      }
      setShow(true);
    }
    window.addEventListener("ownology:open-theme-picker", handler);
    return () => window.removeEventListener("ownology:open-theme-picker", handler);
  }, []);

  function dismiss() {
    if (typeof window !== "undefined") {
      window.localStorage.setItem(STORAGE_DISMISSED, "1");
    }
    setShow(false);
  }

  function preview(id: ThemeId) {
    // Record the pick and persist the chosen theme so a page refresh keeps
    // it. We deliberately DO NOT set STORAGE_DISMISSED here — the card
    // stays open until the user clicks "Done" or ×.
    telemetry.record(id);
    if (typeof window !== "undefined") {
      window.localStorage.setItem(STORAGE_THEME, id);
      if (id === "red-crush" || id === "white-crush") {
        window.dispatchEvent(new CustomEvent("ownology:crush", { detail: { themeId: id } }));
      }
    }
    applyThemeToDom(id);
    setPicked(id);
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
            Tap a theme to preview it live — the page changes instantly. Click through to compare,
            then hit <strong>Done</strong> to keep your choice.
          </p>
          <div style={{ display: "flex", flexWrap: "wrap", gap: 6 }}>
            {enabled.map((t) => {
              const isPicked = picked === t.id;
              return (
                <button
                  key={t.id}
                  type="button"
                  data-testid={`onboarding-theme-${t.id}`}
                  onClick={() => preview(t.id)}
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
                  {isPicked && <span style={{ marginLeft: 6 }}>✓</span>}
                </button>
              );
            })}
          </div>
          <div
            style={{
              display: "flex",
              alignItems: "center",
              gap: 10,
              marginTop: 12,
            }}
          >
            <button
              type="button"
              data-testid="theme-onboarding-done"
              onClick={dismiss}
              style={{
                background: picked ? "var(--ow-amber)" : "transparent",
                color: picked ? "white" : "var(--ow-text-lo)",
                border: picked ? "none" : "1px solid var(--ow-border-md)",
                fontFamily: "'Lato',sans-serif",
                fontSize: "0.74rem",
                fontWeight: 700,
                letterSpacing: "0.06em",
                textTransform: "uppercase",
                padding: "7px 14px",
                borderRadius: 4,
                cursor: "pointer",
              }}
            >
              {picked ? "Done — keep this" : "Close"}
            </button>
            <span
              style={{
                fontFamily: "'Lato',sans-serif",
                fontSize: "0.7rem",
                color: "var(--ow-text-lo)",
              }}
            >
              You can re-open this any time from the theme toggle.
            </span>
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
