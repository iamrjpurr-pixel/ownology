import { useState } from "react";
import { Link } from "wouter";
import OwnologyLogo from "@/components/OwnologyLogo";

/**
 * Ownology Pricing Page
 * Tiers: Free Run / The Cellar / The Press / Cellar Master
 * Credit Packs: The Measure / The Vintage / The Reserve / The Magnum
 * Founding member strategy: first 99 paid subscribers, locked pricing
 */

// ─── Types ────────────────────────────────────────────────────────────────────
type BillingCycle = "monthly" | "annual";

// ─── Data ─────────────────────────────────────────────────────────────────────
const TIERS = [
  {
    id: "free_run",
    name: "Free Run",
    tagline: "Unforced. Natural. The first flow.",
    monthlyPrice: 0,
    annualPrice: 0,
    highlight: false,
    badge: null,
    color: "oklch(0.55 0.015 75)",
    features: [
      "5 Compliance Agent queries per month",
      "3 Free Run lesson previews",
      "Full public Resources library",
      "Waitlist priority for new features",
      "Access to all 5 state jurisdictions",
    ],
    cta: "Start Free",
    ctaHref: "#waitlist",
    note: null,
  },
  {
    id: "cellar",
    name: "The Cellar",
    tagline: "Where knowledge is stored and matures.",
    monthlyPrice: 19,
    annualPrice: 190,
    highlight: false,
    badge: "FOUNDING MEMBER",
    color: "oklch(0.65 0.08 75)",
    features: [
      "Unlimited Compliance Agent queries",
      "Full Free Run lesson library (40+ subjects)",
      "30 AI tutor credits per month",
      "The Press working board",
      "Email support",
      "Founding member badge (first 99)",
    ],
    cta: "Join The Cellar",
    ctaHref: "#waitlist",
    note: "Less than a bottle of decent Shiraz per month.",
  },
  {
    id: "press",
    name: "The Press",
    tagline: "Deeper extraction. The full depth.",
    monthlyPrice: 49,
    annualPrice: 490,
    highlight: true,
    badge: "MOST POPULAR",
    color: "oklch(0.72 0.12 75)",
    features: [
      "Everything in The Cellar",
      "150 AI tutor credits per month",
      "Custom document upload (your SOPs)",
      "Priority Compliance Agent responses",
      "Vintage log PDF export",
      "Phone & chat support (business hours)",
      "The Press member badge",
    ],
    cta: "Enter The Press",
    ctaHref: "#waitlist",
    note: null,
  },
  {
    id: "cellar_master",
    name: "Cellar Master",
    tagline: "The authoritative record. The full system.",
    monthlyPrice: 99,
    annualPrice: 990,
    highlight: false,
    badge: "TEAM",
    color: "oklch(0.80 0.14 75)",
    features: [
      "Everything in The Press",
      "Unlimited AI tutor credits",
      "3 team seats (winemaker + 2 staff)",
      "Early access to all new features",
      "Dedicated onboarding call (30 min)",
      "Annual knowledge base review alert",
      "Cellar Master badge + member number",
    ],
    cta: "Claim Cellar Master",
    ctaHref: "#waitlist",
    note: null,
  },
];

const CREDIT_PACKS = [
  {
    id: "measure",
    name: "The Measure",
    credits: 50,
    price: 9,
    perCredit: "$0.18",
    tagline: "For casual learners and one-off questions.",
    badge: null,
  },
  {
    id: "vintage",
    name: "The Vintage",
    credits: 200,
    price: 29,
    perCredit: "$0.145",
    tagline: "For seasonal workers and active learners.",
    badge: "HARVEST READY",
  },
  {
    id: "reserve",
    name: "The Reserve",
    credits: 600,
    price: 69,
    perCredit: "$0.115",
    tagline: "For serious students and small teams.",
    badge: "BEST VALUE",
  },
  {
    id: "magnum",
    name: "The Magnum",
    credits: 1500,
    price: 149,
    perCredit: "$0.099",
    tagline: "For Cellar Master overflow and team use.",
    badge: null,
  },
];

const FAQS = [
  {
    q: "What is a credit?",
    a: "One credit = one AI tutor interaction — asking a question about a lesson, requesting a different explanation, or taking a quiz. The Compliance Agent is unlimited on all paid tiers and does not consume credits.",
  },
  {
    q: "Do credits expire?",
    a: "No. Credits purchased via credit packs never expire. Monthly subscription credits reset each billing cycle, but pack credits roll over indefinitely. We designed it this way deliberately — your knowledge investment should not have a use-by date.",
  },
  {
    q: "What is the Founding Member offer?",
    a: "The first 99 paid subscribers (member numbers 11–99) receive founding member status: pricing locked for life, a permanent founding member badge, direct input into the product roadmap, and their name in the Our Story section (optional). Numbers 1–9 are reserved.",
  },
  {
    q: "Can I change tiers?",
    a: "Yes. You can upgrade or downgrade at any time. Upgrades take effect immediately; downgrades take effect at the next billing cycle. Founding member pricing is locked regardless of tier changes.",
  },
  {
    q: "What is the difference between Free Run and The Cellar?",
    a: "Free Run gives you a taste — 5 compliance queries and 3 lesson previews per month, no credit card required. The Cellar unlocks the full lesson library, unlimited compliance queries, and 30 AI tutor credits per month. It is the first step from learning about Ownology to learning with it.",
  },
  {
    q: "Is there a team plan?",
    a: "Yes — Cellar Master includes 3 team seats. For larger teams (4+ users), contact us for an enterprise quote.",
  },
];

// ─── Nav ──────────────────────────────────────────────────────────────────────
function Nav() {
  return (
    <nav
      className="fixed top-0 left-0 right-0 z-50 border-b"
      style={{
        background: "oklch(0.11 0.008 60 / 97%)",
        borderColor: "oklch(1 0 0 / 6%)",
        backdropFilter: "blur(12px)",
      }}
    >
      <div className="container flex items-center justify-between py-4">
        <Link href="/">
          <OwnologyLogo size={32} />
        </Link>
        <div className="flex items-center gap-4">
          <Link
            href="/"
            className="text-sm transition-colors"
            style={{ color: "oklch(0.60 0.015 75)", fontFamily: "'Lato', sans-serif" }}
          >
            ← Back to Home
          </Link>
        </div>
      </div>
    </nav>
  );
}

// ─── Billing toggle ───────────────────────────────────────────────────────────
function BillingToggle({
  cycle,
  onChange,
}: {
  cycle: BillingCycle;
  onChange: (c: BillingCycle) => void;
}) {
  return (
    <div className="flex items-center gap-3 justify-center">
      <button
        onClick={() => onChange("monthly")}
        className="text-sm transition-colors"
        style={{
          fontFamily: "'Lato', sans-serif",
          color:
            cycle === "monthly"
              ? "oklch(0.72 0.12 75)"
              : "oklch(0.55 0.015 75)",
          fontWeight: cycle === "monthly" ? 600 : 300,
        }}
      >
        Monthly
      </button>
      <button
        onClick={() => onChange(cycle === "monthly" ? "annual" : "monthly")}
        className="relative w-12 h-6 rounded-full transition-colors flex-shrink-0"
        style={{
          background:
            cycle === "annual"
              ? "oklch(0.72 0.12 75)"
              : "oklch(0.22 0.010 60)",
        }}
        aria-label="Toggle billing cycle"
      >
        <span
          className="absolute top-1 w-4 h-4 rounded-full transition-transform"
          style={{
            background: "oklch(0.95 0.018 75)",
            transform:
              cycle === "annual" ? "translateX(26px)" : "translateX(4px)",
          }}
        />
      </button>
      <button
        onClick={() => onChange("annual")}
        className="text-sm transition-colors flex items-center gap-2"
        style={{
          fontFamily: "'Lato', sans-serif",
          color:
            cycle === "annual"
              ? "oklch(0.72 0.12 75)"
              : "oklch(0.55 0.015 75)",
          fontWeight: cycle === "annual" ? 600 : 300,
        }}
      >
        Annual
        <span
          className="text-xs px-2 py-0.5 rounded"
          style={{
            background: "oklch(0.72 0.12 75 / 15%)",
            color: "oklch(0.72 0.12 75)",
            fontFamily: "'Fira Code', monospace",
          }}
        >
          SAVE 2 MONTHS
        </span>
      </button>
    </div>
  );
}

// ─── Tier card ────────────────────────────────────────────────────────────────
function TierCard({
  tier,
  cycle,
}: {
  tier: (typeof TIERS)[0];
  cycle: BillingCycle;
}) {
  const price =
    cycle === "annual" ? tier.annualPrice : tier.monthlyPrice;
  const displayPrice =
    cycle === "annual" && tier.annualPrice > 0
      ? Math.round(tier.annualPrice / 12)
      : price;

  return (
    <div
      className="relative flex flex-col rounded-sm p-6 transition-all duration-200"
      style={{
        background: tier.highlight
          ? "oklch(0.16 0.012 60)"
          : "oklch(0.13 0.008 60)",
        border: tier.highlight
          ? `1px solid oklch(0.72 0.12 75 / 40%)`
          : "1px solid oklch(1 0 0 / 8%)",
        boxShadow: tier.highlight
          ? "0 0 40px oklch(0.72 0.12 75 / 8%)"
          : "none",
      }}
    >
      {/* Badge */}
      {tier.badge && (
        <div
          className="absolute -top-3 left-1/2 -translate-x-1/2 px-3 py-1 text-xs rounded-sm"
          style={{
            background: tier.highlight
              ? "oklch(0.72 0.12 75)"
              : "oklch(0.22 0.010 60)",
            color: tier.highlight
              ? "oklch(0.11 0.008 60)"
              : "oklch(0.72 0.12 75)",
            fontFamily: "'Fira Code', monospace",
            letterSpacing: "0.08em",
            border: tier.highlight ? "none" : "1px solid oklch(0.72 0.12 75 / 30%)",
          }}
        >
          {tier.badge}
        </div>
      )}

      {/* Header */}
      <div className="mb-5">
        <h3
          className="mb-1"
          style={{
            fontFamily: "'Fraunces', serif",
            fontSize: "1.375rem",
            fontWeight: 600,
            color: tier.color,
          }}
        >
          {tier.name}
        </h3>
        <p
          className="text-sm"
          style={{
            fontFamily: "'Lato', sans-serif",
            fontWeight: 300,
            color: "oklch(0.55 0.012 75)",
            fontStyle: "italic",
          }}
        >
          {tier.tagline}
        </p>
      </div>

      {/* Price */}
      <div className="mb-6">
        {tier.monthlyPrice === 0 ? (
          <div
            style={{
              fontFamily: "'Fraunces', serif",
              fontSize: "2.5rem",
              fontWeight: 700,
              color: "oklch(0.85 0.018 75)",
              lineHeight: 1,
            }}
          >
            Free
          </div>
        ) : (
          <div className="flex items-end gap-1">
            <span
              style={{
                fontFamily: "'Fraunces', serif",
                fontSize: "2.5rem",
                fontWeight: 700,
                color: "oklch(0.85 0.018 75)",
                lineHeight: 1,
              }}
            >
              ${displayPrice}
            </span>
            <span
              className="mb-1.5"
              style={{
                fontFamily: "'Lato', sans-serif",
                fontSize: "0.875rem",
                color: "oklch(0.50 0.012 75)",
              }}
            >
              /mo{cycle === "annual" ? " · billed annually" : ""}
            </span>
          </div>
        )}
        {tier.note && (
          <p
            className="mt-2 text-xs"
            style={{
              fontFamily: "'Lato', sans-serif",
              fontStyle: "italic",
              color: "oklch(0.50 0.012 75)",
            }}
          >
            {tier.note}
          </p>
        )}
      </div>

      {/* Features */}
      <ul className="flex-1 space-y-2.5 mb-6">
        {tier.features.map((f) => (
          <li key={f} className="flex items-start gap-2.5">
            <svg
              width="14"
              height="14"
              viewBox="0 0 14 14"
              fill="none"
              className="mt-0.5 flex-shrink-0"
            >
              <circle
                cx="7"
                cy="7"
                r="6"
                stroke={tier.color}
                strokeWidth="1.2"
              />
              <path
                d="M4.5 7l2 2 3-3"
                stroke={tier.color}
                strokeWidth="1.2"
                strokeLinecap="round"
                strokeLinejoin="round"
              />
            </svg>
            <span
              className="text-sm"
              style={{
                fontFamily: "'Lato', sans-serif",
                fontWeight: 300,
                color: "oklch(0.70 0.015 75)",
                lineHeight: 1.5,
              }}
            >
              {f}
            </span>
          </li>
        ))}
      </ul>

      {/* CTA */}
      <a
        href={tier.ctaHref}
        className="block text-center py-3 rounded-sm text-sm transition-all duration-200"
        style={
          tier.highlight
            ? {
                background: "oklch(0.72 0.12 75)",
                color: "oklch(0.11 0.008 60)",
                fontFamily: "'Lato', sans-serif",
                fontWeight: 600,
                letterSpacing: "0.06em",
                textTransform: "uppercase",
              }
            : {
                background: "transparent",
                color: "oklch(0.72 0.12 75)",
                fontFamily: "'Lato', sans-serif",
                fontWeight: 400,
                letterSpacing: "0.06em",
                textTransform: "uppercase",
                border: "1px solid oklch(0.72 0.12 75 / 35%)",
              }
        }
        onMouseEnter={(e) => {
          if (!tier.highlight) {
            (e.currentTarget as HTMLAnchorElement).style.background =
              "oklch(0.72 0.12 75 / 10%)";
          }
        }}
        onMouseLeave={(e) => {
          if (!tier.highlight) {
            (e.currentTarget as HTMLAnchorElement).style.background =
              "transparent";
          }
        }}
      >
        {tier.cta}
      </a>
    </div>
  );
}

// ─── Credit pack card ─────────────────────────────────────────────────────────
function CreditPackCard({ pack }: { pack: (typeof CREDIT_PACKS)[0] }) {
  return (
    <div
      className="relative rounded-sm p-5"
      style={{
        background: "oklch(0.13 0.008 60)",
        border: pack.badge === "BEST VALUE"
          ? "1px solid oklch(0.72 0.12 75 / 35%)"
          : "1px solid oklch(1 0 0 / 8%)",
      }}
    >
      {pack.badge && (
        <div
          className="absolute -top-3 left-4 px-2 py-0.5 text-xs rounded-sm"
          style={{
            background:
              pack.badge === "BEST VALUE"
                ? "oklch(0.72 0.12 75)"
                : "oklch(0.22 0.010 60)",
            color:
              pack.badge === "BEST VALUE"
                ? "oklch(0.11 0.008 60)"
                : "oklch(0.72 0.12 75)",
            fontFamily: "'Fira Code', monospace",
            letterSpacing: "0.08em",
            border:
              pack.badge === "BEST VALUE"
                ? "none"
                : "1px solid oklch(0.72 0.12 75 / 30%)",
          }}
        >
          {pack.badge}
        </div>
      )}

      <div className="flex items-start justify-between mb-3">
        <div>
          <h4
            style={{
              fontFamily: "'Fraunces', serif",
              fontSize: "1.125rem",
              fontWeight: 600,
              color: "oklch(0.85 0.018 75)",
            }}
          >
            {pack.name}
          </h4>
          <p
            className="text-xs mt-0.5"
            style={{
              fontFamily: "'Lato', sans-serif",
              fontWeight: 300,
              color: "oklch(0.50 0.012 75)",
              fontStyle: "italic",
            }}
          >
            {pack.tagline}
          </p>
        </div>
        <div className="text-right">
          <div
            style={{
              fontFamily: "'Fraunces', serif",
              fontSize: "1.75rem",
              fontWeight: 700,
              color: "oklch(0.72 0.12 75)",
              lineHeight: 1,
            }}
          >
            ${pack.price}
          </div>
          <div
            className="text-xs mt-0.5"
            style={{
              fontFamily: "'Fira Code', monospace",
              color: "oklch(0.50 0.012 75)",
            }}
          >
            {pack.perCredit}/credit
          </div>
        </div>
      </div>

      <div
        className="flex items-center justify-between py-2.5 px-3 rounded-sm"
        style={{ background: "oklch(0.17 0.010 60)" }}
      >
        <span
          style={{
            fontFamily: "'Fira Code', monospace",
            fontSize: "0.875rem",
            color: "oklch(0.72 0.12 75)",
          }}
        >
          {pack.credits.toLocaleString()} credits
        </span>
        <span
          className="text-xs"
          style={{
            fontFamily: "'Lato', sans-serif",
            color: "oklch(0.50 0.012 75)",
          }}
        >
          Never expire
        </span>
      </div>

      <a
        href="#waitlist"
        className="block text-center mt-4 py-2.5 rounded-sm text-sm transition-colors"
        style={{
          background: "transparent",
          color: "oklch(0.72 0.12 75)",
          fontFamily: "'Lato', sans-serif",
          fontWeight: 400,
          letterSpacing: "0.06em",
          textTransform: "uppercase",
          border: "1px solid oklch(0.72 0.12 75 / 30%)",
          fontSize: "0.75rem",
        }}
        onMouseEnter={(e) => {
          (e.currentTarget as HTMLAnchorElement).style.background =
            "oklch(0.72 0.12 75 / 10%)";
        }}
        onMouseLeave={(e) => {
          (e.currentTarget as HTMLAnchorElement).style.background =
            "transparent";
        }}
      >
        Purchase Pack
      </a>
    </div>
  );
}

// ─── FAQ item ─────────────────────────────────────────────────────────────────
function FaqItem({ q, a }: { q: string; a: string }) {
  const [open, setOpen] = useState(false);
  return (
    <div
      className="border-b"
      style={{ borderColor: "oklch(1 0 0 / 6%)" }}
    >
      <button
        className="w-full flex items-start justify-between py-4 text-left gap-4"
        onClick={() => setOpen((o) => !o)}
      >
        <span
          style={{
            fontFamily: "'Lato', sans-serif",
            fontWeight: 400,
            fontSize: "0.9375rem",
            color: "oklch(0.80 0.015 75)",
          }}
        >
          {q}
        </span>
        <svg
          width="16"
          height="16"
          viewBox="0 0 16 16"
          fill="none"
          className="flex-shrink-0 mt-0.5 transition-transform"
          style={{
            transform: open ? "rotate(45deg)" : "rotate(0deg)",
          }}
        >
          <path
            d="M8 3v10M3 8h10"
            stroke="oklch(0.72 0.12 75)"
            strokeWidth="1.4"
            strokeLinecap="round"
          />
        </svg>
      </button>
      {open && (
        <p
          className="pb-4"
          style={{
            fontFamily: "'Lato', sans-serif",
            fontWeight: 300,
            fontSize: "0.875rem",
            color: "oklch(0.60 0.012 75)",
            lineHeight: 1.7,
          }}
        >
          {a}
        </p>
      )}
    </div>
  );
}

// ─── Main page ────────────────────────────────────────────────────────────────
export default function Pricing() {
  const [cycle, setCycle] = useState<BillingCycle>("annual");

  return (
    <div
      className="min-h-screen"
      style={{ background: "oklch(0.11 0.008 60)" }}
    >
      <Nav />

      {/* Hero */}
      <section className="pt-32 pb-16 text-center">
        <div className="container max-w-3xl mx-auto">
          <p
            className="section-label mb-4"
            style={{ fontFamily: "'Lato', sans-serif" }}
          >
            Pricing
          </p>
          <h1
            style={{
              fontFamily: "'Fraunces', serif",
              fontWeight: 700,
              fontSize: "clamp(2rem, 4vw, 3rem)",
              color: "oklch(0.95 0.018 75)",
              lineHeight: 1.1,
              letterSpacing: "-0.02em",
            }}
          >
            From Free Run to{" "}
            <em style={{ color: "oklch(0.72 0.12 75)", fontStyle: "italic" }}>
              Cellar Master.
            </em>
          </h1>
          <p
            className="mt-4 mb-10"
            style={{
              fontFamily: "'Lato', sans-serif",
              fontWeight: 300,
              fontSize: "1.0625rem",
              color: "oklch(0.60 0.015 75)",
              lineHeight: 1.7,
            }}
          >
            Start with free run juice — unforced, natural, no commitment. When
            you are ready to go deeper, step into The Press. Every tier is
            designed around the winemaker's working rhythm, not a generic SaaS
            model.
          </p>
          <BillingToggle cycle={cycle} onChange={setCycle} />
        </div>
      </section>

      {/* Founding member banner */}
      <div className="container max-w-5xl mx-auto mb-8">
        <div
          className="rounded-sm px-6 py-4 flex flex-col sm:flex-row items-start sm:items-center gap-3"
          style={{
            background: "oklch(0.72 0.12 75 / 8%)",
            border: "1px solid oklch(0.72 0.12 75 / 25%)",
          }}
        >
          <div
            className="w-8 h-8 rounded-sm flex items-center justify-center flex-shrink-0"
            style={{ background: "oklch(0.72 0.12 75 / 15%)" }}
          >
            <svg width="16" height="16" viewBox="0 0 16 16" fill="none">
              <path
                d="M8 2l1.5 3.5L13 6l-2.5 2.5.5 3.5L8 10.5 5 12l.5-3.5L3 6l3.5-.5L8 2z"
                stroke="oklch(0.72 0.12 75)"
                strokeWidth="1.2"
                strokeLinejoin="round"
              />
            </svg>
          </div>
          <div>
            <p
              className="text-sm font-medium"
              style={{
                fontFamily: "'Lato', sans-serif",
                color: "oklch(0.80 0.015 75)",
              }}
            >
              Founding Member Offer — First 99 paid subscribers
            </p>
            <p
              className="text-xs mt-0.5"
              style={{
                fontFamily: "'Lato', sans-serif",
                fontWeight: 300,
                color: "oklch(0.55 0.012 75)",
              }}
            >
              Pricing locked for life · Permanent founding badge · Direct
              product input · Name in Our Story (optional). Numbers 1–9
              reserved; public subscriptions begin at #11.
            </p>
          </div>
        </div>
      </div>

      {/* Tier cards */}
      <section className="container max-w-5xl mx-auto mb-20">
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-5">
          {TIERS.map((tier) => (
            <TierCard key={tier.id} tier={tier} cycle={cycle} />
          ))}
        </div>
      </section>

      {/* Divider */}
      <div className="container max-w-5xl mx-auto mb-16">
        <div
          className="flex items-center gap-4"
          style={{ borderTop: "1px solid oklch(1 0 0 / 6%)" }}
        >
          <div className="pt-8 flex-1">
            <p
              className="section-label mb-2"
              style={{ fontFamily: "'Lato', sans-serif" }}
            >
              Credit Packs
            </p>
            <h2
              style={{
                fontFamily: "'Fraunces', serif",
                fontWeight: 600,
                fontSize: "1.75rem",
                color: "oklch(0.90 0.018 75)",
              }}
            >
              Top up when you need it.
            </h2>
            <p
              className="mt-2 max-w-xl"
              style={{
                fontFamily: "'Lato', sans-serif",
                fontWeight: 300,
                fontSize: "0.9375rem",
                color: "oklch(0.55 0.012 75)",
                lineHeight: 1.7,
              }}
            >
              Credits power the AI tutor — every lesson question, quiz, and
              "explain it differently" request. The Compliance Agent is
              unlimited on all paid tiers and never consumes credits. Packs
              never expire; your knowledge investment has no use-by date.
            </p>
          </div>
        </div>
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-5 mt-8">
          {CREDIT_PACKS.map((pack) => (
            <CreditPackCard key={pack.id} pack={pack} />
          ))}
        </div>
      </div>

      {/* What is a credit */}
      <section
        className="py-16"
        style={{ background: "oklch(0.13 0.008 60)" }}
      >
        <div className="container max-w-4xl mx-auto">
          <h2
            className="mb-8 text-center"
            style={{
              fontFamily: "'Fraunces', serif",
              fontWeight: 600,
              fontSize: "1.5rem",
              color: "oklch(0.90 0.018 75)",
            }}
          >
            What does one credit get you?
          </h2>
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
            {[
              {
                action: "Ask about a lesson",
                credits: 1,
                example: '"What does YAN actually mean for my Shiraz?"',
              },
              {
                action: "Explain it differently",
                credits: 1,
                example: '"Can you explain MLF without the chemistry?"',
              },
              {
                action: "Quiz me on this topic",
                credits: 1,
                example: "3–5 adaptive questions on your chosen subject",
              },
              {
                action: "Check my understanding",
                credits: 2,
                example:
                  "You explain it back; AI scores and fills the gaps",
              },
              {
                action: "Custom document question",
                credits: 2,
                example: "Ask questions from your uploaded SOPs",
              },
              {
                action: "Emergency harvest answer",
                credits: 3,
                example: "Flagged urgent — priority processing",
              },
            ].map((item) => (
              <div
                key={item.action}
                className="rounded-sm p-4"
                style={{
                  background: "oklch(0.11 0.008 60)",
                  border: "1px solid oklch(1 0 0 / 8%)",
                }}
              >
                <div className="flex items-center justify-between mb-2">
                  <span
                    className="text-sm font-medium"
                    style={{
                      fontFamily: "'Lato', sans-serif",
                      color: "oklch(0.80 0.015 75)",
                    }}
                  >
                    {item.action}
                  </span>
                  <span
                    className="text-xs px-2 py-0.5 rounded-sm"
                    style={{
                      fontFamily: "'Fira Code', monospace",
                      background: "oklch(0.72 0.12 75 / 12%)",
                      color: "oklch(0.72 0.12 75)",
                    }}
                  >
                    {item.credits} credit{item.credits > 1 ? "s" : ""}
                  </span>
                </div>
                <p
                  className="text-xs"
                  style={{
                    fontFamily: "'Lato', sans-serif",
                    fontWeight: 300,
                    fontStyle: "italic",
                    color: "oklch(0.50 0.012 75)",
                    lineHeight: 1.5,
                  }}
                >
                  {item.example}
                </p>
              </div>
            ))}
          </div>
          <p
            className="text-center mt-6 text-sm"
            style={{
              fontFamily: "'Lato', sans-serif",
              fontWeight: 300,
              color: "oklch(0.45 0.010 75)",
              fontStyle: "italic",
            }}
          >
            The Compliance Agent is unlimited on all paid tiers — no credits
            consumed.
          </p>
        </div>
      </section>

      {/* FAQ */}
      <section className="py-20">
        <div className="container max-w-2xl mx-auto">
          <h2
            className="mb-8 text-center"
            style={{
              fontFamily: "'Fraunces', serif",
              fontWeight: 600,
              fontSize: "1.75rem",
              color: "oklch(0.90 0.018 75)",
            }}
          >
            Common questions
          </h2>
          <div>
            {FAQS.map((faq) => (
              <FaqItem key={faq.q} q={faq.q} a={faq.a} />
            ))}
          </div>
        </div>
      </section>

      {/* Bottom CTA */}
      <section
        id="waitlist"
        className="py-20 text-center"
        style={{ background: "oklch(0.13 0.008 60)" }}
      >
        <div className="container max-w-2xl mx-auto">
          <p
            className="section-label mb-4"
            style={{ fontFamily: "'Lato', sans-serif" }}
          >
            Early Access
          </p>
          <h2
            style={{
              fontFamily: "'Fraunces', serif",
              fontWeight: 700,
              fontSize: "clamp(1.75rem, 3vw, 2.5rem)",
              color: "oklch(0.95 0.018 75)",
              lineHeight: 1.1,
            }}
          >
            You are the must.
            <br />
            <em style={{ color: "oklch(0.72 0.12 75)", fontStyle: "italic" }}>
              Ownology is the ferment.
            </em>
          </h2>
          <p
            className="mt-4 mb-8"
            style={{
              fontFamily: "'Lato', sans-serif",
              fontWeight: 300,
              color: "oklch(0.60 0.015 75)",
              lineHeight: 1.7,
            }}
          >
            Join the waitlist for early access and founding member pricing.
            First 99 paid subscribers receive lifetime locked rates and a
            permanent founding badge.
          </p>
          <Link
            href="/"
            className="inline-block px-8 py-3.5 rounded-sm text-sm transition-all duration-200"
            style={{
              background: "oklch(0.72 0.12 75)",
              color: "oklch(0.11 0.008 60)",
              fontFamily: "'Lato', sans-serif",
              fontWeight: 600,
              letterSpacing: "0.08em",
              textTransform: "uppercase",
            }}
            onMouseEnter={(e) => {
              (e.currentTarget as HTMLAnchorElement).style.background =
                "oklch(0.78 0.13 75)";
            }}
            onMouseLeave={(e) => {
              (e.currentTarget as HTMLAnchorElement).style.background =
                "oklch(0.72 0.12 75)";
            }}
          >
            Join the Waitlist
          </Link>
        </div>
      </section>

      {/* Footer note */}
      <div
        className="py-6 text-center"
        style={{ borderTop: "1px solid oklch(1 0 0 / 6%)" }}
      >
        <p
          className="text-xs"
          style={{
            fontFamily: "'Lato', sans-serif",
            fontWeight: 300,
            color: "oklch(0.40 0.010 75)",
          }}
        >
          All prices in AUD. USD pricing available for international customers.
          Founding member pricing locked for life. No credit card required for
          Free Run.
        </p>
      </div>
    </div>
  );
}
