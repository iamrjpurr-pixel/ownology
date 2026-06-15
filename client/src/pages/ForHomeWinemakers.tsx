/**
 * ForHomeWinemakers — /for-home-winemakers
 * Dedicated landing page for the home DIY winemaker audience.
 * Inline AI chat widget replaces static Q&A list.
 */
import { useState, useRef } from "react";
import { Link } from "wouter";
import OwnologyLogo from "@/components/OwnologyLogo";
import { trpc } from "@/lib/trpc";

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
    icon: "📖",
    title: "Step-by-step guides",
    desc: "Brix, SG, MLF, K-meta, bentonite, racking, lees, fining — every process explained in plain English with no winery jargon.",
    href: "/for-home-winemakers/knowledge",
  },
];

const STARTER_QUESTIONS = [
  "My bubbles stopped — is fermentation done or is it stuck?",
  "My wine smells like eggs — what do I do?",
  "How many campden tablets do I add to a 23 litre batch?",
  "When do I rack off the gross lees?",
  "My wine tastes sharp — how do I fix the acidity?",
  "What is MLF and do I need it for a kit red wine?",
  "My wine has gone cloudy after racking — is that normal?",
  "How do I know when my wine is ready to bottle?",
];

function InlineAskWidget() {
  const [question, setQuestion] = useState("");
  const [answer, setAnswer] = useState("");
  const [sourceChapters, setSourceChapters] = useState<string[]>([]);
  const [riskLevel, setRiskLevel] = useState<string>("low");
  const [disclaimer, setDisclaimer] = useState("");
  const [isAsking, setIsAsking] = useState(false);
  const [asked, setAsked] = useState("");
  const inputRef = useRef<HTMLTextAreaElement>(null);
  const askMutation = trpc.tutor.ask.useMutation();

  async function handleAsk(q?: string) {
    const finalQ = (q ?? question).trim();
    if (!finalQ || isAsking) return;
    setIsAsking(true);
    setAsked(finalQ);
    setAnswer("");
    setSourceChapters([]);
    setRiskLevel("low");
    setDisclaimer("");
    setQuestion("");
    try {
      const result = await askMutation.mutateAsync({
        question: finalQ,
        mode: "home_winemaker",
        history: [],
      });
      setAnswer(result.answer);
      // sopTitles carries sourceChapters in DIY mode
      if (Array.isArray(result.sopTitles)) setSourceChapters(result.sopTitles);
      if ((result as { riskLevel?: string }).riskLevel) setRiskLevel((result as { riskLevel?: string }).riskLevel!);
      if (result.disclaimer) setDisclaimer(result.disclaimer);
    } catch {
      setAnswer("Something went wrong. Please try again.");
    } finally {
      setIsAsking(false);
    }
  }

  return (
    <div style={{ maxWidth: "680px" }}>
      {/* Input row */}
      <div
        style={{
          display: "flex",
          gap: "0.75rem",
          alignItems: "flex-end",
          background: "oklch(0.14 0.009 60)",
          border: `1px solid ${answer || isAsking ? "oklch(0.72 0.12 75 / 40%)" : "oklch(0.72 0.12 75 / 25%)"}`,
          borderRadius: "4px",
          padding: "0.75rem 1rem",
        }}
      >
        <textarea
          ref={inputRef}
          value={question}
          onChange={(e) => setQuestion(e.target.value)}
          onKeyDown={(e) => {
            if (e.key === "Enter" && !e.shiftKey) {
              e.preventDefault();
              handleAsk();
            }
          }}
          placeholder="Ask anything about your home winemaking…"
          rows={2}
          style={{
            flex: 1,
            background: "transparent",
            border: "none",
            outline: "none",
            resize: "none",
            fontFamily: SANS,
            fontWeight: 300,
            fontSize: "0.95rem",
            color: "oklch(0.88 0.015 75)",
            lineHeight: 1.6,
          }}
        />
        <button
          onClick={() => handleAsk()}
          disabled={isAsking || !question.trim()}
          style={{
            flexShrink: 0,
            padding: "0.5rem 1.25rem",
            background:
              question.trim() && !isAsking
                ? "oklch(0.72 0.12 75)"
                : "oklch(0.72 0.12 75 / 25%)",
            border: "none",
            borderRadius: "2px",
            cursor: question.trim() && !isAsking ? "pointer" : "not-allowed",
            fontFamily: SANS,
            fontWeight: 700,
            fontSize: "0.8rem",
            letterSpacing: "0.06em",
            color: "oklch(0.11 0.008 60)",
            transition: "background 0.15s ease",
          }}
        >
          {isAsking ? "…" : "Ask"}
        </button>
      </div>

      {/* Starter question chips */}
      {!asked && (
        <div
          style={{
            marginTop: "0.875rem",
            display: "flex",
            flexWrap: "wrap",
            gap: "0.5rem",
          }}
        >
          {STARTER_QUESTIONS.map((q) => (
            <button
              key={q}
              onClick={() => handleAsk(q)}
              style={{
                background: "oklch(0.15 0.009 60)",
                border: "1px solid oklch(1 0 0 / 0.10)",
                borderRadius: "20px",
                padding: "0.4rem 0.9rem",
                fontFamily: SANS,
                fontWeight: 300,
                fontSize: "0.8rem",
                color: "oklch(0.62 0.012 75)",
                cursor: "pointer",
                textAlign: "left",
                transition: "border-color 0.15s, color 0.15s, background 0.15s",
              }}
              onMouseEnter={(e) => {
                const el = e.currentTarget as HTMLButtonElement;
                el.style.borderColor = "oklch(0.72 0.12 75 / 50%)";
                el.style.color = "oklch(0.80 0.015 75)";
                el.style.background = "oklch(0.17 0.010 60)";
              }}
              onMouseLeave={(e) => {
                const el = e.currentTarget as HTMLButtonElement;
                el.style.borderColor = "oklch(1 0 0 / 0.10)";
                el.style.color = "oklch(0.62 0.012 75)";
                el.style.background = "oklch(0.15 0.009 60)";
              }}
            >
              {q}
            </button>
          ))}
        </div>
      )}

      {/* Thinking indicator */}
      {isAsking && (
        <div
          style={{
            marginTop: "1.25rem",
            padding: "1.25rem 1.5rem",
            background: "oklch(0.14 0.009 60)",
            border: "1px solid oklch(0.72 0.12 75 / 15%)",
            borderRadius: "4px",
          }}
        >
          <p
            style={{
              fontFamily: SANS,
              fontWeight: 600,
              fontSize: "0.8rem",
              color: "oklch(0.72 0.12 75)",
              marginBottom: "0.875rem",
            }}
          >
            {asked}
          </p>
          <div style={{ display: "flex", alignItems: "center", gap: "0.6rem" }}>
            <div
              style={{
                display: "flex",
                gap: "4px",
              }}
            >
              {[0, 1, 2].map((i) => (
                <div
                  key={i}
                  style={{
                    width: "5px",
                    height: "5px",
                    borderRadius: "50%",
                    background: "oklch(0.72 0.12 75)",
                    opacity: 0.4 + i * 0.2,
                  }}
                />
              ))}
            </div>
            <span
              style={{
                fontFamily: SANS,
                fontSize: "0.85rem",
                color: "oklch(0.50 0.010 75)",
                fontStyle: "italic",
              }}
            >
              Thinking…
            </span>
          </div>
        </div>
      )}

      {/* Answer */}
      {answer && !isAsking && (
        <div
          style={{
            marginTop: "1.25rem",
            padding: "1.5rem",
            background: "oklch(0.14 0.009 60)",
            border: "1px solid oklch(0.72 0.12 75 / 20%)",
            borderRadius: "4px",
          }}
        >
          {/* Question echo */}
          <p
            style={{
              fontFamily: SANS,
              fontWeight: 600,
              fontSize: "0.8rem",
              color: "oklch(0.72 0.12 75)",
              marginBottom: "0.875rem",
              letterSpacing: "0.02em",
            }}
          >
            {asked}
          </p>
          {/* Divider */}
          <div
            style={{
              height: "1px",
              background: "oklch(0.72 0.12 75 / 12%)",
              marginBottom: "1rem",
            }}
          />
          {/* Answer text */}
          <div
            style={{
              fontFamily: SANS,
              fontWeight: 300,
              fontSize: "0.925rem",
              color: "oklch(0.78 0.013 75)",
              lineHeight: 1.8,
              whiteSpace: "pre-wrap",
            }}
          >
            {answer}
          </div>

          {/* Source chapters intentionally not shown to user — internal knowledge source only */}

          {/* Risk badge + disclaimer */}
          {(riskLevel === "high" || disclaimer) && (
            <div
              style={{
                marginTop: "0.875rem",
                padding: "0.625rem 0.875rem",
                background: riskLevel === "high" ? "oklch(0.55 0.12 30 / 12%)" : "oklch(0.14 0.009 60)",
                border: `1px solid ${riskLevel === "high" ? "oklch(0.55 0.12 30 / 35%)" : "oklch(1 0 0 / 0.08)"}`,
                borderRadius: "3px",
                display: "flex",
                gap: "0.5rem",
                alignItems: "flex-start",
              }}
            >
              <span style={{ fontSize: "0.85rem", flexShrink: 0 }}>
                {riskLevel === "high" ? "⚠️" : "ℹ️"}
              </span>
              <p
                style={{
                  fontFamily: SANS,
                  fontWeight: 300,
                  fontSize: "0.78rem",
                  color: riskLevel === "high" ? "oklch(0.75 0.08 30)" : "oklch(0.50 0.010 75)",
                  lineHeight: 1.5,
                  margin: 0,
                }}
              >
                {disclaimer || "Home winemaking practices vary — always taste and judge your wine yourself."}
              </p>
            </div>
          )}

          {/* Footer row */}
          <div
            style={{
              marginTop: "1.25rem",
              display: "flex",
              alignItems: "center",
              justifyContent: "space-between",
              flexWrap: "wrap",
              gap: "0.75rem",
            }}
          >
            <button
              onClick={() => {
                setAnswer("");
                setAsked("");
                setSourceChapters([]);
                setRiskLevel("low");
                setDisclaimer("");
                setTimeout(() => inputRef.current?.focus(), 50);
              }}
              style={{
                background: "transparent",
                border: "none",
                cursor: "pointer",
                fontFamily: SANS,
                fontWeight: 400,
                fontSize: "0.8rem",
                color: "oklch(0.72 0.12 75)",
                padding: 0,
                letterSpacing: "0.04em",
              }}
            >
              Ask another question →
            </button>
            <span
              style={{
                fontFamily: SANS,
                fontWeight: 300,
                fontSize: "0.72rem",
                color: "oklch(0.38 0.008 75)",
                letterSpacing: "0.02em",
              }}
            >
              Powered by Ownology
            </span>
          </div>
        </div>
      )}
    </div>
  );
}

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
              href="/for-home-winemakers/knowledge"
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
              Knowledge Hub
            </Link>
          </div>
        </div>
      </section>

      {/* Inline AI Chat */}
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
              marginBottom: "0.5rem",
            }}
          >
            Ask Ownology anything
          </p>
          <p
            style={{
              fontFamily: SANS,
              fontWeight: 300,
              fontSize: "0.875rem",
              color: "oklch(0.50 0.010 75)",
              marginBottom: "1.5rem",
              lineHeight: 1.6,
            }}
          >
            Type your question or tap one below — answers are grounded in real home winemaking practice.
          </p>
          <InlineAskWidget />
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
                onMouseEnter={(e) => {
                  (e.currentTarget as HTMLAnchorElement).style.borderColor =
                    "oklch(0.72 0.12 75 / 40%)";
                }}
                onMouseLeave={(e) => {
                  (e.currentTarget as HTMLAnchorElement).style.borderColor =
                    "oklch(1 0 0 / 0.08)";
                }}
              >
                <div
                  style={{
                    display: "flex",
                    justifyContent: "space-between",
                    alignItems: "flex-start",
                    marginBottom: "0.75rem",
                  }}
                >
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
                href: "/for-home-winemakers/knowledge",
                icon: "📋",
                title: "Step-by-Step Guides",
                desc: "Plain-English SOPs for fermentation, cleaning, and bottling — written for home winemakers.",
              },
              {
                href: "/for-home-winemakers/knowledge/category/Fermentation%20Management",
                icon: "🔧",
                title: "Troubleshooting Guide",
                desc: "7 common faults — stuck ferment, VA, cloudiness, re-fermentation — with causes and fixes.",
              },
              {
                href: "/free-run",
                icon: "🤖",
                title: "AI Tutor",
                desc: "Full conversation mode — ask follow-up questions, get step-by-step guidance, save your thread.",
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
                  ((e.currentTarget as HTMLAnchorElement).style.borderColor =
                    "oklch(0.72 0.12 75)")
                }
                onMouseLeave={(e) =>
                  ((e.currentTarget as HTMLAnchorElement).style.borderColor =
                    "oklch(1 0 0 / 0.08)")
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
