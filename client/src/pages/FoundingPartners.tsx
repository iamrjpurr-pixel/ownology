/**
 * /founding-partners — Cold-call landing page (Feb 2026).
 *
 * Story-flow HF principles (from Rich's brief):
 *   1. Anonymous winemaker prospect just clicked a link Rich sent them on
 *      a cold call. They may still be on the phone. 60 seconds of attention.
 *   2. Understand the product in one glance, trust it's real, take ONE
 *      action. No shopping-mall nav, no site-map bleed, no fog of CTAs.
 *   3. Combine with the site-wide pruning already in flight: this page is
 *      the cleanest, most disciplined surface in the whole app.
 *
 * Design decisions:
 *   - Fully self-contained shell. Tiny logo (top-left → /), quiet "back to
 *     ownology.ai" link. No PRIMARY_NAV bar. No footer bibliography.
 *   - Same flash-card visual language as HeroPillarsSection for brand
 *     continuity — but the CONTENT is proof, not pillars.
 *   - One primary CTA: "Book a 20-min chat with Rich" → email.subscribe
 *     with source=`cold-call` + optional ?ref=<name> pipe-through in tags.
 *   - One escape hatch: subtle link to /ask (free, no signup).
 *
 * Attribution: Rich hands out per-prospect URLs like
 *   https://ownology.ai/founding-partners?ref=jenny-smith
 * The `ref` param lands in the lead's `tags` as `ref:jenny-smith`, visible
 * inside /admin/contacts.
 */
import React from "react";
import { Link } from "wouter";
import { Helmet } from "react-helmet";
import { trpc } from "@/lib/trpc";
import OwnologyLogo from "@/components/OwnologyLogo";
import { Check, ChevronLeft, ChevronRight } from "lucide-react";

// ─── Cycling flash-cards data ────────────────────────────────────────────
interface FlashCard {
  eyebrow: string;
  title: string;
  body: React.ReactNode;
  quote?: string;
  isBookForm?: boolean;
}

const FLASH_CARDS: FlashCard[] = [
  {
    eyebrow: "01 · Every morning, at 7am",
    title: "The Cellar Brief.",
    body: (
      <>
        Owen — Ownology's AI cellar-hand — reads yesterday's logs while you
        sleep. Ranks what needs action today. Cites the SOP.{" "}
        <em>Then you decide.</em>
      </>
    ),
    quote:
      '"Tank 7 (Shiraz, day 5 of ferment) — dropped from 12°Brix to 11.8°Brix in 18 hours. YAN of 148 was low at inoculation. Recommend DAP addition of 2.6 kg (see red-ferment nutrient SOP)."',
  },
  {
    eyebrow: "02 · Any winemaking question. Answered.",
    title: "Ask Owen.",
    body: (
      <>
        Grounded in the standard cellar references your team already trusts,
        specific to boutique wineries. Cited every time. Every answer becomes a permanent
        Cellar Journal entry the whole industry can search.
      </>
    ),
    quote:
      '"When should I rack off the gross lees? — Rack once fermentation is finished (SG ≤0.995) and turbidity has dropped below 200 NTU. Typically 5-14 days post-ferment for reds, sooner for whites…"',
  },
  {
    eyebrow: "03 · Bring your history with you",
    title: "Your last three vintages, ingested.",
    body: (
      <>
        Voice notes. Spreadsheets. Notebook photos. Supplier PDFs. WhatsApp
        threads. Ownology&apos;s import surface reads all of them and turns them
        into a searchable, chronological cellar timeline.{" "}
        <em>Your history compounds against every new decision.</em>
      </>
    ),
    quote:
      '"Semillon 2024 notebook · page 6 of 12 · 43 entries extracted across pump-overs, additions, and observations. Ready to review."',
  },
  {
    eyebrow: "04 · What makes founding partners different",
    title: "You shape it.",
    body: (
      <ul style={{ listStyle: "none", margin: 0, padding: 0, display: "grid", gap: "0.6rem" }}>
        {[
          "Lifetime founding-partner pricing (grandfathered as the platform grows).",
          "A monthly 30-min call with Rich — your cellar's problems drive the roadmap.",
          "Feature requests jump the queue when a founding partner needs them.",
          "Your winery is credited in every SOP or protocol you help refine.",
        ].map((line) => (
          <li key={line} style={{ display: "flex", alignItems: "flex-start", gap: "0.6rem", fontFamily: "'Lato', sans-serif", fontSize: "0.95rem", lineHeight: 1.55 }}>
            <Check className="w-4 h-4 mt-1 flex-shrink-0" style={{ color: "var(--ow-amber)" }} />
            <span>{line}</span>
          </li>
        ))}
      </ul>
    ),
  },
  {
    eyebrow: "05 · Are we a fit?",
    title: "Three quick filters.",
    body: (
      <ul style={{ listStyle: "none", margin: 0, padding: 0, display: "grid", gap: "0.75rem" }}>
        <li style={{ fontFamily: "'Lato', sans-serif", fontSize: "0.95rem", lineHeight: 1.55 }}>
          <strong style={{ color: "var(--ow-amber)", fontFamily: "'Fraunces', serif", fontStyle: "italic", marginRight: "0.5rem" }}>i.</strong>
          Are you a boutique winery? (Roughly under 50,000L annual production, hands-on team, not part of a corporate group.)
        </li>
        <li style={{ fontFamily: "'Lato', sans-serif", fontSize: "0.95rem", lineHeight: 1.55 }}>
          <strong style={{ color: "var(--ow-amber)", fontFamily: "'Fraunces', serif", fontStyle: "italic", marginRight: "0.5rem" }}>ii.</strong>
          Are you in Australia, New Zealand, or the US? (Where our compliance packs and industry SOPs are localised.)
        </li>
        <li style={{ fontFamily: "'Lato', sans-serif", fontSize: "0.95rem", lineHeight: 1.55 }}>
          <strong style={{ color: "var(--ow-amber)", fontFamily: "'Fraunces', serif", fontStyle: "italic", marginRight: "0.5rem" }}>iii.</strong>
          Are you making calls on live fermentations right now and wishing the reasoning was written down for next year?
        </li>
      </ul>
    ),
  },
  {
    // End-of-preso card: only place the book form appears. Slide 6.
    eyebrow: "06 · One next action",
    title: "Book a 20-min chat with Rich.",
    body: null,
    isBookForm: true,
  },
];

// ─── Flash-card cycler ───────────────────────────────────────────────────
// Auto-cycle policy (Feb 2026, revised): 6s dwell on slide 1 so visitors
// finish reading the hero, 5s per slide 2–5, then STOP on slide 6 (the
// BookCallForm — auto-advancing off that would break the funnel).
// Auto-cycle pauses on hover/focus so a slow reader isn't yanked mid-line.
// Progress dots signal "this is cycling" so arrows aren't the only hint.
// If a visitor clicks any arrow, auto-cycle stops for the session — they
// took manual control, respect it.
const AUTO_CYCLE_FIRST_DELAY_MS = 6000;
const AUTO_CYCLE_STEP_MS = 5000;

function FlashCards({ refTag }: { refTag: string | null }) {
  // Deep-link support (#book) — the /trial-locked upgrade CTA + any email
  // link that pastes /join#book should jump straight to the final card
  // (BookCallForm) without forcing the reader through the whole deck.
  const initialIdx = typeof window !== "undefined" && window.location.hash === "#book"
    ? FLASH_CARDS.length - 1
    : 0;
  const [idx, setIdx] = React.useState(initialIdx);
  const [autoCycleOn, setAutoCycleOn] = React.useState(initialIdx === 0);
  const [paused, setPaused] = React.useState(false);
  const total = FLASH_CARDS.length;

  const card = FLASH_CARDS[idx];
  const isLast = idx === total - 1;
  const isFirst = idx === 0;

  // Auto-cycle effect. First dwell is longer so the hero has time to breathe;
  // subsequent slides tick at a steady 5s. Any manual arrow click flips
  // autoCycleOn=false and cancels the timer for the rest of the session.
  React.useEffect(() => {
    if (!autoCycleOn) return;
    if (paused) return;
    if (isLast) return; // never advance off the Book form
    const delay = idx === 0 ? AUTO_CYCLE_FIRST_DELAY_MS : AUTO_CYCLE_STEP_MS;
    const timer = window.setTimeout(() => setIdx((i) => Math.min(i + 1, total - 1)), delay);
    return () => window.clearTimeout(timer);
  }, [idx, autoCycleOn, paused, isLast, total]);

  const goPrev = () => {
    setAutoCycleOn(false);
    if (!isFirst) setIdx((i) => i - 1);
  };
  const goNext = () => {
    setAutoCycleOn(false);
    if (!isLast) setIdx((i) => i + 1);
  };
  const jumpTo = (i: number) => {
    setAutoCycleOn(false);
    setIdx(i);
  };

  return (
    <section
      data-testid="fp-flashcards"
      onMouseEnter={() => setPaused(true)}
      onMouseLeave={() => setPaused(false)}
      onFocus={() => setPaused(true)}
      onBlur={() => setPaused(false)}
      style={{
        marginTop: "3.5rem",
        padding: "2rem 2rem 1.75rem",
        border: "1px solid var(--ow-border)",
        borderRadius: "8px",
        background: "var(--ow-bg-card, oklch(0.98 0.008 90))",
        position: "relative",
        minHeight: "360px",
      }}
    >
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "1rem", gap: "1rem" }}>
        <p
          data-testid="fp-flashcard-eyebrow"
          style={{
            fontFamily: "'Lato', sans-serif",
            fontSize: "0.7rem",
            letterSpacing: "0.18em",
            textTransform: "uppercase",
            color: "var(--ow-amber)",
            margin: 0,
            fontWeight: 700,
          }}
        >
          {card.eyebrow}
        </p>
        <div style={{ display: "flex", gap: "0.5rem", alignItems: "center" }}>
          <button
            type="button"
            aria-label="Previous card"
            data-testid="fp-flashcard-prev"
            onClick={goPrev}
            disabled={isFirst}
            style={{
              background: "var(--ow-bg-card, transparent)",
              border: "1.5px solid var(--ow-amber, #B0741A)",
              borderRadius: "999px",
              padding: "0.45rem",
              cursor: isFirst ? "not-allowed" : "pointer",
              color: "var(--ow-amber, #B0741A)",
              opacity: isFirst ? 0.35 : 1,
              display: "inline-flex",
              alignItems: "center",
              justifyContent: "center",
              width: "2.25rem",
              height: "2.25rem",
              transition: "background 120ms",
            }}
            onMouseOver={(e) => { if (!isFirst) (e.currentTarget as HTMLButtonElement).style.background = "rgba(176,116,26,0.10)"; }}
            onMouseOut={(e) => { (e.currentTarget as HTMLButtonElement).style.background = "var(--ow-bg-card, transparent)"; }}
          >
            <ChevronLeft className="w-5 h-5" />
          </button>
          <button
            type="button"
            aria-label="Next card"
            data-testid="fp-flashcard-next"
            onClick={goNext}
            disabled={isLast}
            style={{
              background: "var(--ow-bg-card, transparent)",
              border: "1.5px solid var(--ow-amber, #B0741A)",
              borderRadius: "999px",
              padding: "0.45rem",
              cursor: isLast ? "not-allowed" : "pointer",
              color: "var(--ow-amber, #B0741A)",
              opacity: isLast ? 0.35 : 1,
              display: "inline-flex",
              alignItems: "center",
              justifyContent: "center",
              width: "2.25rem",
              height: "2.25rem",
              transition: "background 120ms",
            }}
            onMouseOver={(e) => { if (!isLast) (e.currentTarget as HTMLButtonElement).style.background = "rgba(176,116,26,0.10)"; }}
            onMouseOut={(e) => { (e.currentTarget as HTMLButtonElement).style.background = "var(--ow-bg-card, transparent)"; }}
          >
            <ChevronRight className="w-5 h-5" />
          </button>
        </div>
      </div>

      <h3
        style={{
          fontFamily: "'Fraunces', serif",
          fontWeight: 700,
          fontSize: "clamp(1.75rem, 3vw, 2.35rem)",
          color: "var(--ow-text-hi)",
          lineHeight: 1.1,
          margin: "0 0 1rem",
          letterSpacing: "-0.015em",
        }}
      >
        {card.title}
      </h3>

      {card.isBookForm ? (
        // ── End-of-preso: the ONLY place the book form appears ──
        <div style={{ marginTop: "0.5rem" }} data-testid="fp-form-block">
          <p style={{ fontFamily: "'Lato', sans-serif", fontSize: "1rem", lineHeight: 1.65, color: "var(--ow-text-mid)", margin: "0 0 1.5rem" }}>
            No slides. No script. Just tell me what's broken in your cellar right
            now and I'll show you whether Ownology solves it. If it doesn't, I'll
            say so — and probably point you at someone who does.
          </p>
          <BookCallForm refTag={refTag} />
        </div>
      ) : (
        <>
          {card.body && (
            <div style={{ fontFamily: "'Lato', sans-serif", fontSize: "1rem", lineHeight: 1.65, color: "var(--ow-text-mid)", marginBottom: card.quote ? "1.25rem" : 0 }}>
              {card.body}
            </div>
          )}

          {card.quote && (
            <blockquote
              data-testid="fp-flashcard-quote"
              style={{
                borderLeft: "3px solid var(--ow-amber)",
                paddingLeft: "1rem",
                margin: "0 0 1.25rem",
                fontFamily: "'Fraunces', Georgia, serif",
                fontStyle: "italic",
                fontSize: "0.95rem",
                lineHeight: 1.6,
                color: "var(--ow-text-hi)",
                opacity: 0.85,
              }}
            >
              {card.quote}
            </blockquote>
          )}
        </>
      )}

      {/* Dot pager — shows deck progress + jump-to */}
      <div style={{ marginTop: "1.5rem", display: "flex", gap: "0.4rem", justifyContent: "center", alignItems: "center" }} data-testid="fp-flashcard-dots">
        {FLASH_CARDS.map((_, i) => (
          <button
            key={i}
            type="button"
            aria-label={`Go to card ${i + 1}`}
            data-testid={`fp-flashcard-dot-${i}`}
            onClick={() => jumpTo(i)}
            style={{
              width: i === idx ? "22px" : "8px",
              height: "8px",
              borderRadius: "999px",
              border: "none",
              background: i === idx ? "var(--ow-amber)" : "var(--ow-border)",
              cursor: "pointer",
              padding: 0,
              transition: "width 200ms ease, background 200ms ease",
            }}
          />
        ))}
      </div>
      {/* Cycling hint — only while auto-cycle is still active and we're not
          on the last card. Fades to signal it's a status line, not a CTA. */}
      {autoCycleOn && !isLast && (
        <div
          data-testid="fp-flashcard-cycle-hint"
          style={{
            marginTop: "0.5rem",
            textAlign: "center",
            fontFamily: "'Lato', sans-serif",
            fontSize: "0.7rem",
            letterSpacing: "0.08em",
            textTransform: "uppercase",
            color: "var(--ow-text-mid)",
            opacity: 0.55,
          }}
        >
          {paused ? "Paused — move mouse away to resume" : `Auto-cycling · slide ${idx + 1} of ${total} · hover to pause`}
        </div>
      )}
    </section>
  );
}

// ─── Book-a-call form ────────────────────────────────────────────────────
function BookCallForm({ refTag }: { refTag: string | null }) {
  const [email, setEmail] = React.useState("");
  const [name, setName] = React.useState("");
  const [winery, setWinery] = React.useState("");
  const [note, setNote] = React.useState("");
  // Honeypot — bots that auto-fill every input trip this and are silently
  // 200'd server-side without the lead being persisted. Real users never
  // see the field (it's tabindex=-1, aria-hidden, positioned off-screen).
  const [companyWebsite, setCompanyWebsite] = React.useState("");
  const subscribeMutation = trpc.email.subscribe.useMutation();

  const submit = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      const tags = ["cold-call", "founding-partner"];
      if (refTag) tags.push(`ref:${refTag}`);
      if (note.trim()) tags.push(`note:${note.trim().slice(0, 80)}`);
      await subscribeMutation.mutateAsync({
        email: email.trim(),
        name: name.trim() || undefined,
        wineryName: winery.trim() || undefined,
        source: "cold-call",
        tags,
        companyWebsite,   // honeypot — must be empty for a real submission
      });
    } catch {
      /* the mutation surfaces its own error state */
    }
  };

  const isSuccess = subscribeMutation.isSuccess;

  if (isSuccess) {
    return (
      <div
        data-testid="fp-form-success"
        style={{
          padding: "2rem",
          border: "1px solid var(--ow-amber)",
          borderRadius: "8px",
          background: "color-mix(in oklch, var(--ow-amber) 8%, transparent)",
        }}
      >
        <p style={{ fontFamily: "'Fraunces', serif", fontStyle: "italic", fontSize: "1.35rem", color: "var(--ow-amber)", margin: "0 0 0.75rem" }}>
          Thanks — Rich will be in touch within 24 hours.
        </p>
        <p style={{ fontFamily: "'Lato', sans-serif", fontSize: "0.95rem", color: "var(--ow-text-mid)", margin: 0, lineHeight: 1.55 }}>
          In the meantime,{" "}
          <Link href="/ask" style={{ color: "var(--ow-amber)", textDecoration: "underline", textDecorationStyle: "dotted", textUnderlineOffset: "3px" }} data-testid="fp-success-ask-link">
            ask Owen a winemaking question
          </Link>{" "}
          — no signup, real answers, cited from the bibles.
        </p>
      </div>
    );
  }

  return (
    <form onSubmit={submit} data-testid="fp-form" style={{ display: "grid", gap: "0.85rem" }}>
      {/* Honeypot — invisible to humans, tempting to bots. Positioned off-
          screen (not display:none, since some bots skip hidden fields). */}
      <div
        aria-hidden="true"
        style={{
          position: "absolute", left: "-10000px", top: "auto",
          width: 1, height: 1, overflow: "hidden",
        }}
      >
        <label htmlFor="fp-companyWebsite">Company website (leave blank)</label>
        <input
          id="fp-companyWebsite"
          type="text"
          name="companyWebsite"
          value={companyWebsite}
          onChange={(e) => setCompanyWebsite(e.target.value)}
          tabIndex={-1}
          autoComplete="off"
          data-testid="fp-form-honeypot"
        />
      </div>
      <div>
        <label htmlFor="fp-name" className="fp-label">Your name</label>
        <input
          id="fp-name"
          data-testid="fp-form-name"
          value={name}
          onChange={(e) => setName(e.target.value)}
          placeholder="Sam Bloom"
          className="fp-input"
          autoComplete="name"
        />
      </div>
      <div>
        <label htmlFor="fp-winery" className="fp-label">Winery / label</label>
        <input
          id="fp-winery"
          data-testid="fp-form-winery"
          value={winery}
          onChange={(e) => setWinery(e.target.value)}
          placeholder="Bloomvale Wines · Adelaide Hills"
          className="fp-input"
          autoComplete="organization"
        />
      </div>
      <div>
        <label htmlFor="fp-email" className="fp-label">
          Email <span style={{ color: "var(--ow-amber)" }}>*</span>
        </label>
        <input
          id="fp-email"
          data-testid="fp-form-email"
          type="email"
          required
          value={email}
          onChange={(e) => setEmail(e.target.value)}
          placeholder="sam@bloomvalewines.com.au"
          className="fp-input"
          autoComplete="email"
        />
      </div>
      <div>
        <label htmlFor="fp-note" className="fp-label">What's on your mind (optional)</label>
        <textarea
          id="fp-note"
          data-testid="fp-form-note"
          value={note}
          onChange={(e) => setNote(e.target.value)}
          placeholder="e.g. Stuck fermentations last vintage. Or just curious."
          className="fp-input"
          rows={3}
          maxLength={200}
          style={{ resize: "vertical", minHeight: "70px" }}
        />
      </div>
      <button
        type="submit"
        data-testid="fp-form-submit"
        disabled={subscribeMutation.isPending || !email.trim()}
        style={{
          background: "var(--ow-amber)",
          color: "var(--ow-bg)",
          border: "none",
          padding: "0.9rem 1.5rem",
          borderRadius: "999px",
          fontFamily: "'Lato', sans-serif",
          fontSize: "0.78rem",
          fontWeight: 700,
          letterSpacing: "0.12em",
          textTransform: "uppercase",
          cursor: "pointer",
          opacity: subscribeMutation.isPending || !email.trim() ? 0.45 : 1,
          transition: "opacity 180ms ease, transform 180ms ease",
        }}
      >
        {subscribeMutation.isPending ? "Sending…" : "Book my 20-min chat →"}
      </button>
      {subscribeMutation.isError && (
        <p data-testid="fp-form-error" style={{ color: "oklch(0.62 0.20 25)", fontFamily: "'Lato', sans-serif", fontSize: "0.85rem", margin: 0 }}>
          Something went wrong — please try again or email support@ownology.ai.
        </p>
      )}
      <p style={{ fontFamily: "'Lato', sans-serif", fontSize: "0.7rem", color: "var(--ow-text-lo)", margin: "0.35rem 0 0", lineHeight: 1.5 }}>
        One email, one reply from Rich. No newsletter, no spam. Reply STOP anytime.
      </p>
    </form>
  );
}

// ─── Page ────────────────────────────────────────────────────────────────
export default function FoundingPartners() {
  const [refTag, setRefTag] = React.useState<string | null>(null);
  React.useEffect(() => {
    if (typeof window === "undefined") return;
    const ref = new URLSearchParams(window.location.search).get("ref");
    if (!ref) return;
    // ── Back-compat safety net ────────────────────────────────────────
    // `/join?ref=CODE` used to be the winery-to-winery referral flow. If
    // someone lands with a value that looks like an ALL-CAPS invite code
    // (e.g. "WNR-A7B9"), quietly redirect them to /referral?code=CODE so
    // the correct handler picks it up. Cold-call refs are always lowercase
    // person-slugs like "jenny-smith" — those stay here.
    if (/^[A-Z0-9-]{4,20}$/.test(ref)) {
      window.location.replace(`/referral?code=${encodeURIComponent(ref)}`);
      return;
    }
    if (/^[a-zA-Z0-9._-]{2,40}$/.test(ref)) setRefTag(ref);
  }, []);

  return (
    <div
      className="min-h-screen"
      style={{ background: "var(--ow-bg-base)", color: "var(--ow-text-hi)" }}
      data-testid="founding-partners-page"
    >
      <Helmet>
        <title>Ownology — For our founding partners.</title>
        <meta
          name="description"
          content="Vintage 2026 is on the crush pad across Australia and New Zealand. Nitrogen additions, MLF co-inoculation windows, sluggish ferments at 8°Bé — every log entry between now and press-off becomes evidence you'll cite when a barrel goes sideways in year two, or a QC lab asks how you tracked free SO₂ through maturation. We're onboarding a small number of founding partners to shape the platform through their 2026 vintage — and every vintage after."
        />
        <link rel="canonical" href="https://ownology.ai/join" />
        <meta property="og:title" content="Ownology — For our founding partners." />
        <meta property="og:description" content="Fruit's in the tanks. Vintage 2026 is fermenting. This is where Ownology earns its keep." />
        <meta property="og:type" content="website" />
        <meta property="og:url" content="https://ownology.ai/join" />
      </Helmet>

      {/* ── Minimal top chrome — logo + one link back to marketing site ── */}
      <header
        data-testid="fp-chrome"
        style={{
          display: "flex",
          justifyContent: "space-between",
          alignItems: "center",
          padding: "1.25rem 1.75rem",
          borderBottom: "1px solid var(--ow-border)",
        }}
      >
        <Link href="/" style={{ display: "flex", alignItems: "center", gap: "0.6rem", textDecoration: "none", color: "var(--ow-text-hi)" }} data-testid="fp-logo-home">
          <OwnologyLogo size={30} />
        </Link>
        <Link
          href="/"
          data-testid="fp-back-link"
          style={{
            fontFamily: "'Lato', sans-serif",
            fontSize: "0.75rem",
            color: "var(--ow-text-lo)",
            textDecoration: "none",
            letterSpacing: "0.05em",
          }}
        >
          ← ownology.ai
        </Link>
      </header>

      {/* ── Hero ────────────────────────────────────────────────────── */}
      <section style={{ maxWidth: "980px", margin: "0 auto", padding: "4rem 1.75rem 0" }}>
        <p
          data-testid="fp-eyebrow"
          style={{
            fontFamily: "'Lato', sans-serif",
            fontSize: "0.72rem",
            letterSpacing: "0.22em",
            textTransform: "uppercase",
            color: "var(--ow-amber)",
            fontWeight: 700,
            margin: 0,
          }}
        >
          Mid-ferment 2026 · and every vintage after{refTag && ` · Hi ${refTag.replace(/[-_.]/g, " ")}`}
        </p>
        <p
          data-testid="fp-strapline"
          style={{
            fontFamily: "'Fraunces', serif",
            fontStyle: "italic",
            fontSize: "clamp(1.15rem, 1.7vw, 1.4rem)",
            color: "var(--ow-amber)",
            lineHeight: 1.35,
            margin: "1rem 0 1.25rem",
            letterSpacing: "0.005em",
          }}
        >
          You are the must. Ownology is the ferment.
        </p>
        <h1
          data-testid="fp-h1"
          style={{
            fontFamily: "'Fraunces', serif",
            fontWeight: 700,
            fontSize: "clamp(2.4rem, 5.5vw, 4.5rem)",
            lineHeight: 1.02,
            color: "var(--ow-text-hi)",
            letterSpacing: "-0.02em",
            margin: 0,
            textWrap: "balance" as "balance",
          }}
        >
          Fruit's in the tanks.<br />
          This is where Ownology earns its keep.
        </h1>
        <p
          style={{
            fontFamily: "'Lato', sans-serif",
            fontSize: "1.15rem",
            lineHeight: 1.65,
            color: "var(--ow-text-mid)",
            margin: "1.5rem 0 0",
            maxWidth: "720px",
          }}
        >
          Vintage 2026 is on the crush pad across Australia and New Zealand.
          Nitrogen additions. MLF co-inoculation windows. Sluggish ferments
          at 8°Bé. Every log entry between now and press-off becomes evidence
          you&apos;ll cite when a barrel goes sideways in year two — or a QC
          lab asks how you tracked free SO₂ through maturation. We&apos;re
          onboarding{" "}
          <strong style={{ color: "var(--ow-text-hi)" }}>a small number of founding partners</strong>{" "}
          to shape the platform through their 2026 vintage — and every
          vintage after.
        </p>

        <FlashCards refTag={refTag} />
      </section>

      {/* ── Minimal footer ──────────────────────────────────────────── */}
      <footer
        style={{
          marginTop: "5rem",
          padding: "2rem 1.75rem",
          borderTop: "1px solid var(--ow-border)",
          textAlign: "center",
        }}
        data-testid="fp-footer"
      >
        <p style={{ fontFamily: "'Fraunces', serif", fontStyle: "italic", fontSize: "0.95rem", color: "var(--ow-amber)", margin: "0 0 0.5rem" }}>
          You are the must. Ownology is the ferment.
        </p>
        <p style={{ fontFamily: "'Lato', sans-serif", fontSize: "0.75rem", color: "var(--ow-text-lo)", margin: 0 }}>
          © 2026 Ownology · Made in Adelaide Hills · support@ownology.ai
        </p>
        <p style={{ fontFamily: "'Lato', sans-serif", fontSize: "0.72rem", color: "var(--ow-text-lo)", margin: "0.75rem 0 0" }}>
          <Link href="/join/landscape" data-testid="fp-landscape-link" style={{ color: "var(--ow-text-lo)", textDecoration: "underline" }}>
            How Ownology sits in the market →
          </Link>
        </p>
      </footer>

      <style>{`
        .fp-label {
          display: block;
          font-family: 'Lato', sans-serif;
          font-size: 0.68rem;
          letter-spacing: 0.14em;
          text-transform: uppercase;
          color: var(--ow-text-lo);
          margin-bottom: 0.4rem;
          font-weight: 600;
        }
        .fp-input {
          width: 100%;
          padding: 0.7rem 0.9rem;
          border: 1px solid var(--ow-border);
          background: transparent;
          color: var(--ow-text-hi);
          font-family: 'Lato', sans-serif;
          font-size: 0.95rem;
          border-radius: 4px;
          transition: border-color 180ms ease;
        }
        .fp-input:focus {
          outline: none;
          border-color: var(--ow-amber);
        }
      `}</style>
    </div>
  );
}
