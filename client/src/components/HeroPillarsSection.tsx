/**
 * HeroPillarsSection — the 4-pillar (Do · Know · Learn · Guide) home hero
 * variant. Introduced Feb 2026 behind `useUiPillarsV1()` in `config/ui.ts`.
 *
 * Design intent (from Rich, Feb 2026):
 *   "Dramatise how simple the 4-pillar product is. If a prospect saw the
 *    site map they'd run a mile — they need to see FOUR things, big, tap-
 *    pable, one glance."
 *
 * Structure:
 *   - Amber kicker: "Cellar Intelligence Platform for Winemakers"
 *   - Amber italic strapline: "You are the must. Ownology is the ferment."
 *   - Serif H1: "Do. Know. Learn. Guide."   (matches /#how-it-works H2)
 *   - One-line subtitle
 *   - 4 flash-cards in a 2×2 grid on desktop, single column on mobile.
 *     Each card is one pillar → one live surface (no dead links).
 *   - Two secondary CTAs below the grid (trial + cellar brief).
 *
 * Reversible: mounted from `Home.tsx` only when `useUiPillarsV1()` is true.
 * If we hate it, flip the flag; the original hero code in Home.tsx is
 * untouched and re-appears in the same paint frame.
 */
import { Link } from "wouter";

interface Pillar {
  n: string;
  name: string;
  promise: string;
  bullets: string[];
  cta: string;
  href: string;
  testid: string;
}

const PILLARS: Pillar[] = [
  {
    n: "01",
    name: "Do",
    promise: "Run the cellar from the pocket.",
    bullets: ["Quick voice/manual logs", "Task list + tank readings", "Every action time-stamped"],
    cta: "See Quick Entry →",
    href: "/quick-entry",
    testid: "hero-pillar-do",
  },
  {
    n: "02",
    name: "Know",
    promise: "Owen writes the brief while you sleep.",
    bullets: ["Daily Cellar Brief at 7am", "38 industry SOPs", "Your Decision Logic + Tribal Knowledge"],
    cta: "See a live Cellar Brief →",
    href: "/cellar-brief?from=hero-pillars",
    testid: "hero-pillar-know",
  },
  {
    n: "03",
    name: "Learn",
    promise: "Ask any winemaking question. Get an answer.",
    bullets: ["Grounded in the standard cellar references your team already trusts", "Curated by winemakers, not marketers", "Free forever, cited & shareable"],
    cta: "Ask Owen →",
    href: "/ask?from=hero-pillars",
    testid: "hero-pillar-learn",
  },
  {
    n: "04",
    name: "Guide",
    promise: "Compliance + onboarding, side-by-side.",
    bullets: ["Wine Australia LIP Audit Pack", "One-tap PDF exports", "Getting-started walkthrough"],
    cta: "Open the Guide →",
    href: "/guide",
    testid: "hero-pillar-guide",
  },
];

export function HeroPillarsSection() {
  return (
    <div
      className="container relative z-10 pt-32 pb-20"
      data-testid="hero-pillars-section"
    >
      <div className="max-w-3xl">
        <p className="section-label mb-4 fade-up">Cellar Intelligence Platform for Winemakers</p>
        <p
          data-testid="hero-pillars-strapline"
          className="fade-up fade-up-delay-1"
          style={{
            fontFamily: "'Fraunces', serif",
            fontStyle: "italic",
            fontSize: "clamp(1.1rem, 1.6vw, 1.35rem)",
            color: "var(--ow-amber)",
            lineHeight: 1.35,
            margin: "0 0 1.25rem",
            letterSpacing: "0.005em",
          }}
        >
          You are the must. Ownology is the ferment.
        </p>
        <h1
          className="fade-up fade-up-delay-1"
          data-testid="hero-pillars-h1"
          style={{
            fontFamily: "'Fraunces',serif",
            fontWeight: 700,
            fontSize: "clamp(2.5rem, 6vw, 4.75rem)",
            lineHeight: 1.02,
            color: "var(--ow-text-hi)",
            letterSpacing: "-0.02em",
            margin: 0,
            textWrap: "balance" as "balance",
          }}
        >
          Do. Know. Learn. Guide.
        </h1>
        <p
          className="mt-5 fade-up fade-up-delay-2"
          style={{
            fontFamily: "'Lato', sans-serif",
            fontWeight: 300,
            fontSize: "1.125rem",
            lineHeight: 1.65,
            color: "var(--ow-text-mid)",
            maxWidth: "620px",
          }}
        >
          Four things. That is Ownology. A cellar intelligence platform built for boutique
          winemakers — on a phone, during harvest, ready for the 3am ferment panic.
        </p>
      </div>

      {/* ── Flash-card grid — 4 pillars, tappable, one glance ─────────── */}
      <div
        className="mt-14 grid gap-5 fade-up fade-up-delay-3"
        style={{
          gridTemplateColumns: "repeat(auto-fit, minmax(260px, 1fr))",
        }}
        data-testid="hero-pillars-grid"
      >
        {PILLARS.map((p) => (
          <Link
            key={p.n}
            href={p.href}
            data-testid={p.testid}
            className="hero-pillar-card"
            style={{
              display: "block",
              padding: "1.5rem 1.5rem 1.35rem",
              background: "var(--ow-bg-card, oklch(0.98 0.008 90))",
              border: "1px solid var(--ow-border-md, oklch(0.87 0.015 80))",
              borderRadius: "6px",
              textDecoration: "none",
              transition: "transform 180ms ease, border-color 180ms ease, box-shadow 180ms ease",
              position: "relative",
            }}
          >
            <div
              style={{
                fontFamily: "'Fraunces', serif",
                fontWeight: 700,
                fontSize: "2.25rem",
                color: "color-mix(in oklch, var(--ow-amber) 30%, transparent)",
                lineHeight: 1,
                marginBottom: "0.5rem",
              }}
            >
              {p.n}
            </div>
            <h3
              style={{
                fontFamily: "'Fraunces', serif",
                fontWeight: 700,
                fontSize: "1.75rem",
                color: "var(--ow-text-hi)",
                lineHeight: 1.1,
                margin: "0 0 0.5rem",
                letterSpacing: "-0.01em",
              }}
            >
              {p.name}
            </h3>
            <p
              style={{
                fontFamily: "'Lato', sans-serif",
                fontSize: "0.95rem",
                lineHeight: 1.5,
                color: "var(--ow-text-mid)",
                margin: "0 0 1rem",
              }}
            >
              {p.promise}
            </p>
            <ul
              style={{
                listStyle: "none",
                margin: 0,
                padding: 0,
                borderTop: "1px dashed var(--ow-border-md, oklch(0.87 0.015 80))",
                paddingTop: "0.85rem",
              }}
            >
              {p.bullets.map((b) => (
                <li
                  key={b}
                  style={{
                    fontFamily: "'Lato', sans-serif",
                    fontSize: "0.8rem",
                    color: "var(--ow-text-lo)",
                    lineHeight: 1.55,
                    padding: "0.1rem 0",
                    display: "flex",
                    alignItems: "flex-start",
                    gap: "0.5rem",
                  }}
                >
                  <span style={{ color: "var(--ow-amber)", flexShrink: 0 }}>·</span>
                  <span>{b}</span>
                </li>
              ))}
            </ul>
            <div
              style={{
                marginTop: "1rem",
                fontFamily: "'Lato', sans-serif",
                fontSize: "0.8rem",
                fontWeight: 700,
                color: "var(--ow-amber)",
                letterSpacing: "0.04em",
                textTransform: "uppercase",
              }}
            >
              {p.cta}
            </div>
          </Link>
        ))}
      </div>

      {/* ── Audience router — soft self-sort chips (Feb 2026, Rich)
             Introduced after the /home-v2 experiment showed a dual-door
             framing helps DIY visitors and Pros both feel welcome without
             leaning too hard on the Owen character. Kept intentionally
             low-contrast so it never competes with the pillar grid or the
             Start Free Trial primary CTA. ────────────────────────────── */}
      <div
        className="mt-10 flex flex-wrap items-center gap-3 fade-up fade-up-delay-3"
        data-testid="hero-pillars-audience-router"
        style={{
          padding: "0.75rem 0",
          borderTop: "1px dashed var(--ow-border-md, oklch(0.87 0.015 80))",
        }}
      >
        <span
          style={{
            fontFamily: "'Lato', sans-serif",
            fontSize: "0.72rem",
            letterSpacing: "0.08em",
            textTransform: "uppercase",
            color: "var(--ow-text-lo)",
            fontWeight: 600,
          }}
        >
          Which are you?
        </span>
        <Link
          href="/ask?from=hero-router-curious"
          data-testid="hero-router-curious"
          className="hero-router-chip"
          style={{
            padding: "0.4rem 0.85rem",
            borderRadius: "999px",
            border: "1px solid var(--ow-border-md, oklch(0.87 0.015 80))",
            background: "transparent",
            color: "var(--ow-text-mid)",
            fontFamily: "'Lato', sans-serif",
            fontSize: "0.85rem",
            textDecoration: "none",
            transition: "border-color 180ms ease, color 180ms ease, background 180ms ease",
          }}
        >
          🍷 Just curious about wine →
        </Link>
        <Link
          href="/join?from=hero-router-pro"
          data-testid="hero-router-pro"
          className="hero-router-chip"
          style={{
            padding: "0.4rem 0.85rem",
            borderRadius: "999px",
            border: "1px solid var(--ow-border-md, oklch(0.87 0.015 80))",
            background: "transparent",
            color: "var(--ow-text-mid)",
            fontFamily: "'Lato', sans-serif",
            fontSize: "0.85rem",
            textDecoration: "none",
            transition: "border-color 180ms ease, color 180ms ease, background 180ms ease",
          }}
        >
          🍇 Making wine yourself →
        </Link>
      </div>

      {/* ── Secondary CTAs — preserved from the original hero so we don't
             lose the "Start Free Trial" primary conversion path ────────── */}
      <div
        className="mt-6 flex flex-col sm:flex-row flex-wrap gap-3 fade-up fade-up-delay-3"
        data-testid="hero-pillars-ctas"
      >
        <a
          href="/pricing?from=hero-pillars"
          className="btn-amber text-center"
          data-testid="hero-pillars-cta-trial"
        >
          Start 14-Day Free Trial
        </a>
        <Link
          href="/try?from=hero-pillars"
          className="btn-ghost text-center flex items-center justify-center gap-2"
          data-testid="hero-pillars-cta-try"
          style={{
            borderColor: "var(--ow-amber)",
            color: "var(--ow-amber)",
            fontWeight: 600,
          }}
        >
          Play the 10-minute sandbox
        </Link>
      </div>

      <style>{`
        .hero-pillar-card:hover {
          transform: translateY(-2px);
          border-color: var(--ow-amber) !important;
          box-shadow: 0 8px 32px -12px color-mix(in oklch, var(--ow-amber) 25%, transparent);
        }
        .hero-router-chip:hover {
          border-color: var(--ow-amber) !important;
          color: var(--ow-amber) !important;
          background: color-mix(in oklch, var(--ow-amber) 8%, transparent) !important;
        }
      `}</style>
    </div>
  );
}
