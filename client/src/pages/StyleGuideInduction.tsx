/**
 * StyleGuideInduction — publication-format print page for the Ownology
 * Induction Style Guide.
 *
 * Purpose: Rich needs to email this to founding partners, investors, and
 * advisory contacts as a PDF. Rather than round-trip through a
 * markdown → pdf converter, this page renders the doc in a
 * publication-ready layout with strict `@media print` rules — the
 * browser's built-in "Print → Save as PDF" produces a clean,
 * paginated artefact.
 *
 * Source of truth: /app/memory/INDUCTION_STYLE_GUIDE.md (identical copy).
 * If that changes, update this file too — they must not drift.
 *
 * Route: /admin/style-guide/induction (owner-facing).
 */
import { useEffect } from "react";
import { Helmet } from "react-helmet";
import { Link } from "wouter";
import { Printer, ArrowLeft } from "lucide-react";

const SERIF = "'Fraunces', Georgia, 'Times New Roman', serif";
const SANS = "'Lato', -apple-system, BlinkMacSystemFont, sans-serif";
const INK = "#1a1210";
const INK_MID = "#3a2f28";
const INK_LOW = "#6b5c50";
const AMBER = "#B0741A";
const CREAM = "#FBF3E4";
const CREAM_DEEP = "#F3ECE4";

export default function StyleGuideInduction() {
  // Set a light body background while this page is mounted so the print
  // preview looks like a printed publication regardless of the active
  // Ownology theme.
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
        <title>Induction Style Guide · Ownology</title>
        <meta
          name="description"
          content="How Ownology inducts new users and reveals product depth in earned layers. Publication brief, v1.0."
        />
      </Helmet>

      {/* Print-only CSS: page size, margins, hide non-doc chrome, force
          body background to white for ink economy, keep sections
          together, page-break the cover. */}
      <style>{`
        @page {
          size: A4;
          margin: 20mm 18mm 22mm 18mm;
        }
        @media print {
          body { background: #fff !important; }
          .no-print { display: none !important; }
          .doc { max-width: none !important; box-shadow: none !important; background: #fff !important; padding: 0 !important; }
          .cover { page-break-after: always; }
          .section { page-break-inside: avoid; }
          h1, h2, h3 { page-break-after: avoid; }
          a { color: ${INK} !important; text-decoration: none !important; }
          .footer-print { display: block !important; }
        }
        .footer-print { display: none; }
        .doc a { color: ${AMBER}; text-decoration: none; border-bottom: 1px dotted ${AMBER}; }
        .doc h2 { scroll-margin-top: 2rem; }
      `}</style>

      {/* Top toolbar — hidden on print */}
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
          data-testid="style-guide-back"
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
        <div
          style={{
            fontFamily: SANS,
            fontSize: "0.7rem",
            letterSpacing: "0.14em",
            textTransform: "uppercase",
            color: INK_LOW,
          }}
        >
          Publication brief · v1.0 · Feb 2026
        </div>
        <button
          onClick={() => window.print()}
          data-testid="style-guide-print"
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

      {/* The publication */}
      <article
        className="doc"
        data-testid="induction-style-guide"
        style={{
          maxWidth: "780px",
          margin: "0 auto",
          padding: "3rem 3rem 5rem",
          background: "#fff",
          color: INK,
          fontFamily: SERIF,
          lineHeight: 1.55,
          boxShadow: "0 20px 60px -30px rgba(0,0,0,0.25)",
          fontSize: "1.02rem",
        }}
      >
        {/* ─── Cover ─────────────────────────────────────────────── */}
        <header
          className="cover"
          style={{
            paddingBottom: "3rem",
            borderBottom: `1px solid ${AMBER}`,
            marginBottom: "3rem",
          }}
        >
          <div
            style={{
              fontFamily: SANS,
              fontSize: "0.7rem",
              letterSpacing: "0.2em",
              textTransform: "uppercase",
              color: AMBER,
              fontWeight: 700,
              marginBottom: "1.5rem",
            }}
          >
            Ownology · Publication brief · v1.0
          </div>
          <h1
            style={{
              margin: 0,
              fontFamily: SERIF,
              fontSize: "clamp(2rem, 5.5vw, 3.4rem)",
              lineHeight: 1.05,
              fontWeight: 600,
              letterSpacing: "-0.02em",
              color: INK,
            }}
          >
            The Ownology
            <br />
            Induction Style Guide
          </h1>
          <p
            style={{
              margin: "1.5rem 0 0 0",
              fontFamily: SERIF,
              fontStyle: "italic",
              fontSize: "1.15rem",
              color: INK_MID,
              maxWidth: "48ch",
              lineHeight: 1.45,
            }}
          >
            How new users are inducted, how detail is revealed, and why we
            hold back the good stuff on purpose.
          </p>
          <dl
            style={{
              margin: "3rem 0 0 0",
              display: "grid",
              gridTemplateColumns: "8rem 1fr",
              rowGap: "0.5rem",
              columnGap: "1.5rem",
              fontFamily: SANS,
              fontSize: "0.82rem",
              color: INK_MID,
            }}
          >
            <dt style={dtStyle}>Audience</dt>
            <dd style={ddStyle}>Prospective winemakers · founding partners · internal comms</dd>
            <dt style={dtStyle}>Version</dt>
            <dd style={ddStyle}>1.0</dd>
            <dt style={dtStyle}>Published</dt>
            <dd style={ddStyle}>February 2026</dd>
            <dt style={dtStyle}>Owner</dt>
            <dd style={ddStyle}>Rich Middlebrook · Ownology</dd>
          </dl>
        </header>

        {/* ─── Contents ─────────────────────────────────────────── */}
        <nav
          className="section"
          style={{
            marginBottom: "3rem",
            padding: "1.5rem 1.75rem",
            background: CREAM,
            borderRadius: "0.5rem",
            border: `1px solid ${CREAM_DEEP}`,
          }}
        >
          <div style={overlineStyle}>Contents</div>
          <ol style={{ margin: 0, paddingLeft: "1.25rem", fontFamily: SANS, fontSize: "0.9rem", color: INK_MID, lineHeight: 1.9 }}>
            <li>The problem we&apos;re solving</li>
            <li>The principle: <em>earn the depth</em></li>
            <li>The four induction surfaces</li>
            <li>The seven gates</li>
            <li>The Press reveal law</li>
            <li>Where the user finds their roadmap</li>
            <li>What we deliberately do <strong>not</strong> do</li>
            <li>What &ldquo;success&rdquo; looks like</li>
            <li>Roadmap for the roadmap</li>
          </ol>
        </nav>

        {/* ─── 1 ────────────────────────────────────────────────── */}
        <Section n="1" title="The problem we're solving">
          <p style={p}>
            Boutique winemaking software has two failure modes.
          </p>
          <p style={p}>
            <strong>Failure mode A &mdash; the empty dashboard.</strong> The user
            signs up, lands on a screen full of feature tiles with no data,
            and bounces within ninety seconds. They cannot tell what the
            product <em>is</em> because there is nothing in it yet.
          </p>
          <p style={p}>
            <strong>Failure mode B &mdash; the overwhelming brochure.</strong> The
            product shows the user everything it <em>could</em> do, including
            deep post-vintage analysis, compliance exports, and multi-year
            trend graphs. The user is a small-batch producer who hasn&apos;t
            crushed yet. They feel outclassed, close the tab, and don&apos;t
            return.
          </p>
          <p style={p}>
            Ownology has to solve both without picking one. The Induction
            Style Guide is how.
          </p>
        </Section>

        {/* ─── 2 ────────────────────────────────────────────────── */}
        <Section n="2" title="The principle: earn the depth">
          <Pullquote>
            We must be careful not to go too deep into The Press too soon.
            We can reveal press architecture but we don&apos;t reveal detail
            until detail has been entered or calculated by the app.
            <cite>— Rich, February 2026</cite>
          </Pullquote>
          <p style={p}>That sentence is the whole philosophy. It becomes three rules:</p>
          <ol style={ol}>
            <li>
              <strong>Never show a stock photo of the user&apos;s own future.</strong>{" "}
              A ferment analysis panel populated with fake numbers is worse
              than no panel at all &mdash; it teaches the user to distrust
              the numbers when they&apos;re finally real.
            </li>
            <li>
              <strong>Always show the shape of the mountain.</strong> The user
              must be able to see <em>that</em> there is a summit called The
              Press. They just can&apos;t visit it yet.
            </li>
            <li>
              <strong>Unlock is earned by real work, not by clicks.</strong> No
              &ldquo;acknowledge tutorial&rdquo; buttons. The gate opens when
              the user has done the work that makes the next layer honest.
            </li>
          </ol>
          <p style={p}>
            Everything in the induction system flows from those three rules.
          </p>
        </Section>

        {/* ─── 3 ────────────────────────────────────────────────── */}
        <Section n="3" title="The four induction surfaces">
          <p style={p}>
            There is no single onboarding page. There are four surfaces,
            each doing one job.
          </p>

          <SubHead>3.1 The gate wall &mdash; <em>credibility filter</em></SubHead>
          <p style={p}>
            A single password (<code style={code}>middx99</code> today,
            member-issued tokens tomorrow) stands between the public
            marketing pages and the working app. Its job is not security.
            Its job is <strong>intent filtering</strong>. A prospective
            winemaker who wants to see inside must pause, ask, and be handed
            a key. That pause is the first micro-commitment.
          </p>

          <SubHead>3.2 <code style={code}>/guide</code> &mdash; <em>the map of the pillars</em></SubHead>
          <p style={p}>
            Once inside, <code style={code}>/guide</code> explains the four
            pillars of Ownology (Journal &middot; Copilot &middot; Cellar
            Brief &middot; Compliance) in plain English. It is a{" "}
            <strong>conceptual introduction</strong>. No data required. No
            CTA overload. A five-dot progress meter at the top shows the
            operator which pillars they have touched. This is where a new
            user comes to understand <em>what the product does</em>.
          </p>

          <SubHead>3.3 <code style={code}>/your-vintage</code> &mdash; <em>the journey</em></SubHead>
          <p style={p}>
            The new page. Seven gates from first tank to first bottling.
            Each gate is either unlocked (with your live count against it)
            or locked (with a one-line CTA to the exact action that unlocks
            it). This is where a new user comes to understand <em>where
            they are and what comes next</em>. It is the induction spine.
          </p>

          <SubHead>3.4 The floating admin pill &mdash; <em>the return path</em></SubHead>
          <p style={p}>
            When an admin previews any invite link, a small &ldquo;&larr;
            Back to Admin&rdquo; pill appears bottom-left. It is invisible
            chrome to members. It is a lifeline to owners testing the
            induction they built. This is the piece of the system that lets
            the operator stay inside the induction loop instead of getting
            stranded in it.
          </p>

          <SubHead>3.5 Two lenses on the roadmap &mdash; <em>novice by default, expert on request</em></SubHead>
          <p style={p}>
            Progressive disclosure is a novice tactic. A wine writer, a
            purchasing manager, or a consulting winemaker evaluating
            Ownology for a client is not a novice &mdash; they are a{" "}
            <strong>skimmer</strong>. Making them &ldquo;earn&rdquo; every
            card would be an insult to their time.
          </p>
          <p style={p}>
            The Roadmap therefore ships with two lenses.
          </p>
          <ul style={ol}>
            <li>
              <strong>Novice lens (default).</strong> Locked cards show a
              one-line &ldquo;Unlocks &rarr;&rdquo; summary and the CTA to
              the next action. Full descriptions hidden until earned.
            </li>
            <li>
              <strong>Expert lens &mdash; Skim mode.</strong> A single
              toggle at the top of <code style={code}>/your-vintage</code>{" "}
              reveals every gate&apos;s full description paragraph
              regardless of whether it is unlocked. The <em>reading</em>{" "}
              is expanded. The <em>doing</em> is not. The feature stays
              gated; the story does not.
            </li>
          </ul>
          <p style={p}>
            Skim mode is client-side, opt-in, sticky. It is not a bypass.
            It is a <strong>respect signal</strong> &mdash; Ownology
            telling professionals that they can inspect the ceiling before
            deciding whether to climb.
          </p>

          <SubHead>3.6 The wine-professional bypass &mdash; <em>earned depth, requested depth</em></SubHead>
          <p style={p}>
            A wine writer with a review deadline cannot log a racking
            event to unlock The Press debrief. A judge cannot invent a
            batch. A consulting winemaker evaluating Ownology on behalf of
            eight clients cannot run a demo vintage.
          </p>
          <p style={p}>The Roadmap therefore carries a small form on the locked Press card:</p>
          <Pullquote>
            I&apos;m a wine professional &mdash; request preview access
          </Pullquote>
          <p style={p}>
            Three fields: role, publication or winery, and an optional
            note. On submit, Ownology writes a{" "}
            <code style={code}>press_bypass_request</code> event to the
            activity log. When Rich (or a future operator role) grants it,
            a matching <code style={code}>press_bypass_granted</code>{" "}
            event unlocks The Press card for that user regardless of gate
            state, with a <strong>&ldquo;Preview access&rdquo;</strong>{" "}
            ribbon and copy that clearly says <em>this is a curated
            sample, not your own vintage</em>.
          </p>
          <p style={p}>
            The bypass is not automatic. It is a <strong>light-friction
            human handshake</strong> &mdash; the operator confirms the
            requester is who they say they are, and grants access. This
            turns a locked door into a warm introduction, which is worth
            more than either extreme (fully locked or fully open) would be.
          </p>
        </Section>

        {/* ─── 4 ────────────────────────────────────────────────── */}
        <Section n="4" title="The seven gates">
          <p style={p}>
            The full progression, in order. Each row of this table maps to
            a card on <code style={code}>/your-vintage</code>.
          </p>
          <div style={{ overflowX: "auto", marginTop: "1.25rem" }}>
            <table
              style={{
                width: "100%",
                borderCollapse: "collapse",
                fontFamily: SANS,
                fontSize: "0.82rem",
                lineHeight: 1.5,
              }}
            >
              <thead>
                <tr style={{ background: CREAM_DEEP }}>
                  <th style={th}>#</th>
                  <th style={th}>Gate</th>
                  <th style={th}>Trigger (from live data)</th>
                  <th style={th}>What unlocks next</th>
                </tr>
              </thead>
              <tbody>
                {GATES.map((g) => (
                  <tr key={g.n}>
                    <td style={{ ...td, fontFamily: SERIF, fontWeight: 600, color: AMBER }}>{g.n}</td>
                    <td style={{ ...td, fontWeight: 600 }}>{g.gate}</td>
                    <td style={td}>{g.trigger}</td>
                    <td style={td}>{g.unlocks}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>

          <p style={{ ...p, marginTop: "1.5rem" }}>
            <strong>How the gate state is computed.</strong> A single server
            procedure &mdash;{" "}
            <code style={code}>trpc.onboarding.roadmapStatus</code> &mdash;
            reads the operator&apos;s real{" "}
            <code style={code}>vintage_log_entries</code> and{" "}
            <code style={code}>wine_batches</code> rows and returns seven
            booleans plus counts. There is no separate &ldquo;onboarding
            completion&rdquo; table. The user&apos;s actual work <em>is</em>{" "}
            the completion signal. This means the gate state is always
            honest, cannot be gamed by dismissing prompts, and cannot drift
            from reality.
          </p>
        </Section>

        {/* ─── 5 ────────────────────────────────────────────────── */}
        <Section n="5" title="The Press reveal law">
          <p style={p}>
            The Press is Ownology&apos;s post-vintage debrief. It is the most
            emotionally valuable surface in the product &mdash; the moment
            the operator sees their own vintage narrated back to them with
            data. Because it is the payoff, it is also the most tempting
            thing to show too early. The reveal law prevents that.
          </p>
          <RevealRow when="Before Gate 3">
            The Press is not mentioned. No card. No tile. No hint.
          </RevealRow>
          <RevealRow when="At Gate 3 (batch registered)">
            The Press appears on <code style={code}>/your-vintage</code> as an{" "}
            <strong>architecture card</strong>: what it is, what it will do,
            what it will contain. No sample data. No mock numbers. The card
            explicitly says <em>&ldquo;we deliberately keep the detail
            locked until you&apos;ve racked a batch &mdash; a debrief
            without your own data would be a stock photo.&rdquo;</em>
          </RevealRow>
          <RevealRow when="At Gate 6 (racking logged)">
            The Press unlocks in full. The architecture card flips to solid
            amber. The &ldquo;Open The Press&rdquo; CTA becomes live. The
            operator can now read their own post-ferment story, cited back
            to their own timeline.
          </RevealRow>
          <RevealRow when="At Gate 7 (bottling)">
            The Press adds vintage-year archive and compliance PDF export.
          </RevealRow>
          <p style={{ ...p, marginTop: "1.5rem" }}>
            The reveal law is not a marketing tactic. It is a{" "}
            <strong>product ethics</strong> decision. It is how we tell the
            operator, without saying it, that Ownology only speaks when it
            has something true to say.
          </p>
        </Section>

        {/* ─── 6 ────────────────────────────────────────────────── */}
        <Section n="6" title="Where the user finds their roadmap">
          <p style={p}>Three entry points, sequenced by user intent.</p>
          <p style={p}>
            <strong>Primary &mdash; from <code style={code}>/guide</code>.</strong>{" "}
            Below the intro paragraph is an amber pill:{" "}
            <em>&rarr; SEE YOUR ROADMAP</em>. A member coming to understand
            the product finds it in the natural reading order of the page.
            This is the ninety-percent path.
          </p>
          <p style={p}>
            <strong>Secondary &mdash; from <code style={code}>/admin</code> &rarr; Guide &rarr; Roadmap.</strong>{" "}
            For owners previewing member experience. Not surfaced to members.
          </p>
          <p style={p}>
            <strong>Direct.</strong> Anyone with the gate cookie can visit{" "}
            <code style={code}>/your-vintage</code>. Bookmarkable. Sharable to a
            co-founder or advisor.
          </p>
          <p style={p}>
            No first-run modal. No forced tour. The Roadmap is available on
            demand, and referenced whenever the user&apos;s next step
            matters. This is deliberate &mdash; Ownology treats operators
            as adults.
          </p>
        </Section>

        {/* ─── 7 ────────────────────────────────────────────────── */}
        <Section n="7" title="What we deliberately do not do">
          <p style={p}>
            The absence of these patterns is as much the style guide as the
            presence of the others.
          </p>
          <ul style={ol}>
            <li>
              <strong>No &ldquo;acknowledge to continue&rdquo; tutorial overlays.</strong>{" "}
              The operator&apos;s time is their capital. We do not tax it.
            </li>
            <li>
              <strong>No fake data on any surface an authenticated user can reach.</strong>{" "}
              Cellar Journal public posts are curated case studies; every
              other data-bearing surface reflects reality.
            </li>
            <li>
              <strong>No progress badges, no gamified rewards, no streaks.</strong>{" "}
              This is a professional tool. The reward for logging a racking
              is a better ferment analysis, not confetti.
            </li>
            <li>
              <strong>No forced first-run wizard.</strong> The Roadmap is a
              reference, not a rail.
            </li>
            <li>
              <strong>No dark patterns to inflate gate completion.</strong>{" "}
              The seven gates measure <em>winemaking activity</em>, not{" "}
              <em>app engagement</em>. We would rather have a Gate-2 member
              for six months than trick them into faking Gate-4.
            </li>
          </ul>
        </Section>

        {/* ─── 8 ────────────────────────────────────────────────── */}
        <Section n="8" title="What &ldquo;success&rdquo; looks like">
          <p style={p}>
            Induction succeeds when three things are true at ninety days.
          </p>
          <ol style={ol}>
            <li>
              <strong>The operator has crossed Gate 4</strong> &mdash; first
              measurement. This is the point at which Ownology starts
              giving back more than it takes.
            </li>
            <li>
              <strong>The operator has opened The Press at least once</strong>,
              either as an architecture card (post-Gate-3) or as a debrief
              (post-Gate-6). This tells us the reveal law is working &mdash;
              the operator is curious about the summit but not misled about
              the trail.
            </li>
            <li>
              <strong>The operator has invited at least one collaborator</strong>{" "}
              &mdash; a co-founder, a consulting winemaker, a compliance
              advisor. Ownology becomes structurally valuable when it holds
              shared context.
            </li>
          </ol>
          <p style={p}>
            If those three are true, the operator will still be here at
            three hundred and sixty days. Everything in the induction
            system is built to make those three true.
          </p>
        </Section>

        {/* ─── 9 ────────────────────────────────────────────────── */}
        <Section n="9" title="Roadmap for the roadmap">
          <p style={p}>
            Three things this document does not yet cover, because they
            are next.
          </p>
          <ul style={ol}>
            <li>
              <strong>In-page gating of <code style={code}>/the-press</code> itself.</strong>{" "}
              The Roadmap correctly hides the entry point pre-Gate-6, but a
              deep-linked visit to <code style={code}>/the-press</code> today
              still renders the demo batch. Next release will wire the page
              to <code style={code}>roadmapStatus</code> and render either
              the locked placeholder or the operator&apos;s own real batch.
              No middle ground.
            </li>
            <li>
              <strong>First-invite redirect to <code style={code}>/your-vintage</code>.</strong>{" "}
              Today, a first-time gate-verify lands on{" "}
              <code style={code}>/admin</code> or{" "}
              <code style={code}>/guide</code>. Next release will route
              first-use invite tokens straight to{" "}
              <code style={code}>/your-vintage</code> so the induction spine is
              the operator&apos;s <em>first</em> Ownology surface, not
              their third.
            </li>
            <li>
              <strong>Public roadmap preview.</strong> A{" "}
              <code style={code}>/roadmap-preview</code> variant with
              sample data, mounted under the marketing gate, so prospects
              can see the shape of the journey before they take it.
              Doubles as an SEO surface for terms like{" "}
              <em>&ldquo;winemaking software workflow&rdquo;</em> and{" "}
              <em>&ldquo;cellar journal onboarding.&rdquo;</em>
            </li>
          </ul>
        </Section>

        {/* ─── Colophon ─────────────────────────────────────────── */}
        <footer
          className="section"
          style={{
            marginTop: "4rem",
            paddingTop: "2rem",
            borderTop: `1px solid ${CREAM_DEEP}`,
            fontFamily: SANS,
            fontSize: "0.78rem",
            color: INK_LOW,
            lineHeight: 1.7,
          }}
        >
          <div style={{ ...overlineStyle, marginBottom: "0.75rem" }}>Colophon</div>
          <p style={{ margin: "0 0 0.75rem 0" }}>
            This guide is version 1.0, published February 2026 by Rich
            Middlebrook for Ownology. It documents the induction system as
            shipped in the Roadmap release
            (<code style={code}>/your-vintage</code> ·{" "}
            <code style={code}>roadmapStatus</code> procedure ·
            Back-to-Admin pill · Guide Roadmap CTA).
          </p>
          <p style={{ margin: "0 0 0.75rem 0" }}>
            Source of truth:{" "}
            <code style={code}>/app/memory/INDUCTION_STYLE_GUIDE.md</code>.
            Printable in-app version:{" "}
            <code style={code}>/admin/style-guide/induction</code>.
          </p>
          <p style={{ margin: "0 0 1.5rem 0" }}>
            Ownology is a cellar intelligence platform for boutique
            winemakers. Founded 2025 · Adelaide, South Australia ·{" "}
            <a href="https://ownology.ai">ownology.ai</a>
          </p>
          <p
            style={{
              margin: 0,
              fontFamily: SERIF,
              fontStyle: "italic",
              color: AMBER,
              fontSize: "0.9rem",
            }}
          >
            The map is not the territory. The roadmap is not the vintage.
          </p>
        </footer>
      </article>
    </>
  );
}

// ── inline style helpers ───────────────────────────────────────────
const p: React.CSSProperties = {
  margin: "0 0 1.1rem 0",
  fontFamily: SERIF,
  fontSize: "1.02rem",
  color: INK_MID,
  lineHeight: 1.65,
};
const ol: React.CSSProperties = {
  fontFamily: SERIF,
  color: INK_MID,
  paddingLeft: "1.25rem",
  lineHeight: 1.65,
  margin: "0 0 1.25rem 0",
};
const dtStyle: React.CSSProperties = {
  fontWeight: 700,
  textTransform: "uppercase",
  letterSpacing: "0.08em",
  fontSize: "0.68rem",
  color: INK_LOW,
};
const ddStyle: React.CSSProperties = {
  margin: 0,
  color: INK,
  fontFamily: SANS,
};
const overlineStyle: React.CSSProperties = {
  fontFamily: SANS,
  fontSize: "0.65rem",
  letterSpacing: "0.2em",
  textTransform: "uppercase",
  color: AMBER,
  fontWeight: 700,
  marginBottom: "0.75rem",
};
const th: React.CSSProperties = {
  padding: "0.6rem 0.7rem",
  textAlign: "left",
  fontWeight: 700,
  color: INK,
  borderBottom: `1px solid ${AMBER}`,
  fontSize: "0.72rem",
  textTransform: "uppercase",
  letterSpacing: "0.06em",
};
const td: React.CSSProperties = {
  padding: "0.7rem 0.7rem",
  color: INK_MID,
  borderBottom: "1px solid rgba(0,0,0,0.06)",
  verticalAlign: "top",
};
const code: React.CSSProperties = {
  fontFamily: "'JetBrains Mono', 'Menlo', monospace",
  fontSize: "0.86em",
  background: CREAM,
  padding: "0.05em 0.35em",
  borderRadius: "0.2em",
  color: INK,
};

function Section({ n, title, children }: { n: string; title: string; children: React.ReactNode }) {
  return (
    <section
      className="section"
      style={{ marginBottom: "3rem" }}
      data-testid={`section-${n}`}
    >
      <div style={overlineStyle}>Section {n}</div>
      <h2
        style={{
          margin: "0 0 1.25rem 0",
          fontFamily: SERIF,
          fontSize: "1.7rem",
          fontWeight: 600,
          letterSpacing: "-0.01em",
          color: INK,
          lineHeight: 1.15,
        }}
      >
        {title}
      </h2>
      {children}
    </section>
  );
}

function SubHead({ children }: { children: React.ReactNode }) {
  return (
    <h3
      style={{
        margin: "1.5rem 0 0.5rem 0",
        fontFamily: SERIF,
        fontSize: "1.1rem",
        fontWeight: 600,
        color: INK,
      }}
    >
      {children}
    </h3>
  );
}

function Pullquote({ children }: { children: React.ReactNode }) {
  return (
    <blockquote
      style={{
        margin: "1.5rem 0",
        padding: "1.25rem 1.5rem",
        borderLeft: `3px solid ${AMBER}`,
        background: CREAM,
        fontFamily: SERIF,
        fontStyle: "italic",
        fontSize: "1.08rem",
        color: INK,
        lineHeight: 1.5,
        borderRadius: "0 0.4rem 0.4rem 0",
      }}
    >
      &ldquo;{children}&rdquo;
    </blockquote>
  );
}

function RevealRow({ when, children }: { when: string; children: React.ReactNode }) {
  return (
    <div
      style={{
        display: "grid",
        gridTemplateColumns: "10rem 1fr",
        gap: "1.25rem",
        padding: "0.9rem 0",
        borderBottom: "1px dashed rgba(0,0,0,0.1)",
      }}
    >
      <div
        style={{
          fontFamily: SANS,
          fontSize: "0.72rem",
          fontWeight: 700,
          textTransform: "uppercase",
          letterSpacing: "0.08em",
          color: AMBER,
          paddingTop: "0.15rem",
        }}
      >
        {when}
      </div>
      <div style={{ fontFamily: SERIF, color: INK_MID, lineHeight: 1.6 }}>{children}</div>
    </div>
  );
}

// ── data ───────────────────────────────────────────────────────────
const GATES = [
  { n: 1, gate: "Register", trigger: "Account exists", unlocks: "Cellar Brief · Ask Owen · this Roadmap page itself" },
  { n: 2, gate: "Register a tank", trigger: "Any tank name in the vintage log", unlocks: "Tank-tag autofill · vessel-scoped brief cards" },
  { n: 3, gate: "Register a batch", trigger: "≥1 row in wine_batches (variety + tank + vintage)", unlocks: "The Press architecture card · per-batch brief cards · SOP suggestions" },
  { n: 4, gate: "First measurement", trigger: "≥1 measurement event (Brix / pH / temp)", unlocks: "Alerts engine · trend lines" },
  { n: 5, gate: "Ferment in progress", trigger: "Any inoculation event, or ≥3 measurements on one vessel", unlocks: "Live-ferment card · MLF prompts · tasting flywheel" },
  { n: 6, gate: "Post-ferment (racking)", trigger: "≥1 racking event", unlocks: "The Press full debrief · vintage comparison" },
  { n: 7, gate: "Bottling", trigger: "≥1 bottling run", unlocks: "Vintage archive · compliance PDF · Insta Copilot" },
];
