/**
 * /admin/guest-passes — generate & share Curriculum guest-pass URLs.
 *
 * For warm outreach to prospects (Andrew Pirie et al) while the Stripe
 * subscription loop is unfinished. Fill in name/label, tier, and expiry;
 * click Generate; copy the URL and share it. Recipient clicks and gets
 * that tier's Curriculum access for the token lifetime.
 *
 * Feb 2026 — Rich.
 */
import { useState } from "react";
import { Copy, Check, Sparkles } from "lucide-react";

type Result = {
  unlockUrl: string;
  tier: string;
  label: string | null;
  jti: string;
  expiresAt: string;
};

export default function AdminGuestPasses() {
  const [tier, setTier] = useState<"cellar_hand" | "press" | "vigneron">("vigneron");
  const [ttlDays, setTtlDays] = useState(30);
  const [label, setLabel] = useState("");
  const [busy, setBusy] = useState(false);
  const [err, setErr] = useState<string | null>(null);
  const [result, setResult] = useState<Result | null>(null);
  const [copied, setCopied] = useState(false);

  const submit = async (e: React.FormEvent) => {
    e.preventDefault();
    setBusy(true); setErr(null); setResult(null);
    try {
      const r = await fetch("/api/admin/guest-pass/create", {
        method: "POST",
        credentials: "same-origin",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ tier, ttlDays, label: label || undefined }),
      });
      if (!r.ok) throw new Error(`HTTP ${r.status}: ${await r.text()}`);
      const j = (await r.json()) as Result;
      setResult(j);
    } catch (e) {
      setErr(e instanceof Error ? e.message : String(e));
    } finally {
      setBusy(false);
    }
  };

  const copy = async () => {
    if (!result) return;
    await navigator.clipboard.writeText(result.unlockUrl);
    setCopied(true);
    setTimeout(() => setCopied(false), 1600);
  };

  return (
    <div
      className="min-h-screen p-8"
      style={{ background: "var(--ow-bg-base)", color: "var(--ow-text-hi)" }}
      data-testid="admin-guest-passes"
    >
      <div className="max-w-2xl mx-auto">
        <div style={{ fontFamily: "'JetBrains Mono',monospace", fontSize: "0.68rem", letterSpacing: "0.14em", textTransform: "uppercase", color: "var(--ow-amber)" }}>
          <Sparkles className="inline h-3 w-3 mr-1 -mt-0.5" /> Admin · Guest passes
        </div>
        <h1 style={{ fontFamily: "'Fraunces',serif", fontSize: "2rem", fontWeight: 700, margin: "0.5rem 0 0.4rem" }}>
          Generate a Curriculum unlock link.
        </h1>
        <p style={{ fontFamily: "'Lato',sans-serif", color: "var(--ow-text-mid)", fontSize: "0.9rem", lineHeight: 1.6, marginBottom: "2rem" }}>
          Signed, expiring URL that grants a specific tier of Curriculum access to whoever opens it — no signup, no Stripe. For warm outreach (Pirie, prospects, guest reviewers). Rotate JWT_SECRET to revoke every outstanding pass at once.
        </p>

        <form onSubmit={submit} style={{ background: "#fff", border: "1px solid var(--ow-border)", borderRadius: 6, padding: "1.5rem" }}>
          <label style={labelSt}>
            Recipient label (optional — helps you remember)
            <input
              type="text"
              value={label}
              onChange={(e) => setLabel(e.target.value)}
              placeholder="e.g. andrew-pirie-apogee"
              maxLength={40}
              data-testid="guest-pass-label"
              style={inputSt}
            />
          </label>

          <label style={labelSt}>
            Tier
            <select
              value={tier}
              onChange={(e) => setTier(e.target.value as never)}
              data-testid="guest-pass-tier"
              style={inputSt}
            >
              <option value="cellar_hand">Cellar Hand — Deep + Skim + Flash + MCQ practice</option>
              <option value="press">The Press — + Scored MCQs, saved progress, individual attainment PDF</option>
              <option value="vigneron">The Vigneron — + Team seats + branded team attainment PDFs</option>
            </select>
          </label>

          <label style={labelSt}>
            Expires after (days)
            <input
              type="number"
              min={1}
              max={365}
              value={ttlDays}
              onChange={(e) => setTtlDays(Number(e.target.value))}
              data-testid="guest-pass-ttl"
              style={inputSt}
            />
          </label>

          <button
            type="submit"
            disabled={busy}
            data-testid="guest-pass-submit"
            style={{
              marginTop: "1rem",
              fontFamily: "'Lato',sans-serif", fontWeight: 700, fontSize: "0.9rem",
              padding: "0.65rem 1.25rem", borderRadius: 4,
              background: "var(--ow-amber)", color: "#111", border: 0,
              cursor: busy ? "wait" : "pointer",
            }}
          >
            {busy ? "Generating…" : "Generate unlock URL"}
          </button>

          {err && (
            <div data-testid="guest-pass-error" style={{ marginTop: "1rem", padding: "0.6rem 0.85rem", borderRadius: 4, background: "rgba(185,28,28,0.08)", color: "#b91c1c", fontFamily: "'JetBrains Mono',monospace", fontSize: "0.78rem" }}>
              {err}
            </div>
          )}
        </form>

        {result && (
          <div data-testid="guest-pass-result" style={{ marginTop: "2rem", background: "#fff", border: "1px solid var(--ow-border)", borderRadius: 6, padding: "1.5rem" }}>
            <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: "0.85rem" }}>
              <span style={{ fontFamily: "'JetBrains Mono',monospace", fontSize: "0.68rem", letterSpacing: "0.14em", textTransform: "uppercase", color: "#4a7c47" }}>
                ✓ Pass generated
              </span>
              <span style={{ fontFamily: "'JetBrains Mono',monospace", fontSize: "0.72rem", color: "var(--ow-text-mid)" }}>
                jti · {result.jti}
              </span>
            </div>
            <div style={{ fontFamily: "'Lato',sans-serif", fontSize: "0.82rem", color: "var(--ow-text-mid)", marginBottom: "0.6rem" }}>
              <strong>{result.tier}</strong> {result.label && (<>· <em>{result.label}</em></>)}<br />
              expires <strong>{new Date(result.expiresAt).toLocaleString()}</strong>
            </div>
            <div style={{ display: "flex", gap: 8 }}>
              <input
                readOnly
                value={result.unlockUrl}
                data-testid="guest-pass-url"
                style={{ ...inputSt, marginTop: 0, fontFamily: "'JetBrains Mono',monospace", fontSize: "0.78rem" }}
                onFocus={(e) => e.currentTarget.select()}
              />
              <button
                type="button"
                onClick={copy}
                data-testid="guest-pass-copy"
                style={{ padding: "0 0.85rem", borderRadius: 4, background: copied ? "#4a7c47" : "#111", color: "#fff", border: 0, cursor: "pointer", fontFamily: "'Lato',sans-serif", fontSize: "0.82rem", fontWeight: 600 }}
              >
                {copied ? <><Check className="inline h-3.5 w-3.5 -mt-0.5" /> Copied</> : <><Copy className="inline h-3.5 w-3.5 -mt-0.5" /> Copy</>}
              </button>
            </div>
            <p style={{ fontFamily: "'Lato',sans-serif", fontSize: "0.78rem", color: "var(--ow-text-lo)", marginTop: "0.85rem", lineHeight: 1.55 }}>
              Share this URL directly (SMS, WhatsApp, email). When the recipient opens it, an HttpOnly cookie is set on their device granting the tier above until expiry. They land on <code style={{ fontFamily: "'JetBrains Mono',monospace" }}>/curriculum</code> with full content unlocked.
            </p>
          </div>
        )}
      </div>
    </div>
  );
}

const labelSt: React.CSSProperties = {
  display: "block", fontFamily: "'Lato',sans-serif", fontSize: "0.82rem",
  color: "var(--ow-text-hi)", fontWeight: 600, marginTop: "1rem",
};
const inputSt: React.CSSProperties = {
  display: "block", width: "100%", marginTop: "0.35rem",
  padding: "0.6rem 0.75rem", borderRadius: 4, border: "1px solid var(--ow-border)",
  fontFamily: "'Lato',sans-serif", fontSize: "0.88rem", background: "var(--ow-bg-base)",
  color: "var(--ow-text-hi)", boxSizing: "border-box",
};
