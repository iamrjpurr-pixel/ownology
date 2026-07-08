/**
 * AdminQrBadge — small floating "QR for this page" button, visible only
 * to authenticated admins. Renders on every route (mounted once at the
 * <Router> level). One click opens /join/qr preloaded with the current
 * page URL + a sensible label so the team can print or download a QR
 * for any Ownology page in seconds.
 *
 * Design intent:
 *  - Discreet: sits bottom-left, small pill, low chroma, so it never
 *    competes with page CTAs.
 *  - Zero-cost when logged out: the trpc.admin.summary probe is already
 *    running elsewhere on the marketing nav; when it returns FORBIDDEN
 *    we render nothing.
 *  - Self-hiding on /join/qr (avoid recursive UX) and on Work Mode
 *    surfaces (cellar-floor mobile view shouldn't have desktop chrome).
 */
import { useEffect, useState } from "react";
import { useLocation } from "wouter";
import { QrCode } from "lucide-react";
import { trpc } from "@/lib/trpc";

// Best-effort human label from the current path. "/admin/members" → "Admin · Members".
function labelFromPath(pathname: string): string {
  if (!pathname || pathname === "/") return "Ownology";
  const parts = pathname.replace(/^\/+|\/+$/g, "").split("/");
  return parts
    .map((p) => p.replace(/[-_]/g, " ").replace(/\b\w/g, (c) => c.toUpperCase()))
    .join(" · ");
}

// Pages where the floating badge would be visual noise. Cellar-floor
// Work Mode is phone-first and can't afford extra chrome; /join/qr is
// the target itself.
const HIDE_ON_EXACT = new Set<string>([
  "/join/qr",
  "/try",
  "/login",
  "/auth/callback",
]);
const HIDE_PREFIXES = ["/free-run", "/work"];

export function AdminQrBadge() {
  const [pathname] = useLocation();
  const { data: adminData } = trpc.admin.summary.useQuery(undefined, {
    retry: false,
    refetchOnWindowFocus: false,
    staleTime: 5 * 60 * 1000, // 5 min — admin status doesn't churn
  });
  const isOwner = !!adminData;

  // Track PWA install banner so we can lift the QR pill by the same amount
  // that GlobalThemeToggle lifts — keeps the stack (QR on top, theme below)
  // above the banner without either colliding into it.
  const [hasBanner, setHasBanner] = useState(false);
  useEffect(() => {
    if (typeof document === "undefined") return;
    const check = () => setHasBanner(document.body.classList.contains("has-pwa-banner"));
    check();
    const obs = new MutationObserver(check);
    obs.observe(document.body, { attributes: true, attributeFilter: ["class"] });
    return () => obs.disconnect();
  }, []);

  if (!isOwner) return null;
  if (HIDE_ON_EXACT.has(pathname)) return null;
  if (HIDE_PREFIXES.some((p) => pathname === p || pathname.startsWith(p + "/"))) {
    return null;
  }

  const onClick = () => {
    if (typeof window === "undefined") return;
    const currentUrl = window.location.href;
    const label = labelFromPath(pathname);
    const qs = new URLSearchParams({ url: currentUrl, label });
    window.open(`/join/qr?${qs.toString()}`, "_blank", "noopener,noreferrer");
  };

  return (
    <button
      onClick={onClick}
      data-testid="admin-qr-badge"
      title="QR for this page — opens the QR generator preloaded with the current URL"
      aria-label="Generate QR code for this page"
      style={{
        position: "fixed",
        // Sits ABOVE the GlobalThemeToggle pill (also anchored bottom-left,
        // ~1.25rem + ~44px pill height). Lifts extra when the PWA install
        // banner pushes the theme pill up, so the two never collide.
        bottom: hasBanner
          ? "calc(4.75rem + 3.25rem + env(safe-area-inset-bottom, 0px))"
          : "calc(1.25rem + 3.25rem + env(safe-area-inset-bottom, 0px))",
        left: "1.1rem",
        zIndex: 90, // below toasts (~100) but above content
        display: "inline-flex",
        alignItems: "center",
        gap: "0.4rem",
        padding: "0.45rem 0.75rem",
        borderRadius: 999,
        background: "var(--ow-bg-card, #f3ece4)",
        color: "var(--ow-text-hi, #1a1210)",
        border: "1px solid var(--ow-border, rgba(0,0,0,0.15))",
        boxShadow: "0 4px 14px -6px rgba(0,0,0,0.35)",
        fontSize: "0.72rem",
        fontFamily: "'Lato', sans-serif",
        fontWeight: 500,
        letterSpacing: "0.02em",
        cursor: "pointer",
        opacity: 0.82,
        transition: "opacity 140ms ease, transform 140ms ease, bottom 200ms ease",
      }}
      onMouseEnter={(e) => {
        e.currentTarget.style.opacity = "1";
        e.currentTarget.style.transform = "translateY(-1px)";
      }}
      onMouseLeave={(e) => {
        e.currentTarget.style.opacity = "0.82";
        e.currentTarget.style.transform = "translateY(0)";
      }}
    >
      <QrCode size={13} strokeWidth={2} />
      <span>QR for this page</span>
    </button>
  );
}
