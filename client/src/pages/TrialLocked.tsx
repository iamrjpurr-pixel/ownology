/**
 * /trial-locked — the softlanding for trial-tier users who hit a member-
 * only route (Feb 2026 progressive-exposure).
 *
 * When a `ow_gate` cookie carries tier="trial", the Express default-deny
 * middleware only lets it through TRIAL_ALLOWED_PREFIXES (see server/gate.ts).
 * Any other path 302's here with ?from=<original>.
 *
 * The page's job: reassure the trial user (nothing broken), remind them of
 * what IS included, and point at the upgrade path — without shouting.
 */
import { Link } from "wouter";
import { Lock, ArrowRight, ShieldCheck } from "lucide-react";

const HI = "var(--ow-text-hi)";
const MID = "var(--ow-text-mid)";
const LO = "var(--ow-text-lo)";
const AMBER = "var(--ow-amber)";
const CARD = "var(--ow-bg-card)";
const BORDER = "var(--ow-border)";
const SERIF = "'Fraunces', serif";

const TRIAL_INCLUDED = [
  { label: "The Press", href: "/the-press", desc: "Log entries, review the vintage log" },
  { label: "Cellar Brief", href: "/cellar-brief", desc: "Your daily brief, once you've logged a few entries" },
  { label: "Import", href: "/import", desc: "Voice, camera, paste, CSV, and bulk folder drop" },
  { label: "Ask Owen", href: "/ask", desc: "Grounded winemaking answers — 10 free during your trial" },
];

export default function TrialLocked() {
  const from = new URLSearchParams(window.location.search).get("from") || "";
  return (
    <div
      style={{
        minHeight: "100vh",
        background: "var(--ow-bg-base)",
        color: HI,
        padding: "3rem 1.5rem",
        display: "flex",
        alignItems: "flex-start",
        justifyContent: "center",
        fontFamily: "'Lato', sans-serif",
      }}
      data-testid="trial-locked-page"
    >
      <div style={{ maxWidth: 640, width: "100%" }}>
        <div style={{ display: "inline-flex", alignItems: "center", gap: "0.5rem", padding: "0.35rem 0.75rem", background: "color-mix(in oklch, var(--ow-amber) 10%, transparent)", border: `1px solid ${AMBER}`, borderRadius: 999, marginBottom: "1.25rem" }}>
          <Lock size={12} style={{ color: AMBER }} />
          <span style={{ fontSize: "0.72rem", color: AMBER, letterSpacing: "0.05em", textTransform: "uppercase" }}>
            Trial · locked
          </span>
        </div>

        <h1
          style={{ margin: 0, fontFamily: SERIF, fontSize: "clamp(1.75rem, 4vw, 2.5rem)", color: HI, lineHeight: 1.15 }}
          data-testid="trial-locked-heading"
        >
          This part unlocks with founding-partner membership.
        </h1>
        <p style={{ margin: "1rem 0 0", fontSize: "1rem", color: MID, lineHeight: 1.55 }}>
          You&apos;re on the 14-day trial — designed to prove the daily habit before you commit. The full pillar set (Do · Know · Learn · Guide) turns on once you become a member.
        </p>
        {from && (
          <p style={{ margin: "0.6rem 0 0", fontSize: "0.75rem", color: LO }}>
            You were trying to reach <code style={{ color: LO }}>{from}</code>.
          </p>
        )}

        {/* What's in the trial */}
        <div style={{ marginTop: "2rem", padding: "1.25rem", background: CARD, border: `1px solid ${BORDER}`, borderRadius: 8 }}>
          <p style={{ margin: 0, fontSize: "0.72rem", color: LO, textTransform: "uppercase", letterSpacing: "0.05em" }}>
            What&apos;s open during your trial
          </p>
          <div style={{ marginTop: "0.6rem", display: "grid", gap: "0.4rem" }}>
            {TRIAL_INCLUDED.map((t) => (
              <Link
                key={t.href}
                href={t.href}
                data-testid={`trial-open-${t.href.slice(1).replace(/\//g, "-")}`}
                style={{
                  display: "flex", alignItems: "center", gap: "0.6rem",
                  padding: "0.5rem 0.6rem", borderRadius: 4, color: HI, textDecoration: "none",
                  border: `1px solid transparent`, background: "transparent",
                }}
                onMouseEnter={(e) => (e.currentTarget.style.background = "color-mix(in oklch, var(--ow-amber) 6%, transparent)")}
                onMouseLeave={(e) => (e.currentTarget.style.background = "transparent")}
              >
                <ShieldCheck size={14} style={{ color: AMBER }} />
                <span style={{ flex: 1 }}>
                  <span style={{ fontWeight: 600 }}>{t.label}</span>
                  <span style={{ display: "block", fontSize: "0.75rem", color: LO }}>{t.desc}</span>
                </span>
                <ArrowRight size={12} style={{ color: LO }} />
              </Link>
            ))}
          </div>
        </div>

        {/* Upgrade CTA */}
        <div style={{ marginTop: "1.25rem", padding: "1.25rem", background: "color-mix(in oklch, var(--ow-amber) 8%, transparent)", border: `1px solid ${AMBER}`, borderRadius: 8 }}>
          <p style={{ margin: 0, fontSize: "0.9rem", color: HI, lineHeight: 1.55 }}>
            <strong>Ready to unlock the full pillar set?</strong> Founding partners get every surface, direct access to Rich, and shape the platform through their live vintage.
          </p>
          <div style={{ marginTop: "0.9rem", display: "flex", gap: "0.6rem", flexWrap: "wrap" }}>
            <Link
              href="/join"
              data-testid="trial-locked-upgrade"
              style={{
                padding: "0.6rem 1.1rem", background: AMBER, color: "oklch(0.10 0.008 60)",
                borderRadius: 6, textDecoration: "none", fontWeight: 600, fontSize: "0.85rem",
                display: "inline-flex", alignItems: "center", gap: "0.4rem",
              }}
            >
              Book a founding-partner call <ArrowRight size={14} />
            </Link>
            <Link
              href="/ask"
              data-testid="trial-locked-back-ask"
              style={{
                padding: "0.6rem 1.1rem", background: "transparent", color: MID,
                border: `1px solid ${BORDER}`, borderRadius: 6, textDecoration: "none", fontSize: "0.85rem",
              }}
            >
              Back to Ask Owen
            </Link>
          </div>
        </div>
      </div>
    </div>
  );
}
