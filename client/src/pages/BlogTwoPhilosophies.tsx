/**
 * Blog Article — Two Philosophies, One Grape
 * Full article page matching the Cellar Intelligence dark artisan aesthetic.
 */

import { Link } from "wouter";
import { useEffect, useState } from "react";
import OwnologyLogo from "@/components/OwnologyLogo";
import { trpc } from "@/lib/trpc";

const AMBER = "var(--ow-amber)";
const SERIF = "'Fraunces', serif";
const SANS = "'Lato', sans-serif";
const MONO = "'Fira Code', monospace";
const TEXT_HI = "var(--ow-text-hi)";
const TEXT_MID = "var(--ow-text-mid)";
const TEXT_LO = "var(--ow-text-lo)";
const BG_BASE = "var(--ow-bg-base)";
const BG_CARD = "var(--ow-bg-card)";
const BORDER = "var(--ow-border)";

function ArticleEmailCapture() {
  const [email, setEmail] = useState("");
  const [status, setStatus] = useState<"idle" | "loading" | "success" | "error">("idle");
  const [errorMsg, setErrorMsg] = useState("");

  const subscribeMutation = trpc.email.subscribe.useMutation();

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!email.trim() || status === "loading") return;
    setStatus("loading");
    setErrorMsg("");
    try {
      await subscribeMutation.mutateAsync({
        email: email.trim(),
        source: "blog",
        tags: ["waitlist", "blog", "two-philosophies"],
      });
      setStatus("success");
      setEmail("");
    } catch {
      setStatus("error");
      setErrorMsg("Something went wrong. Please try again or email support@ownology.ai");
    }
  };

  if (status === "success") {
    return (
      <div
        className="py-5 px-8 text-center"
        style={{
          background: "color-mix(in oklch, var(--ow-amber) 10%, transparent)",
          border: "1px solid color-mix(in oklch, var(--ow-amber) 30%, transparent)",
          borderRadius: "2px",
        }}
      >
        <p style={{ fontFamily: SERIF, fontWeight: 500, fontSize: "1.125rem", color: TEXT_HI }}>
          You're on the list. We'll be in touch.
        </p>
      </div>
    );
  }

  return (
    <form onSubmit={handleSubmit} className="flex flex-col sm:flex-row gap-3">
      <input
        type="email"
        required
        value={email}
        onChange={(e) => setEmail(e.target.value)}
        placeholder="your@winery.com"
        disabled={status === "loading"}
        style={{
          flex: 1,
          padding: "0.75rem 1rem",
          background: "var(--ow-bg-raised)",
          border: "1px solid var(--ow-border-md)",
          borderRadius: "2px",
          color: TEXT_HI,
          fontFamily: SANS,
          fontWeight: 300,
          fontSize: "0.9rem",
          outline: "none",
        }}
      />
      <button
        type="submit"
        disabled={status === "loading"}
        className="btn-amber"
        style={{ whiteSpace: "nowrap" }}
      >
        {status === "loading" ? "Joining…" : "Join the Waitlist"}
      </button>
      {status === "error" && (
        <p style={{ fontFamily: SANS, fontSize: "0.8rem", color: "oklch(0.65 0.15 25)", marginTop: "0.5rem" }}>
          {errorMsg}
        </p>
      )}
    </form>
  );
}

export default function BlogTwoPhilosophies() {
  useEffect(() => {
    document.title = "Two Philosophies, One Grape | Ownology — Cellar Intelligence";
    const meta = document.createElement("meta");
    meta.name = "description";
    meta.content =
      "Boutique and commercial wine production are not different philosophies applied to the same process — they are fundamentally different processes. Understanding the distinction matters for anyone building tools that serve the wine industry.";
    document.head.appendChild(meta);

    const canonical = document.createElement("link");
    canonical.rel = "canonical";
    canonical.href = `${window.location.origin}/blog/two-philosophies`;
    document.head.appendChild(canonical);

    const og = [
      { property: "og:title", content: "Two Philosophies, One Grape | Ownology" },
      { property: "og:description", content: "What boutique and commercial winemaking actually have in common — and where they diverge." },
      { property: "og:type", content: "article" },
      { property: "og:url", content: `${window.location.origin}/blog/two-philosophies` },
    ];
    og.forEach(({ property, content }) => {
      const el = document.createElement("meta");
      el.setAttribute("property", property);
      el.setAttribute("content", content);
      document.head.appendChild(el);
    });

    return () => {
      document.title = "Ownology — Cellar Intelligence";
    };
  }, []);

  return (
    <div style={{ background: BG_BASE, minHeight: "100vh", color: TEXT_HI }}>
      {/* Nav */}
      <nav
        style={{
          position: "fixed",
          top: 0,
          left: 0,
          right: 0,
          zIndex: 50,
          background: "var(--ow-nav-bg)",
          backdropFilter: "blur(12px)",
          borderBottom: `1px solid ${BORDER}`,
        }}
      >
        <div className="container flex items-center justify-between py-4">
          <Link href="/">
            <OwnologyLogo size={32} showIABadge showTheoryCard />
          </Link>
          <Link
            href="/blog"
            style={{
              fontFamily: SANS,
              fontWeight: 300,
              fontSize: "0.8rem",
              letterSpacing: "0.08em",
              textTransform: "uppercase" as const,
              color: TEXT_MID,
            }}
          >
            ← Cellar Intelligence
          </Link>
        </div>
      </nav>

      {/* Article */}
      <article style={{ paddingTop: "6rem", paddingBottom: "6rem" }}>
        <div style={{ maxWidth: "720px", margin: "0 auto", padding: "0 1.5rem" }}>

          {/* Category + meta */}
          <div style={{ display: "flex", alignItems: "center", gap: "1rem", marginBottom: "2rem" }}>
            <span
              style={{
                fontFamily: MONO,
                fontSize: "0.7rem",
                letterSpacing: "0.12em",
                textTransform: "uppercase" as const,
                color: AMBER,
                background: "color-mix(in oklch, var(--ow-amber) 12%, transparent)",
                border: "1px solid color-mix(in oklch, var(--ow-amber) 25%, transparent)",
                padding: "0.25rem 0.75rem",
                borderRadius: "2px",
              }}
            >
              Winemaking Science
            </span>
            <span style={{ fontFamily: SANS, fontWeight: 300, fontSize: "0.8rem", color: TEXT_LO }}>
              May 2026 · 8 min read
            </span>
          </div>

          {/* Title */}
          <h1
            style={{
              fontFamily: SERIF,
              fontWeight: 700,
              fontSize: "clamp(2rem, 5vw, 3rem)",
              lineHeight: 1.1,
              color: TEXT_HI,
              letterSpacing: "-0.02em",
              marginBottom: "1.5rem",
              textWrap: "balance" as "balance",
            }}
          >
            Two Philosophies, One Grape: What Boutique and Commercial Winemaking Actually Have in Common — and Where They Diverge
          </h1>

          {/* Byline */}
          <div
            style={{
              display: "flex",
              alignItems: "center",
              gap: "1rem",
              paddingBottom: "2rem",
              marginBottom: "2.5rem",
              borderBottom: `1px solid ${BORDER}`,
            }}
          >
            <div
              style={{
                width: "40px",
                height: "40px",
                borderRadius: "50%",
                background: "color-mix(in oklch, var(--ow-amber) 15%, var(--ow-bg-inset))",
                border: "1px solid color-mix(in oklch, var(--ow-amber) 25%, transparent)",
                display: "flex",
                alignItems: "center",
                justifyContent: "center",
                fontFamily: SERIF,
                fontWeight: 700,
                fontSize: "1rem",
                color: AMBER,
              }}
            >
              R
            </div>
            <div>
              <p style={{ fontFamily: SANS, fontWeight: 600, fontSize: "0.875rem", color: TEXT_HI }}>
                Rich
              </p>
              <p style={{ fontFamily: SANS, fontWeight: 300, fontSize: "0.8rem", color: TEXT_LO }}>
                Co-Founder, Ownology
              </p>
            </div>
          </div>

          {/* Body */}
          <div
            style={{
              fontFamily: SANS,
              fontWeight: 300,
              fontSize: "1.0625rem",
              lineHeight: 1.8,
              color: TEXT_MID,
            }}
          >
            <p style={{ marginBottom: "1.5rem" }}>
              There is a version of this article that flatters boutique winemakers and condescends to commercial ones. I am not going to write that version. The truth is more interesting: boutique and commercial wine production are not different philosophies applied to the same process. They are, in many ways, fundamentally different processes that happen to share a raw material.
            </p>
            <p style={{ marginBottom: "1.5rem" }}>
              Understanding the distinction matters — not just for winemakers deciding which path to take, but for anyone trying to build tools, systems, or knowledge bases that serve the wine industry. At Ownology, we spend a lot of time thinking about where winemakers need help most. And the boutique vs commercial divide is one of the most revealing fault lines in the industry.
            </p>

            <h2
              style={{
                fontFamily: SERIF,
                fontWeight: 600,
                fontSize: "1.5rem",
                color: TEXT_HI,
                marginTop: "2.5rem",
                marginBottom: "1rem",
                letterSpacing: "-0.01em",
              }}
            >
              The Numbers That Define the Difference
            </h2>
            <p style={{ marginBottom: "1.5rem" }}>
              Before the philosophy, the physics. Boutique wineries in Australia are generally defined as producing fewer than 5,000 cases per year (60,000 bottles), though many serious boutique producers sit well below 1,000 cases. Commercial wineries — the large regional producers and the national brands — operate at scales measured in millions of litres. The largest Australian producers crush hundreds of thousands of tonnes of grapes in a single vintage.
            </p>
            <p style={{ marginBottom: "1.5rem" }}>
              This scale difference is not merely quantitative. It changes the economics of every decision, the engineering of every piece of equipment, and the nature of every risk.
            </p>

            {/* Comparison table */}
            <div
              style={{
                overflowX: "auto",
                margin: "2rem 0",
                border: `1px solid ${BORDER}`,
                borderRadius: "2px",
              }}
            >
              <table style={{ width: "100%", borderCollapse: "collapse" as const, fontFamily: SANS, fontSize: "0.85rem" }}>
                <thead>
                  <tr style={{ background: "var(--ow-bg-raised)" }}>
                    <th style={{ padding: "0.75rem 1rem", textAlign: "left" as const, color: TEXT_LO, fontWeight: 400, letterSpacing: "0.06em", fontSize: "0.75rem", textTransform: "uppercase" as const, borderBottom: `1px solid ${BORDER}` }}>Dimension</th>
                    <th style={{ padding: "0.75rem 1rem", textAlign: "left" as const, color: AMBER, fontWeight: 600, borderBottom: `1px solid ${BORDER}` }}>Boutique (&lt; 5,000 cases)</th>
                    <th style={{ padding: "0.75rem 1rem", textAlign: "left" as const, color: TEXT_MID, fontWeight: 600, borderBottom: `1px solid ${BORDER}` }}>Commercial (&gt; 100,000 cases)</th>
                  </tr>
                </thead>
                <tbody>
                  {[
                    ["Annual production", "5,000–60,000 bottles", "1.2M–100M+ bottles"],
                    ["Grape sourcing", "Own vineyard or single-region contracts", "Multi-region, multi-state blending"],
                    ["Pressing", "Pneumatic press, 1–4 tonne capacity", "Continuous press, 20–200 tonne/hr"],
                    ["Fermentation vessels", "Open-top red fermenters, 1–10 tonne", "Closed stainless tanks, 50–500 tonne"],
                    ["Temperature control", "Glycol chiller, manual or basic automation", "Fully automated SCADA systems"],
                    ["Laboratory", "Bench-top pH, SO₂ titration, refractometer", "Inline FTIR, automated chemistry, dedicated lab staff"],
                    ["Filtration", "Pad filter, cold stabilisation", "Crossflow filtration, centrifuge"],
                    ["Bottling", "Contract or small in-house line (1,000–3,000 bph)", "In-house high-speed line (10,000–60,000 bph)"],
                    ["Winemaking team", "1–3 people (often owner-winemaker)", "5–50 people across winemaking, QA, lab, logistics"],
                    ["Capital investment", "$95,000–$370,000 (equipment)", "$5M–$50M+"],
                  ].map(([dim, boutique, commercial], i) => (
                    <tr key={i} style={{ background: i % 2 === 0 ? "transparent" : "var(--ow-nav-bg)" }}>
                      <td style={{ padding: "0.65rem 1rem", color: TEXT_LO, fontWeight: 400, borderBottom: `1px solid ${BORDER}` }}>{dim}</td>
                      <td style={{ padding: "0.65rem 1rem", color: TEXT_HI, borderBottom: `1px solid ${BORDER}` }}>{boutique}</td>
                      <td style={{ padding: "0.65rem 1rem", color: TEXT_MID, borderBottom: `1px solid ${BORDER}` }}>{commercial}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>

            <h2
              style={{
                fontFamily: SERIF,
                fontWeight: 600,
                fontSize: "1.5rem",
                color: TEXT_HI,
                marginTop: "2.5rem",
                marginBottom: "1rem",
                letterSpacing: "-0.01em",
              }}
            >
              Where Boutique Winemakers Have the Advantage
            </h2>
            <p style={{ marginBottom: "1.5rem" }}>
              The boutique winemaker's greatest asset is <strong style={{ color: TEXT_HI, fontWeight: 600 }}>intimacy with the material</strong>. When you are processing 20 tonnes of Shiraz from a single block, you can taste every tank, adjust every addition manually, and make decisions in real time that a commercial winemaker simply cannot make at scale. The feedback loop between observation and action is measured in hours, not days.
            </p>
            <p style={{ marginBottom: "1.5rem" }}>
              This intimacy extends to the vineyard. Most serious boutique producers either own their vineyard or have long-term relationships with a small number of growers. They know the block, the soil, the microclimate. They know that the north-facing slope always runs two degrees Brix higher than the valley floor. This knowledge is tacit, embodied, and almost impossible to systematise — but it is enormously valuable.
            </p>
            <p style={{ marginBottom: "1.5rem" }}>
              The boutique winemaker also has <strong style={{ color: TEXT_HI, fontWeight: 600 }}>stylistic freedom</strong> that commercial producers cannot afford. A commercial winery making 500,000 cases of Shiraz needs that wine to taste the same every year. Consistency is a commercial imperative. The boutique winemaker can let a difficult vintage express itself, can experiment with extended maceration or whole-bunch inclusion, can make decisions that serve the wine rather than the brand standard.
            </p>

            <h2
              style={{
                fontFamily: SERIF,
                fontWeight: 600,
                fontSize: "1.5rem",
                color: TEXT_HI,
                marginTop: "2.5rem",
                marginBottom: "1rem",
                letterSpacing: "-0.01em",
              }}
            >
              Where Commercial Winemakers Have the Advantage
            </h2>
            <p style={{ marginBottom: "1.5rem" }}>
              The commercial winemaker's greatest asset is <strong style={{ color: TEXT_HI, fontWeight: 600 }}>data and infrastructure</strong>. A large winery running inline FTIR analysis can measure the chemistry of every tank in real time. Automated SCADA systems log every pump-over, every temperature deviation, every addition. The winemaking team includes dedicated laboratory scientists, quality assurance managers, and logistics specialists. When something goes wrong, there is a system to catch it.
            </p>
            <p style={{ marginBottom: "1.5rem" }}>
              Commercial wineries also have <strong style={{ color: TEXT_HI, fontWeight: 600 }}>blending flexibility</strong> that boutique producers lack. When you have access to wine from multiple regions, multiple varieties, and multiple vintages, you can engineer a consistent product regardless of what any individual season delivers. This is not a compromise — it is a skill. The art of blending at commercial scale is genuinely sophisticated.
            </p>
            <p style={{ marginBottom: "1.5rem" }}>
              The economics of scale also matter. A commercial winery can justify the capital investment in crossflow filtration, automated bottling lines, and inline analysis that a boutique producer simply cannot. The cost per bottle of these technologies drops dramatically at volume.
            </p>

            {/* Pull quote */}
            <blockquote
              style={{
                margin: "2.5rem 0",
                padding: "1.5rem 2rem",
                background: BG_CARD,
                borderLeft: `3px solid ${AMBER}`,
                borderRadius: "0 2px 2px 0",
              }}
            >
              <p
                style={{
                  fontFamily: SERIF,
                  fontWeight: 500,
                  fontSize: "1.25rem",
                  lineHeight: 1.5,
                  color: TEXT_HI,
                  fontStyle: "italic",
                  margin: 0,
                }}
              >
                "The boutique winemaker cannot afford a dedicated laboratory scientist. They may not have a mentor on call. They are making decisions with incomplete information, under time pressure, with irreplaceable material at stake."
              </p>
            </blockquote>

            <h2
              style={{
                fontFamily: SERIF,
                fontWeight: 600,
                fontSize: "1.5rem",
                color: TEXT_HI,
                marginTop: "2.5rem",
                marginBottom: "1rem",
                letterSpacing: "-0.01em",
              }}
            >
              The Knowledge Problem Is Different at Each Scale
            </h2>
            <p style={{ marginBottom: "1.5rem" }}>
              Here is the insight that matters most for Ownology's work: the <strong style={{ color: TEXT_HI, fontWeight: 600 }}>nature of the knowledge problem</strong> is fundamentally different at boutique and commercial scale.
            </p>
            <p style={{ marginBottom: "1.5rem" }}>
              At commercial scale, the problem is largely one of <strong style={{ color: TEXT_HI, fontWeight: 600 }}>data management and consistency</strong>. The winemaking principles are well understood. The challenge is applying them consistently across large volumes, multiple sites, and diverse grape sources. Commercial wineries invest heavily in systems, protocols, and laboratory infrastructure to solve this problem.
            </p>
            <p style={{ marginBottom: "1.5rem" }}>
              At boutique scale, the problem is largely one of <strong style={{ color: TEXT_HI, fontWeight: 600 }}>real-time decision support under uncertainty</strong>. The boutique winemaker typically has deep knowledge of their own vineyard and wine style, but limited access to the broader body of winemaking knowledge when they need it most — at 11pm during vintage, when a fermentation is stuck and the winemaker needs to know whether to add more DAP, restart with a different yeast, or simply wait.
            </p>

            {/* Inline CTA */}
            <div
              style={{
                margin: "2.5rem 0",
                padding: "2rem",
                background: BG_CARD,
                border: `1px solid color-mix(in oklch, var(--ow-amber) 20%, transparent)`,
                borderRadius: "2px",
              }}
            >
              <p
                style={{
                  fontFamily: SERIF,
                  fontWeight: 600,
                  fontSize: "1.125rem",
                  color: TEXT_HI,
                  marginBottom: "0.5rem",
                }}
              >
                Ownology is built for the boutique knowledge gap.
              </p>
              <p
                style={{
                  fontFamily: SANS,
                  fontWeight: 300,
                  fontSize: "0.9rem",
                  color: TEXT_MID,
                  marginBottom: "1.25rem",
                  lineHeight: 1.6,
                }}
              >
                Instant, document-grounded answers to your toughest cellar questions — from a mobile phone, during harvest.
              </p>
              <ArticleEmailCapture />
            </div>

            <h2
              style={{
                fontFamily: SERIF,
                fontWeight: 600,
                fontSize: "1.5rem",
                color: TEXT_HI,
                marginTop: "2.5rem",
                marginBottom: "1rem",
                letterSpacing: "-0.01em",
              }}
            >
              The Equipment Tells the Story
            </h2>
            <p style={{ marginBottom: "1.5rem" }}>
              Walk into a boutique winery and a commercial winery and the difference is immediately legible in the equipment. The boutique cellar has a pneumatic press that takes four hours to run a cycle, a glycol chiller humming in the corner, open-top fermenters with hand-operated plungers, a bench-top pH meter and a Ripper titration kit for SO₂. The winemaker knows every vessel by name.
            </p>
            <p style={{ marginBottom: "1.5rem" }}>
              The commercial winery has a continuous press running around the clock during vintage, a SCADA system displaying the temperature of 200 tanks on a single screen, an inline FTIR analyser that measures Brix, pH, TA, and volatile acidity simultaneously, and a bottling line that fills 30,000 bottles an hour. The winemaker manages a system.
            </p>
            <p style={{ marginBottom: "1.5rem" }}>
              Neither is superior. They are different tools for different purposes. But they create very different knowledge needs — and very different opportunities for intelligent assistance.
            </p>

            <h2
              style={{
                fontFamily: SERIF,
                fontWeight: 600,
                fontSize: "1.5rem",
                color: TEXT_HI,
                marginTop: "2.5rem",
                marginBottom: "1rem",
                letterSpacing: "-0.01em",
              }}
            >
              What This Means for the Future of Winemaking
            </h2>
            <p style={{ marginBottom: "1.5rem" }}>
              The most interesting development in the wine industry over the next decade will not be the further automation of commercial production. That trajectory is already well established. The most interesting development will be the <strong style={{ color: TEXT_HI, fontWeight: 600 }}>democratisation of analytical and decision-support capability</strong> for boutique producers.
            </p>
            <p style={{ marginBottom: "1.5rem" }}>
              Inline FTIR analysis, which costs hundreds of thousands of dollars for a commercial installation, is becoming available in portable form for boutique wineries. Predictive fermentation modelling, which required a dedicated data scientist at commercial scale, is becoming accessible through software tools. And AI-powered knowledge assistants — tools that can draw on the full body of winemaking science and answer specific, contextual questions in real time — are beginning to close the gap between the knowledge resources available to a commercial winemaker and those available to a boutique producer working alone during vintage.
            </p>
            <p style={{ marginBottom: "1.5rem" }}>
              This is not about replacing the boutique winemaker's judgment. It is about giving that judgment better information to work with.
            </p>

            <h2
              style={{
                fontFamily: SERIF,
                fontWeight: 600,
                fontSize: "1.5rem",
                color: TEXT_HI,
                marginTop: "2.5rem",
                marginBottom: "1rem",
                letterSpacing: "-0.01em",
              }}
            >
              A Note on Craft
            </h2>
            <p style={{ marginBottom: "1.5rem" }}>
              There is a tendency in wine writing to romanticise the boutique and dismiss the commercial. I want to resist that tendency. The best commercial winemakers are genuinely skilled professionals who have mastered a different and equally demanding set of challenges. And the worst boutique wines — made with passion but without knowledge — are not serving anyone.
            </p>
            <p style={{ marginBottom: "1.5rem" }}>
              What matters is not the scale. What matters is the quality of the decisions made at every point in the process. And better decisions require better information, regardless of whether you are making 500 cases or 500,000.
            </p>

            {/* Tags */}
            <div style={{ display: "flex", flexWrap: "wrap" as const, gap: "0.5rem", marginTop: "2.5rem", paddingTop: "2rem", borderTop: `1px solid ${BORDER}` }}>
              {["boutique winemaking", "commercial winemaking", "winery equipment", "AI in winemaking", "decision support"].map((tag) => (
                <span
                  key={tag}
                  style={{
                    fontFamily: MONO,
                    fontSize: "0.7rem",
                    letterSpacing: "0.06em",
                    color: TEXT_LO,
                    background: "var(--ow-bg-raised)",
                    border: `1px solid ${BORDER}`,
                    padding: "0.25rem 0.6rem",
                    borderRadius: "2px",
                  }}
                >
                  #{tag}
                </span>
              ))}
            </div>
          </div>

          {/* About Ownology footer card */}
          <div
            style={{
              marginTop: "4rem",
              padding: "2rem",
              background: BG_CARD,
              border: `1px solid ${BORDER}`,
              borderRadius: "2px",
            }}
          >
            <div style={{ display: "flex", alignItems: "center", gap: "1rem", marginBottom: "1rem" }}>
              <OwnologyLogo size={28} />
              <p style={{ fontFamily: SERIF, fontWeight: 600, fontSize: "1rem", color: TEXT_HI }}>
                About Ownology
              </p>
            </div>
            <p style={{ fontFamily: SANS, fontWeight: 300, fontSize: "0.9rem", color: TEXT_MID, lineHeight: 1.7, marginBottom: "1.25rem" }}>
              Ownology is an AI knowledge assistant for boutique winery teams. It gives winemakers instant, document-grounded answers to their toughest cellar questions — from a mobile phone, during harvest. Built by Rich and Geraldine, who understand both the science and the pressure of vintage firsthand.
            </p>
            <Link
              href="/"
              style={{
                fontFamily: SANS,
                fontWeight: 600,
                fontSize: "0.8rem",
                letterSpacing: "0.08em",
                textTransform: "uppercase" as const,
                color: AMBER,
              }}
            >
              Learn more about Ownology →
            </Link>
          </div>

          {/* Back link */}
          <div style={{ marginTop: "3rem", textAlign: "center" as const }}>
            <Link
              href="/blog"
              style={{
                fontFamily: SANS,
                fontWeight: 300,
                fontSize: "0.85rem",
                letterSpacing: "0.06em",
                color: TEXT_LO,
              }}
            >
              ← Back to Cellar Intelligence
            </Link>
          </div>
        </div>
      </article>
    </div>
  );
}
