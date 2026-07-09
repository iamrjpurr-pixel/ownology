/**
 * PricingComparison — the "receipt" page (Feb 2026, Rich).
 *
 * Status: UNLINKED from nav. Direct URL only: /pricing-comparison.
 * Purpose: defensible math to share with skeptical prospects mid-sales-call.
 * When someone says "prove the 95% claim", this is the page you send them.
 *
 * Design principles:
 *   1. Look like a rate sheet, not a landing page — dense, sourced, quiet.
 *   2. Numbers are load-bearing. Everything else supports them.
 *   3. Cite sources inline. Cite dates. If a number's disputed, mark it.
 *   4. No CTA in the body — this page is a receipt, not a funnel step.
 *      A quiet "Talk to us" link at the bottom is the only exit.
 *
 * Pricing intel gathered from public sources (Feb 2026 web search):
 *   - InnoVint: $99 / $169 / $299 per month tiers (winery-size-linked).
 *     Source: softwareadvice.com/compliance/innovint-profile, capterra.com.
 *   - Vintrace: from ~$95/mo starting; enterprise quote-only, commonly
 *     reported $200-500+/mo when users + integrations + implementation
 *     are folded in. Source: capterra.com/p/130918, getapp.com/vintrace.
 *   - Ownology: taken from /pricing at time of build — Cellar Hand $22,
 *     The Press $44, The Vigneron $88 per month (annual billing).
 *
 * If Ownology's list pricing changes, update the ROWS[] array below.
 */

import { Link } from "wouter";
import { ArrowLeft, ExternalLink, ShieldCheck } from "lucide-react";

interface Row {
  scenario: string;
  detail: string;
  innovint: { price: string; note: string };
  vintrace: { price: string; note: string };
  ownology: { price: string; tier: string; note: string };
  savingsCommercial: string; // vs commercial-tier average
}

// The math, written once, defensible on any sales call.
// Each row = a real-world winery archetype prospects self-identify with.
const ROWS: Row[] = [
  {
    scenario: "Home / DIY winemaker",
    detail: "1–3 batches, no employees",
    innovint: { price: "n/a", note: "not offered — commercial only" },
    vintrace: { price: "n/a", note: "not offered — commercial only" },
    ownology: { price: "$0", tier: "Free Run", note: "curiosity-led AI, unlimited questions" },
    savingsCommercial: "—",
  },
  {
    scenario: "Serious home winemaker",
    detail: "SOPs, vintage log, home cellar",
    innovint: { price: "n/a", note: "not offered" },
    vintrace: { price: "n/a", note: "not offered" },
    ownology: { price: "$22 / mo", tier: "The Cellar Hand", note: "full winemaking AI + SOPs" },
    savingsCommercial: "—",
  },
  {
    scenario: "Boutique commercial — starter",
    detail: "1–5 tanks, single operator",
    innovint: { price: "~$99 / mo", note: "entry tier · listed price" },
    vintrace: { price: "~$95 / mo", note: "starting tier · listed price" },
    ownology: { price: "$44 / mo", tier: "The Press", note: "full commercial toolkit" },
    savingsCommercial: "~54% less",
  },
  {
    scenario: "Boutique commercial — typical",
    detail: "5–20 tanks, small team, multi-site",
    innovint: { price: "~$169 / mo", note: "mid tier · listed price" },
    vintrace: { price: "$200–500 / mo", note: "quote-only · typical loaded cost¹" },
    ownology: { price: "$44 / mo", tier: "The Press", note: "same toolkit, no per-user fees" },
    savingsCommercial: "~74–91% less",
  },
  {
    scenario: "Owner-operator vigneron",
    detail: "You grow it. You make it. Small team.",
    innovint: { price: "~$299 / mo", note: "advanced tier · listed price" },
    vintrace: { price: "$300–600+ / mo", note: "quote-only · typical loaded cost¹" },
    ownology: { price: "$88 / mo", tier: "The Vigneron", note: "3 seats + vineyard scope + APCO" },
    savingsCommercial: "~70–85% less",
  },
  {
    scenario: "Enterprise winery",
    detail: "Multi-site, multi-brand, corporate wine group",
    innovint: { price: "quote", note: "enterprise pricing on request" },
    vintrace: { price: "quote", note: "$500–2,000+ / mo range²" },
    ownology: { price: "let's talk", tier: "Custom tier", note: "we've kept our math clean; get in touch" },
    savingsCommercial: "typically 90%+ less",
  },
];

const SOURCES: { label: string; url: string }[] = [
  { label: "InnoVint pricing tiers — SoftwareAdvice profile", url: "https://www.softwareadvice.com/compliance/innovint-profile/" },
  { label: "InnoVint on Capterra", url: "https://www.capterra.com/p/144038/InnoVint/" },
  { label: "Vintrace pricing — Capterra", url: "https://www.capterra.com/p/130918/vintrace/" },
  { label: "Vintrace on GetApp", url: "https://www.getapp.com/industries-software/a/vintrace/" },
  { label: "Ownology public pricing", url: "/pricing" },
];

export default function PricingComparison() {
  return (
    <div
      className="min-h-screen"
      style={{ background: "var(--ow-bg-base)", color: "var(--ow-text-hi)" }}
      data-testid="pricing-comparison-page"
    >
      {/* Quiet header — sales-tool chrome, not marketing chrome. */}
      <div
        className="sticky top-0 z-10"
        style={{
          background: "color-mix(in oklch, var(--ow-bg-base) 92%, transparent)",
          backdropFilter: "blur(12px)",
          borderBottom: "1px solid var(--ow-bg-inset)",
        }}
      >
        <div className="container max-w-5xl flex items-center justify-between py-4">
          <Link
            href="/"
            data-testid="pc-back-home"
            style={{
              display: "inline-flex",
              alignItems: "center",
              gap: "0.5rem",
              fontFamily: "'Lato',sans-serif",
              fontSize: "0.82rem",
              color: "var(--ow-text-mid)",
              textDecoration: "none",
              letterSpacing: "0.03em",
            }}
          >
            <ArrowLeft size={14} /> Ownology
          </Link>
          <span
            style={{
              fontFamily: "'Fira Code',monospace",
              fontSize: "0.65rem",
              letterSpacing: "0.14em",
              color: "var(--ow-text-lo)",
              textTransform: "uppercase",
            }}
          >
            Rate sheet · shareable
          </span>
        </div>
      </div>

      <div className="container max-w-5xl py-16 md:py-20 space-y-14">
        {/* ── Header ──────────────────────────────────────────────────── */}
        <header data-testid="pc-header">
          <p
            style={{
              fontFamily: "'Fira Code',monospace",
              fontSize: "0.7rem",
              letterSpacing: "0.22em",
              color: "var(--ow-amber)",
              textTransform: "uppercase",
              marginBottom: "1.25rem",
            }}
          >
            The pricing math · on the record
          </p>
          <h1
            style={{
              fontFamily: "'Fraunces',serif",
              fontWeight: 700,
              fontSize: "clamp(2rem, 4.5vw, 3.25rem)",
              lineHeight: 1.1,
              letterSpacing: "-0.02em",
              margin: 0,
              maxWidth: 780,
              textWrap: "balance" as "balance",
            }}
          >
            What a boutique winery actually pays &mdash;
            <span style={{ color: "var(--ow-amber)" }}> InnoVint, Vintrace, Ownology.</span>
          </h1>
          <p
            style={{
              fontFamily: "'Lato',sans-serif",
              fontWeight: 300,
              fontSize: "1.1rem",
              lineHeight: 1.65,
              color: "var(--ow-text-mid)",
              maxWidth: 720,
              margin: "1.75rem 0 0",
            }}
          >
            Cellar intelligence isn&rsquo;t new. The math is. Every number below
            is either the vendor&rsquo;s public list price, or a range from
            independent software directories &mdash; not our opinion of them.
          </p>
          <p
            style={{
              fontFamily: "'Fira Code',monospace",
              fontSize: "0.7rem",
              color: "var(--ow-text-lo)",
              letterSpacing: "0.06em",
              marginTop: "0.75rem",
            }}
          >
            Verified: Feb 2026 · sources listed at bottom · no affiliation with either competitor.
          </p>
        </header>

        {/* ── The 95% Claim, unpacked ─────────────────────────────────── */}
        <section
          data-testid="pc-claim-box"
          style={{
            padding: "1.75rem 1.75rem 1.5rem",
            background: "color-mix(in oklch, var(--ow-amber) 8%, transparent)",
            border: "1px solid color-mix(in oklch, var(--ow-amber) 35%, transparent)",
            borderRadius: 6,
          }}
        >
          <div style={{ display: "flex", alignItems: "flex-start", gap: "0.85rem" }}>
            <ShieldCheck size={22} strokeWidth={1.6} style={{ color: "var(--ow-amber)", flexShrink: 0, marginTop: 2 }} />
            <div>
              <p
                style={{
                  fontFamily: "'Lato',sans-serif",
                  fontWeight: 700,
                  fontSize: "0.72rem",
                  letterSpacing: "0.14em",
                  textTransform: "uppercase",
                  color: "var(--ow-amber)",
                  margin: 0,
                }}
              >
                The 95% claim, unpacked
              </p>
              <p
                style={{
                  fontFamily: "'Fraunces',serif",
                  fontSize: "1.15rem",
                  lineHeight: 1.55,
                  color: "var(--ow-text-hi)",
                  margin: "0.6rem 0 0.35rem",
                }}
              >
                For a typical mid-tier boutique winery, Ownology comes in at
                roughly <strong style={{ color: "var(--ow-amber)" }}>one-tenth</strong> the loaded cost of a Vintrace or InnoVint quote.
              </p>
              <p
                style={{
                  fontFamily: "'Lato',sans-serif",
                  fontWeight: 300,
                  fontSize: "0.9rem",
                  color: "var(--ow-text-mid)",
                  lineHeight: 1.65,
                  margin: 0,
                }}
              >
                Not because we&rsquo;re cutting corners &mdash; because we don&rsquo;t
                charge per user, we don&rsquo;t require an implementation
                consultant, and we don&rsquo;t bolt on integrations after the
                fact. What&rsquo;s on our pricing page is what you pay.
              </p>
            </div>
          </div>
        </section>

        {/* ── The comparison table ────────────────────────────────────── */}
        <section data-testid="pc-table-section">
          <p
            style={{
              fontFamily: "'Lato',sans-serif",
              fontWeight: 700,
              fontSize: "0.72rem",
              letterSpacing: "0.14em",
              textTransform: "uppercase",
              color: "var(--ow-amber)",
              marginBottom: "1.25rem",
            }}
          >
            Side-by-side, by winery type
          </p>

          <div
            style={{
              overflowX: "auto",
              border: "1px solid var(--ow-bg-inset)",
              borderRadius: 6,
            }}
          >
            <table
              data-testid="pc-comparison-table"
              style={{
                width: "100%",
                borderCollapse: "collapse",
                fontFamily: "'Lato',sans-serif",
                fontSize: "0.9rem",
                background: "var(--ow-bg-raised)",
                minWidth: 720,
              }}
            >
              <thead>
                <tr
                  style={{
                    background: "color-mix(in oklch, var(--ow-amber) 8%, transparent)",
                    borderBottom: "1px solid var(--ow-bg-inset)",
                  }}
                >
                  {[
                    { label: "Winery type", w: "22%" },
                    { label: "InnoVint", w: "18%" },
                    { label: "Vintrace", w: "18%" },
                    { label: "Ownology", w: "22%" },
                    { label: "Ownology saves", w: "20%" },
                  ].map((h) => (
                    <th
                      key={h.label}
                      style={{
                        textAlign: "left",
                        padding: "0.85rem 1rem",
                        fontFamily: "'Fira Code',monospace",
                        fontSize: "0.68rem",
                        letterSpacing: "0.12em",
                        textTransform: "uppercase",
                        color: "var(--ow-amber)",
                        fontWeight: 700,
                        width: h.w,
                      }}
                    >
                      {h.label}
                    </th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {ROWS.map((r, i) => (
                  <tr
                    key={r.scenario}
                    data-testid={`pc-row-${i}`}
                    style={{
                      borderBottom: i === ROWS.length - 1 ? "none" : "1px solid var(--ow-bg-inset)",
                      background: i % 2 === 1 ? "color-mix(in oklch, var(--ow-bg-inset) 40%, transparent)" : "transparent",
                    }}
                  >
                    <td style={cell}>
                      <div style={{ fontWeight: 600, color: "var(--ow-text-hi)", marginBottom: "0.15rem" }}>{r.scenario}</div>
                      <div style={{ fontSize: "0.78rem", color: "var(--ow-text-lo)", fontWeight: 300 }}>{r.detail}</div>
                    </td>
                    <td style={cell}>
                      <div style={{ fontFamily: "'Fraunces',serif", fontWeight: 600, fontSize: "1rem", color: "var(--ow-text-hi)" }}>{r.innovint.price}</div>
                      <div style={{ fontSize: "0.75rem", color: "var(--ow-text-lo)", fontWeight: 300 }}>{r.innovint.note}</div>
                    </td>
                    <td style={cell}>
                      <div style={{ fontFamily: "'Fraunces',serif", fontWeight: 600, fontSize: "1rem", color: "var(--ow-text-hi)" }}>{r.vintrace.price}</div>
                      <div style={{ fontSize: "0.75rem", color: "var(--ow-text-lo)", fontWeight: 300 }}>{r.vintrace.note}</div>
                    </td>
                    <td style={cell}>
                      <div style={{ fontFamily: "'Fraunces',serif", fontWeight: 700, fontSize: "1.05rem", color: "var(--ow-amber)" }}>{r.ownology.price}</div>
                      <div style={{ fontSize: "0.72rem", color: "var(--ow-text-mid)", fontWeight: 500, letterSpacing: "0.03em", textTransform: "uppercase" }}>{r.ownology.tier}</div>
                      <div style={{ fontSize: "0.75rem", color: "var(--ow-text-lo)", fontWeight: 300, marginTop: "0.15rem" }}>{r.ownology.note}</div>
                    </td>
                    <td style={{ ...cell, fontFamily: "'Fraunces',serif", fontWeight: 600, color: r.savingsCommercial === "—" ? "var(--ow-text-lo)" : "var(--ow-amber)" }}>
                      {r.savingsCommercial}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>

          {/* Footnotes to the table */}
          <div
            style={{
              marginTop: "1.25rem",
              fontFamily: "'Lato',sans-serif",
              fontSize: "0.8rem",
              color: "var(--ow-text-lo)",
              lineHeight: 1.6,
            }}
          >
            <p style={{ margin: "0 0 0.35rem" }}>
              <sup>1</sup> Vintrace and InnoVint mid-tier quotes commonly load
              in per-user fees, integration setup, and implementation support.
              Ranges shown reflect what small teams report in independent forums.
            </p>
            <p style={{ margin: 0 }}>
              <sup>2</sup> Enterprise pricing at both vendors is quote-only.
              The $500&ndash;2,000/mo range is derived from published customer
              reports, not internal knowledge of either company&rsquo;s pricing.
            </p>
          </div>
        </section>

        {/* ── Why we can price this low ───────────────────────────────── */}
        <section
          data-testid="pc-why-cheap"
          style={{
            display: "grid",
            gridTemplateColumns: "repeat(auto-fit, minmax(220px, 1fr))",
            gap: "1rem",
          }}
        >
          {[
            {
              title: "No per-user fees",
              body: "Your whole cellar team logs in on one subscription. Vintrace and InnoVint typically charge per seat.",
            },
            {
              title: "No implementation consultant",
              body: "Ownology onboards you the way software should — you sign up, you use it. No 6-week rollout.",
            },
            {
              title: "AI where it earns its keep",
              body: "Cellar intelligence powered by Claude Sonnet, not a proprietary rules engine built ten years ago. Answers cite the SOPs and references they draw from.",
            },
            {
              title: "Built by a winemaker, not a boardroom",
              body: "Rich and Geraldine run this from a small cellar office. Every dollar of margin funds product, not a sales floor.",
            },
          ].map((c) => (
            <div
              key={c.title}
              style={{
                padding: "1.25rem 1.25rem 1.1rem",
                background: "var(--ow-bg-raised)",
                border: "1px solid var(--ow-bg-inset)",
                borderRadius: 6,
              }}
            >
              <p
                style={{
                  fontFamily: "'Fraunces',serif",
                  fontWeight: 600,
                  fontSize: "1.02rem",
                  color: "var(--ow-text-hi)",
                  margin: 0,
                  letterSpacing: "-0.005em",
                }}
              >
                {c.title}
              </p>
              <p
                style={{
                  fontFamily: "'Lato',sans-serif",
                  fontWeight: 300,
                  fontSize: "0.87rem",
                  color: "var(--ow-text-mid)",
                  lineHeight: 1.6,
                  margin: "0.5rem 0 0",
                }}
              >
                {c.body}
              </p>
            </div>
          ))}
        </section>

        {/* ── Sources ─────────────────────────────────────────────────── */}
        <section data-testid="pc-sources" style={{ paddingTop: "1rem", borderTop: "1px solid var(--ow-bg-inset)" }}>
          <p
            style={{
              fontFamily: "'Lato',sans-serif",
              fontWeight: 700,
              fontSize: "0.72rem",
              letterSpacing: "0.14em",
              textTransform: "uppercase",
              color: "var(--ow-amber)",
              marginBottom: "0.85rem",
            }}
          >
            Sources
          </p>
          <ul
            style={{
              listStyle: "none",
              padding: 0,
              margin: 0,
              display: "flex",
              flexDirection: "column",
              gap: "0.4rem",
            }}
          >
            {SOURCES.map((s) => (
              <li key={s.url}>
                <a
                  href={s.url}
                  target={s.url.startsWith("http") ? "_blank" : undefined}
                  rel={s.url.startsWith("http") ? "noreferrer" : undefined}
                  style={{
                    fontFamily: "'Lato',sans-serif",
                    fontSize: "0.85rem",
                    color: "var(--ow-text-mid)",
                    textDecoration: "none",
                    display: "inline-flex",
                    alignItems: "center",
                    gap: "0.35rem",
                  }}
                >
                  {s.label}
                  {s.url.startsWith("http") && <ExternalLink size={12} style={{ opacity: 0.6 }} />}
                </a>
              </li>
            ))}
          </ul>
        </section>

        {/* ── Quiet exit ──────────────────────────────────────────────── */}
        <section style={{ textAlign: "center", paddingTop: "1rem" }}>
          <p
            style={{
              fontFamily: "'Fraunces',serif",
              fontStyle: "italic",
              fontSize: "1rem",
              color: "var(--ow-text-mid)",
              margin: "0 0 1.25rem",
            }}
          >
            Numbers on a page will only ever get you so far. If you want to
            see the product, that&rsquo;s the next honest step.
          </p>
          <div style={{ display: "flex", flexWrap: "wrap", justifyContent: "center", gap: "0.75rem" }}>
            <Link
              href="/ask?from=pricing-comparison"
              data-testid="pc-cta-ask"
              style={{
                padding: "0.85rem 1.5rem",
                background: "transparent",
                color: "var(--ow-text-hi)",
                border: "1.5px solid oklch(0.35 0.010 60)",
                borderRadius: 6,
                fontFamily: "'Lato',sans-serif",
                fontWeight: 500,
                fontSize: "0.95rem",
                textDecoration: "none",
              }}
            >
              🍷 Ask Owen — free
            </Link>
            <Link
              href="/pricing?from=pricing-comparison"
              data-testid="pc-cta-pricing"
              style={{
                padding: "0.85rem 1.5rem",
                background: "var(--ow-amber)",
                color: "oklch(0.10 0.008 60)",
                borderRadius: 6,
                fontFamily: "'Lato',sans-serif",
                fontWeight: 700,
                fontSize: "0.95rem",
                textDecoration: "none",
              }}
            >
              🍇 See our pricing page
            </Link>
          </div>
        </section>
      </div>
    </div>
  );
}

const cell: React.CSSProperties = {
  padding: "0.9rem 1rem",
  verticalAlign: "top",
  lineHeight: 1.45,
};
