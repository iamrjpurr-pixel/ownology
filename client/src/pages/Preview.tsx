import { useState, useEffect } from "react";
import { Link } from "wouter";
import OwnologyLogo from "@/components/OwnologyLogo";
import { trpc } from "@/lib/trpc";

// ─── Gate component ───────────────────────────────────────────────────────────
function EmailGate({ onUnlock }: { onUnlock: () => void }) {
  const [email, setEmail] = useState("");
  const [name, setName] = useState("");
  const [wineryName, setWineryName] = useState("");
  const [status, setStatus] = useState<"idle" | "loading" | "success" | "error">("idle");
  const subscribeMutation = trpc.email.subscribe.useMutation();

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!email.trim() || status === "loading") return;
    setStatus("loading");
    try {
      await subscribeMutation.mutateAsync({
        email: email.trim(),
        name: name.trim() || undefined,
        wineryName: wineryName.trim() || undefined,
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
          color: "oklch(0.40 0.13 68)",
        }}>
          AI KNOWLEDGE ASSISTANT FOR WINEMAKERS
        </p>
        <h1 style={{
          fontFamily: "'Fraunces', serif",
          fontWeight: 700,
          fontSize: "clamp(2rem, 5vw, 3.25rem)",
          lineHeight: 1.08,
          color: "oklch(0.12 0.010 60)",
          letterSpacing: "-0.02em",
        }}>
          You are the must.<br />
          <em style={{ color: "oklch(0.40 0.13 68)", fontStyle: "italic" }}>
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
          Built for harvest. Built for the winery floor. Enter your email to see the Ownology overview and resource library preview.
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
          <p style={{ fontFamily: "'Fraunces', serif", fontWeight: 500, fontSize: "1.125rem", color: "oklch(0.12 0.010 60)" }}>
            You're on the list.
          </p>
          <p style={{ fontFamily: "'Lato', sans-serif", fontWeight: 300, fontSize: "0.875rem", color: "oklch(0.60 0.015 75)", marginTop: "0.5rem" }}>
            Opening your preview now…
          </p>
        </div>
      ) : (
        <form onSubmit={handleSubmit} className="flex flex-col gap-3 w-full max-w-md">
          {/* Row 1: Name + Winery */}
          <div className="flex flex-col sm:flex-row gap-3">
            <input
              type="text"
              value={name}
              onChange={e => setName(e.target.value)}
              placeholder="Your name"
              disabled={status === "loading"}
              style={{
                flex: 1,
                background: "oklch(0.94 0.008 75)",
                border: "1px solid oklch(0.72 0.015 75)",
                borderRadius: "2px",
                padding: "0.75rem 1rem",
                fontFamily: "'Lato', sans-serif",
                fontSize: "0.9375rem",
                color: "oklch(0.12 0.010 60)",
                outline: "none",
                colorScheme: "light",
              }}
              onFocus={e => (e.currentTarget.style.borderColor = "oklch(0.72 0.12 75)")}
              onBlur={e => (e.currentTarget.style.borderColor = "oklch(0.72 0.015 75)")}
            />
            <input
              type="text"
              value={wineryName}
              onChange={e => setWineryName(e.target.value)}
              placeholder="Winery name"
              disabled={status === "loading"}
              style={{
                flex: 1,
                background: "oklch(0.94 0.008 75)",
                border: "1px solid oklch(0.72 0.015 75)",
                borderRadius: "2px",
                padding: "0.75rem 1rem",
                fontFamily: "'Lato', sans-serif",
                fontSize: "0.9375rem",
                color: "oklch(0.12 0.010 60)",
                outline: "none",
                colorScheme: "light",
              }}
              onFocus={e => (e.currentTarget.style.borderColor = "oklch(0.72 0.12 75)")}
              onBlur={e => (e.currentTarget.style.borderColor = "oklch(0.72 0.015 75)")}
            />
          </div>
          {/* Row 2: Email + Submit */}
          <div className="flex flex-col sm:flex-row gap-3">
            <input
              type="email"
              required
              value={email}
              onChange={e => setEmail(e.target.value)}
              placeholder="cellar@yourdomain.com"
              disabled={status === "loading"}
              style={{
                flex: 1,
                background: "oklch(0.94 0.008 75)",
                border: "1px solid oklch(0.72 0.015 75)",
                borderRadius: "2px",
                padding: "0.75rem 1rem",
                fontFamily: "'Lato', sans-serif",
                fontSize: "0.9375rem",
                color: "oklch(0.12 0.010 60)",
                outline: "none",
                colorScheme: "light",
              }}
              onFocus={e => (e.currentTarget.style.borderColor = "oklch(0.72 0.12 75)")}
              onBlur={e => (e.currentTarget.style.borderColor = "oklch(0.72 0.015 75)")}
            />
            <button
              type="submit"
              disabled={status === "loading"}
              style={{
                background: "oklch(0.72 0.12 75)",
                color: "oklch(0.97 0.010 75)",
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
          </div>
        </form>
      )}

      {status === "error" && (
        <p className="mt-3 text-sm" style={{ color: "oklch(0.65 0.15 25)", fontFamily: "'Lato', sans-serif" }}>
          Something went wrong. Email <a href="mailto:support@ownology.ai" style={{ color: "oklch(0.40 0.13 68)" }}>support@ownology.ai</a> directly.
        </p>
      )}

      {/* No credit card note */}
      <p className="mt-6" style={{
        fontFamily: "'Lato', sans-serif",
        fontWeight: 300,
        fontSize: "0.8125rem",
        color: "oklch(0.50 0.010 60)",
      }}>
        No credit card. No commitment. Just the idea.
      </p>
    </div>
  );
}

// ─── Content component (shown after gate) ────────────────────────────────────
function PreviewContent() {
  const [activeTab, setActiveTab] = useState<"brochure" | "resources">("brochure");

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
          color: "oklch(0.40 0.13 68)",
          marginBottom: "1rem",
        }}>
          OWNOLOGY PREVIEW
        </p>
        <h2 style={{
          fontFamily: "'Fraunces', serif",
          fontWeight: 700,
          fontSize: "clamp(1.75rem, 4vw, 2.75rem)",
          lineHeight: 1.1,
          color: "oklch(0.12 0.010 60)",
          letterSpacing: "-0.02em",
        }}>
          The cellar intelligence platform<br />
          <em style={{ color: "oklch(0.40 0.13 68)", fontStyle: "italic" }}>built for winemakers.</em>
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
          <button style={tabStyle(activeTab === "resources")} onClick={() => setActiveTab("resources")}>
            Resources
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
                  color: "oklch(0.97 0.010 75)",
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
                color: "oklch(0.42 0.010 60)",
              }}>
                Or email <a href="mailto:winery@ownology.ai" style={{ color: "oklch(0.40 0.13 68)" }}>winery@ownology.ai</a> to talk directly with Richard.
              </p>
            </div>
          </div>
        )}

        {/* Resources tab */}
        {activeTab === "resources" && (
          <div className="pb-16">
            <p className="mb-10" style={{
              fontFamily: "'Lato', sans-serif",
              fontWeight: 300,
              fontSize: "0.9375rem",
              color: "oklch(0.60 0.015 75)",
              lineHeight: 1.6,
            }}>
              Two resource layers built into Ownology — the compliance reference you need to stay on the right side of the law, and the science context that grounds every answer the assistant gives you.
            </p>

            {/* ── Regulatory sub-section ── */}
            <div className="flex items-center gap-3 mb-5">
              <span style={{
                fontFamily: "'Lato', sans-serif",
                fontSize: "0.65rem",
                letterSpacing: "0.14em",
                textTransform: "uppercase" as const,
                color: "oklch(0.40 0.13 68)",
                fontWeight: 600,
              }}>Compliance</span>
              <div style={{ flex: 1, height: "1px", background: "oklch(0.72 0.12 75 / 20%)" }} />
            </div>
            <div className="grid md:grid-cols-3 gap-4 mb-10">
              {[
                { title: "Wine Australia & LIP", desc: "Registration obligations and Label Integrity Program record-keeping for every batch.", tag: "Federal" },
                { title: "FSANZ Standard 4.5.1", desc: "Permitted additives, SO₂ limits (250/300 mg/L), and compositional requirements under the Food Standards Code.", tag: "Federal" },
                { title: "Mandatory Labelling", desc: "Pregnancy warning (mandatory from July 2023), allergen declarations, and Wine Australia label rules.", tag: "Federal" },
                { title: "WET & Producer Rebate", desc: "29% wholesale tax and the producer rebate rising to $400k cap from 1 July 2026.", tag: "ATO" },
                { title: "Biosecurity & Imports", desc: "DAFF controls on imported plant material, oak products, and winemaking equipment.", tag: "DAFF" },
                { title: "Work Health & Safety", desc: "CO₂ confined space entry, chemical handling, and manual tasks under federal model WHS law.", tag: "Safe Work AU" },
              ].map(item => (
                <div key={item.title} style={{
                  background: "oklch(0.14 0.010 60)",
                  border: "1px solid oklch(1 0 0 / 8%)",
                  borderRadius: "4px",
                  padding: "1.25rem",
                }}>
                  <span style={{
                    fontFamily: "'Fira Code', monospace",
                    fontSize: "0.65rem",
                    color: "oklch(0.55 0.12 75)",
                    letterSpacing: "0.06em",
                    textTransform: "uppercase" as const,
                    display: "block",
                    marginBottom: "0.4rem",
                  }}>{item.tag}</span>
                  <h3 style={{
                    fontFamily: "'Fraunces', serif",
                    fontWeight: 600,
                    fontSize: "0.9375rem",
                    color: "oklch(0.12 0.010 60)",
                    lineHeight: 1.3,
                    marginBottom: "0.5rem",
                  }}>{item.title}</h3>
                  <p style={{
                    fontFamily: "'Lato', sans-serif",
                    fontWeight: 300,
                    fontSize: "0.8125rem",
                    color: "oklch(0.58 0.015 75)",
                    lineHeight: 1.6,
                  }}>{item.desc}</p>
                </div>
              ))}
            </div>
            <div className="mb-10">
              <Link href="/resources">
                <span style={{
                  fontFamily: "'Lato', sans-serif",
                  fontSize: "0.8125rem",
                  color: "oklch(0.40 0.13 68)",
                  letterSpacing: "0.06em",
                  cursor: "pointer",
                  textDecoration: "none",
                  display: "inline-flex",
                  alignItems: "center",
                  gap: "0.35rem",
                }}>
                  View full regulatory reference library →
                </span>
              </Link>
            </div>

            {/* ── Science sub-section ── */}
            <div className="flex items-center gap-3 mb-5">
              <span style={{
                fontFamily: "'Lato', sans-serif",
                fontSize: "0.65rem",
                letterSpacing: "0.14em",
                textTransform: "uppercase" as const,
                color: "oklch(0.40 0.13 68)",
                fontWeight: 600,
              }}>Science</span>
              <div style={{ flex: 1, height: "1px", background: "oklch(0.72 0.12 75 / 20%)" }} />
            </div>
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
                      color: "oklch(0.12 0.010 60)",
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
                    color: "oklch(0.40 0.13 68)",
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
                color: "oklch(0.12 0.010 60)",
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
                  color: "oklch(0.97 0.010 75)",
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
                color: "oklch(0.42 0.010 60)",
              }}>
                Or email <a href="mailto:winery@ownology.ai" style={{ color: "oklch(0.40 0.13 68)" }}>winery@ownology.ai</a> to talk directly with Richard.
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

  // Force light mode for this page only
  useEffect(() => {
    const html = document.documentElement;
    const hadDark = html.classList.contains("dark");
    html.classList.remove("dark");
    html.classList.add("light-mode");
    const prevBodyBg = document.body.style.background;
    document.body.style.background = "oklch(0.97 0.010 75)";
    document.body.style.colorScheme = "light";
    return () => {
      html.classList.remove("light-mode");
      if (hadDark) html.classList.add("dark");
      document.body.style.background = prevBodyBg;
      document.body.style.colorScheme = "";
    };
  }, []);

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
