/**
 * /risk-management — Ownology's Risk Management Doctrine (Feb 2026).
 *
 * Public marketing/education surface. Explains the framework Ownology
 * uses to detect winemaking risks before they cost you a barrel.
 *
 * TWO tiers — deliberately narrow scope, no worker-safety (WHS is
 * out of scope; see footer for the credible authorities we defer to).
 *
 *   1. QUANTITATIVE wine-quality risks — detected from lab readings
 *      (SO₂, Brix, temp, malic, days-since-check). Rule-based, live
 *      in the Cellar Brief.
 *
 *   2. QUALITATIVE wine-quality risks — winemaker observation (taste,
 *      smell, visual). Capture via one-tap flag on the vessel card,
 *      audit trail survives resolution.
 *
 * Purpose: sales weapon (link from cold email, /why-ownology, demos).
 * Not part of the operational surface — that's the Cellar Brief.
 */
import { Link } from "wouter";

const SERIF = "'Fraunces',serif";
const SANS = "'Lato',sans-serif";
const HI = "var(--ow-text-hi)";
const MID = "var(--ow-text-mid)";
const LO = "var(--ow-text-lo)";
const CARD = "var(--ow-bg-card)";
const RAISED = "var(--ow-bg-raised)";
const BORDER = "var(--ow-border)";
const AMBER = "var(--ow-amber)";

// ── Risk framework data ───────────────────────────────────────────────────
type Risk = {
  key: string;
  name: string;
  definition: string;
  trigger: string;
  action: string;
  citation?: string;
};

const QUANT_RISKS: Risk[] = [
  {
    key: "so2-decay",
    name: "SO₂ decay in aging vessels",
    definition: "Free sulphur dioxide drops below the protective threshold, exposing wine to oxidation and microbial spoilage.",
    trigger: "Free SO₂ < 25 ppm for reds / < 30 ppm for whites, or >21 days since last reading in aging vessels.",
    action: "Sample, calculate molecular SO₂ against current pH, dose within the shift.",
    citation: "AWRI Fact Sheet: Sulfur dioxide, use in wine",
  },
  {
    key: "stuck-ferment",
    name: "Stuck / sluggish ferment",
    definition: "Yeast activity stalls before dryness. Leaves residual sugar + open target for Brett and lactic bacteria.",
    trigger: "Brix flatlined ≥12 hrs above dryness, or primary_slowing >48 hrs with no movement.",
    action: "Verify temperature, taste for reduction/off-notes, plan restart (nutrient + rehydrated culture) within 24 hrs.",
    citation: "AWRI Fact Sheet: Restarting stuck ferments",
  },
  {
    key: "temp-excursion",
    name: "Ferment temperature excursion",
    definition: "Cap or ambient temp overshoots the variety-specific band. Aromatic loss (whites) or green-tannin extraction (reds).",
    trigger: "Reds > 30°C cap temp; whites > 18°C for aromatics, > 20°C for barrel-ferment Chardonnay.",
    action: "Cool via jacket + shorten cap contact (reds); jacket + reduce yeast nutrient (whites).",
  },
  {
    key: "mlf-drift",
    name: "MLF drift / stall",
    definition: "Malolactic fermentation stops incomplete, leaving residual malic acid. Wine remains microbially unstable.",
    trigger: "Malic > 0.3 g/L after 4 weeks post-inoc, or unresolved decrease trend > 14 days.",
    action: "Verify cellar temp ≥ 18°C, taste for VA creep, consider re-inoc with a robust ML strain.",
    citation: "AWRI Fact Sheet: Malolactic fermentation",
  },
  {
    key: "silent-vessel",
    name: "Silent barrel / tank",
    definition: "An aging vessel that hasn't been checked in >30 days. The most common way winemakers lose barrels.",
    trigger: "Any aging_barrel or aging_tank stage with no journal entries for 30 days.",
    action: "Sample SO₂, taste, top up ullage — treat every silent barrel as a potential Brett incubator.",
  },
  {
    key: "days-since-check",
    name: "Days-since-check drift",
    definition: "A vessel drifts out of the operator's attention. Compounds every other risk on this list.",
    trigger: "Rolling counter per vessel; alerts when > variety/stage-specific threshold.",
    action: "Sample + journal entry today, even if the number's fine — the point is to keep it in view.",
  },
  {
    key: "lip-compliance",
    name: "LIP compliance drift",
    definition: "Batch composition drifts from the label declaration (varietal %, vintage year, GI region).",
    trigger: "Blend event or press event that changes composition beyond the declared thresholds.",
    action: "Update label declaration or adjust the blend — before bottling, not after.",
    citation: "Wine Australia — Label Integrity Programme",
  },
];

const QUAL_RISKS: Risk[] = [
  {
    key: "brett",
    name: "Brettanomyces (Brett)",
    definition: "Spoilage yeast producing 4-EP / 4-EG. Band-aid, barnyard, sweaty-horse, spice on the nose. Once in barrel, hard to remove.",
    trigger: "Winemaker detects on nose or palate. Any red in wood is high-risk; any low-SO₂ warm cellar is high-risk.",
    action: "Flag the vessel → isolate → SO₂ dose → treat the barrel or write it down. Never rack contaminated wine through shared hoses.",
    citation: "AWRI Fact Sheet: Brettanomyces",
  },
  {
    key: "tca",
    name: "TCA / cork taint",
    definition: "2,4,6-trichloroanisole. Musty wet-cardboard character. Threshold ~3 ng/L. Contaminates through cork, cellar wood, or environmental sources.",
    trigger: "Winemaker or panel detects mustiness on nose. Any batch with unexplained aromatic dullness deserves a screen.",
    action: "Isolate the affected batch. Investigate source (cork, environment, hose, barrel). Consider PVPP or lees-based mitigation.",
    citation: "AWRI Fact Sheet: TCA and other haloanisoles",
  },
  {
    key: "oxidation",
    name: "Oxidation (macro-ox)",
    definition: "Wine loses aroma freshness, colour drifts brown (whites) or bricking (reds), acetaldehyde character develops.",
    trigger: "Flat aromatics + brown colour drift + vinegar hint on the nose. Often correlated with silent-vessel or low-SO₂ readings.",
    action: "Verify headspace, purge with inert gas, dose SO₂ if free level is below molecular threshold, blend or bottle immediately if progressed.",
  },
  {
    key: "h2s",
    name: "Reduction / H₂S / mercaptan",
    definition: "Hydrogen sulphide or mercaptan formation during or post-ferment. Rotten-egg, struck-match, drain, rubber character.",
    trigger: "Winemaker detects during pump-over or after racking. Often shows in the first 48 hrs post-ferment.",
    action: "Splash-rack for aeration, dose Cu (5-10 mg/L) if persistent, verify yeast nutrient regime. Escalate to fining if not resolved in 24 hrs.",
    citation: "AWRI Fact Sheet: Reductive characters in wine",
  },
  {
    key: "sanitation",
    name: "Sanitation lapse",
    definition: "Visible mould, biofilm, off-clean vessel, or contaminated ancillary equipment (hoses, pumps, filters).",
    trigger: "Winemaker observation. Any vessel returning to service without a full clean cycle is a candidate flag.",
    action: "Re-clean full cycle (caustic → rinse → citric → rinse → sanitiser → rinse). Log the observation so it's traceable if a downstream batch shows issues.",
  },
];

// ── Page ──────────────────────────────────────────────────────────────────
export default function RiskManagement() {
  return (
    <div data-testid="risk-management-page" className="container py-8" style={{ maxWidth: 900 }}>
      <p className="text-xs uppercase tracking-widest" style={{ color: AMBER, fontFamily: SANS }}>
        Ownology · Risk Management Doctrine
      </p>
      <h1 style={{ fontFamily: SERIF, fontSize: "2.4rem", color: HI, margin: "8px 0 6px", lineHeight: 1.15 }}>
        The 12 risks we watch, in one framework.
      </h1>
      <p style={{ fontFamily: SANS, color: MID, fontSize: "1rem", maxWidth: 720, lineHeight: 1.55 }}>
        Every risk that can cost a boutique winery a barrel falls into one of two categories: things we can <em>measure</em>,
        and things you have to <em>taste</em>. Ownology handles the first automatically and prompts you on the second — no gaps
        between them. Threshold, trigger, action for every risk, all cited to AWRI or Wine Australia.
      </p>

      {/* Tier 1 — Quantitative */}
      <section style={{ marginTop: 32 }} data-testid="quant-tier">
        <div style={{ display: "flex", alignItems: "center", gap: 12, marginBottom: 12 }}>
          <span
            style={{
              fontFamily: SANS,
              fontSize: "0.72rem",
              letterSpacing: "0.14em",
              textTransform: "uppercase",
              padding: "4px 10px",
              borderRadius: 4,
              background: "color-mix(in oklch, forestgreen 15%, transparent)",
              color: "#059669",
              fontWeight: 700,
            }}
          >
            Tier 1 · Quantitative
          </span>
          <span style={{ fontFamily: SANS, fontSize: "0.85rem", color: LO }}>
            Automatic detection from lab readings — no operator prompts
          </span>
        </div>
        <div style={{ display: "flex", flexDirection: "column", gap: 12 }}>
          {QUANT_RISKS.map((r) => (
            <RiskCard key={r.key} risk={r} tier="quant" />
          ))}
        </div>
      </section>

      {/* Tier 2 — Qualitative */}
      <section style={{ marginTop: 40 }} data-testid="qual-tier">
        <div style={{ display: "flex", alignItems: "center", gap: 12, marginBottom: 12 }}>
          <span
            style={{
              fontFamily: SANS,
              fontSize: "0.72rem",
              letterSpacing: "0.14em",
              textTransform: "uppercase",
              padding: "4px 10px",
              borderRadius: 4,
              background: "color-mix(in oklch, gold 18%, transparent)",
              color: "#b45309",
              fontWeight: 700,
            }}
          >
            Tier 2 · Qualitative
          </span>
          <span style={{ fontFamily: SANS, fontSize: "0.85rem", color: LO }}>
            One-tap capture on the Cellar Brief card — audit trail survives resolution
          </span>
        </div>
        <div style={{ display: "flex", flexDirection: "column", gap: 12 }}>
          {QUAL_RISKS.map((r) => (
            <RiskCard key={r.key} risk={r} tier="qual" />
          ))}
        </div>
      </section>

      {/* CTA */}
      <section
        style={{
          marginTop: 44,
          background: RAISED,
          border: `1px solid ${AMBER}`,
          borderRadius: 12,
          padding: "22px 24px",
          textAlign: "center",
        }}
        data-testid="risk-mgmt-cta"
      >
        <h2 style={{ fontFamily: SERIF, fontSize: "1.5rem", color: HI, margin: "0 0 8px" }}>
          Want to see this on your cellar?
        </h2>
        <p style={{ fontFamily: SANS, color: MID, fontSize: "0.9rem", margin: "0 0 16px", maxWidth: 560, marginLeft: "auto", marginRight: "auto" }}>
          20 min, no slides — we&apos;ll load a sample dataset during the call and you&apos;ll see the real Cellar Brief before we hang up.
        </p>
        <a
          data-testid="risk-mgmt-book-demo"
          href="https://calendly.com/ownology/20min"
          target="_blank"
          rel="noopener noreferrer"
          style={{
            display: "inline-block",
            padding: "12px 28px",
            background: AMBER,
            color: "oklch(0.10 0.008 60)",
            fontFamily: SANS,
            fontWeight: 700,
            fontSize: "0.95rem",
            borderRadius: 4,
            textDecoration: "none",
            letterSpacing: "0.03em",
          }}
        >
          Book a 20-min demo →
        </a>
      </section>

      {/* Scope footer — deliberate transparency about what's NOT in scope */}
      <section
        style={{
          marginTop: 44,
          padding: "18px 20px",
          background: CARD,
          border: `1px solid ${BORDER}`,
          borderRadius: 10,
        }}
        data-testid="risk-mgmt-scope"
      >
        <p style={{ fontFamily: SANS, fontSize: "0.72rem", letterSpacing: "0.12em", color: LO, textTransform: "uppercase", margin: 0, fontWeight: 700 }}>
          What we don&apos;t cover
        </p>
        <p style={{ fontFamily: SANS, color: MID, fontSize: "0.88rem", lineHeight: 1.55, marginTop: 8 }}>
          <strong style={{ color: HI }}>Worker safety (WHS)</strong> is out of Ownology&apos;s scope. We&apos;re a wine-quality tool
          — not a compliance-officer product. If you&apos;re managing safety obligations under the Model WHS Act, the credible
          authorities are:
        </p>
        <ul style={{ fontFamily: SANS, color: MID, fontSize: "0.82rem", lineHeight: 1.6, marginTop: 6, paddingLeft: 18 }}>
          <li><a href="https://www.safeworkaustralia.gov.au/law-and-regulation/model-codes-of-practice" target="_blank" rel="noreferrer" style={{ color: AMBER }}>Safe Work Australia — Model Codes of Practice</a> (confined spaces, hazardous chemicals, manual tasks)</li>
          <li><a href="https://www.awri.com.au/industry_support/winemaking_resources/safety/" target="_blank" rel="noreferrer" style={{ color: AMBER }}>AWRI — Winemaking Safety Resources</a></li>
          <li>Your state regulator: SafeWork NSW · WorkSafe Victoria · SafeWork SA · WHSQ · WorkSafe WA · WorkSafe Tasmania · WorkSafe ACT · NT WorkSafe · Comcare (Federal)</li>
        </ul>
        <p style={{ fontFamily: SANS, color: LO, fontSize: "0.75rem", lineHeight: 1.55, marginTop: 8 }}>
          <strong style={{ color: MID }}>Roadmap:</strong> once you&apos;ve populated your asset list, vintage records, and
          employee training data in Ownology, we may enable on-demand JSEA / SWMS generation. Not today — that&apos;s a v2 conversation.
        </p>
      </section>

      <p style={{ marginTop: 32, textAlign: "center" }}>
        <Link href="/" style={{ fontFamily: SANS, fontSize: "0.8rem", color: LO }} data-testid="risk-mgmt-home">
          ← Home
        </Link>
        {" · "}
        <Link href="/why-ownology" style={{ fontFamily: SANS, fontSize: "0.8rem", color: LO }}>
          Why Ownology
        </Link>
      </p>
    </div>
  );
}

function RiskCard({ risk, tier }: { risk: Risk; tier: "quant" | "qual" }) {
  const accent = tier === "quant" ? "#059669" : "#b45309";
  return (
    <article
      data-testid={`risk-card-${risk.key}`}
      style={{
        background: CARD,
        border: `1px solid ${BORDER}`,
        borderLeft: `4px solid ${accent}`,
        borderRadius: 8,
        padding: "14px 16px",
      }}
    >
      <h3 style={{ fontFamily: SERIF, fontSize: "1.15rem", color: HI, margin: "0 0 6px", lineHeight: 1.25 }}>
        {risk.name}
      </h3>
      <p style={{ fontFamily: SANS, color: MID, fontSize: "0.9rem", margin: "0 0 10px", lineHeight: 1.55 }}>
        {risk.definition}
      </p>
      <div style={{ display: "grid", gridTemplateColumns: "auto 1fr", gap: "4px 12px", fontFamily: SANS, fontSize: "0.8rem" }}>
        <span style={{ color: LO, letterSpacing: "0.06em", textTransform: "uppercase", fontSize: "0.66rem", fontWeight: 700, alignSelf: "start", paddingTop: 3 }}>Trigger</span>
        <span style={{ color: MID, lineHeight: 1.5 }}>{risk.trigger}</span>
        <span style={{ color: LO, letterSpacing: "0.06em", textTransform: "uppercase", fontSize: "0.66rem", fontWeight: 700, alignSelf: "start", paddingTop: 3 }}>Action</span>
        <span style={{ color: HI, lineHeight: 1.5 }}>{risk.action}</span>
        {risk.citation && (
          <>
            <span style={{ color: LO, letterSpacing: "0.06em", textTransform: "uppercase", fontSize: "0.66rem", fontWeight: 700, alignSelf: "start", paddingTop: 3 }}>Source</span>
            <span style={{ color: LO, lineHeight: 1.5, fontStyle: "italic" }}>{risk.citation}</span>
          </>
        )}
      </div>
    </article>
  );
}
