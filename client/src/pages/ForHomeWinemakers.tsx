/**
 * ForHomeWinemakers — /for-home-winemakers
 * Dedicated landing page for the home DIY winemaker audience.
 * Explains what Ownology does for home winemakers, links to the kit checklist and Compliance AI.
 */
import { Link } from "wouter";
import OwnologyLogo from "@/components/OwnologyLogo";

const SERIF = "'Fraunces', serif";
const SANS = "'Lato', sans-serif";

const FEATURES = [
  {
    icon: "🍇",
    title: "AI that speaks home winemaker",
    desc: "Ask questions in plain language — 'my fermentation stopped at 1.020, what do I do?' — and get answers grounded in real home winemaking practice, not commercial winery regulations.",
  },
  {
    icon: "🧰",
    title: "Equipment checklist",
    desc: "A complete, categorised shopping list for a 30-bottle home winery kit setup. Tick off items as you buy them, then print or save as PDF.",
  },
  {
    icon: "📋",
    title: "Cellar task tracker",
    desc: "Log your cleaning and sanitising tasks per piece of equipment. Ownology generates the right protocol for each item — Big Mouth Bubbler, carboy, auto siphon, corker.",
  },
  {
    icon: "📅",
    title: "Vintage milestone calendar",
    desc: "Log your inoculation date and Ownology projects your first racking, second racking, and bottling windows — adjusted for kit wine timelines.",
  },
  {
    icon: "🔧",
    title: "Troubleshooting guide",
    desc: "7 common home winemaking faults with causes and fixes: stuck ferment, volatile acidity, cloudiness, re-fermentation in the bottle, cork taint, and more.",
  },
  {
    icon: "📖",
    title: "Plain-English glossary",
    desc: "Brix, SG, MLF, K-meta, bentonite, racking, lees, fining — every term you'll encounter in a kit instruction sheet, explained without jargon.",
  },
];

const SAMPLE_QUESTIONS = [
  "My fermentation has stalled at 1.020 SG — what should I do?",
  "How do I know when my wine is ready to rack for the first time?",
  "What is the correct way to sanitise my Big Mouth Bubbler and carboy?",
  "When should I add the fining agent from my kit?",
  "How do I use the marbles trick to top up my demijohn?",
  "What yeast strain should I use for a Shiraz?",
];

export default function ForHomeWinemakers() {
  return (
    <div style={{ background: "var(--ow-bg-base)", minHeight: "100vh" }}>
      {/* Nav */}
      <nav
        className="sticky top-0 z-50 border-b"
        style={{ background: "var(--ow-bg-base)", borderColor: "var(--ow-border)" }}
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
                color: "var(--ow-amber)",
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
              fontFamily: SANS,
              fontWeight: 700,
              fontSize: "0.7rem",
              letterSpacing: "0.18em",
              textTransform: "uppercase",
              color: "var(--ow-amber)",
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
              color: "var(--ow-text-hi)",
              letterSpacing: "-0.02em",
              marginBottom: "1.25rem",
            }}
          >
            Your garage cellar's<br />
            <em style={{ color: "var(--ow-amber)", fontStyle: "italic" }}>most knowledgeable friend.</em>
          </h1>
          <p
            style={{
              fontFamily: SANS,
              fontWeight: 300,
              fontSize: "1.0625rem",
              lineHeight: 1.75,
              color: "var(--ow-text-mid)",
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
                background: "var(--ow-amber)",
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
                color: "var(--ow-text-mid)",
                fontFamily: SANS,
                fontWeight: 300,
                fontSize: "0.9rem",
                borderRadius: "2px",
                border: "1px solid var(--ow-border)",
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
      <section className="py-16 border-b" style={{ borderColor: "var(--ow-border)" }}>
        <div className="container max-w-4xl">
          <p
            style={{
              fontFamily: SANS,
              fontWeight: 700,
              fontSize: "0.7rem",
              letterSpacing: "0.18em",
              textTransform: "uppercase",
              color: "var(--ow-amber)",
              marginBottom: "2rem",
            }}
          >
            What Ownology does for home winemakers
          </p>
          <div className="grid sm:grid-cols-2 gap-6">
            {FEATURES.map((f) => (
              <div
                key={f.title}
                style={{
                  background: "var(--ow-bg-raised)",
                  border: "1px solid var(--ow-border)",
                  borderRadius: "2px",
                  padding: "1.5rem",
                }}
              >
                <div style={{ fontSize: "1.75rem", marginBottom: "0.75rem" }}>{f.icon}</div>
                <p
                  style={{
                    fontFamily: SERIF,
                    fontWeight: 600,
                    fontSize: "1.0625rem",
                    color: "var(--ow-text-hi)",
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
                    color: "var(--ow-text-lo)",
                    lineHeight: 1.7,
                  }}
                >
                  {f.desc}
                </p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Sample questions */}
      <section className="py-16 border-b" style={{ borderColor: "var(--ow-border)" }}>
        <div className="container max-w-4xl">
          <p
            style={{
              fontFamily: SANS,
              fontWeight: 700,
              fontSize: "0.7rem",
              letterSpacing: "0.18em",
              textTransform: "uppercase",
              color: "var(--ow-amber)",
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
                  background: "var(--ow-bg-raised)",
                  border: "1px solid var(--ow-border)",
                  borderRadius: "2px",
                  textDecoration: "none",
                  gap: "1rem",
                  transition: "border-color 0.15s ease",
                }}
                onMouseEnter={(e) =>
                  ((e.currentTarget as HTMLAnchorElement).style.borderColor = "var(--ow-amber)")
                }
                onMouseLeave={(e) =>
                  ((e.currentTarget as HTMLAnchorElement).style.borderColor = "var(--ow-border)")
                }
              >
                <span
                  style={{
                    fontFamily: SANS,
                    fontWeight: 300,
                    fontSize: "0.9rem",
                    color: "var(--ow-text-mid)",
                    lineHeight: 1.5,
                  }}
                >
                  {q}
                </span>
                <span style={{ color: "var(--ow-amber)", fontSize: "1rem", flexShrink: 0 }}>→</span>
              </Link>
            ))}
          </div>
        </div>
      </section>

      {/* Resources strip */}
      <section className="py-16 border-b" style={{ borderColor: "var(--ow-border)" }}>
        <div className="container max-w-4xl">
          <p
            style={{
              fontFamily: SANS,
              fontWeight: 700,
              fontSize: "0.7rem",
              letterSpacing: "0.18em",
              textTransform: "uppercase",
              color: "var(--ow-amber)",
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
            ].map((card) => (
              <Link
                key={card.href}
                href={card.href}
                style={{
                  display: "block",
                  background: "var(--ow-bg-raised)",
                  border: "1px solid var(--ow-border)",
                  borderRadius: "2px",
                  padding: "1.25rem",
                  textDecoration: "none",
                  transition: "border-color 0.15s ease",
                }}
                onMouseEnter={(e) =>
                  ((e.currentTarget as HTMLAnchorElement).style.borderColor = "var(--ow-amber)")
                }
                onMouseLeave={(e) =>
                  ((e.currentTarget as HTMLAnchorElement).style.borderColor = "var(--ow-border)")
                }
              >
                <div style={{ fontSize: "1.5rem", marginBottom: "0.5rem" }}>{card.icon}</div>
                <p
                  style={{
                    fontFamily: SERIF,
                    fontWeight: 600,
                    fontSize: "1rem",
                    color: "var(--ow-text-hi)",
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
                    color: "var(--ow-text-lo)",
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
              color: "var(--ow-text-hi)",
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
              color: "var(--ow-text-mid)",
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
              background: "var(--ow-amber)",
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
