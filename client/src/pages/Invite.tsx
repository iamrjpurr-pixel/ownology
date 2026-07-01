/**
 * Invite — the referral loop page.
 *
 * Every winery has a unique referral_code. This page shows the shareable
 * link, a copy-to-clipboard button, a preformatted SMS/email snippet, and
 * a list of pending / signed-up / converted referrals so the winemaker can
 * see their progress toward the +30 days-per-signup reward.
 */
import { useState } from "react";
import { Link } from "wouter";
import { trpc } from "../lib/trpc";

export default function Invite() {
  const { data: code } = trpc.referrals.myCode.useQuery(undefined, { retry: false });
  const { data: list } = trpc.referrals.myList.useQuery(undefined, { retry: false });
  const [copied, setCopied] = useState<"link" | "sms" | null>(null);

  if (!code) {
    return <div className="container py-8"><p style={{ color: "var(--ow-text-mid)" }}>Loading…</p></div>;
  }

  const origin = typeof window !== "undefined" ? window.location.origin : "https://ownology.ai";
  const fullLink = `${origin}${code.sharePath}`;
  const smsBody =
    `Trying Ownology — cellar intelligence for boutique wineries. Free 14-day trial, ` +
    `plus you get an extra 30 days on me if you sign up with my code: ${fullLink}`;

  const copy = (text: string, kind: "link" | "sms") => {
    if (typeof navigator === "undefined" || !navigator.clipboard) return;
    navigator.clipboard.writeText(text).then(() => {
      setCopied(kind);
      setTimeout(() => setCopied(null), 2000);
    });
  };

  const pending = (list ?? []).filter((r) => r.status === "pending").length;
  const signedUp = (list ?? []).filter((r) => r.status === "signed_up").length;
  const converted = (list ?? []).filter((r) => r.status === "converted").length;
  const earnedDays = (list ?? []).reduce((acc, r) => acc + (r.rewardDaysGranted ?? 0), 0);

  return (
    <div data-testid="invite-page" className="container py-8" style={{ maxWidth: 640 }}>
      <p className="text-xs uppercase tracking-widest" style={{ color: "var(--ow-text-lo)", letterSpacing: "0.15em" }}>
        Invite a winemaker
      </p>
      <h1 className="text-3xl mt-2" style={{ color: "var(--ow-text-hi)", fontFamily: "'Fraunces',serif", fontWeight: 600 }}>
        Earn {code.rewardDaysPerConvert} days per signup
      </h1>
      <p className="mt-3" style={{ color: "var(--ow-text-mid)", lineHeight: 1.55 }}>
        Share your invite link with another winemaker. When they sign up and become a paying member,
        you get <strong>{code.rewardDaysPerConvert} extra days</strong> added to your subscription — automatically.
      </p>

      <div
        className="mt-6 rounded-lg p-5"
        style={{ background: "var(--ow-bg-raised)", border: "1px solid var(--ow-border)" }}
      >
        <p className="text-xs uppercase tracking-widest" style={{ color: "var(--ow-text-lo)", letterSpacing: "0.1em", margin: 0 }}>
          Your invite code
        </p>
        <div className="mt-2 flex items-center gap-3" style={{ flexWrap: "wrap" }}>
          <code
            data-testid="invite-code"
            style={{
              padding: "0.5rem 0.9rem",
              background: "var(--ow-bg-inset)",
              color: "var(--ow-text-hi)",
              fontFamily: "'Fira Code','SF Mono',monospace",
              fontSize: "1.1rem",
              fontWeight: 700,
              borderRadius: 4,
              letterSpacing: "0.05em",
            }}
          >
            {code.code}
          </code>
          <button
            onClick={() => copy(fullLink, "link")}
            data-testid="copy-link-btn"
            className="btn-amber"
            style={{ padding: "0.5rem 1rem" }}
          >
            {copied === "link" ? "✓ Copied" : "Copy link"}
          </button>
          <button
            onClick={() => copy(smsBody, "sms")}
            data-testid="copy-sms-btn"
            className="btn-ghost"
            style={{ padding: "0.5rem 1rem" }}
          >
            {copied === "sms" ? "✓ Copied" : "Copy SMS text"}
          </button>
        </div>
        <p className="text-xs mt-3" data-testid="invite-full-link" style={{ color: "var(--ow-text-lo)", wordBreak: "break-all" }}>
          {fullLink}
        </p>
      </div>

      {/* Referral stats */}
      <div
        data-testid="invite-stats"
        className="mt-6 grid grid-cols-2 md:grid-cols-4 gap-3"
      >
        <StatBox testid="stat-pending" label="Clicked" value={pending} />
        <StatBox testid="stat-signed-up" label="Signed up" value={signedUp} />
        <StatBox testid="stat-converted" label="Paid" value={converted} />
        <StatBox testid="stat-earned" label="Days earned" value={earnedDays} accent />
      </div>

      {/* List */}
      {list && list.length > 0 && (
        <div className="mt-6">
          <h2 className="text-lg" style={{ color: "var(--ow-text-hi)", fontFamily: "'Fraunces',serif", fontWeight: 600 }}>
            Recent activity
          </h2>
          <div className="mt-3 flex flex-col gap-2" data-testid="invite-list">
            {list.slice(0, 10).map((r) => (
              <div
                key={r.id}
                className="rounded p-3 flex items-center justify-between"
                style={{ background: "var(--ow-bg-raised)", border: "1px solid var(--ow-border)" }}
              >
                <div>
                  <p style={{ color: "var(--ow-text-hi)", margin: 0, fontSize: "0.9rem" }}>
                    {r.referredEmail || "Anonymous click"}
                  </p>
                  <p className="text-xs mt-0.5" style={{ color: "var(--ow-text-lo)", margin: 0 }}>
                    {new Date(r.createdAt).toLocaleDateString()}
                  </p>
                </div>
                <span
                  className="text-xs px-2 py-1 rounded"
                  style={{
                    background:
                      r.status === "converted" ? "oklch(0.62 0.10 155)" :
                      r.status === "signed_up" ? "var(--ow-amber)" :
                      "var(--ow-bg-inset)",
                    color:
                      r.status === "converted" ? "white" :
                      r.status === "signed_up" ? "oklch(0.10 0.008 60)" :
                      "var(--ow-text-mid)",
                    fontWeight: 600,
                    textTransform: "uppercase",
                    letterSpacing: "0.05em",
                  }}
                >
                  {r.status.replace("_", " ")}
                </span>
              </div>
            ))}
          </div>
        </div>
      )}

      <div className="mt-8 text-sm">
        <Link href="/cellar-brief" style={{ color: "var(--ow-text-lo)", textDecoration: "none" }}>
          ← Back to Cellar Brief
        </Link>
      </div>
    </div>
  );
}

function StatBox({ label, value, accent, testid }: { label: string; value: number | string; accent?: boolean; testid: string }) {
  return (
    <div
      data-testid={testid}
      className="rounded-lg p-3 text-center"
      style={{
        background: accent ? "var(--ow-amber)" : "var(--ow-bg-raised)",
        color: accent ? "oklch(0.10 0.008 60)" : "var(--ow-text-hi)",
        border: accent ? "none" : "1px solid var(--ow-border)",
      }}
    >
      <p className="text-2xl" style={{ fontFamily: "'Fraunces',serif", fontWeight: 600, margin: 0 }}>{value}</p>
      <p className="text-xs mt-1" style={{ opacity: 0.7, letterSpacing: "0.05em", textTransform: "uppercase", margin: 0 }}>{label}</p>
    </div>
  );
}
