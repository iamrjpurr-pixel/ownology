/**
 * AuthCallback — receives the Emergent OAuth fragment redirect.
 *
 * REMINDER: DO NOT HARDCODE THE URL, OR ADD ANY FALLBACKS OR REDIRECT URLS, THIS BREAKS THE AUTH.
 *
 * Lifecycle:
 *   1. URL is /auth/callback#session_id=<token>
 *   2. We read the hash synchronously during the first render and post the
 *      token to /api/auth/exchange so the backend can set the httpOnly cookie.
 *   3. On success: navigate to sessionStorage.ow_auth_return (or /admin).
 *   4. On failure: show an error + Retry button.
 *
 * StrictMode safety: we use a useRef flag set synchronously at the top of
 * the effect so React's double-invoke doesn't double-call the exchange.
 */
import { useEffect, useRef, useState } from "react";
import { useAuth } from "@/lib/useAuth";

export default function AuthCallback() {
  const { refresh } = useAuth();
  const processed = useRef(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (processed.current) return;
    processed.current = true;

    const hash = window.location.hash || "";
    const m = hash.match(/session_id=([^&]+)/);
    const sessionId = m ? decodeURIComponent(m[1]) : "";
    if (!sessionId) {
      setError("Missing session_id in callback URL.");
      return;
    }

    (async () => {
      try {
        const r = await fetch("/api/auth/exchange", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          credentials: "include",
          body: JSON.stringify({ session_id: sessionId }),
        });
        if (!r.ok) {
          const data = await r.json().catch(() => ({}));
          throw new Error(data?.error || `Exchange failed (${r.status})`);
        }
        const payload = await r.json().catch(() => ({} as { isNew?: boolean }));
        await refresh();
        // Redirect logic — new users go to /onboarding for the 60-second
        // wizard (same page paid Founding Members land on after Stripe).
        // Returning users go back to whatever they were doing pre-login, or
        // /admin as the neutral default. A stored `ow_auth_return` takes
        // precedence over the isNew fork so a stored intent isn't lost.
        let next = "/admin";
        let hasStoredReturn = false;
        try {
          const stored = sessionStorage.getItem("ow_auth_return");
          if (stored && stored.startsWith("/")) {
            next = stored;
            hasStoredReturn = true;
          }
          sessionStorage.removeItem("ow_auth_return");
        } catch { /* noop */ }
        if (payload?.isNew && !hasStoredReturn) next = "/onboarding";
        window.location.replace(next);
      } catch (e: unknown) {
        const msg = e instanceof Error ? e.message : String(e);
        setError(msg);
      }
    })();
  }, [refresh]);

  return (
    <div
      style={{
        minHeight: "100vh",
        background: "var(--ow-bg-base)",
        color: "var(--ow-text-hi)",
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
        fontFamily: "'Lato',sans-serif",
        padding: "2rem",
      }}
      data-testid="auth-callback"
    >
      {error ? (
        <div
          style={{
            background: "var(--ow-bg-card)",
            border: "1px solid var(--ow-border-md)",
            borderRadius: 8,
            padding: "1.8rem",
            maxWidth: 460,
          }}
        >
          <h2 style={{ fontFamily: "'Fraunces',serif", margin: "0 0 0.6rem" }}>
            Sign-in failed
          </h2>
          <p style={{ fontSize: "0.9rem", color: "var(--ow-text-mid)" }}>{error}</p>
          <a
            href="/login"
            data-testid="auth-retry"
            style={{
              display: "inline-block",
              marginTop: "1rem",
              background: "var(--ow-amber)",
              color: "white",
              padding: "0.6rem 1.2rem",
              borderRadius: 6,
              textDecoration: "none",
              fontWeight: 700,
              fontSize: "0.85rem",
            }}
          >
            Try again
          </a>
        </div>
      ) : (
        <div style={{ textAlign: "center" }}>
          <div
            style={{
              fontSize: "0.78rem",
              letterSpacing: "0.12em",
              textTransform: "uppercase",
              color: "var(--ow-text-lo)",
              marginBottom: "0.4rem",
            }}
          >
            Signing you in
          </div>
          <div style={{ fontFamily: "'Fraunces',serif", fontSize: "1.4rem" }}>
            One second…
          </div>
        </div>
      )}
    </div>
  );
}
