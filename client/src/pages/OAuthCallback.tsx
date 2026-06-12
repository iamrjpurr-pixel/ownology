import { useEffect } from "react";
import { useLocation } from "wouter";

/**
 * OAuthCallback — client-side handler for the Manus OAuth redirect.
 *
 * After the Manus platform sets the `app_session_id` cookie and redirects the
 * browser to `/api/oauth/callback?state=<base64>&code=...`, this component:
 *   1. Reads the `state` query parameter.
 *   2. Decodes the JSON payload: { redirectUri, returnPath }.
 *   3. Navigates to `returnPath` (or "/" as a safe fallback).
 *
 * This is a pure client-side redirect — no server round-trip needed because
 * the Manus platform already set the session cookie before redirecting here.
 */
export default function OAuthCallback() {
  const [, navigate] = useLocation();

  useEffect(() => {
    try {
      const params = new URLSearchParams(window.location.search);
      const rawState = params.get("state");

      if (rawState) {
        const decoded = JSON.parse(atob(rawState));
        const returnPath: string =
          typeof decoded?.returnPath === "string" && decoded.returnPath.startsWith("/")
            ? decoded.returnPath
            : "/";
        navigate(returnPath, { replace: true });
        return;
      }
    } catch {
      // Malformed state — fall through to safe default
    }

    navigate("/", { replace: true });
  }, [navigate]);

  // Render nothing — the redirect happens immediately in useEffect.
  return null;
}
