/**
 * UserJourneyDeck — publication-format slide deck showing how a new
 * user flows from cold visit through to first vintage log. Built to
 * the same printable pattern as StyleGuideInduction — Rich prints to
 * PDF and emails as a leave-behind.
 *
 * Route: /admin/deck/user-journey (owner-facing).
 * Source of truth: this file. No markdown mirror — the deck is
 * lightweight enough that duplication would cost more than a single
 * source of truth is worth.
 */
import { useEffect } from "react";
import { Helmet } from "react-helmet";
import { Link } from "wouter";
import { Printer, ArrowLeft, ArrowRight } from "lucide-react";

const SERIF = "'Fraunces', Georgia, 'Times New Roman', serif";
const SANS = "'Lato', -apple-system, BlinkMacSystemFont, sans-serif";
const MONO = "'JetBrains Mono', 'Menlo', monospace";
const INK = "#1a1210";
const INK_MID = "#3a2f28";
const INK_LOW = "#6b5c50";
const AMBER = "#B0741A";
const CREAM = "#FBF3E4";
const CREAM_DEEP = "#F3ECE4";

type Slide = {
  n: number;
  eyebrow: string;
  title: string;
  cta: string | null;
  ctaMechanism: string | null;
  page: string;
  bullets: { label: string; body: string }[];
  psych: string;
};

const SLIDES: Slide[] = [
  {
    n: 1,
    eyebrow: "Stage 1 · Discovery",
    title: "How they find us",
    cta: null,
    ctaMechanism: null,
    page: "External — Google, LinkedIn, Cellar Journal SEO, referrals",
    bullets: [
      { label: "SEO harvest", body: "Cellar Journal case studies rank for boutique-winemaker Google queries (stuck ferment · SO₂ management · YAN calc). One post = one long-tail door." },
      { label: "Referrals", body: "Rich's cellar community + Gel's story-side content. High-trust source; skips the 'who are you?' step entirely." },
      { label: "LinkedIn / wine-industry channels", body: "Founding Cohort · 2026 announcement acts as an anchor event — reason to look now, not later." },
    ],
    psych: "The prospect arrives already primed for a specific pain (a Google search) or a specific person (a referral). Homepage's job is to confirm their existing intuition — not sell.",
  },
  {
    n: 2,
    eyebrow: "Stage 2 · Homepage",
    title: "The 8-second read",
    cta: "See a live Cellar Brief",
    ctaMechanism: "Deep-link to /cellar-brief, plus scroll-past to Meet the Cellar",
    page: "/home",
    bullets: [
      { label: "Line 1 (H1)", body: "Quality and risk, across the whole business. Category noun in six words. If they don't get it here, they're not our audience." },
      { label: "Line 2 (enemy)", body: "The spreadsheet in your winery is lying to you. Universal pain — every prospect nods." },
      { label: "Line 3 (audience)", body: "Built by boutique winemakers, for boutique wineries between 5 and 50 tonnes. Precision earns 3× conversion clarity." },
      { label: "The wow", body: "Live Cellar Brief teaser mid-page — real vessels, real statuses. The 4-second 'oh, THAT's what it does.'" },
      { label: "The humans", body: "Meet the Cellar — Rich, Gel, Owen. Team-of-three framing (Owen = working memory). Not a Silicon Valley product." },
    ],
    psych: "Prospects buy people they can picture. The team section humanises before pricing. Trust before price = higher tier selection.",
  },
  {
    n: 3,
    eyebrow: "Stage 3 · Consideration",
    title: "The sandbox and the tier chooser",
    cta: "See what you'd get →  ·  Help me choose",
    ctaMechanism: "/try sandbox (7-step) or /pricing tier chooser (3-Q wizard)",
    page: "/try  ·  /pricing",
    bullets: [
      { label: "/try", body: "Public 7-step sandbox. Real data. Zero commitment. Gel's voice throughout. Prospects who leave via /try have SEEN the product working." },
      { label: "/pricing chooser", body: "3-question wizard (winery scale · AI cadence · compliance pressure) removes 'which tier fits me?' friction. Points them at their answer." },
      { label: "Founding Cohort · 2026", body: "Time-bounded scarcity. Not gimmicky — genuinely 99 slots, publicly counted (once we have paid subscribers)." },
      { label: "Annual toggle", body: "3-months-free EOFY sweetener. Reframes the buy from 'monthly experiment' to 'part of my toolkit.'" },
    ],
    psych: "Two decision paths handle two mindsets: the sceptic (needs to play with /try) and the busy operator (needs to be pointed at the right tier). Neither is left to work it out alone.",
  },
  {
    n: 4,
    eyebrow: "Stage 4 · Sign-up",
    title: "The commitment moment — and the half-day",
    cta: "Book your onboarding day  ·  Claim your tier  ·  Join the waitlist",
    ctaMechanism: "Founding Cohort / annual commit → Rich blocks a half-day (rarely a full day) with your team to get you running.",
    page: "/pricing → checkout / waitlist / calendar",
    bullets: [
      { label: "The white-glove setup", body: "This is the differentiator no wine SaaS offers. For Founding Cohort and annual subscribers, Rich blocks a half-day — occasionally a full day — with your team. Not a call. A working session. We import your data, tune your first alerts, print your first SOP, name your first tanks. You leave with a running cellar, not a login screen." },
      { label: "Founding Cohort path", body: "Waitlist email capture → invite token from Rich → 44-day trial → white-glove day scheduled. First 99 wineries lock in pricing for life." },
      { label: "Annual path", body: "14-day trial + annual commitment → same white-glove day. Reframes the buy from 'monthly experiment' to 'part of my toolkit.'" },
      { label: "Direct-invite path", body: "Rich sends /i/<token> personally. Bypasses signup entirely. Best for referrals + press bypass." },
      { label: "No dark patterns", body: "No timed pop-ups. No exit-intent modals. No 'wait — before you go!' shame. Craft product, craft ethics." },
    ],
    psych: "Boutique winemakers buy people, not features. A founder who blocks a half-day for you at sign-up isn't running a SaaS — he's running a small business that happens to sell software. That distinction is the moat you can't copy from a landing page.",
  },
  {
    n: 5,
    eyebrow: "Stage 5 · Gate + First Land",
    title: "The doorstep",
    cta: "Enter password  ·  Click invite",
    ctaMechanism: "/api/gate/verify (password) or /i/<token> (invite)",
    page: "/try → /gate → /your-vintage?welcome=1",
    bullets: [
      { label: "Password gate", body: "Currently middx99 — intent filter, not security. The pause is the point. Filters out browsers, in-lets buyers." },
      { label: "Invite token", body: "Personal `/i/<token>` links from Rich or Gel. First-use → /your-vintage?welcome=1. Repeat use → /admin." },
      { label: "Welcome banner", body: "First-invite lands on /your-vintage with a warm welcome header. Their FIRST Ownology surface is their induction spine, not an empty dashboard." },
    ],
    psych: "First-run experience decides retention within 30 seconds. Empty dashboards kill. A roadmap with lit-up gate 1 is instant orientation.",
  },
  {
    n: 6,
    eyebrow: "Stage 6 · Induction",
    title: "The seven gates — and how we reduced cognitive overload",
    cta: "Log a tank  ·  Add a batch  ·  Log a measurement",
    ctaMechanism: "Every locked gate carries a primary CTA (do-this) AND a secondary learnCta (why-this-matters). Two paths, one page.",
    page: "/your-vintage  ·  /guide  ·  /ask",
    bullets: [
      { label: "Seven earned gates", body: "Register → Tanks → Batch → Measurement → Fermentation → Racking → Bottling. Computed from live vintage_log data. No fake progress. No 'acknowledge to continue' tutorials." },
      { label: "Skim mode", body: "One toggle at the top of /your-vintage expands every gate's full description regardless of unlock state. Novices get the tight version. Experts (writers, judges, evaluators) get the deep read. Same page, two modes." },
      { label: "Dual CTAs on every locked card", body: "Primary amber pill: 'Add a batch via Quick Entry →'. Secondary muted link: 'Why this matters →' pointing at /guide, /cellar-journal, or Ask Owen. Skimmers get context; doers get the door." },
      { label: "Collapse-all on /guide", body: "The four-pillar map opens with all sections collapsed. Users choose what they read. No wall-of-text overwhelm on first-run." },
      { label: "5-dot progress meter", body: "/guide shows five dots — Journal, Copilot, Brief, Compliance, Invite. Lights up as you touch each pillar. Answer to 'am I doing this right?' in one glance." },
      { label: "Welcome banner, not welcome tour", body: "First-invite tokens land on /your-vintage?welcome=1 with a warm one-paragraph banner. No modals. No forced walkthrough. The Roadmap IS the tour." },
      { label: "Ask Owen available from Gate 1", body: "The user has help before they have data. Every locked card is a question away from context — no need to 'unlock' the AI to ask what a Brix reading is." },
      { label: "Honest locked-card language", body: "'The Press is where Ownology writes your post-vintage debrief. We deliberately keep the detail locked until you've racked a batch — a debrief without your own data would be a stock photo.' Reason, not obstruction." },
      { label: "Press bypass for evaluators", body: "Wine writers, judges, consulting winemakers request preview access via a 3-field form on the locked Press card. Rich grants it one-click from /admin. Craft moat meets pragmatic evaluator UX." },
    ],
    psych: "Progressive disclosure that respects BOTH novices AND experts is the moat. Nine specific moves above — each individually small, together forming an induction system that reduces cognitive load at every stage without insulting anyone's intelligence. Kalyuga's expertise-reversal effect (2003–2024): scaffolding that helps novices actively hurts experts. Skim mode + dual CTAs are how we serve both without picking sides.",
  },
  {
    n: 7,
    eyebrow: "Stage 7 · Retention",
    title: "The morning ritual",
    cta: "Read the brief  ·  Open Ask Owen  ·  Log the day",
    ctaMechanism: "Cellar Brief 05:30 daily · Ask Owen chat · Quick Entry logging",
    page: "/cellar-brief  ·  /ask  ·  /quick-entry",
    bullets: [
      { label: "Cellar Brief 05:30", body: "Every morning, one screen: what needs attention today. Cited to their own logs. This is the daily ritual that keeps them logged in." },
      { label: "Weekly digest email (upcoming)", body: "Same brief shape delivered to inbox. Preserves retention during the empty-cellar off-season when they don't open the app." },
      { label: "Alerts engine", body: "Stuck ferment · temp excursion · SO₂ decay. Push notification + brief card. Reactive, not proactive." },
      { label: "Compliance PDF", body: "Once bottled: an exportable audit pack. The moment they see it, upgrade friction drops to zero." },
    ],
    psych: "Retention is not a feature. It's the daily emotional payoff. The brief is the ritual. The ritual is the moat.",
  },
  {
    n: 8,
    eyebrow: "The Funnel · Metrics that matter",
    title: "What we're measuring",
    cta: null,
    ctaMechanism: null,
    page: "Analytics dashboards (to build)",
    bullets: [
      { label: "Homepage → /try", body: "% of homepage visitors who touch the sandbox. Target 25%. Signal: hero copy earning the click." },
      { label: "/try → signup", body: "% who complete a tier selection or waitlist. Target 8%. Signal: sandbox is honest, not overselling." },
      { label: "Signup → Gate 4 (first measurement)", body: "% who cross the 'AI turns on' threshold in 90 days. Target 60%. Signal: induction is doing its job." },
      { label: "Gate 4 → Gate 7 (bottled)", body: "% who complete a full vintage in 12 months. Target 40%. Signal: product retention." },
      { label: "Any user → invited a collaborator", body: "% who share the winery. Target 30%. Signal: emotional buy-in. Predicts LTV." },
    ],
    psych: "The gates measure real winemaking activity, not app engagement. We measure what earns money AND what predicts loyalty — the two aren't the same metric.",
  },
  {
    n: 9,
    eyebrow: "The Story · What this deck is really for",
    title: "The reason the funnel works",
    cta: null,
    ctaMechanism: null,
    page: "Everywhere. It's the doctrine.",
    bullets: [
      { label: "The category", body: "Quality and risk management for winemakers — across the whole business. Not an AI winemaker. Not a compliance tool. Not a CRM. One category noun, unambiguous, ownable." },
      { label: "The team of three", body: "Rich makes the wine. Gel tells the story. Owen remembers everything so you don't have to. Uncloneable competitive moat." },
      { label: "The enemy", body: "The spreadsheet in your winery is lying to you. Concrete. Universal. Sherif in-group bonding." },
      { label: "The promise", body: "Honest progressive disclosure. We show you the mountain. We only open the summit when you've earned it. No stock photos of your future." },
    ],
    psych: "A funnel without doctrine drifts. Every stage of this journey is downstream of one shared belief: boutique winemakers should have the best tool in the industry, made by people who share their weekends.",
  },
];

export default function UserJourneyDeck() {
  useEffect(() => {
    const prevBg = document.body.style.background;
    const prevColor = document.body.style.color;
    document.body.style.background = "#f6f1ea";
    document.body.style.color = INK;
    return () => {
      document.body.style.background = prevBg;
      document.body.style.color = prevColor;
    };
  }, []);

  return (
    <>
      <Helmet>
        <title>User Journey Deck · Ownology</title>
        <meta name="description" content="How new users flow from cold visit through sign-up to first vintage log. A visual reference for client meetings and investor pitches." />
      </Helmet>

      <style>{`
        @page {
          size: A4 landscape;
          margin: 15mm;
        }
        @media print {
          body { background: #fff !important; }
          .no-print { display: none !important; }
          .deck { max-width: none !important; padding: 0 !important; background: #fff !important; }
          .slide { page-break-after: always; box-shadow: none !important; margin-bottom: 0 !important; border: 1px solid ${CREAM_DEEP} !important; }
          .slide:last-child { page-break-after: auto; }
          a { color: ${INK} !important; text-decoration: none !important; }
        }
      `}</style>

      {/* Toolbar */}
      <div
        className="no-print"
        style={{
          position: "sticky",
          top: 0,
          zIndex: 1000,
          background: "rgba(246,241,234,0.96)",
          backdropFilter: "blur(8px)",
          borderBottom: "1px solid rgba(0,0,0,0.08)",
          padding: "0.75rem 1.25rem",
          paddingRight: "13rem",
          display: "flex",
          alignItems: "center",
          justifyContent: "space-between",
          gap: "1rem",
        }}
      >
        <Link
          href="/admin"
          data-testid="user-journey-back"
          style={{
            display: "inline-flex",
            alignItems: "center",
            gap: "0.4rem",
            color: INK_MID,
            textDecoration: "none",
            fontFamily: SANS,
            fontSize: "0.85rem",
            fontWeight: 500,
          }}
        >
          <ArrowLeft size={14} strokeWidth={2.2} /> Back to Admin
        </Link>
        <div style={{ fontFamily: SANS, fontSize: "0.7rem", letterSpacing: "0.14em", textTransform: "uppercase", color: INK_LOW }}>
          User Journey Deck · v1.0 · Feb 2026
        </div>
        <button
          onClick={() => window.print()}
          data-testid="user-journey-print"
          style={{
            display: "inline-flex",
            alignItems: "center",
            gap: "0.4rem",
            padding: "0.5rem 0.9rem",
            borderRadius: 999,
            background: AMBER,
            color: "#2A1E0A",
            border: "none",
            fontFamily: SANS,
            fontSize: "0.8rem",
            fontWeight: 600,
            letterSpacing: "0.04em",
            cursor: "pointer",
          }}
        >
          <Printer size={14} strokeWidth={2.2} /> Print / Save as PDF
        </button>
      </div>

      <div
        className="deck"
        data-testid="user-journey-deck"
        style={{
          maxWidth: "1180px",
          margin: "0 auto",
          padding: "2.5rem 1.5rem 4rem",
          fontFamily: SERIF,
          color: INK,
        }}
      >
        {/* Cover slide */}
        <section
          className="slide"
          style={{
            background: "#fff",
            padding: "3rem 3.5rem",
            marginBottom: "1.25rem",
            borderRadius: "0.5rem",
            boxShadow: "0 12px 40px -20px rgba(0,0,0,0.2)",
            minHeight: "24rem",
            display: "flex",
            flexDirection: "column",
            justifyContent: "space-between",
          }}
        >
          <div>
            <div style={{ fontFamily: SANS, fontSize: "0.7rem", letterSpacing: "0.2em", textTransform: "uppercase", color: AMBER, fontWeight: 700, marginBottom: "1.5rem" }}>
              Ownology · User Journey · v1.0
            </div>
            <h1 style={{ margin: 0, fontFamily: SERIF, fontSize: "clamp(2rem, 4.5vw, 3rem)", lineHeight: 1.05, fontWeight: 600, letterSpacing: "-0.02em", color: INK, maxWidth: "22ch" }}>
              How new users flow from cold visit to first vintage log.
            </h1>
            <p style={{ margin: "1.5rem 0 0 0", fontFamily: SERIF, fontStyle: "italic", fontSize: "1.1rem", color: INK_MID, maxWidth: "50ch", lineHeight: 1.45 }}>
              Nine stages, one doctrine. Every CTA on every page is downstream of a shared belief: we show them the mountain, then we only open the summit when they&apos;ve earned it.
            </p>
          </div>
          <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-end", fontFamily: SANS, fontSize: "0.75rem", color: INK_LOW }}>
            <div>Rich Middlebrook · Ownology · February 2026</div>
            <div style={{ fontFamily: MONO, letterSpacing: "0.1em" }}>{SLIDES.length + 1} slides</div>
          </div>
        </section>

        {/* Journey overview strip */}
        <section
          className="slide"
          style={{
            background: "#fff",
            padding: "2rem 2.5rem",
            marginBottom: "1.25rem",
            borderRadius: "0.5rem",
            boxShadow: "0 12px 40px -20px rgba(0,0,0,0.2)",
          }}
        >
          <div style={{ fontFamily: SANS, fontSize: "0.65rem", letterSpacing: "0.2em", textTransform: "uppercase", color: AMBER, fontWeight: 700, marginBottom: "0.75rem" }}>
            The journey · at a glance
          </div>
          <h2 style={{ margin: "0 0 1.5rem 0", fontFamily: SERIF, fontSize: "1.75rem", fontWeight: 600, color: INK, letterSpacing: "-0.01em" }}>
            Discovery → Homepage → Sandbox → Signup → Gate → Induction → Retention
          </h2>
          <div style={{ display: "grid", gridTemplateColumns: "repeat(7, 1fr)", gap: "0.5rem" }}>
            {["Discovery", "Homepage", "Consideration", "Sign-up", "Gate + Land", "Induction", "Retention"].map((label, i) => (
              <div key={label} style={{ padding: "0.85rem 0.5rem", background: i === 0 || i === 6 ? "#fff" : CREAM, borderRadius: "0.4rem", border: `1px solid ${CREAM_DEEP}`, textAlign: "center" }}>
                <div style={{ fontFamily: MONO, fontSize: "0.62rem", color: AMBER, fontWeight: 700, letterSpacing: "0.08em" }}>0{i + 1}</div>
                <div style={{ fontFamily: SANS, fontSize: "0.78rem", color: INK, fontWeight: 600, marginTop: "0.25rem" }}>{label}</div>
              </div>
            ))}
          </div>
          <p style={{ margin: "1.5rem 0 0 0", fontFamily: SERIF, fontSize: "0.95rem", color: INK_MID, lineHeight: 1.55, maxWidth: "72ch" }}>
            Nine slides follow, one per stage. Each names the page, the primary CTA, the mechanism behind it, and the psychology that makes it work.
          </p>
        </section>

        {SLIDES.map((s) => (
          <section
            key={s.n}
            className="slide"
            data-testid={`slide-${s.n}`}
            style={{
              background: "#fff",
              padding: "2rem 2.5rem",
              marginBottom: "1.25rem",
              borderRadius: "0.5rem",
              boxShadow: "0 12px 40px -20px rgba(0,0,0,0.2)",
            }}
          >
            <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "2.5rem", alignItems: "flex-start" }}>
              <div>
                <div style={{ fontFamily: SANS, fontSize: "0.65rem", letterSpacing: "0.2em", textTransform: "uppercase", color: AMBER, fontWeight: 700 }}>
                  {s.eyebrow}
                </div>
                <h2 style={{ margin: "0.5rem 0 0.5rem 0", fontFamily: SERIF, fontSize: "1.75rem", fontWeight: 600, color: INK, letterSpacing: "-0.01em", lineHeight: 1.15 }}>
                  {s.title}
                </h2>
                <div style={{ fontFamily: MONO, fontSize: "0.72rem", color: INK_LOW, marginTop: "0.5rem" }}>
                  Page: {s.page}
                </div>
                {s.cta && (
                  <div style={{ margin: "1rem 0 0 0", padding: "0.75rem 1rem", background: CREAM, borderRadius: "0.4rem", border: `1px dashed ${AMBER}` }}>
                    <div style={{ fontFamily: SANS, fontSize: "0.62rem", letterSpacing: "0.14em", textTransform: "uppercase", color: AMBER, fontWeight: 700, marginBottom: "0.35rem" }}>
                      Primary CTA
                    </div>
                    <div style={{ fontFamily: SERIF, fontSize: "1rem", color: INK, fontWeight: 500, display: "inline-flex", alignItems: "center", gap: "0.4rem" }}>
                      {s.cta} <ArrowRight size={14} strokeWidth={2.2} color={AMBER} />
                    </div>
                    {s.ctaMechanism && (
                      <div style={{ fontFamily: SANS, fontSize: "0.75rem", color: INK_LOW, marginTop: "0.35rem", fontStyle: "italic" }}>
                        {s.ctaMechanism}
                      </div>
                    )}
                  </div>
                )}
                <div style={{ margin: "1.25rem 0 0 0", padding: "0.75rem 1rem", background: "rgba(176,116,26,0.05)", borderRadius: "0.4rem", borderLeft: `3px solid ${AMBER}` }}>
                  <div style={{ fontFamily: SANS, fontSize: "0.62rem", letterSpacing: "0.14em", textTransform: "uppercase", color: AMBER, fontWeight: 700, marginBottom: "0.35rem" }}>
                    Human factors
                  </div>
                  <div style={{ fontFamily: SERIF, fontSize: "0.88rem", color: INK_MID, lineHeight: 1.55, fontStyle: "italic" }}>
                    {s.psych}
                  </div>
                </div>
              </div>
              <div>
                <div style={{ fontFamily: SANS, fontSize: "0.62rem", letterSpacing: "0.14em", textTransform: "uppercase", color: AMBER, fontWeight: 700, marginBottom: "0.75rem" }}>
                  What&apos;s on the page
                </div>
                {s.bullets.map((b, i) => (
                  <div key={i} style={{ marginBottom: "0.85rem", paddingBottom: "0.85rem", borderBottom: i === s.bullets.length - 1 ? "none" : "1px dashed rgba(0,0,0,0.08)" }}>
                    <div style={{ fontFamily: SERIF, fontSize: "0.95rem", fontWeight: 600, color: INK, marginBottom: "0.25rem" }}>
                      {b.label}
                    </div>
                    <div style={{ fontFamily: SERIF, fontSize: "0.82rem", color: INK_MID, lineHeight: 1.55 }}>
                      {b.body}
                    </div>
                  </div>
                ))}
              </div>
            </div>
            <div style={{ marginTop: "1.5rem", fontFamily: MONO, fontSize: "0.62rem", color: INK_LOW, letterSpacing: "0.08em", textAlign: "right" }}>
              Slide {s.n} of {SLIDES.length}
            </div>
          </section>
        ))}

        {/* Colophon */}
        <section
          className="slide"
          style={{
            background: CREAM,
            padding: "2rem 2.5rem",
            marginBottom: 0,
            borderRadius: "0.5rem",
            boxShadow: "0 12px 40px -20px rgba(0,0,0,0.2)",
          }}
        >
          <div style={{ fontFamily: SANS, fontSize: "0.62rem", letterSpacing: "0.14em", textTransform: "uppercase", color: AMBER, fontWeight: 700, marginBottom: "0.5rem" }}>
            Colophon
          </div>
          <p style={{ margin: "0 0 0.75rem 0", fontFamily: SANS, fontSize: "0.85rem", color: INK_MID, lineHeight: 1.6 }}>
            User Journey Deck v1.0 · February 2026 · Rich Middlebrook · Ownology. Reflects the positioning-audit ship
            of the Roadmap release (Home hero, Meet the Cellar, /your-vintage, tier chooser, live Cellar Brief teaser).
          </p>
          <p style={{ margin: "0", fontFamily: SERIF, fontStyle: "italic", fontSize: "1rem", color: AMBER }}>
            Rich makes the wine. Gel tells the story. Owen remembers everything so you don&apos;t have to.
          </p>
        </section>
      </div>
    </>
  );
}
