/**
 * ForHomeWinemakers — /for-home-winemakers
 * Dedicated landing page for the home DIY winemaker audience.
 * Inline AI chat widget replaces static Q&A list.
 * Uses CSS variables throughout so it responds to light/dark theme toggle.
 */
import { useState, useRef } from "react";
import { Link } from "wouter";
import OwnologyLogo from "@/components/OwnologyLogo";
import { trpc } from "@/lib/trpc";

const SERIF = "'Fraunces', serif";
const SANS = "'Lato', sans-serif";

const FEATURES: { icon: string; title: string; desc: string; href: string }[] = [
  {
    icon: "💰",
    title: "Start here: costs & equipment",
    desc: "What does it cost to make wine at home? A complete checklist of every piece of equipment for a 23-litre batch — Big Mouth Bubbler, hydrometer, siphon, corker — with approximate prices.",
    href: "/resources/home-winery-kit",
  },
  {
    icon: "🧼",
    title: "Cleaning & sanitation",
    desc: "The most important step in winemaking. How to clean and sanitise every piece of equipment before and after use — and why it matters more than anything else.",
    href: "/for-home-winemakers/knowledge/category/Tank%20Cleaning%20%26%20Sanitation",
  },
  {
    icon: "🍇",
    title: "Fermentation guides",
    desc: "Red wine fermentation, yeast rehydration, punch-downs, MLF, and pressing — step-by-step guides from crush to dry, written for home winemakers.",
    href: "/for-home-winemakers/knowledge/category/Fermentation%20Management",
  },
  {
    icon: "🍾",
    title: "Bottling",
    desc: "When to bottle, how to prepare your bottles, filling, corking, and labelling your finished home wine — done cleanly and safely.",
    href: "/for-home-winemakers/knowledge/category/Bottling%20Procedures",
  },
  {
    icon: "🤖",
    title: "AI that speaks home winemaker",
    desc: "Ask questions in plain language — 'my fermentation stopped at 1.020, what do I do?' — and get answers grounded in real home winemaking practice, not commercial winery regulations.",
    href: "/free-run",
  },
  {
    icon: "🔧",
    title: "Troubleshooting guide",
    desc: "7 common home winemaking faults with causes and fixes: stuck ferment, volatile acidity, cloudiness, re-fermentation in the bottle, cork taint, and more.",
    href: "/for-home-winemakers/knowledge/category/Fermentation%20Management",
  },
];

// Starter question chips removed — AI surfaces relevant questions naturally through conversation

const BATCH_SIZES = [
  { label: "6 L", value: "6" },
  { label: "23 L", value: "23" },
  { label: "60 L", value: "60" },
  { label: "Other", value: "other" },
];

function InlineAskWidget() {
  const [question, setQuestion] = useState("");
  const [batchSize, setBatchSize] = useState<string>("23"); // default 23L
  const [customBatch, setCustomBatch] = useState("");
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
    // Parse batch size as a number for the backend
    const batchLitresRaw = batchSize === "other" ? customBatch.trim() : batchSize;
    const batchSizeLitres = batchLitresRaw && batchLitresRaw !== "unknown" ? parseFloat(batchLitresRaw) : undefined;
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
        batchSizeLitres: batchSizeLitres && !isNaN(batchSizeLitres) ? batchSizeLitres : undefined,
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
          background: "var(--ow-bg-raised)",
          border: `1px solid ${answer || isAsking ? "var(--ow-amber)" : "var(--ow-border-md)"}`,
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
          placeholder="Ask about your red or white wine… e.g. 'my Shiraz cap is thick' or 'how long to cold settle Chardonnay'"
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
            color: "var(--ow-text-hi)",
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
                ? "var(--ow-amber)"
                : "oklch(from var(--ow-amber) l c h / 0.25)",
            border: "none",
            borderRadius: "2px",
            cursor: question.trim() && !isAsking ? "pointer" : "not-allowed",
            fontFamily: SANS,
            fontWeight: 700,
            fontSize: "0.8rem",
            letterSpacing: "0.06em",
            color: "var(--ow-bg-base)",
            transition: "background 0.15s ease",
          }}
        >
          {isAsking ? "…" : "Ask"}
        </button>
      </div>

      {/* Batch size selector */}
      <div
        style={{
          display: "flex",
          alignItems: "center",
          gap: "0.5rem",
          marginTop: "0.6rem",
          flexWrap: "wrap",
        }}
      >
        <span
          style={{
            fontFamily: SANS,
            fontSize: "0.72rem",
            color: "var(--ow-text-lo)",
            letterSpacing: "0.06em",
            textTransform: "uppercase",
            whiteSpace: "nowrap",
          }}
        >
          Batch size:
        </span>
        {BATCH_SIZES.map((s) => (
          <button
            key={s.value}
            onClick={() => setBatchSize(s.value)}
            style={{
              padding: "0.2rem 0.65rem",
              border: `1px solid ${batchSize === s.value ? "var(--ow-amber)" : "var(--ow-border-md)"}`,
              borderRadius: "2px",
              background: batchSize === s.value ? "color-mix(in oklch, var(--ow-amber) 12%, transparent)" : "transparent",
              color: batchSize === s.value ? "var(--ow-amber)" : "var(--ow-text-lo)",
              fontFamily: SANS,
              fontSize: "0.75rem",
              fontWeight: batchSize === s.value ? 700 : 400,
              cursor: "pointer",
              transition: "all 0.12s ease",
            }}
          >
            {s.label}
          </button>
        ))}
        {batchSize === "other" && (
          <input
            type="number"
            min={1}
            max={9999}
            placeholder="litres"
            value={customBatch}
            onChange={(e) => setCustomBatch(e.target.value)}
            style={{
              width: "70px",
              padding: "0.2rem 0.5rem",
              border: "1px solid var(--ow-amber)",
              borderRadius: "2px",
              background: "var(--ow-bg-raised)",
              color: "var(--ow-text-hi)",
              fontFamily: SANS,
              fontSize: "0.8rem",
              outline: "none",
            }}
          />
        )}
      </div>

      {/* Thinking indicator */}
      {isAsking && (
        <div
          style={{
            marginTop: "1.25rem",
            padding: "1.25rem 1.5rem",
            background: "var(--ow-bg-raised)",
            border: "1px solid var(--ow-border-md)",
            borderRadius: "4px",
          }}
        >
          <p
            style={{
              fontFamily: SANS,
              fontWeight: 600,
              fontSize: "0.8rem",
              color: "var(--ow-amber)",
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
                    background: "var(--ow-amber)",
                    opacity: 0.4 + i * 0.2,
                  }}
                />
              ))}
            </div>
            <span
              style={{
                fontFamily: SANS,
                fontSize: "0.85rem",
                color: "var(--ow-text-lo)",
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
            background: "var(--ow-bg-raised)",
            border: "1px solid var(--ow-border-md)",
            borderRadius: "4px",
          }}
        >
          {/* Question echo */}
          <p
            style={{
              fontFamily: SANS,
              fontWeight: 600,
              fontSize: "0.8rem",
              color: "var(--ow-amber)",
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
              background: "var(--ow-border)",
              marginBottom: "1rem",
            }}
          />
          {/* Answer text */}
          <div
            style={{
              fontFamily: SANS,
              fontWeight: 300,
              fontSize: "0.925rem",
              color: "var(--ow-text-mid)",
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
                background: riskLevel === "high" ? "oklch(0.55 0.12 30 / 12%)" : "var(--ow-bg-card)",
                border: `1px solid ${riskLevel === "high" ? "oklch(0.55 0.12 30 / 35%)" : "var(--ow-border)"}`,
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
                  color: riskLevel === "high" ? "oklch(0.75 0.08 30)" : "var(--ow-text-lo)",
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
                color: "var(--ow-amber)",
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
                color: "var(--ow-text-lo)",
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
    <div style={{ background: "var(--ow-bg-base)", minHeight: "100vh" }}>
      {/* Nav */}
      <nav
        className="sticky top-0 z-50 border-b"
        style={{ background: "var(--ow-nav-bg)", borderColor: "var(--ow-border)" }}
      >
        <div className="container flex items-center justify-between py-5">
          <Link href="/">
            <OwnologyLogo size={32} showIABadge showTheoryCard />
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
              textWrap: "balance" as "balance",
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
              href="/for-home-winemakers/knowledge"
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
                border: "1px solid var(--ow-border-md)",
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
              color: "var(--ow-text-lo)",
              marginBottom: "1.5rem",
              lineHeight: 1.6,
            }}
          >
            Ask about your red or white wine — Ownology detects the wine type and searches the right knowledge base automatically.
          </p>
          <InlineAskWidget />
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
              <Link
                key={f.title}
                href={f.href}
                style={{
                  background: "var(--ow-bg-raised)",
                  border: "1px solid var(--ow-border)",
                  borderRadius: "2px",
                  padding: "1.5rem",
                  display: "block",
                  textDecoration: "none",
                  transition: "border-color 0.15s ease",
                }}
                onMouseEnter={(e) => {
                  (e.currentTarget as HTMLAnchorElement).style.borderColor = "var(--ow-amber)";
                }}
                onMouseLeave={(e) => {
                  (e.currentTarget as HTMLAnchorElement).style.borderColor = "var(--ow-border)";
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
                  <span style={{ color: "var(--ow-amber)", fontSize: "1rem" }}>→</span>
                </div>
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
              textWrap: "balance" as "balance",
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
