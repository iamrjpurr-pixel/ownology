/**
 * /waitlist — Professional tier waitlist for boutique winery operators
 * Audience: winery owners, head winemakers, cellar masters
 * Design: dark warm-black, amber gold accents, Fraunces serif, Lato body
 */

import { useState } from "react";
import { Link } from "wouter";
import { trpc } from "@/lib/trpc";
import { toast } from "sonner";
import OwnologyLogo from "@/components/OwnologyLogo";

// ─── Tier options ─────────────────────────────────────────────────────────────

const TIERS = [
  {
    id: "press" as const,
    name: "The Press",
    price: "$41/mo",
    annual: "$410/yr",
    description: "Full winemaking AI — SOPs, technique, vintage log, cellar tracking.",
    forWho: "Home winemakers and serious hobbyists",
    badge: null,
  },
  {
    id: "cellar_master" as const,
    name: "The Vigneron",
    price: "$83/mo",
    annual: "$830/yr",
    description: "Everything in The Press + 3 team seats, dedicated onboarding, annual knowledge review.",
    forWho: "Owner-operator boutique vignerons",
    badge: "Most popular",
  },
];

const PRODUCTION_OPTIONS = [
  "Under 1 tonne",
  "1–5 tonnes",
  "5–20 tonnes",
  "20–100 tonnes",
  "100+ tonnes",
];

// ─── Component ────────────────────────────────────────────────────────────────

export default function Waitlist() {
  const [selectedTier, setSelectedTier] = useState<"press" | "cellar_master">("cellar_master");
  const [form, setForm] = useState({
    name: "",
    email: "",
    wineryName: "",
    annualProduction: "",
    message: "",
  });
  const [submitted, setSubmitted] = useState(false);

  const joinMutation = trpc.leads.join.useMutation({
    onSuccess: () => {
      setSubmitted(true);
    },
    onError: (err) => {
      toast.error(err.message ?? "Something went wrong. Please try again.");
    },
  });

  function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!form.email) {
      toast.error("Email is required.");
      return;
    }
    joinMutation.mutate({
      email: form.email,
      name: form.name || undefined,
      wineryName: form.wineryName || undefined,
      annualProduction: form.annualProduction || undefined,
      tier: selectedTier,
      message: form.message || undefined,
    });
  }

  // ─── Success state ───────────────────────────────────────────────────────

  if (submitted) {
    return (
      <div
        className="min-h-screen flex flex-col"
        style={{ background: "oklch(0.11 0.008 60)", fontFamily: "'Lato', sans-serif" }}
      >
        {/* Nav */}
        <nav className="container flex items-center justify-between py-5">
          <Link href="/">
            <OwnologyLogo size={32} />
          </Link>
          <Link
            href="/pricing"
            className="text-sm"
            style={{ color: "oklch(0.55 0.012 75)", fontFamily: "'Lato', sans-serif" }}
          >
            ← Back to Pricing
          </Link>
        </nav>

        {/* Success message */}
        <div className="flex-1 flex items-center justify-center px-6">
          <div className="max-w-lg text-center">
            {/* Amber circle */}
            <div
              className="w-16 h-16 rounded-full flex items-center justify-center mx-auto mb-8"
              style={{ background: "oklch(0.72 0.12 75 / 15%)", border: "1px solid oklch(0.72 0.12 75 / 40%)" }}
            >
              <svg width="28" height="28" viewBox="0 0 28 28" fill="none">
                <path d="M6 14l6 6 10-12" stroke="oklch(0.72 0.12 75)" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
              </svg>
            </div>

            <h1
              className="mb-4"
              style={{
                fontFamily: "'Fraunces', serif",
                fontWeight: 700,
                fontSize: "2rem",
                color: "oklch(0.92 0.018 75)",
                letterSpacing: "-0.02em",
              }}
            >
              You're on the list.
            </h1>
            <p
              className="mb-8"
              style={{ color: "oklch(0.65 0.015 75)", lineHeight: 1.7, fontSize: "1rem" }}
            >
              We'll be in touch before the{" "}
              <em style={{ color: "oklch(0.72 0.12 75)", fontStyle: "italic" }}>
                {selectedTier === "cellar_master" ? "The Vigneron" : "The Press"}
              </em>{" "}
              tier opens. Expect a personal email — not a mass blast.
            </p>

            <div className="flex flex-col sm:flex-row gap-3 justify-center">
              <Link href="/free-run">
                <button
                  className="px-6 py-3 rounded text-sm font-medium"
                  style={{
                    background: "oklch(0.72 0.12 75)",
                    color: "oklch(0.10 0.008 60)",
                    fontFamily: "'Lato', sans-serif",
                  }}
                >
                  Try Free Run while you wait
                </button>
              </Link>
              <Link href="/">
                <button
                  className="px-6 py-3 rounded text-sm"
                  style={{
                    border: "1px solid oklch(0.72 0.12 75 / 30%)",
                    color: "oklch(0.65 0.015 75)",
                    fontFamily: "'Lato', sans-serif",
                  }}
                >
                  Back to home
                </button>
              </Link>
            </div>
          </div>
        </div>
      </div>
    );
  }

  // ─── Main form ───────────────────────────────────────────────────────────

  return (
    <div
      className="min-h-screen"
      style={{ background: "oklch(0.11 0.008 60)", fontFamily: "'Lato', sans-serif" }}
    >
      {/* Nav */}
      <nav className="container flex items-center justify-between py-5">
        <Link href="/">
          <OwnologyLogo size={32} />
        </Link>
        <Link
          href="/pricing"
          className="text-sm"
          style={{ color: "oklch(0.55 0.012 75)" }}
        >
          ← Back to Pricing
        </Link>
      </nav>

      <div className="container py-16 max-w-4xl mx-auto px-6">
        {/* Header */}
        <div className="mb-12">
          <p
            className="mb-4 text-xs tracking-widest uppercase"
            style={{ color: "oklch(0.72 0.12 75)", fontFamily: "'Lato', sans-serif" }}
          >
            Professional Tiers
          </p>
          <h1
            className="mb-4"
            style={{
              fontFamily: "'Fraunces', serif",
              fontWeight: 700,
              fontSize: "clamp(2rem, 4vw, 3rem)",
              color: "oklch(0.92 0.018 75)",
              letterSpacing: "-0.02em",
              lineHeight: 1.1,
            }}
          >
            Join the waitlist.
          </h1>
          <p
            style={{
              color: "oklch(0.65 0.015 75)",
              fontSize: "1.0625rem",
              lineHeight: 1.7,
              maxWidth: "520px",
            }}
          >
            Professional tiers open to a limited number of wineries in each region. We'll reach out personally before your spot opens.
          </p>
        </div>

        <div className="grid lg:grid-cols-5 gap-10">
          {/* Left: tier selection */}
          <div className="lg:col-span-2">
            <p
              className="text-xs uppercase tracking-widest mb-4"
              style={{ color: "oklch(0.50 0.012 75)" }}
            >
              Which tier interests you?
            </p>
            <div className="flex flex-col gap-3">
              {TIERS.map((tier) => (
                <button
                  key={tier.id}
                  onClick={() => setSelectedTier(tier.id)}
                  className="text-left p-4 rounded transition-all"
                  style={{
                    background:
                      selectedTier === tier.id
                        ? "oklch(0.16 0.012 60)"
                        : "oklch(0.14 0.010 60)",
                    border:
                      selectedTier === tier.id
                        ? "1px solid oklch(0.72 0.12 75 / 50%)"
                        : "1px solid oklch(1 0 0 / 8%)",
                  }}
                >
                  <div className="flex items-center justify-between mb-1">
                    <span
                      className="font-semibold text-sm"
                      style={{
                        color:
                          selectedTier === tier.id
                            ? "oklch(0.72 0.12 75)"
                            : "oklch(0.80 0.015 75)",
                        fontFamily: "'Fraunces', serif",
                      }}
                    >
                      {tier.name}
                    </span>
                    {tier.badge && (
                      <span
                        className="text-xs px-2 py-0.5 rounded"
                        style={{
                          background: "oklch(0.72 0.12 75 / 15%)",
                          color: "oklch(0.72 0.12 75)",
                          fontFamily: "'Lato', sans-serif",
                        }}
                      >
                        {tier.badge}
                      </span>
                    )}
                  </div>
                  <div
                    className="text-xs mb-2"
                    style={{ color: "oklch(0.55 0.012 75)" }}
                  >
                    {tier.price} · {tier.annual}/yr
                  </div>
                  <p
                    className="text-xs leading-relaxed"
                    style={{ color: "oklch(0.60 0.012 75)" }}
                  >
                    {tier.description}
                  </p>
                </button>
              ))}
            </div>

            {/* What you get while waiting */}
            <div
              className="mt-6 p-4 rounded"
              style={{
                background: "oklch(0.14 0.010 60)",
                border: "1px solid oklch(1 0 0 / 6%)",
              }}
            >
              <p
                className="text-xs uppercase tracking-widest mb-3"
                style={{ color: "oklch(0.50 0.012 75)" }}
              >
                While you wait
              </p>
              <p
                className="text-sm leading-relaxed"
                style={{ color: "oklch(0.65 0.015 75)" }}
              >
                Free Run is available now — unlimited wine curiosity questions, the Divine Trinity, and 3 questions per day at no cost.
              </p>
              <Link href="/free-run">
                <button
                  className="mt-3 text-xs"
                  style={{ color: "oklch(0.72 0.12 75)" }}
                >
                  Try Free Run →
                </button>
              </Link>
            </div>
          </div>

          {/* Right: form */}
          <div className="lg:col-span-3">
            <form onSubmit={handleSubmit} className="flex flex-col gap-5">
              {/* Name */}
              <div>
                <label
                  className="block text-xs uppercase tracking-widest mb-2"
                  style={{ color: "oklch(0.55 0.012 75)" }}
                >
                  Your name
                </label>
                <input
                  type="text"
                  value={form.name}
                  onChange={(e) => setForm((f) => ({ ...f, name: e.target.value }))}
                  placeholder="Jane Smith"
                  className="w-full px-4 py-3 rounded text-sm outline-none"
                  style={{
                    background: "oklch(0.14 0.010 60)",
                    border: "1px solid oklch(1 0 0 / 10%)",
                    color: "oklch(0.88 0.015 75)",
                    fontFamily: "'Lato', sans-serif",
                  }}
                  onFocus={(e) =>
                    (e.currentTarget.style.borderColor = "oklch(0.72 0.12 75 / 50%)")
                  }
                  onBlur={(e) =>
                    (e.currentTarget.style.borderColor = "oklch(1 0 0 / 10%)")
                  }
                />
              </div>

              {/* Email */}
              <div>
                <label
                  className="block text-xs uppercase tracking-widest mb-2"
                  style={{ color: "oklch(0.55 0.012 75)" }}
                >
                  Email address <span style={{ color: "oklch(0.72 0.12 75)" }}>*</span>
                </label>
                <input
                  type="email"
                  required
                  value={form.email}
                  onChange={(e) => setForm((f) => ({ ...f, email: e.target.value }))}
                  placeholder="jane@yourwinery.com.au"
                  className="w-full px-4 py-3 rounded text-sm outline-none"
                  style={{
                    background: "oklch(0.14 0.010 60)",
                    border: "1px solid oklch(1 0 0 / 10%)",
                    color: "oklch(0.88 0.015 75)",
                    fontFamily: "'Lato', sans-serif",
                  }}
                  onFocus={(e) =>
                    (e.currentTarget.style.borderColor = "oklch(0.72 0.12 75 / 50%)")
                  }
                  onBlur={(e) =>
                    (e.currentTarget.style.borderColor = "oklch(1 0 0 / 10%)")
                  }
                />
              </div>

              {/* Winery name */}
              <div>
                <label
                  className="block text-xs uppercase tracking-widest mb-2"
                  style={{ color: "oklch(0.55 0.012 75)" }}
                >
                  Winery name
                </label>
                <input
                  type="text"
                  value={form.wineryName}
                  onChange={(e) => setForm((f) => ({ ...f, wineryName: e.target.value }))}
                  placeholder="Blackwood Estate Wines"
                  className="w-full px-4 py-3 rounded text-sm outline-none"
                  style={{
                    background: "oklch(0.14 0.010 60)",
                    border: "1px solid oklch(1 0 0 / 10%)",
                    color: "oklch(0.88 0.015 75)",
                    fontFamily: "'Lato', sans-serif",
                  }}
                  onFocus={(e) =>
                    (e.currentTarget.style.borderColor = "oklch(0.72 0.12 75 / 50%)")
                  }
                  onBlur={(e) =>
                    (e.currentTarget.style.borderColor = "oklch(1 0 0 / 10%)")
                  }
                />
              </div>

              {/* Annual production */}
              <div>
                <label
                  className="block text-xs uppercase tracking-widest mb-2"
                  style={{ color: "oklch(0.55 0.012 75)" }}
                >
                  Annual production (approximate)
                </label>
                <div className="flex flex-wrap gap-2">
                  {PRODUCTION_OPTIONS.map((opt) => (
                    <button
                      key={opt}
                      type="button"
                      onClick={() =>
                        setForm((f) => ({
                          ...f,
                          annualProduction: f.annualProduction === opt ? "" : opt,
                        }))
                      }
                      className="px-3 py-1.5 rounded text-xs transition-all"
                      style={{
                        background:
                          form.annualProduction === opt
                            ? "oklch(0.72 0.12 75 / 15%)"
                            : "oklch(0.14 0.010 60)",
                        border:
                          form.annualProduction === opt
                            ? "1px solid oklch(0.72 0.12 75 / 50%)"
                            : "1px solid oklch(1 0 0 / 10%)",
                        color:
                          form.annualProduction === opt
                            ? "oklch(0.72 0.12 75)"
                            : "oklch(0.60 0.012 75)",
                        fontFamily: "'Lato', sans-serif",
                      }}
                    >
                      {opt}
                    </button>
                  ))}
                </div>
              </div>

              {/* Message */}
              <div>
                <label
                  className="block text-xs uppercase tracking-widest mb-2"
                  style={{ color: "oklch(0.55 0.012 75)" }}
                >
                  Anything you'd like us to know? <span style={{ color: "oklch(0.45 0.010 75)" }}>(optional)</span>
                </label>
                <textarea
                  value={form.message}
                  onChange={(e) => setForm((f) => ({ ...f, message: e.target.value }))}
                  placeholder="Current software, biggest pain points, what you're hoping Ownology can do for your cellar..."
                  rows={4}
                  className="w-full px-4 py-3 rounded text-sm outline-none resize-none"
                  style={{
                    background: "oklch(0.14 0.010 60)",
                    border: "1px solid oklch(1 0 0 / 10%)",
                    color: "oklch(0.88 0.015 75)",
                    fontFamily: "'Lato', sans-serif",
                    lineHeight: 1.6,
                  }}
                  onFocus={(e) =>
                    (e.currentTarget.style.borderColor = "oklch(0.72 0.12 75 / 50%)")
                  }
                  onBlur={(e) =>
                    (e.currentTarget.style.borderColor = "oklch(1 0 0 / 10%)")
                  }
                />
              </div>

              {/* Submit */}
              <button
                type="submit"
                disabled={joinMutation.isPending}
                className="w-full py-3.5 rounded text-sm font-medium transition-opacity"
                style={{
                  background: "oklch(0.72 0.12 75)",
                  color: "oklch(0.10 0.008 60)",
                  fontFamily: "'Lato', sans-serif",
                  opacity: joinMutation.isPending ? 0.6 : 1,
                }}
              >
                {joinMutation.isPending ? "Submitting..." : "Join the waitlist"}
              </button>

              <p
                className="text-xs text-center"
                style={{ color: "oklch(0.45 0.010 75)" }}
              >
                No spam. No mass emails. We'll reach out personally when your tier opens.
              </p>
            </form>
          </div>
        </div>
      </div>
    </div>
  );
}
