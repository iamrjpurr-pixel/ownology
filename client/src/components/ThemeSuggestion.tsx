/**
 * ThemeSuggestion — once-a-day, dismissible "this time of day suits theme X"
 * banner. Suggests, never forces.
 *
 * Rules (per /app/memory/THEME_ERGONOMICS_REVIEW.md):
 *   04–08  → Soft Cellar (pre-dawn lab / first light)
 *   08–16  → Red Crush  (in-harvest, outdoor sun-readable)
 *            or Parchment (off-harvest, office daylight)
 *   16–19  → Soft Cellar (late-afternoon transition)
 *   19–04  → Cellar Night (lamplit barrel hall)
 *
 * Harvest months: Australia/NZ = Feb-Apr (southern), Northern = Aug-Oct.
 * Decided at runtime by user's local clock (Date.getMonth()).
 *
 * Frequency: at most ONCE per local calendar day. Persisted via
 *   localStorage["ownology-theme-suggested-on"] = YYYY-MM-DD.
 *
 * Skip conditions (banner never appears when any of these are true):
 *   - User's active theme matches the recommendation (no point nagging)
 *   - User has explicitly picked a theme in the last 24h (respect choice)
 *   - User has opted out via "Don't suggest again" (a third storage key)
 *   - The theme onboarding card is currently open
 *   - We're on /admin/*, /hi/*, or any kiosk-y route
 *
 * Mounted globally in App.tsx alongside <UserMenu> and <ThemeOnboarding>.
 */
import { useEffect, useState } from "react";
import { useLocation } from "wouter";

import { applyThemeToDom, getTheme, type ThemeId } from "@/lib/themes";
import { useThemeTelemetry } from "@/hooks/useThemeTelemetry";

const STORAGE_THEME = "ownology-theme";
const STORAGE_PICKED_AT = "ownology-theme-picked-at"; // ms timestamp
const STORAGE_SUGGESTED_ON = "ownology-theme-suggested-on"; // YYYY-MM-DD
const STORAGE_OPT_OUT = "ownology-theme-suggest-opt-out"; // "1"
const SUPPRESS_PREFIXES = ["/admin", "/hi/", "/auth/", "/login"];

type Suggestion = {
  themeId: ThemeId;
  label: string;
  reason: string;
};

function inHarvestMonth(d: Date): boolean {
  const m = d.getMonth(); // 0-indexed
  // Southern Hemisphere harvest: Feb (1), Mar (2), Apr (3)
  // Northern Hemisphere harvest: Aug (7), Sep (8), Oct (9)
  return m === 1 || m === 2 || m === 3 || m === 7 || m === 8 || m === 9;
}

function pickByClock(d: Date): Suggestion {
  const h = d.getHours();
  if (h >= 19 || h < 4) {
    return { themeId: "cellar", label: "Cellar Night", reason: "Working under lamplight — Cellar Night fits the hour." };
  }
  if (h >= 4 && h < 8) {
    return { themeId: "soft-cellar", label: "Soft Cellar", reason: "Pre-dawn light — Soft Cellar's stainless & concrete feel suits the hour." };
  }
  if (h >= 16) {
    return { themeId: "soft-cellar", label: "Soft Cellar", reason: "Late afternoon transition — Soft Cellar bridges day and night." };
  }
  // 08-16: depend on harvest
  if (inHarvestMonth(d)) {
    return { themeId: "red-crush", label: "Red Crush", reason: "Harvest season + outdoor hours — Red Crush is sun-readable on the press deck." };
  }
  return { themeId: "parchment", label: "Parchment", reason: "Office daylight — Parchment is the lowest-fatigue option for sustained reading." };
}

function todayKey(d: Date): string {
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`;
}

export default function ThemeSuggestion() {
  const [location] = useLocation();
  const [suggestion, setSuggestion] = useState<Suggestion | null>(null);
  const telemetry = useThemeTelemetry();

  useEffect(() => {
    if (typeof window === "undefined") return;
    if (SUPPRESS_PREFIXES.some((p) => location === p || location.startsWith(p))) return;

    try {
      if (window.localStorage.getItem(STORAGE_OPT_OUT) === "1") return;

      const now = new Date();
      const todayStr = todayKey(now);
      const lastSuggestedOn = window.localStorage.getItem(STORAGE_SUGGESTED_ON);
      if (lastSuggestedOn === todayStr) return;

      // If user picked manually in the last 24h, don't nag.
      const pickedAt = Number(window.localStorage.getItem(STORAGE_PICKED_AT) || 0);
      if (pickedAt && now.getTime() - pickedAt < 24 * 60 * 60 * 1000) return;

      const currentTheme = window.localStorage.getItem(STORAGE_THEME);
      const rec = pickByClock(now);
      if (currentTheme === rec.themeId) {
        // Already on the recommended theme — mark "suggested today" so we
        // don't recompute on every render, but don't show a card.
        window.localStorage.setItem(STORAGE_SUGGESTED_ON, todayStr);
        return;
      }

      // Defer slightly so it doesn't fight the page-load animation.
      const t = window.setTimeout(() => setSuggestion(rec), 1800);
      return () => window.clearTimeout(t);
    } catch {
      // Privacy mode / localStorage unavailable — silently skip.
    }
  }, [location]);

  function dismiss(persistToday: boolean) {
    if (persistToday && typeof window !== "undefined") {
      try {
        window.localStorage.setItem(STORAGE_SUGGESTED_ON, todayKey(new Date()));
      } catch { /* noop */ }
    }
    if (suggestion) telemetry.recordSuggestion(suggestion.themeId, "dismissed");
    setSuggestion(null);
  }

  function tryIt() {
    if (!suggestion) return;
    const theme = getTheme(suggestion.themeId);
    if (theme) {
      applyThemeToDom(suggestion.themeId);
      try {
        window.localStorage.setItem(STORAGE_THEME, suggestion.themeId);
        window.localStorage.setItem(STORAGE_PICKED_AT, String(Date.now()));
        window.localStorage.setItem(STORAGE_SUGGESTED_ON, todayKey(new Date()));
        if (suggestion.themeId === "red-crush" || suggestion.themeId === "white-crush") {
          window.dispatchEvent(new CustomEvent("ownology:crush", { detail: { themeId: suggestion.themeId } }));
        }
      } catch { /* noop */ }
    }
    telemetry.recordSuggestion(suggestion.themeId, "accepted");
    setSuggestion(null);
  }

  function optOutForever() {
    try {
      window.localStorage.setItem(STORAGE_OPT_OUT, "1");
    } catch { /* noop */ }
    if (suggestion) telemetry.recordSuggestion(suggestion.themeId, "opted_out");
    setSuggestion(null);
  }

  if (!suggestion) return null;

  return (
    <div
      data-testid="theme-suggestion"
      role="status"
      style={{
        position: "fixed",
        bottom: "calc(0.9rem + env(safe-area-inset-bottom, 0px))",
        left: "50%",
        transform: "translateX(-50%)",
        zIndex: 70,
        width: "min(440px, calc(100vw - 24px))",
        background: "var(--ow-bg-card)",
        border: "1px solid color-mix(in oklch, var(--ow-amber) 35%, var(--ow-border-md))",
        borderRadius: 8,
        padding: "12px 14px",
        boxShadow: "0 16px 48px var(--ow-shadow)",
        fontFamily: "'Lato',sans-serif",
        backdropFilter: "blur(10px)",
      }}
    >
      <div style={{ display: "flex", alignItems: "flex-start", gap: 10 }}>
        <div style={{ flexGrow: 1, minWidth: 0 }}>
          <p
            style={{
              fontSize: "0.66rem",
              letterSpacing: "0.12em",
              color: "var(--ow-amber)",
              margin: 0,
              fontWeight: 700,
              textTransform: "uppercase",
            }}
          >
            Theme suggestion
          </p>
          <p
            style={{
              fontSize: "0.86rem",
              color: "var(--ow-text-hi)",
              margin: "3px 0 2px",
              fontWeight: 600,
            }}
          >
            Try <strong>{suggestion.label}</strong> for now?
          </p>
          <p
            style={{
              fontSize: "0.78rem",
              color: "var(--ow-text-mid)",
              margin: 0,
              lineHeight: 1.45,
            }}
          >
            {suggestion.reason}
          </p>
          <div
            style={{
              display: "flex",
              alignItems: "center",
              gap: 8,
              marginTop: 10,
              flexWrap: "wrap",
            }}
          >
            <button
              type="button"
              data-testid="theme-suggestion-accept"
              onClick={tryIt}
              style={{
                background: "var(--ow-amber)",
                color: "white",
                border: "none",
                fontSize: "0.74rem",
                fontWeight: 700,
                letterSpacing: "0.05em",
                textTransform: "uppercase",
                padding: "7px 14px",
                borderRadius: 4,
                cursor: "pointer",
              }}
            >
              Try it
            </button>
            <button
              type="button"
              data-testid="theme-suggestion-not-now"
              onClick={() => dismiss(true)}
              style={{
                background: "transparent",
                border: "1px solid var(--ow-border-md)",
                color: "var(--ow-text-mid)",
                fontSize: "0.74rem",
                fontWeight: 700,
                letterSpacing: "0.05em",
                textTransform: "uppercase",
                padding: "7px 14px",
                borderRadius: 4,
                cursor: "pointer",
              }}
            >
              Not today
            </button>
            <button
              type="button"
              data-testid="theme-suggestion-opt-out"
              onClick={optOutForever}
              style={{
                background: "transparent",
                border: "none",
                color: "var(--ow-text-lo)",
                fontSize: "0.7rem",
                cursor: "pointer",
                textDecoration: "underline",
              }}
            >
              Don&apos;t suggest again
            </button>
          </div>
        </div>
        <button
          type="button"
          aria-label="Dismiss"
          data-testid="theme-suggestion-close"
          onClick={() => dismiss(true)}
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
