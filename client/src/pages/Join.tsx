/**
 * Join — public landing when someone clicks a referral link.
 *
 * URL: /join?ref=CODE
 *
 * On mount: fires `referrals.trackClick` (no email) to record the click,
 * capturing the referrer winery name for a warm "X sent you here" headline.
 * A soft email-capture form lets the visitor drop their email even if they
 * don't sign up — every anonymous click becomes a warm lead attributable
 * to the winemaker who shared. The ref code is stashed in localStorage as
 * a fallback so post-OAuth redirect can still attribute.
 */
import { useEffect, useState } from "react";
import { Link, useLocation } from "wouter";
import { trpc } from "../lib/trpc";

const REF_STORAGE_KEY = "ow-referral-code";

export default function Join() {
  const [location] = useLocation();
  const [status, setStatus] = useState<"loading" | "tracked" | "invalid" | "no-code">("loading");
  const [referrerName, setReferrerName] = useState<string | null>(null);
  const [refCode, setRefCode] = useState<string | null>(null);
  const [email, setEmail] = useState("");
  const [emailStatus, setEmailStatus] = useState<"idle" | "saving" | "saved" | "error">("idle");
  const trackClick = trpc.referrals.trackClick.useMutation();

  useEffect(() => {
    // Parse ?ref=CODE from window.location — wouter's location doesn't
    // include the query string, so we go straight to the DOM API.
    const params = typeof window !== "undefined"
      ? new URLSearchParams(window.location.search)
      : new URLSearchParams();
    const code = params.get("ref");
    if (!code) { setStatus("no-code"); return; }
    setRefCode(code);
    // Stash for post-OAuth attribution
    try { localStorage.setItem(REF_STORAGE_KEY, code); } catch { /* private mode */ }
    trackClick.mutate({ code }, {
      onSuccess: (res) => {
        if (res.ok) {
          setStatus("tracked");
          setReferrerName(res.referrerName ?? null);
        } else {
          setStatus("invalid");
        }
      },
      onError: () => setStatus("invalid"),
    });
  }, [location]);

  const submitEmail = (e: React.FormEvent) => {
    e.preventDefault();
    if (!refCode || !email.trim()) return;
    setEmailStatus("saving");
    trackClick.mutate(
      { code: refCode, email: email.trim() },
      {
        onSuccess: (res) => setEmailStatus(res.ok ? "saved" : "error"),
        onError: () => setEmailStatus("error"),
      }
    );
  };

  return (
    <div
      data-testid="join-page"
      style={{
        minHeight: "100dvh",
        background: "#FAFAF9",
        display: "flex",
        flexDirection: "column",
        alignItems: "center",
        justifyContent: "center",
        padding: "1.5rem",
      }}
    >
      <div style={{ maxWidth: 500, width: "100%", textAlign: "center" }}>
        <p style={{
          fontFamily: "'Lato',sans-serif",
          fontSize: "0.75rem",
          textTransform: "uppercase",
          letterSpacing: "0.15em",
          color: "#78350f",
          margin: 0,
        }}>
          {status === "tracked" && referrerName
            ? `${referrerName} invited you to Ownology`
            : "You've been invited to Ownology"}
        </p>
        <h1 style={{
          fontFamily: "'Fraunces',serif",
          fontSize: "2rem",
          lineHeight: 1.25,
          color: "#111827",
          margin: "0.75rem 0 0.5rem",
        }}>
          Cellar intelligence for boutique winemakers
        </h1>
        <p data-testid="join-status-copy" style={{
          fontFamily: "'Lato',sans-serif",
          color: "#4b5563",
          lineHeight: 1.55,
          margin: "0 0 1.5rem",
        }}>
          {status === "tracked" && (
            <>Your friend just gave you a bonus <strong>30 days on top of the 14-day free trial</strong>.
            Sign up below to claim it.</>
          )}
          {status === "invalid" && (
            <>That invite code isn&apos;t recognised, but you can still start a normal 14-day trial.</>
          )}
          {status === "no-code" && (
            <>You&apos;ve landed on the Ownology join page directly. Start your 14-day trial below.</>
          )}
          {status === "loading" && <>Preparing your welcome…</>}
        </p>

        <div style={{ display: "flex", flexDirection: "column", gap: "0.75rem" }}>
          <Link
            href="/pricing?from=join"
            data-testid="join-cta"
            style={{
              padding: "0.85rem 1.25rem",
              background: "#b45309",
              color: "white",
              fontFamily: "'Lato',sans-serif",
              fontWeight: 700,
              fontSize: "0.95rem",
              textDecoration: "none",
              borderRadius: 6,
            }}
          >
            Start 14-day trial →
          </Link>
          <Link
            href="/cellar-journal?from=join"
            data-testid="join-browse-link"
            style={{
              padding: "0.75rem 1.25rem",
              background: "transparent",
              color: "#78350f",
              fontFamily: "'Lato',sans-serif",
              fontWeight: 600,
              fontSize: "0.85rem",
              textDecoration: "none",
              border: "1px solid #b45309",
              borderRadius: 6,
            }}
          >
            Or browse 236 winemaker Q&amp;As first
          </Link>
        </div>

        {/* Warm-lead capture: even if the visitor isn't ready to sign up,
            let them drop their email and we'll nurture manually. */}
        {status === "tracked" && refCode && (
          <div
            data-testid="join-email-capture"
            style={{
              marginTop: "2rem",
              padding: "1.25rem",
              background: "#FFF9F0",
              border: "1px dashed #d4a373",
              borderRadius: 6,
              textAlign: "left",
            }}
          >
            {emailStatus === "saved" ? (
              <p
                data-testid="join-email-saved"
                style={{
                  fontFamily: "'Lato',sans-serif",
                  color: "#166534",
                  fontSize: "0.9rem",
                  margin: 0,
                  fontWeight: 600,
                }}
              >
                ✓ Got it. We&apos;ll be in touch{referrerName ? ` — and ${referrerName} will see the intro` : ""}.
              </p>
            ) : (
              <>
                <p style={{
                  fontFamily: "'Lato',sans-serif",
                  color: "#78350f",
                  fontSize: "0.8rem",
                  margin: "0 0 0.5rem",
                  textTransform: "uppercase",
                  letterSpacing: "0.1em",
                  fontWeight: 700,
                }}>
                  Not ready yet?
                </p>
                <p style={{
                  fontFamily: "'Lato',sans-serif",
                  color: "#4b5563",
                  fontSize: "0.85rem",
                  margin: "0 0 0.75rem",
                  lineHeight: 1.5,
                }}>
                  Drop your email — we&apos;ll send one short walkthrough of what {referrerName ?? "your friend"} finds useful and won&apos;t bug you again.
                </p>
                <form onSubmit={submitEmail} style={{ display: "flex", gap: "0.5rem", flexWrap: "wrap" }}>
                  <input
                    type="email"
                    required
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    placeholder="you@yourwinery.com"
                    data-testid="join-email-input"
                    disabled={emailStatus === "saving"}
                    style={{
                      flex: 1,
                      minWidth: 200,
                      padding: "0.6rem 0.75rem",
                      border: "1px solid #d4a373",
                      borderRadius: 4,
                      fontFamily: "'Lato',sans-serif",
                      fontSize: "0.9rem",
                      background: "white",
                    }}
                  />
                  <button
                    type="submit"
                    data-testid="join-email-submit"
                    disabled={emailStatus === "saving" || !email.trim()}
                    style={{
                      padding: "0.6rem 1rem",
                      background: "#78350f",
                      color: "white",
                      border: 0,
                      borderRadius: 4,
                      fontFamily: "'Lato',sans-serif",
                      fontWeight: 700,
                      fontSize: "0.85rem",
                      cursor: emailStatus === "saving" ? "wait" : "pointer",
                      opacity: emailStatus === "saving" ? 0.6 : 1,
                    }}
                  >
                    {emailStatus === "saving" ? "Saving…" : "Send me one email"}
                  </button>
                </form>
                {emailStatus === "error" && (
                  <p data-testid="join-email-error" style={{
                    fontFamily: "'Lato',sans-serif",
                    color: "#b91c1c",
                    fontSize: "0.8rem",
                    margin: "0.5rem 0 0",
                  }}>
                    Couldn&apos;t save that — please try again or head straight to the trial signup.
                  </p>
                )}
              </>
            )}
          </div>
        )}
      </div>
    </div>
  );
}
