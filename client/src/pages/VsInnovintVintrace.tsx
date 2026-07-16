/**
 * /vs/innovint-vintrace — public comparison landing (Feb 2026, Rich).
 *
 * Purpose: SEO-friendly public entry point that positions Ownology honestly
 * against InnoVint and Vintrace. Serves as the QR-scan landing target for
 * merch (bar runner + coaster) via UTM-tagged CTAs.
 *
 * Positioning: NOT a feature race. Ownology is a different category —
 * quality and risk management that runs alongside a cellar ledger, not
 * a replacement for one. This page lets buyers self-select.
 *
 * Facts sourced from: /app/memory/COMPETITOR_RESEARCH_INNOVINT_VINTRACE.md
 * (Feb 2026 web research from vendor sites + Capterra + G2 + Rich's
 *  InnoVint screenshots + Vintrace demo transcript).
 *
 * Deep-links:
 *   - /for-innovint-users     — full migration story
 *   - /for-vintrace-users     — full migration story
 *   - /pricing-comparison     — the "receipt" rate-sheet
 *   - /quiz                   — DIY buyer front door
 */
import { useEffect, useRef, useState } from "react";
import { Link } from "wouter";
import { ArrowRight, ExternalLink, Check, X, Minus } from "lucide-react";

// ─── Design tokens (mirror the wider site) ───────────────────────────────────
const BG_BASE   = "var(--ow-bg-base)";
const BG_RAISED = "var(--ow-bg-raised)";
const BG_CARD   = "var(--ow-bg-card)";
const BG_INSET  = "var(--ow-bg-inset)";
const AMBER     = "var(--ow-amber)";
const TEXT_HI   = "var(--ow-text-hi)";
const TEXT_MID  = "var(--ow-text-mid)";
const TEXT_LO   = "var(--ow-text-lo)";
const BORDER    = "var(--ow-border)";
const SERIF     = "'Fraunces', serif";
const SANS      = "'Lato', sans-serif";
const MONO      = "'Fira Code', monospace";

// ─── SEO / social metadata (side-effect on mount) ───────────────────────────
function useDocumentMeta(): void {
  useEffect(() => {
    const title = "Ownology vs InnoVint vs Vintrace — honest comparison for boutique winemakers";
    const description = "InnoVint tracks lots. Vintrace runs the bench. Ownology is the quality and risk management layer that runs alongside. See the honest three-way comparison — including where we lag.";
    document.title = title;

    const upsert = (selector: string, attrs: Record<string, string>) => {
      let el = document.head.querySelector(selector) as HTMLMetaElement | HTMLLinkElement | null;
      if (!el) {
        el = document.createElement(selector.startsWith("link") ? "link" : "meta");
        document.head.appendChild(el);
      }
      Object.entries(attrs).forEach(([k, v]) => el!.setAttribute(k, v));
    };

    upsert('meta[name="description"]', { name: "description", content: description });
    upsert('meta[property="og:title"]', { property: "og:title", content: title });
    upsert('meta[property="og:description"]', { property: "og:description", content: description });
    upsert('meta[property="og:type"]', { property: "og:type", content: "website" });
    upsert('meta[property="og:image"]', { property: "og:image", content: "/og-image.png" });
    upsert('meta[name="twitter:card"]', { name: "twitter:card", content: "summary_large_image" });
    upsert('link[rel="canonical"]', { rel: "canonical", href: "https://ownology.ai/vs/innovint-vintrace" });
  }, []);
}

// ─── Intersection observer for fade-in reveals ──────────────────────────────
function useInView<T extends Element>(): { ref: React.RefObject<T>; inView: boolean } {
  const ref = useRef<T>(null);
  const [inView, setInView] = useState(false);
  useEffect(() => {
    const el = ref.current;
    if (!el) return;
    const obs = new IntersectionObserver(
      ([entry]) => { if (entry.isIntersecting) { setInView(true); obs.unobserve(el); } },
      { threshold: 0.15 }
    );
    obs.observe(el);
    return () => obs.disconnect();
  }, []);
  return { ref, inView };
}

// ─── UTM helper: preserves QR scan source when leaving to CTAs ──────────────
function withUtm(path: string, utmSource: string): string {
  const params = new URLSearchParams();
  params.set("utm_source", utmSource);
  params.set("utm_medium", "vs-page");
  params.set("utm_campaign", "innovint-vintrace-compare");
  const sep = path.includes("?") ? "&" : "?";
  return `${path}${sep}${params.toString()}`;
}

// ─── Data ────────────────────────────────────────────────────────────────────

type Vendor = { name: string; kicker: string; audience: string; pricing: string; sourceUrl: string };
const VENDORS: Vendor[] = [
  {
    name: "InnoVint",
    kicker: "The US cellar ERP",
    audience: "40-lot custom-crush facility. US-based. Filing TTB 5120.17 every month. Team of six on the floor. Needs 3D tank maps, lot COGS, AP Compliance.",
    pricing: "From US$149/mo (aggregator). Custom quote. Free trial. Unlimited users.",
    sourceUrl: "https://www.innovint.us/packages/",
  },
  {
    name: "Vintrace",
    kicker: "The AU-origin production platform",
    audience: "Boutique to enterprise AU/NZ producer. Complex blending. WET filing. Mature lab bench with Baker Lab / ETS auto-ingest. Uses tank telemetry.",
    pricing: "From US$95/mo listed. Quote-based for Estate+. No free trial. 670+ wineries globally.",
    sourceUrl: "https://www.vintrace.com/pricing-and-plans/",
  },
  {
    name: "Ownology",
    kicker: "Quality and risk, across the whole business",
    audience: "Owner-operator boutique winemaker who is ALSO the marketer, DTC channel, tasting-room host, and story publisher. One person doing eight jobs. Needs AI leverage across all of it.",
    pricing: "Free Run $0. Cellar Hand $22/mo. The Press $44/mo. The Vigneron $88/mo. No per-user fees. No implementation consultant. Public list price.",
    sourceUrl: "/pricing",
  },
];

// Feature matrix — honest, sourced, uses ratings rather than checkmarks
// because "InnoVint has AI too" is technically true after Jan 2026 — the
// question is depth and product surface, not tick-box presence.
type Cell = "core" | "yes" | "partial" | "no";
type Row = { area: string; note?: string; innovint: Cell; vintrace: Cell; ownology: Cell; innovintNote?: string; vintraceNote?: string; ownologyNote?: string };

const ROWS: Row[] = [
  // ── Cellar operations ledger (their strength)
  { area: "Lot ledger + genealogy",
    innovint: "core", vintrace: "core", ownology: "partial",
    innovintNote: "Lot Explorer with block-level parentage trace-back",
    vintraceNote: "Product Page + Vessels + lot traceability",
    ownologyNote: "Batches with parent/child; not lot-tree depth" },
  { area: "TTB 5120.17 filing (US)",
    innovint: "core", vintrace: "yes", ownology: "no",
    innovintNote: "Auto-generated with audit + lock-backdate",
    vintraceNote: "TTB reporting supported",
    ownologyNote: "Not yet built — use incumbent alongside if US-based" },
  { area: "WET filing (Australia)",
    innovint: "no", vintrace: "core", ownology: "no",
    innovintNote: "US-focused",
    vintraceNote: "Native — this is a Vintrace edge in AU",
    ownologyNote: "Not yet built" },
  { area: "3D interactive tank map",
    innovint: "core", vintrace: "no", ownology: "no",
    innovintNote: "Distinct visual asset",
    vintraceNote: "2D tank map",
    ownologyNote: "Not built" },
  { area: "Lot-based real-time COGS",
    innovint: "core", vintrace: "partial", ownology: "no",
    innovintNote: "Fruit cost worksheets + Lot Cost Report",
    vintraceNote: "Cost tracking cited as weaker than InnoVint's",
    ownologyNote: "Not built" },
  { area: "Lab bench integration",
    innovint: "yes", vintrace: "core", ownology: "no",
    innovintNote: "AI Analysis Import (photo of lab notes)",
    vintraceNote: "Auto-ingest from Baker Lab / ETS",
    ownologyNote: "Not built" },
  { area: "Trial-blend sandbox (cost + labelling impact)",
    innovint: "yes", vintrace: "core", ownology: "no",
    innovintNote: "Blending trials in Advanced tier",
    vintraceNote: "Sandbox with $/gal + labelling limit analysis",
    ownologyNote: "Not built" },
  { area: "Custom Crush AP Compliance",
    innovint: "core", vintrace: "partial", ownology: "no",
    innovintNote: "Standard in Custom Crush package",
    vintraceNote: "Separate Custom Crush quote plan",
    ownologyNote: "Not our target buyer" },

  // ── The AI + owner-operator layer (our strength)
  { area: "AI-native workflow (voice logging + copilot)",
    innovint: "partial", vintrace: "no", ownology: "core",
    innovintNote: "AI Copilot bolted-on Jan 2026",
    vintraceNote: "No AI layer as of Feb 2026",
    ownologyNote: "AI-first from day one — Claude Sonnet grounded in your own docs" },
  { area: "Answers questions grounded in your protocols/SOPs",
    innovint: "no", vintrace: "no", ownology: "core",
    innovintNote: "Data ledger only",
    vintraceNote: "Data ledger only",
    ownologyNote: "\"What does our SOP say to do about a stuck ferment at 4.2 Brix?\" — plain-language answer" },
  { area: "Consumer-facing quiz / DTC front door",
    innovint: "no", vintrace: "no", ownology: "core",
    innovintNote: "Not offered",
    vintraceNote: "Not offered — Commerce7 via InnoVint bridge",
    ownologyNote: "Style quiz recommends AU/NZ wines and pipes buyers into cellar comms" },
  { area: "Weekly reco digest (auto-curated by cellar signal)",
    innovint: "no", vintrace: "no", ownology: "core",
    ownologyNote: "Opt-in weekly email with what's ready + what to try" },
  { area: "Home / DIY winemaker support",
    innovint: "no", vintrace: "no", ownology: "core",
    innovintNote: "Commercial only",
    vintraceNote: "Commercial only",
    ownologyNote: "Free Run tier + Home Winery Kit for garagistes" },
  { area: "AU/NZ home-market variety intelligence",
    innovint: "partial", vintrace: "yes", ownology: "core",
    innovintNote: "US-focused catalogue",
    vintraceNote: "AU heritage — variety awareness present",
    ownologyNote: "Same-variety twin logic (Alsatian Gewürz → Alpine Vic Gewürz, etc.)" },
  { area: "Public cellar journal / SEO flywheel",
    innovint: "no", vintrace: "no", ownology: "core",
    ownologyNote: "Winemaker vintage logs published as searchable regional content" },
  { area: "Cellar Book PDF (auto-portfolio)",
    innovint: "no", vintrace: "no", ownology: "core",
    ownologyNote: "Auto-generated portfolio artefact from your real cellar data" },
  { area: "Transparent public list price",
    innovint: "partial", vintrace: "no", ownology: "core",
    innovintNote: "Aggregator prices exist; sales-quote actual",
    vintraceNote: "Quote-based; no free trial",
    ownologyNote: "Every tier on /pricing — no gauntlet" },
];

const CELL_ICON: Record<Cell, React.ReactNode> = {
  core:    <Check size={16} strokeWidth={2.4} style={{ color: AMBER }} />,
  yes:     <Check size={16} strokeWidth={2} style={{ color: TEXT_MID }} />,
  partial: <Minus size={16} strokeWidth={2} style={{ color: TEXT_LO }} />,
  no:      <X size={14} strokeWidth={2} style={{ color: "oklch(0.45 0.02 30)" }} />,
};

const CELL_LABEL: Record<Cell, string> = {
  core: "Core strength",
  yes: "Supported",
  partial: "Partial",
  no: "Not built",
};

// ─── Sections ────────────────────────────────────────────────────────────────

function Hero(): JSX.Element {
  return (
    <section className="pt-32 pb-16" style={{ background: BG_BASE }} data-testid="vs-hero">
      <div className="container max-w-4xl">
        <p style={{ fontFamily: MONO, fontSize: "0.7rem", letterSpacing: "0.20em", textTransform: "uppercase", color: AMBER, marginBottom: "1.25rem" }}>
          Honest comparison · Feb 2026
        </p>
        <h1
          style={{
            fontFamily: SERIF,
            fontWeight: 700,
            fontSize: "clamp(2.25rem, 5vw, 3.75rem)",
            color: TEXT_HI,
            letterSpacing: "-0.02em",
            lineHeight: 1.06,
            marginBottom: "1.5rem",
            textWrap: "balance" as "balance",
          }}
        >
          InnoVint. Vintrace. Ownology.<br />
          <em style={{ color: AMBER, fontStyle: "italic" }}>Three tools. Three problems.</em>
        </h1>
        <p style={{ fontFamily: SANS, fontWeight: 300, fontSize: "1.15rem", color: TEXT_MID, lineHeight: 1.75, maxWidth: "640px" }}>
          Pick the tool that matches the job you&apos;re actually trying to do — not the loudest brochure. Below is an honest, sourced, three-way read on where each platform earns its keep, and where it doesn&apos;t. Including where <em>we</em> don&apos;t.
        </p>
        <div className="flex flex-wrap gap-3 mt-8" data-testid="vs-hero-ctas">
          <Link
            href={withUtm("/quiz", "vs-hero")}
            data-testid="cta-quiz"
            style={{
              display: "inline-flex", alignItems: "center", gap: 8,
              padding: "0.85rem 1.5rem", background: AMBER,
              color: "oklch(0.10 0.008 60)", borderRadius: 6,
              fontFamily: SANS, fontWeight: 700, fontSize: "0.95rem",
              textDecoration: "none", letterSpacing: "0.02em",
            }}
          >
            Take the wine quiz <ArrowRight size={16} />
          </Link>
          <Link
            href={withUtm("/pricing", "vs-hero")}
            data-testid="cta-pricing"
            style={{
              display: "inline-flex", alignItems: "center", gap: 8,
              padding: "0.85rem 1.5rem", background: "transparent",
              color: TEXT_HI, border: `1.5px solid ${BORDER}`, borderRadius: 6,
              fontFamily: SANS, fontWeight: 500, fontSize: "0.95rem",
              textDecoration: "none",
            }}
          >
            See our pricing
          </Link>
        </div>
        <p style={{ fontFamily: MONO, fontSize: "0.7rem", color: TEXT_LO, letterSpacing: "0.04em", marginTop: "1.5rem" }}>
          Sources: vendor sites · Capterra · G2 · GetApp · Wine Industry Advisor · InnoVint screenshots · Vintrace 2020 demo transcript.
        </p>
      </div>
    </section>
  );
}

function Reframe(): JSX.Element {
  const { ref, inView } = useInView<HTMLDivElement>();
  return (
    <section className="py-20" style={{ background: BG_RAISED, borderTop: `1px solid ${BORDER}`, borderBottom: `1px solid ${BORDER}` }} data-testid="vs-reframe">
      <div className="container max-w-4xl" ref={ref} style={{ opacity: inView ? 1 : 0, transform: `translateY(${inView ? 0 : 20}px)`, transition: "opacity 0.7s, transform 0.7s" }}>
        <p style={{ fontFamily: MONO, fontSize: "0.7rem", letterSpacing: "0.20em", textTransform: "uppercase", color: AMBER, marginBottom: "1rem" }}>
          The category read
        </p>
        <h2 style={{ fontFamily: SERIF, fontWeight: 700, fontSize: "clamp(1.75rem, 3.5vw, 2.5rem)", lineHeight: 1.15, color: TEXT_HI, letterSpacing: "-0.015em", marginBottom: "1.25rem", maxWidth: 720, textWrap: "balance" as "balance" }}>
          Ownology isn&apos;t trying to replace their cellar ledger.<br />
          <span style={{ color: AMBER }}>It&apos;s the quality-and-risk layer that runs alongside it.</span>
        </h2>
        <p style={{ fontFamily: SANS, fontWeight: 300, fontSize: "1.05rem", color: TEXT_MID, lineHeight: 1.75, maxWidth: 680 }}>
          InnoVint and Vintrace were built for the <strong style={{ color: TEXT_HI, fontWeight: 500 }}>full-time cellar team</strong> — assign the work order to Jane, run the trial blend, file TTB. That&apos;s a real job. Both do it well after 10–15 years of iteration.
        </p>
        <p style={{ fontFamily: SANS, fontWeight: 300, fontSize: "1.05rem", color: TEXT_MID, lineHeight: 1.75, maxWidth: 680, marginTop: "1rem" }}>
          Ownology is built for the <strong style={{ color: TEXT_HI, fontWeight: 500 }}>owner-operator winemaker</strong> who is also the marketer, DTC channel, tasting-room host, and story publisher. One person doing eight jobs. That job needs a different tool — an AI-native one that reads your protocols, answers your team&apos;s questions in plain language, curates your customer digest, generates your Cellar Book PDF, and pipes buyers in from a quiz.
        </p>
        <p style={{ fontFamily: SANS, fontWeight: 300, fontSize: "1.05rem", color: TEXT_MID, lineHeight: 1.75, maxWidth: 680, marginTop: "1rem" }}>
          If you already run InnoVint or Vintrace and it&apos;s working — <em>keep it</em>. Add Ownology alongside for the parts they don&apos;t try to do.
        </p>
      </div>
    </section>
  );
}

function VendorCards(): JSX.Element {
  return (
    <section className="py-20" style={{ background: BG_BASE }} data-testid="vs-vendor-cards">
      <div className="container max-w-5xl">
        <p style={{ fontFamily: MONO, fontSize: "0.7rem", letterSpacing: "0.20em", textTransform: "uppercase", color: AMBER, marginBottom: "1rem" }}>
          You are this winemaker if…
        </p>
        <h2 style={{ fontFamily: SERIF, fontWeight: 700, fontSize: "clamp(1.6rem, 3vw, 2.25rem)", lineHeight: 1.15, color: TEXT_HI, letterSpacing: "-0.015em", marginBottom: "2.5rem", maxWidth: 640, textWrap: "balance" as "balance" }}>
          Three profiles. Pick the one that sounds like your Monday morning.
        </h2>
        <div className="grid md:grid-cols-3 gap-5" data-testid="vendor-grid">
          {VENDORS.map((v) => {
            const isOwnology = v.name === "Ownology";
            return (
              <div
                key={v.name}
                data-testid={`vendor-card-${v.name.toLowerCase()}`}
                style={{
                  padding: "1.5rem",
                  background: isOwnology ? "color-mix(in oklch, var(--ow-amber) 8%, var(--ow-bg-card))" : BG_CARD,
                  border: `1.5px solid ${isOwnology ? "color-mix(in oklch, var(--ow-amber) 40%, transparent)" : BORDER}`,
                  borderRadius: 6,
                  display: "flex", flexDirection: "column",
                }}
              >
                <p style={{ fontFamily: MONO, fontSize: "0.65rem", letterSpacing: "0.14em", textTransform: "uppercase", color: isOwnology ? AMBER : TEXT_LO, margin: 0, marginBottom: 4 }}>
                  {v.kicker}
                </p>
                <h3 style={{ fontFamily: SERIF, fontWeight: 700, fontSize: "1.4rem", color: TEXT_HI, margin: "0 0 1rem", letterSpacing: "-0.01em" }}>
                  {v.name}
                </h3>
                <p style={{ fontFamily: SANS, fontWeight: 300, fontSize: "0.92rem", lineHeight: 1.65, color: TEXT_MID, flexGrow: 1, marginBottom: "1rem" }}>
                  {v.audience}
                </p>
                <p style={{ fontFamily: MONO, fontSize: "0.72rem", color: TEXT_LO, letterSpacing: "0.02em", lineHeight: 1.5, borderTop: `1px solid ${BORDER}`, paddingTop: "0.75rem", margin: 0 }}>
                  {v.pricing}
                </p>
                {v.sourceUrl && (
                  <a
                    href={v.sourceUrl}
                    target={v.sourceUrl.startsWith("http") ? "_blank" : undefined}
                    rel={v.sourceUrl.startsWith("http") ? "noreferrer" : undefined}
                    data-testid={`vendor-source-${v.name.toLowerCase()}`}
                    style={{ display: "inline-flex", alignItems: "center", gap: 4, marginTop: "0.75rem", fontFamily: SANS, fontSize: "0.78rem", color: isOwnology ? AMBER : TEXT_MID, textDecoration: "none" }}
                  >
                    {isOwnology ? "See our pricing page" : "Vendor pricing"} <ExternalLink size={11} />
                  </a>
                )}
              </div>
            );
          })}
        </div>
      </div>
    </section>
  );
}

function FeatureMatrix(): JSX.Element {
  const { ref, inView } = useInView<HTMLDivElement>();
  return (
    <section className="py-20" style={{ background: BG_RAISED, borderTop: `1px solid ${BORDER}`, borderBottom: `1px solid ${BORDER}` }} data-testid="vs-matrix">
      <div className="container max-w-5xl" ref={ref} style={{ opacity: inView ? 1 : 0, transition: "opacity 0.7s" }}>
        <p style={{ fontFamily: MONO, fontSize: "0.7rem", letterSpacing: "0.20em", textTransform: "uppercase", color: AMBER, marginBottom: "1rem" }}>
          The honest read
        </p>
        <h2 style={{ fontFamily: SERIF, fontWeight: 700, fontSize: "clamp(1.6rem, 3vw, 2.25rem)", lineHeight: 1.15, color: TEXT_HI, letterSpacing: "-0.015em", marginBottom: "0.75rem", maxWidth: 640 }}>
          What each tool is optimised for.
        </h2>
        <p style={{ fontFamily: SANS, fontWeight: 300, fontSize: "0.95rem", color: TEXT_MID, lineHeight: 1.65, maxWidth: 620, marginBottom: "2rem" }}>
          Not a checkmark race. This shows <em>where each vendor puts its investment</em>. A tool can &ldquo;support&rdquo; something and still not be the best choice for it.
        </p>

        {/* Legend */}
        <div style={{ display: "flex", flexWrap: "wrap", gap: "1rem", marginBottom: "1.5rem", fontFamily: SANS, fontSize: "0.78rem", color: TEXT_LO }} data-testid="matrix-legend">
          <span style={{ display: "inline-flex", alignItems: "center", gap: 6 }}>{CELL_ICON.core}<strong style={{ color: AMBER }}>Core strength</strong></span>
          <span style={{ display: "inline-flex", alignItems: "center", gap: 6 }}>{CELL_ICON.yes} Supported</span>
          <span style={{ display: "inline-flex", alignItems: "center", gap: 6 }}>{CELL_ICON.partial} Partial</span>
          <span style={{ display: "inline-flex", alignItems: "center", gap: 6 }}>{CELL_ICON.no} Not built</span>
        </div>

        <div style={{ overflowX: "auto", border: `1px solid ${BG_INSET}`, borderRadius: 6, background: BG_CARD }}>
          <table
            data-testid="matrix-table"
            style={{ width: "100%", borderCollapse: "collapse", fontFamily: SANS, fontSize: "0.88rem", minWidth: 720 }}
          >
            <thead>
              <tr style={{ background: "color-mix(in oklch, var(--ow-amber) 8%, transparent)", borderBottom: `1px solid ${BG_INSET}` }}>
                <th style={{ ...matrixTh, width: "34%" }}>Capability area</th>
                <th style={matrixTh}>InnoVint</th>
                <th style={matrixTh}>Vintrace</th>
                <th style={{ ...matrixTh, color: AMBER }}>Ownology</th>
              </tr>
            </thead>
            <tbody>
              {ROWS.map((row, i) => (
                <tr key={row.area} data-testid={`matrix-row-${i}`} style={{ borderBottom: i === ROWS.length - 1 ? "none" : `1px solid ${BG_INSET}`, background: i % 2 === 1 ? "color-mix(in oklch, var(--ow-bg-inset) 30%, transparent)" : "transparent" }}>
                  <td style={matrixTd}>
                    <span style={{ color: TEXT_HI, fontWeight: 500 }}>{row.area}</span>
                    {row.note && <div style={{ fontSize: "0.75rem", color: TEXT_LO, fontWeight: 300, marginTop: 2 }}>{row.note}</div>}
                  </td>
                  <td style={matrixTd}><CellDisplay cell={row.innovint} note={row.innovintNote} /></td>
                  <td style={matrixTd}><CellDisplay cell={row.vintrace} note={row.vintraceNote} /></td>
                  <td style={{ ...matrixTd, background: row.ownology === "core" ? "color-mix(in oklch, var(--ow-amber) 6%, transparent)" : undefined }}>
                    <CellDisplay cell={row.ownology} note={row.ownologyNote} />
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>

        <p style={{ fontFamily: MONO, fontSize: "0.7rem", color: TEXT_LO, marginTop: "1rem", letterSpacing: "0.03em" }}>
          Compiled Feb 2026 from vendor documentation, Capterra + G2 reviews, and hands-on demo material. Corrections welcome — email <a href="mailto:hello@ownology.ai" style={{ color: AMBER, textDecoration: "none" }}>hello@ownology.ai</a>.
        </p>
      </div>
    </section>
  );
}

function CellDisplay({ cell, note }: { cell: Cell; note?: string }): JSX.Element {
  return (
    <div style={{ display: "flex", flexDirection: "column", gap: 2 }}>
      <span style={{ display: "inline-flex", alignItems: "center", gap: 6, fontSize: "0.78rem", fontWeight: cell === "core" ? 700 : 400, color: cell === "core" ? AMBER : TEXT_MID }}>
        {CELL_ICON[cell]} {CELL_LABEL[cell]}
      </span>
      {note && <span style={{ fontSize: "0.72rem", color: TEXT_LO, fontWeight: 300, lineHeight: 1.5 }}>{note}</span>}
    </div>
  );
}

function WhereWeLag(): JSX.Element {
  const { ref, inView } = useInView<HTMLDivElement>();
  const gaps = [
    { title: "US TTB 5120.17 auto-filing", body: "Both incumbents automate it. We don't yet. If you file monthly with the TTB, keep your incumbent — run Ownology alongside." },
    { title: "AU WET reporting", body: "Vintrace is native. We haven't built our own. On the roadmap." },
    { title: "3D interactive tank maps", body: "InnoVint's distinct visual asset. Ours is a batch board, not a 3D floor plan." },
    { title: "Auto-ingest from Baker Lab / ETS", body: "Vintrace bridges directly to physical lab hardware. Ours is manual entry today." },
    { title: "Case-goods module + pallet formats", body: "Bottling, transfers, tax-paid removals at InnoVint's depth — not built." },
    { title: "15 years of iteration on cellar ledger", body: "They're 15 years old. We're 12 months old. Some corners of their ledger are simply deeper than ours right now." },
  ];
  return (
    <section className="py-20" style={{ background: BG_BASE }} data-testid="vs-where-we-lag">
      <div className="container max-w-4xl" ref={ref} style={{ opacity: inView ? 1 : 0, transform: `translateY(${inView ? 0 : 20}px)`, transition: "opacity 0.7s, transform 0.7s" }}>
        <p style={{ fontFamily: MONO, fontSize: "0.7rem", letterSpacing: "0.20em", textTransform: "uppercase", color: AMBER, marginBottom: "1rem" }}>
          Where we honestly lag
        </p>
        <h2 style={{ fontFamily: SERIF, fontWeight: 700, fontSize: "clamp(1.6rem, 3vw, 2.25rem)", lineHeight: 1.15, color: TEXT_HI, letterSpacing: "-0.015em", marginBottom: "0.75rem", maxWidth: 640, textWrap: "balance" as "balance" }}>
          Six things InnoVint or Vintrace do better than we do today.
        </h2>
        <p style={{ fontFamily: SANS, fontWeight: 300, fontSize: "1rem", color: TEXT_MID, lineHeight: 1.7, maxWidth: 620, marginBottom: "2.5rem" }}>
          Any comparison page that pretends we win at everything would be lying to you. Here&apos;s the honest list.
        </p>
        <div className="grid sm:grid-cols-2 gap-4" data-testid="lag-grid">
          {gaps.map((g) => (
            <div key={g.title} style={{ padding: "1.25rem", background: BG_CARD, border: `1px solid ${BORDER}`, borderRadius: 6 }}>
              <p style={{ fontFamily: SERIF, fontWeight: 600, fontSize: "1rem", color: TEXT_HI, margin: 0, letterSpacing: "-0.005em" }}>
                {g.title}
              </p>
              <p style={{ fontFamily: SANS, fontWeight: 300, fontSize: "0.87rem", color: TEXT_MID, lineHeight: 1.65, margin: "0.5rem 0 0" }}>
                {g.body}
              </p>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}

function WhatWeUniquelyDo(): JSX.Element {
  const { ref, inView } = useInView<HTMLDivElement>();
  const wins = [
    { title: "Quality-and-risk answers grounded in your own docs", body: "Ask &lsquo;what does our SOP say about a stuck ferment at 4.2 Brix?&rsquo; Get an answer. Claude Sonnet, reading your protocols, not a generic chatbot." },
    { title: "The quiz — DIY buyer's front door", body: "A wine-style quiz that recommends AU/NZ wines by palate, pipes buyers into your comms, and sells home winery kits at the end. Neither incumbent has one." },
    { title: "Weekly Reco Digest", body: "Auto-curated email to opted-in customers on Sunday night. \"This week in your cellar…\" — driven by the cellar signal itself." },
    { title: "Home / DIY winemakers", body: "Free Run tier + Home Winery Kit. Neither incumbent serves the garagiste who wants to log 3 batches from their garage." },
    { title: "AU/NZ home-market variety intelligence", body: "Same-variety twin logic. Alsatian Gewürz maps to Alpine Vic Gewürz, not to Clare Riesling. Both incumbents catalog wines; we understand the palate map." },
    { title: "Public Cellar Journal — SEO flywheel", body: "Winemaker vintage logs published as searchable regional content. Compounds year-on-year." },
    { title: "Cellar Book PDF", body: "Auto-generated portfolio artefact from your real cellar data. Print it, hand it to a buyer at the tasting bench." },
    { title: "Transparent pricing, no gauntlet", body: "$0, $22, $44, $88. On the pricing page. No implementation consultant. No per-user fee." },
  ];
  return (
    <section className="py-20" style={{ background: BG_RAISED, borderTop: `1px solid ${BORDER}`, borderBottom: `1px solid ${BORDER}` }} data-testid="vs-unique">
      <div className="container max-w-5xl" ref={ref} style={{ opacity: inView ? 1 : 0, transform: `translateY(${inView ? 0 : 20}px)`, transition: "opacity 0.7s, transform 0.7s" }}>
        <p style={{ fontFamily: MONO, fontSize: "0.7rem", letterSpacing: "0.20em", textTransform: "uppercase", color: AMBER, marginBottom: "1rem" }}>
          The eight things only Ownology does
        </p>
        <h2 style={{ fontFamily: SERIF, fontWeight: 700, fontSize: "clamp(1.6rem, 3vw, 2.25rem)", lineHeight: 1.15, color: TEXT_HI, letterSpacing: "-0.015em", marginBottom: "2.5rem", maxWidth: 720, textWrap: "balance" as "balance" }}>
          Everything above is a cellar ledger.<br />
          <span style={{ color: AMBER }}>Here&apos;s what neither of them tries to be.</span>
        </h2>
        <div className="grid sm:grid-cols-2 lg:grid-cols-4 gap-4" data-testid="unique-grid">
          {wins.map((w, i) => (
            <div key={w.title} data-testid={`unique-${i}`} style={{ padding: "1.25rem", background: BG_CARD, border: `1px solid color-mix(in oklch, var(--ow-amber) 20%, transparent)`, borderRadius: 6 }}>
              <p style={{ fontFamily: SERIF, fontWeight: 700, fontSize: "0.95rem", color: TEXT_HI, margin: 0, letterSpacing: "-0.005em", lineHeight: 1.35 }}>
                {w.title}
              </p>
              <p style={{ fontFamily: SANS, fontWeight: 300, fontSize: "0.82rem", color: TEXT_MID, lineHeight: 1.65, margin: "0.6rem 0 0" }} dangerouslySetInnerHTML={{ __html: w.body }} />
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}

function MigrationPaths(): JSX.Element {
  const paths = [
    {
      badge: "From InnoVint",
      title: "You&apos;re probably US-based, custom-crush, TTB-filing.",
      body: "Don&apos;t rip out InnoVint. Their lot ledger + TTB automation is genuinely good. Add Ownology alongside as your quality-and-risk layer — quiz-driven DTC, weekly reco digest, cellar journal, home-market intelligence.",
      cta: "See our full InnoVint migration guide",
      href: "/for-innovint-users",
    },
    {
      badge: "From Vintrace",
      title: "You&apos;re probably AU/NZ, complex blends, WET filing.",
      body: "Same story. Keep Vintrace on the bench for blends + Baker Lab + WET. Add Ownology for the DTC, story, quiz, and AI layers Vintrace doesn&apos;t try to build.",
      cta: "See our full Vintrace migration guide",
      href: "/for-vintrace-users",
    },
    {
      badge: "Starting fresh",
      title: "Owner-operator, small cellar, big brand ambition.",
      body: "You want AI-native from day one. You&apos;re happy to file compliance manually today (or you&apos;re in the home-winemaker tier where it doesn&apos;t apply). Ownology can be your only tool.",
      cta: "See our pricing tiers",
      href: "/pricing",
    },
  ];
  return (
    <section className="py-20" style={{ background: BG_BASE }} data-testid="vs-migration">
      <div className="container max-w-5xl">
        <p style={{ fontFamily: MONO, fontSize: "0.7rem", letterSpacing: "0.20em", textTransform: "uppercase", color: AMBER, marginBottom: "1rem" }}>
          Three paths forward
        </p>
        <h2 style={{ fontFamily: SERIF, fontWeight: 700, fontSize: "clamp(1.6rem, 3vw, 2.25rem)", lineHeight: 1.15, color: TEXT_HI, letterSpacing: "-0.015em", marginBottom: "2.5rem", maxWidth: 640, textWrap: "balance" as "balance" }}>
          Where you go from here.
        </h2>
        <div className="grid md:grid-cols-3 gap-4" data-testid="migration-grid">
          {paths.map((p) => (
            <div key={p.badge} data-testid={`migration-${p.badge.toLowerCase().replace(/\s+/g, "-")}`} style={{ padding: "1.5rem", background: BG_CARD, border: `1px solid ${BORDER}`, borderRadius: 6, display: "flex", flexDirection: "column" }}>
              <p style={{ fontFamily: MONO, fontSize: "0.65rem", letterSpacing: "0.14em", textTransform: "uppercase", color: AMBER, margin: 0, marginBottom: "0.75rem" }}>
                {p.badge}
              </p>
              <h3 style={{ fontFamily: SERIF, fontWeight: 600, fontSize: "1.05rem", color: TEXT_HI, lineHeight: 1.35, margin: 0, marginBottom: "0.75rem" }} dangerouslySetInnerHTML={{ __html: p.title }} />
              <p style={{ fontFamily: SANS, fontWeight: 300, fontSize: "0.87rem", color: TEXT_MID, lineHeight: 1.65, margin: 0, flexGrow: 1 }} dangerouslySetInnerHTML={{ __html: p.body }} />
              <Link
                href={withUtm(p.href, "vs-migration")}
                data-testid={`migration-cta-${p.badge.toLowerCase().replace(/\s+/g, "-")}`}
                style={{ display: "inline-flex", alignItems: "center", gap: 6, marginTop: "1rem", fontFamily: SANS, fontSize: "0.85rem", color: AMBER, textDecoration: "none", fontWeight: 500 }}
              >
                {p.cta} <ArrowRight size={14} />
              </Link>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}

function ClosingCta(): JSX.Element {
  return (
    <section className="py-20" style={{ background: BG_RAISED, borderTop: `1px solid ${BORDER}` }} data-testid="vs-closing">
      <div className="container max-w-3xl text-center">
        <p style={{ fontFamily: SERIF, fontStyle: "italic", fontSize: "1.2rem", color: TEXT_MID, margin: "0 0 1.5rem", lineHeight: 1.6 }}>
          If you&apos;re still not sure which tool fits, take the wine quiz.<br />
          It&apos;s the fastest way to see what Ownology feels like.
        </p>
        <div style={{ display: "flex", flexWrap: "wrap", justifyContent: "center", gap: "0.75rem" }}>
          <Link
            href={withUtm("/quiz", "vs-closing")}
            data-testid="closing-cta-quiz"
            style={{ padding: "0.9rem 1.75rem", background: AMBER, color: "oklch(0.10 0.008 60)", borderRadius: 6, fontFamily: SANS, fontWeight: 700, fontSize: "0.95rem", textDecoration: "none", letterSpacing: "0.02em" }}
          >
            Take the quiz — 90 seconds
          </Link>
          <Link
            href={withUtm("/pricing-comparison", "vs-closing")}
            data-testid="closing-cta-receipt"
            style={{ padding: "0.9rem 1.75rem", background: "transparent", color: TEXT_HI, border: `1.5px solid ${BORDER}`, borderRadius: 6, fontFamily: SANS, fontWeight: 500, fontSize: "0.95rem", textDecoration: "none" }}
          >
            See the pricing math
          </Link>
        </div>
      </div>
    </section>
  );
}

// ─── Table cell styles ──────────────────────────────────────────────────────
const matrixTh: React.CSSProperties = {
  textAlign: "left",
  padding: "0.85rem 1rem",
  fontFamily: MONO,
  fontSize: "0.65rem",
  letterSpacing: "0.14em",
  textTransform: "uppercase",
  color: TEXT_MID,
  fontWeight: 700,
};
const matrixTd: React.CSSProperties = {
  padding: "0.9rem 1rem",
  verticalAlign: "top",
  lineHeight: 1.5,
};

// ─── Page ────────────────────────────────────────────────────────────────────
export default function VsInnovintVintrace(): JSX.Element {
  useDocumentMeta();
  return (
    <div data-testid="vs-innovint-vintrace-page" style={{ background: BG_BASE, color: TEXT_HI, minHeight: "100vh" }}>
      <Hero />
      <Reframe />
      <VendorCards />
      <FeatureMatrix />
      <WhereWeLag />
      <WhatWeUniquelyDo />
      <MigrationPaths />
      <ClosingCta />
    </div>
  );
}
