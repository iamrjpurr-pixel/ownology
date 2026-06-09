import { useState, useEffect } from "react";
import { Link } from "wouter";
import OwnologyLogo from "@/components/OwnologyLogo";
import { trpc } from "@/lib/trpc";

// ─── Cream palette (all hex, no oklch, works on any OS theme) ─────────────────
const C = {
  bg:          "#f5ede0",   // page background — warm cream
  bgCard:      "#ede2d0",   // card / inset background — slightly darker cream
  bgCardHover: "#e6d8c4",   // card hover
  border:      "#d4c4a8",   // subtle border
  borderAmber: "#c4a96b",   // amber border accent
  text:        "#2a1f14",   // primary text — dark espresso
  textMid:     "#5a4a38",   // secondary text — warm brown
  textMuted:   "#8a7a68",   // muted text
  amber:       "#b07d2e",   // amber accent (links, labels, highlights)
  amberBright: "#c49a3c",   // brighter amber for italic headings
  btnBg:       "#b07d2e",   // CTA button background
  btnText:     "#f5ede0",   // CTA button text
  inputBg:     "#ede2d0",   // input background
  inputText:   "#2a1f14",   // input text
  inputBorder: "#c4a96b",   // input border
  headerBg:    "#f0e6d2",   // sticky header
};

// ─── Gate component ───────────────────────────────────────────────────────────
function EmailGate({ onUnlock }: { onUnlock: () => void }) {
  const [email, setEmail] = useState("");
  const [name, setName] = useState("");
  const [wineryName, setWineryName] = useState("");
  const [status, setStatus] = useState<"idle" | "loading" | "success" | "error">("idle");
  const [logoTaps, setLogoTaps] = useState(0);
  const subscribeMutation = trpc.email.subscribe.useMutation();

  const handleLogoTap = () => {
    const next = logoTaps + 1;
    setLogoTaps(next);
    if (next >= 3) onUnlock();
  };

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

  const inputStyle: React.CSSProperties = {
    flex: 1,
    background: C.inputBg,
    border: `1px solid ${C.inputBorder}`,
    borderRadius: "2px",
    padding: "0.75rem 1rem",
    fontFamily: "'Lato', sans-serif",
    fontSize: "0.9375rem",
    color: C.inputText,
    outline: "none",
    colorScheme: "light" as const,
    WebkitTextFillColor: C.inputText,
  };

  return (
    <div
      className="min-h-screen flex flex-col items-center justify-center px-4 py-16"
      style={{ background: C.bg }}
    >
      {/* Logo — triple-tap to bypass gate (owner only) */}
      <div className="mb-10" onClick={handleLogoTap} style={{ cursor: "default" }}>
        <OwnologyLogo size={44} variant="dark" />
      </div>

      {/* Hero text */}
      <div className="text-center max-w-xl mb-10">
        <p className="mb-3" style={{
          fontFamily: "'Lato', sans-serif",
          fontWeight: 300,
          fontSize: "0.8125rem",
          letterSpacing: "0.14em",
          textTransform: "uppercase",
          color: C.amber,
        }}>
          AI KNOWLEDGE ASSISTANT FOR WINEMAKERS
        </p>
        <h1 style={{
          fontFamily: "'Fraunces', serif",
          fontWeight: 700,
          fontSize: "clamp(2rem, 5vw, 3.25rem)",
          lineHeight: 1.08,
          color: C.text,
          letterSpacing: "-0.02em",
        }}>
          You are the must.<br />
          <em style={{ color: C.amberBright, fontStyle: "italic" }}>
            Ownology is the ferment.
          </em>
        </h1>
        <p className="mt-5" style={{
          fontFamily: "'Lato', sans-serif",
          fontWeight: 300,
          fontSize: "1.0625rem",
          lineHeight: 1.7,
          color: C.textMid,
        }}>
          Built for harvest. Built for the winery floor. Enter your email to see the Ownology overview and resource library preview.
        </p>
      </div>

      {/* Urgency signal */}
      <div className="mb-8 px-5 py-2.5 rounded-sm text-center" style={{
        background: `${C.amber}18`,
        border: `1px solid ${C.borderAmber}`,
      }}>
        <p style={{
          fontFamily: "'Lato', sans-serif",
          fontWeight: 400,
          fontSize: "0.875rem",
          color: C.amber,
          letterSpacing: "0.02em",
        }}>
          First 99 founding members — lifetime pricing locked.
        </p>
      </div>

      {/* Email form */}
      {status === "success" ? (
        <div className="text-center py-6 px-8 rounded-sm" style={{
          background: `${C.amber}18`,
          border: `1px solid ${C.borderAmber}`,
        }}>
          <p style={{ fontFamily: "'Fraunces', serif", fontWeight: 500, fontSize: "1.125rem", color: C.text }}>
            You're on the list.
          </p>
          <p style={{ fontFamily: "'Lato', sans-serif", fontWeight: 300, fontSize: "0.875rem", color: C.textMid, marginTop: "0.5rem" }}>
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
              style={inputStyle}
              onFocus={e => (e.currentTarget.style.borderColor = C.amberBright)}
              onBlur={e => (e.currentTarget.style.borderColor = C.inputBorder)}
            />
            <input
              type="text"
              value={wineryName}
              onChange={e => setWineryName(e.target.value)}
              placeholder="Winery name"
              disabled={status === "loading"}
              style={inputStyle}
              onFocus={e => (e.currentTarget.style.borderColor = C.amberBright)}
              onBlur={e => (e.currentTarget.style.borderColor = C.inputBorder)}
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
              style={inputStyle}
              onFocus={e => (e.currentTarget.style.borderColor = C.amberBright)}
              onBlur={e => (e.currentTarget.style.borderColor = C.inputBorder)}
            />
            <button
              type="submit"
              disabled={status === "loading"}
              style={{
                background: C.btnBg,
                color: C.btnText,
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
        <p className="mt-3 text-sm" style={{ color: "#c0392b", fontFamily: "'Lato', sans-serif" }}>
          Something went wrong. Email <a href="mailto:support@ownology.ai" style={{ color: C.amber }}>support@ownology.ai</a> directly.
        </p>
      )}

      {/* No credit card note */}
      <p className="mt-6" style={{
        fontFamily: "'Lato', sans-serif",
        fontWeight: 300,
        fontSize: "0.8125rem",
        color: C.textMuted,
      }}>
        No credit card. No commitment. Just the idea.
      </p>
    </div>
  );
}

// ─── Content component (shown after gate) ────────────────────────────────────
function PreviewContent() {
  const [activeTab, setActiveTab] = useState<"brochure" | "resources">("brochure");

  const tabStyle = (active: boolean): React.CSSProperties => ({
    fontFamily: "'Lato', sans-serif",
    fontWeight: active ? 600 : 300,
    fontSize: "0.875rem",
    letterSpacing: "0.08em",
    textTransform: "uppercase",
    color: active ? C.amber : C.textMuted,
    paddingBottom: "0.5rem",
    cursor: "pointer",
    background: "none",
    border: "none",
    borderBottomWidth: "2px",
    borderBottomStyle: "solid" as const,
    borderBottomColor: active ? C.amber : "transparent",
  });

  return (
    <div className="min-h-screen" style={{ background: C.bg }}>
      {/* Header */}
      <header
        className="sticky top-0 z-40 py-4 px-6 flex items-center justify-between"
        style={{ background: C.headerBg, borderBottom: `1px solid ${C.border}` }}
      >
        <OwnologyLogo size={32} variant="dark" />
        <Link href="/home" style={{
          fontFamily: "'Lato', sans-serif",
          fontWeight: 300,
          fontSize: "0.8125rem",
          color: C.textMuted,
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
          color: C.amber,
          marginBottom: "1rem",
        }}>
          OWNOLOGY PREVIEW
        </p>
        <h2 style={{
          fontFamily: "'Fraunces', serif",
          fontWeight: 700,
          fontSize: "clamp(1.75rem, 4vw, 2.75rem)",
          lineHeight: 1.1,
          color: C.text,
          letterSpacing: "-0.02em",
        }}>
          The cellar intelligence platform<br />
          <em style={{ color: C.amberBright, fontStyle: "italic" }}>built for winemakers.</em>
        </h2>
        <p className="mt-4" style={{
          fontFamily: "'Lato', sans-serif",
          fontWeight: 300,
          fontSize: "1rem",
          lineHeight: 1.7,
          color: C.textMid,
        }}>
          Document-grounded answers to your toughest cellar questions — from a phone, in seconds, during harvest.
        </p>
      </div>

      {/* Tabs */}
      <div className="max-w-5xl mx-auto px-6">
        <div className="flex gap-8 mb-8" style={{ borderBottom: `1px solid ${C.border}` }}>
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
              color: C.textMid,
              lineHeight: 1.6,
            }}>
              The Ownology winemaker overview — what it is, who it is for, and why it matters at harvest.
            </p>
            {/* PDF embed */}
            <div style={{
              width: "100%",
              borderRadius: "4px",
              overflow: "hidden",
              border: `1px solid ${C.border}`,
              background: C.bgCard,
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
                color: C.textMid,
              }}>
                Ready to be part of the first 99?
              </p>
              <Link href="/pricing">
                <button style={{
                  background: C.btnBg,
                  color: C.btnText,
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
                color: C.textMuted,
              }}>
                Or email <a href="mailto:winery@ownology.ai" style={{ color: C.amber }}>winery@ownology.ai</a> to talk directly with Richard.
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
              color: C.textMid,
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
                color: C.amber,
                fontWeight: 600,
              }}>Compliance</span>
              <div style={{ flex: 1, height: "1px", background: C.border }} />
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
                  background: C.bgCard,
                  border: `1px solid ${C.border}`,
                  borderRadius: "4px",
                  padding: "1.25rem",
                }}>
                  <span style={{
                    fontFamily: "'Fira Code', monospace",
                    fontSize: "0.65rem",
                    color: C.amber,
                    letterSpacing: "0.06em",
                    textTransform: "uppercase" as const,
                    display: "block",
                    marginBottom: "0.4rem",
                  }}>{item.tag}</span>
                  <h3 style={{
                    fontFamily: "'Fraunces', serif",
                    fontWeight: 600,
                    fontSize: "0.9375rem",
                    color: C.text,
                    lineHeight: 1.3,
                    marginBottom: "0.5rem",
                  }}>
                    {item.title}
                  </h3>
                  <p style={{
                    fontFamily: "'Lato', sans-serif",
                    fontWeight: 300,
                    fontSize: "0.875rem",
                    color: C.textMid,
                    lineHeight: 1.6,
                  }}>
                    {item.desc}
                  </p>
                </div>
              ))}
            </div>

            {/* ── Science sub-section ── */}
            <div className="flex items-center gap-3 mb-5">
              <span style={{
                fontFamily: "'Lato', sans-serif",
                fontSize: "0.65rem",
                letterSpacing: "0.14em",
                textTransform: "uppercase" as const,
                color: C.amber,
                fontWeight: 600,
              }}>Winemaking Science</span>
              <div style={{ flex: 1, height: "1px", background: C.border }} />
            </div>
            <div className="grid md:grid-cols-2 gap-4 mb-10">
              {[
                {
                  domain: "Fermentation Biochemistry",
                  icon: "⚗️",
                  desc: "Yeast metabolism, nitrogen assimilation, volatile acidity formation, and stuck ferment diagnosis.",
                  example: "\"My YAN is 120ppm at 24 Brix. What DAP rate for Tank 7?\"",
                },
                {
                  domain: "Sulphur Dioxide Chemistry",
                  icon: "🧪",
                  desc: "Free vs bound SO₂, molecular SO₂ targets by pH, and addition timing across vintage.",
                  example: "\"pH 3.55 red, 28 free SO₂. Do I need to add before bottling?\"",
                },
                {
                  domain: "Malolactic Fermentation",
                  icon: "🦠",
                  desc: "Bacterial inoculation windows, co-inoculation risk, and stuck MLF rescue protocols.",
                  example: "\"Day 14 post-AF, malic still at 1.8 g/L. What's the rescue path?\"",
                },
                {
                  domain: "Fining & Stability",
                  icon: "🔬",
                  desc: "Protein, tartrate, and colour stability — bench trials, rates, and timing.",
                  example: "\"Bentonite trial shows 0.8 NTU at 2 g/L. Is that enough for export?\"",
                },
              ].map(item => (
                <div key={item.domain} style={{
                  background: C.bgCard,
                  border: `1px solid ${C.border}`,
                  borderRadius: "4px",
                  padding: "1.5rem",
                }}>
                  <div className="flex items-center gap-2 mb-3">
                    <span style={{ fontSize: "1.1rem" }}>{item.icon}</span>
                    <h3 style={{
                      fontFamily: "'Fraunces', serif",
                      fontWeight: 600,
                      fontSize: "1.0rem",
                      color: C.text,
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
                    color: C.textMid,
                    lineHeight: 1.6,
                    marginBottom: "0.75rem",
                  }}>
                    {item.desc}
                  </p>
                  <p style={{
                    fontFamily: "'Fira Code', monospace",
                    fontSize: "0.75rem",
                    color: C.amber,
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
              background: `${C.amber}14`,
              border: `1px solid ${C.borderAmber}`,
            }}>
              <p style={{
                fontFamily: "'Fraunces', serif",
                fontWeight: 500,
                fontSize: "1.125rem",
                color: C.text,
                lineHeight: 1.5,
                marginBottom: "0.75rem",
              }}>
                "The education section reminds us of the science we studied. Ownology answers the 2am question."
              </p>
              <p style={{
                fontFamily: "'Lato', sans-serif",
                fontWeight: 300,
                fontSize: "0.9375rem",
                color: C.textMid,
                lineHeight: 1.6,
              }}>
                The free-run science flows naturally from your training. But the cellar doesn't wait for office hours — it asks you at 2am, mid-vintage, with a stuck ferment in Tank 7. That is the gap Ownology fills:{" "}
                <em style={{ color: C.amber }}>the press that extracts the answer your knowledge already contains.</em>
              </p>
            </div>

            {/* CTA */}
            <div className="text-center">
              <Link href="/pricing">
                <button style={{
                  background: C.btnBg,
                  color: C.btnText,
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
                color: C.textMuted,
              }}>
                Or email <a href="mailto:winery@ownology.ai" style={{ color: C.amber }}>winery@ownology.ai</a> to talk directly with Richard.
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

  // Force cream background — set directly on body so it takes effect before paint
  useEffect(() => {
    const html = document.documentElement;
    const body = document.body;
    const prevBg = body.style.background;
    const prevScheme = body.style.colorScheme;
    const hadDark = html.classList.contains("dark");
    html.classList.remove("dark");
    body.style.background = C.bg;
    body.style.colorScheme = "light";
    return () => {
      if (hadDark) html.classList.add("dark");
      body.style.background = prevBg;
      body.style.colorScheme = prevScheme;
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
