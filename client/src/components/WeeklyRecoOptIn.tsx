/**
 * WeeklyRecoOptIn — small inline strip for the quiz results footer.
 * "Get one Aus wine pick per week" — one field + one button.
 */
import { useState } from "react";
import { trpc } from "@/lib/trpc";

export function WeeklyRecoOptIn({ source = "quiz_footer" }: { source?: string }) {
  const [email, setEmail] = useState("");
  const [status, setStatus] = useState<"idle" | "ok" | "err">("idle");
  const subscribe = trpc.weeklyRecoDigest.subscribe.useMutation();
  const count = trpc.weeklyRecoDigest.count.useQuery();

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!/@/.test(email)) return;
    try {
      await subscribe.mutateAsync({ email, source });
      setStatus("ok");
      setEmail("");
    } catch { setStatus("err"); }
  }

  return (
    <div data-testid="weekly-reco-optin" style={{ marginTop: "2.5rem", padding: "1rem 1.15rem", background: "var(--ow-bg-card)", border: "1px solid var(--ow-border)", borderTop: "2px solid color-mix(in oklch, var(--ow-amber) 55%, transparent)", borderRadius: 6 }}>
      <p style={{ fontFamily: "'Lato',sans-serif", fontSize: 10, letterSpacing: "0.24em", textTransform: "uppercase", color: "var(--ow-amber)", fontWeight: 700, margin: 0 }}>
        Weekly Aus wine pick
      </p>
      <p style={{ fontFamily: "'Fraunces',serif", fontSize: "1.1rem", color: "var(--ow-text-hi)", margin: "0.35rem 0 0.6rem" }}>
        One Aussie wine we love, every Wednesday.
      </p>
      <p style={{ fontFamily: "'Lato',sans-serif", fontSize: "0.85rem", color: "var(--ow-text-mid)", margin: "0 0 0.85rem" }}>
        Seasonal picks with real prices, real producers, no spam.{count.data?.active ? ` Join ${count.data.active} others.` : ""}
      </p>
      {status === "ok" ? (
        <p data-testid="weekly-reco-optin-ok" style={{ fontFamily: "'Lato',sans-serif", color: "#16a34a", fontWeight: 600, margin: 0 }}>
          ✓ You&#39;re in. First pick lands next Wednesday.
        </p>
      ) : (
        <form onSubmit={handleSubmit} style={{ display: "flex", gap: 8, flexWrap: "wrap" }}>
          <input type="email" required value={email} onChange={(e) => setEmail(e.target.value)} placeholder="you@example.com"
            data-testid="weekly-reco-optin-input"
            style={{ flex: 1, minWidth: 200, padding: "8px 12px", background: "var(--ow-bg-base)", border: "1px solid var(--ow-border)", borderRadius: 4, color: "var(--ow-text-hi)", fontFamily: "'Lato',sans-serif", fontSize: "0.9rem" }} />
          <button type="submit" disabled={subscribe.isPending} data-testid="weekly-reco-optin-submit"
            style={{ padding: "8px 16px", background: "var(--ow-amber)", color: "#000", border: "none", borderRadius: 4, fontWeight: 700, cursor: "pointer", fontFamily: "'Lato',sans-serif", fontSize: "0.85rem" }}>
            {subscribe.isPending ? "…" : "Subscribe"}
          </button>
        </form>
      )}
      {status === "err" && <p style={{ color: "#dc2626", fontSize: "0.82rem", marginTop: 6 }}>Couldn&#39;t sign you up. Try again in a moment.</p>}
    </div>
  );
}
