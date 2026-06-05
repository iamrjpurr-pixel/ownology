import { useState } from "react";
import { Link } from "wouter";
import OwnologyLogo from "@/components/OwnologyLogo";
import { trpc } from "@/lib/trpc";

// ─── Gate component ───────────────────────────────────────────────────────────
function EmailGate({ onUnlock }: { onUnlock: () => void }) {
  const [email, setEmail] = useState("");
  const [status, setStatus] = useState<"idle" | "loading" | "success" | "error">("idle");
  const subscribeMutation = trpc.email.subscribe.useMutation();

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!email.trim() || status === "loading") return;
    setStatus("loading");
    try {
      await subscribeMutation.mutateAsync({
        email: email.trim(),
        source: "preview",
        tags: ["preview", "event-handout"],
      });
      setStatus("success");
      setTimeout(onUnlock, 800);
    } catch {
      setStatus("error");
    }
  };

  return (
    <div className="min-h-screen flex flex-col items-center justify-center px-4 py-16"
      style={{ background: "oklch(0.10 0.008 60)" }}>
      {/* Logo */}
      <div className="mb-10">
        <OwnologyLogo size={44} />
      </div>

      {/* Hero text */}
      <div className="text-center max-w-xl mb-10">
        <p className="mb-3" style={{
          fontFamily: "'Lato', sans-serif",
          fontWeight: 300,
          fontSize: "0.8125rem",
          letterSpacing: "0.14em",
          textTransform: "uppercase",
          color: "oklch(0.72 0.12 75)",
        }}>
          AI KNOWLEDGE ASSISTANT FOR WINEMAKERS
        </p>
        <h1 style={{
          fontFamily: "'Fraunces', serif",
          fontWeight: 700,
          fontSize: "clamp(2rem, 5vw, 3.25rem)",
          lineHeight: 1.08,
          color: "oklch(0.95 0.018 75)",
          letterSpacing: "-0.02em",
        }}>
          You are the must.<br />
          <em style={{ color: "oklch(0.72 0.12 75)", fontStyle: "italic" }}>
            Ownology is the ferment.
          </em>
        </h1>
        <p className="mt-5" style={{
          fontFamily: "'Lato', sans-serif",
          fontWeight: 300,
          fontSize: "1.0625rem",
          lineHeight: 1.7,
          color: "oklch(0.65 0.015 75)",
        }}>
          Built for harvest. Built for the winery floor. Enter your email to see the Ownology overview and winemaker education preview.
        </p>
      </div>

      {/* Urgency signal */}
      <div className="mb-8 px-5 py-2.5 rounded-sm text-center" style={{
        background: "oklch(0.72 0.12 75 / 10%)",
        border: "1px solid oklch(0.72 0.12 75 / 30%)",
      }}>
        <p style={{
          fontFamily: "'Lato', sans-serif",
          fontWeight: 400,
          fontSize: "0.875rem",
          color: "oklch(0.82 0.10 75)",
          letterSpacing: "0.02em",
        }}>
          First 99 founding members — lifetime pricing locked.
        </p>
      </div>

      {/* Email form */}
      {status === "success" ? (
        <div className="text-center py-6 px-8 rounded-sm" style={{
          background: "oklch(0.72 0.12 75 / 10%)",
          border: "1px solid oklch(0.72 0.12 75 / 30%)",
        }}>
          <p style={{ fontFamily: "'Fraunces', serif", fontWeight: 500, fontSize: "1.125rem", color: "oklch(0.95 0.018 75)" }}>
            You're on the list.
          </p>
          <p style={{ fontFamily: "'Lato', sans-serif", fontWeight: 300, fontSize: "0.875rem", color: "oklch(0.60 0.015 75)", marginTop: "0.5rem" }}>
            Opening your preview now…
          </p>
        </div>
      ) : (
        <form onSubmit={handleSubmit} className="flex flex-col sm:flex-row gap-3 w-full max-w-md">
          <input
            type="email"
            required
            value={email}
            onChange={e => setEmail(e.target.value)}
            placeholder="cellar@yourdomain.com"
            disabled={status === "loading"}
            style={{
              flex: 1,
              background: "oklch(0.16 0.010 60)",
              border: "1px solid oklch(1 0 0 / 12%)",
              borderRadius: "2px",
              padding: "0.75rem 1rem",
              fontFamily: "'Lato', sans-serif",
              fontSize: "0.9375rem",
              color: "oklch(0.90 0.018 75)",
              outline: "none",
            }}
            onFocus={e => (e.currentTarget.style.borderColor = "oklch(0.72 0.12 75)")}
            onBlur={e => (e.currentTarget.style.borderColor = "oklch(1 0 0 / 12%)")}
          />
          <button
            type="submit"
            disabled={status === "loading"}
            style={{
              background: "oklch(0.72 0.12 75)",
              color: "oklch(0.10 0.008 60)",
              fontFamily: "'Lato', sans-serif",
              fontWeight: 700,
              fontSize: "0.8125rem",
              letterSpacing: "0.1em",
              textTransform: "uppercase",
              padding: "0.75rem 1.75rem",
              borderRadius: "2px",
              border: "none",
              cursor: status === "loading" ? "not-allowed" : "pointer",
              opacity: status === "loading" ? 0.7 : 1,
              flexShrink: 0,
            }}
          >
            {status === "loading" ? "Opening…" : "See Ownology"}
          </button>
        </form>
      )}

      {status === "error" && (
        <p className="mt-3 text-sm" style={{ color: "oklch(0.65 0.15 25)", fontFamily: "'Lato', sans-serif" }}>
          Something went wrong. Email <a href="mailto:support@ownology.ai" style={{ color: "oklch(0.72 0.12 75)" }}>support@ownology.ai</a> directly.
        </p>
      )}

      {/* No credit card note */}
      <p className="mt-6" style={{
        fontFamily: "'Lato', sans-serif",
        fontWeight: 300,
        fontSize: "0.8125rem",
        color: "oklch(0.45 0.012 75)",
      }}>
        No credit card. No commitment. Just the idea.
      </p>
    </div>
  );
}

// ─── Content component (shown after gate) ────────────────────────────────────
function PreviewContent() {
  const [activeTab, setActiveTab] = useState<"brochure" | "education">("brochure");

  const tabStyle = (active: boolean) => ({
    fontFamily: "'Lato', sans-serif",
    fontWeight: active ? 600 : 300,
    fontSize: "0.875rem",
    letterSpacing: "0.08em",
    textTransform: "uppercase" as const,
    color: active ? "oklch(0.72 0.12 75)" : "oklch(0.55 0.015 75)",
    borderBottom: active ? "2px solid oklch(0.72 0.12 75)" : "2px solid transparent",
    paddingBottom: "0.5rem",
    cursor: "pointer",
    background: "none",
    border: "none",
    borderBottomWidth: "2px",
    borderBottomStyle: "solid" as const,
    borderBottomColor: active ? "oklch(0.72 0.12 75)" : "transparent",
  });

  return (
    <div className="min-h-screen" style={{ background: "oklch(0.10 0.008 60)" }}>
      {/* Header */}
      <header className="sticky top-0 z-40 py-4 px-6 flex items-center justify-between"
        style={{ background: "oklch(0.10 0.008 60 / 97%)", borderBottom: "1px solid oklch(1 0 0 / 6%)" }}>
        <OwnologyLogo size={32} />
        <Link href="/" style={{
          fontFamily: "'Lato', sans-serif",
          fontWeight: 300,
          fontSize: "0.8125rem",
          color: "oklch(0.55 0.015 75)",
          letterSpacing: "0.06em",
          textDecoration: "none",
        }}>
          Visit full site →
        </Link>
      </header>

      {/* Hero */}
      <div className="text-center px-6 pt-14 pb-10 max-w-2xl mx-auto">
        <p style={{
          fontFamily: "'Lato', sans-serif",
          fontWeight: 300,
          fontSize: "0.75rem",
          letterSpacing: "0.14em",
          textTransform: "uppercase",
          color: "oklch(0.72 0.12 75)",
          marginBottom: "1rem",
        }}>
          OWNOLOGY PREVIEW
        </p>
        <h2 style={{
          fontFamily: "'Fraunces', serif",
          fontWeight: 700,
          fontSize: "clamp(1.75rem, 4vw, 2.75rem)",
          lineHeight: 1.1,
          color: "oklch(0.95 0.018 75)",
          letterSpacing: "-0.02em",
        }}>
          The cellar intelligence platform<br />
          <em style={{ color: "oklch(0.72 0.12 75)", fontStyle: "italic" }}>built for winemakers.</em>
        </h2>
        <p className="mt-4" style={{
          fontFamily: "'Lato', sans-serif",
          fontWeight: 300,
          fontSize: "1rem",
          lineHeight: 1.7,
          color: "oklch(0.65 0.015 75)",
        }}>
          Instant, document-grounded answers to your toughest cellar questions — from a phone, in seconds, during harvest.
        </p>
      </div>

      {/* Tabs */}
      <div className="max-w-5xl mx-auto px-6">
        <div className="flex gap-8 mb-8" style={{ borderBottom: "1px solid oklch(1 0 0 / 8%)" }}>
          <button style={tabStyle(activeTab === "brochure")} onClick={() => setActiveTab("brochure")}>
            Winemaker Overview
          </button>
          <button style={tabStyle(activeTab === "education")} onClick={() => setActiveTab("education")}>
            Education Preview
          </button>
        </div>

        {/* Brochure tab */}
        {activeTab === "brochure" && (
          <div>
            <p className="mb-6" style={{
              fontFamily: "'Lato', sans-serif",
              fontWeight: 300,
              fontSize: "0.9375rem",
              color: "oklch(0.60 0.015 75)",
              lineHeight: 1.6,
            }}>
              The Ownology winemaker overview — what it is, who it is for, and why it matters at harvest.
            </p>
            {/* PDF embed */}
            <div style={{
              width: "100%",
              borderRadius: "4px",
              overflow: "hidden",
              border: "1px solid oklch(1 0 0 / 10%)",
              background: "oklch(0.13 0.008 60)",
            }}>
              <iframe
                src="/manus-storage/ownology-winemaker-brochure_f76878ef.pdf#toolbar=0&navpanes=0&scrollbar=0"
                style={{ width: "100%", height: "80vh", border: "none" }}
                title="Ownology Winemaker Brochure"
              />
            </div>
            {/* CTA below brochure */}
            <div className="mt-8 text-center pb-16">
              <p className="mb-4" style={{
                fontFamily: "'Lato', sans-serif",
                fontWeight: 300,
                fontSize: "0.9375rem",
                color: "oklch(0.60 0.015 75)",
              }}>
                Ready to be part of the first 99?
              </p>
              <Link href="/pricing">
                <button style={{
                  background: "oklch(0.72 0.12 75)",
                  color: "oklch(0.10 0.008 60)",
                  fontFamily: "'Lato', sans-serif",
                  fontWeight: 700,
                  fontSize: "0.8125rem",
                  letterSpacing: "0.1em",
                  textTransform: "uppercase",
                  padding: "0.875rem 2.5rem",
                  borderRadius: "2px",
                  border: "none",
                  cursor: "pointer",
                }}>
                  Secure Founding Member Pricing
                </button>
              </Link>
              <p className="mt-3" style={{
                fontFamily: "'Lato', sans-serif",
                fontWeight: 300,
                fontSize: "0.8125rem",
                color: "oklch(0.45 0.012 75)",
              }}>
                Or email <a href="mailto:winery@ownology.ai" style={{ color: "oklch(0.72 0.12 75)" }}>winery@ownology.ai</a> to talk directly with Richard.
              </p>
            </div>
          </div>
        )}

        {/* Education tab */}
        {activeTab === "education" && (
          <div className="pb-16">
            <p className="mb-8" style={{
              fontFamily: "'Lato', sans-serif",
              fontWeight: 300,
              fontSize: "0.9375rem",
              color: "oklch(0.60 0.015 75)",
              lineHeight: 1.6,
            }}>
              The science you studied is the foundation. Ownology is the layer that sits on top of it — translating that knowledge into real-time answers during harvest, when you need them most.
            </p>

            {/* Science domain cards */}
            <div className="grid md:grid-cols-2 gap-4 mb-10">
              {[
                {
                  domain: "Fermentation Biology",
                  icon: "🧫",
                  desc: "Yeast ecology, nitrogen nutrition, stuck fermentation risk — Ownology draws on this science to answer DAP, GoFerm, and inoculation questions in real time.",
                  example: "\"My YAN is 95 ppm at 24 Brix — what addition rate for this Grenache?\"",
                },
                {
                  domain: "SO₂ & Oxidation Chemistry",
                  icon: "⚗️",
                  desc: "Free SO₂, molecular SO₂, pH relationships, and oxidation windows — the science behind every addition decision from crush to bottling.",
                  example: "\"pH is 3.62, free SO₂ is 18 ppm — what do I add before pressing?\"",
                },
                {
                  domain: "Microbial Spoilage & MLF",
                  icon: "🔬",
                  desc: "Brettanomyces, acetic acid bacteria, Oenococcus — understanding the organisms that threaten your wine and the conditions that favour them.",
                  example: "\"VA is creeping up in Tank 3 — what are my intervention options?\"",
                },
                {
                  domain: "Sensory & Fault Detection",
                  icon: "👃",
                  desc: "Sensory thresholds, fault identification, and the chemistry behind what you smell and taste — applied at the bench every day.",
                  example: "\"There's a reductive note on this Shiraz — what's the likely cause?\"",
                },
              ].map(item => (
                <div key={item.domain} style={{
                  background: "oklch(0.14 0.010 60)",
                  border: "1px solid oklch(1 0 0 / 8%)",
                  borderRadius: "4px",
                  padding: "1.5rem",
                }}>
                  <div className="flex items-center gap-2 mb-3">
                    <span style={{ fontSize: "1.1rem" }}>{item.icon}</span>
                    <h3 style={{
                      fontFamily: "'Fraunces', serif",
                      fontWeight: 600,
                      fontSize: "1.0rem",
                      color: "oklch(0.90 0.018 75)",
                      lineHeight: 1.3,
                      margin: 0,
                    }}>
                      {item.domain}
                    </h3>
                  </div>
                  <p style={{
                    fontFamily: "'Lato', sans-serif",
                    fontWeight: 300,
                    fontSize: "0.875rem",
                    color: "oklch(0.60 0.015 75)",
                    lineHeight: 1.6,
                    marginBottom: "0.75rem",
                  }}>
                    {item.desc}
                  </p>
                  <p style={{
                    fontFamily: "'Fira Code', monospace",
                    fontSize: "0.75rem",
                    color: "oklch(0.72 0.12 75)",
                    lineHeight: 1.5,
                    fontStyle: "italic",
                  }}>
                    {item.example}
                  </p>
                </div>
              ))}
            </div>

            {/* Ownology gap callout */}
            <div className="p-6 rounded-sm mb-8" style={{
              background: "oklch(0.72 0.12 75 / 8%)",
              border: "1px solid oklch(0.72 0.12 75 / 25%)",
            }}>
              <p style={{
                fontFamily: "'Fraunces', serif",
                fontWeight: 500,
                fontSize: "1.125rem",
                color: "oklch(0.90 0.018 75)",
                lineHeight: 1.5,
                marginBottom: "0.75rem",
              }}>
                "The education section reminds us of the science we studied. Ownology answers the 2am question."
              </p>
              <p style={{
                fontFamily: "'Lato', sans-serif",
                fontWeight: 300,
                fontSize: "0.9375rem",
                color: "oklch(0.60 0.015 75)",
                lineHeight: 1.6,
              }}>
                The free-run science flows naturally from your training. But the cellar doesn't wait for office hours — it asks you at 2am, mid-vintage, with a stuck ferment in Tank 7. That is the gap Ownology fills: <em style={{ color: "oklch(0.80 0.015 75)" }}>the press that extracts the answer your knowledge already contains.</em>
              </p>
            </div>

            {/* CTA */}
            <div className="text-center">
              <Link href="/pricing">
                <button style={{
                  background: "oklch(0.72 0.12 75)",
                  color: "oklch(0.10 0.008 60)",
                  fontFamily: "'Lato', sans-serif",
                  fontWeight: 700,
                  fontSize: "0.8125rem",
                  letterSpacing: "0.1em",
                  textTransform: "uppercase",
                  padding: "0.875rem 2.5rem",
                  borderRadius: "2px",
                  border: "none",
                  cursor: "pointer",
                }}>
                  Secure Founding Member Pricing
                </button>
              </Link>
              <p className="mt-3" style={{
                fontFamily: "'Lato', sans-serif",
                fontWeight: 300,
                fontSize: "0.8125rem",
                color: "oklch(0.45 0.012 75)",
              }}>
                Or email <a href="mailto:winery@ownology.ai" style={{ color: "oklch(0.72 0.12 75)" }}>winery@ownology.ai</a> to talk directly with Richard.
              </p>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}

// ─── Main export ──────────────────────────────────────────────────────────────
export default function Preview() {
  const [unlocked, setUnlocked] = useState(false);

  // Check if already unlocked in session
  const [checked] = useState(() => {
    try {
      return sessionStorage.getItem("ownology_preview_unlocked") === "1";
    } catch {
      return false;
    }
  });

  const handleUnlock = () => {
    try {
      sessionStorage.setItem("ownology_preview_unlocked", "1");
    } catch {
      // ignore
    }
    setUnlocked(true);
  };

  if (unlocked || checked) {
    return <PreviewContent />;
  }

  return <EmailGate onUnlock={handleUnlock} />;
}
