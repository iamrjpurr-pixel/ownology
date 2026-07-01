/**
 * TrialBanner — global nudge shown when the free-tier trial has ≤3 days
 * left. Sits at the top of the viewport, sticky, dismissable for the session
 * (but re-appears next visit). Tapping opens /trial-ending which shows the
 * full "here's what you'd lose" moment + upgrade CTA.
 *
 * Hides itself when:
 *   - winery.plan !== 'free'  (already upgraded)
 *   - trialDaysLeft > 3       (banner not yet due)
 *   - user dismisses via the × (per-session — sessionStorage)
 *   - route starts with `/hi/`, `/audit/`, `/founding-member/success`,
 *     `/join` (kiosk / conversion surfaces should stay clean)
 */
import { useEffect, useState } from "react";
import { Link, useLocation } from "wouter";
import { trpc } from "../lib/trpc";

const SUPPRESSED_PREFIXES = ["/hi/", "/audit/", "/founding-member/success", "/merch/success", "/join"];
const DISMISS_KEY = "ow-trial-banner-dismissed";

export function TrialBanner() {
  const [location] = useLocation();
  const [dismissed, setDismissed] = useState(false);
  const { data } = trpc.winery.current.useQuery(undefined, {
    refetchOnWindowFocus: false,
    retry: false,
  });

  useEffect(() => {
    if (typeof window !== "undefined") {
      setDismissed(sessionStorage.getItem(DISMISS_KEY) === "1");
    }
  }, []);

  if (!data) return null;
  if (!data.trialBannerVisible) return null;
  if (dismissed) return null;
  if (SUPPRESSED_PREFIXES.some((p) => location.startsWith(p))) return null;

  const daysLeft = data.trialDaysLeft ?? 0;
  const isExpired = data.trialIsExpired;
  const label = isExpired
    ? "Your free trial has ended"
    : daysLeft <= 1
      ? "Your free trial ends today"
      : `${daysLeft} days left on your free trial`;

  const dismiss = () => {
    sessionStorage.setItem(DISMISS_KEY, "1");
    setDismissed(true);
  };

  return (
    <div
      data-testid="trial-banner"
      style={{
        position: "sticky",
        top: 0,
        zIndex: 40,
        background: isExpired ? "oklch(0.62 0.20 25)" : "var(--ow-amber)",
        color: isExpired ? "white" : "oklch(0.10 0.008 60)",
        padding: "0.6rem 1rem",
        display: "flex",
        alignItems: "center",
        justifyContent: "space-between",
        gap: "0.75rem",
        fontFamily: "'Lato',sans-serif",
        fontSize: "0.85rem",
        fontWeight: 600,
        borderBottom: "1px solid rgba(0,0,0,0.1)",
      }}
    >
      <span data-testid="trial-banner-label">
        {isExpired ? "⚠ " : "⏳ "}
        {label}
      </span>
      <div style={{ display: "flex", gap: "0.5rem", alignItems: "center" }}>
        <Link
          href="/trial-ending"
          data-testid="trial-banner-cta"
          style={{
            padding: "0.35rem 0.85rem",
            background: isExpired ? "white" : "oklch(0.10 0.008 60)",
            color: isExpired ? "oklch(0.62 0.20 25)" : "var(--ow-amber)",
            textDecoration: "none",
            borderRadius: 4,
            fontSize: "0.8rem",
            fontWeight: 700,
          }}
        >
          Keep it going →
        </Link>
        <button
          onClick={dismiss}
          data-testid="trial-banner-dismiss"
          style={{
            background: "transparent",
            border: 0,
            color: "inherit",
            cursor: "pointer",
            fontSize: "1.1rem",
            lineHeight: 1,
            opacity: 0.7,
            padding: "0.2rem 0.4rem",
          }}
          aria-label="Dismiss for this session"
        >
          ×
        </button>
      </div>
    </div>
  );
}
