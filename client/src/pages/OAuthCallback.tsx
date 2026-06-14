import { useEffect } from "react";
import { useLocation } from "wouter";
import OwnologyLogo from "@/components/OwnologyLogo";

/**
 * OAuthCallback — client-side handler for the Manus OAuth redirect.
 *
 * After the Manus platform sets the `app_session_id` cookie and redirects the
 * browser to `/api/oauth/callback?state=<base64>&code=...`, this component:
 *   1. Reads the `state` query parameter.
 *   2. Decodes the JSON payload: { redirectUri, returnPath }.
 *   3. Navigates to `returnPath` (or "/" as a safe fallback).
 *
 * Renders a brief branded loading screen to prevent a blank-screen flash
 * while the redirect fires.
 */
export default function OAuthCallback() {
  const [, navigate] = useLocation();

  useEffect(() => {
    // S8-I: New users (no 'ownology_guide_seen' flag) are redirected to /guide
    // after login, unless they have a specific returnPath set.
    const isNewUser = (() => {
      try { return !localStorage.getItem("ownology_guide_seen"); } catch { return false; }
    })();

    try {
      const params = new URLSearchParams(window.location.search);
      const rawState = params.get("state");

      if (rawState) {
        const decoded = JSON.parse(atob(rawState));
        const returnPath: string =
          typeof decoded?.returnPath === "string" && decoded.returnPath.startsWith("/")
            ? decoded.returnPath
            : "/";
        // Only redirect new users to /guide if they have no specific returnPath
        const destination = (isNewUser && returnPath === "/") ? "/guide" : returnPath;
        navigate(destination, { replace: true });
        return;
      }
    } catch {
      // Malformed state — fall through to safe default
    }

    // No state — redirect new users to /guide, returning users to /
    navigate(isNewUser ? "/guide" : "/", { replace: true });
  }, [navigate]);

  return (
    <div
      style={{
        minHeight: "100vh",
        background: "oklch(0.11 0.008 60)",
        display: "flex",
        flexDirection: "column",
        alignItems: "center",
        justifyContent: "center",
        gap: "1.5rem",
      }}
    >
      {/* Logo */}
      <OwnologyLogo size={40} />

      {/* Amber spinner */}
      <div
        style={{
          width: "36px",
          height: "36px",
          borderRadius: "50%",
          border: "3px solid oklch(0.72 0.12 75 / 20%)",
          borderTopColor: "oklch(0.72 0.12 75)",
          animation: "ow-spin 0.75s linear infinite",
        }}
      />

      {/* Label */}
      <p
        style={{
          fontFamily: "'Lato', sans-serif",
          fontWeight: 300,
          fontSize: "0.875rem",
          letterSpacing: "0.08em",
          color: "oklch(0.55 0.015 75)",
          textTransform: "uppercase",
        }}
      >
        Signing you in…
      </p>

      {/* Keyframe injected inline — avoids needing a global CSS change */}
      <style>{`
        @keyframes ow-spin {
          to { transform: rotate(360deg); }
        }
      `}</style>
    </div>
  );
}
