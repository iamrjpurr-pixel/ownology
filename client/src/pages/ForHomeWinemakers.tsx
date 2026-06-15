/**
 * ForHomeWinemakers — /for-home-winemakers
 * Dedicated landing page for the home DIY winemaker audience.
 * Explains what Ownology does for home winemakers, links to the kit checklist and Compliance AI.
 */
import { Link } from "wouter";
import OwnologyLogo from "@/components/OwnologyLogo";

const SERIF = "'Fraunces', serif";
const SANS = "'Lato', sans-serif";

const FEATURES: { icon: string; title: string; desc: string; href: string }[] = [
  {
    icon: "🍇",
    title: "AI that speaks home winemaker",
    desc: "Ask questions in plain language — 'my fermentation stopped at 1.020, what do I do?' — and get answers grounded in real home winemaking practice, not commercial winery regulations.",
    href: "/free-run",
  },
  {
    icon: "📚",
    title: "DIY Knowledge Hub",
    desc: "Step-by-step guides for home winemakers. Fermentation, bottling, cleaning, MLF — written in plain English with no commercial jargon.",
    href: "/for-home-winemakers/knowledge",
  },
  {
    icon: "📋",
    title: "Cellar task tracker",
    desc: "Log your cleaning and sanitising tasks per piece of equipment. Ownology generates the right protocol for each item — Big Mouth Bubbler, carboy, auto siphon, corker.",
    href: "/press",
  },
  {
    icon: "📅",
    title: "Vintage milestone calendar",
    desc: "Log your inoculation date and Ownology projects your first racking, second racking, and bottling windows — adjusted for kit wine timelines.",
    href: "/press",
  },
  {
    icon: "🔧",
    title: "Troubleshooting guide",
    desc: "7 common home winemaking faults with causes and fixes: stuck ferment, volatile acidity, cloudiness, re-fermentation in the bottle, cork taint, and more.",
    href: "/for-home-winemakers/knowledge/category/Fermentation%20Management",
  },
  {
    icon: "❓",
    title: "Ask a question",
    desc: "Brix, SG, MLF, K-meta, bentonite, racking, lees, fining — ask Ownology to explain any winemaking term or process in plain English.",
    href: "/free-run",
  },
];

const SAMPLE_QUESTIONS = [
  "My fermentation has stalled at 1.020 SG — what should I do?",
  "How do I know when my wine is ready to rack for the first time?",
  "What is the correct way to sanitise my Big Mouth Bubbler and carboy?",
  "When should I add the fining agent from my kit?",
  "My wine smells like vinegar — is it ruined?",
  "What is MLF and do I need to do it for a kit red wine?",
];

export default function ForHomeWinemakers() {
  return (
    <div style={{ background: "oklch(0.11 0.008 60)", minHeight: "100vh" }}>
      {/* Nav */}
      <nav
        className="sticky top-0 z-50 border-b"
        style={{ background: "oklch(0.11 0.008 60)", borderColor: "oklch(1 0 0 / 0.08)" }}
      >
        <div className="container flex items-center justify-between py-5">
          <Link href="/">
            <OwnologyLogo size={32} />
          </Link>
          <div className="flex items-center gap-6">
            <Link
              href="/free-run"
              style={{
                fontFamily: SANS,
                fontWeight: 300,
                fontSize: "0.875rem",
                color: "oklch(0.72 0.12 75)",
                letterSpacing: "0.02em",
              }}
            >
              Ask a Question →
            </Link>
            <Link
              href="/"
              style={{
                fontFamily: SANS,
                fontWeight: 300,
                fontSize: "0.875rem",
                color: "oklch(0.50 0.010 75)",
                letterSpacing: "0.02em",
              }}
            >
              ← Back to Ownology
            </Link>
          </div>
        </div>
      </nav>

      {/* Hero */}
      <section className="pt-20 pb-16 border-b" style={{ borderColor: "oklch(1 0 0 / 0.08)" }}>
        <div className="container max-w-4xl">
          <p
            style={{
              fontFamily: SANS,
              fontWeight: 700,
              fontSize: "0.7rem",
              letterSpacing: "0.18em",
              textTransform: "uppercase",
              color: "oklch(0.72 0.12 75)",
              marginBottom: "1.25rem",
            }}
          >
            For Home Winemakers
          </p>
          <h1
            style={{
              fontFamily: SERIF,
              fontWeight: 700,
              fontSize: "clamp(2rem, 4.5vw, 3rem)",
              lineHeight: 1.1,
              color: "oklch(0.92 0.018 75)",
              letterSpacing: "-0.02em",
              marginBottom: "1.25rem",
            }}
          >
            Your garage cellar's<br />
            <em style={{ color: "oklch(0.72 0.12 75)", fontStyle: "italic" }}>most knowledgeable friend.</em>
          </h1>
          <p
            style={{
              fontFamily: SANS,
              fontWeight: 300,
              fontSize: "1.0625rem",
              lineHeight: 1.75,
              color: "oklch(0.68 0.013 75)",
              maxWidth: "560px",
              marginBottom: "2rem",
            }}
          >
            Ownology gives home winemakers instant, practical answers to their toughest kit questions
            — from your phone, in seconds, while you're standing over a Big Mouth Bubbler.
            No commercial licence required. No winery jargon.
          </p>
          <div style={{ display: "flex", flexWrap: "wrap", gap: "0.75rem" }}>
            <Link
              href="/free-run"
              style={{
                display: "inline-flex",
                alignItems: "center",
                gap: "0.4rem",
                padding: "0.75rem 1.5rem",
                background: "oklch(0.72 0.12 75)",
                color: "oklch(0.10 0.008 60)",
                fontFamily: SANS,
                fontWeight: 700,
                fontSize: "0.9rem",
                borderRadius: "2px",
                textDecoration: "none",
                letterSpacing: "0.04em",
                textTransform: "uppercase",
              }}
            >
              Ask a Question
            </Link>
            <Link
              href="/resources/home-winery-kit"
              style={{
                display: "inline-flex",
                alignItems: "center",
                gap: "0.4rem",
                padding: "0.75rem 1.5rem",
                background: "transparent",
                color: "oklch(0.68 0.013 75)",
                fontFamily: SANS,
                fontWeight: 300,
                fontSize: "0.9rem",
                borderRadius: "2px",
                border: "1px solid oklch(1 0 0 / 0.08)",
                textDecoration: "none",
                letterSpacing: "0.04em",
                textTransform: "uppercase",
              }}
            >
              Equipment Checklist
            </Link>
          </div>
        </div>
      </section>

      {/* Features grid */}
      <section className="py-16 border-b" style={{ borderColor: "oklch(1 0 0 / 0.08)" }}>
        <div className="container max-w-4xl">
          <p
            style={{
              fontFamily: SANS,
              fontWeight: 700,
              fontSize: "0.7rem",
              letterSpacing: "0.18em",
              textTransform: "uppercase",
              color: "oklch(0.72 0.12 75)",
              marginBottom: "2rem",
            }}
          >
            What Ownology does for home winemakers
          </p>
          <div className="grid sm:grid-cols-2 gap-6">
            {FEATURES.map((f) => (
              <Link
                key={f.title}
                href={f.href}
                style={{
                  background: "oklch(0.14 0.009 60)",
                  border: "1px solid oklch(1 0 0 / 0.08)",
                  borderRadius: "2px",
                  padding: "1.5rem",
                  display: "block",
                  textDecoration: "none",
                  transition: "border-color 0.15s ease",
                }}
                onMouseEnter={(e) => { (e.currentTarget as HTMLAnchorElement).style.borderColor = "oklch(0.72 0.12 75 / 40%)"; }}
                onMouseLeave={(e) => { (e.currentTarget as HTMLAnchorElement).style.borderColor = "oklch(1 0 0 / 0.08)"; }}
              >
                <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", marginBottom: "0.75rem" }}>
                  <span style={{ fontSize: "1.75rem" }}>{f.icon}</span>
                  <span style={{ color: "oklch(0.72 0.12 75)", fontSize: "1rem" }}>→</span>
                </div>
                <p
                  style={{
                    fontFamily: SERIF,
                    fontWeight: 600,
                    fontSize: "1.0625rem",
                    color: "oklch(0.92 0.018 75)",
                    marginBottom: "0.5rem",
                  }}
                >
                  {f.title}
                </p>
                <p
                  style={{
                    fontFamily: SANS,
                    fontWeight: 300,
                    fontSize: "0.875rem",
                    color: "oklch(0.50 0.010 75)",
                    lineHeight: 1.7,
                  }}
                >
                  {f.desc}
                </p>
              </Link>
            ))}
          </div>
        </div>
      </section>

      {/* Sample questions */}
      <section className="py-16 border-b" style={{ borderColor: "oklch(1 0 0 / 0.08)" }}>
        <div className="container max-w-4xl">
          <p
            style={{
              fontFamily: SANS,
              fontWeight: 700,
              fontSize: "0.7rem",
              letterSpacing: "0.18em",
              textTransform: "uppercase",
              color: "oklch(0.72 0.12 75)",
              marginBottom: "1rem",
            }}
          >
            Questions you can ask right now
          </p>
          <div className="flex flex-col gap-2">
            {SAMPLE_QUESTIONS.map((q) => (
              <Link
                key={q}
                href={`/free-run?q=${encodeURIComponent(q)}`}
                style={{
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "space-between",
                  padding: "0.875rem 1.25rem",
                  background: "oklch(0.14 0.009 60)",
                  border: "1px solid oklch(1 0 0 / 0.08)",
                  borderRadius: "2px",
                  textDecoration: "none",
                  gap: "1rem",
                  transition: "border-color 0.15s ease",
                }}
                onMouseEnter={(e) =>
                  ((e.currentTarget as HTMLAnchorElement).style.borderColor = "oklch(0.72 0.12 75)")
                }
                onMouseLeave={(e) =>
                  ((e.currentTarget as HTMLAnchorElement).style.borderColor = "oklch(1 0 0 / 0.08)")
                }
              >
                <span
                  style={{
                    fontFamily: SANS,
                    fontWeight: 300,
                    fontSize: "0.9rem",
                    color: "oklch(0.68 0.013 75)",
                    lineHeight: 1.5,
                  }}
                >
                  {q}
                </span>
                <span style={{ color: "oklch(0.72 0.12 75)", fontSize: "1rem", flexShrink: 0 }}>→</span>
              </Link>
            ))}
          </div>
        </div>
      </section>

      {/* Resources strip */}
      <section className="py-16 border-b" style={{ borderColor: "oklch(1 0 0 / 0.08)" }}>
        <div className="container max-w-4xl">
          <p
            style={{
              fontFamily: SANS,
              fontWeight: 700,
              fontSize: "0.7rem",
              letterSpacing: "0.18em",
              textTransform: "uppercase",
              color: "oklch(0.72 0.12 75)",
              marginBottom: "1.25rem",
            }}
          >
            Free resources
          </p>
          <div className="grid sm:grid-cols-3 gap-4">
            {[
              {
                href: "/resources/home-winery-kit",
                icon: "🧰",
                title: "Equipment Checklist",
                desc: "Complete 30-bottle home winery kit shopping list with tick-off tracker and PDF export.",
              },
              {
                href: "/for-home-winemakers/troubleshooting",
                icon: "🔧",
                title: "Troubleshooting Guide",
                desc: "7 common faults — stuck ferment, VA, cloudiness, re-fermentation — with causes and fixes.",
              },
              {
                href: "/for-home-winemakers/glossary",
                icon: "📖",
                title: "Glossary",
                desc: "Plain-English definitions for every term in your kit instruction sheet.",
              },
              {
                href: "/for-home-winemakers/knowledge",
                icon: "📋",
                title: "Step-by-Step Guides",
                desc: "Plain-English SOPs for fermentation, cleaning, and bottling — written for home winemakers.",
              },
            ].map((card) => (
              <Link
                key={card.href}
                href={card.href}
                style={{
                  display: "block",
                  background: "oklch(0.14 0.009 60)",
                  border: "1px solid oklch(1 0 0 / 0.08)",
                  borderRadius: "2px",
                  padding: "1.25rem",
                  textDecoration: "none",
                  transition: "border-color 0.15s ease",
                }}
                onMouseEnter={(e) =>
                  ((e.currentTarget as HTMLAnchorElement).style.borderColor = "oklch(0.72 0.12 75)")
                }
                onMouseLeave={(e) =>
                  ((e.currentTarget as HTMLAnchorElement).style.borderColor = "oklch(1 0 0 / 0.08)")
                }
              >
                <div style={{ fontSize: "1.5rem", marginBottom: "0.5rem" }}>{card.icon}</div>
                <p
                  style={{
                    fontFamily: SERIF,
                    fontWeight: 600,
                    fontSize: "1rem",
                    color: "oklch(0.92 0.018 75)",
                    marginBottom: "0.4rem",
                  }}
                >
                  {card.title}
                </p>
                <p
                  style={{
                    fontFamily: SANS,
                    fontWeight: 300,
                    fontSize: "0.8125rem",
                    color: "oklch(0.50 0.010 75)",
                    lineHeight: 1.6,
                  }}
                >
                  {card.desc}
                </p>
              </Link>
            ))}
          </div>
        </div>
      </section>

      {/* Final CTA */}
      <section className="py-16">
        <div className="container max-w-4xl text-center">
          <p
            style={{
              fontFamily: SERIF,
              fontWeight: 700,
              fontSize: "clamp(1.5rem, 3vw, 2rem)",
              color: "oklch(0.92 0.018 75)",
              marginBottom: "1rem",
            }}
          >
            Ready to make better wine?
          </p>
          <p
            style={{
              fontFamily: SANS,
              fontWeight: 300,
              fontSize: "1rem",
              color: "oklch(0.68 0.013 75)",
              marginBottom: "2rem",
              maxWidth: "420px",
              margin: "0 auto 2rem",
              lineHeight: 1.7,
            }}
          >
            Join the Ownology waitlist and be the first to access the full home winemaker toolkit.
          </p>
          <Link
            href="/"
            style={{
              display: "inline-flex",
              alignItems: "center",
              gap: "0.4rem",
              padding: "0.875rem 2rem",
              background: "oklch(0.72 0.12 75)",
              color: "oklch(0.10 0.008 60)",
              fontFamily: SANS,
              fontWeight: 700,
              fontSize: "0.9rem",
              borderRadius: "2px",
              textDecoration: "none",
              letterSpacing: "0.04em",
              textTransform: "uppercase",
            }}
          >
            Join the Waitlist
          </Link>
        </div>
      </section>
    </div>
  );
}
