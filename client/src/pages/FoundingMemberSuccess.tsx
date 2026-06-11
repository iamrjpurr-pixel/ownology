/**
 * OWNOLOGY — /founding-member/success
 * Post-Stripe-checkout success page for founding member subscriptions.
 */

import { Link } from "wouter";
import OwnologyLogo from "@/components/OwnologyLogo";

export default function FoundingMemberSuccess() {
  return (
    <div
      className="min-h-screen flex flex-col items-center justify-center px-4"
      style={{ background: "oklch(0.11 0.008 60)", color: "oklch(0.90 0.018 75)" }}
    >
      {/* Logo */}
      <div className="mb-8">
        <OwnologyLogo size={48} />
      </div>

      {/* Seal */}
      <div
        className="w-20 h-20 rounded-full flex items-center justify-center mb-6"
        style={{
          background: "oklch(0.72 0.12 75 / 15%)",
          border: "2px solid oklch(0.72 0.12 75 / 40%)",
        }}
      >
        <svg
          width="36"
          height="36"
          viewBox="0 0 24 24"
          fill="none"
          stroke="oklch(0.72 0.12 75)"
          strokeWidth="1.5"
          strokeLinecap="round"
          strokeLinejoin="round"
        >
          <polyline points="20 6 9 17 4 12" />
        </svg>
      </div>

      {/* Heading */}
      <h1
        className="text-center mb-3"
        style={{
          fontFamily: "'Fraunces', serif",
          fontWeight: 700,
          fontSize: "clamp(1.75rem, 4vw, 2.5rem)",
          lineHeight: 1.1,
          color: "oklch(0.95 0.018 75)",
        }}
      >
        Welcome to the{" "}
        <em style={{ color: "oklch(0.72 0.12 75)", fontStyle: "italic" }}>cellar.</em>
      </h1>

      {/* Subheading */}
      <p
        className="text-center mb-2"
        style={{
          fontFamily: "'Lato', sans-serif",
          fontWeight: 300,
          fontSize: "1.05rem",
          lineHeight: 1.6,
          color: "oklch(0.65 0.015 75)",
          maxWidth: "480px",
        }}
      >
        Your founding member subscription is confirmed. You're among the first 99 winemakers
        to join Ownology — your pricing is locked for life.
      </p>

      {/* Divider */}
      <div
        className="my-8 w-full max-w-xs h-px"
        style={{ background: "oklch(1 0 0 / 8%)" }}
      />

      {/* What's next */}
      <div
        className="rounded-sm p-6 mb-8 w-full max-w-sm"
        style={{
          background: "oklch(0.14 0.009 60)",
          border: "1px solid oklch(1 0 0 / 10%)",
        }}
      >
        <p
          className="mb-4"
          style={{
            fontFamily: "'Lato', sans-serif",
            fontSize: "0.65rem",
            letterSpacing: "0.12em",
            textTransform: "uppercase",
            color: "oklch(0.72 0.12 75)",
          }}
        >
          What happens next
        </p>
        <ul className="flex flex-col gap-3">
          {[
            "You'll receive a confirmation email from Stripe.",
            "We'll send your Ownology welcome email within 24 hours.",
            "Your founding member number will be assigned once the app launches.",
            "You'll get early access before the public launch.",
          ].map((item, i) => (
            <li key={i} className="flex items-start gap-3">
              <span
                className="flex-shrink-0 w-5 h-5 rounded-sm flex items-center justify-center text-xs mt-0.5"
                style={{
                  background: "oklch(0.72 0.12 75 / 15%)",
                  color: "oklch(0.72 0.12 75)",
                  fontFamily: "'Fira Code', monospace",
                  fontSize: "0.6rem",
                }}
              >
                {i + 1}
              </span>
              <p
                style={{
                  fontFamily: "'Lato', sans-serif",
                  fontWeight: 300,
                  fontSize: "0.875rem",
                  lineHeight: 1.55,
                  color: "oklch(0.65 0.015 75)",
                }}
              >
                {item}
              </p>
            </li>
          ))}
        </ul>
      </div>

      {/* CTA */}
      <div className="flex flex-col sm:flex-row gap-3">
        <Link href="/compliance">
          <a
            className="px-6 py-3 rounded-sm text-sm font-medium text-center"
            style={{
              background: "oklch(0.72 0.12 75)",
              color: "oklch(0.11 0.008 60)",
              fontFamily: "'Lato', sans-serif",
              fontWeight: 600,
              letterSpacing: "0.06em",
              textTransform: "uppercase",
              textDecoration: "none",
            }}
          >
            Try the Compliance Agent
          </a>
        </Link>
        <Link href="/">
          <a
            className="px-6 py-3 rounded-sm text-sm text-center"
            style={{
              background: "transparent",
              color: "oklch(0.65 0.015 75)",
              fontFamily: "'Lato', sans-serif",
              fontWeight: 400,
              letterSpacing: "0.06em",
              textTransform: "uppercase",
              border: "1px solid oklch(1 0 0 / 15%)",
              textDecoration: "none",
            }}
          >
            Back to home
          </a>
        </Link>
      </div>

      {/* Fine print */}
      <p
        className="mt-10 text-center"
        style={{
          fontFamily: "'Lato', sans-serif",
          fontSize: "0.75rem",
          color: "oklch(0.40 0.010 60)",
          maxWidth: "400px",
          lineHeight: 1.6,
        }}
      >
        Questions? Email{" "}
        <a
          href="mailto:support@ownology.ai"
          style={{ color: "oklch(0.55 0.012 75)", textDecoration: "none" }}
        >
          support@ownology.ai
        </a>
        . Manage your subscription at any time via the Stripe customer portal.
      </p>
    </div>
  );
}
