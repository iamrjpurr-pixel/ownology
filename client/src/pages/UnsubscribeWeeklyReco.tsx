/**
 * /unsubscribe/weekly-reco?t=<token> — one-tap unsubscribe landing.
 * Public. No auth. Reads ?t= from URL, calls tRPC unsubscribe, shows confirmation.
 */
import { useEffect, useState } from "react";

export default function UnsubscribeWeeklyReco() {
  const [status, setStatus] = useState<"loading" | "ok" | "err" | "no_token">("loading");
  useEffect(() => {
    const token = new URLSearchParams(window.location.search).get("t");
    if (!token) { setStatus("no_token"); return; }
    fetch("/api/trpc/weeklyRecoDigest.unsubscribe", {
      method: "POST", headers: { "content-type": "application/json" },
      body: JSON.stringify({ token }),
    })
      .then((r) => r.ok ? setStatus("ok") : setStatus("err"))
      .catch(() => setStatus("err"));
  }, []);
  const msg = {
    loading: "Processing…",
    ok: "You've been unsubscribed. No more weekly wine picks — sorry to see you go.",
    err: "Something went wrong. Please email hello@ownology.ai and we'll sort it.",
    no_token: "This unsubscribe link is missing its token. Email hello@ownology.ai for help.",
  }[status];
  return (
    <div style={{ background: "var(--ow-bg-base)", minHeight: "100dvh", display: "flex", alignItems: "center", justifyContent: "center", padding: "2rem" }}>
      <div style={{ maxWidth: 480, textAlign: "center", background: "var(--ow-bg-card)", padding: "2rem", borderRadius: 6, borderTop: "2px solid var(--ow-amber)" }} data-testid="unsub-panel">
        <p style={{ fontFamily: "'Lato',sans-serif", fontSize: 10, letterSpacing: "0.24em", textTransform: "uppercase", color: "var(--ow-amber)", fontWeight: 700, margin: 0 }}>
          Ownology · Weekly Reco
        </p>
        <p style={{ fontFamily: "'Fraunces',serif", fontSize: "1.3rem", color: "var(--ow-text-hi)", margin: "1rem 0" }}>{msg}</p>
        <a href="/" style={{ display: "inline-block", marginTop: "1rem", color: "var(--ow-amber)", fontFamily: "'Lato',sans-serif", fontSize: "0.9rem" }}>← Back to Ownology</a>
      </div>
    </div>
  );
}
