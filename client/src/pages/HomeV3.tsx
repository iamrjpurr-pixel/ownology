/**
 * /home-v3 — "The Storytelling Scroll" mockup.
 *
 * Purpose: a third homepage experiment for Rich to A/B/C compare against
 * the live /home (dense · rich · 4-pillar grid) and /home-v2 (Owen-heavy).
 *
 * Angle chosen (Feb 2026, best-judgment): a narrative scroll — like a
 * Stripe or Linear product page — that opens on the 3:47am ferment panic
 * every winemaker recognises, walks the reader through the *old* way
 * (Google + calling your mentor), then reveals Ownology as the answer.
 * Ends on a single choice, not a feature grid.
 *
 * Design principles applied:
 *   1. Emotion first, product second. Nobody buys wine tools rationally.
 *   2. One thought per scroll — long vertical rhythm, generous negative space.
 *   3. The product doesn't appear until zone 3 (delayed reveal builds tension).
 *   4. No pillar grid, no feature bento, no pricing table. Prose + one chat mock.
 *   5. Two doors at the end — same self-sort as V1's hero router but as the
 *      closing question, not the opening one.
 *
 * This is a MOCKUP. Copy is intentional but structural — real headlines
 * should be workshopped before any promotion.
 */
import { useEffect, useRef, useState } from "react";
import { Link } from "wouter";

// Reuse the same hero image the live site uses for visual continuity
const HERO_IMG = "https://d2xsxph8kpxj0f.cloudfront.net/310519663548872701/kjXA9MRaPtPLGHog5yynHZ/ownology-hero-HqkryW7dQ2C9TbhdmJ8Kff.webp";
const LAB_IMG  = "https://d2xsxph8kpxj0f.cloudfront.net/310519663548872701/kjXA9MRaPtPLGHog5yynHZ/ownology-lab-iE8kgBSQPMzX2Riaak43Cz.webp";

// Small reveal hook — fires once per element as it enters the viewport
function useReveal(threshold = 0.25) {
  const ref = useRef<HTMLDivElement>(null);
  const [visible, setVisible] = useState(false);
  useEffect(() => {
    const el = ref.current;
    if (!el) return;
    const obs = new IntersectionObserver(
      ([e]) => { if (e.isIntersecting) { setVisible(true); obs.disconnect(); } },
      { threshold },
    );
    obs.observe(el);
    return () => obs.disconnect();
  }, [threshold]);
  return { ref, visible };
}

// Typewriter for the chat-mock reveal in zone 4
function useTypewriter(text: string, start: boolean, speed = 22) {
  const [displayed, setDisplayed] = useState("");
  useEffect(() => {
    if (!start) return;
    setDisplayed("");
    let i = 0;
    const interval = setInterval(() => {
      i++;
      setDisplayed(text.slice(0, i));
      if (i >= text.length) clearInterval(interval);
    }, speed);
    return () => clearInterval(interval);
  }, [text, speed, start]);
  return displayed;
}

// ── Zone 1: cold open ────────────────────────────────────────────────────────
function Zone1ColdOpen() {
  const { ref, visible } = useReveal(0.2);
  return (
    <section
      ref={ref}
      data-testid="v3-zone1-cold-open"
      style={{
        minHeight: "100vh",
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
        padding: "3rem 1.5rem",
        background: "oklch(0.10 0.008 60)",
        color: "oklch(0.95 0.010 75)",
        position: "relative",
        overflow: "hidden",
      }}
    >
      <img
        src={HERO_IMG}
        alt=""
        aria-hidden="true"
        style={{
          position: "absolute",
          inset: 0,
          width: "100%",
          height: "100%",
          objectFit: "cover",
          filter: "brightness(0.15) saturate(0.4) blur(2px)",
        }}
      />
      <div
        style={{
          position: "relative",
          maxWidth: 760,
          textAlign: "center",
          opacity: visible ? 1 : 0,
          transform: visible ? "translateY(0)" : "translateY(24px)",
          transition: "opacity 900ms ease, transform 900ms ease",
        }}
      >
        <p
          style={{
            fontFamily: "'Fira Code',monospace",
            fontSize: "0.72rem",
            letterSpacing: "0.28em",
            color: "var(--ow-amber)",
            textTransform: "uppercase",
            marginBottom: "2.5rem",
          }}
        >
          3:47am · vintage 2026
        </p>
        <h1
          style={{
            fontFamily: "'Fraunces',serif",
            fontWeight: 700,
            fontSize: "clamp(2rem, 5.5vw, 4rem)",
            lineHeight: 1.1,
            letterSpacing: "-0.02em",
            margin: 0,
            textWrap: "balance" as "balance",
          }}
        >
          Your Shiraz is stuck at 8.4 Brix.
          <br />
          <span style={{ color: "var(--ow-amber)" }}>What do you do?</span>
        </h1>
        <div
          style={{
            marginTop: "4rem",
            display: "inline-flex",
            flexDirection: "column",
            alignItems: "center",
            gap: "0.5rem",
            fontFamily: "'Lato',sans-serif",
            fontSize: "0.72rem",
            color: "oklch(0.65 0.015 75)",
            letterSpacing: "0.12em",
            textTransform: "uppercase",
          }}
        >
          <span>Scroll</span>
          <span
            style={{
              width: 1,
              height: 28,
              background: "linear-gradient(to bottom, var(--ow-amber), transparent)",
              display: "block",
              animation: "v3-hint 2s ease-in-out infinite",
            }}
          />
        </div>
      </div>
      <style>{`
        @keyframes v3-hint {
          0%, 100% { opacity: 0.4; transform: translateY(0); }
          50% { opacity: 1; transform: translateY(6px); }
        }
      `}</style>
    </section>
  );
}

// ── Zone 2: the old way ──────────────────────────────────────────────────────
function Zone2TheOldWay() {
  const { ref, visible } = useReveal(0.2);
  return (
    <section
      ref={ref}
      data-testid="v3-zone2-old-way"
      style={{
        padding: "clamp(4rem, 9vw, 7rem) 1.5rem",
        background: "oklch(0.14 0.010 60)",
        color: "oklch(0.92 0.010 75)",
      }}
    >
      <div style={{ maxWidth: 1000, margin: "0 auto" }}>
        <p
          style={{
            fontFamily: "'Fira Code',monospace",
            fontSize: "0.66rem",
            letterSpacing: "0.2em",
            color: "oklch(0.55 0.015 75)",
            textTransform: "uppercase",
            marginBottom: "1.5rem",
          }}
        >
          Chapter one · the old way
        </p>
        <h2
          style={{
            fontFamily: "'Fraunces',serif",
            fontWeight: 700,
            fontSize: "clamp(1.75rem, 4vw, 2.75rem)",
            lineHeight: 1.15,
            letterSpacing: "-0.015em",
            margin: 0,
            maxWidth: 800,
            textWrap: "balance" as "balance",
            opacity: visible ? 1 : 0,
            transform: visible ? "translateY(0)" : "translateY(16px)",
            transition: "opacity 700ms ease 100ms, transform 700ms ease 100ms",
          }}
        >
          You call your mentor. He&rsquo;s asleep.
          <br />
          You Google &ldquo;stuck fermentation&rdquo;.
        </h2>
        <div
          style={{
            marginTop: "3rem",
            display: "grid",
            gridTemplateColumns: "repeat(auto-fit, minmax(240px, 1fr))",
            gap: "1rem",
          }}
        >
          {[
            {
              n: "01",
              body: "A Wikipedia summary that doesn&rsquo;t know what your YAN was at inoculation.",
            },
            {
              n: "02",
              body: "A Reddit thread from 2011 with three contradictory answers and one guy selling supplements.",
            },
            {
              n: "03",
              body: "The Scott Labs handbook is in the office. The office is 40 minutes away. Sunrise is in two hours.",
            },
            {
              n: "04",
              body: "You make a call. Maybe it&rsquo;s right. You won&rsquo;t know until next Thursday&rsquo;s tasting.",
            },
          ].map((row, i) => (
            <div
              key={row.n}
              style={{
                padding: "1.5rem",
                background: "oklch(0.17 0.010 60)",
                border: "1px solid oklch(0.24 0.010 60)",
                borderRadius: 6,
                opacity: visible ? 1 : 0,
                transform: visible ? "translateY(0)" : "translateY(20px)",
                transition: `opacity 700ms ease ${200 + i * 120}ms, transform 700ms ease ${200 + i * 120}ms`,
              }}
            >
              <p
                style={{
                  fontFamily: "'Fira Code',monospace",
                  fontSize: "0.7rem",
                  letterSpacing: "0.16em",
                  color: "var(--ow-amber)",
                  marginBottom: "0.75rem",
                }}
              >
                {row.n}
              </p>
              <p
                style={{
                  fontFamily: "'Lato',sans-serif",
                  fontSize: "0.95rem",
                  lineHeight: 1.65,
                  color: "oklch(0.80 0.010 75)",
                  margin: 0,
                }}
                dangerouslySetInnerHTML={{ __html: row.body }}
              />
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}

// ── Zone 3: the amber-lit transition ─────────────────────────────────────────
function Zone3Transition() {
  const { ref, visible } = useReveal(0.35);
  return (
    <section
      ref={ref}
      data-testid="v3-zone3-transition"
      style={{
        padding: "clamp(5rem, 10vw, 9rem) 1.5rem",
        background: `
          radial-gradient(ellipse at center top, color-mix(in oklch, var(--ow-amber) 20%, transparent) 0%, transparent 55%),
          oklch(0.11 0.008 60)
        `,
        textAlign: "center",
        color: "oklch(0.95 0.010 75)",
      }}
    >
      <div
        style={{
          maxWidth: 780,
          margin: "0 auto",
          opacity: visible ? 1 : 0,
          transform: visible ? "translateY(0)" : "translateY(20px)",
          transition: "opacity 900ms ease, transform 900ms ease",
        }}
      >
        <p
          style={{
            fontFamily: "'Fira Code',monospace",
            fontSize: "0.66rem",
            letterSpacing: "0.24em",
            color: "var(--ow-amber)",
            textTransform: "uppercase",
            marginBottom: "1.75rem",
          }}
        >
          Chapter two · imagine
        </p>
        <h2
          style={{
            fontFamily: "'Fraunces',serif",
            fontStyle: "italic",
            fontWeight: 500,
            fontSize: "clamp(1.75rem, 4.5vw, 3.25rem)",
            lineHeight: 1.2,
            letterSpacing: "-0.01em",
            margin: 0,
            textWrap: "balance" as "balance",
          }}
        >
          Now imagine your cellar has an apprentice
          <br />
          who <span style={{ color: "var(--ow-amber)", fontStyle: "normal" }}>read every wine textbook</span>.
        </h2>
        <p
          style={{
            marginTop: "2rem",
            fontFamily: "'Lato',sans-serif",
            fontSize: "1rem",
            lineHeight: 1.75,
            color: "oklch(0.75 0.015 75)",
            maxWidth: 560,
            marginInline: "auto",
          }}
        >
          Grounded in industry-standard oenology references. Cited. Free to ask.
          Doesn&rsquo;t sleep, doesn&rsquo;t retire, doesn&rsquo;t forget the answer he
          gave your last cellar hand.
        </p>
      </div>
    </section>
  );
}

// ── Zone 4: the answer — a chat mock ─────────────────────────────────────────
function Zone4TheAnswer() {
  const { ref, visible } = useReveal(0.15);
  const answer = "You need to check YAN utilisation first. At 8.4 Brix from a 24.3 start, you've fermented ~66% but only your initial 120ppm YAN was available — a mid-ferment supplement is likely needed. Add 1.4kg of Fermaid-O or equivalent to Tank 7 tonight; retest YAN in 12 hours. If cellar temp has dropped below 18°C, raise to 22°C to restart activity.";
  const typed = useTypewriter(answer, visible, 14);
  const done = typed.length === answer.length;
  return (
    <section
      ref={ref}
      data-testid="v3-zone4-the-answer"
      style={{
        padding: "clamp(4rem, 9vw, 7rem) 1.5rem",
        background: "oklch(0.10 0.008 60)",
        color: "oklch(0.94 0.010 75)",
      }}
    >
      <div style={{ maxWidth: 780, margin: "0 auto" }}>
        <p
          style={{
            fontFamily: "'Fira Code',monospace",
            fontSize: "0.66rem",
            letterSpacing: "0.24em",
            color: "var(--ow-amber)",
            textTransform: "uppercase",
            marginBottom: "1.75rem",
            textAlign: "center",
          }}
        >
          Chapter three · the answer
        </p>
        <div
          style={{
            background: "oklch(0.14 0.010 60)",
            border: "1px solid color-mix(in oklch, var(--ow-amber) 25%, transparent)",
            borderRadius: 10,
            padding: "1.5rem",
            fontFamily: "'Lato',sans-serif",
          }}
        >
          {/* Header */}
          <div style={{ display: "flex", alignItems: "center", gap: "0.75rem", marginBottom: "1.25rem", paddingBottom: "1rem", borderBottom: "1px solid oklch(0.22 0.010 60)" }}>
            <span style={{ width: 8, height: 8, borderRadius: "50%", background: "var(--ow-amber)" }} />
            <span style={{ fontSize: "0.72rem", letterSpacing: "0.12em", textTransform: "uppercase", color: "oklch(0.65 0.015 75)" }}>
              Ownology · 3:48am
            </span>
          </div>
          {/* User bubble */}
          <div style={{ marginBottom: "1.25rem" }}>
            <div
              style={{
                display: "inline-block",
                padding: "0.75rem 1rem",
                background: "oklch(0.18 0.010 60)",
                borderRadius: 6,
                fontSize: "0.95rem",
                lineHeight: 1.55,
                color: "oklch(0.92 0.010 75)",
                maxWidth: "100%",
              }}
            >
              Tank 7 is stuck at 8.4 Brix. YAN was 120ppm at inoculation. What do I do?
            </div>
          </div>
          {/* Owen response */}
          <div style={{ display: "flex", gap: "0.75rem", alignItems: "flex-start" }}>
            <div
              style={{
                width: 26,
                height: 26,
                flexShrink: 0,
                borderRadius: 4,
                background: "color-mix(in oklch, var(--ow-amber) 18%, transparent)",
                border: "1px solid color-mix(in oklch, var(--ow-amber) 40%, transparent)",
                display: "flex",
                alignItems: "center",
                justifyContent: "center",
                marginTop: 2,
              }}
            >
              <svg width="12" height="12" viewBox="0 0 12 12" fill="none">
                <circle cx="6" cy="6" r="4" stroke="var(--ow-amber)" strokeWidth="1.2" />
                <path d="M6 4v2l1.5 1" stroke="var(--ow-amber)" strokeWidth="1.2" strokeLinecap="round" />
              </svg>
            </div>
            <div style={{ fontSize: "0.95rem", lineHeight: 1.75, color: "oklch(0.88 0.010 75)" }}>
              {typed}
              {!done && (
                <span
                  style={{
                    color: "var(--ow-amber)",
                    animation: "v3-cursor 900ms steps(2) infinite",
                  }}
                >
                  |
                </span>
              )}
            </div>
          </div>
          {/* Data chips */}
          {done && (
            <div
              style={{
                marginTop: "1.25rem",
                paddingTop: "1rem",
                borderTop: "1px solid oklch(0.22 0.010 60)",
                display: "flex",
                flexWrap: "wrap",
                gap: "0.5rem",
              }}
            >
              {["Brix 8.4","YAN 120ppm","Fermaid-O 1.4kg","Tank 7 · Shiraz","Temp ≥ 22°C"].map((chip) => (
                <span
                  key={chip}
                  style={{
                    fontFamily: "'Fira Code',monospace",
                    fontSize: "0.7rem",
                    padding: "0.25rem 0.55rem",
                    background: "color-mix(in oklch, var(--ow-amber) 10%, transparent)",
                    border: "1px solid color-mix(in oklch, var(--ow-amber) 25%, transparent)",
                    borderRadius: 3,
                    color: "var(--ow-amber)",
                  }}
                >
                  {chip}
                </span>
              ))}
            </div>
          )}
          {done && (
            <p style={{ marginTop: "0.85rem", fontSize: "0.72rem", color: "oklch(0.60 0.015 75)", fontStyle: "italic" }}>
              ↳ Cited from: Boulton et al. — Principles &amp; Practices of Winemaking · Your Shiraz SOP
            </p>
          )}
        </div>
      </div>
      <style>{`
        @keyframes v3-cursor { 50% { opacity: 0; } }
      `}</style>
    </section>
  );
}

// ── Zone 5: the four chapters ────────────────────────────────────────────────
function Zone5Chapters() {
  const { ref, visible } = useReveal(0.15);
  const chapters = [
    { label: "DO",    title: "The 3am ferment panic",                body: "Voice logs, tank readings, task lists. Your cellar hand at 3am doesn't need a keyboard.",              href: "/quick-entry" },
    { label: "KNOW",  title: "The knowledge that dies with retirement", body: "38 industry SOPs, your Decision Logic, your Tribal Knowledge. Institutional memory that survives.", href: "/knowledge" },
    { label: "LEARN", title: "The question you were too shy to ask",  body: "What's MLF, actually? Why does one Grenache taste like strawberries? Ask Owen. Free. No signup.",       href: "/ask" },
    { label: "GUIDE", title: "The compliance form you dread",         body: "APCO Annual Report drafts. Wine Australia LIP audit pack. One-tap PDF exports.",                     href: "/apco" },
  ];
  return (
    <section
      ref={ref}
      data-testid="v3-zone5-chapters"
      style={{
        padding: "clamp(4rem, 9vw, 7rem) 1.5rem",
        background: "oklch(0.15 0.010 60)",
        color: "oklch(0.94 0.010 75)",
        borderTop: "1px solid oklch(0.22 0.010 60)",
      }}
    >
      <div style={{ maxWidth: 1000, margin: "0 auto" }}>
        <p
          style={{
            fontFamily: "'Fira Code',monospace",
            fontSize: "0.66rem",
            letterSpacing: "0.24em",
            color: "var(--ow-amber)",
            textTransform: "uppercase",
            marginBottom: "1rem",
            textAlign: "center",
          }}
        >
          Chapter four · four things Ownology does
        </p>
        <h2
          style={{
            fontFamily: "'Fraunces',serif",
            fontWeight: 700,
            fontSize: "clamp(1.5rem, 3.2vw, 2.25rem)",
            lineHeight: 1.15,
            margin: 0,
            textAlign: "center",
            textWrap: "balance" as "balance",
          }}
        >
          Not features. Moments.
        </h2>
        <div
          style={{
            marginTop: "3rem",
            display: "grid",
            gridTemplateColumns: "repeat(auto-fit, minmax(240px, 1fr))",
            gap: "1rem",
          }}
        >
          {chapters.map((c, i) => (
            <Link
              key={c.label}
              href={c.href}
              data-testid={`v3-chapter-${c.label.toLowerCase()}`}
              style={{
                padding: "1.5rem",
                background: "oklch(0.19 0.010 60)",
                border: "1px solid oklch(0.24 0.010 60)",
                borderRadius: 8,
                textDecoration: "none",
                color: "inherit",
                display: "block",
                opacity: visible ? 1 : 0,
                transform: visible ? "translateY(0)" : "translateY(20px)",
                transition: `opacity 600ms ease ${i * 120}ms, transform 600ms ease ${i * 120}ms, border-color 200ms ease`,
              }}
              onMouseEnter={(e) => {
                (e.currentTarget as HTMLAnchorElement).style.borderColor = "var(--ow-amber)";
              }}
              onMouseLeave={(e) => {
                (e.currentTarget as HTMLAnchorElement).style.borderColor = "oklch(0.24 0.010 60)";
              }}
            >
              <p
                style={{
                  fontFamily: "'Fira Code',monospace",
                  fontSize: "0.68rem",
                  letterSpacing: "0.18em",
                  color: "var(--ow-amber)",
                  marginBottom: "0.75rem",
                }}
              >
                {c.label}
              </p>
              <h3
                style={{
                  fontFamily: "'Fraunces',serif",
                  fontWeight: 600,
                  fontSize: "1.15rem",
                  lineHeight: 1.25,
                  margin: "0 0 0.6rem",
                  color: "oklch(0.94 0.010 75)",
                }}
              >
                {c.title}
              </h3>
              <p
                style={{
                  fontFamily: "'Lato',sans-serif",
                  fontSize: "0.9rem",
                  lineHeight: 1.6,
                  color: "oklch(0.72 0.015 75)",
                  margin: 0,
                }}
              >
                {c.body}
              </p>
            </Link>
          ))}
        </div>
      </div>
    </section>
  );
}

// ── Zone 6: what it costs ────────────────────────────────────────────────────
function Zone6Cost() {
  const { ref, visible } = useReveal(0.35);
  return (
    <section
      ref={ref}
      data-testid="v3-zone6-cost"
      style={{
        padding: "clamp(4rem, 9vw, 7rem) 1.5rem",
        background: "oklch(0.11 0.008 60)",
        textAlign: "center",
        color: "oklch(0.94 0.010 75)",
      }}
    >
      <div
        style={{
          maxWidth: 640,
          margin: "0 auto",
          opacity: visible ? 1 : 0,
          transform: visible ? "translateY(0)" : "translateY(16px)",
          transition: "opacity 700ms ease, transform 700ms ease",
        }}
      >
        <p
          style={{
            fontFamily: "'Fira Code',monospace",
            fontSize: "0.66rem",
            letterSpacing: "0.24em",
            color: "var(--ow-amber)",
            textTransform: "uppercase",
            marginBottom: "1.5rem",
          }}
        >
          Chapter five · what it costs
        </p>
        <h2
          style={{
            fontFamily: "'Fraunces',serif",
            fontWeight: 700,
            fontSize: "clamp(2rem, 5vw, 3.25rem)",
            lineHeight: 1.1,
            letterSpacing: "-0.015em",
            margin: 0,
            textWrap: "balance" as "balance",
          }}
        >
          <span style={{ color: "var(--ow-amber)" }}>$44/mo</span> founding
          <br />
          <span style={{ fontSize: "0.55em", fontWeight: 400, color: "oklch(0.65 0.015 75)", fontStyle: "italic" }}>
            (was $59 retail · 25% off for the first 99)
          </span>
        </h2>
        <p
          style={{
            marginTop: "1.75rem",
            fontFamily: "'Lato',sans-serif",
            fontSize: "1rem",
            lineHeight: 1.7,
            color: "oklch(0.75 0.015 75)",
          }}
        >
          14-day free trial. No credit card. Cancel anytime. If your 2026 vintage
          doesn&rsquo;t owe Ownology one saved 3am, we&rsquo;ll refund you the year.
        </p>
      </div>
    </section>
  );
}

// ── Zone 7: the choice ───────────────────────────────────────────────────────
function Zone7Choice() {
  const { ref, visible } = useReveal(0.25);
  return (
    <section
      ref={ref}
      data-testid="v3-zone7-choice"
      style={{
        padding: "clamp(5rem, 10vw, 8rem) 1.5rem",
        background: `
          linear-gradient(180deg, oklch(0.10 0.008 60) 0%, oklch(0.14 0.010 60) 100%)
        `,
        position: "relative",
        overflow: "hidden",
        textAlign: "center",
        color: "oklch(0.95 0.010 75)",
      }}
    >
      <img
        src={LAB_IMG}
        alt=""
        aria-hidden="true"
        style={{
          position: "absolute",
          inset: 0,
          width: "100%",
          height: "100%",
          objectFit: "cover",
          filter: "brightness(0.10) saturate(0.4)",
        }}
      />
      <div
        style={{
          position: "relative",
          maxWidth: 720,
          margin: "0 auto",
          opacity: visible ? 1 : 0,
          transform: visible ? "translateY(0)" : "translateY(20px)",
          transition: "opacity 800ms ease, transform 800ms ease",
        }}
      >
        <p
          style={{
            fontFamily: "'Fira Code',monospace",
            fontSize: "0.66rem",
            letterSpacing: "0.24em",
            color: "var(--ow-amber)",
            textTransform: "uppercase",
            marginBottom: "1.5rem",
          }}
        >
          Chapter six · the choice
        </p>
        <h2
          style={{
            fontFamily: "'Fraunces',serif",
            fontWeight: 700,
            fontSize: "clamp(1.75rem, 4.5vw, 3rem)",
            lineHeight: 1.15,
            letterSpacing: "-0.015em",
            margin: 0,
            textWrap: "balance" as "balance",
          }}
        >
          You&rsquo;re six weeks from harvest.
          <br />
          <span style={{ color: "var(--ow-amber)" }}>What do you want in the cellar with you?</span>
        </h2>
        <div
          style={{
            marginTop: "3rem",
            display: "flex",
            flexWrap: "wrap",
            justifyContent: "center",
            gap: "1rem",
          }}
        >
          <Link
            href="/ask?from=v3-choice-curious"
            data-testid="v3-cta-curious"
            style={{
              padding: "1rem 1.75rem",
              background: "transparent",
              color: "oklch(0.95 0.010 75)",
              border: "1.5px solid oklch(0.35 0.010 60)",
              borderRadius: 6,
              fontFamily: "'Lato',sans-serif",
              fontWeight: 500,
              fontSize: "0.98rem",
              textDecoration: "none",
              minWidth: 260,
            }}
          >
            🍷 Ask Owen a question — free →
          </Link>
          <Link
            href="/pricing?from=v3-choice-pro"
            data-testid="v3-cta-pro"
            style={{
              padding: "1rem 1.75rem",
              background: "var(--ow-amber)",
              color: "oklch(0.10 0.008 60)",
              borderRadius: 6,
              fontFamily: "'Lato',sans-serif",
              fontWeight: 700,
              fontSize: "0.98rem",
              textDecoration: "none",
              minWidth: 260,
              letterSpacing: "0.01em",
            }}
          >
            🍇 Start the 14-day trial →
          </Link>
        </div>
        <p
          style={{
            marginTop: "2rem",
            fontFamily: "'Lato',sans-serif",
            fontSize: "0.82rem",
            color: "oklch(0.60 0.015 75)",
            fontStyle: "italic",
          }}
        >
          Or <Link href="/home" style={{ color: "var(--ow-amber)", textDecoration: "underline" }}>compare to the live homepage</Link> · <Link href="/home-v2" style={{ color: "var(--ow-amber)", textDecoration: "underline" }}>see V2 mockup</Link>
        </p>
      </div>
    </section>
  );
}

// ── Preview banner ───────────────────────────────────────────────────────────
function PreviewBanner() {
  return (
    <div
      data-testid="v3-preview-banner"
      style={{
        position: "sticky",
        top: 0,
        zIndex: 50,
        background: "var(--ow-amber)",
        color: "oklch(0.10 0.008 60)",
        padding: "0.5rem 1rem",
        textAlign: "center",
        fontFamily: "'Fira Code',monospace",
        fontSize: "0.7rem",
        letterSpacing: "0.08em",
        textTransform: "uppercase",
        fontWeight: 700,
      }}
    >
      Mockup · Home v3 · The Storytelling Scroll · Not live ·{" "}
      <a href="/home" style={{ color: "inherit", textDecoration: "underline" }}>Live /home</a>
      {" · "}
      <a href="/home-v2" style={{ color: "inherit", textDecoration: "underline" }}>V2</a>
    </div>
  );
}

// ── Page shell ───────────────────────────────────────────────────────────────
export default function HomeV3() {
  return (
    <div
      data-testid="home-v3-root"
      style={{ background: "oklch(0.10 0.008 60)", minHeight: "100vh" }}
    >
      <PreviewBanner />
      <Zone1ColdOpen />
      <Zone2TheOldWay />
      <Zone3Transition />
      <Zone4TheAnswer />
      <Zone5Chapters />
      <Zone6Cost />
      <Zone7Choice />
    </div>
  );
}
