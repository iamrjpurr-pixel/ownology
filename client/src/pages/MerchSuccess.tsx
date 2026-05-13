/**
 * Ownology Merch — Order Success page (/merch/success)
 * Shown after a successful Stripe Checkout session.
 */

import OwnologyLogo from "@/components/OwnologyLogo";

export default function MerchSuccess() {
  return (
    <div
      className="min-h-screen flex flex-col items-center justify-center px-4"
      style={{ background: "oklch(0.11 0.008 60)", color: "oklch(0.90 0.015 75)" }}
    >
      {/* Logo */}
      <div className="mb-8">
        <OwnologyLogo size={48} />
      </div>

      {/* Seal icon */}
      <div
        className="w-20 h-20 rounded-full flex items-center justify-center mb-6"
        style={{
          background: "oklch(0.72 0.12 75 / 12%)",
          border: "2px solid oklch(0.72 0.12 75 / 40%)",
        }}
      >
        <svg width="36" height="36" viewBox="0 0 36 36" fill="none" aria-hidden="true">
          <path
            d="M8 18l7 7L28 11"
            stroke="oklch(0.72 0.12 75)"
            strokeWidth="2.5"
            strokeLinecap="round"
            strokeLinejoin="round"
          />
        </svg>
      </div>

      <h1
        className="text-center mb-3"
        style={{
          fontFamily: "'Fraunces', serif",
          fontWeight: 700,
          fontSize: "clamp(1.8rem, 4vw, 2.5rem)",
          color: "oklch(0.95 0.018 75)",
          letterSpacing: "-0.02em",
        }}
      >
        Order confirmed.
      </h1>

      <p
        className="text-center max-w-md mb-2"
        style={{
          fontFamily: "'Lato', sans-serif",
          fontWeight: 300,
          fontSize: "1rem",
          color: "oklch(0.65 0.012 75)",
          lineHeight: 1.7,
        }}
      >
        Thank you for your order. A confirmation has been sent to your email. Your merch
        will be fulfilled and dispatched within 5–8 business days.
      </p>

      <p
        className="text-center max-w-md mb-10"
        style={{
          fontFamily: "'Lato', sans-serif",
          fontWeight: 300,
          fontSize: "0.875rem",
          color: "oklch(0.50 0.010 75)",
          lineHeight: 1.7,
        }}
      >
        If you are a Founding Member, your notebook and bottle label sticker will be
        included in your welcome pack.
      </p>

      <div className="flex flex-col sm:flex-row gap-3">
        <a
          href="/merch"
          className="px-8 py-3 text-sm tracking-widest uppercase text-center rounded-sm transition-all duration-200"
          style={{
            fontFamily: "'Lato', sans-serif",
            fontWeight: 600,
            letterSpacing: "0.12em",
            background: "oklch(0.72 0.12 75)",
            color: "oklch(0.10 0.008 60)",
            textDecoration: "none",
          }}
          onMouseEnter={(e) => (e.currentTarget.style.background = "oklch(0.78 0.14 75)")}
          onMouseLeave={(e) => (e.currentTarget.style.background = "oklch(0.72 0.12 75)")}
        >
          Shop More
        </a>
        <a
          href="/"
          className="px-8 py-3 text-sm tracking-widest uppercase text-center rounded-sm transition-all duration-200"
          style={{
            fontFamily: "'Lato', sans-serif",
            fontWeight: 400,
            letterSpacing: "0.12em",
            background: "transparent",
            border: "1px solid oklch(0.72 0.12 75 / 30%)",
            color: "oklch(0.72 0.12 75)",
            textDecoration: "none",
          }}
          onMouseEnter={(e) => (e.currentTarget.style.borderColor = "oklch(0.72 0.12 75 / 60%)")}
          onMouseLeave={(e) => (e.currentTarget.style.borderColor = "oklch(0.72 0.12 75 / 30%)")}
        >
          Back to Ownology
        </a>
      </div>
    </div>
  );
}
