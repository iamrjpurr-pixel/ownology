/**
 * Join — public landing when someone clicks a referral link.
 *
 * URL: /join?ref=CODE
 *
 * On mount: fires `referrals.trackClick` to record the click, then
 * routes the visitor into either the sign-in flow (if not authenticated)
 * or straight into /cellar-brief (if they are). The ref code is stashed
 * in localStorage as a fallback so post-OAuth redirect can attribute.
 */
import { useEffect, useState } from "react";
import { Link, useLocation } from "wouter";
import { trpc } from "../lib/trpc";

const REF_STORAGE_KEY = "ow-referral-code";

export default function Join() {
  const [location] = useLocation();
  const [status, setStatus] = useState<"loading" | "tracked" | "invalid" | "no-code">("loading");
  const trackClick = trpc.referrals.trackClick.useMutation();

  useEffect(() => {
    // Parse ?ref=CODE from window.location — wouter's location doesn't
    // include the query string, so we go straight to the DOM API.
    const params = typeof window !== "undefined"
      ? new URLSearchParams(window.location.search)
      : new URLSearchParams();
    const code = params.get("ref");
    if (!code) { setStatus("no-code"); return; }
    // Stash for post-OAuth attribution
    try { localStorage.setItem(REF_STORAGE_KEY, code); } catch { /* private mode */ }
    trackClick.mutate({ code }, {
      onSuccess: (res) => setStatus(res.ok ? "tracked" : "invalid"),
      onError: () => setStatus("invalid"),
    });
  }, [location]);

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
          You&apos;ve been invited to Ownology
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
        <p style={{
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
      </div>
    </div>
  );
}
