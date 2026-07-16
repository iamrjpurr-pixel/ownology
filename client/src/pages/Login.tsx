/**
 * Login — Sign in with Google (primary) + passwordless magic-link fallback.
 *
 * REMINDER: DO NOT HARDCODE THE URL, OR ADD ANY FALLBACKS OR REDIRECT URLS, THIS BREAKS THE AUTH.
 *
 * Reads `?next=/some/path` query param so e.g. ProtectedRoute can bounce a
 * deep-linker through login and back. Default: /admin (the only currently
 * gated surface — extend the gate list as more app surfaces ship).
 *
 * The magic-link path (Feb 2026) exists for winemakers without a Google
 * account. The `/api/auth/magic-link/*` server routes handle sending +
 * verifying — this page is just the email input + status feedback.
 */
import { useEffect, useState } from "react";
import { useAuth } from "@/lib/useAuth";

export default function Login() {
  const { user, status, login } = useAuth();
  const [magicEmail, setMagicEmail] = useState("");
  const [magicState, setMagicState] = useState<"idle" | "sending" | "sent" | "error">("idle");
  const [magicError, setMagicError] = useState<string | null>(null);

  // Read query params once. `?reason=session_expired` is set by the
  // global 401 interceptor in main.tsx when a stale JWT (e.g. after
  // JWT_SECRET rotation) causes tRPC to reject the cookie. Surfacing
  // this explicitly means the user sees "sign in again" instead of
  // being silently bounced.
  // `?err=<code>` is set by /api/auth/magic-link/verify when a click-through
  // fails (invalid, used, expired, server).
  const params = typeof window !== "undefined" ? new URLSearchParams(window.location.search) : null;
  const reason = params?.get("reason");
  const magicErr = params?.get("err");
  const sessionExpired = reason === "session_expired";
  const magicErrorFromRedirect = magicErr === "invalid" ? "That login link isn’t valid."
    : magicErr === "used" ? "That login link has already been used — request a fresh one."
    : magicErr === "expired" ? "That login link has expired — request a fresh one."
    : magicErr === "server" ? "Something went wrong verifying that link. Try again."
    : null;

  useEffect(() => {
    // If already signed in, jump straight to ?next= or /admin.
    if (status === "authed" && user) {
      const next = (params?.get("next")) || "/admin";
      window.location.replace(next.startsWith("/") ? next : "/admin");
    }
  }, [status, user, params]);

  function handleLogin() {
    const next = (params?.get("next")) || "/admin";
    login(next);
  }

  async function requestMagicLink(e: React.FormEvent) {
    e.preventDefault();
    const email = magicEmail.trim();
    if (!email) return;
    setMagicState("sending");
    setMagicError(null);
    try {
      const resp = await fetch("/api/auth/magic-link/request", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email }),
      });
      if (resp.status === 429) {
        setMagicState("error");
        setMagicError("Too many login links requested — try again in an hour.");
        return;
      }
      if (!resp.ok) {
        const data = await resp.json().catch(() => ({}));
        setMagicState("error");
        setMagicError(data.error || "Could not send login link. Try again shortly.");
        return;
      }
      setMagicState("sent");
    } catch {
      setMagicState("error");
      setMagicError("Network problem — try again in a moment.");
    }
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
        {sessionExpired && (
          <div
            data-testid="login-session-expired-banner"
            style={{
              background: "color-mix(in oklch, var(--ow-amber) 12%, transparent)",
              border: "1px solid var(--ow-amber)",
              borderRadius: 6,
              padding: "0.6rem 0.85rem",
              fontSize: "0.82rem",
              color: "var(--ow-text-hi)",
              lineHeight: 1.5,
              marginBottom: "1rem",
            }}
          >
            <strong>Session expired.</strong> Your login was invalidated (usually
            because a secret was rotated on the server). Sign in again to
            restore access — your data is untouched.
          </div>
        )}
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

        {/* ── Magic-link fallback ─────────────────────────────────────────── */}
        <div
          style={{
            display: "flex",
            alignItems: "center",
            gap: 10,
            margin: "1.6rem 0 1.2rem",
            fontSize: "0.72rem",
            color: "var(--ow-text-lo)",
            textTransform: "uppercase",
            letterSpacing: "0.08em",
          }}
        >
          <div style={{ flex: 1, height: 1, background: "var(--ow-border)" }} />
          or
          <div style={{ flex: 1, height: 1, background: "var(--ow-border)" }} />
        </div>

        {magicErrorFromRedirect && !magicError && (
          <div
            data-testid="login-magic-redirect-error"
            style={{
              background: "color-mix(in oklch, #dc2626 10%, transparent)",
              border: "1px solid #dc2626",
              borderRadius: 6,
              padding: "0.55rem 0.8rem",
              fontSize: "0.8rem",
              color: "#fca5a5",
              lineHeight: 1.5,
              marginBottom: "0.8rem",
            }}
          >
            {magicErrorFromRedirect}
          </div>
        )}

        {magicState === "sent" ? (
          <div
            data-testid="login-magic-sent"
            style={{
              background: "color-mix(in oklch, #16a34a 10%, transparent)",
              border: "1px solid #16a34a",
              borderRadius: 6,
              padding: "0.75rem 0.9rem",
              fontSize: "0.88rem",
              color: "var(--ow-text-hi)",
              lineHeight: 1.55,
            }}
          >
            <strong>Check your inbox.</strong> If <em>{magicEmail}</em> is on file, we&rsquo;ve sent you a one-tap login link. It expires in 15 minutes.
          </div>
        ) : (
          <form onSubmit={requestMagicLink}>
            <label style={{ display: "block", fontSize: "0.78rem", color: "var(--ow-text-mid)", marginBottom: 6 }}>
              Email login (no Google account? no worries)
            </label>
            <input
              type="email"
              data-testid="magic-link-email-input"
              placeholder="you@yourwinery.com"
              value={magicEmail}
              onChange={(e) => { setMagicEmail(e.target.value); setMagicError(null); }}
              required
              maxLength={254}
              style={{
                width: "100%",
                boxSizing: "border-box",
                padding: "0.7rem 0.9rem",
                background: "var(--ow-bg-base)",
                border: "1px solid var(--ow-border)",
                borderRadius: 6,
                color: "var(--ow-text-hi)",
                fontFamily: "'Lato',sans-serif",
                fontSize: "0.95rem",
                outline: "none",
                marginBottom: 8,
              }}
            />
            {magicError && (
              <p
                data-testid="login-magic-error"
                style={{ margin: "0 0 8px", fontSize: "0.78rem", color: "#fca5a5" }}
              >
                {magicError}
              </p>
            )}
            <button
              type="submit"
              data-testid="magic-link-submit-btn"
              disabled={magicState === "sending" || !magicEmail.trim()}
              style={{
                width: "100%",
                background: "transparent",
                color: "var(--ow-text-hi)",
                fontFamily: "'Lato',sans-serif",
                fontSize: "0.9rem",
                fontWeight: 600,
                padding: "0.7rem 1rem",
                border: "1px solid var(--ow-border-md)",
                borderRadius: 6,
                cursor: magicState === "sending" ? "wait" : "pointer",
                opacity: !magicEmail.trim() ? 0.5 : 1,
              }}
            >
              {magicState === "sending" ? "Sending…" : "Email me a login link"}
            </button>
          </form>
        )}

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
