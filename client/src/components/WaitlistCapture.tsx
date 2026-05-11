/*
 * OWNOLOGY — WaitlistCapture Component
 * Submits email to the Buttondown API via a secure tRPC backend proxy.
 * Features: animated loading spinner, fade-in success message, inline error state.
 * Design: Dark artisan — amber gold accents, Fraunces + Lato typography.
 */

import { useEffect, useRef, useState } from "react";
import { trpc } from "@/lib/trpc";

interface WaitlistCaptureProps {
  variant?: "hero" | "cta" | "nav";
  className?: string;
}

// ── Spinner SVG ───────────────────────────────────────────────────────────────
function Spinner({ size = 16, color = "currentColor" }: { size?: number; color?: string }) {
  return (
    <svg
      width={size}
      height={size}
      viewBox="0 0 24 24"
      fill="none"
      aria-hidden="true"
      style={{ animation: "spin 0.75s linear infinite", flexShrink: 0 }}
    >
      <circle
        cx="12" cy="12" r="10"
        stroke={color}
        strokeWidth="2.5"
        strokeLinecap="round"
        strokeDasharray="40 20"
      />
    </svg>
  );
}

// ── Animated checkmark ────────────────────────────────────────────────────────
function AnimatedCheck({ size = 22 }: { size?: number }) {
  return (
    <svg
      width={size}
      height={size}
      viewBox="0 0 24 24"
      fill="none"
      aria-hidden="true"
      style={{ flexShrink: 0 }}
    >
      <circle
        cx="12" cy="12" r="11"
        stroke="oklch(0.72 0.12 75)"
        strokeWidth="1.5"
        style={{ animation: "checkCircle 0.4s ease-out forwards" }}
      />
      <path
        d="M7 12.5l3.5 3.5 6.5-7"
        stroke="oklch(0.72 0.12 75)"
        strokeWidth="2"
        strokeLinecap="round"
        strokeLinejoin="round"
        style={{
          strokeDasharray: 20,
          strokeDashoffset: 20,
          animation: "checkMark 0.35s ease-out 0.25s forwards",
        }}
      />
    </svg>
  );
}

export default function WaitlistCapture({ variant = "hero", className = "" }: WaitlistCaptureProps) {
  const [email, setEmail] = useState("");
  const [localError, setLocalError] = useState("");
  const inputRef = useRef<HTMLInputElement>(null);

  const subscribe = trpc.waitlist.subscribe.useMutation({
    onError: (err) => {
      setLocalError(err.message || "Something went wrong. Please try again.");
    },
  });

  const validateEmail = (e: string) =>
    /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(e.trim());

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    const trimmed = email.trim();
    setLocalError("");

    if (!validateEmail(trimmed)) {
      setLocalError("Please enter a valid email address.");
      inputRef.current?.focus();
      return;
    }

    subscribe.mutate({ email: trimmed });
  };

  const isLoading = subscribe.isPending;
  const isSuccess = subscribe.isSuccess;
  const isError = subscribe.isError || !!localError;
  const errorMsg = localError || subscribe.error?.message || "";
  const successMsg = subscribe.data?.message || "You're on the list.";

  // Auto-focus input on mount for nav variant
  useEffect(() => {
    if (variant === "nav") return; // nav handles its own layout
  }, [variant]);

  // ── Success state — shared across all variants ─────────────────────────────
  if (isSuccess) {
    if (variant === "nav") {
      return (
        <div
          className={`flex items-center gap-2 ${className}`}
          style={{
            background: "oklch(0.72 0.12 75 / 10%)",
            border: "1px solid oklch(0.72 0.12 75 / 35%)",
            borderRadius: "3px",
            padding: "0.5rem 1rem",
            animation: "fadeInUp 0.4s ease-out forwards",
          }}
        >
          <AnimatedCheck size={16} />
          <span style={{
            fontFamily: "'Lato', sans-serif",
            fontSize: "0.8125rem",
            color: "oklch(0.82 0.018 75)",
            fontWeight: 400,
          }}>
            You're on the list!
          </span>
        </div>
      );
    }

    return (
      <div
        className={`${className}`}
        style={{ animation: "fadeInUp 0.45s ease-out forwards" }}
      >
        {/* Success card */}
        <div
          style={{
            background: "oklch(0.72 0.12 75 / 8%)",
            border: "1px solid oklch(0.72 0.12 75 / 30%)",
            borderRadius: "4px",
            padding: "1.25rem 1.5rem",
            display: "flex",
            alignItems: "flex-start",
            gap: "1rem",
          }}
        >
          <AnimatedCheck size={24} />
          <div>
            <p style={{
              fontFamily: "'Fraunces', serif",
              fontWeight: 600,
              fontSize: "1.0625rem",
              color: "oklch(0.92 0.018 75)",
              marginBottom: "0.25rem",
              lineHeight: 1.3,
            }}>
              {successMsg}
            </p>
            <p style={{
              fontFamily: "'Lato', sans-serif",
              fontWeight: 300,
              fontSize: "0.875rem",
              color: "oklch(0.65 0.015 75)",
              lineHeight: 1.5,
            }}>
              We'll reach out to{" "}
              <span style={{ color: "oklch(0.72 0.12 75)", fontWeight: 400 }}>
                {email}
              </span>{" "}
              when early access opens.
            </p>
          </div>
        </div>
      </div>
    );
  }

  // ── Nav variant — compact inline ──────────────────────────────────────────
  if (variant === "nav") {
    return (
      <form onSubmit={handleSubmit} className={`flex items-center gap-2 ${className}`} noValidate>
        <div style={{ position: "relative" }}>
          <input
            ref={inputRef}
            type="email"
            value={email}
            onChange={e => { setEmail(e.target.value); setLocalError(""); subscribe.reset(); }}
            placeholder="your@email.com"
            aria-label="Email address for waitlist"
            aria-invalid={isError}
            disabled={isLoading}
            style={{
              background: "oklch(0.16 0.010 60)",
              border: `1px solid ${isError ? "oklch(0.65 0.20 25)" : "oklch(1 0 0 / 15%)"}`,
              borderRadius: "2px",
              padding: "0.5rem 0.875rem",
              fontFamily: "'Lato', sans-serif",
              fontSize: "0.8125rem",
              color: "oklch(0.88 0.015 75)",
              outline: "none",
              width: "180px",
              transition: "border-color 0.2s, opacity 0.2s",
              opacity: isLoading ? 0.6 : 1,
            }}
            onFocus={e => (e.currentTarget.style.borderColor = "oklch(0.72 0.12 75 / 60%)")}
            onBlur={e => (e.currentTarget.style.borderColor = isError ? "oklch(0.65 0.20 25)" : "oklch(1 0 0 / 15%)")}
          />
        </div>
        <button
          type="submit"
          disabled={isLoading}
          className="btn-amber"
          aria-label={isLoading ? "Submitting your email…" : "Join the waitlist"}
          style={{
            padding: "0.5rem 1.25rem",
            fontSize: "0.6875rem",
            opacity: isLoading ? 0.85 : 1,
            cursor: isLoading ? "wait" : "pointer",
            minWidth: "100px",
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            gap: "0.4rem",
            transition: "opacity 0.2s",
          }}
        >
          {isLoading ? (
            <>
              <Spinner size={13} />
              <span>Joining…</span>
            </>
          ) : "Join Waitlist"}
        </button>
      </form>
    );
  }

  // ── Hero / CTA variant — full width ───────────────────────────────────────
  return (
    <div className={className}>
      <form onSubmit={handleSubmit} className="flex flex-col sm:flex-row gap-3" noValidate>
        <div className="flex-1 relative">
          <input
            ref={inputRef}
            type="email"
            value={email}
            onChange={e => { setEmail(e.target.value); setLocalError(""); subscribe.reset(); }}
            placeholder="Enter your email address"
            aria-label="Email address for waitlist"
            aria-invalid={isError}
            aria-describedby={isError ? "waitlist-error" : undefined}
            disabled={isLoading}
            style={{
              width: "100%",
              background: "oklch(0.16 0.010 60)",
              border: `1px solid ${isError ? "oklch(0.65 0.20 25)" : "oklch(1 0 0 / 18%)"}`,
              borderRadius: "2px",
              padding: "0.875rem 1.25rem",
              fontFamily: "'Lato', sans-serif",
              fontWeight: 300,
              fontSize: "0.9375rem",
              color: "oklch(0.88 0.015 75)",
              outline: "none",
              transition: "border-color 0.2s, opacity 0.2s",
              opacity: isLoading ? 0.6 : 1,
            }}
            onFocus={e => (e.currentTarget.style.borderColor = "oklch(0.72 0.12 75 / 60%)")}
            onBlur={e => (e.currentTarget.style.borderColor = isError ? "oklch(0.65 0.20 25)" : "oklch(1 0 0 / 18%)")}
          />
        </div>
        <button
          type="submit"
          disabled={isLoading}
          className="btn-amber flex-shrink-0"
          aria-label={isLoading ? "Submitting your email…" : "Join the waitlist"}
          style={{
            padding: "0.875rem 2rem",
            opacity: isLoading ? 0.85 : 1,
            cursor: isLoading ? "wait" : "pointer",
            minWidth: "160px",
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            gap: "0.5rem",
            transition: "opacity 0.2s",
          }}
        >
          {isLoading ? (
            <>
              <Spinner size={16} />
              <span>Joining…</span>
            </>
          ) : "Join the Waitlist"}
        </button>
      </form>

      {/* Error message */}
      {isError && errorMsg && (
        <p
          id="waitlist-error"
          role="alert"
          style={{
            fontFamily: "'Lato', sans-serif",
            fontSize: "0.8125rem",
            color: "oklch(0.72 0.18 25)",
            marginTop: "0.5rem",
            animation: "fadeInUp 0.25s ease-out forwards",
          }}
        >
          {errorMsg}
        </p>
      )}

      {/* Reassurance line */}
      {!isError && !isLoading && (
        <p style={{
          fontFamily: "'Lato', sans-serif",
          fontWeight: 300,
          fontSize: "0.8125rem",
          color: "oklch(0.48 0.010 75)",
          marginTop: "0.625rem",
        }}>
          No credit card. No spam. Be first to access when we launch.
        </p>
      )}

      {/* Loading reassurance */}
      {isLoading && (
        <p style={{
          fontFamily: "'Lato', sans-serif",
          fontWeight: 300,
          fontSize: "0.8125rem",
          color: "oklch(0.55 0.012 75)",
          marginTop: "0.625rem",
          animation: "fadeInUp 0.2s ease-out forwards",
        }}>
          Adding you to the list…
        </p>
      )}
    </div>
  );
}
