/**
 * Blog Article — The Weight of Harvest
 * Full thought leadership article with SEO meta tags, structured article layout,
 * inline CTA, and matching Cellar Intelligence dark artisan aesthetic.
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
        tags: ["waitlist", "blog", "weight-of-harvest"],
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
          background: BG_BASE,
          border: "1px solid var(--ow-border-md)",
          borderRadius: "2px",
          padding: "0.75rem 1rem",
          fontFamily: SANS,
          fontSize: "0.9375rem",
          color: TEXT_HI,
          outline: "none",
        }}
        onFocus={(e) => (e.currentTarget.style.borderColor = AMBER)}
        onBlur={(e) => (e.currentTarget.style.borderColor = "var(--ow-border-md)")}
      />
      <button
        type="submit"
        disabled={status === "loading"}
        className="btn-amber flex-shrink-0"
        style={{ opacity: status === "loading" ? 0.7 : 1 }}
      >
        {status === "loading" ? "Joining..." : "Join Waitlist"}
      </button>
      {status === "error" && (
        <p style={{ fontFamily: SANS, fontSize: "0.875rem", color: "oklch(0.65 0.15 30)" }}>
          {errorMsg}
        </p>
      )}
    </form>
  );
}

export default function BlogWeightOfHarvest() {
  useEffect(() => {
    document.title =
      "The Weight of Harvest: Why the Winemaker's Greatest Risk Is Not the Weather — Ownology";
    let desc = document.querySelector('meta[name="description"]') as HTMLMetaElement | null;
    if (!desc) {
      desc = document.createElement("meta");
      desc.name = "description";
      document.head.appendChild(desc);
    }
    desc.content =
      "Harvest is a cognitive sprint, not just a physical one. Ownology explores why cognitive overload is the winemaker's greatest risk — and how document-grounded AI provides relief without replacing craft.";

    // Open Graph
    const ogTags: Record<string, string> = {
      "og:title": "The Weight of Harvest: Why the Winemaker's Greatest Risk Is Not the Weather",
      "og:description":
        "Harvest is a cognitive sprint. Ownology explores why cognitive overload is the winemaker's greatest risk — and how AI provides relief without replacing craft.",
      "og:type": "article",
      "og:url": "https://ownology-kjxa9mra.manus.space/blog/weight-of-harvest",
      "article:published_time": "2026-05-12",
      "article:author": "Ownology",
      "article:tag": "winemaking, cognitive load, harvest, AI, institutional knowledge",
    };
    Object.entries(ogTags).forEach(([property, content]) => {
      let tag = document.querySelector(`meta[property="${property}"]`) as HTMLMetaElement | null;
      if (!tag) {
        tag = document.createElement("meta");
        tag.setAttribute("property", property);
        document.head.appendChild(tag);
      }
      tag.content = content;
    });

    // Canonical
    let canonical = document.querySelector('link[rel="canonical"]') as HTMLLinkElement | null;
    if (!canonical) {
      canonical = document.createElement("link");
      canonical.rel = "canonical";
      document.head.appendChild(canonical);
    }
    canonical.href = "https://ownology-kjxa9mra.manus.space/blog/weight-of-harvest";

    return () => {
      document.title = "Ownology — AI Knowledge Assistant for Winemakers";
    };
  }, []);

  return (
    <div style={{ background: BG_BASE, minHeight: "100vh" }}>
      {/* Nav */}
      <nav
        className="sticky top-0 z-50 border-b"
        style={{ background: BG_BASE, borderColor: BORDER }}
      >
        <div className="container flex items-center justify-between py-5">
          <Link href="/">
            <OwnologyLogo size={32} showIABadge showTheoryCard />
          </Link>
          <div className="flex items-center gap-6">
            <Link
              href="/blog"
              style={{
                fontFamily: SANS,
                fontWeight: 300,
                fontSize: "0.875rem",
                color: TEXT_LO,
                letterSpacing: "0.02em",
              }}
            >
              ← Cellar Intelligence
            </Link>
          </div>
        </div>
      </nav>

      {/* Article header */}
      <header className="pt-16 pb-12 border-b" style={{ borderColor: BORDER }}>
        <div className="container max-w-3xl">
          {/* Breadcrumb */}
          <div className="flex items-center gap-2 mb-8" style={{ fontFamily: MONO, fontSize: "0.7rem", color: TEXT_LO }}>
            <Link href="/" style={{ color: TEXT_LO }}>Ownology</Link>
            <span>/</span>
            <Link href="/blog" style={{ color: TEXT_LO }}>Cellar Intelligence</Link>
            <span>/</span>
            <span style={{ color: AMBER }}>The Weight of Harvest</span>
          </div>

          {/* Category badge + meta */}
          <div className="flex items-center gap-4 mb-6">
            <span
              style={{
                fontFamily: SANS,
                fontWeight: 700,
                fontSize: "0.65rem",
                letterSpacing: "0.14em",
                textTransform: "uppercase",
                color: AMBER,
                background: "color-mix(in oklch, var(--ow-amber) 10%, transparent)",
                padding: "0.2rem 0.6rem",
                borderRadius: "2px",
              }}
            >
              Winemaker Psychology
            </span>
            <span style={{ fontFamily: MONO, fontSize: "0.7rem", color: TEXT_LO }}>
              May 2026 · 7 min read
            </span>
          </div>

          {/* Title */}
          <h1
            style={{
              fontFamily: SERIF,
              fontWeight: 700,
              fontSize: "clamp(2rem, 5vw, 3.25rem)",
              lineHeight: 1.1,
              color: TEXT_HI,
              letterSpacing: "-0.02em",
              marginBottom: "1.5rem",
              textWrap: "balance" as "balance",
            }}
          >
            The Weight of Harvest: Why the Winemaker's Greatest Risk Is Not the Weather
          </h1>

          {/* Byline */}
          <div className="flex items-center gap-3">
            <div
              className="w-8 h-8 rounded-sm flex items-center justify-center flex-shrink-0"
              style={{ background: "color-mix(in oklch, var(--ow-amber) 150%, transparent)", border: "1px solid color-mix(in oklch, var(--ow-amber) 30%, transparent)" }}
            >
              <svg width="14" height="14" viewBox="0 0 20 20" fill="none" aria-hidden="true">
                <circle cx="10" cy="10" r="8" stroke="var(--ow-amber)" strokeWidth="1.5" fill="none" />
                <path d="M10 6v4l3 2" stroke="var(--ow-amber)" strokeWidth="1.5" strokeLinecap="round" />
              </svg>
            </div>
            <div>
              <p style={{ fontFamily: SANS, fontWeight: 600, fontSize: "0.875rem", color: TEXT_HI }}>
                Rich &amp; Geraldine
              </p>
              <p style={{ fontFamily: MONO, fontSize: "0.65rem", color: TEXT_LO }}>
                Co-Founders, Ownology
              </p>
            </div>
          </div>
        </div>
      </header>

      {/* Article body */}
      <article className="py-16">
        <div className="container max-w-3xl">
          {/* Opening */}
          <p style={{ fontFamily: SANS, fontWeight: 300, fontSize: "1.125rem", lineHeight: 1.85, color: TEXT_MID, marginBottom: "1.75rem" }}>
            There is a moment that every winemaker knows. It arrives somewhere around the third week of vintage — usually at 2am, usually in the middle of a stuck fermentation, usually when the rest of the team has gone home. The Brix reading is not moving. The yeast is stressed. The SO₂ window is closing. And the answer — the right answer, the one that has worked before — is somewhere in a notebook, or in a conversation from three years ago, or in the winemaker's own memory, which is currently running on four hours of sleep and cold coffee.
          </p>
          <p style={{ fontFamily: SANS, fontWeight: 400, fontSize: "1.125rem", lineHeight: 1.85, color: TEXT_HI, marginBottom: "3rem" }}>
            This is not a technical problem. It is a cognitive one.
          </p>

          {/* Section 1 */}
          <h2 style={{ fontFamily: SERIF, fontWeight: 600, fontSize: "clamp(1.4rem, 2.5vw, 1.875rem)", color: TEXT_HI, letterSpacing: "-0.01em", lineHeight: 1.2, marginBottom: "1.25rem" , textWrap: "balance" as "balance" }}>
            The Harvest Sprint and the Limits of Human Memory
          </h2>
          <div style={{ width: "2.5rem", height: "1px", background: AMBER, marginBottom: "1.5rem" }} />
          <p style={{ fontFamily: SANS, fontWeight: 300, fontSize: "1.0625rem", lineHeight: 1.85, color: TEXT_MID, marginBottom: "1.5rem" }}>
            Harvest is unlike any other period in the agricultural calendar. In the space of four to six weeks, a winemaker makes hundreds of high-stakes decisions — nutrient additions, temperature adjustments, pump-over schedules, press timing, SO₂ management, blending calls — often simultaneously across multiple tanks and varieties. Each decision draws on a body of knowledge that took years to accumulate: laboratory training, vintage experience, supplier data, house style protocols, and the accumulated wisdom of every winemaker who came before.
          </p>
          <p style={{ fontFamily: SANS, fontWeight: 300, fontSize: "1.0625rem", lineHeight: 1.85, color: TEXT_MID, marginBottom: "1.5rem" }}>
            Cognitive science has a name for what happens when that demand exceeds available mental capacity: <strong style={{ color: TEXT_HI, fontWeight: 500 }}>cognitive overload</strong>. When working memory is saturated, decision quality degrades. Errors of omission increase — not because the winemaker does not know the answer, but because they cannot retrieve it quickly enough under pressure. The knowledge is there. The bandwidth is not.
          </p>
          <p style={{ fontFamily: SANS, fontWeight: 300, fontSize: "1.0625rem", lineHeight: 1.85, color: TEXT_MID, marginBottom: "3rem" }}>
            Research in occupational psychology consistently identifies high-stakes, time-compressed, information-dense environments as primary drivers of professional burnout. Winemaking during harvest meets every criterion. The pressure is not primarily physical — it is cognitive: the sustained demand to retrieve, evaluate, and act on complex technical knowledge under time pressure, with limited opportunity for recovery between decisions.
          </p>

          {/* Pull quote */}
          <blockquote
            className="my-10 px-8 py-6"
            style={{
              borderLeft: "3px solid var(--ow-amber)",
              background: BG_CARD,
              borderRadius: "0 2px 2px 0",
            }}
          >
            <p style={{ fontFamily: SERIF, fontStyle: "italic", fontWeight: 300, fontSize: "clamp(1.2rem, 2.2vw, 1.5rem)", lineHeight: 1.45, color: TEXT_HI, textWrap: "balance" as "balance" }}>
              "The knowledge is there. The bandwidth is not."
            </p>
          </blockquote>

          {/* Section 2 */}
          <h2 style={{ fontFamily: SERIF, fontWeight: 600, fontSize: "clamp(1.4rem, 2.5vw, 1.875rem)", color: TEXT_HI, letterSpacing: "-0.01em", lineHeight: 1.2, marginBottom: "1.25rem", marginTop: "3rem" , textWrap: "balance" as "balance" }}>
            The Single Point of Failure Problem
          </h2>
          <div style={{ width: "2.5rem", height: "1px", background: AMBER, marginBottom: "1.5rem" }} />
          <p style={{ fontFamily: SANS, fontWeight: 300, fontSize: "1.0625rem", lineHeight: 1.85, color: TEXT_MID, marginBottom: "1.5rem" }}>
            There is a second, less-discussed dimension to this pressure: the institutional knowledge problem.
          </p>
          <p style={{ fontFamily: SANS, fontWeight: 300, fontSize: "1.0625rem", lineHeight: 1.85, color: TEXT_MID, marginBottom: "1.5rem" }}>
            In most boutique wineries, the depth of operational knowledge — the protocols, the supplier relationships, the vintage-specific decisions and their outcomes — lives primarily in one person's head. The head winemaker. When that person is unavailable, on leave, or eventually moves on, a significant portion of the winery's accumulated intelligence goes with them.
          </p>
          <p style={{ fontFamily: SANS, fontWeight: 300, fontSize: "1.0625rem", lineHeight: 1.85, color: TEXT_MID, marginBottom: "1.5rem" }}>
            This is not a failure of documentation. It is a structural reality of small, craft-focused operations where the winemaker is also the cellar hand, the quality manager, and often the viticulturist. There is simply no time to write everything down. The knowledge accumulates faster than it can be captured.
          </p>
          <p style={{ fontFamily: SANS, fontWeight: 300, fontSize: "1.0625rem", lineHeight: 1.85, color: TEXT_MID, marginBottom: "3rem" }}>
            The result is what systems engineers call a <strong style={{ color: TEXT_HI, fontWeight: 500 }}>single point of failure</strong> — a configuration where the entire system's reliability depends on one component that, if it fails, brings everything else down with it.
          </p>

          {/* Section 3 */}
          <h2 style={{ fontFamily: SERIF, fontWeight: 600, fontSize: "clamp(1.4rem, 2.5vw, 1.875rem)", color: TEXT_HI, letterSpacing: "-0.01em", lineHeight: 1.2, marginBottom: "1.25rem" , textWrap: "balance" as "balance" }}>
            AI as Cognitive Relief, Not Cognitive Replacement
          </h2>
          <div style={{ width: "2.5rem", height: "1px", background: AMBER, marginBottom: "1.5rem" }} />
          <p style={{ fontFamily: SANS, fontWeight: 300, fontSize: "1.0625rem", lineHeight: 1.85, color: TEXT_MID, marginBottom: "1.5rem" }}>
            This is where the conversation about AI in winemaking needs to shift.
          </p>
          <p style={{ fontFamily: SANS, fontWeight: 300, fontSize: "1.0625rem", lineHeight: 1.85, color: TEXT_MID, marginBottom: "1.5rem" }}>
            The dominant narrative in the industry press frames AI as a threat to craft — a force that will standardise, homogenise, and eventually automate the winemaker out of existence. This framing misunderstands both the technology and the problem it is designed to solve.
          </p>
          <p style={{ fontFamily: SANS, fontWeight: 300, fontSize: "1.0625rem", lineHeight: 1.85, color: TEXT_MID, marginBottom: "1.5rem" }}>
            The winemaker's creative judgment — the sensory evaluation, the stylistic vision, the intuitive read of a vintage — is not what is under pressure during harvest. What is under pressure is the retrieval of procedural knowledge under time and cognitive load. The question at 2am is not "what kind of wine do I want to make?" It is "what is the correct DAP addition rate for a Shiraz at 120ppm YAN, given our house protocol?"
          </p>
          <p style={{ fontFamily: SANS, fontWeight: 300, fontSize: "1.0625rem", lineHeight: 1.85, color: TEXT_MID, marginBottom: "1.5rem" }}>
            That is a lookup problem. And lookup problems are precisely what well-designed AI systems solve.
          </p>
          <p style={{ fontFamily: SANS, fontWeight: 300, fontSize: "1.0625rem", lineHeight: 1.85, color: TEXT_MID, marginBottom: "1.5rem" }}>
            Ownology is built on a specific architectural principle: <strong style={{ color: TEXT_HI, fontWeight: 500 }}>document grounding</strong>. Rather than drawing on a generic corpus of wine knowledge, it answers questions from the winery's own documents — SOPs, vintage reports, supplier data sheets, laboratory protocols. The answer it returns is not a generic recommendation from the internet. It is the answer that <em>this winery</em>, with <em>this house style</em>, has already determined is correct.
          </p>
          <p style={{ fontFamily: SANS, fontWeight: 300, fontSize: "1.0625rem", lineHeight: 1.85, color: TEXT_MID, marginBottom: "3rem" }}>
            The practical effect is significant. A question that might take 15 minutes to answer by searching through binders and notebooks — or that might not get answered at all because the winemaker is already managing three other problems — takes seconds. The cognitive load does not disappear, but it is redistributed. The winemaker's working memory is freed for the decisions that genuinely require human judgment.
          </p>

          {/* Inline CTA box */}
          <div
            className="my-10 p-8"
            style={{
              background: "color-mix(in oklch, var(--ow-amber) 6%, var(--ow-bg-card))",
              border: "1px solid color-mix(in oklch, var(--ow-amber) 25%, transparent)",
              borderRadius: "2px",
            }}
          >
            <p style={{ fontFamily: SANS, fontWeight: 700, fontSize: "0.7rem", letterSpacing: "0.14em", textTransform: "uppercase", color: AMBER, marginBottom: "0.75rem" }}>
              Ownology — Early Access
            </p>
            <p style={{ fontFamily: SERIF, fontWeight: 500, fontSize: "1.125rem", color: TEXT_HI, lineHeight: 1.45, marginBottom: "1.25rem" }}>
              Give your cellar team instant access to your winery's institutional knowledge.
            </p>
            <ArticleEmailCapture />
          </div>

          {/* Section 4 */}
          <h2 style={{ fontFamily: SERIF, fontWeight: 600, fontSize: "clamp(1.4rem, 2.5vw, 1.875rem)", color: TEXT_HI, letterSpacing: "-0.01em", lineHeight: 1.2, marginBottom: "1.25rem" , textWrap: "balance" as "balance" }}>
            The Terroir Objection
          </h2>
          <div style={{ width: "2.5rem", height: "1px", background: AMBER, marginBottom: "1.5rem" }} />
          <p style={{ fontFamily: SANS, fontWeight: 300, fontSize: "1.0625rem", lineHeight: 1.85, color: TEXT_MID, marginBottom: "1.5rem" }}>
            The concern that AI will homogenise wine — that reliance on algorithmic recommendations will erode the distinctiveness of regional styles and individual winery identity — is worth taking seriously. It is not an irrational fear.
          </p>
          <p style={{ fontFamily: SANS, fontWeight: 300, fontSize: "1.0625rem", lineHeight: 1.85, color: TEXT_MID, marginBottom: "1.5rem" }}>
            But it rests on a misunderstanding of how document-grounded AI works. A system trained on Napa Valley Cabernet protocols will not give you useful answers about your cool-climate Pinot Noir. A system trained on your own vintage records, your own SO₂ targets, your own yeast selection history, will give you answers that are, by definition, specific to your winery's identity.
          </p>
          <p style={{ fontFamily: SANS, fontWeight: 300, fontSize: "1.0625rem", lineHeight: 1.85, color: TEXT_MID, marginBottom: "3rem" }}>
            The homogenisation risk is real for AI systems that draw on shared, generic knowledge bases. It is not a risk for systems that are grounded in the winery's own institutional knowledge. In fact, the opposite is true: by preserving and making accessible the accumulated decisions of a winery's history, document-grounded AI actively protects the distinctiveness of that winery's style against the most common cause of homogenisation — staff turnover and knowledge loss.
          </p>

          {/* Section 5 */}
          <h2 style={{ fontFamily: SERIF, fontWeight: 600, fontSize: "clamp(1.4rem, 2.5vw, 1.875rem)", color: TEXT_HI, letterSpacing: "-0.01em", lineHeight: 1.2, marginBottom: "1.25rem" , textWrap: "balance" as "balance" }}>
            What This Means for the Winemaker
          </h2>
          <div style={{ width: "2.5rem", height: "1px", background: AMBER, marginBottom: "1.5rem" }} />
          <p style={{ fontFamily: SANS, fontWeight: 300, fontSize: "1.0625rem", lineHeight: 1.85, color: TEXT_MID, marginBottom: "1.5rem" }}>
            The psychological reframe matters because it changes the conversation.
          </p>
          <p style={{ fontFamily: SANS, fontWeight: 300, fontSize: "1.0625rem", lineHeight: 1.85, color: TEXT_MID, marginBottom: "1.5rem" }}>
            Winemakers are not resistant to tools. They are resistant to tools that feel like surveillance, that imply their judgment is inadequate, or that threaten the craft identity they have spent years building. "AI winemaker" lands badly for exactly this reason. It positions the technology as a competitor.
          </p>
          <p style={{ fontFamily: SANS, fontWeight: 300, fontSize: "1.0625rem", lineHeight: 1.85, color: TEXT_MID, marginBottom: "1.5rem" }}>
            "Cognitive load relief" lands differently. It acknowledges the real pressure winemakers are under. It positions the technology as a support structure — the kind of knowledgeable apprentice who can find the answer in the binder while the winemaker is already moving to the next problem.
          </p>
          <p style={{ fontFamily: SANS, fontWeight: 400, fontSize: "1.0625rem", lineHeight: 1.85, color: TEXT_HI, marginBottom: "3rem" }}>
            The winemaker remains the winemaker. The knowledge remains the winery's knowledge. What changes is that neither is ever the single point of failure again.
          </p>

          {/* Section 6 */}
          <h2 style={{ fontFamily: SERIF, fontWeight: 600, fontSize: "clamp(1.4rem, 2.5vw, 1.875rem)", color: TEXT_HI, letterSpacing: "-0.01em", lineHeight: 1.2, marginBottom: "1.25rem" , textWrap: "balance" as "balance" }}>
            A Note on the Broader Landscape
          </h2>
          <div style={{ width: "2.5rem", height: "1px", background: AMBER, marginBottom: "1.5rem" }} />
          <p style={{ fontFamily: SANS, fontWeight: 300, fontSize: "1.0625rem", lineHeight: 1.85, color: TEXT_MID, marginBottom: "1.5rem" }}>
            It is worth situating this within the wider AI-in-oenology movement, because the landscape is maturing quickly.
          </p>
          <p style={{ fontFamily: SANS, fontWeight: 300, fontSize: "1.0625rem", lineHeight: 1.85, color: TEXT_MID, marginBottom: "1.5rem" }}>
            Precision viticulture tools now use satellite imaging and predictive analytics to optimise harvest timing and detect vine disease before it is visible to the human eye. Fermentation monitoring systems provide real-time sensor data on sugar levels, yeast activity, and temperature, with predictive alerts for stuck fermentations. Optical sorting systems powered by computer vision can evaluate thousands of grapes per second.
          </p>
          <p style={{ fontFamily: SANS, fontWeight: 300, fontSize: "1.0625rem", lineHeight: 1.85, color: TEXT_MID, marginBottom: "1.5rem" }}>
            These are powerful tools. But they address the vineyard and the physical process. None of them address the knowledge layer — the accumulated institutional intelligence that determines how a winery responds to what those sensors and sorters reveal.
          </p>
          <p style={{ fontFamily: SANS, fontWeight: 400, fontSize: "1.0625rem", lineHeight: 1.85, color: TEXT_HI, marginBottom: "3rem" }}>
            That is the gap Ownology fills. Not the sensors. Not the sorting. The knowledge.
          </p>

          {/* Amber rule */}
          <div style={{ width: "100%", height: "1px", background: BORDER, marginBottom: "2.5rem" }} />

          {/* About Ownology */}
          <div
            className="p-6"
            style={{ background: BG_CARD, border: `1px solid ${BORDER}`, borderRadius: "2px" }}
          >
            <p style={{ fontFamily: SANS, fontWeight: 700, fontSize: "0.65rem", letterSpacing: "0.14em", textTransform: "uppercase", color: AMBER, marginBottom: "0.75rem" }}>
              About Ownology
            </p>
            <p style={{ fontFamily: SANS, fontWeight: 300, fontSize: "0.9375rem", lineHeight: 1.75, color: TEXT_MID }}>
              Ownology is an AI knowledge assistant for boutique winemakers — built to preserve institutional knowledge, reduce cognitive load during harvest, and give every member of the cellar team instant access to the answers that matter.{" "}
              <Link href="/" style={{ color: AMBER }}>Learn more at ownology.ai →</Link>
            </p>
          </div>

          {/* Tags */}
          <div className="flex flex-wrap gap-2 mt-8">
            {["cognitive load", "harvest", "AI in winemaking", "institutional knowledge", "winemaker psychology", "boutique winery"].map((tag) => (
              <span
                key={tag}
                style={{
                  fontFamily: MONO,
                  fontSize: "0.65rem",
                  color: TEXT_LO,
                  border: `1px solid ${BORDER}`,
                  padding: "0.2rem 0.6rem",
                  borderRadius: "2px",
                }}
              >
                {tag}
              </span>
            ))}
          </div>
        </div>
      </article>

      {/* Back to blog */}
      <section className="py-12 border-t" style={{ borderColor: BORDER }}>
        <div className="container max-w-3xl flex items-center justify-between flex-wrap gap-4">
          <Link
            href="/blog"
            style={{
              fontFamily: SANS,
              fontWeight: 300,
              fontSize: "0.9375rem",
              color: TEXT_LO,
              display: "flex",
              alignItems: "center",
              gap: "0.5rem",
            }}
          >
            ← Back to Cellar Intelligence
          </Link>
          <Link
            href="/"
            style={{
              fontFamily: SANS,
              fontWeight: 600,
              fontSize: "0.8rem",
              letterSpacing: "0.08em",
              textTransform: "uppercase",
              color: AMBER,
            }}
          >
            Visit Ownology →
          </Link>
        </div>
      </section>

      {/* Footer */}
      <footer
        className="py-8 border-t"
        style={{ borderColor: BORDER, background: "var(--ow-bg-raised)" }}
      >
        <div className="container flex flex-col sm:flex-row items-center justify-between gap-4">
          <OwnologyLogo size={24} />
          <p style={{ fontFamily: MONO, fontSize: "0.7rem", color: TEXT_LO }}>
            © {new Date().getFullYear()} Ownology. All rights reserved.
          </p>
          <Link href="/" style={{ fontFamily: SANS, fontWeight: 300, fontSize: "0.8rem", color: TEXT_LO }}>
            ownology.ai
          </Link>
        </div>
      </footer>
    </div>
  );
}
