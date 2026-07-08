/**
 * /apco — Public marketing wedge landing page.
 *
 * The APCO Action Plan is a real, dated, escalating burden for every AU
 * winery selling through Dan's, Coles, Endeavour, etc. This page:
 *   1. Names the pain in language a winemaker recognises
 *   2. Anchors the consultant-fee alternative ($5-15K/year)
 *   3. Positions The Vigneron as the AI assistant that does 80% of the work
 *   4. Captures "APCO wine template" style long-tail SEO traffic
 *
 * Ships as marketing before the product MVP ships — the wedge unlocks cold
 * calls; the feature earns retention once we have paying Vignerons.
 */
import { Link } from "wouter";

const SEVEN_CRITERIA = [
  { n: "01", title: "Governance & Strategy", note: "Executive-approved sustainability policy, goals, targets — communicated internally and externally." },
  { n: "02", title: "Design & Procurement", note: "Every SKU reviewed against the Sustainable Packaging Guidelines (SPGs) — 10 principles, from Design for Recovery to Consumer Information." },
  { n: "03", title: "Recycled Content", note: "Policy + numeric target for recycled content across bottle, closure, capsule, label, cartons, pallet wrap." },
  { n: "04", title: "Recoverability", note: "Recyclability investigated at end-of-life. Gaps identified. Closed-loop recovery considered." },
  { n: "05", title: "Disposal Labelling", note: "Australasian Recycling Label (ARL) applied as packaging is refreshed. Wine bottles use the Combined-Micro ARL variant." },
  { n: "06", title: "On-site Waste", note: "Winery waste diversion rate — paper, glass, plastic, filtered lees." },
  { n: "07", title: "Problematic Materials", note: "Single-use plastic phase-out. Litter-prone components redesigned. PVC capsules and unnecessary shrink-wrap called out." },
];

const PAINS = [
  { icon: "clock", title: "31 March 2026", body: "APCO Annual Report deadline — for the reporting period ending 30 June 2025. Miss it, and you're referred to the state EPA under the National Environment Protection Measure." },
  { icon: "warning", title: "31 May 2026", body: "APCO Action Plan deadline — built off the Annual Report. Grades you across seven criteria: Governance, Design, Recycled Content, Recoverability, Labelling, Waste, Problematic Materials." },
  { icon: "shelves", title: "Retailer pressure", body: "Dan Murphy's, Vintage Cellars, Coles Liquor, ALM, Endeavour Group increasingly require APCO membership as a supplier condition. No filing, no shelf space." },
  { icon: "wallet", title: "$5,000–$15,000/year", body: "Consultants charge that range for boutique wineries. Data collection, report writing, supplier chase — every year, forever." },
];

export default function Apco() {
  return (
    <div style={{ minHeight: "100vh", background: "var(--ow-bg)", color: "var(--ow-text-hi)" }}>
      {/* ── Hero ──────────────────────────────────────────────────────── */}
      <section
        style={{
          padding: "clamp(3rem, 8vw, 6rem) 1.25rem 3rem",
          maxWidth: 960,
          margin: "0 auto",
        }}
      >
        <p
          data-testid="apco-eyebrow"
          className="text-xs uppercase tracking-widest"
          style={{ color: "var(--ow-amber)", fontFamily: "'Lato',sans-serif", marginBottom: "1rem" }}
        >
          Ownology · Compliance AI · APCO
        </p>
        <h1
          style={{
            fontFamily: "'Fraunces',serif",
            fontSize: "clamp(2.25rem, 6vw, 3.75rem)",
            lineHeight: 1.05,
            margin: 0,
            letterSpacing: "-0.01em",
          }}
        >
          APCO's due on <em style={{ color: "var(--ow-amber)", fontStyle: "italic" }}>31&nbsp;March</em>.
          <br />
          Not consultants&nbsp;— <span style={{ color: "var(--ow-amber)" }}>the assistant that files it for you</span>.
        </h1>
        <p
          className="max-w-2xl"
          style={{
            fontFamily: "'Lato',sans-serif",
            fontSize: "clamp(1rem, 1.5vw, 1.15rem)",
            lineHeight: 1.7,
            color: "var(--ow-text-mid)",
            marginTop: "1.5rem",
          }}
        >
          The Australian Packaging Covenant grades every branded wine producer against
          seven sustainability criteria — Governance, Design, Recycled Content,
          Recoverability, Labelling, Waste, Problematic Materials. Miss the March
          deadline and you're referred to the EPA. Miss the shelf audit and Dan's,
          Coles, Endeavour quietly stop calling.
        </p>
        <p
          className="max-w-2xl"
          style={{
            fontFamily: "'Lato',serif",
            fontStyle: "italic",
            fontSize: "1rem",
            lineHeight: 1.7,
            color: "var(--ow-text-lo)",
            marginTop: "1rem",
          }}
        >
          Ownology's APCO Assistant drafts your Annual Report and Action Plan from
          your bottle, closure, label, and carton data — in the format APCO expects.
          One-time setup. Repeats every year, forever. Included with The Vigneron.
        </p>
        <div className="flex flex-wrap gap-3 mt-8" data-testid="apco-cta-row">
          <Link
            href="/pricing"
            data-testid="apco-cta-pricing"
            style={{
              padding: "0.75rem 1.5rem",
              background: "var(--ow-amber)",
              color: "oklch(0.10 0.008 60)",
              borderRadius: 4,
              fontFamily: "'Lato',sans-serif",
              fontWeight: 700,
              fontSize: "0.95rem",
              textDecoration: "none",
              letterSpacing: "0.02em",
            }}
          >
            See The Vigneron pricing →
          </Link>
          <Link
            href="/join"
            data-testid="apco-cta-join"
            style={{
              padding: "0.75rem 1.5rem",
              background: "transparent",
              color: "var(--ow-text-hi)",
              border: "1px solid var(--ow-border)",
              borderRadius: 4,
              fontFamily: "'Lato',sans-serif",
              fontWeight: 500,
              fontSize: "0.95rem",
              textDecoration: "none",
              letterSpacing: "0.02em",
            }}
          >
            Talk to Rich
          </Link>
        </div>
      </section>

      {/* ── Deadline / pain grid ──────────────────────────────────────── */}
      <section
        style={{
          background: "color-mix(in oklch, var(--ow-amber) 5%, transparent)",
          borderTop: "1px solid var(--ow-border)",
          borderBottom: "1px solid var(--ow-border)",
          padding: "3rem 1.25rem",
        }}
      >
        <div style={{ maxWidth: 960, margin: "0 auto" }}>
          <p className="text-xs uppercase tracking-widest" style={{ color: "var(--ow-amber)", fontFamily: "'Lato',sans-serif", marginBottom: "1.5rem" }}>
            Why every boutique winery is now scrambling
          </p>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-6">
            {PAINS.map((p) => (
              <div
                key={p.title}
                data-testid={`apco-pain-${p.icon}`}
                style={{
                  background: "var(--ow-bg-card)",
                  border: "1px solid var(--ow-border)",
                  borderRadius: 6,
                  padding: "1.25rem 1.35rem",
                  fontFamily: "'Lato',sans-serif",
                }}
              >
                <p style={{ fontFamily: "'Fraunces',serif", fontSize: "1.35rem", margin: 0, color: "var(--ow-text-hi)", lineHeight: 1.2 }}>
                  {p.title}
                </p>
                <p style={{ fontSize: "0.9rem", color: "var(--ow-text-mid)", lineHeight: 1.65, marginTop: "0.5rem", marginBottom: 0 }}>
                  {p.body}
                </p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* ── 7 Criteria breakdown ──────────────────────────────────────── */}
      <section style={{ padding: "4rem 1.25rem", maxWidth: 960, margin: "0 auto" }}>
        <p className="text-xs uppercase tracking-widest" style={{ color: "var(--ow-amber)", fontFamily: "'Lato',sans-serif", marginBottom: "0.75rem" }}>
          What APCO actually asks for
        </p>
        <h2 style={{ fontFamily: "'Fraunces',serif", fontSize: "clamp(1.75rem, 4vw, 2.5rem)", margin: 0, lineHeight: 1.15 }}>
          Seven criteria. Every one of them, every year.
        </h2>
        <p
          style={{
            fontFamily: "'Lato',sans-serif",
            fontSize: "1rem",
            color: "var(--ow-text-lo)",
            marginTop: "1rem",
            marginBottom: "2.5rem",
            lineHeight: 1.7,
            maxWidth: 720,
          }}
        >
          Graded on five tiers &mdash; Getting Started → Good Progress → Advanced →
          Leading → Beyond Best Practice. Retailers ask what tier you're on.
          Ownology tells you where you sit and what closes the gap.
        </p>
        <div className="grid grid-cols-1 gap-3" data-testid="apco-criteria-grid">
          {SEVEN_CRITERIA.map((c) => (
            <div
              key={c.n}
              data-testid={`apco-criterion-${c.n}`}
              style={{
                background: "var(--ow-bg-card)",
                border: "1px solid var(--ow-border)",
                borderRadius: 6,
                padding: "1.1rem 1.35rem",
                display: "flex",
                gap: "1rem",
                alignItems: "flex-start",
              }}
            >
              <span
                style={{
                  fontFamily: "'Fira Code',monospace",
                  fontSize: "0.85rem",
                  color: "var(--ow-amber)",
                  fontWeight: 700,
                  minWidth: 26,
                }}
              >
                {c.n}
              </span>
              <div style={{ flex: 1 }}>
                <p style={{ fontFamily: "'Fraunces',serif", fontSize: "1.1rem", margin: 0, color: "var(--ow-text-hi)" }}>
                  {c.title}
                </p>
                <p style={{ fontFamily: "'Lato',sans-serif", fontSize: "0.88rem", color: "var(--ow-text-mid)", lineHeight: 1.6, marginTop: "0.35rem", marginBottom: 0 }}>
                  {c.note}
                </p>
              </div>
            </div>
          ))}
        </div>
      </section>

      {/* ── How Ownology handles it ──────────────────────────────────── */}
      <section
        style={{
          background: "var(--ow-bg-card)",
          borderTop: "1px solid var(--ow-border)",
          borderBottom: "1px solid var(--ow-border)",
          padding: "4rem 1.25rem",
        }}
      >
        <div style={{ maxWidth: 960, margin: "0 auto" }}>
          <p className="text-xs uppercase tracking-widest" style={{ color: "var(--ow-amber)", fontFamily: "'Lato',sans-serif", marginBottom: "0.75rem" }}>
            What we do for you
          </p>
          <h2 style={{ fontFamily: "'Fraunces',serif", fontSize: "clamp(1.75rem, 4vw, 2.25rem)", margin: 0, lineHeight: 1.15, marginBottom: "2rem" }}>
            Enter your packaging once. Ownology handles APCO forever.
          </h2>
          <ol className="grid grid-cols-1 sm:grid-cols-2 gap-x-8 gap-y-6" style={{ listStyle: "none", padding: 0, margin: 0 }}>
            {[
              {
                step: "STEP 01",
                title: "Packaging Data Vault",
                body: "Enter bottle, closure, capsule, label, cartons, and pallet wrap once per SKU. Versioned by vintage. Ownology remembers.",
              },
              {
                step: "STEP 02",
                title: "10 SPG Principle scoring",
                body: "Every SKU auto-scored against APCO's ten Sustainable Packaging Principles — Design for Recovery, Material Efficiency, Recycled Content, and the rest.",
              },
              {
                step: "STEP 03",
                title: "ARL classification",
                body: "Australasian Recycling Label logic baked in. Glass ✓ · Screw cap ✓ · Cork = contaminant · PVC capsule = contaminant. Correct disposal labels per component.",
              },
              {
                step: "STEP 04",
                title: "Report generator",
                body: "Claude drafts your Annual Report + Action Plan across all seven criteria — in APCO's exact PDF format. Submission-ready. Year-on-year deltas tracked.",
              },
              {
                step: "STEP 05",
                title: "Performance Coach",
                body: "Ownology tells you exactly which actions move you from Good Progress to Advanced next cycle. Compliance becomes a game with a scoreboard.",
              },
              {
                step: "STEP 06",
                title: "Deadline tracker",
                body: "31 March, 31 May, every year — Ownology reminds you at 30, 14, and 7 days out. Nothing slips.",
              },
            ].map((s) => (
              <li key={s.step}>
                <p className="text-xs uppercase tracking-widest" style={{ color: "var(--ow-amber)", fontFamily: "'Fira Code',monospace", marginBottom: "0.4rem" }}>
                  {s.step}
                </p>
                <p style={{ fontFamily: "'Fraunces',serif", fontSize: "1.15rem", color: "var(--ow-text-hi)", margin: 0, lineHeight: 1.3 }}>
                  {s.title}
                </p>
                <p style={{ fontFamily: "'Lato',sans-serif", fontSize: "0.9rem", color: "var(--ow-text-mid)", lineHeight: 1.65, marginTop: "0.4rem", marginBottom: 0 }}>
                  {s.body}
                </p>
              </li>
            ))}
          </ol>
        </div>
      </section>

      {/* ── Cost math ────────────────────────────────────────────────── */}
      <section style={{ padding: "4rem 1.25rem", maxWidth: 960, margin: "0 auto", textAlign: "center" }}>
        <p className="text-xs uppercase tracking-widest" style={{ color: "var(--ow-amber)", fontFamily: "'Lato',sans-serif", marginBottom: "0.75rem" }}>
          The math on Ownology vs a consultant
        </p>
        <div
          className="grid grid-cols-1 sm:grid-cols-2 gap-4"
          style={{ marginTop: "1.5rem" }}
        >
          <div
            style={{
              background: "var(--ow-bg-card)",
              border: "1px solid var(--ow-border)",
              borderRadius: 6,
              padding: "2rem 1.5rem",
              opacity: 0.7,
            }}
          >
            <p style={{ fontFamily: "'Fraunces',serif", fontSize: "1.4rem", color: "var(--ow-text-mid)", margin: 0, textDecoration: "line-through" }}>
              APCO Consultant
            </p>
            <p style={{ fontFamily: "'Fraunces',serif", fontSize: "clamp(2.25rem, 5vw, 3rem)", color: "var(--ow-text-hi)", margin: "0.5rem 0 0", lineHeight: 1 }}>
              $5,000–$15,000
            </p>
            <p style={{ fontFamily: "'Lato',sans-serif", fontSize: "0.85rem", color: "var(--ow-text-lo)", marginTop: "0.5rem" }}>
              Every year. Forever.
            </p>
          </div>
          <div
            style={{
              background: "color-mix(in oklch, var(--ow-amber) 12%, transparent)",
              border: "1.5px solid var(--ow-amber)",
              borderRadius: 6,
              padding: "2rem 1.5rem",
            }}
          >
            <p style={{ fontFamily: "'Fraunces',serif", fontSize: "1.4rem", color: "var(--ow-amber)", margin: 0 }}>
              The Vigneron
            </p>
            <p style={{ fontFamily: "'Fraunces',serif", fontSize: "clamp(2.25rem, 5vw, 3rem)", color: "var(--ow-text-hi)", margin: "0.5rem 0 0", lineHeight: 1 }}>
              $88/mo
            </p>
            <p style={{ fontFamily: "'Lato',sans-serif", fontSize: "0.85rem", color: "var(--ow-text-lo)", marginTop: "0.5rem" }}>
              Founding member price · locked for life · APCO Assistant included · plus everything else.
            </p>
          </div>
        </div>
      </section>

      {/* ── CTA ──────────────────────────────────────────────────────── */}
      <section
        style={{
          background: "var(--ow-bg-card)",
          borderTop: "1px solid var(--ow-border)",
          padding: "4rem 1.25rem 5rem",
          textAlign: "center",
        }}
      >
        <div style={{ maxWidth: 700, margin: "0 auto" }}>
          <h2 style={{ fontFamily: "'Fraunces',serif", fontSize: "clamp(1.75rem, 4vw, 2.5rem)", margin: 0, lineHeight: 1.15 }}>
            Skip the consultant. Ship the plan.
          </h2>
          <p style={{ fontFamily: "'Lato',sans-serif", fontSize: "1rem", color: "var(--ow-text-mid)", lineHeight: 1.7, marginTop: "1.25rem" }}>
            Ownology's founding-member cohort is 99 wineries. When you fill the
            Data Vault once, every APCO report from now until you stop making
            wine comes out of Ownology's export button — in the format APCO wants,
            with year-on-year progress baked in.
          </p>
          <div className="flex flex-wrap gap-3 justify-center mt-8">
            <Link
              href="/pricing"
              data-testid="apco-footer-cta-pricing"
              style={{
                padding: "0.85rem 1.75rem",
                background: "var(--ow-amber)",
                color: "oklch(0.10 0.008 60)",
                borderRadius: 4,
                fontFamily: "'Lato',sans-serif",
                fontWeight: 700,
                fontSize: "0.95rem",
                textDecoration: "none",
                letterSpacing: "0.02em",
              }}
            >
              Lock founding pricing →
            </Link>
            <Link
              href="/join"
              data-testid="apco-footer-cta-join"
              style={{
                padding: "0.85rem 1.75rem",
                background: "transparent",
                color: "var(--ow-text-hi)",
                border: "1px solid var(--ow-border)",
                borderRadius: 4,
                fontFamily: "'Lato',sans-serif",
                fontWeight: 500,
                fontSize: "0.95rem",
                textDecoration: "none",
              }}
            >
              15-min conversation with Rich
            </Link>
          </div>
        </div>
      </section>
    </div>
  );
}
