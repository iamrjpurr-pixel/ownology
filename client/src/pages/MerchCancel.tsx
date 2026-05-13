/**
 * Ownology Merch — Order Cancelled page (/merch/cancel or /merch?cancelled=1)
 * Shown when a user cancels out of Stripe Checkout.
 */

import OwnologyLogo from "@/components/OwnologyLogo";

export default function MerchCancel() {
  return (
    <div
      className="min-h-screen flex flex-col items-center justify-center px-4"
      style={{ background: "oklch(0.11 0.008 60)", color: "oklch(0.90 0.015 75)" }}
    >
      {/* Logo */}
      <div className="mb-8">
        <OwnologyLogo size={48} />
      </div>

      {/* Icon */}
      <div
        className="w-20 h-20 rounded-full flex items-center justify-center mb-6"
        style={{
          background: "oklch(0.20 0.008 60)",
          border: "2px solid oklch(0.72 0.12 75 / 20%)",
        }}
      >
        <svg width="36" height="36" viewBox="0 0 36 36" fill="none" aria-hidden="true">
          <path
            d="M12 12l12 12M24 12L12 24"
            stroke="oklch(0.65 0.012 75)"
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
          color: "oklch(0.95 0.018 75)",
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
          color: "oklch(0.65 0.012 75)",
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
            background: "oklch(0.72 0.12 75)",
            color: "oklch(0.10 0.008 60)",
            textDecoration: "none",
          }}
          onMouseEnter={(e) => (e.currentTarget.style.background = "oklch(0.78 0.14 75)")}
          onMouseLeave={(e) => (e.currentTarget.style.background = "oklch(0.72 0.12 75)")}
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
