/**
 * Blog — Ownology Thought Leadership
 * Design: Matches Cellar Intelligence dark artisan aesthetic.
 * Index page listing all articles as cards. SEO-friendly structure.
 */

import { Link } from "wouter";
import { useEffect, useState } from "react";
import OwnologyLogo from "@/components/OwnologyLogo";

const AMBER = "var(--ow-amber)";
const SERIF = "'Fraunces', serif";
const SANS = "'Lato', sans-serif";
const TEXT_HI = "var(--ow-text-hi)";
const TEXT_MID = "var(--ow-text-mid)";
const TEXT_LO = "var(--ow-text-lo)";
const BG_BASE = "var(--ow-bg-base)";


const ARTICLES = [
  {
    slug: "two-philosophies",
    title: "Two Philosophies, One Grape: What Boutique and Commercial Winemaking Actually Have in Common — and Where They Diverge",
    excerpt:
      "Boutique and commercial wine production are not different philosophies applied to the same process. They are fundamentally different processes that happen to share a raw material. Understanding the distinction matters for anyone building tools that serve the wine industry.",
    date: "May 2026",
    readTime: "8 min read",
    category: "Winemaking Science",
    tags: ["boutique winemaking", "commercial winemaking", "winery equipment", "AI in winemaking"],
  },
  {
    slug: "weight-of-harvest",
    title: "The Weight of Harvest: Why the Winemaker's Greatest Risk Is Not the Weather",
    excerpt:
      "There is a moment that every winemaker knows. It arrives somewhere around the third week of vintage — usually at 2am, usually in the middle of a stuck fermentation. This is not a technical problem. It is a cognitive one.",
    date: "May 2026",
    readTime: "7 min read",
    category: "Winemaker Psychology",
    tags: ["cognitive load", "harvest", "AI in winemaking", "institutional knowledge"],
  },
];

function BlogEmailCapture() {
  const [email, setEmail] = useState("");
  const [status, setStatus] = useState<"idle" | "loading" | "success" | "error">("idle");
  const [errorMsg, setErrorMsg] = useState("");

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!email.trim() || status === "loading") return;
    setStatus("loading");
    setErrorMsg("");
    try {
      const res = await fetch("https://api.buttondown.email/v1/subscribers", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Token ${import.meta.env.VITE_BUTTONDOWN_API_KEY ?? ""}`,
        },
        body: JSON.stringify({ email_address: email, tags: ["waitlist", "blog"] }),
      });
      if (res.status === 201 || res.status === 200) {
        setStatus("success");
        setEmail("");
      } else if (res.status === 422) {
        setStatus("success");
      } else {
        throw new Error("Signup failed");
      }
    } catch {
      setStatus("error");
      setErrorMsg("Something went wrong. Please try again or email hello@ownology.ai");
    }
  };

  if (status === "success") {
    return (
      <div
        className="py-5 px-8 inline-block"
        style={{
          background: "color-mix(in oklch, var(--ow-amber) 10%, transparent)",
          border: "1px solid color-mix(in oklch, var(--ow-amber) 30%, transparent)",
          borderRadius: "2px",
        }}
      >
        <p style={{ fontFamily: SERIF, fontWeight: 500, fontSize: "1.125rem", color: TEXT_HI }}>
          You're on the list. We'll be in touch.
        </p>
        <p style={{ fontFamily: SANS, fontWeight: 300, fontSize: "0.875rem", color: TEXT_MID, marginTop: "0.5rem" }}>
          In the meantime, explore the full site at{" "}
          <Link href="/" style={{ color: AMBER }}>ownology.ai</Link>
        </p>
      </div>
    );
  }

  return (
    <div>
      <form onSubmit={handleSubmit} className="flex flex-col sm:flex-row gap-3 max-w-md mx-auto mb-4">
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
      </form>
      {status === "error" && (
        <p style={{ fontFamily: SANS, fontSize: "0.875rem", color: "oklch(0.65 0.15 30)", marginBottom: "0.75rem" }}>
          {errorMsg}
        </p>
      )}
      <p style={{ fontFamily: SANS, fontSize: "0.8125rem", color: TEXT_LO }}>
        Or{" "}
        <a href="mailto:hello@ownology.ai" style={{ color: AMBER }}>talk to us directly</a>
        {" "}&mdash; we respond within one business day.
      </p>
    </div>
  );
}

const ALL_CATEGORIES = ["All", ...Array.from(new Set(ARTICLES.map((a) => a.category)))];

export default function Blog() {
  const [activeCategory, setActiveCategory] = useState<string>("All");

  const filteredArticles = activeCategory === "All"
    ? ARTICLES
    : ARTICLES.filter((a) => a.category === activeCategory);

  useEffect(() => {
    document.title = "Cellar Intelligence Blog — Ownology";
    // Set meta description
    let meta = document.querySelector('meta[name="description"]') as HTMLMetaElement | null;
    if (!meta) {
      meta = document.createElement("meta");
      meta.name = "description";
      document.head.appendChild(meta);
    }
    meta.content =
      "Thought leadership for boutique winemakers — on AI, cognitive load, harvest pressure, and the future of cellar intelligence.";
  }, []);

  return (
    <div style={{ background: "var(--ow-bg-base)", minHeight: "100vh" }}>
      {/* Nav */}
      <nav
        className="sticky top-0 z-50 border-b"
        style={{
          background: "var(--ow-bg-base)",
          borderColor: "var(--ow-border)",
        }}
      >
        <div className="container flex items-center justify-between py-5">
          <Link href="/">
            <OwnologyLogo size={32} />
          </Link>
          <div className="flex items-center gap-6">
            <Link
              href="/"
              style={{
                fontFamily: "'Lato', sans-serif",
                fontWeight: 300,
                fontSize: "0.875rem",
                color: "var(--ow-text-lo)",
                letterSpacing: "0.02em",
              }}
            >
              ← Back to Ownology
            </Link>
          </div>
        </div>
      </nav>

      {/* Hero */}
      <section className="pt-20 pb-16 border-b" style={{ borderColor: "var(--ow-border)" }}>
        <div className="container max-w-4xl">
          <p
            style={{
              fontFamily: "'Lato', sans-serif",
              fontWeight: 700,
              fontSize: "0.7rem",
              letterSpacing: "0.18em",
              textTransform: "uppercase",
              color: "var(--ow-amber)",
              marginBottom: "1.25rem",
            }}
          >
            Cellar Intelligence
          </p>
          <h1
            style={{
              fontFamily: "'Fraunces', serif",
              fontWeight: 700,
              fontSize: "clamp(2.2rem, 5vw, 3.5rem)",
              lineHeight: 1.1,
              color: "var(--ow-text-hi)",
              letterSpacing: "-0.02em",
              marginBottom: "1.25rem",
            }}
          >
            Thinking about wine,<br />
            <em style={{ color: "var(--ow-amber)", fontStyle: "italic" }}>craft, and intelligence.</em>
          </h1>
          <p
            style={{
              fontFamily: "'Lato', sans-serif",
              fontWeight: 300,
              fontSize: "1.0625rem",
              lineHeight: 1.75,
              color: "var(--ow-text-mid)",
              maxWidth: "560px",
            }}
          >
            Thought leadership for boutique winemakers — on AI, cognitive load, harvest pressure,
            and the future of cellar intelligence.
          </p>
        </div>
      </section>

      {/* Article list */}
      <section className="py-16">
        <div className="container max-w-4xl">
          {/* Category filter */}
          <div className="flex flex-wrap gap-2 mb-10">
            {ALL_CATEGORIES.map((cat) => (
              <button
                key={cat}
                onClick={() => setActiveCategory(cat)}
                style={{
                  fontFamily: "'Lato', sans-serif",
                  fontWeight: activeCategory === cat ? 700 : 300,
                  fontSize: "0.8125rem",
                  letterSpacing: activeCategory === cat ? "0.1em" : "0.04em",
                  textTransform: "uppercase",
                  padding: "0.4rem 1rem",
                  borderRadius: "2px",
                  border: activeCategory === cat
                    ? "1px solid var(--ow-amber)"
                    : "1px solid var(--ow-border)",
                  background: activeCategory === cat
                    ? "color-mix(in oklch, var(--ow-amber) 12%, transparent)"
                    : "transparent",
                  color: activeCategory === cat ? "var(--ow-amber)" : "var(--ow-text-lo)",
                  cursor: "pointer",
                  transition: "all 0.15s ease",
                }}
                onMouseEnter={(e) => {
                  if (activeCategory !== cat) {
                    (e.currentTarget as HTMLElement).style.borderColor = "var(--ow-amber)";
                    (e.currentTarget as HTMLElement).style.color = "var(--ow-text-mid)";
                  }
                }}
                onMouseLeave={(e) => {
                  if (activeCategory !== cat) {
                    (e.currentTarget as HTMLElement).style.borderColor = "var(--ow-border)";
                    (e.currentTarget as HTMLElement).style.color = "var(--ow-text-lo)";
                  }
                }}
              >
                {cat}
              </button>
            ))}
          </div>

          <div className="flex flex-col gap-8">
            {filteredArticles.map((article) => (
              <Link key={article.slug} href={`/blog/${article.slug}`}>
                <article
                  className="group block p-8 transition-all duration-200"
                  style={{
                    background: "var(--ow-bg-card)",
                    border: "1px solid var(--ow-border)",
                    borderRadius: "2px",
                    cursor: "pointer",
                  }}
                  onMouseEnter={(e) => {
                    (e.currentTarget as HTMLElement).style.borderColor = "var(--ow-amber)";
                    (e.currentTarget as HTMLElement).style.background = "var(--ow-bg-raised)";
                  }}
                  onMouseLeave={(e) => {
                    (e.currentTarget as HTMLElement).style.borderColor = "var(--ow-border)";
                    (e.currentTarget as HTMLElement).style.background = "var(--ow-bg-card)";
                  }}
                >
                  {/* Category + meta */}
                  <div className="flex items-center gap-4 mb-4">
                    <span
                      style={{
                        fontFamily: "'Lato', sans-serif",
                        fontWeight: 700,
                        fontSize: "0.65rem",
                        letterSpacing: "0.14em",
                        textTransform: "uppercase",
                        color: "var(--ow-amber)",
                        background: "oklch(0.72 0.12 75 / 0.1)",
                        padding: "0.2rem 0.6rem",
                        borderRadius: "2px",
                      }}
                    >
                      {article.category}
                    </span>
                    <span
                      style={{
                        fontFamily: "'Fira Code', monospace",
                        fontSize: "0.7rem",
                        color: "var(--ow-text-lo)",
                      }}
                    >
                      {article.date} · {article.readTime}
                    </span>
                  </div>

                  {/* Title */}
                  <h2
                    style={{
                      fontFamily: "'Fraunces', serif",
                      fontWeight: 600,
                      fontSize: "clamp(1.25rem, 2.5vw, 1.625rem)",
                      lineHeight: 1.25,
                      color: "var(--ow-text-hi)",
                      letterSpacing: "-0.01em",
                      marginBottom: "0.875rem",
                      transition: "color 0.15s",
                    }}
                  >
                    {article.title}
                  </h2>

                  {/* Excerpt */}
                  <p
                    style={{
                      fontFamily: "'Lato', sans-serif",
                      fontWeight: 300,
                      fontSize: "1rem",
                      lineHeight: 1.75,
                      color: "var(--ow-text-mid)",
                      marginBottom: "1.25rem",
                    }}
                  >
                    {article.excerpt}
                  </p>

                  {/* Tags + CTA */}
                  <div className="flex items-center justify-between flex-wrap gap-3">
                    <div className="flex flex-wrap gap-2">
                      {article.tags.map((tag) => (
                        <span
                          key={tag}
                          style={{
                            fontFamily: "'Fira Code', monospace",
                            fontSize: "0.65rem",
                            color: "var(--ow-text-lo)",
                            border: "1px solid var(--ow-border)",
                            padding: "0.15rem 0.5rem",
                            borderRadius: "2px",
                          }}
                        >
                          {tag}
                        </span>
                      ))}
                    </div>
                    <span
                      style={{
                        fontFamily: "'Lato', sans-serif",
                        fontWeight: 600,
                        fontSize: "0.8rem",
                        letterSpacing: "0.08em",
                        textTransform: "uppercase",
                        color: "var(--ow-amber)",
                      }}
                    >
                      Read article →
                    </span>
                  </div>
                </article>
              </Link>
            ))}
          </div>
        </div>
      </section>

      {/* CTA */}
      <section
        className="py-16 border-t"
        style={{ borderColor: "var(--ow-border)" }}
      >
        <div className="container max-w-2xl text-center">
          <p
            style={{
              fontFamily: "'Fraunces', serif",
              fontStyle: "italic",
              fontWeight: 300,
              fontSize: "clamp(1.3rem, 2.5vw, 1.75rem)",
              lineHeight: 1.4,
              color: "var(--ow-text-hi)",
              marginBottom: "2rem",
            }}
          >
            "The knowledge is there. The bandwidth is not."
          </p>
          <p
            style={{
              fontFamily: "'Lato', sans-serif",
              fontWeight: 300,
              fontSize: "1rem",
              color: "var(--ow-text-mid)",
              marginBottom: "2rem",
            }}
          >
            Ownology gives boutique winery teams instant access to their own institutional knowledge — during harvest, when it matters most.
          </p>
          <BlogEmailCapture />
        </div>
      </section>

      {/* Footer */}
      <footer
        className="py-8 border-t"
        style={{
          borderColor: "var(--ow-border)",
          background: "var(--ow-bg-raised)",
        }}
      >
        <div className="container flex flex-col sm:flex-row items-center justify-between gap-4">
          <OwnologyLogo size={24} />
          <p
            style={{
              fontFamily: "'Fira Code', monospace",
              fontSize: "0.7rem",
              color: "var(--ow-text-lo)",
            }}
          >
            © {new Date().getFullYear()} Ownology. All rights reserved.
          </p>
          <Link
            href="/"
            style={{
              fontFamily: "'Lato', sans-serif",
              fontWeight: 300,
              fontSize: "0.8rem",
              color: "var(--ow-text-lo)",
            }}
          >
            ownology.ai
          </Link>
        </div>
      </footer>
    </div>
  );
}
