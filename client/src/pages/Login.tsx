/**
 * Login — single-screen "Sign in with Google" via Emergent OAuth.
 *
 * REMINDER: DO NOT HARDCODE THE URL, OR ADD ANY FALLBACKS OR REDIRECT URLS, THIS BREAKS THE AUTH.
 *
 * Reads `?next=/some/path` query param so e.g. ProtectedRoute can bounce a
 * deep-linker through login and back. Default: /admin (the only currently
 * gated surface — extend the gate list as more app surfaces ship).
 */
import { useEffect } from "react";
import { useAuth } from "@/lib/useAuth";

export default function Login() {
  const { user, status, login } = useAuth();

  useEffect(() => {
    // If already signed in, jump straight to ?next= or /admin.
    if (status === "authed" && user) {
      const params = new URLSearchParams(window.location.search);
      const next = params.get("next") || "/admin";
      window.location.replace(next.startsWith("/") ? next : "/admin");
    }
  }, [status, user]);

  function handleLogin() {
    const params = new URLSearchParams(window.location.search);
    const next = params.get("next") || "/admin";
    login(next);
  }

  return (
    <div
      style={{
        minHeight: "100vh",
        background: "var(--ow-bg-base)",
        color: "var(--ow-text-hi)",
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
        padding: "2rem",
        fontFamily: "'Lato',sans-serif",
      }}
    >
      <div
        style={{
          width: "100%",
          maxWidth: 420,
          background: "var(--ow-bg-card)",
          border: "1px solid var(--ow-border-md)",
          borderRadius: 8,
          padding: "2.5rem 2rem",
          boxShadow: "0 8px 32px rgba(0,0,0,0.18)",
        }}
        data-testid="login-card"
      >
        <h1
          style={{
            fontFamily: "'Fraunces',serif",
            fontSize: "1.6rem",
            fontWeight: 700,
            margin: 0,
            marginBottom: "0.4rem",
          }}
        >
          Sign in to Ownology
        </h1>
        <p
          style={{
            fontSize: "0.92rem",
            color: "var(--ow-text-mid)",
            lineHeight: 1.5,
            marginBottom: "1.6rem",
          }}
        >
          Continue with your Google account to access your cellar dashboard,
          admin tools, and personalised SOPs.
        </p>

        <button
          type="button"
          onClick={handleLogin}
          data-testid="google-login-btn"
          style={{
            width: "100%",
            background: "var(--ow-amber)",
            color: "white",
            fontFamily: "'Lato',sans-serif",
            fontSize: "0.95rem",
            fontWeight: 700,
            padding: "0.85rem 1.2rem",
            border: "none",
            borderRadius: 6,
            cursor: "pointer",
            letterSpacing: "0.04em",
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            gap: 10,
          }}
        >
          {/* Inline Google "G" mark */}
          <svg width="18" height="18" viewBox="0 0 18 18" aria-hidden="true">
            <path
              fill="#fff"
              d="M17.64 9.2c0-.64-.06-1.25-.16-1.84H9v3.48h4.84a4.14 4.14 0 01-1.8 2.71v2.26h2.92c1.71-1.58 2.68-3.9 2.68-6.61z"
            />
            <path
              fill="#fff"
              opacity=".95"
              d="M9 18c2.43 0 4.47-.81 5.96-2.19l-2.92-2.26c-.81.54-1.85.86-3.04.86-2.34 0-4.32-1.58-5.03-3.7H.93v2.34A9 9 0 009 18z"
            />
            <path
              fill="#fff"
              opacity=".85"
              d="M3.97 10.71A5.41 5.41 0 013.68 9c0-.59.1-1.17.29-1.71V4.95H.93A9 9 0 000 9c0 1.45.35 2.83.93 4.05l3.04-2.34z"
            />
            <path
              fill="#fff"
              opacity=".75"
              d="M9 3.58c1.32 0 2.5.45 3.44 1.34l2.58-2.58C13.46.91 11.42 0 9 0A9 9 0 00.93 4.95l3.04 2.34C4.68 5.16 6.66 3.58 9 3.58z"
            />
          </svg>
          Continue with Google
        </button>

        <p
          style={{
            marginTop: "1.4rem",
            fontSize: "0.74rem",
            color: "var(--ow-text-lo)",
            lineHeight: 1.5,
          }}
        >
          By continuing you agree to our terms. Your Google email is used to
          look up or create your winemaker profile — no password to remember.
        </p>
      </div>
    </div>
  );
}
