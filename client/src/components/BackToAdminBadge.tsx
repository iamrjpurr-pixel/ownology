/**
 * BackToAdminBadge — floating "← Back to Admin" pill, visible only to
 * authenticated admins on member/prospect-facing pages. Fixes the UX
 * dead-end where an admin clicks a generated invite URL (`/i/<token>`)
 * or previews a member surface and has no obvious way back to /admin.
 *
 * Design intent:
 *  - Discreet: bottom-left, small pill, low chroma. Mirrors AdminQrBadge
 *    styling so admin-only chrome stays visually consistent.
 *  - Zero-cost when logged out: probes trpc.admin.summary which returns
 *    FORBIDDEN for non-owners → renders nothing.
 *  - Self-hides on /admin/* (already there), /login, /auth/callback,
 *    /free-run, /work (cellar-floor mobile — no desktop chrome), /join/qr.
 */
import { useState } from "react";
import { useLocation } from "wouter";
import { ArrowLeft } from "lucide-react";
import { trpc } from "@/lib/trpc";

const HIDE_ON_EXACT = new Set<string>([
  "/login",
  "/auth/callback",
  "/join/qr",
  "/try",
]);
const HIDE_PREFIXES = ["/admin", "/free-run", "/work"];

export function BackToAdminBadge() {
  const [pathname] = useLocation();
  const { data: adminData } = trpc.admin.summary.useQuery(undefined, {
    retry: false,
    refetchOnWindowFocus: false,
    staleTime: 5 * 60 * 1000,
  });
  const isOwner = !!adminData;

  if (!isOwner) return null;
  if (HIDE_ON_EXACT.has(pathname)) return null;
  if (HIDE_PREFIXES.some((p) => pathname === p || pathname.startsWith(p + "/"))) {
    return null;
  }

  return <BackButton />;
}

function BackButton() {
  const [expanded, setExpanded] = useState(false);
  const onClick = () => {
    if (typeof window === "undefined") return;
    window.location.href = "/admin";
  };
  return (
    <button
      onClick={onClick}
      onMouseEnter={() => setExpanded(true)}
      onMouseLeave={() => setExpanded(false)}
      onFocus={() => setExpanded(true)}
      onBlur={() => setExpanded(false)}
      data-testid="back-to-admin-badge"
      title="Back to Admin — return to the admin hub"
      aria-label="Back to admin portal"
      style={{
        position: "fixed",
        bottom: "1.25rem",
        left: "1.1rem",
        zIndex: 90,
        display: "inline-flex",
        alignItems: "center",
        justifyContent: "center",
        gap: expanded ? "0.4rem" : 0,
        width: expanded ? "auto" : 32,
        height: 32,
        padding: expanded ? "0 0.8rem 0 0.6rem" : 0,
        borderRadius: 999,
        background: "var(--ow-bg-card, #f3ece4)",
        color: "var(--ow-text-hi, #1a1210)",
        border: "1px solid var(--ow-border, rgba(0,0,0,0.15))",
        boxShadow: "0 4px 14px -6px rgba(0,0,0,0.35)",
        fontSize: "0.7rem",
        fontFamily: "'Lato', sans-serif",
        fontWeight: 500,
        letterSpacing: "0.02em",
        cursor: "pointer",
        opacity: expanded ? 1 : 0.55,
        overflow: "hidden",
        whiteSpace: "nowrap",
        transition:
          "opacity 160ms ease, width 200ms ease, padding 200ms ease, gap 200ms ease",
      }}
    >
      <ArrowLeft size={14} strokeWidth={2} />
      {expanded && <span>Back to Admin</span>}
    </button>
  );
}
