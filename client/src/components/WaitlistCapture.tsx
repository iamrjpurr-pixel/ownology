/*
 * OWNOLOGY — WaitlistCapture Component
 * Submits email to the Buttondown API via a secure tRPC backend proxy.
 * Design: Dark artisan — amber gold accents, Fraunces + Lato typography.
 */

import { useState } from "react";
import { trpc } from "@/lib/trpc";

interface WaitlistCaptureProps {
  variant?: "hero" | "cta" | "nav";
  className?: string;
}

export default function WaitlistCapture({ variant = "hero", className = "" }: WaitlistCaptureProps) {
  const [email, setEmail] = useState("");
  const [localError, setLocalError] = useState("");

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
      return;
    }

    subscribe.mutate({ email: trimmed });
  };

  const isLoading = subscribe.isPending;
  const isSuccess = subscribe.isSuccess;
  const isError = subscribe.isError || !!localError;
  const errorMsg = localError || subscribe.error?.message || "";

  // ── Success state ──────────────────────────────────────────────────────────
  if (isSuccess) {
    return (
      <div
        className={`flex items-center gap-3 ${className}`}
        style={{
          background: "oklch(0.72 0.12 75 / 10%)",
          border: "1px solid oklch(0.72 0.12 75 / 35%)",
          borderRadius: "4px",
          padding: variant === "nav" ? "0.5rem 1rem" : "0.875rem 1.25rem",
        }}
      >
        <svg width="18" height="18" viewBox="0 0 18 18" fill="none" aria-hidden="true" className="flex-shrink-0">
          <circle cx="9" cy="9" r="8.5" stroke="oklch(0.72 0.12 75)" strokeWidth="1"/>
          <path d="M5.5 9l2.5 2.5 4.5-4.5" stroke="oklch(0.72 0.12 75)" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"/>
        </svg>
        <p style={{
          fontFamily: "'Lato', sans-serif",
          fontWeight: 400,
          fontSize: variant === "nav" ? "0.8125rem" : "0.9375rem",
          color: "oklch(0.82 0.018 75)",
          lineHeight: 1.4,
        }}>
          {subscribe.data?.message || "You're on the list."}{" "}
          <span style={{ color: "oklch(0.72 0.12 75)" }}>We'll be in touch soon.</span>
        </p>
      </div>
    );
  }

  // ── Nav variant — compact inline ──────────────────────────────────────────
  if (variant === "nav") {
    return (
      <form onSubmit={handleSubmit} className={`flex items-center gap-2 ${className}`} noValidate>
        <input
          type="email"
          value={email}
          onChange={e => { setEmail(e.target.value); setLocalError(""); subscribe.reset(); }}
          placeholder="your@email.com"
          aria-label="Email address for waitlist"
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
            transition: "border-color 0.2s",
          }}
          onFocus={e => (e.currentTarget.style.borderColor = "oklch(0.72 0.12 75 / 60%)")}
          onBlur={e => (e.currentTarget.style.borderColor = isError ? "oklch(0.65 0.20 25)" : "oklch(1 0 0 / 15%)")}
        />
        <button
          type="submit"
          disabled={isLoading}
          className="btn-amber"
          style={{ padding: "0.5rem 1.25rem", fontSize: "0.6875rem", opacity: isLoading ? 0.7 : 1 }}
        >
          {isLoading ? "..." : "Join Waitlist"}
        </button>
      </form>
    );
  }

  // ── Hero / CTA variant — full width stacked ───────────────────────────────
  return (
    <div className={className}>
      <form onSubmit={handleSubmit} className="flex flex-col sm:flex-row gap-3" noValidate>
        <div className="flex-1 relative">
          <input
            type="email"
            value={email}
            onChange={e => { setEmail(e.target.value); setLocalError(""); subscribe.reset(); }}
            placeholder="Enter your email address"
            aria-label="Email address for waitlist"
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
              transition: "border-color 0.2s",
            }}
            onFocus={e => (e.currentTarget.style.borderColor = "oklch(0.72 0.12 75 / 60%)")}
            onBlur={e => (e.currentTarget.style.borderColor = isError ? "oklch(0.65 0.20 25)" : "oklch(1 0 0 / 18%)")}
          />
        </div>
        <button
          type="submit"
          disabled={isLoading}
          className="btn-amber flex-shrink-0"
          style={{
            padding: "0.875rem 2rem",
            opacity: isLoading ? 0.7 : 1,
            cursor: isLoading ? "wait" : "pointer",
          }}
        >
          {isLoading ? (
            <span className="flex items-center gap-2">
              <svg className="animate-spin" width="14" height="14" viewBox="0 0 14 14" fill="none" aria-hidden="true">
                <circle cx="7" cy="7" r="6" stroke="currentColor" strokeWidth="1.5" strokeDasharray="28" strokeDashoffset="10"/>
              </svg>
              Joining...
            </span>
          ) : "Join the Waitlist"}
        </button>
      </form>

      {/* Error message */}
      {isError && errorMsg && (
        <p style={{
          fontFamily: "'Lato', sans-serif",
          fontSize: "0.8125rem",
          color: "oklch(0.75 0.18 25)",
          marginTop: "0.5rem",
        }}>
          {errorMsg}
        </p>
      )}

      {/* Reassurance line */}
      {!isError && (
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
    </div>
  );
}
