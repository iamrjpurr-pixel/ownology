/**
 * Ownology Merch — Order Cancelled page (/merch/cancel or /merch?cancelled=1)
 * Shown when a user cancels out of Stripe Checkout.
 */

import OwnologyLogo from "@/components/OwnologyLogo";

export default function MerchCancel() {
  return (
    <div
      className="min-h-screen flex flex-col items-center justify-center px-4"
      style={{ background: "var(--ow-bg-base)", color: "var(--ow-text-hi)" }}
    >
      {/* Logo */}
      <div className="mb-8">
        <OwnologyLogo size={48} />
      </div>

      {/* Icon */}
      <div
        className="w-20 h-20 rounded-full flex items-center justify-center mb-6"
        style={{
          background: "var(--ow-bg-inset)",
          border: "2px solid color-mix(in oklch, var(--ow-amber) 20%, transparent)",
        }}
      >
        <svg width="36" height="36" viewBox="0 0 36 36" fill="none" aria-hidden="true">
          <path
            d="M12 12l12 12M24 12L12 24"
            stroke="var(--ow-text-lo)"
            strokeWidth="2.5"
            strokeLinecap="round"
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
        }}
      >
        Order cancelled.
      </h1>

      <p
        className="text-center max-w-md mb-10"
        style={{
          fontFamily: "'Lato', sans-serif",
          fontWeight: 300,
          fontSize: "1rem",
          color: "var(--ow-text-lo)",
          lineHeight: 1.7,
        }}
      >
        No charge was made. Your cart is waiting whenever you are ready.
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
          Return to Shop
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
