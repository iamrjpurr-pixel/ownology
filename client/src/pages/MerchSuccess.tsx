/**
 * Ownology Merch — Order Success page (/merch/success)
 * Shown after a successful Stripe Checkout session.
 */

import OwnologyLogo from "@/components/OwnologyLogo";
import { useConversionAttribution } from "@/hooks/useConversionAttribution";

export default function MerchSuccess() {
  useConversionAttribution();
  return (
    <div
      className="min-h-screen flex flex-col items-center justify-center px-4"
      style={{ background: "var(--ow-bg-base)", color: "var(--ow-text-hi)" }}
    >
      {/* Logo */}
      <div className="mb-8">
        <OwnologyLogo size={48} />
      </div>

      {/* Seal icon */}
      <div
        className="w-20 h-20 rounded-full flex items-center justify-center mb-6"
        style={{
          background: "color-mix(in oklch, var(--ow-amber) 12%, transparent)",
          border: "2px solid color-mix(in oklch, var(--ow-amber) 40%, transparent)",
        }}
      >
        <svg width="36" height="36" viewBox="0 0 36 36" fill="none" aria-hidden="true">
          <path
            d="M8 18l7 7L28 11"
            stroke="var(--ow-amber)"
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
          color: "var(--ow-text-hi)",
          letterSpacing: "-0.02em",
          textWrap: "balance" as "balance",
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
          color: "var(--ow-text-lo)",
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
          color: "var(--ow-text-lo)",
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
            background: "var(--ow-amber)",
            color: "oklch(0.10 0.008 60)",
            textDecoration: "none",
          }}
          onMouseEnter={(e) => (e.currentTarget.style.background = "var(--ow-amber)")}
          onMouseLeave={(e) => (e.currentTarget.style.background = "var(--ow-amber)")}
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
            border: "1px solid color-mix(in oklch, var(--ow-amber) 30%, transparent)",
            color: "var(--ow-amber)",
            textDecoration: "none",
          }}
          onMouseEnter={(e) => (e.currentTarget.style.borderColor = "color-mix(in oklch, var(--ow-amber) 60%, transparent)")}
          onMouseLeave={(e) => (e.currentTarget.style.borderColor = "color-mix(in oklch, var(--ow-amber) 30%, transparent)")}
        >
          Back to Ownology
        </a>
      </div>
    </div>
  );
}
