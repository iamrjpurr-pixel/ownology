/**
 * PwaInstallBanner
 * ─────────────────
 * Subtle amber banner that appears at the bottom of the screen when the
 * browser signals the app is installable (beforeinstallprompt fired).
 * Dismissed permanently via localStorage.
 */

import { useEffect, useState } from "react";
import { usePwaInstall } from "@/hooks/usePwaInstall";

const DISMISSED_KEY = "ownology_pwa_banner_dismissed";

export default function PwaInstallBanner() {
  const { canInstall, promptInstall, isInstalled } = usePwaInstall();
  const [dismissed, setDismissed] = useState(false);

  useEffect(() => {
    if (localStorage.getItem(DISMISSED_KEY) === "1") {
      setDismissed(true);
    }
  }, []);

  function handleDismiss() {
    localStorage.setItem(DISMISSED_KEY, "1");
    setDismissed(true);
  }

  async function handleInstall() {
    await promptInstall();
    handleDismiss();
  }

  if (!canInstall || isInstalled || dismissed) return null;

  return (
    <div
      className="fixed bottom-0 left-0 right-0 z-50 flex items-center justify-between gap-4 px-5 py-3"
      style={{
        background: "oklch(0.13 0.008 60)",
        borderTop: "1px solid oklch(0.72 0.12 75 / 25%)",
        backdropFilter: "blur(8px)",
      }}
    >
      {/* Icon + text */}
      <div className="flex items-center gap-3">
        <div
          className="w-8 h-8 rounded-sm flex items-center justify-center flex-shrink-0"
          style={{ background: "oklch(0.72 0.12 75 / 15%)", border: "1px solid oklch(0.72 0.12 75 / 30%)" }}
        >
          <svg width="14" height="14" viewBox="0 0 14 14" fill="none">
            <path d="M7 1v8M4 6l3 3 3-3" stroke="oklch(0.72 0.12 75)" strokeWidth="1.4" strokeLinecap="round" strokeLinejoin="round" />
            <path d="M1 10v1.5A1.5 1.5 0 0 0 2.5 13h9A1.5 1.5 0 0 0 13 11.5V10" stroke="oklch(0.72 0.12 75)" strokeWidth="1.4" strokeLinecap="round" />
          </svg>
        </div>
        <div>
          <p style={{ fontFamily: "'Lato', sans-serif", fontWeight: 600, fontSize: "0.8125rem", color: "oklch(0.88 0.015 75)", lineHeight: 1.3 }}>
            Add Ownology to your home screen
          </p>
          <p style={{ fontFamily: "'Lato', sans-serif", fontWeight: 300, fontSize: "0.75rem", color: "oklch(0.55 0.012 75)", lineHeight: 1.3 }}>
            Works offline · Faster access · No app store needed
          </p>
        </div>
      </div>

      {/* Actions */}
      <div className="flex items-center gap-2 flex-shrink-0">
        <button
          type="button"
          onClick={handleDismiss}
          className="text-xs px-3 py-1.5 rounded-sm"
          style={{
            background: "transparent",
            border: "1px solid oklch(1 0 0 / 12%)",
            color: "oklch(0.50 0.010 75)",
            fontFamily: "'Lato', sans-serif",
            cursor: "pointer",
          }}
        >
          Not now
        </button>
        <button
          type="button"
          onClick={handleInstall}
          className="text-xs px-4 py-1.5 rounded-sm font-semibold"
          style={{
            background: "oklch(0.72 0.12 75)",
            color: "oklch(0.11 0.008 60)",
            fontFamily: "'Lato', sans-serif",
            cursor: "pointer",
            border: "none",
          }}
        >
          Install
        </button>
      </div>
    </div>
  );
}
