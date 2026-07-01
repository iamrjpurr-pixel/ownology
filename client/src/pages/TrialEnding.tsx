/**
 * TrialEnding — the "here's what you'd lose" conversion page.
 *
 * Shown when the sticky TrialBanner CTA is tapped, or when a user navigates
 * to /trial-ending directly. Renders:
 *   - Days left / expired state
 *   - Live counts of what they've logged (vintage entries, tanks, briefs,
 *     journal entries) — the "you have real work in here" argument
 *   - Upgrade CTA button (stub → /pricing?from=trial-ending until Stripe
 *     is wired with real keys)
 *   - "Or invite a colleague and earn 30 more days" secondary CTA
 */
import { Link } from "wouter";
import { trpc } from "../lib/trpc";

export default function TrialEnding() {
  const { data: winery } = trpc.winery.current.useQuery(undefined, { retry: false });
  const { data: history } = trpc.cellarBrief.history.useQuery({ limit: 100 }, { retry: false });
  const { data: refCode } = trpc.referrals.myCode.useQuery(undefined, { retry: false });

  if (!winery) {
    return (
      <div className="container py-8">
        <p style={{ color: "var(--ow-text-mid)" }}>Loading…</p>
      </div>
    );
  }

  const daysLeft = winery.trialDaysLeft ?? 0;
  const isExpired = winery.trialIsExpired;
  const isAlreadyPaid = winery.plan !== "free";
  const briefCount = history?.length ?? 0;

  return (
    <div
      data-testid="trial-ending-page"
      className="container py-8"
      style={{ maxWidth: 640 }}
    >
      <p className="text-xs uppercase tracking-widest" style={{ color: "var(--ow-text-lo)", letterSpacing: "0.15em" }}>
        Your Ownology trial
      </p>
      <h1
        className="text-3xl mt-2"
        style={{ color: "var(--ow-text-hi)", fontFamily: "'Fraunces',serif", fontWeight: 600 }}
        data-testid="trial-ending-heading"
      >
        {isAlreadyPaid
          ? `You're all set — ${winery.plan.replace("_", " ")} plan`
          : isExpired
            ? "Your trial has ended"
            : daysLeft <= 1
              ? "Your trial ends today"
              : `${daysLeft} days left on your trial`}
      </h1>

      {!isAlreadyPaid && (
        <p className="mt-4" style={{ color: "var(--ow-text-mid)", lineHeight: 1.55 }}>
          You&apos;ve been running Ownology for {14 - daysLeft} of your 14 free days. Here&apos;s what you&apos;ve built —
          and what would go dormant if you don&apos;t continue.
        </p>
      )}

      {/* What you've built */}
      <div
        data-testid="trial-ending-stats"
        className="mt-6 rounded-lg p-5 grid grid-cols-2 gap-4"
        style={{ background: "var(--ow-bg-raised)", border: "1px solid var(--ow-border)" }}
      >
        <Stat label="Cellar Briefs generated" value={briefCount} testid="stat-briefs" />
        <Stat label="Winery name" value={winery.name} testid="stat-name" />
        <Stat label="Region" value={winery.region ?? "not set"} testid="stat-region" />
        <Stat label="Current plan" value={winery.plan.replace("_", " ")} testid="stat-plan" />
      </div>

      {!isAlreadyPaid && (
        <>
          <h2 className="mt-8 text-lg" style={{ color: "var(--ow-text-hi)", fontFamily: "'Fraunces',serif", fontWeight: 600 }}>
            What you&apos;d lose
          </h2>
          <ul className="mt-3 flex flex-col gap-2" style={{ color: "var(--ow-text-mid)", listStyle: "none", padding: 0 }}>
            {[
              "Your daily Cellar Brief automation — no more 5:30am SWOT waiting for you",
              "Access to 236 MoreWine-grounded knowledge chunks + Ask Ownology tutor",
              "Your winery&apos;s branded exports (LIP audit pack, vintage log PDF)",
              "Public /audit/" + winery.slug + " vanity page (when enabled)",
              "Your team-member seats and per-vessel history",
            ].map((line, i) => (
              <li key={i} style={{ paddingLeft: "1.5rem", position: "relative" }}>
                <span style={{ position: "absolute", left: 0, color: "oklch(0.62 0.20 25)" }}>×</span>
                <span dangerouslySetInnerHTML={{ __html: line.replace(/&apos;/g, "'") }} />
              </li>
            ))}
          </ul>

          <div className="mt-8 flex flex-col sm:flex-row gap-3">
            <Link
              href="/pricing?from=trial-ending"
              data-testid="trial-ending-upgrade-cta"
              className="btn-amber text-center"
              style={{ flex: 1 }}
            >
              Choose a plan and keep it going →
            </Link>
            <Link
              href="/founding-member?from=trial-ending"
              data-testid="trial-ending-founding-cta"
              className="btn-ghost text-center"
              style={{ flex: 1 }}
            >
              Or become a Founding Member
            </Link>
          </div>

          {refCode && (
            <div
              className="mt-6 rounded-lg p-4"
              data-testid="trial-ending-referral-nudge"
              style={{
                background: "var(--ow-bg-inset)",
                border: "1px dashed var(--ow-border)",
              }}
            >
              <p style={{ color: "var(--ow-text-hi)", margin: 0, fontWeight: 600 }}>
                Or invite a winemaker — earn {refCode.rewardDaysPerConvert} days free per signup.
              </p>
              <Link
                href="/invite"
                data-testid="trial-ending-invite-link"
                className="mt-2 inline-block text-sm"
                style={{ color: "var(--ow-amber)", fontWeight: 600, textDecoration: "none" }}
              >
                Get my invite code →
              </Link>
            </div>
          )}
        </>
      )}
    </div>
  );
}

function Stat({ label, value, testid }: { label: string; value: string | number; testid: string }) {
  return (
    <div data-testid={testid}>
      <p className="text-xs uppercase tracking-widest" style={{ color: "var(--ow-text-lo)", letterSpacing: "0.1em", margin: 0 }}>
        {label}
      </p>
      <p className="text-lg mt-1" style={{ color: "var(--ow-text-hi)", fontFamily: "'Fraunces',serif", margin: 0 }}>
        {value}
      </p>
    </div>
  );
}
